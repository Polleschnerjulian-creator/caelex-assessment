import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

const CDM_RETENTION_DAYS = 90;
const LOG_RETENTION_DAYS = 180;

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
 * Weekly cron endpoint for CA data cleanup.
 * Schedule: Sunday 02:00 UTC
 *
 * 1. Deletes CDM records for CLOSED conjunction events (90+ days after closure)
 * 2. Deletes escalation logs for CLOSED conjunction events (180+ days after closure)
 *
 * Keeps ConjunctionEvent records themselves indefinitely for summary/audit purposes.
 */
export async function GET(req: Request) {
  const start = Date.now();

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("[Shield] CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cdmCutoff = new Date(
      Date.now() - CDM_RETENTION_DAYS * 24 * 3600 * 1000,
    );
    const logCutoff = new Date(
      Date.now() - LOG_RETENTION_DAYS * 24 * 3600 * 1000,
    );

    // Delete old CDM records for events closed 90+ days ago
    const cdmResult = await prisma.cDMRecord.deleteMany({
      where: {
        conjunctionEvent: {
          status: "CLOSED",
          closedAt: { lt: cdmCutoff },
        },
      },
    });

    logger.info("[Shield] CA cleanup: deleted old CDM records", {
      count: cdmResult.count,
      cutoffDate: cdmCutoff.toISOString(),
    });

    // Delete old escalation logs for events closed 180+ days ago
    const logResult = await prisma.cAEscalationLog.deleteMany({
      where: {
        conjunctionEvent: {
          status: "CLOSED",
          closedAt: { lt: logCutoff },
        },
      },
    });

    logger.info("[Shield] CA cleanup: deleted old escalation logs", {
      count: logResult.count,
      cutoffDate: logCutoff.toISOString(),
    });

    const durationMs = Date.now() - start;

    logger.info("[Shield] CA cleanup complete", {
      cdmsDeleted: cdmResult.count,
      escalationLogsDeleted: logResult.count,
      durationMs,
    });

    return NextResponse.json({
      message: "CA cleanup complete",
      cdmsDeleted: cdmResult.count,
      escalationLogsDeleted: logResult.count,
      durationMs,
    });
  } catch (error) {
    logger.error("[Shield] CA cleanup failed", error);
    return NextResponse.json({ error: "CA cleanup failed" }, { status: 500 });
  }
}
