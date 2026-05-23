/**
 * Tests for src/lib/comply-v2/trade/classification/suffix-digit-correlator.ts
 * — Sprint Z27.
 *
 * Tier 3, Blueprint 3 § 4.1 + § 11. The Annex-I / CCL suffix-digit
 * hierarchy is the strongest auto-correlation key the cross-walk has;
 * any drift in this parser breaks the entire jurisdiction roll-up.
 *
 * Test bands:
 *   1. parseEccnHierarchy — all 5 hierarchy depths + edge cases.
 *   2. rollUpHierarchy   — most-specific-first ordering.
 *   3. rollDownHierarchy — prefix matching with fixture entries.
 *   4. correlateMatch    — exact / broader / narrower split.
 *   5. Pure-function     — no mutation of inputs.
 */

import { describe, it, expect } from "vitest";
import type { ClassificationEntry } from "@/data/trade/schema";
import {
  parseEccnHierarchy,
  rollUpHierarchy,
  rollDownHierarchy,
  correlateMatch,
  type EccnHierarchy,
} from "./suffix-digit-correlator";

// ─── Fixture ───────────────────────────────────────────────────────────
//
// Synthetic ClassificationEntry list spanning the full hierarchical
// range. Codes are real (BIS Annex I + CCL), values are placeholders
// — we only test the correlator, not the data validity.

const FIXTURE: ClassificationEntry[] = [
  // 9A515 family (US CCL aerospace 600-series)
  makeEntry("9A515", "US_CCL", "Spacecraft, related commodities"),
  makeEntry("9A515.a", "US_CCL", "Spacecraft suitable for use"),
  makeEntry("9A515.a.1", "US_CCL", "Spacecraft electro-optical remote sensing"),
  makeEntry(
    "9A515.a.1.c",
    "US_CCL",
    "Spacecraft EO sub-paragraph aperture band c",
  ),
  makeEntry(
    "9A515.a.1.c.iii",
    "US_CCL",
    "Spacecraft EO sub-paragraph aperture band c.iii",
  ),
  makeEntry("9A515.d", "US_CCL", "Microelectronic circuits for spacecraft"),
  // 9A001 (Wassenaar 0xx band)
  makeEntry("9A001", "US_CCL", "Aero gas turbine engines"),
  // 9A101 (MTCR 1xx band)
  makeEntry("9A101", "EU_ANNEX_I", "Turbojet/turbofan engines (MTCR)"),
  // 9B001 (different product group)
  makeEntry("9B001", "US_CCL", "Equipment for production of gas turbine"),
  // Non-hierarchical entry that should be ignored by the correlator
  makeEntry("EAR99", "US_CCL", "Items subject to EAR but not classified"),
];

function makeEntry(
  code: string,
  jurisdiction: ClassificationEntry["jurisdiction"],
  title: string,
): ClassificationEntry {
  return {
    code,
    jurisdiction,
    title,
    description: `Test fixture for ${code}`,
    controlReasons: [],
    crossReferenceTopic: null,
    sourceUrl: "https://example.test/" + code,
    asOfDate: "2026-01-01",
  };
}

// ─── parseEccnHierarchy ────────────────────────────────────────────────

