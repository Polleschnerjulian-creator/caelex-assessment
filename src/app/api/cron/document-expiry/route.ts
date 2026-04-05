import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { processDocumentExpiry } from "@/lib/notifications";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

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
 * Cron endpoint for processing document expiry alerts
 * Schedule: Daily at 9:00 AM UTC
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
    logger.info("Starting document expiry processing...");

    const result = await processDocumentExpiry();

    // Insurance policy expiry check (BUG-06)
    try {
      const ninetyDaysFromNow = new Date(Date.now() + 90 * 86400000);
      const expiringPolicies = await prisma.insurancePolicy.updateMany({
        where: {
          status: "active",
          expirationDate: { lte: ninetyDaysFromNow, gte: new Date() },
        },
        data: { status: "expiring_soon" },
      });
      if (expiringPolicies.count > 0) {
        logger.info(
          `[Cron] Marked ${expiringPolicies.count} insurance policies as expiring_soon`,
        );
      }

      // Also expire already-past policies
      const expiredPolicies = await prisma.insurancePolicy.updateMany({
        where: {
          status: { in: ["active", "expiring_soon"] },
          expirationDate: { lt: new Date() },
        },
        data: { status: "expired" },
      });
      if (expiredPolicies.count > 0) {
        logger.info(
          `[Cron] Expired ${expiredPolicies.count} insurance policies`,
        );
      }
    } catch (err) {
      logger.warn("Insurance expiry check failed", err);
    }

    const duration = Date.now() - startTime;

    logger.info("Document expiry processing complete:", {
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      errors: result.errors.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10), // Limit errors in response
      documentsSent: result.documentsSent,
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
          "Document expiry processing failed",
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
