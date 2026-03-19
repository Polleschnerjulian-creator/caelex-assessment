/**
 * Shield — Compliance Intelligence Engine
 *
 * The layer that makes Shield more than a CDM viewer. For every conjunction
 * event, this engine answers:
 *   1. Which NCAs must be notified, by when, in what format?
 *   2. What are the compliance implications of each decision option?
 *   3. How does a maneuver affect other compliance dimensions?
 *   4. What is the full compliance timeline with deadlines?
 *
 * This is Shield's moat — no tracking provider (LeoLabs, Space-Track, ESA SST)
 * has this knowledge. They tell you "Pc = 1.2e-4". We tell you "CNES requires
 * notification within 72h under RT Art. 13, maneuver expected per LOS/FSOA,
 * and if you accept risk you need written justification per CNES protocol."
 */
import "server-only";

import {
  evaluateThresholds,
  computeDeadlines,
  getStrictestThresholds,
  getNCAProfiles,
  type ThresholdViolation,
  type ComplianceDeadline,
  type NCAThresholdProfile,
} from "./nca-thresholds.server";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComplianceAssessment {
  /** Overall compliance risk level for this event */
  complianceRisk: "critical" | "high" | "medium" | "low";

  /** Threshold violations across all relevant jurisdictions */
  violations: ThresholdViolation[];

  /** All compliance deadlines, sorted by urgency */
  deadlines: ComplianceDeadline[];

  /** NCA-specific reporting requirements */
  reportingRequirements: NCAReportingRequirement[];

  /** Impact assessment for each possible decision */
  decisionImpacts: DecisionImpact[];

  /** Strictest thresholds across all jurisdictions */
  strictestThresholds: {
    reportingPcThreshold: number;
    reportingMissDistanceThreshold: number;
    maneuverExpectedPcThreshold: number;
    strictestJurisdiction: string;
  };

  /** Summary for display */
  summary: string;
}

export interface NCAReportingRequirement {
  jurisdiction: string;
  authority: string;
  isTriggered: boolean;
  triggerReason: string | null;
  deadlineAt: Date | null;
  hoursRemaining: number | null;
  isOverdue: boolean;
  reportFormat: string;
  requiredFields: string[];
  legalBasis: string;
  status: "pending" | "due_soon" | "overdue" | "not_required" | "completed";
}

export interface DecisionImpact {
  decision: "MANEUVER" | "ACCEPT_RISK" | "MONITOR" | "COORDINATE";
  complianceImplications: string[];
  ncaRequirements: string[];
  riskLevel: "low" | "medium" | "high";
  recommendedFor: string;
}

export interface ManeuverComplianceImpact {
  /** Fuel consumption and its compliance implications */
  fuelImpact: {
    estimatedDeltaV: number | null;
    passivationBudgetAffected: boolean;
    eolDisposalBudgetAffected: boolean;
    description: string;
  };

  /** Orbital lifetime impact */
  orbitalLifetimeImpact: {
    changeDirection: "increase" | "decrease" | "negligible";
    twentyFiveYearRuleStatus: "compliant" | "at_risk" | "unknown";
    description: string;
  };

  /** Post-maneuver compliance actions required */
  requiredActions: Array<{
    action: string;
    deadline: string;
    jurisdiction: string;
    legalBasis: string;
  }>;
}

export interface ComplianceTimeline {
  events: Array<{
    timestamp: Date;
    type: "deadline" | "action_required" | "notification" | "milestone";
    title: string;
    description: string;
    jurisdiction: string | null;
    urgency: "critical" | "high" | "medium" | "low";
    completed: boolean;
  }>;
}

// ─── Core Assessment ────────────────────────────────────────────────────────

