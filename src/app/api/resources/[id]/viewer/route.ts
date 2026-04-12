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
      `resource-viewer:${clientIP}`,
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

    const resource = await db.resource.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        creatorId: true,
        store: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!resource || resource.status !== "PUBLISHED") {
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
    const isOwner =
      resource.creatorId === viewerUserId || resource.store?.ownerId === viewerUserId;
    const [purchase, review] = await Promise.all([
      isOwner
        ? Promise.resolve({ id: "owner" })
        : db.purchase.findUnique({
            where: {
              buyerId_resourceId: {
                buyerId: viewerUserId,
                resourceId: resource.id,
              },
            },
            select: {
              id: true,
            },
          }),
      db.review.findUnique({
        where: {
          buyerId_resourceId: {
            buyerId: viewerUserId,
            resourceId: resource.id,
          },
        },
        select: {
          rating: true,
          body: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        authenticated: true,
        viewer: {
          userId: viewerUserId,
          emailVerified: Boolean(session.user.emailVerified),
          isOwner,
          hasPurchased: Boolean(purchase),
          existingReview: review,
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
