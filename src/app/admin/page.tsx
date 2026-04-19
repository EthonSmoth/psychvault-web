import type { ReactNode } from"react";
import Link from"next/link";
import {
  formatCreatorTrustTier,
  getCreatorTrustAppearance,
  getCreatorTrustProfiles,
  type CreatorTrustProfile,
} from"@/lib/creator-trust";
import { db } from"@/lib/db";
import { requireAdmin } from"@/lib/require-admin";
import {
  adminApproveQueuedResourceAction,
  adminApproveRefundAction,
  adminArchiveResourceAction,
  adminArchiveStoreAction,
  adminDismissResourceReportAction,
  adminDismissStoreReportAction,
  adminPublishResourceAction,
  adminPublishStoreAction,
  adminRejectQueuedResourceAction,
  adminRejectRefundAction,
  adminResolveResourceReportAction,
  adminResolveStoreReportAction,
  adminToggleFounderStatusAction,
  adminToggleStoreVerificationAction,
  adminUnpublishResourceAction,
} from"@/server/actions/admin-actions";
import {
  adminApproveCreatorApplicationAction,
  adminRejectCreatorApplicationAction,
} from"@/server/actions/creator-application-actions";
import { FormSubmitButton } from"@/components/ui/form-submit-button";

type Tone ="danger" |"warning" |"success" |"info" |"neutral";

const emptyTrustProfile: CreatorTrustProfile = {
  score: 0,
  tier:"new",
  reasons: [],
  stats: {
    accountAgeDays: 0,
    approvedResources: 0,
    rejectedResources: 0,
    pendingResources: 0,
    openReports: 0,
    resolvedReports: 0,
    salesCount: 0,
  },
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style:"currency",
    currency:"AUD",
  }).format(cents / 100);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-AU").format(value);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle:"medium",
    timeStyle:"short",
  }).format(date);
}

function formatReportReason(reason: string) {
  const label = reason.replaceAll("_","").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatModerationStatus(status: string) {
  return status.toLowerCase().replaceAll("_","").replace(/^\w/, (char) => char.toUpperCase());
}

function getToneStyles(tone: Tone) {
  switch (tone) {
    case"danger":
      return { textColor:"var(--error)", borderColor:"rgba(208, 87, 78, 0.28)", backgroundColor:"rgba(208, 87, 78, 0.12)" };
    case"warning":
      return { textColor:"var(--warning)", borderColor:"rgba(217, 126, 59, 0.28)", backgroundColor:"rgba(217, 126, 59, 0.12)" };
    case"success":
      return { textColor:"var(--success)", borderColor:"rgba(107, 142, 35, 0.28)", backgroundColor:"rgba(107, 142, 35, 0.12)" };
    case"info":
      return { textColor:"var(--primary)", borderColor:"rgba(128, 80, 45, 0.26)", backgroundColor:"rgba(128, 80, 45, 0.10)" };
    default:
      return { textColor:"var(--text)", borderColor:"var(--border)", backgroundColor:"var(--surface-alt)" };
  }
}

function getMetricBadgeLabel(tone: Tone) {
  if (tone ==="danger") return"Urgent";
  if (tone ==="warning") return"Watch";
  if (tone ==="success") return"Healthy";
  if (tone ==="info") return"Live";
  return"Active";
}

function getModerationTone(status: string): Tone {
  if (["APPROVED","PUBLISHED","RESOLVED","VERIFIED"].includes(status)) return"success";
  if (["PENDING_REVIEW","DRAFT"].includes(status)) return"warning";
  if (["REJECTED","ARCHIVED"].includes(status)) return"danger";
  return"neutral";
}

function getEventTone(action: string): Tone {
  const normalized = action.toUpperCase();
  if (/(APPROVE|PUBLISH|VERIFY|RESOLVE)/.test(normalized)) return"success";
  if (/(REJECT|ARCHIVE|UNPUBLISH)/.test(normalized)) return"danger";
  if (normalized.includes("DISMISS")) return"neutral";
  return"info";
}

function fetchQueuedResources() {
  return db.resource.findMany({
    where: { moderationStatus:"PENDING_REVIEW" },
    orderBy: { updatedAt:"desc" },
    take: 10,
    include: {
      store: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      files: { where: { kind:"MAIN_DOWNLOAD" }, select: { id: true }, take: 1 },
      reports: { where: { status:"OPEN" }, select: { id: true } },
    },
  });
}

function fetchOpenReports() {
  return db.resourceReport.findMany({
    where: { status:"OPEN" },
    orderBy: { createdAt:"desc" },
    take: 10,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      resource: { include: { store: true } },
    },
  });
}

