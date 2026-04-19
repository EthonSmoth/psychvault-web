"use client";

import Link from"next/link";
import { useState } from"react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:"POST",
        headers: {"Content-Type":"application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ??"Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-180px)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="hidden lg:block">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 shadow-sm">
          <span className="inline-flex rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text)]">
            Account recovery
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text)]">
            Reset your password
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
            Enter the email address on your account and we'll send you a link to
            choose a new password.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="card-panel sm:p-10">
          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                If that address is registered, a reset link is on its way. Check
                your inbox — it expires in 1 hour.
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setEmail(""); }}
                  className="font-semibold text-[var(--text)] hover:text-[var(--accent)]"
                >
                  Try again
                </button>{" "}
                or{" "}
                <Link href="/contact" className="font-semibold text-[var(--text)] hover:text-[var(--accent)]">
                  contact support
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="heading-2xl">
                  Forgot your password?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Enter your email and we&apos;ll send a reset link.
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
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-[var(--text)]"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white disabled:opacity-60"
                >
                  {pending ?"Sending…" :"Send reset link"}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-[var(--text)] hover:text-[var(--accent)]">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
