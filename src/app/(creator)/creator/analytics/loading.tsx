export default function CreatorAnalyticsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="h-6 w-36 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-9 w-52 animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* Stats row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm"
          />
        ))}
      </section>

      {/* Revenue + Top resources */}
      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
      </section>

      {/* Recent sales */}
      <section className="mt-10 h-64 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
    </div>
  );
}
