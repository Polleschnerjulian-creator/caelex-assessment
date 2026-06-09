/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the pure AI unit-economics math (admin/efficiency lane).
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  estimateUsdFromTokens,
  costPerAccount,
  costPctOfMrr,
  computeAiCost,
  type AiCostInputs,
} from "./ai-cost";

// The canonical Sonnet-4.6 input rate the route injects ($/1M tokens).
const RATE = 3.0;

/** Build AiCostInputs with sensible defaults; override per-test. */
function inputs(overrides: Partial<AiCostInputs> = {}): AiCostInputs {
  return {
    atlasCostUsd: 0,
    atlasMessages: 0,
    astraTokens: 0,
    astraMessages: 0,
    astraUsdPerMtok: RATE,
    activeAccounts: 0,
    mrr: 0,
    ...overrides,
  };
}

describe("estimateUsdFromTokens", () => {
  it("multiplies tokens by the $/1M rate and rounds to cents", () => {
    // 2,000,000 tokens × $3/1M = $6.00
    expect(estimateUsdFromTokens(2_000_000, 3.0)).toBe(6);
    // 500,000 × $3/1M = $1.50
    expect(estimateUsdFromTokens(500_000, 3.0)).toBe(1.5);
  });

  it("returns null when the rate is non-positive (rate unknown → tokens only)", () => {
    expect(estimateUsdFromTokens(1_000_000, 0)).toBeNull();
    expect(estimateUsdFromTokens(1_000_000, -1)).toBeNull();
    expect(estimateUsdFromTokens(1_000_000, Number.NaN)).toBeNull();
  });

  it("floors dirty token counts and never returns a negative", () => {
    expect(estimateUsdFromTokens(-5, 3.0)).toBe(0);
    expect(estimateUsdFromTokens(Number.NaN, 3.0)).toBe(0);
  });
});

describe("costPerAccount", () => {
  it("divides total USD by active accounts, rounded to cents", () => {
    expect(costPerAccount(100, 4)).toBe(25);
    expect(costPerAccount(10, 3)).toBe(3.33);
  });

  it("returns null when there are no active accounts (no denominator)", () => {
    expect(costPerAccount(100, 0)).toBeNull();
    expect(costPerAccount(100, -2)).toBeNull();
  });
});

describe("costPctOfMrr", () => {
  it("returns the cost/MRR fraction at 4dp", () => {
    expect(costPctOfMrr(50, 1000)).toBeCloseTo(0.05, 10);
  });

  it("returns null when MRR is 0 (revenue not wired)", () => {
    expect(costPctOfMrr(50, 0)).toBeNull();
  });
});

describe("computeAiCost", () => {
  it("is empty when there is no AI footprint at all", () => {
    const r = computeAiCost(inputs());
    expect(r.isEmpty).toBe(true);
    expect(r.totalCostUsd).toBe(0);
    expect(r.costPerActiveAccount).toBeNull();
    expect(r.marginCostPctOfMrr).toBeNull();
    expect(r.totalIncludesEstimate).toBe(false);
  });

  it("sums real Atlas USD and estimated Astra USD into the total", () => {
    const r = computeAiCost(
      inputs({
        atlasCostUsd: 12.5,
        atlasMessages: 40,
        astraTokens: 1_000_000, // × $3/1M = $3.00 estimated
        astraMessages: 10,
      }),
    );
    expect(r.totalCostUsd).toBe(15.5); // 12.50 real + 3.00 estimate
    expect(r.totalIncludesEstimate).toBe(true);
    expect(r.isEmpty).toBe(false);
  });

  it("keeps Atlas as a real (non-estimate) line and Astra as an estimate line", () => {
    const r = computeAiCost(
      inputs({
        atlasCostUsd: 20,
        atlasMessages: 5,
        astraTokens: 2_000_000,
        astraMessages: 8,
      }),
    );
    const atlas = r.perProduct.find((p) => p.product === "atlas")!;
    const comply = r.perProduct.find((p) => p.product === "comply")!;

    expect(atlas.isEstimate).toBe(false);
    expect(atlas.costUsd).toBe(20);
    expect(atlas.tokens).toBeNull();

    expect(comply.isEstimate).toBe(true);
    expect(comply.costUsd).toBe(6); // 2M × $3/1M
    expect(comply.tokens).toBe(2_000_000);
    expect(comply.label).toBe("Comply · Astra");
  });

  it("sorts the per-product split by USD cost desc (null cost sorts last)", () => {
    const r = computeAiCost(
      inputs({
        atlasCostUsd: 2, // small real cost
        atlasMessages: 1,
        astraTokens: 5_000_000, // $15 estimate → heavier
        astraMessages: 3,
      }),
    );
    expect(r.perProduct[0].product).toBe("comply"); // $15 > $2
    expect(r.perProduct[1].product).toBe("atlas");
  });

  it("computes cost per active account and % of MRR from the total", () => {
    const r = computeAiCost(
      inputs({
        atlasCostUsd: 100,
        atlasMessages: 50,
        activeAccounts: 10,
        mrr: 1000,
      }),
    );
    expect(r.totalCostUsd).toBe(100);
    expect(r.costPerActiveAccount).toBe(10); // 100 / 10
    expect(r.marginCostPctOfMrr).toBeCloseTo(0.1, 10); // 100 / 1000
  });

  it("reports Astra tokens with a null cost when the rate is unknown (no invented $)", () => {
    const r = computeAiCost(
      inputs({
        astraTokens: 4_000_000,
        astraMessages: 12,
        astraUsdPerMtok: 0, // rate unknown
      }),
    );
    const comply = r.perProduct.find((p) => p.product === "comply")!;
    expect(comply.tokens).toBe(4_000_000);
    expect(comply.costUsd).toBeNull();
    expect(comply.isEstimate).toBe(false); // no figure → not an estimate
    // Astra contributes 0 USD to the total when its cost is unknown.
    expect(r.totalCostUsd).toBe(0);
    expect(r.totalIncludesEstimate).toBe(false);
    // But it is NOT empty — there is a real AI footprint (tokens + messages).
    expect(r.isEmpty).toBe(false);
  });

  it("null per-account and margin when accounts/MRR are zero but cost exists", () => {
    const r = computeAiCost(
      inputs({ atlasCostUsd: 50, atlasMessages: 9, activeAccounts: 0, mrr: 0 }),
    );
    expect(r.totalCostUsd).toBe(50);
    expect(r.costPerActiveAccount).toBeNull();
    expect(r.marginCostPctOfMrr).toBeNull();
  });
});
