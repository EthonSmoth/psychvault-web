import type { Metadata } from"next";
import Link from"next/link";
import { redirect } from"next/navigation";
import { auth } from"@/lib/auth";
import { isGoogleOAuthEnabled } from"@/lib/env";
import { getSafeRedirectTarget } from"@/lib/redirects";
import { SignupForm } from"@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign Up",
  robots: { index: false, follow: false },
};

type SignupPageProps = {
  searchParams?: Promise<{
    redirectTo?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const session = await auth();
  const params = (await searchParams) ?? {};
  const redirectTo = getSafeRedirectTarget(params.redirectTo,"/library");
  const googleEnabled = isGoogleOAuthEnabled();

  if (session?.user) {
    redirect(redirectTo);
  }

  const loginHref =
    redirectTo !=="/library"
      ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
      :"/login";

  return (
    <div className="mx-auto grid min-h-[calc(100vh-180px)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="hidden lg:block">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 shadow-sm">
          <span className="inline-flex rounded-full bg-[var(--surface-alt)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">
            Start your account
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text)]">
            Join PsychVault
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
            Discover practical psychology resources, save free downloads to your
            library, and create your own store when you’re ready.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="card-panel sm:p-10">
          <div className="mb-8">
            <h2 className="heading-2xl">
              Create your account
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Start as a buyer and create a store later.
            </p>
          </div>

          <SignupForm googleEnabled={googleEnabled} />

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link href={loginHref} className="font-semibold text-[var(--text)] hover:text-[var(--accent)]">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
