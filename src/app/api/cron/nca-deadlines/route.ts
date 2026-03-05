/**
 * NCA Deadline Monitoring Cron Job
 * Schedule: Daily at 7:00 AM UTC
 *
 * Checks all non-terminal submissions for:
 * 1. Follow-up deadlines within 3 days → NCA_DEADLINE_APPROACHING
 * 2. Overdue follow-ups → NCA_FOLLOW_UP_REQUIRED
 * 3. Submissions in SUBMITTED for >14 days with no update → reminder
 * 4. GDPR breach reports approaching 72h authority notification deadline
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/services/notification-service";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { processBreachEscalations } from "@/lib/services/breach-notification-service";

export const runtime = "nodejs";
export const maxDuration = 60;

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

async function processNCADeadlines() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const terminalStatuses = ["APPROVED", "REJECTED", "WITHDRAWN"];
  let notificationsSent = 0;
  const errors: string[] = [];

  // 1. Follow-up deadlines within 3 days
  try {
    const approachingDeadlines = await prisma.nCASubmission.findMany({
      where: {
        status: { notIn: terminalStatuses as never[] },
        followUpDeadline: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
      select: {
        id: true,
        userId: true,
        ncaAuthorityName: true,
        followUpDeadline: true,
      },
    });

    for (const sub of approachingDeadlines) {
      try {
        const daysLeft = Math.ceil(
          (sub.followUpDeadline!.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        await notifyUser(
          sub.userId,
          "NCA_DEADLINE_APPROACHING",
          `Follow-up deadline in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
          `Your follow-up deadline for ${sub.ncaAuthorityName} submission is approaching. Please respond before ${sub.followUpDeadline!.toLocaleDateString()}.`,
          {
            actionUrl: `/dashboard/nca-portal/submissions/${sub.id}`,
            entityType: "nca_submission",
            entityId: sub.id,
          },
        );
        notificationsSent++;
      } catch (err) {
        errors.push(
          `Failed to notify for approaching deadline ${sub.id}: ${err}`,
        );
      }
    }
  } catch (err) {
    errors.push(`Failed to query approaching deadlines: ${err}`);
  }

  // 2. Overdue follow-ups
  try {
    const overdueFollowUps = await prisma.nCASubmission.findMany({
      where: {
        status: { notIn: terminalStatuses as never[] },
        followUpRequired: true,
        followUpDeadline: { lt: now },
      },
      select: {
        id: true,
        userId: true,
        ncaAuthorityName: true,
        followUpDeadline: true,
      },
    });

    for (const sub of overdueFollowUps) {
      try {
        const daysOverdue = Math.ceil(
          (now.getTime() - sub.followUpDeadline!.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        await notifyUser(
          sub.userId,
          "NCA_FOLLOW_UP_REQUIRED",
          `Overdue follow-up: ${sub.ncaAuthorityName}`,
          `Your follow-up for ${sub.ncaAuthorityName} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue. Please respond immediately.`,
          {
            actionUrl: `/dashboard/nca-portal/submissions/${sub.id}`,
            entityType: "nca_submission",
            entityId: sub.id,
            severity: "URGENT",
          },
        );
        notificationsSent++;
      } catch (err) {
        errors.push(`Failed to notify for overdue follow-up ${sub.id}: ${err}`);
      }
    }
  } catch (err) {
    errors.push(`Failed to query overdue follow-ups: ${err}`);
  }

  // 3. Stale SUBMITTED submissions (>14 days no update)
  try {
    const staleSubmissions = await prisma.nCASubmission.findMany({
      where: {
        status: "SUBMITTED",
        updatedAt: { lt: fourteenDaysAgo },
      },
      select: {
        id: true,
        userId: true,
        ncaAuthorityName: true,
        submittedAt: true,
      },
    });

    for (const sub of staleSubmissions) {
      try {
        const daysSinceSubmission = Math.ceil(
          (now.getTime() - sub.submittedAt.getTime()) / (1000 * 60 * 60 * 24),
        );

        await notifyUser(
          sub.userId,
          "NCA_STATUS_CHANGED",
          `No response from ${sub.ncaAuthorityName}`,
          `Your submission to ${sub.ncaAuthorityName} has been pending for ${daysSinceSubmission} days with no update. Consider following up.`,
          {
            actionUrl: `/dashboard/nca-portal/submissions/${sub.id}`,
            entityType: "nca_submission",
            entityId: sub.id,
          },
        );
        notificationsSent++;
      } catch (err) {
        errors.push(`Failed to notify for stale submission ${sub.id}: ${err}`);
      }
    }
  } catch (err) {
    errors.push(`Failed to query stale submissions: ${err}`);
  }

  // 4. SLA deadline approaching (within 3 days)
  try {
    const slaApproaching = await prisma.nCASubmission.findMany({
      where: {
        status: { notIn: terminalStatuses as never[] },
        slaDeadline: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
      select: {
        id: true,
        userId: true,
        ncaAuthorityName: true,
        slaDeadline: true,
      },
    });

    for (const sub of slaApproaching) {
      try {
        await notifyUser(
          sub.userId,
          "NCA_DEADLINE_APPROACHING",
          `SLA deadline approaching: ${sub.ncaAuthorityName}`,
          `The SLA deadline for your ${sub.ncaAuthorityName} submission is approaching on ${sub.slaDeadline!.toLocaleDateString()}.`,
          {
            actionUrl: `/dashboard/nca-portal/submissions/${sub.id}`,
            entityType: "nca_submission",
            entityId: sub.id,
          },
        );
        notificationsSent++;
      } catch (err) {
        errors.push(`Failed to notify for SLA deadline ${sub.id}: ${err}`);
      }
    }
  } catch (err) {
    errors.push(`Failed to query SLA deadlines: ${err}`);
  }

  return { notificationsSent, errors };
}

export async function GET(req: Request) {
  const startTime = Date.now();

  // Verify cron secret — always required, even in development
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Service unavailable: cron authentication not configured" },
      { status: 503 },
    );
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    logger.warn("Unauthorized NCA deadline cron request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("Starting NCA deadline monitoring...");

    const result = await processNCADeadlines();

    // 5. GDPR breach escalation check (Art. 33 — 72h authority notification)
    let breachResult = { escalated: 0, errors: [] as string[] };
    try {
      breachResult = await processBreachEscalations();
      if (breachResult.escalated > 0) {
        logger.warn("GDPR breach escalations processed", {
          escalated: breachResult.escalated,
        });
      }
    } catch (err) {
      logger.error("Breach escalation processing failed", err);
      breachResult.errors.push(
        `Breach escalation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // 6. Incident NIS2 phase deadline monitoring
    let incidentPhaseNotifications = 0;
    const incidentErrors: string[] = [];
    try {
      const pendingPhases = await prisma.incidentNIS2Phase.findMany({
        where: {
          status: { in: ["pending", "draft_ready"] },
        },
        include: {
          incident: {
            select: {
              id: true,
              incidentNumber: true,
              title: true,
              supervision: {
                select: { userId: true },
              },
            },
          },
        },
      });

      const now = new Date();

      for (const phase of pendingPhases) {
        try {
          const deadlineMs = phase.deadline.getTime();
          const createdMs = phase.createdAt.getTime();
          const totalMs = deadlineMs - createdMs;
          const remainingMs = deadlineMs - now.getTime();
          const percentRemaining =
            totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;
          const hoursRemaining = remainingMs / (1000 * 60 * 60);

          const userId = phase.incident.supervision.userId;
          const incNum = phase.incident.incidentNumber;
          const phaseLabel = phase.phase.replace(/_/g, " ");

          if (remainingMs <= 0) {
            // Overdue
            await prisma.incidentNIS2Phase.update({
              where: { id: phase.id },
              data: { status: "overdue" },
            });
            await notifyUser(
              userId,
              "INCIDENT_DEADLINE_OVERDUE",
              `OVERDUE: ${incNum} — ${phaseLabel}`,
              `The ${phaseLabel} deadline for ${incNum} is overdue. Submit immediately to avoid regulatory penalties.`,
              {
                actionUrl: "/dashboard/incidents",
                entityType: "incident",
                entityId: phase.incident.id,
                severity: "URGENT",
              },
            );
            incidentPhaseNotifications++;
          } else if (hoursRemaining < 2 || percentRemaining < 10) {
            // Critical
            await notifyUser(
              userId,
              "INCIDENT_DEADLINE_CRITICAL",
              `CRITICAL: ${incNum} — ${phaseLabel} due in ${Math.ceil(hoursRemaining)}h`,
              `The ${phaseLabel} deadline for ${incNum} is imminent. Less than ${Math.ceil(hoursRemaining)} hours remaining.`,
              {
                actionUrl: "/dashboard/incidents",
                entityType: "incident",
                entityId: phase.incident.id,
                severity: "CRITICAL",
              },
            );
            incidentPhaseNotifications++;
          } else if (percentRemaining < 25) {
            // Warning (< 25%)
            await notifyUser(
              userId,
              "INCIDENT_DEADLINE_WARNING",
              `${incNum} — ${phaseLabel} deadline approaching`,
              `Less than 25% of the ${phaseLabel} deadline window remains for ${incNum}. Consider preparing your submission.`,
              {
                actionUrl: "/dashboard/incidents",
                entityType: "incident",
                entityId: phase.incident.id,
                severity: "WARNING",
              },
            );
            incidentPhaseNotifications++;
          } else if (percentRemaining < 50) {
            // Info (< 50%)
            await notifyUser(
              userId,
              "INCIDENT_DEADLINE_WARNING",
              `${incNum} — ${phaseLabel} reminder`,
              `The ${phaseLabel} deadline for ${incNum} is at the halfway mark. Due: ${phase.deadline.toLocaleDateString()}.`,
              {
                actionUrl: "/dashboard/incidents",
                entityType: "incident",
                entityId: phase.incident.id,
              },
            );
            incidentPhaseNotifications++;
          }
        } catch (err) {
          incidentErrors.push(`Failed to process phase ${phase.id}: ${err}`);
        }
      }
    } catch (err) {
      incidentErrors.push(`Failed to query incident phases: ${err}`);
    }

    const duration = Date.now() - startTime;
    const allErrors = [
      ...result.errors,
      ...breachResult.errors,
      ...incidentErrors,
    ];

    logger.info("NCA deadline monitoring complete:", {
      notificationsSent: result.notificationsSent,
      breachEscalations: breachResult.escalated,
      incidentPhaseNotifications,
      errors: allErrors.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      notificationsSent: result.notificationsSent,
      breachEscalations: breachResult.escalated,
      incidentPhaseNotifications,
      errorCount: allErrors.length,
      errors: allErrors.slice(0, 10),
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("NCA deadline cron job failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: getSafeErrorMessage(error, "NCA deadline processing failed"),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
