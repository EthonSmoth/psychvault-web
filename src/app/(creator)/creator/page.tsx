import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getCreatorTrustAppearance,
  getCreatorTrustProfile,
} from "@/lib/creator-trust";
import { db } from "@/lib/db";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
import { isPayoutAccountReady } from "@/lib/stripe-connect";
import { redirect } from "next/navigation";

export default async function CreatorDashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      payoutAccount: true,
      store: {
        include: {
          resources: true,
          followers: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  await requireVerifiedEmailOrRedirect(user.id, "/creator");

  const store = user.store;
  const resourceCount = store?.resources.length ?? 0;
  const followerCount = store?.followers.length ?? 0;
  const storeStatus = store?.isPublished ? "Published" : "Draft";
  const payoutReady = isPayoutAccountReady(user.payoutAccount);
  const publishedPaidResources =
    store?.resources.filter((resource) => resource.status === "PUBLISHED" && resource.priceCents > 0)
      .length ?? 0;
  const trustProfile = await getCreatorTrustProfile(user.id);
  const trustAppearance = getCreatorTrustAppearance(trustProfile);
  const storeModerationMessage =
    store?.moderationStatus === "PENDING_REVIEW"
      ? store.moderationReason || "Your store is waiting for moderation review before it can go live."
      : store?.moderationStatus === "REJECTED"
      ? store.moderationReason || "Your store needs updates before it can be published again."
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Creator dashboard
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            Welcome back{user.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Build your store, upload useful resources, and grow a library that saves
            clinicians time.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/creator/store"
            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Edit store
          </Link>
          <Link
            href="/creator/resources"
            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Manage resources
          </Link>
          <Link
            href="/creator/payouts"
            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Payouts
          </Link>
          <Link
            href="/creator/resources/new"
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add resource
          </Link>
        </div>
      </div>

      {storeModerationMessage ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">
            {store?.moderationStatus === "REJECTED" ? "Store changes needed" : "Store under review"}
          </div>
          <div className="mt-1">{storeModerationMessage}</div>
        </div>
      ) : null}

      {store && !payoutReady ? (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <div className="font-semibold">Complete payouts before selling paid resources</div>
          <div className="mt-1">
            {publishedPaidResources > 0
              ? `${publishedPaidResources} published paid resource${publishedPaidResources === 1 ? "" : "s"} from your older creator setup now need Stripe onboarding before they can stay sale-ready.`
              : "Your store can exist without Stripe onboarding, but paid listings now require a connected payout account so creator earnings can flow correctly."}
          </div>
          <Link href="/creator/payouts" className="mt-2 inline-flex font-semibold underline">
            Finish Stripe setup
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Resources</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{resourceCount}</div>
          <p className="mt-2 text-sm text-slate-600">
            Total resources currently attached to your store.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Followers</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{followerCount}</div>
          <p className="mt-2 text-sm text-slate-600">
            People following your store for future resources.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Store status</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{storeStatus}</div>
          <p className="mt-2 text-sm text-slate-600">
            {store?.isPublished
              ? "Your store is visible to buyers."
              : "Publish your store when you're ready to go live."}
          </p>
        </div>

        <div
          className="rounded-2xl border bg-white p-6 shadow-sm"
          style={{
            borderColor: trustAppearance.borderColor,
            backgroundColor: trustAppearance.softBackgroundColor,
          }}
        >
          <div className="text-sm font-medium text-slate-500">Trust score</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="text-3xl font-semibold" style={{ color: trustAppearance.textColor }}>
              {trustProfile.score}
            </div>
            <span
              className="rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
              style={{
                color: trustAppearance.textColor,
                borderColor: trustAppearance.borderColor,
                backgroundColor: trustAppearance.backgroundColor,
              }}
            >
              {trustAppearance.label}
            </span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${trustProfile.score}%`,
                background: trustAppearance.meter,
              }}
            />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {trustProfile.tier === "trusted"
              ? "Your account can usually publish without manual review."
              : trustProfile.tier === "standard"
              ? "Your account has a healthy moderation history."
              : trustProfile.tier === "new"
              ? "New creator accounts are reviewed before publishing."
              : "Your account is on stricter review due to moderation risk."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Payouts</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">
            {payoutReady ? "Ready" : "Action needed"}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {payoutReady
              ? "Paid resource sales can route creator earnings through Stripe Connect."
              : "Connect Stripe before publishing paid resources so buyers can pay you safely."}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">What to do next</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-medium text-slate-900">1. Set up your store</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Add your store name, bio, and basic profile details so buyers know what
                kind of resources you create.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-medium text-slate-900">2. Upload your first resource</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Start with something practical and high-value like a handout, template,
                or psychoeducation resource.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-medium text-slate-900">3. Publish and refine</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Use clear titles, tags, and previews so people can quickly understand
                what your resource is for.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-medium text-slate-900">4. Connect payouts</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Complete Stripe onboarding before you publish paid resources so earnings
                can be sent to your connected account.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-medium text-slate-900">5. Build trust over time</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Approved listings, low report volume, and successful sales improve your
                publishing trust score over time.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Store snapshot</h2>

          {store ? (
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-sm font-medium text-slate-500">Store name</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{store.name}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-500">Slug</div>
                <div className="mt-1 text-sm text-slate-700">/{store.slug}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-500">Location</div>
                <div className="mt-1 text-sm text-slate-700">
                  {store.location || "Not set"}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-500">Bio</div>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {store.bio || "No bio added yet."}
                </p>
              </div>

              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: trustAppearance.borderColor,
                  backgroundColor: trustAppearance.softBackgroundColor,
                }}
              >
                <div className="text-sm font-medium text-slate-500">Trust summary</div>
                <div className="mt-2 flex items-center gap-3 text-sm text-slate-700">
                  <span>Tier:</span>
                  <span
                    className="rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={{
                      color: trustAppearance.textColor,
                      borderColor: trustAppearance.borderColor,
                      backgroundColor: trustAppearance.backgroundColor,
                    }}
                  >
                    {trustAppearance.label}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  Publishing:{" "}
                  <span className="font-semibold" style={{ color: trustAppearance.textColor }}>
                    {trustProfile.tier === "trusted" || trustProfile.tier === "standard"
                      ? "Usually auto-reviewed"
                      : "Manual review likely"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  {trustProfile.reasons.length > 0 ? (
                    trustProfile.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border bg-white px-2.5 py-1 font-medium"
                        style={{ borderColor: trustAppearance.borderColor }}
                      >
                        {reason}
                      </span>
                    ))
                  ) : (
                    <span
                      className="rounded-full border bg-white px-2.5 py-1 font-medium"
                      style={{ borderColor: trustAppearance.borderColor }}
                    >
                      No trust flags
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              You have not created a store yet. Start there first so your resources have
              a public home.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
