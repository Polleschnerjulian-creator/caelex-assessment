/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the customer-health pure data layer (health.ts).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Covers the load-bearing math: the activity-delta direction band, the derived
 * trend precedence (billing-loss > activity), the risk-band derivation (stronger
 * of score-band / stored-label / billing-floor), the at-risk reason codes +
 * severity ranking, the expansion gating (healthy + near a limit), the
 * product-status + plan-mix rollups, and the top-level composer's partition +
 * ordering. All time-dependent logic is anchored on an explicit `nowMs` so the
 * tests are deterministic (no real clock). Pure functions — no React/DOM/Prisma.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  activityDirection,
  deriveTrend,
  deriveRisk,
  riskReasons,
  riskSeverity,
  expansionReasons,
  buildHealthRow,
  buildProductStatus,
  buildPlanMix,
  buildCustomersWatchlist,
  isCustomersEmpty,
  ACTIVITY_TREND_BAND,
  STALE_ACTIVITY_DAYS,
  TRIAL_ENDING_SOON_DAYS,
  NEAR_LIMIT_UTILISATION,
  type CustomerHealthInput,
  type ProductAccessRow,
} from "./health";

const DAY = 24 * 60 * 60 * 1000;
// A fixed "now" so day-window boundaries are exact and reproducible.
const NOW = Date.UTC(2026, 5, 9, 12, 0, 0); // 2026-06-09T12:00:00Z

/** Tiny tenant builder; healthy defaults keep tests terse — each test overrides
 * only the fields it exercises. Spread LAST so an explicit `null` (e.g.
 * `storedScore: null`) overrides the default rather than falling through `??`. */
