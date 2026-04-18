import type Stripe from "stripe";
import { db } from "@/lib/db";
import { trySendPurchaseConfirmationEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { calculateRevenueSplitForCreator } from "@/lib/revenue-split";

type FulfillmentResult = {
  status: "created" | "existing" | "ignored";
  resourceSlug?: string;
};

export async function fulfillCheckoutSessionPurchase(
  session: Stripe.Checkout.Session
): Promise<FulfillmentResult> {
  const resourceId = session.metadata?.resourceId;
  const buyerId = session.metadata?.buyerId;
  const creatorId = session.metadata?.creatorId;

  if (!resourceId || !buyerId) {
    logger.warn("checkout.session.completed missing resourceId or buyerId in metadata", {
      sessionId: session.id,
    });
    return { status: "ignored" };
  }

  const stripePaymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (!stripePaymentId) {
    logger.warn("checkout.session.completed has no payment_intent", { sessionId: session.id });
    return { status: "ignored" };
  }

  const existingByPaymentIntent = await db.purchase.findUnique({
    where: { stripePaymentId },
    select: {
      id: true,
      resource: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (existingByPaymentIntent) {
    logger.info("Purchase already recorded for payment_intent — skipping", {
      stripePaymentId,
    });
    return {
      status: "existing",
      resourceSlug: existingByPaymentIntent.resource.slug,
    };
  }

  const amountCents = session.amount_total ?? 0;
  const revenueSplit = await calculateRevenueSplitForCreator(amountCents, creatorId || "");

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
      select: { id: true, name: true, email: true, emailNotifications: true },
    }),
  ]);

  if (!resource) {
    logger.error("checkout.session.completed: resource not found", { resourceId });
    return { status: "ignored" };
  }

  if (!buyer) {
    logger.error("checkout.session.completed: buyer not found", { buyerId });
    return { status: "ignored" };
  }

  const transactionResult = await db.$transaction(async (tx) => {
    const existingByBuyerAndResource = await tx.purchase.findUnique({
      where: {
        buyerId_resourceId: {
          buyerId,
          resourceId,
        },
      },
      select: {
        id: true,
        resource: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (existingByBuyerAndResource) {
      await tx.purchase.update({
        where: { id: existingByBuyerAndResource.id },
        data: {
          amountCents,
          platformFeeCents: revenueSplit.platformFeeCents,
          creatorShareCents: revenueSplit.creatorShareCents,
          currency: session.currency?.toUpperCase() ?? "AUD",
          stripePaymentId,
          feePercentageAtPurchase: revenueSplit.feePercentage,
        },
      });

      return {
        created: false,
        resourceSlug: existingByBuyerAndResource.resource.slug,
      };
    }

    await tx.purchase.create({
      data: {
        buyerId,
        resourceId,
        amountCents,
        platformFeeCents: revenueSplit.platformFeeCents,
        creatorShareCents: revenueSplit.creatorShareCents,
        currency: session.currency?.toUpperCase() ?? "AUD",
        stripePaymentId,
        feePercentageAtPurchase: revenueSplit.feePercentage,
      },
    });

    await tx.resource.update({
      where: { id: resourceId },
      data: { salesCount: { increment: 1 } },
    });

    return {
      created: true,
      resourceSlug: resource.slug,
    };
  });

  if (!transactionResult.created) {
    logger.info("Purchase already existed for buyer/resource — reconciled Stripe payment", {
      buyerId,
      resourceId,
      stripePaymentId,
    });
    return {
      status: "existing",
      resourceSlug: transactionResult.resourceSlug,
    };
  }

  logger.info("Purchase recorded", {
    buyerId,
    resourceId,
    amountCents,
    platformFeeCents: revenueSplit.platformFeeCents,
    creatorShareCents: revenueSplit.creatorShareCents,
    feePercentage: revenueSplit.feePercentage,
    stripePaymentId,
  });

  if (buyer.emailNotifications) {
    trySendPurchaseConfirmationEmail({
      buyerEmail: buyer.email,
      buyerName: buyer.name,
      buyerId: buyer.id,
      resourceTitle: resource.title,
      resourceSlug: resource.slug,
      storeName: resource.store?.name ?? "PsychVault creator",
      amountCents,
      isFree: false,
      appBaseUrl: getAppBaseUrl(),
    });
  }

  return {
    status: "created",
    resourceSlug: transactionResult.resourceSlug,
  };
}