import type { Metadata } from "next";
import Link from "next/link";
import { getAppBaseUrl } from "@/lib/env";
import { ResourceGrid } from "@/components/resources/resource-grid";
import { getResourceBrowseFilters } from "@/server/queries/public-content";

type ResourcesPageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    tag?: string;
    price?: string;
    store?: string;
    sort?: string;
  }>;
};

function normaliseSingle(value?: string) {
  return typeof value === "string" ? value.trim() : "";
}

export async function generateMetadata({
  searchParams,
}: ResourcesPageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const q = normaliseSingle(params.q);
  const category = normaliseSingle(params.category);
  const tag = normaliseSingle(params.tag);
  const price = normaliseSingle(params.price);
  const store = normaliseSingle(params.store);
  const sort = normaliseSingle(params.sort) || "newest";
  const hasFilters = [q, category, tag, price, store].some(Boolean) || sort !== "newest";
  const baseUrl = getAppBaseUrl();

  let title = "Browse Psychology Resources";
  let description =
    "Browse clinician-made psychology resources including worksheets, handouts, templates, and psychoeducation tools.";

  if (category && !q && !tag && !price && !store) {
    title = `Browse ${category.replaceAll("-", " ")} Resources`;
  } else if (q) {
    title = `Search Resources for "${q}"`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/resources`,
    },
    robots: hasFilters
      ? {
          index: false,
          follow: true,
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/resources`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Page({ searchParams }: ResourcesPageProps) {
  const params = (await searchParams) ?? {};

  const q = normaliseSingle(params.q);
  const category = normaliseSingle(params.category);
  const tag = normaliseSingle(params.tag);
  const price = normaliseSingle(params.price);
  const store = normaliseSingle(params.store);
  const sort = normaliseSingle(params.sort) || "newest";

  const { categories, tags, resources } = await getResourceBrowseFilters({
    q,
    category,
    tag,
    price,
    store,
    sort,
  });

  const activeFiltersCount = [q, category, tag, price, store].filter(Boolean).length;

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
