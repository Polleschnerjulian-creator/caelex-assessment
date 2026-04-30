import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * V2 Badge — status pills for ComplianceItem statuses, actor types,
 * proposal states, and risk levels. Mirrors the Palantir-style status
 * pill pattern (USER_ACTION_REQUIRED / RUNNING / COMPLETE).
 */
const badgeVariants = cva(
  // Palantir-style terminal pills: sharp corners, font-mono,
  // uppercase, tracked-out, with a small leading dot for status
  // semantics. Tighter padding than typical shadcn pills.
  "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        // Compliance status pills — terminal output aesthetic
        pending:
          "bg-slate-500/10 text-slate-300 ring-1 ring-inset ring-slate-500/20",
        draft:
          "bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-500/30",
        evidenceRequired:
          "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30",
        underReview:
          "bg-violet-500/10 text-violet-300 ring-1 ring-inset ring-violet-500/30",
        attested:
          "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
        expired: "bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/30",

        // Actor pills
        operator:
          "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
        counsel:
          "bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-500/30",
        authority:
          "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30",

        // Generic
        default: "bg-white/5 text-slate-300 ring-1 ring-inset ring-white/10",
        outline: "text-slate-400 ring-1 ring-inset ring-white/15",
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
