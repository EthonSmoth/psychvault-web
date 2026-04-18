import Link from "next/link";
import { auth } from "@/lib/auth";
import { generateCSRFToken } from "@/lib/csrf";
import { db } from "@/lib/db";
import { canBypassPaidResourcePayoutRequirement } from "@/lib/payout-readiness";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
import { isPaidResourcePayoutReady, isPayoutAccountReady } from "@/lib/stripe-connect";
import { redirect } from "next/navigation";
import { StoreForm } from "@/components/forms/store-form";

export default async function CreatorStorePage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      isSuperAdmin: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          bio: true,
          logoUrl: true,
          bannerUrl: true,
          isPublished: true,
          moderationStatus: true,
          moderationReason: true,
        },
      },
      payoutAccount: {
        select: {
          payoutsEnabled: true,
          detailsSubmitted: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  await requireVerifiedEmailOrRedirect(user.id, "/creator/store");

  const csrfToken = generateCSRFToken(user.id);
  const payoutReady = isPayoutAccountReady(user.payoutAccount);
  const bypassesPaidPayoutRequirement = canBypassPaidResourcePayoutRequirement(user);
  const paidResourcePayoutReady = isPaidResourcePayoutReady({
    user,
    payoutReady,
  });
  const storeChecklist = [
    { label: "Store name added", done: Boolean(user.store?.name?.trim()) },
    { label: "Unique store slug set", done: Boolean(user.store?.slug?.trim()) },
    { label: "Store bio added", done: Boolean(user.store?.bio?.trim()) },
    { label: "Store logo uploaded", done: Boolean(user.store?.logoUrl) },
    { label: "Store banner uploaded", done: Boolean(user.store?.bannerUrl) },
    {
      label: bypassesPaidPayoutRequirement
        ? "Admin paid listing access"
        : "Payout setup complete",
      done: bypassesPaidPayoutRequirement ? true : payoutReady,
    },
    { label: "Store published", done: Boolean(user.store?.isPublished) },
  ];
  const completedChecklistCount = storeChecklist.filter((item) => item.done).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="inline-flex rounded-full bg-[var(--surface-alt)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">
          Store settings
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
          {user.store ? "Edit your store" : "Create your store"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Your store is your public creator profile.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Clear store details, an original logo, and an accurate bio help buyers trust
          your resources and reduce the chance of moderation delays.
        </p>

        {user.store ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-[var(--surface-alt)] px-3 py-1 text-xs font-semibold text-[var(--text)]">
              {user.store.isPublished ? "Published" : "Draft"}
            </span>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                user.store.moderationStatus === "APPROVED"
                  ? "bg-emerald-100 text-emerald-700"
                  : user.store.moderationStatus === "PENDING_REVIEW"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {user.store.moderationStatus === "PENDING_REVIEW"
                ? "Pending review"
                : user.store.moderationStatus === "REJECTED"
                ? "Rejected"
                : "Approved"}
            </span>
          </div>
        ) : null}

        {user.store?.moderationReason ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text)]">Publishing note:</span>{" "}
            {user.store.moderationReason}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <StoreForm store={user.store ?? undefined} csrfToken={csrfToken} />
      </div>

      {!paidResourcePayoutReady ? (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          Paid listings now require Stripe payout setup so creator earnings can be sent to
          the right connected account.
          {" "}
          <Link href="/creator/payouts" className="font-semibold underline">
            Complete payouts
          </Link>
          .
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text)]">Go-live checklist</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          These details help your public store look complete for buyers and platform reviewers.
        </p>
        <div className="mt-4 inline-flex rounded-full bg-[var(--surface-alt)] px-3 py-1 text-xs font-semibold text-[var(--text)]">
          {completedChecklistCount} of {storeChecklist.length} complete
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {storeChecklist.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text)]"
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  item.done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {item.done ? "OK" : "!"}
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
