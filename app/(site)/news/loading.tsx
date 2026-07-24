export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-28 sm:py-32">
      <div className="mb-16 flex flex-col gap-4">
        <div className="h-3 w-32 animate-pulse rounded-full bg-[var(--surface-2)]" />
        <div className="h-10 w-48 animate-pulse rounded-lg bg-[var(--surface-2)]" />
      </div>
      <div className="mb-16 h-72 w-full animate-pulse rounded-2xl bg-[var(--surface-2)]" />
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--surface-2)]" />
            <div className="h-5 w-3/4 animate-pulse rounded-lg bg-[var(--surface-2)]" />
            <div className="h-4 w-full animate-pulse rounded-full bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
