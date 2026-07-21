import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        d="M14 2.5C14 2.5 4 12 4 16.8A5.6 5.6 0 0 0 14 20.2A5.6 5.6 0 0 0 24 16.8C24 12 14 2.5 14 2.5Z"
        fill="currentColor"
      />
      <path
        d="M11 18.8C11 21.3 12.2 22.6 9.8 24.3H18.2C15.8 22.6 17 21.3 17 18.8C15.9 19.6 14 19.9 14 19.9C14 19.9 12.1 19.6 11 18.8Z"
        fill="var(--accent)"
      />
    </svg>
  );
}
