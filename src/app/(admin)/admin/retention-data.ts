/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — RETENTION grid pivot (Phase 4, pure helper).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The retention API ({@link RetentionResponse}) returns each cohort as a DENSE
 * but POSSIBLY-SHORT list of cells (a brand-new cohort may only have a
 * weeksSince-0 cell yet). The heatmap, however, wants a rectangular grid: every
 * cohort row must have one slot for each column 0..maxWeeksSince so the cells
 * line up vertically. This module does exactly that pivot — flat cohort cells →
 * a dense 2-D matrix with a precomputed colour tone per occupied cell — and
 * nothing else (no React, no I/O), so the page is a thin renderer over a unit-
 * tested transform.
 *
 * Colour model: week-0 is the 100% anchor; each occupied cell's tone is a single
 * hue (the platform accent) at an alpha proportional to its retention pct, so a
 * stronger-retained cell reads as a more saturated tile. Missing slots (a column
 * the cohort hasn't reached yet) are returned as `present:false` with no tone so
 * the renderer can leave them blank rather than draw a misleading 0% tile.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { RetentionResponse } from "@/lib/admin/analytics-types";

/**
 * The platform accent as an "r, g, b" triple (matches `--accent-primary`
 * #4a62e8). CSS custom properties can't be interpolated into an `rgba()` alpha,
 * so we keep the channel values here — in the tested helper — and emit a literal
 * `rgba(...)` per cell. One source of truth for the heatmap hue; if the brand
 * accent ever changes, update this single constant.
 */
export const RETENTION_ACCENT_RGB = "74, 98, 232" as const;

/**
 * Floor any cell's alpha to this so even a low-but-nonzero retention tile is
 * faintly visible against the dark panel (a 3% tile would be indistinguishable
 * from an empty slot). A genuinely empty slot is `present:false` and gets no
 * tone at all, so this floor never makes a missing cell look occupied.
 */
const MIN_VISIBLE_ALPHA = 0.06;

/** One slot in the pivoted grid (always exactly one per column per row). */
export interface RetentionGridCell {
  /** Column index = weeksSince (0..maxWeeksSince). */
  weeksSince: number;
  /** Whether the source cohort actually had a cell at this column. */
  present: boolean;
  /** returnedUsers for this cell (0 when absent). */
  returnedUsers: number;
  /** retention ratio 0..1 for this cell (0 when absent). */
  pct: number;
  /** Pre-formatted "NN%" label (empty string when absent). */
  pctLabel: string;
  /** CSS background for the tile — `rgba(accent, alpha)`, or `transparent`
   * when the slot is absent so the renderer draws nothing. */
  tone: string;
}

/** One pivoted cohort row: its identity + a dense, column-aligned cell array. */
export interface RetentionGridRow {
  /** ISO week-start (Monday) the cohort signed up. */
  cohortWeek: string;
  cohortSize: number;
  /** length === columns.length; index i corresponds to weeksSince i. */
  cells: RetentionGridCell[];
}

/** The fully-pivoted grid the heatmap renders. */
export interface RetentionGrid {
  /** The active scope (echoed from the response). */
  scope: string;
  /** Column headers: [0, 1, …, maxWeeksSince]. Empty when there is no data. */
  columns: number[];
  /** Cohort rows in response order (newest-first). */
  rows: RetentionGridRow[];
  /** True when there are no cohorts at all (drives the empty state). */
  isEmpty: boolean;
}

/**
 * Round a 0..1 ratio to a whole-percent "NN%" label. Inlined (rather than
 * importing format.ts) so this transform module stays free of the "use client"
 * graph and is trivially testable in isolation. Mirrors format.ts → pctLabel.
 */
function toPctLabel(p: number): string {
  if (!Number.isFinite(p)) return "0%";
  return `${Math.round(p * 100)}%`;
}

/**
 * Map a retention pct (0..1) to a tile background. Returns `transparent` for a
 * non-positive pct so a real 0%-retained cell and a clamp both read as "no
 * colour", letting the grid's empty look be reserved for absent slots only when
 * paired with `present:false`. A positive pct gets the accent hue at an alpha
 * floored to {@link MIN_VISIBLE_ALPHA} and capped at 1.
 */
export function retentionTone(pct: number): string {
  if (!Number.isFinite(pct) || pct <= 0) return "transparent";
  const alpha = Math.min(1, Math.max(MIN_VISIBLE_ALPHA, pct));
  // toFixed(3) keeps the rgba string deterministic (no float dust) so server
  // and client render byte-identical inline styles → no hydration mismatch.
  return `rgba(${RETENTION_ACCENT_RGB}, ${alpha.toFixed(3)})`;
}

/**
 * Pivot a {@link RetentionResponse} into a dense, column-aligned grid.
 *
 * Guarantees:
 *   - `columns` is exactly [0 … maxWeeksSince] (one entry per column), or [] when
 *     there are no cohorts.
 *   - every row has `cells.length === columns.length`; the cell at index i is the
 *     cohort's data for weeksSince i, or a blank `present:false` slot if the
 *     cohort had no cell there (e.g. a cohort younger than that column).
 *   - row order is preserved from the response (newest-first).
 */
export function buildRetentionGrid(res: RetentionResponse): RetentionGrid {
  const isEmpty = res.cohorts.length === 0;

  // Column count is driven by maxWeeksSince so EVERY row is the same width even
  // if no single cohort reached that far; an empty grid has zero columns.
  const columnCount = isEmpty
    ? 0
    : Math.max(0, Math.floor(res.maxWeeksSince)) + 1;
  const columns = Array.from({ length: columnCount }, (_, i) => i);

  const rows: RetentionGridRow[] = res.cohorts.map((cohort) => {
    // Index this cohort's (sparse-relative-to-the-grid) cells by weeksSince so
    // the fill below is O(columns) rather than O(columns × cells).
    const byWeek = new Map<number, { returnedUsers: number; pct: number }>();
    for (const c of cohort.cells) {
      byWeek.set(c.weeksSince, { returnedUsers: c.returnedUsers, pct: c.pct });
    }

    const cells: RetentionGridCell[] = columns.map((w) => {
      const hit = byWeek.get(w);
      if (!hit) {
        // Absent slot: column the cohort hasn't reached. Blank, no tone.
        return {
          weeksSince: w,
          present: false,
          returnedUsers: 0,
          pct: 0,
          pctLabel: "",
          tone: "transparent",
        };
      }
      return {
        weeksSince: w,
        present: true,
        returnedUsers: hit.returnedUsers,
        pct: hit.pct,
        pctLabel: toPctLabel(hit.pct),
        tone: retentionTone(hit.pct),
      };
    });

    return {
      cohortWeek: cohort.cohortWeek,
      cohortSize: cohort.cohortSize,
      cells,
    };
  });

  return { scope: res.scope, columns, rows, isEmpty };
}
