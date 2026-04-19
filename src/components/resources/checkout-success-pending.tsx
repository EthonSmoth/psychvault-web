"use client";

import Link from"next/link";
import { useRouter } from"next/navigation";
import { useEffect, useState } from"react";

export function CheckoutSuccessPending({
  resourceSlug,
}: {
  resourceSlug?: string | null;
}) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, 2000);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setTimedOut(true);
    }, 30000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
        {timedOut ?"!" :"..."}
      </div>
      <h1 className="heading-2xl">
        Finalising your purchase
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        Your payment went through. We are confirming your library access now.
      </p>

      {timedOut ? (
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          This is taking longer than expected. You can refresh this page or check your library.
        </p>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary)]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary)] [animation-delay:150ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary)] [animation-delay:300ms]" />
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
        >
          Check again
        </button>
        <Link
          href="/library"
          className="text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          Go to my library
        </Link>
        {resourceSlug ? (
          <Link
            href={`/resources/${resourceSlug}`}
            className="text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
          >
            View resource page
          </Link>
        ) : null}
      </div>
    </div>
  );
}