# Flexible Revenue Split System - Implementation Guide

## Overview

PsychVault now uses a **database-driven, per-creator revenue split system** instead of hardcoded platform fees. This enables:

- ✅ **Different fee tiers** for different creator types (default 20%, founders 15%, superadmin 0%)
- ✅ **Manual per-creator overrides** for special cases
- ✅ **Future flexibility** to add more tiers without code changes
- ✅ **Audit trails** showing which fee was applied at purchase time
- ✅ **No special-case logic** for admins (just `feePercentage = 0`)

## System Architecture

### Database Schema

```prisma
model User {
  // ... existing fields ...
  feePercentage Float     @default(0.20)  // Creator's fee %: 0.20 = 20%
  isFounder     Boolean   @default(false) // Mark founding creators
}

model Purchase {
  // ... existing fields ...
  feePercentageAtPurchase Float @default(0.20) // Audit: what % was charged
}
```

### Core Utilities (`src/lib/revenue-split.ts`)

**Main Functions:**

```typescript
// Get a creator's fee percentage from the database
async function getCreatorFeePercentage(creatorId: string): Promise<number>

// Calculate revenue split for an amount and fee percentage
function calculateRevenueSplit(amountCents: number, feePercentage: number): RevenueSplit

// Combined: fetch creator and calculate split in one call
async function calculateRevenueSplitForCreator(amountCents: number, creatorId: string): Promise<RevenueSplit>

// Verify calculations are correct
function verifyRevenueSplit(split: RevenueSplit): boolean
```

**Constants:**

```typescript
DEFAULT_CREATOR_FEE_PERCENTAGE = 0.20      // 20% - default for all creators
FOUNDING_CREATOR_FEE_PERCENTAGE = 0.15     // 15% - founding creators get discount
PLATFORM_OWNER_FEE_PERCENTAGE = 0.0        // 0% - superadmin/platform owner
```

## Revenue Split Calculation Examples

### Example 1: Default Creator ($50 Sale)

```
Sale Amount: $50.00 AUD (5000 cents)
Creator Fee: 20% (0.20)

Platform Fee: 5000 × 0.20 = 1000 cents = $10.00
Creator Earnings: 5000 - 1000 = 4000 cents = $40.00

Result: {
  amountCents: 5000,
  platformFeeCents: 1000,
  creatorShareCents: 4000,
  feePercentage: 0.20
}
```

### Example 2: Founding Creator ($50 Sale)

```
Sale Amount: $50.00 AUD (5000 cents)
Creator Fee: 15% (0.15)

Platform Fee: 5000 × 0.15 = 750 cents = $7.50
Creator Earnings: 5000 - 750 = 4250 cents = $42.50

Result: {
  amountCents: 5000,
  platformFeeCents: 750,
  creatorShareCents: 4250,
  feePercentage: 0.15
}
```

### Example 3: Superadmin/Platform Owner ($50 Sale)

```
Sale Amount: $50.00 AUD (5000 cents)
Creator Fee: 0% (0.0) - manual processing outside system

Platform Fee: 5000 × 0.0 = 0 cents = $0.00
Creator Earnings: 5000 - 0 = 5000 cents = $50.00

Result: {
  amountCents: 5000,
  platformFeeCents: 0,
  creatorShareCents: 5000,
  feePercentage: 0.0
}
```

## Implementation Details

### Checkout Flow (`src/app/api/checkout/route.ts`)

1. **Calculate revenue split** based on creator's database fee percentage
2. **Include in Stripe metadata**: `creatorId`, `feePercentage` (for reference only)
3. **Set application_fee_amount** to `split.platformFeeCents`
4. **Transfer to creator** via Stripe Connect `transfer_data.destination`

```typescript
// Get creator's fee and calculate split
const revenueSplit = await calculateRevenueSplitForCreator(
  resource.priceCents,
  resource.store?.owner?.id
);

// Stripe checkout configuration
const checkoutParams = {
  payment_intent_data: {
    application_fee_amount: revenueSplit.platformFeeCents,
    transfer_data: {
      destination: stripeAccountId, // Creator's Stripe Connect account
    },
  },
  metadata: {
    resourceId: resource.id,
    buyerId: userId,
    creatorId: resource.store?.ownerId,
    feePercentage: revenueSplit.feePercentage.toString(),
  },
};
```

### Webhook Handler (`src/app/api/stripe/webhook/route.ts`)

