export default function StoresLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <div className="max-w-3xl">
          <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--surface-alt)]" />
          <div className="mt-3 h-9 w-2/3 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          <div className="mt-4 h-4 w-full max-w-lg animate-pulse rounded-full bg-[var(--surface-alt)]" />
        </div>
        <div className="mt-8 h-16 animate-pulse rounded-[1.75rem] bg-[var(--surface-alt)]" />
      </section>
      <section className="mt-10">
        <div className="mb-5 h-4 w-32 animate-pulse rounded-full bg-[var(--surface-alt)]" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--surface-alt)]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
