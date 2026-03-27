/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SERVER-ONLY National Space Law Compliance Calculation Engine
 *
 * This file contains the multi-jurisdiction space law compliance logic.
 * It MUST NOT be imported by client-side code.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized reproduction or reverse-engineering is strictly prohibited.
 */

import "server-only";

import type {
  SpaceLawAssessmentAnswers,
  SpaceLawComplianceResult,
  JurisdictionResult,
  ComparisonMatrix,
  ComparisonCriterion,
  EUSpaceActPreview,
  RedactedSpaceLawResult,
  JurisdictionLaw,
  SpaceLawCountryCode,
  SpaceLawActivityType,
  LicensingRequirement,
} from "./space-law-types";

import type {
  UkSpaceProfile,
  UkActivityType,
} from "@/data/uk-space-industry-act";
import type { UkAssessmentResult } from "./uk-space-engine.server";

import {
  calculateFavorabilityScore as sharedFavorabilityScore,
  EngineDataError,
  type FavorabilityInput,
} from "@/lib/engines/shared.server";

// ─── Lazy import for jurisdiction data ───

let _jurisdictionDataModule:
  | typeof import("@/data/national-space-laws")
  | null = null;
let _crossRefModule: typeof import("@/data/space-law-cross-references") | null =
  null;

async function getJurisdictionData() {
  if (!_jurisdictionDataModule) {
    try {
      _jurisdictionDataModule = await import("@/data/national-space-laws");
    } catch (error) {
      throw new EngineDataError(
        "National space laws data could not be loaded",
        {
          engine: "space-law",
          dataFile: "national-space-laws.ts",
          cause: error,
        },
      );
    }
  }
  return _jurisdictionDataModule.JURISDICTION_DATA;
}

async function getCrossReferences() {
  if (!_crossRefModule) {
    try {
      _crossRefModule = await import("@/data/space-law-cross-references");
    } catch (error) {
      throw new EngineDataError(
        "Space law cross-references data could not be loaded",
        {
          engine: "space-law",
          dataFile: "space-law-cross-references.ts",
          cause: error,
        },
      );
    }
  }
  return _crossRefModule.SPACE_LAW_CROSS_REFERENCES;
}

// ─── Lazy import for UK-specific engine ───

let _ukEngineModule: typeof import("./uk-space-engine.server") | null = null;

async function getUkEngine() {
  if (!_ukEngineModule) {
    _ukEngineModule = await import("./uk-space-engine.server");
  }
  return _ukEngineModule;
}

// ─── UK Engine Delegation ───

/**
 * Map generic SpaceLawActivityType to UK-specific UkActivityType.
 * Returns UkActivityType values that approximate the generic activity type.
 */
function mapActivityTypeToUk(
  activityType: SpaceLawActivityType | null,
): UkActivityType[] {
  if (!activityType) return ["orbital_operations"];
  switch (activityType) {
    case "spacecraft_operation":
      return ["orbital_operations"];
    case "launch_vehicle":
      return ["launch"];
    case "launch_site":
      return ["spaceport_operations"];
    case "in_orbit_services":
      return ["orbital_operations"];
    case "earth_observation":
      return ["orbital_operations"];
    case "satellite_communications":
      return ["orbital_operations"];
    case "space_resources":
      return ["orbital_operations"];
    default:
      return ["orbital_operations"];
  }
}

/**
 * Map generic SpaceLawActivityType to a UK operator type.
 */
function mapActivityTypeToUkOperatorType(
  activityType: SpaceLawActivityType | null,
): UkSpaceProfile["operatorType"] {
  if (!activityType) return "satellite_operator";
  switch (activityType) {
    case "launch_vehicle":
      return "launch_operator";
    case "launch_site":
      return "spaceport_operator";
    default:
      return "satellite_operator";
  }
}

/**
 * Build a UkSpaceProfile from generic SpaceLawAssessmentAnswers.
 */
