import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { getPubliclyVisiblePublishedResourceWhere } from "@/lib/public-resource-visibility";
import { checkReadRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { getPublicCacheControl } from "@/server/cache/public-cache";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkReadRateLimit(
      `resource-detail:${clientIP}`,
      RATE_LIMITS.publicDetail.max,
      RATE_LIMITS.publicDetail.window
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

    const resource = await db.resource.findFirst({
      where: getPubliclyVisiblePublishedResourceWhere({
        id,
      }),
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        shortDescription: true,
        thumbnailUrl: true,
        priceCents: true,
        isFree: true,
        averageRating: true,
        reviewCount: true,
        salesCount: true,
        createdAt: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isVerified: true,
          },
        },
        files: {
          where: {
            kind: {
              in: ["THUMBNAIL", "PREVIEW"],
            },
          },
          orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
          select: {
            id: true,
            kind: true,
            fileUrl: true,
            fileName: true,
            mimeType: true,
            fileSizeBytes: true,
            sortOrder: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!resource) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(resource, {
      headers: {
        "Cache-Control": getPublicCacheControl(),
      },
    });
  } catch (error) {
    return jsonError("Unable to load resource.", 500, error);
  }
}

export async function PUT() {
  return NextResponse.json(
    {
      error:
        "This legacy write endpoint has been retired. Use the authenticated creator dashboard instead.",
    },
    { status: 410 }
  );
}
