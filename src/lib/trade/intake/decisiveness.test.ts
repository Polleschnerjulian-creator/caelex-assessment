// src/lib/trade/intake/decisiveness.test.ts
import { describe, it, expect } from "vitest";
import { decisivenessRank } from "./decisiveness";

describe("decisivenessRank", () => {
  it("ranks a threshold attribute on an ITAR/MTCR entry above a non-threshold attribute", () => {
    // starTrackerAccuracyArcsec gates USML:XV(e)(16) (ITAR, lte threshold)
    expect(decisivenessRank("starTrackerAccuracyArcsec")).toBeGreaterThan(0);
  });
  it("an attribute never used in any predicate has rank 0", () => {
    // focalLengthMM is defined in AttributeName but never appears in a predicate
    expect(decisivenessRank("focalLengthMM")).toBe(0);
  });
});
