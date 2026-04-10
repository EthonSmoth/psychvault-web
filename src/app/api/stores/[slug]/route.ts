import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
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
        where: {
          status: "PUBLISHED",
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

  return NextResponse.json(store);
}
