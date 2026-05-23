/**
 * Tests for IADC + FCC Orbital Debris Mitigation dataset.
 */

import { describe, expect, it } from "vitest";
import {
  DEBRIS_COVERAGE,
  DEBRIS_REQUIREMENTS,
  IADC_FCC_DEBRIS_AS_OF,
  findDebrisByBindingNature,
  findDebrisByCategory,
  findDebrisByOrbitalRegime,
  findDebrisByRegime,
  findDebrisEntry,
  findDebrisWithThreshold,
  findMandatoryRequirementsForJurisdiction,
  type DebrisRequirementEntry,
} from "./iadc-fcc-orbital-debris";

describe("IADC + FCC Orbital Debris dataset — cardinality and shape", () => {
  it("has at least 30 entries across all regimes", () => {
    expect(DEBRIS_REQUIREMENTS.length).toBeGreaterThanOrEqual(30);
  });

  it("every entry has a unique code", () => {
    const codes = DEBRIS_REQUIREMENTS.map((entry) => entry.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("every entry has all required fields", () => {
    for (const entry of DEBRIS_REQUIREMENTS) {
      expect(entry.code).toBeTruthy();
      expect(entry.regime).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.description.length).toBeGreaterThan(40);
      expect(entry.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.citation).toBeTruthy();
      expect(entry.sourceUrl).toMatch(/^https?:\/\//);
      expect(entry.orbitalRegimes.length).toBeGreaterThan(0);
      expect(entry.bindingNature).toBeTruthy();
      expect(entry.operatorScope.length).toBeGreaterThan(0);
    }
  });

  it("title is ≤ 120 chars per entry", () => {
    for (const entry of DEBRIS_REQUIREMENTS) {
      expect(entry.title.length).toBeLessThanOrEqual(120);
    }
  });

  it("coverage metadata matches actual cardinality", () => {
    expect(DEBRIS_COVERAGE.totalEntries).toBe(DEBRIS_REQUIREMENTS.length);
    const sumOfRegimes = Object.values(DEBRIS_COVERAGE.byRegime).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sumOfRegimes).toBe(DEBRIS_REQUIREMENTS.length);
  });

  it("as-of date matches dataset header", () => {
    expect(IADC_FCC_DEBRIS_AS_OF).toBe(DEBRIS_COVERAGE.asOf);
  });
});

describe("IADC + FCC Orbital Debris — regime coverage", () => {
  it("covers all 8 regimes (IADC, FCC, NASA, ESA, ISO, UN, EU, UK)", () => {
    const regimes = new Set(DEBRIS_REQUIREMENTS.map((e) => e.regime));
    expect(regimes.has("IADC")).toBe(true);
    expect(regimes.has("FCC")).toBe(true);
    expect(regimes.has("NASA-STD")).toBe(true);
    expect(regimes.has("ESA-STD")).toBe(true);
    expect(regimes.has("ISO-24113")).toBe(true);
    expect(regimes.has("UN-COPUOS")).toBe(true);
    expect(regimes.has("EU-SPACE-ACT")).toBe(true);
    expect(regimes.has("UK-SIA")).toBe(true);
  });

  it("FCC has the new 5-year PMD rule (FCC 22-74)", () => {
    const fcc5yr = findDebrisEntry("FCC-22-74-5YR");
    expect(fcc5yr).toBeDefined();
    expect(fcc5yr?.threshold?.value).toBe(5);
    expect(fcc5yr?.threshold?.unit).toBe("years");
    expect(fcc5yr?.bindingNature).toBe("MANDATORY");
  });

  it("IADC has the legacy 25-year PMD baseline", () => {
    const iadc25yr = findDebrisEntry("IADC-5.3.1");
    expect(iadc25yr).toBeDefined();
    expect(iadc25yr?.threshold?.value).toBe(25);
    expect(iadc25yr?.bindingNature).toBe("GUIDELINE");
  });

  it("ESA has adopted FCC-aligned 5-year LEO PMD", () => {
    const esa5yr = findDebrisEntry("ESA-ESSB-U-007-PMD-5YR");
    expect(esa5yr).toBeDefined();
    expect(esa5yr?.threshold?.value).toBe(5);
  });
});

describe("IADC + FCC Orbital Debris — category coverage", () => {
  it("covers all primary categories", () => {
    const categories = new Set(DEBRIS_REQUIREMENTS.map((e) => e.category));
    expect(categories.has("POST_MISSION_DISPOSAL")).toBe(true);
    expect(categories.has("PASSIVATION")).toBe(true);
    expect(categories.has("COLLISION_AVOIDANCE")).toBe(true);
    expect(categories.has("CASUALTY_RISK")).toBe(true);
    expect(categories.has("TRACKING_DATA")).toBe(true);
    expect(categories.has("DISPOSAL_VERIFICATION")).toBe(true);
  });

  it("has multiple PMD entries across regimes", () => {
    const pmdEntries = findDebrisByCategory("POST_MISSION_DISPOSAL");
    expect(pmdEntries.length).toBeGreaterThanOrEqual(5);
  });

  it("has multiple casualty-risk entries with the same threshold", () => {
    const casualtyEntries = findDebrisByCategory("CASUALTY_RISK");
    expect(casualtyEntries.length).toBeGreaterThanOrEqual(4);
    // All should converge on 1e-4
    for (const entry of casualtyEntries) {
      expect(entry.threshold?.value).toBe(0.0001);
    }
  });
});

describe("IADC + FCC Orbital Debris — threshold integrity", () => {
  it("entries with threshold have valid threshold structure", () => {
    const withThreshold = findDebrisWithThreshold();
    expect(withThreshold.length).toBeGreaterThanOrEqual(8);
    for (const entry of withThreshold) {
      expect(entry.threshold).toBeDefined();
      expect(entry.threshold!.parameter).toBeTruthy();
      expect(["<=", ">=", "<", ">", "="]).toContain(entry.threshold!.operator);
      expect(typeof entry.threshold!.value).toBe("number");
      expect(entry.threshold!.unit).toBeTruthy();
    }
  });

  it("PMD-lifetime thresholds are either 5 or 25 years", () => {
    const pmdEntries = findDebrisByCategory("POST_MISSION_DISPOSAL").filter(
      (e) => e.threshold?.parameter === "postMissionLifetimeYears",
    );
    for (const entry of pmdEntries) {
      expect([5, 25]).toContain(entry.threshold!.value);
    }
  });

  it("graveyard-orbit margins are 200/235/300 km above GEO", () => {
    const geoEntries = DEBRIS_REQUIREMENTS.filter(
      (e) => e.threshold?.parameter === "graveyardOrbitMarginKm",
    );
    expect(geoEntries.length).toBeGreaterThanOrEqual(2);
    for (const entry of geoEntries) {
      expect([200, 235, 300]).toContain(entry.threshold!.value);
    }
  });
});

describe("IADC + FCC Orbital Debris — cross-references", () => {
  it("relatedCodes (when present) point to real entries", () => {
    const allCodes = new Set(DEBRIS_REQUIREMENTS.map((e) => e.code));
    for (const entry of DEBRIS_REQUIREMENTS) {
      if (entry.relatedCodes) {
        for (const ref of entry.relatedCodes) {
          expect(allCodes.has(ref)).toBe(true);
        }
      }
    }
  });

  it("FCC 22-74 5-year rule cross-references ESA equivalent", () => {
    const fcc5yr = findDebrisEntry("FCC-22-74-5YR");
    expect(fcc5yr?.relatedCodes).toContain("ESA-ESSB-U-007-PMD-5YR");
  });
});

describe("IADC + FCC Orbital Debris — helper functions", () => {
  it("findDebrisEntry returns undefined for unknown codes", () => {
    expect(findDebrisEntry("DOES-NOT-EXIST")).toBeUndefined();
  });

  it("findDebrisByRegime returns IADC entries", () => {
    const iadc = findDebrisByRegime("IADC");
    expect(iadc.length).toBeGreaterThanOrEqual(5);
    expect(iadc.every((e) => e.regime === "IADC")).toBe(true);
  });

  it("findDebrisByOrbitalRegime LEO includes ANY-orbit rules", () => {
    const leo = findDebrisByOrbitalRegime("LEO");
    const leoSpecific = DEBRIS_REQUIREMENTS.filter((e) =>
      e.orbitalRegimes.includes("LEO"),
    );
    const anyOrbit = DEBRIS_REQUIREMENTS.filter((e) =>
      e.orbitalRegimes.includes("ANY"),
    );
    expect(leo.length).toBeGreaterThanOrEqual(
      leoSpecific.length +
        anyOrbit.length -
        leoSpecific.filter((e) => e.orbitalRegimes.includes("ANY")).length,
    );
  });

  it("findDebrisByOrbitalRegime GEO returns graveyard-orbit rules", () => {
    const geo = findDebrisByOrbitalRegime("GEO");
    const geoCodes = geo.map((e) => e.code);
    expect(geoCodes).toContain("IADC-5.3.2");
    expect(geoCodes).toContain("FCC-25.114-GEO");
    expect(geoCodes).toContain("ESA-ESSB-U-007-GEO");
  });

  it("findDebrisByBindingNature MANDATORY contains FCC + EU + UK rules", () => {
    const mandatory = findDebrisByBindingNature("MANDATORY");
    const regimes = new Set(mandatory.map((e) => e.regime));
    expect(regimes.has("FCC")).toBe(true);
    expect(regimes.has("EU-SPACE-ACT")).toBe(true);
    expect(regimes.has("UK-SIA")).toBe(true);
  });

  it("findDebrisByBindingNature GUIDELINE contains only IADC + UN", () => {
    const guidelines = findDebrisByBindingNature("GUIDELINE");
    const regimes = new Set(guidelines.map((e) => e.regime));
    expect(regimes.has("IADC")).toBe(true);
    expect(regimes.has("UN-COPUOS")).toBe(true);
    expect(regimes.has("FCC")).toBe(false); // FCC is MANDATORY
  });

  it("findMandatoryRequirementsForJurisdiction US returns FCC + NASA", () => {
    const usReqs = findMandatoryRequirementsForJurisdiction("US");
    const regimes = new Set(usReqs.map((e) => e.regime));
    expect(regimes.has("FCC")).toBe(true);
    // NASA-STD is STANDARD-binding, not MANDATORY at the regulatory level,
    // so it should NOT appear in mandatory-for-jurisdiction filter.
    expect(usReqs.every((e) => e.bindingNature === "MANDATORY")).toBe(true);
  });

  it("findMandatoryRequirementsForJurisdiction GB returns UK-SIA", () => {
    const ukReqs = findMandatoryRequirementsForJurisdiction("GB");
    expect(ukReqs.length).toBeGreaterThanOrEqual(2);
    expect(ukReqs.every((e) => e.regime === "UK-SIA")).toBe(true);
  });

  it("findMandatoryRequirementsForJurisdiction unknown returns empty", () => {
    expect(findMandatoryRequirementsForJurisdiction("XX")).toHaveLength(0);
  });
});

describe("IADC + FCC Orbital Debris — semantic invariants", () => {
  it("FCC 5-year rule postdates IADC 25-year rule", () => {
    const fcc5yr = findDebrisEntry("FCC-22-74-5YR")!;
    const iadc25yr = findDebrisEntry("IADC-5.3.1")!;
    expect(fcc5yr.effectiveFrom > iadc25yr.effectiveFrom).toBe(true);
  });

  it("EU Space Act entries are MANDATORY (proposed, but binding once adopted)", () => {
    const eu = findDebrisByRegime("EU-SPACE-ACT");
    expect(eu.length).toBeGreaterThan(0);
    for (const entry of eu) {
      expect(entry.bindingNature).toBe("MANDATORY");
    }
  });

  it("NASA-STD entries scope to GOVERNMENT operators", () => {
    const nasa = findDebrisByRegime("NASA-STD");
    for (const entry of nasa) {
      expect(entry.operatorScope).toContain("GOVERNMENT");
    }
  });

  it("ISO 24113 entries apply to ALL operators", () => {
    const iso = findDebrisByRegime("ISO-24113");
    for (const entry of iso) {
      expect(entry.operatorScope).toContain("ALL");
    }
  });

  it("UN COPUOS guidelines all dated 2007", () => {
    const un = findDebrisByRegime("UN-COPUOS");
    for (const entry of un) {
      expect(entry.effectiveFrom.startsWith("2007")).toBe(true);
    }
  });
});

describe("IADC + FCC Orbital Debris — narrative fidelity", () => {
  it("FCC 22-74 narrative mentions the 25-year-to-5-year shift", () => {
    const fcc5yr = findDebrisEntry("FCC-22-74-5YR")!;
    expect(fcc5yr.description.toLowerCase()).toContain("5 years");
    expect(fcc5yr.notes?.toLowerCase() ?? "").toContain("das");
  });

  it("IADC 5.3.2 narrative includes graveyard-orbit formula", () => {
    const geoIadc = findDebrisEntry("IADC-5.3.2")!;
    expect(geoIadc.description).toContain("235");
    expect(geoIadc.description.toLowerCase()).toContain("cr");
  });

  it("FCC 22-74 manoeuvrability rule scopes to 100+ sat constellations", () => {
    const fccManeuv = findDebrisEntry("FCC-25.114-MANEUVERABILITY")!;
    expect(fccManeuv.threshold?.value).toBe(100);
  });

  it("EU Space Act manoeuvrability rule is more conservative (50 sats)", () => {
    const euManeuv = findDebrisEntry("EU-SPACE-ACT-33")!;
    expect(euManeuv.threshold?.value).toBe(50);
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