/** Run full compliance assessment for a conjunction event */
export function assessCompliance(params: {
  pc: number;
  missDistance: number;
  tca: Date;
  jurisdictions: string[];
  currentDecision?: string | null;
  ncaNotified?: boolean;
  reportGenerated?: boolean;
}): ComplianceAssessment {
  const {
    pc,
    missDistance,
    tca,
    jurisdictions,
    currentDecision,
    ncaNotified,
    reportGenerated,
  } = params;

  // 1. Evaluate threshold violations
  const violations = evaluateThresholds({ pc, missDistance, jurisdictions });

  // 2. Compute deadlines
  const deadlines = computeDeadlines({ tca, jurisdictions });

  // 3. Get strictest thresholds
  const strictest = getStrictestThresholds(jurisdictions);

  // 4. Build NCA reporting requirements
  const reportingRequirements = buildReportingRequirements({
    pc,
    missDistance,
    tca,
    jurisdictions,
    ncaNotified: ncaNotified ?? false,
    reportGenerated: reportGenerated ?? false,
  });

  // 5. Assess decision impacts
  const decisionImpacts = assessDecisionImpacts({
    pc,
    missDistance,
    jurisdictions,
    violations,
  });

  // 6. Determine overall compliance risk
  const complianceRisk = determineComplianceRisk(violations, deadlines);

  // 7. Generate summary
  const summary = generateSummary(
    violations,
    deadlines,
    reportingRequirements,
    complianceRisk,
  );

  return {
    complianceRisk,
    violations,
    deadlines,
    reportingRequirements,
    decisionImpacts,
    strictestThresholds: strictest,
    summary,
  };
}

// ─── NCA Reporting Requirements ─────────────────────────────────────────────

function buildReportingRequirements(params: {
  pc: number;
  missDistance: number;
  tca: Date;
  jurisdictions: string[];
  ncaNotified: boolean;
  reportGenerated: boolean;
}): NCAReportingRequirement[] {
  const { pc, missDistance, tca, jurisdictions, ncaNotified, reportGenerated } =
    params;
  const now = new Date();

  return getNCAProfiles(jurisdictions).map((profile) => {
    const isTriggered =
      pc >= profile.reportingPcThreshold ||
      missDistance <= profile.reportingMissDistanceThreshold;

    const deadlineAt = isTriggered
      ? new Date(
          tca.getTime() - profile.reportingDeadlineHours * 60 * 60 * 1000,
        )
      : null;

    const hoursRemaining = deadlineAt
      ? (deadlineAt.getTime() - now.getTime()) / (60 * 60 * 1000)
      : null;

    const isOverdue = hoursRemaining !== null && hoursRemaining < 0;

    let triggerReason: string | null = null;
    if (pc >= profile.reportingPcThreshold) {
      triggerReason = `Pc ${pc.toExponential(2)} ≥ threshold ${profile.reportingPcThreshold.toExponential(1)}`;
    } else if (missDistance <= profile.reportingMissDistanceThreshold) {
      triggerReason = `Miss distance ${missDistance.toFixed(0)}m ≤ ${profile.reportingMissDistanceThreshold}m`;
    }

    let status: NCAReportingRequirement["status"];
    if (!isTriggered) {
      status = "not_required";
    } else if (ncaNotified || reportGenerated) {
      status = "completed";
    } else if (isOverdue) {
      status = "overdue";
    } else if (hoursRemaining !== null && hoursRemaining < 24) {
      status = "due_soon";
    } else {
      status = "pending";
    }

    return {
      jurisdiction: profile.jurisdiction,
      authority: profile.authorityShort,
      isTriggered,
      triggerReason,
      deadlineAt,
      hoursRemaining:
        hoursRemaining !== null ? Math.max(0, hoursRemaining) : null,
      isOverdue,
      reportFormat: profile.reportFormat,
      requiredFields: profile.requiredFields,
      legalBasis: profile.legalBasis,
      status,
    };
  });
}

// ─── Decision Impact Assessment ─────────────────────────────────────────────

