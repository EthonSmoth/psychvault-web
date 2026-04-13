import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCSRFToken } from "@/lib/csrf";
import { canBypassPaidResourcePayoutRequirement } from "@/lib/payout-readiness";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
import { isPaidResourcePayoutReady, isPayoutAccountReady } from "@/lib/stripe-connect";
import {
  DEFAULT_RESOURCE_CATEGORIES,
  DEFAULT_RESOURCE_TAGS,
} from "@/lib/resource-taxonomy";
import ResourceForm from "@/components/forms/resource-form";

type EditResourcePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: { store: true, payoutAccount: true },
  });

  if (!user?.store) {
    redirect("/creator/store");
  }

  await requireVerifiedEmailOrRedirect(user.id, `/creator/resources/${id}/edit`);

  await Promise.all([
    db.category.createMany({
      data: DEFAULT_RESOURCE_CATEGORIES,
      skipDuplicates: true,
    }),
    db.tag.createMany({
      data: DEFAULT_RESOURCE_TAGS,
      skipDuplicates: true,
    }),
  ]);

  const [categories, tags, resource] = await Promise.all([
    db.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    db.tag.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    db.resource.findFirst({
      where: {
        id,
        storeId: user.store.id,
        creatorId: user.id,
      },
      include: {
        categories: true,
        tags: true,
        files: true,
      },
    }),
  ]);

  if (!resource) {
    redirect("/creator/resources");
  }

  const csrfToken = generateCSRFToken(user.id);
  const payoutReady = isPayoutAccountReady(user.payoutAccount);
  const paidResourcePayoutReady = isPaidResourcePayoutReady({
    role: user.role,
    payoutReady,
  });
  const paidResourceNeedsPayouts = resource.priceCents > 0 && !paidResourcePayoutReady;
  const requiresPaidResourcePayoutSetup =
    !canBypassPaidResourcePayoutRequirement(user.role);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          Edit resource
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          {resource.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Update the listing details, download file, previews, category, pricing, and publish state.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {resource.status === "PUBLISHED" ? "Published" : "Draft"}
          </span>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              resource.moderationStatus === "APPROVED"
                ? "bg-emerald-100 text-emerald-700"
                : resource.moderationStatus === "PENDING_REVIEW"
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            {resource.moderationStatus === "PENDING_REVIEW"
              ? "Pending review"
              : resource.moderationStatus === "REJECTED"
              ? "Rejected"
              : "Approved"}
          </span>
        </div>
      </div>

      {paidResourceNeedsPayouts ? (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          This is a paid resource. Existing paid listings now require Stripe payout
          onboarding before they can stay sale-ready.
          {" "}
          <a href="/creator/payouts" className="font-semibold underline">
            Finish payout setup
          </a>
          .
        </div>
      ) : null}

      <ResourceForm
        categories={categories}
        tags={tags}
        resource={resource}
        csrfToken={csrfToken}
        paidResourcePayoutRequired={requiresPaidResourcePayoutSetup}
      />
    </main>
  );
}
