/**
 * Incident Response Service
 *
 * Handles incident classification, severity determination, NCA notification
 * deadlines, and incident lifecycle management per EU Space Act requirements.
 */

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

/**
 * Incident categories with their NCA notification requirements
 */
export type IncidentCategory =
  | "loss_of_contact"
  | "debris_generation"
  | "cyber_incident"
  | "spacecraft_anomaly"
  | "conjunction_event"
  | "regulatory_breach"
  | "nis2_significant_incident"
  | "nis2_near_miss"
  | "other";

/**
 * Incident severity levels
 */
export type IncidentSeverity = "critical" | "high" | "medium" | "low";

/**
 * Incident status
 */
export type IncidentStatus =
  | "detected"
  | "investigating"
  | "contained"
  | "resolved"
  | "reported";

/**
 * Classification rules for incidents
 */
export const INCIDENT_CLASSIFICATION: Record<
  IncidentCategory,
  {
    defaultSeverity: IncidentSeverity;
    ncaDeadlineHours: number;
    requiresNCANotification: boolean;
    requiresEUSPANotification: boolean;
    description: string;
    articleRef: string;
  }
> = {
  loss_of_contact: {
    defaultSeverity: "critical",
    ncaDeadlineHours: 4,
    requiresNCANotification: true,
    requiresEUSPANotification: true,
    description: "Loss of communication or control with spacecraft",
    articleRef: "Art. 33-34",
  },
  debris_generation: {
    defaultSeverity: "critical",
    ncaDeadlineHours: 4,
    requiresNCANotification: true,
    requiresEUSPANotification: true,
    description: "Debris-generating event or fragmentation",
    articleRef: "Art. 58-72",
  },
  cyber_incident: {
    defaultSeverity: "critical",
    ncaDeadlineHours: 4,
    requiresNCANotification: true,
    requiresEUSPANotification: true,
    description: "Cybersecurity breach or attack on space systems",
    articleRef: "Art. 74-95",
  },
  spacecraft_anomaly: {
    defaultSeverity: "high",
    ncaDeadlineHours: 24,
    requiresNCANotification: true,
    requiresEUSPANotification: false,
    description: "Significant spacecraft malfunction or anomaly",
    articleRef: "Art. 33-34",
  },
  conjunction_event: {
    defaultSeverity: "high",
    ncaDeadlineHours: 72,
    requiresNCANotification: true,
    requiresEUSPANotification: true,
    description: "Close approach or collision avoidance maneuver",
    articleRef: "Art. 55-57",
  },
  regulatory_breach: {
    defaultSeverity: "medium",
    ncaDeadlineHours: 72,
    requiresNCANotification: true,
    requiresEUSPANotification: false,
    description: "Non-compliance with regulatory requirements",
    articleRef: "Art. 33-34",
  },
  nis2_significant_incident: {
    defaultSeverity: "critical",
    ncaDeadlineHours: 24, // NIS2 Art. 23(4)(a): Early warning within 24 hours
    requiresNCANotification: true,
    requiresEUSPANotification: false,
    description:
      "NIS2 significant incident: causes severe operational disruption or financial loss, or has affected or is capable of affecting other entities",
    articleRef: "NIS2 Art. 23",
  },
  nis2_near_miss: {
    defaultSeverity: "medium",
    ncaDeadlineHours: 72, // Voluntary reporting timeline
    requiresNCANotification: false,
    requiresEUSPANotification: false,
    description:
      "NIS2 near-miss: event that could have resulted in a significant incident but was prevented or did not materialise",
    articleRef: "NIS2 Art. 30",
  },
  other: {
    defaultSeverity: "low",
    ncaDeadlineHours: 168, // 7 days
    requiresNCANotification: false,
    requiresEUSPANotification: false,
    description: "Other operational incident",
    articleRef: "Art. 33-34",
  },
};

/**
 * NIS2 Art. 23 — Incident Reporting Timeline Constants
 *
 * Space operators classified as essential or important entities must
 * report significant incidents to their CSIRT/competent authority.
 */
export const NIS2_REPORTING_TIMELINE = {
  /** Art. 23(4)(a): Early warning — without undue delay, within 24 hours */
  earlyWarningHours: 24,
  /** Art. 23(4)(b): Incident notification — within 72 hours of awareness */
  notificationHours: 72,
  /** Art. 23(4)(c): Intermediate report — upon request of CSIRT/authority */
  intermediateReportDays: "upon_request",
  /** Art. 23(4)(d): Final report — within 1 month of notification */
  finalReportDays: 30,
  /** Art. 23(4)(d): Extended for ongoing incidents */
  progressReportDays: 30,
  /** Art. 23(4)(e): Final report after progress report — within 1 month */
  finalAfterProgressDays: 30,
} as const;

