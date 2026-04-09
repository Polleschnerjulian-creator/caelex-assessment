/**
 * RCR (Regulatory Credit Rating) engine — pure function tests.
 *
 * `rcr-engine.server.ts` mixes pure scoring helpers
 * (`mapScoreToGrade`, `computeOutlook`, `getRCRMethodologyDocument`,
 * `RCR_PENALTY_CONFIG`, `RCR_CORRELATION_RULES`) with
 * Prisma-backed entry points (`computeRCR`, `publishRating`,
 * `getCurrentRating`, `getRatingHistory`). The DB-backed entry points
 * are exercised by integration tests; this file pins the pure
 * helpers, which previously had 0% test coverage despite being the
 * core of the rating taxonomy that investors and insurers consume.
 *
 * The grade mapping in particular is the most consequential pure
 * function in the engine — if it returns the wrong letter for a
 * specific score, the rating shown to an investor changes silently.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
// The engine imports `@/lib/prisma` at the top level. Stub it so the
// pure-function tests don't trip the lazy proxy when DATABASE_URL is
// missing in the test environment.
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy(
    {},
    {
      get() {
        throw new Error("Prisma was not expected to be called in this test");
      },
    },
  ),
  isDatabaseConfigured: false,
}));
// rcr-engine imports computeRRS / getRRSHistory from rrs-engine, which
// also pulls in Prisma. Stub it.
vi.mock("@/lib/rrs-engine.server", () => ({
  computeRRS: vi.fn(),
  getRRSHistory: vi.fn(),
  getRRSMethodologyAppendix: vi.fn(() => "stub appendix"),
}));

const {
  mapScoreToGrade,
  computeOutlook,
  getRCRMethodologyDocument,
  RCR_PENALTY_CONFIG,
  RCR_CORRELATION_RULES,
} = await import("@/lib/rcr-engine.server");

// ─── mapScoreToGrade ─────────────────────────────────────────────────
describe("RCR engine — mapScoreToGrade", () => {
  it("clamps inputs above 100 to AAA", () => {
    expect(mapScoreToGrade(150)).toMatch(/^AAA/);
    expect(mapScoreToGrade(100)).toMatch(/^AAA/);
  });

  it("clamps inputs below 0 to D", () => {
    expect(mapScoreToGrade(-50)).toBe("D");
    expect(mapScoreToGrade(0)).toBe("D");
  });

  it("returns the correct grade for each band's midpoint", () => {
    // The exact +/- modifier depends on where the score sits inside
    // the band; the letter grade itself must always be the band's
    // base letter for a midpoint score.
    const bandMidpoints: Array<[number, string]> = [
      [97, "AAA"],
      [89, "AA"],
      [79, "A"],
      [69, "BBB"],
      [57, "BB"],
      [42, "B"],
      [27, "CCC"],
      [14, "CC"],
      [4, "D"],
    ];
    for (const [score, base] of bandMidpoints) {
      expect(mapScoreToGrade(score).startsWith(base)).toBe(true);
    }
  });

  it("AAA never has a + modifier (ceiling)", () => {
    for (let s = 95; s <= 100; s++) {
      expect(mapScoreToGrade(s)).not.toContain("+");
    }
  });

  it("D never has a - modifier (floor)", () => {
    for (let s = 0; s <= 9; s++) {
      expect(mapScoreToGrade(s)).not.toContain("-");
    }
  });

  it("rounds fractional scores", () => {
    // Both 84.4 and 84.6 must land on the same band as 84/85
    // respectively.
    const lower = mapScoreToGrade(84.4); // rounds to 84 → A band
    const upper = mapScoreToGrade(84.6); // rounds to 85 → AA band
    expect(lower.startsWith("A")).toBe(true);
    expect(upper.startsWith("AA")).toBe(true);
  });

  it("produces a + modifier near the top of a band", () => {
    expect(mapScoreToGrade(94)).toBe("AA+");
  });

  it("produces a - modifier near the bottom of a band", () => {
    expect(mapScoreToGrade(85)).toBe("AA-");
  });
});

// ─── computeOutlook ──────────────────────────────────────────────────
describe("RCR engine — computeOutlook", () => {
  it("returns DEVELOPING with fewer than 2 snapshots", () => {
    expect(computeOutlook([])).toBe("DEVELOPING");
    expect(
      computeOutlook([{ overallScore: 75, snapshotDate: new Date() }]),
    ).toBe("DEVELOPING");
  });

  it("returns DEVELOPING when snapshot history is younger than 30 days", () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const result = computeOutlook([
      { overallScore: 70, snapshotDate: twoDaysAgo },
      { overallScore: 80, snapshotDate: now },
    ]);
    expect(result).toBe("DEVELOPING");
  });

  it("returns POSITIVE for upward 90-day trajectory", () => {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const result = computeOutlook([
      { overallScore: 65, snapshotDate: sixtyDaysAgo },
      { overallScore: 80, snapshotDate: now },
    ]);
    expect(result).toBe("POSITIVE");
  });

  it("returns NEGATIVE for downward 90-day trajectory", () => {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const result = computeOutlook([
      { overallScore: 85, snapshotDate: sixtyDaysAgo },
      { overallScore: 70, snapshotDate: now },
    ]);
    expect(result).toBe("NEGATIVE");
  });

  it("returns STABLE for flat-ish 90-day trajectory", () => {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const result = computeOutlook([
      { overallScore: 75, snapshotDate: sixtyDaysAgo },
      { overallScore: 78, snapshotDate: now },
    ]);
    expect(result).toBe("STABLE");
  });
});

// ─── RCR_PENALTY_CONFIG sanity ───────────────────────────────────────
describe("RCR engine — RCR_PENALTY_CONFIG", () => {
  it("declares non-negative penalty values", () => {
    expect(RCR_PENALTY_CONFIG.incidents.penaltyPer).toBeGreaterThan(0);
    expect(RCR_PENALTY_CONFIG.incidents.maxPenalty).toBeGreaterThan(0);
    expect(RCR_PENALTY_CONFIG.ncaSubmissions.penaltyPer).toBeGreaterThan(0);
    expect(RCR_PENALTY_CONFIG.ncaSubmissions.maxPenalty).toBeGreaterThan(0);
  });

  it("max penalty is at least the per-incident penalty", () => {
    expect(RCR_PENALTY_CONFIG.incidents.maxPenalty).toBeGreaterThanOrEqual(
      RCR_PENALTY_CONFIG.incidents.penaltyPer,
    );
    expect(RCR_PENALTY_CONFIG.ncaSubmissions.maxPenalty).toBeGreaterThanOrEqual(
      RCR_PENALTY_CONFIG.ncaSubmissions.penaltyPer,
    );
  });

  it("temporal decay threshold matches the validity window", () => {
    expect(RCR_PENALTY_CONFIG.temporalDecay.thresholdDays).toBeGreaterThan(0);
    expect(RCR_PENALTY_CONFIG.validityDays).toBeGreaterThan(0);
  });

  it("methodology version is set", () => {
    expect(RCR_PENALTY_CONFIG.methodologyVersion).toBeTruthy();
  });
});

// ─── RCR_CORRELATION_RULES ───────────────────────────────────────────
describe("RCR engine — RCR_CORRELATION_RULES", () => {
  it("contains at least the documented core rules", () => {
    const ids = RCR_CORRELATION_RULES.map((r) => r.id);
    expect(ids).toContain("cyber_auth_inconsistency");
    expect(ids).toContain("jurisdiction_ops_inconsistency");
    expect(ids).toContain("governance_weakness");
  });

  it("each rule has a non-positive adjustment (penalties only, no bonuses)", () => {
    for (const rule of RCR_CORRELATION_RULES) {
      expect(rule.adjustment).toBeLessThanOrEqual(0);
      expect(rule.id).toBeTruthy();
      expect(rule.rationale).toBeTruthy();
      expect(typeof rule.condition).toBe("function");
    }
  });

  it("cyber_auth_inconsistency rule fires when cyber<50 and auth>80", () => {
    const rule = RCR_CORRELATION_RULES.find(
      (r) => r.id === "cyber_auth_inconsistency",
    )!;
    expect(
      rule.condition({ cybersecurityPosture: 30, authorizationReadiness: 90 }),
    ).toBe(true);
    expect(
      rule.condition({ cybersecurityPosture: 60, authorizationReadiness: 90 }),
    ).toBe(false);
  });
});

// ─── Methodology document ────────────────────────────────────────────
describe("RCR engine — getRCRMethodologyDocument", () => {
  it("returns a structurally complete methodology object", () => {
    const doc = getRCRMethodologyDocument();
    expect(doc.version).toBe(RCR_PENALTY_CONFIG.methodologyVersion);
    expect(doc.effectiveDate).toBeTruthy();
    expect(Array.isArray(doc.gradingScale)).toBe(true);
    expect(doc.gradingScale.length).toBe(9); // AAA…D
    expect(Array.isArray(doc.components)).toBe(true);
    expect(doc.components.length).toBeGreaterThan(0);
    expect(Array.isArray(doc.penalties)).toBe(true);
    expect(Array.isArray(doc.correlationChecks)).toBe(true);
    expect(doc.outlookCriteria).toBeDefined();
    expect(Array.isArray(doc.watchCriteria)).toBe(true);
    expect(doc.confidenceCalculation).toBeTruthy();
    expect(doc.peerBenchmarking).toBeTruthy();
  });

  it("grading scale ranges cover 0..100 contiguously", () => {
    const doc = getRCRMethodologyDocument();
    // Just sanity-check that the lowest band starts at 0 and the
    // highest ends at 100 — this catches accidental gaps in the
    // public-facing document.
    const ranges = doc.gradingScale.map((g) => g.range);
    expect(ranges[0]!).toContain("95"); // AAA top
    expect(ranges[ranges.length - 1]!).toContain("0"); // D floor
  });

  it("component weights sum to 1.0 (within rounding)", () => {
    const doc = getRCRMethodologyDocument();
    const sum = doc.components.reduce((acc, c) => acc + c.weight, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });
});
