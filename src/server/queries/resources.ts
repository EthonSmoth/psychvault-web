import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getPubliclyVisiblePublishedResourceWhere } from "@/lib/public-resource-visibility";

export type ResourceFilters = {
  query?: string;
  category?: string;
  tag?: string;
  sort?: "newest" | "best-selling" | "top-rated" | "price-asc" | "price-desc";
  storeSlug?: string;
};

export async function listPublishedResources(filters: ResourceFilters = {}) {
  const where: Prisma.ResourceWhereInput = getPubliclyVisiblePublishedResourceWhere({
    ...(filters.query
      ? {
          OR: [
            { title: { contains: filters.query, mode: "insensitive" } },
            { description: { contains: filters.query, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.category
      ? { categories: { some: { category: { slug: filters.category } } } }
      : {}),
    ...(filters.tag ? { tags: { some: { tag: { slug: filters.tag } } } } : {}),
    ...(filters.storeSlug ? { store: { slug: filters.storeSlug } } : {}),
  });

  const orderBy: Prisma.ResourceOrderByWithRelationInput[] =
    filters.sort === "best-selling"
      ? [{ salesCount: "desc" }, { createdAt: "desc" }]
      : filters.sort === "top-rated"
        ? [{ averageRating: "desc" }, { reviewCount: "desc" }]
        : filters.sort === "price-asc"
          ? [{ priceCents: "asc" }]
          : filters.sort === "price-desc"
            ? [{ priceCents: "desc" }]
            : [{ createdAt: "desc" }];

  return db.resource.findMany({
    where,
    orderBy,
    include: {
      store: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      files: true
    }
  });
}

export async function getPublishedResourceBySlug(slug: string) {
  return db.resource.findFirst({
    where: getPubliclyVisiblePublishedResourceWhere({ slug }),
    include: {
      store: true,
      creator: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      files: true,
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { buyer: true }
      }
    }
  });
}
