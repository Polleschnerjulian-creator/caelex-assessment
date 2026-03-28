/**
 * Regulatory Credit Rating (RCR) Engine — Server Only
 *
 * Extends the Regulatory Readiness Score (RRS) engine to produce a
 * credit-style letter grade (AAA to D) with outlook, watch status,
 * peer benchmarking, and a full risk register.
 *
 * The RCR is the external-facing regulatory credit rating that
 * investors, insurers, and NCAs can consume. It wraps the internal
 * RRS with:
 *   - Fine-grained letter grades with +/- modifiers
 *   - Data completeness penalties
 *   - Cross-component correlation checks
 *   - Temporal decay on confidence
 *   - Regulatory event adjustments
 *   - Peer percentile benchmarking
 *   - Rating action detection (upgrade/downgrade/affirm)
 *   - Outlook derived from 90-day trajectory
 *
 * Methodology version: 1.0.0
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  computeRRS,
  getRRSHistory,
  getRRSMethodologyAppendix,
  type RRSResult,
} from "@/lib/rrs-engine.server";
import { subDays, subMonths, startOfQuarter, format } from "date-fns";

// ─── Constants ───

/**
 * Documented penalty and scoring configuration for the RCR engine.
 *
 * Each penalty includes a rationale explaining why the specific values
 * were chosen, enabling future auditors and maintainers to evaluate
 * and adjust parameters with full context.
 */
export const RCR_PENALTY_CONFIG = {
  incidents: {
    penaltyPer: 3,
    maxPenalty: 15,
    rationale:
      "Each unresolved incident signals active regulatory risk; capped to prevent single-dimension domination",
  },
  ncaSubmissions: {
    penaltyPer: 5,
    maxPenalty: 15,
    rationale:
      "Pending NCA submissions indicate incomplete authorization process",
  },
  temporalDecay: {
    thresholdDays: 180,
    ratePerMonth: 0.1,
    rationale: "10% per month reflects data staleness risk after 6 months",
  },
  validityDays: 90,
  methodologyVersion: "1.0.0",
} as const;

// ─── Types ───

export type RatingOutlook = "POSITIVE" | "STABLE" | "NEGATIVE" | "DEVELOPING";

export interface RCRResult {
  organizationId: string;
  grade: string;
  numericScore: number;
  outlook: RatingOutlook;
  onWatch: boolean;
  watchReason?: string;
  components: RCRComponentScore[];
  riskRegister: RCRRisk[];
  actionType: string;
  actionRationale?: string;
  previousGrade?: string;
  confidence: number;
  validUntil: Date;
  peerPercentile?: number;
  methodologyVersion: string;
  computedAt: Date;
}

export interface RCRComponentScore {
  component: string;
  weight: number;
  rawScore: number;
  adjustedScore: number;
  weightedScore: number;
  dataCompleteness: number;
  keyFindings: string[];
  risks: RCRRisk[];
}

export interface RCRRisk {
  id: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  likelihood: "VERY_LIKELY" | "LIKELY" | "POSSIBLE" | "UNLIKELY";
  mitigationStatus: "UNADDRESSED" | "IN_PROGRESS" | "MITIGATED";
  regulatoryReference: string;
}

export interface RCRMethodology {
  version: string;
  effectiveDate: string;
  gradingScale: Array<{
    grade: string;
    range: string;
    label: string;
    description: string;
  }>;
  components: Array<{
    name: string;
    weight: number;
    dataSources: string[];
    scoringFormula: string;
  }>;
  penalties: Array<{ name: string; description: string; impact: string }>;
  correlationChecks: Array<{ condition: string; adjustment: string }>;
  outlookCriteria: Record<string, string>;
  watchCriteria: string[];
  confidenceCalculation: string;
  peerBenchmarking: string;
}

// ─── Grade Taxonomy ───

interface GradeBand {
  grade: string;
  min: number;
  max: number;
  label: string;
}

const GRADE_BANDS: GradeBand[] = [
  { grade: "AAA", min: 95, max: 100, label: "Exemplary" },
  { grade: "AA", min: 85, max: 94, label: "Superior" },
  { grade: "A", min: 75, max: 84, label: "Strong" },
  { grade: "BBB", min: 65, max: 74, label: "Adequate" },
  { grade: "BB", min: 50, max: 64, label: "Developing" },
  { grade: "B", min: 35, max: 49, label: "Weak" },
  { grade: "CCC", min: 20, max: 34, label: "Critical" },
  { grade: "CC", min: 10, max: 19, label: "Distressed" },
  { grade: "D", min: 0, max: 9, label: "Default" },
];

// RRS component keys are all string-based
type RRSComponentKey = keyof RRSResult["components"] & string;

// Component keys as they appear in the RRS result, with display names and weights
const RCR_COMPONENTS: Array<{
  key: RRSComponentKey;
  name: string;
  weight: number;
}> = [
  {
    key: "authorizationReadiness",
    name: "Authorization Readiness",
    weight: 0.25,
  },
  { key: "cybersecurityPosture", name: "Cybersecurity Posture", weight: 0.2 },
  { key: "operationalCompliance", name: "Operational Compliance", weight: 0.2 },
  {
    key: "jurisdictionalCoverage",
    name: "Jurisdictional Coverage",
    weight: 0.15,
  },
  { key: "regulatoryTrajectory", name: "Regulatory Trajectory", weight: 0.1 },
  { key: "governanceProcess", name: "Governance & Process", weight: 0.1 },
];

// ─── Grade Mapping ───

/**
 * Map a numeric score (0-100) to a letter grade with +/- modifier.
 *
 * Within each grade band the range is divided into equal thirds:
 *   - Top third    → "+" modifier  (e.g. AA+)
 *   - Middle third → plain         (e.g. AA)
 *   - Bottom third → "-" modifier  (e.g. AA-)
 *
 * Exceptions:
 *   - AAA has no "+" (ceiling of the scale)
 *   - D has no "-"   (floor of the scale)
 */
