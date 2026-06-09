/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the canonical WACO value-outcome catalogue (value-events.ts).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * These assert the METADATA contract the rest of the steering surface relies on:
 * the catalogue is internally coherent (unique ids, known products, positive
 * weights), the per-product grouping enumerates all five products, and the
 * weighting helper applies `count × weight` with safe guards. Pure functions —
 * no React/DOM/Prisma.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  VALUE_PRODUCTS,
  VALUE_OUTCOME_DEFS,
  VALUE_OUTCOME_BY_ID,
  PRODUCT_VALUE_OUTCOMES,
  VALUE_PRODUCT_LABELS,
  weightedOutcome,
  describeValueEvents,
  type ValueProduct,
} from "./value-events";

describe("VALUE_PRODUCTS", () => {
  it("is exactly the five billable products (mirrors Prisma ProductCode)", () => {
    expect([...VALUE_PRODUCTS]).toEqual([
      "comply",
      "trade",
      "atlas",
      "pharos",
      "scholar",
    ]);
  });
});

describe("VALUE_OUTCOME_DEFS catalogue coherence", () => {
  it("has unique outcome ids", () => {
    const ids = VALUE_OUTCOME_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("references only known products", () => {
    const known = new Set<string>(VALUE_PRODUCTS);
    for (const def of VALUE_OUTCOME_DEFS) {
      expect(known.has(def.product)).toBe(true);
    }
  });

  it("assigns a strictly positive weight to every outcome", () => {
    for (const def of VALUE_OUTCOME_DEFS) {
      expect(def.weight).toBeGreaterThan(0);
      expect(Number.isFinite(def.weight)).toBe(true);
    }
  });

  it("gives every outcome a non-empty label and description", () => {
    for (const def of VALUE_OUTCOME_DEFS) {
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it("weighs binding regulator-facing outcomes (licence, NCA) at least as heavily as a bookmark", () => {
    const bookmark = VALUE_OUTCOME_BY_ID["scholar_bookmark_saved"].weight;
    const licence = VALUE_OUTCOME_BY_ID["trade_license_issued"].weight;
    const nca = VALUE_OUTCOME_BY_ID["nca_submission_filed"].weight;
    expect(licence).toBeGreaterThan(bookmark);
    expect(nca).toBeGreaterThan(bookmark);
  });
});

describe("VALUE_OUTCOME_BY_ID index", () => {
  it("indexes every catalogue entry by its id", () => {
    expect(Object.keys(VALUE_OUTCOME_BY_ID).length).toBe(
      VALUE_OUTCOME_DEFS.length,
    );
    for (const def of VALUE_OUTCOME_DEFS) {
      expect(VALUE_OUTCOME_BY_ID[def.id]).toEqual(def);
    }
  });
});

describe("PRODUCT_VALUE_OUTCOMES grouping", () => {
  it("has a key for ALL five products, even those with no outcomes", () => {
    for (const product of VALUE_PRODUCTS) {
      expect(PRODUCT_VALUE_OUTCOMES[product]).toBeDefined();
      expect(Array.isArray(PRODUCT_VALUE_OUTCOMES[product])).toBe(true);
    }
  });

  it("partitions the catalogue: every outcome appears under exactly one product", () => {
    const flattened = VALUE_PRODUCTS.flatMap((p) => PRODUCT_VALUE_OUTCOMES[p]);
    expect(new Set(flattened).size).toBe(VALUE_OUTCOME_DEFS.length);
    expect(flattened.length).toBe(VALUE_OUTCOME_DEFS.length);
  });

  it("pharos currently has no domain-table outcomes (honest empty group)", () => {
    // P0 derives only from tables that exist today; Pharos workflow outcomes
    // are not yet wired, so its group is intentionally empty (the UI renders a
    // friendly per-product empty state rather than inventing data).
    expect(PRODUCT_VALUE_OUTCOMES.pharos).toEqual([]);
  });

  it("groups each outcome under the product its def declares", () => {
    for (const product of VALUE_PRODUCTS) {
      for (const id of PRODUCT_VALUE_OUTCOMES[product]) {
        expect(VALUE_OUTCOME_BY_ID[id].product).toBe(product);
      }
    }
  });
});

describe("VALUE_PRODUCT_LABELS", () => {
  it("labels all five products, with Passage as the Trade brand name", () => {
    for (const product of VALUE_PRODUCTS) {
      expect(
        VALUE_PRODUCT_LABELS[product as ValueProduct].length,
      ).toBeGreaterThan(0);
    }
    expect(VALUE_PRODUCT_LABELS.trade).toBe("Passage");
  });
});

describe("weightedOutcome", () => {
  it("multiplies a real count by the outcome's weight", () => {
    // trade_license_issued weight is 3.
    expect(weightedOutcome("trade_license_issued", 4)).toBe(12);
    // comply_assessment_completed weight is 2.
    expect(weightedOutcome("comply_assessment_completed", 5)).toBe(10);
    // scholar_bookmark_saved weight is 0.25.
    expect(weightedOutcome("scholar_bookmark_saved", 8)).toBe(2);
  });

  it("contributes 0 for a zero / negative / non-finite count (never garbage)", () => {
    expect(weightedOutcome("trade_license_issued", 0)).toBe(0);
    expect(weightedOutcome("trade_license_issued", -3)).toBe(0);
    expect(weightedOutcome("trade_license_issued", Number.NaN)).toBe(0);
    expect(weightedOutcome("trade_license_issued", Infinity)).toBe(0);
  });
});

describe("describeValueEvents", () => {
  it("returns one entry per catalogue outcome, in order", () => {
    const described = describeValueEvents();
    expect(described.map((d) => d.id)).toEqual(
      VALUE_OUTCOME_DEFS.map((d) => d.id),
    );
  });

  it("returns a defensive copy (mutating the result cannot corrupt the catalogue)", () => {
    const described = describeValueEvents();
    described[0].weight = 999;
    described[0].label = "TAMPERED";
    // The frozen catalogue is unchanged.
    expect(VALUE_OUTCOME_DEFS[0].weight).not.toBe(999);
    expect(VALUE_OUTCOME_DEFS[0].label).not.toBe("TAMPERED");
  });
});
