import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Process attestation expiry reminders.
 * Checks for attestations expiring within 30 days and 7 days,
 * and creates notifications for the owning organization members.
 */
export async function processAttestationExpiryReminders(): Promise<{
  processed: number;
  notified: number;
  errors: string[];
}> {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);

  const result = { processed: 0, notified: 0, errors: [] as string[] };

  try {
    // Find attestations expiring within 30 days that are still valid
    const expiringAttestations = await prisma.verityAttestation.findMany({
      where: {
        revokedAt: null,
        expiresAt: {
          gt: now,
          lte: in30Days,
        },
      },
      select: {
        id: true,
        attestationId: true,
        operatorId: true,
        regulationRef: true,
        claimStatement: true,
        expiresAt: true,
      },
    });

    result.processed = expiringAttestations.length;

    for (const attestation of expiringAttestations) {
      try {
        const daysUntilExpiry = Math.ceil(
          (attestation.expiresAt.getTime() - now.getTime()) / 86400000,
        );

        // Notify at 30-day and 7-day marks.
        // Use full ranges (<=30, <=7) — dedup via entityId prevents duplicates.
        // Narrow windows (28-30, 5-7) risk missing notifications if cron skips a day.
        const is7DayWindow = daysUntilExpiry <= 7;
        const is30DayWindow = !is7DayWindow && daysUntilExpiry <= 30;

        const severity = is7DayWindow ? "WARNING" : "INFO";
        const title = is7DayWindow
          ? `Attestation expires in ${daysUntilExpiry} days`
          : `Attestation expiring within 30 days`;

        // Dedup: check if we already sent a notification for this attestation
        // Use entityType + entityId to track what we've already notified about
        const entityId = `${attestation.id}_${is7DayWindow ? "7d" : "30d"}`;
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: attestation.operatorId,
            type: "DEADLINE_REMINDER",
            entityType: "verity_attestation",
            entityId,
          },
        });

        if (existingNotification) continue;

        // Create notification
        await prisma.notification.create({
          data: {
            userId: attestation.operatorId,
            type: "DEADLINE_REMINDER",
            title,
            message: `Your attestation for ${attestation.regulationRef} ("${attestation.claimStatement.substring(0, 100)}") expires on ${attestation.expiresAt.toLocaleDateString()}. Renew it to maintain compliance.`,
            actionUrl: "/dashboard/audit-center",
            entityType: "verity_attestation",
            entityId,
            severity: severity as "WARNING" | "INFO",
          },
        });

        result.notified++;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown notification error";
        result.errors.push(
          `Failed to notify for attestation ${attestation.attestationId}: ${msg}`,
        );
      }
    }

    logger.info("Attestation expiry reminders processed", {
      processed: result.processed,
      notified: result.notified,
      errors: result.errors.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(msg);
    logger.error("Attestation expiry processing failed", { error: msg });
  }

  return result;
}