export function mapScoreToGrade(score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  const band = GRADE_BANDS.find((b) => clamped >= b.min && clamped <= b.max);
  if (!band) return "D";

  const range = band.max - band.min + 1;
  const thirdSize = range / 3;
  const position = clamped - band.min;

  if (band.grade === "AAA") {
    // AAA has no + modifier
    if (position >= thirdSize * 2) return "AAA";
    if (position >= thirdSize) return "AAA";
    return "AAA-";
  }

  if (band.grade === "D") {
    // D has no - modifier
    if (position >= thirdSize * 2) return "D+";
    if (position >= thirdSize) return "D";
    return "D";
  }

  if (position >= thirdSize * 2) return `${band.grade}+`;
  if (position >= thirdSize) return band.grade;
  return `${band.grade}-`;
}

// ─── Outlook Computation ───

/**
 * Compute outlook from RRS trajectory snapshots over the last 90 days.
 *
 * - POSITIVE:   90d trend shows consistent improvement (>5 points up)
 * - STABLE:     90d trend is flat (within +/-5 points)
 * - NEGATIVE:   90d trend shows decline (>5 points down)
 * - DEVELOPING: Less than 30 days of data, or first rating
 */
export function computeOutlook(
  snapshots: Array<{ overallScore: number; snapshotDate: Date }>,
): RatingOutlook {
  if (snapshots.length < 2) return "DEVELOPING";

  const sorted = [...snapshots].sort(
    (a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime(),
  );

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  // Check if we have at least 30 days of data
  const earliest = sorted[0].snapshotDate;
  const daySpan = (now.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24);
  if (daySpan < 30) return "DEVELOPING";

  // Use snapshots within the 90-day window
  const ninetyDaysAgo = subDays(now, 90);
  const relevant = sorted.filter((s) => s.snapshotDate >= ninetyDaysAgo);
  if (relevant.length < 2) return "DEVELOPING";

  const firstScore = relevant[0].overallScore;
  const lastScore = relevant[relevant.length - 1].overallScore;
  const delta = lastScore - firstScore;

  if (delta > 5) return "POSITIVE";
  if (delta < -5) return "NEGATIVE";
  return "STABLE";
}

// ─── Data Completeness ───

/**
 * Estimate data completeness for an RRS component (0 to 1).
 *
 * If all factors have 0 earned points → completeness = 0.
 * Otherwise, completeness = proportion of factors that have any data.
 * If completeness < 0.5, the component score is capped at 40.
 */
function computeDataCompleteness(
  component: RRSResult["components"][keyof RRSResult["components"]],
): number {
  const factors = component.factors;
  if (factors.length === 0) return 0;

  const factorsWithData = factors.filter((f) => f.earnedPoints > 0).length;
  return factorsWithData / factors.length;
}

/**
 * Apply the data completeness penalty: if completeness < 0.5,
 * cap the component's score at 40.
 */
function applyCompletenessPenalty(
  rawScore: number,
  completeness: number,
): number {
  if (completeness < 0.5) {
    return Math.min(rawScore, 40);
  }
  return rawScore;
}

// ─── Cross-Component Correlation Checks ───

interface CorrelationAdjustment {
  component: string;
  deduction: number;
  reason: string;
}

/**
 * Sentinel value for rules that apply to any component scoring above 80,
 * excluding the component named in the condition itself.
 */
const ANY_ABOVE_80 = "__any_above_80__";

/**
 * Data-driven correlation rules that detect cross-component inconsistencies.
 *
 * Each rule defines a condition over component scores, a target component
 * (or sentinel for wildcard matching), and a documented rationale.
 */
export const RCR_CORRELATION_RULES = [
  {
    id: "cyber_auth_inconsistency",
    condition: (scores: Record<string, number>) =>
      scores.cybersecurityPosture < 50 && scores.authorizationReadiness > 80,
    adjustment: -5,
    component: "authorizationReadiness",
    rationale:
      "High auth readiness with poor cybersecurity indicates superficial compliance",
  },
  {
    id: "jurisdiction_ops_inconsistency",
    condition: (scores: Record<string, number>) =>
      scores.jurisdictionalCoverage < 30 && scores.operationalCompliance > 70,
    adjustment: -5,
    component: "operationalCompliance",
    rationale:
      "Operational score inconsistent with weak jurisdictional coverage",
  },
  {
    id: "governance_weakness",
    condition: (scores: Record<string, number>) =>
      scores.governanceProcess < 30,
    adjustment: -3,
    component: ANY_ABOVE_80,
    rationale: "Any high score is suspect when governance is weak (< 30)",
  },
];

/**
 * Apply cross-component correlation checks that flag inconsistencies
 * and deduct points where scores are logically contradictory.
 *
 * Iterates over RCR_CORRELATION_RULES; rules with the __any_above_80__
 * sentinel expand to every component scoring > 80 (excluding governance).
 */
function computeCorrelationAdjustments(
  scores: Record<string, number>,
): CorrelationAdjustment[] {
  const adjustments: CorrelationAdjustment[] = [];

  for (const rule of RCR_CORRELATION_RULES) {
    if (!rule.condition(scores)) continue;

    if (rule.component === ANY_ABOVE_80) {
      for (const [key, value] of Object.entries(scores)) {
        if (key !== "governanceProcess" && value > 80) {
          adjustments.push({
            component: key,
            deduction: Math.abs(rule.adjustment),
            reason: `${key} score of ${value} inconsistent with weak governance (< 30)`,
          });
        }
      }
    } else {
      adjustments.push({
        component: rule.component,
        deduction: Math.abs(rule.adjustment),
        reason: rule.rationale,
      });
    }
  }

  return adjustments;
}

// ─── Temporal Decay ───

/**
 * For each component, check if underlying assessments are older than 180 days.
 * If so, reduce confidence proportionally (10% per additional month beyond 180 days).
 * Returns a confidence factor between 0 and 1 for the component.
 */
function computeTemporalConfidence(
  componentLastAssessmentDate: Date | null,
  now: Date,
): number {
  if (!componentLastAssessmentDate) return 0.5; // No date means low baseline confidence

  const ageMs = now.getTime() - componentLastAssessmentDate.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= RCR_PENALTY_CONFIG.temporalDecay.thresholdDays) return 1.0;

  const additionalMonths =
    (ageDays - RCR_PENALTY_CONFIG.temporalDecay.thresholdDays) / 30;
  const decayFactor =
    1.0 - additionalMonths * RCR_PENALTY_CONFIG.temporalDecay.ratePerMonth;
  return Math.max(0.1, decayFactor); // Floor at 10%
}

