/**
 * Unified Engine Merger
 * Merges results from multiple engine calls for multi-activity operators.
 */

import "server-only";

import type {
  ComplianceResult,
  Article,
  ModuleStatus,
  ModuleStatusType,
  ChecklistItem,
  KeyDate,
  RegimeType,
} from "./types";
import type { NIS2ComplianceResult } from "./nis2-types";
import type { SpaceLawComplianceResult } from "./space-law-types";
import type {
  RedactedUnifiedResult,
  UnifiedAssessmentAnswers,
  ActivityType,
} from "./unified-assessment-types";
import {
  ACTIVITY_TYPE_LABELS,
  SERVICE_TYPE_LABELS,
  EU_MEMBER_STATES,
} from "./unified-assessment-types";

// ─── Types ───

export interface MergedArticle extends Article {
  applicableActivities: string[];
}

export interface MergedSpaceActResult {
  applies: boolean;
  operatorTypes: string[];
  regime: RegimeType;
  regimeLabel: string;
  regimeReason: string;
  applicableArticles: MergedArticle[];
  applicableCount: number;
  totalArticles: number;
  applicablePercentage: number;
  moduleStatuses: ModuleStatus[];
  checklist: ChecklistItem[];
  keyDates: KeyDate[];
  estimatedAuthorizationCost: string;
  authorizationPath: string;
  isDefenseOnly: boolean;
}

// ─── Module status priority (higher index = more restrictive) ───

const STATUS_PRIORITY: Record<ModuleStatusType, number> = {
  not_applicable: 0,
  recommended: 1,
  simplified: 2,
  required: 3,
};

/**
 * Merge results from multiple EU Space Act engine calls (one per activity type).
 * - Deduplicates articles by article.number
 * - Takes the most restrictive module status per module
 * - Concatenates and deduplicates checklists
 * - Merges key dates (deduped, sorted)
 * - Uses the more restrictive regime (standard > light)
 */
