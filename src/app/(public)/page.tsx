import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentsAvailability } from "@/lib/payments";
import { ResourceGrid } from "@/components/resources/resource-grid";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<string, string> = {
  "assessment-tools": "📋",
  "report-templates": "📝",
  "psychoeducation": "🧠",
  "parent-handouts": "👨‍👩‍👧",
  "ndis-resources": "♿",
  "therapy-worksheets": "📄",
};

export default async function HomePage() {
  const session = await auth();
  const paymentsAvailability = getPaymentsAvailability();

  const [featuredResources, recentResources, categories, totalResources, totalCreators] =
    await Promise.all([
      db.resource.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
        take: 6,
        include: {
          store: {
            select: {
              name: true,
              isVerified: true,
            },
          },
          tags: {
            take: 2,
            include: {
              tag: {
                select: {
                  name: true,
                },
              },
            },
          },
          categories: {
            take: 2,
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          files: {
            where: {
              kind: {
                in: ["THUMBNAIL", "PREVIEW"],
              },
            },
            select: {
              kind: true,
              fileUrl: true,
            },
            take: 1,
          },
        },
      }),
      db.resource.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          store: {
            select: {
              name: true,
            },
          },
        },
      }),
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
      db.resource.count({ where: { status: "PUBLISHED" } }),
      db.store.count({ where: { isPublished: true } }),
    ]);

  const heroResource = featuredResources[0] ?? null;
  const heroSecondary = featuredResources.slice(1, 3);

  return (
    <div>

      {/* ── Hero ── */}
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

              {session?.user ? (
                <>
                  <Link
                    href="/library"
                    className="inline-flex rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                  >
                    My library
                  </Link>
                  <Link
                    href="/creator"
                    className="inline-flex rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                  >
                    Creator dashboard
                  </Link>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Live stats */}
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
                <div className="text-2xl font-bold text-[var(--text)]">{categories.length}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">Categories</div>
              </div>
            </div>
          </div>

          {/* Hero resource cards */}
          <div className="flex items-center">
            <div className="w-full space-y-4">
              {heroResource ? (
                <Link
                  href={`/resources/${heroResource.slug}`}
                  className="group block rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">
                    Featured resource
                  </div>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--surface)]">
                    {heroResource.thumbnailUrl ? (
                      <Image
                        src={heroResource.thumbnailUrl}
                        alt={heroResource.title}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 42vw"
                        className="object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl text-[var(--text-light)]">
                        📘
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="text-lg font-semibold text-[var(--text)]">
                      {heroResource.title}
                    </div>
                    {heroResource.shortDescription && (
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                        {heroResource.shortDescription}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text)]">
                        {heroResource.tags[0]?.tag.name || "Featured"}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text)]">
                        {heroResource.isFree ? "Free" : `$${(heroResource.priceCents / 100).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6">
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
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {heroSecondary.length > 0 ? (
                  heroSecondary.map((resource) => (
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
                  ))
                ) : (
                  <>
                    <Link
                      href="/resources"
                      className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="text-sm font-semibold text-[var(--text)]">Browse resources</div>
                      <div className="mt-2 text-sm text-[var(--text-muted)]">
                        Explore published resources across all categories.
                      </div>
                    </Link>
                    <Link
                      href="/creator"
                      className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="text-sm font-semibold text-[var(--text)]">Start selling</div>
                      <div className="mt-2 text-sm text-[var(--text-muted)]">
                        Open your creator area and upload your first resource.
                      </div>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
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

      <section className="defer-section mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              Browse by category
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Find practical resources by the kind of work you're doing.
            </p>
          </div>
          <Link
            href="/resources"
            className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
          >
            View all →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/resources?category=${category.slug}`}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 text-2xl">
                {CATEGORY_ICONS[category.slug] || "📁"}
              </div>
              <h3 className="font-semibold text-[var(--text)]">{category.name}</h3>
              <p className="mt-1 text-sm text-[var(--text-light)]">
                {category._count.resources}{" "}
                {category._count.resources === 1 ? "resource" : "resources"}
              </p>
              <div className="mt-4 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
                Browse →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured resources ── */}
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
            Browse all →
          </Link>
        </div>
        <ResourceGrid resources={featuredResources} />
      </section>

      {/* ── Recently added ── */}
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
            View all →
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {recentResources.map((resource) => (
            <Link
              key={resource.id}
              href={`/resources/${resource.slug}`}
              className="group block rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--surface)]">
                {resource.thumbnailUrl ? (
                  <Image
                    src={resource.thumbnailUrl}
                    alt={resource.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 380px"
                    className="object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl text-[var(--text-light)]">
                    📘
                  </div>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-[var(--text)]">{resource.title}</h3>
                {resource.shortDescription && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
                    {resource.shortDescription}
                  </p>
                )}
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

      {/* ── Value proposition / CTA ── */}
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
              <Link
                href="/resources"
                className="rounded-2xl bg-[var(--surface-alt)] p-5 transition hover:bg-[var(--surface)]"
              >
                <div className="mb-2 text-xl">⏱️</div>
                <h3 className="font-semibold text-[var(--text)]">Save time</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Access templates, handouts, and structured resources that cut admin time.
                </p>
              </Link>

              <Link
                href="/resources"
                className="rounded-2xl bg-[var(--surface-alt)] p-5 transition hover:bg-[var(--surface)]"
              >
                <div className="mb-2 text-xl">✅</div>
                <h3 className="font-semibold text-[var(--text)]">Built on trust</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Resources made by clinicians, with previews, ratings, and clear descriptions.
                </p>
              </Link>

              <Link
                href="/creator"
                className="rounded-2xl bg-[var(--surface-alt)] p-5 transition hover:bg-[var(--surface)]"
              >
                <div className="mb-2 text-xl">💰</div>
                <h3 className="font-semibold text-[var(--text)]">Earn from your work</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Turn polished templates into a passive income stream alongside your practice.
                </p>
              </Link>

              <Link
                href="/creator"
                className="rounded-2xl bg-[var(--surface-alt)] p-5 transition hover:bg-[var(--surface)]"
              >
                <div className="mb-2 text-xl">📈</div>
                <h3 className="font-semibold text-[var(--text)]">Grow your store</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Build a public creator profile with a library that compounds over time.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
