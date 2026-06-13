/**
 * Tests for the Switzerland GKV (SR 946.202.1) space slice — Data-Sprint S5,
 * the mirror-architecture reference. Verifies the mirror data is honest:
 * fedlex provenance, valid delta types, mirror-target presence for
 * NONE/MODIFIED, own text for NATIONAL_ONLY, no duplicate national codes.
 */

import { describe, it, expect } from "vitest";
import {
  CH_GKV_ENTRIES,
  CH_GKV_COVERAGE,
  CH_GKV_AS_OF,
  getChGkvSourceCitation,
  findChGkvEntry,
} from "./ch-gkv";

describe("CH_GKV (Switzerland Güterkontrollverordnung) — space slice", () => {
  it("curates at least 25 entries (the reference-implementation floor)", () => {
    expect(CH_GKV_ENTRIES.length).toBeGreaterThanOrEqual(25);
  });

  it("every entry cites the official fedlex GKV source", () => {
    for (const e of CH_GKV_ENTRIES) {
      expect(e.sourceUrl, `sourceUrl for ${e.nationalCode}`).toMatch(
        /^https:\/\/www\.fedlex\.admin\.ch\/eli\/cc\/2016\/352\/de$/,
      );
    }
  });

  it("every entry carries a valid YYYY-MM-DD asOfDate", () => {
    for (const e of CH_GKV_ENTRIES) {
      expect(e.asOfDate, `asOfDate for ${e.nationalCode}`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
      expect(e.asOfDate).toBe(CH_GKV_AS_OF);
    }
  });

  it("every entry has a valid mirrorDelta", () => {
    for (const e of CH_GKV_ENTRIES) {
      expect(
        ["NONE", "MODIFIED", "NATIONAL_ONLY"],
        `mirrorDelta for ${e.nationalCode}`,
      ).toContain(e.mirrorDelta);
    }
  });

  it("NONE / MODIFIED entries declare a mirrorsCanonicalId", () => {
    for (const e of CH_GKV_ENTRIES) {
      if (e.mirrorDelta === "NONE" || e.mirrorDelta === "MODIFIED") {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} (${e.mirrorDelta}) must declare mirrorsCanonicalId`,
        ).toBeTruthy();
      }
    }
  });

  it("MODIFIED / NATIONAL_ONLY entries carry their own title + description", () => {
    for (const e of CH_GKV_ENTRIES) {
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
    for (const e of CH_GKV_ENTRIES) {
      if (e.mirrorDelta === "NATIONAL_ONLY") {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} NATIONAL_ONLY must not mirror a source`,
        ).toBeUndefined();
      }
    }
  });

  it("no duplicate nationalCodes", () => {
    const codes = CH_GKV_ENTRIES.map((e) => e.nationalCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every NONE/MODIFIED mirror points at an EU/Wassenaar/MTCR union target shape", () => {
    for (const e of CH_GKV_ENTRIES) {
      if (e.mirrorsCanonicalId) {
        expect(e.mirrorsCanonicalId).toMatch(
          /^(EU_ANNEX_I|WASSENAAR|MTCR_ANNEX):/,
        );
      }
    }
  });

  it("coverage.excluded is non-empty + count matches the data", () => {
    expect(CH_GKV_COVERAGE.excluded.length).toBeGreaterThan(0);
    expect(CH_GKV_COVERAGE.caelexCoverageCount).toBe(CH_GKV_ENTRIES.length);
    expect(CH_GKV_COVERAGE.srNumber).toBe("946.202.1");
  });

  it("source citation names the SR number + fedlex URL", () => {
    const cite = getChGkvSourceCitation();
    expect(cite).toContain("946.202.1");
    expect(cite).toContain("fedlex.admin.ch");
  });

  it("findChGkvEntry resolves known code and returns undefined for bogus code", () => {
    expect(findChGkvEntry("9A004")).toBeDefined();
    expect(findChGkvEntry("BOGUS_DOES_NOT_EXIST")).toBeUndefined();
  });
});
