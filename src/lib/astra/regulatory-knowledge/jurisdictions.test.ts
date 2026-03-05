import { describe, it, expect } from "vitest";
import {
  JURISDICTION_PROFILES,
  getJurisdictionByCode,
  getJurisdictionsByFavorability,
  compareJurisdictions,
  getJurisdictionsWithInsuranceBelow,
  getJurisdictionsByProcessingTime,
  FAVORABILITY_FACTORS,
  JURISDICTIONS_SUMMARY,
} from "./jurisdictions";

// ─── JURISDICTION_PROFILES ───

describe("JURISDICTION_PROFILES", () => {
  it("has 10 jurisdictions", () => {
    expect(JURISDICTION_PROFILES).toHaveLength(10);
  });

  it("every profile has required fields", () => {
    for (const profile of JURISDICTION_PROFILES) {
      expect(profile.countryCode).toBeTruthy();
      expect(profile.countryName).toBeTruthy();
      expect(profile.ncaName).toBeTruthy();
      expect(profile.ncaAbbreviation).toBeTruthy();
      expect(typeof profile.processingTimeDays.standard).toBe("number");
      expect(typeof profile.insuranceMinimums.tplMinimum).toBe("number");
      expect(profile.insuranceMinimums.currency).toBeTruthy();
      expect(profile.liabilityRegime).toBeTruthy();
      expect(Array.isArray(profile.specialRequirements)).toBe(true);
      expect(profile.specialRequirements.length).toBeGreaterThan(0);
      expect(typeof profile.favorabilityScore).toBe("number");
      expect(profile.favorabilityScore).toBeGreaterThanOrEqual(0);
      expect(profile.favorabilityScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(profile.languageRequirements)).toBe(true);
      expect(profile.languageRequirements.length).toBeGreaterThan(0);
    }
  });

  it("contains expected country codes", () => {
    const codes = JURISDICTION_PROFILES.map((p) => p.countryCode);
    expect(codes).toContain("FR");
    expect(codes).toContain("UK");
    expect(codes).toContain("DE");
    expect(codes).toContain("LU");
    expect(codes).toContain("NL");
    expect(codes).toContain("BE");
    expect(codes).toContain("AT");
    expect(codes).toContain("DK");
    expect(codes).toContain("IT");
    expect(codes).toContain("NO");
  });

  it("France has CNES as NCA", () => {
    const france = JURISDICTION_PROFILES.find((p) => p.countryCode === "FR");
    expect(france).toBeDefined();
    expect(france!.ncaAbbreviation).toBe("CNES");
  });

  it("Luxembourg has highest favorability score", () => {
    const lu = JURISDICTION_PROFILES.find((p) => p.countryCode === "LU");
    expect(lu).toBeDefined();
    expect(lu!.favorabilityScore).toBe(90);
  });

  it("some jurisdictions have expedited processing", () => {
    const withExpedited = JURISDICTION_PROFILES.filter(
      (p) => p.processingTimeDays.expedited !== undefined,
    );
    expect(withExpedited.length).toBeGreaterThan(0);
  });

  it("all profiles have fees", () => {
    for (const profile of JURISDICTION_PROFILES) {
      expect(profile.fees).toBeDefined();
      expect(profile.fees!.currency).toBeTruthy();
    }
  });

  it("all profiles have contacts", () => {
    for (const profile of JURISDICTION_PROFILES) {
      expect(profile.contacts).toBeDefined();
      expect(profile.contacts!.website).toBeTruthy();
    }
  });
});

// ─── getJurisdictionByCode ───

describe("getJurisdictionByCode", () => {
  it("returns France for FR", () => {
    const result = getJurisdictionByCode("FR");
    expect(result).toBeDefined();
    expect(result!.countryName).toBe("France");
  });

  it("returns UK profile", () => {
    const result = getJurisdictionByCode("UK");
    expect(result).toBeDefined();
    expect(result!.ncaAbbreviation).toBe("CAA Space");
  });

  it("returns Germany for DE", () => {
    const result = getJurisdictionByCode("DE");
    expect(result).toBeDefined();
    expect(result!.countryName).toBe("Germany");
  });

  it("returns undefined for unknown code", () => {
    expect(getJurisdictionByCode("XX")).toBeUndefined();
    expect(getJurisdictionByCode("US")).toBeUndefined();
  });
});

// ─── getJurisdictionsByFavorability ───

describe("getJurisdictionsByFavorability", () => {
  it("returns all jurisdictions with default minScore 0", () => {
    const results = getJurisdictionsByFavorability();
    expect(results).toHaveLength(10);
  });

  it("results are sorted by favorability descending", () => {
    const results = getJurisdictionsByFavorability();
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].favorabilityScore).toBeGreaterThanOrEqual(
        results[i].favorabilityScore,
      );
    }
  });

  it("filters by minimum score", () => {
    const results = getJurisdictionsByFavorability(85);
    expect(results.length).toBeGreaterThan(0);
    for (const profile of results) {
      expect(profile.favorabilityScore).toBeGreaterThanOrEqual(85);
    }
  });

  it("high threshold returns fewer results", () => {
    const all = getJurisdictionsByFavorability(0);
    const high = getJurisdictionsByFavorability(85);
    expect(high.length).toBeLessThan(all.length);
  });

  it("returns empty array for unreachable threshold", () => {
    const results = getJurisdictionsByFavorability(101);
    expect(results).toEqual([]);
  });
});

