import { redirect } from"next/navigation";
import type { Metadata } from"next";
import { auth } from"@/lib/auth";
import { db } from"@/lib/db";
import { generateCSRFToken } from"@/lib/csrf";
import { ApplyCreatorForm } from"./apply-creator-form";

export const metadata: Metadata = {
  title:"Become a creator | PsychVault",
  robots: { index: false, follow: false },
};

export default async function ApplyCreatorPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?redirectTo=/apply-creator");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      creatorApplication: { select: { status: true, adminNotes: true } },
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.role ==="CREATOR" || user.role ==="ADMIN") {
    redirect("/creator");
  }

  const csrfToken = generateCSRFToken(user.id);
  const existingApplication = user.creatorApplication;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-[var(--text-light)]">Join PsychVault</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Become a creator
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Sell your psychology templates, worksheets, and clinical documents to other practitioners.
        </p>
      </div>

      <div className="card-section">
        {existingApplication?.status ==="PENDING" ? (
          <div>
            <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              Under review
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Your application is being reviewed. We&apos;ll update your account once a decision is made — usually within a few business days.
            </p>
          </div>
        ) : existingApplication?.status ==="APPROVED" ? (
          <div>
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Approved
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Your creator application was approved. Your role should already be updated — try heading to the creator dashboard.
            </p>
          </div>
        ) : (
          <>
            {existingApplication?.status ==="REJECTED" && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">Your previous application was not approved.</p>
                {existingApplication.adminNotes && (
                  <p className="mt-1 text-sm text-red-600">{existingApplication.adminNotes}</p>
                )}
                <p className="mt-2 text-sm text-red-600">You&apos;re welcome to reapply with an updated message below.</p>
              </div>
            )}

            <div className="mb-6">
              <h2 className="heading-section">What we look for</h2>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                <li className="flex gap-2"><span className="text-[var(--primary)]">✓</span> Practising or provisionally registered psychologist, OT, speechie, or related allied health professional</li>
                <li className="flex gap-2"><span className="text-[var(--primary)]">✓</span> Materials that are professional, evidence-based, and useful to other practitioners</li>
                <li className="flex gap-2"><span className="text-[var(--primary)]">✓</span> Commitment to keeping content accurate and up to date</li>
              </ul>
            </div>

            <ApplyCreatorForm csrfToken={csrfToken} />
          </>
        )}
      </div>
    </div>
  );
}
