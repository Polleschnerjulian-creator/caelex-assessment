/**
 * Incident Autopilot Service
 *
 * Orchestrator for the full incident lifecycle:
 * - Auto-classify severity
 * - Create workflow instance + NIS2 phase records
 * - Calculate and track NIS2 Art. 23 deadlines (24h → 72h → 30d)
 * - Advance workflow state machine
 * - Generate NCA notification drafts from templates
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { encrypt } from "@/lib/encryption";
import {
  notifyUser,
  notifyOrganization,
} from "@/lib/services/notification-service";
import {
  calculateSeverity,
  calculateNCADeadline,
  generateIncidentNumber,
  INCIDENT_CLASSIFICATION,
  NIS2_REPORTING_TIMELINE,
  type CreateIncidentInput,
  type IncidentCategory,
} from "@/lib/services/incident-response-service";
import { createWorkflowEngine } from "@/lib/workflow/engine";
import {
  incidentWorkflowDefinition,
  INCIDENT_STATE_ORDER,
} from "@/lib/workflow/definitions/incident";
import type { IncidentContext } from "@/lib/workflow/types";

// ─── Types ───

export interface CreateIncidentAutopilotInput {
  supervisionId: string;
  category: IncidentCategory;
  title: string;
  description: string;
  detectedAt?: Date;
  detectedBy: string;
  detectionMethod?: "automated" | "manual" | "external_report";
  affectedAssets?: Array<{
    assetName: string;
    cosparId?: string;
    noradId?: string;
  }>;
}

export interface IncidentCommandData {
  incident: {
    id: string;
    incidentNumber: string;
    category: string;
    severity: string;
    status: string;
    workflowState: string;
    title: string;
    description: string;
    detectedAt: string;
    detectedBy: string;
    resolvedAt: string | null;
    reportedToNCA: boolean;
    ncaReferenceNumber: string | null;
  };
  workflow: {
    currentState: string;
    stateName: string;
    stateColor: string;
    stateIcon: string;
    progress: number;
    availableTransitions: Array<{
      event: string;
      to: string;
      description: string;
    }>;
  };
  nis2Phases: Array<{
    phase: string;
    phaseName: string;
    deadline: string;
    status: string;
    submittedAt: string | null;
    referenceNumber: string | null;
    countdown: {
      totalMs: number;
      remainingMs: number;
      percentRemaining: number;
      isOverdue: boolean;
      isSubmitted: boolean;
    };
  }>;
  affectedAssets: Array<{
    id: string;
    assetName: string;
    cosparId: string | null;
    noradId: string | null;
  }>;
}

export interface ActiveIncidentSummary {
  id: string;
  incidentNumber: string;
  category: string;
  severity: string;
  workflowState: string;
  title: string;
  detectedAt: string;
  nis2PhasesSummary: {
    total: number;
    submitted: number;
    overdue: number;
    nextDeadline: string | null;
    nextPhase: string | null;
  };
  urgentDeadlineMs: number | null;
}

// ─── Phase Name Map ───

const PHASE_NAMES: Record<string, string> = {
  early_warning: "Early Warning (24h)",
  notification: "Incident Notification (72h)",
  intermediate_report: "Intermediate Report",
  final_report: "Final Report (30d)",
};

// ─── Core Functions ───

/**
 * Create incident with full autopilot: classification, workflow, NIS2 phases, deadlines, notifications
 */
