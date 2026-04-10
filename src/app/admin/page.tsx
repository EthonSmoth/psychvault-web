import Link from "next/link";
import { getCreatorTrustProfile } from "@/lib/creator-trust";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import {
  adminApproveQueuedResourceAction,
  adminArchiveResourceAction,
  adminArchiveStoreAction,
  adminDismissResourceReportAction,
  adminDismissStoreReportAction,
  adminPublishResourceAction,
  adminPublishStoreAction,
  adminRejectQueuedResourceAction,
  adminResolveResourceReportAction,
  adminResolveStoreReportAction,
  adminToggleStoreVerificationAction,
  adminUnpublishResourceAction,
} from "@/server/actions/admin-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

function formatReportReason(reason: string) {
  const label = reason.replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatModerationStatus(status: string) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function fetchQueuedResources() {
  return db.resource.findMany({
    where: { moderationStatus: "PENDING_REVIEW" },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: {
      store: true,
      creator: true,
      files: {
        where: { kind: "MAIN_DOWNLOAD" },
        select: { id: true },
        take: 1,
      },
      reports: {
        where: { status: "OPEN" },
        select: { id: true },
      },
    },
  });
}

function fetchOpenReports() {
  return db.resourceReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      reporter: true,
      resource: {
        include: {
          store: true,
        },
      },
    },
  });
}

function fetchOpenStoreReports() {
  return db.storeReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      reporter: true,
      store: {
        include: {
          owner: true,
        },
      },
    },
  });
}

function fetchRecentResources() {
  return db.resource.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      store: true,
      creator: true,
      files: {
        where: { kind: "MAIN_DOWNLOAD" },
        select: { id: true },
        take: 1,
      },
    },
  });
}

function fetchRecentStores() {
  return db.store.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      owner: true,
      resources: {
        where: { status: "PUBLISHED" },
        select: { id: true },
      },
      followers: {
        select: { followerId: true },
      },
    },
  });
}

