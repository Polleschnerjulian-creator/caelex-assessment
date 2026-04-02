/**
 * CRA Deadline Monitoring Cron Job
 * Schedule: Daily at 8:00 AM UTC
 *
 * Checks all active CRA assessments against key regulatory deadlines:
 * - 11 September 2026: Reporting obligations start (Art. 14)
 * - 11 December 2027: Full CRA application
 *
 * Sends DEADLINE_REMINDER notifications at 180 / 90 / 30 / 7 days before each deadline.
 * Deduplicates by checking for existing notifications with the same entityId + type this month.
 * Processes organisations in batches of 25.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notification-service";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { CRA_REQUIREMENTS } from "@/data/cra-requirements";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─── Auth helper ───────────────────────────────────────────────────────────────

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

// ─── CRA Key Dates ─────────────────────────────────────────────────────────────

const CRA_DEADLINES = [
  {
    date: new Date("2026-09-11"),
    name: "CRA Meldepflichten (Art. 14)",
    description:
      "Ab diesem Datum müssen aktiv ausgenutzte Schwachstellen innerhalb von 24h an ENISA gemeldet werden.",
  },
  {
    date: new Date("2027-12-11"),
    name: "CRA Volle Anwendung",
    description:
      "Ab diesem Datum gelten alle CRA-Anforderungen einschließlich Conformity Assessment, CE-Marking, und SBOM-Pflicht.",
  },
];

const NOTIFICATION_THRESHOLDS_DAYS = [180, 90, 30, 7];

const BATCH_SIZE = 25;

// ─── Duplicate-check helper ────────────────────────────────────────────────────

/**
 * Returns true when a DEADLINE_REMINDER for the given entityId was already
 * created this calendar month.  The entityId encodes both the assessment and
 * the specific deadline+threshold so each threshold fires at most once/month.
 */
async function alreadyNotifiedThisMonth(
  userId: string,
  entityId: string,
): Promise<boolean> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type: "DEADLINE_REMINDER",
      entityId,
      createdAt: { gte: startOfMonth },
    },
    select: { id: true },
  });

  return existing !== null;
}

// ─── Completion estimate ───────────────────────────────────────────────────────

/**
 * Returns a rough implementation-completion warning string, or null if the
 * assessment looks on track.
 *
 * Logic:
 *  - Sum `implementationTimeWeeks` for every non-compliant requirement whose
 *    ID is stored in the assessment's CRARequirementStatus rows.
 *  - Convert weeks → days and project forward from today.
 *  - If the projected finish date exceeds the deadline, return a warning.
 */