export function mergeMultiActivityResults(
  results: ComplianceResult[],
): MergedSpaceActResult {
  if (results.length === 0) {
    return {
      applies: false,
      operatorTypes: [],
      regime: "out_of_scope",
      regimeLabel: "Out of Scope",
      regimeReason: "No applicable activity types",
      applicableArticles: [],
      applicableCount: 0,
      totalArticles: 0,
      applicablePercentage: 0,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "N/A",
      authorizationPath: "N/A",
      isDefenseOnly: false,
    };
  }

  if (results.length === 1) {
    const r = results[0];
    const activityLabel =
      r.operatorAbbreviation || r.operatorTypeLabel || "UNKNOWN";
    return {
      applies: true,
      operatorTypes: [r.operatorTypeLabel],
      regime: r.regime,
      regimeLabel: r.regimeLabel,
      regimeReason: r.regimeReason,
      applicableArticles: r.applicableArticles.map((article) => ({
        ...article,
        applicableActivities: [activityLabel],
      })),
      applicableCount: r.applicableCount,
      totalArticles: r.totalArticles,
      applicablePercentage: r.applicablePercentage,
      moduleStatuses: r.moduleStatuses,
      checklist: r.checklist,
      keyDates: r.keyDates,
      estimatedAuthorizationCost: r.estimatedAuthorizationCost,
      authorizationPath: r.authorizationPath,
      isDefenseOnly: false,
    };
  }

  // Deduplicate articles by number, merging applicableActivities
  const articleMap = new Map<string, MergedArticle>();
  for (const result of results) {
    const activityLabel =
      result.operatorAbbreviation || result.operatorTypeLabel || "UNKNOWN";
    for (const article of result.applicableArticles) {
      const key = String(article.number);
      const existing = articleMap.get(key);
      if (existing) {
        if (!existing.applicableActivities.includes(activityLabel)) {
          existing.applicableActivities.push(activityLabel);
        }
      } else {
        articleMap.set(key, {
          ...article,
          applicableActivities: [activityLabel],
        });
      }
    }
  }
  const mergedArticles = Array.from(articleMap.values());

  // Most restrictive regime
  const hasStandard = results.some((r) => r.regime === "standard");
  const regime: RegimeType = hasStandard ? "standard" : "light";
  const regimeLabel = hasStandard
    ? "Standard (Full Requirements)"
    : "Light Regime";
  const regimeReason = hasStandard
    ? "Standard regime applies due to multi-activity profile"
    : "Light regime applies — all activities qualify for simplified requirements";

  // Merge module statuses (most restrictive per module ID)
  const moduleMap = new Map<string, ModuleStatus>();
  for (const result of results) {
    for (const mod of result.moduleStatuses) {
      const existing = moduleMap.get(mod.id);
      if (!existing) {
        moduleMap.set(mod.id, { ...mod });
      } else {
        const existingPriority = STATUS_PRIORITY[existing.status] || 0;
        const newPriority = STATUS_PRIORITY[mod.status] || 0;
        if (newPriority > existingPriority) {
          moduleMap.set(mod.id, {
            ...mod,
            articleCount: Math.max(existing.articleCount, mod.articleCount),
          });
        } else {
          // Keep existing but update article count to max
          existing.articleCount = Math.max(
            existing.articleCount,
            mod.articleCount,
          );
        }
      }
    }
  }
  const mergedModules = Array.from(moduleMap.values());

  // Merge checklists (dedupe by requirement text)
  const checklistSet = new Set<string>();
  const mergedChecklist: ChecklistItem[] = [];
  for (const result of results) {
    for (const item of result.checklist) {
      if (!checklistSet.has(item.requirement)) {
        checklistSet.add(item.requirement);
        mergedChecklist.push(item);
      }
    }
  }

  // Merge key dates (dedupe by description)
  const dateSet = new Set<string>();
  const mergedDates: KeyDate[] = [];
  for (const result of results) {
    for (const date of result.keyDates) {
      if (!dateSet.has(date.description)) {
        dateSet.add(date.description);
        mergedDates.push(date);
      }
    }
  }

  // Operator type labels
  const operatorTypes = results.map((r) => r.operatorTypeLabel);

  // Use the first result's total articles (same data source)
  const totalArticles = results[0].totalArticles;

  return {
    applies: true,
    operatorTypes,
    regime,
    regimeLabel,
    regimeReason,
    applicableArticles: mergedArticles,
    applicableCount: mergedArticles.length,
    totalArticles,
    applicablePercentage: Math.round(
      (mergedArticles.length / totalArticles) * 100,
    ),
    moduleStatuses: mergedModules,
    checklist: mergedChecklist,
    keyDates: mergedDates,
    estimatedAuthorizationCost: results
      .map((r) => r.estimatedAuthorizationCost)
      .join(" + "),
    authorizationPath: results[0].authorizationPath,
    isDefenseOnly: false,
  };
}

// ─── Cross-Framework Overlap ───

function buildCrossFrameworkOverlap(
  spaceAct: MergedSpaceActResult | null,
  nis2: NIS2ComplianceResult | null,
): { area: string; euSpaceActRef: string; nis2Ref: string }[] {
  const overlaps: { area: string; euSpaceActRef: string; nis2Ref: string }[] =
    [];

  if (
    !spaceAct?.applies ||
    !nis2 ||
    nis2.entityClassification === "out_of_scope"
  ) {
    return overlaps;
  }

  // Use the NIS2 engine's calculated overlaps
  if (
    nis2.euSpaceActOverlap &&
    nis2.euSpaceActOverlap.overlappingRequirements
  ) {
    for (const overlap of nis2.euSpaceActOverlap.overlappingRequirements) {
      overlaps.push({
        area: overlap.description,
        euSpaceActRef: overlap.euSpaceActArticle,
        nis2Ref: overlap.nis2Article,
      });
    }
  }

  // Add known structural overlaps if the engine didn't find them
  if (overlaps.length === 0) {
    const structuralOverlaps = [
      {
        area: "Cybersecurity risk management",
        euSpaceActRef: "Art. 76",
        nis2Ref: "Art. 21(2)(a)",
      },
      {
        area: "Incident reporting",
        euSpaceActRef: "Art. 78",
        nis2Ref: "Art. 23",
      },
      {
        area: "Supply chain security",
        euSpaceActRef: "Art. 77",
        nis2Ref: "Art. 21(2)(d)",
      },
    ];
    overlaps.push(...structuralOverlaps);
  }

  return overlaps;
}

// ─── Confidence Score (quality-weighted) ───

interface ConfidenceField {
  key: keyof UnifiedAssessmentAnswers;
  weight: number; // 2 = required, 1.5 = important, 1 = standard
}

