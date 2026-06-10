/**
 * ILA review #7 — EU Annex I Cat 1 (materials) + Cat 2 (manufacturing)
 * supplier-relevant coverage tests.
 *
 * Confirms:
 *   1. The supplier-critical top-level codes are present (composites,
 *      fibres, machine tools, flow-forming, metrology, vibration test).
 *   2. Every entry conforms to the ClassificationEntry schema basics
 *      (code shape, non-empty description/source, fresh asOfDate).
 *   3. MTCR-derived x1xx entries carry MT; NSG-derived x2xx carry NP.
 *   4. Coverage metadata matches the entry count.
 *   5. Headline-only entries (1C350, 2B350) say so honestly.
 */

import { describe, it, expect } from "vitest";
import {
  EU_ANNEX_I_CAT1_2_COVERAGE,
  EU_ANNEX_I_CAT1_2_ENTRIES,
  findEuAnnexICat12Entry,
  findEuAnnexICat12EntriesByPrefix,
} from "./eu-annex-i-cat1-2";

const REQUIRED_CODES = [
  "1A002", // composite structures
  "1C002", // superalloy powders (AM)
  "1C010", // fibres/prepregs
  "1C111", // propellant constituents
  "1C116", // maraging steel (MT)
  "2A001", // precision bearings
  "2B001", // machine tools
  "2B004", // HIP
  "2B006", // metrology
  "2B009", // flow-forming
  "2B116", // vibration test
  "2B201", // machine tools (NP twin)
];

describe("EU Annex I Cat 1+2 coverage", () => {
  it("ships every supplier-critical top-level code", () => {
    for (const code of REQUIRED_CODES) {
      expect(findEuAnnexICat12Entry(code), code).toBeDefined();
    }
  });

  it("every entry passes the schema basics", () => {
    for (const e of EU_ANNEX_I_CAT1_2_ENTRIES) {
      expect(e.code).toMatch(/^[12][ABCDE]\d{3}$/);
      expect(e.jurisdiction).toBe("EU_ANNEX_I");
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.title.length).toBeLessThanOrEqual(100);
      expect(e.description.length).toBeGreaterThan(40);
      expect(e.sourceUrl).toContain("eur-lex.europa.eu");
      expect(e.controlReasons.length).toBeGreaterThan(0);
      const ageDays =
        (Date.now() - new Date(e.asOfDate).getTime()) / (24 * 60 * 60 * 1000);
      expect(ageDays).toBeLessThan(365);
    }
  });

  it("regime-derived families carry the right control reasons", () => {
    for (const e of EU_ANNEX_I_CAT1_2_ENTRIES) {
      const seriesDigit = e.code[2];
      if (seriesDigit === "1" && e.code !== "1E101") {
        // x1xx MTCR-derived hardware/material entries carry MT.
        expect(e.controlReasons, e.code).toContain("MT");
        expect(e.mtcrCategory, e.code).toBe("II");
      }
      if (seriesDigit === "2" && e.code.startsWith("2B2")) {
        expect(e.controlReasons, e.code).toContain("NP");
      }
      if (e.code.startsWith("1C2")) {
        expect(e.controlReasons, e.code).toContain("NP");
      }
    }
    // The MT technology shadow too.
    expect(findEuAnnexICat12Entry("1E101")?.controlReasons).toContain("MT");
  });

  it("coverage metadata matches the entry count", () => {
    expect(EU_ANNEX_I_CAT1_2_COVERAGE.caelexCoverageCount).toBe(
      EU_ANNEX_I_CAT1_2_ENTRIES.length,
    );
  });

  it("headline-only CW entries say so honestly", () => {
    expect(findEuAnnexICat12Entry("1C350")?.description).toContain("HEADLINE");
    expect(
      findEuAnnexICat12Entry("2B350")?.description.toLowerCase(),
    ).toContain("headline");
  });

  it("prefix lookup finds the fibre family", () => {
    const fibres = findEuAnnexICat12EntriesByPrefix("1C");
    expect(fibres.length).toBeGreaterThanOrEqual(15);
  });

  it("no duplicate codes", () => {
    const codes = EU_ANNEX_I_CAT1_2_ENTRIES.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
