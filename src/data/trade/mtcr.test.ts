/**
 * MTCR Annex corpus invariants (Data-Sprint S1, Tier 1).
 *
 * Source of truth: MTCR "Equipment, Software and Technology Annex",
 * document dated 2024-03-14 (https://www.mtcr.info/en/mtcr-annex).
 *
 * These invariants gate the curated MTCR_ANNEX_ENTRIES corpus. They were
 * written RED-first (before the full curation) per the S1–S6 workflow: the
 * entry-count + category-split assertions fail against the legacy 9-entry
 * headline file and only pass once the Annex is curated at item/sub-item
 * level.
 */
import { describe, expect, it } from "vitest";
import { MTCR_ANNEX_ENTRIES, MTCR_ANNEX_COVERAGE } from "./mtcr";

/**
 * Annex code scheme: `<item>.<A-E>.<num>` optionally with a trailing
 * sub-letter, e.g. "1.A.1", "2.A.1.c", "4.B.3.a", "6.C.8", "19.A.2",
 * "20.A.1.a". Verified against the 2024-03-14 Annex Table of Contents
 * (pages 3–7) + operative text.
 */
const MTCR_CODE_REGEX = /^\d{1,2}\.[A-E]\.\d+(\.[a-z])?$/;

describe("MTCR Annex corpus invariants", () => {
  it("has at least 140 curated entries (full Annex, item/sub-item level)", () => {
    expect(MTCR_ANNEX_ENTRIES.length).toBeGreaterThanOrEqual(140);
  });

  it("every code matches the MTCR Annex code scheme", () => {
    for (const e of MTCR_ANNEX_ENTRIES) {
      expect(e.code, e.code).toMatch(MTCR_CODE_REGEX);
    }
  });

  it("every entry carries https sourceUrl + ISO asOfDate + non-trivial description", () => {
    for (const e of MTCR_ANNEX_ENTRIES) {
      expect(e.sourceUrl, e.code).toMatch(/^https:\/\//);
      expect(e.asOfDate, e.code).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.description.length, e.code).toBeGreaterThan(20);
    }
  });

  it("every entry is MTCR-controlled (controlReasons includes MT)", () => {
    for (const e of MTCR_ANNEX_ENTRIES) {
      expect(e.controlReasons, e.code).toContain("MT");
      expect(e.jurisdiction, e.code).toBe("MTCR_ANNEX");
    }
  });

  it("no duplicate codes", () => {
    const codes = MTCR_ANNEX_ENTRIES.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("declares coverage exclusions honestly", () => {
    expect(MTCR_ANNEX_COVERAGE.excluded.length).toBeGreaterThan(0);
  });

  it("coverage count matches the actual entry count", () => {
    expect(MTCR_ANNEX_COVERAGE.caelexCoverageCount).toBe(
      MTCR_ANNEX_ENTRIES.length,
    );
  });

  // ── Category I vs II split (Annex Introduction §1(a): "Category I items,
  //    all of which are in Annex Items 1 and 2"; everything else = Cat II). ──
  it("every entry declares mtcrCategory I or II", () => {
    for (const e of MTCR_ANNEX_ENTRIES) {
      expect(["I", "II"], e.code).toContain(e.mtcrCategory);
    }
  });

  it("Category I entries are exactly those in Items 1 and 2", () => {
    for (const e of MTCR_ANNEX_ENTRIES) {
      const itemNo = parseInt(e.code.split(".")[0], 10);
      if (e.mtcrCategory === "I") {
        expect([1, 2], `${e.code} is Cat I`).toContain(itemNo);
      } else {
        expect(itemNo, `${e.code} is Cat II`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("contains the two Cat-I complete-system tripwires (Item 1)", () => {
    const codes = MTCR_ANNEX_ENTRIES.map((e) => e.code);
    expect(codes).toContain("1.A.1"); // complete rocket systems ≥500kg/≥300km
    expect(codes).toContain("1.A.2"); // complete UAV systems ≥500kg/≥300km
  });

  it("Cat-I propulsion threshold (2.A.1.c) is present and states 1.1×10⁶ Ns", () => {
    // The Item 2.A.1 subsystems are split at sub-item level; the controlling
    // total-impulse threshold lives at 2.A.1.c (rocket propulsion subsystems).
    const e = MTCR_ANNEX_ENTRIES.find((x) => x.code === "2.A.1.c");
    expect(e).toBeDefined();
    expect(e!.mtcrCategory).toBe("I");
    expect(e!.description).toMatch(/1\.1\s*[×x]?\s*10/i); // 1.1 × 10^6 Ns
  });

  it("Cat-II propulsion band (20.A.1.b) states the 8.41×10⁵ Ns floor", () => {
    const e = MTCR_ANNEX_ENTRIES.find((x) => x.code === "20.A.1.b");
    expect(e).toBeDefined();
    expect(e!.mtcrCategory).toBe("II");
    expect(e!.description).toMatch(/8\.41\s*[×x]?\s*10/i); // 8.41 × 10^5 Ns
  });
});
