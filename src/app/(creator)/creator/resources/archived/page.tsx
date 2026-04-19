import { auth } from"@/lib/auth";
import { db } from"@/lib/db";
import { generateCSRFToken } from"@/lib/csrf";
import { requireVerifiedEmailOrRedirect } from"@/lib/require-email-verification";
import { redirect } from"next/navigation";
import Link from"next/link";
import {
  restoreOwnResourceAction,
  restoreOwnResourceAndPublishAction,
} from"@/server/actions/creator-resource-actions";

function formatPrice(priceCents: number, isFree: boolean) {
  if (isFree || priceCents === 0) return"Free";

  return new Intl.NumberFormat("en-AU", {
    style:"currency",
    currency:"AUD",
  }).format(priceCents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day:"numeric",
    month:"short",
    year:"numeric",
  }).format(date);
}

function getModerationBadgeClasses(status: string) {
  if (status ==="APPROVED") return"bg-emerald-100 text-emerald-700";
  if (status ==="PENDING_REVIEW") return"bg-amber-100 text-amber-800";
  if (status ==="REJECTED") return"bg-red-100 text-red-700";
  return"bg-slate-100 text-slate-600";
}

export default async function ArchivedResourcesPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      store: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) redirect("/login");
  await requireVerifiedEmailOrRedirect(user.id,"/creator/resources/archived");
  if (!user.store) redirect("/creator/store");

  const csrfToken = generateCSRFToken(user.id);

  const resources = await db.resource.findMany({
    where: {
      storeId: user.store.id,
      status:"ARCHIVED",
    },
    orderBy: { updatedAt:"desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Archived resources
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Archived
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Restore resources you previously archived.
          </p>
        </div>

        <Link
          href="/creator/resources"
          className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back to active resources
        </Link>
      </div>

      {resources.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-600">No archived resources.</p>
          <p className="mt-1 text-sm text-slate-500">
            Archived items will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {resources.map((r) => (
            <div
              key={r.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-semibold text-[var(--text)]">
                      {r.title}
                    </span>

                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Archived
                    </span>

                    {r.isFree ? (
                      <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        Free
                      </span>
                    ) : null}

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getModerationBadgeClasses(
                        r.moderationStatus
                      )}`}
                    >
                      {r.moderationStatus ==="PENDING_REVIEW"
                        ?"Pending review"
                        : r.moderationStatus ==="REJECTED"
                        ?"Rejected"
                        :"Approved"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span>{formatPrice(r.priceCents, r.isFree)}</span>
                    <span>{r.salesCount} sales</span>
                    <span>Updated {formatDate(r.updatedAt)}</span>
                  </div>

                  {r.moderationReason ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {r.moderationReason}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form action={restoreOwnResourceAction}>
                    <input type="hidden" name="_csrf" value={csrfToken} />
                    <input type="hidden" name="resourceId" value={r.id} />
                    <button
                      type="submit"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Restore as draft
                    </button>
                  </form>

                  <form action={restoreOwnResourceAndPublishAction}>
                    <input type="hidden" name="_csrf" value={csrfToken} />
                    <input type="hidden" name="resourceId" value={r.id} />
                    <button
                      type="submit"
                      className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Restore & publish
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