function buildUkProfileFromAnswers(
  answers: SpaceLawAssessmentAnswers,
): UkSpaceProfile {
  const operatorType = mapActivityTypeToUkOperatorType(answers.activityType);
  const activityTypes = mapActivityTypeToUk(answers.activityType);
  const isOrbital =
    answers.primaryOrbit !== null && answers.primaryOrbit !== "beyond";

  return {
    operatorType,
    activityTypes,
    launchFromUk: answers.activityType === "launch_site",
    launchToOrbit: isOrbital,
    isSuborbital: false,
    hasUkNexus:
      answers.entityNationality === "domestic" ||
      answers.entityNationality === null,
    involvesPeople: false,
    isCommercial: true,
    targetOrbit: answers.primaryOrbit ?? undefined,
  };
}

/**
 * Adapt a UkAssessmentResult into the standard JurisdictionResult format
 * so that callers of calculateSpaceLawCompliance() see a consistent shape.
 */
function adaptUKResult(
  ukResult: UkAssessmentResult,
  ukJurisdictionData: JurisdictionLaw,
  answers: SpaceLawAssessmentAnswers,
): JurisdictionResult {
  // Convert UK engine requirements to the generic LicensingRequirement format
  const applicableRequirements: LicensingRequirement[] =
    ukResult.applicableRequirements.map((req) => ({
      id: req.id,
      category: mapUkCategoryToGeneric(req.category),
      title: req.title,
      description: req.description,
      mandatory: req.bindingLevel === "mandatory",
      applicableTo: answers.activityType
        ? [answers.activityType]
        : (["spacecraft_operation"] as SpaceLawActivityType[]),
      details: req.implementationGuidance,
      articleRef: req.sectionRef,
    }));

  const mandatoryRequirements = applicableRequirements.filter(
    (req) => req.mandatory,
  );

  // Derive favorability score from the UK engine's compliance score and risk level
  const { score: favorabilityScore, factors: favorabilityFactors } =
    deriveUkFavorabilityScore(ukResult, ukJurisdictionData, answers);

  // Determine applicability based on UK engine results
  const isApplicable = ukResult.applicableRequirements.length > 0;
  const applicabilityReason = isApplicable
    ? `Authorization required under ${ukJurisdictionData.legislation.name}. ${ukResult.requiredLicenses.length} licence type(s) applicable under the UK Space Industry Act 2018.`
    : "No applicable requirements identified for this activity under UK space law.";

  return {
    countryCode: ukJurisdictionData.countryCode,
    countryName: ukJurisdictionData.countryName,
    flagEmoji: ukJurisdictionData.flagEmoji,
    isApplicable,
    applicabilityReason,
    totalRequirements: applicableRequirements.length,
    mandatoryRequirements: mandatoryRequirements.length,
    applicableRequirements,
    authority: {
      name: ukJurisdictionData.licensingAuthority.name,
      website: ukJurisdictionData.licensingAuthority.website,
      contactEmail: ukJurisdictionData.licensingAuthority.contactEmail,
    },
    estimatedTimeline: ukJurisdictionData.timeline.typicalProcessingWeeks,
    estimatedCost: formatCostEstimate(ukJurisdictionData),
    insurance: {
      mandatory: ukJurisdictionData.insuranceLiability.mandatoryInsurance,
      minimumCoverage:
        ukJurisdictionData.insuranceLiability.minimumCoverage || "Case-by-case",
      governmentIndemnification:
        ukJurisdictionData.insuranceLiability.governmentIndemnification,
    },
    debris: {
      deorbitRequired: ukJurisdictionData.debrisMitigation.deorbitRequirement,
      deorbitTimeline:
        ukJurisdictionData.debrisMitigation.deorbitTimeline || "Not specified",
      mitigationPlan: ukJurisdictionData.debrisMitigation.debrisMitigationPlan,
    },
    legislation: {
      name: ukJurisdictionData.legislation.name,
      status: ukJurisdictionData.legislation.status,
      yearEnacted: ukJurisdictionData.legislation.yearEnacted,
    },
    favorabilityScore,
    favorabilityFactors,
  };
}

/**
 * Map UK requirement categories to generic LicensingRequirementCategory.
 */
function mapUkCategoryToGeneric(
  ukCategory: string,
): LicensingRequirement["category"] {
  const mapping: Record<string, LicensingRequirement["category"]> = {
    operator_licensing: "corporate_governance",
    range_control: "operational_plan",
    liability_insurance: "insurance",
    safety: "safety_assessment",
    environmental: "environmental_assessment",
    security: "security_clearance",
    registration: "notification",
    informed_consent: "safety_assessment",
    emergency_response: "operational_plan",
  };
  return mapping[ukCategory] || "technical_assessment";
}

