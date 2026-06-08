/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — pure number-formatting helpers (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Compact, locale-stable formatters shared by every /admin page so the cockpit
 * renders "1.2k" / "€3.4k" / "42%" identically everywhere. PURE module (no
 * React, no "use client", no I/O) — importable from server or client code.
 *
 * Why hand-rolled and not `Intl.NumberFormat({ notation: "compact" })`:
 *   - We want a *deterministic* "1.2k / 3.4M / 1.0B" style with a fixed 1-dp
 *     rule that is identical on the server (RSC) and the client, so there is no
 *     hydration mismatch and no dependence on the runtime's ICU locale data.
 *   - The "€" currency display reuses the same compact magnitude logic, so
 *     revenue and headcount read with the same visual weight in a KPI row.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * Reduce a magnitude to a compact "<num><suffix>" string with one decimal of
 * precision once we cross 1,000. The decimal is dropped when it is `.0` so
 * round numbers read cleanly ("1k", not "1.0k"). Shared by {@link compactNumber}
 * and {@link eur} so both scale identically.
 */
function compactMagnitude(n: number): string {
  // Tiers ordered largest-first; the first one the value clears wins.
  const tiers: Array<{ limit: number; suffix: string }> = [
    { limit: 1_000_000_000, suffix: "B" },
    { limit: 1_000_000, suffix: "M" },
    { limit: 1_000, suffix: "k" },
  ];
  for (const { limit, suffix } of tiers) {
    if (n >= limit) {
      const scaled = n / limit;
      // toFixed(1) then strip a trailing ".0" → "1.2k" but "3k".
      const label = scaled.toFixed(1).replace(/\.0$/, "");
      return `${label}${suffix}`;
    }
  }
  // Below 1,000 we show the integer as-is (no decimals for raw counts).
  return String(Math.round(n));
}

/**
 * Compact integer-ish formatter: 1234 → "1.2k", 3_400_000 → "3.4M".
 * Non-finite input (NaN/Infinity, e.g. a missing rollup) degrades to "0" so the
 * UI never prints "NaN". Negatives keep their sign ("-1.2k").
 */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n < 0) return `-${compactMagnitude(-n)}`;
  return compactMagnitude(n);
}

/**
 * Compact Euro formatter: 3400 → "€3.4k", 12 → "€12", 2_500_000 → "€2.5M".
 * Uses the same magnitude rule as {@link compactNumber} so a revenue tile reads
 * with the same density as a count tile. Non-finite → "€0"; negatives keep the
 * sign INSIDE the symbol ("-€3.4k") which is the convention for a delta.
 */
export function eur(n: number): string {
  if (!Number.isFinite(n)) return "€0";
  if (n < 0) return `-€${compactMagnitude(-n)}`;
  return `€${compactMagnitude(n)}`;
}

/**
 * Percentage label from a 0..1 ratio: 0.42 → "42%", 1 → "100%", 0.005 → "1%".
 * Rounds to the nearest whole percent (cohort grids have no room for decimals).
 * Non-finite → "0%". Accepts values >1 (e.g. growth) and renders them as-is.
 */
export function pctLabel(p: number): string {
  if (!Number.isFinite(p)) return "0%";
  return `${Math.round(p * 100)}%`;
}
