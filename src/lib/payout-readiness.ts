import { isSuperAdminUser } from "@/lib/super-admin";

type PayoutReadyLike =
  | {
      payoutsEnabled: boolean;
      detailsSubmitted: boolean;
    }
  | null
  | undefined;

export function isPayoutAccountReady(payoutAccount: PayoutReadyLike) {
  return Boolean(payoutAccount?.payoutsEnabled && payoutAccount?.detailsSubmitted);
}

export function canBypassPaidResourcePayoutRequirement(user?: {
  isSuperAdmin?: boolean | null;
} | null) {
  return isSuperAdminUser(user);
}

export function isPaidResourcePayoutReady(options: {
  user?: {
    isSuperAdmin?: boolean | null;
  } | null;
  payoutReady: boolean;
}) {
  return canBypassPaidResourcePayoutRequirement(options.user) || options.payoutReady;
}
