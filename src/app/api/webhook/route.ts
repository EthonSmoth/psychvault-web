import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getRequiredServerEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSessionPurchase } from "@/server/services/purchase-fulfillment";

// Handles Stripe webhook deliveries and keeps purchase creation idempotent.
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logger.warn("Stripe webhook rejected because the signature header was missing.");
      return jsonError("Invalid webhook request.", 400);
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        getRequiredServerEnv("STRIPE_WEBHOOK_SECRET")
      );
    } catch (err: any) {
      logger.warn("Stripe webhook signature verification failed.", err);
      return jsonError("Invalid webhook request.", 400);
    }

    logger.info("Stripe webhook received.", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await fulfillCheckoutSessionPurchase(session);
    }
  } catch (error) {
    return jsonError("Unable to process webhook.", 500, error);
  }

  return NextResponse.json({ received: true });
}