1. **Extract metadata** from Stripe checkout session
2. **Recalculate revenue split** using current creator fee (handles fee changes)
3. **Store feePercentageAtPurchase** for audit trail
4. **Record Purchase** with platform fee and creator share

```typescript
// Recalculate revenue split (in case creator fee changed since checkout)
const revenueSplit = await calculateRevenueSplitForCreator(
  amountCents,
  creatorId
);

// Create purchase record with audit trail
await db.purchase.create({
  data: {
    buyerId,
    resourceId,
    amountCents,
    platformFeeCents: revenueSplit.platformFeeCents,
    creatorShareCents: revenueSplit.creatorShareCents,
    feePercentageAtPurchase: revenueSplit.feePercentage,
    stripePaymentId,
  },
});
```

## Deployment Steps

### Step 1: Schema Migration

```bash
# Run the migration to add new columns
npm run db:push

# Or if using migrations:
npm run db:migrate
```

**Migration adds:**
- `User.feePercentage` (Float, default 0.20)
- `User.isFounder` (Boolean, default false)
- `Purchase.feePercentageAtPurchase` (Float, default 0.20)
- Index on `Purchase.feePercentageAtPurchase` for auditing

### Step 2: Initialize Creator Fees

```bash
# Run the initialization script
npm run db:seed

# Or manually run:
npx tsx prisma/initialize-creator-fees.ts
```

**This script:**
- Sets superadmins to 0% fee
- Logs all existing creators
- Prints instructions for marking founders

### Step 3: Mark Founding Creators (Manual)

For each founding creator, either:

**Option A: Direct SQL**
```sql
UPDATE "User" 
SET "feePercentage" = 0.15, "isFounder" = true 
WHERE "id" IN ('founder_user_1', 'founder_user_2');
```

**Option B: Via Prisma Client**
```typescript
const founderIds = ['user_id_1', 'user_id_2'];
await db.user.updateMany({
  where: { id: { in: founderIds } },
  data: { feePercentage: 0.15, isFounder: true },
});
```

**Option C: Admin Dashboard**
Create an admin UI to manage creator fee tiers (recommended).

### Step 4: Verify Implementation

```bash
# Check that new fields exist
npx prisma db execute < verify-schema.sql

# Test revenue split calculations
curl http://localhost:3000/api/admin/revenue-splits/example
```

### Step 5: Deploy to Production

1. Run migrations on production database
2. Run initialization script on production
3. Mark founding creators on production
4. Deploy updated code (checkout route + webhook)
5. Monitor Stripe webhook logs for any issues

## Testing Revenue Split Logic

### Unit Test Example

```typescript
import {
  calculateRevenueSplit,
  verifyRevenueSplit,
  DEFAULT_CREATOR_FEE_PERCENTAGE,
  FOUNDING_CREATOR_FEE_PERCENTAGE,
} from "@/lib/revenue-split";

describe("Revenue Split Calculations", () => {
  it("should calculate default 20% fee correctly", () => {
    const split = calculateRevenueSplit(5000, DEFAULT_CREATOR_FEE_PERCENTAGE);
    
    expect(split.amountCents).toBe(5000);
    expect(split.platformFeeCents).toBe(1000);
    expect(split.creatorShareCents).toBe(4000);
    expect(verifyRevenueSplit(split)).toBe(true);
  });

  it("should calculate founding 15% fee correctly", () => {
    const split = calculateRevenueSplit(5000, FOUNDING_CREATOR_FEE_PERCENTAGE);
    
    expect(split.amountCents).toBe(5000);
    expect(split.platformFeeCents).toBe(750);
    expect(split.creatorShareCents).toBe(4250);
    expect(verifyRevenueSplit(split)).toBe(true);
  });

  it("should round fees to nearest cent", () => {
    // $25.99 with 15% fee
    const split = calculateRevenueSplit(2599, FOUNDING_CREATOR_FEE_PERCENTAGE);
    
    expect(split.platformFeeCents).toBe(390); // $3.90
    expect(split.creatorShareCents).toBe(2209); // $22.09
    expect(verifyRevenueSplit(split)).toBe(true);
  });
});
```

## Monitoring & Auditing

### Revenue Split Audit Trail

Query purchases with fee information:

```sql
-- See fee percentages applied over time
SELECT 
  id,
  "amountCents",
  "platformFeeCents",
  "creatorShareCents",
  "feePercentageAtPurchase",
  "createdAt"
FROM "Purchase"
ORDER BY "createdAt" DESC
LIMIT 100;
```

