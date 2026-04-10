import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function formatPrice(cents: number | null | undefined) {
  const safe = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(safe / 100);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function LibraryPage() {
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
              className="inline-flex items-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
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
      createdAt: "desc",
    },
    include: {
      resource: {
        include: {
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          files: {
            where: {
              kind: "MAIN_DOWNLOAD",
            },
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              mimeType: true,
              fileSizeBytes: true,
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
    },
  });

  const totalPurchases = purchases.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-light)]">My library</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text)]">
              Purchased resources
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Access the resources you've purchased and download them anytime.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text)]">
            <span className="font-semibold text-[var(--text)]">{totalPurchases}</span>{" "}
            {totalPurchases === 1 ? "resource" : "resources"}
          </div>
        </div>
      </div>

      {purchases.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">
            Your library is empty
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            When you purchase a resource, it will appear here.
          </p>

          <div className="mt-6">
            <Link
              href="/resources"
              className="inline-flex items-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
            >
              Browse resources
            </Link>
          </div>
        </div>
      ) : (
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

            return (
              <div
                key={purchase.id}
                className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-alt)]">
                      {resource.thumbnailUrl ? (
                        <img
                          src={resource.thumbnailUrl}
                          alt={resource.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl text-[var(--text-light)]">
                          📘
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold text-slate-900">
                          {resource.title}
                        </h2>

                        {resource.isFree ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Free
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {formatPrice(resource.priceCents)}
                          </span>
                        )}
                      </div>

                      {resource.shortDescription ? (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {resource.shortDescription}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span>
                          By{" "}
                          <Link
                            href={`/stores/${resource.store.slug}`}
                            className="font-medium text-slate-700 hover:text-slate-900"
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
                        <p className="mt-3 text-xs text-slate-500">
                          Download file:{" "}
                          <span className="font-medium text-slate-700">
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

                  <div className="flex shrink-0 flex-wrap gap-3">
                    <Link
                      href={`/resources/${resource.slug}`}
                      className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      View resource
                    </Link>

                    {mainDownload ? (
                      <a
                        href={`/api/downloads/${resource.id}`}
                        className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
                        No download
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}