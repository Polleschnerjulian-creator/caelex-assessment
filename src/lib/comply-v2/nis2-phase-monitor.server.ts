/**
 * Sprint C — NIS2 Phase Deadline Monitor.
 *
 * Hourly cron-driven enforcement of Art. 23 NIS2 reporting cadence:
 *
 *   ┌─────────────┬─────────┬──────────────────────────────────────┐
 *   │ Phase        │ Deadline│ Reference                            │
 *   ├─────────────┼─────────┼──────────────────────────────────────┤
 *   │ early_warning│ +24 h   │ Art. 23 (4) (a) — "early warning"    │
 *   │ notification │ +72 h   │ Art. 23 (4) (b) — "incident notif."  │
 *   │ intermediate │ +1 mo   │ Art. 23 (4) (c) — "intermediate rpt" │
 *   │ final_report │ +1 mo   │ Art. 23 (4) (d) — "final report"     │
 *   └─────────────┴─────────┴──────────────────────────────────────┘
 *
 * Per phase, the monitor escalates through 4 thresholds:
 *
 *   T-12h  → WARNING       → notify reporter (INCIDENT_DEADLINE_WARNING)
 *   T- 2h  → CRITICAL      → notify reporter (INCIDENT_DEADLINE_CRITICAL)
 *   T+ 0   → OVERDUE       → notify reporter (INCIDENT_DEADLINE_OVERDUE)
 *   T+24h  → ESCALATED     → notify entire org (INCIDENT_ESCALATED)
 *
 * Each transition is one-way: the corresponding `*At` timestamp is
 * set on the IncidentNIS2Phase row, which makes the next cron run a
 * no-op for that threshold. Phases with `submittedAt != null` are
 * always skipped — they're already in compliance.
 *
 * # Why hourly
 *
 * Aerospace incident reporting deadlines have a "wall clock" feel —
 * Art. 23 (4) (a) is "innerhalb von 24 Stunden", not "innerhalb des
 * Geschäftstages". An hourly cron means worst-case discovery latency
 * is 1 hour, well below the 2h critical threshold. Going to every
 * 5–15 min would help latency at the cost of 12-96× the warm-cron
 * spend; not worth it for the current threshold-resolution.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import {
  notifyUser,
  notifyOrganization,
} from "@/lib/services/notification-service";

export interface MonitorResult {
  scannedPhases: number;
  warnedApproaching: number;
  warnedCritical: number;
  markedOverdue: number;
  escalated: number;
  errors: number;
  elapsedMs: number;
}

export const APPROACHING_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 h
export const CRITICAL_THRESHOLD_MS = 2 * 60 * 60 * 1000; //  2 h
export const ESCALATION_AFTER_OVERDUE_MS = 24 * 60 * 60 * 1000; // 24 h

const PHASE_LABELS: Record<string, string> = {
  early_warning: "Early Warning (24 h)",
  notification: "Incident Notification (72 h)",
  intermediate_report: "Intermediate Report (1 month)",
  final_report: "Final Report (1 month)",
};

/**
 * Walk every non-submitted phase and escalate where appropriate.
 * Returns aggregate counts; per-phase failures are logged + counted
 * but never throw (an SMTP outage shouldn't block other phases).
 */
