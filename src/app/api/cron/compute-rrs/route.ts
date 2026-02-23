/**
 * Cron: Daily RRS Computation
 * Schedule: Daily at 07:00 UTC
 *
 * Iterates all active organizations with subscriptions,
 * computes and saves the RRS for each, detects significant
 * score changes (>5 points), and creates notifications.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { computeAndSaveRRS } from "@/lib/rrs-engine.server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — may process many orgs

const SCORE_CHANGE_THRESHOLD = 5;

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

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let processed = 0;
  let errors = 0;
  let significantChanges = 0;
  let notificationsCreated = 0;

  try {
    // Get all active organizations that have at least one member
    // (orgs with subscriptions are prioritized but we process all active orgs)
    const batchSize = 25;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const organizations = await prisma.organization.findMany({
        where: {
          isActive: true,
          members: { some: {} }, // Only orgs with at least one member
        },
        select: {
          id: true,
          name: true,
          members: {
            where: {
              role: { in: ["OWNER", "ADMIN"] },
            },
            select: { userId: true },
            take: 5, // Notify up to 5 admins/owners
          },
        },
        skip,
        take: batchSize,
        orderBy: { id: "asc" },
      });

      if (organizations.length < batchSize) {
        hasMore = false;
      }

      for (const org of organizations) {
        try {
          // Get previous score before recomputing
          const previousScore =
            await prisma.regulatoryReadinessScore.findUnique({
              where: { organizationId: org.id },
              select: { overallScore: true },
            });

          // Compute and save new RRS
          const result = await computeAndSaveRRS(org.id);
          processed++;

          // Detect significant score changes
          if (previousScore) {
            const change = result.overallScore - previousScore.overallScore;
            const absChange = Math.abs(change);

            if (absChange > SCORE_CHANGE_THRESHOLD) {
              significantChanges++;

              const direction = change > 0 ? "increased" : "decreased";
              const severity =
                change < -10 ? "URGENT" : change < 0 ? "WARNING" : "INFO";

              // Create notifications for admins/owners of the org
              for (const member of org.members) {
                try {
                  await prisma.notification.create({
                    data: {
                      userId: member.userId,
                      organizationId: org.id,
                      type: "COMPLIANCE_UPDATED",
                      title: `RRS Score ${direction === "increased" ? "Improved" : "Dropped"}`,
                      message:
                        `Your organization's Regulatory Readiness Score has ${direction} by ${absChange} points ` +
                        `(${previousScore.overallScore} -> ${result.overallScore}). ` +
                        `Current grade: ${result.grade}.`,
                      actionUrl: "/dashboard/assure",
                      entityType: "compliance",
                      entityId: org.id,
                      severity,
                    },
                  });
                  notificationsCreated++;
                } catch (notifError) {
                  console.error(
                    `Failed to create notification for user ${member.userId}:`,
                    notifError,
                  );
                }
              }
            }
          }
        } catch (orgError) {
          console.error(`RRS computation error for org ${org.id}:`, orgError);
          errors++;
        }
      }

      skip += batchSize;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed,
      errors,
      significantChanges,
      notificationsCreated,
    });
  } catch (error) {
    console.error("RRS cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
