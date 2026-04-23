import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import {
  adminApproveCreatorApplicationAction,
  adminRejectCreatorApplicationAction,
} from "@/server/actions/creator-application-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  EmptyState,
  formatCount,
  formatDateTime,
  MetaPill,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../_admin";

export default async function ApplicationsPage() {
  await requireAdmin();

  const pendingApplications = await db.creatorApplication.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Creator applications"
        subtitle="Approve or reject applications to join as a creator."
        badge={
          <StatusBadge
            label={pendingApplications.length > 0 ? `${formatCount(pendingApplications.length)} pending` : "Clear"}
            tone={pendingApplications.length > 0 ? "warning" : "success"}
          />
        }
      />

      <SectionCard
        title="Pending applications"
        subtitle={`${formatCount(pendingApplications.length)} application${pendingApplications.length === 1 ? "" : "s"} waiting for a decision`}
        action={
          <StatusBadge
            label={pendingApplications.length > 0 ? "Needs review" : "Clear"}
            tone={pendingApplications.length > 0 ? "warning" : "success"}
          />
        }
      >
        <div className="space-y-4">
          {pendingApplications.length === 0 ? (
            <EmptyState message="No pending creator applications." />
          ) : (
            pendingApplications.map((app) => (
              <div key={app.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="heading-section">{app.user.name || app.user.email}</h3>
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
    </div>
  );
}
