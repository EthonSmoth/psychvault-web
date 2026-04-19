import Link from"next/link";
import { auth } from"@/lib/auth";
import {
  getCreatorTrustAppearance,
  getCreatorTrustProfile,
} from"@/lib/creator-trust";
import { db } from"@/lib/db";
import { canBypassPaidResourcePayoutRequirement } from"@/lib/payout-readiness";
import { requireVerifiedEmailOrRedirect } from"@/lib/require-email-verification";
import { isPaidResourcePayoutReady, isPayoutAccountReady } from"@/lib/stripe-connect";
import { redirect } from"next/navigation";

export default async function CreatorDashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      isSuperAdmin: true,
      payoutAccount: {
        select: {
          payoutsEnabled: true,
          detailsSubmitted: true,
        },
      },
      store: {
        select: {
          id: true,
          slug: true,
          name: true,
          bio: true,
          location: true,
          isPublished: true,
          moderationStatus: true,
          moderationReason: true,
          resources: true,
          followers: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  await requireVerifiedEmailOrRedirect(user.id,"/creator");

  const store = user.store;
  const resourceCount = store?.resources.length ?? 0;
  const followerCount = store?.followers.length ?? 0;
  const storeStatus = store?.isPublished ?"Published" :"Draft";
  const payoutReady = isPayoutAccountReady(user.payoutAccount);
  const bypassesPaidPayoutRequirement = canBypassPaidResourcePayoutRequirement(user);
  const paidResourcePayoutReady = isPaidResourcePayoutReady({
    user,
    payoutReady,
  });
  const publishedPaidResources =
    store?.resources.filter((resource) => resource.status ==="PUBLISHED" && resource.priceCents > 0)
      .length ?? 0;
  const trustProfile = await getCreatorTrustProfile(user.id);
  const trustAppearance = getCreatorTrustAppearance(trustProfile);
  const storeModerationMessage =
    store?.moderationStatus ==="PENDING_REVIEW"
      ? store.moderationReason ||"Your store is waiting for moderation review before it can go live."
      : store?.moderationStatus ==="REJECTED"
      ? store.moderationReason ||"Your store needs updates before it can be published again."
      : null;

  // Determine step completion states
  const storeSetupDone = Boolean(store?.name && store?.bio && store?.isPublished !== undefined);
  const firstResourceDone = resourceCount > 0;
  const resourcePublishedDone = store?.resources.some((r) => r.status ==="PUBLISHED") ?? false;
  const payoutsDone = payoutReady || bypassesPaidPayoutRequirement;
  const trustBuilt = trustProfile.tier ==="trusted" || trustProfile.tier ==="standard";

  const steps = [
    {
      label:"Set up your store",
      description:"Add your store name, bio, and basic profile details so buyers know what kind of resources you create.",
      done: storeSetupDone,
      href:"/creator/store",
      cta:"Edit store",
    },
    {
      label:"Upload your first resource",
      description:"Start with something practical and high-value like a handout, template, or psychoeducation resource.",
      done: firstResourceDone,
      href:"/creator/resources/new",
      cta:"Add resource",
    },
    {
      label:"Publish and refine",
      description:"Use clear titles, tags, and previews so people can quickly understand what your resource is for.",
      done: resourcePublishedDone,
      href:"/creator/resources",
      cta:"Manage resources",
    },
    {
      label:"Connect payouts",
      description:"Complete Stripe onboarding before you publish paid resources so earnings can be sent to your connected account.",
      done: payoutsDone,
      href:"/creator/payouts",
      cta:"Set up payouts",
    },
    {
      label:"Build trust over time",
      description:"Approved listings, low report volume, and successful sales improve your publishing trust score over time.",
      done: trustBuilt,
      href: null,
      cta: null,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-[var(--surface-alt)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Creator dashboard
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Welcome back{user.name ? `, ${user.name}` :""}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            Build your store, upload useful resources, and grow a library that saves
            clinicians time.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/creator/store"
            className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Edit store
          </Link>
          <Link
            href="/creator/resources"
            className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Manage resources
          </Link>
          <Link
            href="/creator/payouts"
            className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Payouts
          </Link>
          <Link
            href="/creator/resources/new"
            className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
          >
            Add resource
          </Link>
        </div>
      </div>

      {storeModerationMessage ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">
            {store?.moderationStatus ==="REJECTED" ?"Store changes needed" :"Store under review"}
          </div>
          <div className="mt-1">{storeModerationMessage}</div>
        </div>
      ) : null}

      {store && !paidResourcePayoutReady ? (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <div className="font-semibold">Complete payouts before selling paid resources</div>
          <div className="mt-1">
            {publishedPaidResources > 0
              ? `${publishedPaidResources} published paid resource${publishedPaidResources === 1 ?"" :"s"} from your older creator setup now need Stripe onboarding before they can stay sale-ready.`
              :"Your store can exist without Stripe onboarding, but paid listings now require a connected payout account so buyer earnings can flow correctly."}
          </div>
          <Link href="/creator/payouts" className="mt-2 inline-flex font-semibold underline">
            Finish Stripe setup
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card-panel-md">
          <div className="text-sm font-medium text-[var(--text-muted)]">Resources</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--text)]">{resourceCount}</div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Total resources currently attached to your store.
          </p>
        </div>

        <div className="card-panel-md">
          <div className="text-sm font-medium text-[var(--text-muted)]">Followers</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--text)]">{followerCount}</div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            People following your store for future resources.
          </p>
        </div>

        <div className="card-panel-md">
          <div className="text-sm font-medium text-[var(--text-muted)]">Store status</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--text)]">{storeStatus}</div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {store?.isPublished
              ?"Your store is visible to buyers."
              :"Publish your store when you're ready to go live."}
          </p>
        </div>

        <div
          className="rounded-2xl border bg-[var(--card)] p-6 shadow-sm"
          style={{
            borderColor: trustAppearance.borderColor,
            backgroundColor: trustAppearance.softBackgroundColor,
          }}
        >
          <div className="text-sm font-medium text-[var(--text-muted)]">Trust score</div>
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
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {trustProfile.tier ==="trusted"
              ?"Your account can usually publish without manual review."
              : trustProfile.tier ==="standard"
              ?"Your account has a healthy moderation history."
              : trustProfile.tier ==="new"
              ?"New creator accounts are reviewed before publishing."
              :"Your account is on stricter review due to moderation risk."}
          </p>
        </div>

        <div className="card-panel-md">
          <div className="text-sm font-medium text-[var(--text-muted)]">Payouts</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--text)]">
            {payoutReady ?"Ready" : bypassesPaidPayoutRequirement ?"Optional" :"Action needed"}
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {payoutReady
              ?"Paid resource sales can route creator earnings through Stripe Connect."
              : bypassesPaidPayoutRequirement
              ?"Admin-owned paid resources can stay live without Stripe onboarding. Connect Stripe later if you want automatic creator payout routing."
              :"Connect Stripe before publishing paid resources so buyers can pay you safely."}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card-panel-md">
          <div className="flex items-center justify-between gap-4">
            <h2 className="heading-section">Getting started</h2>
            <span className="text-xs text-[var(--text-muted)]">
              {steps.filter((s) => s.done).length}/{steps.length} complete
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {steps.map((step, i) => (
              <div
                key={step.label}
                className={`rounded-xl border p-4 transition ${
                  step.done
                    ?"border-[var(--border)] bg-[var(--surface-alt)] opacity-60"
                    :"border-[var(--border)] bg-[var(--surface-alt)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.done
                          ?"bg-emerald-500 text-white"
                          :"border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-muted)]"
                      }`}
                    >
                      {step.done ?"✓" : i + 1}
                    </span>
                    <div>
                      <div className={`font-medium ${step.done ?"line-through text-[var(--text-muted)]" :"text-[var(--text)]"}`}>
                        {step.label}
                      </div>
                      {!step.done && (
                        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {step.href && !step.done && (
                    <Link
                      href={step.href}
                      className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface)]"
                    >
                      {step.cta}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-panel-md">
          <h2 className="heading-section">Store snapshot</h2>

          {store ? (
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-sm font-medium text-[var(--text-muted)]">Store name</div>
                <div className="mt-1 text-base font-semibold text-[var(--text)]">{store.name}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-[var(--text-muted)]">Slug</div>
                <div className="mt-1 text-sm text-[var(--text)]">/{store.slug}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-[var(--text-muted)]">Location</div>
                <div className="mt-1 text-sm text-[var(--text)]">
                  {store.location ||"Not set"}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-[var(--text-muted)]">Bio</div>
                <p className="mt-1 text-sm leading-6 text-[var(--text)]">
                  {store.bio ||"No bio added yet."}
                </p>
              </div>

              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: trustAppearance.borderColor,
                  backgroundColor: trustAppearance.softBackgroundColor,
                }}
              >
                <div className="text-sm font-medium text-[var(--text-muted)]">Trust summary</div>
                <div className="mt-2 flex items-center gap-3 text-sm text-[var(--text)]">
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
                <div className="mt-2 text-sm text-[var(--text)]">
                  Publishing:{" "}
                  <span className="font-semibold" style={{ color: trustAppearance.textColor }}>
                    {trustProfile.tier ==="trusted" || trustProfile.tier ==="standard"
                      ?"Usually auto-reviewed"
                      :"Manual review likely"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                  {trustProfile.reasons.length > 0 ? (
                    trustProfile.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border bg-[var(--card)] px-2.5 py-1 font-medium"
                        style={{ borderColor: trustAppearance.borderColor }}
                      >
                        {reason}
                      </span>
                    ))
                  ) : (
                    <span
                      className="rounded-full border bg-[var(--card)] px-2.5 py-1 font-medium"
                      style={{ borderColor: trustAppearance.borderColor }}
                    >
                      No trust flags
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-[var(--surface-alt)] p-4 text-sm leading-6 text-[var(--text-muted)]">
              You have not created a store yet. Start there first so your resources have
              a public home.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