describe("parseEccnHierarchy", () => {
  it("parses bare entry '9A001' (no sub-paragraph)", () => {
    const result = parseEccnHierarchy("9A001");
    expect(result).toEqual<EccnHierarchy>({
      category: "9",
      productGroup: "A",
      entryNumber: "001",
      raw: "9A001",
    });
  });

  it("parses single-level '9A001.a' (sub-paragraph only)", () => {
    const result = parseEccnHierarchy("9A001.a");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("9");
    expect(result?.productGroup).toBe("A");
    expect(result?.entryNumber).toBe("001");
    expect(result?.subParagraph).toBe("a");
    expect(result?.subSub).toBeUndefined();
    expect(result?.subSubSub).toBeUndefined();
    expect(result?.romanSubSub).toBeUndefined();
  });

  it("parses two-level '9A515.a.1' (sub-paragraph + numeric sub-sub)", () => {
    const result = parseEccnHierarchy("9A515.a.1");
    expect(result?.subParagraph).toBe("a");
    expect(result?.subSub).toBe("1");
    expect(result?.subSubSub).toBeUndefined();
  });

  it("parses three-level '9A515.a.1.c' (third-level alpha)", () => {
    const result = parseEccnHierarchy("9A515.a.1.c");
    expect(result?.subParagraph).toBe("a");
    expect(result?.subSub).toBe("1");
    expect(result?.subSubSub).toBe("c");
    expect(result?.romanSubSub).toBeUndefined();
  });

  it("parses full four-level '9A515.a.1.c.iii' with roman numeral", () => {
    const result = parseEccnHierarchy("9A515.a.1.c.iii");
    expect(result).toEqual<EccnHierarchy>({
      category: "9",
      productGroup: "A",
      entryNumber: "515",
      subParagraph: "a",
      subSub: "1",
      subSubSub: "c",
      romanSubSub: "iii",
      raw: "9A515.a.1.c.iii",
    });
  });

  it("normalizes lower-case product-group letter to upper-case in parsed fields", () => {
    // Real-world input often comes mixed-case ('9a515.a.1'); the parser
    // is case-tolerant but its output is canonicalized: product group
    // → upper-case, sub-paragraphs → lower-case.
    const result = parseEccnHierarchy("9a515.A.1");
    expect(result).not.toBeNull();
    expect(result?.productGroup).toBe("A");
    expect(result?.subParagraph).toBe("a"); // upper 'A' normalized down
    expect(result?.raw).toBe("9a515.A.1"); // raw preserves input
  });

  it("normalizes mixed-case roman numerals to lower-case", () => {
    const result = parseEccnHierarchy("9A515.a.1.c.III");
    expect(result?.romanSubSub).toBe("iii");
    expect(result?.raw).toBe("9A515.a.1.c.III");
  });

  it("rejects USML-style '(a)(7)(i)' notation", () => {
    expect(parseEccnHierarchy("XV(a)(7)(i)")).toBeNull();
  });

  it("rejects EAR99 (not hierarchical)", () => {
    expect(parseEccnHierarchy("EAR99")).toBeNull();
  });

  it("rejects empty string and whitespace-only input", () => {
    expect(parseEccnHierarchy("")).toBeNull();
    expect(parseEccnHierarchy("   ")).toBeNull();
  });

  it("rejects malformed strings (junk, internal whitespace, missing digits)", () => {
    expect(parseEccnHierarchy("9A")).toBeNull();
    expect(parseEccnHierarchy("9A51")).toBeNull(); // only 2-digit entry
    expect(parseEccnHierarchy("9A5150")).toBeNull(); // 4-digit entry
    expect(parseEccnHierarchy("9A 515")).toBeNull(); // internal whitespace
    expect(parseEccnHierarchy("free text")).toBeNull();
    expect(parseEccnHierarchy("9F001")).toBeNull(); // F is not a valid group
  });

  it("trims leading/trailing whitespace before parsing", () => {
    const result = parseEccnHierarchy("  9A001  ");
    expect(result?.entryNumber).toBe("001");
    // raw should reflect the trimmed value, not the input with spaces.
    expect(result?.raw).toBe("9A001");
  });
});

// ─── rollUpHierarchy ───────────────────────────────────────────────────

describe("rollUpHierarchy", () => {
  it("bare entry rolls up to itself only", () => {
    const h = parseEccnHierarchy("9A001");
    expect(h).not.toBeNull();
    expect(rollUpHierarchy(h!)).toEqual(["9A001"]);
  });

  it("single-level rolls up to 2 levels (most-specific first)", () => {
    const h = parseEccnHierarchy("9A515.a");
    expect(rollUpHierarchy(h!)).toEqual(["9A515.a", "9A515"]);
  });

  it("full four-level hierarchy rolls up to 5 levels", () => {
    const h = parseEccnHierarchy("9A515.a.1.c.iii");
    expect(rollUpHierarchy(h!)).toEqual([
      "9A515.a.1.c.iii",
      "9A515.a.1.c",
      "9A515.a.1",
      "9A515.a",
      "9A515",
    ]);
  });

  it("three-level hierarchy rolls up to 4 levels", () => {
    const h = parseEccnHierarchy("9A515.a.1.c");
    expect(rollUpHierarchy(h!)).toEqual([
      "9A515.a.1.c",
      "9A515.a.1",
      "9A515.a",
      "9A515",
    ]);
  });

  it("does NOT include category-only '9A' as a roll-up level", () => {
    // "9A" is not a real ECCN — entries always include the 3-digit
    // entry number. The roll-up MUST stop at the bare entry.
    const h = parseEccnHierarchy("9A001.a");
    const rolled = rollUpHierarchy(h!);
    expect(rolled).toContain("9A001");
    expect(rolled).not.toContain("9A");
    expect(rolled).not.toContain("9");
  });
});