function assessDecisionImpacts(params: {
  pc: number;
  missDistance: number;
  jurisdictions: string[];
  violations: ThresholdViolation[];
}): DecisionImpact[] {
  const { pc, jurisdictions, violations } = params;
  const profiles = getNCAProfiles(jurisdictions);

  const maneuverExpected = violations.some(
    (v) => v.violationType === "maneuver_expected",
  );
  const justificationRequired = violations.some(
    (v) => v.violationType === "justification_required",
  );
  const ncasRequiringJustification = profiles
    .filter(
      (p) =>
        p.riskAcceptanceJustificationRequired &&
        pc >= p.maneuverExpectedPcThreshold,
    )
    .map((p) => p.authorityShort);

  return [
    {
      decision: "MANEUVER",
      complianceImplications: [
        "Fully compliant with all jurisdiction requirements",
        "Post-maneuver orbital data submission may be required",
        "Fuel budget will be affected — check passivation & EOL reserves",
        "New orbital elements must be propagated for downstream compliance",
      ],
      ncaRequirements: profiles
        .filter((p) => p.postManeuverOrbitalDataRequired)
        .map(
          (p) =>
            `${p.authorityShort}: Submit post-maneuver orbital data within ${p.postEventReportDeadlineHours ?? "N/A"}h`,
        ),
      riskLevel: "low",
      recommendedFor:
        "High Pc events where maneuver capability exists and fuel budget allows",
    },
    {
      decision: "ACCEPT_RISK",
      complianceImplications: [
        maneuverExpected
          ? "WARNING: One or more NCAs expect maneuver at this Pc level"
          : "Within acceptable Pc range for risk acceptance",
        justificationRequired
          ? `Written justification REQUIRED by: ${ncasRequiringJustification.join(", ")}`
          : "No special justification required",
        "Decision and rationale will be included in compliance record",
        "Post-event report must demonstrate adequate risk assessment",
      ],
      ncaRequirements: ncasRequiringJustification.map(
        (nca) => `${nca}: Written justification for declining maneuver`,
      ),
      riskLevel: maneuverExpected ? "high" : "medium",
      recommendedFor:
        "Low Pc events or when maneuver is not feasible (no fuel, debris object, end-of-life)",
    },
    {
      decision: "MONITOR",
      complianceImplications: [
        "Acceptable for evolving situations where data confidence is low",
        "Must re-assess within 24h or when new CDM arrives",
        "Does not fulfill NCA notification requirements — must still decide before deadline",
        "Temporary status only — not a final decision",
      ],
      ncaRequirements: [
        "Monitoring does not pause compliance deadlines — NCA notification timers continue",
      ],
      riskLevel: maneuverExpected ? "high" : "low",
      recommendedFor:
        "Early conjunction warnings with Pc uncertainty, awaiting updated CDMs",
    },
    {
      decision: "COORDINATE",
      complianceImplications: [
        "Appropriate when other operator can maneuver",
        "Document coordination attempts and outcomes",
        "If coordination fails, must fall back to MANEUVER or ACCEPT_RISK",
        "NCA may require evidence of coordination attempt",
      ],
      ncaRequirements: profiles
        .filter((p) => pc >= p.reportingPcThreshold)
        .map(
          (p) =>
            `${p.authorityShort}: Report coordination status as part of CA notification`,
        ),
      riskLevel: "medium",
      recommendedFor:
        "When threat object is an active, maneuverable spacecraft with known operator",
    },
  ];
}

// ─── Maneuver Impact ────────────────────────────────────────────────────────

