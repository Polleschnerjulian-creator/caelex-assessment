import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * V2 Card — shadcn/ui pattern, with a Caelex `tone` prop that maps to
 * our actor-color language: `slate` (neutral, default), `emerald`
 * (operator), `cyan` (counsel/atlas — only used inside operator views
 * referencing counsel), `amber` (authority — references only).
 *
 * Density-aware: respects `data-density="compact|cozy|dense"` on a
 * parent container (set by the V2Shell via the user's preference).
 */

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    tone?: "slate" | "emerald" | "cyan" | "amber";
  }
>(({ className, tone = "slate", ...props }, ref) => {
  const toneClass = {
    slate:
      "border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900",
    emerald:
      "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20",
    cyan: "border-cyan-200/60 bg-cyan-50/40 dark:border-cyan-800/40 dark:bg-cyan-950/20",
    amber:
      "border-amber-200/60 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20",
  }[tone];

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border shadow-sm transition-shadow hover:shadow-md",
        "[&[data-density=compact]]:rounded-lg [&[data-density=dense]]:rounded-md",
        toneClass,
        className,
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-5",
      "[&[data-density=compact]]:p-4 [&[data-density=dense]]:p-3 [&[data-density=dense]]:space-y-1",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-50",
      "[&[data-density=dense]]:text-sm",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-slate-500 dark:text-slate-400",
      "[&[data-density=dense]]:text-xs",
      className,
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-5 pt-0",
      "[&[data-density=compact]]:p-4 [&[data-density=compact]]:pt-0",
      "[&[data-density=dense]]:p-3 [&[data-density=dense]]:pt-0",
      className,
    )}
    {...props}
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between p-5 pt-0",
      "[&[data-density=compact]]:p-4 [&[data-density=compact]]:pt-0",
      "[&[data-density=dense]]:p-3 [&[data-density=dense]]:pt-0",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
