/**
 * Tests for the Australia DSGL (Defence and Strategic Goods List 2024,
 * F2024L01024) space slice — Data-Sprint S5, mirror architecture. Verifies the
 * mirror data is honest: legislation.gov.au provenance, valid delta types,
 * mirror-target presence for NONE/MODIFIED, own text for NATIONAL_ONLY, no
 * duplicate national codes. Follows the ch-gkv.test.ts reference invariants.
 */

import { describe, it, expect } from "vitest";
import {
  AU_DSGL_ENTRIES,
  AU_DSGL_COVERAGE,
  AU_DSGL_AS_OF,
  AU_DSGL_REGISTRATION_ID,
  getAuDsglSourceCitation,
  findAuDsglEntry,
} from "./au-dsgl";

describe("AU_DSGL (Australia Defence and Strategic Goods List) — space slice", () => {
  it("curates at least 25 entries (the per-country target floor)", () => {
    expect(AU_DSGL_ENTRIES.length).toBeGreaterThanOrEqual(25);
  });

  it("every entry cites the official legislation.gov.au DSGL source", () => {
    for (const e of AU_DSGL_ENTRIES) {
      expect(e.sourceUrl, `sourceUrl for ${e.nationalCode}`).toMatch(
        /^https:\/\/www\.legislation\.gov\.au\/F2024L01024\/latest\/text$/,
      );
    }
  });

  it("every entry carries a valid YYYY-MM-DD asOfDate matching AU_DSGL_AS_OF", () => {
    for (const e of AU_DSGL_ENTRIES) {
      expect(e.asOfDate, `asOfDate for ${e.nationalCode}`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
      expect(e.asOfDate).toBe(AU_DSGL_AS_OF);
    }
  });

  it("every entry has a valid mirrorDelta", () => {
    for (const e of AU_DSGL_ENTRIES) {
      expect(
        ["NONE", "MODIFIED", "NATIONAL_ONLY"],
        `mirrorDelta for ${e.nationalCode}`,
      ).toContain(e.mirrorDelta);
    }
  });

  it("NONE / MODIFIED entries declare a mirrorsCanonicalId", () => {
    for (const e of AU_DSGL_ENTRIES) {
      if (e.mirrorDelta === "NONE" || e.mirrorDelta === "MODIFIED") {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} (${e.mirrorDelta}) must declare mirrorsCanonicalId`,
        ).toBeTruthy();
      }
    }
  });

  it("MODIFIED / NATIONAL_ONLY entries carry their own title + description", () => {
    for (const e of AU_DSGL_ENTRIES) {
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
    for (const e of AU_DSGL_ENTRIES) {
      if (e.mirrorDelta === "NATIONAL_ONLY") {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} NATIONAL_ONLY must not mirror a source`,
        ).toBeUndefined();
      }
    }
  });

  it("no duplicate nationalCodes", () => {
    const codes = AU_DSGL_ENTRIES.map((e) => e.nationalCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every NONE/MODIFIED mirror points at a BASE union target shape (never another mirror)", () => {
    for (const e of AU_DSGL_ENTRIES) {
      if (e.mirrorsCanonicalId) {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} mirror target must be an EU/Wassenaar/MTCR base id`,
        ).toMatch(/^(EU_ANNEX_I|WASSENAAR|MTCR_ANNEX):/);
      }
    }
  });

  it("coverage.excluded is non-empty + count matches the data", () => {
    expect(AU_DSGL_COVERAGE.excluded.length).toBeGreaterThan(0);
    expect(AU_DSGL_COVERAGE.caelexCoverageCount).toBe(AU_DSGL_ENTRIES.length);
    expect(AU_DSGL_COVERAGE.registrationId).toBe("F2024L01024");
  });

  it("source citation names the registration ID + legislation.gov.au URL", () => {
    const cite = getAuDsglSourceCitation();
    expect(cite).toContain(AU_DSGL_REGISTRATION_ID);
    expect(cite).toContain("legislation.gov.au");
  });

  it("findAuDsglEntry resolves a known code and returns undefined for a bogus code", () => {
    expect(findAuDsglEntry("9A004")).toBeDefined();
    expect(findAuDsglEntry("9a004")).toBeDefined(); // case-insensitive
    expect(findAuDsglEntry("BOGUS_DOES_NOT_EXIST")).toBeUndefined();
  });
});
