"use client";

import { useEffect, useState } from "react";

// Suspense fallbacks (loading.tsx) show while a Server Component's own data
// fetch is in flight — normally milliseconds, since the DB here is a local
// SQLite file with no network round-trip of its own. If this is still on
// screen after a few seconds, the actual bottleneck is the network path to
// the browser itself (which no client-side code can retry around), so the
// only honest thing to offer is a manual reload rather than pretending a
// shorter timeout would have shown "real" content instead.
export function StuckLoadingNotice({ afterMs = 6000 }: { afterMs?: number }) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setStuck(true), afterMs);
    return () => clearTimeout(id);
  }, [afterMs]);

  if (!stuck) return null;

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-xs text-[var(--muted-foreground)]">
        Загрузка занимает дольше обычного — возможно, проблема на стороне сети.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-xs font-medium text-[var(--accent)] underline underline-offset-2 hover:text-[var(--accent)]/80"
      >
        Обновить страницу
      </button>
    </div>
  );
}
