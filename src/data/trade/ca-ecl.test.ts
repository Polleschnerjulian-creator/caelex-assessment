/**
 * Tests for the Canada ECL (SOR/89-202) space slice — Data-Sprint S5, built on
 * the CH_GKV mirror-architecture reference. Verifies the mirror data is honest:
 * laws-lois.justice.gc.ca provenance, valid delta types, mirror-target presence
 * for NONE/MODIFIED, own text for NATIONAL_ONLY, no duplicate national codes,
 * and the nationalCode != multilateralCode property of Group 1 (Canadian
 * "1-9.A.4." mirrors the bare EU/Wassenaar 9A004).
 */

import { describe, it, expect } from "vitest";
import {
  CA_ECL_ENTRIES,
  CA_ECL_COVERAGE,
  CA_ECL_AS_OF,
  CA_ECL_SOR_NUMBER,
  getCaEclSourceCitation,
  findCaEclEntry,
} from "./ca-ecl";

describe("CA_ECL (Canada Export Control List) — space slice", () => {
  it("curates at least 25 entries (the per-country target)", () => {
    expect(CA_ECL_ENTRIES.length).toBeGreaterThanOrEqual(25);
  });

  it("every entry cites the official Justice Laws Website (laws-lois.justice.gc.ca) source", () => {
    for (const e of CA_ECL_ENTRIES) {
      expect(e.sourceUrl, `sourceUrl for ${e.nationalCode}`).toMatch(
        /^https:\/\/laws-lois\.justice\.gc\.ca\//,
      );
    }
  });

  it("every entry carries a valid YYYY-MM-DD asOfDate equal to CA_ECL_AS_OF", () => {
    for (const e of CA_ECL_ENTRIES) {
      expect(e.asOfDate, `asOfDate for ${e.nationalCode}`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
      expect(e.asOfDate).toBe(CA_ECL_AS_OF);
    }
  });

  it("every entry has a valid mirrorDelta", () => {
    for (const e of CA_ECL_ENTRIES) {
      expect(
        ["NONE", "MODIFIED", "NATIONAL_ONLY"],
        `mirrorDelta for ${e.nationalCode}`,
      ).toContain(e.mirrorDelta);
    }
  });

  it("NONE / MODIFIED entries declare a mirrorsCanonicalId", () => {
    for (const e of CA_ECL_ENTRIES) {
      if (e.mirrorDelta === "NONE" || e.mirrorDelta === "MODIFIED") {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} (${e.mirrorDelta}) must declare mirrorsCanonicalId`,
        ).toBeTruthy();
      }
    }
  });

  it("MODIFIED / NATIONAL_ONLY entries carry their own title + description", () => {
    for (const e of CA_ECL_ENTRIES) {
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
    for (const e of CA_ECL_ENTRIES) {
      if (e.mirrorDelta === "NATIONAL_ONLY") {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} NATIONAL_ONLY must not mirror a source`,
        ).toBeUndefined();
      }
    }
  });

  it("no duplicate nationalCodes", () => {
    const codes = CA_ECL_ENTRIES.map((e) => e.nationalCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every NONE/MODIFIED mirror points at a BASE union target (EU/Wassenaar/MTCR), never another mirror", () => {
    for (const e of CA_ECL_ENTRIES) {
      if (e.mirrorsCanonicalId) {
        expect(e.mirrorsCanonicalId).toMatch(
          /^(EU_ANNEX_I|WASSENAAR|MTCR_ANNEX):/,
        );
        // Never point at another country's mirror (the adapter throws on those).
        expect(e.mirrorsCanonicalId).not.toMatch(
          /^(CA_ECL|CH_GKV|NO_LIST|UK_STRATEGIC):/,
        );
      }
    }
  });

  it("Group 1 items are nationalCode != multilateralCode: '1-' prefix + dotted structure", () => {
    const group1 = CA_ECL_ENTRIES.filter(
      (e) => e.mirrorDelta === "NONE" && e.nationalCode.startsWith("1-"),
    );
    // There must be Group-1 dual-use entries (the bulk of the slice).
    expect(group1.length).toBeGreaterThanOrEqual(20);
    for (const e of group1) {
      // Canadian item number carries the "1-" Group prefix + dots …
      expect(e.nationalCode, `${e.nationalCode} format`).toMatch(
        /^1-\d+\.[A-E]\.\d+\.$/,
      );
      // … and the target carries the BARE multilateral code (no dots/prefix),
      // i.e. the national code genuinely DIFFERS from the multilateral code.
      const bare = e.mirrorsCanonicalId!.split(":")[1];
      expect(bare, `${e.nationalCode} bare target`).toMatch(/^[0-9][A-E]\d+$/);
      expect(e.nationalCode).not.toBe(bare);
    }
  });

  it("the 1-9.A.4. spacecraft item mirrors EU_ANNEX_I:9A004 (the headline statutory anchor)", () => {
    const e = findCaEclEntry("1-9.A.4.");
    expect(e).toBeDefined();
    expect(e!.mirrorDelta).toBe("NONE");
    expect(e!.mirrorsCanonicalId).toBe("EU_ANNEX_I:9A004");
  });

  it("coverage.excluded is non-empty + count matches the data + SOR number set", () => {
    expect(CA_ECL_COVERAGE.excluded.length).toBeGreaterThan(0);
    expect(CA_ECL_COVERAGE.caelexCoverageCount).toBe(CA_ECL_ENTRIES.length);
    expect(CA_ECL_COVERAGE.sorNumber).toBe("SOR/89-202");
    expect(CA_ECL_SOR_NUMBER).toBe("SOR/89-202");
  });

  it("source citation names the SOR number + the justice.gc.ca URL", () => {
    const cite = getCaEclSourceCitation();
    expect(cite).toContain("SOR/89-202");
    expect(cite).toContain("laws-lois.justice.gc.ca");
  });

  it("findCaEclEntry resolves known code (case-insensitive) and returns undefined for bogus code", () => {
    expect(findCaEclEntry("1-9.A.4.")).toBeDefined();
    expect(findCaEclEntry("1-9.a.4.")).toBeDefined();
    expect(findCaEclEntry("BOGUS_DOES_NOT_EXIST")).toBeUndefined();
  });
});