export const CONFIDENCE_FIELDS: ConfidenceField[] = [
  { key: "establishmentCountry", weight: 2 },
  { key: "entitySize", weight: 2 },
  { key: "activityTypes", weight: 2 },
  { key: "primaryOrbitalRegime", weight: 1.5 },
  { key: "operatesConstellation", weight: 1.5 },
  { key: "servesEUCustomers", weight: 1.5 },
  { key: "serviceTypes", weight: 1 },
  { key: "servesCriticalInfrastructure", weight: 1 },
  { key: "hasCybersecurityPolicy", weight: 1 },
  { key: "hasRiskManagement", weight: 1 },
  { key: "hasIncidentResponsePlan", weight: 1 },
  { key: "hasSupplyChainSecurity", weight: 1 },
  { key: "hasBusinessContinuityPlan", weight: 1 },
  { key: "hasEncryption", weight: 1 },
  { key: "hasAccessControl", weight: 1 },
  { key: "hasVulnerabilityManagement", weight: 1 },
  { key: "interestedJurisdictions", weight: 1 },
  { key: "hasInsurance", weight: 1 },
];

export function calculateConfidenceScore(
  answers: Partial<UnifiedAssessmentAnswers>,
): number {
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const field of CONFIDENCE_FIELDS) {
    totalWeight += field.weight;
    const value = answers[field.key];
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      if (value.length === 1) {
        earnedWeight += field.weight * 0.5;
      } else {
        earnedWeight += field.weight;
      }
    } else if (typeof value === "string") {
      if (value.trim() === "") continue;
      earnedWeight += field.weight;
    } else {
      earnedWeight += field.weight;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round((earnedWeight / totalWeight) * 100);
}

// ─── NIS2 Incident Timeline ───

function buildIncidentTimeline(nis2: NIS2ComplianceResult | null): {
  phase: string;
  deadline: string;
  description: string;
}[] {
  if (!nis2 || nis2.entityClassification === "out_of_scope") return [];

  const timeline = nis2.incidentReportingTimeline;
  return [
    {
      phase: "Early Warning",
      deadline: timeline.earlyWarning.deadline,
      description: timeline.earlyWarning.description,
    },
    {
      phase: "Incident Notification",
      deadline: timeline.notification.deadline,
      description: timeline.notification.description,
    },
    {
      phase: "Final Report",
      deadline: timeline.finalReport.deadline,
      description: timeline.finalReport.description,
    },
  ];
}

// ─── Build Unified Result ───

/**
 * Assemble the final RedactedUnifiedResult from real engine outputs.
 */
