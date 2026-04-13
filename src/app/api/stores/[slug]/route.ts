import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { getPubliclyVisiblePublishedResourceWhere } from "@/lib/public-resource-visibility";
import { checkReadRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { getPublicCacheControl } from "@/server/cache/public-cache";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkReadRateLimit(
      `store-detail:${clientIP}`,
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

    const { slug } = await params;

    const store = await db.store.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        bio: true,
        bannerUrl: true,
        logoUrl: true,
        location: true,
        isPublished: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            avatarUrl: true,
          },
        },
        resources: {
          where: getPubliclyVisiblePublishedResourceWhere(),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            title: true,
            shortDescription: true,
            thumbnailUrl: true,
            priceCents: true,
            isFree: true,
            averageRating: true,
            reviewCount: true,
            salesCount: true,
            createdAt: true,
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
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(store, {
      headers: {
        "Cache-Control": getPublicCacheControl(),
      },
    });
  } catch (error) {
    return jsonError("Unable to load store.", 500, error);
  }
}