export async function runPhaseMonitor(
  now: Date = new Date(),
): Promise<MonitorResult> {
  const start = Date.now();
  const result: MonitorResult = {
    scannedPhases: 0,
    warnedApproaching: 0,
    warnedCritical: 0,
    markedOverdue: 0,
    escalated: 0,
    errors: 0,
    elapsedMs: 0,
  };

  // Pull every phase that's not yet submitted AND has at least one
  // unfired threshold below the current time. The `OR` covers all
  // four tiers — Prisma turns this into a single indexed query.
  const phases = await prisma.incidentNIS2Phase.findMany({
    where: {
      submittedAt: null,
      OR: [
        // T-12h tier: deadline in the next 12h, no warning yet
        {
          warnedApproachingAt: null,
          deadline: {
            gte: now,
            lte: new Date(now.getTime() + APPROACHING_THRESHOLD_MS),
          },
        },
        // T-2h tier: deadline in the next 2h, no critical yet
        {
          warnedCriticalAt: null,
          deadline: {
            gte: now,
            lte: new Date(now.getTime() + CRITICAL_THRESHOLD_MS),
          },
        },
        // T+0 tier: past deadline, no overdue marker yet
        {
          markedOverdueAt: null,
          deadline: { lt: now },
        },
        // T+24h tier: 24h past deadline, no escalation yet
        {
          escalatedAt: null,
          deadline: {
            lt: new Date(now.getTime() - ESCALATION_AFTER_OVERDUE_MS),
          },
        },
      ],
    },
    include: {
      incident: {
        select: {
          id: true,
          incidentNumber: true,
          title: true,
          severity: true,
          supervision: {
            select: {
              userId: true,
              user: {
                select: {
                  organizationMemberships: {
                    take: 1,
                    orderBy: { joinedAt: "asc" },
                    select: { organizationId: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    take: 500, // Safety cap — a hot rerun can catch up 500 phases / hour
  });

  result.scannedPhases = phases.length;

  for (const phase of phases) {
    try {
      const action = pickNextAction(phase, now);
      if (!action) continue;

      await fireAction(phase, action, result);
    } catch (e) {
      result.errors++;
      logger.error(
        `nis2-phase-monitor: phase ${phase.id} (${phase.phase}) failed`,
        e,
      );
    }
  }

  result.elapsedMs = Date.now() - start;
  return result;
}

// ─── Action picker ────────────────────────────────────────────────────────

type Action = "approaching" | "critical" | "overdue" | "escalated";

interface PhaseRow {
  id: string;
  phase: string;
  deadline: Date;
  warnedApproachingAt: Date | null;
  warnedCriticalAt: Date | null;
  markedOverdueAt: Date | null;
  escalatedAt: Date | null;
  incident: {
    id: string;
    incidentNumber: string;
    title: string;
    severity: string;
    supervision: {
      userId: string;
      user: {
        organizationMemberships: Array<{ organizationId: string }>;
      };
    };
  };
}

/**
 * Returns the highest-priority action that should fire NOW for this
 * phase. Returns null if all applicable thresholds have already been
 * fired. Order of escalation: ESCALATED > OVERDUE > CRITICAL >
 * APPROACHING — we always pick the highest tier whose timestamp is
 * still null + threshold has been crossed.
 */
export function pickNextAction(
  phase: Pick<
    PhaseRow,
    | "deadline"
    | "warnedApproachingAt"
    | "warnedCriticalAt"
    | "markedOverdueAt"
    | "escalatedAt"
  >,
  now: Date,
): Action | null {
  const deadlineMs = phase.deadline.getTime();
  const nowMs = now.getTime();
  const ms = deadlineMs - nowMs; // positive = future, negative = past

  // T+24h escalation
  if (!phase.escalatedAt && nowMs - deadlineMs >= ESCALATION_AFTER_OVERDUE_MS) {
    return "escalated";
  }
  // T+0 overdue
  if (!phase.markedOverdueAt && deadlineMs < nowMs) {
    return "overdue";
  }
  // T-2h critical
  if (!phase.warnedCriticalAt && ms <= CRITICAL_THRESHOLD_MS && ms > 0) {
    return "critical";
  }
  // T-12h approaching
  if (!phase.warnedApproachingAt && ms <= APPROACHING_THRESHOLD_MS && ms > 0) {
    return "approaching";
  }
  return null;
}

// ─── Action executor ──────────────────────────────────────────────────────

async function fireAction(
  phase: PhaseRow,
  action: Action,
  result: MonitorResult,
): Promise<void> {
  const phaseLabel = PHASE_LABELS[phase.phase] ?? phase.phase;
  const reporterId = phase.incident.supervision.userId;
  const orgId =
    phase.incident.supervision.user.organizationMemberships[0]
      ?.organizationId ?? null;
  const incidentUrl = `/dashboard/incidents/${phase.incident.id}`;
  const deadlineISO = phase.deadline.toISOString();

  switch (action) {
    case "approaching": {
      await notifyUser(
        reporterId,
        "INCIDENT_DEADLINE_WARNING",
        `NIS2 deadline in <12h: ${phaseLabel}`,
        `Incident ${phase.incident.incidentNumber} — "${phase.incident.title}". Phase "${phaseLabel}" is due ${deadlineISO}. Submit before the 24h / 72h / 1-month statutory deadline.`,
        {
          actionUrl: incidentUrl,
          entityType: "incident",
          entityId: phase.incident.id,
          severity: "WARNING",
          ...(orgId ? { organizationId: orgId } : {}),
        },
      );
      await prisma.incidentNIS2Phase.update({
        where: { id: phase.id },
        data: { warnedApproachingAt: new Date() },
      });
      result.warnedApproaching++;
      break;
    }
    case "critical": {
      await notifyUser(
        reporterId,
        "INCIDENT_DEADLINE_CRITICAL",
        `NIS2 deadline in <2h: ${phaseLabel}`,
        `Incident ${phase.incident.incidentNumber} — "${phase.incident.title}". Phase "${phaseLabel}" is due ${deadlineISO}. Submit IMMEDIATELY to avoid Art. 23 NIS2 violation.`,
        {
          actionUrl: incidentUrl,
          entityType: "incident",
          entityId: phase.incident.id,
          severity: "CRITICAL",
          ...(orgId ? { organizationId: orgId } : {}),
        },
      );
      await prisma.incidentNIS2Phase.update({
        where: { id: phase.id },
        data: { warnedCriticalAt: new Date() },
      });
      result.warnedCritical++;
      break;
    }
    case "overdue": {
      await notifyUser(
        reporterId,
        "INCIDENT_DEADLINE_OVERDUE",
        `NIS2 deadline MISSED: ${phaseLabel}`,
        `Incident ${phase.incident.incidentNumber} — "${phase.incident.title}". Phase "${phaseLabel}" was due ${deadlineISO}. Submit immediately and document the delay reason in the incident notes for the regulator.`,
        {
          actionUrl: incidentUrl,
          entityType: "incident",
          entityId: phase.incident.id,
          severity: "CRITICAL",
          ...(orgId ? { organizationId: orgId } : {}),
        },
      );
      await prisma.incidentNIS2Phase.update({
        where: { id: phase.id },
        data: {
          markedOverdueAt: new Date(),
          status: "overdue",
        },
      });
      // Audit-log: this is a regulatory event worth preserving in the
      // hash chain even if it's auto-generated.
      await logAuditEvent({
        userId: reporterId,
        action: "comply_v2_triage_acknowledged", // re-uses existing verb
        entityType: "nis2_assessment",
        entityId: phase.incident.id,
        description: `NIS2 phase "${phaseLabel}" marked overdue (deadline ${deadlineISO})`,
        ...(orgId ? { organizationId: orgId } : {}),
      });
      result.markedOverdue++;
      break;
    }
    case "escalated": {
      // Both: notify reporter again AND escalate to entire org.
      await notifyUser(
        reporterId,
        "INCIDENT_ESCALATED",
        `NIS2 phase 24h overdue: ${phaseLabel}`,
        `Incident ${phase.incident.incidentNumber} — "${phase.incident.title}". Phase "${phaseLabel}" has been overdue for 24h. The regulator may treat the silence as non-cooperation. Notify counsel.`,
        {
          actionUrl: incidentUrl,
          entityType: "incident",
          entityId: phase.incident.id,
          severity: "CRITICAL",
          ...(orgId ? { organizationId: orgId } : {}),
        },
      );
      if (orgId) {
        await notifyOrganization(
          orgId,
          "INCIDENT_ESCALATED",
          `Escalation: NIS2 phase 24h overdue (${phase.incident.incidentNumber})`,
          `Phase "${phaseLabel}" was due ${deadlineISO} and remains unsubmitted 24h later. Regulatory exposure escalating.`,
          {
            actionUrl: incidentUrl,
            entityType: "incident",
            entityId: phase.incident.id,
            severity: "CRITICAL",
            excludeUserIds: [reporterId],
          },
        );
      }
      await prisma.incidentNIS2Phase.update({
        where: { id: phase.id },
        data: { escalatedAt: new Date() },
      });
      result.escalated++;
      break;
    }
  }
}
