import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import {
  adminApproveRefundAction,
  adminRejectRefundAction,
} from "@/server/actions/admin-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  EmptyState,
  formatCount,
  formatDateTime,
  formatMoney,
  MetaPill,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../_admin";

export default async function RefundsPage() {
  await requireAdmin();

  const pendingRefundRequests = await db.refundRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
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

  return (
    <div>
      <PageHeader
        title="Refund requests"
        subtitle="Pending buyer refund requests — approve or reject each one."
        badge={
          <StatusBadge
            label={pendingRefundRequests.length > 0 ? `${formatCount(pendingRefundRequests.length)} pending` : "Clear"}
            tone={pendingRefundRequests.length > 0 ? "warning" : "success"}
          />
        }
      />

      <SectionCard
        title="Pending refund requests"
        subtitle={`${formatCount(pendingRefundRequests.length)} request${pendingRefundRequests.length === 1 ? "" : "s"} waiting for a decision`}
        action={
          <StatusBadge
            label={pendingRefundRequests.length > 0 ? "Needs action" : "Clear"}
            tone={pendingRefundRequests.length > 0 ? "warning" : "success"}
          />
        }
      >
        <div className="space-y-4">
          {pendingRefundRequests.length === 0 ? (
            <EmptyState message="No pending refund requests." />
          ) : (
            pendingRefundRequests.map((req) => (
              <div key={req.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="heading-section">{req.purchase.resource.title}</h3>
                      <StatusBadge
                        label={req.reason.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                        tone="warning"
                      />
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
    </div>
  );
}
