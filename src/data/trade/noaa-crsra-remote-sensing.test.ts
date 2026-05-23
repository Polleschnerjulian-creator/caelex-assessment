/**
 * Tests for NOAA CRSRA + EU/UK Remote-Sensing regulatory dataset.
 */

import { describe, expect, it } from "vitest";
import {
  NOAA_CRSRA_AS_OF,
  REMOTE_SENSING_COVERAGE,
  REMOTE_SENSING_REQUIREMENTS,
  findMandatoryRemoteSensingForJurisdiction,
  findRemoteSensingByBindingNature,
  findRemoteSensingByCategory,
  findRemoteSensingByRegime,
  findRemoteSensingBySensorType,
  findRemoteSensingEntry,
} from "./noaa-crsra-remote-sensing";

describe("Remote-sensing dataset — cardinality and shape", () => {
  it("has at least 25 entries across all regimes", () => {
    expect(REMOTE_SENSING_REQUIREMENTS.length).toBeGreaterThanOrEqual(25);
  });

  it("every entry has a unique code", () => {
    const codes = REMOTE_SENSING_REQUIREMENTS.map((entry) => entry.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("every entry has all required fields", () => {
    for (const entry of REMOTE_SENSING_REQUIREMENTS) {
      expect(entry.code).toBeTruthy();
      expect(entry.regime).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.description.length).toBeGreaterThan(40);
      expect(entry.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.citation).toBeTruthy();
      expect(entry.sourceUrl).toMatch(/^https?:\/\//);
      expect(entry.applicableSensorTypes.length).toBeGreaterThan(0);
      expect(entry.bindingNature).toBeTruthy();
      expect(entry.operatorScope.length).toBeGreaterThan(0);
    }
  });

  it("title is ≤ 120 chars per entry", () => {
    for (const entry of REMOTE_SENSING_REQUIREMENTS) {
      expect(entry.title.length).toBeLessThanOrEqual(120);
    }
  });

  it("coverage metadata matches actual cardinality", () => {
    expect(REMOTE_SENSING_COVERAGE.totalEntries).toBe(
      REMOTE_SENSING_REQUIREMENTS.length,
    );
    const sumOfRegimes = Object.values(REMOTE_SENSING_COVERAGE.byRegime).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sumOfRegimes).toBe(REMOTE_SENSING_REQUIREMENTS.length);
  });

  it("as-of date matches dataset header", () => {
    expect(NOAA_CRSRA_AS_OF).toBe(REMOTE_SENSING_COVERAGE.asOf);
  });

  it("as-of date is the expected 2026-05-23 value", () => {
    expect(NOAA_CRSRA_AS_OF).toBe("2026-05-23");
  });
});

describe("Remote-sensing — regime coverage (6+ regimes required)", () => {
  it("covers all 8 specified regimes", () => {
    const regimes = new Set(REMOTE_SENSING_REQUIREMENTS.map((e) => e.regime));
    expect(regimes.has("NOAA-CRSRA")).toBe(true);
    expect(regimes.has("NOAA-TIER")).toBe(true);
    expect(regimes.has("ITAR-XV-E")).toBe(true);
    expect(regimes.has("EU-GDPR-EO")).toBe(true);
    expect(regimes.has("UK-GISA-SIA")).toBe(true);
    expect(regimes.has("FR-LOA-EO")).toBe(true);
    expect(regimes.has("DE-SATDSIG")).toBe(true);
    expect(regimes.has("IT-CODICE-PRIVACY")).toBe(true);
  });

  it("each regime in coverage metadata has at least one entry", () => {
    const byRegime = REMOTE_SENSING_COVERAGE.byRegime;
    for (const count of Object.values(byRegime)) {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it("NOAA-CRSRA has the licence + tier + interagency + shutter-control + penalty entries", () => {
    const license = findRemoteSensingEntry("NOAA-960-3-LICENSE");
    const tier = findRemoteSensingEntry("NOAA-960-6-TIER");
    const interagency = findRemoteSensingEntry("NOAA-960-11-INTERAGENCY");
    const shutter = findRemoteSensingEntry("NOAA-960-SHUTTER-CONTROL");
    const penalty = findRemoteSensingEntry("NOAA-960-PENALTY");
    expect(license).toBeDefined();
    expect(tier).toBeDefined();
    expect(interagency).toBeDefined();
    expect(shutter).toBeDefined();
    expect(penalty).toBeDefined();
  });

  it("NOAA-TIER covers Tier 1/2/3 + Tier 3 specific conditions", () => {
    const tier1 = findRemoteSensingEntry("NOAA-TIER-1-NOTIFY-ONLY");
    const tier2 = findRemoteSensingEntry("NOAA-TIER-2-GENERAL");
    const tier3 = findRemoteSensingEntry("NOAA-TIER-3-CONDITIONS");
    const resCap = findRemoteSensingEntry("NOAA-TIER-3-RESOLUTION-CAP");
    const delay = findRemoteSensingEntry("NOAA-TIER-3-DELAY");
    const exclusion = findRemoteSensingEntry("NOAA-TIER-3-EXCLUSION");
    expect(tier1).toBeDefined();
    expect(tier2).toBeDefined();
    expect(tier3).toBeDefined();
    expect(resCap).toBeDefined();
    expect(delay).toBeDefined();
    expect(exclusion).toBeDefined();
  });

  it("ITAR-XV-E entries cover licence + SME + technical data", () => {
    const itar = findRemoteSensingByRegime("ITAR-XV-E");
    expect(itar.length).toBeGreaterThanOrEqual(3);
    const codes = itar.map((e) => e.code);
    expect(codes).toContain("ITAR-XV-E-LICENSE");
    expect(codes).toContain("ITAR-XV-E-SME");
    expect(codes).toContain("ITAR-XV-E-TECHDATA");
  });

  it("EU-GDPR-EO covers personal-data threshold + Art. 6 + Art. 9 + DPIA", () => {
    const personalData = findRemoteSensingEntry("EU-GDPR-EO-PERSONAL-DATA");
    const art6 = findRemoteSensingEntry("EU-GDPR-EO-ART6-LAWFUL");
    const art9 = findRemoteSensingEntry("EU-GDPR-EO-ART9-BIOMETRIC");
    const dpia = findRemoteSensingEntry("EU-GDPR-EO-DPIA");
    expect(personalData).toBeDefined();
    expect(art6).toBeDefined();
    expect(art9).toBeDefined();
    expect(dpia).toBeDefined();
  });

  it("UK-GISA-SIA covers Schedule 1 ¶5 + CAA NoV + UK GDPR overlay", () => {
    const ukSia = findRemoteSensingEntry("UK-SIA-SCH1-PARA5");
    const ukCaa = findRemoteSensingEntry("UK-CAA-NOV-EO");
    const ukGdpr = findRemoteSensingEntry("UK-GDPR-EO");
    expect(ukSia).toBeDefined();
    expect(ukCaa).toBeDefined();
    expect(ukGdpr).toBeDefined();
  });

  it("FR-LOA-EO covers R331-15 + inter-ministerial review + export overlay", () => {
    const r331 = findRemoteSensingEntry("FR-LOA-R331-15");
    const interMin = findRemoteSensingEntry("FR-LOA-INTER-MINISTERIAL");
    const exportOverlay = findRemoteSensingEntry("FR-LOA-EXPORT-OVERLAY");
    expect(r331).toBeDefined();
    expect(interMin).toBeDefined();
    expect(exportOverlay).toBeDefined();
  });

  it("DE-SATDSIG covers licence + sensitivity check + penalty", () => {
    const license = findRemoteSensingEntry("DE-SATDSIG-1-LICENSE");
    const sensCheck = findRemoteSensingEntry("DE-SATDSIG-SENSITIVITY-CHECK");
    const penalty = findRemoteSensingEntry("DE-SATDSIG-PENALTY");
    expect(license).toBeDefined();
    expect(sensCheck).toBeDefined();
    expect(penalty).toBeDefined();
  });

  it("IT-CODICE-PRIVACY covers Art. 9 + ASI authorisation + retention", () => {
    const art9 = findRemoteSensingEntry("IT-CODICE-PRIVACY-ART9");
    const asi = findRemoteSensingEntry("IT-ASI-AUTHORISATION");
    const retention = findRemoteSensingEntry("IT-CODICE-PRIVACY-RETENTION");
    expect(art9).toBeDefined();
    expect(asi).toBeDefined();
    expect(retention).toBeDefined();
  });
});

describe("Remote-sensing — category coverage", () => {
  it("covers at least 8 distinct categories", () => {
    const categories = new Set(
      REMOTE_SENSING_REQUIREMENTS.map((e) => e.category),
    );
    expect(categories.size).toBeGreaterThanOrEqual(8);
  });

  it("covers all primary remote-sensing categories", () => {
    const categories = new Set(
      REMOTE_SENSING_REQUIREMENTS.map((e) => e.category),
    );
    expect(categories.has("LICENSE_REQUIRED")).toBe(true);
    expect(categories.has("TIER_CLASSIFICATION")).toBe(true);
    expect(categories.has("RESOLUTION_LIMITS")).toBe(true);
    expect(categories.has("DATA_PUBLICATION_DELAY")).toBe(true);
    expect(categories.has("SENSITIVE_AREA_EXCLUSION")).toBe(true);
    expect(categories.has("SHUTTER_CONTROL")).toBe(true);
    expect(categories.has("PRIVACY_OVERLAY")).toBe(true);
    expect(categories.has("EXPORT_OVERLAY")).toBe(true);
    expect(categories.has("FOREIGN_SALES_REVIEW")).toBe(true);
  });

  it("LICENSE_REQUIRED appears across multiple national regimes", () => {
    const licEntries = findRemoteSensingByCategory("LICENSE_REQUIRED");
    const regimes = new Set(licEntries.map((e) => e.regime));
    expect(regimes.has("NOAA-CRSRA")).toBe(true);
    expect(regimes.has("UK-GISA-SIA")).toBe(true);
    expect(regimes.has("FR-LOA-EO")).toBe(true);
    expect(regimes.has("DE-SATDSIG")).toBe(true);
  });

  it("PRIVACY_OVERLAY entries are scoped EU + UK + Italy", () => {
    const privacyEntries = findRemoteSensingByCategory("PRIVACY_OVERLAY");
    expect(privacyEntries.length).toBeGreaterThanOrEqual(4);
    const regimes = new Set(privacyEntries.map((e) => e.regime));
    expect(regimes.has("EU-GDPR-EO")).toBe(true);
    expect(regimes.has("IT-CODICE-PRIVACY")).toBe(true);
  });
});

describe("Remote-sensing — threshold integrity", () => {
  it("entries with threshold have valid threshold structure", () => {
    const withThreshold = REMOTE_SENSING_REQUIREMENTS.filter(
      (e) => e.threshold !== undefined,
    );
    expect(withThreshold.length).toBeGreaterThanOrEqual(4);
    for (const entry of withThreshold) {
      expect(entry.threshold).toBeDefined();
      expect(entry.threshold!.parameter).toBeTruthy();
      expect(["<=", ">=", "<", ">", "="]).toContain(entry.threshold!.operator);
      expect(typeof entry.threshold!.value).toBe("number");
      expect(entry.threshold!.unit).toBeTruthy();
    }
  });

  it("NOAA penalty threshold encodes $10,000/day cap", () => {
    const penalty = findRemoteSensingEntry("NOAA-960-PENALTY");
    expect(penalty?.threshold?.parameter).toBe("civilPenaltyMaxPerDayUsd");
    expect(penalty?.threshold?.value).toBe(10000);
  });

  it("Tier 3 resolution-cap threshold encodes 25 cm GSD trigger", () => {
    const resCap = findRemoteSensingEntry("NOAA-TIER-3-RESOLUTION-CAP");
    expect(resCap?.threshold?.parameter).toBe("resolutionMeters");
    expect(resCap?.threshold?.operator).toBe(">=");
    expect(resCap?.threshold?.value).toBe(0.25);
  });

  it("Tier 3 publication-delay threshold encodes 24-hour delay", () => {
    const delay = findRemoteSensingEntry("NOAA-TIER-3-DELAY");
    expect(delay?.threshold?.parameter).toBe("dataPublicationDelayHours");
    expect(delay?.threshold?.value).toBe(24);
  });

  it("GDPR personal-data threshold encodes 30 cm GSD", () => {
    const gdprThreshold = findRemoteSensingEntry("EU-GDPR-EO-PERSONAL-DATA");
    expect(gdprThreshold?.threshold?.value).toBe(0.3);
    expect(gdprThreshold?.threshold?.unit).toContain("GSD");
  });

  it("DE SatDSiG threshold encodes 2.5 m high-grade panchromatic threshold", () => {
    const deLicense = findRemoteSensingEntry("DE-SATDSIG-1-LICENSE");
    expect(deLicense?.threshold?.value).toBe(2.5);
  });
});

describe("Remote-sensing — cross-references (relatedCodes)", () => {
  it("relatedCodes (when present) point to real entries", () => {
    const allCodes = new Set(REMOTE_SENSING_REQUIREMENTS.map((e) => e.code));
    for (const entry of REMOTE_SENSING_REQUIREMENTS) {
      if (entry.relatedCodes) {
        for (const ref of entry.relatedCodes) {
          expect(allCodes.has(ref)).toBe(true);
        }
      }
    }
  });

  it("NOAA Tier 3 conditions cross-reference resolution-cap + delay + exclusion", () => {
    const tier3 = findRemoteSensingEntry("NOAA-TIER-3-CONDITIONS");
    expect(tier3?.relatedCodes).toContain("NOAA-TIER-3-RESOLUTION-CAP");
    expect(tier3?.relatedCodes).toContain("NOAA-TIER-3-DELAY");
    expect(tier3?.relatedCodes).toContain("NOAA-TIER-3-EXCLUSION");
  });

  it("ITAR SME cross-references NOAA foreign sales review", () => {
    const sme = findRemoteSensingEntry("ITAR-XV-E-SME");
    expect(sme?.relatedCodes).toContain("NOAA-960-FOREIGN-SALES");
  });

  it("IT Codice Art. 9 cross-references EU GDPR Art. 9", () => {
    const itArt9 = findRemoteSensingEntry("IT-CODICE-PRIVACY-ART9");
    expect(itArt9?.relatedCodes).toContain("EU-GDPR-EO-ART9-BIOMETRIC");
  });
});

describe("Remote-sensing — helper functions", () => {
  it("findRemoteSensingEntry returns undefined for unknown codes", () => {
    expect(findRemoteSensingEntry("DOES-NOT-EXIST")).toBeUndefined();
  });

  it("findRemoteSensingByRegime NOAA-CRSRA returns NOAA-CRSRA entries only", () => {
    const noaa = findRemoteSensingByRegime("NOAA-CRSRA");
    expect(noaa.length).toBeGreaterThanOrEqual(5);
    expect(noaa.every((e) => e.regime === "NOAA-CRSRA")).toBe(true);
  });

  it("findRemoteSensingByCategory PRIVACY_OVERLAY matches all category entries", () => {
    const privacy = findRemoteSensingByCategory("PRIVACY_OVERLAY");
    expect(privacy.length).toBeGreaterThanOrEqual(4);
    expect(privacy.every((e) => e.category === "PRIVACY_OVERLAY")).toBe(true);
  });

  it("findRemoteSensingBySensorType SAR_X_BAND returns SAR-applicable rules", () => {
    const sar = findRemoteSensingBySensorType("SAR_X_BAND");
    expect(sar.length).toBeGreaterThan(0);
    for (const entry of sar) {
      expect(entry.applicableSensorTypes).toContain("SAR_X_BAND");
    }
  });

  it("findRemoteSensingBySensorType OPTICAL_PANCHROMATIC returns broad set", () => {
    const optical = findRemoteSensingBySensorType("OPTICAL_PANCHROMATIC");
    expect(optical.length).toBeGreaterThanOrEqual(10);
  });

  it("findRemoteSensingByBindingNature MANDATORY includes statutory regimes", () => {
    const mandatory = findRemoteSensingByBindingNature("MANDATORY");
    const regimes = new Set(mandatory.map((e) => e.regime));
    expect(regimes.has("NOAA-CRSRA")).toBe(true);
    expect(regimes.has("ITAR-XV-E")).toBe(true);
    expect(regimes.has("DE-SATDSIG")).toBe(true);
  });

  it("findRemoteSensingByBindingNature CONDITIONAL includes GDPR + Tier 3 conditions", () => {
    const conditional = findRemoteSensingByBindingNature("CONDITIONAL");
    expect(conditional.length).toBeGreaterThanOrEqual(4);
    const regimes = new Set(conditional.map((e) => e.regime));
    expect(regimes.has("EU-GDPR-EO")).toBe(true);
  });

  it("findMandatoryRemoteSensingForJurisdiction US returns NOAA + ITAR entries", () => {
    const usReqs = findMandatoryRemoteSensingForJurisdiction("US");
    expect(usReqs.length).toBeGreaterThan(0);
    const regimes = new Set(usReqs.map((e) => e.regime));
    expect(regimes.has("NOAA-CRSRA")).toBe(true);
    expect(regimes.has("ITAR-XV-E")).toBe(true);
    expect(usReqs.every((e) => e.bindingNature === "MANDATORY")).toBe(true);
  });

  it("findMandatoryRemoteSensingForJurisdiction DE returns SatDSiG entries", () => {
    const deReqs = findMandatoryRemoteSensingForJurisdiction("DE");
    expect(deReqs.length).toBeGreaterThanOrEqual(2);
    const regimes = new Set(deReqs.map((e) => e.regime));
    expect(regimes.has("DE-SATDSIG")).toBe(true);
  });

  it("findMandatoryRemoteSensingForJurisdiction FR returns French entries", () => {
    const frReqs = findMandatoryRemoteSensingForJurisdiction("FR");
    expect(frReqs.length).toBeGreaterThanOrEqual(2);
    const regimes = new Set(frReqs.map((e) => e.regime));
    expect(regimes.has("FR-LOA-EO")).toBe(true);
  });

  it("findMandatoryRemoteSensingForJurisdiction GB returns UK entries", () => {
    const gbReqs = findMandatoryRemoteSensingForJurisdiction("GB");
    expect(gbReqs.length).toBeGreaterThanOrEqual(1);
    const regimes = new Set(gbReqs.map((e) => e.regime));
    expect(regimes.has("UK-GISA-SIA")).toBe(true);
  });

  it("findMandatoryRemoteSensingForJurisdiction unknown returns empty", () => {
    expect(findMandatoryRemoteSensingForJurisdiction("XX")).toHaveLength(0);
  });
});

describe("Remote-sensing — semantic invariants", () => {
  it("NOAA-CRSRA entries are all MANDATORY or GUIDELINE (statutory regime)", () => {
    const noaa = findRemoteSensingByRegime("NOAA-CRSRA");
    expect(noaa.length).toBeGreaterThan(0);
    for (const entry of noaa) {
      expect(["MANDATORY", "GUIDELINE"]).toContain(entry.bindingNature);
    }
  });

  it("EU-GDPR-EO rules apply when sensor type can capture personal data (optical)", () => {
    const gdprPD = findRemoteSensingEntry("EU-GDPR-EO-PERSONAL-DATA")!;
    expect(gdprPD.applicableSensorTypes).toContain("OPTICAL_PANCHROMATIC");
    expect(gdprPD.applicableSensorTypes).toContain("OPTICAL_HYPERSPECTRAL");
  });

  it("ITAR XV(e) entries are MANDATORY (export-control statute)", () => {
    const itar = findRemoteSensingByRegime("ITAR-XV-E");
    expect(itar.length).toBeGreaterThan(0);
    for (const entry of itar) {
      expect(entry.bindingNature).toBe("MANDATORY");
    }
  });

  it("NOAA-CRSRA license rule applies broadly to all sensor types", () => {
    const license = findRemoteSensingEntry("NOAA-960-3-LICENSE")!;
    // Any commercial EO sensor — optical, SAR, RF, IR
    expect(license.applicableSensorTypes).toContain("OPTICAL_PANCHROMATIC");
    expect(license.applicableSensorTypes).toContain("SAR_X_BAND");
    expect(license.applicableSensorTypes).toContain("RF_GEOLOCATION");
    expect(license.applicableSensorTypes).toContain("THERMAL_INFRARED");
  });

  it("Tier 3 specific conditions are CONDITIONAL (only when Tier 3 declared)", () => {
    const tier3Conds = [
      "NOAA-TIER-3-RESOLUTION-CAP",
      "NOAA-TIER-3-DELAY",
      "NOAA-TIER-3-EXCLUSION",
    ];
    for (const code of tier3Conds) {
      const entry = findRemoteSensingEntry(code)!;
      expect(entry.bindingNature).toBe("CONDITIONAL");
    }
  });

  it("All COMMERCIAL operator-scoped rules cover the COMMERCIAL value", () => {
    const commercialScopedCount = REMOTE_SENSING_REQUIREMENTS.filter((e) =>
      e.operatorScope.includes("COMMERCIAL"),
    ).length;
    // Vast majority of rules apply to commercial operators (this is the
    // commercial EO regulatory layer, after all).
    expect(commercialScopedCount).toBeGreaterThan(
      REMOTE_SENSING_REQUIREMENTS.length * 0.9,
    );
  });
});

describe("Remote-sensing — sensor-type filtering", () => {
  it("RF_GEOLOCATION filtering returns RF-relevant rules", () => {
    const rf = findRemoteSensingBySensorType("RF_GEOLOCATION");
    // RF geolocation triggers NOAA + ITAR + FR/UK reviews
    expect(rf.length).toBeGreaterThan(0);
    const regimes = new Set(rf.map((e) => e.regime));
    expect(regimes.has("NOAA-CRSRA")).toBe(true);
    expect(regimes.has("ITAR-XV-E")).toBe(true);
  });

  it("THERMAL_INFRARED filtering returns at least NOAA + tier rules", () => {
    const thermal = findRemoteSensingBySensorType("THERMAL_INFRARED");
    expect(thermal.length).toBeGreaterThan(0);
    const regimes = new Set(thermal.map((e) => e.regime));
    expect(regimes.has("NOAA-CRSRA")).toBe(true);
  });

  it("OPTICAL_HYPERSPECTRAL filtering returns broadest set across regimes", () => {
    const hyper = findRemoteSensingBySensorType("OPTICAL_HYPERSPECTRAL");
    const regimes = new Set(hyper.map((e) => e.regime));
    expect(regimes.size).toBeGreaterThanOrEqual(5);
  });
});

describe("Remote-sensing — narrative fidelity", () => {
  it("NOAA licence description mentions 15 CFR Part 960 + 51 U.S.C. § 60121", () => {
    const noaa = findRemoteSensingEntry("NOAA-960-3-LICENSE")!;
    expect(noaa.description).toMatch(/15 CFR/);
    expect(noaa.description).toMatch(/51 U\.S\.C\./);
  });

  it("Tier 3 conditions description mentions resolution caps + publication delay + exclusions", () => {
    const tier3 = findRemoteSensingEntry("NOAA-TIER-3-CONDITIONS")!;
    expect(tier3.description.toLowerCase()).toContain("resolution");
    expect(tier3.description.toLowerCase()).toContain("delay");
    expect(tier3.description.toLowerCase()).toContain("exclusion");
  });

  it("Shutter-control entry mentions Section 60146 + 24-hour response", () => {
    const shutter = findRemoteSensingEntry("NOAA-960-SHUTTER-CONTROL")!;
    expect(shutter.description).toMatch(/60146/);
    expect(shutter.description).toMatch(/24 hours/);
  });

  it("EDPB Guidelines 03/2024 referenced in EU GDPR entries", () => {
    const personalData = findRemoteSensingEntry("EU-GDPR-EO-PERSONAL-DATA")!;
    const art6 = findRemoteSensingEntry("EU-GDPR-EO-ART6-LAWFUL")!;
    const art9 = findRemoteSensingEntry("EU-GDPR-EO-ART9-BIOMETRIC")!;
    expect(personalData.description).toMatch(/EDPB Guidelines 03\/2024/);
    expect(art6.description).toMatch(/EDPB/);
    expect(art9.description).toMatch(/EDPB/);
  });

  it("UK SIA entry mentions Schedule 1 ¶5 + CAA", () => {
    const ukSia = findRemoteSensingEntry("UK-SIA-SCH1-PARA5")!;
    expect(ukSia.description.toLowerCase()).toContain("paragraph 5");
    expect(ukSia.description).toContain("Civil Aviation Authority");
  });

  it("German SatDSiG entry mentions BGBl. I S. 2590", () => {
    const deLicense = findRemoteSensingEntry("DE-SATDSIG-1-LICENSE")!;
    expect(deLicense.description).toMatch(/BGBl/);
    expect(deLicense.description).toMatch(/2590/);
  });

  it("FY2024 NDAA § 1612 description mentions geospatial intel + Section 1612", () => {
    const ndaa = findRemoteSensingEntry("NOAA-960-NDAA-1612")!;
    expect(ndaa.description).toMatch(/Section 1612/);
    expect(ndaa.description.toLowerCase()).toContain("geospatial");
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
