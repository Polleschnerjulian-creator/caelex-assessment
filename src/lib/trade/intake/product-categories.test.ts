// src/lib/trade/intake/product-categories.test.ts
import { describe, it, expect } from "vitest";
import {
  PRODUCT_CATEGORIES,
  getCategory,
  renderedFields,
} from "./product-categories";
import { isCanonicalItemClassPrefix } from "./canonical-item-classes";
import { getAttributeField } from "./attribute-fields";
import { deriveRelevantAttributes } from "./derive-relevant-attributes";

describe("product-category catalog", () => {
  it("ships 12 categories", () => {
    expect(PRODUCT_CATEGORIES.length).toBe(12);
  });
  it("every canonicalItemClass is a real corpus prefix (the §0 invariant)", () => {
    for (const c of PRODUCT_CATEGORIES) {
      expect(
        isCanonicalItemClassPrefix(c.canonicalItemClass),
        `${c.id}: ${c.canonicalItemClass}`,
      ).toBe(true);
    }
  });
  it("every rendered field has a dictionary entry (completeness)", () => {
    for (const c of PRODUCT_CATEGORIES) {
      for (const a of renderedFields(c.id)) {
        expect(
          getAttributeField(a),
          `${c.id} field ${a} missing in dictionary`,
        ).toBeTruthy();
      }
    }
  });
  it("curation overlay is monotone-non-shrinking on the decisive set", () => {
    for (const c of PRODUCT_CATEGORIES) {
      const derived = deriveRelevantAttributes(c.canonicalItemClass);
      const renderedPlusHidden = new Set([
        ...renderedFields(c.id),
        ...(c.overlay?.hide ?? []),
      ]);
      for (const a of derived) {
        expect(
          renderedPlusHidden.has(a),
          `${c.id} dropped decisive field ${a}`,
        ).toBe(true);
      }
    }
  });
  it("renders a class-specific decisive threshold first, not the ubiquitous boolean", () => {
    // overlay.order pins class-specific NUMERIC thresholds ahead of
    // isSpeciallyDesigned (which the global decisivenessRank over-weights
    // because it appears in ~25 corpus entries).
    expect(renderedFields("star_tracker")[0]).toBe("starTrackerAccuracyArcsec");
  });
});
