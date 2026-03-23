import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/services/notification-service";
import type { ConjunctionEvent, OrganizationRole } from "@prisma/client";

// ─── Elevated role filter ─────────────────────────────────────────────────────

const ELEVATED_ROLES: OrganizationRole[] = ["OWNER", "ADMIN", "MANAGER"];

async function getElevatedMemberIds(organizationId: string): Promise<string[]> {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      role: { in: ELEVATED_ROLES },
    },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

// ─── notifyEscalation ─────────────────────────────────────────────────────────

export async function notifyEscalation(params: {
  organizationId: string;
  eventId: string;
  conjunctionId: string;
  previousTier: string;
  newTier: string;
  satelliteName: string;
  threatName: string;
  latestPc: number;
  missDistance: number;
  tca: Date;
}): Promise<void> {
  const {
    organizationId,
    eventId,
    conjunctionId,
    previousTier,
    newTier,
    satelliteName,
    threatName,
    latestPc,
    missDistance,
    tca,
  } = params;

  // Only notify for HIGH or EMERGENCY
  if (newTier !== "HIGH" && newTier !== "EMERGENCY") {
    return;
  }

  const userIds = await getElevatedMemberIds(organizationId);

  if (userIds.length === 0) {
    logger.info(
      `[Shield] No elevated members to notify for escalation in org ${organizationId}`,
    );
    return;
  }

  const title = `⚠️ Shield Alert: ${newTier} — ${satelliteName} vs ${threatName}`;
  const message = `Conjunction event ${conjunctionId} escalated from ${previousTier} to ${newTier}. Pc: ${latestPc.toExponential(1)}, Miss distance: ${missDistance}m, TCA: ${tca.toISOString()}. Action required.`;
  const type =
    newTier === "EMERGENCY"
      ? ("SHIELD_CONJUNCTION_EMERGENCY" as const)
      : ("SHIELD_CONJUNCTION_HIGH" as const);
  const actionUrl = `/dashboard/shield/${eventId}`;

  logger.info(
    `[Shield] Sending escalation notifications to ${userIds.length} members for event ${eventId} (${previousTier} → ${newTier})`,
  );

  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        userId,
        type,
        title,
        message,
        actionUrl,
        organizationId,
        entityType: "conjunction_event",
        entityId: eventId,
      }).catch((err) => {
        logger.error(
          `[Shield] Failed to create escalation notification for user ${userId}`,
          err,
        );
      }),
    ),
  );
}

// ─── notifyDecisionRequired ───────────────────────────────────────────────────

export async function notifyDecisionRequired(params: {
  organizationId: string;
  eventId: string;
  conjunctionId: string;
  satelliteName: string;
  hoursToTca: number;
}): Promise<void> {
  const { organizationId, eventId, conjunctionId, satelliteName, hoursToTca } =
    params;

  const userIds = await getElevatedMemberIds(organizationId);

  if (userIds.length === 0) {
    logger.info(
      `[Shield] No elevated members to notify for decision required in org ${organizationId}`,
    );
    return;
  }

  const hoursFormatted = hoursToTca.toFixed(1);
  const title = `⏰ Shield: Decision Required — ${satelliteName}`;
  const message = `Conjunction event ${conjunctionId} has no decision recorded and TCA is in ${hoursFormatted}h. A maneuver decision must be made immediately to allow execution time.`;
  const actionUrl = `/dashboard/shield/${eventId}`;

  logger.info(
    `[Shield] Sending decision-required notifications to ${userIds.length} members for event ${eventId} (TCA in ${hoursFormatted}h)`,
  );

  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        userId,
        type: "SHIELD_CONJUNCTION_HIGH",
        title,
        message,
        actionUrl,
        organizationId,
        entityType: "conjunction_event",
        entityId: eventId,
      }).catch((err) => {
        logger.error(
          `[Shield] Failed to create decision-required notification for user ${userId}`,
          err,
        );
      }),
    ),
  );
}

// ─── notifyNcaDeadlineApproaching ────────────────────────────────────────────

export async function notifyNcaDeadlineApproaching(params: {
  organizationId: string;
  eventId: string;
  authority: string;
  hoursRemaining: number;
}): Promise<void> {
  const { organizationId, eventId, authority, hoursRemaining } = params;

  const userIds = await getElevatedMemberIds(organizationId);

  if (userIds.length === 0) {
    logger.info(
      `[Shield] No elevated members to notify for NCA deadline in org ${organizationId}`,
    );
    return;
  }

  const hoursFormatted = hoursRemaining.toFixed(1);
  const title = `📋 Shield: NCA Reporting Deadline in ${hoursFormatted}h — ${authority}`;
  const message = `The NCA reporting deadline for ${authority} is approaching. ${hoursFormatted} hours remaining to submit the conjunction event report. Failure to notify may constitute a regulatory breach.`;
  const actionUrl = `/dashboard/shield/${eventId}`;

  logger.info(
    `[Shield] Sending NCA-deadline notifications to ${userIds.length} members for event ${eventId} (${hoursFormatted}h remaining)`,
  );

  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        userId,
        type: "NCA_DEADLINE_APPROACHING",
        title,
        message,
        actionUrl,
        organizationId,
        entityType: "conjunction_event",
        entityId: eventId,
      }).catch((err) => {
        logger.error(
          `[Shield] Failed to create NCA-deadline notification for user ${userId}`,
          err,
        );
      }),
    ),
  );
}

// ─── checkAndNotify ───────────────────────────────────────────────────────────

/**
 * Compare previous and current tier for a ConjunctionEvent and fire
 * notifyEscalation if the tier escalated to HIGH or EMERGENCY.
 *
 * Designed to be called non-blocking from the CDM polling cron:
 *
 *   checkAndNotify(event, previousTier, satelliteName).catch(() => {});
 */
export async function checkAndNotify(
  event: ConjunctionEvent,
  previousTier: string,
  satelliteName: string,
): Promise<void> {
  const newTier = event.riskTier as string;

  if (newTier === previousTier) return;
  if (newTier !== "HIGH" && newTier !== "EMERGENCY") return;

  await notifyEscalation({
    organizationId: event.organizationId,
    eventId: event.id,
    conjunctionId: event.conjunctionId,
    previousTier,
    newTier,
    satelliteName,
    threatName: event.threatObjectName ?? "Unknown",
    latestPc: event.latestPc,
    missDistance: event.latestMissDistance,
    tca: event.tca,
  });
}
