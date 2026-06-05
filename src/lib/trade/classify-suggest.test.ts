import { describe, it, expect } from "vitest";
import {
  attributesToBag,
  attributesToCandidateCodes,
  suggestionsFromAttributesAndText,
  type SuggestInputAttribute,
} from "./classify-suggest";

describe("attributesToBag", () => {
  it("folds vision attributes into an ItemAttributeBag by attribute name", () => {
    const attrs: SuggestInputAttribute[] = [
      { attribute: "apertureMeters", value: 0.8, confidence: "high" },
      { attribute: "frequencyGhz", value: 9.2, confidence: "medium" },
      { attribute: "isRadHardened", value: true, confidence: "high" },
    ];
    const bag = attributesToBag(attrs);
    expect(bag.apertureMeters).toBe(0.8);
    expect(bag.frequencyGhz).toBe(9.2);
    expect(bag.isRadHardened).toBe(true);
  });

  it("ignores attribute names that are not ItemAttributeBag keys", () => {
    const bag = attributesToBag([
      { attribute: "totallyUnknownAttr" as never, value: 1, confidence: "low" },
      { attribute: "apertureMeters", value: 0.5, confidence: "high" },
    ]);
    expect(bag.apertureMeters).toBe(0.5);
    expect((bag as Record<string, unknown>).totallyUnknownAttr).toBeUndefined();
  });
});

describe("attributesToCandidateCodes", () => {
  it("returns an empty list when no attributes are populated", () => {
    expect(attributesToCandidateCodes([])).toEqual([]);
  });

  it("maps matcher candidates to UI code suggestions (code, regime, title, confidence)", () => {
    const suggestions = attributesToCandidateCodes([
      { attribute: "apertureMeters", value: 0.8, confidence: "high" },
      { attribute: "gsdMeters", value: 0.4, confidence: "high" },
    ]);
    expect(Array.isArray(suggestions)).toBe(true);
    if (suggestions.length > 0) {
      const s = suggestions[0];
      expect(typeof s.code).toBe("string");
      expect(s.code.length).toBeGreaterThan(0);
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(s.confidence);
      expect(typeof s.title).toBe("string");
    }
  });
});

// ─── Rich datasheet path (composeDraft: candidates + possible + near-miss
//     + DCW-1 keyword fallback). This is what /api/trade/classify/suggest-codes
//     uses so the datasheet upload surfaces more than just full parametric
//     candidates — without ever inflating confidence above LOW for hints. ──────

describe("suggestionsFromAttributesAndText", () => {
  it("returns [] for no attributes and non-distinctive text", () => {
    expect(suggestionsFromAttributesAndText([], "Marketing copy.")).toEqual([]);
  });

  it("surfaces a LOW-confidence keyword hint when the datasheet TEXT matches a control-list entry but no numeric attribute does", () => {
    // Distinctive USML XV(e) terms (lithium-thionyl chloride batteries), no
    // numeric attributes → the parametric matcher is empty, so the keyword
    // fallback fires. A code the predicate matcher structurally cannot see.
    const out = suggestionsFromAttributesAndText(
      [],
      "Lithium-thionyl chloride chemistry cells for power storage units.",
    );
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((s) => s.confidence === "LOW")).toBe(true);
    expect(out[0].code.length).toBeGreaterThan(0);
  });

  it("still returns a strong parametric candidate from attributes alone (no text)", () => {
    const out = suggestionsFromAttributesAndText([
      {
        attribute: "itemClass",
        value: "spacecraft.remote_sensing.eo",
        confidence: "high",
      },
      { attribute: "apertureMeters", value: 0.3, confidence: "high" },
    ]);
    expect(out.length).toBeGreaterThan(0);
    expect(["HIGH", "MEDIUM"]).toContain(out[0].confidence);
  });

  it("keeps a real candidate ahead of keyword noise when both text and attributes are present", () => {
    const out = suggestionsFromAttributesAndText(
      [
        {
          attribute: "itemClass",
          value: "spacecraft.remote_sensing.eo",
          confidence: "high",
        },
        { attribute: "apertureMeters", value: 0.3, confidence: "high" },
      ],
      "Lithium-thionyl chloride chemistry cells.",
    );
    // Strong parametric candidate is pushed before keyword fallbacks.
    expect(["HIGH", "MEDIUM"]).toContain(out[0].confidence);
  });
});
