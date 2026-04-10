import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Returns a sanitized list of published resources for public integrations.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || undefined;

  const resources = await db.resource.findMany({
    where: {
      status: "PUBLISHED",
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
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

  return NextResponse.json(resources);
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
