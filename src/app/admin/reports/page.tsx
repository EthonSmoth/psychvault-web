import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import {
  adminDismissResourceReportAction,
  adminDismissStoreReportAction,
  adminResolveResourceReportAction,
  adminResolveStoreReportAction,
} from "@/server/actions/admin-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  EmptyState,
  formatCount,
  formatDateTime,
  formatReportReason,
  MetaPill,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../_admin";

export default async function ReportsPage() {
  await requireAdmin();

  const [openReports, openStoreReports] = await db.$transaction([
    db.resourceReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        resource: { include: { store: true } },
      },
    }),
    db.storeReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        store: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
  ]);

  const totalReports = openReports.length + openStoreReports.length;

  return (
    <div>
      <PageHeader
        title="Open reports"
        subtitle="Flagged resources and stores waiting for a moderation decision."
        badge={
          <StatusBadge
            label={totalReports > 0 ? `${formatCount(totalReports)} open` : "All clear"}
            tone={totalReports > 0 ? "danger" : "success"}
          />
        }
      />

      <div className="space-y-8">
        {/* Resource reports */}
        <SectionCard
          title="Resource reports"
          subtitle={`${formatCount(openReports.length)} unresolved report${openReports.length === 1 ? "" : "s"}`}
          action={
            <StatusBadge
              label={openReports.length > 0 ? "Needs review" : "Quiet"}
              tone={openReports.length > 0 ? "danger" : "success"}
            />
          }
        >
          <div className="space-y-4">
            {openReports.length === 0 ? (
              <EmptyState message="No open resource reports." />
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
                        <MetaPill>{report.resource.store?.name || "No store"}</MetaPill>
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
                    <Link
                      href={`/resources/${report.resource.slug}`}
                      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                    >
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

        {/* Store reports */}
        <SectionCard
          title="Store reports"
          subtitle={`${formatCount(openStoreReports.length)} unresolved report${openStoreReports.length === 1 ? "" : "s"} for storefronts`}
          action={
            <StatusBadge
              label={openStoreReports.length > 0 ? "Needs review" : "Quiet"}
              tone={openStoreReports.length > 0 ? "danger" : "success"}
            />
          }
        >
          <div className="space-y-4">
            {openStoreReports.length === 0 ? (
              <EmptyState message="No open store reports." />
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
                        <MetaPill>{report.store.owner?.name || report.store.owner?.email || "Unknown owner"}</MetaPill>
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
                    <Link
                      href={`/stores/${report.store.slug}`}
                      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                    >
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
      </div>
    </div>
  );
}