/**
 * Derive a favorability score for UK from the UK engine's detailed results,
 * consistent with the scoring approach used by the generic engine.
 */
function deriveUkFavorabilityScore(
  ukResult: UkAssessmentResult,
  ukJurisdictionData: JurisdictionLaw,
  answers: SpaceLawAssessmentAnswers,
): { score: number; factors: string[] } {
  // Start with the standard favorability calculation from metadata
  // to maintain consistency with other jurisdictions
  const base = sharedFavorabilityScore({
    legislationStatus: ukJurisdictionData.legislation.status,
    processingWeeks: ukJurisdictionData.timeline.typicalProcessingWeeks,
    hasGovernmentIndemnification:
      ukJurisdictionData.insuranceLiability.governmentIndemnification,
    liabilityRegime: ukJurisdictionData.insuranceLiability.liabilityRegime,
    regulatoryMaturityYear: ukJurisdictionData.legislation.yearEnacted,
    countryCode: ukJurisdictionData.countryCode,
    hasNationalRegistry: ukJurisdictionData.registration.nationalRegistryExists,
    activityType: answers.activityType ?? undefined,
    entitySize: answers.entitySize ?? undefined,
  });

  let score = base.score;
  const factors = base.factors;

  // UK-specific enrichments from the detailed UK engine
  factors.push(
    `${ukResult.requiredLicenses.length} licence type(s) required under SIA 2018`,
  );
  factors.push(
    `${ukResult.applicableRequirements.length} detailed CAA requirements identified`,
  );

  if (ukResult.euSpaceActOverlaps.length > 0) {
    factors.push(
      `${ukResult.euSpaceActOverlaps.length} EU Space Act cross-reference(s) — plan for dual compliance post-Brexit`,
    );
  }

  // Adjust score based on UK risk level (bonus for comprehensive framework)
  if (ukResult.riskLevel === "low") {
    score += 5;
    factors.push("Low regulatory risk based on detailed UK assessment");
  }

  // Small entity consideration (not in generic UK favorability)
  if (answers.entitySize === "small") {
    factors.push(
      "Note: UK SIA 2018 does not provide reduced thresholds for small operators",
    );
  }

  score = Math.max(0, Math.min(100, score));
  return { score, factors };
}

/**
 * Calculate UK jurisdiction result using the dedicated UK Space Industry Act engine.
 * Falls back to generic calculation if the UK engine encounters an error.
 */
async function calculateUKJurisdictionResult(
  ukJurisdictionData: JurisdictionLaw,
  answers: SpaceLawAssessmentAnswers,
): Promise<JurisdictionResult> {
  try {
    const ukEngine = await getUkEngine();
    const profile = buildUkProfileFromAnswers(answers);
    const validatedProfile = ukEngine.validateOperatorProfile(profile);
    // No pre-existing assessments in the generic flow — pass empty array
    const ukResult = ukEngine.performAssessment(validatedProfile, []);
    return adaptUKResult(ukResult, ukJurisdictionData, answers);
  } catch {
    // Fallback to generic calculation if UK engine fails
    return calculateJurisdictionResult(ukJurisdictionData, answers);
  }
}

// ─── Main Calculation Function ───

export async function calculateSpaceLawCompliance(
  answers: SpaceLawAssessmentAnswers,
): Promise<SpaceLawComplianceResult> {
  const jurisdictionData = await getJurisdictionData();
  const crossReferences = await getCrossReferences();

  // 1. Calculate results for each selected jurisdiction
  //    UK/GB is delegated to the dedicated UK Space Industry Act engine
  const jurisdictionPromises = answers.selectedJurisdictions.map(
    async (code): Promise<JurisdictionResult | null> => {
      const data = jurisdictionData.get(code);
      if (!data) return null;

      // Delegate UK to dedicated engine for richer analysis
      if (code === "UK") {
        return calculateUKJurisdictionResult(data, answers);
      }

      return calculateJurisdictionResult(data, answers);
    },
  );

  const jurisdictions: JurisdictionResult[] = (
    await Promise.all(jurisdictionPromises)
  ).filter((r): r is JurisdictionResult => r !== null);

  // 2. Build comparison matrix
  const comparisonMatrix = buildComparisonMatrix(
    jurisdictions,
    jurisdictionData,
    answers,
  );

  // 3. Build EU Space Act cross-reference preview
  const euSpaceActPreview = buildEUSpaceActPreview(
    answers.selectedJurisdictions,
    jurisdictionData,
    crossReferences,
  );

  // 4. Generate recommendations
  const recommendations = generateRecommendations(jurisdictions, answers);

  return {
    jurisdictions,
    comparisonMatrix,
    euSpaceActPreview,
    recommendations,
  };
}

