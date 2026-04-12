import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createCreatorStripeDashboardLink } from "@/lib/stripe-connect";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", "/creator/payouts");
    return NextResponse.redirect(loginUrl, 303);
  }

  const payoutAccount = await db.payoutAccount.findUnique({
    where: { userId: session.user.id },
    select: {
      stripeAccountId: true,
    },
  });

  if (!payoutAccount) {
    return NextResponse.redirect(new URL("/creator/payouts?error=no-payout-account", request.url), 303);
  }

  try {
    const loginUrl = await createCreatorStripeDashboardLink(payoutAccount.stripeAccountId);
    return NextResponse.redirect(loginUrl, 303);
  } catch (error) {
    logger.error("Unable to create Stripe Express dashboard link.", error);
    return NextResponse.redirect(new URL("/creator/payouts?error=dashboard-failed", request.url), 303);
  }
}
