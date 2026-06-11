"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the 7d / 30d / 90d segmented control (Phase 4 → P2 a11y).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * A controlled segmented switch over the {@link AdminRange} union. The PARENT
 * owns the selected range (and re-derives the fetch URL from it via
 * useAdminData) — this component only renders the three options and reports a
 * change. Driving it off ADMIN_RANGE_DAYS keeps the option set in lockstep with
 * the contract: add a range there and it appears here automatically.
 *
 * The VALUES stay the raw union ("7d"/"30d"/"90d", what the API accepts); the
 * LABELS are humanised ("7 days"/…) and derived from the same ADMIN_RANGE_DAYS
 * day-count, so a new range still gets a readable label with no extra wiring.
 *
 * ACCESSIBILITY (P2). This is a real WAI-ARIA tablist with the canonical
 * automatic-activation keyboard pattern:
 *   • Roving tabindex — only the SELECTED tab is in the tab order (tabIndex 0);
 *     the rest are tabIndex -1, so Tab lands on the active option and the arrow
 *     keys move between options without leaving the group.
 *   • ArrowLeft/ArrowRight move to the previous/next option (wrapping at the
 *     ends), move DOM focus to it, AND activate it (automatic activation — the
 *     parent re-fetches on the new range immediately).
 *   • Home/End jump to the first/last option (focus + activate).
 *   • Hover styling is pure CSS (`:hover` on the option class) — no inline
 *     onMouseEnter/onMouseLeave colour mutation — so the selected option (which
 *     sets its own colour) is never clobbered and there is no JS hover work.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useRef, type KeyboardEvent } from "react";
import { ADMIN_RANGE_DAYS, type AdminRange } from "@/lib/admin/analytics-types";

export interface RangeTabsProps {
  value: AdminRange;
  onChange: (r: AdminRange) => void;
}

// Derived from the contract so the labels can never drift from the ranges the
// API actually accepts. `Object.keys` is typed back to AdminRange[] because the
// const record's keys ARE the AdminRange union.
const RANGES = Object.keys(ADMIN_RANGE_DAYS) as AdminRange[];

/** Humanised label for a range, derived from its day count ("7d" → "7 Tage"). */
function rangeLabel(r: AdminRange): string {
  const days = ADMIN_RANGE_DAYS[r];
  return `${days} ${days === 1 ? "Tag" : "Tage"}`;
}

export default function RangeTabs({ value, onChange }: RangeTabsProps) {
  // One ref per option button so the keyboard handler can move DOM focus to the
  // target option (the roving-tabindex pattern needs focus, not just selection).
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  /**
   * Move focus to the option at `index` and activate it. Activation is automatic
   * (the canonical pattern for a small, cheap-to-switch tablist): the parent
   * re-fetches on the new range as focus lands, so arrowing through the options
   * previews each range — exactly what an operator wants here.
   */
  function focusAndSelect(index: number) {
    const next = RANGES[index];
    if (!next) return;
    tabRefs.current[index]?.focus();
    if (next !== value) onChange(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = RANGES.indexOf(value);
    // `current` is always found (value is an AdminRange), but guard anyway so a
    // stray value can't produce a NaN index.
    const base = current < 0 ? 0 : current;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        // Wrap past the end back to the first option.
        focusAndSelect((base + 1) % RANGES.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        // Wrap before the start to the last option.
        focusAndSelect((base - 1 + RANGES.length) % RANGES.length);
        break;
      case "Home":
        e.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        e.preventDefault();
        focusAndSelect(RANGES.length - 1);
        break;
      default:
        // Space/Enter on a focused <button> already fire onClick natively; let
        // every other key through untouched.
        break;
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Zeitraum"
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className="inline-flex items-center gap-0.5 rounded-lg p-0.5 glass-surface"
      style={{ border: "1px solid var(--border-default)" }}
    >
      {/* Hover styling lives here as a CSS :hover rule so no inline handler ever
          mutates the colour. The active option sets its own colour inline, which
          wins over the muted base, so its hover state is intentionally a no-op. */}
      <style>{`
        .admin-range-tab {
          color: var(--text-secondary);
          transition: color 150ms;
        }
        .admin-range-tab:hover { color: var(--text-primary); }
        .admin-range-tab:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 1px;
        }
      `}</style>
      {RANGES.map((r, i) => {
        const active = r === value;
        return (
          <button
            key={r}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            // Roving tabindex: only the selected tab is tabbable; arrow keys move
            // focus among the rest.
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(r)}
            className="admin-range-tab rounded-md px-2.5 py-1 text-[12px] font-medium"
            // The active pill colours itself (accent bg + white text); inactive
            // options inherit the muted base from .admin-range-tab and brighten
            // via the CSS :hover rule above.
            style={
              active
                ? { background: "var(--accent-primary)", color: "#ffffff" }
                : undefined
            }
          >
            {rangeLabel(r)}
          </button>
        );
      })}
    </div>
  );
}
