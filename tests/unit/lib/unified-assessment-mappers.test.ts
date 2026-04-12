import { describe, it, expect, vi } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

const { mapToAssessmentAnswers, mapToNIS2Answers, mapToSpaceLawAnswers } =
  await import("@/lib/unified-assessment-mappers.server");

const { getDefaultUnifiedAnswers } =
  await import("@/lib/unified-assessment-types");

describe("mapToAssessmentAnswers", () => {
  it("maps SCO activity type to spacecraft", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "medium" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.activityType).toBe("spacecraft");
  });

  it("maps LO activity type to launch_vehicle", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "large" as const,
    };
    const result = mapToAssessmentAnswers(answers, "LO");
    expect(result.activityType).toBe("launch_vehicle");
  });

  it("maps LSO activity type to launch_site", () => {
    const answers = getDefaultUnifiedAnswers();
    const result = mapToAssessmentAnswers(answers, "LSO");
    expect(result.activityType).toBe("launch_site");
  });

  it("maps ISOS activity type to isos", () => {
    const answers = getDefaultUnifiedAnswers();
    const result = mapToAssessmentAnswers(answers, "ISOS");
    expect(result.activityType).toBe("isos");
  });

  it("maps PDP activity type to data_provider", () => {
    const answers = getDefaultUnifiedAnswers();
    const result = mapToAssessmentAnswers(answers, "PDP");
    expect(result.activityType).toBe("data_provider");
  });

  it("maps CAP activity type to null (general articles only)", () => {
    const answers = getDefaultUnifiedAnswers();
    const result = mapToAssessmentAnswers(answers, "CAP");
    expect(result.activityType).toBeNull();
  });

  it("maps TCO to spacecraft with third_country establishment", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "US",
    };
    const result = mapToAssessmentAnswers(answers, "TCO");
    expect(result.activityType).toBe("spacecraft");
    expect(result.establishment).toBe("third_country_eu_services");
  });

  it("derives EU establishment for EU country", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "DE",
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.establishment).toBe("eu");
  });

  it("derives third_country_eu_services when serving EU customers", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "US",
      servesEUCustomers: true,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.establishment).toBe("third_country_eu_services");
  });

  it("derives third_country_no_eu for non-EU with no EU services", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "US",
      servesEUCustomers: false,
      providesServicesToEU: false,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.establishment).toBe("third_country_no_eu");
  });

  it("maps micro entity size to small", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "micro" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.entitySize).toBe("small");
  });

  it("maps research institution to research", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "small" as const,
      isResearchInstitution: true,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.entitySize).toBe("research");
  });

  it("maps large entity size directly", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "large" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.entitySize).toBe("large");
  });

  it("maps LEO orbit to LEO", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      primaryOrbitalRegime: "LEO" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.primaryOrbit).toBe("LEO");
  });

  it("maps GEO orbit to GEO", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      primaryOrbitalRegime: "GEO" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.primaryOrbit).toBe("GEO");
  });

  it("maps HEO orbit to beyond", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      primaryOrbitalRegime: "HEO" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.primaryOrbit).toBe("beyond");
  });

  it("maps CISLUNAR orbit to beyond", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      primaryOrbitalRegime: "CISLUNAR" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.primaryOrbit).toBe("beyond");
  });

  it("maps constellation size small to 5", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      constellationSize: "small" as const,
      operatesConstellation: true,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.operatesConstellation).toBe(true);
    expect(result.constellationSize).toBe(5);
  });

  it("maps constellation size mega to 2000", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      constellationSize: "mega" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.constellationSize).toBe(2000);
  });

  it("maps constellation size none to null", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      constellationSize: "none" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.constellationSize).toBeNull();
  });

  it("maps defense-only to isDefenseOnly true", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      defenseInvolvement: "full" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.isDefenseOnly).toBe(true);
  });

  it("handles null fields gracefully", () => {
    const answers = getDefaultUnifiedAnswers();
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.activityType).toBe("spacecraft");
    expect(result.primaryOrbit).toBeNull();
    expect(result.constellationSize).toBeNull();
  });

  it("handles empty activity types", () => {
    const answers = getDefaultUnifiedAnswers();
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result).toBeDefined();
  });
});

