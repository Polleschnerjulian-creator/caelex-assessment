"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the 7d / 30d / 90d segmented control (Phase 4).
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
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { ADMIN_RANGE_DAYS, type AdminRange } from "@/lib/admin/analytics-types";

export interface RangeTabsProps {
  value: AdminRange;
  onChange: (r: AdminRange) => void;
}

// Derived from the contract so the labels can never drift from the ranges the
// API actually accepts. `Object.keys` is typed back to AdminRange[] because the
// const record's keys ARE the AdminRange union.
const RANGES = Object.keys(ADMIN_RANGE_DAYS) as AdminRange[];

/** Humanised label for a range, derived from its day count ("7d" → "7 days"). */
function rangeLabel(r: AdminRange): string {
  const days = ADMIN_RANGE_DAYS[r];
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export default function RangeTabs({ value, onChange }: RangeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex items-center gap-0.5 rounded-lg p-0.5 glass-surface"
      style={{ border: "1px solid var(--border-default)" }}
    >
      {RANGES.map((r) => {
        const active = r === value;
        return (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(r)}
            className="rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors duration-150"
            style={{
              // Active pill uses the accent; inactive options stay muted and
              // only brighten via the inline hover handlers below (no Tailwind
              // hover class so the colour can come from a CSS token).
              background: active ? "var(--accent-primary)" : "transparent",
              color: active ? "#ffffff" : "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              if (!active)
                e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {rangeLabel(r)}
          </button>
        );
      })}
    </div>
  );
}
