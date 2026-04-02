import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  processNewDocuments,
  getRecentHighPriorityUpdates,
} from "@/lib/services/eurlex-service";
import { notifyOrganization } from "@/lib/services/notification-service";
import { prisma } from "@/lib/prisma";
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
 * Cron endpoint for EUR-Lex regulatory feed monitoring
 * Schedule: Daily at 7:00 AM UTC
 */
export async function GET(req: Request) {
  const startTime = Date.now();

  // Verify cron secret — always required, even in development
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 },
    );
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    logger.warn("Unauthorized cron request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("[Regulatory Feed] Starting EUR-Lex monitoring...");

    const runStart = new Date();
    const result = await processNewDocuments();

    // Send notifications for new CRITICAL/HIGH updates
    let notificationsSent = 0;
    if (result.newDocuments > 0) {
      const highPriority = await getRecentHighPriorityUpdates(runStart);

      if (highPriority.length > 0) {
        // Get all organizations with active subscriptions
        const orgs = await prisma.organization.findMany({
          where: { isActive: true },
          select: { id: true },
        });

        // Get organizations with CRA assessments for targeted CRA notifications
        const craOrgs = await prisma.organization.findMany({
          where: { craAssessments: { some: {} } },
          select: {
            id: true,
            members: { select: { userId: true } },
          },
        });
        const craOrgIds = new Set(craOrgs.map((o) => o.id));

        for (const update of highPriority) {
          const isCraUpdate = update.affectedModules.includes("cra");
          const notificationType =
            update.severity === "CRITICAL"
              ? "REGULATORY_CRITICAL_UPDATE"
              : "REGULATORY_UPDATE";

          // For CRA-specific updates, notify only orgs with CRA assessments
          // For all other updates, notify all active orgs
          const targetOrgs = isCraUpdate
            ? orgs.filter((o) => craOrgIds.has(o.id))
            : orgs;

          if (isCraUpdate) {
            logger.info(
              `[Regulatory Feed] CRA update ${update.celexNumber} — targeting ${targetOrgs.length} orgs with CRA assessments`,
            );
          }

          for (const org of targetOrgs) {
            try {
              await notifyOrganization(
                org.id,
                notificationType as
                  | "REGULATORY_UPDATE"
                  | "REGULATORY_CRITICAL_UPDATE",
                update.severity === "CRITICAL"
                  ? `Critical: New EU regulation ${update.celexNumber}`
                  : `New EU regulation: ${update.celexNumber}`,
                update.title,
                {
                  actionUrl: "/dashboard/regulatory-feed",
                  entityType: "regulatory_update",
                  entityId: update.id,
                  severity:
                    update.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
                },
              );
              notificationsSent++;
            } catch (error) {
              logger.error(
                `[Regulatory Feed] Notification failed for org ${org.id}:`,
                error,
              );
            }
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    logger.info("[Regulatory Feed] Processing complete:", {
      fetched: result.fetched,
      newDocuments: result.newDocuments,
      notificationsSent,
      errors: result.errors.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      fetched: result.fetched,
      newDocuments: result.newDocuments,
      notificationsSent,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10),
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Regulatory Feed] Cron job failed", error);

    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: getSafeErrorMessage(
          error,
          "Regulatory feed processing failed",
        ),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/** Health check / manual trigger */
export async function POST(req: Request) {
  return GET(req);
}
