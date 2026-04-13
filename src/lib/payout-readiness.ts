import { UserRole } from "@prisma/client";

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

export function canBypassPaidResourcePayoutRequirement(role?: UserRole | null) {
  return role === UserRole.ADMIN;
}

export function isPaidResourcePayoutReady(options: {
  role?: UserRole | null;
  payoutReady: boolean;
}) {
  return canBypassPaidResourcePayoutRequirement(options.role) || options.payoutReady;
}
