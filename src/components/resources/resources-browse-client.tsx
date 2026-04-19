"use client";

import { startTransition, useEffect, useMemo, useState } from"react";
import { usePathname, useRouter, useSearchParams } from"next/navigation";
import { ResourceGrid } from"@/components/resources/resource-grid";
import type {
  PublicBrowsePageInfo,
  PublicCategorySummary,
  PublicResourceCard,
} from"@/types/public";

type BrowsePayload = {
  resources: PublicResourceCard[];
  pageInfo: PublicBrowsePageInfo;
};

type BrowseClientProps = {
  categories: PublicCategorySummary[];
  tags: PublicCategorySummary[];
  initialResources: PublicResourceCard[];
  initialPageInfo: PublicBrowsePageInfo;
};

type ResourceBrowseFilters = {
  q: string;
  category: string;
  tag: string;
  price: string;
  store: string;
  sort: string;
  page: number;
};

function normalisePage(value: string | null) {
  const page = Number(value);
  return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
}

function getFiltersFromSearchParams(searchParams: URLSearchParams): ResourceBrowseFilters {
  return {
    q: searchParams.get("q")?.trim() ||"",
    category: searchParams.get("category")?.trim() ||"",
    tag: searchParams.get("tag")?.trim() ||"",
    price: searchParams.get("price")?.trim() ||"",
    store: searchParams.get("store")?.trim() ||"",
    sort: searchParams.get("sort")?.trim() ||"newest",
    page: normalisePage(searchParams.get("page")),
  };
}

function getResourceBrowsePath(filters: ResourceBrowseFilters) {
  return filters.q ?"/search" :"/resources";
}

function buildSearchUrl(filters: ResourceBrowseFilters) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.price) params.set("price", filters.price);
  if (filters.store) params.set("store", filters.store);
  if (filters.sort && filters.sort !=="newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const pathname = getResourceBrowsePath(filters);
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function hasActiveFilters(filters: ResourceBrowseFilters) {
  return Boolean(
    filters.q ||
      filters.category ||
      filters.tag ||
      filters.price ||
      filters.store ||
      filters.sort !=="newest" ||
      filters.page > 1
  );
}

function buildRequestParams(filters: ResourceBrowseFilters) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.price) params.set("price", filters.price);
  if (filters.store) params.set("store", filters.store);
  if (filters.sort !=="newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

export function ResourcesBrowseClient({
  categories,
  tags,
  initialResources,
  initialPageInfo,
}: BrowseClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => getFiltersFromSearchParams(searchParams), [searchParams]);
  const isSearchSurface = pathname ==="/search";
  const formKey = useMemo(() => buildSearchUrl(filters), [filters]);
  const categoryLabels = useMemo(
    () => new Map(categories.map((item) => [item.slug, item.name])),
    [categories]
  );
  const tagLabels = useMemo(() => new Map(tags.map((item) => [item.slug, item.name])), [tags]);

  const [resources, setResources] = useState(initialResources);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSearchSurface && !filters.q) {
      setResources(initialResources);
      setPageInfo(initialPageInfo);
      setError(null);
      setLoading(false);
      return;
    }

    if (!hasActiveFilters(filters)) {
      setResources(initialResources);
      setPageInfo(initialPageInfo);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestUrl = `/api/resources?${buildRequestParams(filters).toString()}`;

    setLoading(true);
    setError(null);

    fetch(requestUrl, {
      cache:"force-cache",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load resources.");
        }

        return (await response.json()) as BrowsePayload;
      })
      .then((payload) => {
        setResources(payload.resources);
        setPageInfo(payload.pageInfo);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error ? fetchError.message :"Unable to load resources."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [filters, initialPageInfo, initialResources, isSearchSurface]);

  const activeFiltersCount = [
    filters.q,
    filters.category,
    filters.tag,
    filters.price,
    filters.store,
  ].filter(Boolean).length;

  function handleSubmit(formData: FormData) {
    const nextFilters: ResourceBrowseFilters = {
      q: String(formData.get("q") ||"").trim(),
      category: String(formData.get("category") ||"").trim(),
      tag: String(formData.get("tag") ||"").trim(),
      price: String(formData.get("price") ||"").trim(),
      store: String(formData.get("store") ||"").trim(),
      sort: String(formData.get("sort") ||"").trim() ||"newest",
      page: 1,
    };

    startTransition(() => {
      router.replace(buildSearchUrl(nextFilters));
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.replace("/resources");
    });
  }

  function goToPage(page: number) {
    startTransition(() => {
      router.replace(
        buildSearchUrl({
          ...filters,
          page,
        })
      );
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            {isSearchSurface ?"Search Resources" :"Browse Resources"}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {isSearchSurface
              ?"Search psychology resources by keyword, topic, creator, store, or tag."
              :"Discover worksheets, handouts, templates, psychoeducation packs, and more."}
          </p>
        </div>

        <div className="text-sm text-[var(--text-light)]">
          {loading
            ?"Updating results..."
            : `${resources.length} resource${resources.length === 1 ?"" :"s"}`}
          {activeFiltersCount > 0 ?" matched your filters" :""}
          {pageInfo.page > 1 ? ` on page ${pageInfo.page}` :""}
        </div>
      </div>

      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <form
          key={formKey}
          action={handleSubmit}
          className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <div>
            <label htmlFor="q" className="mb-2 block text-sm font-medium text-[var(--text)]">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
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
              defaultValue={filters.category}
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
              defaultValue={filters.tag}
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
              defaultValue={filters.price}
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
              defaultValue={filters.sort}
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

          {filters.store ? <input type="hidden" name="store" value={filters.store} /> : null}

          <div className="flex flex-wrap items-end gap-3">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Clear all filters
          </button>

          {filters.q ? (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] break-words">
              Search: {filters.q}
            </span>
          ) : null}

          {filters.category ? (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] break-words">
              Category: {categoryLabels.get(filters.category) || filters.category}
            </span>
          ) : null}

          {filters.tag ? (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] break-words">
              Tag: {tagLabels.get(filters.tag) || filters.tag}
            </span>
          ) : null}

          {filters.price ? (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] break-words">
              Price: {filters.price}
            </span>
          ) : null}

          {filters.store ? (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] break-words">
              Store: {filters.store}
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isSearchSurface && !filters.q ? (
        <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-10 text-center shadow-sm">
          <h2 className="heading-section">Start with a keyword</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Search by resource title, creator, store, topic, or tag to see matching results.
          </p>
        </div>
      ) : (
        <>
          <div className="defer-section">
            <ResourceGrid resources={resources} />
          </div>

          {resources.length > 0 && (pageInfo.hasPreviousPage || pageInfo.hasNextPage) ? (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
              <button
                type="button"
                onClick={() => pageInfo.previousPage && goToPage(pageInfo.previousPage)}
                disabled={!pageInfo.hasPreviousPage}
                className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous page
              </button>

              <div className="text-sm text-[var(--text-muted)]">
                Page {pageInfo.page}
              </div>

              <button
                type="button"
                onClick={() => pageInfo.nextPage && goToPage(pageInfo.nextPage)}
                disabled={!pageInfo.hasNextPage}
                className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next page
              </button>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