/**
 * Determine if an incident qualifies as NIS2 "significant" under Art. 23(3)
 *
 * A significant incident is one that:
 * (a) has caused or is capable of causing severe operational disruption or financial loss
 * (b) has affected or is capable of affecting other natural or legal persons by causing
 *     considerable material or non-material damage
 */
export function isNIS2SignificantIncident(factors: {
  causedOperationalDisruption: boolean;
  financialLossEuros?: number;
  affectedOtherEntities: boolean;
  affectedPersonCount?: number;
  causedDataBreach: boolean;
  affectedServiceAvailability: boolean;
  serviceDowntimeHours?: number;
}): { isSignificant: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (factors.causedOperationalDisruption) {
    reasons.push("Caused severe operational disruption (Art. 23(3)(a))");
  }

  if (factors.financialLossEuros && factors.financialLossEuros > 500000) {
    reasons.push(
      `Financial loss exceeds €500K threshold (€${factors.financialLossEuros.toLocaleString()})`,
    );
  }

  if (factors.affectedOtherEntities) {
    reasons.push(
      "Affected or capable of affecting other entities (Art. 23(3)(b))",
    );
  }

  if (factors.affectedPersonCount && factors.affectedPersonCount > 0) {
    reasons.push(
      `Affected ${factors.affectedPersonCount.toLocaleString()} persons`,
    );
  }

  if (factors.causedDataBreach) {
    reasons.push("Caused a data breach requiring GDPR notification");
  }

  if (
    factors.affectedServiceAvailability &&
    factors.serviceDowntimeHours &&
    factors.serviceDowntimeHours > 4
  ) {
    reasons.push(
      `Service unavailable for ${factors.serviceDowntimeHours} hours`,
    );
  }

  return {
    isSignificant: reasons.length > 0,
    reasons,
  };
}

/**
 * Severity escalation factors
 */
export interface SeverityFactors {
  affectedAssetCount: number;
  hasDebrisGenerated: boolean;
  hasDataBreach: boolean;
  hasThirdPartyImpact: boolean;
  hasMediaAttention: boolean;
  isRecurring: boolean;
}

/**
 * Calculate severity based on incident details and escalation factors
 */
export function calculateSeverity(
  category: IncidentCategory,
  factors: Partial<SeverityFactors> = {},
): IncidentSeverity {
  const baseSeverity =
    INCIDENT_CLASSIFICATION[category]?.defaultSeverity || "medium";

  // Start with base severity score
  const severityScores: Record<IncidentSeverity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  let score = severityScores[baseSeverity];

  // Apply escalation factors
  if (factors.affectedAssetCount && factors.affectedAssetCount > 1) {
    score += 0.5;
  }
  if (factors.affectedAssetCount && factors.affectedAssetCount > 5) {
    score += 0.5;
  }
  if (factors.hasDebrisGenerated) {
    score += 1;
  }
  if (factors.hasDataBreach) {
    score += 1;
  }
  if (factors.hasThirdPartyImpact) {
    score += 0.5;
  }
  if (factors.hasMediaAttention) {
    score += 0.5;
  }
  if (factors.isRecurring) {
    score += 0.5;
  }

  // Map score back to severity
  if (score >= 4) return "critical";
  if (score >= 3) return "high";
  if (score >= 2) return "medium";
  return "low";
}

/**
 * Calculate NCA notification deadline based on category and detection time
 */
export function calculateNCADeadline(
  category: IncidentCategory,
  detectedAt: Date,
): Date {
  const classification = INCIDENT_CLASSIFICATION[category];
  const deadlineHours = classification?.ncaDeadlineHours || 72;

  const deadline = new Date(detectedAt);
  deadline.setHours(deadline.getHours() + deadlineHours);

  return deadline;
}

/**
 * Check if NCA notification is overdue
 */
export function isNCANotificationOverdue(
  category: IncidentCategory,
  detectedAt: Date,
  reportedToNCA: boolean,
): boolean {
  if (reportedToNCA) return false;

  const deadline = calculateNCADeadline(category, detectedAt);
  return new Date() > deadline;
}

/**
 * Generate incident number (INC-YYYY-NNN)
 */
