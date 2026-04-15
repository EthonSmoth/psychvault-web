import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getAppBaseUrl } from "@/lib/env";
import { getPaymentsAvailability } from "@/lib/payments";
import { getFeaturedBlogPosts } from "@/lib/blog";
import {
  getHomepageCategoryData,
  getHomepageResourceShowcaseData,
  getHomepageStatsData,
} from "@/server/queries/public-content";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import ResourceCard from "@/components/resources/resource-card";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "PsychVault - Psychology Resources Marketplace",
  description:
    "Discover clinician-made psychology resources, worksheets, psychoeducation, report templates, and tools for real clinical practice.",
  alternates: {
    canonical: getAppBaseUrl(),
  },
};

const CATEGORY_PRESENTATION: Record<
  string,
  {
    emoji: string;
    eyebrow: string;
    description: string;
  }
> = {
  "assessment-tools": {
    emoji: "🧪",
    eyebrow: "Decision support",
    description: "Checklists, screeners, and structured tools that help clinicians assess clearly.",
  },
  "report-templates": {
    emoji: "📝",
    eyebrow: "Documentation",
    description: "Sharper report frameworks, wording packs, and templates that reduce admin drag.",
  },
  psychoeducation: {
    emoji: "🧠",
    eyebrow: "Client education",
    description: "Handouts and explainer resources that make complex ideas easier to share well.",
  },
  "parent-handouts": {
    emoji: "👨‍👩‍👧",
    eyebrow: "Family support",
    description: "Plain-language resources parents can actually use between sessions.",
  },
  "ndis-resources": {
    emoji: "📋",
    eyebrow: "NDIS workflow",
    description: "Resources for clearer functional language, recommendations, and support planning.",
  },
  "therapy-worksheets": {
    emoji: "🧰",
    eyebrow: "Session tools",
    description: "Practical worksheets you can bring straight into therapy or reflective work.",
  },
  "emotional-regulation-tools": {
    emoji: "🌿",
    eyebrow: "Regulation",
    description: "Supports for noticing overwhelm, tracking cues, and building steadier coping plans.",
  },
  "trauma-informed-practice": {
    emoji: "🛟",
    eyebrow: "Trauma-aware",
    description: "Gentle, low-demand tools for safer pacing, stabilisation, and nervous-system support.",
  },
  "adhd-supports": {
    emoji: "⚡",
    eyebrow: "ADHD practice",
    description: "Tools for planning, motivation, daily routines, and more sustainable follow-through.",
  },
  "autism-and-neurodivergent-practice": {
    emoji: "🧩",
    eyebrow: "Neurodiversity",
    description: "Affirming resources for autistic, ADHD, AuDHD, and otherwise neurodivergent clients.",
  },
};

function getCategoryPresentation(slug: string) {
  return (
    CATEGORY_PRESENTATION[slug] || {
      emoji: "🗂️",
      eyebrow: "Browse resources",
      description: "Explore practical tools, templates, and supports in this area of practice.",
    }
  );
}

function getHomeSectionResources<T>(items: T[], count: number) {
  return items.slice(0, count);
}

