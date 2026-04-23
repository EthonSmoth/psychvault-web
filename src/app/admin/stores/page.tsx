import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import {
  adminArchiveResourceAction,
  adminArchiveStoreAction,
  adminPublishResourceAction,
  adminPublishStoreAction,
  adminToggleFounderStatusAction,
  adminToggleStoreVerificationAction,
  adminUnpublishResourceAction,
} from "@/server/actions/admin-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  EmptyState,
  formatCount,
  formatDateTime,
  getModerationTone,
  formatModerationStatus,
  MetaPill,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../_admin";

export default async function StoresPage() {
  const admin = await requireAdmin();
  const canManageFounderStatus = Boolean(admin.isSuperAdmin);

  const [recentResources, recentStores] = await db.$transaction([
    db.resource.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        store: true,
        creator: { select: { id: true, name: true, email: true } },
        files: { where: { kind: "MAIN_DOWNLOAD" }, select: { id: true }, take: 1 },
      },
    }),
    db.store.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
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
        resources: { where: { status: "PUBLISHED" }, select: { id: true } },
        followers: { select: { followerId: true } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Stores & resources"
        subtitle="Recent storefronts and listings — publish, archive, or verify."
      />

      <div className="space-y-8">
        <SectionCard
          title="Recent stores"
          subtitle="Newest storefronts and their publication status"
          action={<StatusBadge label={recentStores.length > 0 ? "Growing" : "Empty"} tone={recentStores.length > 0 ? "info" : "neutral"} />}
        >
          <div className="space-y-4">
            {recentStores.length === 0 ? (
              <EmptyState message="No stores yet." />
            ) : (
              recentStores.map((store) => (
                <div key={store.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="heading-section">{store.name}</h3>
                        <StatusBadge label={store.isPublished ? "Published" : "Hidden"} tone={store.isPublished ? "success" : "warning"} />
                        <StatusBadge label={formatModerationStatus(store.moderationStatus)} tone={getModerationTone(store.moderationStatus)} />
                        {store.isVerified ? <StatusBadge label="Verified" tone="info" /> : null}
                        {store.owner?.isFounder ? <StatusBadge label="Founder" tone="info" /> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <MetaPill>/{store.slug}</MetaPill>
                        <MetaPill>{store.owner?.name || "Unknown owner"}</MetaPill>
                        <MetaPill>{`${Math.round((store.owner?.feePercentage ?? 0.2) * 100)}% platform fee`}</MetaPill>
                        <MetaPill>{formatCount(store.resources.length)} published resource{store.resources.length === 1 ? "" : "s"}</MetaPill>
                        <MetaPill>{formatCount(store.followers.length)} follower{store.followers.length === 1 ? "" : "s"}</MetaPill>
                      </div>
                    </div>
                    <Link
                      href={`/stores/${store.slug}`}
                      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                    >
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
                      <FormSubmitButton
                        pendingText={store.isVerified ? "Removing..." : "Verifying..."}
                        className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                      >
                        {store.isVerified ? "Remove verification" : "Verify store"}
                      </FormSubmitButton>
                    </form>
                    {canManageFounderStatus && store.owner && !store.owner.isSuperAdmin ? (
                      <form action={adminToggleFounderStatusAction}>
                        <input type="hidden" name="userId" value={store.owner.id} />
                        <FormSubmitButton pendingText="Updating..." className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]">
                          {store.owner.isFounder ? "Remove founder" : "Make founder (15%)"}
                        </FormSubmitButton>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent resources"
          subtitle="Fresh listings and their current publication state"
          action={
            <Link
              href="/resources"
              className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
            >
              View public
            </Link>
          }
        >
          <div className="space-y-4">
            {recentResources.length === 0 ? (
              <EmptyState message="No resources yet." />
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
                        <MetaPill>{resource.store?.name || "No store"}</MetaPill>
                        <MetaPill>{resource.creator?.name || "Unknown creator"}</MetaPill>
                        <MetaPill>{resource.files.length > 0 ? "Main file ready" : "No main file"}</MetaPill>
                        <MetaPill>{formatDateTime(resource.createdAt)}</MetaPill>
                      </div>
                    </div>
                    <Link
                      href={`/resources/${resource.slug}`}
                      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                    >
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
      </div>
    </div>
  );
}
