"use client";

import Link from"next/link";
import { useState } from"react";
import { useSearchParams } from"next/navigation";
import { Suspense } from"react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ??"";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This reset link is missing a token. Please use the full link from your email.
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setPending(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method:"POST",
        headers: {"Content-Type":"application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ??"Something went wrong. Please try again.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your password has been updated. You can now log in with your new password.
        </div>
        <Link
          href="/login"
          className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="heading-2xl">
          Choose a new password
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Pick something you haven&apos;t used before.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-[var(--text)]"
          >
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="mb-1.5 block text-sm font-medium text-[var(--text)]"
          >
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            placeholder="Repeat your new password"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white disabled:opacity-60"
        >
          {pending ?"Updating…" :"Update password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-180px)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="hidden lg:block">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 shadow-sm">
          <span className="inline-flex rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text)]">
            Account recovery
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text)]">
            Set a new password
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
            Choose a new password for your account. The reset link is valid for
            1 hour.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="card-panel sm:p-10">
          <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded bg-[var(--surface)]" />}>
            <ResetPasswordForm />
          </Suspense>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Need a new link?{" "}
            <Link href="/forgot-password" className="font-semibold text-[var(--text)] hover:text-[var(--accent)]">
              Request one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
