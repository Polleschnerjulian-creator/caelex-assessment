/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the steering pure data layer (steering-data.ts).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Covers the load-bearing math: WACO weighting + 7d/14d/month windowing,
 * distinct-tenant counting, the PMF product×jurisdiction aggregation with WoW
 * growth, the friction completion-rate ordering, and the empty predicate. All
 * windows are anchored on an explicit `nowMs` so the tests are deterministic
 * (no real clock). Pure functions — no React/DOM/Prisma.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  periodChange,
  wacoWeighted,
  distinctTenants,
  productContributions,
  buildPmfMatrix,
  buildFriction,
  buildSteering,
  isSteeringEmpty,
  type ValueOutcomeRow,
  type FrictionInput,
} from "./steering-data";
import type { ValueOutcomeId } from "./value-events";

const DAY = 24 * 60 * 60 * 1000;
// A fixed "now" so window boundaries are exact and reproducible.
const NOW = Date.UTC(2026, 5, 9, 12, 0, 0); // 2026-06-09T12:00:00Z

/** Tiny row builder; defaults keep tests terse. */
function row(
  outcomeId: ValueOutcomeId,
  opts: Partial<Omit<ValueOutcomeRow, "outcomeId">> = {},
): ValueOutcomeRow {
  return {
    outcomeId,
    actorKey: opts.actorKey ?? "org:a",
    jurisdiction: opts.jurisdiction ?? "DE",
    occurredAtMs: opts.occurredAtMs ?? NOW - 1 * DAY, // inside this week
  };
}