export function buildUnifiedResult(
  spaceActResult: MergedSpaceActResult | null,
  nis2Result: NIS2ComplianceResult | null,
  spaceLawResult: SpaceLawComplianceResult | null,
  answers: Partial<UnifiedAssessmentAnswers>,
): RedactedUnifiedResult {
  const isEU = EU_MEMBER_STATES.includes(
    answers.establishmentCountry as (typeof EU_MEMBER_STATES)[number],
  );

  // EU Space Act section
  const euSpaceAct =
    spaceActResult && spaceActResult.applies
      ? {
          applies: true,
          operatorTypes: spaceActResult.operatorTypes,
          regime: spaceActResult.regime,
          regimeReason: spaceActResult.regimeReason,
          applicableArticleCount: spaceActResult.applicableCount,
          moduleCount: spaceActResult.moduleStatuses.filter(
            (m) => m.status === "required" || m.status === "simplified",
          ).length,
          keyDeadlines: spaceActResult.keyDates.map((d) => ({
            date: d.date,
            description: d.description,
          })),
          priorityActions: buildSpaceActPriorityActions(
            spaceActResult,
            answers,
          ),
          applicableArticles: spaceActResult.applicableArticles.map((a) => ({
            number: String(a.number),
            title: a.title,
            relevance: a.compliance_type || "mandatory",
            applicableActivities: a.applicableActivities,
          })),
          moduleStatuses: spaceActResult.moduleStatuses.map((m) => ({
            id: m.id,
            name: m.name,
            status: m.status,
            articleCount: m.articleCount,
          })),
        }
      : {
          applies: false,
          operatorTypes: [] as string[],
          regime: spaceActResult?.isDefenseOnly ? "exempt" : "exempt",
          regimeReason: spaceActResult?.isDefenseOnly
            ? "Defense-only operations are exempt under Art. 2(3)"
            : "No EU establishment or EU market presence",
          applicableArticleCount: 0,
          moduleCount: 0,
          keyDeadlines: [] as { date: string; description: string }[],
          priorityActions: [] as string[],
          applicableArticles: [] as {
            number: string;
            title: string;
            relevance: string;
          }[],
          moduleStatuses: [] as {
            id: string;
            name: string;
            status: string;
            articleCount: number;
          }[],
        };

  // NIS2 section
  const nis2Classification = nis2Result?.entityClassification || "out_of_scope";
  const nis2Applies = nis2Classification !== "out_of_scope";

  // Calculate NIS2 readiness from unified cybersecurity answers
  const cyberChecks = [
    answers.hasCybersecurityPolicy,
    answers.hasRiskManagement,
    answers.hasIncidentResponsePlan,
    answers.hasBusinessContinuityPlan,
    answers.hasSupplyChainSecurity,
    answers.hasSecurityTraining,
    answers.hasEncryption,
    answers.hasAccessControl,
    answers.hasVulnerabilityManagement,
    answers.conductsPenetrationTesting,
  ];
  const compliantCount = cyberChecks.filter((c) => c === true).length;
  const complianceGapCount = cyberChecks.filter((c) => c === false).length;
  const estimatedReadiness = Math.round(
    (compliantCount / cyberChecks.length) * 100,
  );

  const nis2Section = {
    applies: nis2Applies,
    entityClassification: nis2Classification,
    classificationReason: nis2Result?.classificationReason || "Not assessed",
    requirementCount: nis2Result?.applicableCount || 0,
    complianceGapCount,
    estimatedReadiness,
    priorityActions: buildNIS2PriorityActions(answers),
    incidentTimeline: buildIncidentTimeline(nis2Result ?? null),
  };

  // National Space Law section
  const nationalSpaceLaw = spaceLawResult
    ? {
        analyzedCount: spaceLawResult.jurisdictions.length,
        recommendedJurisdiction:
          spaceLawResult.jurisdictions.length > 0
            ? spaceLawResult.jurisdictions.sort(
                (a, b) => b.favorabilityScore - a.favorabilityScore,
              )[0]?.countryCode || null
            : null,
        recommendedJurisdictionName:
          spaceLawResult.jurisdictions.length > 0
            ? spaceLawResult.jurisdictions.sort(
                (a, b) => b.favorabilityScore - a.favorabilityScore,
              )[0]?.countryName || null
            : null,
        recommendationReason:
          spaceLawResult.recommendations[0] || "No recommendation available",
        topScores: spaceLawResult.jurisdictions
          .sort((a, b) => b.favorabilityScore - a.favorabilityScore)
          .map((j) => ({
            country: j.countryCode,
            name: j.countryName,
            score: j.favorabilityScore,
          })),
      }
    : {
        analyzedCount: 0,
        recommendedJurisdiction: null,
        recommendedJurisdictionName: null,
        recommendationReason: "No jurisdictions selected for comparison",
        topScores: [] as { country: string; name: string; score: number }[],
      };

  // Overall summary
  const totalRequirements =
    euSpaceAct.applicableArticleCount + (nis2Result?.applicableCount || 0);

  const riskResult = calculateOverallRisk(
    euSpaceAct.applies,
    euSpaceAct.regime,
    nis2Applies,
    nis2Classification,
    complianceGapCount,
    answers,
  );
  const overallRisk = riskResult.level;

  const estimatedMonths = calculateEstimatedMonths(
    euSpaceAct.applies,
    euSpaceAct.regime,
    nis2Applies,
    nis2Classification,
    nationalSpaceLaw.analyzedCount,
  );

  const immediateActions = [
    ...euSpaceAct.priorityActions.slice(0, 2),
    ...nis2Section.priorityActions.slice(0, 2),
  ].slice(0, 5);

  return {
    assessmentId: `unified-${Date.now()}`,
    completedAt: new Date().toISOString(),
    companySummary: {
      name: answers.companyName || null,
      establishment: answers.establishmentCountry || "Unknown",
      isEU,
      size: answers.entitySize || "Unknown",
      activities: (answers.activityTypes || []).map(
        (t) => ACTIVITY_TYPE_LABELS[t] || t,
      ),
      primaryService: answers.serviceTypes?.[0]
        ? SERVICE_TYPE_LABELS[
            answers.serviceTypes[0] as keyof typeof SERVICE_TYPE_LABELS
          ] || null
        : null,
    },
    euSpaceAct,
    nis2: nis2Section,
    nationalSpaceLaw,
    overallSummary: {
      totalRequirements,
      overallRisk,
      estimatedMonths,
      immediateActions,
    },
    crossFrameworkOverlap: buildCrossFrameworkOverlap(
      spaceActResult,
      nis2Result ?? null,
    ),
    confidenceScore: calculateConfidenceScore(answers),
  };
}