function fetchOpenStoreReports() {
  return db.storeReport.findMany({
    where: { status:"OPEN" },
    orderBy: { createdAt:"desc" },
    take: 10,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      store: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

function fetchRecentResources() {
  return db.resource.findMany({
    orderBy: { createdAt:"desc" },
    take: 10,
    include: {
      store: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      files: { where: { kind:"MAIN_DOWNLOAD" }, select: { id: true }, take: 1 },
    },
  });
}

function fetchRecentStores() {
  return db.store.findMany({
    orderBy: { createdAt:"desc" },
    take: 10,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          isFounder: true,
          isSuperAdmin: true,
          feePercentage: true,
        },
      },
      resources: { where: { status:"PUBLISHED" }, select: { id: true } },
      followers: { select: { followerId: true } },
    },
  });
}

function fetchCreatorRevenueTiers() {
  return db.user.findMany({
    where: {
      OR: [
        { role:"CREATOR" },
        { store: { isNot: null } },
      ],
    },
    orderBy: [
      { isFounder:"desc" },
      { createdAt:"asc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isFounder: true,
      isSuperAdmin: true,
      feePercentage: true,
      createdAt: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          isPublished: true,
        },
      },
      resources: {
        where: {
          status:"PUBLISHED",
        },
        select: {
          id: true,
        },
      },
    },
    take: 100,
  });
}

function fetchPendingCreatorApplications() {
  return db.creatorApplication.findMany({
    where: { status:"PENDING" },
    orderBy: { createdAt:"asc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
  });
}

function fetchPendingRefundRequests() {
  return db.refundRequest.findMany({
    where: { status:"PENDING" },
    orderBy: { createdAt:"asc" },
    take: 50,
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      purchase: {
        include: {
          resource: { select: { id: true, title: true, slug: true, priceCents: true } },
        },
      },
    },
  });
}

function fetchRecentModerationEvents() {
  return db.moderationEvent.findMany({
    orderBy: { createdAt:"desc" },
    take: 12,
    include: { actorUser: { select: { name: true, email: true } } },
  });
}

function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const style = getToneStyles(tone);
  return (
    <span className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: style.textColor, borderColor: style.borderColor, backgroundColor: style.backgroundColor }}>
      {label}
    </span>
  );
}

function MetaPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] font-medium text-[var(--text-muted)]">{children}</span>;
}

