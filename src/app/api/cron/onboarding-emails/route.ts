import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { processOnboardingEmails } from "@/lib/services/onboarding-email-service";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

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

/**
 * Cron endpoint for processing onboarding email sequences
 * Schedule: Daily at 10:00 AM UTC
 *
 * Sends staged onboarding emails to new users:
 *   Stage 1 (0h)  — Welcome email
 *   Stage 2 (24h) — First assessment prompt
 *   Stage 3 (72h) — Module exploration
 *   Stage 4 (168h) — Team invitation
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 */
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
    logger.warn("Unauthorized cron request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("Starting onboarding email processing...");

    const result = await processOnboardingEmails();

    const duration = Date.now() - startTime;

    logger.info("Onboarding email processing complete:", {
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
      errors: result.errors.slice(0, 10),
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Cron job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: getSafeErrorMessage(
          error,
          "Onboarding email processing failed",
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
  return GET(req);
}
