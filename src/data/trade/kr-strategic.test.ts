/**
 * Tests for the South Korea MOTIE Strategic-Items space slice — Data-Sprint S5,
 * a mirror-architecture file in the CH_GKV family. Verifies the mirror data is
 * honest: MOTIE/Yestrade provenance, valid delta types, mirror-target presence
 * for NONE/MODIFIED, own text for MODIFIED/NATIONAL_ONLY, no duplicate national
 * codes, and — crucially for LEGALLY-SENSITIVE zero-fabrication — that every
 * mirror target points at a BASE (non-mirror) EU/Wassenaar/MTCR union code and
 * is one of the EU_ANNEX_I codes actually curated in the base corpus.
 */

import { describe, it, expect } from "vitest";
import {
  KR_STRATEGIC_ENTRIES,
  KR_STRATEGIC_COVERAGE,
  KR_STRATEGIC_AS_OF,
  getKrStrategicSourceCitation,
  findKrStrategicEntry,
} from "./kr-strategic";

// The EU_ANNEX_I codes that exist in the Caelex base corpus (grep-verified
// from eu-annex-i*.ts at curation time). Every KR NONE/MODIFIED target MUST be
// one of these — the adapter throws on a dangling mirror, and this list guards
// against a fabricated/absent target (e.g. 3A001/3A002, which are NOT here).
const CURATED_EU_ANNEX_I_CODES = new Set([
  "5A001",
  "6A002",
  "6A003",
  "6A004",
  "6A008",
  "6A107",
  "6A108",
  "7A001",
  "7A002",
  "7A003",
  "7A101",
  "7A103",
  "7A104",
  "9A004",
  "9A005",
  "9A006",
  "9A007",
  "9A008",
  "9A009",
  "9A010",
  "9A011",
  "9A012",
  "9A101",
  "9A104",
  "9A105",
  "9A106",
  "9A107",
  "9A108",
  "9A110",
  "9A115",
  "9A116",
  "9A117",
  "9A119",
  "9A120",
  "9D001",
  "9D002",
  "9D004",
  "9E001",
  "9E002",
]);

describe("KR_STRATEGIC (South Korea MOTIE Strategic Items) — space slice", () => {
  it("curates at least 20 entries (the per-country target)", () => {
    expect(KR_STRATEGIC_ENTRIES.length).toBeGreaterThanOrEqual(20);
  });

  it("every entry cites the official MOTIE/Yestrade national source", () => {
    for (const e of KR_STRATEGIC_ENTRIES) {
      expect(e.sourceUrl, `sourceUrl for ${e.nationalCode}`).toMatch(
        /^https:\/\/www\.yestrade\.go\.kr$/,
      );
    }
  });

  it("every entry carries a valid YYYY-MM-DD asOfDate", () => {
    for (const e of KR_STRATEGIC_ENTRIES) {
      expect(e.asOfDate, `asOfDate for ${e.nationalCode}`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
      expect(e.asOfDate).toBe(KR_STRATEGIC_AS_OF);
    }
  });

  it("every entry has a valid mirrorDelta", () => {
    for (const e of KR_STRATEGIC_ENTRIES) {
      expect(
        ["NONE", "MODIFIED", "NATIONAL_ONLY"],
        `mirrorDelta for ${e.nationalCode}`,
      ).toContain(e.mirrorDelta);
    }
  });

  it("NONE / MODIFIED entries declare a mirrorsCanonicalId", () => {
    for (const e of KR_STRATEGIC_ENTRIES) {
      if (e.mirrorDelta === "NONE" || e.mirrorDelta === "MODIFIED") {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} (${e.mirrorDelta}) must declare mirrorsCanonicalId`,
        ).toBeTruthy();
      }
    }
  });

  it("MODIFIED / NATIONAL_ONLY entries carry their own title + description", () => {
    for (const e of KR_STRATEGIC_ENTRIES) {
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
    for (const e of KR_STRATEGIC_ENTRIES) {
      if (e.mirrorDelta === "NATIONAL_ONLY") {
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} NATIONAL_ONLY must not mirror a source`,
        ).toBeUndefined();
      }
    }
  });

  it("no duplicate nationalCodes", () => {
    const codes = KR_STRATEGIC_ENTRIES.map((e) => e.nationalCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every NONE/MODIFIED mirror points at a BASE EU/Wassenaar/MTCR union target (never another mirror)", () => {
    for (const e of KR_STRATEGIC_ENTRIES) {
      if (e.mirrorsCanonicalId) {
        expect(e.mirrorsCanonicalId, `${e.nationalCode} target shape`).toMatch(
          /^(EU_ANNEX_I|WASSENAAR|MTCR_ANNEX):/,
        );
        // Zero-fabrication guard: a mirror MUST NOT point at another country's
        // mirror regime (the adapter throws on those at import).
        expect(
          e.mirrorsCanonicalId,
          `${e.nationalCode} must not mirror another national mirror`,
        ).not.toMatch(/^(CH_GKV|KR_STRATEGIC|NO_LIST|UK_STRATEGIC):/);
      }
    }
  });

  it("every EU_ANNEX_I mirror target is a code actually curated in the base corpus (no dangling/fabricated target)", () => {
    for (const e of KR_STRATEGIC_ENTRIES) {
      if (e.mirrorsCanonicalId?.startsWith("EU_ANNEX_I:")) {
        const code = e.mirrorsCanonicalId.slice("EU_ANNEX_I:".length);
        expect(
          CURATED_EU_ANNEX_I_CODES.has(code),
          `${e.nationalCode} mirrors EU_ANNEX_I:${code}, which must exist in the base corpus`,
        ).toBe(true);
      }
    }
  });

  it("for NONE entries the Korean code equals the mirrored EU code (verbatim adoption)", () => {
    for (const e of KR_STRATEGIC_ENTRIES) {
      if (e.mirrorDelta === "NONE" && e.mirrorsCanonicalId) {
        const code = e.mirrorsCanonicalId.split(":")[1];
        expect(
          e.nationalCode,
          `${e.nationalCode} should equal its mirrored code ${code}`,
        ).toBe(code);
      }
    }
  });

  it("carries at least one genuine NATIONAL_ONLY Korea-specific layer entry", () => {
    const nationalOnly = KR_STRATEGIC_ENTRIES.filter(
      (e) => e.mirrorDelta === "NATIONAL_ONLY",
    );
    expect(nationalOnly.length).toBeGreaterThanOrEqual(1);
  });

  it("coverage.excluded is non-empty (honesty caveat) + count matches the data", () => {
    expect(KR_STRATEGIC_COVERAGE.excluded.length).toBeGreaterThan(0);
    expect(KR_STRATEGIC_COVERAGE.caelexCoverageCount).toBe(
      KR_STRATEGIC_ENTRIES.length,
    );
    expect(KR_STRATEGIC_COVERAGE.regime).toBe("KR_STRATEGIC");
    // The honest 3A001/3A002 absent-target exclusion must be recorded.
    expect(
      KR_STRATEGIC_COVERAGE.excluded.some((x) => x.includes("3A001")),
    ).toBe(true);
  });

  it("source citation names MOTIE / the Foreign Trade Act + the Yestrade URL", () => {
    const cite = getKrStrategicSourceCitation();
    expect(cite).toContain("MOTIE");
    expect(cite).toContain("yestrade.go.kr");
  });

  it("findKrStrategicEntry resolves known code and returns undefined for bogus code", () => {
    expect(findKrStrategicEntry("9A004")).toBeDefined();
    expect(findKrStrategicEntry("BOGUS_DOES_NOT_EXIST")).toBeUndefined();
  });
});