describe("mapToNIS2Answers", () => {
  it("always sets sector to space", () => {
    const answers = getDefaultUnifiedAnswers();
    const result = mapToNIS2Answers(answers);
    expect(result.sector).toBe("space");
  });

  it("derives satellite_communications sub-sector from SATCOM", () => {
    const answers = { ...getDefaultUnifiedAnswers(), serviceTypes: ["SATCOM"] };
    const result = mapToNIS2Answers(answers);
    expect(result.spaceSubSector).toBe("satellite_communications");
  });

  it("derives earth_observation sub-sector from EO", () => {
    const answers = { ...getDefaultUnifiedAnswers(), serviceTypes: ["EO"] };
    const result = mapToNIS2Answers(answers);
    expect(result.spaceSubSector).toBe("earth_observation");
  });

  it("does NOT classify pure NAV/SSA data resellers as ground-infra operators", () => {
    // 2026-04 audit fix: NAV/SSA service types alone do not imply the
    // operator runs ground infrastructure. A NAV/SSA data reseller may
    // simply purchase data from upstream and not own any ground stations.
    // Use isDataResellerOnly=true to be explicit.
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: ["NAV", "SSA"],
      isDataResellerOnly: true,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.operatesGroundInfra).toBeFalsy();
  });

  it("classifies SATCOM operators as ground-infra operators", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: ["SATCOM"],
    };
    const result = mapToNIS2Answers(answers);
    expect(result.operatesGroundInfra).toBe(true);
  });

  it("detects satcom operations", () => {
    const answers = { ...getDefaultUnifiedAnswers(), serviceTypes: ["SATCOM"] };
    const result = mapToNIS2Answers(answers);
    expect(result.operatesSatComms).toBe(true);
  });

  it("detects spacecraft manufacturing", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["SCO" as const],
      serviceTypes: ["MANUFACTURING"],
    };
    const result = mapToNIS2Answers(answers);
    expect(result.manufacturesSpacecraft).toBe(true);
  });

  it("detects launch services", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["LO" as const],
    };
    const result = mapToNIS2Answers(answers);
    expect(result.providesLaunchServices).toBe(true);
  });

  it("passes entity size directly", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "large" as const,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.entitySize).toBe("large");
  });

  it("overrides small to medium when revenue above 10M", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "small" as const,
      annualRevenueAbove10M: true,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.entitySize).toBe("medium");
  });

  it("derives EU establishment from country", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "FR",
    };
    const result = mapToNIS2Answers(answers);
    expect(result.isEUEstablished).toBe(true);
  });

  it("derives non-EU establishment", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "US",
    };
    const result = mapToNIS2Answers(answers);
    expect(result.isEUEstablished).toBe(false);
  });

  it("maps employee range to midpoint", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      employeeRange: "50_249" as const,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.employeeCount).toBe(150);
  });

  it("maps ISO27001 certification", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      existingCertifications: ["ISO27001"],
    };
    const result = mapToNIS2Answers(answers);
    expect(result.hasISO27001).toBe(true);
  });

  it("maps incident response plan to CSIRT", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasIncidentResponsePlan: true,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.hasExistingCSIRT).toBe(true);
  });

  it("maps risk management directly", () => {
    const answers = { ...getDefaultUnifiedAnswers(), hasRiskManagement: true };
    const result = mapToNIS2Answers(answers);
    expect(result.hasRiskManagement).toBe(true);
  });
});

