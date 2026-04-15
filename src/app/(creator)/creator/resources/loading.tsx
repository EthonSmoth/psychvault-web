export default function CreatorResourcesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-9 w-52 animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}
