import Stripe from "stripe";
import { getRequiredServerEnv, parsePositiveIntEnv } from "@/lib/env";

const stripeSecret = getRequiredServerEnv("STRIPE_SECRET_KEY");
export const stripe = new Stripe(stripeSecret, {
  apiVersion: "2025-08-27.basil"
});

/**
 * @deprecated Use `calculateRevenueSplitForCreator()` from `@/lib/revenue-split` instead
 *
 * This function returns a hardcoded platform fee from environment variables.
 * The new system uses per-creator fee percentages stored in the database.
 *
 * Old usage (DEPRECATED):
 * ```
 * const feeBps = getPlatformFeeBps();
 * const platformFeeCents = Math.round((amountCents * feeBps) / 10000);
 * ```
 *
 * New usage (RECOMMENDED):
 * ```
 * import { calculateRevenueSplitForCreator } from "@/lib/revenue-split";
 * const split = await calculateRevenueSplitForCreator(amountCents, creatorId);
 * const platformFeeCents = split.platformFeeCents;
 * ```
 *
 * For backward compatibility with existing code, this function will continue to work,
 * but it should NOT be used in new code. All revenue split calculations must use
 * the database-driven system.
 */
export function getPlatformFeeBps() {
  console.warn(
    "DEPRECATION WARNING: getPlatformFeeBps() is deprecated. " +
    "Use calculateRevenueSplitForCreator() from @/lib/revenue-split instead. " +
    "The new system calculates fees per-creator from the database."
  );
  return parsePositiveIntEnv("PLATFORM_FEE_BPS", 2000);
}