export async function createIncidentWithAutopilot(
  input: CreateIncidentAutopilotInput,
  userId: string,
): Promise<{
  success: boolean;
  incidentId?: string;
  incidentNumber?: string;
  severity?: string;
  nis2Phases?: Array<{ phase: string; deadline: string }>;
  error?: string;
}> {
  try {
    const detectedAt = input.detectedAt || new Date();

    // Calculate severity
    const severity = calculateSeverity(input.category, {
      affectedAssetCount: input.affectedAssets?.length || 1,
    });

    // Generate incident number
    const incidentNumber = await generateIncidentNumber();

    // Get classification info
    const classification = INCIDENT_CLASSIFICATION[input.category];

    // Encrypt sensitive description
    const encryptedDescription = await encrypt(input.description);

    // Create incident with workflow state
    const incident = await prisma.incident.create({
      data: {
        supervisionId: input.supervisionId,
        incidentNumber,
        category: input.category,
        severity,
        status: "detected",
        workflowState: "reported",
        title: input.title,
        description: encryptedDescription,
        detectedAt,
        detectedBy: input.detectedBy,
        detectionMethod: input.detectionMethod || "manual",
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

    // Calculate and create NIS2 phases
    const phaseDeadlines = calculatePhaseDeadlines(
      detectedAt,
      classification.requiresNCANotification,
    );

    const createdPhases: Array<{ phase: string; deadline: string }> = [];

    for (const [phase, deadline] of Object.entries(phaseDeadlines)) {
      await prisma.incidentNIS2Phase.create({
        data: {
          incidentId: incident.id,
          phase,
          deadline,
          status: "pending",
        },
      });
      createdPhases.push({ phase, deadline: deadline.toISOString() });
    }

    // Create NCA deadline in timeline
    if (classification.requiresNCANotification) {
      const ncaDeadline = calculateNCADeadline(input.category, detectedAt);
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
          reminderDays: [1, 0],
        },
      });
    }

    // Audit log
    await logAuditEvent({
      userId,
      action: "incident_created_autopilot",
      entityType: "incident",
      entityId: incident.id,
      newValue: {
        incidentNumber,
        category: input.category,
        severity,
        workflowState: "reported",
        nis2Phases: createdPhases.length,
        requiresNCANotification: classification.requiresNCANotification,
      },
      description: `Incident ${incidentNumber} created with autopilot: ${input.title}`,
    });

    // Notify organization (find org via user membership)
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (membership?.organizationId) {
      await notifyOrganization(
        membership.organizationId,
        "INCIDENT_CREATED",
        `New Incident: ${incidentNumber}`,
        `${input.title} — Severity: ${severity.toUpperCase()}. ${createdPhases.length} NIS2 reporting phases created.`,
        {
          actionUrl: `/dashboard/incidents`,
          entityType: "incident",
          entityId: incident.id,
          severity: severity === "critical" ? "CRITICAL" : "WARNING",
        },
      );
    }

    return {
      success: true,
      incidentId: incident.id,
      incidentNumber,
      severity,
      nis2Phases: createdPhases,
    };
  } catch (error) {
    console.error("Error creating incident with autopilot:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create incident",
    };
  }
}

/**
 * Advance incident workflow state
 */
export async function advanceIncidentWorkflow(
  incidentId: string,
  event: string,
  userId: string,
  notes?: string,
): Promise<{
  success: boolean;
  previousState?: string;
  currentState?: string;
  availableTransitions?: Array<{
    event: string;
    to: string;
    description: string;
  }>;
  error?: string;
}> {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      return { success: false, error: "Incident not found" };
    }

    const engine = createWorkflowEngine(incidentWorkflowDefinition);

    // Build context
    const context: IncidentContext = {
      incidentId: incident.id,
      userId,
      category: incident.category as IncidentCategory,
      severity: incident.severity as "critical" | "high" | "medium" | "low",
      requiresNCANotification: incident.requiresNCANotification,
      ncaDeadlineHours:
        INCIDENT_CLASSIFICATION[incident.category as IncidentCategory]
          ?.ncaDeadlineHours || 72,
      reportedAt: incident.detectedAt,
      hasActiveDeadline: !incident.reportedToNCA,
    };

    // Execute transition
    const result = await engine.executeTransition(
      incident.workflowState,
      event,
      context,
    );

    if (!result.success) {
      return {
        success: false,
        error:
          result.error ||
          `Cannot transition from ${incident.workflowState} via ${event}`,
      };
    }

    // Update incident in DB
    const updateData: Record<string, unknown> = {
      workflowState: result.currentState,
    };

    if (result.currentState === "resolved" && !incident.resolvedAt) {
      updateData.resolvedAt = new Date();
      updateData.status = "resolved";
    }
    if (result.currentState === "investigating") {
      updateData.status = "investigating";
    }
    if (result.currentState === "mitigating") {
      updateData.status = "contained";
    }

    await prisma.incident.update({
      where: { id: incidentId },
      data: updateData,
    });

    // Audit log
    await logAuditEvent({
      userId,
      action: "incident_workflow_advanced",
      entityType: "incident",
      entityId: incidentId,
      previousValue: { workflowState: result.previousState },
      newValue: { workflowState: result.currentState, event, notes },
      description: `Incident ${incident.incidentNumber} workflow: ${result.previousState} → ${result.currentState}`,
    });

    // Notify (find org via user membership)
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (membership?.organizationId) {
      await notifyOrganization(
        membership.organizationId,
        "INCIDENT_STATUS_CHANGED",
        `Incident ${incident.incidentNumber}: ${result.currentState}`,
        `Workflow advanced from ${result.previousState} to ${result.currentState}.${notes ? ` Notes: ${notes}` : ""}`,
        {
          actionUrl: `/dashboard/incidents`,
          entityType: "incident",
          entityId: incidentId,
        },
      );
    }

    // Get available transitions for the new state
    const available = engine.getAvailableTransitions(
      result.currentState,
      context,
    );

    return {
      success: true,
      previousState: result.previousState,
      currentState: result.currentState,
      availableTransitions: available
        .filter((t) => !t.auto)
        .map((t) => ({
          event: t.event,
          to: t.to,
          description: t.description || "",
        })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to advance workflow",
    };
  }
}

