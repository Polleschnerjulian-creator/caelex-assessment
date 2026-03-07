import "server-only";

import type {
  OptimizationInput,
  OptimizationOutput,
  JurisdictionRanking,
  TradeOffPoint,
  MigrationStep,
  OptimizerBadge,
  OptimizationWeights,
} from "./types";

import type {
  SpaceLawCountryCode,
  JurisdictionLaw,
  JurisdictionResult,
} from "@/lib/space-law-types";

import { resolveWeights } from "./weight-presets";

// ── Lazy imports ──

let _jurisdictionDataModule:
  | typeof import("@/data/national-space-laws")
  | null = null;

async function getJurisdictionData() {
  if (!_jurisdictionDataModule) {
    _jurisdictionDataModule = await import("@/data/national-space-laws");
  }
  return _jurisdictionDataModule.JURISDICTION_DATA;
}

let _engineModule: typeof import("@/lib/space-law-engine.server") | null = null;

async function getEngine() {
  if (!_engineModule) {
    _engineModule = await import("@/lib/space-law-engine.server");
  }
  return _engineModule;
}

// ── Helpers ──

/**
 * Strip non-numeric characters from a currency string and return a float.
 * Returns 0 if the value is undefined or cannot be parsed.
 */
export function parseCurrencyToNumber(value?: string): number {
  if (!value) return 0;
  // Take the first number found (handles ranges like "€5,000–€15,000" → 5000)
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Compute a list of key advantages for a jurisdiction.
 */
export function computeAdvantages(law: JurisdictionLaw): string[] {
  const advantages: string[] = [];

  if (law.insuranceLiability.governmentIndemnification) {
    advantages.push("Government indemnification available");
  }
  if (law.insuranceLiability.liabilityRegime === "capped") {
    advantages.push("Capped liability regime");
  }
  const avgWeeks =
    (law.timeline.typicalProcessingWeeks.min +
      law.timeline.typicalProcessingWeeks.max) /
    2;
  if (avgWeeks <= 12) {
    advantages.push("Fast processing timeline");
  }
  if (!law.debrisMitigation.debrisMitigationPlan) {
    advantages.push("No debris mitigation plan required");
  }
  if (law.registration.nationalRegistryExists) {
    advantages.push("National space registry maintained");
  }
  const appFee = parseCurrencyToNumber(law.timeline.applicationFee);
  if (appFee > 0 && appFee <= 5000) {
    advantages.push("Low application fee");
  }

  return advantages;
}

/**
 * Compute a list of key risks for a jurisdiction.
 */
export function computeRisks(law: JurisdictionLaw): string[] {
  const risks: string[] = [];

  if (law.insuranceLiability.liabilityRegime === "unlimited") {
    risks.push("Unlimited liability exposure");
  }
  const avgWeeks =
    (law.timeline.typicalProcessingWeeks.min +
      law.timeline.typicalProcessingWeeks.max) /
    2;
  if (avgWeeks > 20) {
    risks.push("Long processing timeline");
  }
  const coverage = parseCurrencyToNumber(
    law.insuranceLiability.minimumCoverage,
  );
  if (coverage >= 50_000_000) {
    risks.push("High insurance requirements");
  }
  if (law.dataSensing.dataDistributionRestrictions) {
    risks.push("Data distribution restrictions");
  }
  // Dual compliance if EU relationship is complementary or superseded
  if (
    law.euSpaceActCrossRef.relationship === "complementary" ||
    law.euSpaceActCrossRef.relationship === "superseded"
  ) {
    risks.push("Dual compliance with EU Space Act");
  }

  return risks;
}

// ── Dimension Score Calculators ──

type DimensionScores = {
  timeline: number;
  cost: number;
  compliance: number;
  insurance: number;
  liability: number;
  debris: number;
};

/**
 * Compute raw timeline score: lower avg weeks = higher score.
 * Maps 0-52 weeks → 100-0.
 */
function rawTimelineScore(law: JurisdictionLaw): number {
  const avg =
    (law.timeline.typicalProcessingWeeks.min +
      law.timeline.typicalProcessingWeeks.max) /
    2;
  const clamped = Math.max(0, Math.min(52, avg));
  return 100 - (clamped / 52) * 100;
}

/**
 * Compute raw cost score: lower 5-year TCO = higher score.
 * TCO = appFee + annualFee * 5. Maps €0-500k → 100-0.
 */
function rawCostScore(law: JurisdictionLaw): number {
  const appFee = parseCurrencyToNumber(law.timeline.applicationFee);
  const annualFee = parseCurrencyToNumber(law.timeline.annualFee);
  const tco = appFee + annualFee * 5;
  const clamped = Math.max(0, Math.min(500_000, tco));
  return 100 - (clamped / 500_000) * 100;
}

/**
 * Compute raw insurance score based on insurance features.
 */
function rawInsuranceScore(law: JurisdictionLaw): number {
  let score = 50;
  if (law.insuranceLiability.governmentIndemnification) score += 25;

  const regime = law.insuranceLiability.liabilityRegime;
  if (regime === "capped") score += 15;
  else if (regime === "negotiable") score += 10;
  else if (regime === "tiered") score += 5;

  const coverage = parseCurrencyToNumber(
    law.insuranceLiability.minimumCoverage,
  );
  if (coverage > 0 && coverage < 30_000_000) score += 10;
  if (coverage > 80_000_000) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Compute raw liability score based on liability regime.
 */
function rawLiabilityScore(law: JurisdictionLaw): number {
  let score: number;
  switch (law.insuranceLiability.liabilityRegime) {
    case "capped":
      score = 90;
      break;
    case "tiered":
      score = 70;
      break;
    case "negotiable":
      score = 50;
      break;
    case "unlimited":
    default:
      score = 20;
      break;
  }
  if (law.insuranceLiability.governmentIndemnification) score += 10;
  return Math.max(0, Math.min(100, score));
}

/**
 * Compute raw debris flexibility score.
 */
function rawDebrisFlexScore(
  law: JurisdictionLaw,
  hasDesignForDemise: boolean,
): number {
  let score = 50;
  if (!law.debrisMitigation.debrisMitigationPlan) score += 20;
  if (!law.debrisMitigation.deorbitRequirement) score += 15;
  if (!law.debrisMitigation.passivationRequired) score += 10;
  if (!law.debrisMitigation.collisionAvoidance) score += 5;
  if (hasDesignForDemise && law.debrisMitigation.deorbitRequirement)
    score += 10;
  return Math.max(0, Math.min(100, score));
}

/**
 * Min-max normalize an array of scores across jurisdictions.
 * If all values are the same, returns 50 for each.
 */
function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => ((v - min) / (max - min)) * 100);
}

