import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppBaseUrl } from "@/lib/env";
import { serializeJsonLd } from "@/lib/input-safety";
import { getMarketplacePolicyLinks, getPaymentsAvailability } from "@/lib/payments";
import { isPaidResourcePayoutReady, isPayoutAccountReady } from "@/lib/stripe-connect";
import {
  getPublishedResourceReviews,
  getPublishedResourceMetadata,
  getPublishedResourcePageData,
  getRelatedPublishedResources,
} from "@/server/queries/public-content";
import { ResourceGallery } from "@/components/resources/resource-gallery";
import { ResourceGrid } from "@/components/resources/resource-grid";
import {
  ResourcePageNotices,
  ResourcePurchaseActions,
  ResourceReportBox,
  ResourceReviewGate,
  ResourceViewerProvider,
} from "@/components/resources/resource-viewer";
import { VerifiedBadge } from "@/components/ui/verified-badge";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

// Builds SEO metadata for published resource pages and suppresses indexing for missing listings.
export async function generateMetadata({ params }: ResourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  const resource = await getPublishedResourceMetadata(slug);

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
  return "\u2605".repeat(rounded) + "\u2606".repeat(5 - rounded);
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
};

async function ResourceReviewsSection({
  resourceId,
  resourceSlug,
}: {
  resourceId: string;
  resourceSlug: string;
}) {
  const reviews = await getPublishedResourceReviews({
    resourceId,
    resourceSlug,
  });

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[var(--text)]">Recent reviews</h2>

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">No reviews yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
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
                    {renderStars(review.rating)} <span className="ml-2">{review.rating}/5</span>
                  </div>
                </div>

                <div className="text-xs text-[var(--text-light)]">
                  {formatDate(review.createdAt)}
                </div>
              </div>

              {review.body ? (
                <p className="mt-2 text-sm leading-6 text-[var(--text)]">{review.body}</p>
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
  );
}

async function RelatedResourcesSection({
  resourceId,
  resourceSlug,
  storeId,
  relatedCategoryIds,
}: {
  resourceId: string;
  resourceSlug: string;
  storeId?: string | null;
  relatedCategoryIds: string[];
}) {
  const relatedResources = await getRelatedPublishedResources({
    resourceId,
    resourceSlug,
    storeId,
    relatedCategoryIds,
  });

  if (relatedResources.length === 0) {
    return null;
  }

  return (
    <section className="defer-section mt-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Related resources
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Similar resources from this creator or the same category.
          </p>
        </div>
      </div>

      <ResourceGrid resources={relatedResources} />
    </section>
  );
}

function DeferredCardFallback({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="h-6 w-40 animate-pulse rounded-lg bg-[var(--surface-alt)]" aria-hidden="true" />
      <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{copy}</p>
      <div className="mt-6 space-y-3" aria-hidden="true">
        <div className="h-20 rounded-2xl bg-[var(--surface-alt)]" />
        <div className="h-20 rounded-2xl bg-[var(--surface-alt)]" />
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}

// Renders the public resource detail page, including gallery, commerce, reviews, and reporting.
export default async function ResourceDetailPage({ params }: ResourcePageProps) {
  const { slug } = await params;

  const publicData = await getPublishedResourcePageData(slug);

  if (!publicData) {
    notFound();
  }

  const { resource } = publicData;
  const resourceData = resource as NonNullable<typeof resource>;

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
  const hasMainFile = resource.hasMainFile || Boolean(mainFile);
  const fileFormat = getFileExtension(mainFile?.fileName);
  const primaryCategory = resource.categories[0]?.category;
  const relatedCategoryIds = resource.categories
    .map((item) => item.categoryId)
    .slice(0, 2);
  const paymentAvailability = getPaymentsAvailability();
  const policyLinks = getMarketplacePolicyLinks();
  const creatorPayoutReady = isPaidResourcePayoutReady({
    user: {
      isSuperAdmin: resourceData.store?.owner?.isSuperAdmin,
    },
    payoutReady: isPayoutAccountReady(resourceData.store?.owner?.payoutAccount),
  });
  const paidCheckoutUnavailable =
    !resource.isFree && (!paymentAvailability.enabled || !creatorPayoutReady);
  const checkoutUnavailableReason = !resource.isFree
    ? !paymentAvailability.enabled
      ? "platform"
      : !creatorPayoutReady
      ? "creator-payouts"
      : null
    : null;

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

  function renderPurchasePanel(extraClassName = "") {
    return (
      <aside className={extraClassName}>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-3xl font-semibold text-[var(--text)]">
            {formatPrice(resourceData.priceCents, resourceData.isFree)}
          </div>

          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            {resourceData.isFree
              ? "Create an account to add this free resource to your library and download it."
              : checkoutUnavailableReason === "platform"
              ? "Paid checkout is temporarily paused while payment activation is being completed."
              : checkoutUnavailableReason === "creator-payouts"
              ? "This creator still needs to finish Stripe payout onboarding before paid checkout can go live."
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
                {resourceData.isFree
                  ? "Instant after claim"
                  : checkoutUnavailableReason
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
            <ResourcePurchaseActions
              resourceId={resourceData.id}
              resourceSlug={resourceData.slug}
              storeOwnerId={resourceData.store?.ownerId}
              hasMainFile={hasMainFile}
              isFree={resourceData.isFree}
              priceCents={resourceData.priceCents}
              checkoutUnavailableReason={checkoutUnavailableReason}
            />
          </div>

          {!resourceData.isFree && hasMainFile ? (
            <div className="mt-6 rounded-2xl bg-[var(--surface-alt)] p-4 text-sm text-[var(--text)]">
              <div className="font-semibold text-[var(--text)]">
                {checkoutUnavailableReason === "platform"
                  ? "Payment activation in progress"
                  : checkoutUnavailableReason === "creator-payouts"
                  ? "Creator payout setup required"
                  : "Secure purchase"}
              </div>
              <p className="mt-2">
                {checkoutUnavailableReason === "platform"
                  ? "This listing is ready for sale, but paid checkout is temporarily paused while live payments are being finalised."
                  : checkoutUnavailableReason === "creator-payouts"
                  ? "This listing has a downloadable file, but the creator has not completed Stripe payout onboarding yet."
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
            <ResourceReportBox
              resourceId={resourceData.id}
              resourceSlug={resourceData.slug}
            />
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-6">
            <div className="text-sm font-semibold text-[var(--text)]">Creator</div>

            {resourceData.store ? (
              <div className="mt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/stores/${resourceData.store.slug}`}
                    className="font-medium text-[var(--text)] hover:text-[var(--accent)]"
                  >
                    {resourceData.store.name}
                  </Link>

                  {resourceData.store.isVerified ? <VerifiedBadge size="sm" /> : null}
                </div>

                {resourceData.store.bio ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    {resourceData.store.bio}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text-muted)]">
                    <div className="font-medium text-[var(--text)]">Delivery</div>
                    <div className="mt-1">
                      {resourceData.isFree ? "Instant library access" : "Digital delivery after checkout"}
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
    );
  }

  return (
    <ResourceViewerProvider resourceId={resourceData.id}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(cleanSchema) }}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Suspense fallback={null}>
        <ResourcePageNotices />
      </Suspense>
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-6 flex flex-wrap gap-2">
            {resourceData.categories.map((item) => (
              <Link
                key={item.category.id}
                href={`/resources?category=${item.category.slug}`}
                className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
              >
                {item.category.name}
              </Link>
            ))}

            {resourceData.tags.map((item) => (
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
            {resourceData.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
            {resourceData.store ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                {resourceData.store.logoUrl ? (
                  <span className="relative h-8 w-8 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)]">
                    <Image
                      src={resourceData.store.logoUrl}
                      alt={`${resourceData.store.name} logo`}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </span>
                ) : null}
                <Link
                  href={`/stores/${resourceData.store.slug}`}
                  className="font-medium text-[var(--text)] hover:text-[var(--accent)]"
                >
                  by {resourceData.store.name}
                </Link>

                {resourceData.store.isVerified ? <VerifiedBadge size="sm" /> : null}
              </span>
            ) : (
              <span>Clinician-made resource</span>
            )}

            {resourceData.reviewCount > 0 ? (
              <>
                <span>{resource.averageRating?.toFixed(1) || "0.0"} rating</span>
                <span>{resourceData.reviewCount} reviews</span>
              </>
            ) : (
              <span>New listing</span>
            )}
            <span>{resourceData.salesCount > 0 ? `${resourceData.salesCount} sales` : "No sales yet"}</span>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            {galleryImages.length > 0 ? (
              <ResourceGallery images={galleryImages} title={resourceData.title} />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[var(--surface)] to-[var(--surface-strong)] text-sm font-medium text-[var(--text-light)]">
                Preview coming soon
              </div>
            )}
          </div>

          <div className="mt-6 lg:hidden">
            {renderPurchasePanel()}
          </div>

          <div className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text)]">About this resource</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text)]">
              {resourceData.shortDescription ? (
                <p className="text-base font-medium text-[var(--text)]">
                  {resourceData.shortDescription}
                </p>
              ) : null}

              <p className="whitespace-pre-line">{resourceData.description}</p>
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
                {resourceData.tags.length > 0 ? (
                  resourceData.tags.map((item) => (
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

          <div className="mt-10">
            <Suspense
              fallback={
                <DeferredCardFallback
                  title="Recent reviews"
                  copy="Loading recent buyer feedback for this resource."
                />
              }
            >
              <ResourceReviewsSection
                resourceId={resourceData.id}
                resourceSlug={resourceData.slug}
              />
            </Suspense>
          </div>

          <div className="mt-10">
            <ResourceReviewGate
              resourceId={resourceData.id}
              resourceSlug={resourceData.slug}
            />
          </div>
        </div>

        {renderPurchasePanel("hidden lg:block lg:sticky lg:top-24 lg:self-start")}
      </div>

      <Suspense
        fallback={
          <section className="defer-section mt-16">
            <DeferredCardFallback
              title="Related resources"
              copy="Loading similar resources from this creator and category."
            />
          </section>
        }
      >
        <RelatedResourcesSection
          resourceId={resourceData.id}
          resourceSlug={resourceData.slug}
          storeId={resourceData.storeId}
          relatedCategoryIds={relatedCategoryIds}
        />
      </Suspense>
      </div>
    </ResourceViewerProvider>
  );
}
