/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the Product-Explorer pure data-shaping helpers.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The Product-Explorer page is a thin wrapper around the pure helpers here, so
 * the arithmetic + the honesty rules (null trends/ratios, real-vs-estimate AI
 * split, org-row sort, em-dash placeholders, isEmpty routing) are what we assert.
 * No React/DOM — these are pure functions.
 *
 * GDPR note: these inputs carry org-level aggregates + COUNT(DISTINCT userId)
 * numbers ONLY. There is deliberately no user-identity fixture anywhere here —
 * the contract has no field for one.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  EXPLORER_PRODUCTS,
  isExplorerProduct,
  explorerProductLabel,
  usageTrend,
  estimateAstraUsd,
  buildAiSpend,
  buildOutcomes,
  buildOrgRows,
  buildEntitlement,
  buildProductExplorer,
  type ProductExplorerRaw,
  type OutcomeCountRaw,
  type OrgAggregateRaw,
} from "./product-explorer";

const SONNET = 3.0; // admin-local Sonnet input $/1M-tok (mirrors ai-cost.ts)

/** A minimal all-zero raw shape for one product; tests override fields. */
function rawFor(
  product: ProductExplorerRaw["product"],
  over: Partial<ProductExplorerRaw> = {},
): ProductExplorerRaw {
  return {
    product,
    rangeDays: 30,
    activeUsers: 0,
    activeUsersPrior: null,
    logins: null,
    atlasCostUsd: 0,
    atlasMessages: 0,
    astraTokens: 0,
    astraMessages: 0,
    astraUsdPerMtok: SONNET,
    outcomeCounts: [],
    orgRows: [],
    orgBreakdownUnavailable: false,
    entitledOrgs: 0,
    entitledActiveOrgs: 0,
    ...over,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("product identity", () => {
  it("offers exactly the five products in switcher order", () => {
    expect(EXPLORER_PRODUCTS).toEqual([
      "atlas",
      "comply",
      "trade",
      "scholar",
      "pharos",
    ]);
  });

  it("isExplorerProduct guards untrusted input", () => {
    expect(isExplorerProduct("atlas")).toBe(true);
    expect(isExplorerProduct("trade")).toBe(true);
    expect(isExplorerProduct("marketing")).toBe(false); // not a billable product
    expect(isExplorerProduct("")).toBe(false);
    expect(isExplorerProduct(null)).toBe(false);
    expect(isExplorerProduct(42)).toBe(false);
  });

  it("labels trade as Passage and capitalises the rest", () => {
    expect(explorerProductLabel("trade")).toBe("Passage");
    expect(explorerProductLabel("atlas")).toBe("Atlas");
    expect(explorerProductLabel("comply")).toBe("Comply");
    expect(explorerProductLabel("scholar")).toBe("Scholar");
    expect(explorerProductLabel("pharos")).toBe("Pharos");
    // Unknown slug → safe capitalised fallback.
    expect(explorerProductLabel("widgets")).toBe("Widgets");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("usageTrend", () => {
  it("computes a 0-centred ratio vs the prior window", () => {
    expect(usageTrend(150, 100)).toBeCloseTo(0.5, 10); // +50%
    expect(usageTrend(80, 100)).toBeCloseTo(-0.2, 10); // -20%
    expect(usageTrend(100, 100)).toBe(0); // flat
  });

  it("is null (not 0/∞) when there is no prior baseline", () => {
    expect(usageTrend(10, null)).toBeNull();
    expect(usageTrend(10, undefined)).toBeNull();
    expect(usageTrend(10, 0)).toBeNull(); // prior 0 → "new", not +∞
  });

  it("rejects non-finite inputs as null", () => {
    expect(usageTrend(Number.NaN, 100)).toBeNull();
    expect(usageTrend(10, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("rounds to 3dp", () => {
    // (7-3)/3 = 1.3333… → 1.333
    expect(usageTrend(7, 3)).toBe(1.333);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("estimateAstraUsd", () => {
  it("estimates USD from tokens at the injected rate", () => {
    // 2,000,000 tokens × $3/Mtok = $6.00
    expect(estimateAstraUsd(2_000_000, SONNET)).toBe(6);
    // 500,000 × 3/M = 1.5
    expect(estimateAstraUsd(500_000, SONNET)).toBe(1.5);
  });

  it("is null when the rate is unknown (non-positive)", () => {
    expect(estimateAstraUsd(1_000_000, 0)).toBeNull();
    expect(estimateAstraUsd(1_000_000, -1)).toBeNull();
    expect(estimateAstraUsd(1_000_000, Number.NaN)).toBeNull();
  });

  it("clamps dirty token totals to 0 → $0", () => {
    expect(estimateAstraUsd(-5, SONNET)).toBe(0);
    expect(estimateAstraUsd(Number.NaN, SONNET)).toBe(0);
  });

  it("rounds to whole cents (no float-dust)", () => {
    // 333,333 × 3 / 1e6 = 0.999999 → 1.00
    expect(estimateAstraUsd(333_333, SONNET)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("buildAiSpend", () => {
  it("Atlas: real summed USD, not an estimate", () => {
    const out = buildAiSpend(
      rawFor("atlas", { atlasCostUsd: 12.3456, atlasMessages: 40 }),
    );
    expect(out.applicable).toBe(true);
    expect(out.includesEstimate).toBe(false);
    expect(out.totalCostUsd).toBe(12.35); // rounded to cents
    expect(out.lines).toHaveLength(1);
    expect(out.lines[0]).toMatchObject({
      product: "atlas",
      label: "Atlas",
      messages: 40,
      tokens: null,
      costUsd: 12.35,
      isEstimate: false,
    });
  });

  it("Comply (Astra): token-derived ESTIMATE, badged", () => {
    const out = buildAiSpend(
      rawFor("comply", { astraTokens: 1_000_000, astraMessages: 25 }),
    );
    expect(out.applicable).toBe(true);
    expect(out.includesEstimate).toBe(true);
    expect(out.totalCostUsd).toBe(3); // 1M × $3/M
    expect(out.lines[0]).toMatchObject({
      product: "comply",
      label: "Comply · Astra",
      messages: 25,
      tokens: 1_000_000,
      costUsd: 3,
      isEstimate: true,
    });
  });

  it("Comply with unknown rate: tokens shown, USD null, total 0", () => {
    const out = buildAiSpend(
      rawFor("comply", {
        astraTokens: 1_000_000,
        astraMessages: 5,
        astraUsdPerMtok: 0,
      }),
    );
    expect(out.lines[0].tokens).toBe(1_000_000);
    expect(out.lines[0].costUsd).toBeNull();
    expect(out.lines[0].isEstimate).toBe(false);
    expect(out.totalCostUsd).toBe(0);
    expect(out.includesEstimate).toBe(false);
  });

  it("Trade / Scholar / Pharos: AI lane not applicable", () => {
    for (const p of ["trade", "scholar", "pharos"] as const) {
      const out = buildAiSpend(rawFor(p));
      expect(out.applicable).toBe(false);
      expect(out.lines).toHaveLength(0);
      expect(out.totalCostUsd).toBe(0);
      expect(out.includesEstimate).toBe(false);
    }
  });

  it("does NOT cross-attribute: Atlas product ignores astra fields", () => {
    const out = buildAiSpend(
      rawFor("atlas", {
        atlasCostUsd: 5,
        atlasMessages: 10,
        // these belong to comply and must not leak into the atlas total
        astraTokens: 9_000_000,
        astraMessages: 99,
      }),
    );
    expect(out.totalCostUsd).toBe(5);
    expect(out.lines).toHaveLength(1);
    expect(out.lines[0].product).toBe("atlas");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("buildOutcomes", () => {
  it("weights real counts via the canonical catalogue and sorts heaviest-first", () => {
    const rows: OutcomeCountRaw[] = [
      { outcomeId: "trade_item_classified", count: 10 }, // weight 1 → 10
      { outcomeId: "trade_license_issued", count: 4 }, // weight 3 → 12
      { outcomeId: "trade_screening_decided", count: 6 }, // weight 1 → 6
    ];
    const out = buildOutcomes(rows);
    expect(out.rawTotal).toBe(20);
    expect(out.weightedTotal).toBe(28); // 10 + 12 + 6
    // Heaviest weighted contribution first: licences (12), classified (10), screening (6).
    expect(out.lines.map((l) => l.outcomeId)).toEqual([
      "trade_license_issued",
      "trade_item_classified",
      "trade_screening_decided",
    ]);
    expect(out.lines[0]).toMatchObject({
      outcomeId: "trade_license_issued",
      label: "Licences issued",
      count: 4,
      weighted: 12,
    });
  });

  it("handles the fractional Scholar bookmark weight without float-dust", () => {
    const rows: OutcomeCountRaw[] = [
      { outcomeId: "scholar_bookmark_saved", count: 3 }, // weight 0.25 → 0.75
      { outcomeId: "scholar_planspiel_run", count: 2 }, // weight 1 → 2
    ];
    const out = buildOutcomes(rows);
    expect(out.rawTotal).toBe(5);
    expect(out.weightedTotal).toBe(2.75);
  });

  it("clamps dirty counts and yields an empty/zero shape for no rows", () => {
    expect(buildOutcomes([])).toEqual({
      rawTotal: 0,
      weightedTotal: 0,
      lines: [],
    });
    const out = buildOutcomes([
      { outcomeId: "trade_item_classified", count: -5 },
    ]);
    expect(out.rawTotal).toBe(0);
    expect(out.lines[0].count).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("buildOrgRows", () => {
  it("sorts by activeUsers desc, then spend desc, then outcomes desc, then name", () => {
    const rows: OrgAggregateRaw[] = [
      {
        organizationId: "o1",
        orgName: "Beta",
        activeUsers: 3,
        spendUsd: 10,
        outcomes: 5,
      },
      {
        organizationId: "o2",
        orgName: "Alpha",
        activeUsers: 5,
        spendUsd: 1,
        outcomes: 2,
      },
      {
        organizationId: "o3",
        orgName: "Gamma",
        activeUsers: 5,
        spendUsd: 9,
        outcomes: 1,
      },
    ];
    const out = buildOrgRows(rows);
    // o2 & o3 tie on activeUsers (5); o3 has higher spend → o3 first.
    expect(out.map((r) => r.organizationId)).toEqual(["o3", "o2", "o1"]);
  });

  it("a null spend sorts AFTER any real spend at the same active-user count", () => {
    const rows: OrgAggregateRaw[] = [
      {
        organizationId: "n",
        orgName: "NoSpend",
        activeUsers: 4,
        spendUsd: null,
        outcomes: 0,
      },
      {
        organizationId: "s",
        orgName: "HasSpend",
        activeUsers: 4,
        spendUsd: 0.01,
        outcomes: 0,
      },
    ];
    const out = buildOrgRows(rows);
    expect(out.map((r) => r.organizationId)).toEqual(["s", "n"]);
  });

  it("substitutes an em-dash for a blank org name and rounds spend", () => {
    const rows: OrgAggregateRaw[] = [
      {
        organizationId: "x",
        orgName: "   ",
        activeUsers: 1,
        spendUsd: 1.239,
        outcomes: 0,
      },
    ];
    const out = buildOrgRows(rows);
    expect(out[0].orgName).toBe("—");
    expect(out[0].spendUsd).toBe(1.24);
  });

  it("preserves a null spend as null (not 0) — honest 'not applicable'", () => {
    const rows: OrgAggregateRaw[] = [
      {
        organizationId: "x",
        orgName: "Org",
        activeUsers: 2,
        spendUsd: null,
        outcomes: 3,
      },
    ];
    expect(buildOrgRows(rows)[0].spendUsd).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("buildEntitlement", () => {
  it("computes idle + activation rate from entitled vs active", () => {
    const out = buildEntitlement(
      rawFor("comply", { entitledOrgs: 10, entitledActiveOrgs: 4 }),
    );
    expect(out.entitledOrgs).toBe(10);
    expect(out.activeOrgs).toBe(4);
    expect(out.idleOrgs).toBe(6);
    expect(out.activationRate).toBeCloseTo(0.4, 10);
  });

  it("activationRate is null when no orgs are entitled (no denominator)", () => {
    const out = buildEntitlement(
      rawFor("pharos", { entitledOrgs: 0, entitledActiveOrgs: 0 }),
    );
    expect(out.activationRate).toBeNull();
    expect(out.idleOrgs).toBe(0);
  });

  it("clamps active > entitled (data anomaly) so idle never goes negative", () => {
    const out = buildEntitlement(
      rawFor("atlas", { entitledOrgs: 3, entitledActiveOrgs: 99 }),
    );
    expect(out.activeOrgs).toBe(3);
    expect(out.idleOrgs).toBe(0);
    expect(out.activationRate).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("buildProductExplorer (composer)", () => {
  it("assembles a full view and computes the usage trend", () => {
    const view = buildProductExplorer(
      rawFor("atlas", {
        activeUsers: 12,
        activeUsersPrior: 8,
        logins: 40,
        atlasCostUsd: 7.5,
        atlasMessages: 30,
        outcomeCounts: [{ outcomeId: "atlas_draft_produced", count: 30 }],
        orgRows: [
          {
            organizationId: "o1",
            orgName: "Acme",
            activeUsers: 9,
            spendUsd: 7.5,
            outcomes: 30,
          },
        ],
        entitledOrgs: 4,
        entitledActiveOrgs: 1,
      }),
    );
    expect(view.product).toBe("atlas");
    expect(view.label).toBe("Atlas");
    expect(view.usage.activeUsers).toBe(12);
    expect(view.usage.activeUsersTrend).toBeCloseTo(0.5, 10); // (12-8)/8
    expect(view.usage.logins).toBe(40);
    expect(view.aiSpend.totalCostUsd).toBe(7.5);
    expect(view.aiSpend.includesEstimate).toBe(false);
    expect(view.outcomes.rawTotal).toBe(30);
    expect(view.outcomes.weightedTotal).toBe(30); // atlas_draft weight 1
    expect(view.orgRows).toHaveLength(1);
    expect(view.entitlement.idleOrgs).toBe(3);
    expect(view.isEmpty).toBe(false);
  });

  it("isEmpty is true only when EVERYTHING is zero", () => {
    const empty = buildProductExplorer(rawFor("pharos"));
    expect(empty.isEmpty).toBe(true);

    // A product with ONLY AI spend (no outcomes/users/orgs) is NOT empty —
    // it still costs money and must be shown.
    const onlyCost = buildProductExplorer(
      rawFor("comply", { astraTokens: 1_000_000, astraMessages: 1 }),
    );
    expect(onlyCost.aiSpend.totalCostUsd).toBe(3);
    expect(onlyCost.isEmpty).toBe(false);

    // A product with ONLY entitled orgs (pre-activation) is NOT empty.
    const onlyEntitled = buildProductExplorer(
      rawFor("trade", { entitledOrgs: 2 }),
    );
    expect(onlyEntitled.isEmpty).toBe(false);
  });

  it("propagates orgBreakdownUnavailable (Scholar is user-decoupled)", () => {
    const view = buildProductExplorer(
      rawFor("scholar", {
        activeUsers: 6,
        orgBreakdownUnavailable: true,
        outcomeCounts: [{ outcomeId: "scholar_planspiel_run", count: 4 }],
      }),
    );
    expect(view.orgBreakdownUnavailable).toBe(true);
    expect(view.orgRows).toHaveLength(0);
    // Active-user COUNT still works for a user-decoupled product (a single number).
    expect(view.usage.activeUsers).toBe(6);
    expect(view.isEmpty).toBe(false);
  });

  it("a null prior window yields a null trend (no 'new' fabricated as 0)", () => {
    const view = buildProductExplorer(
      rawFor("trade", { activeUsers: 5, activeUsersPrior: null }),
    );
    expect(view.usage.activeUsersTrend).toBeNull();
  });

  it("clamps a dirty activeUsers count to a non-negative integer", () => {
    const view = buildProductExplorer(rawFor("trade", { activeUsers: -3 }));
    expect(view.usage.activeUsers).toBe(0);
  });
});
