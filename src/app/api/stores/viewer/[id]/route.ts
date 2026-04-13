import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { getStoreViewerState } from "@/server/queries/store-viewer";

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

    const viewerState = await getStoreViewerState({
      storeId: store.id,
      ownerId: store.ownerId,
    });

    return NextResponse.json(
      viewerState,
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
