import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getPublicCacheControl } from "@/server/cache/public-cache";
import { getPublishedResourcesBrowseData } from "@/server/queries/public-content";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

// Returns a sanitized list of published resources for public integrations.
export async function GET(request: Request) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      `public-browse:resources:${clientIP}`,
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
    const resources = await getPublishedResourcesBrowseData({
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      tag: searchParams.get("tag") || undefined,
      price: searchParams.get("price") || undefined,
      store: searchParams.get("store") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: searchParams.get("page") || undefined,
    });

    return NextResponse.json(resources, {
      headers: {
        "Cache-Control": getPublicCacheControl(),
      },
    });
  } catch (error) {
    return jsonError("Unable to load resources right now.", 500, error);
  }
}

// Retires the older JSON writer so creator changes must go through the moderated UI flow.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy write endpoint has been retired. Use the authenticated creator dashboard instead.",
    },
    { status: 410 }
  );
}
