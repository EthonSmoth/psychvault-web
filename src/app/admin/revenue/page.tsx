import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { adminToggleFounderStatusAction } from "@/server/actions/admin-actions";
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

export default async function RevenuePage() {
  const admin = await requireAdmin();

  if (!admin.isSuperAdmin) {
    redirect("/admin");
  }

  const creators = await db.user.findMany({
    where: {
      OR: [{ role: "CREATOR" }, { store: { isNot: null } }],
    },
    orderBy: [{ isFounder: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isFounder: true,
      isSuperAdmin: true,
      feePercentage: true,
      createdAt: true,
      store: { select: { id: true, name: true, slug: true, isPublished: true } },
      resources: { where: { status: "PUBLISHED" }, select: { id: true } },
    },
    take: 100,
  });

  const founderCount = creators.filter((c) => c.isFounder).length;

  return (
    <div>
      <PageHeader
        title="Revenue tiers"
        subtitle="Superadmin controls for founder status and platform fee overrides."
        badge={<StatusBadge label={`${formatCount(founderCount)} founder${founderCount === 1 ? "" : "s"}`} tone="info" />}
      />

      <SectionCard
        title="Creator accounts"
        subtitle={`${formatCount(creators.length)} creator${creators.length === 1 ? "" : "s"} on the platform`}
        action={<StatusBadge label={`${founderCount} founders`} tone="info" />}
      >
        <div className="space-y-4">
          {creators.length === 0 ? (
            <EmptyState message="No creators found yet." />
          ) : (
            creators.map((creator) => (
              <div key={creator.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="heading-section">{creator.name || creator.email}</h3>
                      {creator.store ? (
                        <StatusBadge label="Has store" tone={creator.store.isPublished ? "success" : "warning"} />
                      ) : null}
                      {creator.isFounder ? <StatusBadge label="Founder" tone="info" /> : null}
                      {creator.isSuperAdmin ? <StatusBadge label="Superadmin" tone="neutral" /> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <MetaPill>{creator.email}</MetaPill>
                      <MetaPill>{`${Math.round((creator.feePercentage ?? 0.2) * 100)}% platform fee`}</MetaPill>
                      <MetaPill>{formatCount(creator.resources.length)} published resource{creator.resources.length === 1 ? "" : "s"}</MetaPill>
                      <MetaPill>Joined {formatDateTime(creator.createdAt)}</MetaPill>
                      {creator.store ? <MetaPill>/{creator.store.slug}</MetaPill> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {creator.store ? (
                      <Link
                        href={`/stores/${creator.store.slug}`}
                        className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                      >
                        Open store
                      </Link>
                    ) : null}
                    {!creator.isSuperAdmin ? (
                      <form action={adminToggleFounderStatusAction}>
                        <input type="hidden" name="userId" value={creator.id} />
                        <FormSubmitButton pendingText="Updating..." className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                          {creator.isFounder ? "Remove founder" : "Make founder (15%)"}
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
    </div>
  );
}
