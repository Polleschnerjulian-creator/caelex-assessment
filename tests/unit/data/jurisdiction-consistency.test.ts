// tests/unit/data/jurisdiction-consistency.test.ts

/**
 * Cross-registry consistency tests.
 *
 * Atlas has three independent registries of jurisdictions:
 *   1. SpaceLawCountryCode        — TypeScript union in src/lib/space-law-types.ts
 *   2. SPACE_LAW_COUNTRY_CODES[]  — runtime array in same file
 *   3. JURISDICTION_DATA Map      — src/data/national-space-laws.ts
 *   4. legal-sources JURISDICTION_DATA  — src/data/legal-sources/index.ts
 *
 * When a new country is added, ALL FOUR must be updated. These tests
 * enforce that they stay in sync — catches the common "forgot to
 * register in one place" bug the instant it's committed.
 */

import { describe, it, expect } from "vitest";
import {
  SPACE_LAW_COUNTRY_CODES,
  ATLAS_EXTENDED_JURISDICTION_CODES,
  type SpaceLawCountryCode,
} from "@/lib/space-law-types";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import { getAvailableJurisdictions } from "@/data/legal-sources";

describe("Jurisdiction registries — consistency", () => {
  it("SPACE_LAW_COUNTRY_CODES array contains no duplicates", () => {
    const codes = [...SPACE_LAW_COUNTRY_CODES];
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
    expect(dupes).toEqual([]);
  });

  it("every code in SPACE_LAW_COUNTRY_CODES is valid ISO 3166-1 alpha-2 OR alpha-3 format (2-3 uppercase chars)", () => {
    const invalid: string[] = [];
    for (const code of SPACE_LAW_COUNTRY_CODES) {
      if (!/^[A-Z]{2,3}$/.test(code)) {
        invalid.push(code);
      }
    }
    expect(invalid).toEqual([]);
  });

  it("every SPACE_LAW_COUNTRY_CODE has a JurisdictionLaw entry in national-space-laws.ts", () => {
    const missing: string[] = [];
    for (const code of SPACE_LAW_COUNTRY_CODES) {
      if (!JURISDICTION_DATA.has(code as SpaceLawCountryCode)) {
        missing.push(code);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every JURISDICTION_DATA key is in SPACE_LAW_COUNTRY_CODES", () => {
    const extra: string[] = [];
    for (const code of JURISDICTION_DATA.keys()) {
      if (!SPACE_LAW_COUNTRY_CODES.includes(code)) {
        extra.push(code);
      }
    }
    expect(extra).toEqual([]);
  });

  it("every SPACE_LAW_COUNTRY_CODE has an entry in legal-sources getAvailableJurisdictions()", () => {
    const available = new Set(getAvailableJurisdictions());
    const missing: string[] = [];
    for (const code of SPACE_LAW_COUNTRY_CODES) {
      if (!available.has(code)) {
        missing.push(code);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every national entry in legal-sources getAvailableJurisdictions() is in SPACE_LAW_COUNTRY_CODES OR ATLAS_EXTENDED_JURISDICTION_CODES (excluding INT/EU)", () => {
    // SPACE_LAW_COUNTRY_CODES drives the National Space Law assessment
    // wizard. ATLAS_EXTENDED_JURISDICTION_CODES catalogues strategic non-EU
    // actors (RU/CN/IN/JP/...) that are surfaced in Atlas pages but do
    // not have an assessment-wizard JurisdictionLaw mapping.
    const allowedMeta = new Set(["INT", "EU"]);
    const wizardCodes = new Set(SPACE_LAW_COUNTRY_CODES as readonly string[]);
    const extendedCodes = new Set(
      ATLAS_EXTENDED_JURISDICTION_CODES as readonly string[],
    );
    const extra: string[] = [];
    for (const code of getAvailableJurisdictions()) {
      if (allowedMeta.has(code)) continue;
      if (!wizardCodes.has(code) && !extendedCodes.has(code)) {
        extra.push(code);
      }
    }
    expect(extra).toEqual([]);
  });
});

describe("JurisdictionLaw entries — shape validity", () => {
  it("every JurisdictionLaw has countryCode matching its Map key", () => {
    const mismatches: string[] = [];
    for (const [key, data] of JURISDICTION_DATA) {
      if (data.countryCode !== key) {
        mismatches.push(`key=${key} but countryCode=${data.countryCode}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("every JurisdictionLaw has a non-empty countryName", () => {
    const bad: string[] = [];
    for (const [code, data] of JURISDICTION_DATA) {
      if (!data.countryName || data.countryName.trim() === "") {
        bad.push(code);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every JurisdictionLaw has a non-empty flagEmoji", () => {
    const bad: string[] = [];
    for (const [code, data] of JURISDICTION_DATA) {
      if (!data.flagEmoji || data.flagEmoji.trim() === "") {
        bad.push(code);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every JurisdictionLaw has a lastUpdated in YYYY-MM format", () => {
    const bad: string[] = [];
    for (const [code, data] of JURISDICTION_DATA) {
      if (!/^\d{4}-\d{2}$/.test(data.lastUpdated)) {
        bad.push(`${code}: ${data.lastUpdated}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every JurisdictionLaw has a licensingAuthority with name + website", () => {
    const bad: string[] = [];
    for (const [code, data] of JURISDICTION_DATA) {
      if (
        !data.licensingAuthority.name.trim() ||
        !data.licensingAuthority.website
      ) {
        bad.push(code);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every JurisdictionLaw has at least one licensingRequirement", () => {
    const empty: string[] = [];
    for (const [code, data] of JURISDICTION_DATA) {
      if (data.licensingRequirements.length === 0) {
        empty.push(code);
      }
    }
    expect(empty).toEqual([]);
  });

  it("every JurisdictionLaw.legislation.status is a valid enum value", () => {
    const valid = ["enacted", "draft", "proposed", "none"];
    const invalid: string[] = [];
    for (const [code, data] of JURISDICTION_DATA) {
      if (!valid.includes(data.legislation.status)) {
        invalid.push(`${code}: ${data.legislation.status}`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it("every JurisdictionLaw.insuranceLiability.liabilityRegime is a valid enum value", () => {
    const valid = [
      "unlimited",
      "capped",
      "conditional",
      "mixed",
      "tiered",
      "negotiable",
    ];
    const invalid: string[] = [];
    for (const [code, data] of JURISDICTION_DATA) {
      if (!valid.includes(data.insuranceLiability.liabilityRegime)) {
        invalid.push(`${code}: ${data.insuranceLiability.liabilityRegime}`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it("every JurisdictionLaw.euSpaceActCrossRef.relationship is a valid enum value", () => {
    const valid = [
      "complementary",
      "gap",
      "conflict",
      "complete",
      "parallel",
      "superseded",
    ];
    const invalid: string[] = [];
    for (const [code, data] of JURISDICTION_DATA) {
      if (!valid.includes(data.euSpaceActCrossRef.relationship)) {
        invalid.push(`${code}: ${data.euSpaceActCrossRef.relationship}`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it("typicalProcessingWeeks has min ≤ max and both non-negative", () => {
    const bad: string[] = [];
    for (const [code, data] of JURISDICTION_DATA) {
      const w = data.timeline.typicalProcessingWeeks;
      if (w.min < 0 || w.max < 0 || w.min > w.max) {
        bad.push(`${code}: min=${w.min} max=${w.max}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("Scope — current coverage counts", () => {
  it("has at least 25 national jurisdictions registered", () => {
    expect(SPACE_LAW_COUNTRY_CODES.length).toBeGreaterThanOrEqual(25);
  });

  it("includes at least one non-European jurisdiction (global expansion active)", () => {
    const nonEuropean = ["US", "CN", "JP", "IN", "RU", "CA", "AU", "BR", "IL"];
    const covered = nonEuropean.filter((c) =>
      SPACE_LAW_COUNTRY_CODES.includes(c as SpaceLawCountryCode),
    );
    expect(covered.length).toBeGreaterThan(0);
  });

  it("covers the Big 5 EU space powers (DE, FR, IT, ES, UK)", () => {
    const big5 = ["DE", "FR", "IT", "ES", "UK"];
    for (const code of big5) {
      expect(
        SPACE_LAW_COUNTRY_CODES.includes(code as SpaceLawCountryCode),
      ).toBe(true);
    }
  });

  it("covers the Baltic trio (EE, LV, LT)", () => {
    const baltic = ["EE", "LV", "LT"];
    for (const code of baltic) {
      expect(
        SPACE_LAW_COUNTRY_CODES.includes(code as SpaceLawCountryCode),
      ).toBe(true);
    }
  });
});
