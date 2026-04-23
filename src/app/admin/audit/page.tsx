import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import {
  EmptyState,
  formatDateTime,
  formatModerationStatus,
  getEventTone,
  MetaPill,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../_admin";

export default async function AuditPage() {
  await requireAdmin();

  const events = await db.moderationEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actorUser: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="All automated and admin moderation decisions across the marketplace."
      />

      <SectionCard
        title="Moderation events"
        subtitle={`Showing the last ${events.length} events`}
        action={<StatusBadge label="Recent activity" tone="info" />}
      >
        <div className="space-y-3">
          {events.length === 0 ? (
            <EmptyState message="No moderation events yet." />
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={formatModerationStatus(event.action)} tone={getEventTone(event.action)} />
                      <MetaPill>{event.targetType} / {event.targetId}</MetaPill>
                    </div>
                    {event.message ? (
                      <div className="mt-3 text-sm leading-6 text-[var(--text)]">{event.message}</div>
                    ) : (
                      <div className="mt-3 text-sm text-[var(--text-muted)]">No extra note recorded.</div>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] sm:text-right">
                    <div>{formatDateTime(event.createdAt)}</div>
                    <div className="mt-1">{event.actorUser?.name || event.actorUser?.email || "System"}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
