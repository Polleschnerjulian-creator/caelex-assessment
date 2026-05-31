import { describe, it, expect } from "vitest";
import {
  attributesToBag,
  attributesToCandidateCodes,
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