// ─── Regulatory Event Adjustments ───

interface RegulatoryEventPenalty {
  type: "incident" | "nca_submission";
  count: number;
  deduction: number;
  description: string;
}

/**
 * Check for unresolved incidents and pending NCA submissions.
 * Returns the total deduction to apply to the numeric score
 * and the itemized penalties.
 */
async function computeRegulatoryEventPenalties(
  organizationId: string,
): Promise<{ totalDeduction: number; penalties: RegulatoryEventPenalty[] }> {
  const penalties: RegulatoryEventPenalty[] = [];

  // Get org member user IDs
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);

  if (userIds.length === 0) {
    return { totalDeduction: 0, penalties };
  }

  // Unresolved incidents
  const supervisionConfigs = await prisma.supervisionConfig.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const supervisionIds = supervisionConfigs.map((sc) => sc.id);

  if (supervisionIds.length > 0) {
    const unresolvedIncidents = await prisma.incident.count({
      where: {
        supervisionId: { in: supervisionIds },
        status: { notIn: ["resolved", "closed"] },
      },
    });

    if (unresolvedIncidents > 0) {
      const deduction = Math.min(
        unresolvedIncidents * RCR_PENALTY_CONFIG.incidents.penaltyPer,
        RCR_PENALTY_CONFIG.incidents.maxPenalty,
      );
      penalties.push({
        type: "incident",
        count: unresolvedIncidents,
        deduction,
        description: `${unresolvedIncidents} unresolved incident(s) — deduct ${deduction} points`,
      });
    }
  }

  // Pending NCA submissions (DRAFT or SUBMITTED, not yet RECEIVED/ACKNOWLEDGED)
  const pendingSubmissions = await prisma.nCASubmission.count({
    where: {
      userId: { in: userIds },
      status: { in: ["DRAFT", "SUBMITTED"] },
    },
  });

  if (pendingSubmissions > 0) {
    const deduction = Math.min(
      pendingSubmissions * RCR_PENALTY_CONFIG.ncaSubmissions.penaltyPer,
      RCR_PENALTY_CONFIG.ncaSubmissions.maxPenalty,
    );
    penalties.push({
      type: "nca_submission",
      count: pendingSubmissions,
      deduction,
      description: `${pendingSubmissions} pending NCA submission(s) — deduct ${deduction} points`,
    });
  }

  const totalDeduction = penalties.reduce((sum, p) => sum + p.deduction, 0);
  return { totalDeduction, penalties };
}

// ─── Watch Status Detection ───

interface WatchResult {
  onWatch: boolean;
  reason?: string;
}

/**
 * Determine if the rating should be placed on watch.
 * Criteria:
 *   1. Score changed > 10 points in last 30 days
 *   2. Any incident with status not in ["resolved","closed"] exists
 *   3. Authorization workflow changed status recently (last 30 days)
 */
