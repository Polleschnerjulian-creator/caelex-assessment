// src/lib/trade/classify-suggest.intake.test.ts
import { describe, it, expect } from "vitest";
import {
  attributesToBag,
  suggestionsFromAttributesAndText,
} from "./classify-suggest";

describe("attributesToBag — extended attribute routing", () => {
  it("routes typed keys to typed fields", () => {
    const bag = attributesToBag([
      { attribute: "payloadKg", value: 600, confidence: "high" },
    ]);
    expect(bag.payloadKg).toBe(600);
  });
  it("routes EXTENDED keys into parametricAttributes (so the matcher sees them)", () => {
    const bag = attributesToBag([
      {
        attribute: "starTrackerAccuracyArcsec",
        value: 0.5,
        confidence: "high",
      },
      {
        attribute: "starTrackerSlewRateDegPerS",
        value: 4.0,
        confidence: "high",
      },
    ]);
    expect(bag.parametricAttributes).toBeTruthy();
    expect(
      (bag.parametricAttributes as Record<string, unknown>)
        .starTrackerAccuracyArcsec,
    ).toBe(0.5);
    expect(
      (bag.parametricAttributes as Record<string, unknown>)
        .starTrackerSlewRateDegPerS,
    ).toBe(4.0);
  });
});

describe("suggestionsFromAttributesAndText — decisive field now fires the candidate", () => {
  it("a 0.5-arcsec / 4 deg-s star tracker yields USML:XV(e)(16) as a candidate", () => {
    const suggestions = suggestionsFromAttributesAndText([
      {
        attribute: "itemClass",
        value: "spacecraft.adcs.star_tracker",
        confidence: "high",
      },
      {
        attribute: "starTrackerAccuracyArcsec",
        value: 0.5,
        confidence: "high",
      },
      {
        attribute: "starTrackerSlewRateDegPerS",
        value: 4.0,
        confidence: "high",
      },
    ]);
    const ids = suggestions.map((s) => s.canonicalId);
    expect(ids).toContain("USML:XV(e)(16)");
  });
});
