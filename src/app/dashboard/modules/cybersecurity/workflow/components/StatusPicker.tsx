"use client";

/**
 * StatusPicker — floating dropdown replacing the native <select>.
 *
 * Behaviour:
 *   - Trigger is a colored pill showing the current status
 *   - Click → 4-option menu floats below (positioned via simple CSS)
 *   - Keyboard: opens on "s" from parent shell, closes on Esc
 *   - Click outside → close
 */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { RequirementStatus } from "@/data/cybersecurity-requirements";

interface StatusPickerProps {
  value: RequirementStatus;
  onChange: (next: RequirementStatus) => void;
  saving?: boolean;
}

const OPTIONS: Array<{
  key: RequirementStatus;
  label: string;
  chipClass: string;
  dotClass: string;
}> = [
  {
    key: "compliant",
    label: "Compliant",
    chipClass:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  {
    key: "partial",
    label: "Partial",
    chipClass:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dotClass: "bg-amber-400",
  },
  {
    key: "non_compliant",
    label: "Non-compliant",
    chipClass: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
    dotClass: "bg-red-500",
  },
  {
    key: "not_assessed",
    label: "Not assessed",
    chipClass:
      "border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
    dotClass: "bg-[var(--text-tertiary)]/50",
  },
];

function optionFor(status: RequirementStatus) {
  return OPTIONS.find((o) => o.key === status) ?? OPTIONS[3];
}

export function StatusPicker({ value, onChange, saving }: StatusPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const current = optionFor(value);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
          current.chipClass,
        ].join(" ")}
      >
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <span
            className={`w-2 h-2 rounded-full ${current.dotClass}`}
            aria-hidden
          />
        )}
        <span>{current.label}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 min-w-[200px] rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-lg z-30 py-1"
        >
          {OPTIONS.map((o) => {
            const active = o.key === value;
            return (
              <li key={o.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setOpen(false);
                    if (o.key !== value) onChange(o.key);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--fill-soft)]"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${o.dotClass}`}
                    aria-hidden
                  />
                  <span className="flex-1 text-[var(--text-primary)]">
                    {o.label}
                  </span>
                  {active && (
                    <Check className="w-3 h-3 text-emerald-500" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default StatusPicker;
