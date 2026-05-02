import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

function getWebhookSecret(): string | null {
  const secret = process.env.LOGBOOK_STRIPE_WEBHOOK_SECRET;
  return typeof secret === "string" && secret.trim().length > 0 ? secret.trim() : null;
}

export async function POST(request: Request) {
  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    logger.error("[logbook/webhook] LOGBOOK_STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    logger.warn("[logbook/webhook] Stripe signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      // Only handle logbook credit purchases; ignore marketplace purchases routed here by mistake.
      if (session.metadata?.purchase_type === "logbook_credit") {
        await handleLogbookCreditPurchase(session);
      }
    }
  } catch (err) {
    logger.error(`[logbook/webhook] Error processing event ${event.type}`, err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleLogbookCreditPurchase(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const quantity = parseInt(session.metadata?.quantity ?? "0", 10);

  if (!userId || isNaN(quantity) || quantity < 1) {
    logger.error("[logbook/webhook] Missing or invalid userId/quantity in metadata", {
      sessionId: session.id,
    });
    return;
  }

  await db.parseCredit.upsert({
    where: { userId },
    create: { userId, credits: quantity },
    update: { credits: { increment: quantity } },
  });

  logger.info(`[logbook/webhook] Added ${quantity} parse credit(s) for user ${userId}`);
}