async function computeWatchStatus(
  organizationId: string,
  currentScore: number,
): Promise<WatchResult> {
  const reasons: string[] = [];
  const thirtyDaysAgo = subDays(new Date(), 30);

  // 1. Check score volatility over 30 days
  const recentSnapshots = await prisma.rRSSnapshot.findMany({
    where: {
      organizationId,
      snapshotDate: { gte: thirtyDaysAgo },
    },
    orderBy: { snapshotDate: "asc" },
  });

  if (recentSnapshots.length >= 2) {
    const oldest = recentSnapshots[0].overallScore;
    const delta = Math.abs(currentScore - oldest);
    if (delta > 10) {
      reasons.push(`Score changed ${delta} points in 30 days (threshold: 10)`);
    }
  }

  // 2. Check for unresolved incidents
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);

  if (userIds.length > 0) {
    const supervisionConfigs = await prisma.supervisionConfig.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const supervisionIds = supervisionConfigs.map((sc) => sc.id);

    if (supervisionIds.length > 0) {
      const unresolvedCount = await prisma.incident.count({
        where: {
          supervisionId: { in: supervisionIds },
          status: { notIn: ["resolved", "closed"] },
        },
      });

      if (unresolvedCount > 0) {
        reasons.push(`${unresolvedCount} unresolved incident(s) remain open`);
      }
    }

    // 3. Check for recent authorization workflow status changes
    const recentWorkflowChanges = await prisma.authorizationWorkflow.findMany({
      where: {
        userId: { in: userIds },
        updatedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    if (recentWorkflowChanges.length > 0) {
      const statusChanges = recentWorkflowChanges.filter((w) => {
        // A workflow updated in the last 30 days with a non-terminal status
        // suggests active status changes
        return ["submitted", "under_review", "rejected"].includes(w.status);
      });

      if (statusChanges.length > 0) {
        reasons.push(
          `Authorization workflow status changed recently (${statusChanges[0].status})`,
        );
      }
    }
  }

  return {
    onWatch: reasons.length > 0,
    reason: reasons.length > 0 ? reasons.join("; ") : undefined,
  };
}

// ─── Peer Benchmarking ───

/**
 * Normal distribution CDF approximation using the Abramowitz and Stegun method.
 * Returns the probability that a standard normal variable is <= x.
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp((-absX * absX) / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Compute peer percentile by querying RCRBenchmark for the organization's
 * operator type and current quarter. Uses normal distribution approximation
 * with the cohort mean and standard deviation.
 */
async function computePeerPercentile(
  organizationId: string,
  numericScore: number,
): Promise<number | undefined> {
  // Get operator profile for type
  const profile = await prisma.operatorProfile.findUnique({
    where: { organizationId },
    select: { euOperatorCode: true },
  });

  if (!profile?.euOperatorCode) return undefined;

  // Determine current quarter
  const now = new Date();
  const quarterStart = startOfQuarter(now);
  const period = format(quarterStart, "yyyy-'Q'Q"); // e.g. "2026-Q1"

  const benchmark = await prisma.rCRBenchmark.findUnique({
    where: {
      operatorType_period: {
        operatorType: profile.euOperatorCode,
        period,
      },
    },
  });

  if (!benchmark || benchmark.stdDev === 0) return undefined;

  // Compute percentile using normal CDF
  const zScore = (numericScore - benchmark.meanScore) / benchmark.stdDev;
  const percentile = Math.round(normalCDF(zScore) * 100);

  return Math.max(0, Math.min(100, percentile));
}

// ─── Rating Action Detection ───

/**
 * Compare the new grade against the most recent RegulatoryCreditRating to
 * determine the rating action.
 *
 * Actions:
 *   INITIAL     — First rating ever
 *   UPGRADE     — New grade is higher
 *   DOWNGRADE   — New grade is lower
 *   AFFIRM      — Same grade
 *   WATCH_ON    — Score volatility > 10 in 30 days
 *   WATCH_OFF   — Previously on watch, now stable
 */
function gradeOrdinal(grade: string): number {
  // Strip modifier to get base grade, then use band order
  const base = grade.replace(/[+-]$/, "");
  const bandIndex = GRADE_BANDS.findIndex((b) => b.grade === base);
  if (bandIndex === -1) return -1;

  // Lower index = better grade, so invert for ordinal comparison
  // AAA(0) is best, D(8) is worst → ordinal = (8 - index) * 3 + modifier
  const baseOrdinal = (GRADE_BANDS.length - 1 - bandIndex) * 3;

  if (grade.endsWith("+")) return baseOrdinal + 2;
  if (grade.endsWith("-")) return baseOrdinal;
  return baseOrdinal + 1;
}

interface RatingActionResult {
  actionType: string;
  actionRationale: string;
  previousGrade?: string;
}

async function detectRatingAction(
  organizationId: string,
  newGrade: string,
  newScore: number,
  watchStatus: WatchResult,
): Promise<RatingActionResult> {
  const previous = await prisma.regulatoryCreditRating.findFirst({
    where: { organizationId },
    orderBy: { computedAt: "desc" },
  });

  // First rating
  if (!previous) {
    return {
      actionType: "INITIAL",
      actionRationale: `Initial regulatory credit rating assigned: ${newGrade}`,
    };
  }

  const prevGrade = previous.grade;
  const prevOrdinal = gradeOrdinal(prevGrade);
  const newOrdinal = gradeOrdinal(newGrade);

  // Watch transitions
  if (watchStatus.onWatch && !previous.onWatch) {
    return {
      actionType: "WATCH_ON",
      actionRationale: `Rating placed on watch: ${watchStatus.reason}`,
      previousGrade: prevGrade,
    };
  }

  if (!watchStatus.onWatch && previous.onWatch) {
    return {
      actionType: "WATCH_OFF",
      actionRationale: `Rating removed from watch. Conditions stabilized.`,
      previousGrade: prevGrade,
    };
  }

  // Grade movement
  if (newOrdinal > prevOrdinal) {
    return {
      actionType: "UPGRADE",
      actionRationale: `Rating upgraded from ${prevGrade} to ${newGrade} (+${newOrdinal - prevOrdinal} ordinal steps)`,
      previousGrade: prevGrade,
    };
  }

  if (newOrdinal < prevOrdinal) {
    return {
      actionType: "DOWNGRADE",
      actionRationale: `Rating downgraded from ${prevGrade} to ${newGrade} (${newOrdinal - prevOrdinal} ordinal steps)`,
      previousGrade: prevGrade,
    };
  }

  return {
    actionType: "AFFIRM",
    actionRationale: `Rating affirmed at ${newGrade}. No material change.`,
    previousGrade: prevGrade,
  };
}

// ─── Risk Register Construction ───

/**
 * Build the risk register from RRS component data, regulatory events,
 * and correlation findings.
 */
function buildRiskRegister(
  rrsResult: RRSResult,
  correlationAdjustments: CorrelationAdjustment[],
  regulatoryPenalties: RegulatoryEventPenalty[],
): RCRRisk[] {
  const risks: RCRRisk[] = [];
  let riskIndex = 0;

  // Component-level risks from low-scoring factors
  for (const comp of RCR_COMPONENTS) {
    const component = rrsResult.components[comp.key];
    for (const factor of component.factors) {
      const pctEarned =
        factor.maxPoints > 0 ? factor.earnedPoints / factor.maxPoints : 0;

      if (pctEarned < 0.25) {
        riskIndex++;
        risks.push({
          id: `RCR-RISK-${String(riskIndex).padStart(3, "0")}`,
          description: `${factor.name}: ${factor.earnedPoints}/${factor.maxPoints} points earned (${Math.round(pctEarned * 100)}% completion)`,
          severity: pctEarned === 0 ? "CRITICAL" : "HIGH",
          likelihood: pctEarned === 0 ? "VERY_LIKELY" : "LIKELY",
          mitigationStatus: pctEarned === 0 ? "UNADDRESSED" : "IN_PROGRESS",
          regulatoryReference: mapFactorToRegRef(factor.id),
        });
      } else if (pctEarned < 0.5) {
        riskIndex++;
        risks.push({
          id: `RCR-RISK-${String(riskIndex).padStart(3, "0")}`,
          description: `${factor.name}: Partial completion at ${Math.round(pctEarned * 100)}%`,
          severity: "MEDIUM",
          likelihood: "POSSIBLE",
          mitigationStatus: "IN_PROGRESS",
          regulatoryReference: mapFactorToRegRef(factor.id),
        });
      }
    }
  }

  // Correlation inconsistency risks
  for (const adj of correlationAdjustments) {
    riskIndex++;
    risks.push({
      id: `RCR-RISK-${String(riskIndex).padStart(3, "0")}`,
      description: `Cross-component inconsistency: ${adj.reason}`,
      severity: "MEDIUM",
      likelihood: "LIKELY",
      mitigationStatus: "UNADDRESSED",
      regulatoryReference:
        "EU Space Act Art. 4 — Integrated compliance requirement",
    });
  }

  // Regulatory event risks
  for (const penalty of regulatoryPenalties) {
    riskIndex++;
    risks.push({
      id: `RCR-RISK-${String(riskIndex).padStart(3, "0")}`,
      description: penalty.description,
      severity: penalty.type === "incident" ? "HIGH" : "MEDIUM",
      likelihood: "VERY_LIKELY",
      mitigationStatus: "UNADDRESSED",
      regulatoryReference:
        penalty.type === "incident"
          ? "NIS2 Art. 23 — Incident reporting obligations"
          : "EU Space Act Art. 11 — NCA notification requirements",
    });
  }

  return risks;
}

/**
 * Map a factor ID to its regulatory reference string.
 */
function mapFactorToRegRef(factorId: string): string {
  const refMap: Record<string, string> = {
    auth_workflow: "EU Space Act Art. 5-7 — Authorization procedure",
    auth_documents: "EU Space Act Art. 8 — Documentation requirements",
    auth_articles: "EU Space Act Art. 4-119 — Article compliance",
    cyber_assessment:
      "NIS2 Art. 21(2)(a) — Risk analysis and information system security",
    cyber_nis2:
      "NIS2 Directive (EU) 2022/2555 — Network and information security",
    cyber_ir: "NIS2 Art. 21(2)(b) — Incident handling",
    cyber_track: "NIS2 Art. 23 — Incident reporting to CSIRT/NCA",
    ops_debris: "EU Space Act Art. 15 — Space debris mitigation",
    ops_environmental:
      "EU Space Act Art. 16 — Environmental footprint declaration",
    ops_insurance: "EU Space Act Art. 17 — Third-party liability insurance",
    ops_supervision: "EU Space Act Art. 11 — NCA supervision and reporting",
    juris_profile: "EU Space Act Art. 3 — Operator classification",
    juris_primary: "EU Space Act Art. 4 — Jurisdiction determination",
    juris_multi: "EU Space Act Art. 4(2) — Multi-jurisdictional operations",
    traj_trend: "Internal — Regulatory compliance trajectory",
    traj_activity: "Internal — Compliance activity monitoring",
    gov_audit: "EU Space Act Art. 12 — Record-keeping and audit trail",
    gov_documents: "EU Space Act Art. 8 — Regulatory document management",
    gov_evidence: "EU Space Act Art. 12(3) — Compliance evidence retention",
  };

  return refMap[factorId] ?? "EU Space Act — General compliance requirement";
}

// ─── Key Findings Generation ───

/**
 * Generate key findings for a component based on its factor scores.
 */
function generateKeyFindings(
  component: RRSResult["components"][keyof RRSResult["components"]],
  componentName: string,
): string[] {
  const findings: string[] = [];
  const totalMax = component.factors.reduce((s, f) => s + f.maxPoints, 0);
  const totalEarned = component.factors.reduce((s, f) => s + f.earnedPoints, 0);

  if (totalMax === 0) {
    findings.push(`${componentName}: No assessment data available`);
    return findings;
  }

  const pct = totalEarned / totalMax;

  if (pct >= 0.9) {
    findings.push(
      `${componentName} is strong with ${Math.round(pct * 100)}% factor completion`,
    );
  } else if (pct >= 0.7) {
    findings.push(`${componentName} is adequate but has improvement areas`);
  } else if (pct >= 0.4) {
    findings.push(
      `${componentName} shows significant gaps requiring attention`,
    );
  } else {
    findings.push(
      `${componentName} is critically deficient — immediate action required`,
    );
  }

  // Identify weakest factors
  const weakFactors = component.factors
    .filter((f) => f.maxPoints > 0 && f.earnedPoints / f.maxPoints < 0.5)
    .sort(
      (a, b) => a.earnedPoints / a.maxPoints - b.earnedPoints / b.maxPoints,
    );

  for (const wf of weakFactors.slice(0, 2)) {
    findings.push(
      `Weak area: ${wf.name} (${wf.earnedPoints}/${wf.maxPoints} pts)`,
    );
  }

  // Identify strongest factors
  const strongFactors = component.factors
    .filter((f) => f.maxPoints > 0 && f.earnedPoints / f.maxPoints >= 0.9)
    .sort(
      (a, b) => b.earnedPoints / b.maxPoints - a.earnedPoints / a.maxPoints,
    );

  for (const sf of strongFactors.slice(0, 1)) {
    findings.push(
      `Strength: ${sf.name} (${sf.earnedPoints}/${sf.maxPoints} pts)`,
    );
  }

  return findings;
}

// ─── Main Computation ───

/**
 * Compute the Regulatory Credit Rating for an organization.
 *
 * Pipeline:
 *   1. Compute RRS (base numeric score and component breakdown)
 *   2. Estimate data completeness per component; apply penalty if < 50%
 *   3. Apply cross-component correlation checks
 *   4. Compute regulatory event adjustments (incidents, NCA submissions)
 *   5. Derive final numeric score (clamped 0-100)
 *   6. Map score to letter grade with +/- modifier
 *   7. Compute outlook from 90-day trajectory
 *   8. Determine watch status
 *   9. Detect rating action (upgrade/downgrade/affirm/etc.)
 *  10. Compute peer percentile
 *  11. Compute temporal confidence
 *  12. Build risk register
 */
export async function computeRCR(organizationId: string): Promise<RCRResult> {
  const now = new Date();

  // Step 1: Compute base RRS
  const rrsResult = await computeRRS(organizationId);

  // Step 2: Data completeness per component
  const rawComponentScores: Record<string, number> = {};
  const completenessMap: Record<string, number> = {};
  const adjustedComponentScores: Record<string, number> = {};

  for (const comp of RCR_COMPONENTS) {
    const rrsComp = rrsResult.components[comp.key];
    const completeness = computeDataCompleteness(rrsComp);
    const adjustedScore = applyCompletenessPenalty(rrsComp.score, completeness);

    rawComponentScores[comp.key] = rrsComp.score;
    completenessMap[comp.key] = completeness;
    adjustedComponentScores[comp.key] = adjustedScore;
  }

  // Step 3: Cross-component correlation checks
  const correlationAdjustments = computeCorrelationAdjustments(
    adjustedComponentScores,
  );

  for (const adj of correlationAdjustments) {
    adjustedComponentScores[adj.component] = Math.max(
      0,
      adjustedComponentScores[adj.component] - adj.deduction,
    );
  }

  // Step 4: Regulatory event adjustments
  const {
    totalDeduction: regulatoryDeduction,
    penalties: regulatoryPenalties,
  } = await computeRegulatoryEventPenalties(organizationId);

  // Step 5: Compute final weighted score
  let weightedSum = 0;
  for (const comp of RCR_COMPONENTS) {
    weightedSum += adjustedComponentScores[comp.key] * comp.weight;
  }

  const scoreBeforePenalties = Math.round(weightedSum);
  const numericScore = Math.max(
    0,
    Math.min(100, scoreBeforePenalties - regulatoryDeduction),
  );

  // Step 6: Map to letter grade
  const grade = mapScoreToGrade(numericScore);

  // Step 7: Compute outlook from 90-day snapshots
  const history = await getRRSHistory(organizationId, 90);
  const outlookSnapshots = history.map((h) => ({
    overallScore: h.overallScore,
    snapshotDate: h.date,
  }));
  const outlook = computeOutlook(outlookSnapshots);

  // Step 8: Watch status
  const watchStatus = await computeWatchStatus(organizationId, numericScore);

  // Step 9: Rating action detection
  const ratingAction = await detectRatingAction(
    organizationId,
    grade,
    numericScore,
    watchStatus,
  );

  // Step 10: Peer benchmarking
  const peerPercentile = await computePeerPercentile(
    organizationId,
    numericScore,
  );

  // Step 11: Temporal confidence
  // Estimate last assessment date per component from RRS computation timestamp
  // For a more accurate implementation, each component would track its own
  // assessment dates. Here we use the RRS computation date as a baseline
  // and reduce confidence for components with zero data.
  const componentConfidences: number[] = [];
  for (const comp of RCR_COMPONENTS) {
    const completeness = completenessMap[comp.key];
    if (completeness === 0) {
      componentConfidences.push(0.1);
    } else {
      // Use RRS computedAt as assessment date proxy; in production, each
      // assessment model would supply its own updatedAt.
      const confidence = computeTemporalConfidence(rrsResult.computedAt, now);
      componentConfidences.push(confidence * completeness);
    }
  }

  const overallConfidence =
    componentConfidences.length > 0
      ? componentConfidences.reduce((a, b) => a + b, 0) /
        componentConfidences.length
      : 0;

  // Step 12: Build component detail and risk register
  const rcrComponents: RCRComponentScore[] = RCR_COMPONENTS.map((comp, idx) => {
    const rrsComp = rrsResult.components[comp.key];
    const adjusted = adjustedComponentScores[comp.key];
    const completeness = completenessMap[comp.key];
    const weighted = Math.round(adjusted * comp.weight);
    const keyFindings = generateKeyFindings(rrsComp, comp.name);

    // Build per-component risks
    const componentRisks: RCRRisk[] = [];
    let riskIdx = 0;
    for (const factor of rrsComp.factors) {
      const pctEarned =
        factor.maxPoints > 0 ? factor.earnedPoints / factor.maxPoints : 0;
      if (pctEarned < 0.5) {
        riskIdx++;
        componentRisks.push({
          id: `${comp.key}-RISK-${riskIdx}`,
          description: `${factor.name}: ${Math.round(pctEarned * 100)}% completion`,
          severity: pctEarned < 0.25 ? "HIGH" : "MEDIUM",
          likelihood: pctEarned === 0 ? "VERY_LIKELY" : "POSSIBLE",
          mitigationStatus: pctEarned === 0 ? "UNADDRESSED" : "IN_PROGRESS",
          regulatoryReference: mapFactorToRegRef(factor.id),
        });
      }
    }

    return {
      component: comp.name,
      weight: comp.weight,
      rawScore: rawComponentScores[comp.key],
      adjustedScore: adjusted,
      weightedScore: weighted,
      dataCompleteness: Math.round(completeness * 100) / 100,
      keyFindings,
      risks: componentRisks,
    };
  });

  const riskRegister = buildRiskRegister(
    rrsResult,
    correlationAdjustments,
    regulatoryPenalties,
  );

  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + RCR_PENALTY_CONFIG.validityDays);

  return {
    organizationId,
    grade,
    numericScore,
    outlook,
    onWatch: watchStatus.onWatch,
    watchReason: watchStatus.reason,
    components: rcrComponents,
    riskRegister,
    actionType: ratingAction.actionType,
    actionRationale: ratingAction.actionRationale,
    previousGrade: ratingAction.previousGrade,
    confidence: Math.round(overallConfidence * 100) / 100,
    validUntil,
    peerPercentile,
    methodologyVersion: RCR_PENALTY_CONFIG.methodologyVersion,
    computedAt: now,
  };
}

// ─── Persistence ───

/**
 * Compute and persist the RCR to the database.
 * Also triggers the underlying RRS save for snapshot continuity.
 */
export async function computeAndSaveRCR(
  organizationId: string,
): Promise<RCRResult> {
  const result = await computeRCR(organizationId);

  await prisma.regulatoryCreditRating.create({
    data: {
      organizationId,
      grade: result.grade,
      previousGrade: result.previousGrade,
      numericScore: result.numericScore,
      outlook: result.outlook,
      onWatch: result.onWatch,
      watchReason: result.watchReason,
      methodologyVersion: result.methodologyVersion,
      confidence: result.confidence,
      validUntil: result.validUntil,
      componentScores: structuredClone(result.components),
      riskRegister: structuredClone(result.riskRegister),
      peerPercentile: result.peerPercentile,
      actionType: result.actionType as
        | "INITIAL"
        | "AFFIRM"
        | "UPGRADE"
        | "DOWNGRADE"
        | "WATCH_ON"
        | "WATCH_OFF"
        | "WITHDRAWN",
      actionRationale: result.actionRationale,
      computedAt: result.computedAt,
      isPublished: false,
    },
  });

  return result;
}

/**
 * Publish a rating, making it visible to external consumers.
 * Sets isPublished = true and records the publish timestamp.
 */
export async function publishRating(ratingId: string): Promise<void> {
  await prisma.regulatoryCreditRating.update({
    where: { id: ratingId },
    data: {
      isPublished: true,
      publishedAt: new Date(),
    },
  });
}

/**
 * Get the most recent RegulatoryCreditRating for an organization,
 * or null if no rating has been computed yet.
 */
export async function getCurrentRating(organizationId: string) {
  return prisma.regulatoryCreditRating.findFirst({
    where: { organizationId },
    orderBy: { computedAt: "desc" },
  });
}

/**
 * Get all historical ratings for an organization, ordered by
 * computation date descending (most recent first).
 */
export async function getRatingHistory(organizationId: string) {
  return prisma.regulatoryCreditRating.findMany({
    where: { organizationId },
    orderBy: { computedAt: "desc" },
  });
}

// ─── Methodology Document ───

/**
 * Return the complete RCR methodology document describing the rating
 * framework, formulas, penalties, and peer benchmarking approach.
 */
export function getRCRMethodologyDocument(): RCRMethodology {
  return {
    version: RCR_PENALTY_CONFIG.methodologyVersion,
    effectiveDate: "2026-01-01",
    gradingScale: [
      {
        grade: "AAA",
        range: "95-100",
        label: "Exemplary",
        description:
          "Full compliance across all EU Space Act and NIS2 requirements. " +
          "Robust governance, complete documentation, active supervision engagement. " +
          "Highest confidence in regulatory standing. Modifier: no + (ceiling).",
      },
      {
        grade: "AA",
        range: "85-94",
        label: "Superior",
        description:
          "Near-complete compliance with minor gaps. Strong cybersecurity posture, " +
          "comprehensive authorization documentation, active debris mitigation. " +
          "Modifiers: AA+ (91-94), AA (88-90), AA- (85-87).",
      },
      {
        grade: "A",
        range: "75-84",
        label: "Strong",
        description:
          "Solid compliance foundation with identifiable improvement areas. " +
          "Core obligations met, some secondary requirements pending. " +
          "Modifiers: A+ (82-84), A (78-81), A- (75-77).",
      },
      {
        grade: "BBB",
        range: "65-74",
        label: "Adequate",
        description:
          "Minimum viable compliance achieved. Key authorizations in progress, " +
          "cybersecurity framework established but not fully mature. " +
          "Modifiers: BBB+ (72-74), BBB (68-71), BBB- (65-67).",
      },
      {
        grade: "BB",
        range: "50-64",
        label: "Developing",
        description:
          "Compliance program in early-to-mid stages. Significant gaps in one or more " +
          "critical areas. Active remediation expected. " +
          "Modifiers: BB+ (60-64), BB (55-59), BB- (50-54).",
      },
      {
        grade: "B",
        range: "35-49",
        label: "Weak",
        description:
          "Material compliance deficiencies across multiple domains. " +
          "Authorization process incomplete, cybersecurity posture below NIS2 baseline. " +
          "Modifiers: B+ (45-49), B (40-44), B- (35-39).",
      },
      {
        grade: "CCC",
        range: "20-34",
        label: "Critical",
        description:
          "Severe compliance failures. Regulatory action likely without immediate remediation. " +
          "Multiple unresolved incidents or complete absence of key frameworks. " +
          "Modifiers: CCC+ (30-34), CCC (25-29), CCC- (20-24).",
      },
      {
        grade: "CC",
        range: "10-19",
        label: "Distressed",
        description:
          "Regulatory standing severely compromised. Possible enforcement actions pending. " +
          "Minimal compliance infrastructure in place. " +
          "Modifiers: CC+ (17-19), CC (13-16), CC- (10-12).",
      },
      {
        grade: "D",
        range: "0-9",
        label: "Default",
        description:
          "Regulatory default — no meaningful compliance program. " +
          "Organization is non-compliant with fundamental EU Space Act obligations. " +
          "Modifier: D+ (7-9), D (3-6), no D- (floor).",
      },
    ],
    components: [
      {
        name: "Authorization Readiness",
        weight: 0.25,
        dataSources: [
          "AuthorizationWorkflow (status, documents)",
          "ArticleStatus (per-article compliance tracking)",
        ],
        scoringFormula:
          "Sum of factor scores (workflow_status[40] + doc_completeness[35] + article_coverage[25]) " +
          "normalized to 0-100. Workflow status points: approved=40, submitted=30, ready=25, " +
          "in_progress=15, draft=5. Doc completeness = ready_docs/total_docs * 35. " +
          "Article coverage = compliant_articles/tracked_articles * 25.",
      },
      {
        name: "Cybersecurity Posture",
        weight: 0.2,
        dataSources: [
          "CybersecurityAssessment (framework, maturity score)",
          "NIS2Assessment (classification, measures)",
          "Incident (cyber_incident category)",
        ],
        scoringFormula:
          "Sum of factor scores (risk_assessment[35] + nis2_compliance[30] + " +
          "ir_capability[20] + track_record[15]) normalized to 0-100. " +
          "Risk assessment: 35 if framework generated, 15 if assessment exists. " +
          "NIS2: 20 base + min(10, maturityScore/10). " +
          "IR: 20 if incident response plan exists. " +
          "Track record: 15 - (unresolved_incidents * 5), min 0.",
      },
      {
        name: "Operational Compliance",
        weight: 0.2,
        dataSources: [
          "DebrisAssessment (plan status)",
          "EnvironmentalAssessment (EFD status)",
          "InsuranceAssessment (active policies)",
          "SupervisionConfig (NCA reporting)",
        ],
        scoringFormula:
          "Sum of factor scores (debris[30] + environmental[20] + insurance[25] + " +
          "supervision[25]) normalized to 0-100. Debris: 30 if plan generated, 15 if started. " +
          "Environmental: 20 if submitted/approved, 10 if assessed. " +
          "Insurance: 25 if active policy, 15 if report generated, 5 if assessed. " +
          "Supervision: 25 if configured.",
      },
      {
        name: "Jurisdictional Coverage",
        weight: 0.15,
        dataSources: [
          "OperatorProfile (type, jurisdiction, completeness)",
          "UKSpaceAssessment (national law coverage)",
        ],
        scoringFormula:
          "Sum of factor scores (profile[40] + primary_jurisdiction[30] + " +
          "multi_jurisdiction[30]) normalized to 0-100. Profile: completeness * 40. " +
          "Primary: 30 if establishment set. Multi: min(1, assessments/jurisdictions) * 30.",
      },
      {
        name: "Regulatory Trajectory",
        weight: 0.1,
        dataSources: [
          "RRSSnapshot (historical scores, 90d window)",
          "AuditLog (compliance activity count)",
        ],
        scoringFormula:
          "Sum of factor scores (trend[50] + activity[50]) normalized to 0-100. " +
          "Trend: 50 if >=10pt improvement, 40 if >=5pt, 35 if >0, 25 if flat, " +
          "15 if <0 and >-5, 5 if <=-5. Activity: 50 if >=100 actions, 30 if >=50, " +
          "15 if >=10, 5 if >0.",
      },
      {
        name: "Governance & Process",
        weight: 0.1,
        dataSources: [
          "AuditLog (trail completeness)",
          "Document (vault population)",
          "ComplianceEvidence (evidence management)",
        ],
        scoringFormula:
          "Sum of factor scores (audit[35] + documents[35] + evidence[30]) normalized to 0-100. " +
          "Audit: 35 if >=500 entries, 25 if >=100, 15 if >=20, 5 if >0. " +
          "Documents: 35 if >=20, 25 if >=10, 15 if >=5, 5 if >0. " +
          "Evidence: 30 if >=20, 20 if >=10, 10 if >=3, 5 if >0.",
      },
    ],
    penalties: [
      {
        name: "Data Completeness Penalty",
        description:
          "For each RRS component, data completeness is estimated as the proportion of " +
          "factors with any earned points. If completeness < 0.5 (fewer than half the factors " +
          "have data), the component score is capped at 40 regardless of individual factor values.",
        impact:
          "Component score capped at 40 when data completeness < 50%. " +
          "This prevents inflated scores from partial assessments.",
      },
      {
        name: "Unresolved Incident Penalty",
        description:
          "Each unresolved incident (status not in [resolved, closed]) incurs a 3-point " +
          "deduction from the final numeric score, applied after weighted aggregation.",
        impact: `${RCR_PENALTY_CONFIG.incidents.penaltyPer} points per incident, max ${RCR_PENALTY_CONFIG.incidents.maxPenalty} total`,
      },
      {
        name: "Pending NCA Submission Penalty",
        description:
          "Each NCA submission in DRAFT or SUBMITTED status (not yet RECEIVED/ACKNOWLEDGED) " +
          "incurs a 5-point deduction from the final numeric score.",
        impact: `${RCR_PENALTY_CONFIG.ncaSubmissions.penaltyPer} points per submission, max ${RCR_PENALTY_CONFIG.ncaSubmissions.maxPenalty} total`,
      },
    ],
    correlationChecks: [
      {
        condition:
          "Cybersecurity Posture < 50 AND Authorization Readiness > 80",
        adjustment:
          "Deduct 5 points from Authorization Readiness. Rationale: a weak cybersecurity " +
          "posture undermines the credibility of a high authorization score (NIS2 Art. 21 cross-dependency).",
      },
      {
        condition:
          "Jurisdictional Coverage < 30 AND Operational Compliance > 70",
        adjustment:
          "Deduct 5 points from Operational Compliance. Rationale: weak jurisdictional " +
          "coverage creates multi-jurisdiction risk that operational compliance cannot fully mitigate.",
      },
      {
        condition: "Governance & Process < 30 AND any other component > 80",
        adjustment:
          "Deduct 3 points from each component scoring > 80. Rationale: weak governance " +
          "undermines confidence in all other high-scoring components due to insufficient " +
          "audit trails and evidence management.",
      },
    ],
    outlookCriteria: {
      POSITIVE:
        "90-day RRS trend shows consistent improvement of more than 5 points upward. " +
        "Computed from the delta between the earliest and latest snapshots in the 90-day window.",
      STABLE:
        "90-day RRS trend is flat, with the score delta within +/-5 points. " +
        "Indicates steady-state compliance without material change.",
      NEGATIVE:
        "90-day RRS trend shows decline of more than 5 points downward. " +
        "Signals deteriorating compliance posture requiring attention.",
      DEVELOPING:
        "Less than 30 days of historical data available, or this is the first rating. " +
        "Insufficient trend data to determine directional outlook.",
    },
    watchCriteria: [
      "Score changed more than 10 points in the last 30 days (high volatility)",
      "One or more incidents with status not in [resolved, closed] remain open",
      "Authorization workflow status changed within the last 30 days to a non-terminal state " +
        "(submitted, under_review, or rejected)",
    ],
    confidenceCalculation:
      "Confidence is the mean of per-component confidence factors. Each component's confidence " +
      "is: (temporal_decay_factor * data_completeness). Temporal decay starts at 1.0 for " +
      "assessments within 180 days, then decreases by 10% per additional month (floor 0.1). " +
      "Data completeness = proportion of factors with non-zero earned points. " +
      "Components with zero data completeness receive a confidence floor of 0.1. " +
      "Final confidence is rounded to 2 decimal places and expressed as 0.0-1.0.",
    peerBenchmarking:
      "Percentile is computed by querying the RCRBenchmark table for the organization's " +
      "operator type (from OperatorProfile.euOperatorCode) and the current quarter (e.g. 2026-Q1). " +
      "The z-score is calculated as (numericScore - meanScore) / stdDev, then converted to a " +
      "percentile using the normal distribution CDF (Abramowitz-Stegun approximation). " +
      "Result is clamped to 0-100 and rounded to the nearest integer. " +
      "Returns undefined if no benchmark data exists for the operator type/quarter.",
  };
}
