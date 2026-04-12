import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCSRFToken } from "@/lib/csrf";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      `store-viewer:${clientIP}`,
      RATE_LIMITS.viewerState.max,
      RATE_LIMITS.viewerState.window
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please slow down and try again shortly.",
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
    const { id } = await params;

    const store = await db.store.findUnique({
      where: { id },
      select: {
        id: true,
        isPublished: true,
        ownerId: true,
      },
    });

    if (!store || !store.isPublished) {
      return NextResponse.json(
        { error: "Store not found." },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const viewerUserId = session.user.id;
    const follow = await db.follow.findUnique({
      where: {
        followerId_storeId: {
          followerId: viewerUserId,
          storeId: id,
        },
      },
      select: {
        followerId: true,
      },
    });

    return NextResponse.json(
      {
        authenticated: true,
        viewer: {
          userId: viewerUserId,
          emailVerified: Boolean(session.user.emailVerified),
          isOwner: store.ownerId === viewerUserId,
          isFollowing: Boolean(follow),
          csrfToken: generateCSRFToken(viewerUserId),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return jsonError("Unable to load viewer state.", 500, error);
  }
}
