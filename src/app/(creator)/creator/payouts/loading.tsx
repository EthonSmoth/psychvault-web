export default function CreatorPayoutsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="h-6 w-32 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-9 w-56 animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-3 h-4 w-96 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* Status cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
          />
        ))}
      </div>

      {/* Detail cards */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
    </div>
  );
}
