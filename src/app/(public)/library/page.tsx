import type { Metadata } from"next";
import Image from"next/image";
import Link from"next/link";
import { redirect } from"next/navigation";
import { auth } from"@/lib/auth";
import { db } from"@/lib/db";
import { generateCSRFToken } from"@/lib/csrf";
import { RefundRequestForm } from"@/components/library/refund-request-form";
import { PurchaseTracker } from"@/components/analytics/purchase-tracker";

export const metadata: Metadata = {
  title: "My Library",
  robots: { index: false, follow: false },
};

function formatPrice(cents: number | null | undefined) {
  const safe = typeof cents ==="number" ? cents : 0;
  return new Intl.NumberFormat("en-AU", {
    style:"currency",
    currency:"AUD",
  }).format(safe / 100);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-AU", {
    day:"numeric",
    month:"short",
    year:"numeric",
  }).format(new Date(date));
}

type LibraryPageProps = {
  searchParams: Promise<{
    purchase?: string;
    resource?: string;
  }>;
};

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const resolvedSearchParams = await searchParams;
  const showPurchaseSuccess = resolvedSearchParams.purchase ==="success";
  const purchaseResourceSlug =
    typeof resolvedSearchParams.resource ==="string" &&
    isValidSlug(resolvedSearchParams.resource)
      ? resolvedSearchParams.resource
      : null;
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?redirectTo=/library");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const csrfToken = user ? generateCSRFToken(user.id) :"";

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-[var(--text)]">
            Session mismatch detected
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Your browser still has a login session, but your account record could
            not be found in the database.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--primary-dark)]"
            >
              Log in again
            </Link>

            <Link
              href="/"
              className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const purchases = await db.purchase.findMany({
    where: {
      buyerId: user.id,
    },
    orderBy: {
      createdAt:"desc",
    },
    select: {
      id: true,
      amountCents: true,
      createdAt: true,
      resource: {
        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          thumbnailUrl: true,
          isFree: true,
          priceCents: true,
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          files: {
            where: {
              kind:"MAIN_DOWNLOAD",
            },
            select: {
              id: true,
              fileName: true,
            },
          },
          reviews: {
            select: {
              id: true,
              rating: true,
            },
          },
        },
      },
      refundRequest: {
        select: { id: true, status: true },
      },
    },
  });

  const totalPurchases = purchases.length;

  // Find the purchase to track as a conversion (slug-matched, or most recent).
  // Only present when the user just arrived from a purchase flow.
  const trackedPurchase = showPurchaseSuccess
    ? (() => {
        const match = purchaseResourceSlug
          ? purchases.find((p) => p.resource.slug === purchaseResourceSlug)
          : purchases[0];
        if (!match) return null;
        return {
          transactionId: match.id,
          resourceId: match.resource.id,
          resourceTitle: match.resource.title,
          storeName: match.resource.store?.name ?? "PsychVault",
          amountCents: match.amountCents,
        };
      })()
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="card-section mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-light)]">My library</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text)]">
              Purchased resources
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Access the resources you&apos;ve purchased and download them anytime.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text)]">
              <span className="font-semibold text-[var(--text)]">{totalPurchases}</span>{" "}
              {totalPurchases === 1 ?"resource" :"resources"}
            </div>
            <Link
              href="/account"
              className="inline-flex rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
            >
              Account settings
            </Link>
          </div>
        </div>
      </div>

      {showPurchaseSuccess ? (
        <>
          {trackedPurchase ? <PurchaseTracker purchase={trackedPurchase} /> : null}
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">
              Purchase complete. Your resource is now in your library.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {purchaseResourceSlug ? (
                <Link
                  href={`/resources/${purchaseResourceSlug}`}
                  className="font-semibold text-emerald-900 underline underline-offset-2"
                >
                  View resource
                </Link>
              ) : null}
              <Link
                href="/library"
                className="font-medium text-emerald-900/80 underline underline-offset-2"
              >
                Dismiss
              </Link>
            </div>
          </div>
        </div>
        </>
      {purchases.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-alt)] text-2xl">
            📚
          </div>
          <h2 className="text-xl font-semibold text-[var(--text)]">
            Your library is empty
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Purchased and free resources both appear here — ready to download anytime.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/resources?price=free"
              className="inline-flex items-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--primary-dark)]"
            >
              Browse free resources
            </Link>
            <Link
              href="/resources"
              className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
            >
              Browse all resources
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-base" aria-hidden="true">&#9888;&#xfe0f;</span>
              <div>
                <p className="font-semibold">Do not distribute — personal use only</p>
                <p className="mt-1 leading-5 text-amber-800">
                  Resources in your library are licensed for your individual use only. Sharing, reselling, copying, or redistributing any downloaded file is strictly prohibited. Each purchase grants a single-buyer digital licence.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-4">
          {purchases.map((purchase) => {
            const resource = purchase.resource;
            const mainDownload = resource.files[0] ?? null;
            const averageRating =
              resource.reviews.length > 0
                ? (
                    resource.reviews.reduce((sum, review) => sum + review.rating, 0) /
                    resource.reviews.length
                  ).toFixed(1)
                : null;

            const isPaid = purchase.amountCents > 0;
            const hasRefundRequest = Boolean(purchase.refundRequest);
            const refundStatus = purchase.refundRequest?.status ?? null;

            return (
              <div
                key={purchase.id}
                className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-alt)]">
                      {resource.thumbnailUrl ? (
                        <div className="relative h-full w-full">
                          <Image
                            src={resource.thumbnailUrl}
                            alt={resource.title}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl text-[var(--text-light)]">
                          📘
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="heading-section truncate">
                          {resource.title}
                        </h2>

                        {resource.isFree ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Free
                          </span>
                        ) : (
                          <span className="rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                            {formatPrice(resource.priceCents)}
                          </span>
                        )}
                      </div>

                      {resource.shortDescription ? (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                          {resource.shortDescription}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
                        <span>
                          By{" "}
                          <Link
                            href={`/stores/${resource.store.slug}`}
                            className="font-medium text-[var(--text)] hover:text-[var(--accent)]"
                          >
                            {resource.store.name}
                          </Link>
                        </span>

                        <span>Purchased {formatDate(purchase.createdAt)}</span>

                        {averageRating ? (
                          <span>
                            {averageRating}★ ({resource.reviews.length})
                          </span>
                        ) : (
                          <span>No reviews yet</span>
                        )}
                      </div>

                      {mainDownload ? (
                        <p className="mt-3 text-xs text-[var(--text-muted)]">
                          Download file:{" "}
                          <span className="font-medium text-[var(--text)]">
                            {mainDownload.fileName}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-3 text-xs text-amber-700">
                          This purchase has no downloadable file attached yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-3">
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/resources/${resource.slug}`}
                        className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                      >
                        View resource
                      </Link>

                      {mainDownload ? (
                        <a
                          href={`/api/downloads/${resource.id}`}
                          className="inline-flex items-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--primary-dark)]"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="inline-flex items-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
                          No download
                        </span>
                      )}

                      <Link
                        href={`/purchases/${purchase.id}/receipt`}
                        className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-alt)]"
                      >
                        Receipt
                      </Link>
                    </div>

                    <p className="mt-2 text-[11px] font-medium text-amber-700">
                      &#9888; Not for distribution — single-buyer licence only
                    </p>

                    {isPaid && (
                      refundStatus ==="APPROVED" ? (
                        <span className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                          Refund approved
                        </span>
                      ) : refundStatus ==="REJECTED" ? (
                        <span className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                          Refund declined
                        </span>
                      ) : hasRefundRequest ? (
                        <span className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                          Refund pending review
                        </span>
                      ) : (
                        <RefundRequestForm
                          purchaseId={purchase.id}
                          resourceTitle={resource.title}
                          csrfToken={csrfToken}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
}
