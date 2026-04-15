export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-4 w-16 animate-pulse rounded-full bg-[var(--surface-alt)]" />
        <div className="mt-2 h-9 w-52 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded-full bg-[var(--surface-alt)]" />
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="h-6 w-16 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--surface-alt)]" />
            <div className="h-9 w-28 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          </div>
          <div>
            <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--surface-alt)]" />
            <div className="mt-2 h-11 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          </div>
          <div>
            <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--surface-alt)]" />
            <div className="mt-2 h-11 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          </div>
        </div>
      </div>

      {/* Password card */}
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="h-6 w-20 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--surface-alt)]" />
              <div className="mt-2 h-11 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
