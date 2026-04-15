export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="grid gap-10 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-12">
          <div>
            <div className="h-6 w-28 animate-pulse rounded-full bg-[var(--surface-alt)]" />
            <div className="mt-5 h-14 w-full animate-pulse rounded-xl bg-[var(--surface-alt)]" />
            <div className="mt-2 h-14 w-2/3 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
            <div className="mt-5 h-5 w-full max-w-lg animate-pulse rounded-full bg-[var(--surface-alt)]" />
            <div className="mt-8 flex gap-3">
              <div className="h-11 w-32 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
              <div className="h-11 w-40 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-[var(--surface-alt)]" />
            ))}
          </div>
        </div>
      </section>
      <section className="mt-12">
        <div className="mb-6">
          <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--surface-alt)]" />
          <div className="mt-2 h-8 w-28 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
        </div>
        <div className="h-72 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)]" />
      </section>
      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)]"
          />
        ))}
      </section>
    </div>
  );
}