function SectionCard({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="heading-section">{title}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function MetricCard({ label, value, note, tone }: { label: string; value: ReactNode; note: string; tone: Tone }) {
  const style = getToneStyles(tone);

  return (
    <div className="rounded-[1.75rem] border bg-[var(--card)] p-5 shadow-sm" style={{ borderColor: style.borderColor }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-[var(--text-muted)]">{label}</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: style.textColor }}>
            {value}
          </div>
        </div>
        <StatusBadge label={getMetricBadgeLabel(tone)} tone={tone} />
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{note}</p>
    </div>
  );
}

type AdminPageProps = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const admin = await requireAdmin();
  const canManageFounderStatus = Boolean(admin.isSuperAdmin);
  const resolvedSearchParams = await searchParams;
  const activeView = resolvedSearchParams?.view ||"overview";

  const [userCount, storeCount, resourceCount, purchaseCount, pendingReviewCount, openReportCount, openStoreReportCount, pendingRefundCount, pendingCreatorApplicationCount, revenueAgg] = await db.$transaction([
    db.user.count(),
    db.store.count(),
    db.resource.count(),
    db.purchase.count(),
    db.resource.count({ where: { moderationStatus:"PENDING_REVIEW" } }),
    db.resourceReport.count({ where: { status:"OPEN" } }),
    db.storeReport.count({ where: { status:"OPEN" } }),
    db.refundRequest.count({ where: { status:"PENDING" } }),
    db.creatorApplication.count({ where: { status:"PENDING" } }),
    db.purchase.aggregate({ _sum: { amountCents: true } }),
  ]);

  let queuedResources: Awaited<ReturnType<typeof fetchQueuedResources>> = [];
  let openReports: Awaited<ReturnType<typeof fetchOpenReports>> = [];
  let openStoreReports: Awaited<ReturnType<typeof fetchOpenStoreReports>> = [];
  let recentResources: Awaited<ReturnType<typeof fetchRecentResources>> = [];
  let recentStores: Awaited<ReturnType<typeof fetchRecentStores>> = [];
  let recentModerationEvents: Awaited<ReturnType<typeof fetchRecentModerationEvents>> = [];
  let pendingRefundRequests: Awaited<ReturnType<typeof fetchPendingRefundRequests>> = [];
  let pendingCreatorApplications: Awaited<ReturnType<typeof fetchPendingCreatorApplications>> = [];
  let creatorRevenueTiers: Awaited<ReturnType<typeof fetchCreatorRevenueTiers>> = [];

  if (activeView ==="overview" || activeView ==="queue" || activeView ==="resource-reports") {
    [queuedResources, openReports] = await db.$transaction([fetchQueuedResources(), fetchOpenReports()]);
  }

  if (activeView ==="overview" || activeView ==="store-reports") {
    openStoreReports = await fetchOpenStoreReports();
  }

  if (activeView ==="overview" || activeView ==="stores") {
    [recentResources, recentStores] = await db.$transaction([fetchRecentResources(), fetchRecentStores()]);
  }

  if (activeView ==="overview" || activeView ==="refunds") {
    pendingRefundRequests = await fetchPendingRefundRequests();
  }

  if (activeView ==="overview" || activeView ==="creator-applications") {
    pendingCreatorApplications = await fetchPendingCreatorApplications();
  }

  if (activeView ==="overview" || activeView ==="audit") {
    recentModerationEvents = await fetchRecentModerationEvents();
  }

  if (activeView ==="creator-revenue") {
    creatorRevenueTiers = await fetchCreatorRevenueTiers();
  }

  const grossRevenue = revenueAgg._sum.amountCents ?? 0;
  const totalOpenReports = openReportCount + openStoreReportCount;
  const itemsNeedingAttention = pendingReviewCount + totalOpenReports;
  const queuedTrustProfiles = await getCreatorTrustProfiles(queuedResources.map((resource) => resource.creator?.id ??""));
  const viewTabs = [
    { href:"/admin", label:"Overview", key:"overview" },
    { href:"/admin?view=queue", label: `Queue (${formatCount(pendingReviewCount)})`, key:"queue" },
    { href:"/admin?view=resource-reports", label: `Resource reports (${formatCount(openReportCount)})`, key:"resource-reports" },
    { href:"/admin?view=store-reports", label: `Store reports (${formatCount(openStoreReportCount)})`, key:"store-reports" },
    { href:"/admin?view=refunds", label: `Refunds (${formatCount(pendingRefundCount)})`, key:"refunds" },
    { href:"/admin?view=creator-applications", label: `Applications (${formatCount(pendingCreatorApplicationCount)})`, key:"creator-applications" },
    { href:"/admin?view=stores", label:"Stores", key:"stores" },
    ...(canManageFounderStatus
      ? [{ href:"/admin?view=creator-revenue", label:"Creator revenue tiers", key:"creator-revenue" }]
      : []),
    { href:"/admin?view=audit", label:"Audit log", key:"audit" },
  ];
  const healthState =
    itemsNeedingAttention === 0
      ? { label:"Calm inbox", note:"No urgent moderation items are waiting right now.", tone:"success" as const }
      : itemsNeedingAttention < 6
      ? { label:"Steady flow", note:"A small queue is forming, but the marketplace is still under control.", tone:"warning" as const }
      : { label:"High attention", note:"Pending reviews and open reports are stacking up and should be cleared soon.", tone:"danger" as const };
  const focusCards = [
    {
      href:"/admin?view=queue",
      label:"Pending review",
      value: formatCount(pendingReviewCount),
      note: pendingReviewCount > 0 ?"Resources waiting for a publish or reject decision." :"No queued resources right now.",
      tone: pendingReviewCount > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      href:"/admin?view=resource-reports",
      label:"Resource reports",
      value: formatCount(openReportCount),
      note: openReportCount > 0 ?"Flagged listings that need a moderation pass." :"No unresolved resource reports.",
      tone: openReportCount > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      href:"/admin?view=store-reports",
      label:"Store reports",
      value: formatCount(openStoreReportCount),
      note: openStoreReportCount > 0 ?"Store-level concerns waiting for follow-up." :"No unresolved store reports.",
      tone: openStoreReportCount > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      href:"/admin?view=refunds",
      label:"Refund requests",
      value: formatCount(pendingRefundCount),
      note: pendingRefundCount > 0 ?"Buyer refund requests waiting for a decision." :"No pending refund requests.",
      tone: pendingRefundCount > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      href:"/admin?view=audit",
      label:"Gross revenue",
      value: formatMoney(grossRevenue),
      note:"Useful marketplace signal alongside moderation load.",
      tone:"info" as const,
    },
  ];
  const metricCards = [
    { label:"Pending review", value: formatCount(pendingReviewCount), note:"Listings waiting on the admin queue.", tone: pendingReviewCount > 0 ? ("warning" as const) : ("success" as const) },
    { label:"Open reports", value: formatCount(totalOpenReports), note:"Combined resource and store reports still unresolved.", tone: totalOpenReports > 0 ? ("danger" as const) : ("success" as const) },
    { label:"Gross revenue", value: formatMoney(grossRevenue), note:"All-time purchase volume across the marketplace.", tone:"info" as const },
    { label:"Purchases", value: formatCount(purchaseCount), note:"Completed orders processed so far.", tone:"neutral" as const },
    { label:"Users", value: formatCount(userCount), note:"Registered accounts across creators and buyers.", tone:"neutral" as const },
    { label:"Stores", value: formatCount(storeCount), note:"Creator storefronts on the platform.", tone:"neutral" as const },
    { label:"Resources", value: formatCount(resourceCount), note:"Total listings tracked in the catalog.", tone:"neutral" as const },
  ];
  const healthTone = getToneStyles(healthState.tone);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--border-strong)] bg-[var(--card)] shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.3fr)_360px]">
          <div className="p-7 sm:p-8">
            <span className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: healthTone.textColor, borderColor: healthTone.borderColor, backgroundColor: healthTone.backgroundColor }}>
              Admin control
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">Moderation dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
              Review flagged resources, resolve reports, and keep an eye on marketplace trust signals without digging through a flat wall of cards.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {viewTabs.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    activeView === item.key
                      ?"border-transparent bg-[var(--text)] text-white"
                      :"border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--surface-alt)]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--border)] bg-[var(--surface)]/70 p-7 sm:p-8 lg:border-l lg:border-t-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">Focus today</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: healthTone.textColor }}>
              {healthState.label}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{healthState.note}</p>
            <div className="mt-6 grid gap-3">
              {focusCards.map((card) => {
                const tone = getToneStyles(card.tone);
                return (
                  <Link key={card.label} href={card.href} className="rounded-[1.4rem] border bg-[var(--card)] p-4 shadow-sm transition hover:bg-[var(--surface-alt)]" style={{ borderColor: tone.borderColor }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-[var(--text-muted)]">{card.label}</div>
                        <div className="mt-2 text-2xl font-semibold" style={{ color: tone.textColor }}>
                          {card.value}
                        </div>
                      </div>
                      <StatusBadge label={getMetricBadgeLabel(card.tone)} tone={card.tone} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{card.note}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        {metricCards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} note={card.note} tone={card.tone} />
        ))}
      </section>

      {(activeView ==="overview" || activeView ==="queue" || activeView ==="resource-reports") ? (
        <section className="mt-10 grid gap-8 xl:grid-cols-2">
          <SectionCard
            title="Queued resources"
            subtitle={`${formatCount(pendingReviewCount)} resource${pendingReviewCount === 1 ?"" :"s"} awaiting moderation`}
            action={<StatusBadge label={pendingReviewCount > 0 ?"Queue open" :"Clear"} tone={pendingReviewCount > 0 ?"warning" :"success"} />}
          >
            <div className="space-y-4">
              {queuedResources.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
                  No resources are waiting for review.
                </div>
              ) : (
                queuedResources.map((resource) => {
                  const trustProfile = (resource.creator?.id && queuedTrustProfiles.get(resource.creator.id)) || emptyTrustProfile;
                  const trustAppearance = getCreatorTrustAppearance(trustProfile);
                  const creatorName = resource.creator?.name || resource.creator?.email ||"Unknown creator";
                  const hasMainFile = resource.files.length > 0;
                  const openReportsLabel = `${resource.reports.length} open report${resource.reports.length === 1 ?"" :"s"}`;

                  return (
                    <div key={resource.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="heading-section">{resource.title}</h3>
                              <StatusBadge label={formatModerationStatus(resource.status)} tone={getModerationTone(resource.status)} />
                              <StatusBadge label={formatModerationStatus(resource.moderationStatus)} tone={getModerationTone(resource.moderationStatus)} />
                              {!hasMainFile ? <StatusBadge label="Missing file" tone="warning" /> : null}
                              {resource.reports.length > 0 ? <StatusBadge label={openReportsLabel} tone="danger" /> : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <MetaPill>{resource.store?.name ||"No store"}</MetaPill>
                              <MetaPill>{creatorName}</MetaPill>
                              <MetaPill>Updated {formatDateTime(resource.updatedAt)}</MetaPill>
                            </div>
                            <p className="mt-3 text-sm text-[var(--text-muted)]">
                              Approved {formatCount(trustProfile.stats.approvedResources)} / Sales {formatCount(trustProfile.stats.salesCount)} / Age {formatCount(trustProfile.stats.accountAgeDays)} day{trustProfile.stats.accountAgeDays === 1 ?"" :"s"}
                            </p>
                          </div>
                          <Link href={`/resources/${resource.slug}`} className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                            Open listing
                          </Link>
                        </div>

                        <div className="rounded-[1.25rem] border px-4 py-4" style={{ borderColor: trustAppearance.borderColor, backgroundColor: trustAppearance.softBackgroundColor }}>
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">Creator trust</div>
                              <div className="mt-2 flex flex-wrap items-center gap-3">
                                <span className="text-3xl font-semibold" style={{ color: trustAppearance.textColor }}>
                                  {trustProfile.score}
                                </span>
                                <span className="rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: trustAppearance.textColor, borderColor: trustAppearance.borderColor, backgroundColor: trustAppearance.backgroundColor }}>
                                  {formatCreatorTrustTier(trustProfile.tier)}
                                </span>
                              </div>
                            </div>
                            <div className="w-full max-w-xl">
                              <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface)]">
                                <div className="h-full rounded-full" style={{ width: `${trustProfile.score}%`, background: trustAppearance.meter }} />
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {(trustProfile.reasons.length > 0 ? trustProfile.reasons : ["No trust flags currently recorded"]).map((reason) => (
                                  <span key={reason} className="rounded-full border bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]" style={{ borderColor: trustAppearance.borderColor }}>
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {resource.moderationReason ? (
                          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {resource.moderationReason}
                          </div>
                        ) : null}

                        <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] p-4">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                            <form action={adminApproveQueuedResourceAction}>
                              <input type="hidden" name="resourceId" value={resource.id} />
                              <FormSubmitButton pendingText="Publishing..." className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50">
                                Approve and publish
                              </FormSubmitButton>
                            </form>
                            <form action={adminRejectQueuedResourceAction} className="flex w-full sm:min-w-[280px] flex-1 flex-col gap-2">
                              <input type="hidden" name="resourceId" value={resource.id} />
                              <textarea
                                name="rejectionNote"
                                rows={2}
                                placeholder="Optional rejection note shown to the creator."
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)]"
                              />
                              <FormSubmitButton pendingText="Rejecting..." className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50">
                                Reject to draft
                              </FormSubmitButton>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Open resource reports"
            subtitle={`${formatCount(openReportCount)} unresolved report${openReportCount === 1 ?"" :"s"}`}
            action={<StatusBadge label={openReportCount > 0 ?"Needs review" :"Quiet"} tone={openReportCount > 0 ?"danger" :"success"} />}
          >
            <div className="space-y-4">
              {openReports.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
                  No active reports right now.
                </div>
              ) : (
                openReports.map((report) => (
                  <div key={report.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="heading-section">{report.resource.title}</h3>
                          <StatusBadge label={formatReportReason(report.reason)} tone="danger" />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <MetaPill>{report.resource.store?.name ||"No store"}</MetaPill>
                          <MetaPill>{report.reporter.name || report.reporter.email}</MetaPill>
                          <MetaPill>{formatDateTime(report.createdAt)}</MetaPill>
                        </div>
                        {report.details ? (
                          <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm leading-6 text-[var(--text)]">
                            {report.details}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--text-muted)]">No extra detail was included with this report.</p>
                        )}
                      </div>
                      <Link href={`/resources/${report.resource.slug}`} className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                        Open resource
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={adminResolveResourceReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="resourceSlug" value={report.resource.slug} />
                        <FormSubmitButton pendingText="Resolving..." className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50">
                          Mark resolved
                        </FormSubmitButton>
                      </form>
                      <form action={adminDismissResourceReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="resourceSlug" value={report.resource.slug} />
                        <FormSubmitButton pendingText="Dismissing..." className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                          Dismiss
                        </FormSubmitButton>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </section>
      ) : null}

      {(activeView ==="overview" || activeView ==="store-reports") ? (
        <section className="mt-10">
          <SectionCard
            title="Open store reports"
            subtitle={`${formatCount(openStoreReportCount)} unresolved report${openStoreReportCount === 1 ?"" :"s"} for storefronts`}
            action={<StatusBadge label={openStoreReportCount > 0 ?"Needs review" :"Quiet"} tone={openStoreReportCount > 0 ?"danger" :"success"} />}
          >
            <div className="space-y-4">
              {openStoreReports.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
                  No active store reports right now.
                </div>
              ) : (
                openStoreReports.map((report) => (
                  <div key={report.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="heading-section">{report.store.name}</h3>
                          <StatusBadge label={formatReportReason(report.reason)} tone="danger" />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <MetaPill>{report.reporter.name || report.reporter.email}</MetaPill>
                          <MetaPill>{report.store.owner?.name || report.store.owner?.email ||"Unknown owner"}</MetaPill>
                          <MetaPill>{formatDateTime(report.createdAt)}</MetaPill>
                        </div>
                        {report.details ? (
                          <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm leading-6 text-[var(--text)]">
                            {report.details}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--text-muted)]">No extra detail was included with this store report.</p>
                        )}
                      </div>
                      <Link href={`/stores/${report.store.slug}`} className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                        Open store
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={adminResolveStoreReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="storeSlug" value={report.store.slug} />
                        <FormSubmitButton pendingText="Resolving..." className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50">
                          Mark resolved
                        </FormSubmitButton>
                      </form>
                      <form action={adminDismissStoreReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="storeSlug" value={report.store.slug} />
                        <FormSubmitButton pendingText="Dismissing..." className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                          Dismiss
                        </FormSubmitButton>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </section>
      ) : null}

      {(activeView ==="overview" || activeView ==="stores") ? (
        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <SectionCard
            title="Recent resources"
            subtitle="Fresh listings and their current publication state"
            action={
              <Link href="/resources" className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                View public resources
              </Link>
            }
          >
            <div className="space-y-4">
              {recentResources.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
                  No resources yet.
                </div>
              ) : (
                recentResources.map((resource) => (
                  <div key={resource.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="heading-section">{resource.title}</h3>
                          <StatusBadge label={formatModerationStatus(resource.status)} tone={getModerationTone(resource.status)} />
                          <StatusBadge label={formatModerationStatus(resource.moderationStatus)} tone={getModerationTone(resource.moderationStatus)} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <MetaPill>{resource.store?.name ||"No store"}</MetaPill>
                          <MetaPill>{resource.creator?.name ||"Unknown creator"}</MetaPill>
                          <MetaPill>{resource.files.length > 0 ?"Main file ready" :"No main file"}</MetaPill>
                        </div>
                      </div>
                      <Link href={`/resources/${resource.slug}`} className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                        Open resource
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={adminPublishResourceAction}>
                        <input type="hidden" name="resourceId" value={resource.id} />
                        <FormSubmitButton pendingText="Publishing..." className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50">
                          Publish
                        </FormSubmitButton>
                      </form>
                      <form action={adminUnpublishResourceAction}>
                        <input type="hidden" name="resourceId" value={resource.id} />
                        <FormSubmitButton pendingText="Unpublishing..." className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                          Unpublish
                        </FormSubmitButton>
                      </form>
                      <form action={adminArchiveResourceAction}>
                        <input type="hidden" name="resourceId" value={resource.id} />
                        <FormSubmitButton pendingText="Archiving..." className="rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50">
                          Archive
                        </FormSubmitButton>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Recent stores"
            subtitle="New storefronts and their publication status"
            action={<StatusBadge label={storeCount > 0 ?"Growing" :"Empty"} tone={storeCount > 0 ?"info" :"neutral"} />}
          >
            <div className="space-y-4">
              {recentStores.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
                  No stores yet.
                </div>
              ) : (
                recentStores.map((store) => (
                  <div key={store.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="heading-section">{store.name}</h3>
                          <StatusBadge label={store.isPublished ?"Published" :"Hidden"} tone={store.isPublished ?"success" :"warning"} />
                          <StatusBadge label={formatModerationStatus(store.moderationStatus)} tone={getModerationTone(store.moderationStatus)} />
                          {store.isVerified ? <StatusBadge label="Verified" tone="info" /> : null}
                          {store.owner?.isFounder ? <StatusBadge label="Founder" tone="info" /> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <MetaPill>/{store.slug}</MetaPill>
                          <MetaPill>{store.owner?.name ||"Unknown owner"}</MetaPill>
                          <MetaPill>{`${Math.round((store.owner?.feePercentage ?? 0.2) * 100)}% platform fee`}</MetaPill>
                          <MetaPill>{formatCount(store.resources.length)} published resource{store.resources.length === 1 ?"" :"s"}</MetaPill>
                          <MetaPill>{formatCount(store.followers.length)} follower{store.followers.length === 1 ?"" :"s"}</MetaPill>
                        </div>
                      </div>
                      <Link href={`/stores/${store.slug}`} className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                        Open store
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={adminPublishStoreAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <FormSubmitButton pendingText="Publishing..." className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50">
                          Publish
                        </FormSubmitButton>
                      </form>
                      <form action={adminArchiveStoreAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <FormSubmitButton pendingText="Hiding..." className="rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50">
                          Hide
                        </FormSubmitButton>
                      </form>
                      <form action={adminToggleStoreVerificationAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <FormSubmitButton pendingText={store.isVerified ?"Removing..." :"Verifying..."} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                          {store.isVerified ?"Remove verification" :"Verify store"}
                        </FormSubmitButton>
                      </form>
                      {canManageFounderStatus && store.owner && !store.owner.isSuperAdmin ? (
                        <form action={adminToggleFounderStatusAction}>
                          <input type="hidden" name="userId" value={store.owner.id} />
                          <FormSubmitButton pendingText={store.owner.isFounder ?"Updating..." :"Updating..."} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                            {store.owner.isFounder ?"Remove founder" :"Make founder (15%)"}
                          </FormSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </section>
      ) : null}

      {activeView ==="creator-revenue" ? (
        <section className="mt-10">
          <SectionCard
            title="Creator Revenue Tiers"
            subtitle="Superadmin controls for founder status and platform fee tiers"
            action={<StatusBadge label={`${formatCount(creatorRevenueTiers.filter((creator) => creator.isFounder).length)} founders`} tone="info" />}
          >
            <div className="space-y-4">
              {creatorRevenueTiers.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
                  No creators found yet.
                </div>
              ) : (
                creatorRevenueTiers.map((creator) => (
                  <div key={creator.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="heading-section">{creator.name || creator.email}</h3>
                          {creator.store ? <StatusBadge label="Has store" tone={creator.store.isPublished ?"success" :"warning"} /> : null}
                          {creator.isFounder ? <StatusBadge label="Founder" tone="info" /> : null}
                          {creator.isSuperAdmin ? <StatusBadge label="Superadmin" tone="neutral" /> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <MetaPill>{creator.email}</MetaPill>
                          <MetaPill>{`${Math.round((creator.feePercentage ?? 0.2) * 100)}% platform fee`}</MetaPill>
                          <MetaPill>{formatCount(creator.resources.length)} published resource{creator.resources.length === 1 ?"" :"s"}</MetaPill>
                          <MetaPill>Joined {formatDateTime(creator.createdAt)}</MetaPill>
                          {creator.store ? <MetaPill>/{creator.store.slug}</MetaPill> : null}
                        </div>
                        {creator.store ? (
                          <p className="mt-3 text-sm text-[var(--text-muted)]">
                            Store: {creator.store.name}
                          </p>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--text-muted)]">
                            This account has no store yet.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {creator.store ? (
                          <Link href={`/stores/${creator.store.slug}`} className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                            Open store
                          </Link>
                        ) : null}
                        {!creator.isSuperAdmin ? (
                          <form action={adminToggleFounderStatusAction}>
                            <input type="hidden" name="userId" value={creator.id} />
                            <FormSubmitButton pendingText="Updating..." className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                              {creator.isFounder ?"Remove founder" :"Make founder (15%)"}
                            </FormSubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </section>
      ) : null}

      {(activeView ==="overview" || activeView ==="refunds") ? (
        <section className="mt-10">
          <SectionCard
            title="Refund requests"
            subtitle={`${formatCount(pendingRefundCount)} pending refund request${pendingRefundCount === 1 ?"" :"s"}`}
            action={<StatusBadge label={pendingRefundCount > 0 ?"Needs action" :"Clear"} tone={pendingRefundCount > 0 ?"warning" :"success"} />}
          >
            <div className="space-y-4">
              {pendingRefundRequests.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
                  No pending refund requests.
                </div>
              ) : (
                pendingRefundRequests.map((req) => (
                  <div key={req.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="heading-section">{req.purchase.resource.title}</h3>
                          <StatusBadge label={req.reason.replaceAll("_","").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} tone="warning" />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <MetaPill>{req.buyer.name || req.buyer.email}</MetaPill>
                          <MetaPill>{formatMoney(req.purchase.amountCents)}</MetaPill>
                          <MetaPill>Submitted {formatDateTime(req.createdAt)}</MetaPill>
                        </div>
                        {req.message ? (
                          <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm leading-6 text-[var(--text)]">
                            {req.message}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--text-muted)]">No message was included with this request.</p>
                        )}
                      </div>
                      <Link
                        href={`/resources/${req.purchase.resource.slug}`}
                        className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                      >
                        View resource
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <form action={adminApproveRefundAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <input type="hidden" name="refundRequestId" value={req.id} />
                        <textarea
                          name="adminNotes"
                          rows={2}
                          placeholder="Optional admin notes (visible internally)."
                          className="w-full sm:min-w-[220px] rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)]"
                        />
                        <FormSubmitButton pendingText="Approving..." className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50">
                          Approve
                        </FormSubmitButton>
                      </form>
                      <form action={adminRejectRefundAction}>
                        <input type="hidden" name="refundRequestId" value={req.id} />
                        <FormSubmitButton pendingText="Rejecting..." className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50">
                          Reject
                        </FormSubmitButton>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </section>
      ) : null}

      {(activeView ==="overview" || activeView ==="creator-applications") ? (
        <section className="mt-10">
          <SectionCard
            title="Creator applications"
            subtitle={`${formatCount(pendingCreatorApplicationCount)} application${pendingCreatorApplicationCount === 1 ?"" :"s"} waiting for a decision`}
            action={<StatusBadge label={pendingCreatorApplicationCount > 0 ?"Needs review" :"Clear"} tone={pendingCreatorApplicationCount > 0 ?"warning" :"success"} />}
          >
            <div className="space-y-4">
              {pendingCreatorApplications.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
                  No pending creator applications.
                </div>
              ) : (
                pendingCreatorApplications.map((app) => (
                  <div key={app.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="heading-section">
                          {app.user.name || app.user.email}
                        </h3>
                        <StatusBadge label="Pending" tone="warning" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <MetaPill>{app.user.email}</MetaPill>
                        <MetaPill>Applied {formatDateTime(app.createdAt)}</MetaPill>
                        <MetaPill>Joined {formatDateTime(app.user.createdAt)}</MetaPill>
                      </div>
                      {app.message ? (
                        <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm leading-6 text-[var(--text)]">
                          {app.message}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-[var(--text-muted)]">No message was included with this application.</p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <form action={adminApproveCreatorApplicationAction}>
                        <input type="hidden" name="applicationId" value={app.id} />
                        <FormSubmitButton pendingText="Approving..." className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50">
                          Approve
                        </FormSubmitButton>
                      </form>
                      <form action={adminRejectCreatorApplicationAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <input type="hidden" name="applicationId" value={app.id} />
                        <textarea
                          name="adminNotes"
                          rows={2}
                          placeholder="Rejection reason shown to the applicant (optional)."
                          className="w-full sm:min-w-[220px] rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)]"
                        />
                        <FormSubmitButton pendingText="Rejecting..." className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50">
                          Reject
                        </FormSubmitButton>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </section>
      ) : null}

      {(activeView ==="overview" || activeView ==="audit") ? (
        <section className="mt-10">
          <SectionCard
            title="Moderation audit log"
            subtitle="Latest automated and admin decisions across the marketplace"
            action={<StatusBadge label="Recent activity" tone="info" />}
          >
            <div className="space-y-4">
              {recentModerationEvents.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
                  No moderation events yet.
                </div>
              ) : (
                recentModerationEvents.map((event) => (
                  <div key={event.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge label={formatModerationStatus(event.action)} tone={getEventTone(event.action)} />
                          <MetaPill>{event.targetType} / {event.targetId}</MetaPill>
                        </div>
                        {event.message ? (
                          <div className="mt-3 text-sm leading-6 text-[var(--text)]">{event.message}</div>
                        ) : (
                          <div className="mt-3 text-sm text-[var(--text-muted)]">No extra moderation note was recorded for this event.</div>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] sm:text-right">
                        <div>{formatDateTime(event.createdAt)}</div>
                        <div className="mt-1">{event.actorUser?.name || event.actorUser?.email ||"System"}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </section>
      ) : null}
    </div>
  );
}
