import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCSRFToken } from "@/lib/csrf";
import { canBypassPaidResourcePayoutRequirement } from "@/lib/payout-readiness";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
import { isPaidResourcePayoutReady, isPayoutAccountReady } from "@/lib/stripe-connect";
import { redirect } from "next/navigation";
import { getCreatorResourceTaxonomy } from "@/server/services/resource-taxonomy";
import { getCreatorTrustProfile } from "@/lib/creator-trust";
import ResourceForm from "@/components/forms/resource-form";

export default async function NewCreatorResourcePage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      store: true,
      payoutAccount: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  await requireVerifiedEmailOrRedirect(user.id, "/creator/resources/new");

  if (!user.store) {
    redirect("/creator/store");
  }

  const [{ categories, tags }, trustProfile] = await Promise.all([
    getCreatorResourceTaxonomy(),
    getCreatorTrustProfile(user.id),
  ]);
  const csrfToken = generateCSRFToken(user.id);
  const payoutReady = isPayoutAccountReady(user.payoutAccount);
  const paidResourcePayoutReady = isPaidResourcePayoutReady({
    user,
    payoutReady,
  });
  const requiresPaidResourcePayoutSetup =
    !canBypassPaidResourcePayoutRequirement(user);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          New resource
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          Create a new resource
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Add a clear title, concise description, useful tags, and a fair price.
        </p>
      </div>

      {!paidResourcePayoutReady ? (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          Existing creators can keep creating free resources right away, but paid resources
          now require Stripe payout onboarding.
          {" "}
          <a href="/creator/payouts" className="font-semibold underline">
            Complete payout setup
          </a>
          .
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ResourceForm
          categories={categories}
          tags={tags}
          csrfToken={csrfToken}
          paidResourcePayoutRequired={requiresPaidResourcePayoutSetup}
          isTrusted={trustProfile.tier === "trusted"}
        />
      </div>
    </div>
  );
}
