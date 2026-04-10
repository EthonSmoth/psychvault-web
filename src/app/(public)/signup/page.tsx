import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignupForm } from "@/components/auth/signup-form";

type SignupPageProps = {
  searchParams?: Promise<{
    redirectTo?: string;
  }>;
};

function getSafeRedirect(redirectTo?: string) {
  if (!redirectTo) return "/library";
  if (!redirectTo.startsWith("/")) return "/library";
  if (redirectTo.startsWith("//")) return "/library";
  return redirectTo;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const session = await auth();
  const params = (await searchParams) ?? {};
  const redirectTo = getSafeRedirect(params.redirectTo);

  if (session?.user) {
    redirect(redirectTo);
  }

  const loginHref =
    redirectTo !== "/library"
      ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
      : "/login";

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
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm sm:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              Create your account
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Start as a buyer and create a store later.
            </p>
          </div>

          <SignupForm />

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