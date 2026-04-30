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
          // Palantir terminal-pill — sharper corners, ring-inset border,
          // monospace, slightly tighter height.
          "inline-flex h-4 min-w-[1rem] select-none items-center justify-center rounded-sm bg-white/[0.04] px-1 font-mono text-[9px] font-medium text-slate-300 ring-1 ring-inset ring-white/10",
          className,
        )}
        {...props}
      />
    );
  },
);
Kbd.displayName = "Kbd";

export { Kbd };
