import Link from "next/link";
import { auth } from "@/lib/auth";
import { verifyEmailAddress } from "@/lib/email-verification";
import { resendVerificationEmailFormAction } from "@/server/actions/email-verification-actions";

type VerifyEmailPageProps = {
  searchParams?: Promise<{
    token?: string;
    sent?: string;
    email?: string;
    redirectTo?: string;
    success?: string;
    error?: string;
  }>;
};

function getSafeRedirect(redirectTo?: string) {
  if (!redirectTo) return "/library";
  if (!redirectTo.startsWith("/")) return "/library";
  if (redirectTo.startsWith("//")) return "/library";
  return redirectTo;
}

// Handles verification links and provides resend instructions for unverified users.
export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = (await searchParams) ?? {};
  const token = String(params.token ?? "").trim();
  const redirectTo = getSafeRedirect(params.redirectTo);
  const session = await auth();

  const verificationResult = token ? await verifyEmailAddress(token) : null;
  const verified = verificationResult?.ok === true;
  const error =
    (verificationResult && !verificationResult.ok ? verificationResult.error : null) ||
    params.error ||
    null;
  const successMessage = params.success || null;

  return (
    <div className="mx-auto grid min-h-[calc(100vh-180px)] max-w-4xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm sm:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            Verify your email
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            Email verification unlocks creator tools and other protected actions such as
            purchases, messaging, and reporting.
          </p>
        </div>

        {verified ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Your email address has been verified successfully.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : params.sent === "1" ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Verification email sent to {params.email || "your address"}. Open the link in that
            email to finish setup.
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
            <div className="font-semibold text-[var(--text)]">What happens next</div>
            <p className="mt-2">
              Once verified, you can create and manage stores, upload resources, message creators,
              submit reports, and complete purchases from the same account.
            </p>
          </div>

          {session?.user ? (
            <form action={resendVerificationEmailFormAction} className="space-y-3">
              <input type="hidden" name="redirectTo" value="/verify-email" />
              <button
                type="submit"
                className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
              >
                Resend verification email
              </button>
            </form>
          ) : (
            <Link
              href={`/login?redirectTo=${encodeURIComponent("/verify-email")}`}
              className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
            >
              Log in to resend verification
            </Link>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              href={verified ? redirectTo : "/resources"}
              className="inline-flex rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
            >
              {verified ? "Continue" : "Browse resources"}
            </Link>
            <Link
              href="/contact"
              className="inline-flex rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
