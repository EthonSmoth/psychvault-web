import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  PUBLIC_CACHE_TAGS,
  PUBLIC_CONTENT_REVALIDATE_SECONDS,
} from "@/server/cache/public-cache";
import type { PublicResourceCard, PublicStoreCard } from "@/types/public";

const MAX_PUBLIC_QUERY_LENGTH = 80;
const MAX_PUBLIC_FILTER_SLUG_LENGTH = 64;
const RESOURCE_BROWSE_SORT_OPTIONS = new Set([
  "newest",
  "popular",
  "rating",
  "price-asc",
  "price-desc",
  "oldest",
]);
const STORE_BROWSE_SORT_OPTIONS = new Set(["newest", "alphabetical", "resources"]);

type ResourceBrowseOptions = {
  q?: string;
  category?: string;
  tag?: string;
  price?: string;
  store?: string;
  sort?: string;
};

type StoreBrowseSort = "newest" | "alphabetical" | "resources";

function normaliseBrowseText(value?: string, maxLength = MAX_PUBLIC_QUERY_LENGTH) {
  return value?.trim().slice(0, maxLength) || "";
}

function normaliseBrowseSlug(value?: string) {
  return normaliseBrowseText(value, MAX_PUBLIC_FILTER_SLUG_LENGTH).toLowerCase();
}

function normaliseResourceBrowsePrice(value?: string) {
  const price = normaliseBrowseText(value, 10).toLowerCase();
  return price === "free" || price === "paid" ? price : "";
}

function normaliseResourceBrowseSort(value?: string) {
  const sort = normaliseBrowseText(value, 20).toLowerCase();
  return RESOURCE_BROWSE_SORT_OPTIONS.has(sort) ? sort : "newest";
}

function normaliseStoreBrowseSort(value?: string): StoreBrowseSort {
  const sort = normaliseBrowseText(value, 20).toLowerCase();
  return STORE_BROWSE_SORT_OPTIONS.has(sort) ? (sort as StoreBrowseSort) : "newest";
}

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
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  },
} satisfies Prisma.ResourceSelect;

type ResourceCardRecord = Prisma.ResourceGetPayload<{
  select: typeof resourceCardSelect;
}>;

function toPublicResourceCard(resource: ResourceCardRecord): PublicResourceCard {
  const previewImageUrl =
    resource.thumbnailUrl ||
    resource.files.find((file) => file.kind === "THUMBNAIL")?.fileUrl ||
    resource.files.find((file) => file.kind === "PREVIEW")?.fileUrl ||
    null;

  return {
    id: resource.id,
    slug: resource.slug,
    title: resource.title,
    shortDescription: resource.shortDescription,
    thumbnailUrl: resource.thumbnailUrl,
    previewImageUrl,
    priceCents: resource.priceCents,
    isFree: resource.isFree,
    averageRating: resource.averageRating,
    reviewCount: resource.reviewCount,
    downloadReady: resource.files.some((file) => file.kind === "MAIN_DOWNLOAD"),
    store: resource.store
      ? {
          name: resource.store.name,
          slug: resource.store.slug,
          isVerified: resource.store.isVerified,
        }
      : null,
    creator: resource.creator
      ? {
          name: resource.creator.name,
        }
      : null,
    categories: resource.categories.map((item) => item.category),
  };
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

export async function getPublishedResourceMetadata(slug: string) {
  const pageData = await getPublishedResourcePageData(slug);
  return pageData?.resource ?? null;
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
              categoryId: true,
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
              mimeType: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
          reviews: {
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
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

      const relatedCategoryIds = resource.categories
        .map((item) => item.categoryId)
        .slice(0, 2);

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
            ...(relatedCategoryIds.length > 0
              ? [
                  {
                    categories: {
                      some: {
                        categoryId: {
                          in: relatedCategoryIds,
                        },
                      },
                    },
                  },
                ]
              : []),
          ],
        },
        select: resourceCardSelect,
        orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
        take: 3,
      });

      return {
        resource,
        relatedResources: relatedResources.map(toPublicResourceCard),
      };
    },
    ["public-resource-page", slug],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.resources, PUBLIC_CACHE_TAGS.resourcePage(slug)],
    }
  )();
}

export async function getPublishedStoreMetadata(slug: string) {
  const pageData = await getPublishedStorePageData(slug);

  if (!pageData) {
    return null;
  }

  return {
    name: pageData.name,
    bio: pageData.bio,
    logoUrl: pageData.logoUrl,
    isPublished: pageData.isPublished,
    slug: pageData.slug,
  };
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

      return {
        ...store,
        followerCount: store._count.followers,
        resourceCount: store._count.resources,
        resources: store.resources.map(toPublicResourceCard),
      };
    },
    ["public-store-page", slug],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.stores, PUBLIC_CACHE_TAGS.storePage(slug)],
    }
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
        featuredResources: featuredResources.map(toPublicResourceCard),
        recentResources: recentResources.map(toPublicResourceCard),
      };
    },
    ["homepage-resource-showcase"],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.home, PUBLIC_CACHE_TAGS.resources],
    }
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
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.home, PUBLIC_CACHE_TAGS.resources],
    }
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
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.home, PUBLIC_CACHE_TAGS.resources, PUBLIC_CACHE_TAGS.stores],
    }
  )();
}

export function getResourceBrowseFacets() {
  return unstable_cache(
    async () => {
      const [categories, tags] = await Promise.all([
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
      ]);

      return {
        categories,
        tags,
      };
    },
    ["public-resource-browse-facets"],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.resources, PUBLIC_CACHE_TAGS.resourceBrowse],
    }
  )();
}

export function getPublishedResourcesBrowseData(options: ResourceBrowseOptions) {
  const q = normaliseBrowseText(options.q);
  const category = normaliseBrowseSlug(options.category);
  const tag = normaliseBrowseSlug(options.tag);
  const price = normaliseResourceBrowsePrice(options.price);
  const store = normaliseBrowseSlug(options.store);
  const sort = normaliseResourceBrowseSort(options.sort);

  return unstable_cache(
    async (): Promise<PublicResourceCard[]> => {
      const resources = await db.resource.findMany({
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
      });

      return resources.map(toPublicResourceCard);
    },
    ["public-resource-browse-data", q, category, tag, price, store, sort],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.resources, PUBLIC_CACHE_TAGS.resourceBrowse],
    }
  )();
}

export async function getResourceBrowseFilters(options: ResourceBrowseOptions) {
  const [facets, resources] = await Promise.all([
    getResourceBrowseFacets(),
    getPublishedResourcesBrowseData(options),
  ]);

  return {
    ...facets,
    resources,
  };
}

export function getPublishedStoresBrowseData(options: {
  query?: string;
  sort?: StoreBrowseSort;
}) {
  const query = normaliseBrowseText(options.query);
  const sort = normaliseStoreBrowseSort(options.sort);

  return unstable_cache(
    async (): Promise<PublicStoreCard[]> => {
      const stores = await db.store.findMany({
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
      });

      return stores.map((store) => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        bio: store.bio,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        location: store.location,
        isVerified: store.isVerified,
        followerCount: store._count.followers,
        resourceCount: store._count.resources,
      }));
    },
    ["public-stores-browse", query, sort],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.stores, PUBLIC_CACHE_TAGS.storeBrowse],
    }
  )();
}
