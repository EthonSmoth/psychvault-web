import Link from "next/link";
import {
  formatCreatorTrustTier,
  getCreatorTrustAppearance,
  getCreatorTrustProfiles,
  type CreatorTrustProfile,
} from "@/lib/creator-trust";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import {
  adminApproveQueuedResourceAction,
  adminRejectQueuedResourceAction,
} from "@/server/actions/admin-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  EmptyState,
  formatCount,
  formatDateTime,
  formatModerationStatus,
  getModerationTone,
  MetaPill,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../_admin";

const emptyTrustProfile: CreatorTrustProfile = {
  score: 0,
  tier: "new",
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

export default async function QueuePage() {
  await requireAdmin();

  const queuedResources = await db.resource.findMany({
    where: { moderationStatus: "PENDING_REVIEW" },
    orderBy: { updatedAt: "desc" },
    take: 25,
    include: {
      store: true,
      creator: { select: { id: true, name: true, email: true } },
      files: { where: { kind: "MAIN_DOWNLOAD" }, select: { id: true }, take: 1 },
      reports: { where: { status: "OPEN" }, select: { id: true } },
    },
  });

  const queuedTrustProfiles = await getCreatorTrustProfiles(
    queuedResources.map((r) => r.creator?.id ?? "")
  );

  return (
    <div>
      <PageHeader
        title="Moderation queue"
        subtitle="Resources submitted for review — publish or reject each listing."
        badge={
          <StatusBadge
            label={queuedResources.length > 0 ? `${formatCount(queuedResources.length)} pending` : "Clear"}
            tone={queuedResources.length > 0 ? "warning" : "success"}
          />
        }
      />

      <SectionCard
        title="Queued resources"
        subtitle={`${formatCount(queuedResources.length)} resource${queuedResources.length === 1 ? "" : "s"} awaiting a decision`}
        action={
          <StatusBadge
            label={queuedResources.length > 0 ? "Queue open" : "Clear"}
            tone={queuedResources.length > 0 ? "warning" : "success"}
          />
        }
      >
        <div className="space-y-4">
          {queuedResources.length === 0 ? (
            <EmptyState message="No resources are waiting for review." />
          ) : (
            queuedResources.map((resource) => {
              const trustProfile =
                (resource.creator?.id && queuedTrustProfiles.get(resource.creator.id)) ||
                emptyTrustProfile;
              const trustAppearance = getCreatorTrustAppearance(trustProfile);
              const creatorName = resource.creator?.name || resource.creator?.email || "Unknown creator";
              const hasMainFile = resource.files.length > 0;
              const openReportsLabel = `${resource.reports.length} open report${resource.reports.length === 1 ? "" : "s"}`;

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
                          <MetaPill>{resource.store?.name || "No store"}</MetaPill>
                          <MetaPill>{creatorName}</MetaPill>
                          <MetaPill>Updated {formatDateTime(resource.updatedAt)}</MetaPill>
                        </div>
                        <p className="mt-3 text-sm text-[var(--text-muted)]">
                          Approved {formatCount(trustProfile.stats.approvedResources)} · Sales {formatCount(trustProfile.stats.salesCount)} · Account age {formatCount(trustProfile.stats.accountAgeDays)} day{trustProfile.stats.accountAgeDays === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Link
                        href={`/resources/${resource.slug}`}
                        className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                      >
                        Open listing
                      </Link>
                    </div>

                    <div
                      className="rounded-[1.25rem] border px-4 py-4"
                      style={{ borderColor: trustAppearance.borderColor, backgroundColor: trustAppearance.softBackgroundColor }}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">Creator trust</div>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span className="text-3xl font-semibold" style={{ color: trustAppearance.textColor }}>
                              {trustProfile.score}
                            </span>
                            <span
                              className="rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                              style={{ color: trustAppearance.textColor, borderColor: trustAppearance.borderColor, backgroundColor: trustAppearance.backgroundColor }}
                            >
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
                              <span
                                key={reason}
                                className="rounded-full border bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]"
                                style={{ borderColor: trustAppearance.borderColor }}
                              >
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
    </div>
  );
}
