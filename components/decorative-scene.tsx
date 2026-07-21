import { cn } from "@/lib/utils";

/**
 * Abstract brand illustration used where a real photo of the club isn't
 * available yet (see README — replace with next/image once photos exist).
 * Built from the logo motif rather than literal casino iconography.
 */
export function DecorativeScene({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 130% at 15% 15%, rgba(201,162,39,0.22), transparent 55%), linear-gradient(160deg, #1b1815 0%, #0a0908 100%)",
        }}
      />
      <svg
        viewBox="0 0 400 300"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <circle
          cx="300"
          cy="60"
          r="150"
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.14"
          strokeWidth="1"
        />
        <circle
          cx="300"
          cy="60"
          r="110"
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.2"
          strokeWidth="1"
        />
        <g transform="translate(60,210) rotate(-35)" opacity="0.9">
          <rect x="-40" y="-16" width="80" height="32" rx="16" fill="var(--foreground)" fillOpacity="0.9" />
          <rect x="-40" y="4" width="80" height="32" rx="16" fill="var(--accent)" fillOpacity="0.85" />
        </g>
      </svg>
      <div className="grain absolute inset-0" />
    </div>
  );
}
