import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const resource = await db.resource.findFirst({
    where: {
      id,
      status: "PUBLISHED",
    },
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

  return NextResponse.json(resource);
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