describe("mapToSpaceLawAnswers", () => {
  it("passes jurisdictions directly", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      interestedJurisdictions: ["FR", "DE"],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.selectedJurisdictions).toEqual(["FR", "DE"]);
  });

  it("maps SCO to spacecraft_operation", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["SCO" as const],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.activityType).toBe("spacecraft_operation");
  });

  it("maps LO to launch_vehicle", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["LO" as const],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.activityType).toBe("launch_vehicle");
  });

  it("maps orbit same as EU Space Act", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      primaryOrbitalRegime: "GEO" as const,
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.primaryOrbit).toBe("GEO");
  });

  it("drops micro to small for entity size", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "micro" as const,
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.entitySize).toBe("small");
  });

  it("derives new_application when no licenses", () => {
    const answers = { ...getDefaultUnifiedAnswers(), currentLicenses: [] };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.licensingStatus).toBe("new_application");
  });

  it("derives existing_license when licenses present", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      currentLicenses: ["FR"],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.licensingStatus).toBe("existing_license");
  });

  it("maps constellation size to number", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      constellationSize: "medium" as const,
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.constellationSize).toBe(50);
  });

  it("derives domestic nationality when country matches jurisdiction", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "FR",
      interestedJurisdictions: ["FR"],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.entityNationality).toBe("domestic");
  });

  it("derives eu_other for EU country not in jurisdictions", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "DE",
      interestedJurisdictions: ["FR"],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.entityNationality).toBe("eu_other");
  });

  it("derives non_eu for non-EU country", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "US",
      interestedJurisdictions: ["FR"],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.entityNationality).toBe("non_eu");
  });

  it("derives esa_member for ESA non-EU countries (UK, NO, CH)", () => {
    for (const country of ["UK", "NO", "CH"]) {
      const answers = {
        ...getDefaultUnifiedAnswers(),
        establishmentCountry: country,
        interestedJurisdictions: ["FR"],
      };
      const result = mapToSpaceLawAnswers(answers);
      expect(result.entityNationality).toBe("esa_member");
    }
  });

  it("derives null nationality when no country set", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: null,
      interestedJurisdictions: ["FR"],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.entityNationality).toBeNull();
  });

  it("maps LSO activity type to launch_site", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["LSO" as const],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.activityType).toBe("launch_site");
  });

  it("maps ISOS activity type to in_orbit_services", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["ISOS" as const],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.activityType).toBe("in_orbit_services");
  });

  it("maps PDP activity type to earth_observation", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["PDP" as const],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.activityType).toBe("earth_observation");
  });

  it("maps CAP activity type to spacecraft_operation", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["CAP" as const],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.activityType).toBe("spacecraft_operation");
  });

  it("maps TCO activity type to spacecraft_operation", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["TCO" as const],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.activityType).toBe("spacecraft_operation");
  });

  it("returns null activity type for empty activityTypes", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: [],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.activityType).toBeNull();
  });

  it("filters NOT_SURE from jurisdictions", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      interestedJurisdictions: ["FR", "NOT_SURE"],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.selectedJurisdictions).toEqual(["FR"]);
  });

  it("returns new_application for licenses with only NONE", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      currentLicenses: ["NONE"],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.licensingStatus).toBe("new_application");
  });

  it("returns null entity size when entitySize is null", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: null,
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.entitySize).toBeNull();
  });

  it("maps small entity size to small for space law", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "small" as const,
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.entitySize).toBe("small");
  });

  it("maps large entity size directly for space law", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "large" as const,
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.entitySize).toBe("large");
  });

  it("maps large constellation size for space law", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      constellationSize: "large" as const,
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.constellationSize).toBe(500);
  });

  it("maps mega constellation size for space law", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      constellationSize: "mega" as const,
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.constellationSize).toBe(2000);
  });

  it("maps null constellation size for space law", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      constellationSize: null,
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.constellationSize).toBeNull();
  });

  it("picks most restrictive activity type (LSO over SCO)", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["SCO" as const, "LSO" as const],
    };
    const result = mapToSpaceLawAnswers(answers);
    // launch_site is more restrictive than spacecraft_operation
    expect(result.activityType).toBe("launch_site");
  });

  it("picks most restrictive activity type (LO over SCO)", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["SCO" as const, "LO" as const],
    };
    const result = mapToSpaceLawAnswers(answers);
    expect(result.activityType).toBe("launch_vehicle");
  });
});

// ─── EEA establishment mapping ──────────────────────────────────────
describe("mapToAssessmentAnswers — EEA countries", () => {
  it("maps Norway (NO) to third_country_eu_services via EEA rule", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "NO",
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.establishment).toBe("third_country_eu_services");
  });

  it("maps Iceland (IS) to third_country_eu_services via EEA rule", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "IS",
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.establishment).toBe("third_country_eu_services");
  });

  it("maps Liechtenstein (LI) to third_country_eu_services via EEA rule", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "LI",
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.establishment).toBe("third_country_eu_services");
  });

  it("returns null establishment when no country set", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: null,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.establishment).toBeNull();
  });

  it("uses providesServicesToEU for third-country establishment", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "JP",
      providesServicesToEU: true,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.establishment).toBe("third_country_eu_services");
  });
});