export async function generateIncidentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INC-${year}-`;

  // Find the highest incident number for this year
  const lastIncident = await prisma.incident.findFirst({
    where: {
      incidentNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      incidentNumber: "desc",
    },
    select: {
      incidentNumber: true,
    },
  });

  let nextNumber = 1;
  if (lastIncident) {
    const lastNumber = parseInt(lastIncident.incidentNumber.split("-")[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
}

/**
 * Create a new incident with auto-classification
 */
export interface CreateIncidentInput {
  supervisionId: string;
  category: IncidentCategory;
  title: string;
  description: string;
  detectedAt?: Date;
  detectedBy: string;
  detectionMethod: "automated" | "manual" | "external_report";
  affectedAssets?: Array<{
    assetName: string;
    cosparId?: string;
    noradId?: string;
  }>;
  severityFactors?: Partial<SeverityFactors>;
}

export interface CreateIncidentResult {
  success: boolean;
  incidentId?: string;
  incidentNumber?: string;
  severity?: IncidentSeverity;
  ncaDeadline?: Date;
  requiresNCANotification?: boolean;
  error?: string;
}

export async function createIncident(
  input: CreateIncidentInput,
  userId: string,
): Promise<CreateIncidentResult> {
  try {
    const detectedAt = input.detectedAt || new Date();

    // Calculate severity
    const severity = calculateSeverity(input.category, {
      ...input.severityFactors,
      affectedAssetCount: input.affectedAssets?.length || 1,
    });

    // Generate incident number
    const incidentNumber = await generateIncidentNumber();

    // Get classification info
    const classification = INCIDENT_CLASSIFICATION[input.category];

    // Create incident with assets
    const incident = await prisma.incident.create({
      data: {
        supervisionId: input.supervisionId,
        incidentNumber,
        category: input.category,
        severity,
        status: "detected",
        title: input.title,
        description: input.description,
        detectedAt,
        detectedBy: input.detectedBy,
        detectionMethod: input.detectionMethod,
        affectedAssets: input.affectedAssets
          ? {
              create: input.affectedAssets.map((asset) => ({
                assetName: asset.assetName,
                cosparId: asset.cosparId,
                noradId: asset.noradId,
              })),
            }
          : undefined,
      },
      include: {
        affectedAssets: true,
      },
    });

    // Calculate NCA deadline
    const ncaDeadline = calculateNCADeadline(input.category, detectedAt);

    // Create deadline in timeline if NCA notification required
    if (classification.requiresNCANotification) {
      await prisma.deadline.create({
        data: {
          userId,
          title: `NCA Notification: ${incidentNumber}`,
          description: `Report incident ${incidentNumber} to National Competent Authority within ${classification.ncaDeadlineHours} hours of detection.`,
          dueDate: ncaDeadline,
          category: "REGULATORY",
          priority: severity === "critical" ? "CRITICAL" : "HIGH",
          status: "UPCOMING",
          moduleSource: "SUPERVISION",
          relatedEntityId: incident.id,
          regulatoryRef: classification.articleRef,
          penaltyInfo:
            "Failure to report may result in penalties under EU Space Act Art. 101-104",
          reminderDays: [1, 0], // Reminder 1 day before and on due date
        },
      });
    }

    // Log audit event
    await logAuditEvent({
      userId,
      action: "incident_created",
      entityType: "incident",
      entityId: incident.id,
      newValue: {
        incidentNumber,
        category: input.category,
        severity,
        requiresNCANotification: classification.requiresNCANotification,
        ncaDeadline: ncaDeadline.toISOString(),
      },
      description: `Incident ${incidentNumber} created: ${input.title}`,
    });

    return {
      success: true,
      incidentId: incident.id,
      incidentNumber,
      severity,
      ncaDeadline,
      requiresNCANotification: classification.requiresNCANotification,
    };
  } catch (error) {
    console.error("Error creating incident:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create incident",
    };
  }
}

/**
 * Update incident status
 */
export async function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  userId: string,
  additionalData?: {
    rootCause?: string;
    impactAssessment?: string;
    immediateActions?: string[];
    containmentMeasures?: string[];
    resolutionSteps?: string[];
    lessonsLearned?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      return { success: false, error: "Incident not found" };
    }

    const updateData: Record<string, unknown> = {
      status,
      ...additionalData,
    };

    // Set timestamps based on status
    if (status === "contained" && !incident.containedAt) {
      updateData.containedAt = new Date();
    }
    if (status === "resolved" && !incident.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    await prisma.incident.update({
      where: { id: incidentId },
      data: updateData,
    });

    // Log audit event
    await logAuditEvent({
      userId,
      action: "incident_status_updated",
      entityType: "incident",
      entityId: incidentId,
      previousValue: { status: incident.status },
      newValue: { status },
      description: `Incident ${incident.incidentNumber} status changed: ${incident.status} → ${status}`,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

/**
 * Record NCA notification
 */
export async function recordNCANotification(
  incidentId: string,
  userId: string,
  data: {
    ncaReferenceNumber?: string;
    notifyEUSPA?: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      return { success: false, error: "Incident not found" };
    }

    const updateData: Record<string, unknown> = {
      reportedToNCA: true,
      ncaReportDate: new Date(),
      status: "reported",
    };

    if (data.ncaReferenceNumber) {
      updateData.ncaReferenceNumber = data.ncaReferenceNumber;
    }

    if (data.notifyEUSPA) {
      updateData.reportedToEUSPA = true;
      updateData.euspaReportDate = new Date();
    }

    await prisma.incident.update({
      where: { id: incidentId },
      data: updateData,
    });

    // Update related deadline to completed
    await prisma.deadline.updateMany({
      where: {
        moduleSource: "SUPERVISION",
        relatedEntityId: incidentId,
        title: { contains: "NCA Notification" },
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: userId,
      },
    });

    // Log audit event
    await logAuditEvent({
      userId,
      action: "incident_reported_to_nca",
      entityType: "incident",
      entityId: incidentId,
      newValue: {
        reportedToNCA: true,
        ncaReferenceNumber: data.ncaReferenceNumber,
        reportedToEUSPA: data.notifyEUSPA,
      },
      description: `Incident ${incident.incidentNumber} reported to NCA`,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to record notification",
    };
  }
}

/**
 * Get incident summary with deadline status
 */
export interface IncidentSummary {
  id: string;
  incidentNumber: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  detectedAt: Date;
  ncaDeadline: Date;
  ncaDeadlineHours: number;
  hoursRemaining: number;
  isOverdue: boolean;
  requiresNCANotification: boolean;
  reportedToNCA: boolean;
  reportedToEUSPA: boolean;
  affectedAssetCount: number;
}

export async function getIncidentSummary(
  incidentId: string,
): Promise<IncidentSummary | null> {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      affectedAssets: true,
    },
  });

  if (!incident) return null;

  const category = incident.category as IncidentCategory;
  const classification = INCIDENT_CLASSIFICATION[category];
  const ncaDeadline = calculateNCADeadline(category, incident.detectedAt);
  const now = new Date();
  const hoursRemaining = Math.max(
    0,
    (ncaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60),
  );

  return {
    id: incident.id,
    incidentNumber: incident.incidentNumber,
    category,
    severity: incident.severity as IncidentSeverity,
    status: incident.status as IncidentStatus,
    title: incident.title,
    detectedAt: incident.detectedAt,
    ncaDeadline,
    ncaDeadlineHours: classification.ncaDeadlineHours,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    isOverdue: !incident.reportedToNCA && now > ncaDeadline,
    requiresNCANotification: classification.requiresNCANotification,
    reportedToNCA: incident.reportedToNCA,
    reportedToEUSPA: incident.reportedToEUSPA,
    affectedAssetCount: incident.affectedAssets.length,
  };
}

/**
 * Get all incidents requiring NCA notification
 */
export async function getPendingNCANotifications(
  supervisionId: string,
): Promise<IncidentSummary[]> {
  const incidents = await prisma.incident.findMany({
    where: {
      supervisionId,
      reportedToNCA: false,
      category: {
        in: Object.entries(INCIDENT_CLASSIFICATION)
          .filter(([, config]) => config.requiresNCANotification)
          .map(([category]) => category),
      },
    },
    include: {
      affectedAssets: true,
    },
    orderBy: {
      detectedAt: "asc",
    },
  });

  return incidents.map((incident) => {
    const category = incident.category as IncidentCategory;
    const classification = INCIDENT_CLASSIFICATION[category];
    const ncaDeadline = calculateNCADeadline(category, incident.detectedAt);
    const now = new Date();
    const hoursRemaining = Math.max(
      0,
      (ncaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60),
    );

    return {
      id: incident.id,
      incidentNumber: incident.incidentNumber,
      category,
      severity: incident.severity as IncidentSeverity,
      status: incident.status as IncidentStatus,
      title: incident.title,
      detectedAt: incident.detectedAt,
      ncaDeadline,
      ncaDeadlineHours: classification.ncaDeadlineHours,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      isOverdue: now > ncaDeadline,
      requiresNCANotification: true,
      reportedToNCA: false,
      reportedToEUSPA: incident.reportedToEUSPA,
      affectedAssetCount: incident.affectedAssets.length,
    };
  });
}
