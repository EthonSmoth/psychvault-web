import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmailVerified } from "@/lib/require-email-verification";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { jsonError } from "@/lib/http";
import { getAppBaseUrl } from "@/lib/env";
import { getPaymentsAvailability } from "@/lib/payments";
import { canBypassPaidResourcePayoutRequirement } from "@/lib/payout-readiness";
import { getSafeRedirectTarget } from "@/lib/redirects";
import { ensureAllowedOrigin } from "@/lib/request-security";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";
import { getEffectivePublicResourceFileState } from "@/lib/resource-file-state";
import { isPayoutAccountReady, syncCreatorPayoutStatus } from "@/lib/stripe-connect";
import { trySendPurchaseConfirmationEmail } from "@/lib/email";
import { calculateRevenueSplitForCreator } from "@/lib/revenue-split";

export async function POST(request: Request) {
  try {
    const originError = ensureAllowedOrigin(request);

    if (originError) {
      return originError;
    }

    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      `checkout:${clientIP}`,
      RATE_LIMITS.checkout.max,
      RATE_LIMITS.checkout.window
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many checkout attempts. Please try again later.",
          retryAfter: rateLimitResult.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.resetInSeconds),
          },
        }
      );
    }

    const formData = await request.formData();
    const resourceId = String(formData.get("resourceId") || "").trim();
    const redirectTo = getSafeRedirectTarget(
      String(formData.get("redirectTo") || "").trim(),
      "/library"
    );

    const session = await auth();

    const buildLibraryRedirectUrl = (slug?: string) => {
      const libraryUrl = new URL("/library", request.url);
      if (slug) {
        libraryUrl.searchParams.set("resource", slug);
      }
      libraryUrl.searchParams.set("purchase", "success");
      return libraryUrl;
    };

    if (!session?.user?.id) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", redirectTo);
      return NextResponse.redirect(loginUrl, 303);
    }

    const userRateLimit = await checkRateLimit(
      `checkout:user:${session.user.id}`,
      RATE_LIMITS.checkoutPerUser.max,
      RATE_LIMITS.checkoutPerUser.window
    );

    if (!userRateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many checkout attempts. Please try again later.",
          retryAfter: userRateLimit.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(userRateLimit.resetInSeconds),
          },
        }
      );
    }

    if (!resourceId) {
      return NextResponse.json({ error: "Missing resource id." }, { status: 400 });
    }

    const resource = await db.resource.findUnique({
      where: { id: resourceId },
      include: {
        files: {
          select: {
            kind: true,
            fileUrl: true,
          },
        },
        store: {
          include: {
            owner: {
              include: {
                payoutAccount: true,
              },
            },
          },
        },
      },
    });

    if (!resource || resource.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    const userId = session.user.id;
    const effectiveFileState = getEffectivePublicResourceFileState({
      mainDownloadUrl: resource.mainDownloadUrl,
      files: resource.files,
    });

    if (
      effectiveFileState.hasMainFile !== resource.hasMainFile ||
      effectiveFileState.mainDownloadUrl !== resource.mainDownloadUrl
    ) {
      await db.resource.update({
        where: { id: resource.id },
        data: {
          hasMainFile: effectiveFileState.hasMainFile,
          mainDownloadUrl: effectiveFileState.mainDownloadUrl,
        },
      });
    }

    if (!(await isEmailVerified(userId))) {
      const verifyUrl = new URL("/verify-email", request.url);
      verifyUrl.searchParams.set("redirectTo", redirectTo || `/resources/${resource.slug}`);
      return NextResponse.redirect(verifyUrl, 303);
    }

    if (!effectiveFileState.hasMainFile) {
      const errorUrl = new URL(`/resources/${resource.slug}`, request.url);
      errorUrl.searchParams.set("error", "download-missing");
      return NextResponse.redirect(errorUrl, 303);
    }

    if (resource.store?.ownerId === userId) {
      return NextResponse.redirect(
        buildLibraryRedirectUrl(resource.slug),
        303
      );
    }

    const existingPurchase = await db.purchase.findUnique({
      where: {
        buyerId_resourceId: {
          buyerId: userId,
          resourceId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingPurchase) {
      return NextResponse.redirect(
        buildLibraryRedirectUrl(resource.slug),
        303
      );
    }

    if (resource.isFree || resource.priceCents === 0) {
      await db.$transaction([
        db.purchase.create({
          data: {
            buyerId: userId,
            resourceId,
            amountCents: 0,
            platformFeeCents: 0,
            creatorShareCents: 0,
            currency: "AUD",
          },
        }),
        db.resource.update({
          where: { id: resourceId },
          data: { salesCount: { increment: 1 } },
        }),
      ]);

      // Send confirmation email — fire and forget
      const buyer = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, emailNotifications: true },
      });
      if (buyer?.emailNotifications) {
        trySendPurchaseConfirmationEmail({
          buyerEmail: buyer.email,
          buyerName: buyer.name,
          buyerId: buyer.id,
          resourceTitle: resource.title,
          resourceSlug: resource.slug,
          storeName: resource.store?.name ?? "PsychVault creator",
          amountCents: 0,
          isFree: true,
          appBaseUrl: getAppBaseUrl(),
        });
      }

      return NextResponse.redirect(
        buildLibraryRedirectUrl(resource.slug),
        303
      );
    }

    const paymentsAvailability = getPaymentsAvailability();

    if (!paymentsAvailability.enabled) {
      const unavailableUrl = new URL(`/resources/${resource.slug}`, request.url);
      unavailableUrl.searchParams.set("error", "payments-unavailable");
      return NextResponse.redirect(unavailableUrl, 303);
    }

    const appUrl = getAppBaseUrl();
    
    // Calculate revenue split based on creator's fee percentage
    const revenueSplit = await calculateRevenueSplitForCreator(
      resource.priceCents,
      resource.store?.owner?.id || ""
    );
    
    // Superadmin sales always settle to the main Stripe account — never transfer to a Connect sub-account,
    // even if a PayoutAccount record exists in the database.
    const stripeAccountId = resource.store?.owner?.isSuperAdmin
      ? null
      : resource.store?.owner?.payoutAccount?.stripeAccountId;
    const bypassesPayoutRequirement = canBypassPaidResourcePayoutRequirement(
      resource.store?.owner
    );
    let creatorPayoutReady =
      bypassesPayoutRequirement ||
      isPayoutAccountReady(resource.store?.owner?.payoutAccount);

    if (!creatorPayoutReady && resource.store?.ownerId) {
      const syncedPayoutStatus = await syncCreatorPayoutStatus(resource.store.ownerId);
      creatorPayoutReady = syncedPayoutStatus.ready;
    }

    if (!creatorPayoutReady) {
      const unavailableUrl = new URL(`/resources/${resource.slug}`, request.url);
      unavailableUrl.searchParams.set("error", "creator-payouts-unavailable");
      return NextResponse.redirect(unavailableUrl, 303);
    }

    const checkoutParams = {
      mode: "payment" as const,
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: resource.priceCents,
            product_data: {
              name: resource.title,
              description: resource.shortDescription || undefined,
              images: resource.thumbnailUrl ? [resource.thumbnailUrl] : [],
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&resource=${encodeURIComponent(resource.slug)}`,
      cancel_url: `${appUrl}/resources/${resource.slug}`,
      metadata: {
        resourceId: resource.id,
        buyerId: userId,
        creatorId: resource.store?.ownerId || "",
        feePercentage: revenueSplit.feePercentage.toString(),
      },
    };

    if (stripeAccountId) {
      (checkoutParams as any).payment_intent_data = {
        application_fee_amount: revenueSplit.platformFeeCents,
        transfer_data: {
          destination: stripeAccountId,
        },
      };
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

    if (!checkoutSession.url) {
      logger.error("Stripe checkout session created without a redirect URL.");
      return jsonError("Unable to create checkout session.", 500);
    }

    return NextResponse.redirect(checkoutSession.url, 303);
  } catch (error) {
    return jsonError("Unable to start checkout.", 500, error);
  }
}
