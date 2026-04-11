"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/(public)/login/actions";
import { SubmitButton } from "@/components/auth/submit-button";

function getSafeRedirect(redirectTo: string | null) {
  if (!redirectTo) return "/library";
  if (!redirectTo.startsWith("/")) return "/library";
  if (redirectTo.startsWith("//")) return "/library";
  return redirectTo;
}

export function LoginForm() {
  const searchParams = useSearchParams();

  const redirectTo = useMemo(
    () => getSafeRedirect(searchParams.get("redirectTo")),
    [searchParams]
  );

  const [state, formAction] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />

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
            href="/signup"
            className="text-xs font-medium text-[var(--text-light)] hover:text-[var(--text)]"
          >
            Need an account?
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