// ─── compareJurisdictions ───

describe("compareJurisdictions", () => {
  it("returns profiles for valid codes", () => {
    const results = compareJurisdictions(["FR", "DE"]);
    expect(results).toHaveLength(2);
    expect(results[0].countryCode).toBe("FR");
    expect(results[1].countryCode).toBe("DE");
  });

  it("filters out invalid codes", () => {
    const results = compareJurisdictions(["FR", "INVALID", "DE"]);
    expect(results).toHaveLength(2);
  });

  it("returns empty array for all invalid codes", () => {
    const results = compareJurisdictions(["XX", "YY"]);
    expect(results).toEqual([]);
  });

  it("handles single jurisdiction", () => {
    const results = compareJurisdictions(["LU"]);
    expect(results).toHaveLength(1);
    expect(results[0].countryCode).toBe("LU");
  });

  it("handles empty array", () => {
    const results = compareJurisdictions([]);
    expect(results).toEqual([]);
  });
});

// ─── getJurisdictionsWithInsuranceBelow ───

describe("getJurisdictionsWithInsuranceBelow", () => {
  it("returns jurisdictions below a threshold", () => {
    const results = getJurisdictionsWithInsuranceBelow(50_000_000);
    expect(results.length).toBeGreaterThan(0);
    for (const profile of results) {
      expect(profile.insuranceMinimums.tplMinimum).toBeLessThanOrEqual(
        50_000_000,
      );
    }
  });

  it("high threshold returns all jurisdictions", () => {
    const results = getJurisdictionsWithInsuranceBelow(200_000_000);
    expect(results).toHaveLength(10);
  });

  it("very low threshold returns empty array", () => {
    const results = getJurisdictionsWithInsuranceBelow(1_000);
    expect(results).toEqual([]);
  });
});

// ─── getJurisdictionsByProcessingTime ───

describe("getJurisdictionsByProcessingTime", () => {
  it("returns jurisdictions with processing time up to 180 days", () => {
    const results = getJurisdictionsByProcessingTime(180);
    expect(results.length).toBeGreaterThan(0);
    for (const profile of results) {
      expect(profile.processingTimeDays.standard).toBeLessThanOrEqual(180);
    }
  });

  it("very short threshold returns fewer results", () => {
    const results = getJurisdictionsByProcessingTime(100);
    expect(results.length).toBeLessThan(10);
  });

  it("very long threshold returns all", () => {
    const results = getJurisdictionsByProcessingTime(365);
    expect(results).toHaveLength(10);
  });

  it("returns empty for impossible threshold", () => {
    const results = getJurisdictionsByProcessingTime(10);
    expect(results).toEqual([]);
  });
});

// ─── FAVORABILITY_FACTORS ───

describe("FAVORABILITY_FACTORS", () => {
  it("has expected factor keys", () => {
    expect(FAVORABILITY_FACTORS.processingTime).toBeDefined();
    expect(FAVORABILITY_FACTORS.insuranceCosts).toBeDefined();
    expect(FAVORABILITY_FACTORS.liabilityRegime).toBeDefined();
    expect(FAVORABILITY_FACTORS.regulatoryMaturity).toBeDefined();
    expect(FAVORABILITY_FACTORS.languageAccessibility).toBeDefined();
    expect(FAVORABILITY_FACTORS.fees).toBeDefined();
    expect(FAVORABILITY_FACTORS.ecosystemSupport).toBeDefined();
  });

  it("weights sum to 1.0", () => {
    const totalWeight = Object.values(FAVORABILITY_FACTORS).reduce(
      (sum, factor) => sum + factor.weight,
      0,
    );
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it("each factor has weight and description", () => {
    for (const [, factor] of Object.entries(FAVORABILITY_FACTORS)) {
      expect(typeof factor.weight).toBe("number");
      expect(factor.weight).toBeGreaterThan(0);
      expect(factor.description).toBeTruthy();
    }
  });
});

// ─── JURISDICTIONS_SUMMARY ───

describe("JURISDICTIONS_SUMMARY", () => {
  it("is a non-empty string", () => {
    expect(typeof JURISDICTIONS_SUMMARY).toBe("string");
    expect(JURISDICTIONS_SUMMARY.length).toBeGreaterThan(100);
  });

  it("mentions key jurisdictions", () => {
    expect(JURISDICTIONS_SUMMARY).toContain("Luxembourg");
    expect(JURISDICTIONS_SUMMARY).toContain("France");
    expect(JURISDICTIONS_SUMMARY).toContain("Germany");
  });
});
