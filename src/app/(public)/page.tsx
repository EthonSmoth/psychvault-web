import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getAppBaseUrl } from "@/lib/env";
import { getPaymentsAvailability } from "@/lib/payments";
import {
  getHomepageCategoryData,
  getHomepageResourceShowcaseData,
  getHomepageStatsData,
} from "@/server/queries/public-content";
import { ResourceGrid } from "@/components/resources/resource-grid";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "PsychVault - Psychology Resources Marketplace",
  description:
    "Discover clinician-made psychology resources, worksheets, psychoeducation, report templates, and tools for real clinical practice.",
  alternates: {
    canonical: getAppBaseUrl(),
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  "assessment-tools": "Checklist",
  "report-templates": "Reports",
  psychoeducation: "Education",
  "parent-handouts": "Parents",
  "ndis-resources": "NDIS",
  "therapy-worksheets": "Worksheets",
};

function HomeHero() {
  return (
    <section className="border-b border-[var(--border)] bg-[var(--surface)]/55">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text)]">
            Built for psychologists
          </span>

          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
            Discover and sell psychology resources that save real clinical time
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--text-muted)]">
            Templates, handouts, psychoeducation, report tools, and clinician-made
            resources designed for real practice.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/resources"
              className="btn btn-primary px-5 py-3 text-sm font-semibold"
            >
              Browse resources
            </Link>
            <Link
              href="/signup"
              className="inline-flex rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
            >
              Create account
            </Link>
            <Link
              href="/creator"
              className="inline-flex rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
            >
              Start selling
            </Link>
          </div>

          <Suspense fallback={<HomeStatsFallback />}>
            <HomeStats />
          </Suspense>
        </div>

        <div className="flex items-center">
          <Suspense fallback={<HeroShowcaseFallback />}>
            <HomeHeroShowcase />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

async function HomeStats() {
  const { totalResources, totalCreators, totalCategories } = await getHomepageStatsData();

  return (
    <div className="mt-10 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-8">
      <div className="rounded-2xl bg-[var(--surface-alt)] p-4">
        <div className="text-2xl font-bold text-[var(--text)]">{totalResources}</div>
        <div className="mt-1 text-sm text-[var(--text-muted)]">Resources</div>
      </div>
      <div className="rounded-2xl bg-[var(--surface-alt)] p-4">
        <div className="text-2xl font-bold text-[var(--text)]">{totalCreators}</div>
        <div className="mt-1 text-sm text-[var(--text-muted)]">Creators</div>
      </div>
      <div className="rounded-2xl bg-[var(--surface-alt)] p-4">
        <div className="text-2xl font-bold text-[var(--text)]">{totalCategories}</div>
        <div className="mt-1 text-sm text-[var(--text-muted)]">Categories</div>
      </div>
    </div>
  );
}

function HomeStatsFallback() {
  return (
    <div className="mt-10 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-8">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-2xl bg-[var(--surface-alt)] p-4">
          <div className="h-8 w-12 animate-pulse rounded bg-[var(--surface)]" />
          <div className="mt-2 h-4 w-20 animate-pulse rounded bg-[var(--surface)]" />
        </div>
      ))}
    </div>
  );
}