/**
 * Get full incident command data for the dashboard
 */
export async function getIncidentCommandData(
  incidentId: string,
): Promise<IncidentCommandData | null> {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      affectedAssets: true,
      nis2Phases: {
        orderBy: { deadline: "asc" },
      },
    },
  });

  if (!incident) return null;

  const engine = createWorkflowEngine(incidentWorkflowDefinition);
  const state = engine.getState(incident.workflowState);
  const stateIndex = INCIDENT_STATE_ORDER.indexOf(incident.workflowState);
  const progress =
    stateIndex >= 0
      ? Math.round((stateIndex / (INCIDENT_STATE_ORDER.length - 1)) * 100)
      : 0;

  const context: IncidentContext = {
    incidentId: incident.id,
    userId: "",
    category: incident.category as IncidentCategory,
    severity: incident.severity as "critical" | "high" | "medium" | "low",
    requiresNCANotification: incident.requiresNCANotification,
    ncaDeadlineHours:
      INCIDENT_CLASSIFICATION[incident.category as IncidentCategory]
        ?.ncaDeadlineHours || 72,
    reportedAt: incident.detectedAt,
    hasActiveDeadline: !incident.reportedToNCA,
  };

  const available = engine.getAvailableTransitions(
    incident.workflowState,
    context,
  );

  const now = Date.now();

  return {
    incident: {
      id: incident.id,
      incidentNumber: incident.incidentNumber,
      category: incident.category,
      severity: incident.severity,
      status: incident.status,
      workflowState: incident.workflowState,
      title: incident.title,
      description: incident.description,
      detectedAt: incident.detectedAt.toISOString(),
      detectedBy: incident.detectedBy,
      resolvedAt: incident.resolvedAt?.toISOString() || null,
      reportedToNCA: incident.reportedToNCA,
      ncaReferenceNumber: incident.ncaReferenceNumber,
    },
    workflow: {
      currentState: incident.workflowState,
      stateName: state?.name || incident.workflowState,
      stateColor: state?.metadata?.color || "#6B7280",
      stateIcon: state?.metadata?.icon || "Circle",
      progress,
      availableTransitions: available
        .filter((t) => !t.auto)
        .map((t) => ({
          event: t.event,
          to: t.to,
          description: t.description || "",
        })),
    },
    nis2Phases: incident.nis2Phases.map((phase) => {
      const deadlineMs = phase.deadline.getTime();
      const createdMs = phase.createdAt.getTime();
      const totalMs = deadlineMs - createdMs;
      const remainingMs = Math.max(0, deadlineMs - now);
      const isSubmitted = phase.status === "submitted";
      const isOverdue = !isSubmitted && now > deadlineMs;

      return {
        phase: phase.phase,
        phaseName: PHASE_NAMES[phase.phase] || phase.phase,
        deadline: phase.deadline.toISOString(),
        status: isOverdue ? "overdue" : phase.status,
        submittedAt: phase.submittedAt?.toISOString() || null,
        referenceNumber: phase.referenceNumber,
        countdown: {
          totalMs,
          remainingMs,
          percentRemaining:
            totalMs > 0 ? Math.round((remainingMs / totalMs) * 100) : 0,
          isOverdue,
          isSubmitted,
        },
      };
    }),
    affectedAssets: incident.affectedAssets.map((a) => ({
      id: a.id,
      assetName: a.assetName,
      cosparId: a.cosparId,
      noradId: a.noradId,
    })),
  };
}

