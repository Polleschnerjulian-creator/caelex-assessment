import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * V2 Input — shadcn-style. Slightly tighter than the V1 input (h-9
 * vs h-10) to fit our denser default. Density-aware via parent
 * `data-density` attribute.
 */

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Palantir terminal-input style — black bg with thin ring-inset
          // border, emerald focus ring (no offset), tighter height,
          // tabular numbers if numeric.
          "flex h-9 w-full rounded bg-black/30 px-2.5 py-1 text-[13px] text-slate-100 placeholder:text-slate-600 ring-1 ring-inset ring-white/[0.06] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
