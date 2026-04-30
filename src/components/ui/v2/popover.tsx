"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

/**
 * V2 Popover — Radix Popover wrapper. We use this in lieu of a
 * dedicated DropdownMenu (Radix DropdownMenu isn't installed and
 * Popover composes the same UX with one less dependency).
 *
 * Use the `MenuItem` helper below for consistent action-menu rows.
 */

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "end", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        // Palantir treatment — backdrop-blurred near-black surface with
        // sharp 1px ring-inset border. Sharper corners than legacy
        // shadcn (rounded-md, not rounded-lg).
        "z-50 min-w-[10rem] overflow-hidden rounded-md bg-[#0a0e1a]/95 backdrop-blur-xl p-1",
        "ring-1 ring-inset ring-white/[0.08] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

/**
 * MenuItem — a button-like row inside a PopoverContent. Palantir
 * terminal-row aesthetic: tighter padding, smaller text, mono-glow on
 * hover, emerald stripe on focus.
 */
const MenuItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    danger?: boolean;
  }
>(({ className, danger, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors",
      "outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/60",
      "[&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0",
      danger
        ? "text-red-300 hover:bg-red-500/15"
        : "text-slate-200 hover:bg-white/[0.06] hover:text-slate-100",
      className,
    )}
    {...props}
  />
));
MenuItem.displayName = "MenuItem";

const MenuLabel = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "px-2 py-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500",
      className,
    )}
    {...props}
  />
);

const MenuSeparator = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    role="separator"
    className={cn("-mx-1 my-1 h-px bg-white/[0.06]", className)}
    {...props}
  />
);

export {
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
};
