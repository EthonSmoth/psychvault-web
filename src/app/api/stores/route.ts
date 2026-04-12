import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getPublicCacheControl } from "@/server/cache/public-cache";
import { getPublishedStoresBrowseData } from "@/server/queries/public-content";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      `public-browse:stores:${clientIP}`,
      RATE_LIMITS.publicBrowse.max,
      RATE_LIMITS.publicBrowse.window
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many browse requests. Please slow down and try again shortly.",
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

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort");
    const stores = await getPublishedStoresBrowseData({
      query: searchParams.get("q") || undefined,
      sort:
        sort === "alphabetical" || sort === "resources" || sort === "newest"
          ? sort
          : undefined,
      page: searchParams.get("page") || undefined,
    });

    return NextResponse.json(stores, {
      headers: {
        "Cache-Control": getPublicCacheControl(),
      },
    });
  } catch (error) {
    return jsonError("Unable to load stores right now.", 500, error);
  }
}

// Retires the legacy JSON writer so stores must save through the moderated creator flow.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy store write endpoint has been retired. Use the authenticated creator dashboard instead.",
    },
    { status: 410 }
  );
}