function fetchRecentModerationEvents() {
  return db.moderationEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      actorUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

type AdminPageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

// Renders the moderation dashboard with quick filters for the most common admin workflows.
export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;
  const activeView = resolvedSearchParams?.view || "overview";

  const userCount = await db.user.count();
  const storeCount = await db.store.count();
  const resourceCount = await db.resource.count();
  const purchaseCount = await db.purchase.count();
  const pendingReviewCount = await db.resource.count({
    where: { moderationStatus: "PENDING_REVIEW" },
  });
  const openReportCount = await db.resourceReport.count({
    where: { status: "OPEN" },
  });
  const openStoreReportCount = await db.storeReport.count({
    where: { status: "OPEN" },
  });
  const revenueAgg = await db.purchase.aggregate({
    _sum: { amountCents: true },
  });

  let queuedResources: Awaited<ReturnType<typeof fetchQueuedResources>> = [];
  let openReports: Awaited<ReturnType<typeof fetchOpenReports>> = [];
  let openStoreReports: Awaited<ReturnType<typeof fetchOpenStoreReports>> = [];
  let recentResources: Awaited<ReturnType<typeof fetchRecentResources>> = [];
  let recentStores: Awaited<ReturnType<typeof fetchRecentStores>> = [];
  let recentModerationEvents: Awaited<ReturnType<typeof fetchRecentModerationEvents>> = [];

  if (activeView === "overview" || activeView === "queue" || activeView === "resource-reports") {
    queuedResources = await fetchQueuedResources();
    openReports = await fetchOpenReports();
  }

  if (activeView === "overview" || activeView === "store-reports") {
    openStoreReports = await fetchOpenStoreReports();
  }

  if (activeView === "overview" || activeView === "stores") {
    recentResources = await fetchRecentResources();
    recentStores = await fetchRecentStores();
  }

  if (activeView === "overview" || activeView === "audit") {
    recentModerationEvents = await fetchRecentModerationEvents();
  }

  const grossRevenue = revenueAgg._sum.amountCents ?? 0;
  const queuedTrustProfiles: Awaited<ReturnType<typeof getCreatorTrustProfile>>[] = [];
  for (const resource of queuedResources) {
    queuedTrustProfiles.push(await getCreatorTrustProfile(resource.creator.id));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
          Admin
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Moderation dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Review flagged resources, handle reports, and keep an eye on marketplace health.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--text-muted)]">Users</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{userCount}</div>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--text-muted)]">Stores</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{storeCount}</div>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--text-muted)]">Resources</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{resourceCount}</div>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--text-muted)]">Purchases</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{purchaseCount}</div>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--text-muted)]">Gross revenue</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">
            {formatMoney(grossRevenue)}
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--text-muted)]">Pending review</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">
            {pendingReviewCount}
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--text-muted)]">Open reports</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">
            {openReportCount + openStoreReportCount}
          </div>
        </div>
      </section>

      <section className="mt-6 flex flex-wrap gap-2">
        {[
          { href: "/admin", label: "Overview", key: "overview" },
          { href: "/admin?view=queue", label: `Queue (${pendingReviewCount})`, key: "queue" },
          {
            href: "/admin?view=resource-reports",
            label: `Resource reports (${openReportCount})`,
            key: "resource-reports",
          },
          {
            href: "/admin?view=store-reports",
            label: `Store reports (${openStoreReportCount})`,
            key: "store-reports",
          },
          { href: "/admin?view=stores", label: "Stores", key: "stores" },
          { href: "/admin?view=audit", label: "Audit log", key: "audit" },
        ].map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium transition ${
              activeView === item.key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </section>

      {(activeView === "overview" || activeView === "queue" || activeView === "resource-reports") ? (
      <section className="mt-10 grid gap-8 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Queued resources</h2>
            <span className="text-sm text-slate-500">
              {pendingReviewCount} awaiting moderation
            </span>
          </div>

          <div className="space-y-3">
            {queuedResources.length === 0 ? (
              <p className="text-sm text-slate-500">No resources are waiting for review.</p>
            ) : (
              queuedResources.map((resource) => (
                <div
                  key={resource.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  {(() => {
                    const trustProfile =
                      queuedTrustProfiles[
                        queuedResources.findIndex((queued) => queued.id === resource.id)
                      ];

                    return (
                      <>
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-medium text-slate-900">{resource.title}</div>
                              <div className="mt-1 text-sm text-slate-600">
                                {resource.store?.name || "No store"} · {resource.status}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Creator: {resource.creator?.name || "Unknown"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Main file: {resource.files.length > 0 ? "Yes" : "No"} · Open reports:{" "}
                                {resource.reports.length}
                              </div>
                              <div className="mt-2 text-xs text-slate-500">
                                Trust: {trustProfile.score} · {trustProfile.tier}
                              </div>
                              {resource.moderationReason ? (
                                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                  {resource.moderationReason}
                                </div>
                              ) : null}
                            </div>

                            <Link
                              href={`/resources/${resource.slug}`}
                              className="text-sm font-medium text-slate-700 hover:text-slate-900"
                            >
                              Open
                            </Link>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <form action={adminApproveQueuedResourceAction}>
                              <input type="hidden" name="resourceId" value={resource.id} />
                              <FormSubmitButton
                                pendingText="Publishing..."
                                className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                              >
                                Approve and publish
                              </FormSubmitButton>
                            </form>

                            <form
                              action={adminRejectQueuedResourceAction}
                              className="flex min-w-[280px] flex-1 flex-col gap-2"
                            >
                              <input type="hidden" name="resourceId" value={resource.id} />
                              <textarea
                                name="rejectionNote"
                                rows={2}
                                placeholder="Optional rejection note shown to the creator."
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
                              />
                              <FormSubmitButton
                                pendingText="Rejecting..."
                                className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                              >
                                Reject to draft
                              </FormSubmitButton>
                            </form>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Open resource reports</h2>
            <span className="text-sm text-slate-500">{openReportCount} unresolved</span>
          </div>

          <div className="space-y-3">
            {openReports.length === 0 ? (
              <p className="text-sm text-slate-500">No active reports right now.</p>
            ) : (
              openReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{report.resource.title}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {formatReportReason(report.reason)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Reported by {report.reporter.name || report.reporter.email}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Store: {report.resource.store?.name || "No store"}
                        </div>
                        {report.details ? (
                          <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                            {report.details}
                          </div>
                        ) : null}
                      </div>

                      <Link
                        href={`/resources/${report.resource.slug}`}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                      >
                        Open
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={adminResolveResourceReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="resourceSlug" value={report.resource.slug} />
                        <FormSubmitButton
                          pendingText="Resolving..."
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Mark resolved
                        </FormSubmitButton>
                      </form>

                      <form action={adminDismissResourceReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="resourceSlug" value={report.resource.slug} />
                        <FormSubmitButton
                          pendingText="Dismissing..."
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Dismiss
                        </FormSubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      ) : null}

      {(activeView === "overview" || activeView === "store-reports") ? (
      <section className="mt-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Open store reports</h2>
            <span className="text-sm text-slate-500">{openStoreReports.length} unresolved</span>
          </div>

          <div className="space-y-3">
            {openStoreReports.length === 0 ? (
              <p className="text-sm text-slate-500">No active store reports right now.</p>
            ) : (
              openStoreReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{report.store.name}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {formatReportReason(report.reason)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Reported by {report.reporter.name || report.reporter.email}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Owner: {report.store.owner?.name || report.store.owner?.email || "Unknown"}
                        </div>
                        {report.details ? (
                          <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                            {report.details}
                          </div>
                        ) : null}
                      </div>

                      <Link
                        href={`/stores/${report.store.slug}`}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                      >
                        Open
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={adminResolveStoreReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="storeSlug" value={report.store.slug} />
                        <FormSubmitButton
                          pendingText="Resolving..."
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Mark resolved
                        </FormSubmitButton>
                      </form>

                      <form action={adminDismissStoreReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="storeSlug" value={report.store.slug} />
                        <FormSubmitButton
                          pendingText="Dismissing..."
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Dismiss
                        </FormSubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      ) : null}

      {(activeView === "overview" || activeView === "stores") ? (
      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent resources</h2>
            <Link
              href="/resources"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              View public resources
            </Link>
          </div>

          <div className="space-y-3">
            {recentResources.length === 0 ? (
              <p className="text-sm text-slate-500">No resources yet.</p>
            ) : (
              recentResources.map((resource) => (
                <div
                  key={resource.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{resource.title}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {resource.store?.name || "No store"} · {resource.status} ·{" "}
                          {formatModerationStatus(resource.moderationStatus)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Creator: {resource.creator?.name || "Unknown"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Main file: {resource.files.length > 0 ? "Yes" : "No"}
                        </div>
                      </div>

                      <Link
                        href={`/resources/${resource.slug}`}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                      >
                        Open
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={adminPublishResourceAction}>
                        <input type="hidden" name="resourceId" value={resource.id} />
                        <FormSubmitButton
                          pendingText="Publishing..."
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Publish
                        </FormSubmitButton>
                      </form>

                      <form action={adminUnpublishResourceAction}>
                        <input type="hidden" name="resourceId" value={resource.id} />
                        <FormSubmitButton
                          pendingText="Unpublishing..."
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Unpublish
                        </FormSubmitButton>
                      </form>

                      <form action={adminArchiveResourceAction}>
                        <input type="hidden" name="resourceId" value={resource.id} />
                        <FormSubmitButton
                          pendingText="Archiving..."
                          className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                        >
                          Archive
                        </FormSubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent stores</h2>
          </div>

          <div className="space-y-3">
            {recentStores.length === 0 ? (
              <p className="text-sm text-slate-500">No stores yet.</p>
            ) : (
              recentStores.map((store) => (
                <div
                  key={store.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-slate-900">{store.name}</div>
                          {store.isVerified ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                              Verified
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          {store.isPublished ? "Published" : "Hidden"} · /stores/{store.slug}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Moderation: {formatModerationStatus(store.moderationStatus)}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Owner: {store.owner?.name || "Unknown"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {store.resources.length} published resources · {store.followers.length} followers
                        </div>
                      </div>

                      <Link
                        href={`/stores/${store.slug}`}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                      >
                        Open
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={adminPublishStoreAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <FormSubmitButton
                          pendingText="Publishing..."
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Publish
                        </FormSubmitButton>
                      </form>

                      <form action={adminArchiveStoreAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <FormSubmitButton
                          pendingText="Hiding..."
                          className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                        >
                          Hide
                        </FormSubmitButton>
                      </form>

                      <form action={adminToggleStoreVerificationAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <FormSubmitButton
                          pendingText={store.isVerified ? "Removing..." : "Verifying..."}
                          className="rounded-xl border border-sky-200 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
                        >
                          {store.isVerified ? "Remove verification" : "Verify store"}
                        </FormSubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      ) : null}

      {(activeView === "overview" || activeView === "audit") ? (
      <section className="mt-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Moderation audit log</h2>
            <span className="text-sm text-slate-500">Latest automated and admin decisions</span>
          </div>

          <div className="space-y-3">
            {recentModerationEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No moderation events yet.</p>
            ) : (
              recentModerationEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {formatModerationStatus(event.action)}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {event.targetType} · {event.targetId}
                      </div>
                      {event.message ? (
                        <div className="mt-2 text-sm text-slate-700">{event.message}</div>
                      ) : null}
                    </div>

                    <div className="text-xs text-slate-500 sm:text-right">
                      <div>{new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(event.createdAt)}</div>
                      <div className="mt-1">
                        {event.actorUser?.name || event.actorUser?.email || "System"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      ) : null}
    </div>
  );
}
