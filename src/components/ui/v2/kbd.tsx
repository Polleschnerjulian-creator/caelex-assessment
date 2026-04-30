import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * V2 Kbd — keyboard-shortcut pill for hint-text in the Cmd-K palette,
 * tooltip overlays, and inline UI hints. Matches the Linear / Raycast
 * idiom of always showing the shortcut next to the action.
 *
 * Use `<Kbd>⌘</Kbd> <Kbd>K</Kbd>` for chord display.
 */
const Kbd = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(
          "inline-flex h-5 min-w-[1.25rem] select-none items-center justify-center rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-600",
          "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
          className,
        )}
        {...props}
      />
    );
  },
);
Kbd.displayName = "Kbd";

export { Kbd };
