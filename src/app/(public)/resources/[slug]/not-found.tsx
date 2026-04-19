import Link from"next/link";

export default function ResourceNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
          Resource not found
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          That listing may have been removed, renamed, or is not published yet.
        </p>
        <div className="mt-8">
          <Link
            href="/resources"
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Browse resources
          </Link>
        </div>
      </div>
    </div>
  );
}