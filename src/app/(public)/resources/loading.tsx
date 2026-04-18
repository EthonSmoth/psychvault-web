export default function ResourcesLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-9 w-52 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          <div className="mt-2 h-4 w-full max-w-80 animate-pulse rounded-full bg-[var(--surface-alt)]" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--surface-alt)]" />
      </div>
      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[62px] animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          ))}
          <div className="h-[62px] w-24 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)]"
          />
        ))}
      </div>
    </main>
  );
}
