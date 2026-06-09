/**
 * Growth pure-helper tests (growth-data.ts)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Drives the PURE shaping layer only — no React, no Prisma, no clock. We pin the
 * three things the contract cares about for a top-of-funnel screen:
 *   1. channel mix bucketing (source × medium), blank → stable bucket, share,
 *      deterministic sort, and the honest empty mix;
 *   2. the demo funnel's stage-to-stage conversion honesty (first stage null,
 *      zero-prior null not 0%, carry-over >100% left as-is);
 *   3. the CRM pipeline split (open vs terminal, probability-weighted forecast,
 *      dense canonical stages, unknown-stage passthrough, cents→EUR rounding),
 *      the lead → customer conversion clamp + no-sample null, the composer, and
 *      every emptiness predicate.
 */

import { describe, it, expect } from "vitest";
import {
  buildChannelMix,
  buildDemoFunnel,
  buildDemand,
  buildPipeline,
  buildLeadConversion,
  buildGrowth,
  isGrowthEmpty,
  isChannelMixEmpty,
  isPipelineEmpty,
  safeShare,
  type ChannelTouch,
  type DemandCounts,
  type DealStageInput,
} from "./growth-data";

// ── Fixtures ────────────────────────────────────────────────────────────────

/** A zeroed demand block (override the fields a test cares about). */
function demand(overrides: Partial<DemandCounts> = {}): DemandCounts {
  return {
    demosRequested: 0,
    demosBooked: 0,
    demosCompleted: 0,
    contactRequests: 0,
    newsletterActive: 0,
    newsletterNew: 0,
    invitesSent: 0,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// safeShare
// ─────────────────────────────────────────────────────────────────────────────

describe("safeShare", () => {
  it("returns null (not 0, not NaN) for a zero/negative denominator", () => {
    expect(safeShare(3, 0)).toBeNull();
    expect(safeShare(3, -1)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(safeShare(Number.NaN, 10)).toBeNull();
    expect(safeShare(1, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("returns a real ratio for a positive denominator, including 0/N", () => {
    expect(safeShare(3, 12)).toBeCloseTo(0.25);
    expect(safeShare(0, 5)).toBe(0); // genuine 0% (a sample exists)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildChannelMix
// ─────────────────────────────────────────────────────────────────────────────

describe("buildChannelMix", () => {
  it("buckets by (source × medium), counts, and computes share", () => {
    const touches: ChannelTouch[] = [
      { source: "google", medium: "organic" },
      { source: "google", medium: "organic" },
      { source: "google", medium: "paid" },
      { source: "linkedin", medium: "social" },
    ];
    const mix = buildChannelMix(touches);

    expect(mix.totalTouches).toBe(4);
    // Busiest first: google/organic (2) leads.
    expect(mix.rows[0]).toEqual({
      source: "google",
      medium: "organic",
      touches: 2,
      share: 0.5,
    });
    // Three distinct buckets.
    expect(mix.rows).toHaveLength(3);
    // Shares sum to 1 (within float tolerance).
    const sum = mix.rows.reduce((a, r) => a + r.share, 0);
    expect(sum).toBeCloseTo(1);
  });

  it("normalises a blank/null source→'direct' and medium→'unknown'", () => {
    const mix = buildChannelMix([
      { source: null, medium: null },
      { source: "", medium: "   " },
      { source: "  GOOGLE ", medium: "Organic" }, // trimmed + lower-cased
    ]);

    // The two blank touches collapse into one direct/unknown bucket of 2.
    const direct = mix.rows.find(
      (r) => r.source === "direct" && r.medium === "unknown",
    );
    expect(direct?.touches).toBe(2);
    // Casing/whitespace normalised.
    expect(
      mix.rows.find((r) => r.source === "google" && r.medium === "organic")
        ?.touches,
    ).toBe(1);
  });

  it("sorts deterministically: touches desc, then source asc, then medium asc", () => {
    // Two buckets tied at 1 touch — tie broken by source asc then medium asc.
    const mix = buildChannelMix([
      { source: "bing", medium: "paid" },
      { source: "bing", medium: "organic" },
    ]);
    expect(mix.rows.map((r) => `${r.source}/${r.medium}`)).toEqual([
      "bing/organic",
      "bing/paid",
    ]);
  });

  it("returns an empty, zero-total mix for no touches", () => {
    const mix = buildChannelMix([]);
    expect(mix.totalTouches).toBe(0);
    expect(mix.rows).toEqual([]);
    expect(isChannelMixEmpty(mix)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildDemoFunnel
// ─────────────────────────────────────────────────────────────────────────────

describe("buildDemoFunnel", () => {
  it("computes stage-to-stage conversion with a null first stage", () => {
    const f = buildDemoFunnel(
      demand({ demosRequested: 100, demosBooked: 40, demosCompleted: 30 }),
    );
    expect(f.map((s) => s.key)).toEqual(["requested", "booked", "completed"]);
    expect(f[0].count).toBe(100);
    expect(f[0].conversionFromPrev).toBeNull(); // first stage — no prior
    expect(f[1].conversionFromPrev).toBeCloseTo(0.4); // 40/100
    expect(f[2].conversionFromPrev).toBeCloseTo(0.75); // 30/40
  });

  it("returns null conversion (not 0%) when the prior stage is 0", () => {
    const f = buildDemoFunnel(
      demand({ demosRequested: 0, demosBooked: 0, demosCompleted: 0 }),
    );
    // booked/requested with requested=0 → null (no sample), NOT 0.
    expect(f[1].conversionFromPrev).toBeNull();
    expect(f[2].conversionFromPrev).toBeNull();
  });

  it("leaves a carry-over conversion >1 as-is (honest, not clamped)", () => {
    // More booked than requested this window (carry-over demand).
    const f = buildDemoFunnel(
      demand({ demosRequested: 10, demosBooked: 12, demosCompleted: 0 }),
    );
    expect(f[1].count).toBe(12); // counts are real, never clamped
    expect(f[1].conversionFromPrev).toBeCloseTo(1.2);
  });

  it("floors dirty/negative counts to 0", () => {
    const f = buildDemoFunnel(
      demand({ demosRequested: -5, demosBooked: 3.9, demosCompleted: 2 }),
    );
    expect(f[0].count).toBe(0);
    expect(f[1].count).toBe(3); // floored
    // booked/requested with requested floored to 0 → null
    expect(f[1].conversionFromPrev).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildDemand
// ─────────────────────────────────────────────────────────────────────────────

describe("buildDemand", () => {
  it("passes through clamped counts and embeds the funnel", () => {
    const d = buildDemand(
      demand({
        demosRequested: 20,
        demosBooked: 8,
        demosCompleted: 5,
        contactRequests: 14,
        newsletterActive: 312,
        newsletterNew: 9,
        invitesSent: 4,
      }),
    );
    expect(d.demosRequested).toBe(20);
    expect(d.contactRequests).toBe(14);
    expect(d.newsletterActive).toBe(312);
    expect(d.invitesSent).toBe(4);
    expect(d.demoFunnel).toHaveLength(3);
    expect(d.demoFunnel[1].conversionFromPrev).toBeCloseTo(0.4); // 8/20
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildPipeline
// ─────────────────────────────────────────────────────────────────────────────

describe("buildPipeline", () => {
  it("splits open vs terminal, weights the forecast, and rounds cents→EUR", () => {
    const stages: DealStageInput[] = [
      // Open stages.
      { stage: "IDENTIFIED", count: 2, valueCents: 1_000_000 }, // €10,000
      { stage: "PROPOSAL", count: 1, valueCents: 5_000_000 }, // €50,000
      // Terminal stages.
      { stage: "CLOSED_WON", count: 3, valueCents: 9_000_000 }, // €90,000
      { stage: "CLOSED_LOST", count: 1, valueCents: 2_000_000 },
    ];
    const p = buildPipeline(stages);

    // Open value = 10,000 + 50,000 = 60,000; open count = 3.
    expect(p.openValueEur).toBe(60_000);
    expect(p.openCount).toBe(3);
    // Weighted = 10,000*0.1 + 50,000*0.6 = 1,000 + 30,000 = 31,000.
    expect(p.weightedValueEur).toBe(31_000);
    // Won/lost surfaced separately and excluded from open.
    expect(p.wonCount).toBe(3);
    expect(p.wonValueEur).toBe(90_000);
    expect(p.lostCount).toBe(1);
  });

  it("emits a dense per-stage breakdown in canonical order (zeros included)", () => {
    const p = buildPipeline([{ stage: "ENGAGED", count: 1, valueCents: 0 }]);
    expect(p.stages.map((s) => s.stage)).toEqual([
      "IDENTIFIED",
      "ENGAGED",
      "ASSESSED",
      "PROPOSAL",
      "PROCUREMENT",
      "CLOSED_WON",
      "CLOSED_LOST",
      "ONBOARDING",
      "ACTIVE",
    ]);
    expect(p.stages.find((s) => s.stage === "ENGAGED")?.count).toBe(1);
    expect(p.stages.find((s) => s.stage === "IDENTIFIED")?.count).toBe(0);
  });

  it("appends an unknown stage rather than dropping it", () => {
    const p = buildPipeline([
      { stage: "MYSTERY_STAGE", count: 4, valueCents: 100 },
    ]);
    const row = p.stages.find((s) => s.stage === "MYSTERY_STAGE");
    expect(row?.count).toBe(4);
    // Unknown stage has probability 0 → contributes to open count/value but not
    // the weighted forecast (no fabricated probability).
    expect(p.openCount).toBe(4);
    expect(p.weightedValueEur).toBe(0);
  });

  it("treats ONBOARDING/ACTIVE as committed (full forecast weight, still open)", () => {
    const p = buildPipeline([
      { stage: "ACTIVE", count: 1, valueCents: 4_000_000 }, // €40,000
    ]);
    expect(p.openCount).toBe(1);
    expect(p.openValueEur).toBe(40_000);
    expect(p.weightedValueEur).toBe(40_000); // probability 1.0
  });

  it("is all-zero for no deals", () => {
    const p = buildPipeline([]);
    expect(p.openValueEur).toBe(0);
    expect(p.weightedValueEur).toBe(0);
    expect(p.openCount).toBe(0);
    expect(p.wonCount).toBe(0);
    expect(p.lostCount).toBe(0);
    expect(isPipelineEmpty(p)).toBe(true);
  });

  it("folds duplicate stage rows from groupBy into one", () => {
    // Defensive: two rows for the same stage (shouldn't happen with groupBy, but
    // the shaper must be total) accumulate.
    const p = buildPipeline([
      { stage: "PROPOSAL", count: 1, valueCents: 1_000_000 },
      { stage: "PROPOSAL", count: 2, valueCents: 2_000_000 },
    ]);
    expect(p.openCount).toBe(3);
    expect(p.openValueEur).toBe(30_000); // 10k + 20k
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildLeadConversion
// ─────────────────────────────────────────────────────────────────────────────

describe("buildLeadConversion", () => {
  it("computes the conversion rate from total + converted", () => {
    const l = buildLeadConversion({ total: 50, converted: 6 });
    expect(l.total).toBe(50);
    expect(l.converted).toBe(6);
    expect(l.conversionRate).toBeCloseTo(0.12);
  });

  it("returns a null rate (not 0%) when there were no leads", () => {
    const l = buildLeadConversion({ total: 0, converted: 0 });
    expect(l.conversionRate).toBeNull();
  });

  it("clamps converted to total so a data anomaly never exceeds 100%", () => {
    const l = buildLeadConversion({ total: 3, converted: 9 });
    expect(l.converted).toBe(3);
    expect(l.conversionRate).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildGrowth (composer) + emptiness
// ─────────────────────────────────────────────────────────────────────────────

describe("buildGrowth", () => {
  const NOW = Date.parse("2026-06-09T12:34:56.000Z");

  it("assembles the full payload deterministically with a UTC asOf", () => {
    const resp = buildGrowth({
      generatedAtMs: NOW,
      rangeDays: 30,
      channels: [{ source: "google", medium: "organic" }],
      demand: demand({ demosRequested: 5, demosBooked: 2 }),
      dealStages: [{ stage: "PROPOSAL", count: 1, valueCents: 1_000_000 }],
      leads: { total: 10, converted: 1 },
    });

    expect(resp.generatedAt).toBe("2026-06-09T12:34:56.000Z");
    expect(resp.asOf).toBe("2026-06-09"); // UTC date slice, hydration-safe
    expect(resp.rangeDays).toBe(30);
    expect(resp.channelMix.totalTouches).toBe(1);
    expect(resp.demand.demosRequested).toBe(5);
    expect(resp.pipeline.openValueEur).toBe(10_000);
    expect(resp.leads.conversionRate).toBeCloseTo(0.1);
  });

  it("is deterministic: identical input ⇒ identical output", () => {
    const input = {
      generatedAtMs: NOW,
      rangeDays: 7,
      channels: [{ source: "x", medium: "y" }] as ChannelTouch[],
      demand: demand({ contactRequests: 3 }),
      dealStages: [] as DealStageInput[],
      leads: { total: 1, converted: 0 },
    };
    expect(buildGrowth(input)).toEqual(buildGrowth(input));
  });
});

describe("isGrowthEmpty", () => {
  it("is true only when EVERY section is empty", () => {
    const empty = buildGrowth({
      generatedAtMs: 0,
      rangeDays: 30,
      channels: [],
      demand: demand(),
      dealStages: [],
      leads: { total: 0, converted: 0 },
    });
    expect(isGrowthEmpty(empty)).toBe(true);
  });

  it("is false when ANY one section has data", () => {
    // Only a newsletter list exists — still 'not empty' (don't hide the screen).
    const withNewsletter = buildGrowth({
      generatedAtMs: 0,
      rangeDays: 30,
      channels: [],
      demand: demand({ newsletterActive: 5 }),
      dealStages: [],
      leads: { total: 0, converted: 0 },
    });
    expect(isGrowthEmpty(withNewsletter)).toBe(false);

    // Only inbound channel touches exist.
    const withChannels = buildGrowth({
      generatedAtMs: 0,
      rangeDays: 30,
      channels: [{ source: "google", medium: "organic" }],
      demand: demand(),
      dealStages: [],
      leads: { total: 0, converted: 0 },
    });
    expect(isGrowthEmpty(withChannels)).toBe(false);

    // Only a lost deal exists (pipeline has terminal-only activity).
    const withLostDeal = buildGrowth({
      generatedAtMs: 0,
      rangeDays: 30,
      channels: [],
      demand: demand(),
      dealStages: [{ stage: "CLOSED_LOST", count: 1, valueCents: 0 }],
      leads: { total: 0, converted: 0 },
    });
    expect(isGrowthEmpty(withLostDeal)).toBe(false);
  });
});