async function HomeHeroShowcase() {
  const { featuredResources } = await getHomepageResourceShowcaseData();
  const heroResource = featuredResources[0] ?? null;
  const heroSecondary = featuredResources.slice(1, 3);

  if (!heroResource) {
    return (
      <div className="w-full rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6">
        <div className="text-lg font-semibold text-[var(--text)]">
          Featured resources coming soon
        </div>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Publish resources to populate the homepage.
        </p>
        <Link
          href="/creator/resources/new"
          className="mt-4 inline-flex rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
        >
          Add first resource
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <Link
        href={`/resources/${heroResource.slug}`}
        className="group block rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">
          Featured resource
        </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--surface)]">
          {heroResource.previewImageUrl ? (
            <Image
              src={heroResource.previewImageUrl}
              alt={heroResource.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[var(--text-light)]">
              Preview coming soon
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="text-lg font-semibold text-[var(--text)]">{heroResource.title}</div>
          {heroResource.shortDescription ? (
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {heroResource.shortDescription}
            </p>
          ) : null}
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text)]">
              {heroResource.categories[0]?.name || "Featured"}
            </span>
            <span className="text-sm font-semibold text-[var(--text)]">
              {heroResource.isFree ? "Free" : `$${(heroResource.priceCents / 100).toFixed(2)}`}
            </span>
          </div>
        </div>
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        {heroSecondary.map((resource) => (
          <Link
            key={resource.id}
            href={`/resources/${resource.slug}`}
            className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-[var(--text)] line-clamp-2">
              {resource.title}
            </div>
            <div className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">
              {resource.shortDescription || "Explore this clinician-made resource."}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="truncate text-xs text-[var(--text-light)]">
                {resource.store?.name || "PsychVault creator"}
              </span>
              <span className="shrink-0 text-sm font-semibold text-[var(--text)]">
                {resource.isFree ? "Free" : `$${(resource.priceCents / 100).toFixed(2)}`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function HeroShowcaseFallback() {
  return (
    <div className="w-full space-y-4">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="mb-3 h-4 w-28 animate-pulse rounded bg-[var(--surface)]" />
        <div className="aspect-[16/10] animate-pulse rounded-2xl bg-[var(--surface)]" />
        <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-[var(--surface)]" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-[var(--surface)]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
          >
            <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--surface)]" />
            <div className="mt-2 h-4 w-full animate-pulse rounded bg-[var(--surface)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketplaceTrustSection() {
  const paymentsAvailability = getPaymentsAvailability();

  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-semibold text-[var(--text)]">Public marketplace</div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Explore live creator stores, published psychology resources, and clear public
            policies on a real production domain.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-semibold text-[var(--text)]">Trust and moderation</div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Buyers can review previews, contact creators, report listings, and rely on
            marketplace moderation when something looks wrong.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-semibold text-[var(--text)]">Checkout status</div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {paymentsAvailability.enabled
              ? "Paid and free digital resources can be claimed through the platform."
              : "Free resources are available now while paid checkout activation is being finalised."}
          </p>
        </div>
      </div>
    </section>
  );
}

async function HomeCategoriesSection() {
  const categories = await getHomepageCategoryData();

  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Browse by category
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Find practical resources by the kind of work you&apos;re doing.
          </p>
        </div>
        <Link
          href="/resources"
          className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
        >
          View all
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/resources?category=${category.slug}`}
            className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">
              {CATEGORY_ICONS[category.slug] || "Category"}
            </div>
            <h3 className="font-semibold text-[var(--text)]">{category.name}</h3>
            <p className="mt-1 text-sm text-[var(--text-light)]">
              {category._count.resources}{" "}
              {category._count.resources === 1 ? "resource" : "resources"}
            </p>
            <div className="mt-4 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
              Browse
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomeCategoriesFallback() {
  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
          >
            <div className="h-4 w-16 animate-pulse rounded bg-[var(--surface)]" />
            <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-[var(--surface)]" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-[var(--surface)]" />
          </div>
        ))}
      </div>
    </section>
  );
}

async function HomeFeaturedResourcesSection() {
  const { featuredResources } = await getHomepageResourceShowcaseData();

  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Featured resources
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Popular resources clinicians are using right now.
          </p>
        </div>
        <Link
          href="/resources"
          className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
        >
          Browse all
        </Link>
      </div>
      <ResourceGrid
        resources={featuredResources}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      />
    </section>
  );
}

async function HomeRecentResourcesSection() {
  const { recentResources } = await getHomepageResourceShowcaseData();

  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Recently added
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Fresh resources added to the marketplace.
          </p>
        </div>
        <Link
          href="/resources"
          className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
        >
          View all
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recentResources.map((resource) => (
          <Link
            key={resource.id}
            href={`/resources/${resource.slug}`}
            className="group block rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--surface)]">
              {resource.previewImageUrl ? (
                <Image
                  src={resource.previewImageUrl}
                  alt={resource.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 380px"
                  className="object-cover transition group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[var(--text-light)]">
                  Preview coming soon
                </div>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-[var(--text)]">{resource.title}</h3>
              {resource.shortDescription ? (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
                  {resource.shortDescription}
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="truncate text-sm text-[var(--text-muted)]">
                  {resource.store?.name || "PsychVault creator"}
                </span>
                <span className="shrink-0 text-sm font-semibold text-[var(--text)]">
                  {resource.isFree ? "Free" : `$${(resource.priceCents / 100).toFixed(2)}`}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomeRecentFallback() {
  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
          >
            <div className="aspect-[16/10] animate-pulse rounded-2xl bg-[var(--surface)]" />
            <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-[var(--surface)]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeValueSection() {
  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm lg:p-12">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
              Built for clinicians who want to save time and share what works
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-muted)]">
              PsychVault helps psychologists discover useful tools faster and gives
              creators a clean way to package and sell resources they already use in practice.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/resources"
                className="inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
              >
                Browse resources
              </Link>
              <Link
                href="/signup"
                className="inline-flex rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
              >
                Start selling
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Save time",
                body: "Access templates, handouts, and structured resources that cut admin time.",
                href: "/resources",
              },
              {
                title: "Built on trust",
                body: "Resources made by clinicians, with previews, ratings, and clear descriptions.",
                href: "/resources",
              },
              {
                title: "Earn from your work",
                body: "Turn polished templates into a passive income stream alongside your practice.",
                href: "/creator",
              },
              {
                title: "Grow your store",
                body: "Build a public creator profile with a library that compounds over time.",
                href: "/creator",
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-2xl bg-[var(--surface-alt)] p-5 transition hover:bg-[var(--surface)]"
              >
                <h3 className="font-semibold text-[var(--text)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{item.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div>
      <HomeHero />
      <MarketplaceTrustSection />

      <Suspense fallback={<HomeCategoriesFallback />}>
        <HomeCategoriesSection />
      </Suspense>

      <Suspense fallback={<HomeRecentFallback />}>
        <HomeFeaturedResourcesSection />
      </Suspense>

      <Suspense fallback={<HomeRecentFallback />}>
        <HomeRecentResourcesSection />
      </Suspense>

      <HomeValueSection />
    </div>
  );
}
