// src/lib/trade/intake/canonical-item-classes.test.ts
import { describe, it, expect } from "vitest";
import {
  CANONICAL_ITEM_CLASSES,
  isCanonicalItemClassPrefix,
} from "./canonical-item-classes";

describe("CANONICAL_ITEM_CLASSES", () => {
  it("is derived from the corpus and non-empty", () => {
    expect(CANONICAL_ITEM_CLASSES.size).toBeGreaterThan(10);
  });
  it("contains the verified real prefixes", () => {
    expect(CANONICAL_ITEM_CLASSES.has("spacecraft.adcs.star_tracker")).toBe(
      true,
    );
    expect(CANONICAL_ITEM_CLASSES.has("gnss.receiver")).toBe(true);
  });
  it("never contains the legacy extractor mislabel", () => {
    expect(CANONICAL_ITEM_CLASSES.has("avionics.attitude.star_tracker")).toBe(
      false,
    );
  });
  it("isCanonicalItemClassPrefix matches a real corpus class by prefix", () => {
    // a category's canonicalItemClass is valid iff it is the prefix of >=1 real class
    expect(isCanonicalItemClassPrefix("spacecraft.adcs.star_tracker")).toBe(
      true,
    );
    expect(isCanonicalItemClassPrefix("spacecraft.power")).toBe(true); // prefix of .solar/.battery
    expect(isCanonicalItemClassPrefix("totally.invented.class")).toBe(false);
  });
});
