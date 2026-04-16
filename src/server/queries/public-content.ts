import { unstable_cache } from "next/cache";
import { Prisma, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { logTimedOperation, startTimer } from "@/lib/performance";
import { isPaidResourcePayoutReady, isPayoutAccountReady } from "@/lib/stripe-connect";
import {
  DEFAULT_RESOURCE_CATEGORIES,
  DEFAULT_RESOURCE_TAGS,
  HOMEPAGE_FEATURED_CATEGORY_SLUGS,
} from "@/lib/resource-taxonomy";
import {
  getPubliclyVisiblePublishedResourceWhere,
  getPubliclyVisibleStoreWhere,
  PUBLIC_VISIBILITY_CACHE_VERSION,
} from "@/lib/public-resource-visibility";
import {
  PUBLIC_CACHE_TAGS,
  PUBLIC_CONTENT_REVALIDATE_SECONDS,
} from "@/server/cache/public-cache";
import type {
  PublicBrowsePageInfo,
  PublicResourceCard,
  PublicStoreCard,
} from "@/types/public";

const MAX_PUBLIC_QUERY_LENGTH = 80;
const MAX_PUBLIC_FILTER_SLUG_LENGTH = 64;
const MAX_PUBLIC_BROWSE_PAGE = 50;
export const PUBLIC_RESOURCE_BROWSE_PAGE_SIZE = 24;
export const PUBLIC_STORE_BROWSE_PAGE_SIZE = 18;
export const PUBLIC_STORE_PAGE_RESOURCE_PAGE_SIZE = 12;
const PUBLIC_RESOURCE_PAGE_REVIEW_LIMIT = 10;
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
  page?: string | number;
};

type TemplateLandingQueryOptions = {
  query?: string;
  categorySlugs?: string[];
  tagSlugs?: string[];
  price?: string;
  sort?: string;
  limit?: number;
};

type StoreBrowseSort = "newest" | "alphabetical" | "resources";
type TaxonomyItem = { id: string; name: string; slug: string };
type HomepageCategoryItem = TaxonomyItem & {
  _count: {
    resources: number;
  };
};

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

function normaliseBrowsePage(value?: string | number) {
  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.min(Math.floor(page), MAX_PUBLIC_BROWSE_PAGE);
}

function mergeTaxonomyItems(
  defaults: { name: string; slug: string }[],
  records: TaxonomyItem[]
): TaxonomyItem[] {
  const recordMap = new Map(records.map((item) => [item.slug, item]));
  const defaultSlugs = new Set(defaults.map((item) => item.slug));

  const mergedDefaults = defaults.map((item) => {
    const record = recordMap.get(item.slug);

    return {
      id: record?.id ?? `default-${item.slug}`,
      name: record?.name ?? item.name,
      slug: item.slug,
    };
  });

  const recordOnlyItems = records.filter((item) => !defaultSlugs.has(item.slug));

  return [...mergedDefaults, ...recordOnlyItems].sort((a, b) => a.name.localeCompare(b.name));
}

function mergeHomepageCategoryItems(records: HomepageCategoryItem[]) {
  const recordMap = new Map(records.map((item) => [item.slug, item]));
  const defaultSlugs = new Set(DEFAULT_RESOURCE_CATEGORIES.map((item) => item.slug));

  const mergedDefaults = DEFAULT_RESOURCE_CATEGORIES.map((item) => {
    const record = recordMap.get(item.slug);

    return {
      id: record?.id ?? `default-${item.slug}`,
      name: record?.name ?? item.name,
      slug: item.slug,
      _count: {
        resources: record?._count.resources ?? 0,
      },
    };
  });

  const recordOnlyItems = records.filter((item) => !defaultSlugs.has(item.slug));

  return [...mergedDefaults, ...recordOnlyItems];
}

function createPublicBrowsePageInfo(
  page: number,
  pageSize: number,
  hasNextPage: boolean
): PublicBrowsePageInfo {
  return {
    page,
    pageSize,
    hasNextPage,
    hasPreviousPage: page > 1,
    nextPage: hasNextPage ? page + 1 : null,
    previousPage: page > 1 ? page - 1 : null,
  };
}

