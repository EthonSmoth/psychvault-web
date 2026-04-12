import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { createSignedDownloadUrl } from "@/lib/storage";

type RouteContext = {
  params: Promise<{
    resourceId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      `download:${clientIP}`,
      RATE_LIMITS.download.max,
      RATE_LIMITS.download.window
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many download attempts. Please try again shortly.",
          retryAfter: rateLimitResult.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.resetInSeconds),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const session = await auth();
    const { resourceId } = await params;

    const resource = await db.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        slug: true,
        hasMainFile: true,
        mainDownloadUrl: true,
        store: {
          select: {
            ownerId: true,
            slug: true,
          },
        },
      },
    });

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found." },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (!session?.user?.id) {
      const loginUrl = new URL("/login", process.env.NEXT_PUBLIC_APP_URL || request.url);
      loginUrl.searchParams.set("redirectTo", `/resources/${resource.slug}`);
      return NextResponse.redirect(loginUrl, 303);
    }

    const userRateLimit = await checkRateLimit(
      `download:user:${session.user.id}`,
      RATE_LIMITS.download.max,
      RATE_LIMITS.download.window
    );

    if (!userRateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many download attempts. Please try again shortly.",
          retryAfter: userRateLimit.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(userRateLimit.resetInSeconds),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const userId = session.user.id;
    const isOwner = resource.store?.ownerId === userId;

    const purchase = await db.purchase.findUnique({
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

    if (!isOwner && !purchase) {
      return NextResponse.json(
        { error: "You do not have access to this download." },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (!resource.hasMainFile || !resource.mainDownloadUrl) {
      return NextResponse.json(
        { error: "No downloadable file is attached to this resource yet." },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const signedUrl = await createSignedDownloadUrl(resource.mainDownloadUrl);

    if (!signedUrl) {
      return NextResponse.json(
        { error: "The downloadable file could not be prepared securely." },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.redirect(signedUrl, 303);
  } catch (error) {
    return jsonError("Unable to prepare your download.", 500, error);
  }
}
