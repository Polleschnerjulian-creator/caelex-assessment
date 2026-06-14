// src/lib/trade/intake/derive-relevant-attributes.test.ts
import { describe, it, expect } from "vitest";
import { deriveRelevantAttributes } from "./derive-relevant-attributes";

describe("deriveRelevantAttributes", () => {
  it("includes the decisive star-tracker predicates", () => {
    const attrs = deriveRelevantAttributes("spacecraft.adcs.star_tracker");
    expect(attrs).toContain("starTrackerAccuracyArcsec");
    expect(attrs).toContain("starTrackerSlewRateDegPerS");
  });
  it("never includes itemClass itself", () => {
    expect(
      deriveRelevantAttributes("spacecraft.adcs.star_tracker"),
    ).not.toContain("itemClass");
  });
  it("includes the gnss velocity gate for gnss.receiver", () => {
    expect(deriveRelevantAttributes("gnss.receiver")).toContain(
      "gnssMaxVelocityMPerS",
    );
  });
  it("returns [] for an unknown class (honest, no guessing)", () => {
    expect(deriveRelevantAttributes("totally.invented")).toEqual([]);
  });
});