// ─── Per-Jurisdiction Calculation ───

function calculateJurisdictionResult(
  data: JurisdictionLaw,
  answers: SpaceLawAssessmentAnswers,
): JurisdictionResult {
  const activityType = answers.activityType;

  // Check applicability
  const { isApplicable, reason } = checkApplicability(data, answers);

  // Filter requirements by activity type
  const applicableRequirements = activityType
    ? data.licensingRequirements.filter((req) =>
        req.applicableTo.includes(activityType),
      )
    : data.licensingRequirements;

  const mandatoryRequirements = applicableRequirements.filter(
    (req) => req.mandatory,
  );

  // Calculate favorability score
  const { score, factors } = calculateFavorabilityScore(data, answers);

  return {
    countryCode: data.countryCode,
    countryName: data.countryName,
    flagEmoji: data.flagEmoji,
    isApplicable,
    applicabilityReason: reason,
    totalRequirements: applicableRequirements.length,
    mandatoryRequirements: mandatoryRequirements.length,
    applicableRequirements,
    authority: {
      name: data.licensingAuthority.name,
      website: data.licensingAuthority.website,
      contactEmail: data.licensingAuthority.contactEmail,
    },
    estimatedTimeline: data.timeline.typicalProcessingWeeks,
    estimatedCost: formatCostEstimate(data),
    insurance: {
      mandatory: data.insuranceLiability.mandatoryInsurance,
      minimumCoverage:
        data.insuranceLiability.minimumCoverage || "Case-by-case",
      governmentIndemnification:
        data.insuranceLiability.governmentIndemnification,
    },
    debris: {
      deorbitRequired: data.debrisMitigation.deorbitRequirement,
      deorbitTimeline: data.debrisMitigation.deorbitTimeline || "Not specified",
      mitigationPlan: data.debrisMitigation.debrisMitigationPlan,
    },
    legislation: {
      name: data.legislation.name,
      status: data.legislation.status,
      yearEnacted: data.legislation.yearEnacted,
    },
    favorabilityScore: score,
    favorabilityFactors: factors,
  };
}

// ─── Applicability Check ───

function checkApplicability(
  data: JurisdictionLaw,
  answers: SpaceLawAssessmentAnswers,
): { isApplicable: boolean; reason: string } {
  // Germany special case — no comprehensive law
  if (
    data.countryCode === "DE" &&
    answers.activityType !== "earth_observation"
  ) {
    return {
      isApplicable: false,
      reason:
        "Germany currently has no comprehensive national space law. Only remote sensing data distribution requires licensing under the SatDSiG. A Weltraumgesetz has been discussed but not yet enacted. The EU Space Act (2030) will fill this gap.",
    };
  }

  // Check if the activity type is covered
  if (answers.activityType) {
    const hasApplicableRequirements = data.licensingRequirements.some((req) =>
      req.applicableTo.includes(answers.activityType!),
    );

    if (!hasApplicableRequirements) {
      return {
        isApplicable: false,
        reason: `${data.countryName}'s space law does not specifically address this activity type. Additional regulatory consultation may be needed.`,
      };
    }
  }

  // Check applicability rules
  for (const rule of data.applicabilityRules) {
    if (
      answers.activityType &&
      rule.activityTypes &&
      !rule.activityTypes.includes(answers.activityType)
    ) {
      continue;
    }
    if (
      answers.entityNationality &&
      rule.entityTypes &&
      !rule.entityTypes.includes(answers.entityNationality)
    ) {
      continue;
    }
    if (!rule.applies) {
      return { isApplicable: false, reason: rule.description };
    }
  }

  return {
    isApplicable: true,
    reason: `Authorization required under ${data.legislation.name}.`,
  };
}

