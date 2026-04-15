"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { PublicBrowsePageInfo, PublicStoreCard } from "@/types/public";

type StoresPayload = {
  stores: PublicStoreCard[];
  pageInfo: PublicBrowsePageInfo;
};

const SORT_OPTIONS = [
  { value: "newest", label: "Recently updated" },
  { value: "resources", label: "Most resources" },
  { value: "alphabetical", label: "A to Z" },
] as const;

type StoreFilters = {
  q: string;
  sort: (typeof SORT_OPTIONS)[number]["value"];
  page: number;
};

function normalisePage(value: string | null) {
  const page = Number(value);
  return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
}

function getFiltersFromSearchParams(searchParams: URLSearchParams): StoreFilters {
  const sortValue = searchParams.get("sort")?.trim() || "newest";

  return {
    q: searchParams.get("q")?.trim() || "",
    sort: SORT_OPTIONS.some((option) => option.value === sortValue)
      ? (sortValue as StoreFilters["sort"])
      : "newest",
    page: normalisePage(searchParams.get("page")),
  };
}

function buildSearchUrl(filters: StoreFilters) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const queryString = params.toString();
  return queryString ? `/stores?${queryString}` : "/stores";
}

function hasActiveFilters(filters: StoreFilters) {
  return Boolean(filters.q || filters.sort !== "newest" || filters.page > 1);
}

export function StoresBrowseClient({
  initialStores,
  initialPageInfo,
}: {
  initialStores: PublicStoreCard[];
  initialPageInfo: PublicBrowsePageInfo;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => getFiltersFromSearchParams(searchParams), [searchParams]);
  const formKey = useMemo(() => buildSearchUrl(filters), [filters]);

  const [stores, setStores] = useState(initialStores);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasActiveFilters(filters)) {
      setStores(initialStores);
      setPageInfo(initialPageInfo);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    if (filters.sort !== "newest") params.set("sort", filters.sort);
    if (filters.page > 1) params.set("page", String(filters.page));

    const requestUrl = `/api/stores?${params.toString()}`;

    setLoading(true);
    setError(null);

    fetch(requestUrl, {
      cache: "force-cache",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load stores.");
        }

        return (await response.json()) as StoresPayload;
      })
      .then((payload) => {
        setStores(payload.stores);
        setPageInfo(payload.pageInfo);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Unable to load stores.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [filters, initialPageInfo, initialStores]);

  function handleSubmit(formData: FormData) {
    const nextFilters: StoreFilters = {
      q: String(formData.get("q") || "").trim(),
      sort: SORT_OPTIONS.some((option) => option.value === String(formData.get("sort") || ""))
        ? (String(formData.get("sort")) as StoreFilters["sort"])
        : "newest",
      page: 1,
    };

    startTransition(() => {
      router.replace(buildSearchUrl(nextFilters));
    });
  }

  function clearSearch() {
    startTransition(() => {
      router.replace("/stores");
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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
            Browse creators
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
            Explore stores by creator
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)] sm:text-base">
            Browse live creator storefronts, discover specialties, and jump straight into each
            store&apos;s published psychology resources.
          </p>
        </div>

        <form
          key={formKey}
          action={handleSubmit}
          className="mt-8 grid gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-alt)] p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto]"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text)]">
              Search stores
            </span>
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Search by store name, bio, or location"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text)]">Sort by</span>
            <select
              name="sort"
              defaultValue={filters.sort}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
            >
              Browse stores
            </button>
          </div>
        </form>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[var(--text-muted)]">
            {loading
              ? "Updating stores..."
              : `${stores.length} ${stores.length === 1 ? "store" : "stores"} found`}
            {filters.q ? ` for "${filters.q}"` : ""}
            {pageInfo.page > 1 ? ` on page ${pageInfo.page}` : ""}
          </div>
          {filters.q || filters.sort !== "newest" || filters.page > 1 ? (
            <button
              type="button"
              onClick={clearSearch}
              className="text-sm font-medium text-[var(--text)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--accent)]"
            >
              Clear search
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {stores.length === 0 ? (
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text)]">No stores matched that search</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Try a different keyword, or browse all live stores again.
            </p>
            <button
              type="button"
              onClick={clearSearch}
              className="mt-5 inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
            >
              View all stores
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {stores.map((store, index) => (
                <article
                  key={store.id}
                  className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(63,45,31,0.12)]"
                >
                  <Link href={`/stores/${store.slug}`} className="block">
                    <div className="relative h-36 bg-[var(--surface)]">
                      {store.bannerUrl ? (
                        <Image
                          src={store.bannerUrl}
                          alt={`${store.name} banner`}
                          fill
                          priority={index < 3}
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-r from-[var(--primary-dark)] via-[var(--primary)] to-[var(--accent)]" />
                      )}
                    </div>
                  </Link>

                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <Link
                        href={`/stores/${store.slug}`}
                        className="-mt-10 relative flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border-4 border-[var(--card)] bg-[var(--primary)] text-lg font-semibold text-white shadow-sm"
                      >
                        {store.logoUrl ? (
                          <Image
                            src={store.logoUrl}
                            alt={`${store.name} logo`}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <span>{store.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/stores/${store.slug}`}
                            className="text-lg font-semibold text-[var(--text)] hover:text-[var(--accent)]"
                          >
                            {store.name}
                          </Link>
                          {store.isVerified ? <VerifiedBadge size="sm" /> : null}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[var(--text-light)]">
                          <span>{store.resourceCount} resources</span>
                          <span>{store.followerCount} followers</span>
                          <span>{store.location || "Australia"}</span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-4 min-h-[6rem] text-sm leading-6 text-[var(--text-muted)]">
                      {store.bio?.trim() ||
                        "Browse this creator's published resources and store updates on PsychVault."}
                    </p>

                    <div className="mt-5 flex gap-3">
                      <Link
                        href={`/stores/${store.slug}`}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
                      >
                        Visit store
                      </Link>
                      <Link
                        href={`/resources?store=${store.slug}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
                      >
                        Resources
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {pageInfo.hasPreviousPage || pageInfo.hasNextPage ? (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
                <button
                  type="button"
                  onClick={() => pageInfo.previousPage && goToPage(pageInfo.previousPage)}
                  disabled={!pageInfo.hasPreviousPage}
                  className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous page
                </button>

                <div className="text-sm text-[var(--text-muted)]">Page {pageInfo.page}</div>

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
      </section>
    </div>
  );
}
