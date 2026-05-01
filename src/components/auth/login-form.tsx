"use client";

import Link from"next/link";
import { useActionState, useMemo } from"react";
import { useSearchParams } from"next/navigation";
import { loginAction } from"@/app/(public)/login/actions";
import { GoogleAuthButton } from"@/components/auth/google-auth-button";import { FacebookAuthButton } from "@/components/auth/facebook-auth-button";import { SubmitButton } from"@/components/auth/submit-button";
import { requestNavbarSessionRefresh } from"@/lib/navbar-session-sync";
import { getSafeRedirectTarget } from"@/lib/redirects";

export function LoginForm({ googleEnabled = false, facebookEnabled = false }: { googleEnabled?: boolean; facebookEnabled?: boolean }) {
  const searchParams = useSearchParams();

  const redirectTo = useMemo(
    () => getSafeRedirectTarget(searchParams.get("redirectTo"),"/library"),
    [searchParams]
  );

  const [state, formAction] = useActionState(loginAction, {});

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={() => {
        requestNavbarSessionRefresh();
      }}
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {(googleEnabled || facebookEnabled) ? (
        <>
          {googleEnabled && (
            <GoogleAuthButton redirectTo={redirectTo} label="Continue with Google" />
          )}
          {facebookEnabled && (
            <FacebookAuthButton redirectTo={redirectTo} label="Continue with Facebook" />
          )}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[var(--card)] px-3 text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
                Or use email
              </span>
            </div>
          </div>
        </>
      ) : null}

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-[var(--text)]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--text)]"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-[var(--text-light)] hover:text-[var(--text)]"
          >
            Forgot password?
          </Link>
        </div>

        <input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          required
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
        />
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <SubmitButton>Log in</SubmitButton>
    </form>
  );
}
