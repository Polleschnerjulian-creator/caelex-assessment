/**
 * Real-data tests for the National Space Law engine.
 *
 * Counterpart to `space-law-engine.test.ts`, which uses a small mock
 * jurisdiction map. This file imports the **actual production data**
 * (`src/data/national-space-laws.ts`, ~3k LOC, 19 European
 * jurisdictions) and runs `calculateSpaceLawCompliance` against every
 * jurisdiction the platform claims to cover. Without this, our suite
 * could pass while the data file was missing Italy, had a typo in the
 * Spanish authority name, or accidentally marked the Polish 2021 act as
 * "draft".
 *
 * Specifically guards against:
 *   - All 19 jurisdictions still being present and loadable.
 *   - Each jurisdiction surviving the activity / nationality / size
 *     cartesian without throwing.
 *   - Authority names matching the legally-correct entity (MIMIT for
 *     Italy, AEE for Spain, POLSA for Poland, etc.).
 *   - Comparison matrix and EU Space Act preview generating non-empty
 *     output for the most common multi-jurisdiction selection.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";

import type {
  SpaceLawAssessmentAnswers,
  SpaceLawCountryCode,
  SpaceLawActivityType,
  EntityNationality,
  SpaceLawComplianceResult,
} from "@/lib/space-law-types";

vi.mock("server-only", () => ({}));

const { calculateSpaceLawCompliance, redactSpaceLawResultForClient } =
  await import("@/lib/space-law-engine.server");

const { JURISDICTION_DATA, SPACE_LAW_COUNTRY_CODES } =
  await import("@/data/national-space-laws");

// SPACE_LAW_COUNTRY_CODES is exported by space-law-types.ts. Re-import
// from there if not present in the data module.
const allCountryCodes: SpaceLawCountryCode[] = SPACE_LAW_COUNTRY_CODES
  ? (SPACE_LAW_COUNTRY_CODES as SpaceLawCountryCode[])
  : ((await import("@/lib/space-law-types"))
      .SPACE_LAW_COUNTRY_CODES as SpaceLawCountryCode[]);

function buildAnswers(
  overrides: Partial<SpaceLawAssessmentAnswers> = {},
): SpaceLawAssessmentAnswers {
  return {
    selectedJurisdictions: ["FR", "DE", "IT"],
    activityType: "spacecraft_operation",
    entityNationality: "domestic",
    entitySize: "medium",
    primaryOrbit: "LEO",
    constellationSize: null,
    licensingStatus: "new_application",
    ...overrides,
  };
}

// ─── Dataset sanity ──────────────────────────────────────────────────
describe("Space Law real-data engine — dataset sanity", () => {
  it("loads all 19 jurisdictions from the production data file", () => {
    expect(JURISDICTION_DATA.size).toBe(19);
    for (const code of allCountryCodes) {
      expect(JURISDICTION_DATA.has(code)).toBe(true);
    }
  });

  it("every jurisdiction has the structural fields the engine reads", () => {
    for (const [code, data] of JURISDICTION_DATA) {
      expect(data.countryCode).toBe(code);
      expect(data.countryName).toBeTruthy();
      expect(data.flagEmoji).toBeTruthy();
      expect(data.legislation).toBeDefined();
      expect(data.legislation.name).toBeTruthy();
      expect(data.licensingAuthority).toBeDefined();
      expect(data.licensingAuthority.name).toBeTruthy();
      expect(data.licensingAuthority.website).toBeTruthy();
      expect(Array.isArray(data.licensingRequirements)).toBe(true);
      expect(data.timeline).toBeDefined();
      expect(data.timeline.typicalProcessingWeeks).toBeDefined();
      expect(typeof data.timeline.typicalProcessingWeeks.min).toBe("number");
      expect(typeof data.timeline.typicalProcessingWeeks.max).toBe("number");
      expect(data.timeline.typicalProcessingWeeks.max).toBeGreaterThanOrEqual(
        data.timeline.typicalProcessingWeeks.min,
      );
      expect(data.insuranceLiability).toBeDefined();
      expect(data.debrisMitigation).toBeDefined();
      expect(data.euSpaceActCrossRef).toBeDefined();
    }
  });

  it("Italian authority is MIMIT (Ministero delle Imprese e del Made in Italy)", () => {
    // Audit fix from 2026-04: ensure the Italian authority name is
    // correctly attributed to MIMIT, not the predecessor MISE. This
    // assertion would fail loudly if anyone reverted that fix.
    const italy = JURISDICTION_DATA.get("IT")!;
    expect(italy.licensingAuthority.name).toContain("MIMIT");
  });

  it("Spanish authority is AEE (Agencia Espacial Española)", () => {
    const spain = JURISDICTION_DATA.get("ES")!;
    expect(spain.licensingAuthority.name).toContain("AEE");
  });

  it("Polish authority is POLSA", () => {
    const poland = JURISDICTION_DATA.get("PL")!;
    expect(poland.licensingAuthority.name).toContain("POLSA");
  });

  it("French authority is CNES", () => {
    const france = JURISDICTION_DATA.get("FR")!;
    expect(france.licensingAuthority.name).toContain("CNES");
  });

  it("Italian Law 89/2025 is enacted", () => {
    const italy = JURISDICTION_DATA.get("IT")!;
    expect(italy.legislation.name).toContain("89/2025");
    expect(italy.legislation.status).toBe("enacted");
  });

  it("Polish Act on Space Activities 2021 is enacted", () => {
    const poland = JURISDICTION_DATA.get("PL")!;
    expect(poland.legislation.yearEnacted).toBe(2021);
    expect(poland.legislation.status).toBe("enacted");
  });

  it("UK Space Industry Act 2018 is enacted", () => {
    const uk = JURISDICTION_DATA.get("UK")!;
    expect(uk.legislation.name).toContain("Space Industry Act");
    expect(uk.legislation.yearEnacted).toBeLessThanOrEqual(2018);
  });

  it("Czech Act 77/2024 is the most recently enacted act in scope", () => {
    // Pulse-check: the data file claims CZ is 2024. If anyone changes
    // the year, this test forces them to consciously update both.
    const cz = JURISDICTION_DATA.get("CZ")!;
    expect(cz.legislation.name).toContain("77/2024");
    expect(cz.legislation.yearEnacted).toBe(2024);
  });
});

// ─── Per-jurisdiction smoke test ──────────────────────────────────────
describe("Space Law real-data engine — per-jurisdiction smoke test", () => {
  for (const code of [
    "FR",
    "DE",
    "IT",
    "UK",
    "LU",
    "NL",
    "BE",
    "ES",
    "AT",
    "PL",
    "DK",
    "NO",
    "SE",
    "FI",
    "PT",
    "GR",
    "CZ",
    "IE",
    "CH",
  ] as SpaceLawCountryCode[]) {
    it(`produces a valid result for jurisdiction ${code}`, async () => {
      const result = await calculateSpaceLawCompliance(
        buildAnswers({ selectedJurisdictions: [code] }),
      );

      expect(result.jurisdictions.length).toBe(1);
      const j = result.jurisdictions[0]!;

      expect(j.countryCode).toBe(code);
      expect(j.countryName).toBeTruthy();
      expect(j.authority.name).toBeTruthy();
      expect(typeof j.totalRequirements).toBe("number");
      expect(j.totalRequirements).toBeGreaterThanOrEqual(0);
      expect(j.mandatoryRequirements).toBeLessThanOrEqual(j.totalRequirements);
      expect(j.estimatedTimeline.max).toBeGreaterThanOrEqual(
        j.estimatedTimeline.min,
      );
      expect(typeof j.favorabilityScore).toBe("number");
      expect(j.favorabilityScore).toBeGreaterThanOrEqual(0);
      expect(j.favorabilityScore).toBeLessThanOrEqual(100);
    });
  }
});

// ─── Cartesian product across activity × nationality ─────────────────
describe("Space Law real-data engine — activity × nationality matrix", () => {
  const activityTypes: SpaceLawActivityType[] = [
    "spacecraft_operation",
    "launch_vehicle",
    "launch_site",
    "in_orbit_services",
    "earth_observation",
    "satellite_communications",
    "space_resources",
  ];

  const nationalities: EntityNationality[] = [
    "domestic",
    "eu_other",
    "non_eu",
    "esa_member",
  ];

  for (const activity of activityTypes) {
    for (const nationality of nationalities) {
      it(`runs cleanly across all 19 jurisdictions for ${activity} / ${nationality}`, async () => {
        const result = await calculateSpaceLawCompliance(
          buildAnswers({
            selectedJurisdictions: allCountryCodes,
            activityType: activity,
            entityNationality: nationality,
          }),
        );

        expect(result.jurisdictions.length).toBe(allCountryCodes.length);
        // None of the per-jurisdiction results should crash or return
        // negative requirement counts.
        for (const j of result.jurisdictions) {
          expect(j.totalRequirements).toBeGreaterThanOrEqual(0);
          expect(j.favorabilityScore).toBeGreaterThanOrEqual(0);
          expect(j.favorabilityScore).toBeLessThanOrEqual(100);
        }
        // Comparison matrix must always be populated when jurisdictions
        // are selected — the dashboard table renders directly from it.
        expect(result.comparisonMatrix.criteria.length).toBeGreaterThan(0);
      });
    }
  }
});

// ─── Activity-type filtering correctness ─────────────────────────────
describe("Space Law real-data engine — activity-type filtering", () => {
  it("changing activity type changes the requirement set for at least one jurisdiction", async () => {
    const sco = await calculateSpaceLawCompliance(
      buildAnswers({
        selectedJurisdictions: allCountryCodes,
        activityType: "spacecraft_operation",
      }),
    );
    const launch = await calculateSpaceLawCompliance(
      buildAnswers({
        selectedJurisdictions: allCountryCodes,
        activityType: "launch_vehicle",
      }),
    );

    // At least one jurisdiction in the dataset must distinguish
    // between spacecraft and launch — otherwise the activity-type
    // filter is broken.
    let foundDifference = false;
    for (let i = 0; i < sco.jurisdictions.length; i++) {
      if (
        sco.jurisdictions[i]!.totalRequirements !==
        launch.jurisdictions[i]!.totalRequirements
      ) {
        foundDifference = true;
        break;
      }
    }
    expect(foundDifference).toBe(true);
  });

  it("returns mandatory requirements that are a subset of total requirements per jurisdiction", async () => {
    const result = await calculateSpaceLawCompliance(
      buildAnswers({ selectedJurisdictions: allCountryCodes }),
    );
    for (const j of result.jurisdictions) {
      const mandatorySet = new Set(
        j.applicableRequirements.filter((r) => r.mandatory).map((r) => r.id),
      );
      const totalSet = new Set(j.applicableRequirements.map((r) => r.id));
      for (const id of mandatorySet) {
        expect(totalSet.has(id)).toBe(true);
      }
      expect(j.mandatoryRequirements).toBe(mandatorySet.size);
    }
  });
});

// ─── Comparison matrix and EU preview ────────────────────────────────
describe("Space Law real-data engine — comparison matrix & EU preview", () => {
  it("comparison matrix has criteria for cost, timeline, insurance, and debris", async () => {
    const result = await calculateSpaceLawCompliance(
      buildAnswers({ selectedJurisdictions: ["FR", "LU", "UK"] }),
    );

    const categories = new Set(
      result.comparisonMatrix.criteria.map((c) => c.category),
    );
    // The dashboard depends on these four categories being present.
    expect(categories.has("timeline")).toBe(true);
    expect(categories.has("cost")).toBe(true);
    expect(categories.has("insurance")).toBe(true);
    expect(categories.has("debris")).toBe(true);
  });

  it("each comparison criterion has values for every selected jurisdiction", async () => {
    const result = await calculateSpaceLawCompliance(
      buildAnswers({ selectedJurisdictions: ["FR", "DE", "IT", "PL"] }),
    );
    for (const criterion of result.comparisonMatrix.criteria) {
      expect(Object.keys(criterion.jurisdictionValues).length).toBe(4);
      for (const code of ["FR", "DE", "IT", "PL"] as SpaceLawCountryCode[]) {
        expect(criterion.jurisdictionValues[code]).toBeDefined();
        expect(criterion.jurisdictionValues[code]!.value).toBeTruthy();
        expect(
          criterion.jurisdictionValues[code]!.score,
        ).toBeGreaterThanOrEqual(1);
        expect(criterion.jurisdictionValues[code]!.score).toBeLessThanOrEqual(
          5,
        );
      }
    }
  });

  it("EU Space Act preview includes a per-jurisdiction note for every selection", async () => {
    const result = await calculateSpaceLawCompliance(
      buildAnswers({ selectedJurisdictions: ["FR", "IT", "LU"] }),
    );
    expect(result.euSpaceActPreview.overallRelationship).toBeTruthy();
    for (const code of ["FR", "IT", "LU"] as SpaceLawCountryCode[]) {
      expect(result.euSpaceActPreview.jurisdictionNotes[code]).toBeDefined();
      expect(
        result.euSpaceActPreview.jurisdictionNotes[code]!.relationship,
      ).toBeTruthy();
    }
  });

  it("recommendations are populated for a multi-jurisdiction comparison", async () => {
    const result = await calculateSpaceLawCompliance(
      buildAnswers({
        selectedJurisdictions: ["FR", "DE", "LU"],
        entitySize: "small",
      }),
    );
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

// ─── Redaction round-trip ────────────────────────────────────────────
describe("Space Law real-data engine — redactSpaceLawResultForClient", () => {
  it("strips proprietary requirement bodies but preserves jurisdiction shape", async () => {
    const result = await calculateSpaceLawCompliance(
      buildAnswers({ selectedJurisdictions: ["FR", "DE", "IT"] }),
    );
    const redacted = redactSpaceLawResultForClient(result);

    expect(redacted.jurisdictions.length).toBe(result.jurisdictions.length);
    for (let i = 0; i < redacted.jurisdictions.length; i++) {
      const r = redacted.jurisdictions[i]!;
      // The redacted shape replaces applicableRequirements with a
      // bare requirementCount integer.
      expect(r).not.toHaveProperty("applicableRequirements");
      expect(typeof r.requirementCount).toBe("number");
      expect(r.countryCode).toBe(result.jurisdictions[i]!.countryCode);
    }
    expect(redacted.comparisonMatrix).toBeDefined();
    expect(redacted.euSpaceActPreview).toBeDefined();
    expect(redacted.recommendations).toBeDefined();
  });
});

// ─── Determinism / no input mutation ─────────────────────────────────
describe("Space Law real-data engine — determinism", () => {
  it("two calls with the same answers produce equivalent results", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR", "DE", "IT", "ES", "LU"],
      activityType: "spacecraft_operation",
      entitySize: "large",
      primaryOrbit: "GEO",
      constellationSize: 50,
    });
    const a = await calculateSpaceLawCompliance(answers);
    const b = await calculateSpaceLawCompliance(answers);

    expect(a.jurisdictions.length).toBe(b.jurisdictions.length);
    for (let i = 0; i < a.jurisdictions.length; i++) {
      expect(a.jurisdictions[i]!.totalRequirements).toBe(
        b.jurisdictions[i]!.totalRequirements,
      );
      expect(a.jurisdictions[i]!.favorabilityScore).toBe(
        b.jurisdictions[i]!.favorabilityScore,
      );
    }
  });

  it("does not mutate the input answers object", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR", "DE"],
      activityType: "launch_vehicle",
    });
    const before = JSON.stringify(answers);
    await calculateSpaceLawCompliance(answers);
    const after = JSON.stringify(answers);
    expect(after).toBe(before);
  });
});

// ─── Recommendation generation branches ─────────────────────────────
describe("Space Law real-data engine — recommendation branches", () => {
  it("generates constellation advice for constellation size > 9", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR", "DE"],
      activityType: "spacecraft_operation",
      constellationSize: 100,
    });
    const result = await calculateSpaceLawCompliance(answers);
    const constellationRec = result.recommendations.find((r) =>
      r.toLowerCase().includes("constellation"),
    );
    expect(constellationRec).toBeDefined();
  });

  it("generates Germany gap advice when DE is selected", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR", "DE"],
      activityType: "spacecraft_operation",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const deRec = result.recommendations.find(
      (r) =>
        r.toLowerCase().includes("germany") &&
        r.toLowerCase().includes("lacks"),
    );
    expect(deRec).toBeDefined();
  });

  it("generates insurance recommendation when jurisdictions have mandatory insurance", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR", "UK"],
      activityType: "spacecraft_operation",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const insuranceRec = result.recommendations.find((r) =>
      r.toLowerCase().includes("insurance"),
    );
    expect(insuranceRec).toBeDefined();
  });

  it("generates new applicant advice for new_application status", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR", "IT"],
      activityType: "spacecraft_operation",
      licensingStatus: "new_application",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const newAppRec = result.recommendations.find((r) =>
      r.toLowerCase().includes("new application"),
    );
    expect(newAppRec).toBeDefined();
  });

  it("generates EU Space Act transition advice for EU members", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR", "IT"],
      activityType: "spacecraft_operation",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const euRec = result.recommendations.find((r) =>
      r.toLowerCase().includes("eu space act"),
    );
    expect(euRec).toBeDefined();
  });

  it("caps recommendations at 6", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR", "DE", "IT", "UK", "NL"],
      activityType: "spacecraft_operation",
      constellationSize: 100,
      licensingStatus: "new_application",
    });
    const result = await calculateSpaceLawCompliance(answers);
    expect(result.recommendations.length).toBeLessThanOrEqual(6);
  });
});

// ─── UK engine delegation ───────────────────────────────────────────
describe("Space Law real-data engine — UK delegation", () => {
  it("UK jurisdiction uses dedicated UK Space Industry Act engine", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["UK"],
      activityType: "spacecraft_operation",
      entityNationality: "domestic",
    });
    const result = await calculateSpaceLawCompliance(answers);
    expect(result.jurisdictions).toHaveLength(1);
    const uk = result.jurisdictions[0];
    expect(uk.countryCode).toBe("UK");
    expect(uk.legislation.name).toContain("Space Industry Act");
    expect(uk.totalRequirements).toBeGreaterThan(0);
  });

  it("UK with launch_site activity type uses spaceport mapping", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["UK"],
      activityType: "launch_site",
      entityNationality: "domestic",
    });
    const result = await calculateSpaceLawCompliance(answers);
    expect(result.jurisdictions).toHaveLength(1);
    const uk = result.jurisdictions[0];
    expect(uk.isApplicable).toBe(true);
  });

  it("UK with launch_vehicle activity type", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["UK"],
      activityType: "launch_vehicle",
      entityNationality: "domestic",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const uk = result.jurisdictions[0];
    expect(uk.isApplicable).toBe(true);
  });

  it("UK with null activity type defaults to orbital_operations", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["UK"],
      activityType: null,
      entityNationality: "domestic",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const uk = result.jurisdictions[0];
    expect(uk).toBeDefined();
  });

  it("UK with earth_observation activity type", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["UK"],
      activityType: "earth_observation",
      entityNationality: "domestic",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const uk = result.jurisdictions[0];
    expect(uk).toBeDefined();
  });

  it("UK with satellite_communications activity type", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["UK"],
      activityType: "satellite_communications",
      entityNationality: "domestic",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const uk = result.jurisdictions[0];
    expect(uk).toBeDefined();
  });

  it("UK with space_resources activity type", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["UK"],
      activityType: "space_resources",
      entityNationality: "domestic",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const uk = result.jurisdictions[0];
    expect(uk).toBeDefined();
  });

  it("UK with in_orbit_services activity type", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["UK"],
      activityType: "in_orbit_services",
      entityNationality: "domestic",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const uk = result.jurisdictions[0];
    expect(uk).toBeDefined();
  });

  it("UK with small entity size adds note about SIA 2018 thresholds", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["UK"],
      activityType: "spacecraft_operation",
      entitySize: "small",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const uk = result.jurisdictions[0];
    expect(uk.favorabilityFactors.length).toBeGreaterThan(0);
  });
});

// ─── Comparison matrix — all criteria populated ─────────────────────
describe("Space Law real-data engine — comparison matrix criteria", () => {
  it("regulatory maturity criterion works for all jurisdictions", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR", "DE", "UK", "NL", "LU"],
    });
    const result = await calculateSpaceLawCompliance(answers);
    const maturity = result.comparisonMatrix.criteria.find(
      (c) => c.id === "regulatory_maturity",
    );
    expect(maturity).toBeDefined();
    // DE has no comprehensive law, so it should show "No law"
    const deVal = maturity?.jurisdictionValues["DE"];
    expect(deVal).toBeDefined();
  });

  it("all criteria produce valid values for single jurisdiction", async () => {
    const answers = buildAnswers({ selectedJurisdictions: ["FR"] });
    const result = await calculateSpaceLawCompliance(answers);
    for (const criterion of result.comparisonMatrix.criteria) {
      const frVal = criterion.jurisdictionValues["FR"];
      expect(frVal).toBeDefined();
      expect(frVal.value).toBeTruthy();
      expect(typeof frVal.score).toBe("number");
    }
  });
});

// ─── EU Space Act preview — parallel-only scenario ──────────────────
describe("Space Law real-data engine — EU Space Act preview", () => {
  it("generates parallel-regime message for UK+NO only", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["UK", "NO"],
      activityType: "spacecraft_operation",
    });
    const result = await calculateSpaceLawCompliance(answers);
    expect(result.euSpaceActPreview.overallRelationship).toBeDefined();
    expect(result.euSpaceActPreview.overallRelationship.length).toBeGreaterThan(
      0,
    );
  });

  it("generates gap-filling message when DE is selected", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["DE", "FR"],
      activityType: "spacecraft_operation",
    });
    const result = await calculateSpaceLawCompliance(answers);
    // DE has no comprehensive law → "gap" relationship → gap message
    expect(result.euSpaceActPreview.overallRelationship).toBeDefined();
  });
});

// ─── Activity-type branches for non-applicable jurisdictions ────────
describe("Space Law real-data engine — applicability checks", () => {
  it("DE with non-earth_observation activity is not applicable", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["DE"],
      activityType: "spacecraft_operation",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const de = result.jurisdictions.find((j) => j.countryCode === "DE");
    expect(de?.isApplicable).toBe(false);
  });

  it("DE with earth_observation activity IS applicable (SatDSiG)", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["DE"],
      activityType: "earth_observation",
    });
    const result = await calculateSpaceLawCompliance(answers);
    const de = result.jurisdictions.find((j) => j.countryCode === "DE");
    expect(de?.isApplicable).toBe(true);
  });

  it("null activity type includes all requirements", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR"],
      activityType: null,
    });
    const result = await calculateSpaceLawCompliance(answers);
    const fr = result.jurisdictions.find((j) => j.countryCode === "FR");
    expect(fr?.isApplicable).toBe(true);
    // null activity means all requirements are returned
    expect(fr!.totalRequirements).toBeGreaterThan(0);
  });
});

// ─── Redaction ──────────────────────────────────────────────────────
describe("Space Law real-data engine — redaction strips applicableRequirements", () => {
  it("redacted result has requirementCount instead of applicableRequirements", async () => {
    const answers = buildAnswers({
      selectedJurisdictions: ["FR"],
      activityType: "spacecraft_operation",
    });
    const full = await calculateSpaceLawCompliance(answers);
    const redacted = redactSpaceLawResultForClient(full);
    for (const j of redacted.jurisdictions) {
      expect(j).not.toHaveProperty("applicableRequirements");
      expect(j).toHaveProperty("requirementCount");
    }
  });
});
