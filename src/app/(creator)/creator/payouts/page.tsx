import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canBypassPaidResourcePayoutRequirement,
  isPaidResourcePayoutReady,
} from "@/lib/payout-readiness";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
import { syncCreatorPayoutStatus } from "@/lib/stripe-connect";
import { redirect } from "next/navigation";

type CreatorPayoutsPageProps = {
  searchParams: Promise<{
    stripe?: string;
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "connect-failed":
      return "We could not start Stripe onboarding just now. Please try again.";
    case "dashboard-failed":
      return "We could not open the Stripe Express Dashboard just now. Please try again.";
    case "no-payout-account":
      return "Create your Stripe payout account first.";
    case "return-failed":
      return "Stripe onboarding returned, but we could not refresh your payout status automatically.";
    default:
      return null;
  }
}

export default async function CreatorPayoutsPage({
  searchParams,
}: CreatorPayoutsPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await requireVerifiedEmailOrRedirect(session.user.id, "/creator/payouts");

  const [{ stripe: stripeState, error }, user] = await Promise.all([
    searchParams,
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            isPublished: true,
          },
        },
      },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const payoutStatus = await syncCreatorPayoutStatus(user.id);
  const bypassesPaidPayoutRequirement = canBypassPaidResourcePayoutRequirement(user.role);
  const paidResourcePayoutReady = isPaidResourcePayoutReady({
    role: user.role,
    payoutReady: payoutStatus.ready,
  });
  const publishedPaidResourceCount = user.store
    ? await db.resource.count({
        where: {
          creatorId: user.id,
          status: "PUBLISHED",
          priceCents: {
            gt: 0,
          },
        },
      })
    : 0;
  const statusMessage = getErrorMessage(error);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-[var(--surface-alt)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">
            Creator payouts
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Stripe payout setup
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            {bypassesPaidPayoutRequirement
              ? "This admin account can keep paid resources live without Stripe onboarding. Connect Stripe if you want creator earnings routed automatically."
              : "Connect your Stripe account so paid resources can send creator earnings to your bank account instead of staying on the platform account."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/creator"
            className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Back to dashboard
          </Link>

          {payoutStatus.hasAccount && payoutStatus.ready ? (
            <a
              href="/api/stripe/connect/dashboard"
              className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
            >
              Open Stripe dashboard
            </a>
          ) : (
            <a
              href="/api/stripe/connect/onboarding"
              className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
            >
              {payoutStatus.hasAccount ? "Continue Stripe setup" : "Connect Stripe"}
            </a>
          )}
        </div>
      </div>

      {!user.store ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          Create your store first. Stripe onboarding is attached to a creator account with
          a store profile.
          {" "}
          <Link href="/creator/store" className="font-semibold underline">
            Go to store settings
          </Link>
          .
        </div>
      ) : null}

      {stripeState === "return" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          Returned from Stripe. Your payout status has been refreshed below.
        </div>
      ) : null}

      {statusMessage ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {statusMessage}
        </div>
      ) : null}

      {!paidResourcePayoutReady && publishedPaidResourceCount > 0 ? (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          {publishedPaidResourceCount} published paid resource
          {publishedPaidResourceCount === 1 ? "" : "s"} from your existing creator account
          are being held back until Stripe payout onboarding is complete.
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--text-muted)]">Stripe account</div>
          <div className="mt-3 text-2xl font-semibold text-[var(--text)]">
            {payoutStatus.hasAccount ? "Created" : "Not started"}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            We create an Express connected account for each creator who wants to sell paid
            resources.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--text-muted)]">Details submitted</div>
          <div className="mt-3 text-2xl font-semibold text-[var(--text)]">
            {payoutStatus.detailsSubmitted ? "Yes" : "No"}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Stripe needs identity, business, and bank details before it can complete
            marketplace onboarding.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--text-muted)]">Payouts enabled</div>
          <div className="mt-3 text-2xl font-semibold text-[var(--text)]">
            {payoutStatus.payoutsEnabled ? "Ready" : "Pending"}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {bypassesPaidPayoutRequirement
              ? "Stripe payouts are optional for this admin-owned creator account."
              : "Paid resources should only go live once payouts are enabled."}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text)]">What this does</h2>
          <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--text-muted)]">
            <p>
              When a buyer purchases a paid resource, PsychVault creates a Stripe Checkout
              session. If your Stripe Connect account is set up, Stripe can route the
              creator share of that sale to your connected account automatically.
            </p>
            <p>
              {bypassesPaidPayoutRequirement
                ? "Without payout setup, PsychVault can still take payment on the platform account, but creator payouts will not be routed automatically until Stripe is connected."
                : "Without payout setup, PsychVault can still take the payment on the platform account, but it cannot safely guarantee automatic creator payouts. That is why paid resources are now blocked until payout setup is complete."}
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-[var(--surface-alt)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Current status</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--text)]">
                Charges: {String(payoutStatus.chargesEnabled)}
              </span>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--text)]">
                Payouts: {String(payoutStatus.payoutsEnabled)}
              </span>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--text)]">
                Details submitted: {String(payoutStatus.detailsSubmitted)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text)]">Recommended next step</h2>
          <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--text-muted)]">
            {!user.store ? (
              <p>
                Set up your store first, then come back here to complete Stripe onboarding.
              </p>
            ) : payoutStatus.ready ? (
              <>
                <p>
                  Your payouts look ready. You can manage bank details and payout timing in
                  the Stripe Express Dashboard.
                </p>
                <a
                  href="/api/stripe/connect/dashboard"
                  className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
                >
                  Manage payout account
                </a>
              </>
            ) : (
              <>
                <p>
                  {bypassesPaidPayoutRequirement
                    ? "Stripe onboarding is optional here, but it is still the cleanest way to route creator earnings automatically."
                    : "Complete Stripe Express onboarding now so your paid resources can be sold with automatic marketplace payouts."}
                </p>
                <a
                  href="/api/stripe/connect/onboarding"
                  className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
                >
                  {payoutStatus.hasAccount ? "Continue onboarding" : "Start Stripe onboarding"}
                </a>
              </>
            )}

            {user.store ? (
              <div className="rounded-2xl bg-[var(--surface-alt)] p-4">
                <div className="text-sm font-semibold text-[var(--text)]">Connected store</div>
                <div className="mt-2 text-sm text-[var(--text-muted)]">
                  {user.store.name} at /stores/{user.store.slug}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
