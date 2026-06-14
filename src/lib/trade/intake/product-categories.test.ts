// src/lib/trade/intake/product-categories.test.ts
import { describe, it, expect } from "vitest";
import {
  PRODUCT_CATEGORIES,
  GENERIC_CATEGORY_ID,
  getCategory,
  renderedFields,
} from "./product-categories";
import { isCanonicalItemClassPrefix } from "./canonical-item-classes";
import { getAttributeField } from "./attribute-fields";
import { deriveRelevantAttributes } from "./derive-relevant-attributes";

/** The 12 class-scoped categories carry a real corpus prefix; the generic
 *  "Andere — nicht gelistet" entry (B11) deliberately carries NONE so the
 *  matcher is never mis-scoped. Tests over the prefix invariant operate on the
 *  scoped subset only. */
const SCOPED_CATEGORIES = PRODUCT_CATEGORIES.filter(
  (c) => c.id !== GENERIC_CATEGORY_ID,
);

describe("product-category catalog", () => {
  it("ships 12 class-scoped categories + 1 generic fallback (B11)", () => {
    expect(SCOPED_CATEGORIES.length).toBe(12);
    expect(PRODUCT_CATEGORIES.length).toBe(13);
  });
  it("every scoped canonicalItemClass is a real corpus prefix (the §0 invariant)", () => {
    for (const c of SCOPED_CATEGORIES) {
      expect(c.canonicalItemClass, c.id).toBeTruthy();
      expect(
        isCanonicalItemClassPrefix(c.canonicalItemClass as string),
        `${c.id}: ${c.canonicalItemClass}`,
      ).toBe(true);
    }
  });
  it("B11 — the generic 'Andere' category injects NO itemClass and renders NO scoped fields", () => {
    const generic = getCategory(GENERIC_CATEGORY_ID);
    expect(generic).toBeTruthy();
    // No corpus prefix → the matcher stays unscoped (never mis-scoped onto a
    // wrong class's itemClass).
    expect(generic!.canonicalItemClass).toBeUndefined();
    // No derived parametric fields — the operator is routed to the text /
    // declared-code path, not a guessed parametric form.
    expect(renderedFields(GENERIC_CATEGORY_ID)).toEqual([]);
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
    for (const c of SCOPED_CATEGORIES) {
      const derived = deriveRelevantAttributes(c.canonicalItemClass as string);
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