function buildCompletionWarning(
  nonCompliantRequirementIds: string[],
  deadlineDate: Date,
): string {
  if (nonCompliantRequirementIds.length === 0) return "";

  const totalWeeks = nonCompliantRequirementIds.reduce((sum, id) => {
    const req = CRA_REQUIREMENTS.find((r) => r.id === id);
    return sum + (req?.implementationTimeWeeks ?? 0);
  }, 0);

  if (totalWeeks === 0) return "";

  const estimatedFinish = new Date();
  estimatedFinish.setDate(estimatedFinish.getDate() + totalWeeks * 7);

  if (estimatedFinish > deadlineDate) {
    const overrunDays = Math.ceil(
      (estimatedFinish.getTime() - deadlineDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return `Warnung: Bei aktuellem Implementierungsfortschritt wird die Deadline voraussichtlich um ${overrunDays} Tage überschritten.`;
  }

  return "";
}

// ─── Core processing ───────────────────────────────────────────────────────────

interface ProcessResult {
  orgsProcessed: number;
  assessmentsChecked: number;
  notificationsSent: number;
  notificationsSkipped: number;
  errors: string[];
}

async function processCRADeadlines(): Promise<ProcessResult> {
  const result: ProcessResult = {
    orgsProcessed: 0,
    assessmentsChecked: 0,
    notificationsSent: 0,
    notificationsSkipped: 0,
    errors: [],
  };

  const now = new Date();

  // Count total organizations that have at least one CRA assessment
  const totalOrgs = await prisma.organization.count({
    where: {
      craAssessments: { some: {} },
    },
  });

  if (totalOrgs === 0) {
    logger.info(
      "CRA deadline cron: no organizations with CRA assessments found",
    );
    return result;
  }

  logger.info(
    `CRA deadline cron: processing ${totalOrgs} organizations in batches of ${BATCH_SIZE}`,
  );

  let skip = 0;

  while (skip < totalOrgs) {
    const orgs = await prisma.organization.findMany({
      where: {
        craAssessments: { some: {} },
      },
      select: { id: true },
      skip,
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
    });

    for (const org of orgs) {
      result.orgsProcessed++;

      try {
        // Load all CRA assessments for this org with their requirement statuses
        const assessments = await prisma.cRAAssessment.findMany({
          where: {
            organizationId: org.id,
            isOutOfScope: false,
          },
          select: {
            id: true,
            userId: true,
            organizationId: true,
            productName: true,
            maturityScore: true,
            requirements: {
              where: { status: { not: "compliant" } },
              select: { requirementId: true },
            },
          },
        });

        for (const assessment of assessments) {
          result.assessmentsChecked++;

          const nonCompliantIds = assessment.requirements.map(
            (r) => r.requirementId,
          );
          const maturityScore = assessment.maturityScore ?? 0;

          for (const deadline of CRA_DEADLINES) {
            const msUntilDeadline = deadline.date.getTime() - now.getTime();

            // Skip if deadline is already past
            if (msUntilDeadline <= 0) continue;

            const daysRemaining = Math.ceil(
              msUntilDeadline / (1000 * 60 * 60 * 24),
            );

            // Find the applicable threshold window (if any)
            // We fire when daysRemaining first enters a threshold window.
            // The entityId encodes assessment + deadline slug + threshold bucket
            // so each threshold fires at most once per month per assessment.
            for (const thresholdDays of NOTIFICATION_THRESHOLDS_DAYS) {
              // Fire when we are within [thresholdDays - 6, thresholdDays] days
              // (a 7-day window so daily runs won't re-fire for the same threshold).
              // The monthly dedup check is the hard backstop.
              if (
                daysRemaining > thresholdDays ||
                daysRemaining < thresholdDays - 6
              ) {
                continue;
              }

              const deadlineSlug = deadline.date
                .toISOString()
                .split("T")[0]
                .replace(/-/g, "");
              const entityId = `cra-deadline:${assessment.id}:${deadlineSlug}:${thresholdDays}d`;

              // Dedup: skip if already sent this month
              const alreadySent = await alreadyNotifiedThisMonth(
                assessment.userId,
                entityId,
              );
              if (alreadySent) {
                result.notificationsSkipped++;
                continue;
              }

              const warningText = buildCompletionWarning(
                nonCompliantIds,
                deadline.date,
              );

              const severity =
                daysRemaining <= 30
                  ? ("CRITICAL" as const)
                  : daysRemaining <= 90
                    ? ("WARNING" as const)
                    : ("INFO" as const);

              try {
                await createNotification({
                  userId: assessment.userId,
                  type: "DEADLINE_REMINDER",
                  title: `CRA Deadline: ${daysRemaining} Tage bis ${deadline.name}`,
                  message: `Ihr CRA-Assessment "${assessment.productName}" hat ${maturityScore}% Maturity Score. ${warningText || deadline.description}`,
                  actionUrl: `/dashboard/modules/cra/${assessment.id}`,
                  entityType: "cra_assessment",
                  entityId,
                  severity,
                  organizationId: org.id,
                });

                result.notificationsSent++;
                logger.info(
                  `CRA deadline notification sent: assessment=${assessment.id} deadline=${deadline.name} threshold=${thresholdDays}d`,
                );
              } catch (err) {
                result.errors.push(
                  `Failed to send notification for assessment ${assessment.id} / deadline ${deadline.name} @ ${thresholdDays}d: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
            }
          }
        }
      } catch (err) {
        result.errors.push(
          `Failed to process org ${org.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    skip += BATCH_SIZE;
  }

  return result;
}

// ─── Route handlers ────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const startTime = Date.now();

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    logger.warn("Unauthorized CRA deadline cron request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("Starting CRA deadline monitoring...");

    const result = await processCRADeadlines();

    const duration = Date.now() - startTime;

    logger.info("CRA deadline monitoring complete:", {
      orgsProcessed: result.orgsProcessed,
      assessmentsChecked: result.assessmentsChecked,
      notificationsSent: result.notificationsSent,
      notificationsSkipped: result.notificationsSkipped,
      errors: result.errors.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      orgsProcessed: result.orgsProcessed,
      assessmentsChecked: result.assessmentsChecked,
      notificationsSent: result.notificationsSent,
      notificationsSkipped: result.notificationsSkipped,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10),
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("CRA deadline cron job failed", error);

    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: getSafeErrorMessage(error, "CRA deadline monitoring failed"),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/** Manual trigger via POST (same logic as GET). */
export async function POST(req: Request) {
  return GET(req);
}
