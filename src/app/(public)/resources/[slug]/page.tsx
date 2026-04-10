import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { generateCSRFToken } from "@/lib/csrf";
import { db } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/env";
import { getMarketplacePolicyLinks, getPaymentsAvailability } from "@/lib/payments";
import { ResourceGallery } from "@/components/resources/resource-gallery";
import { ResourceGrid } from "@/components/resources/resource-grid";
import { ReportResourceForm } from "@/components/resources/report-resource-form";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import ReviewForm from "@/components/resources/review-form";

export const dynamic = "force-dynamic";

// Builds SEO metadata for published resource pages and suppresses indexing for missing listings.
export async function generateMetadata({ params }: ResourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  const resource = await db.resource.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      shortDescription: true,
      description: true,
      thumbnailUrl: true,
      slug: true,
      status: true,
      priceCents: true,
      isFree: true,
      averageRating: true,
      reviewCount: true,
      store: {
        select: {
          id: true,
          name: true,
          isVerified: true,
        },
      },
    },
  });

  if (!resource || resource.status !== "PUBLISHED") {
    return {
      title: "Resource not found | PsychVault",
      description: "The requested resource could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = resource.shortDescription || resource.description.slice(0, 160);
  const baseUrl = getAppBaseUrl();
  const url = `${baseUrl}/resources/${resource.slug}`;

  return {
    title: resource.title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      url,
      title: resource.title,
      description,
      images: resource.thumbnailUrl
        ? [{ url: resource.thumbnailUrl, alt: resource.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: resource.title,
      description,
      images: resource.thumbnailUrl ? [resource.thumbnailUrl] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// Formats a resource price for the buy box while keeping free resources human-friendly.
function formatPrice(priceCents: number, isFree?: boolean) {
  if (isFree || priceCents === 0) return "Free";

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceCents / 100);
}

// Formats dates for reviews and marketplace timestamps using the local AU format.
function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// Renders a simple five-star string from a numeric rating value.
function renderStars(rating: number) {
  const rounded = Math.round(rating);
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

// Extracts the uppercase file extension shown in the resource specs card.
function getFileExtension(fileName?: string | null) {
  if (!fileName) return null;

  const extension = fileName.split(".").pop()?.trim();
  return extension ? extension.toUpperCase() : null;
}

type ResourcePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: {
    error?: string;
  };
};

// Renders the public resource detail page, including gallery, commerce, reviews, and reporting.
export default async function ResourceDetailPage({ params, searchParams }: ResourcePageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const session = await auth();
  const sessionUser =
    session?.user?.email
      ? await db.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, emailVerified: true },
        })
      : null;

  const resource = await db.resource.findUnique({
    where: { slug },
    include: {
      store: true,
      creator: true,
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
      files: true,
      reviews: {
        include: {
          buyer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  });

  if (!resource) {
    notFound();
  }

  if (resource.status !== "PUBLISHED") {
    notFound();
  }

  const sessionUserId = sessionUser?.id ?? null;
  const isEmailVerified = Boolean(sessionUser?.emailVerified);
  const buyerId = sessionUserId;
  const actionCsrfToken = sessionUserId ? generateCSRFToken(sessionUserId) : "";
  const reviewCsrfToken = buyerId ? actionCsrfToken : "";

  let hasPurchased = false;
  let existingReview: { rating: number; body: string | null } | null = null;

  if (buyerId) {
    const [purchase, review] = await Promise.all([
      db.purchase.findUnique({
        where: {
          buyerId_resourceId: {
            buyerId,
            resourceId: resource.id,
          },
        },
        select: { id: true },
      }),
      db.review.findUnique({
        where: {
          buyerId_resourceId: {
            buyerId,
            resourceId: resource.id,
          },
        },
        select: {
          rating: true,
          body: true,
        },
      }),
    ]);

    hasPurchased = !!purchase;
    existingReview = review;
  }

  const relatedResources = await db.resource.findMany({
    where: {
      status: "PUBLISHED",
      id: {
        not: resource.id,
      },
      OR: [
        {
          storeId: resource.storeId,
        },
        {
          tags: {
            some: {
              tagId: {
                in: resource.tags?.map((t) => t.tagId) ?? [],
              },
            },
          },
        },
      ],
    },
    include: {
      store: true,
      creator: true,
      files: true,
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
    orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  const imagePattern = /\.(jpg|jpeg|png|webp|gif)$/i;
  const previewFiles = resource.files.filter((file) => file.kind === "PREVIEW");
  const previewImages = previewFiles.filter((file) => imagePattern.test(file.fileUrl));
  const galleryImages = [
    ...(resource.thumbnailUrl
      ? [
          {
            id: "thumbnail",
            url: resource.thumbnailUrl,
            alt: resource.title,
            label: "Cover",
          },
        ]
      : []),
    ...previewImages.map((file, index) => ({
      id: file.id,
      url: file.fileUrl,
      alt: `${resource.title} preview ${index + 1}`,
      label: `Preview ${index + 1}`,
    })),
  ];

  const mainFile = resource.files.find((file) => file.kind === "MAIN_DOWNLOAD");
  const hasMainFile = Boolean(mainFile);
  const fileFormat = getFileExtension(mainFile?.fileName);
  const primaryCategory = resource.categories[0]?.category;
  const canMessageCreator =
    Boolean(resource.store) &&
    Boolean(buyerId) &&
    resource.store.ownerId !== buyerId;
  const canReportResource = Boolean(sessionUserId) && resource.creatorId !== sessionUserId;
  const messageLink = canMessageCreator
    ? `/messages/start?creatorId=${resource.store?.ownerId}`
    : undefined;
  const loginMessageLink = resource.store?.ownerId
    ? `/login?redirectTo=${encodeURIComponent(`/messages/start?creatorId=${resource.store.ownerId}`)}`
    : "/login";
  const errorMessage =
    searchParamsResolved?.error === "download-missing"
      ? "This resource cannot be purchased yet because it does not have a downloadable file attached."
      : searchParamsResolved?.error === "payments-unavailable"
      ? "Paid checkout is temporarily unavailable while payment activation is being finalised. Free resources are still available as normal."
      : null;
  const paymentAvailability = getPaymentsAvailability();
  const policyLinks = getMarketplacePolicyLinks();
  const paidCheckoutUnavailable = !resource.isFree && !paymentAvailability.enabled;

  // JSON-LD Structured Data
  const baseUrl = getAppBaseUrl();
  const resourceUrl = `${baseUrl}/resources/${resource.slug}`;
  
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: resource.title,
    description: resource.shortDescription || resource.description.slice(0, 160),
    image: resource.thumbnailUrl || undefined,
    url: resourceUrl,
    brand: {
      "@type": "Brand",
      name: resource.store?.name || "PsychVault Creator",
    },
    author: {
      "@type": "Person",
      name: resource.store?.name || resource.creator?.name || "Unknown",
    },
    offers: {
      "@type": "Offer",
      url: resourceUrl,
      priceCurrency: "AUD",
      price: resource.isFree ? "0" : (resource.priceCents / 100).toString(),
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: resource.store?.name || "PsychVault",
      },
    },
    ...(resource.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: resource.averageRating?.toFixed(1) || "0",
        reviewCount: resource.reviewCount,
      },
    }),
  };

  // Filter out undefined values
  const cleanSchema = JSON.parse(JSON.stringify(productSchema));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanSchema) }}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        {errorMessage ? (
          <div className="mb-6 rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {errorMessage}
          </div>
        ) : null}

        <div>
          <div className="mb-6 flex flex-wrap gap-2">
            {resource.categories.map((item) => (
              <Link
                key={item.category.id}
                href={`/resources?category=${item.category.slug}`}
                className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
              >
                {item.category.name}
              </Link>
            ))}

            {resource.tags.map((item) => (
              <Link
                key={item.tag.id}
                href={`/resources?tag=${item.tag.slug}`}
                className="rounded-full bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--text)] ring-1 ring-[var(--ring-focus)] transition hover:bg-[var(--surface-alt)]"
              >
                {item.tag.name}
              </Link>
            ))}
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
            {resource.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
            {resource.store ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                {resource.store.logoUrl ? (
                  <span className="relative h-8 w-8 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)]">
                    <Image
                      src={resource.store.logoUrl}
                      alt={`${resource.store.name} logo`}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </span>
                ) : null}
                <Link
                  href={`/stores/${resource.store.slug}`}
                  className="font-medium text-[var(--text)] hover:text-[var(--accent)]"
                >
                  by {resource.store.name}
                </Link>

                {resource.store.isVerified ? <VerifiedBadge size="sm" /> : null}
              </span>
            ) : (
              <span>Clinician-made resource</span>
            )}

            {resource.reviewCount > 0 ? (
              <>
                <span>★ {resource.averageRating?.toFixed(1) || "0.0"}</span>
                <span>{resource.reviewCount} reviews</span>
              </>
            ) : (
              <span>New listing</span>
            )}
            <span>{resource.salesCount > 0 ? `${resource.salesCount} sales` : "No sales yet"}</span>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            {galleryImages.length > 0 ? (
              <ResourceGallery images={galleryImages} title={resource.title} />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[var(--surface)] to-[var(--surface-strong)] text-sm font-medium text-[var(--text-light)]">
                Preview coming soon
              </div>
            )}
          </div>

          <div className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text)]">About this resource</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text)]">
              {resource.shortDescription ? (
                <p className="text-base font-medium text-[var(--text)]">
                  {resource.shortDescription}
                </p>
              ) : null}

              <p className="whitespace-pre-line">{resource.description}</p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--text)]">What&apos;s included</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                A quick snapshot of what buyers receive and how this resource is packaged.
              </p>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-[var(--surface-alt)] px-4 py-3">
                  <div>
                    <div className="font-medium text-[var(--text)]">Main download</div>
                    <div className="mt-1 text-xs text-[var(--text-light)]">
                      Delivered after purchase or free claim
                    </div>
                  </div>
                  <div className="max-w-[55%] break-words text-right font-medium text-[var(--text-muted)]">
                    {mainFile?.fileName || "To be uploaded"}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-[var(--surface-alt)] px-4 py-3">
                  <div>
                    <div className="font-medium text-[var(--text)]">Preview gallery</div>
                    <div className="mt-1 text-xs text-[var(--text-light)]">
                      Screenshots buyers can click through before downloading
                    </div>
                  </div>
                  <div className="text-right font-medium text-[var(--text-muted)]">
                    {previewImages.length > 0 ? `${previewImages.length} in gallery` : "None uploaded"}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-[var(--surface-alt)] px-4 py-3">
                  <div>
                    <div className="font-medium text-[var(--text)]">File format</div>
                    <div className="mt-1 text-xs text-[var(--text-light)]">
                      Main download type
                    </div>
                  </div>
                  <div className="text-right font-medium text-[var(--text-muted)]">
                    {fileFormat || "Not specified"}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-[var(--surface-alt)] px-4 py-3">
                  <div>
                    <div className="font-medium text-[var(--text)]">Resource type</div>
                    <div className="mt-1 text-xs text-[var(--text-light)]">
                      Primary marketplace category
                    </div>
                  </div>
                  <div className="text-right">
                    {primaryCategory ? (
                      <Link
                        href={`/resources?category=${primaryCategory.slug}`}
                        className="font-medium text-[var(--text)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--accent)]"
                      >
                        {primaryCategory.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-[var(--text-muted)]">General</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--text)]">Good fit for</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Explore more resources for the same client group, theme, or workflow.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {resource.tags.length > 0 ? (
                  resource.tags.map((item) => (
                    <Link
                      key={item.tag.id}
                      href={`/resources?tag=${item.tag.slug}`}
                      className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--accent)]"
                    >
                      {item.tag.name}
                    </Link>
                  ))
                ) : (
                  <span className="text-sm text-[var(--text-light)]">
                    Tags have not been added yet.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text)]">Recent reviews</h2>

            {resource.reviews.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">No reviews yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {resource.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-[var(--text)]">
                          {review.buyer.name || "Buyer"}
                        </div>
                        <div className="mt-1 text-sm text-[var(--text-muted)]">
                          {renderStars(review.rating)}{" "}
                          <span className="ml-2">{review.rating}/5</span>
                        </div>
                      </div>

                      <div className="text-xs text-[var(--text-light)]">
                        {formatDate(review.createdAt)}
                      </div>
                    </div>

                    {review.body ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--text)]">
                        {review.body}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm italic text-[var(--text-light)]">
                        No written review provided.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasPurchased ? (
            <div className="mt-10">
              <ReviewForm
                resourceId={resource.id}
                resourceSlug={resource.slug}
                existingReview={existingReview}
                csrfToken={reviewCsrfToken}
              />
            </div>
          ) : session?.user ? (
            <div className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--text-muted)] shadow-sm">
              Get this resource to leave a review.
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--text-muted)] shadow-sm">
              <Link
                href={`/login?redirectTo=/resources/${resource.slug}`}
                className="font-medium text-[var(--text)] underline"
              >
                Log in
              </Link>{" "}
              and get this resource to leave a review.
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="text-3xl font-semibold text-[var(--text)]">
              {formatPrice(resource.priceCents, resource.isFree)}
            </div>

            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              {resource.isFree
                ? "Create an account to add this free resource to your library and download it."
                : paidCheckoutUnavailable
                ? "Paid checkout is temporarily paused while payment activation is being completed."
                : "Purchase once and access the downloadable resource through your library."}
            </p>

            <div className="mt-4 rounded-2xl bg-[var(--surface-alt)] p-4 text-sm text-[var(--text)]">
              <div className="flex items-start justify-between gap-4">
                <span className="font-medium text-[var(--text)]">File format</span>
                <span className="text-right text-[var(--text-muted)]">
                  {fileFormat || "Not specified"}
                </span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-4">
                <span className="font-medium text-[var(--text)]">Access</span>
                <span className="text-right text-[var(--text-muted)]">
                  {resource.isFree
                    ? "Instant after claim"
                    : paidCheckoutUnavailable
                    ? "Temporarily paused"
                    : "Instant after payment"}
                </span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-4">
                <span className="font-medium text-[var(--text)]">License</span>
                <span className="text-right text-[var(--text-muted)]">
                  Single-buyer digital use
                </span>
              </div>
            </div>

            <div className="mt-4 inline-flex rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text)]">
              {hasMainFile ? "Download ready" : "No download attached"}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {hasPurchased ? (
                <>
                  <div className="inline-flex self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    In your library
                  </div>

                  {mainFile ? (
                    <a
                      href={`/api/downloads/${resource.id}`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
                    >
                      Download resource
                    </a>
                  ) : (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      This resource does not have a download attached yet.
                    </div>
                  )}

                  <Link
                    href="/library"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border-strong)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                  >
                    View library
                  </Link>
                </>
              ) : hasMainFile ? (
                <>
                  {paidCheckoutUnavailable ? (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Paid checkout is temporarily unavailable. You can still message the
                      creator or browse free resources while payment activation is completed.
                    </div>
                  ) : (
                    <form method="POST" action="/api/checkout">
                      <input type="hidden" name="resourceId" value={resource.id} />
                      <input
                        type="hidden"
                        name="redirectTo"
                        value={`/resources/${resource.slug}`}
                      />
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
                      >
                        {resource.isFree
                          ? "Get for free"
                          : `Buy for ${formatPrice(resource.priceCents)}`}
                      </button>
                    </form>
                  )}

                  {resource.store && resource.store.ownerId !== buyerId ? (
                    <Link
                      href={
                        buyerId
                          ? isEmailVerified
                            ? messageLink ?? "/messages"
                            : `/verify-email?redirectTo=${encodeURIComponent(messageLink ?? "/messages")}`
                          : loginMessageLink
                      }
                      className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                    >
                      {buyerId
                        ? isEmailVerified
                          ? "Message creator"
                          : "Verify email to message creator"
                        : "Log in to message creator"}
                    </Link>
                  ) : null}
                </>
              ) : (
                <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  This resource cannot be purchased until the creator attaches the downloadable file.
                </div>
              )}
            </div>

            {!resource.isFree && hasMainFile ? (
              <div className="mt-6 rounded-2xl bg-[var(--surface-alt)] p-4 text-sm text-[var(--text)]">
                <div className="font-semibold text-[var(--text)]">
                  {paidCheckoutUnavailable ? "Payment activation in progress" : "Secure purchase"}
                </div>
                <p className="mt-2">
                  {paidCheckoutUnavailable
                    ? "This listing is ready for sale, but paid checkout is temporarily paused while live payments are being finalised."
                    : "Stripe checkout protects the transaction and grants instant access once payment clears."}
                </p>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  By purchasing, you agree to the{" "}
                  <Link href={policyLinks.terms} className="font-medium underline">
                    Terms of Service
                  </Link>
                  {" "}and{" "}
                  <Link href={policyLinks.refunds} className="font-medium underline">
                    Refund Policy
                  </Link>
                  .
                </p>
              </div>
            ) : null}

            <div className="mt-6 border-t border-[var(--border)] pt-6">
              {canReportResource ? (
                isEmailVerified ? (
                  <ReportResourceForm
                    resourceId={resource.id}
                    resourceSlug={resource.slug}
                    csrfToken={actionCsrfToken}
                  />
                ) : (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
                    <Link
                      href={`/verify-email?redirectTo=${encodeURIComponent(`/resources/${resource.slug}`)}`}
                      className="font-medium text-[var(--text)] underline"
                    >
                      Verify your email
                    </Link>{" "}
                    to report this resource.
                  </div>
                )
              ) : sessionUserId ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
                  You cannot report your own resource.
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
                  <Link
                    href={`/login?redirectTo=/resources/${resource.slug}`}
                    className="font-medium text-[var(--text)] underline"
                  >
                    Log in
                  </Link>{" "}
                  to report this resource.
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <div className="text-sm font-semibold text-[var(--text)]">Creator</div>

              {resource.store ? (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/stores/${resource.store.slug}`}
                      className="font-medium text-[var(--text)] hover:text-[var(--accent)]"
                    >
                      {resource.store.name}
                    </Link>

                    {resource.store.isVerified ? <VerifiedBadge size="sm" /> : null}
                  </div>

                  {resource.store.bio ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                      {resource.store.bio}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text-muted)]">
                      <div className="font-medium text-[var(--text)]">Delivery</div>
                      <div className="mt-1">
                        {resource.isFree ? "Instant library access" : "Digital delivery after checkout"}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text-muted)]">
                      <div className="font-medium text-[var(--text)]">Usage</div>
                      <div className="mt-1">Single-buyer digital license unless the listing says otherwise.</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  Creator details coming soon.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <section className="defer-section mt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              Related resources
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Similar resources from this creator or overlapping tags.
            </p>
          </div>
        </div>

        <ResourceGrid resources={relatedResources} />
      </section>
      </div>
    </>
  );
}
