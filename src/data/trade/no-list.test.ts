/**
 * Tests for the Norway export control (FOR-2013-06-19-718) Liste II space slice
 * — Data-Sprint S5, a mirror file following the ch-gkv reference. Verifies the
 * mirror data is honest: lovdata provenance, valid delta types, mirror-target
 * presence for NONE/MODIFIED, own text for MODIFIED/NATIONAL_ONLY, no NATIONAL_ONLY
 * mirror target, no duplicate national codes, non-empty exclusions.
 */

import { describe, it, expect } from "vitest";
import {
  NO_LIST_ENTRIES,
  NO_LIST_COVERAGE,
  NO_LIST_AS_OF,
  getNoListSourceCitation,
  findNoListEntry,
} from "./no-list";

describe("NO_LIST (Norway Liste II dual-use) — space slice", () => {
  it("curates at least 25 entries (the slice target floor)", () => {
    expect(NO_LIST_ENTRIES.length).toBeGreaterThanOrEqual(25);
  });

  it("every entry cites the official lovdata Norwegian source", () => {
    for (const e of NO_LIST_ENTRIES) {
      expect(e.sourceUrl, `sourceUrl for ${e.nationalCode}`).toMatch(
        /^https:\/\/lovdata\.no\//,
      );
      expect(e.sourceUrl).toContain("2013-06-19-718");
    }
  });

  it("every entry carries a valid YYYY-MM-DD asOfDate equal to NO_LIST_AS_OF", () => {
    for (const e of NO_LIST_ENTRIES) {
      expect(e.asOfDate, `asOfDate for ${e.nationalCode}`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
      expect(e.asOfDate).toBe(NO_LIST_AS_OF);
    }
  });

  it("every entry has a valid mirrorDelta", () => {
    for (const e of NO_LIST_ENTRIES) {
      expect(
        ["NONE", "MODIFIED", "NATIONAL_ONLY"],
        `mirrorDelta for ${e.nationalCode}`,
      ).toContain(e.mirrorDelta);
    }
  });

  it("NONE / MODIFIED entries declare a mirrorsCanonicalId", () => {
    for (const e of NO_LIST_ENTRIES) {
      if (e.mirrorDelta === "NONE" || e.mirrorDelta === "MODIFIED") {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} (${e.mirrorDelta}) must declare mirrorsCanonicalId`,
        ).toBeTruthy();
      }
    }
  });

  it("MODIFIED / NATIONAL_ONLY entries carry their own title + description", () => {
    for (const e of NO_LIST_ENTRIES) {
      if (e.mirrorDelta === "MODIFIED" || e.mirrorDelta === "NATIONAL_ONLY") {
        expect(e.title, `${e.nationalCode} own title`).toBeTruthy();
        expect(
          (e.description ?? "").trim().length,
          `${e.nationalCode} own description`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("NATIONAL_ONLY entries do NOT declare a mirrorsCanonicalId", () => {
    for (const e of NO_LIST_ENTRIES) {
      if (e.mirrorDelta === "NATIONAL_ONLY") {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} NATIONAL_ONLY must not mirror a source`,
        ).toBeUndefined();
      }
    }
  });

  it("no duplicate nationalCodes", () => {
    const codes = NO_LIST_ENTRIES.map((e) => e.nationalCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every NONE/MODIFIED mirror points at a BASE (EU/Wassenaar/MTCR) union target — never another mirror", () => {
    for (const e of NO_LIST_ENTRIES) {
      if (e.mirrorsCanonicalId) {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} must point at a base regime, not a country mirror`,
        ).toMatch(/^(EU_ANNEX_I|WASSENAAR|MTCR_ANNEX):/);
      }
    }
  });

  it("coverage.excluded is non-empty + count matches the data + forskrift id", () => {
    expect(NO_LIST_COVERAGE.excluded.length).toBeGreaterThan(0);
    expect(NO_LIST_COVERAGE.caelexCoverageCount).toBe(NO_LIST_ENTRIES.length);
    expect(NO_LIST_COVERAGE.forskriftId).toBe("FOR-2013-06-19-718");
  });

  it("source citation names the forskrift id + lovdata URL", () => {
    const cite = getNoListSourceCitation();
    expect(cite).toContain("FOR-2013-06-19-718");
    expect(cite).toContain("lovdata.no");
  });

  it("findNoListEntry resolves a known code and returns undefined for a bogus code", () => {
    expect(findNoListEntry("9A004")).toBeDefined();
    expect(findNoListEntry("9a004")).toBeDefined(); // case-insensitive
    expect(findNoListEntry("BOGUS_DOES_NOT_EXIST")).toBeUndefined();
  });
});