function tenant(opts: Partial<CustomerHealthInput> = {}): CustomerHealthInput {
  return {
    organizationId: "org_a",
    name: "Acme Space",
    plan: "PROFESSIONAL",
    storedScore: 80,
    storedRiskLevel: "low",
    lastLoginMs: NOW - 2 * DAY,
    subStatus: "ACTIVE",
    cancelAtPeriodEnd: false,
    trialEndMs: null,
    recentActivity: 10,
    priorActivity: 10,
    lastActivityMs: NOW - 1 * DAY,
    seatsUsed: 1,
    seatCap: 3,
    spacecraftUsed: 1,
    spacecraftCap: 5,
    ...opts,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("activityDirection", () => {
  it("rises from nothing when recent > 0 and prior = 0", () => {
    expect(activityDirection(5, 0)).toBe(1);
  });

  it("is flat when both are zero", () => {
    expect(activityDirection(0, 0)).toBe(0);
  });

  it("is flat when the move is within the noise band", () => {
    // band = 0.2 → a 10→11 move (+10%) is noise.
    expect(ACTIVITY_TREND_BAND).toBe(0.2);
    expect(activityDirection(11, 10)).toBe(0);
    expect(activityDirection(9, 10)).toBe(0);
  });

  it("rises when recent exceeds prior beyond the band", () => {
    expect(activityDirection(13, 10)).toBe(1); // +30%
  });

  it("falls when recent drops below prior beyond the band", () => {
    expect(activityDirection(7, 10)).toBe(-1); // -30%
    expect(activityDirection(0, 10)).toBe(-1); // went silent
  });

  it("clamps non-finite / negative inputs to 0 before comparing", () => {
    expect(activityDirection(Number.NaN, 10)).toBe(-1); // NaN→0 recent ⇒ fell
    expect(activityDirection(5, Number.NaN)).toBe(1); // NaN→0 prior ⇒ up-from-0
    expect(activityDirection(-3, -3)).toBe(0); // both clamp to 0 ⇒ flat
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("deriveTrend", () => {
  it("is declining when cancelAtPeriodEnd, regardless of activity", () => {
    expect(
      deriveTrend({
        cancelAtPeriodEnd: true,
        subStatus: "ACTIVE",
        recentActivity: 100, // even with surging activity
        priorActivity: 1,
      }),
    ).toBe("declining");
  });

  it("is declining on a payment failure (PAST_DUE / UNPAID)", () => {
    expect(
      deriveTrend({
        cancelAtPeriodEnd: false,
        subStatus: "PAST_DUE",
        recentActivity: 50,
        priorActivity: 50,
      }),
    ).toBe("declining");
    expect(
      deriveTrend({
        cancelAtPeriodEnd: false,
        subStatus: "UNPAID",
        recentActivity: 50,
        priorActivity: 50,
      }),
    ).toBe("declining");
  });

  it("follows activity direction when billing is healthy", () => {
    const base = { cancelAtPeriodEnd: false, subStatus: "ACTIVE" as const };
    expect(
      deriveTrend({ ...base, recentActivity: 20, priorActivity: 10 }),
    ).toBe("improving");
    expect(deriveTrend({ ...base, recentActivity: 5, priorActivity: 10 })).toBe(
      "declining",
    );
    expect(
      deriveTrend({ ...base, recentActivity: 10, priorActivity: 10 }),
    ).toBe("stable");
  });

  it("reads a previously-active-now-silent tenant as declining", () => {
    expect(
      deriveTrend({
        cancelAtPeriodEnd: false,
        subStatus: "ACTIVE",
        recentActivity: 0,
        priorActivity: 8,
      }),
    ).toBe("declining");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("deriveRisk", () => {
  it("maps the stored score to the band ladder", () => {
    const billing = { cancelAtPeriodEnd: false, subStatus: "ACTIVE" as const };
    expect(
      deriveRisk({ storedScore: 85, storedRiskLevel: null, ...billing }),
    ).toBe("low");
    expect(
      deriveRisk({ storedScore: 55, storedRiskLevel: null, ...billing }),
    ).toBe("medium");
    expect(
      deriveRisk({ storedScore: 30, storedRiskLevel: null, ...billing }),
    ).toBe("high");
    expect(
      deriveRisk({ storedScore: 10, storedRiskLevel: null, ...billing }),
    ).toBe("critical");
  });

  it("never returns a band weaker than the stored label", () => {
    // Score implies "low" (85) but the stored label says "high" → keep "high".
    expect(
      deriveRisk({
        storedScore: 85,
        storedRiskLevel: "high",
        cancelAtPeriodEnd: false,
        subStatus: "ACTIVE",
      }),
    ).toBe("high");
  });

  it("applies a billing-loss floor of at least 'high'", () => {
    expect(
      deriveRisk({
        storedScore: 90, // healthy score…
        storedRiskLevel: "low",
        cancelAtPeriodEnd: true, // …but cancelling
        subStatus: "ACTIVE",
      }),
    ).toBe("high");
    // critical score + billing loss stays critical (floor only raises to high).
    expect(
      deriveRisk({
        storedScore: 5,
        storedRiskLevel: "critical",
        cancelAtPeriodEnd: false,
        subStatus: "UNPAID",
      }),
    ).toBe("critical");
  });

  it("leans on billing only when the stored score is unknown", () => {
    expect(
      deriveRisk({
        storedScore: null,
        storedRiskLevel: null,
        cancelAtPeriodEnd: false,
        subStatus: "ACTIVE",
      }),
    ).toBe("low"); // no signals ⇒ low
    expect(
      deriveRisk({
        storedScore: null,
        storedRiskLevel: null,
        cancelAtPeriodEnd: true,
        subStatus: "ACTIVE",
      }),
    ).toBe("high"); // billing loss floor
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("riskReasons", () => {
  it("flags CANCELLING for cancelAtPeriodEnd", () => {
    const t = tenant({ cancelAtPeriodEnd: true });
    const r = riskReasons(t, { risk: "high", trend: "declining" }, NOW);
    expect(r).toContain("CANCELLING");
  });

  it("flags TRIAL_ENDING only when trialing and end is within the window", () => {
    const soon = tenant({
      subStatus: "TRIALING",
      trialEndMs: NOW + 5 * DAY, // 5 days out
    });
    expect(riskReasons(soon, { risk: "low", trend: "stable" }, NOW)).toContain(
      "TRIAL_ENDING",
    );

    const farOut = tenant({
      subStatus: "TRIALING",
      trialEndMs: NOW + (TRIAL_ENDING_SOON_DAYS + 5) * DAY,
    });
    expect(
      riskReasons(farOut, { risk: "low", trend: "stable" }, NOW),
    ).not.toContain("TRIAL_ENDING");

    // An already-elapsed trialEnd is not a near-future risk here.
    const past = tenant({ subStatus: "TRIALING", trialEndMs: NOW - 2 * DAY });
    expect(
      riskReasons(past, { risk: "low", trend: "stable" }, NOW),
    ).not.toContain("TRIAL_ENDING");
  });

  it("flags PAYMENT_FAILED for PAST_DUE / UNPAID", () => {
    expect(
      riskReasons(
        tenant({ subStatus: "PAST_DUE" }),
        { risk: "high", trend: "declining" },
        NOW,
      ),
    ).toContain("PAYMENT_FAILED");
  });

  it("flags LOW_HEALTH when the derived risk is high or critical", () => {
    expect(
      riskReasons(tenant(), { risk: "critical", trend: "declining" }, NOW),
    ).toContain("LOW_HEALTH");
    expect(
      riskReasons(tenant(), { risk: "medium", trend: "stable" }, NOW),
    ).not.toContain("LOW_HEALTH");
  });

  it("flags ACTIVITY_DROP on a material activity fall", () => {
    const t = tenant({ recentActivity: 2, priorActivity: 10 });
    expect(riskReasons(t, { risk: "low", trend: "declining" }, NOW)).toContain(
      "ACTIVITY_DROP",
    );
  });

  it("flags GONE_QUIET for a once-active tenant past the stale window (and not double-counts with ACTIVITY_DROP)", () => {
    // Stale last activity, but recent==prior so no ACTIVITY_DROP.
    const quiet = tenant({
      recentActivity: 0,
      priorActivity: 0,
      lastActivityMs: NOW - (STALE_ACTIVITY_DAYS + 10) * DAY,
    });
    const r = riskReasons(quiet, { risk: "medium", trend: "stable" }, NOW);
    expect(r).toContain("GONE_QUIET");

    // When ACTIVITY_DROP already fired, GONE_QUIET is suppressed (no dup signal).
    const dropping = tenant({
      recentActivity: 0,
      priorActivity: 9,
      lastActivityMs: NOW - (STALE_ACTIVITY_DAYS + 10) * DAY,
    });
    const r2 = riskReasons(
      dropping,
      { risk: "medium", trend: "declining" },
      NOW,
    );
    expect(r2).toContain("ACTIVITY_DROP");
    expect(r2).not.toContain("GONE_QUIET");
  });

  it("never flags GONE_QUIET for a tenant that never had activity", () => {
    const fresh = tenant({
      recentActivity: 0,
      priorActivity: 0,
      lastActivityMs: null,
    });
    expect(
      riskReasons(fresh, { risk: "low", trend: "stable" }, NOW),
    ).not.toContain("GONE_QUIET");
  });

  it("returns no reasons for a healthy, paying, active tenant", () => {
    expect(
      riskReasons(tenant(), { risk: "low", trend: "stable" }, NOW),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("riskSeverity", () => {
  it("ranks critical above high above medium above low", () => {
    const lo = riskSeverity("low", []);
    const me = riskSeverity("medium", []);
    const hi = riskSeverity("high", []);
    const cr = riskSeverity("critical", []);
    expect(lo).toBeLessThan(me);
    expect(me).toBeLessThan(hi);
    expect(hi).toBeLessThan(cr);
  });

  it("adds weight for more reason codes and a billing-hard bump", () => {
    const base = riskSeverity("high", ["LOW_HEALTH"]);
    const more = riskSeverity("high", ["LOW_HEALTH", "ACTIVITY_DROP"]);
    expect(more).toBeGreaterThan(base);
    const billing = riskSeverity("high", ["CANCELLING"]);
    expect(billing).toBeGreaterThan(riskSeverity("high", ["LOW_HEALTH"]));
  });

  it("stays within 0..100", () => {
    const s = riskSeverity("critical", [
      "CANCELLING",
      "PAYMENT_FAILED",
      "LOW_HEALTH",
      "ACTIVITY_DROP",
      "GONE_QUIET",
      "TRIAL_ENDING",
    ]);
    expect(s).toBeLessThanOrEqual(100);
    expect(s).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("expansionReasons", () => {
  it("returns nothing for a non-healthy tenant", () => {
    const t = tenant({ seatsUsed: 3, seatCap: 3 }); // at the seat cap…
    // …but risk is not low ⇒ no upsell push.
    expect(expansionReasons(t, { risk: "medium" }).reasons).toEqual([]);
  });

  it("flags NEAR_SEAT_LIMIT at/above the utilisation threshold", () => {
    expect(NEAR_LIMIT_UTILISATION).toBe(0.8);
    const t = tenant({ seatsUsed: 4, seatCap: 5 }); // 80%
    const out = expansionReasons(t, { risk: "low" });
    expect(out.reasons).toContain("NEAR_SEAT_LIMIT");
    expect(out.topUtilisation).toBeCloseTo(0.8, 5);
  });

  it("flags NEAR_SPACECRAFT_LIMIT independently", () => {
    const t = tenant({
      seatsUsed: 1,
      seatCap: 10,
      spacecraftUsed: 5,
      spacecraftCap: 5,
    });
    const out = expansionReasons(t, { risk: "low" });
    expect(out.reasons).toContain("NEAR_SPACECRAFT_LIMIT");
    expect(out.reasons).not.toContain("NEAR_SEAT_LIMIT");
  });

  it("adds RISING_USAGE only when there is also capacity pressure", () => {
    // Rising usage but well under every cap ⇒ no expansion (healthy use only).
    const noPressure = tenant({
      seatsUsed: 1,
      seatCap: 10,
      spacecraftUsed: 1,
      spacecraftCap: 10,
      recentActivity: 20,
      priorActivity: 10,
    });
    expect(expansionReasons(noPressure, { risk: "low" }).reasons).toEqual([]);

    // Near a cap AND rising ⇒ both reasons.
    const pressureRising = tenant({
      seatsUsed: 4,
      seatCap: 5,
      recentActivity: 20,
      priorActivity: 10,
    });
    const out = expansionReasons(pressureRising, { risk: "low" });
    expect(out.reasons).toContain("NEAR_SEAT_LIMIT");
    expect(out.reasons).toContain("RISING_USAGE");
  });

  it("treats a null (unlimited) cap as no pressure", () => {
    const t = tenant({ seatsUsed: 50, seatCap: null });
    expect(expansionReasons(t, { risk: "low" }).reasons).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("buildHealthRow", () => {
  it("marks scoreUnknown and zeroes the score when no stored score", () => {
    const row = buildHealthRow(tenant({ storedScore: null }), NOW);
    expect(row.scoreUnknown).toBe(true);
    expect(row.score).toBe(0);
  });

  it("clamps and rounds the stored score into 0..100", () => {
    expect(buildHealthRow(tenant({ storedScore: 142 }), NOW).score).toBe(100);
    expect(buildHealthRow(tenant({ storedScore: -5 }), NOW).score).toBe(0);
    expect(buildHealthRow(tenant({ storedScore: 73.6 }), NOW).score).toBe(74);
  });

  it("uses the later of last-activity and last-login for the date", () => {
    const row = buildHealthRow(
      tenant({ lastActivityMs: NOW - 5 * DAY, lastLoginMs: NOW - 1 * DAY }),
      NOW,
    );
    expect(row.lastActivityDate).toBe(
      new Date(NOW - 1 * DAY).toISOString().slice(0, 10),
    );
  });

  it("yields a null date when there is no activity or login signal", () => {
    const row = buildHealthRow(
      tenant({ lastActivityMs: null, lastLoginMs: null }),
      NOW,
    );
    expect(row.lastActivityDate).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("buildProductStatus", () => {
  it("buckets ACTIVE→paid, TRIAL→trial, SUSPENDED/EXPIRED→churned", () => {
    const rows: ProductAccessRow[] = [
      { product: "COMPLY", status: "ACTIVE" },
      { product: "COMPLY", status: "ACTIVE" },
      { product: "COMPLY", status: "TRIAL" },
      { product: "COMPLY", status: "SUSPENDED" },
      { product: "COMPLY", status: "EXPIRED" },
    ];
    const out = buildProductStatus(rows);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      product: "comply",
      paid: 2,
      trial: 1,
      churned: 2,
    });
  });

  it("ignores unknown statuses without inventing a bucket", () => {
    const out = buildProductStatus([
      { product: "TRADE", status: "PENDING_REVIEW" },
      { product: "TRADE", status: "ACTIVE" },
    ]);
    expect(out[0]).toMatchObject({
      product: "trade",
      paid: 1,
      trial: 0,
      churned: 0,
    });
  });

  it("orders products by the canonical product order", () => {
    const out = buildProductStatus([
      { product: "SCHOLAR", status: "ACTIVE" },
      { product: "ATLAS", status: "ACTIVE" },
      { product: "COMPLY", status: "ACTIVE" },
    ]);
    expect(out.map((r) => r.product)).toEqual(["comply", "atlas", "scholar"]);
  });

  it("returns [] for no rows", () => {
    expect(buildProductStatus([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("buildPlanMix", () => {
  it("counts subscriptions per plan, sorted by count desc", () => {
    const out = buildPlanMix([
      { plan: "STARTER" },
      { plan: "PROFESSIONAL" },
      { plan: "PROFESSIONAL" },
      { plan: "PROFESSIONAL" },
      { plan: "STARTER" },
    ]);
    expect(out).toEqual([
      { plan: "PROFESSIONAL", count: 3 },
      { plan: "STARTER", count: 2 },
    ]);
  });

  it("ignores empty plan strings and returns [] for no rows", () => {
    expect(buildPlanMix([{ plan: "" }])).toEqual([]);
    expect(buildPlanMix([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("buildCustomersWatchlist", () => {
  it("partitions tenants into at-risk and expansion lists", () => {
    const healthyAtCap = tenant({
      organizationId: "org_expand",
      name: "Expand Co",
      storedScore: 90,
      storedRiskLevel: "low",
      seatsUsed: 5,
      seatCap: 5,
      recentActivity: 30,
      priorActivity: 12,
    });
    const cancelling = tenant({
      organizationId: "org_risk",
      name: "Churn Co",
      storedScore: 88,
      storedRiskLevel: "low",
      cancelAtPeriodEnd: true,
    });

    const out = buildCustomersWatchlist({
      nowMs: NOW,
      tenants: [healthyAtCap, cancelling],
      productAccess: [],
      subscriptions: [],
    });

    expect(out.totalTenants).toBe(2);
    expect(out.atRisk.map((r) => r.organizationId)).toEqual(["org_risk"]);
    expect(out.atRisk[0].reasons).toContain("CANCELLING");
    expect(out.atRisk[0].trend).toBe("declining");

    expect(out.expansion.map((r) => r.organizationId)).toEqual(["org_expand"]);
    expect(out.expansion[0].reasons).toContain("NEAR_SEAT_LIMIT");
  });

  it("omits a healthy, paying, mid-utilisation tenant from BOTH lists", () => {
    const out = buildCustomersWatchlist({
      nowMs: NOW,
      tenants: [tenant()], // healthy defaults, 33% seat utilisation, flat activity
      productAccess: [],
      subscriptions: [],
    });
    expect(out.atRisk).toEqual([]);
    expect(out.expansion).toEqual([]);
  });

  it("ranks the watchlist worst-first by severity", () => {
    const critical = tenant({
      organizationId: "c",
      name: "Crit",
      storedScore: 8,
      storedRiskLevel: "critical",
      subStatus: "UNPAID",
      recentActivity: 0,
      priorActivity: 9,
    });
    const mediumDrop = tenant({
      organizationId: "m",
      name: "Med",
      storedScore: 55,
      storedRiskLevel: "medium",
      recentActivity: 3,
      priorActivity: 10,
    });
    const out = buildCustomersWatchlist({
      nowMs: NOW,
      tenants: [mediumDrop, critical],
      productAccess: [],
      subscriptions: [],
    });
    expect(out.atRisk.map((r) => r.organizationId)).toEqual(["c", "m"]);
    expect(out.atRisk[0].riskScore).toBeGreaterThan(out.atRisk[1].riskScore);
  });

  it("ranks expansion by highest utilisation first", () => {
    const at100 = tenant({
      organizationId: "full",
      name: "Full",
      storedScore: 95,
      spacecraftUsed: 5,
      spacecraftCap: 5,
    });
    const at80 = tenant({
      organizationId: "near",
      name: "Near",
      storedScore: 95,
      seatsUsed: 4,
      seatCap: 5,
      spacecraftUsed: 1,
      spacecraftCap: 10,
    });
    const out = buildCustomersWatchlist({
      nowMs: NOW,
      tenants: [at80, at100],
      productAccess: [],
      subscriptions: [],
    });
    expect(out.expansion.map((r) => r.organizationId)).toEqual([
      "full",
      "near",
    ]);
  });

  it("rolls up product status + plan mix and stamps generatedAt", () => {
    const out = buildCustomersWatchlist({
      nowMs: NOW,
      tenants: [],
      productAccess: [
        { product: "COMPLY", status: "ACTIVE" },
        { product: "TRADE", status: "TRIAL" },
      ],
      subscriptions: [{ plan: "STARTER" }, { plan: "STARTER" }],
    });
    expect(out.generatedAt).toBe(new Date(NOW).toISOString());
    expect(out.productStatus.map((p) => p.product)).toEqual([
      "comply",
      "trade",
    ]);
    expect(out.planMix).toEqual([{ plan: "STARTER", count: 2 }]);
  });

  it("is deterministic — identical input yields identical output", () => {
    const input = {
      nowMs: NOW,
      tenants: [
        tenant({ organizationId: "a", cancelAtPeriodEnd: true }),
        tenant({
          organizationId: "b",
          storedScore: 10,
          storedRiskLevel: "critical",
        }),
      ],
      productAccess: [{ product: "ATLAS", status: "ACTIVE" }],
      subscriptions: [{ plan: "PROFESSIONAL" }],
    };
    expect(buildCustomersWatchlist(input)).toEqual(
      buildCustomersWatchlist(input),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("isCustomersEmpty", () => {
  it("is true only when every section is empty", () => {
    expect(
      isCustomersEmpty({
        atRisk: [],
        expansion: [],
        productStatus: [],
        planMix: [],
      }),
    ).toBe(true);
  });

  it("is false when any section has data", () => {
    expect(
      isCustomersEmpty({
        atRisk: [],
        expansion: [],
        productStatus: [{}],
        planMix: [],
      }),
    ).toBe(false);
  });
});
