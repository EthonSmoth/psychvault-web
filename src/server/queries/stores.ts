import { db } from "@/lib/db";

export async function getPublishedStoreBySlug(slug: string) {
  return db.store.findFirst({
    where: { slug, isPublished: true },
    include: {
      owner: true,
      followers: true,
      resources: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: {
          files: true,
          categories: { include: { category: true } },
          tags: { include: { tag: true } }
        }
      }
    }
  });
}

export async function getPublishedStores({
  query,
  sort = "newest",
}: {
  query?: string;
  sort?: "newest" | "alphabetical" | "resources";
}) {
  const trimmedQuery = query?.trim();

  return db.store.findMany({
    where: {
      isPublished: true,
      ...(trimmedQuery
        ? {
            OR: [
              {
                name: {
                  contains: trimmedQuery,
                  mode: "insensitive",
                },
              },
              {
                bio: {
                  contains: trimmedQuery,
                  mode: "insensitive",
                },
              },
              {
                location: {
                  contains: trimmedQuery,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      logoUrl: true,
      bannerUrl: true,
      location: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          followers: true,
          resources: {
            where: {
              status: "PUBLISHED",
            },
          },
        },
      },
    },
    orderBy:
      sort === "alphabetical"
        ? [{ name: "asc" }]
        : sort === "resources"
        ? [{ resources: { _count: "desc" } }, { name: "asc" }]
        : [{ updatedAt: "desc" }],
  });
}
