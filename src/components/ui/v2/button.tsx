import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * V2 Button — shadcn/ui pattern with CVA variants.
 *
 * Caelex-tweak: an extra `emerald` variant (operator brand color) and
 * `glass` variant (Liquid Glass elevated surface, on dark backgrounds).
 *
 * Use `asChild` to pass the styling onto a child element (e.g. `<Link>`).
 *
 *   <Button asChild>
 *     <Link href="/dashboard/today">Open inbox</Link>
 *   </Button>
 */
const buttonVariants = cva(
  // Palantir base — sharper corners (rounded), tighter focus ring (no
  // offset), monospace not on the button itself but on `outline` variants
  // so action labels feel terminal-like. ring-1 instead of ring-2 for
  // the inset look.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Default — subtle slate fill that reads on the deep navy
        // canvas. Used for neutral CTAs.
        default:
          "bg-white/[0.06] text-slate-100 ring-1 ring-inset ring-white/10 hover:bg-white/[0.10] hover:text-white",
        // Primary action — emerald with subtle glow, matches the
        // "operator brand color" stripe used on Posture KPI tiles.
        emerald:
          "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm shadow-emerald-500/30 ring-1 ring-inset ring-emerald-400/40",
        // Secondary action — ghost button with a thin ring that
        // matches palantir-surface borders. Reads clearly on
        // palantir-surface cards.
        outline:
          "bg-transparent text-slate-200 ring-1 ring-inset ring-white/[0.10] hover:bg-white/[0.04] hover:text-slate-50 hover:ring-white/[0.16]",
        // Tertiary — no background, used inside dense UI where a
        // button visually competes for space.
        ghost: "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
        // Glass — for surfaces that already have a stripe accent,
        // matches palantir-surface pattern. Mostly here for parity
        // with the legacy V1 usage in case any V1 component leaks in.
        glass:
          "bg-white/[0.06] text-white ring-1 ring-inset ring-white/10 backdrop-blur-md hover:bg-white/[0.10] hover:ring-white/20",
        // Destructive — red with the same glow language as emerald.
        danger:
          "bg-red-500 text-white hover:bg-red-400 shadow-sm shadow-red-500/30 ring-1 ring-inset ring-red-400/40",
        // Inline link — minimal styling, used for "review", "open",
        // "see more" CTAs inline with text.
        link: "text-emerald-400 underline-offset-4 hover:text-emerald-300 hover:underline",
      },
      size: {
        sm: "h-7 px-2.5 text-[11px]",
        default: "h-8 px-3",
        lg: "h-9 px-4 text-[13px]",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
