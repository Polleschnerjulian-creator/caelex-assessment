/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the REAL plan-priced revenue math (REVENUE lane, P0).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Drives the PURE, injectable helpers in `revenue.ts` — `computeRevenueMetrics`
 * itself only adds Prisma reads + a best-effort snapshot upsert, so all the
 * arithmetic the contract cares about (MRR summation, the movement diff, and the
 * NRR / Quick-Ratio / ARPA / churn edge cases) is asserted here with NO database
 * and NO fabricated revenue — every number traces to PRICING_TIERS or an
 * injected snapshot.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { PRICING_TIERS } from "@/lib/stripe/pricing";
import {
  planMonthlyPrice,
  sumPlanPricedMrr,
  countPayingAccounts,
  computeArpa,
  buildPlanMix,
  computeMovement,
  computeNrr,
  computeQuickRatio,
  computeLogoChurnRate,
  assembleRevenueMetrics,
  type RevenueSubscription,
  type RevenueMovement,
} from "./revenue";

// Real plan prices straight from the canonical table (no magic numbers here).
const STARTER = PRICING_TIERS.STARTER.price ?? 0; // 299
const PRO = PRICING_TIERS.PROFESSIONAL.price ?? 0; // 799

const sub = (plan: string): RevenueSubscription => ({ plan, status: "ACTIVE" });
const ZERO_MOVEMENT: RevenueMovement = {
  newMrr: 0,
  expansionMrr: 0,
  contractionMrr: 0,
  churnedMrr: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// planMonthlyPrice — maps OrganizationPlan → real EUR, never guesses.
// ─────────────────────────────────────────────────────────────────────────────

describe("planMonthlyPrice", () => {
  it("returns the canonical PRICING_TIERS price for paid plans", () => {
    expect(planMonthlyPrice("STARTER")).toBe(STARTER);
    expect(planMonthlyPrice("PROFESSIONAL")).toBe(PRO);
  });

  it("returns 0 for FREE (price 0)", () => {
    expect(planMonthlyPrice("FREE")).toBe(0);
  });

  it("returns 0 for ENTERPRISE (custom/null price — never fabricated)", () => {
    expect(planMonthlyPrice("ENTERPRISE")).toBe(0);
  });

  it("returns 0 for an unknown plan rather than throwing", () => {
    expect(planMonthlyPrice("SOMETHING_ELSE")).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sumPlanPricedMrr — MRR = Σ plan price over ACTIVE subs.
// ─────────────────────────────────────────────────────────────────────────────

describe("sumPlanPricedMrr", () => {
  it("sums plan prices across a mixed active base", () => {
    const subs = [sub("STARTER"), sub("PROFESSIONAL"), sub("STARTER")];
    expect(sumPlanPricedMrr(subs)).toBe(STARTER * 2 + PRO);
  });

  it("counts FREE and ENTERPRISE as €0 contributions", () => {
    const subs = [sub("FREE"), sub("ENTERPRISE"), sub("PROFESSIONAL")];
    expect(sumPlanPricedMrr(subs)).toBe(PRO);
  });

  it("is 0 for an empty base", () => {
    expect(sumPlanPricedMrr([])).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// countPayingAccounts / computeArpa — ARPA over paying accounts only.
// ─────────────────────────────────────────────────────────────────────────────

describe("countPayingAccounts", () => {
  it("counts only subs whose plan price is > 0", () => {
    const subs = [
      sub("FREE"),
      sub("STARTER"),
      sub("ENTERPRISE"),
      sub("PROFESSIONAL"),
    ];
    expect(countPayingAccounts(subs)).toBe(2);
  });
});

describe("computeArpa", () => {
  it("divides MRR by paying accounts and rounds to cents", () => {
    // 299 + 799 = 1098 over 2 payers = 549.
    expect(computeArpa(1098, 2)).toBe(549);
  });

  it("returns 0 (not NaN/Infinity) when there are zero paying accounts", () => {
    expect(computeArpa(0, 0)).toBe(0);
    expect(Number.isFinite(computeArpa(0, 0))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildPlanMix — active-base composition by plan, MRR-desc.
// ─────────────────────────────────────────────────────────────────────────────

describe("buildPlanMix", () => {
  it("groups by plan with count + MRR, sorted by MRR desc", () => {
    const subs = [
      sub("STARTER"),
      sub("STARTER"),
      sub("PROFESSIONAL"),
      sub("FREE"),
    ];
    const mix = buildPlanMix(subs);
    // PROFESSIONAL (799) ranks above STARTER (598) above FREE (0).
    expect(mix.map((m) => m.plan)).toEqual(["PROFESSIONAL", "STARTER", "FREE"]);
    expect(mix[0]).toEqual({ plan: "PROFESSIONAL", count: 1, mrr: PRO });
    expect(mix[1]).toEqual({ plan: "STARTER", count: 2, mrr: STARTER * 2 });
    expect(mix[2]).toEqual({ plan: "FREE", count: 1, mrr: 0 });
  });

  it("only includes plans actually present (no synthetic padding)", () => {
    const mix = buildPlanMix([sub("STARTER")]);
    expect(mix).toEqual([{ plan: "STARTER", count: 1, mrr: STARTER }]);
  });

  it("is an empty array for an empty base", () => {
    expect(buildPlanMix([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeMovement — the two-snapshot MRR diff in every direction.
// ─────────────────────────────────────────────────────────────────────────────

describe("computeMovement", () => {
  it("returns all zeros when there is no prior snapshot (< 2 snapshots)", () => {
    expect(computeMovement({ mrr: 1000 }, null)).toEqual(ZERO_MOVEMENT);
  });

  it("returns all zeros when there is no latest snapshot", () => {
    expect(computeMovement(null, { mrr: 1000 })).toEqual(ZERO_MOVEMENT);
  });

  it("classifies a rise from zero base as NEW MRR", () => {
    expect(computeMovement({ mrr: 800 }, { mrr: 0 })).toEqual({
      ...ZERO_MOVEMENT,
      newMrr: 800,
    });
  });

  it("classifies an increase over a positive base as EXPANSION", () => {
    expect(computeMovement({ mrr: 1200 }, { mrr: 1000 })).toEqual({
      ...ZERO_MOVEMENT,
      expansionMrr: 200,
    });
  });

  it("classifies a decrease (still positive) as CONTRACTION", () => {
    expect(computeMovement({ mrr: 700 }, { mrr: 1000 })).toEqual({
      ...ZERO_MOVEMENT,
      contractionMrr: 300,
    });
  });

  it("classifies a drop to zero as CHURNED", () => {
    expect(computeMovement({ mrr: 0 }, { mrr: 1000 })).toEqual({
      ...ZERO_MOVEMENT,
      churnedMrr: 1000,
    });
  });

  it("returns all zeros when MRR is unchanged", () => {
    expect(computeMovement({ mrr: 1000 }, { mrr: 1000 })).toEqual(
      ZERO_MOVEMENT,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeNrr — null on zero-start, retained-base ratio otherwise.
// ─────────────────────────────────────────────────────────────────────────────

describe("computeNrr", () => {
  it("is null when start MRR is 0 (undefined, never a fake 100%)", () => {
    expect(computeNrr(0, { ...ZERO_MOVEMENT, newMrr: 500 })).toBeNull();
  });

  it("excludes new MRR and reflects expansion (NRR > 1)", () => {
    // (1000 + 200 - 0 - 0)/1000 = 1.2 — new MRR is intentionally ignored.
    const nrr = computeNrr(1000, {
      ...ZERO_MOVEMENT,
      expansionMrr: 200,
      newMrr: 9999,
    });
    expect(nrr).toBeCloseTo(1.2, 10);
  });

  it("reflects contraction + churn (NRR < 1)", () => {
    // (1000 - 100 - 150)/1000 = 0.75.
    const nrr = computeNrr(1000, {
      ...ZERO_MOVEMENT,
      contractionMrr: 100,
      churnedMrr: 150,
    });
    expect(nrr).toBeCloseTo(0.75, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeQuickRatio — null on zero-denominator, ratio otherwise.
// ─────────────────────────────────────────────────────────────────────────────

describe("computeQuickRatio", () => {
  it("is null when there are no losses (denominator 0)", () => {
    expect(
      computeQuickRatio({ ...ZERO_MOVEMENT, newMrr: 500, expansionMrr: 100 }),
    ).toBeNull();
  });

  it("is (new + expansion) / (contraction + churn)", () => {
    // (300 + 100) / (50 + 50) = 4.
    expect(
      computeQuickRatio({
        newMrr: 300,
        expansionMrr: 100,
        contractionMrr: 50,
        churnedMrr: 50,
      }),
    ).toBe(4);
  });

  it("is 0 when nothing was gained but losses occurred", () => {
    expect(computeQuickRatio({ ...ZERO_MOVEMENT, churnedMrr: 200 })).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeLogoChurnRate — null on empty base, fraction otherwise.
// ─────────────────────────────────────────────────────────────────────────────

describe("computeLogoChurnRate", () => {
  it("is null when there are no logos (active + canceled = 0)", () => {
    expect(computeLogoChurnRate(0, 0)).toBeNull();
  });

  it("is canceled / (active + canceled)", () => {
    // 2 / (8 + 2) = 0.2.
    expect(computeLogoChurnRate(8, 2)).toBeCloseTo(0.2, 10);
  });

  it("is 0 when nobody churned", () => {
    expect(computeLogoChurnRate(10, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// assembleRevenueMetrics — the full contract over injected rows.
// ─────────────────────────────────────────────────────────────────────────────

describe("assembleRevenueMetrics", () => {
  const ASOF = "2026-06-09T12:00:00.000Z";

  it("produces real zeros with isEmpty=true when there are no paying accounts and < 2 snapshots", () => {
    const m = assembleRevenueMetrics({
      activeSubscriptions: [sub("FREE")],
      latestSnapshot: null,
      priorSnapshot: null,
      canceledInRange: 0,
      asOf: ASOF,
    });
    expect(m.mrr).toBe(0);
    expect(m.arr).toBe(0);
    expect(m.arpa).toBe(0);
    expect(m.nrr).toBeNull();
    expect(m.quickRatio).toBeNull();
    expect(m.movement).toEqual(ZERO_MOVEMENT);
    expect(m.logoChurnRate).toBeNull(); // base = 0
    expect(m.planMix).toEqual([{ plan: "FREE", count: 1, mrr: 0 }]);
    expect(m.asOf).toBe(ASOF);
    expect(m.isEmpty).toBe(true);
  });

  it("computes real MRR/ARR/ARPA and is NOT empty once there are paying accounts", () => {
    const m = assembleRevenueMetrics({
      activeSubscriptions: [sub("STARTER"), sub("PROFESSIONAL")],
      latestSnapshot: null,
      priorSnapshot: null,
      canceledInRange: 0,
      asOf: ASOF,
    });
    expect(m.mrr).toBe(STARTER + PRO); // 1098
    expect(m.arr).toBe((STARTER + PRO) * 12);
    expect(m.arpa).toBe((STARTER + PRO) / 2); // 549
    // No prior snapshot yet → movement/NRR/quick-ratio stay zero/null...
    expect(m.movement).toEqual(ZERO_MOVEMENT);
    expect(m.nrr).toBeNull();
    expect(m.quickRatio).toBeNull();
    // ...but paying accounts exist, so the surface is NOT empty.
    expect(m.isEmpty).toBe(false);
  });

  it("derives movement + NRR + quick-ratio from two snapshots (expansion case)", () => {
    const m = assembleRevenueMetrics({
      activeSubscriptions: [sub("PROFESSIONAL")],
      latestSnapshot: { mrr: 1200 },
      priorSnapshot: { mrr: 1000 },
      canceledInRange: 1,
      asOf: ASOF,
    });
    expect(m.movement).toEqual({ ...ZERO_MOVEMENT, expansionMrr: 200 });
    expect(m.nrr).toBeCloseTo(1.2, 10); // (1000+200)/1000
    expect(m.quickRatio).toBeNull(); // no losses → denominator 0
    expect(m.logoChurnRate).toBeCloseTo(0.5, 10); // 1 / (1 active + 1 canceled)
    expect(m.isEmpty).toBe(false);
  });

  it("derives a churn-down NRR<1 and a finite quick-ratio from two snapshots", () => {
    const m = assembleRevenueMetrics({
      activeSubscriptions: [sub("STARTER")],
      latestSnapshot: { mrr: 750 },
      priorSnapshot: { mrr: 1000 },
      canceledInRange: 0,
      asOf: ASOF,
    });
    // 1000 → 750 is a contraction of 250.
    expect(m.movement).toEqual({ ...ZERO_MOVEMENT, contractionMrr: 250 });
    expect(m.nrr).toBeCloseTo(0.75, 10);
    expect(m.quickRatio).toBe(0); // gained 0 / lost 250
  });
});