// ─── Helpers ───

function buildSpaceActPriorityActions(
  result: MergedSpaceActResult,
  answers: Partial<UnifiedAssessmentAnswers>,
): string[] {
  const actions: string[] = [];
  const activityTypes = answers.activityTypes || [];

  if (
    !answers.hasDebrisMitigationPlan &&
    (activityTypes.includes("SCO") || activityTypes.includes("LO"))
  ) {
    actions.push("Develop debris mitigation plan (Art. 55-60)");
  }
  if (activityTypes.includes("SCO") && !answers.operatesConstellation) {
    actions.push("Register spacecraft with competent authority");
  }
  if (
    (answers.operatesConstellation && answers.constellationSize === "large") ||
    answers.constellationSize === "mega"
  ) {
    actions.push("Submit constellation management plan");
  }

  const isEU = EU_MEMBER_STATES.includes(
    answers.establishmentCountry as (typeof EU_MEMBER_STATES)[number],
  );
  if (!isEU && (answers.servesEUCustomers || answers.providesServicesToEU)) {
    actions.push("Designate EU representative (Art. 12)");
  }

  return actions.slice(0, 5);
}

function buildNIS2PriorityActions(
  answers: Partial<UnifiedAssessmentAnswers>,
): string[] {
  const actions: string[] = [];

  if (!answers.hasIncidentResponsePlan) {
    actions.push("Establish incident response plan (24h/72h reporting)");
  }
  if (!answers.hasRiskManagement) {
    actions.push("Implement cybersecurity risk management (Art. 21)");
  }
  if (!answers.hasSupplyChainSecurity) {
    actions.push("Assess supply chain security (Art. 21(2)(d))");
  }
  if (!answers.hasBusinessContinuityPlan) {
    actions.push("Develop business continuity plan");
  }
  if (!answers.hasSecurityTraining) {
    actions.push("Implement security awareness training");
  }

  return actions.slice(0, 5);
}

// ─── Risk Scoring (gap severity weighted) ───

export const RISK_SCORING_CONFIG = {
  gapWeights: {
    cybersecurity_policy: { weight: 3, rationale: "Core NIS2 requirement" },
    incident_response: {
      weight: 3,
      rationale: "Legal obligation (24h/72h reporting)",
    },
    risk_management: {
      weight: 2.5,
      rationale: "Core NIS2 Art. 21 requirement",
    },
    supply_chain_security: {
      weight: 2,
      rationale: "NIS2 Art. 21(2)(d) + EU Space Act Art. 77",
    },
    debris_mitigation: { weight: 2, rationale: "EU Space Act mandatory" },
    spacecraft_registration: { weight: 2, rationale: "Legal prerequisite" },
    business_continuity: { weight: 1.5, rationale: "Operational resilience" },
    encryption: { weight: 1.5, rationale: "Data protection requirement" },
    access_control: { weight: 1.5, rationale: "Security baseline" },
    vulnerability_management: { weight: 1.5, rationale: "Ongoing security" },
    insurance_coverage: { weight: 1.5, rationale: "Financial compliance" },
    security_training: { weight: 1, rationale: "Awareness requirement" },
    penetration_testing: { weight: 1, rationale: "Verification practice" },
    environmental_footprint: { weight: 1, rationale: "Reporting obligation" },
    administrative_docs: { weight: 1, rationale: "Supporting documentation" },
  },
  thresholds: { critical: 12, high: 8, medium: 4 },
} as const;

export interface RiskResult {
  level: "low" | "medium" | "high" | "critical";
  weightedScore: number;
  gaps: Array<{ type: string; weight: number }>;
}

/**
 * Build the list of identified gaps and their weights from assessment answers.
 */
