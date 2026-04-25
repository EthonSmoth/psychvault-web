import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import {
  EmptyState,
  formatCount,
  formatDateTime,
  formatModerationStatus,
  formatMoney,
  getEventTone,
  getToneStyles,
  MetricCard,
  SectionCard,
  StatusBadge,
  type Tone,
} from "./_admin";

function fetchRecentModerationEvents() {
  return db.moderationEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { actorUser: { select: { name: true, email: true } } },
  });
}

export default async function AdminPage() {
  await requireAdmin();

  const [
    userCount,
    storeCount,
    resourceCount,
    purchaseCount,
    pendingReviewCount,
    openReportCount,
    openStoreReportCount,
    pendingRefundCount,
    pendingCreatorApplicationCount,
    revenueAgg,
  ] = await db.$transaction([
    db.user.count(),
    db.store.count(),
    db.resource.count(),
    db.purchase.count(),
    db.resource.count({ where: { moderationStatus: "PENDING_REVIEW" } }),
    db.resourceReport.count({ where: { status: "OPEN" } }),
    db.storeReport.count({ where: { status: "OPEN" } }),
    db.refundRequest.count({ where: { status: "PENDING" } }),
    db.creatorApplication.count({ where: { status: "PENDING" } }),
    db.purchase.aggregate({ _sum: { amountCents: true } }),
  ]);

  const recentModerationEvents = await fetchRecentModerationEvents();

  const grossRevenue = revenueAgg._sum.amountCents ?? 0;
  const totalOpenReports = openReportCount + openStoreReportCount;
  const itemsNeedingAttention =
    pendingReviewCount + totalOpenReports + pendingRefundCount + pendingCreatorApplicationCount;

  const healthState =
    itemsNeedingAttention === 0
      ? {
          label: "Calm inbox",
          note: "No urgent moderation items are waiting right now.",
          tone: "success" as const,
        }
      : itemsNeedingAttention < 6
      ? {
          label: "Steady flow",
          note: "A small queue is forming, but the marketplace is still under control.",
          tone: "warning" as const,
        }
      : {
          label: "High attention",
          note: "Pending reviews and open reports are stacking up and should be cleared soon.",
          tone: "danger" as const,
        };

  const healthTone = getToneStyles(healthState.tone);

  const actionCards: {
    href: string;
    label: string;
    value: string;
    note: string;
    tone: Tone;
  }[] = [
    {
      href: "/admin/queue",
      label: "Pending review",
      value: formatCount(pendingReviewCount),
      note:
        pendingReviewCount > 0
          ? "Resources waiting for a publish or reject decision."
          : "No queued resources right now.",
      tone: pendingReviewCount > 0 ? "warning" : "success",
    },
    {
      href: "/admin/reports",
      label: "Open reports",
      value: formatCount(totalOpenReports),
      note:
        totalOpenReports > 0
          ? "Flagged listings and stores needing a moderation pass."
          : "No unresolved reports.",
      tone: totalOpenReports > 0 ? "danger" : "success",
    },
    {
      href: "/admin/refunds",
      label: "Refund requests",
      value: formatCount(pendingRefundCount),
      note:
        pendingRefundCount > 0
          ? "Buyer refund requests waiting for a decision."
          : "No pending refund requests.",
      tone: pendingRefundCount > 0 ? "warning" : "success",
    },
    {
      href: "/admin/applications",
      label: "Creator applications",
      value: formatCount(pendingCreatorApplicationCount),
      note:
        pendingCreatorApplicationCount > 0
          ? "New applications waiting for a decision."
          : "No pending applications.",
      tone: pendingCreatorApplicationCount > 0 ? "warning" : "success",
    },
  ];

  const statCards: { label: string; value: string; note: string; tone: Tone }[] = [
    {
      label: "Gross revenue",
      value: formatMoney(grossRevenue),
      note: "All-time purchase volume.",
      tone: "info",
    },
    {
      label: "Purchases",
      value: formatCount(purchaseCount),
      note: "Completed orders processed.",
      tone: "neutral",
    },
    {
      label: "Users",
      value: formatCount(userCount),
      note: "Registered accounts.",
      tone: "neutral",
    },
    {
      label: "Stores",
      value: formatCount(storeCount),
      note: "Creator storefronts.",
      tone: "neutral",
    },
    {
      label: "Resources",
      value: formatCount(resourceCount),
      note: "Total listings in catalog.",
      tone: "neutral",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border-strong)] bg-[var(--card)] p-7 shadow-sm sm:p-8">
        <span
          className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{
            color: healthTone.textColor,
            borderColor: healthTone.borderColor,
            backgroundColor: healthTone.backgroundColor,
          }}
        >
          {healthState.label}
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
          Moderation dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
          {healthState.note}
        </p>
      </div>

      {/* Action metrics — items requiring admin attention */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-light)]">
          Needs attention
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actionCards.map((card) => {
            const tone = getToneStyles(card.tone);
            return (
              <Link
                key={card.label}
                href={card.href}
                className="block rounded-[1.75rem] border bg-[var(--card)] p-5 shadow-sm transition hover:bg-[var(--surface-alt)]"
                style={{ borderColor: tone.borderColor }}
              >
                <div className="text-sm font-medium text-[var(--text-muted)]">{card.label}</div>
                <div
                  className="mt-3 text-3xl font-semibold tracking-tight"
                  style={{ color: tone.textColor }}
                >
                  {card.value}
                </div>
                <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{card.note}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Platform stats — informational */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-light)]">
          Platform overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {statCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              note={card.note}
              tone={card.tone}
            />
          ))}
        </div>
      </section>

      {/* Recent moderation activity */}
      <SectionCard
        title="Recent activity"
        subtitle="Latest automated and admin decisions across the marketplace"
        action={
          <a href="/admin/audit" className="text-sm text-[var(--primary)] hover:underline">
            Full log →
          </a>
        }
      >
        {recentModerationEvents.length === 0 ? (
          <EmptyState message="No moderation events yet." />
        ) : (
          <div className="space-y-3">
            {recentModerationEvents.map((event) => {
              const tone = getEventTone(event.action);
              return (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusBadge label={formatModerationStatus(event.action)} tone={tone} />
                    {event.message ? (
                      <span className="min-w-0 truncate text-sm text-[var(--text-muted)]">
                        {event.message}
                      </span>
                    ) : (
                      <span className="text-sm text-[var(--text-light)]">{event.targetType}</span>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-xs text-[var(--text-muted)]">
                    <div>{formatDateTime(event.createdAt)}</div>
                    <div className="mt-0.5 text-[var(--text-light)]">
                      {event.actorUser?.name || event.actorUser?.email || "System"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}