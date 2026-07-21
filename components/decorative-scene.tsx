import { cn } from "@/lib/utils";

type Variant = "table" | "cards";

/**
 * Abstract brand illustration used where a real photo of the club isn't
 * available yet (see README — replace with next/image once photos exist).
 * Two distinct variants so the Home "atmosphere" section and the News
 * cover don't reuse the exact same graphic.
 */
export function DecorativeScene({
  className,
  variant = "table",
}: {
  className?: string;
  variant?: Variant;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === "table"
              ? "radial-gradient(120% 120% at 50% 30%, rgba(26,58,42,0.35), transparent 60%), linear-gradient(160deg, #14120f 0%, #0a0908 100%)"
              : "radial-gradient(130% 130% at 85% 15%, rgba(201,162,39,0.2), transparent 55%), linear-gradient(160deg, #1b1815 0%, #0a0908 100%)",
        }}
      />
      {variant === "table" ? <TableMotif /> : <CardsMotif />}
      <div className="grain absolute inset-0" />
    </div>
  );
}

function TableMotif() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <ellipse
        cx="200"
        cy="165"
        rx="175"
        ry="105"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.22"
        strokeWidth="2"
      />
      <ellipse
        cx="200"
        cy="165"
        rx="140"
        ry="82"
        fill="rgba(201,162,39,0.05)"
        stroke="var(--accent)"
        strokeOpacity="0.12"
        strokeWidth="1"
      />

      {/* chip stacks */}
      <g opacity="0.92">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={244}
            y={176 - i * 7}
            width="34"
            height="8"
            rx="4"
            fill={i % 2 === 0 ? "var(--accent)" : "var(--foreground)"}
            fillOpacity={i % 2 === 0 ? 0.85 : 0.15}
          />
        ))}
      </g>

      {/* two cards, face down, slightly fanned */}
      <g transform="translate(120,150) rotate(-8)">
        <rect x="-18" y="-26" width="36" height="52" rx="5" fill="var(--foreground)" fillOpacity="0.14" stroke="var(--accent)" strokeOpacity="0.3" />
      </g>
      <g transform="translate(140,155) rotate(6)">
        <rect x="-18" y="-26" width="36" height="52" rx="5" fill="var(--foreground)" fillOpacity="0.2" stroke="var(--accent)" strokeOpacity="0.35" />
        <path
          d="M0 -10C0 -10 -6 -3 -6 1a6 6 0 0 0 10.6 3.8A6 6 0 0 0 6 1c0-4-6-11-6-11Z"
          fill="var(--accent)"
          fillOpacity="0.7"
        />
      </g>
    </svg>
  );
}

function CardsMotif() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <circle cx="330" cy="60" r="140" fill="none" stroke="var(--accent)" strokeOpacity="0.14" strokeWidth="1" />

      <g transform="translate(150,160) rotate(-16)">
        <rect x="-32" y="-46" width="64" height="92" rx="8" fill="var(--surface)" stroke="var(--accent)" strokeOpacity="0.3" />
      </g>
      <g transform="translate(180,158) rotate(0)">
        <rect x="-32" y="-46" width="64" height="92" rx="8" fill="var(--surface-2)" stroke="var(--accent)" strokeOpacity="0.4" />
      </g>
      <g transform="translate(212,162) rotate(14)">
        <rect x="-32" y="-46" width="64" height="92" rx="8" fill="var(--surface)" stroke="var(--accent)" strokeOpacity="0.5" />
        <path
          d="M0 -20C0 -20 -13 -6 -13 2a13 13 0 0 0 23 8.6A13 13 0 0 0 13 2c0-8-13-22-13-22Z"
          fill="var(--accent)"
        />
        <path
          d="M-6 20c0 5 2.6 8 -1 11h14c-3.6-3-1-6-1-11-2.4 1.7-5.8 1.7-5.8 1.7s-3.4 0-5.8-1.7Z"
          fill="var(--accent)"
        />
      </g>
    </svg>
  );
}