/**
 * Compute weighted composite score from dimension scores.
 */
function weightedScore(
  dims: DimensionScores,
  weights: OptimizationWeights,
): number {
  return (
    (dims.timeline * weights.timeline +
      dims.cost * weights.cost +
      dims.compliance * weights.compliance +
      dims.insurance * weights.insurance +
      dims.liability * weights.liability +
      dims.debris * weights.debrisFlex) /
    100
  );
}

/**
 * Build migration path steps from current jurisdiction to target.
 */
function buildMigrationPath(
  currentJurisdiction: SpaceLawCountryCode,
  targetLaw: JurisdictionLaw,
): MigrationStep[] {
  const processingWeeks = targetLaw.timeline.typicalProcessingWeeks;

  return [
    {
      order: 1,
      title: "Regulatory Assessment",
      description: `Conduct a regulatory gap analysis between ${currentJurisdiction} and ${targetLaw.countryCode} frameworks. Identify additional requirements and documentation needed.`,
      estimatedDuration: "1-2 weeks",
      documents: [
        "Current license documentation",
        "Regulatory comparison matrix",
        "Gap analysis report",
      ],
    },
    {
      order: 2,
      title: "Apply to New Authority",
      description: `Submit application to ${targetLaw.licensingAuthority.name} with all required documentation and technical assessments.`,
      estimatedDuration: `${processingWeeks.min}-${processingWeeks.max} weeks`,
      documents: [
        "New license application",
        "Technical assessment dossier",
        "Mission plan",
        "Safety case",
      ],
      cost: targetLaw.timeline.applicationFee,
      authority: targetLaw.licensingAuthority.name,
    },
    {
      order: 3,
      title: "Insurance Transfer",
      description: `Transfer or obtain new third-party liability insurance meeting ${targetLaw.countryCode} requirements.`,
      estimatedDuration: "2-4 weeks",
      documents: [
        "Insurance policy transfer request",
        "New coverage certificate",
        "Broker correspondence",
      ],
      cost: targetLaw.insuranceLiability.minimumCoverage
        ? `Insurance premium based on ${targetLaw.insuranceLiability.minimumCoverage} minimum coverage`
        : undefined,
    },
    {
      order: 4,
      title: "Registration Transfer",
      description: `Transfer space object registration from ${currentJurisdiction} registry to ${targetLaw.countryCode} national registry.`,
      estimatedDuration: "4-8 weeks",
      documents: [
        "De-registration request (current registry)",
        "Registration application (new registry)",
        "UN registration notification",
      ],
      authority:
        targetLaw.registration.registryName ??
        targetLaw.licensingAuthority.name,
    },
    {
      order: 5,
      title: "Surrender Current License",
      description: `Formally surrender the existing ${currentJurisdiction} space operations license and confirm transfer completion.`,
      estimatedDuration: "2-4 weeks",
      documents: [
        "License surrender application",
        "Transfer confirmation from new authority",
        "Final compliance report",
      ],
    },
  ];
}

