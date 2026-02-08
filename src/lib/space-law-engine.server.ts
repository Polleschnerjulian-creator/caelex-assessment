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
  LicensingRequirement,
} from "./space-law-types";

// ─── Lazy import for jurisdiction data ───

let _jurisdictionDataModule:
  | typeof import("@/data/national-space-laws")
  | null = null;
let _crossRefModule: typeof import("@/data/space-law-cross-references") | null =
  null;

async function getJurisdictionData() {
  if (!_jurisdictionDataModule) {
    _jurisdictionDataModule = await import("@/data/national-space-laws");
  }
  return _jurisdictionDataModule.JURISDICTION_DATA;
}

async function getCrossReferences() {
  if (!_crossRefModule) {
    _crossRefModule = await import("@/data/space-law-cross-references");
  }
  return _crossRefModule.SPACE_LAW_CROSS_REFERENCES;
}

// ─── Main Calculation Function ───

export async function calculateSpaceLawCompliance(
  answers: SpaceLawAssessmentAnswers,
): Promise<SpaceLawComplianceResult> {
  const jurisdictionData = await getJurisdictionData();
  const crossReferences = await getCrossReferences();

  // 1. Calculate results for each selected jurisdiction
  const jurisdictions: JurisdictionResult[] = answers.selectedJurisdictions
    .map((code) => {
      const data = jurisdictionData.get(code);
      if (!data) return null;
      return calculateJurisdictionResult(data, answers);
    })
    .filter((r): r is JurisdictionResult => r !== null);

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
  let score = 50; // Base score
  const factors: string[] = [];

  // No law = low score
  if (data.legislation.status === "none") {
    return {
      score: 20,
      factors: [
        "No comprehensive space law — regulatory uncertainty",
        "EU Space Act (2030) will provide framework",
      ],
    };
  }

  // Timeline (faster = better)
  const avgWeeks =
    (data.timeline.typicalProcessingWeeks.min +
      data.timeline.typicalProcessingWeeks.max) /
    2;
  if (avgWeeks <= 10) {
    score += 15;
    factors.push("Fast licensing timeline");
  } else if (avgWeeks <= 16) {
    score += 8;
    factors.push("Moderate licensing timeline");
  } else {
    score -= 5;
    factors.push("Longer licensing timeline");
  }

  // Government indemnification (yes = better)
  if (data.insuranceLiability.governmentIndemnification) {
    score += 10;
    factors.push("Government indemnification available");
  }

  // Insurance flexibility
  if (data.insuranceLiability.liabilityRegime === "capped") {
    score += 8;
    factors.push("Capped liability regime");
  } else if (data.insuranceLiability.liabilityRegime === "negotiable") {
    score += 5;
    factors.push("Negotiable liability terms");
  }

  // Regulatory maturity
  if (data.legislation.yearEnacted <= 2010) {
    score += 10;
    factors.push("Mature regulatory framework");
  } else if (data.legislation.yearEnacted <= 2018) {
    score += 5;
    factors.push("Established regulatory framework");
  }

  // Special provisions (Luxembourg space resources)
  if (data.countryCode === "LU" && answers.activityType === "space_resources") {
    score += 15;
    factors.push("Explicit space resources legislation");
  }

  // Small entity benefits
  if (answers.entitySize === "small") {
    if (data.countryCode === "NL") {
      score += 5;
      factors.push("Reduced insurance thresholds for small satellites");
    }
    if (data.countryCode === "LU") {
      score += 5;
      factors.push("Flexible thresholds for smaller operators");
    }
  }

  // National registry (organized = better)
  if (data.registration.nationalRegistryExists) {
    score += 3;
    factors.push("National space registry maintained");
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  return { score, factors };
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