/** Assess how a collision avoidance maneuver affects other compliance dimensions */
export function assessManeuverImpact(params: {
  estimatedDeltaV: number | null;
  remainingFuelPct: number | null;
  currentOrbitalLifetimeYears: number | null;
  jurisdictions: string[];
}): ManeuverComplianceImpact {
  const {
    estimatedDeltaV,
    remainingFuelPct,
    currentOrbitalLifetimeYears,
    jurisdictions,
  } = params;

  // Fuel impact assessment
  const fuelCritical = remainingFuelPct !== null && remainingFuelPct < 10;
  const fuelLow = remainingFuelPct !== null && remainingFuelPct < 25;

  const fuelImpact = {
    estimatedDeltaV,
    passivationBudgetAffected: fuelCritical,
    eolDisposalBudgetAffected: fuelLow,
    description: fuelCritical
      ? "CRITICAL: Maneuver may consume fuel needed for passivation (IADC 5.3, RT 39-41). Consider risk acceptance."
      : fuelLow
        ? "WARNING: Fuel reserves below 25%. Monitor passivation and EOL disposal budgets after maneuver."
        : "Fuel budget sufficient for maneuver without affecting passivation or EOL compliance.",
  };

  // Orbital lifetime impact
  const orbitalLifetimeImpact = {
    changeDirection: (estimatedDeltaV && estimatedDeltaV > 1
      ? "decrease"
      : "negligible") as "increase" | "decrease" | "negligible",
    twentyFiveYearRuleStatus: (currentOrbitalLifetimeYears !== null
      ? currentOrbitalLifetimeYears <= 25
        ? "compliant"
        : "at_risk"
      : "unknown") as "compliant" | "at_risk" | "unknown",
    description:
      estimatedDeltaV && estimatedDeltaV > 1
        ? "Maneuver may alter orbital lifetime. Re-run orbital decay forecast after execution."
        : "Negligible impact on orbital lifetime expected.",
  };

  // Post-maneuver required actions
  const requiredActions: ManeuverComplianceImpact["requiredActions"] = [];
  const profiles = getNCAProfiles(jurisdictions);

  for (const profile of profiles) {
    if (profile.postManeuverOrbitalDataRequired) {
      requiredActions.push({
        action: `Submit updated orbital elements to ${profile.authorityShort}`,
        deadline: profile.postEventReportDeadlineHours
          ? `Within ${profile.postEventReportDeadlineHours}h after maneuver`
          : "As soon as practicable",
        jurisdiction: profile.jurisdiction,
        legalBasis: profile.legalBasis,
      });
    }
  }

  // Always need to update orbital data after maneuver
  requiredActions.push({
    action: "Update Space-Track ephemeris with post-maneuver orbital elements",
    deadline: "Within 24h after maneuver execution",
    jurisdiction: "INTL",
    legalBasis: "COPUOS LTS Guideline B.1, IADC Guidelines 5.4",
  });

  requiredActions.push({
    action: "Re-run orbital lifetime forecast (25-year rule compliance check)",
    deadline: "Within 48h after maneuver execution",
    jurisdiction: "INTL",
    legalBasis: "ISO 24113:2019 Section 6.3, IADC Guideline 5.3.2",
  });

  return {
    fuelImpact,
    orbitalLifetimeImpact,
    requiredActions,
  };
}

// ─── Compliance Timeline ────────────────────────────────────────────────────

