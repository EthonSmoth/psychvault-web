import Link from"next/link";

export default function StoreNotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
          Store not found
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          That store may not exist yet or is not published.
        </p>
        <div className="mt-8">
          <Link
            href="/resources"
            className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
          >
            Browse resources
          </Link>
        </div>
      </div>
    </div>
  );
}