// ─── Favorability Score ───

function calculateFavorabilityScore(
  data: JurisdictionLaw,
  answers: SpaceLawAssessmentAnswers,
): { score: number; factors: string[] } {
  return sharedFavorabilityScore({
    legislationStatus: data.legislation.status,
    processingWeeks: data.timeline.typicalProcessingWeeks,
    hasGovernmentIndemnification:
      data.insuranceLiability.governmentIndemnification,
    liabilityRegime: data.insuranceLiability.liabilityRegime,
    regulatoryMaturityYear: data.legislation.yearEnacted,
    countryCode: data.countryCode,
    hasNationalRegistry: data.registration.nationalRegistryExists,
    specialProvisions: {
      spaceResources: data.countryCode === "LU",
      smallEntity: ["NL", "LU"].includes(data.countryCode),
    },
    activityType: answers.activityType ?? undefined,
    entitySize: answers.entitySize ?? undefined,
  });
}

// ─── Comparison Matrix ───

function buildComparisonMatrix(
  results: JurisdictionResult[],
  jurisdictionData: Map<SpaceLawCountryCode, JurisdictionLaw>,
  _answers: SpaceLawAssessmentAnswers,
): ComparisonMatrix {
  const codes = results.map((r) => r.countryCode);

  const criteria: ComparisonCriterion[] = [
    buildCriterion(
      "processing_time",
      "Processing Time",
      "timeline",
      codes,
      (code) => {
        const data = jurisdictionData.get(code);
        if (!data) return { value: "N/A", score: 0 };
        const { min, max } = data.timeline.typicalProcessingWeeks;
        const avg = (min + max) / 2;
        return {
          value: `${min}–${max} weeks`,
          score:
            avg <= 10 ? 5 : avg <= 14 ? 4 : avg <= 18 ? 3 : avg <= 24 ? 2 : 1,
        };
      },
    ),
    buildCriterion(
      "application_fee",
      "Application Fee",
      "cost",
      codes,
      (code) => {
        const data = jurisdictionData.get(code);
        if (!data) return { value: "N/A", score: 0 };
        const fee = data.timeline.applicationFee || "Not specified";
        return {
          value: fee,
          score:
            fee === "Not specified" || fee === "None"
              ? 5
              : fee.includes("€")
                ? 3
                : 3,
        };
      },
    ),
    buildCriterion(
      "insurance_min",
      "Min. Insurance",
      "insurance",
      codes,
      (code) => {
        const data = jurisdictionData.get(code);
        if (!data) return { value: "N/A", score: 0 };
        const coverage =
          data.insuranceLiability.minimumCoverage || "Case-by-case";
        const mandatory = data.insuranceLiability.mandatoryInsurance;
        return {
          value: mandatory ? coverage : "Not mandatory",
          score: !mandatory ? 5 : 3,
        };
      },
    ),
    buildCriterion(
      "govt_indemnification",
      "Govt. Indemnification",
      "insurance",
      codes,
      (code) => {
        const data = jurisdictionData.get(code);
        if (!data) return { value: "N/A", score: 0 };
        return {
          value: data.insuranceLiability.governmentIndemnification
            ? "Yes"
            : "No",
          score: data.insuranceLiability.governmentIndemnification ? 5 : 2,
        };
      },
    ),
    buildCriterion(
      "liability_regime",
      "Liability Regime",
      "liability",
      codes,
      (code) => {
        const data = jurisdictionData.get(code);
        if (!data) return { value: "N/A", score: 0 };
        const regime = data.insuranceLiability.liabilityRegime;
        return {
          value: regime.charAt(0).toUpperCase() + regime.slice(1),
          score:
            regime === "capped"
              ? 5
              : regime === "negotiable"
                ? 4
                : regime === "tiered"
                  ? 3
                  : 2,
        };
      },
    ),
    buildCriterion(
      "deorbit_timeline",
      "Deorbit Requirement",
      "debris",
      codes,
      (code) => {
        const data = jurisdictionData.get(code);
        if (!data) return { value: "N/A", score: 0 };
        if (!data.debrisMitigation.deorbitRequirement)
          return { value: "No requirement", score: 4 };
        return {
          value: data.debrisMitigation.deorbitTimeline || "Required",
          score: 3,
        };
      },
    ),
    buildCriterion(
      "debris_plan",
      "Debris Mitigation Plan",
      "debris",
      codes,
      (code) => {
        const data = jurisdictionData.get(code);
        if (!data) return { value: "N/A", score: 0 };
        return {
          value: data.debrisMitigation.debrisMitigationPlan
            ? "Mandatory"
            : "Not required",
          score: 3,
        };
      },
    ),
    buildCriterion(
      "regulatory_maturity",
      "Regulatory Maturity",
      "regulatory",
      codes,
      (code) => {
        const data = jurisdictionData.get(code);
        if (!data) return { value: "N/A", score: 0 };
        if (data.legislation.status === "none")
          return { value: "No law", score: 1 };
        const age = 2026 - data.legislation.yearEnacted;
        if (age >= 15) return { value: "Very mature", score: 5 };
        if (age >= 8) return { value: "Mature", score: 4 };
        if (age >= 4) return { value: "Established", score: 3 };
        return { value: "Recent", score: 2 };
      },
    ),
    buildCriterion(
      "remote_sensing",
      "Remote Sensing License",
      "regulatory",
      codes,
      (code) => {
        const data = jurisdictionData.get(code);
        if (!data) return { value: "N/A", score: 0 };
        return {
          value: data.dataSensing.remoteSensingLicense
            ? "Required"
            : "Not required",
          score: data.dataSensing.remoteSensingLicense ? 3 : 4,
        };
      },
    ),
    buildCriterion(
      "eu_space_act",
      "EU Space Act Impact",
      "regulatory",
      codes,
      (code) => {
        const data = jurisdictionData.get(code);
        if (!data) return { value: "N/A", score: 0 };
        const rel = data.euSpaceActCrossRef.relationship;
        const labels: Record<string, string> = {
          superseded: "Will be superseded",
          complementary: "Complementary",
          parallel: "Independent",
          gap: "Fills regulatory gap",
        };
        return {
          value: labels[rel] || rel,
          score:
            rel === "complementary"
              ? 5
              : rel === "parallel"
                ? 4
                : rel === "superseded"
                  ? 3
                  : 2,
          notes: data.euSpaceActCrossRef.transitionNotes,
        };
      },
    ),
  ];

  return { criteria };
}

