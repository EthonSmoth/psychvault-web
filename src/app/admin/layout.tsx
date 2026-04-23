import type { ReactNode } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { AdminNav } from "./_nav-client";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  const [queueCount, openResourceReports, openStoreReports, refundCount, applicationCount] =
    await db.$transaction([
      db.resource.count({ where: { moderationStatus: "PENDING_REVIEW" } }),
      db.resourceReport.count({ where: { status: "OPEN" } }),
      db.storeReport.count({ where: { status: "OPEN" } }),
      db.refundRequest.count({ where: { status: "PENDING" } }),
      db.creatorApplication.count({ where: { status: "PENDING" } }),
    ]);

  const counts = {
    queue: queueCount,
    reports: openResourceReports + openStoreReports,
    refunds: refundCount,
    applications: applicationCount,
  };

  const totalUrgent = queueCount + openResourceReports + openStoreReports + refundCount + applicationCount;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
              ← Site
            </Link>
            <span className="text-[var(--border-strong)]">/</span>
            <Link href="/admin" className="text-sm font-semibold text-[var(--text)]">
              Admin
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {totalUrgent > 0 && (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                {totalUrgent} item{totalUrgent === 1 ? "" : "s"} need attention
              </span>
            )}
            <span className="hidden text-sm text-[var(--text-muted)] sm:block">{admin.email}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Mobile nav */}
        <div className="pt-4 lg:hidden">
          <AdminNav counts={counts} isSuperAdmin={Boolean(admin.isSuperAdmin)} />
        </div>

        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 py-8">
              <div className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
                Navigation
              </div>
              <AdminNav counts={counts} isSuperAdmin={Boolean(admin.isSuperAdmin)} />
            </div>
          </aside>

          {/* Page content */}
          <main className="min-w-0 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