const resourceCardSelect = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  thumbnailUrl: true,
  previewImageUrl: true,
  priceCents: true,
  isFree: true,
  hasMainFile: true,
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
} satisfies Prisma.ResourceSelect;

type ResourceCardRecord = Prisma.ResourceGetPayload<{
  select: typeof resourceCardSelect;
}>;

function toPublicResourceCard(resource: ResourceCardRecord): PublicResourceCard {
  return {
    id: resource.id,
    slug: resource.slug,
    title: resource.title,
    shortDescription: resource.shortDescription,
    thumbnailUrl: resource.thumbnailUrl,
    previewImageUrl: resource.previewImageUrl || resource.thumbnailUrl,
    priceCents: resource.priceCents,
    isFree: resource.isFree,
    averageRating: resource.averageRating,
    reviewCount: resource.reviewCount,
    downloadReady: resource.hasMainFile,
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

export function getPublishedResourceMetadata(slug: string) {
  return unstable_cache(
    async () => {
      const queryTimer = startTimer();

      try {
        return await db.resource.findFirst({
          where: getPubliclyVisiblePublishedResourceWhere({
            slug,
          }),
          select: {
            slug: true,
            status: true,
            title: true,
            description: true,
            shortDescription: true,
            thumbnailUrl: true,
          },
        });
      } finally {
        logTimedOperation("query.public.resource.metadata", queryTimer.elapsedMs(), {
          infoAtMs: 80,
          warnAtMs: 250,
          context: { slug },
        });
      }
    },
    [PUBLIC_VISIBILITY_CACHE_VERSION, "public-resource-metadata", slug],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.resources, PUBLIC_CACHE_TAGS.resourcePage(slug)],
    }
  )();
}

export function getPublishedResourcePageData(slug: string) {
  return unstable_cache(
    async () => {
      const queryTimer = startTimer();

      try {
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
            previewImageUrl: true,
            mainDownloadUrl: true,
            hasMainFile: true,
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
                owner: {
                  select: {
                    isSuperAdmin: true,
                    payoutAccount: {
                      select: {
                        payoutsEnabled: true,
                        detailsSubmitted: true,
                      },
                    },
                  },
                },
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
          },
        });

        const creatorCanSellPaidResources = isPaidResourcePayoutReady({
          user: {
            isSuperAdmin: resource?.store?.owner?.isSuperAdmin,
          },
          payoutReady: isPayoutAccountReady(resource?.store?.owner?.payoutAccount),
        });

        if (
          !resource ||
          resource.status !== "PUBLISHED" ||
          (!resource.isFree && resource.priceCents > 0 && !creatorCanSellPaidResources)
        ) {
          return null;
        }

        return {
          resource,
        };
      } finally {
        logTimedOperation("query.public.resource.page", queryTimer.elapsedMs(), {
          infoAtMs: 120,
          warnAtMs: 400,
          context: { slug },
        });
      }
    },
    [PUBLIC_VISIBILITY_CACHE_VERSION, "public-resource-page", slug],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.resources, PUBLIC_CACHE_TAGS.resourcePage(slug)],
    }
  )();
}

export function getPublishedResourceReviews(options: {
  resourceId: string;
  resourceSlug: string;
}) {
  return unstable_cache(
    async () => {
      const queryTimer = startTimer();

      try {
        return await db.review.findMany({
          where: {
            resourceId: options.resourceId,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: PUBLIC_RESOURCE_PAGE_REVIEW_LIMIT,
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
        });
      } finally {
        logTimedOperation("query.public.resource.reviews", queryTimer.elapsedMs(), {
          infoAtMs: 100,
          warnAtMs: 350,
          context: {
            resourceId: options.resourceId,
            resourceSlug: options.resourceSlug,
          },
        });
      }
    },
    ["public-resource-reviews", options.resourceId],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.resources, PUBLIC_CACHE_TAGS.resourcePage(options.resourceSlug)],
    }
  )();
}

