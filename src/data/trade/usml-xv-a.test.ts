/**
 * Z23a — USML Category XV(a) full enumeration tests.
 *
 * Validates the integrity of the XV(a) sub-paragraph dataset extracted from
 * `usml.ts`. These tests guard the Z23a addition (sub-paragraphs (a)(3),
 * (a)(4), (a)(5), (a)(6), (a)(9), (a)(10), (a)(11), (a)(12), (a)(13))
 * against silent regression.
 *
 * Source of truth: 22 CFR § 121.1 Cat. XV(a) — accessed 2026-05-22
 * https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1
 *
 * Tier 3, Caelex Trade Living Execution Plan § 7 (Z23a).
 */

import { describe, it, expect } from "vitest";

import { USML_ENTRIES } from "./usml";

// All XV(a) sub-paragraph entries, including nested (a)(N)(M) forms.
const XV_A_ENTRIES = USML_ENTRIES.filter((e) => e.code.startsWith("XV(a)"));

// Match either "XV(a)(N)" or "XV(a)(N)(M)" where N, M are positive integers
// and M is in {i, ii, iii, iv, v, ...} (a roman numeral) per 22 CFR's
// XV(a)(7)(i) / XV(a)(7)(ii) convention.
const XV_A_PARAGRAPH_RE =
  /^XV\(a\)\(\d+\)(?:\((?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\))?$/;

describe("Z23a — USML Cat. XV(a) full enumeration", () => {
  it("contains at least 15 XV(a) sub-paragraph entries", () => {
    // 22 CFR § 121.1 Cat. XV(a) has 13 numbered sub-paragraphs, with at
    // least (a)(7) further broken into (i) and (ii). Caelex coverage
    // target is full enumeration of all 13 plus the (7) nested entries.
    expect(XV_A_ENTRIES.length).toBeGreaterThanOrEqual(15);
  });

  it("every entry's code matches the XV(a)(N) or XV(a)(N)(rN) format", () => {
    for (const entry of XV_A_ENTRIES) {
      expect(
        XV_A_PARAGRAPH_RE.test(entry.code),
        `invalid XV(a) paragraph format: '${entry.code}'`,
      ).toBe(true);
    }
  });

  it("has no duplicate XV(a) paragraph codes", () => {
    const codes = XV_A_ENTRIES.map((e) => e.code);
    const unique = new Set(codes);
    expect(
      unique.size,
      `expected ${codes.length} unique codes, got ${unique.size}; duplicates: ${codes
        .filter((c, i) => codes.indexOf(c) !== i)
        .join(", ")}`,
    ).toBe(codes.length);
  });

  it("every XV(a) entry has a non-empty title and description", () => {
    for (const entry of XV_A_ENTRIES) {
      expect(
        entry.title.trim().length,
        `empty title on ${entry.code}`,
      ).toBeGreaterThan(0);
      expect(
        entry.description.trim().length,
        `empty description on ${entry.code}`,
      ).toBeGreaterThan(0);
    }
  });

  it("every XV(a) entry is jurisdiction 'USML'", () => {
    for (const entry of XV_A_ENTRIES) {
      expect(entry.jurisdiction, `wrong jurisdiction on ${entry.code}`).toBe(
        "USML",
      );
    }
  });

  it("includes the previously-missing sub-paragraphs (a)(3)-(a)(6) and (a)(9)-(a)(13)", () => {
    const codes = new Set(XV_A_ENTRIES.map((e) => e.code));
    const expectedNewCodes = [
      "XV(a)(3)",
      "XV(a)(4)",
      "XV(a)(5)",
      "XV(a)(6)",
      "XV(a)(9)",
      "XV(a)(10)",
      "XV(a)(11)",
      "XV(a)(12)",
      "XV(a)(13)",
    ];
    for (const code of expectedNewCodes) {
      expect(codes.has(code), `missing required XV(a) entry: ${code}`).toBe(
        true,
      );
    }
  });
});
