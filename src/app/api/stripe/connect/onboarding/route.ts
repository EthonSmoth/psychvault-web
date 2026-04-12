import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  createCreatorOnboardingLink,
  ensureCreatorStripeAccount,
} from "@/lib/stripe-connect";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", "/creator/payouts");
    return NextResponse.redirect(loginUrl, 303);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", "/creator/payouts");
    return NextResponse.redirect(loginUrl, 303);
  }

  if (!user.emailVerified) {
    const verifyUrl = new URL("/verify-email", request.url);
    verifyUrl.searchParams.set("redirectTo", "/creator/payouts");
    return NextResponse.redirect(verifyUrl, 303);
  }

  if (!user.store) {
    return NextResponse.redirect(new URL("/creator/store?error=payout-store-required", request.url), 303);
  }

  try {
    const payoutAccount = await ensureCreatorStripeAccount({
      userId: user.id,
      email: user.email,
      storeName: user.store.name,
      storeSlug: user.store.slug,
    });
    const onboardingUrl = await createCreatorOnboardingLink(payoutAccount.stripeAccountId);
    return NextResponse.redirect(onboardingUrl, 303);
  } catch (error) {
    logger.error("Unable to start Stripe Connect onboarding.", error);
    return NextResponse.redirect(new URL("/creator/payouts?error=connect-failed", request.url), 303);
  }
}