export function getRelatedPublishedResources(options: {
  resourceId: string;
  resourceSlug: string;
  storeId?: string | null;
  relatedCategoryIds: string[];
}) {
  const relatedCategoryIds = options.relatedCategoryIds.slice(0, 2);
  const relatedWhereClauses: Prisma.ResourceWhereInput[] = [
    ...(options.storeId
      ? [
          {
            storeId: options.storeId,
          },
        ]
      : []),
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
  ];

  return unstable_cache(
    async () => {
      const queryTimer = startTimer();

      try {
        if (relatedWhereClauses.length === 0) {
          return [];
        }

        const relatedResources = await db.resource.findMany({
          where: getPubliclyVisiblePublishedResourceWhere({
            id: {
              not: options.resourceId,
            },
            OR: relatedWhereClauses,
          }),
          select: resourceCardSelect,
          orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
          take: 6,
        });

        return relatedResources.map(toPublicResourceCard);
      } finally {
        logTimedOperation("query.public.resource.related", queryTimer.elapsedMs(), {
          infoAtMs: 100,
          warnAtMs: 350,
          context: {
            resourceId: options.resourceId,
            resourceSlug: options.resourceSlug,
            storeId: options.storeId ?? null,
            categoryCount: relatedCategoryIds.length,
          },
        });
      }
    },
    [
      PUBLIC_VISIBILITY_CACHE_VERSION,
      "public-resource-related",
      options.resourceId,
      options.storeId ?? "none",
      relatedCategoryIds.join(",") || "none",
    ],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.resources, PUBLIC_CACHE_TAGS.resourcePage(options.resourceSlug)],
    }
  )();
}

export function getPublishedStoreMetadata(slug: string) {
  return unstable_cache(
    async () => {
      const queryTimer = startTimer();

      try {
        return await db.store.findFirst({
          where: getPubliclyVisibleStoreWhere({
            slug,
          }),
          select: {
            name: true,
            bio: true,
            logoUrl: true,
            isPublished: true,
            slug: true,
          },
        });
      } finally {
        logTimedOperation("query.public.store.metadata", queryTimer.elapsedMs(), {
          infoAtMs: 80,
          warnAtMs: 250,
          context: { slug },
        });
      }
    },
    [PUBLIC_VISIBILITY_CACHE_VERSION, "public-store-metadata", slug],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.stores, PUBLIC_CACHE_TAGS.storePage(slug)],
    }
  )();
}

export function getPublishedStorePageData(slug: string) {
  return unstable_cache(
    async () => {
      const queryTimer = startTimer();

      try {
        const store = await db.store.findFirst({
          where: getPubliclyVisibleStoreWhere({ slug }),
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
                  where: getPubliclyVisiblePublishedResourceWhere(),
                },
              },
            },
            resources: {
              where: getPubliclyVisiblePublishedResourceWhere(),
              select: resourceCardSelect,
              orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
              take: 3,
            },
          },
        });

        if (!store) {
          return null;
        }

        const { _count, resources, ...storeData } = store;

        return {
          ...storeData,
          followerCount: _count.followers,
          resourceCount: _count.resources,
          featuredResources: resources.map(toPublicResourceCard),
        };
      } finally {
        logTimedOperation("query.public.store.page", queryTimer.elapsedMs(), {
          infoAtMs: 120,
          warnAtMs: 400,
          context: { slug },
        });
      }
    },
    [PUBLIC_VISIBILITY_CACHE_VERSION, "public-store-page", slug],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.stores, PUBLIC_CACHE_TAGS.storePage(slug)],
    }
  )();
}

