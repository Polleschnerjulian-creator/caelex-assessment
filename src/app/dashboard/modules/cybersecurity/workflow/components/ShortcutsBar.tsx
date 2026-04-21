"use client";

/**
 * ShortcutsBar — sticky footer that teaches the keyboard shortcuts.
 *
 * Collapsed by default (one-line "? for shortcuts"). Expanded on "?"
 * or click: full list of the 4 keyboard conventions. Stays out of the
 * way while still being discoverable.
 */

import { Keyboard, X } from "lucide-react";

interface ShortcutsBarProps {
  expanded: boolean;
  onToggle: () => void;
}

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["j"], label: "Next control" },
  { keys: ["k"], label: "Previous control" },
  { keys: ["1"], label: "Why tab" },
  { keys: ["2"], label: "Assess tab" },
  { keys: ["3"], label: "Evidence tab" },
  { keys: ["4"], label: "Discuss tab" },
  { keys: ["?"], label: "Toggle this help" },
  { keys: ["Esc"], label: "Close overlays" },
];

export function ShortcutsBar({ expanded, onToggle }: ShortcutsBarProps) {
  return (
    <div className="sticky bottom-0 border-t border-[var(--border-default)] bg-[var(--surface-raised)]/90 backdrop-blur z-20">
      <div className="max-w-[1400px] mx-auto px-6 py-2">
        {expanded ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {SHORTCUTS.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
                >
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="px-1.5 py-0.5 text-[10px] rounded border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)]"
                    >
                      {k}
                    </kbd>
                  ))}
                  <span>{s.label}</span>
                </span>
              ))}
            </div>
            <button
              onClick={onToggle}
              aria-label="Close shortcuts help"
              className="p-1 rounded hover:bg-[var(--fill-soft)] text-[var(--text-tertiary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            <Keyboard className="w-3 h-3" />
            <span>
              Press{" "}
              <kbd className="px-1 text-[10px] rounded bg-[var(--surface-sunken)]">
                ?
              </kbd>{" "}
              for keyboard shortcuts
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export default ShortcutsBar;
