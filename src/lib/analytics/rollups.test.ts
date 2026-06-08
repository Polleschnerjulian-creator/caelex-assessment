/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the PURE analytics rollup arithmetic (`./rollups`).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Hand-built fixtures only — no Prisma, no clock, no DOM. We test the
 * deterministic math the nightly crons depend on:
 *   - isoWeekStart (pure UTC week boundary)
 *   - reconstructPathEdges (session journey → weighted directed graph)
 *   - computeRetentionGrid (cohort × activity-week × scope)
 *   - computeFunnelDaily + DEFAULT_FUNNELS (per-day funnel reduction)
 *   - averageDwellByFeature (mean ms → seconds @ 1dp)
 *
 * NOTE on normalizePath: it is owned by the sibling `./feature-map` lane. These
 * tests treat it as a black box with only the two guarantees the contract makes
 * (lowercase; id-looking segments collapse to a single `:id` token). We therefore
 * assert the id-COLLAPSE *property* (two different cuids under the same route map
 * to ONE edge) rather than hardcoding the exact normalised literal, so the tests
 * stay robust to the other lane's implementation details.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  isoWeekStart,
  reconstructPathEdges,
  computeRetentionGrid,
  computeFunnelDaily,
  averageDwellByFeature,
  DEFAULT_FUNNELS,
  type PageHit,
  type SignupRow,
  type ActivityRow,
  type FunnelEvent,
  type FunnelDef,
} from "./rollups";
import { normalizePath } from "./feature-map";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a UTC Date succinctly (month is 1-based here for readability). */
function utc(
  y: number,
  mo: number,
  d: number,
  h = 0,
  mi = 0,
  s = 0,
  ms = 0,
): Date {
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms));
}