describe("periodChange", () => {
  it("returns (current - prior) / prior", () => {
    expect(periodChange(150, 100)).toBe(0.5);
    expect(periodChange(50, 100)).toBe(-0.5);
  });

  it("returns null when there is no prior baseline", () => {
    expect(periodChange(10, 0)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(periodChange(Number.NaN, 100)).toBeNull();
    expect(periodChange(10, Infinity)).toBeNull();
  });
});

describe("wacoWeighted", () => {
  it("sums each row's weight (licence=3, assessment=2, bookmark=0.25)", () => {
    const rows = [
      row("trade_license_issued"),
      row("comply_assessment_completed"),
      row("scholar_bookmark_saved"),
    ];
    // 3 + 2 + 0.25 = 5.25
    expect(wacoWeighted(rows)).toBe(5.25);
  });

  it("is 0 for no rows", () => {
    expect(wacoWeighted([])).toBe(0);
  });
});

describe("distinctTenants", () => {
  it("counts unique actorKeys", () => {
    const rows = [
      row("trade_item_classified", { actorKey: "org:a" }),
      row("trade_item_classified", { actorKey: "org:a" }),
      row("trade_item_classified", { actorKey: "org:b" }),
      row("scholar_bookmark_saved", { actorKey: "user:x" }),
    ];
    expect(distinctTenants(rows)).toBe(3);
  });
});

describe("productContributions", () => {
  it("always emits all five products, in catalogue order", () => {
    const out = productContributions([]);
    expect(out.map((c) => c.product)).toEqual([
      "comply",
      "trade",
      "atlas",
      "pharos",
      "scholar",
    ]);
    // Every product zeroed when there are no rows.
    for (const c of out) {
      expect(c.weighted).toBe(0);
      expect(c.rawOutcomes).toBe(0);
      expect(c.tenants).toBe(0);
    }
  });

  it("attributes weighted + raw + tenants to the right product", () => {
    const rows = [
      row("trade_license_issued", { actorKey: "org:a" }), // trade, weight 3
      row("trade_item_classified", { actorKey: "org:b" }), // trade, weight 1
      row("comply_assessment_completed", { actorKey: "org:a" }), // comply, weight 2
    ];
    const out = productContributions(rows);
    const trade = out.find((c) => c.product === "trade")!;
    const comply = out.find((c) => c.product === "comply")!;
    expect(trade.weighted).toBe(4); // 3 + 1
    expect(trade.rawOutcomes).toBe(2);
    expect(trade.tenants).toBe(2); // org:a + org:b
    expect(comply.weighted).toBe(2);
    expect(comply.tenants).toBe(1);
  });

  it("counts NCA / document / deadline outcomes toward Comply", () => {
    const rows = [
      row("nca_submission_filed", { actorKey: "user:1" }), // weight 3
      row("document_generated", { actorKey: "user:1" }), // weight 1
      row("deadline_met", { actorKey: "user:2" }), // weight 1
    ];
    const comply = productContributions(rows).find(
      (c) => c.product === "comply",
    )!;
    expect(comply.weighted).toBe(5);
    expect(comply.rawOutcomes).toBe(3);
    expect(comply.tenants).toBe(2);
  });
});

describe("buildPmfMatrix", () => {
  it("groups by product × jurisdiction and computes WoW growth", () => {
    const thisWeek = [
      row("trade_license_issued", { jurisdiction: "DE", actorKey: "org:a" }), // 3
      row("trade_item_classified", { jurisdiction: "DE", actorKey: "org:b" }), // 1
      row("comply_assessment_completed", {
        jurisdiction: "NL",
        actorKey: "org:c",
      }), // 2
    ];
    const priorWeek = [
      // DE trade weighted prior = 2 (one classify=1 + ... actually one classify)
      row("trade_item_classified", { jurisdiction: "DE", actorKey: "org:a" }), // 1
    ];
    const matrix = buildPmfMatrix(thisWeek, priorWeek);

    // The DE×trade cell aggregates 3 + 1 = 4 weighted, 2 tenants.
    const deTrade = matrix.cells.find(
      (c) => c.product === "trade" && c.jurisdiction === "DE",
    )!;
    expect(deTrade.weighted).toBe(4);
    expect(deTrade.rawOutcomes).toBe(2);
    expect(deTrade.tenants).toBe(2);
    // Prior DE×trade weighted was 1 → growth = (4-1)/1 = 3.
    expect(deTrade.wowGrowth).toBe(3);

    // NL×comply is new (no prior) → wowGrowth null.
    const nlComply = matrix.cells.find(
      (c) => c.product === "comply" && c.jurisdiction === "NL",
    )!;
    expect(nlComply.weighted).toBe(2);
    expect(nlComply.wowGrowth).toBeNull();
  });

  it("sorts cells busiest-first and ranks axes by weighted activity", () => {
    const thisWeek = [
      row("trade_license_issued", { jurisdiction: "DE" }), // weighted 3
      row("comply_assessment_completed", { jurisdiction: "FR" }), // weighted 2
      row("scholar_bookmark_saved", { jurisdiction: "NL" }), // weighted 0.25
    ];
    const matrix = buildPmfMatrix(thisWeek, []);
    expect(matrix.cells[0].weighted).toBe(3);
    expect(matrix.cells[matrix.cells.length - 1].weighted).toBe(0.25);
    // Jurisdiction axis ordered by total weighted: DE(3) > FR(2) > NL(0.25).
    expect(matrix.jurisdictions).toEqual(["DE", "FR", "NL"]);
    // Product axis ordered by total weighted: trade(3) > comply(2) > scholar(0.25).
    expect(matrix.products).toEqual(["trade", "comply", "scholar"]);
  });

  it("returns no cells for an empty week", () => {
    const matrix = buildPmfMatrix([], []);
    expect(matrix.cells).toEqual([]);
    expect(matrix.jurisdictions).toEqual([]);
    expect(matrix.products).toEqual([]);
  });

  it("keeps an 'unknown' jurisdiction bucket as its own cell", () => {
    const matrix = buildPmfMatrix(
      [row("trade_item_classified", { jurisdiction: "unknown" })],
      [],
    );
    expect(matrix.cells[0].jurisdiction).toBe("unknown");
  });
});

describe("buildFriction", () => {
  it("computes completion rate and orders worst-first", () => {
    const inputs: FrictionInput[] = [
      {
        product: "comply",
        flowLabel: "Complete assessments",
        started: 100,
        completed: 80,
      }, // 0.8
      {
        product: "trade",
        flowLabel: "Classify items",
        started: 100,
        completed: 20,
      }, // 0.2 (worst)
    ];
    const rows = buildFriction(inputs);
    expect(rows[0].product).toBe("trade");
    expect(rows[0].completionRate).toBeCloseTo(0.2, 10);
    expect(rows[0].dropped).toBe(80);
    expect(rows[1].completionRate).toBeCloseTo(0.8, 10);
  });

  it("drops flows with zero starts (no misleading 0%)", () => {
    const rows = buildFriction([
      { product: "atlas", flowLabel: "x", started: 0, completed: 0 },
      { product: "trade", flowLabel: "y", started: 5, completed: 3 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].product).toBe("trade");
  });

  it("clamps completed to started so a data anomaly never exceeds 100%", () => {
    const rows = buildFriction([
      { product: "comply", flowLabel: "z", started: 10, completed: 15 },
    ]);
    expect(rows[0].completed).toBe(10);
    expect(rows[0].completionRate).toBe(1);
    expect(rows[0].dropped).toBe(0);
  });
});

describe("buildSteering windowing", () => {
  it("counts only this-week rows in the North Star, prior week feeds WoW", () => {
    const rows: ValueOutcomeRow[] = [
      // this week (1 day ago): licence (3) + assessment (2) = 5
      row("trade_license_issued", { occurredAtMs: NOW - 1 * DAY }),
      row("comply_assessment_completed", { occurredAtMs: NOW - 2 * DAY }),
      // prior week (10 days ago): one classify (1)
      row("trade_item_classified", { occurredAtMs: NOW - 10 * DAY }),
      // month-ago week (30 days ago): one classify (1)
      row("trade_item_classified", { occurredAtMs: NOW - 30 * DAY }),
      // far outside any window (60 days ago): ignored
      row("trade_license_issued", { occurredAtMs: NOW - 60 * DAY }),
    ];
    const out = buildSteering({ nowMs: NOW, rows, friction: [] });

    expect(out.northStar.wacoWeighted).toBe(5);
    expect(out.northStar.wacoRawOutcomes).toBe(2);
    // WoW: this 5 vs prior 1 → (5-1)/1 = 4.
    expect(out.northStar.wowChange).toBe(4);
    // MoM: this 5 vs month-ago-week 1 → 4.
    expect(out.northStar.momChange).toBe(4);
  });

  it("uses half-open windows: now-7d is INCLUDED in this week, now is EXCLUDED", () => {
    // Lower bound is inclusive (thisFrom = now-7d), upper bound is exclusive
    // (nowMs). So a row at exactly now-7d counts THIS week; a row at exactly now
    // does not (it would be a future-edge tick).
    const atLowerBound = buildSteering({
      nowMs: NOW,
      rows: [row("trade_license_issued", { occurredAtMs: NOW - 7 * DAY })],
      friction: [],
    });
    expect(atLowerBound.northStar.wacoRawOutcomes).toBe(1);

    const atUpperBound = buildSteering({
      nowMs: NOW,
      rows: [row("trade_license_issued", { occurredAtMs: NOW })],
      friction: [],
    });
    expect(atUpperBound.northStar.wacoRawOutcomes).toBe(0);
  });

  it("emits a generatedAt + asOf derived from nowMs", () => {
    const out = buildSteering({ nowMs: NOW, rows: [], friction: [] });
    expect(out.generatedAt).toBe(new Date(NOW).toISOString());
    expect(out.asOf).toBe("2026-06-09");
  });

  it("wires friction through into the response", () => {
    const out = buildSteering({
      nowMs: NOW,
      rows: [],
      friction: [
        { product: "trade", flowLabel: "Classify", started: 10, completed: 4 },
      ],
    });
    expect(out.friction).toHaveLength(1);
    expect(out.friction[0].completionRate).toBeCloseTo(0.4, 10);
  });
});

describe("isSteeringEmpty", () => {
  it("is empty when no outcomes, no PMF cells, and no friction", () => {
    const out = buildSteering({ nowMs: NOW, rows: [], friction: [] });
    expect(isSteeringEmpty(out)).toBe(true);
  });

  it("is NOT empty when there is at least one outcome", () => {
    const out = buildSteering({
      nowMs: NOW,
      rows: [row("trade_item_classified")],
      friction: [],
    });
    expect(isSteeringEmpty(out)).toBe(false);
  });

  it("is NOT empty when only friction has data (started>0)", () => {
    const out = buildSteering({
      nowMs: NOW,
      rows: [],
      friction: [
        { product: "comply", flowLabel: "x", started: 3, completed: 1 },
      ],
    });
    expect(isSteeringEmpty(out)).toBe(false);
  });
});
