import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmailVerified } from "@/lib/require-email-verification";
import { stripe, getPlatformFeeBps } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { jsonError } from "@/lib/http";
import { getAppBaseUrl } from "@/lib/env";
import { getPaymentsAvailability } from "@/lib/payments";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const clientIP = getClientIP(request);
  const rateLimitKey = `checkout:${clientIP}`;

  const rateLimitResult = await checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.checkout.max,
    RATE_LIMITS.checkout.window
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Too many checkout attempts. Please try again later.",
        retryAfter: rateLimitResult.resetInSeconds
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
  const redirectTo = String(formData.get("redirectTo") || "").trim();

  const session = await auth();

  if (!session?.user?.id) {
    const loginUrl = new URL("/login", request.url);

    if (redirectTo) {
      loginUrl.searchParams.set("redirectTo", redirectTo);
    }

    return NextResponse.redirect(loginUrl, 303);
  }

  if (!resourceId) {
    return NextResponse.json({ error: "Missing resource id." }, { status: 400 });
  }

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: {
      store: {
        include: {
          owner: {
            include: {
              payoutAccount: true,
            },
          },
        },
      },
      files: {
        where: {
          kind: "MAIN_DOWNLOAD",
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
  });

  if (!resource || resource.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  const userId = session.user.id;

  if (!(await isEmailVerified(userId))) {
    const verifyUrl = new URL("/verify-email", request.url);
    verifyUrl.searchParams.set("redirectTo", redirectTo || `/resources/${resource?.slug || ""}`);
    return NextResponse.redirect(verifyUrl, 303);
  }

  const isOwner = resource.store?.ownerId === userId;
  const hasMainFile = resource.files.some(
    (file) => file.kind === "MAIN_DOWNLOAD"
  );

  if (!hasMainFile) {
    const errorUrl = new URL(`/resources/${resource.slug}`, request.url);
    errorUrl.searchParams.set("error", "download-missing");
    return NextResponse.redirect(errorUrl, 303);
  }

  if (isOwner) {
    return NextResponse.redirect(
      new URL(`/api/downloads/${resource.id}`, request.url),
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
      new URL(`/api/downloads/${resource.id}`, request.url),
      303
    );
  }

  if (resource.isFree || resource.priceCents === 0) {
    await db.purchase.create({
      data: {
        buyerId: userId,
        resourceId,
        amountCents: 0,
        platformFeeCents: 0,
        creatorShareCents: 0,
        currency: "AUD",
      },
    });

    return NextResponse.redirect(
      new URL(`/api/downloads/${resourceId}`, request.url),
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
  const feeBps = getPlatformFeeBps();
  const platformFeeCents = Math.round((resource.priceCents * feeBps) / 10000);
  const stripeAccountId = resource.store?.owner?.payoutAccount?.stripeAccountId;

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
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/resources/${resource.slug}`,
    metadata: {
      resourceId: resource.id,
      buyerId: userId,
    },
  };

  if (stripeAccountId) {
    (checkoutParams as any).payment_intent_data = {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: stripeAccountId,
      },
    };
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

    if (!checkoutSession.url) {
      logger.error("Stripe checkout session created without URL", checkoutSession);
      return jsonError("Unable to create checkout session.", 500);
    }

    return NextResponse.redirect(checkoutSession.url, 303);
  } catch (error) {
    logger.error("Stripe checkout creation failed", error);
    return jsonError("Unable to create checkout session.", 500);
  }
}
