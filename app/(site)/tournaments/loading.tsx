export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-28 sm:py-32">
      <div className="mb-12 flex flex-col gap-4">
        <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-2)]" />
        <div className="h-10 w-48 animate-pulse rounded-lg bg-[var(--surface-2)]" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-[var(--surface-2)]" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex h-64 flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-6 animate-pulse"
          >
            <div className="h-5 w-20 rounded-full bg-[var(--surface-2)]" />
            <div className="h-6 w-3/4 rounded-lg bg-[var(--surface-2)]" />
            <div className="h-4 w-full rounded-full bg-[var(--surface-2)]" />
            <div className="mt-auto h-10 w-full rounded-full bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
