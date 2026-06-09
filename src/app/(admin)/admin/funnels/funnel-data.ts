/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — PURE data shaping for the Funnel explorer (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The funnels/page.tsx renderer is a thin wrapper; ALL the arithmetic that a
 * wrong value would corrupt (step→step conversion %, the relative bar width, the
 * ms→human time label, the funnel display name) lives HERE as pure, exported
 * functions so it can be unit-tested without React. The page only maps these
 * outputs onto JSX.
 *
 * No React, no I/O, no "use client" — importable from anywhere and trivially
 * testable. Inputs come straight from the FunnelsResponse contract.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { FunnelStepView, FunnelView } from "@/lib/admin/analytics-types";

/** One funnel step, decorated with the derived display fields the bar needs. */
export interface FunnelStepRow {
  step: number;
  stepKey: string;
  usersEntered: number;
  usersCompleted: number;
  /**
   * Step→step conversion = usersCompleted / usersEntered, clamped to 0..1.
   * `null` when usersEntered is 0 (an undefined ratio — the UI shows "—", not
   * "0%", so an empty step is visibly distinct from a 0%-converting one).
   */
  conversionPct: number | null;
  /**
   * Bar width as a 0..1 fraction of THIS funnel's step-0 entered count, so the
   * first step is a full-width bar and later steps narrow proportionally — the
   * classic funnel silhouette. 0 when step-0 had no entrants (degenerate funnel).
   */
  widthFrac: number;
  /** Human label for the median time to the next step ("2.3s", "4m", "—"). */
  msToNextLabel: string;
}

/**
 * Step→step conversion ratio (usersCompleted / usersEntered) as 0..1, or `null`
 * when `usersEntered <= 0` (undefined — caller renders "—"). The result is
 * clamped to [0,1]: a rollup where completed > entered (shouldn't happen, but a
 * double-count could) must never render a >100% conversion bar/label.
 */
export function conversionRatio(
  usersEntered: number,
  usersCompleted: number,
): number | null {
  if (!Number.isFinite(usersEntered) || usersEntered <= 0) return null;
  if (!Number.isFinite(usersCompleted) || usersCompleted <= 0) return 0;
  const ratio = usersCompleted / usersEntered;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

/**
 * Humanise a millisecond duration into a compact, single-unit label:
 *   < 1s        → "Nms"          (e.g. "450ms")
 *   < 60s       → "N.Ns"         (e.g. "2.3s", trailing ".0" stripped → "5s")
 *   < 60m       → "Nm" / "N.Nm"  (e.g. "4m", "4.5m")
 *   < 24h       → "Nh" / "N.Nh"  (e.g. "1.2h")
 *   otherwise   → "Nd" / "N.Nd"  (e.g. "2.5d")
 * `null`/non-finite/negative → "—" (no measurable hop, e.g. the terminal step).
 *
 * One decimal of precision is shown for s/m/h/d and dropped when it is ".0", so
 * round values read cleanly ("5s", not "5.0s"). Milliseconds are integers.
 */
export function humaniseMs(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "—";

  // Sub-second: whole milliseconds (one decimal would be noise at this scale).
  if (ms < 1_000) return `${Math.round(ms)}ms`;

  // Choose the largest unit the value clears, then format with a 1-dp rule.
  const SECOND = 1_000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  const units: Array<{ limit: number; per: number; suffix: string }> = [
    { limit: DAY, per: DAY, suffix: "d" },
    { limit: HOUR, per: HOUR, suffix: "h" },
    { limit: MINUTE, per: MINUTE, suffix: "m" },
    { limit: SECOND, per: SECOND, suffix: "s" },
  ];
  for (const { limit, per, suffix } of units) {
    if (ms >= limit) {
      const scaled = ms / per;
      const label = scaled.toFixed(1).replace(/\.0$/, "");
      return `${label}${suffix}`;
    }
  }
  // Unreachable (ms >= 1000 always clears SECOND), but keeps TS exhaustive.
  return `${Math.round(ms)}ms`;
}

/**
 * Decorate a funnel's raw steps with the derived display fields the bar chart
 * needs. The width baseline is the FIRST step's usersEntered (steps are assumed
 * pre-sorted in funnel order by the API; we defensively re-sort by `step`). When
 * step-0 has no entrants every bar is width 0 (a flat, empty funnel) — the page
 * still shows the rows + the "0" counts so an empty funnel is legible, not blank.
 */
export function buildFunnelRows(steps: FunnelStepView[]): FunnelStepRow[] {
  // Defensive copy + sort: never mutate the caller's array, and don't trust the
  // upstream ordering for the width baseline.
  const ordered = [...steps].sort((a, b) => a.step - b.step);

  const baseline = ordered.length > 0 ? ordered[0].usersEntered : 0;
  const hasBaseline = Number.isFinite(baseline) && baseline > 0;

  return ordered.map((s) => {
    const conversionPct = conversionRatio(s.usersEntered, s.usersCompleted);

    // Width is relative to the funnel's entry width. Clamp to [0,1] so a step
    // that (erroneously) entered more than step-0 can't overflow the track.
    let widthFrac = 0;
    if (hasBaseline) {
      const raw = s.usersEntered / baseline;
      widthFrac = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    }

    return {
      step: s.step,
      stepKey: s.stepKey,
      usersEntered: s.usersEntered,
      usersCompleted: s.usersCompleted,
      conversionPct,
      widthFrac,
      msToNextLabel: humaniseMs(s.medianMsToNext),
    };
  });
}

/**
 * A human title for a funnel card. The cross-product north-star funnel
 * (product === null, conventionally funnelId "growth") is labelled
 * "Growth (cross-product)"; a product-scoped funnel reads "<product> · <id>".
 * Pure string shaping so the heading is testable and consistent.
 */
export function funnelTitle(
  view: Pick<FunnelView, "funnelId" | "product">,
): string {
  if (view.product === null) {
    // The growth funnel is THE cross-product one; other null-product funnels
    // (if any are ever added) still read as cross-product, which is correct.
    return view.funnelId === "growth"
      ? "Growth (cross-product)"
      : `${view.funnelId} (cross-product)`;
  }
  return `${view.product} · ${view.funnelId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV EXPORT — flatten every funnel's steps into one row-per-step table.
// ─────────────────────────────────────────────────────────────────────────────

/** One flat CSV cell value (mirrors export-utils' CsvValue without importing it,
 * so this transform module stays free of the component graph). */
type ExportCell = string | number;

/** A flat export row: the column key → value map the ExportButton consumes. */
export type FunnelExportRow = Record<string, ExportCell>;

/**
 * The fixed CSV column spec for the funnel export (order + headers). One row per
 * step across all funnels: which funnel, the step ordinal + key, the entered /
 * completed counts, the step→step conversion %, and the median time to the next
 * step. Exported so the page passes the identical spec to ExportButton.
 */
export const FUNNEL_EXPORT_COLUMNS: ReadonlyArray<{
  key: string;
  header: string;
}> = [
  { key: "funnel", header: "Funnel" },
  { key: "step", header: "Step" },
  { key: "stepKey", header: "Step name" },
  { key: "usersEntered", header: "Users entered" },
  { key: "usersCompleted", header: "Users completed" },
  { key: "conversionPct", header: "Conversion %" },
  { key: "medianToNext", header: "Median to next" },
];

/**
 * Flatten a list of funnels into a single row-per-step CSV table. Each funnel's
 * steps are decorated by the same tested {@link buildFunnelRows} helper the page
 * renders, so the exported numbers match the on-screen bars exactly (conversion
 * clamped to 0..1, median-time humanised). The step ordinal is 1-based (matching
 * the visible "1. / 2. …" labels). Conversion is emitted as a whole-number
 * percent; a step nobody entered (undefined ratio) exports as EMPTY ("") rather
 * than 0, mirroring the "—" the UI shows so an empty step is distinct from a
 * genuine 0% one.
 *
 * Pure + total: never mutates the input; an empty funnel list yields [].
 */
export function buildFunnelExport(funnels: FunnelView[]): FunnelExportRow[] {
  const out: FunnelExportRow[] = [];
  for (const funnel of funnels) {
    const title = funnelTitle(funnel);
    const rows = buildFunnelRows(funnel.steps);
    rows.forEach((row, i) => {
      out.push({
        funnel: title,
        step: i + 1, // 1-based, matching the visible step labels
        stepKey: row.stepKey,
        usersEntered: row.usersEntered,
        usersCompleted: row.usersCompleted,
        // Whole-number percent for a real ratio; blank for the undefined case.
        conversionPct:
          row.conversionPct === null ? "" : Math.round(row.conversionPct * 100),
        medianToNext: row.msToNextLabel,
      });
    });
  }
  return out;
}