### Creator Fee Configuration

View all creators and their fees:

```sql
-- See all creators and their configured fees
SELECT 
  id,
  name,
  email,
  "feePercentage",
  "isFounder",
  "isSuperAdmin"
FROM "User"
WHERE role = 'CREATOR'
ORDER BY "isFounder" DESC, "feePercentage";
```

## Adding New Fee Tiers

### To add a new tier (e.g., premium creator at 10% fee):

1. **Add constant** to `src/lib/revenue-split.ts`:
   ```typescript
   export const PREMIUM_CREATOR_FEE_PERCENTAGE = 0.10;
   ```

2. **Add database field** (optional, if needed for future expansion):
   ```prisma
   enum CreatorTier {
     DEFAULT
     FOUNDING
     PREMIUM
     CUSTOM
   }
   ```

3. **Update getCreatorFeePercentage()** logic:
   ```typescript
   if (creator.tier === 'PREMIUM') return PREMIUM_CREATOR_FEE_PERCENTAGE;
   ```

4. **No code changes needed** elsewhere — all existing code automatically uses new tier

## Backward Compatibility

### Old Code Using `getPlatformFeeBps()`

The function still exists but is **DEPRECATED**:

```typescript
// OLD (DEPRECATED - will log warning)
const feeBps = getPlatformFeeBps();
const platformFeeCents = Math.round((amountCents * feeBps) / 10000);

// NEW (RECOMMENDED)
const split = await calculateRevenueSplitForCreator(amountCents, creatorId);
const platformFeeCents = split.platformFeeCents;
```

**Migration path:**
1. Deprecation warning logs whenever old code is called
2. All new code uses `calculateRevenueSplitForCreator()`
3. Old checkout/webhook routes have been updated
4. Environment variable `PLATFORM_FEE_BPS` is no longer used
5. Future: Can safely remove `getPlatformFeeBps()` once all code is migrated

## Troubleshooting

### "Creator fee percentage not found"

**Cause:** Creator ID doesn't exist in database or hasn't been assigned a fee

**Solution:**
```sql
-- Check if creator exists
SELECT * FROM "User" WHERE id = 'creator_id';

-- Assign default fee if missing
UPDATE "User" 
SET "feePercentage" = 0.20 
WHERE id = 'creator_id' AND "feePercentage" IS NULL;
```

### Revenue split doesn't match Stripe amount

**Cause:** Fee percentage changed between checkout and webhook

**Solution:**
- Check `feePercentageAtPurchase` column to see what was actually charged
- Verify creator's current `feePercentage` hasn't changed
- Webhook recalculates split on every payment, so temporary differences are normal

### Rounding errors in calculations

**Solution:**
- All calculations use cents (integers), minimizing floating-point errors
- Platform fee rounded to nearest cent
- Creator share = Total - Platform fee (ensures sum equals total)
- Use `verifyRevenueSplit()` to audit calculations

## Files Modified/Created

- ✅ `prisma/schema.prisma` — Added `feePercentage`, `isFounder`, `feePercentageAtPurchase`
- ✅ `src/lib/revenue-split.ts` — Core revenue split utilities (NEW)
- ✅ `src/app/api/checkout/route.ts` — Updated to use dynamic revenue split
- ✅ `src/app/api/stripe/webhook/route.ts` — Updated to calculate and store fee percentage
- ✅ `src/lib/stripe.ts` — Added deprecation warning to `getPlatformFeeBps()`
- ✅ `prisma/migrations/20260417000000_add_flexible_revenue_split/migration.sql` — Schema migration (NEW)
- ✅ `prisma/initialize-creator-fees.ts` — Data migration script (NEW)
- ✅ `src/app/api/admin/revenue-splits/example.ts` — Example admin endpoints (NEW)

## Summary

The new revenue split system is:
- **Database-driven** (no environment variables)
- **Per-creator** (different fees for different creators)
- **Flexible** (easily add new tiers)
- **Auditable** (stores fee percentage at purchase time)
- **Production-ready** (handles rounding, edge cases, validation)

All calculations are done in cents (integers), and the system properly handles:
- ✅ Multiple fee tiers
- ✅ Manual per-creator overrides
- ✅ Superadmin/platform owner special cases
- ✅ Rounding to nearest cent
- ✅ Audit trails
- ✅ Future expansion without code changes
