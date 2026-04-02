/**
 * Cron: Daily RCR Computation
 * Schedule: Daily at 07:30 UTC
 *
 * Iterates all organizations with active subscriptions that have
 * a published RRS score (regulatoryReadinessScore exists).
 * Computes RCR for each. On downgrade or watch_on, creates
 * notifications for OWNER/ADMIN members.
 *
 * Every 3 months (first day of quarter), also computes benchmarks:
 * groups all published ratings by operatorType, calculates statistics,
 * and upserts RCRBenchmark records.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { computeAndSaveRCR } from "@/lib/rcr-engine.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — may process many orgs

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

function isFirstDayOfQuarter(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  // Quarter starts: Jan (0), Apr (3), Jul (6), Oct (9)
  return [0, 3, 6, 9].includes(month) && day === 1;
}

function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${quarter}`;
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function computeStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(
    squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1),
  );
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") || "";
  if (!isValidCronSecret(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let processed = 0;
  let errors = 0;
  let downgrades = 0;
  let watchOns = 0;
  let notificationsCreated = 0;
  let benchmarksComputed = 0;

  try {
    // Get all active organizations with subscriptions that have a published RRS score
    const batchSize = 25;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const organizations = await prisma.organization.findMany({
        where: {
          isActive: true,
          // Must have an RRS score (regulatoryReadinessScore exists)
          rrsScores: { isNot: null },
          // Must have an active subscription
          subscription: {
            status: { in: ["ACTIVE", "TRIALING"] },
          },
        },
        select: {
          id: true,
          name: true,
          members: {
            where: {
              role: { in: ["OWNER", "ADMIN"] },
            },
            select: { userId: true },
            take: 5,
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
          // Compute RCR
          const result = await computeAndSaveRCR(org.id);
          processed++;

          // Check for downgrade or watch_on
          const isDowngrade = result.actionType === "DOWNGRADE";
          const isWatchOn = result.actionType === "WATCH_ON";

          if (isDowngrade) downgrades++;
          if (isWatchOn) watchOns++;

          // On downgrade or watch_on, create notification for OWNER/ADMIN members
          if (isDowngrade || isWatchOn) {
            const notifTitle = isDowngrade
              ? `RCR Downgraded to ${result.grade}`
              : `RCR Placed on Watch`;
            const notifMessage = isDowngrade
              ? `Your organization's Regulatory Credit Rating has been downgraded ` +
                `from ${result.previousGrade || "N/A"} to ${result.grade}. ` +
                `Numeric score: ${result.numericScore.toFixed(1)}/100. ` +
                `Review the rating report for details and recommended actions.`
              : `Your organization's Regulatory Credit Rating (${result.grade}) ` +
                `has been placed on watch. Reason: ${result.watchReason || "Under review"}. ` +
                `Prompt action may prevent a downgrade.`;

            for (const member of org.members) {
              try {
                await prisma.notification.create({
                  data: {
                    userId: member.userId,
                    organizationId: org.id,
                    type: "COMPLIANCE_UPDATED",
                    title: notifTitle,
                    message: notifMessage,
                    actionUrl: "/dashboard/assure",
                    entityType: "compliance",
                    entityId: org.id,
                    severity: isDowngrade ? "URGENT" : "WARNING",
                  },
                });
                notificationsCreated++;
              } catch (notifError) {
                logger.error(
                  `Failed to create RCR notification for user ${member.userId}`,
                  notifError,
                );
              }
            }
          }
        } catch (orgError) {
          logger.error(`RCR computation error for org ${org.id}`, orgError);
          errors++;
        }
      }

      skip += batchSize;
    }

    // Every 3 months (first day of quarter), compute benchmarks
    if (isFirstDayOfQuarter()) {
      try {
        benchmarksComputed = await computeBenchmarks();
      } catch (benchError) {
        logger.error("RCR benchmark computation error", benchError);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed,
      errors,
      downgrades,
      watchOns,
      notificationsCreated,
      benchmarksComputed,
      isQuarterStart: isFirstDayOfQuarter(),
    });
  } catch (error) {
    logger.error("RCR cron job error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Compute quarterly benchmarks.
 * Groups all published ratings by operatorType, calculates statistics,
 * and upserts RCRBenchmark records.
 */
async function computeBenchmarks(): Promise<number> {
  const period = getCurrentQuarter();
  let benchmarkCount = 0;

  // Get all published ratings with their organization's operator profile
  const publishedRatings = await prisma.regulatoryCreditRating.findMany({
    where: { isPublished: true },
    select: {
      numericScore: true,
      grade: true,
      componentScores: true,
      organization: {
        select: {
          operatorProfile: {
            select: {
              operatorType: true,
              euOperatorCode: true,
            },
          },
        },
      },
    },
  });

  // Group by operatorType
  const grouped = new Map<
    string,
    Array<{
      numericScore: number;
      grade: string;
      componentScores: unknown;
    }>
  >();

  for (const rating of publishedRatings) {
    const operatorType =
      rating.organization.operatorProfile?.euOperatorCode ||
      rating.organization.operatorProfile?.operatorType;

    if (!operatorType) continue;

    if (!grouped.has(operatorType)) {
      grouped.set(operatorType, []);
    }

    grouped.get(operatorType)!.push({
      numericScore: rating.numericScore,
      grade: rating.grade,
      componentScores: rating.componentScores,
    });
  }

  // Calculate statistics and upsert for each operatorType
  for (const [operatorType, ratings] of grouped) {
    if (ratings.length < 2) continue; // Need at least 2 for meaningful statistics

    const scores = ratings.map((r) => r.numericScore);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const medianScore = computeMedian(scores);
    const p25Score = computePercentile(scores, 25);
    const p75Score = computePercentile(scores, 75);
    const stdDev = computeStdDev(scores, meanScore);

    // Grade distribution
    const gradeDistribution: Record<string, number> = {};
    for (const rating of ratings) {
      const grade = rating.grade;
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    }

    // Component means (aggregate across all ratings in the group)
    const componentMeans: Record<string, number> = {};
    const componentSums: Record<string, number> = {};
    const componentCounts: Record<string, number> = {};

    for (const rating of ratings) {
      const components = rating.componentScores as unknown as Array<{
        key: string;
        score: number;
      }>;

      if (Array.isArray(components)) {
        for (const comp of components) {
          if (comp.key && typeof comp.score === "number") {
            componentSums[comp.key] =
              (componentSums[comp.key] || 0) + comp.score;
            componentCounts[comp.key] = (componentCounts[comp.key] || 0) + 1;
          }
        }
      }
    }

    for (const key of Object.keys(componentSums)) {
      componentMeans[key] = componentSums[key] / componentCounts[key];
    }

    // Upsert benchmark record
    await prisma.rCRBenchmark.upsert({
      where: {
        operatorType_period: {
          operatorType,
          period,
        },
      },
      update: {
        count: ratings.length,
        meanScore: Math.round(meanScore * 10) / 10,
        medianScore: Math.round(medianScore * 10) / 10,
        p25Score: Math.round(p25Score * 10) / 10,
        p75Score: Math.round(p75Score * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        gradeDistribution,
        componentMeans,
        computedAt: new Date(),
      },
      create: {
        operatorType,
        period,
        count: ratings.length,
        meanScore: Math.round(meanScore * 10) / 10,
        medianScore: Math.round(medianScore * 10) / 10,
        p25Score: Math.round(p25Score * 10) / 10,
        p75Score: Math.round(p75Score * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        gradeDistribution,
        componentMeans,
      },
    });

    benchmarkCount++;
  }

  return benchmarkCount;
}
