"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — a single headline KPI tile (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * One stat: a small uppercase `label`, a big `value` (already formatted by the
 * caller via format.ts → "1.2k" / "€3.4k"), and an optional `sub` line. `tone`
 * tints the value to signal sentiment without re-implementing a status pill:
 *   default  → primary text
 *   positive → emerald accent
 *   warning  → amber
 *   danger   → red accent
 *
 * The KPIs sit in a responsive grid the page owns; this component is just the
 * cell, so it has no margin and fills its grid track.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export type KpiTone = "default" | "positive" | "warning" | "danger";

export interface KpiTileProps {
  label: string;
  /** Pre-formatted display string (e.g. "1.2k", "€3.4k", "42%"). */
  value: string;
  sub?: string;
  tone?: KpiTone;
}

/**
 * Map a tone to the CSS custom property that colours the value. We reference
 * the shared accent tokens rather than hardcoding hex so the tile tracks the
 * platform palette (and light/dark) automatically. "warning" has no dedicated
 * accent token, so it uses amber-500 (#f59e0b) from the design system.
 */
const TONE_COLOR: Record<KpiTone, string> = {
  default: "var(--text-primary)",
  positive: "var(--accent-primary)",
  warning: "#f59e0b",
  danger: "var(--accent-danger)",
};

export default function KpiTile({
  label,
  value,
  sub,
  tone = "default",
}: KpiTileProps) {
  return (
    <div
      className="glass-surface rounded-xl px-4 py-3.5"
      style={{ border: "1px solid var(--border-default)" }}
    >
      <p
        className="text-[10px] font-medium uppercase tracking-[0.06em]"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </p>
      <p
        className="mt-1.5 text-[26px] font-semibold leading-none tabular-nums"
        style={{ color: TONE_COLOR[tone] }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="mt-1.5 text-[11px] leading-snug"
          style={{ color: "var(--text-secondary)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
