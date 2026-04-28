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
 * Cron endpoint for GDPR Art. 5(1)(e) data retention cleanup.
 * Schedule: Daily at 3:00 AM UTC.
 *
 * Each batch below is the *enforcement* layer for a retention period
 * promised in /legal/privacy § 3. The privacy policy is only true if
 * this job runs reliably — keep the two in sync. Periods chosen to
 * match the privacy text exactly:
 *
 *   - Expired sessions / verification tokens     → deleted on expiry
 *   - AnalyticsEvent.userAgent                   → anonymised after  30 days
 *   - AnalyticsEvent                             → deleted after     90 days
 *   - LoginAttempt (brute-force buffer)          → deleted after     90 days
 *   - LoginEvent (security telemetry)            → deleted after    365 days
 *   - SecurityEvent (resolved, low/medium)       → deleted after    365 days
 *                  (unresolved / high / critical → retained for forensics)
 *   - SecurityAuditLog (low/medium)              → deleted after    365 days
 *                      (high / critical          → retained for forensics)
 *   - AstraConversation (+ messages)             → deleted after     6 months
 *   - CrossVerification                          → deleted after     6 months
 *   - SentinelPacket                             → deleted after     1 year
 *   - ComplianceEvidence past validUntil         → flipped to EXPIRED
 *   - DataRoom past expiresAt                    → closed
 *
 * Note: AuditLog (hash-chained compliance trail) is intentionally
 * NOT deleted here. Per privacy § 3(3) and DPA § 4.3 it is retained
 * pseudonymised (userId nulled on user deletion) for up to 7 years
 * as legitimate-interest evidence (Art. 6(1)(f) DSGVO). A future
 * 7-year sweep can be added once the chain-anchoring scheme supports
 * partial deletion without breaking the chain.
 *
 * This endpoint is protected by CRON_SECRET to prevent unauthorized
 * access. Vercel Cron automatically adds the Authorization header.
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
    logger.warn("Unauthorized cron request attempt", {
      endpoint: "data-retention-cleanup",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const results = {
    expiredSessions: 0,
    expiredVerificationTokens: 0,
    oldAnalyticsEvents: 0,
    oldLoginAttempts: 0,
    oldLoginEvents: 0,
    oldSecurityEvents: 0,
    oldSecurityAuditLogs: 0,
    oldAstraConversations: 0,
    oldAstraMessages: 0,
    oldSentinelPackets: 0,
    oldCrossVerifications: 0,
    expiredEvidence: 0,
    closedDataRooms: 0,
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

    // Batch 4: Security telemetry retention (privacy § 3(6) enforcement)
    //
    // ─ LoginAttempt: 90-day rolling window. The brute-force detector
    //   (lib/auth.ts) only consults the last 15-minute slice — anything
    //   older is dead weight. 90 days gives DSAR-response head-room.
    // ─ LoginEvent: 365 days. Keeps a year of "where did I log in from?"
    //   visible to the user under /dashboard/settings/security.
    // ─ SecurityEvent / SecurityAuditLog: 365 days for LOW/MEDIUM only.
    //   HIGH/CRITICAL events stay forever — those are the breach-evidence
    //   records the customer may need years later for an investigation.
    //   Kept "resolved" filter on SecurityEvent so an unresolved alert
    //   never silently disappears.
    const [
      oldLoginAttempts,
      oldLoginEvents,
      oldSecurityEvents,
      oldSecurityAuditLogs,
    ] = await prisma.$transaction([
      prisma.loginAttempt.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      }),
      prisma.loginEvent.deleteMany({
        where: { createdAt: { lt: oneYearAgo } },
      }),
      prisma.securityEvent.deleteMany({
        where: {
          createdAt: { lt: oneYearAgo },
          resolved: true,
          severity: { in: ["LOW", "MEDIUM", "low", "medium"] },
        },
      }),
      prisma.securityAuditLog.deleteMany({
        where: {
          createdAt: { lt: oneYearAgo },
          riskLevel: { in: ["LOW", "MEDIUM"] },
        },
      }),
    ]);
    results.oldLoginAttempts = oldLoginAttempts.count;
    results.oldLoginEvents = oldLoginEvents.count;
    results.oldSecurityEvents = oldSecurityEvents.count;
    results.oldSecurityAuditLogs = oldSecurityAuditLogs.count;
    logger.info("Security telemetry retention cleanup", {
      loginAttempts: oldLoginAttempts.count,
      loginEvents: oldLoginEvents.count,
      securityEvents: oldSecurityEvents.count,
      securityAuditLogs: oldSecurityAuditLogs.count,
    });

    // Batch 5: Sentinel data retention
    // CrossVerification records >6 months (derived data, can be recomputed)
    // SentinelPacket records >1 year (keep audit-relevant window)
    const [oldCrossVerifications, oldSentinelPackets] =
      await prisma.$transaction([
        prisma.crossVerification.deleteMany({
          where: { verifiedAt: { lt: sixMonthsAgo } },
        }),
        prisma.sentinelPacket.deleteMany({
          where: { processedAt: { lt: oneYearAgo } },
        }),
      ]);
    results.oldCrossVerifications = oldCrossVerifications.count;
    results.oldSentinelPackets = oldSentinelPackets.count;
    logger.info("Sentinel data retention cleanup", {
      crossVerifications: oldCrossVerifications.count,
      sentinelPackets: oldSentinelPackets.count,
    });

    // Batch 6: Close expired data rooms
    try {
      const { closeExpiredDataRooms } =
        await import("@/lib/services/data-room");
      const closed = await closeExpiredDataRooms();
      results.closedDataRooms = closed;
      if (closed > 0) {
        logger.info(`[Cron] Closed ${closed} expired data rooms`);
      }
    } catch (err) {
      logger.warn(
        "Data room expiry check failed",
        err as Record<string, unknown>,
      );
    }

    // Batch 7: Expire evidence past validUntil date
    const expiredEvidence = await prisma.complianceEvidence.updateMany({
      where: {
        status: "ACCEPTED",
        validUntil: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
    results.expiredEvidence = expiredEvidence.count;
    if (expiredEvidence.count > 0) {
      logger.info(
        `Expired ${expiredEvidence.count} evidence records past validUntil`,
      );
    }

    const duration = Date.now() - startTime;
    const totalDeleted =
      results.expiredSessions +
      results.expiredVerificationTokens +
      results.oldAnalyticsEvents +
      results.oldLoginAttempts +
      results.oldLoginEvents +
      results.oldSecurityEvents +
      results.oldSecurityAuditLogs +
      results.oldAstraConversations +
      results.oldAstraMessages +
      results.oldSentinelPackets +
      results.oldCrossVerifications +
      results.closedDataRooms;

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
    logger.error("Data retention cleanup cron job failed", error);

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
 * C4 fix: POST alias removed. Previously this re-invoked GET(req), which
 * meant anyone holding CRON_SECRET could trigger expensive deleteMany
 * transactions via POST with no additional guard. Vercel Cron only calls
 * GET; manual tests should use `curl -H "Authorization: Bearer $CRON_SECRET"`
 * against the GET endpoint.
 */
