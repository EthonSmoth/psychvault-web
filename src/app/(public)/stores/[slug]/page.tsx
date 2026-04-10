import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/env";
import { getMarketplacePolicyLinks } from "@/lib/payments";
import {
  getPublishedStoreMetadata,
  getPublishedStorePageData,
} from "@/server/queries/public-content";
import { ResourceGrid } from "@/components/resources/resource-grid";
import { ReportStoreForm } from "@/components/stores/report-store-form";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { toggleFollowStoreAction } from "@/server/actions/follow-actions";
import { generateCSRFToken } from "@/lib/csrf";

type StorePageProps = {
  params: {
    slug: string;
  };
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

  const description =
    store.bio?.slice(0, 160) ||
    `Browse resources from ${store.name} on PsychVault.`;
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

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;
  const session = await auth();

  const currentUser = session?.user?.email
      ? await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, emailVerified: true },
      })
    : null;

  const csrfToken = currentUser ? generateCSRFToken(currentUser.id) : "";

  const store = await getPublishedStorePageData(slug);

  if (!store) {
    notFound();
  }

  const featuredResources = store.resources.slice(0, 3);
  const isOwner = currentUser?.id === store.ownerId;
  const isFollowing =
    !!currentUser && store.followers.some((f) => f.followerId === currentUser.id);
  const canReportStore = Boolean(currentUser) && !isOwner;
  const policyLinks = getMarketplacePolicyLinks();

  // JSON-LD Structured Data for Organization/Store
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
    sameAs: [
      storeUrl,
    ],
  };

  const cleanSchema = JSON.parse(JSON.stringify(organizationSchema));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanSchema) }}
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
                  <span>{store.resources.length} resources</span>
                  <span>{store.followers.length} followers</span>
                  <span>{store.location || "Location not set"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {!isOwner ? (
                currentUser ? (
                  <>
                    <form
                      action={toggleFollowStoreAction}
                    >
                      <input type="hidden" name="storeId" value={store.id} />
                      <input type="hidden" name="storeSlug" value={store.slug} />
                      <input type="hidden" name="_csrf" value={csrfToken} />
                      <button
                        type="submit"
                        className={`inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                          isFollowing
                            ? "border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[var(--surface-alt)]"
                            : "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] hover:text-white"
                        }`}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                    </form>

                    <Link
                      href={
                        currentUser.emailVerified
                          ? `/messages/start?creatorId=${store.ownerId}`
                          : `/verify-email?redirectTo=${encodeURIComponent(`/messages/start?creatorId=${store.ownerId}`)}`
                      }
                      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                    >
                      {currentUser.emailVerified ? "Message creator" : "Verify email to message"}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/login?redirectTo=${encodeURIComponent(`/stores/${store.slug}`)}`}
                      className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
                    >
                      Log in to follow
                    </Link>
                    <Link
                      href={`/login?redirectTo=${encodeURIComponent(`/messages/start?creatorId=${store.ownerId}`)}`}
                      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                    >
                      Log in to message creator
                    </Link>
                  </>
                )
              ) : (
                <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)]">
                  This is your store
                </div>
              )}
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
                  Buyers can follow this store, report issues, and access downloads through their library.
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
            {canReportStore ? (
              currentUser?.emailVerified ? (
                <ReportStoreForm
                  storeId={store.id}
                  storeSlug={store.slug}
                  csrfToken={csrfToken}
                />
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
                  <Link
                    href={`/verify-email?redirectTo=${encodeURIComponent(`/stores/${store.slug}`)}`}
                    className="font-medium text-[var(--text)] underline"
                  >
                    Verify your email
                  </Link>{" "}
                  to report this store.
                </div>
              )
            ) : currentUser ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
                You cannot report your own store.
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
                <Link
                  href={`/login?redirectTo=/stores/${store.slug}`}
                  className="font-medium text-[var(--text)] underline"
                >
                  Log in
                </Link>{" "}
                to report this store.
              </div>
            )}
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

      <section className="defer-section mt-12">
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
            Browse all stores
          </Link>
        </div>

        <ResourceGrid resources={store.resources} />
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
                {store.followers.length}
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--surface-alt)] p-4">
              <div className="text-sm font-medium text-[var(--text-light)]">Published resources</div>
              <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                {store.resources.length}
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
