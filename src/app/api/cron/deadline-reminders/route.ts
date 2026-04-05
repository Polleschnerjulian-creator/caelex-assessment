import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { processDeadlineReminders } from "@/lib/notifications";
import { processAttestationExpiryReminders } from "@/lib/notifications/attestation-expiry";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notification-service";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for Vercel Hobby, 300 for Pro

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

/**
 * Cron endpoint for processing deadline reminders
 * Schedule: Daily at 8:00 AM UTC
 *
 * This endpoint is protected by CRON_SECRET to prevent unauthorized access.
 * Vercel Cron automatically adds the Authorization header.
 */
export async function GET(req: Request) {
  const startTime = Date.now();

  // Verify cron secret — always required, even in development
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    logger.warn("Unauthorized cron request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("Starting deadline reminder processing...");

    const [result, attestationResult] = await Promise.all([
      processDeadlineReminders(),
      processAttestationExpiryReminders().catch((err) => {
        logger.error("Attestation expiry processing failed", err);
        return { processed: 0, notified: 0, errors: [] as string[] };
      }),
    ]);

    // Insurance policy renewal reminders
    let insuranceRenewals = 0;
    try {
      const reminderThresholds = [90, 60, 30, 7]; // days before expiry

      for (const days of reminderThresholds) {
        const targetDate = new Date(Date.now() + days * 86400000);
        const windowStart = new Date(targetDate.getTime() - 12 * 3600000); // 12h window
        const windowEnd = new Date(targetDate.getTime() + 12 * 3600000);

        const expiringPolicies = await prisma.insurancePolicy.findMany({
          where: {
            status: { in: ["active", "expiring_soon"] },
            expirationDate: { gte: windowStart, lte: windowEnd },
          },
          include: {
            assessment: {
              select: { userId: true, organizationId: true },
            },
          },
        });

        for (const policy of expiringPolicies) {
          if (!policy.assessment?.userId) continue;

          try {
            await createNotification({
              userId: policy.assessment.userId,
              type: "DEADLINE_REMINDER",
              title: `Versicherung läuft in ${days} Tagen ab`,
              message: `Ihre ${policy.insuranceType}-Police ${policy.policyNumber || ""} läuft am ${policy.expirationDate?.toLocaleDateString("de-DE")} ab. Bitte erneuern Sie rechtzeitig.`,
              actionUrl: "/dashboard/modules/insurance",
              entityType: "insurance_policy",
              entityId: policy.id,
              severity:
                days <= 7 ? "CRITICAL" : days <= 30 ? "URGENT" : "WARNING",
              organizationId: policy.assessment.organizationId ?? undefined,
            });
            insuranceRenewals++;
          } catch (err: unknown) {
            logger.warn(
              `Failed to send insurance renewal reminder for policy ${policy.id}`,
              err as Record<string, unknown>,
            );
          }
        }
      }
    } catch (err: unknown) {
      logger.warn(
        "Insurance renewal reminders failed",
        err as Record<string, unknown>,
      );
    }

    // Process recurring deadlines (RRULE)
    let rruleResult = { processed: 0, created: 0, errors: 0 };
    try {
      const { processRecurringDeadlines } =
        await import("@/lib/timeline/rrule-processor.server");
      rruleResult = await processRecurringDeadlines();
      logger.info(
        `[Cron] RRULE: processed ${rruleResult.processed}, created ${rruleResult.created}, errors ${rruleResult.errors}`,
      );
    } catch (err) {
      logger.warn("[Cron] RRULE processing failed", err);
    }

    const duration = Date.now() - startTime;

    logger.info("Deadline reminder processing complete:", {
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      errors: result.errors.length,
      attestationsProcessed: attestationResult.processed,
      attestationsNotified: attestationResult.notified,
      insuranceRenewals,
      rrule: rruleResult,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10),
      deadlinesSent: result.deadlinesSent,
      attestations: {
        processed: attestationResult.processed,
        notified: attestationResult.notified,
      },
      insuranceRenewals,
      rrule: rruleResult,
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Cron job failed", error);

    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: getSafeErrorMessage(
          error,
          "Deadline reminder processing failed",
        ),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Health check / manual trigger endpoint
 * POST is used for manual testing
 */
export async function POST(req: Request) {
  // Same logic as GET but for manual triggers
  return GET(req);
}
