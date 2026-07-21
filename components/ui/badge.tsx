import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wide",
  {
    variants: {
      variant: {
        default:
          "border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]",
        accent: "border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]",
        live: "border-transparent bg-[var(--live)] text-[#06120a]",
        outline: "border-[var(--border)] text-[var(--muted-foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
