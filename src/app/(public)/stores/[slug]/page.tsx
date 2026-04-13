import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppBaseUrl } from "@/lib/env";
import { serializeJsonLd } from "@/lib/input-safety";
import { getMarketplacePolicyLinks } from "@/lib/payments";
import {
  getPublishedStoreMetadata,
  getPublishedStorePageData,
  getPublishedStoreResourcesPageData,
} from "@/server/queries/public-content";
import { getStoreViewerState } from "@/server/queries/store-viewer";
import { ResourceGrid } from "@/components/resources/resource-grid";
import {
  StorePrimaryActions,
  StoreReportSection,
  StoreViewerProvider,
} from "@/components/stores/store-viewer";
import { VerifiedBadge } from "@/components/ui/verified-badge";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

type StorePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublishedStoreMetadata(slug);

  if (!store || !store.isPublished) {
    return {
      title: "Store not found | PsychVault",
      description: "The requested creator store could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = store.bio?.slice(0, 160) || `Browse resources from ${store.name} on PsychVault.`;
  const baseUrl = getAppBaseUrl();
  const url = `${baseUrl}/stores/${store.slug}`;

  return {
    title: `${store.name} | PsychVault`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      url,
      title: store.name,
      description,
      images: store.logoUrl ? [{ url: store.logoUrl, alt: store.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: store.name,
      description,
      images: store.logoUrl ? [store.logoUrl] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const page =
    typeof resolvedSearchParams.page === "string"
      ? resolvedSearchParams.page
      : Array.isArray(resolvedSearchParams.page)
      ? resolvedSearchParams.page[0]
      : undefined;
  const store = await getPublishedStorePageData(slug);

  if (!store) {
    notFound();
  }

  const storeSlug = store.slug;

  const [viewerState, resourcesPage] = await Promise.all([
    getStoreViewerState({
      storeId: store.id,
      ownerId: store.ownerId,
    }),
    getPublishedStoreResourcesPageData({
      storeId: store.id,
      storeSlug: store.slug,
      page,
    }),
  ]);

  const featuredResources = store.featuredResources;
  const policyLinks = getMarketplacePolicyLinks();

  const baseUrl = getAppBaseUrl();
  const storeUrl = `${baseUrl}/stores/${store.slug}`;
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: store.name,
    description: store.bio || `Browse psychology resources from ${store.name} on PsychVault`,
    url: storeUrl,
    image: store.logoUrl || undefined,
    ...(store.location && { location: store.location }),
    sameAs: [storeUrl],
  };
  const cleanSchema = JSON.parse(JSON.stringify(organizationSchema));

  function buildStorePageHref(nextPage: number) {
    return nextPage > 1
      ? `/stores/${storeSlug}?page=${nextPage}#all-resources`
      : `/stores/${storeSlug}#all-resources`;
  }

  return (
    <StoreViewerProvider initialViewerState={viewerState}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(cleanSchema) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="relative h-40 sm:h-52">
            {store.bannerUrl ? (
              <>
                <Image
                  src={store.bannerUrl}
                  alt={`${store.name} banner`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1280px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </>
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-[var(--primary-dark)] via-[var(--primary)] to-[var(--accent)]" />
            )}
          </div>

          <div className="relative px-6 pb-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="-mt-10 relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border-4 border-[var(--card)] bg-[var(--primary)] text-2xl font-bold text-white shadow-sm sm:-mt-12 sm:h-24 sm:w-24">
                  {store.logoUrl ? (
                    <Image
                      src={store.logoUrl}
                      alt={`${store.name} logo`}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <span>{store.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>

                <div className="pt-4 sm:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
                      {store.name}
                    </h1>

                    {store.isVerified ? <VerifiedBadge /> : null}

                    {store.isPublished ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Live
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
                    <span>{store.resourceCount} resources</span>
                    <span>{store.followerCount} followers</span>
                    <span>{store.location || "Location not set"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <StorePrimaryActions
                  storeId={store.id}
                  storeSlug={store.slug}
                  ownerId={store.ownerId}
                />
              </div>
            </div>

            <div className="mt-6 max-w-3xl">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-light)]">
                About this store
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text)]">
                {store.bio ||
                  "This creator has not added a store bio yet. Check back soon for more details about their resources and clinical focus."}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text-muted)]">
                  <div className="font-medium text-[var(--text)]">Marketplace trust</div>
                  <div className="mt-1">
                    Buyers can follow this store, report issues, and access downloads through
                    their library.
                  </div>
                </div>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text-muted)]">
                  <div className="font-medium text-[var(--text)]">Policies</div>
                  <div className="mt-1">
                    See our{" "}
                    <Link href={policyLinks.terms} className="font-medium underline">
                      terms
                    </Link>
                    {" "}and{" "}
                    <Link href={policyLinks.refunds} className="font-medium underline">
                      refund policy
                    </Link>
                    .
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 max-w-3xl">
              <StoreReportSection storeId={store.id} storeSlug={store.slug} />
            </div>
          </div>
        </section>

        {featuredResources.length > 0 ? (
          <section className="defer-section mt-12">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
                  Featured resources
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Popular resources from this creator.
                </p>
              </div>
            </div>

            <ResourceGrid resources={featuredResources} />
          </section>
        ) : null}

        <section id="all-resources" className="defer-section mt-12 scroll-mt-28">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
                All resources
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Browse everything currently published in this store.
              </p>
            </div>

            <Link
              href="/resources"
              className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
            >
              Browse all resources
            </Link>
          </div>

          <div className="mb-5 text-sm text-[var(--text-muted)]">
            Showing {resourcesPage.resources.length} resource
            {resourcesPage.resources.length === 1 ? "" : "s"} on page{" "}
            {resourcesPage.pageInfo.page} of this store.
          </div>

          {resourcesPage.resources.length > 0 ? (
            <ResourceGrid resources={resourcesPage.resources} />
          ) : store.resourceCount > 0 && resourcesPage.pageInfo.page > 1 ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--text)]">
                That page does not have any resources
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                This store still has live resources. Jump back to the first page to keep browsing.
              </p>
              <div className="mt-5">
                <Link
                  href={buildStorePageHref(1)}
                  className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
                >
                  Back to page 1
                </Link>
              </div>
            </div>
          ) : (
            <ResourceGrid resources={resourcesPage.resources} />
          )}

          {resourcesPage.pageInfo.hasPreviousPage || resourcesPage.pageInfo.hasNextPage ? (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
              {resourcesPage.pageInfo.hasPreviousPage ? (
                <Link
                  href={buildStorePageHref(resourcesPage.pageInfo.previousPage || 1)}
                  className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                >
                  Previous page
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-light)] opacity-60">
                  Previous page
                </span>
              )}

              <div className="text-sm text-[var(--text-muted)]">
                Page {resourcesPage.pageInfo.page}
              </div>

              {resourcesPage.pageInfo.hasNextPage ? (
                <Link
                  href={buildStorePageHref(resourcesPage.pageInfo.nextPage || resourcesPage.pageInfo.page)}
                  className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                >
                  Next page
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-light)] opacity-60">
                  Next page
                </span>
              )}
            </div>
          ) : null}
        </section>

        <section className="defer-section mt-12">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--text)]">Store details</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-[var(--surface-alt)] p-4">
                <div className="text-sm font-medium text-[var(--text-muted)]">Owner</div>
                <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                  {store.owner.name || "Creator"}
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--surface-alt)] p-4">
                <div className="text-sm font-medium text-[var(--text-muted)]">Store slug</div>
                <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                  /stores/{store.slug}
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--surface-alt)] p-4">
                <div className="text-sm font-medium text-[var(--text-light)]">Followers</div>
                <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                  {store.followerCount}
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--surface-alt)] p-4">
                <div className="text-sm font-medium text-[var(--text-light)]">Published resources</div>
                <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                  {store.resourceCount}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StoreViewerProvider>
  );
}
