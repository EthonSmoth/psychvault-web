import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequiredServerEnv, parsePositiveIntEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { stripe } from "@/lib/stripe";

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
      const resourceId = session.metadata?.resourceId;
      const buyerId = session.metadata?.buyerId;

      if (!resourceId || !buyerId) {
        logger.warn("Stripe webhook payload was missing checkout metadata.");
        return jsonError("Invalid webhook payload.", 400);
      }

      const resource = await db.resource.findUnique({
        where: { id: resourceId },
        select: {
          id: true,
          priceCents: true,
        },
      });

      if (!resource) {
        logger.warn("Stripe webhook referenced a missing resource.");
        return jsonError("Invalid webhook payload.", 400);
      }

      const amountCents = session.amount_total || resource.priceCents;
      const feeBps = parsePositiveIntEnv("PLATFORM_FEE_BPS", 2000);
      const platformFeeCents = Math.round((amountCents * feeBps) / 10000);
      const creatorShareCents = amountCents - platformFeeCents;
      const stripePaymentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

      const existingPurchase = await db.purchase.findUnique({
        where: {
          buyerId_resourceId: {
            buyerId,
            resourceId,
          },
        },
        select: {
          id: true,
        },
      });

      await db.purchase.upsert({
        where: {
          buyerId_resourceId: { buyerId, resourceId },
        },
        update: {
          amountCents,
          platformFeeCents,
          creatorShareCents,
          stripePaymentId,
        },
        create: {
          buyerId,
          resourceId,
          amountCents,
          platformFeeCents,
          creatorShareCents,
          currency: "AUD",
          stripePaymentId,
        },
      });

      if (!existingPurchase) {
        await db.resource.update({
          where: { id: resourceId },
          data: { salesCount: { increment: 1 } },
        });
      }
    }
  } catch (error) {
    return jsonError("Unable to process webhook.", 500, error);
  }

  return NextResponse.json({ received: true });
}
