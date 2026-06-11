/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — pure number-formatting helpers (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Compact, locale-stable formatters shared by every /admin page so the cockpit
 * renders "1,2k" / "3,4 Mio." / "3,4k €" / "42%" identically everywhere. PURE
 * module (no React, no "use client", no I/O) — importable from server or client
 * code.
 *
 * The admin surface is GERMAN (de-DE conventions): decimal COMMA, the German
 * magnitude words "Mio." / "Mrd." (an English "B" would read as the German
 * „Billion" = 10^12 — actively misleading), and the € sign AFTER the amount
 * ("3,4k €", not "€3.4k").
 *
 * Why hand-rolled and not `Intl.NumberFormat("de-DE", { notation: "compact" })`:
 *   - We want a *deterministic* output with a fixed 1-dp rule that is identical
 *     on the server (RSC) and the client, so there is no hydration mismatch and
 *     no dependence on the runtime's ICU locale data.
 *   - The "€" currency display reuses the same compact magnitude logic, so
 *     revenue and headcount read with the same visual weight in a KPI row.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/** Non-breaking space — keeps "3,4k €" / "3,4 Mio." from wrapping mid-figure. */
const NBSP = "\u00A0";

/**
 * Reduce a magnitude to a compact German "<num><suffix>" string with one
 * decimal of precision once we cross 1,000 — decimal COMMA, "k" for thousands,
 * "Mio." / "Mrd." for millions / billions. The decimal is dropped when it is
 * ",0" so round numbers read cleanly ("1k", not "1,0k"). Shared by
 * {@link compactNumber} and {@link eur} so both scale identically.
 */
function compactMagnitude(n: number): string {
  // Tiers ordered largest-first; the first one the value clears wins. The
  // word-suffixes carry a non-breaking space ("3,4 Mio."), "k" sits tight.
  const tiers: Array<{ limit: number; suffix: string }> = [
    { limit: 1_000_000_000, suffix: `${NBSP}Mrd.` },
    { limit: 1_000_000, suffix: `${NBSP}Mio.` },
    { limit: 1_000, suffix: "k" },
  ];
  for (const { limit, suffix } of tiers) {
    if (n >= limit) {
      const scaled = n / limit;
      // toFixed(1), strip a trailing ".0", then German decimal comma →
      // "1,2k" but "3k".
      const label = scaled.toFixed(1).replace(/\.0$/, "").replace(".", ",");
      return `${label}${suffix}`;
    }
  }
  // Below 1,000 we show the integer as-is (no decimals for raw counts).
  return String(Math.round(n));
}

/**
 * Compact integer-ish formatter (de-DE): 1234 → "1,2k", 3_400_000 → "3,4 Mio.".
 * Non-finite input (NaN/Infinity, e.g. a missing rollup) degrades to "0" so the
 * UI never prints "NaN". Negatives keep their sign ("-1,2k").
 */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n < 0) return `-${compactMagnitude(-n)}`;
  return compactMagnitude(n);
}

/**
 * Compact Euro formatter (de-DE, € after the amount): 3400 → "3,4k €",
 * 12 → "12 €", 2_500_000 → "2,5 Mio. €". Uses the same magnitude rule as
 * {@link compactNumber} so a revenue tile reads with the same density as a
 * count tile. Non-finite → "0 €"; negatives carry a leading sign ("-3,4k €").
 */
export function eur(n: number): string {
  if (!Number.isFinite(n)) return `0${NBSP}€`;
  if (n < 0) return `-${compactMagnitude(-n)}${NBSP}€`;
  return `${compactMagnitude(n)}${NBSP}€`;
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

/**
 * German date label from an ISO string ("2026-06-10" or a full ISO timestamp)
 * → "10.06.2026". Pure string slicing — no `Date`/locale involved, so server
 * and client render the identical string (hydration-safe, like the rest of
 * this module). Returns null for missing/unrecognisable input so callers can
 * omit the stamp instead of printing nonsense.
 */
export function dateDe(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