/**
 * List active incidents with countdown summaries
 */
export async function listActiveIncidents(
  supervisionId: string,
  filters?: { category?: string; severity?: string },
): Promise<ActiveIncidentSummary[]> {
  const where: Record<string, unknown> = {
    supervisionId,
    workflowState: { notIn: ["closed"] },
  };

  if (filters?.category) where.category = filters.category;
  if (filters?.severity) where.severity = filters.severity;

  const incidents = await prisma.incident.findMany({
    where,
    include: {
      nis2Phases: {
        orderBy: { deadline: "asc" },
      },
    },
    orderBy: { detectedAt: "desc" },
  });

  const now = Date.now();

  return incidents.map((incident) => {
    const phases = incident.nis2Phases;
    const submitted = phases.filter((p) => p.status === "submitted").length;
    const overdue = phases.filter(
      (p) => p.status !== "submitted" && now > p.deadline.getTime(),
    ).length;

    const nextPending = phases.find(
      (p) => p.status !== "submitted" && p.deadline.getTime() > now,
    );

    // Most urgent deadline (smallest remaining time)
    const pendingPhases = phases.filter((p) => p.status !== "submitted");
    const urgentDeadlineMs =
      pendingPhases.length > 0
        ? Math.min(...pendingPhases.map((p) => p.deadline.getTime() - now))
        : null;

    return {
      id: incident.id,
      incidentNumber: incident.incidentNumber,
      category: incident.category,
      severity: incident.severity,
      workflowState: incident.workflowState,
      title: incident.title,
      detectedAt: incident.detectedAt.toISOString(),
      nis2PhasesSummary: {
        total: phases.length,
        submitted,
        overdue,
        nextDeadline: nextPending?.deadline.toISOString() || null,
        nextPhase: nextPending?.phase || null,
      },
      urgentDeadlineMs,
    };
  });
}

/**
 * Submit a NIS2 phase (mark as submitted)
 */
export async function submitNIS2Phase(
  incidentId: string,
  phase: string,
  userId: string,
  referenceNumber?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const phaseRecord = await prisma.incidentNIS2Phase.findUnique({
      where: { incidentId_phase: { incidentId, phase } },
    });

    if (!phaseRecord) {
      return { success: false, error: "Phase not found" };
    }

    if (phaseRecord.status === "submitted") {
      return { success: false, error: "Phase already submitted" };
    }

    await prisma.incidentNIS2Phase.update({
      where: { id: phaseRecord.id },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        referenceNumber: referenceNumber || undefined,
      },
    });

    // Audit log
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      select: { incidentNumber: true },
    });

    await logAuditEvent({
      userId,
      action: "incident_nis2_phase_submitted",
      entityType: "incident",
      entityId: incidentId,
      newValue: { phase, referenceNumber },
      description: `${incident?.incidentNumber || incidentId} — NIS2 phase "${phase}" marked as submitted`,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit phase",
    };
  }
}

/**
 * Calculate NIS2 phase deadlines from detection time
 */
export function calculatePhaseDeadlines(
  detectedAt: Date,
  isNIS2Significant: boolean,
): Record<string, Date> {
  const deadlines: Record<string, Date> = {};

  if (!isNIS2Significant) return deadlines;

  // Early warning — 24h from detection (DST-safe)
  const earlyWarning = new Date(
    detectedAt.getTime() + NIS2_REPORTING_TIMELINE.earlyWarningHours * 3600000,
  );
  deadlines.early_warning = earlyWarning;

  // Notification — 72h from detection (DST-safe)
  const notification = new Date(
    detectedAt.getTime() + NIS2_REPORTING_TIMELINE.notificationHours * 3600000,
  );
  deadlines.notification = notification;

  // intermediate_report: NOT auto-created — only created when NCA requests it
  // per NIS2 Art. 23(4)(c), this is "upon request" of CSIRT/competent authority

  // Final report — 30 days from notification (72h + 30 days) (DST-safe)
  const finalReport = new Date(
    notification.getTime() + NIS2_REPORTING_TIMELINE.finalReportDays * 86400000,
  );
  deadlines.final_report = finalReport;

  return deadlines;
}
