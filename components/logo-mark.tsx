import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect
        x="4"
        y="10"
        width="20"
        height="8"
        rx="4"
        fill="currentColor"
        transform="rotate(-35 14 14)"
      />
      <rect
        x="4"
        y="10"
        width="20"
        height="8"
        rx="4"
        fill="var(--accent)"
        transform="rotate(-35 14 14) translate(0 10)"
      />
    </svg>
  );
}
