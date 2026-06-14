// src/lib/trade/intake/classification-input.test.ts
//
// The integration test the unit suite was MISSING: the scoped-intake form
// lets the operator pick a product class but the classification call never
// received the category's `itemClass`, so the matcher could not scope to the
// class. A 10-arcsec star tracker was therefore suggested as 7A002.a (a gyro)
// on a coincidental numeric overlap. The fix is `classificationInputForCategory`,
// which injects the selected category's canonicalItemClass into the matcher
// input. These tests exercise the integration WITHOUT hand-feeding itemClass —
// the previous tests passed only because they supplied itemClass manually.
import { describe, it, expect } from "vitest";
import { classificationInputForCategory } from "./classification-input";
import { suggestionsFromAttributesAndText } from "@/lib/trade/classify-suggest";

describe("classificationInputForCategory — itemClass injection", () => {
  it("prepends the category's canonicalItemClass for a known category", () => {
    const out = classificationInputForCategory("star_tracker", [
      { attribute: "starTrackerAccuracyArcsec", value: 10, confidence: "high" },
      { attribute: "starTrackerSlewRateDegPerS", value: 3, confidence: "high" },
    ]);
    const ic = out.find((a) => a.attribute === "itemClass");
    expect(ic).toBeTruthy();
    expect(ic!.value).toBe("spacecraft.adcs.star_tracker");
    // and the scoped attrs are still carried through
    expect(out.some((a) => a.attribute === "starTrackerAccuracyArcsec")).toBe(
      true,
    );
    expect(out.some((a) => a.attribute === "starTrackerSlewRateDegPerS")).toBe(
      true,
    );
  });

  it("B11 — the generic 'Andere' category injects NO itemClass (known category, but no corpus prefix → matcher stays unscoped, never mis-scoped)", () => {
    const scoped = [
      {
        attribute: "isSpeciallyDesigned",
        value: true,
        confidence: "high" as const,
      },
    ];
    const out = classificationInputForCategory("generic_other", scoped);
    expect(out).toEqual(scoped);
    expect(out.some((a) => a.attribute === "itemClass")).toBe(false);
  });

  it("returns the scoped attrs UNCHANGED for an unknown category (honest, no fabricated itemClass)", () => {
    const scoped = [
      {
        attribute: "starTrackerAccuracyArcsec",
        value: 10,
        confidence: "high" as const,
      },
    ];
    const out = classificationInputForCategory("does_not_exist", scoped);
    expect(out).toEqual(scoped);
    expect(out.some((a) => a.attribute === "itemClass")).toBe(false);
  });

  it("does NOT duplicate itemClass when the scoped attrs already carry one (explicit wins)", () => {
    const out = classificationInputForCategory("star_tracker", [
      {
        attribute: "itemClass",
        value: "spacecraft.adcs.reaction_wheel",
        confidence: "high",
      },
      { attribute: "starTrackerAccuracyArcsec", value: 10, confidence: "high" },
    ]);
    const itemClasses = out.filter((a) => a.attribute === "itemClass");
    expect(itemClasses.length).toBe(1);
    // the explicit one wins — the category's class is NOT injected over it
    expect(itemClasses[0]!.value).toBe("spacecraft.adcs.reaction_wheel");
  });

  it("INTEGRATION (the real fix proof): a 10-arcsec star tracker classified via the helper output yields a star-tracker code, NOT the gyro, NOT a rocket", () => {
    // No hand-fed itemClass here — exactly the live UI scenario. The helper
    // supplies it from the chosen category.
    const input = classificationInputForCategory("star_tracker", [
      { attribute: "starTrackerAccuracyArcsec", value: 10, confidence: "high" },
      { attribute: "starTrackerSlewRateDegPerS", value: 3, confidence: "high" },
    ]);
    const s = suggestionsFromAttributesAndText(
      input,
      "autonomous star tracker celestial navigation",
    );
    const ids = s.map((x) => x.canonicalId);
    expect(s.length).toBeGreaterThan(0);
    // the top suggestion is a star-tracker / spacecraft-control code
    expect(s[0]!.canonicalId).toMatch(/9A004|7A004|XV\(e\)\(16\)/);
    // NOT the gyro (the live bug — surfaced as EU:7A002.a without itemClass),
    // NOT a rocket. Prefix-agnostic so a corpus regime rename can't mask it.
    expect(s[0]!.canonicalId).not.toMatch(/7A002\.a/);
    expect(ids.some((id) => /7A002\.a/.test(id))).toBe(false);
    expect(ids).not.toContain("MTCR:Item-1.A.1");
  });
});
