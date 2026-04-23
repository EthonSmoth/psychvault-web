import { db } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isPayoutAccountReady } from "@/lib/payout-readiness";
import { stripe } from "@/lib/stripe";

export {
  canBypassPaidResourcePayoutRequirement,
  isPaidResourcePayoutReady,
  isPayoutAccountReady,
} from "@/lib/payout-readiness";

type StoredPayoutAccount = {
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export type CreatorPayoutStatus = {
  hasAccount: boolean;
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  ready: boolean;
};

function toCreatorPayoutStatus(
  payoutAccount: StoredPayoutAccount | null | undefined
): CreatorPayoutStatus {
  return {
    hasAccount: Boolean(payoutAccount),
    stripeAccountId: payoutAccount?.stripeAccountId || null,
    chargesEnabled: Boolean(payoutAccount?.chargesEnabled),
    payoutsEnabled: Boolean(payoutAccount?.payoutsEnabled),
    detailsSubmitted: Boolean(payoutAccount?.detailsSubmitted),
    ready: isPayoutAccountReady(payoutAccount),
  };
}

function getStoredStatusUpdate(account: {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}) {
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}

export async function ensureCreatorStripeAccount(options: {
  userId: string;
  email: string;
  storeName?: string | null;
  storeSlug?: string | null;
}) {
  const existing = await db.payoutAccount.findUnique({
    where: { userId: options.userId },
  });

  if (existing) {
    return existing;
  }

  const appUrl = getAppBaseUrl();
  const connectedAccount = await stripe.accounts.create({
    type: "express",
    email: options.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      url: options.storeSlug ? `${appUrl}/stores/${options.storeSlug}` : appUrl,
      product_description: options.storeName
        ? `${options.storeName} sells digital psychology resources through PsychVault.`
        : "Digital psychology resources sold through PsychVault.",
    },
    metadata: {
      userId: options.userId,
      storeSlug: options.storeSlug || "",
    },
  });

  return db.payoutAccount.create({
    data: {
      userId: options.userId,
      stripeAccountId: connectedAccount.id,
      chargesEnabled: connectedAccount.charges_enabled,
      payoutsEnabled: connectedAccount.payouts_enabled,
      detailsSubmitted: connectedAccount.details_submitted,
    },
  });
}

export async function syncCreatorPayoutStatus(userId: string) {
  const payoutAccount = await db.payoutAccount.findUnique({
    where: { userId },
    select: {
      stripeAccountId: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    },
  });

  if (!payoutAccount) {
    return toCreatorPayoutStatus(null);
  }

  try {
    const connectedAccount = await stripe.accounts.retrieve(payoutAccount.stripeAccountId);

    if ("deleted" in connectedAccount && connectedAccount.deleted) {
      logger.warn("Stripe connected account was deleted.", {
        userId,
        stripeAccountId: payoutAccount.stripeAccountId,
      });
      return toCreatorPayoutStatus(payoutAccount);
    }

    const nextStatus = getStoredStatusUpdate(connectedAccount);

    if (
      nextStatus.chargesEnabled !== payoutAccount.chargesEnabled ||
      nextStatus.payoutsEnabled !== payoutAccount.payoutsEnabled ||
      nextStatus.detailsSubmitted !== payoutAccount.detailsSubmitted
    ) {
      const isListable = nextStatus.payoutsEnabled && nextStatus.detailsSubmitted;
      await db.$transaction([
        db.payoutAccount.update({
          where: { userId },
          data: nextStatus,
        }),
        db.store.updateMany({
          where: { ownerId: userId },
          data: { isListable },
        }),
      ]);
    }

    return toCreatorPayoutStatus({
      stripeAccountId: payoutAccount.stripeAccountId,
      ...nextStatus,
    });
  } catch (error) {
    logger.error("Unable to sync Stripe payout status.", error);
    return toCreatorPayoutStatus(payoutAccount);
  }
}

export async function createCreatorOnboardingLink(stripeAccountId: string) {
  const appUrl = getAppBaseUrl();
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appUrl}/api/stripe/connect/onboarding?refresh=1`,
    return_url: `${appUrl}/api/stripe/connect/return`,
    type: "account_onboarding",
  });

  return link.url;
}

export async function createCreatorStripeDashboardLink(stripeAccountId: string) {
  const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
  return loginLink.url;
}
