/**
 * EXAMPLE API ROUTE: Flexible Revenue Split System
 *
 * This file demonstrates how the new revenue split system works.
 * It's NOT part of the actual checkout flow, but shows best practices
 * for working with the revenue split utilities.
 *
 * Production Implementation:
 * - Checkout: src/app/api/checkout/route.ts
 * - Webhook: src/app/api/stripe/webhook/route.ts
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import {
  calculateRevenueSplitForCreator,
  getCreatorFeePercentage,
  calculateRevenueSplit,
  verifyRevenueSplit,
  DEFAULT_CREATOR_FEE_PERCENTAGE,
  FOUNDING_CREATOR_FEE_PERCENTAGE,
  PLATFORM_OWNER_FEE_PERCENTAGE,
} from "@/lib/revenue-split";

/**
 * GET /api/admin/revenue-splits/example
 *
 * Example endpoint showing revenue split calculations
 * Demonstrates the flexible system in action
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    // In production, verify user is admin
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return jsonError("Unauthorized", 403);
    }

    // Example 1: Get fee percentage for a specific creator
    const creatorId = "user_123"; // Example user ID
    const feePercentage = await getCreatorFeePercentage(creatorId);
    console.log(`Creator ${creatorId} fee percentage: ${feePercentage * 100}%`);

    // Example 2: Calculate revenue split for a $50 AUD sale
    const amountCents = 5000; // $50.00 AUD
    const split = await calculateRevenueSplitForCreator(amountCents, creatorId);
    console.log(`Sale amount: $${(split.amountCents / 100).toFixed(2)}`);
    console.log(`Platform fee: $${(split.platformFeeCents / 100).toFixed(2)}`);
    console.log(`Creator earnings: $${(split.creatorShareCents / 100).toFixed(2)}`);
    console.log(`Fee percentage: ${(split.feePercentage * 100).toFixed(1)}%`);

    // Example 3: Verify the split is correct
    const isValid = verifyRevenueSplit(split);
    console.log(`Revenue split is valid: ${isValid}`);

    // Example 4: Compare different fee tiers
    const testAmounts = [1000, 2500, 5000, 10000]; // $10, $25, $50, $100
    const tiers = [
      { name: "Default", fee: DEFAULT_CREATOR_FEE_PERCENTAGE },
      { name: "Founder", fee: FOUNDING_CREATOR_FEE_PERCENTAGE },
      { name: "Superadmin", fee: PLATFORM_OWNER_FEE_PERCENTAGE },
    ];

    const comparison = testAmounts.map((amount) => {
      const tierBreakdown = tiers.map((tier) => {
        const split = calculateRevenueSplit(amount, tier.fee);
        return {
          tier: tier.name,
          platformFee: split.platformFeeCents,
          creatorEarnings: split.creatorShareCents,
        };
      });
      return {
        saleAmount: amount,
        breakdown: tierBreakdown,
      };
    });

    // Example 5: Get all creators and their current fees
    const creators = await db.user.findMany({
      where: { role: "CREATOR" },
      select: {
        id: true,
        name: true,
        email: true,
        feePercentage: true,
        isFounder: true,
        isSuperAdmin: true,
      },
    });

    return NextResponse.json({
      example: {
        singleCreator: {
          creatorId,
          feePercentage: (feePercentage * 100).toFixed(1) + "%",
          revenueSplit: {
            saleAmount: "$" + (split.amountCents / 100).toFixed(2),
            platformFee: "$" + (split.platformFeeCents / 100).toFixed(2),
            creatorEarnings: "$" + (split.creatorShareCents / 100).toFixed(2),
          },
        },
        tierComparison: comparison.map((item) => ({
          saleAmount: "$" + (item.saleAmount / 100).toFixed(2),
          breakdown: item.breakdown.map((b) => ({
            tier: b.tier,
            platformFee: "$" + (b.platformFee / 100).toFixed(2),
            creatorEarnings: "$" + (b.creatorEarnings / 100).toFixed(2),
          })),
        })),
      },
      allCreators: creators.map((creator) => ({
        id: creator.id,
        name: creator.name,
        email: creator.email,
        feePercentage: (creator.feePercentage * 100).toFixed(1) + "%",
        isFounder: creator.isFounder,
        isSuperAdmin: creator.isSuperAdmin,
      })),
    });
  } catch (error) {
    return jsonError("Unable to fetch revenue split examples", 500, error);
  }
}

/**
 * POST /api/admin/revenue-splits/update-creator-fee
 *
 * Example admin endpoint to update a creator's fee percentage
 *
 * Request body:
 * {
 *   "creatorId": "user_123",
 *   "feePercentage": 0.15,
 *   "isFounder": true
 * }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    // In production, verify user is superadmin
    if (!session?.user?.isSuperAdmin) {
      return jsonError("Only superadmins can update creator fees", 403);
    }

    const body = await request.json();
    const { creatorId, feePercentage, isFounder } = body;

    // Validate input
    if (!creatorId || typeof feePercentage !== "number") {
      return jsonError("Missing or invalid creatorId or feePercentage", 400);
    }

    if (feePercentage < 0 || feePercentage > 1) {
      return jsonError("Fee percentage must be between 0 and 1", 400);
    }

    // Update creator
    const updated = await db.user.update({
      where: { id: creatorId },
      data: {
        feePercentage,
        isFounder: isFounder ?? false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        feePercentage: true,
        isFounder: true,
      },
    });

    // Log the change
    console.log(`Updated creator fee: ${updated.name} (${updated.email}) → ${(updated.feePercentage * 100).toFixed(1)}%`);

    return NextResponse.json({
      success: true,
      updated: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        feePercentage: (updated.feePercentage * 100).toFixed(1) + "%",
        isFounder: updated.isFounder,
      },
    });
  } catch (error) {
    return jsonError("Unable to update creator fee", 500, error);
  }
}
