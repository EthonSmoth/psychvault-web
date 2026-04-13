import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCSRFToken } from "@/lib/csrf";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
import { isPaidResourcePayoutReady, isPayoutAccountReady } from "@/lib/stripe-connect";
import { redirect } from "next/navigation";
import Link from "next/link";
import { deleteOwnResourceAction } from "@/server/actions/creator-resource-actions";

function formatPrice(priceCents: number, isFree: boolean) {
  if (isFree || priceCents === 0) return "Free";

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceCents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getModerationBadgeClasses(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700";
  if (status === "PENDING_REVIEW") return "bg-amber-100 text-amber-800";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

export default async function CreatorResourcesPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: { store: true, payoutAccount: true },
  });

  if (!user) redirect("/login");
  await requireVerifiedEmailOrRedirect(user.id, "/creator/resources");
  if (!user.store) redirect("/creator/store");

  const csrfToken = generateCSRFToken(user.id);

  const [resources, archivedCount] = await Promise.all([
    db.resource.findMany({
      where: {
        storeId: user.store.id,
        status: {
          not: "ARCHIVED",
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.resource.count({
      where: {
        storeId: user.store.id,
        status: "ARCHIVED",
      },
    }),
  ]);
  const payoutReady = isPayoutAccountReady(user.payoutAccount);
  const paidResourcePayoutReady = isPaidResourcePayoutReady({
    user,
    payoutReady,
  });
  const publishedPaidResources = resources.filter(
    (resource) => resource.status === "PUBLISHED" && resource.priceCents > 0
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Your resources
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            Resources
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Manage your uploaded resources, edit listings, and archive resources you no longer want to sell.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/creator/resources/archived"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Archived ({archivedCount})
          </Link>

          <Link
            href="/creator/resources/new"
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + New resource
          </Link>
        </div>
      </div>

      {!paidResourcePayoutReady ? (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {publishedPaidResources > 0
            ? `${publishedPaidResources} published paid resource${publishedPaidResources === 1 ? "" : "s"} from your older creator setup now need Stripe payout onboarding before they can stay sale-ready.`
            : "Connect Stripe before publishing paid resources. Free resources can still go live normally."}
          {" "}
          <Link href="/creator/payouts" className="font-semibold underline">
            Finish payout setup
          </Link>
          .
        </div>
      ) : null}

      {resources.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-600">No active resources yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            Create your first resource to get started.
          </p>
          <Link
            href="/creator/resources/new"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + New resource
          </Link>
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
                    <span className="truncate text-base font-semibold text-slate-900">
                      {r.title}
                    </span>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        r.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.status === "PUBLISHED" ? "Published" : "Draft"}
                    </span>

                    {r.isFree ? (
                      <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        Free
                      </span>
                    ) : null}

                    {!r.isFree && !paidResourcePayoutReady ? (
                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        Payout setup required
                      </span>
                    ) : null}

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getModerationBadgeClasses(
                        r.moderationStatus
                      )}`}
                    >
                      {r.moderationStatus === "PENDING_REVIEW"
                        ? "Pending review"
                        : r.moderationStatus === "REJECTED"
                        ? "Rejected"
                        : "Approved"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span>{formatPrice(r.priceCents, r.isFree)}</span>
                    <span>{r.salesCount} sales</span>
                    <span>Created {formatDate(r.createdAt)}</span>
                  </div>

                  {r.moderationReason ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {r.moderationReason}
                    </div>
                  ) : null}

                  {r.moderationStatus === "PENDING_REVIEW" ? (
                    <p className="mt-2 text-xs text-slate-500">
                      This listing can stay saved as a draft while admin review is pending.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/resources/${r.slug}`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    View
                  </Link>

                  <Link
                    href={`/creator/resources/${r.id}/edit`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit
                  </Link>

                  <form action={deleteOwnResourceAction}>
                    <input type="hidden" name="_csrf" value={csrfToken} />
                    <input type="hidden" name="resourceId" value={r.id} />
                    <button
                      type="submit"
                      className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                    >
                      Archive
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