export function getPublishedStoreResourcesPageData(options: {
  storeId: string;
  storeSlug: string;
  page?: string | number;
}) {
  const page = normaliseBrowsePage(options.page);

  return unstable_cache(
    async (): Promise<{
      resources: PublicResourceCard[];
      pageInfo: PublicBrowsePageInfo;
    }> => {
      const queryTimer = startTimer();

      try {
        const skip = (page - 1) * PUBLIC_STORE_PAGE_RESOURCE_PAGE_SIZE;
        const resources = await db.resource.findMany({
          where: getPubliclyVisiblePublishedResourceWhere({
            storeId: options.storeId,
          }),
          select: resourceCardSelect,
          orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
          skip,
          take: PUBLIC_STORE_PAGE_RESOURCE_PAGE_SIZE + 1,
        });

        const hasNextPage = resources.length > PUBLIC_STORE_PAGE_RESOURCE_PAGE_SIZE;

        return {
          resources: resources
            .slice(0, PUBLIC_STORE_PAGE_RESOURCE_PAGE_SIZE)
            .map(toPublicResourceCard),
          pageInfo: createPublicBrowsePageInfo(
            page,
            PUBLIC_STORE_PAGE_RESOURCE_PAGE_SIZE,
            hasNextPage
          ),
        };
      } finally {
        logTimedOperation("query.public.store.resources", queryTimer.elapsedMs(), {
          infoAtMs: 120,
          warnAtMs: 400,
          context: {
            storeId: options.storeId,
            storeSlug: options.storeSlug,
            page,
          },
        });
      }
    },
    [
      PUBLIC_VISIBILITY_CACHE_VERSION,
      "public-store-page-resources",
      options.storeId,
      String(page),
    ],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.stores, PUBLIC_CACHE_TAGS.storePage(options.storeSlug)],
    }
  )();
}

export function getHomepageResourceShowcaseData() {
  return unstable_cache(
    async () => {
      const [featuredResources, recentResources] = await Promise.all([
        db.resource.findMany({
          where: getPubliclyVisiblePublishedResourceWhere(),
          orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
          take: 6,
          select: resourceCardSelect,
        }),
        db.resource.findMany({
          where: getPubliclyVisiblePublishedResourceWhere(),
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
    [PUBLIC_VISIBILITY_CACHE_VERSION, "homepage-resource-showcase"],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.home, PUBLIC_CACHE_TAGS.resources],
    }
  )();
}

export function getHomepageCategoryData() {
  return unstable_cache(
    async () => {
      const categories = await db.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          resources: {
            where: {
              resource: {
                ...getPubliclyVisiblePublishedResourceWhere(),
              },
            },
            select: {
              resourceId: true,
            },
          },
        },
      });

      const mergedCategories = mergeHomepageCategoryItems(
        categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          _count: {
            resources: category.resources.length,
          },
        }))
      );

      const featuredItems = HOMEPAGE_FEATURED_CATEGORY_SLUGS.map((slug) =>
        mergedCategories.find((category) => category.slug === slug)
      ).filter(Boolean) as HomepageCategoryItem[];

      const featuredSlugSet = new Set(featuredItems.map((item) => item.slug));

      const remainingItems = mergedCategories
        .filter((category) => !featuredSlugSet.has(category.slug))
        .sort((a, b) => {
          if (b._count.resources !== a._count.resources) {
            return b._count.resources - a._count.resources;
          }

          return a.name.localeCompare(b.name);
        });

      return [...featuredItems, ...remainingItems].slice(0, 8);
    },
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
      const [totalResources, totalCreators, totalStores] = await Promise.all([
        db.resource.count({ where: getPubliclyVisiblePublishedResourceWhere() }),
        db.user.count({
          where: {
            role: UserRole.CREATOR,
          },
        }),
        db.store.count({ where: getPubliclyVisibleStoreWhere() }),
      ]);

      return {
        totalResources,
        totalCreators,
        totalStores,
      };
    },
    [PUBLIC_VISIBILITY_CACHE_VERSION, "homepage-stats"],
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
        categories: mergeTaxonomyItems(DEFAULT_RESOURCE_CATEGORIES, categories),
        tags: mergeTaxonomyItems(DEFAULT_RESOURCE_TAGS, tags),
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
  const page = normaliseBrowsePage(options.page);

  return unstable_cache(
    async (): Promise<{
      resources: PublicResourceCard[];
      pageInfo: PublicBrowsePageInfo;
    }> => {
      const skip = (page - 1) * PUBLIC_RESOURCE_BROWSE_PAGE_SIZE;
      const resources = await db.resource.findMany({
        where: getPubliclyVisiblePublishedResourceWhere({
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
        }),
        select: resourceCardSelect,
        orderBy: getResourceBrowseSortOrder(sort),
        skip,
        take: PUBLIC_RESOURCE_BROWSE_PAGE_SIZE + 1,
      });

      const hasNextPage = resources.length > PUBLIC_RESOURCE_BROWSE_PAGE_SIZE;

      return {
        resources: resources
          .slice(0, PUBLIC_RESOURCE_BROWSE_PAGE_SIZE)
          .map(toPublicResourceCard),
        pageInfo: createPublicBrowsePageInfo(
          page,
          PUBLIC_RESOURCE_BROWSE_PAGE_SIZE,
          hasNextPage
        ),
      };
    },
    [
      PUBLIC_VISIBILITY_CACHE_VERSION,
      "public-resource-browse-data",
      q,
      category,
      tag,
      price,
      store,
      sort,
      String(page),
    ],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.resources, PUBLIC_CACHE_TAGS.resourceBrowse],
    }
  )();
}