// ── Main Optimization Function ──

export async function runOptimization(
  input: OptimizationInput,
): Promise<OptimizationOutput> {
  // 1. Resolve weights from profile
  const weights = resolveWeights(input.weightProfile, input.customWeights);

  // 2. Get all jurisdiction data
  const jurisdictionData = await getJurisdictionData();
  const allCodes = Array.from(jurisdictionData.keys());

  // 3. Build answers and call engine for all jurisdictions
  const engine = await getEngine();
  const complianceResult = await engine.calculateSpaceLawCompliance({
    selectedJurisdictions: allCodes,
    activityType: input.activityType,
    entityNationality: input.entityNationality,
    entitySize: input.entitySize,
    primaryOrbit: input.primaryOrbit,
    constellationSize: input.constellationSize,
    licensingStatus: "new_application",
  });

  // Build a lookup of compliance results by country code
  const complianceByCode = new Map<SpaceLawCountryCode, JurisdictionResult>();
  for (const jr of complianceResult.jurisdictions) {
    complianceByCode.set(jr.countryCode, jr);
  }

  // 4. Compute raw dimension scores for each jurisdiction
  const jurisdictionEntries: Array<{
    code: SpaceLawCountryCode;
    law: JurisdictionLaw;
    compliance: JurisdictionResult;
    rawScores: DimensionScores;
  }> = [];

  for (const code of allCodes) {
    const law = jurisdictionData.get(code);
    const compliance = complianceByCode.get(code);
    if (!law || !compliance) continue;

    const rawScores: DimensionScores = {
      timeline: rawTimelineScore(law),
      cost: rawCostScore(law),
      insurance: rawInsuranceScore(law),
      liability: rawLiabilityScore(law),
      debris: rawDebrisFlexScore(law, input.hasDesignForDemise),
      compliance: compliance.favorabilityScore,
    };

    jurisdictionEntries.push({ code, law, compliance, rawScores });
  }

  // 5. Min-max normalize across jurisdictions
  const dims = [
    "timeline",
    "cost",
    "compliance",
    "insurance",
    "liability",
    "debris",
  ] as const;

  const normalizedByDim: Record<string, number[]> = {};
  for (const dim of dims) {
    const rawValues = jurisdictionEntries.map((e) => e.rawScores[dim]);
    normalizedByDim[dim] = minMaxNormalize(rawValues);
  }

  // 6. Build rankings with weighted scores
  const rankedEntries = jurisdictionEntries.map((entry, idx) => {
    const normalizedScores: DimensionScores = {
      timeline: normalizedByDim["timeline"][idx],
      cost: normalizedByDim["cost"][idx],
      compliance: normalizedByDim["compliance"][idx],
      insurance: normalizedByDim["insurance"][idx],
      liability: normalizedByDim["liability"][idx],
      debris: normalizedByDim["debris"][idx],
    };

    const totalScore = weightedScore(normalizedScores, weights);

    return {
      ...entry,
      normalizedScores,
      totalScore,
    };
  });

  // 7. Sort by total score descending
  rankedEntries.sort((a, b) => b.totalScore - a.totalScore);

  // 8. Assign badges
  const badges = new Map<SpaceLawCountryCode, OptimizerBadge[]>();
  for (const e of rankedEntries) badges.set(e.code, []);

  // BEST_OVERALL
  if (rankedEntries.length > 0) {
    badges.get(rankedEntries[0].code)!.push("BEST_OVERALL");
  }

  // FASTEST — lowest timeline.min
  const fastest = rankedEntries.reduce((a, b) =>
    a.law.timeline.typicalProcessingWeeks.min <
    b.law.timeline.typicalProcessingWeeks.min
      ? a
      : b,
  );
  badges.get(fastest.code)!.push("FASTEST");

  // CHEAPEST — lowest application fee
  const cheapest = rankedEntries.reduce((a, b) => {
    const aFee = parseCurrencyToNumber(a.law.timeline.applicationFee);
    const bFee = parseCurrencyToNumber(b.law.timeline.applicationFee);
    return aFee <= bFee ? a : b;
  });
  badges.get(cheapest.code)!.push("CHEAPEST");

  // MOST_COMPLIANT — highest compliance score
  const mostCompliant = rankedEntries.reduce((a, b) =>
    a.compliance.favorabilityScore >= b.compliance.favorabilityScore ? a : b,
  );
  badges.get(mostCompliant.code)!.push("MOST_COMPLIANT");

  // 9. Build rankings array
  const rankings: JurisdictionRanking[] = rankedEntries.map((entry) => ({
    jurisdiction: entry.code,
    jurisdictionName: entry.law.countryName,
    flagEmoji: entry.law.flagEmoji,
    totalScore: Math.round(entry.totalScore * 100) / 100,
    dimensionScores: {
      timeline: Math.round(entry.normalizedScores.timeline * 100) / 100,
      cost: Math.round(entry.normalizedScores.cost * 100) / 100,
      compliance: Math.round(entry.normalizedScores.compliance * 100) / 100,
      insurance: Math.round(entry.normalizedScores.insurance * 100) / 100,
      liability: Math.round(entry.normalizedScores.liability * 100) / 100,
      debris: Math.round(entry.normalizedScores.debris * 100) / 100,
    },
    badges: badges.get(entry.code) ?? [],
    timeline: entry.law.timeline.typicalProcessingWeeks,
    estimatedCost: {
      application: entry.law.timeline.applicationFee ?? "Contact authority",
      annual: entry.law.timeline.annualFee ?? "Contact authority",
    },
    keyAdvantages: computeAdvantages(entry.law),
    keyRisks: computeRisks(entry.law),
  }));

  // 10. Build trade-off points
  const tradeOffData: TradeOffPoint[] = rankedEntries.map((entry) => {
    const avgWeeks =
      (entry.law.timeline.typicalProcessingWeeks.min +
        entry.law.timeline.typicalProcessingWeeks.max) /
      2;
    return {
      jurisdiction: entry.code,
      x: 1 - entry.normalizedScores.cost / 100,
      y: entry.normalizedScores.compliance,
      size: avgWeeks,
      label: entry.law.countryName,
    };
  });

  // 11. Migration path (if currentJurisdiction provided)
  let migrationPath: MigrationStep[] | undefined;
  if (input.currentJurisdiction && rankedEntries.length > 0) {
    const targetLaw = rankedEntries[0].law;
    migrationPath = buildMigrationPath(input.currentJurisdiction, targetLaw);
  }

  // 12. Build summary
  const summary = {
    bestOverall:
      rankedEntries.length > 0
        ? `${rankedEntries[0].law.flagEmoji} ${rankedEntries[0].law.countryName}`
        : "N/A",
    bestForTimeline: `${fastest.law.flagEmoji} ${fastest.law.countryName}`,
    bestForCost: `${cheapest.law.flagEmoji} ${cheapest.law.countryName}`,
    bestForCompliance: `${mostCompliant.law.flagEmoji} ${mostCompliant.law.countryName}`,
  };

  return {
    rankings,
    tradeOffData,
    migrationPath,
    summary,
  };
}