function buildCriterion(
  id: string,
  label: string,
  category: ComparisonCriterion["category"],
  codes: SpaceLawCountryCode[],
  getValue: (code: SpaceLawCountryCode) => {
    value: string;
    score: number;
    notes?: string;
  },
): ComparisonCriterion {
  const jurisdictionValues: ComparisonCriterion["jurisdictionValues"] = {};
  for (const code of codes) {
    jurisdictionValues[code] = getValue(code);
  }
  return { id, label, category, jurisdictionValues };
}

// ─── EU Space Act Preview ───

function buildEUSpaceActPreview(
  selectedCodes: SpaceLawCountryCode[],
  jurisdictionData: Map<SpaceLawCountryCode, JurisdictionLaw>,
  crossReferences: Array<{
    nationalLawArea: string;
    euSpaceActArticles: string[];
    relationship: string;
    description: string;
    applicableCountries: SpaceLawCountryCode[];
  }>,
): EUSpaceActPreview {
  const jurisdictionNotes: EUSpaceActPreview["jurisdictionNotes"] = {};

  for (const code of selectedCodes) {
    const data = jurisdictionData.get(code);
    if (!data) continue;

    const relevantRefs = crossReferences.filter((ref) =>
      ref.applicableCountries.includes(code),
    );

    const keyChanges = relevantRefs.slice(0, 4).map((ref) => {
      const articleStr =
        ref.euSpaceActArticles.length > 0
          ? ` (${ref.euSpaceActArticles.join(", ")})`
          : "";
      return `${ref.nationalLawArea}${articleStr}: ${ref.relationship}`;
    });

    jurisdictionNotes[code] = {
      relationship: data.euSpaceActCrossRef.relationship,
      description: data.euSpaceActCrossRef.description,
      keyChanges,
    };
  }

  // Determine overall relationship
  const relationships = selectedCodes
    .map((code) => jurisdictionData.get(code)?.euSpaceActCrossRef.relationship)
    .filter(Boolean);

  let overallRelationship: string;
  if (relationships.includes("gap")) {
    overallRelationship =
      "The EU Space Act will fill significant regulatory gaps in some of your selected jurisdictions and harmonize requirements across all EU member states by 2030.";
  } else if (relationships.every((r) => r === "parallel")) {
    overallRelationship =
      "Your selected jurisdictions maintain independent regimes from the EU Space Act. Separate compliance may be required for EU market access.";
  } else {
    overallRelationship =
      "The EU Space Act (effective 2030) will harmonize authorization requirements across EU member states. National provisions will be gradually superseded or complemented by the unified EU framework.";
  }

  return { overallRelationship, jurisdictionNotes };
}

