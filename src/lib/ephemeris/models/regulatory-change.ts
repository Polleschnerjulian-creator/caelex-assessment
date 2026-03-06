import type {
  ComplianceFactorInternal,
  RegulatoryChangeImpact,
  ComplianceEvent,
  ModuleStatus,
  AlertSeverity,
} from "../core/types";

/**
 * Regulatory Change Prediction Model
 *
 * Maps RegulatoryUpdate records (from EUR-Lex via regulatory-feed cron)
 * into ComplianceFactors and ComplianceEvents for the Ephemeris engine.
 *
 * Severity → Status mapping:
 *   CRITICAL → NON_COMPLIANT
 *   HIGH     → WARNING
 *   MEDIUM   → COMPLIANT (informational)
 *   LOW      → COMPLIANT (informational)
 */

const SEVERITY_TO_STATUS: Record<string, ModuleStatus> = {
  CRITICAL: "NON_COMPLIANT",
  HIGH: "WARNING",
  MEDIUM: "COMPLIANT",
  LOW: "COMPLIANT",
};

/**
 * Assess impact of regulatory changes on a satellite.
 * Generates ComplianceFactorInternal entries from recent regulatory changes.
 */
export function getRegulatoryChangeFactors(
  changes: RegulatoryChangeImpact[],
  _noradId: string,
): ComplianceFactorInternal[] {
  if (changes.length === 0) return [];

  return changes.map((change, index) => {
    const severity = change.event.severity;
    const status = SEVERITY_TO_STATUS[severity] ?? "COMPLIANT";
    const regulationRef = `eurlex_${change.event.id}`;

    return {
      id: `regulatory_change_${index}`,
      name: `Regulatory Change: ${truncate(change.event.title, 60)}`,
      regulationRef,
      thresholdValue: severityToScore(severity),
      thresholdType: "ABOVE" as const,
      unit: "severity",
      status,
      source: "derived" as const,
      confidence: severity === "CRITICAL" || severity === "HIGH" ? 0.9 : 0.7,
      lastMeasured: change.event.publishedAt,
      daysToThreshold: null,
      currentValue: severityToScore(severity),
    };
  });
}

/**
 * Generate ComplianceEvents from regulatory changes.
 * Each regulatory change becomes a compliance event with a crossing date
 * based on when it was published (effective immediately for CRITICAL/HIGH).
 */
export function getRegulatoryChangeEvents(
  changes: RegulatoryChangeImpact[],
  _noradId: string,
): ComplianceEvent[] {
  if (changes.length === 0) return [];

  const now = new Date();

  return changes
    .filter(
      (change) =>
        change.event.severity === "CRITICAL" ||
        change.event.severity === "HIGH",
    )
    .map((change, index) => {
      const publishedAt = new Date(change.event.publishedAt);
      const daysFromNow = Math.ceil(
        (publishedAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      return {
        id: `reg_event_${change.event.id}_${index}`,
        date: change.event.publishedAt,
        daysFromNow,
        regulationRef: `eurlex_${change.event.id}`,
        regulationName: truncate(change.event.title, 80),
        eventType: "REGULATORY_CHANGE" as const,
        severity: change.event.severity,
        description: change.worstCaseImpact,
        recommendedAction: getRecommendedAction(change.event.severity),
        confidence: "MEDIUM" as const,
        model: "regulatory",
      };
    });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function severityToScore(severity: AlertSeverity): number {
  switch (severity) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

function getRecommendedAction(severity: AlertSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "Immediate compliance review required. Assess impact on all affected modules and update compliance documentation.";
    case "HIGH":
      return "Schedule compliance reassessment within 7 days. Review affected regulatory requirements.";
    default:
      return "Review regulatory update and assess relevance to current operations.";
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}
