import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ResourceGrid } from "@/components/resources/resource-grid";

type ResourcesPageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    tag?: string;
    price?: string;
    sort?: string;
  }>;
};

function normaliseSingle(value?: string) {
  return typeof value === "string" ? value.trim() : "";
}

function getSortOrder(sort: string): Prisma.ResourceOrderByWithRelationInput[] {
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

export default async function Page({ searchParams }: ResourcesPageProps) {
  const params = (await searchParams) ?? {};

  const q = normaliseSingle(params.q);
  const category = normaliseSingle(params.category);
  const tag = normaliseSingle(params.tag);
  const price = normaliseSingle(params.price);
  const sort = normaliseSingle(params.sort) || "newest";

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
      include: {
        store: true,
        tags: {
          include: {
            tag: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
      orderBy: getSortOrder(sort),
    }),
  ]);

  const activeFiltersCount = [q, category, tag, price].filter(Boolean).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            Browse Resources
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Discover worksheets, handouts, templates, psychoeducation packs, and more.
          </p>
        </div>

        <div className="text-sm text-[var(--text-light)]">
          {resources.length} resource{resources.length === 1 ? "" : "s"}
          {activeFiltersCount > 0 ? " matched your filters" : ""}
        </div>
      </div>

      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <form method="GET" className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
          <div>
            <label htmlFor="q" className="mb-2 block text-sm font-medium text-[var(--text)]">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Search by title, topic, tag, creator, or description"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-medium text-[var(--text)]"
            >
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={category}
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tag" className="mb-2 block text-sm font-medium text-[var(--text)]">
              Tag
            </label>
            <select
              id="tag"
              name="tag"
              defaultValue={tag}
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            >
              <option value="">All tags</option>
              {tags.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="price" className="mb-2 block text-sm font-medium text-[var(--text)]">
              Price
            </label>
            <select
              id="price"
              name="price"
              defaultValue={price}
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            >
              <option value="">All</option>
              <option value="free">Free only</option>
              <option value="paid">Paid only</option>
            </select>
          </div>

          <div>
            <label htmlFor="sort" className="mb-2 block text-sm font-medium text-[var(--text)]">
              Sort
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            >
              <option value="newest">Newest</option>
              <option value="popular">Most popular</option>
              <option value="rating">Best rated</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/resources"
            className="inline-flex items-center rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Clear all filters
          </Link>

          {q ? (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)]">
              Search: {q}
            </span>
          ) : null}

          {category ? (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)]">
              Category: {category}
            </span>
          ) : null}

          {tag ? (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)]">
              Tag: {tag}
            </span>
          ) : null}

          {price ? (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)]">
              Price: {price}
            </span>
          ) : null}
        </div>
      </div>

      <div className="defer-section">
        <ResourceGrid resources={resources} />
      </div>
    </main>
  );
}