// ─── Recommendations ───

function generateRecommendations(
  results: JurisdictionResult[],
  answers: SpaceLawAssessmentAnswers,
): string[] {
  const recommendations: string[] = [];

  // Sort by favorability score
  const sorted = [...results].sort(
    (a, b) => b.favorabilityScore - a.favorabilityScore,
  );

  // Top jurisdiction recommendation
  if (sorted.length > 1) {
    const top = sorted[0];
    recommendations.push(
      `${top.flagEmoji} ${top.countryName} scores highest (${top.favorabilityScore}/100) for your profile — consider it as your primary jurisdiction.`,
    );
  }

  // Timeline recommendation
  const fastest = sorted.reduce((a, b) =>
    (a.estimatedTimeline.min + a.estimatedTimeline.max) / 2 <
    (b.estimatedTimeline.min + b.estimatedTimeline.max) / 2
      ? a
      : b,
  );
  if (sorted.length > 1) {
    recommendations.push(
      `For the fastest timeline, ${fastest.flagEmoji} ${fastest.countryName} offers ${fastest.estimatedTimeline.min}–${fastest.estimatedTimeline.max} week processing.`,
    );
  }

  // Insurance recommendation
  const withInsurance = results.filter((r) => r.insurance.mandatory);
  if (withInsurance.length > 0) {
    recommendations.push(
      "Prepare insurance documentation early — most jurisdictions require mandatory third-party liability coverage before authorization.",
    );
  }

  // EU Space Act transition
  const euMembers = results.filter(
    (r) => !["UK", "NO"].includes(r.countryCode),
  );
  if (euMembers.length > 0) {
    recommendations.push(
      "Plan for EU Space Act transition by 2030 — EU member state national regimes will be harmonized under the new framework.",
    );
  }

  // New applicant advice
  if (answers.licensingStatus === "new_application") {
    recommendations.push(
      "For new applications, engage with the licensing authority early. Most NCAs offer pre-application consultations to discuss requirements and timelines.",
    );
  }

  // Constellation advice
  if (answers.constellationSize && answers.constellationSize > 9) {
    recommendations.push(
      "For constellation deployments, inquire about blanket licensing options — some jurisdictions allow a single authorization covering multiple identical spacecraft.",
    );
  }

  // Germany gap advice
  const deResult = results.find((r) => r.countryCode === "DE");
  if (deResult && !deResult.isApplicable) {
    recommendations.push(
      "Germany currently lacks a comprehensive space law. Consider alternative jurisdictions for authorization, or monitor the upcoming Weltraumgesetz development.",
    );
  }

  return recommendations.slice(0, 6);
}

// ─── Helpers ───

function formatCostEstimate(data: JurisdictionLaw): string {
  const parts: string[] = [];
  if (data.timeline.applicationFee) {
    parts.push(`Application: ${data.timeline.applicationFee}`);
  }
  if (data.timeline.annualFee) {
    parts.push(`Annual: ${data.timeline.annualFee}`);
  }
  if (parts.length === 0) return "Contact authority for fee schedule";
  return parts.join(" · ");
}

// ─── Redaction for Client ───

export function redactSpaceLawResultForClient(
  result: SpaceLawComplianceResult,
): RedactedSpaceLawResult {
  return {
    jurisdictions: result.jurisdictions.map(
      ({ applicableRequirements, ...rest }) => ({
        ...rest,
        requirementCount: applicableRequirements.length,
      }),
    ),
    comparisonMatrix: result.comparisonMatrix,
    euSpaceActPreview: result.euSpaceActPreview,
    recommendations: result.recommendations,
  };
}
