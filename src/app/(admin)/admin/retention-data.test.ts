/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Tests for the RETENTION grid pivot ({@link buildRetentionGrid} / retentionTone).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The page is a thin renderer; ALL the load-bearing logic — densifying short
 * cohort rows into a rectangular matrix, preserving newest-first order, and the
 * pct→colour ramp — lives in the pure helper, so that is what we test:
 *   1. dense matrix: every row is exactly maxWeeksSince+1 wide;
 *   2. missing cells (a young cohort that hasn't reached a column) → blank,
 *      not-present, no tone — distinct from a real 0% cell;
 *   3. pct + pctLabel are carried through faithfully (incl. the week-0 anchor);
 *   4. the tone ramp: transparent at/below 0, floored for tiny pct, capped at 1,
 *      deterministic rgba string for a mid value;
 *   5. empty response → no columns, no rows, isEmpty true.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  buildRetentionGrid,
  retentionTone,
  RETENTION_ACCENT_RGB,
} from "./retention-data";
import type { RetentionResponse } from "@/lib/admin/analytics-types";

/**
 * Two cohorts mirroring the API shape: an older full row (weeks 0..2) and a
 * newer one that only has week-0 yet (so the grid must pad it to width 3).
 */
function sampleResponse(): RetentionResponse {
  return {
    scope: "all",
    availableScopes: ["all", "atlas", "comply"],
    maxWeeksSince: 2,
    cohorts: [
      // newest-first (as the API returns)
      {
        cohortWeek: "2026-06-01",
        cohortSize: 50,
        cells: [{ weeksSince: 0, returnedUsers: 50, pct: 1 }],
      },
      {
        cohortWeek: "2026-05-25",
        cohortSize: 100,
        cells: [
          { weeksSince: 0, returnedUsers: 100, pct: 1 },
          { weeksSince: 1, returnedUsers: 40, pct: 0.4 },
          { weeksSince: 2, returnedUsers: 25, pct: 0.25 },
        ],
      },
    ],
  };
}

describe("buildRetentionGrid", () => {
  it("produces a dense matrix: every row has maxWeeksSince+1 columns", () => {
    const grid = buildRetentionGrid(sampleResponse());

    expect(grid.columns).toEqual([0, 1, 2]);
    expect(grid.rows).toHaveLength(2);
    for (const row of grid.rows) {
      expect(row.cells).toHaveLength(3);
      // cell index lines up with its weeksSince column.
      row.cells.forEach((cell, i) => expect(cell.weeksSince).toBe(i));
    }
  });

  it("preserves newest-first cohort order and identity", () => {
    const grid = buildRetentionGrid(sampleResponse());
    expect(grid.scope).toBe("all");
    expect(grid.rows[0].cohortWeek).toBe("2026-06-01");
    expect(grid.rows[0].cohortSize).toBe(50);
    expect(grid.rows[1].cohortWeek).toBe("2026-05-25");
    expect(grid.rows[1].cohortSize).toBe(100);
    expect(grid.isEmpty).toBe(false);
  });

  it("pads a young cohort's missing columns as blank, not-present, no tone", () => {
    const grid = buildRetentionGrid(sampleResponse());
    const young = grid.rows[0]; // 2026-06-01, only week 0 present

    // week 0 is real.
    expect(young.cells[0]).toMatchObject({
      weeksSince: 0,
      present: true,
      returnedUsers: 50,
      pct: 1,
      pctLabel: "100%",
    });
    // weeks 1 & 2 are absent → blank slots, NOT a 0% tile.
    for (const w of [1, 2]) {
      expect(young.cells[w]).toEqual({
        weeksSince: w,
        present: false,
        returnedUsers: 0,
        pct: 0,
        pctLabel: "",
        tone: "transparent",
      });
    }
  });

  it("carries pct, returnedUsers and pctLabel through for occupied cells", () => {
    const grid = buildRetentionGrid(sampleResponse());
    const older = grid.rows[1]; // full 0..2 row

    expect(older.cells.map((c) => c.pct)).toEqual([1, 0.4, 0.25]);
    expect(older.cells.map((c) => c.returnedUsers)).toEqual([100, 40, 25]);
    expect(older.cells.map((c) => c.pctLabel)).toEqual(["100%", "40%", "25%"]);
    // every occupied cell got a non-transparent tone.
    for (const c of older.cells) {
      expect(c.present).toBe(true);
      expect(c.tone).not.toBe("transparent");
      expect(c.tone.startsWith(`rgba(${RETENTION_ACCENT_RGB}`)).toBe(true);
    }
  });

  it("treats a genuine 0% occupied cell as present with a transparent tone", () => {
    // A real cell with pct 0 (e.g. a cohort that fully churned) must stay
    // present (it carries returnedUsers/label) but draws no colour.
    const res: RetentionResponse = {
      scope: "comply",
      availableScopes: ["comply"],
      maxWeeksSince: 1,
      cohorts: [
        {
          cohortWeek: "2026-05-18",
          cohortSize: 10,
          cells: [
            { weeksSince: 0, returnedUsers: 10, pct: 1 },
            { weeksSince: 1, returnedUsers: 0, pct: 0 },
          ],
        },
      ],
    };
    const grid = buildRetentionGrid(res);
    const churned = grid.rows[0].cells[1];
    expect(churned.present).toBe(true);
    expect(churned.pct).toBe(0);
    expect(churned.pctLabel).toBe("0%");
    expect(churned.tone).toBe("transparent");
  });

  it("returns an empty grid (no columns/rows) when there are no cohorts", () => {
    const grid = buildRetentionGrid({
      scope: "pharos",
      availableScopes: [],
      maxWeeksSince: 0,
      cohorts: [],
    });
    expect(grid.isEmpty).toBe(true);
    expect(grid.columns).toEqual([]);
    expect(grid.rows).toEqual([]);
  });

  it("handles a single-column grid (maxWeeksSince 0)", () => {
    const grid = buildRetentionGrid({
      scope: "all",
      availableScopes: ["all"],
      maxWeeksSince: 0,
      cohorts: [
        {
          cohortWeek: "2026-06-01",
          cohortSize: 5,
          cells: [{ weeksSince: 0, returnedUsers: 5, pct: 1 }],
        },
      ],
    });
    expect(grid.columns).toEqual([0]);
    expect(grid.rows[0].cells).toHaveLength(1);
    expect(grid.rows[0].cells[0].pctLabel).toBe("100%");
  });
});

describe("retentionTone", () => {
  it("is transparent for non-positive or non-finite pct", () => {
    expect(retentionTone(0)).toBe("transparent");
    expect(retentionTone(-0.1)).toBe("transparent");
    expect(retentionTone(Number.NaN)).toBe("transparent");
    expect(retentionTone(Number.POSITIVE_INFINITY)).toBe("transparent");
  });

  it("floors a tiny pct to the minimum visible alpha", () => {
    // 1% retention would be invisible; it is floored to 0.060.
    expect(retentionTone(0.01)).toBe(`rgba(${RETENTION_ACCENT_RGB}, 0.060)`);
  });

  it("uses the pct as alpha for a mid value (deterministic, 3dp)", () => {
    expect(retentionTone(0.4)).toBe(`rgba(${RETENTION_ACCENT_RGB}, 0.400)`);
  });

  it("caps alpha at 1 for the week-0 anchor (and any pct >= 1)", () => {
    expect(retentionTone(1)).toBe(`rgba(${RETENTION_ACCENT_RGB}, 1.000)`);
    expect(retentionTone(1.5)).toBe(`rgba(${RETENTION_ACCENT_RGB}, 1.000)`);
  });
});
