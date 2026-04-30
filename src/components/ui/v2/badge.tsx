import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * V2 Badge — status pills for ComplianceItem statuses, actor types,
 * proposal states, and risk levels. Mirrors the Palantir-style status
 * pill pattern (USER_ACTION_REQUIRED / RUNNING / COMPLETE).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider",
  {
    variants: {
      variant: {
        // Compliance status pills
        pending:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        draft:
          "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
        evidenceRequired:
          "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
        underReview:
          "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
        attested:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
        expired: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",

        // Actor pills
        operator:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
        counsel:
          "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300",
        authority:
          "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",

        // Generic
        default:
          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        outline:
          "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
