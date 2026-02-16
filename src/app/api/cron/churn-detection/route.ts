/**
 * Cron: Churn Detection
 *
 * GET /api/cron/churn-detection — Detect at-risk organizations and create interventions
 *
 * Queries CustomerHealthScore for high/critical risk or declining scores,
 * creates ChurnIntervention records, and sends re-engagement emails.
 *
 * Schedule: Daily (recommended alongside other cron jobs)
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { detectAtRiskOrganizations } from "@/lib/services/churn-intervention-service";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const startTime = Date.now();

  // ─── Cron Auth ───
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && !cronSecret) {
    logger.error("CRON_SECRET not configured in production");
    return NextResponse.json(
      { error: "Service unavailable: cron authentication not configured" },
      { status: 503 },
    );
  }

  if (!isDev) {
    try {
      const headerBuffer = Buffer.from(authHeader || "");
      const expectedBuffer = Buffer.from(`Bearer ${cronSecret}`);
      if (
        headerBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(headerBuffer, expectedBuffer)
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (isDev && !cronSecret) {
    logger.warn("[DEV] CRON_SECRET not set - bypassing auth for development");
  }

  // ─── Detect At-Risk Organizations ───
  try {
    logger.info("Starting churn detection processing...");

    const results = await detectAtRiskOrganizations();
    const duration = Date.now() - startTime;

    logger.info("Churn detection processing complete", {
      processed: results.processed,
      interventionsCreated: results.interventionsCreated,
      emailsSent: results.emailsSent,
      errorCount: results.errors.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      processed: results.processed,
      interventionsCreated: results.interventionsCreated,
      emailsSent: results.emailsSent,
      errorCount: results.errors.length,
      errors: results.errors.slice(0, 10),
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Churn detection cron job failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: getSafeErrorMessage(
          error,
          "Churn detection processing failed",
        ),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