/** Build a full compliance timeline for an event */
export function buildComplianceTimeline(params: {
  tca: Date;
  jurisdictions: string[];
  eventCreatedAt: Date;
  decision?: string | null;
  decisionAt?: Date | null;
  ncaNotified?: boolean;
  ncaNotifiedAt?: Date | null;
  maneuverExecutedAt?: Date | null;
  reportGenerated?: boolean;
}): ComplianceTimeline {
  const {
    tca,
    jurisdictions,
    eventCreatedAt,
    decision,
    decisionAt,
    ncaNotified,
    ncaNotifiedAt,
    maneuverExecutedAt,
    reportGenerated,
  } = params;

  const events: ComplianceTimeline["events"] = [];
  const now = new Date();

  // Event detected
  events.push({
    timestamp: eventCreatedAt,
    type: "milestone",
    title: "Conjunction detected",
    description: "CDM ingested and conjunction event created",
    jurisdiction: null,
    urgency: "low",
    completed: true,
  });

  // NCA notification deadlines
  const profiles = getNCAProfiles(jurisdictions);
  for (const profile of profiles) {
    const deadlineAt = new Date(
      tca.getTime() - profile.reportingDeadlineHours * 60 * 60 * 1000,
    );

    events.push({
      timestamp: deadlineAt,
      type: "deadline",
      title: `${profile.authorityShort} notification deadline`,
      description: `Notify ${profile.authority} at least ${profile.reportingDeadlineHours}h before TCA (${profile.legalBasis})`,
      jurisdiction: profile.jurisdiction,
      urgency: deadlineAt < now && !ncaNotified ? "critical" : "medium",
      completed: ncaNotified ?? false,
    });
  }

  // Decision recorded
  if (decision && decisionAt) {
    events.push({
      timestamp: decisionAt,
      type: "milestone",
      title: `Decision: ${decision}`,
      description: "Operator decision recorded in compliance trail",
      jurisdiction: null,
      urgency: "low",
      completed: true,
    });
  } else {
    // Decision needed
    events.push({
      timestamp: now,
      type: "action_required",
      title: "Decision required",
      description:
        "Operator must decide: MANEUVER, ACCEPT_RISK, MONITOR, or COORDINATE",
      jurisdiction: null,
      urgency: "high",
      completed: false,
    });
  }

  // NCA notification
  if (ncaNotified && ncaNotifiedAt) {
    events.push({
      timestamp: ncaNotifiedAt,
      type: "notification",
      title: "NCA notified",
      description: "Competent authority notification sent",
      jurisdiction: null,
      urgency: "low",
      completed: true,
    });
  }

  // Maneuver execution
  if (maneuverExecutedAt) {
    events.push({
      timestamp: maneuverExecutedAt,
      type: "milestone",
      title: "Maneuver executed",
      description: "Collision avoidance maneuver performed",
      jurisdiction: null,
      urgency: "low",
      completed: true,
    });
  }

  // TCA
  events.push({
    timestamp: tca,
    type: "milestone",
    title: "Time of Closest Approach (TCA)",
    description: "Predicted closest approach between objects",
    jurisdiction: null,
    urgency: tca > now ? "high" : "low",
    completed: tca < now,
  });

  // Post-event reports
  for (const profile of profiles) {
    if (profile.postEventReportDeadlineHours) {
      const postDeadline = new Date(
        tca.getTime() + profile.postEventReportDeadlineHours * 60 * 60 * 1000,
      );
      events.push({
        timestamp: postDeadline,
        type: "deadline",
        title: `${profile.authorityShort} post-event report deadline`,
        description: `Submit post-event CA report within ${profile.postEventReportDeadlineHours}h after TCA`,
        jurisdiction: profile.jurisdiction,
        urgency: postDeadline < now && !reportGenerated ? "critical" : "low",
        completed: reportGenerated ?? false,
      });
    }
  }

  // Sort chronologically
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return { events };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function determineComplianceRisk(
  violations: ThresholdViolation[],
  deadlines: ComplianceDeadline[],
): ComplianceAssessment["complianceRisk"] {
  const hasImmediate = violations.some((v) => v.urgency === "immediate");
  const hasOverdue = deadlines.some((d) => d.isOverdue);
  const hasDueSoon = deadlines.some(
    (d) => !d.isOverdue && d.hoursRemaining < 24,
  );
  const hasViolations = violations.length > 0;

  if (hasOverdue || hasImmediate) return "critical";
  if (hasDueSoon && hasViolations) return "high";
  if (hasViolations) return "medium";
  return "low";
}

function generateSummary(
  violations: ThresholdViolation[],
  deadlines: ComplianceDeadline[],
  requirements: NCAReportingRequirement[],
  risk: ComplianceAssessment["complianceRisk"],
): string {
  const triggered = requirements.filter((r) => r.isTriggered);
  const overdue = deadlines.filter((d) => d.isOverdue);
  const maneuverExpected = violations.filter(
    (v) => v.violationType === "maneuver_expected",
  );

  if (risk === "low") {
    return "No NCA reporting thresholds exceeded. Continue monitoring.";
  }

  const parts: string[] = [];

  if (triggered.length > 0) {
    parts.push(
      `${triggered.length} NCA${triggered.length > 1 ? "s" : ""} require notification: ${triggered.map((r) => r.authority).join(", ")}`,
    );
  }

  if (overdue.length > 0) {
    parts.push(
      `${overdue.length} deadline${overdue.length > 1 ? "s" : ""} OVERDUE`,
    );
  }

  if (maneuverExpected.length > 0) {
    parts.push(
      `Maneuver expected by ${maneuverExpected.map((v) => v.authority).join(", ")}`,
    );
  }

  return parts.join(". ") + ".";
}
