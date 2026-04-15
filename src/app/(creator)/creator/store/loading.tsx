export default function CreatorStoreLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-9 w-48 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-3 h-4 w-80 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded-full bg-slate-100" />
      </div>

      {/* Store form card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
              <div className="mt-2 h-11 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
          <div>
            <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-28 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="h-4 w-20 animate-pulse rounded-full bg-slate-100" />
              <div className="mt-2 h-32 animate-pulse rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50" />
            </div>
            <div>
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
              <div className="mt-2 h-32 animate-pulse rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Checklist card */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-36 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-7 w-24 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