// ─── rollDownHierarchy ─────────────────────────────────────────────────

describe("rollDownHierarchy", () => {
  it("roll-down on parent '9A515' returns the entry + all sub-paragraphs", () => {
    const result = rollDownHierarchy("9A515", FIXTURE);
    const codes = result.map((e) => e.code);
    expect(codes).toContain("9A515");
    expect(codes).toContain("9A515.a");
    expect(codes).toContain("9A515.a.1");
    expect(codes).toContain("9A515.a.1.c");
    expect(codes).toContain("9A515.a.1.c.iii");
    expect(codes).toContain("9A515.d");
    // Should NOT include adjacent entries from other families.
    expect(codes).not.toContain("9A001");
    expect(codes).not.toContain("9A101");
    expect(codes).not.toContain("9B001");
    expect(codes).not.toContain("EAR99");
  });

  it("roll-down on '9A515.a' returns only the .a subtree (no .d)", () => {
    const result = rollDownHierarchy("9A515.a", FIXTURE);
    const codes = result.map((e) => e.code);
    expect(codes).toContain("9A515.a");
    expect(codes).toContain("9A515.a.1");
    expect(codes).toContain("9A515.a.1.c");
    expect(codes).toContain("9A515.a.1.c.iii");
    expect(codes).not.toContain("9A515"); // parent, not under .a
    expect(codes).not.toContain("9A515.d"); // sibling subtree
  });

  it("roll-down on a leaf '9A515.a.1.c.iii' returns only that entry", () => {
    const result = rollDownHierarchy("9A515.a.1.c.iii", FIXTURE);
    expect(result.map((e) => e.code)).toEqual(["9A515.a.1.c.iii"]);
  });

  it("roll-down on '9A001' (bare entry with no children in fixture) returns only itself", () => {
    const result = rollDownHierarchy("9A001", FIXTURE);
    expect(result.map((e) => e.code)).toEqual(["9A001"]);
  });

  it("roll-down on non-existent prefix returns empty array", () => {
    const result = rollDownHierarchy("9A999", FIXTURE);
    expect(result).toEqual([]);
  });

  it("roll-down on unparseable query returns empty array", () => {
    expect(rollDownHierarchy("EAR99", FIXTURE)).toEqual([]);
    expect(rollDownHierarchy("free text", FIXTURE)).toEqual([]);
    expect(rollDownHierarchy("", FIXTURE)).toEqual([]);
  });

  it("does NOT do textual prefix matching (9A515 must not match 9A5150-style codes)", () => {
    // Add a (synthetic, invalid) entry that would textually
    // prefix-match but isn't structurally under 9A515. Our regex
    // already rejects 4-digit entries — verify the correlator stays
    // on the structural rails.
    const extra = makeEntry("9A5150", "US_CCL", "Synthetic 4-digit");
    const result = rollDownHierarchy("9A515", [...FIXTURE, extra]);
    expect(result.map((e) => e.code)).not.toContain("9A5150");
  });

  it("does not mutate the input array", () => {
    const before = FIXTURE.map((e) => e.code);
    rollDownHierarchy("9A515", FIXTURE);
    const after = FIXTURE.map((e) => e.code);
    expect(after).toEqual(before);
  });
});

// ─── correlateMatch ────────────────────────────────────────────────────

