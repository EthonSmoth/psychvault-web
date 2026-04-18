import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Revenue split configuration for creator earnings
 *
 * Platform takes a percentage, creator keeps the remainder.
 * All calculations are in cents (integers) with proper rounding.
 */

/**
 * Default fee percentage if creator record doesn't exist
 * 20% = 0.20
 */
export const DEFAULT_CREATOR_FEE_PERCENTAGE = 0.20;

/**
 * Founding creator fee percentage (preferential rate)
 * 15% = 0.15
 */
export const FOUNDING_CREATOR_FEE_PERCENTAGE = 0.15;

/**
 * Platform owner fee (superadmin account, typically manual processing)
 * 0% = 0.0
 */
export const PLATFORM_OWNER_FEE_PERCENTAGE = 0.0;

export interface RevenueSplit {
  /** Total sale amount in cents */
  amountCents: number;
  /** Platform fee in cents */
  platformFeeCents: number;
  /** Creator earnings in cents */
  creatorShareCents: number;
  /** Creator's fee percentage used for calculation */
  feePercentage: number;
}

/**
 * Fetch a creator's fee percentage from the database
 *
 * Returns the fee percentage (0.0 to 1.0) or default if creator not found
 *
 * @param creatorId - User ID of the creator
 * @returns Fee percentage (e.g., 0.20 for 20%)
 */
export async function getCreatorFeePercentage(creatorId: string): Promise<number> {
  try {
    const creator = await db.user.findUnique({
      where: { id: creatorId },
      select: { feePercentage: true, isSuperAdmin: true, isFounder: true },
    });

    if (!creator) {
      logger.warn(`Creator not found for revenue split: ${creatorId}`);
      return DEFAULT_CREATOR_FEE_PERCENTAGE;
    }

    // Superadmin gets 0% fee (manual processing typically)
    if (creator.isSuperAdmin) {
      return PLATFORM_OWNER_FEE_PERCENTAGE;
    }

    if (creator.isFounder) {
      return FOUNDING_CREATOR_FEE_PERCENTAGE;
    }

    // Return creator's configured fee percentage
    return creator.feePercentage ?? DEFAULT_CREATOR_FEE_PERCENTAGE;
  } catch (error) {
    logger.error("Error fetching creator fee percentage", { creatorId, error });
    return DEFAULT_CREATOR_FEE_PERCENTAGE;
  }
}

/**
 * Calculate revenue split between platform and creator
 *
 * Handles rounding to nearest cent properly:
 * - Platform fee is rounded to nearest cent
 * - Creator share is total minus platform fee (ensures amounts sum to total)
 *
 * @param amountCents - Sale amount in cents
 * @param feePercentage - Creator's fee percentage (0.20 = 20%)
 * @returns Revenue split breakdown
 *
 * @example
 * // $50 AUD sale with 20% fee
 * calculateRevenueSplit(5000, 0.20)
 * // => { amountCents: 5000, platformFeeCents: 1000, creatorShareCents: 4000, feePercentage: 0.20 }
 *
 * @example
 * // $25.99 AUD sale with 15% fee (founding creator)
 * calculateRevenueSplit(2599, 0.15)
 * // => { amountCents: 2599, platformFeeCents: 390, creatorShareCents: 2209, feePercentage: 0.15 }
 */
export function calculateRevenueSplit(
  amountCents: number,
  feePercentage: number
): RevenueSplit {
  if (amountCents < 0) {
    throw new Error("Amount must be non-negative");
  }

  if (feePercentage < 0 || feePercentage > 1) {
    throw new Error("Fee percentage must be between 0 and 1");
  }

  // Calculate platform fee and round to nearest cent
  // Multiply by 100 to preserve precision through calculation, then round
  const platformFeeCents = Math.round(amountCents * feePercentage);

  // Creator gets the remainder (ensures total = amount)
  const creatorShareCents = amountCents - platformFeeCents;

  return {
    amountCents,
    platformFeeCents,
    creatorShareCents,
    feePercentage,
  };
}

/**
 * Calculate revenue split for a creator by ID
 *
 * Fetches creator's fee percentage from DB and calculates split
 * Handles missing creators gracefully with default fee
 *
 * @param amountCents - Sale amount in cents
 * @param creatorId - Creator's user ID
 * @returns Promise<RevenueSplit>
 */
export async function calculateRevenueSplitForCreator(
  amountCents: number,
  creatorId: string
): Promise<RevenueSplit> {
  const feePercentage = await getCreatorFeePercentage(creatorId);
  return calculateRevenueSplit(amountCents, feePercentage);
}

/**
 * Verify revenue split calculations are correct
 *
 * Validates that platform fee + creator share equals total amount
 * Useful for auditing and testing
 *
 * @param split - Revenue split to verify
 * @returns true if valid, false otherwise
 */
export function verifyRevenueSplit(split: RevenueSplit): boolean {
  return split.platformFeeCents + split.creatorShareCents === split.amountCents;
}

/**
 * Legacy function for backward compatibility
 * Converts basis points (old system) to fee percentage
 *
 * @param feeBps - Fee in basis points (2000 = 20%)
 * @returns Fee percentage (0.20 for 2000 bps)
 *
 * @deprecated Use fee percentages directly instead
 */
export function convertBpsToPercentage(feeBps: number): number {
  return feeBps / 10000;
}

/**
 * Legacy function for backward compatibility
 * Converts fee percentage to basis points
 *
 * @param feePercentage - Fee percentage (0.20 = 20%)
 * @returns Fee in basis points (2000 for 20%)
 *
 * @deprecated Use fee percentages directly instead
 */
export function convertPercentageToBps(feePercentage: number): number {
  return Math.round(feePercentage * 10000);
}
