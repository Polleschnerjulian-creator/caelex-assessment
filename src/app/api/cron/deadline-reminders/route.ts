import { NextResponse } from "next/server";
import { processDeadlineReminders } from "@/lib/notifications";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for Vercel Hobby, 300 for Pro

/**
 * Cron endpoint for processing deadline reminders
 * Schedule: Daily at 8:00 AM UTC
 *
 * This endpoint is protected by CRON_SECRET to prevent unauthorized access.
 * Vercel Cron automatically adds the Authorization header.
 */
export async function GET(req: Request) {
  const startTime = Date.now();

  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  // In production, CRON_SECRET must be set
  if (!isDev && !cronSecret) {
    logger.error("CRON_SECRET not configured in production");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  // Verify authorization in non-development environments
  if (!isDev && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn("Unauthorized cron request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isDev && !cronSecret) {
    logger.warn("[DEV] CRON_SECRET not set - bypassing auth for development");
  }

  try {
    logger.info("Starting deadline reminder processing...");

    const result = await processDeadlineReminders();

    const duration = Date.now() - startTime;

    logger.info("Deadline reminder processing complete:", {
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
      deadlinesSent: result.deadlinesSent,
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
