import type {
  ComplianceFactorInternal,
  DeadlineEvent,
  AssessmentDataBundle,
  AlertSeverity,
} from "../core/types";
import { TRACKED_DEADLINES } from "../core/constants";

/**
 * Deadline Events Prediction Model
 *
 * Calendar-based compliance deadlines from multiple sources:
 * - TRACKED_DEADLINES: periodic compliance requirements (pentests, scans, reviews)
 * - Insurance expiry: from InsuranceAssessment policies
 * - Authorization renewal: from AuthorizationWorkflow
 *
 * Each deadline generates ComplianceFactorInternal entries and alerts.
 */

interface DeadlineInput {
  assessmentData: AssessmentDataBundle;
  lastPentestDate: Date | null;
  lastVulnScanDate: Date | null;
  lastAccessReviewDate: Date | null;
  lastTrainingDate: Date | null;
  authorizationExpiryDate: Date | null;
}

/**
 * Calculate all deadline events for a satellite/operator.
 */
export function calculateDeadlineEvents(input: DeadlineInput): DeadlineEvent[] {
  const now = new Date();
  const events: DeadlineEvent[] = [];

  // Process tracked deadlines
  for (const deadline of TRACKED_DEADLINES) {
    const lastDate = getLastDateForDeadline(deadline.id, input);
    if (!lastDate && deadline.id !== "insurance_renewal") continue;

    if (deadline.id === "insurance_renewal") {
      // Insurance expiry uses assessment data
      const insuranceExpiry = input.assessmentData.insurance?.expiresAt;
      if (!insuranceExpiry) continue;

      const expiryDate = new Date(insuranceExpiry);
      const daysFromNow = Math.floor(
        (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );
      const warningDate = new Date(
        expiryDate.getTime() - deadline.leadTimeDays * 24 * 60 * 60 * 1000,
      );

      events.push({
        regulationRef: deadline.regulationRef,
        name: deadline.name,
        eventType: daysFromNow < 0 ? "OVERDUE" : "EXPIRY",
        dueDate: expiryDate.toISOString(),
        daysFromNow,
        leadTimeDays: deadline.leadTimeDays,
        warningDate: warningDate.toISOString(),
        isOverdue: daysFromNow < 0,
        severity: getSeverityFromDays(
          daysFromNow,
          deadline.leadTimeDays,
          deadline.severity,
        ),
        recommendedAction: deadline.action,
      });
      continue;
    }

    // Periodic deadlines: next due = lastDate + interval
    const nextDue = new Date(
      lastDate!.getTime() + deadline.intervalDays * 24 * 60 * 60 * 1000,
    );
    const daysFromNow = Math.floor(
      (nextDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    const warningDate = new Date(
      nextDue.getTime() - deadline.leadTimeDays * 24 * 60 * 60 * 1000,
    );

    events.push({
      regulationRef: deadline.regulationRef,
      name: deadline.name,
      eventType: daysFromNow < 0 ? "OVERDUE" : "RENEWAL",
      dueDate: nextDue.toISOString(),
      daysFromNow,
      leadTimeDays: deadline.leadTimeDays,
      warningDate: warningDate.toISOString(),
      isOverdue: daysFromNow < 0,
      severity: getSeverityFromDays(
        daysFromNow,
        deadline.leadTimeDays,
        deadline.severity,
      ),
      recommendedAction: deadline.action,
    });
  }

  // Authorization renewal
  if (input.authorizationExpiryDate) {
    const daysFromNow = Math.floor(
      (input.authorizationExpiryDate.getTime() - now.getTime()) /
        (24 * 60 * 60 * 1000),
    );
    const leadTimeDays = 180; // 6 months lead time for authorization
    const warningDate = new Date(
      input.authorizationExpiryDate.getTime() -
        leadTimeDays * 24 * 60 * 60 * 1000,
    );

    events.push({
      regulationRef: "eu_space_act_art_5",
      name: "Space Activity Authorization Renewal",
      eventType: daysFromNow < 0 ? "OVERDUE" : "RENEWAL",
      dueDate: input.authorizationExpiryDate.toISOString(),
      daysFromNow,
      leadTimeDays,
      warningDate: warningDate.toISOString(),
      isOverdue: daysFromNow < 0,
      severity: getSeverityFromDays(daysFromNow, leadTimeDays, "CRITICAL"),
      recommendedAction:
        "Begin authorization renewal process with national authority",
    });
  }

  // Sort by daysFromNow (most urgent first)
  events.sort((a, b) => a.daysFromNow - b.daysFromNow);

  return events;
}

/**
 * Generate ComplianceFactorInternal entries from deadline events.
 */
export function getDeadlineFactors(
  events: DeadlineEvent[],
): ComplianceFactorInternal[] {
  return events.map((event) => ({
    id: `deadline_${event.name.toLowerCase().replace(/\s+/g, "_")}`,
    name: event.name,
    regulationRef: event.regulationRef,
    thresholdValue: 0,
    thresholdType: "ABOVE" as const,
    unit: "days",
    status: event.isOverdue
      ? ("NON_COMPLIANT" as const)
      : event.daysFromNow <= event.leadTimeDays
        ? ("WARNING" as const)
        : ("COMPLIANT" as const),
    source: "derived" as const,
    confidence: 0.95, // Calendar events are high-confidence
    lastMeasured: new Date().toISOString(),
    currentValue: event.daysFromNow,
    daysToThreshold: event.isOverdue ? 0 : event.daysFromNow,
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLastDateForDeadline(
  deadlineId: string,
  input: DeadlineInput,
): Date | null {
  switch (deadlineId) {
    case "pentest":
      return input.lastPentestDate;
    case "vuln_scan":
      return input.lastVulnScanDate;
    case "access_review":
      return input.lastAccessReviewDate;
    case "security_training":
      return input.lastTrainingDate;
    default:
      return null;
  }
}

function getSeverityFromDays(
  daysFromNow: number,
  leadTimeDays: number,
  baseSeverity: AlertSeverity,
): AlertSeverity {
  if (daysFromNow < 0) return "CRITICAL"; // Overdue
  if (daysFromNow < leadTimeDays / 4) return "HIGH";
  if (daysFromNow < leadTimeDays) return baseSeverity;
  return "LOW";
}