function ResourceSectionPlaceholder({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 shadow-sm">
      <div className="text-lg font-semibold text-[var(--text)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

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
  const { totalResources, totalCreators, totalStores } = await getHomepageStatsData();

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
        <div className="text-2xl font-bold text-[var(--text)]">{totalStores}</div>
        <div className="mt-1 text-sm text-[var(--text-muted)]">Stores</div>
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
              quality={72}
              sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 3rem), 42vw"
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
  const cards = [
    {
      emoji: "🏪",
      title: "Public marketplace",
      description: (
        <>
          Explore <Link href="/stores" className="font-medium text-[var(--text)] underline">creator stores</Link>, browse{" "}
          <Link href="/resources" className="font-medium text-[var(--text)] underline">published resources</Link>, and
          move between live listings on a real public domain.
        </>
      ),
      href: "/stores",
      linkLabel: "Explore stores",
    },
    {
      emoji: "🛡️",
      title: "Trust and moderation",
      description: (
        <>
          Buyers can review previews, message creators, and report listings while you
          discover stronger resources through{" "}
          <Link
            href="/resources?sort=rating"
            className="font-medium text-[var(--text)] underline"
          >
            top-rated tools
          </Link>{" "}
          and the{" "}
          <Link href="/blog" className="font-medium text-[var(--text)] underline">
            clinician blog
          </Link>
          .
        </>
      ),
      href: "/resources?sort=rating",
      linkLabel: "See trusted resources",
    },
    {
      emoji: paymentsAvailability.enabled ? "💳" : "🎁",
      title: "Checkout status",
      description: paymentsAvailability.enabled ? (
        <>
          Paid and free digital resources can be claimed through the platform, including{" "}
          <Link
            href="/resources?sort=popular"
            className="font-medium text-[var(--text)] underline"
          >
            best sellers
          </Link>{" "}
          and{" "}
          <Link
            href="/resources?price=free"
            className="font-medium text-[var(--text)] underline"
          >
            free downloads
          </Link>
          .
        </>
      ) : (
        <>
          Free resources are available now while paid checkout activation is being finalised.
          You can still browse{" "}
          <Link
            href="/resources?price=free"
            className="font-medium text-[var(--text)] underline"
          >
            free resources
          </Link>{" "}
          or{" "}
          <Link href="/creator" className="font-medium text-[var(--text)] underline">
            start selling
          </Link>
          .
        </>
      ),
      href: paymentsAvailability.enabled ? "/resources?sort=popular" : "/resources?price=free",
      linkLabel: paymentsAvailability.enabled ? "Browse popular resources" : "Browse free resources",
    },
  ];

  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-alt)] text-xl"
              >
                {card.emoji}
              </span>
              <div className="text-sm font-semibold text-[var(--text)]">{card.title}</div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{card.description}</p>
            <Link
              href={card.href}
              className="mt-4 inline-flex text-sm font-medium text-[var(--text)] underline transition hover:text-[var(--accent)]"
            >
              {card.linkLabel}
            </Link>
          </div>
        ))}
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
            Find practical resources by workflow, client need, or documentation task.
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
        {categories.map((category) => {
          const presentation = getCategoryPresentation(category.slug);
          const hasLiveResources = category._count.resources > 0;

          return (
            <Link
              key={category.id}
              href={`/resources?category=${category.slug}`}
              className="group rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)] text-2xl shadow-sm">
                  <span aria-hidden="true">{presentation.emoji}</span>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    hasLiveResources
                      ? "bg-[var(--surface-alt)] text-[var(--text)]"
                      : "bg-[var(--surface)] text-[var(--text-light)]"
                  }`}
                >
                  {hasLiveResources
                    ? `${category._count.resources} live`
                    : "Coming soon"}
                </span>
              </div>

              <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-light)]">
                {presentation.eyebrow}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-[var(--text)]">{category.name}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {presentation.description}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-light)]">
                  {hasLiveResources
                    ? `${category._count.resources} ${
                        category._count.resources === 1 ? "resource" : "resources"
                      } ready`
                    : "Help shape this lane"}
                </span>
                <span className="text-sm font-medium text-[var(--text)] transition group-hover:text-[var(--accent)]">
                  Browse
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HomeCategoriesFallback() {
  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
          <div
            key={item}
            className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-[var(--surface)]" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--surface)]" />
            </div>
            <div className="mt-5 h-3 w-24 animate-pulse rounded bg-[var(--surface)]" />
            <div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-[var(--surface)]" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-[var(--surface)]" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-[var(--surface)]" />
          </div>
        ))}
      </div>
    </section>
  );
}

async function HomeFeaturedResourcesSection() {
  const { featuredResources } = await getHomepageResourceShowcaseData();
  const visibleResources = getHomeSectionResources(featuredResources, 3);

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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleResources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            preferThumbnail
            imageQuality={70}
            imageSizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc(50vw - 2rem), 360px"
          />
        ))}
        {Array.from({ length: Math.max(0, 3 - visibleResources.length) }).map((_, index) => (
          <ResourceSectionPlaceholder
            key={`featured-placeholder-${index}`}
            title="More featured resources coming soon"
            description="As more clinician-made resources go live, this section will fill out automatically."
            href="/creator/resources/new"
            linkLabel="Add a resource"
          />
        ))}
      </div>
    </section>
  );
}

async function HomeRecentResourcesSection() {
  const { recentResources } = await getHomepageResourceShowcaseData();
  const visibleResources = getHomeSectionResources(recentResources, 3);

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
        {visibleResources.map((resource) => (
          <Link
            key={resource.id}
            href={`/resources/${resource.slug}`}
            className="group block rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--surface)]">
              {resource.thumbnailUrl || resource.previewImageUrl ? (
                <Image
                  src={resource.thumbnailUrl || resource.previewImageUrl!}
                  alt={resource.title}
                  fill
                  quality={70}
                  sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1280px) calc(33vw - 2rem), 360px"
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
        {Array.from({ length: Math.max(0, 3 - visibleResources.length) }).map((_, index) => (
          <ResourceSectionPlaceholder
            key={`recent-placeholder-${index}`}
            title="Fresh resources will appear here"
            description="Newly published listings will fill this row as your marketplace grows."
            href="/resources"
            linkLabel="Browse all resources"
          />
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

function HomeBlogFallback() {
  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="h-7 w-36 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded-full bg-[var(--surface-alt)]" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
          >
            <div className="min-h-[220px] animate-pulse rounded-t-3xl bg-[var(--surface-alt)]" />
            <div className="p-6">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--surface-alt)]" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-[var(--surface-alt)]" />
              <div className="mt-6 h-9 w-28 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

async function HomeBlogSection() {
  const posts = await getFeaturedBlogPosts(3);

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="defer-section mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            From the blog
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Practical articles that support discovery, trust, and creator growth.
          </p>
        </div>
        <Link
          href="/blog"
          className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
        >
          Visit the blog
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogPostCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}

function HomeValueSection() {
  const valueCards = [
    {
      emoji: "⏱️",
      title: "Save time",
      body: "Access templates, handouts, and structured resources that cut admin time.",
      href: "/resources?sort=popular",
      label: "Explore popular tools",
    },
    {
      emoji: "✅",
      title: "Built on trust",
      body: "Resources made by clinicians, with previews, ratings, and clear descriptions.",
      href: "/resources?sort=rating",
      label: "Browse top rated",
    },
    {
      emoji: "💼",
      title: "Earn from your work",
      body: "Turn polished templates into a passive income stream alongside your practice.",
      href: "/creator/resources/new",
      label: "Upload a resource",
    },
    {
      emoji: "📚",
      title: "Grow your store",
      body: "Build a public creator profile with a library that compounds over time.",
      href: "/creator/store",
      label: "Set up your store",
    },
  ];

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
            {valueCards.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-2xl bg-[var(--surface-alt)] p-5 transition hover:bg-[var(--surface)]"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--card)] text-lg shadow-sm"
                  >
                    {item.emoji}
                  </span>
                  <h3 className="font-semibold text-[var(--text)]">{item.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{item.body}</p>
                <div className="mt-4 text-sm font-medium text-[var(--text)] transition group-hover:text-[var(--accent)]">
                  {item.label}
                </div>
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

      <Suspense fallback={<HomeBlogFallback />}>
        <HomeBlogSection />
      </Suspense>

      <HomeValueSection />
    </div>
  );
}