export function getPublishedTemplateLandingResources(options: TemplateLandingQueryOptions) {
  const query = normaliseBrowseText(options.query);
  const categorySlugs = Array.from(
    new Set((options.categorySlugs || []).map((slug) => normaliseBrowseSlug(slug)).filter(Boolean))
  );
  const tagSlugs = Array.from(
    new Set((options.tagSlugs || []).map((slug) => normaliseBrowseSlug(slug)).filter(Boolean))
  );
  const price = normaliseResourceBrowsePrice(options.price);
  const sort = normaliseResourceBrowseSort(options.sort);
  const limit = Math.min(Math.max(Number(options.limit) || 12, 1), PUBLIC_RESOURCE_BROWSE_PAGE_SIZE);
  const andFilters: Prisma.ResourceWhereInput[] = [
    ...categorySlugs.map((slug) => ({
      categories: {
        some: {
          category: {
            slug,
          },
        },
      },
    })),
    ...tagSlugs.map((slug) => ({
      tags: {
        some: {
          tag: {
            slug,
          },
        },
      },
    })),
  ];

  return unstable_cache(
    async (): Promise<PublicResourceCard[]> => {
      const resources = await db.resource.findMany({
        where: getPubliclyVisiblePublishedResourceWhere({
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
          ...(query
            ? {
                OR: [
                  {
                    title: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                  {
                    shortDescription: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                  {
                    description: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                  {
                    slug: {
                      contains: query.toLowerCase().replace(/\s+/g, "-"),
                    },
                  },
                ],
              }
            : {}),
          ...(andFilters.length
            ? {
                AND: andFilters,
              }
            : {}),
        }),
        select: resourceCardSelect,
        orderBy: getResourceBrowseSortOrder(sort),
        take: limit,
      });

      return resources.map(toPublicResourceCard);
    },
    [
      PUBLIC_VISIBILITY_CACHE_VERSION,
      "template-landing-resources",
      query,
      categorySlugs.join("|"),
      tagSlugs.join("|"),
      price,
      sort,
      String(limit),
    ],
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
  page?: string | number;
}) {
  const query = normaliseBrowseText(options.query);
  const sort = normaliseStoreBrowseSort(options.sort);
  const page = normaliseBrowsePage(options.page);

  return unstable_cache(
    async (): Promise<{
      stores: PublicStoreCard[];
      pageInfo: PublicBrowsePageInfo;
    }> => {
      const skip = (page - 1) * PUBLIC_STORE_BROWSE_PAGE_SIZE;
      const stores = await db.store.findMany({
        where: getPubliclyVisibleStoreWhere(
          query
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
            : {}
        ),
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
                where: getPubliclyVisiblePublishedResourceWhere(),
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
        skip,
        take: PUBLIC_STORE_BROWSE_PAGE_SIZE + 1,
      });

      const hasNextPage = stores.length > PUBLIC_STORE_BROWSE_PAGE_SIZE;

      return {
        stores: stores.slice(0, PUBLIC_STORE_BROWSE_PAGE_SIZE).map((store) => ({
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
        })),
        pageInfo: createPublicBrowsePageInfo(
          page,
          PUBLIC_STORE_BROWSE_PAGE_SIZE,
          hasNextPage
        ),
      };
    },
    [PUBLIC_VISIBILITY_CACHE_VERSION, "public-stores-browse", query, sort, String(page)],
    {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.stores, PUBLIC_CACHE_TAGS.storeBrowse],
    }
  )();
}