function buildGapsFromAnswers(
  answers: Partial<UnifiedAssessmentAnswers>,
): Array<{ type: string; weight: number }> {
  const gaps: Array<{ type: string; weight: number }> = [];
  const w = RISK_SCORING_CONFIG.gapWeights;

  if (answers.hasCybersecurityPolicy === false) {
    gaps.push({
      type: "cybersecurity_policy",
      weight: w.cybersecurity_policy.weight,
    });
  }
  if (answers.hasIncidentResponsePlan === false) {
    gaps.push({
      type: "incident_response",
      weight: w.incident_response.weight,
    });
  }
  if (answers.hasRiskManagement === false) {
    gaps.push({ type: "risk_management", weight: w.risk_management.weight });
  }
  if (answers.hasSupplyChainSecurity === false) {
    gaps.push({
      type: "supply_chain_security",
      weight: w.supply_chain_security.weight,
    });
  }
  if (answers.hasBusinessContinuityPlan === false) {
    gaps.push({
      type: "business_continuity",
      weight: w.business_continuity.weight,
    });
  }
  if (answers.hasEncryption === false) {
    gaps.push({ type: "encryption", weight: w.encryption.weight });
  }
  if (answers.hasAccessControl === false) {
    gaps.push({ type: "access_control", weight: w.access_control.weight });
  }
  if (answers.hasVulnerabilityManagement === false) {
    gaps.push({
      type: "vulnerability_management",
      weight: w.vulnerability_management.weight,
    });
  }
  if (answers.hasInsurance === false) {
    gaps.push({
      type: "insurance_coverage",
      weight: w.insurance_coverage.weight,
    });
  }
  if (answers.hasSecurityTraining === false) {
    gaps.push({
      type: "security_training",
      weight: w.security_training.weight,
    });
  }
  if (answers.conductsPenetrationTesting === false) {
    gaps.push({
      type: "penetration_testing",
      weight: w.penetration_testing.weight,
    });
  }
  // Space-specific gaps
  const activityTypes = answers.activityTypes || [];
  if (
    !answers.hasDebrisMitigationPlan &&
    (activityTypes.includes("SCO") || activityTypes.includes("LO"))
  ) {
    gaps.push({
      type: "debris_mitigation",
      weight: w.debris_mitigation.weight,
    });
  }

  return gaps;
}

export function calculateOverallRisk(
  spaceActApplies: boolean,
  spaceActRegime: string,
  nis2Applies: boolean,
  nis2Classification: string,
  complianceGapCount: number,
  answers?: Partial<UnifiedAssessmentAnswers>,
): RiskResult {
  // When neither framework applies, always low risk
  if (!spaceActApplies && !nis2Applies) {
    return { level: "low", weightedScore: 0, gaps: [] };
  }

  // Build weighted gaps from answers if provided, otherwise fall back to count-based
  const gaps = answers ? buildGapsFromAnswers(answers) : [];
  const weightedScore = gaps.reduce((sum, g) => sum + g.weight, 0);

  // Add regime/classification bonus to weighted score
  let adjustedScore = weightedScore;
  if (spaceActRegime === "standard" && nis2Classification === "essential") {
    adjustedScore += 4; // Both heavy frameworks = inherent risk increase
  }

  const { thresholds } = RISK_SCORING_CONFIG;
  let level: RiskResult["level"];

  if (gaps.length > 0 || answers) {
    // Use weighted scoring when we have answer-level detail
    if (adjustedScore >= thresholds.critical) {
      level = "critical";
    } else if (adjustedScore >= thresholds.high) {
      level = "high";
    } else if (adjustedScore >= thresholds.medium) {
      level = "medium";
    } else {
      level = "low";
    }
  } else {
    // Legacy fallback for callers without answers
    if (complianceGapCount >= 7) {
      level = "critical";
    } else if (complianceGapCount >= 4) {
      level = "high";
    } else if (
      spaceActRegime === "standard" &&
      nis2Classification === "essential"
    ) {
      level = "high";
    } else {
      level = "medium";
    }
  }

  return { level, weightedScore: adjustedScore, gaps };
}

function calculateEstimatedMonths(
  spaceActApplies: boolean,
  spaceActRegime: string,
  nis2Applies: boolean,
  nis2Classification: string,
  analyzedJurisdictions: number,
): number {
  let months = 0;
  if (spaceActApplies) months += spaceActRegime === "light" ? 6 : 12;
  if (nis2Applies) months += nis2Classification === "essential" ? 9 : 6;
  if (analyzedJurisdictions > 0) months += 3;
  return Math.min(24, months);
}
