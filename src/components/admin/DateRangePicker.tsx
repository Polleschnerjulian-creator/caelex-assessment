"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — a custom start/end date-range picker (P2).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * A dependency-free [from, to] day-range control built from two native
 * `<input type="date">` fields — it complements the 7/30/90 {@link RangeTabs}
 * for the "I need an exact window" case. It is CONTROLLED: the parent owns the
 * current {fromISO,toISO} `value` (and re-derives the fetch URL from it), and
 * this component reports the next, ALREADY-CLAMPED range via `onChange`.
 *
 * All the fiddly bits (validate yyyy-mm-dd, swap an inverted pair so from<=to,
 * clamp into an optional [min,max]) live in the PURE, unit-tested
 * {@link clampRange} helper. This component only:
 *   - mirrors `value` into the two inputs,
 *   - on each edit, asks clampRange for the corrected range and, if it changed,
 *     calls `onChange` (it never emits an invalid or descending range),
 *   - shows the inclusive day-count so the user can see the span they picked.
 *
 * An edit that can't form a valid range (e.g. a half-typed date) is held locally
 * and simply not propagated — the parent keeps its last good window.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useId, useState } from "react";
import { clampRange, rangeDays, type DateRange } from "./export-utils";

export interface DateRangePickerProps {
  /** The current, valid range owned by the parent. */
  value: DateRange;
  /** Called with the next ALREADY-CLAMPED range (from<=to, within bounds). */
  onChange: (range: DateRange) => void;
  /** Optional inclusive ISO bounds the picker clamps selections into. */
  min?: string;
  max?: string;
  /** Accessible group label (default "Custom date range"). */
  label?: string;
  className?: string;
}

/** Shared input styling — glass surface, token border, tabular figures. */
const INPUT_CLASS =
  "rounded-lg px-2.5 py-1.5 text-[12px] tabular-nums outline-none transition-colors duration-150";

export default function DateRangePicker({
  value,
  onChange,
  min,
  max,
  label = "Custom date range",
  className = "",
}: DateRangePickerProps) {
  // Local mirror of the two inputs so a mid-edit (transiently invalid) value can
  // be displayed without forcing it onto the parent. Seeded from `value` and
  // re-synced whenever the parent's range changes underneath us.
  const [fromDraft, setFromDraft] = useState(value.fromISO);
  const [toDraft, setToDraft] = useState(value.toISO);

  useEffect(() => {
    setFromDraft(value.fromISO);
    setToDraft(value.toISO);
  }, [value.fromISO, value.toISO]);

  // Unique ids tie each <label> to its input for assistive tech.
  const baseId = useId();
  const fromId = `${baseId}-from`;
  const toId = `${baseId}-to`;

  /**
   * Apply an edit to one end: update the local draft, then try to form a valid
   * clamped range from the two drafts. Only propagate when it differs from the
   * parent's current value (so we don't loop or fire no-op changes).
   */
  function applyEdit(next: { from?: string; to?: string }) {
    const nextFrom = next.from ?? fromDraft;
    const nextTo = next.to ?? toDraft;
    if (next.from !== undefined) setFromDraft(next.from);
    if (next.to !== undefined) setToDraft(next.to);

    const clamped = clampRange(nextFrom, nextTo, { min, max });
    if (!clamped) return; // half-typed / invalid — keep parent's last good range
    if (clamped.fromISO === value.fromISO && clamped.toISO === value.toISO) {
      return;
    }
    onChange(clamped);
  }

  const days = rangeDays(value);

  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <div className="inline-flex items-center gap-1.5">
        <label
          htmlFor={fromId}
          className="text-[11px] font-medium uppercase tracking-[0.04em]"
          style={{ color: "var(--text-secondary)" }}
        >
          From
        </label>
        <input
          id={fromId}
          type="date"
          value={fromDraft}
          min={min}
          max={max}
          aria-label="Start date"
          onChange={(e) => applyEdit({ from: e.target.value })}
          className={INPUT_CLASS}
          style={{
            background: "var(--glass-bg-surface, transparent)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            colorScheme: "dark",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--accent-primary)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-default)")
          }
        />
      </div>

      <span
        aria-hidden="true"
        className="text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        →
      </span>

      <div className="inline-flex items-center gap-1.5">
        <label
          htmlFor={toId}
          className="text-[11px] font-medium uppercase tracking-[0.04em]"
          style={{ color: "var(--text-secondary)" }}
        >
          To
        </label>
        <input
          id={toId}
          type="date"
          value={toDraft}
          min={min}
          max={max}
          aria-label="End date"
          onChange={(e) => applyEdit({ to: e.target.value })}
          className={INPUT_CLASS}
          style={{
            background: "var(--glass-bg-surface, transparent)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            colorScheme: "dark",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--accent-primary)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-default)")
          }
        />
      </div>

      {days > 0 && (
        <span
          className="text-[11px] tabular-nums"
          style={{ color: "var(--text-tertiary)" }}
          aria-label={`${days} day${days === 1 ? "" : "s"} selected`}
        >
          {days}d
        </span>
      )}
    </div>
  );
}
