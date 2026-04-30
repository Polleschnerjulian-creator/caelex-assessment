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
        "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg",
        "dark:border-slate-800 dark:bg-slate-950",
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
 * MenuItem — a button-like row inside a PopoverContent. Same visual
 * idiom as a shadcn DropdownMenuItem.
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
      "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
      "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
      "[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
      danger
        ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
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
      "px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400",
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
    className={cn("-mx-1 my-1 h-px bg-slate-200 dark:bg-slate-800", className)}
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
