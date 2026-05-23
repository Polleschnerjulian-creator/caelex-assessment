/**
 * Tests for uk-strategic-list-mapping.ts (Z37-UK).
 *
 * Coverage:
 *   1. lookupEuCrossReference handles canonical PL codes
 *   2. lookupEuCrossReference is case-insensitive
 *   3. lookupEuCrossReference strips subentries (PL5002A.1 → PL5002A)
 *   4. lookupEuCrossReference returns null for unknown codes
 *   5. lookupEuCrossReference handles military ML codes
 *   6. lookupUkPrefixForEuCode reverse mapping
 *   7. UK_STRATEGIC_LIST_PREFIX_MAPPING covers space-relevant categories
 */

import { describe, it, expect } from "vitest";
import {
  UK_STRATEGIC_LIST_PREFIX_MAPPING,
  lookupEuCrossReference,
  lookupUkPrefixForEuCode,
} from "./uk-strategic-list-mapping";

describe("lookupEuCrossReference", () => {
  it("maps canonical PL5002A → EU:5A002.a", () => {
    expect(lookupEuCrossReference("PL5002A")).toBe("EU:5A002.a");
  });

  it("is case-insensitive (pl5002a)", () => {
    expect(lookupEuCrossReference("pl5002a")).toBe("EU:5A002.a");
  });

  it("strips trailing subentries (PL5002A.1)", () => {
    expect(lookupEuCrossReference("PL5002A.1")).toBe("EU:5A002.a");
  });

  it("strips trailing whitespace + subentries (' PL9003 .b ')", () => {
    expect(lookupEuCrossReference(" PL9003 .b ")).toBe("EU:9A003");
  });

  it("returns null for unknown codes", () => {
    expect(lookupEuCrossReference("XXX9999")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(lookupEuCrossReference("")).toBeNull();
  });

  it("maps military ML codes (ML10 → EU:ML10)", () => {
    expect(lookupEuCrossReference("ML10")).toBe("EU:ML10");
  });

  it("maps space-relevant ML15 (imaging)", () => {
    expect(lookupEuCrossReference("ML15")).toBe("EU:ML15");
  });
});

describe("lookupUkPrefixForEuCode", () => {
  it("reverse maps EU:5A002.a → PL5002A", () => {
    expect(lookupUkPrefixForEuCode("EU:5A002.a")).toBe("PL5002A");
  });

  it("reverse maps is case-insensitive", () => {
    expect(lookupUkPrefixForEuCode("eu:9a003")).toBe("PL9003");
  });

  it("returns null for unmapped EU codes", () => {
    expect(lookupUkPrefixForEuCode("EU:9X999")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(lookupUkPrefixForEuCode("")).toBeNull();
  });
});

describe("UK_STRATEGIC_LIST_PREFIX_MAPPING coverage", () => {
  it("includes spacecraft category (PL9003)", () => {
    expect(UK_STRATEGIC_LIST_PREFIX_MAPPING).toHaveProperty("PL9003");
  });

  it("includes launch vehicle category (PL9010)", () => {
    expect(UK_STRATEGIC_LIST_PREFIX_MAPPING).toHaveProperty("PL9010");
  });

  it("includes cryptography category (PL5002A)", () => {
    expect(UK_STRATEGIC_LIST_PREFIX_MAPPING).toHaveProperty("PL5002A");
  });

  it("all values use EU: or WA: prefix", () => {
    for (const value of Object.values(UK_STRATEGIC_LIST_PREFIX_MAPPING)) {
      expect(value).toMatch(/^(EU|WA):/);
    }
  });
});
