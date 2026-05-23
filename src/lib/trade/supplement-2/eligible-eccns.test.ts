/**
 * Tests for src/lib/trade/supplement-2/eligible-eccns.ts (Z29, Tier 4).
 *
 * Coverage (6 cases):
 *   1. Exact-match ECCN root is eligible
 *   2. Sub-paragraph of an eligible root is eligible (prefix match)
 *   3. Sibling-paragraph just-outside-root is NOT eligible
 *   4. Unrelated ECCN is NOT eligible
 *   5. Empty / null / undefined input returns false (no throw)
 *   6. filterEligibleEccns extracts only the eligible ones
 */

import { describe, it, expect } from "vitest";
import {
  isEligibleEccn,
  filterEligibleEccns,
  ELIGIBLE_ECCN_PREFIXES,
} from "./eligible-eccns";

describe("isEligibleEccn", () => {
  it("matches an exact eligible ECCN root", () => {
    expect(isEligibleEccn("3A001.b.3")).toBe(true);
    expect(isEligibleEccn("5A002.a")).toBe(true);
    expect(isEligibleEccn("4A003")).toBe(true);
  });

  it("matches a sub-paragraph of an eligible root via prefix", () => {
    // 3A001.b.3 is eligible → 3A001.b.3.a should match
    expect(isEligibleEccn("3A001.b.3.a")).toBe(true);
    // 5A002.a is eligible → 5A002.a.1.b should match
    expect(isEligibleEccn("5A002.a.1.b")).toBe(true);
    // 4A003 is eligible → 4A003.b should match
    expect(isEligibleEccn("4A003.b")).toBe(true);
  });

  it("does NOT match a sibling paragraph of an eligible root", () => {
    // 3A001.b.3 is eligible but 3A001.b.4 is NOT (sibling, different
    // sub-paragraph) — prefix match requires the trailing dot.
    expect(isEligibleEccn("3A001.b.4")).toBe(false);
    // 5A002.a is eligible; 5A002.aa would be a different code (no dot)
    expect(isEligibleEccn("5A002.aa")).toBe(false);
  });

  it("does NOT match an unrelated ECCN", () => {
    expect(isEligibleEccn("9A515.a")).toBe(false);
    expect(isEligibleEccn("1A001")).toBe(false);
    expect(isEligibleEccn("0A613")).toBe(false);
  });

  it("returns false (no throw) for empty / null / undefined", () => {
    expect(isEligibleEccn(null)).toBe(false);
    expect(isEligibleEccn(undefined)).toBe(false);
    expect(isEligibleEccn("")).toBe(false);
    expect(isEligibleEccn("   ")).toBe(false);
  });

  it("is case-insensitive on the ECCN root", () => {
    expect(isEligibleEccn("3a001.b.3")).toBe(true);
    expect(isEligibleEccn("5a002.A.1.B")).toBe(true);
  });
});

describe("filterEligibleEccns", () => {
  it("returns only the eligible entries", () => {
    const input = [
      "9A515.a",
      "5A002.a",
      null,
      "3A001.b.3.a",
      "1A001",
      undefined,
    ];
    expect(filterEligibleEccns(input)).toEqual(["5A002.a", "3A001.b.3.a"]);
  });
});

describe("ELIGIBLE_ECCN_PREFIXES", () => {
  it("contains all documented Supplement No. 2 categories", () => {
    expect(ELIGIBLE_ECCN_PREFIXES).toContain("3A001.a.5.a");
    expect(ELIGIBLE_ECCN_PREFIXES).toContain("4A003");
    expect(ELIGIBLE_ECCN_PREFIXES).toContain("5A002.a");
    expect(ELIGIBLE_ECCN_PREFIXES).toContain("5A992.c");
  });
});
