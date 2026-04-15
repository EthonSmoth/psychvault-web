export default function NewResourceLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-6 w-32 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-9 w-52 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-3 h-4 w-96 animate-pulse rounded-full bg-slate-100" />
      </div>

      {/* Core details card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-32 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-6 space-y-5">
          <div>
            <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-11 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div>
            <div className="h-4 w-36 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-11 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div>
            <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-32 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="h-4 w-20 animate-pulse rounded-full bg-slate-100" />
              <div className="mt-2 h-11 animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div>
              <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100" />
              <div className="mt-2 h-11 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Files & media card */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-28 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-6 space-y-5">
          <div>
            <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-28 animate-pulse rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50" />
          </div>
          <div>
            <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-28 animate-pulse rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50" />
          </div>
        </div>
      </div>

      {/* Tags card */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-4 h-11 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="mt-6 flex justify-end gap-3">
        <div className="h-11 w-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-11 w-36 animate-pulse rounded-xl bg-slate-900/10" />
      </div>
    </div>
  );
}
