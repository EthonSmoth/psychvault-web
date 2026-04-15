export default function CreatorDashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="h-6 w-36 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-9 w-72 animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-3 h-4 w-96 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-32 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
    </div>
  );
}