// ─── Additional mapToAssessmentAnswers branches ─────────────────────
describe("mapToAssessmentAnswers — additional branches", () => {
  it("maps SSO orbit to LEO", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      primaryOrbitalRegime: "SSO" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.primaryOrbit).toBe("LEO");
  });

  it("maps MULTIPLE orbit to LEO", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      primaryOrbitalRegime: "MULTIPLE" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.primaryOrbit).toBe("LEO");
  });

  it("maps MEO orbit to MEO", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      primaryOrbitalRegime: "MEO" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.primaryOrbit).toBe("MEO");
  });

  it("maps medium constellation size to 50", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      constellationSize: "medium" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.constellationSize).toBe(50);
  });

  it("maps large constellation size to 500", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      constellationSize: "large" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.constellationSize).toBe(500);
  });

  it("maps null entitySize to null", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: null,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.entitySize).toBeNull();
  });

  it("maps small entity size to small (non-research)", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "small" as const,
      isResearchInstitution: false,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.entitySize).toBe("small");
  });

  it("derives offersEUServices from servesEUCustomers", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      servesEUCustomers: true,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.offersEUServices).toBe(true);
  });

  it("maps isDefenseOnly from direct isDefenseOnly field", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      isDefenseOnly: true,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.isDefenseOnly).toBe(true);
  });

  it("maps hasPostLaunchAssets from hasPostLaunchResponsibility", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasPostLaunchResponsibility: true,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.hasPostLaunchAssets).toBe(true);
  });

  it("sets operatesConstellation from constellationSize presence", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      constellationSize: "small" as const,
    };
    const result = mapToAssessmentAnswers(answers, "SCO");
    expect(result.operatesConstellation).toBe(true);
  });
});

// ─── mapToNIS2Answers — additional branches ─────────────────────────
describe("mapToNIS2Answers — additional branches", () => {
  it("derives NAV sub-sector", () => {
    const answers = { ...getDefaultUnifiedAnswers(), serviceTypes: ["NAV"] };
    const result = mapToNIS2Answers(answers);
    expect(result.spaceSubSector).toBe("navigation");
  });

  it("derives SSA sub-sector", () => {
    const answers = { ...getDefaultUnifiedAnswers(), serviceTypes: ["SSA"] };
    const result = mapToNIS2Answers(answers);
    expect(result.spaceSubSector).toBe("space_situational_awareness");
  });

  it("derives MANUFACTURING sub-sector", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: ["MANUFACTURING"],
    };
    const result = mapToNIS2Answers(answers);
    expect(result.spaceSubSector).toBe("spacecraft_manufacturing");
  });

  it("returns null sub-sector for unknown service type", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: ["UNKNOWN_TYPE"],
    };
    const result = mapToNIS2Answers(answers);
    expect(result.spaceSubSector).toBeNull();
  });

  it("maps all employee ranges to midpoints", () => {
    const ranges = [
      { range: "1_9", expected: 5 },
      { range: "10_49", expected: 30 },
      { range: "50_249", expected: 150 },
      { range: "250_999", expected: 625 },
      { range: "1000_plus", expected: 1500 },
    ] as const;
    for (const { range, expected } of ranges) {
      const answers = {
        ...getDefaultUnifiedAnswers(),
        employeeRange: range,
      };
      const result = mapToNIS2Answers(answers);
      expect(result.employeeCount).toBe(expected);
    }
  });

  it("maps all turnover ranges to midpoints", () => {
    const ranges = [
      { range: "under_2m", expected: 1_000_000 },
      { range: "2m_10m", expected: 6_000_000 },
      { range: "10m_50m", expected: 30_000_000 },
      { range: "50m_250m", expected: 150_000_000 },
      { range: "over_250m", expected: 500_000_000 },
    ] as const;
    for (const { range, expected } of ranges) {
      const answers = {
        ...getDefaultUnifiedAnswers(),
        turnoverRange: range,
      };
      const result = mapToNIS2Answers(answers);
      expect(result.annualRevenue).toBe(expected);
    }
  });

  it("returns null employee count when no range", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      employeeRange: null,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.employeeCount).toBeNull();
  });

  it("returns null revenue when no range", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      turnoverRange: null,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.annualRevenue).toBeNull();
  });

  it("overrides micro to medium when revenue above 10M", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: "micro" as const,
      annualRevenueAbove10M: true,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.entitySize).toBe("medium");
  });

  it("derives offersServicesInEU from EU establishment when no explicit answer", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "DE",
      providesServicesToEU: undefined,
      servesEUCustomers: undefined,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.offersServicesInEU).toBe(true);
  });

  it("derives null offersServicesInEU for non-EU without explicit answer", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "US",
      providesServicesToEU: undefined,
      servesEUCustomers: undefined,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.offersServicesInEU).toBeNull();
  });

  it("detects LSO as providing launch services", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["LSO" as const],
    };
    const result = mapToNIS2Answers(answers);
    expect(result.providesLaunchServices).toBe(true);
  });

  it("detects EO service type as providesEOData", () => {
    const answers = { ...getDefaultUnifiedAnswers(), serviceTypes: ["EO"] };
    const result = mapToNIS2Answers(answers);
    expect(result.providesEOData).toBe(true);
  });

  it("derives ground infra for SCO non-reseller", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["SCO" as const],
      serviceTypes: [],
      isDataResellerOnly: false,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.operatesGroundInfra).toBe(true);
  });

  it("null ground infra when no relevant activity/service", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["ISOS" as const],
      serviceTypes: [],
    };
    const result = mapToNIS2Answers(answers);
    expect(result.operatesGroundInfra).toBeNull();
  });

  it("wires designatedByMemberState from unified", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      designatedByMemberState: true,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.designatedByMemberState).toBe(true);
  });

  it("wires providesDigitalInfrastructure from unified", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      providesDigitalInfrastructure: true,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.providesDigitalInfrastructure).toBe(true);
  });

  it("wires euControlledEntity from unified", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      euControlledEntity: true,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.euControlledEntity).toBe(true);
  });

  it("returns null entitySize when unified has null", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      entitySize: null,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.entitySize).toBeNull();
  });

  it("returns null hasISO27001 when no certifications", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      existingCertifications: undefined,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.hasISO27001).toBeNull();
  });

  it("returns null establishmentCountry → null isEUEstablished", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: null,
    };
    const result = mapToNIS2Answers(answers);
    expect(result.isEUEstablished).toBeNull();
  });
});