/** ISO string of the UTC-midnight week for assertions. */
function iso(d: Date): string {
  return d.toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// isoWeekStart
// ─────────────────────────────────────────────────────────────────────────────

describe("isoWeekStart", () => {
  it("maps a Wednesday to the Monday 00:00Z of its ISO week", () => {
    // 2026-06-10 is a Wednesday → ISO week Monday is 2026-06-08.
    const wed = utc(2026, 6, 10, 13, 37, 12, 500);
    expect(iso(isoWeekStart(wed))).toBe("2026-06-08T00:00:00.000Z");
  });

  it("maps a Sunday to the PREVIOUS Monday (ISO weeks end on Sunday)", () => {
    // 2026-06-14 is a Sunday → its ISO week started Monday 2026-06-08.
    const sun = utc(2026, 6, 14, 23, 59, 59, 999);
    expect(iso(isoWeekStart(sun))).toBe("2026-06-08T00:00:00.000Z");
  });

  it("is idempotent on a Monday (and zeroes any time component)", () => {
    const mon = utc(2026, 6, 8, 9, 0, 0, 0);
    const once = isoWeekStart(mon);
    expect(iso(once)).toBe("2026-06-08T00:00:00.000Z");
    // Idempotent: re-applying yields the same instant.
    expect(iso(isoWeekStart(once))).toBe("2026-06-08T00:00:00.000Z");
  });

  it("crosses a month boundary correctly", () => {
    // 2026-03-01 is a Sunday → ISO week Monday is 2026-02-23.
    const sun = utc(2026, 3, 1, 6, 0, 0, 0);
    expect(iso(isoWeekStart(sun))).toBe("2026-02-23T00:00:00.000Z");
  });

  it("crosses a year boundary correctly", () => {
    // 2027-01-01 is a Friday → ISO week Monday is 2026-12-28.
    const fri = utc(2027, 1, 1, 12, 0, 0, 0);
    expect(iso(isoWeekStart(fri))).toBe("2026-12-28T00:00:00.000Z");
  });

  it("does not mutate its input", () => {
    const wed = utc(2026, 6, 10, 13, 37);
    const before = wed.getTime();
    isoWeekStart(wed);
    expect(wed.getTime()).toBe(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// reconstructPathEdges
// ─────────────────────────────────────────────────────────────────────────────

describe("reconstructPathEdges", () => {
  it("turns a 3-page session into entry→p1→p2→p3→exit", () => {
    const hits: PageHit[] = [
      {
        sessionId: "s1",
        timestamp: utc(2026, 6, 8, 10, 0, 0),
        path: "/atlas",
        product: "atlas",
      },
      {
        sessionId: "s1",
        timestamp: utc(2026, 6, 8, 10, 1, 0),
        path: "/atlas/search",
        product: "atlas",
      },
      {
        sessionId: "s1",
        timestamp: utc(2026, 6, 8, 10, 2, 0),
        path: "/atlas/cases",
        product: "atlas",
      },
    ];
    const rows = reconstructPathEdges(hits);

    const p1 = normalizePath("/atlas");
    const p2 = normalizePath("/atlas/search");
    const p3 = normalizePath("/atlas/cases");

    // 4 edges: entry→p1, p1→p2, p2→p3, p3→exit.
    expect(rows).toHaveLength(4);
    const find = (from: string, to: string) =>
      rows.find((r) => r.fromPath === from && r.toPath === to);

    expect(find("(entry)", p1)).toMatchObject({
      product: "atlas",
      transitions: 1,
    });
    expect(find(p1, p2)).toMatchObject({ product: "atlas", transitions: 1 });
    expect(find(p2, p3)).toMatchObject({ product: "atlas", transitions: 1 });
    expect(find(p3, "(exit)")).toMatchObject({
      product: "atlas",
      transitions: 1,
    });
  });

  it("sorts each session by timestamp before walking (out-of-order input)", () => {
    // Feed hits out of chronological order; the walk must still be a→b→c.
    const hits: PageHit[] = [
      {
        sessionId: "s1",
        timestamp: utc(2026, 6, 8, 10, 2, 0),
        path: "/c",
        product: "comply",
      },
      {
        sessionId: "s1",
        timestamp: utc(2026, 6, 8, 10, 0, 0),
        path: "/a",
        product: "comply",
      },
      {
        sessionId: "s1",
        timestamp: utc(2026, 6, 8, 10, 1, 0),
        path: "/b",
        product: "comply",
      },
    ];
    const rows = reconstructPathEdges(hits);
    const a = normalizePath("/a");
    const b = normalizePath("/b");
    const c = normalizePath("/c");
    const has = (from: string, to: string) =>
      rows.some((r) => r.fromPath === from && r.toPath === to);

    expect(has("(entry)", a)).toBe(true);
    expect(has(a, b)).toBe(true);
    expect(has(b, c)).toBe(true);
    expect(has(c, "(exit)")).toBe(true);
  });

  it("sums a shared edge across two sessions", () => {
    const mk = (sid: string): PageHit[] => [
      {
        sessionId: sid,
        timestamp: utc(2026, 6, 8, 10, 0, 0),
        path: "/dashboard",
        product: "comply",
      },
      {
        sessionId: sid,
        timestamp: utc(2026, 6, 8, 10, 1, 0),
        path: "/dashboard/modules",
        product: "comply",
      },
    ];
    const rows = reconstructPathEdges([...mk("s1"), ...mk("s2")]);

    const from = normalizePath("/dashboard");
    const to = normalizePath("/dashboard/modules");
    const edge = rows.find((r) => r.fromPath === from && r.toPath === to);
    // Two sessions each traverse dashboard→modules → transitions = 2.
    expect(edge?.transitions).toBe(2);
    // entry→dashboard also appears twice.
    expect(
      rows.find((r) => r.fromPath === "(entry)" && r.toPath === from)
        ?.transitions,
    ).toBe(2);
  });

  it("normalizes ids so two different cuids under the same route collapse", () => {
    const cuidA = "c" + "a".repeat(24); // cuid-shaped, ≥20 chars
    const cuidB = "c" + "b".repeat(24);
    const hits: PageHit[] = [
      {
        sessionId: "s1",
        timestamp: utc(2026, 6, 8, 10, 0, 0),
        path: `/atlas/cases/${cuidA}`,
        product: "atlas",
      },
      {
        sessionId: "s2",
        timestamp: utc(2026, 6, 8, 10, 0, 0),
        path: `/atlas/cases/${cuidB}`,
        product: "atlas",
      },
    ];
    const rows = reconstructPathEdges(hits);

    // Both sessions: (entry)→/atlas/cases/:id and /atlas/cases/:id→(exit).
    // Because the ids normalise to the SAME token, each synthetic edge is shared.
    const collapsed = normalizePath(`/atlas/cases/${cuidA}`);
    // Sanity: the two raw paths normalise identically (the property under test).
    expect(normalizePath(`/atlas/cases/${cuidB}`)).toBe(collapsed);

    const entryEdge = rows.find(
      (r) => r.fromPath === "(entry)" && r.toPath === collapsed,
    );
    const exitEdge = rows.find(
      (r) => r.fromPath === collapsed && r.toPath === "(exit)",
    );
    expect(entryEdge?.transitions).toBe(2);
    expect(exitEdge?.transitions).toBe(2);
    // Only two distinct edges total (entry→X, X→exit) — ids did NOT explode it.
    expect(rows).toHaveLength(2);
  });

  it("attributes each edge's product to its FROM hit", () => {
    // A session that lands on marketing then crosses into atlas. The entry edge
    // and the marketing→atlas edge are attributed to the FROM product.
    const hits: PageHit[] = [
      {
        sessionId: "s1",
        timestamp: utc(2026, 6, 8, 10, 0, 0),
        path: "/pricing",
        product: "marketing",
      },
      {
        sessionId: "s1",
        timestamp: utc(2026, 6, 8, 10, 1, 0),
        path: "/atlas",
        product: "atlas",
      },
    ];
    const rows = reconstructPathEdges(hits);
    const pricing = normalizePath("/pricing");
    const atlas = normalizePath("/atlas");

    // entry edge attributed to the LANDING (first hit) product = marketing.
    expect(
      rows.find((r) => r.fromPath === "(entry)" && r.toPath === pricing)
        ?.product,
    ).toBe("marketing");
    // marketing → atlas edge attributed to the FROM product = marketing.
    expect(
      rows.find((r) => r.fromPath === pricing && r.toPath === atlas)?.product,
    ).toBe("marketing");
    // atlas → exit edge attributed to atlas (the last hit's product).
    expect(
      rows.find((r) => r.fromPath === atlas && r.toPath === "(exit)")?.product,
    ).toBe("atlas");
  });

  it("keeps only the top-N edges when maxEdges is set (heaviest first)", () => {
    // Build a busy day: edge A traversed 3×, edge B 2×, edge C 1×.
    const sess = (sid: string, from: string, to: string): PageHit[] => [
      {
        sessionId: sid,
        timestamp: utc(2026, 6, 8, 10, 0, 0),
        path: from,
        product: "comply",
      },
      {
        sessionId: sid,
        timestamp: utc(2026, 6, 8, 10, 1, 0),
        path: to,
        product: "comply",
      },
    ];
    const hits: PageHit[] = [
      ...sess("a1", "/x", "/y"), // A
      ...sess("a2", "/x", "/y"), // A
      ...sess("a3", "/x", "/y"), // A
      ...sess("b1", "/p", "/q"), // B
      ...sess("b2", "/p", "/q"), // B
      ...sess("c1", "/m", "/n"), // C
    ];

    const xy = { from: normalizePath("/x"), to: normalizePath("/y") };
    const pq = { from: normalizePath("/p"), to: normalizePath("/q") };

    // Top-2 by weight must be the A-edge (3) and B-edge (2) — but note synthetic
    // entry/exit edges also exist; we assert the two HEAVIEST middle edges win.
    const all = reconstructPathEdges(hits);
    const xyW = all.find(
      (r) => r.fromPath === xy.from && r.toPath === xy.to,
    )!.transitions;
    const pqW = all.find(
      (r) => r.fromPath === pq.from && r.toPath === pq.to,
    )!.transitions;
    expect(xyW).toBe(3);
    expect(pqW).toBe(2);

    const top2 = reconstructPathEdges(hits, { maxEdges: 2 });
    expect(top2).toHaveLength(2);
    // THREE edges share the max weight 3 — (entry)→/x, /x→/y, /y→(exit) — because
    // each of the three A-sessions contributes one of each (the synthetic entry/exit
    // sentinels weigh the same as the middle hop). maxEdges:2 therefore keeps TWO of
    // those weight-3 edges, heaviest-first, and never a lighter edge.
    expect(top2[0].transitions).toBe(3);
    expect(top2[1].transitions).toBe(3);
    // Sorted descending, and every kept edge dominates every dropped edge.
    expect(top2[0].transitions).toBeGreaterThanOrEqual(top2[1].transitions);
    const dropped = all.filter(
      (r) =>
        !top2.some(
          (t) =>
            t.product === r.product &&
            t.fromPath === r.fromPath &&
            t.toPath === r.toPath,
        ),
    );
    for (const d of dropped) {
      expect(d.transitions).toBeLessThanOrEqual(top2[1].transitions);
    }
  });

  it("returns an empty array for no hits", () => {
    expect(reconstructPathEdges([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeRetentionGrid
// ─────────────────────────────────────────────────────────────────────────────

describe("computeRetentionGrid", () => {
  // Two cohorts across three weeks.
  const W0 = isoWeekStart(utc(2026, 6, 8)); // Mon 2026-06-08
  const W1 = isoWeekStart(utc(2026, 6, 15)); // Mon 2026-06-15
  const W2 = isoWeekStart(utc(2026, 6, 22)); // Mon 2026-06-22

  const scopes = ["all", "comply", "trade", "atlas"];

  it("computes cohortSize, full week-0, and decaying later-week retention", () => {
    // Cohort W0: users u1, u2, u3 (size 3). Cohort W1: user u4 (size 1).
    const signups: SignupRow[] = [
      { userId: "u1", cohortWeek: W0 },
      { userId: "u2", cohortWeek: W0 },
      { userId: "u3", cohortWeek: W0 },
      { userId: "u4", cohortWeek: W1 },
    ];
    // Activity:
    //  - W0: u1,u2,u3 all active (week-0 = full cohort).
    //  - W1: only u1,u2 return (comply).  u4 active in its own week-0.
    //  - W2: only u1 returns (atlas).
    const activity: ActivityRow[] = [
      { userId: "u1", activityWeek: W0, product: "comply" },
      { userId: "u2", activityWeek: W0, product: "comply" },
      { userId: "u3", activityWeek: W0, product: "trade" },
      { userId: "u1", activityWeek: W1, product: "comply" },
      { userId: "u2", activityWeek: W1, product: "comply" },
      { userId: "u4", activityWeek: W1, product: "comply" },
      { userId: "u1", activityWeek: W2, product: "atlas" },
    ];

    const cells = computeRetentionGrid(signups, activity, scopes);

    const cell = (
      cohort: Date,
      scope: string,
      activityWk: Date,
    ): RetentionCellLike | undefined =>
      cells.find(
        (c) =>
          c.cohortWeek.getTime() === cohort.getTime() &&
          c.productScope === scope &&
          c.activityWeek.getTime() === activityWk.getTime(),
      );

    // cohortSize is stable per cohort across scopes + weeks.
    expect(cell(W0, "all", W0)?.cohortSize).toBe(3);
    expect(cell(W0, "comply", W1)?.cohortSize).toBe(3);
    expect(cell(W1, "all", W1)?.cohortSize).toBe(1);

    // Week-0 (all) = the full cohort returned (weeksSince 0).
    expect(cell(W0, "all", W0)).toMatchObject({
      returnedUsers: 3,
      weeksSince: 0,
    });

    // Week-1 (all) for cohort W0: only u1,u2 returned → 2.
    expect(cell(W0, "all", W1)).toMatchObject({
      returnedUsers: 2,
      weeksSince: 1,
    });

    // Week-2 (all) for cohort W0: only u1 → 1, weeksSince 2.
    expect(cell(W0, "all", W2)).toMatchObject({
      returnedUsers: 1,
      weeksSince: 2,
    });

    // Cohort W1 week-0: u4 returned → 1.
    expect(cell(W1, "all", W1)).toMatchObject({
      returnedUsers: 1,
      weeksSince: 0,
    });
  });

  it("filters returnedUsers by product scope", () => {
    const signups: SignupRow[] = [
      { userId: "u1", cohortWeek: W0 },
      { userId: "u2", cohortWeek: W0 },
      { userId: "u3", cohortWeek: W0 },
    ];
    // In W1: u1 active in comply, u2 active in trade, u3 active in atlas.
    const activity: ActivityRow[] = [
      { userId: "u1", activityWeek: W0, product: "comply" },
      { userId: "u2", activityWeek: W0, product: "trade" },
      { userId: "u3", activityWeek: W0, product: "atlas" },
      { userId: "u1", activityWeek: W1, product: "comply" },
      { userId: "u2", activityWeek: W1, product: "trade" },
      { userId: "u3", activityWeek: W1, product: "atlas" },
    ];

    const cells = computeRetentionGrid(signups, activity, scopes);
    const cell = (scope: string, activityWk: Date) =>
      cells.find(
        (c) =>
          c.cohortWeek.getTime() === W0.getTime() &&
          c.productScope === scope &&
          c.activityWeek.getTime() === activityWk.getTime(),
      );

    // W1 "all" = 3 (everyone did something). Per-product = 1 each.
    expect(cell("all", W1)?.returnedUsers).toBe(3);
    expect(cell("comply", W1)?.returnedUsers).toBe(1);
    expect(cell("trade", W1)?.returnedUsers).toBe(1);
    expect(cell("atlas", W1)?.returnedUsers).toBe(1);
  });

  it("never emits a cell with activityWeek < cohortWeek", () => {
    // u4 signs up in W1 but has (impossible-in-practice) activity in W0; it must
    // be ignored, and no W4-cohort cell may reference an earlier activity week.
    const signups: SignupRow[] = [{ userId: "u4", cohortWeek: W1 }];
    const activity: ActivityRow[] = [
      { userId: "u4", activityWeek: W0, product: "comply" }, // before signup → dropped
      { userId: "u4", activityWeek: W1, product: "comply" },
    ];
    const cells = computeRetentionGrid(signups, activity, scopes);

    for (const c of cells) {
      expect(c.activityWeek.getTime()).toBeGreaterThanOrEqual(
        c.cohortWeek.getTime(),
      );
    }
    // The dropped pre-signup activity did not create a W0 column for the W1 cohort.
    expect(
      cells.some(
        (c) =>
          c.cohortWeek.getTime() === W1.getTime() &&
          c.activityWeek.getTime() === W0.getTime(),
      ),
    ).toBe(false);
  });

  it("returns no cells when there are no signups", () => {
    expect(computeRetentionGrid([], [], scopes)).toEqual([]);
  });

  it("still emits later-week columns when scopes omit 'all'", () => {
    // Regression: the activity-week column set must be the UNION across every
    // scope, not just "all". With a per-product-only scopes array, a real week-1
    // return must still produce a week-1 cell (previously these silently vanished
    // because the column set was keyed off the absent "all" map).
    const signups: SignupRow[] = [{ userId: "u1", cohortWeek: W0 }];
    const activity: ActivityRow[] = [
      { userId: "u1", activityWeek: W0, product: "comply" },
      { userId: "u1", activityWeek: W1, product: "comply" }, // genuine week-1 return
    ];

    const cells = computeRetentionGrid(signups, activity, ["comply", "trade"]);

    const complyW1 = cells.find(
      (c) =>
        c.cohortWeek.getTime() === W0.getTime() &&
        c.productScope === "comply" &&
        c.activityWeek.getTime() === W1.getTime(),
    );
    expect(complyW1).toMatchObject({ returnedUsers: 1, weeksSince: 1 });

    // The week-1 column is shared across ALL scopes (dense grid), so the trade
    // scope also has a week-1 cell — with 0 returned, not a missing row.
    const tradeW1 = cells.find(
      (c) =>
        c.cohortWeek.getTime() === W0.getTime() &&
        c.productScope === "trade" &&
        c.activityWeek.getTime() === W1.getTime(),
    );
    expect(tradeW1).toMatchObject({ returnedUsers: 0, weeksSince: 1 });
  });
});

/** Structural shape used by the cohort assertions above. */
type RetentionCellLike = {
  cohortWeek: Date;
  productScope: string;
  activityWeek: Date;
  cohortSize: number;
  returnedUsers: number;
  weeksSince: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// computeFunnelDaily
// ─────────────────────────────────────────────────────────────────────────────

describe("computeFunnelDaily", () => {
  // A 3-step funnel we control entirely.
  const funnel: FunnelDef = {
    funnelId: "test_funnel",
    product: "trade",
    steps: [
      { stepKey: "s0", eventTypes: ["e0"] },
      { stepKey: "s1", eventTypes: ["e1"] },
      { stepKey: "s2", eventTypes: ["e2"] },
    ],
  };

  it("counts entered/completed per step and the median ms-to-next", () => {
    // 3 subjects enter step0; 2 reach step1; 1 reaches step2.
    //  - A: e0@0s, e1@+10s, e2@+30s   (full funnel)
    //  - B: e0@0s, e1@+20s            (stops at step1)
    //  - C: e0@0s                     (stops at step0)
    const base = utc(2026, 6, 8, 12, 0, 0).getTime();
    const at = (ms: number) => new Date(base + ms);
    const events: FunnelEvent[] = [
      { subject: "A", eventType: "e0", timestamp: at(0) },
      { subject: "A", eventType: "e1", timestamp: at(10_000) },
      { subject: "A", eventType: "e2", timestamp: at(30_000) },
      { subject: "B", eventType: "e0", timestamp: at(0) },
      { subject: "B", eventType: "e1", timestamp: at(20_000) },
      { subject: "C", eventType: "e0", timestamp: at(0) },
    ];

    const rows = computeFunnelDaily(events, [funnel]);
    expect(rows).toHaveLength(3); // dense: one row per step

    const step = (k: number) => rows.find((r) => r.step === k)!;

    // Step 0: all 3 entered; A and B completed to step1 (deltas 10s, 20s).
    expect(step(0)).toMatchObject({
      stepKey: "s0",
      usersEntered: 3,
      usersCompleted: 2,
    });
    // median of [10000, 20000] = 15000.
    expect(step(0).medianMsToNext).toBe(15_000);

    // Step 1: A and B entered; only A completed to step2 (delta 20s).
    expect(step(1)).toMatchObject({
      stepKey: "s1",
      usersEntered: 2,
      usersCompleted: 1,
    });
    // single completion → median = that delta (30s - 10s = 20s).
    expect(step(1).medianMsToNext).toBe(20_000);

    // Step 2 (terminal): only A entered; no next → completed 0, median null.
    expect(step(2)).toMatchObject({
      stepKey: "s2",
      usersEntered: 1,
      usersCompleted: 0,
      medianMsToNext: null,
    });

    // product carried through.
    expect(step(0).product).toBe("trade");
  });

  it("does NOT count a completion when the next-step ts precedes this step", () => {
    // Subject X hits e1 BEFORE e0 → not a forward progression → step0 not completed.
    const base = utc(2026, 6, 8, 12, 0, 0).getTime();
    const at = (ms: number) => new Date(base + ms);
    const events: FunnelEvent[] = [
      { subject: "X", eventType: "e1", timestamp: at(0) }, // next-step event first
      { subject: "X", eventType: "e0", timestamp: at(10_000) }, // this-step event later
    ];

    const rows = computeFunnelDaily(events, [funnel]);
    const step0 = rows.find((r) => r.step === 0)!;
    const step1 = rows.find((r) => r.step === 1)!;

    // X entered both steps...
    expect(step0.usersEntered).toBe(1);
    expect(step1.usersEntered).toBe(1);
    // ...but step0 completion requires firstNextTs >= firstThisTs; here the e1 at
    // 0s is BEFORE the e0 at 10s, so X is NOT a step0 completion.
    expect(step0.usersCompleted).toBe(0);
    expect(step0.medianMsToNext).toBeNull();
  });

  it("emits dense zero-rows when no subject enters", () => {
    const rows = computeFunnelDaily([], [funnel]);
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(r.usersEntered).toBe(0);
      expect(r.usersCompleted).toBe(0);
      expect(r.medianMsToNext).toBeNull();
    }
  });

  it("counts a subject who triggers two next-step events using the EARLIEST", () => {
    // A enters step0 once, then step1 twice; the FIRST step1 ts is used for the delta.
    const base = utc(2026, 6, 8, 12, 0, 0).getTime();
    const at = (ms: number) => new Date(base + ms);
    const events: FunnelEvent[] = [
      { subject: "A", eventType: "e0", timestamp: at(0) },
      { subject: "A", eventType: "e1", timestamp: at(5_000) }, // earliest e1
      { subject: "A", eventType: "e1", timestamp: at(50_000) },
    ];
    const rows = computeFunnelDaily(events, [funnel]);
    const step0 = rows.find((r) => r.step === 0)!;
    expect(step0.usersCompleted).toBe(1);
    // delta uses the EARLIEST e1 (5s), not the later one.
    expect(step0.medianMsToNext).toBe(5_000);
  });
});

describe("DEFAULT_FUNNELS", () => {
  it("contains exactly the three contract funnels with the exact ids", () => {
    expect(DEFAULT_FUNNELS).toHaveLength(3);
    expect(DEFAULT_FUNNELS.map((f) => f.funnelId)).toEqual([
      "growth",
      "trade_classify_to_license",
      "comply_activation",
    ]);
  });

  it("growth funnel: null product, exact step keys + event types incl. legacy duality", () => {
    const growth = DEFAULT_FUNNELS.find((f) => f.funnelId === "growth")!;
    expect(growth.product).toBeNull();
    expect(growth.steps.map((s) => s.stepKey)).toEqual([
      "acq_visit",
      "signup",
      "activation",
    ]);
    expect(growth.steps[0].eventTypes).toEqual([
      "acq_page_viewed",
      "page_viewed",
      "page_view", // legacy duality MUST be present
    ]);
    expect(growth.steps[1].eventTypes).toEqual([
      "signup",
      "acq_signup_completed",
    ]);
    expect(growth.steps[2].eventTypes).toEqual([
      "feature_used",
      "comply_module_opened",
      "atlas_search_ran",
      "trade_classify_started",
      "scholar_source_read",
      "pharos_oversight_initiated",
    ]);
  });

  it("trade_classify_to_license funnel: product trade, exact steps", () => {
    const f = DEFAULT_FUNNELS.find(
      (x) => x.funnelId === "trade_classify_to_license",
    )!;
    expect(f.product).toBe("trade");
    expect(f.steps.map((s) => s.stepKey)).toEqual([
      "classify_started",
      "classify_completed",
      "license_granted",
    ]);
    expect(f.steps[0].eventTypes).toEqual(["trade_classify_started"]);
    expect(f.steps[1].eventTypes).toEqual(["trade_classify_completed"]);
    expect(f.steps[2].eventTypes).toEqual(["trade_license_granted"]);
  });

  it("comply_activation funnel: product comply, exact steps", () => {
    const f = DEFAULT_FUNNELS.find((x) => x.funnelId === "comply_activation")!;
    expect(f.product).toBe("comply");
    expect(f.steps.map((s) => s.stepKey)).toEqual([
      "signup",
      "module_opened",
      "assessment_completed",
    ]);
    expect(f.steps[0].eventTypes).toEqual(["signup"]);
    expect(f.steps[1].eventTypes).toEqual(["comply_module_opened"]);
    expect(f.steps[2].eventTypes).toEqual(["comply_assessment_completed"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// averageDwellByFeature
// ─────────────────────────────────────────────────────────────────────────────

describe("averageDwellByFeature", () => {
  it("computes the mean per feature in seconds with 1dp + sampleCount", () => {
    const out = averageDwellByFeature([
      { featureId: "atlas:search", durationMs: 1000 },
      { featureId: "atlas:search", durationMs: 2000 },
      { featureId: "atlas:search", durationMs: 3000 }, // mean 2000ms → 2.0s, n=3
      { featureId: "comply:module:debris", durationMs: 4500 }, // 4.5s, n=1
    ]);

    const byId = Object.fromEntries(out.map((d) => [d.featureId, d]));
    expect(byId["atlas:search"]).toEqual({
      featureId: "atlas:search",
      avgDurationSecs: 2.0,
      sampleCount: 3,
    });
    expect(byId["comply:module:debris"]).toEqual({
      featureId: "comply:module:debris",
      avgDurationSecs: 4.5,
      sampleCount: 1,
    });
  });

  it("rounds to one decimal place (banker-free Math.round)", () => {
    // mean = (1234 + 5678) / 2 = 3456 ms = 3.456 s → round1dp → 3.5.
    const out = averageDwellByFeature([
      { featureId: "f", durationMs: 1234 },
      { featureId: "f", durationMs: 5678 },
    ]);
    expect(out[0].avgDurationSecs).toBe(3.5);
    expect(out[0].sampleCount).toBe(2);
  });

  it("returns an empty array for no samples", () => {
    expect(averageDwellByFeature([])).toEqual([]);
  });
});
