"use client";

import { useEffect, useState } from "react";

function getParts(targetIso: string) {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

export function Countdown({ targetIso }: { targetIso: string }) {
  const [parts, setParts] = useState<ReturnType<typeof getParts>>(null);

  useEffect(() => {
    setParts(getParts(targetIso));
    const id = setInterval(() => setParts(getParts(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!parts) return null;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-[var(--muted-foreground)]">До старта:</span>
      <div className="flex items-center gap-2 font-medium tabular-nums">
        {parts.days > 0 && <span>{parts.days} дн</span>}
        <span>
          {String(parts.hours).padStart(2, "0")}:{String(parts.minutes).padStart(2, "0")}:
          {String(parts.seconds).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