// ─── mapToCRAAnswers ────────────────────────────────────────────────
const { mapToCRAAnswers } =
  await import("@/lib/unified-assessment-mappers.server");

describe("mapToCRAAnswers", () => {
  it("always sets economicOperatorRole to manufacturer", () => {
    const answers = getDefaultUnifiedAnswers();
    const result = mapToCRAAnswers(answers);
    expect(result.economicOperatorRole).toBe("manufacturer");
  });

  it("derives space segment from SATCOM service", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: ["SATCOM"],
    };
    const result = mapToCRAAnswers(answers);
    expect(result.segments).toContain("space");
  });

  it("derives space segment from EO service", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: ["EO"],
    };
    const result = mapToCRAAnswers(answers);
    expect(result.segments).toContain("space");
  });

  it("derives ground segment from NAV service", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: ["NAV"],
    };
    const result = mapToCRAAnswers(answers);
    expect(result.segments).toContain("ground");
  });

  it("derives ground segment from SSA service", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: ["SSA"],
    };
    const result = mapToCRAAnswers(answers);
    expect(result.segments).toContain("ground");
  });

  it("defaults to space segment when no service types", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: [],
    };
    const result = mapToCRAAnswers(answers);
    expect(result.segments).toEqual(["space"]);
  });

  it("defaults to space segment when serviceTypes is undefined", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: undefined,
    };
    const result = mapToCRAAnswers(answers);
    expect(result.segments).toEqual(["space"]);
  });

  it("derives both space and ground segments from SATCOM + NAV", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: ["SATCOM", "NAV"],
    };
    const result = mapToCRAAnswers(answers);
    expect(result.segments).toContain("space");
    expect(result.segments).toContain("ground");
  });

  it("derives isEUEstablished from EU country", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "DE",
    };
    const result = mapToCRAAnswers(answers);
    expect(result.isEUEstablished).toBe(true);
  });

  it("derives isEUEstablished false from non-EU country", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "US",
    };
    const result = mapToCRAAnswers(answers);
    expect(result.isEUEstablished).toBe(false);
  });

  it("derives null isEUEstablished when no country", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: null,
    };
    const result = mapToCRAAnswers(answers);
    expect(result.isEUEstablished).toBeNull();
  });

  it("uses company name as product name", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      companyName: "SpaceTech GmbH",
    };
    const result = mapToCRAAnswers(answers);
    expect(result.productName).toBe("SpaceTech GmbH");
  });

  it("defaults to 'Unnamed Product' when no company name", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      companyName: undefined,
    };
    const result = mapToCRAAnswers(answers);
    expect(result.productName).toBe("Unnamed Product");
  });

  it("maps ISO27001 certification", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      existingCertifications: ["ISO27001"],
    };
    const result = mapToCRAAnswers(answers);
    expect(result.hasISO27001).toBe(true);
  });

  it("returns null hasISO27001 when no certifications", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      existingCertifications: undefined,
    };
    const result = mapToCRAAnswers(answers);
    expect(result.hasISO27001).toBeNull();
  });

  it("sets usedInCriticalInfra to true always", () => {
    const answers = getDefaultUnifiedAnswers();
    const result = mapToCRAAnswers(answers);
    expect(result.usedInCriticalInfra).toBe(true);
  });
});
