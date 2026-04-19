import Link from"next/link";
import { redirect } from"next/navigation";
import { auth } from"@/lib/auth";
import { db } from"@/lib/db";
import { isGoogleOAuthEnabled } from"@/lib/env";
import { getSafeRedirectTarget } from"@/lib/redirects";
import { LoginForm } from"@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    redirectTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = (await searchParams) ?? {};
  const redirectTo = getSafeRedirectTarget(params.redirectTo,"/library");
  const googleEnabled = isGoogleOAuthEnabled();

  const dbUser =
    session?.user?.email
      ? await db.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        })
      : null;

  if (session?.user && dbUser) {
    redirect(redirectTo);
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-180px)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="hidden lg:block">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 shadow-sm">
          <span className="inline-flex rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text)]">
            Welcome back
          </span>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text)]">
            Log in to continue with PsychVault
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
            Access your library, download free and paid resources, manage your store,
            and keep building a practical psychology toolkit.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="card-panel sm:p-10">
          <div className="mb-8">
            <h2 className="heading-2xl">
              Log in
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Enter your details to continue.
            </p>
          </div>

          <LoginForm googleEnabled={googleEnabled} />

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Don’t have an account?{""}
            <Link
              href={redirectTo !=="/library" ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` :"/signup"}
              className="font-semibold text-[var(--text)] hover:text-[var(--accent)]"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
