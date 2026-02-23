import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";

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
 * Cron endpoint for GDPR Art. 5(1)(e) data retention cleanup
 * Schedule: Daily at 3:00 AM UTC
 *
 * Cleans up:
 * - Expired sessions (expires < now)
 * - Expired verification tokens (expires < now)
 * - Analytics events older than 90 days
 * - ASTRA conversations (+ cascaded messages) older than 6 months
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
    return NextResponse.json(
      { error: "Service unavailable: cron authentication not configured" },
      { status: 503 },
    );
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    logger.warn("Unauthorized cron request attempt", {
      endpoint: "data-retention-cleanup",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const results = {
    expiredSessions: 0,
    expiredVerificationTokens: 0,
    oldAnalyticsEvents: 0,
    oldAstraConversations: 0,
    oldAstraMessages: 0,
  };

  try {
    logger.info("Starting data retention cleanup (GDPR Art. 5(1)(e))...");

    // Batch 1: Atomic cleanup of expired auth data (sessions + tokens)
    const [expiredSessions, expiredTokens] = await prisma.$transaction([
      prisma.session.deleteMany({
        where: { expires: { lt: now } },
      }),
      prisma.verificationToken.deleteMany({
        where: { expires: { lt: now } },
      }),
    ]);
    results.expiredSessions = expiredSessions.count;
    results.expiredVerificationTokens = expiredTokens.count;
    logger.info("Deleted expired auth data (transaction)", {
      sessions: expiredSessions.count,
      tokens: expiredTokens.count,
    });

    // Batch 2: Atomic analytics cleanup (anonymize + delete old)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [anonymizedIps, oldAnalytics] = await prisma.$transaction([
      prisma.analyticsEvent.updateMany({
        where: {
          timestamp: { lt: thirtyDaysAgo },
          userAgent: { not: null },
        },
        data: { userAgent: null },
      }),
      prisma.analyticsEvent.deleteMany({
        where: { timestamp: { lt: ninetyDaysAgo } },
      }),
    ]);
    results.oldAnalyticsEvents = oldAnalytics.count;
    logger.info("Analytics cleanup (transaction)", {
      anonymized: anonymizedIps.count,
      deleted: oldAnalytics.count,
    });

    // 4. Delete old ASTRA conversations older than 6 months
    //    AstraMessage has onDelete: Cascade from AstraConversation,
    //    so messages are automatically deleted with their conversations.
    //    First, count messages that will be cascade-deleted for logging.
    const oldAstraMessages = await prisma.astraMessage.count({
      where: {
        conversation: {
          updatedAt: { lt: sixMonthsAgo },
        },
      },
    });
    results.oldAstraMessages = oldAstraMessages;

    const oldAstraConversations = await prisma.astraConversation.deleteMany({
      where: {
        updatedAt: { lt: sixMonthsAgo },
      },
    });
    results.oldAstraConversations = oldAstraConversations.count;
    logger.info("Deleted old ASTRA conversations (>6 months)", {
      conversations: oldAstraConversations.count,
      messages: oldAstraMessages,
    });

    const duration = Date.now() - startTime;
    const totalDeleted =
      results.expiredSessions +
      results.expiredVerificationTokens +
      results.oldAnalyticsEvents +
      results.oldAstraConversations +
      results.oldAstraMessages;

    logger.info("Data retention cleanup complete", {
      totalDeleted,
      duration: `${duration}ms`,
      ...results,
    });

    return NextResponse.json({
      success: true,
      deleted: results,
      totalDeleted,
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Data retention cleanup cron job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Data retention cleanup failed",
        message: getSafeErrorMessage(
          error,
          "Data retention cleanup processing failed",
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
