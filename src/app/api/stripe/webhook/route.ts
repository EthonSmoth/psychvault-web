import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, getPlatformFeeBps } from "@/lib/stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { trySendPurchaseConfirmationEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/env";

function getWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  return typeof secret === "string" && secret.trim().length > 0 ? secret.trim() : null;
}

export async function POST(request: Request) {
  const webhookSecret = getWebhookSecret();

  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not configured — webhook rejected");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  // Must read the raw body before any JSON parsing for signature verification
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    logger.warn("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        // Ignore unhandled event types — return 200 so Stripe doesn't retry
        break;
    }
  } catch (err) {
    logger.error(`Error processing Stripe webhook event ${event.type}`, err);
    // Return 500 so Stripe retries the event
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const resourceId = session.metadata?.resourceId;
  const buyerId = session.metadata?.buyerId;

  if (!resourceId || !buyerId) {
    logger.warn("checkout.session.completed missing resourceId or buyerId in metadata", {
      sessionId: session.id,
    });
    return;
  }

  // Idempotency: the stripePaymentId field has a unique constraint
  const stripePaymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (!stripePaymentId) {
    logger.warn("checkout.session.completed has no payment_intent", { sessionId: session.id });
    return;
  }

  // Check if this payment_intent was already processed
  const existing = await db.purchase.findUnique({
    where: { stripePaymentId },
    select: { id: true },
  });

  if (existing) {
    logger.info("Purchase already recorded for payment_intent — skipping", { stripePaymentId });
    return;
  }

  const amountCents = session.amount_total ?? 0;
  const feeBps = getPlatformFeeBps();
  const platformFeeCents = Math.round((amountCents * feeBps) / 10000);
  const creatorShareCents = amountCents - platformFeeCents;

  // Fetch resource and buyer in parallel
  const [resource, buyer] = await Promise.all([
    db.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        title: true,
        slug: true,
        store: { select: { name: true } },
      },
    }),
    db.user.findUnique({
      where: { id: buyerId },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!resource) {
    logger.error("checkout.session.completed: resource not found", { resourceId });
    return;
  }

  if (!buyer) {
    logger.error("checkout.session.completed: buyer not found", { buyerId });
    return;
  }

  // Create purchase and increment salesCount atomically
  await db.$transaction([
    db.purchase.create({
      data: {
        buyerId,
        resourceId,
        amountCents,
        platformFeeCents,
        creatorShareCents,
        currency: session.currency?.toUpperCase() ?? "AUD",
        stripePaymentId,
      },
    }),
    db.resource.update({
      where: { id: resourceId },
      data: { salesCount: { increment: 1 } },
    }),
  ]);

  logger.info("Purchase recorded", { buyerId, resourceId, amountCents, stripePaymentId });

  // Send confirmation email — fire and forget
  trySendPurchaseConfirmationEmail({
    buyerEmail: buyer.email,
    buyerName: buyer.name,
    resourceTitle: resource.title,
    resourceSlug: resource.slug,
    storeName: resource.store?.name ?? "PsychVault creator",
    amountCents,
    isFree: false,
    appBaseUrl: getAppBaseUrl(),
  });
}
