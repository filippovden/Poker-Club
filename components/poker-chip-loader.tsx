import { cn } from "@/lib/utils";

// A branded stand-in for a generic loading spinner — reduced-motion users
// get a static chip instead, via the global animation-duration override in
// globals.css (app/globals.css's prefers-reduced-motion block covers any
// animation, including this one, with no extra handling needed here).
export function PokerChipLoader({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Загрузка" className={cn("inline-flex", className)}>
      <svg viewBox="0 0 64 64" className="h-full w-full animate-spin [animation-duration:1.4s]">
        <circle cx="32" cy="32" r="29" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 32 + 29 * Math.cos(angle);
          const y1 = 32 + 29 * Math.sin(angle);
          const x2 = 32 + 23 * Math.cos(angle);
          const y2 = 32 + 23 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--accent)"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity={i % 2 === 0 ? 0.9 : 0.35}
            />
          );
        })}
        <circle cx="32" cy="32" r="17" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeOpacity="0.5" />
        <path
          d="M32 16C32 16 20 28 20 35a12 12 0 0 0 24 0c0-7-12-19-12-19Z"
          fill="var(--accent)"
        />
      </svg>
    </div>
  );
}
