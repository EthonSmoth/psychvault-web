import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const resourceCardSelect = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  thumbnailUrl: true,
  priceCents: true,
  isFree: true,
  averageRating: true,
  reviewCount: true,
  store: {
    select: {
      name: true,
      isVerified: true,
      slug: true,
    },
  },
  creator: {
    select: {
      name: true,
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
        in: ["THUMBNAIL", "PREVIEW", "MAIN_DOWNLOAD"],
      },
    },
    select: {
      kind: true,
      fileUrl: true,
    },
    take: 3,
    orderBy: {
      sortOrder: "asc",
    },
  },
} satisfies Prisma.ResourceSelect;

export function getPublishedResourceMetadata(slug: string) {
  return unstable_cache(
    async () =>
      db.resource.findUnique({
        where: { slug },
        select: {
          id: true,
          title: true,
          shortDescription: true,
          description: true,
          thumbnailUrl: true,
          slug: true,
          status: true,
          priceCents: true,
          isFree: true,
          averageRating: true,
          reviewCount: true,
          store: {
            select: {
              id: true,
              name: true,
              isVerified: true,
            },
          },
        },
      }),
    ["public-resource-metadata", slug],
    { revalidate: 300 }
  )();
}

export function getPublishedResourcePageData(slug: string) {
  return unstable_cache(
    async () => {
      const resource = await db.resource.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          status: true,
          title: true,
          description: true,
          shortDescription: true,
          thumbnailUrl: true,
          priceCents: true,
          isFree: true,
          averageRating: true,
          reviewCount: true,
          salesCount: true,
          storeId: true,
          creatorId: true,
          store: {
            select: {
              id: true,
              slug: true,
              name: true,
              bio: true,
              ownerId: true,
              isVerified: true,
              logoUrl: true,
            },
          },
          creator: {
            select: {
              name: true,
            },
          },
          tags: {
            select: {
              tagId: true,
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
            select: {
              id: true,
              kind: true,
              fileUrl: true,
              fileName: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
          reviews: {
            orderBy: {
              createdAt: "desc",
            },
            take: 20,
            select: {
              id: true,
              rating: true,
              body: true,
              createdAt: true,
              buyer: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!resource || resource.status !== "PUBLISHED") {
        return null;
      }

      const relatedResources = await db.resource.findMany({
        where: {
          status: "PUBLISHED",
          id: {
            not: resource.id,
          },
          OR: [
            {
              storeId: resource.storeId,
            },
            {
              tags: {
                some: {
                  tagId: {
                    in: resource.tags?.map((t) => t.tagId) ?? [],
                  },
                },
              },
            },
          ],
        },
        select: resourceCardSelect,
        orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
        take: 3,
      });

      return {
        resource,
        relatedResources,
      };
    },
    ["public-resource-page", slug],
    { revalidate: 300 }
  )();
}

export function getPublishedStoreMetadata(slug: string) {
  return unstable_cache(
    async () =>
      db.store.findUnique({
        where: { slug },
        select: {
          name: true,
          bio: true,
          logoUrl: true,
          isPublished: true,
          slug: true,
        },
      }),
    ["public-store-metadata", slug],
    { revalidate: 300 }
  )();
}

export function getPublishedStorePageData(slug: string) {
  return unstable_cache(
    async () => {
      const store = await db.store.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          name: true,
          bio: true,
          location: true,
          ownerId: true,
          isPublished: true,
          isVerified: true,
          bannerUrl: true,
          logoUrl: true,
          owner: {
            select: {
              name: true,
            },
          },
          followers: {
            select: {
              followerId: true,
            },
          },
          resources: {
            where: {
              status: "PUBLISHED",
            },
            select: resourceCardSelect,
            orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
          },
        },
      });

      if (!store || !store.isPublished) {
        return null;
      }

      return store;
    },
    ["public-store-page", slug],
    { revalidate: 300 }
  )();
}

export function getHomepageResourceShowcaseData() {
  return unstable_cache(
    async () => {
      const [featuredResources, recentResources] = await Promise.all([
        db.resource.findMany({
          where: { status: "PUBLISHED" },
          orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
          take: 6,
          select: resourceCardSelect,
        }),
        db.resource.findMany({
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: resourceCardSelect,
        }),
      ]);

      return {
        featuredResources,
        recentResources,
      };
    },
    ["homepage-resource-showcase"],
    { revalidate: 300 }
  )();
}

export function getHomepageCategoryData() {
  return unstable_cache(
    async () =>
      db.category.findMany({
        orderBy: { name: "asc" },
        take: 8,
        include: {
          _count: {
            select: {
              resources: true,
            },
          },
        },
      }),
    ["homepage-categories"],
    { revalidate: 300 }
  )();
}

export function getHomepageStatsData() {
  return unstable_cache(
    async () => {
      const [totalResources, totalCreators, totalCategories] = await Promise.all([
        db.resource.count({ where: { status: "PUBLISHED" } }),
        db.store.count({ where: { isPublished: true } }),
        db.category.count(),
      ]);

      return {
        totalResources,
        totalCreators,
        totalCategories,
      };
    },
    ["homepage-stats"],
    { revalidate: 300 }
  )();
}

function getResourceBrowseSortOrder(sort: string): Prisma.ResourceOrderByWithRelationInput[] {
  switch (sort) {
    case "popular":
      return [{ salesCount: "desc" }, { createdAt: "desc" }];
    case "rating":
      return [{ averageRating: "desc" }, { reviewCount: "desc" }, { createdAt: "desc" }];
    case "price-asc":
      return [{ priceCents: "asc" }, { createdAt: "desc" }];
    case "price-desc":
      return [{ priceCents: "desc" }, { createdAt: "desc" }];
    case "oldest":
      return [{ createdAt: "asc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

export function getResourceBrowseFilters(options: {
  q?: string;
  category?: string;
  tag?: string;
  price?: string;
  store?: string;
  sort?: string;
}) {
  const q = options.q?.trim() || "";
  const category = options.category?.trim() || "";
  const tag = options.tag?.trim() || "";
  const price = options.price?.trim() || "";
  const store = options.store?.trim() || "";
  const sort = options.sort?.trim() || "newest";

  return unstable_cache(
    async () => {
      const [categories, tags, resources] = await Promise.all([
        db.category.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        }),
        db.tag.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
          },
          take: 100,
        }),
        db.resource.findMany({
          where: {
            status: "PUBLISHED",
            ...(category
              ? {
                  categories: {
                    some: {
                      category: {
                        slug: category,
                      },
                    },
                  },
                }
              : {}),
            ...(tag
              ? {
                  tags: {
                    some: {
                      tag: {
                        slug: tag,
                      },
                    },
                  },
                }
              : {}),
            ...(price === "free"
              ? {
                  isFree: true,
                }
              : {}),
            ...(price === "paid"
              ? {
                  isFree: false,
                }
              : {}),
            ...(store
              ? {
                  store: {
                    slug: store,
                  },
                }
              : {}),
            ...(q
              ? {
                  OR: [
                    {
                      title: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                    {
                      shortDescription: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                    {
                      description: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                    {
                      slug: {
                        contains: q.toLowerCase(),
                      },
                    },
                    {
                      store: {
                        name: {
                          contains: q,
                          mode: "insensitive",
                        },
                      },
                    },
                    {
                      categories: {
                        some: {
                          category: {
                            name: {
                              contains: q,
                              mode: "insensitive",
                            },
                          },
                        },
                      },
                    },
                    {
                      tags: {
                        some: {
                          tag: {
                            name: {
                              contains: q,
                              mode: "insensitive",
                            },
                          },
                        },
                      },
                    },
                  ],
                }
              : {}),
          },
          select: resourceCardSelect,
          orderBy: getResourceBrowseSortOrder(sort),
        }),
      ]);

      return {
        categories,
        tags,
        resources,
      };
    },
    ["public-resource-browse", q, category, tag, price, store, sort],
    { revalidate: 180 }
  )();
}

export function getPublishedStoresBrowseData(options: {
  query?: string;
  sort?: "newest" | "alphabetical" | "resources";
}) {
  const query = options.query?.trim() || "";
  const sort = options.sort || "newest";

  return unstable_cache(
    async () =>
      db.store.findMany({
        where: {
          isPublished: true,
          ...(query
            ? {
                OR: [
                  {
                    name: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                  {
                    bio: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                  {
                    location: {
                      contains: query,
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
      }),
    ["public-stores-browse", query, sort],
    { revalidate: 180 }
  )();
}