describe("correlateMatch", () => {
  it("on '9A515.a.1.c.iii' returns exact + 4 broader (closest first) + 0 narrower", () => {
    const result = correlateMatch("9A515.a.1.c.iii", FIXTURE);
    expect(result.exact?.code).toBe("9A515.a.1.c.iii");
    expect(result.broader.map((e) => e.code)).toEqual([
      "9A515.a.1.c",
      "9A515.a.1",
      "9A515.a",
      "9A515",
    ]);
    expect(result.narrower).toEqual([]);
  });

  it("on parent '9A515' returns exact + 0 broader + all narrower in list order", () => {
    const result = correlateMatch("9A515", FIXTURE);
    expect(result.exact?.code).toBe("9A515");
    expect(result.broader).toEqual([]);
    const narrowerCodes = result.narrower.map((e) => e.code);
    expect(narrowerCodes).toContain("9A515.a");
    expect(narrowerCodes).toContain("9A515.a.1");
    expect(narrowerCodes).toContain("9A515.a.1.c");
    expect(narrowerCodes).toContain("9A515.a.1.c.iii");
    expect(narrowerCodes).toContain("9A515.d");
    // Order should be the original entry order from FIXTURE.
    const expectedOrder = FIXTURE.filter((e) =>
      narrowerCodes.includes(e.code),
    ).map((e) => e.code);
    expect(narrowerCodes).toEqual(expectedOrder);
  });

  it("on mid-level '9A515.a.1' returns proper triplet", () => {
    const result = correlateMatch("9A515.a.1", FIXTURE);
    expect(result.exact?.code).toBe("9A515.a.1");
    expect(result.broader.map((e) => e.code)).toEqual(["9A515.a", "9A515"]);
    const narrower = result.narrower.map((e) => e.code);
    expect(narrower).toContain("9A515.a.1.c");
    expect(narrower).toContain("9A515.a.1.c.iii");
    expect(narrower).not.toContain("9A515.d"); // sibling, not narrower
  });

  it("returns exact=null when matched code has no exact entry but parents exist", () => {
    // Build a fixture missing the exact entry but with parents/children.
    const partialFixture: ClassificationEntry[] = [
      makeEntry("9A515", "US_CCL", "Parent"),
      makeEntry("9A515.a.1.c.iii", "US_CCL", "Deep child"),
    ];
    const result = correlateMatch("9A515.a", partialFixture);
    expect(result.exact).toBeNull();
    expect(result.broader.map((e) => e.code)).toEqual(["9A515"]);
    expect(result.narrower.map((e) => e.code)).toEqual(["9A515.a.1.c.iii"]);
  });

  it("returns empty triplet when matched code is unparseable", () => {
    const result = correlateMatch("not-an-eccn", FIXTURE);
    expect(result.exact).toBeNull();
    expect(result.broader).toEqual([]);
    expect(result.narrower).toEqual([]);
  });

  it("ignores entries that fail hierarchy parsing (like EAR99) when scanning", () => {
    const result = correlateMatch("9A515", FIXTURE);
    const allCodes = [
      result.exact?.code,
      ...result.broader.map((e) => e.code),
      ...result.narrower.map((e) => e.code),
    ];
    expect(allCodes).not.toContain("EAR99");
  });

  it("on adjacent family '9A001' does not include 9A515.* as narrower", () => {
    const result = correlateMatch("9A001", FIXTURE);
    expect(result.exact?.code).toBe("9A001");
    const narrowerCodes = result.narrower.map((e) => e.code);
    expect(narrowerCodes).not.toContain("9A515");
    expect(narrowerCodes).not.toContain("9A515.a");
  });

  it("excludes the exact match itself from broader and narrower", () => {
    const result = correlateMatch("9A515", FIXTURE);
    const broaderCodes = result.broader.map((e) => e.code);
    const narrowerCodes = result.narrower.map((e) => e.code);
    expect(broaderCodes).not.toContain("9A515");
    expect(narrowerCodes).not.toContain("9A515");
  });
});

// ─── Pure-function guarantees ──────────────────────────────────────────

describe("Pure-function guarantees", () => {
  it("parseEccnHierarchy never throws on weird input", () => {
    expect(() => parseEccnHierarchy("")).not.toThrow();
    expect(() => parseEccnHierarchy("\n\t")).not.toThrow();
    expect(() => parseEccnHierarchy("////")).not.toThrow();
    // Non-string at runtime — defensive guard.
    expect(() => parseEccnHierarchy(null as unknown as string)).not.toThrow();
    expect(() =>
      parseEccnHierarchy(undefined as unknown as string),
    ).not.toThrow();
  });

  it("rollDownHierarchy returns a fresh array (not the input)", () => {
    const result = rollDownHierarchy("9A515", FIXTURE);
    expect(result).not.toBe(FIXTURE);
  });

  it("correlateMatch returns a fresh result object with fresh arrays", () => {
    const a = correlateMatch("9A515", FIXTURE);
    const b = correlateMatch("9A515", FIXTURE);
    expect(a).not.toBe(b);
    expect(a.broader).not.toBe(b.broader);
    expect(a.narrower).not.toBe(b.narrower);
  });
});
