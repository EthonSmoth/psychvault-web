import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fulfillCheckoutSessionPurchase } from "@/server/services/purchase-fulfillment";

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
  await fulfillCheckoutSessionPurchase(session);
}
