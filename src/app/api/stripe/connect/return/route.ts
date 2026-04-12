import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { syncCreatorPayoutStatus } from "@/lib/stripe-connect";
import { revalidateMarketplaceSurface } from "@/server/cache/public-cache";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", "/creator/payouts");
    return NextResponse.redirect(loginUrl, 303);
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        store: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (user) {
      await syncCreatorPayoutStatus(user.id);

      if (user.store?.slug) {
        revalidateMarketplaceSurface({ storeSlug: user.store.slug });
      }
    }
  } catch (error) {
    logger.error("Unable to sync Stripe Connect return state.", error);
    return NextResponse.redirect(new URL("/creator/payouts?error=return-failed", request.url), 303);
  }

  return NextResponse.redirect(new URL("/creator/payouts?stripe=return", request.url), 303);
}
