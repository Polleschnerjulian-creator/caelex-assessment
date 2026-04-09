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
});
