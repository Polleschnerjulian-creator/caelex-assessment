import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";
import { calculateComplianceScore } from "@/lib/services/compliance-scoring-service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

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
 * Cron endpoint for daily compliance snapshot generation
 * Schedule: Daily at 1:00 AM UTC
 *
 * Creates a ComplianceSnapshot per active user for time-series tracking.
 */
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

  const snapshotDate = startOfDay(new Date());
  let processed = 0;
  let errors = 0;

  try {
    // Get all active users in batches of 50
    const totalUsers = await prisma.user.count({ where: { isActive: true } });
    const batchSize = 50;
    let skip = 0;

    while (skip < totalUsers) {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
        skip,
        take: batchSize,
        orderBy: { id: "asc" },
      });

      for (const user of users) {
        try {
          await generateSnapshot(user.id, snapshotDate);
          processed++;
        } catch (err) {
          logger.error(`Snapshot error for user ${user.id}`, err);
          errors++;
        }
      }

      skip += batchSize;
    }

    return NextResponse.json({
      success: true,
      snapshotDate: snapshotDate.toISOString(),
      processed,
      errors,
      total: totalUsers,
    });
  } catch (error) {
    logger.error("Compliance snapshot cron error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function generateSnapshot(userId: string, snapshotDate: Date) {
  const now = new Date();

  // 1. Calculate compliance score
  const complianceScore = await calculateComplianceScore(userId);
  const overallScore = complianceScore.overall;
  const grade = complianceScore.grade;

  // 2. Get NIS2 score
  const nis2 = await prisma.nIS2Assessment.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      complianceScore: true,
      entityClassification: true,
      requirements: { select: { status: true } },
    },
  });

  // 3. Get organization membership for evidence queries
  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  // 4. Evidence counts
  let evidenceTotal = 0;
  let evidenceAccepted = 0;
  let evidenceExpired = 0;
  if (orgMember?.organizationId) {
    [evidenceTotal, evidenceAccepted, evidenceExpired] = await Promise.all([
      prisma.complianceEvidence.count({
        where: { organizationId: orgMember.organizationId },
      }),
      prisma.complianceEvidence.count({
        where: { organizationId: orgMember.organizationId, status: "ACCEPTED" },
      }),
      prisma.complianceEvidence.count({
        where: {
          organizationId: orgMember.organizationId,
          validUntil: { lt: now },
        },
      }),
    ]);
  }
  const evidenceCompletePct =
    evidenceTotal > 0
      ? Math.round((evidenceAccepted / evidenceTotal) * 100)
      : 0;

  // 5. Deadline counts
  const [
    deadlinesTotal,
    deadlinesOverdue,
    deadlinesDueSoon,
    deadlinesCompleted,
  ] = await Promise.all([
    prisma.deadline.count({ where: { userId } }),
    prisma.deadline.count({ where: { userId, status: "OVERDUE" } }),
    prisma.deadline.count({
      where: {
        userId,
        status: "UPCOMING",
        dueDate: {
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.deadline.count({ where: { userId, status: "COMPLETED" } }),
  ]);

  // 6. Incident counts
  const [incidentsOpen, incidentsCritical, resolvedIncidents] =
    await Promise.all([
      prisma.incident.count({
        where: {
          supervision: { userId },
          status: { notIn: ["resolved", "closed"] },
        },
      }),
      prisma.incident.count({
        where: {
          supervision: { userId },
          severity: "critical",
          status: { notIn: ["resolved", "closed"] },
        },
      }),
      prisma.incident.findMany({
        where: {
          supervision: { userId },
          status: { in: ["resolved", "closed"] },
          resolvedAt: { not: null },
        },
        select: { detectedAt: true, resolvedAt: true },
        take: 20,
      }),
    ]);

  let incidentsMTTR: number | null = null;
  if (resolvedIncidents.length > 0) {
    const totalHours = resolvedIncidents.reduce((sum, inc) => {
      const diffMs = inc.resolvedAt!.getTime() - inc.detectedAt.getTime();
      return sum + diffMs / (1000 * 60 * 60);
    }, 0);
    incidentsMTTR =
      Math.round((totalHours / resolvedIncidents.length) * 10) / 10;
  }

  // 7. NCA overdue
  const ncaNotificationsOverdue = await prisma.incidentNIS2Phase.count({
    where: {
      status: "overdue",
      incident: { supervision: { userId } },
    },
  });

  // 8. Financial risk
  const nis2Penalty =
    nis2?.entityClassification === "essential"
      ? 10_000_000
      : nis2?.entityClassification === "important"
        ? 7_000_000
        : 0;
  const maxPenaltyExposure = nis2Penalty + 5_000_000;
  const riskFactor = Math.max(0, (100 - overallScore) / 100);
  const estimatedRiskEur = Math.round(maxPenaltyExposure * riskFactor);

  // 9. Velocity — diff against previous snapshots
  const [snap1d, snap7d, snap30d] = await Promise.all([
    getSnapshotDaysAgo(userId, 1),
    getSnapshotDaysAgo(userId, 7),
    getSnapshotDaysAgo(userId, 30),
  ]);

  const velocityDaily = snap1d !== null ? overallScore - snap1d : 0;
  const velocity7Day = snap7d !== null ? overallScore - snap7d : 0;
  const velocity30Day = snap30d !== null ? overallScore - snap30d : 0;

  // 10. Requirement counts
  let requirementsTotal = 0;
  let requirementsCompliant = 0;
  let requirementsPartial = 0;
  let requirementsNonCompliant = 0;
  let requirementsNotAssessed = 0;

  for (const mod of Object.values(complianceScore.breakdown)) {
    for (const f of mod.factors) {
      requirementsTotal++;
      if (f.earnedPoints === f.maxPoints) requirementsCompliant++;
      else if (f.earnedPoints > 0) requirementsPartial++;
      else requirementsNonCompliant++;
    }
  }

  if (nis2?.requirements) {
    for (const req of nis2.requirements) {
      requirementsTotal++;
      if (req.status === "compliant") requirementsCompliant++;
      else if (req.status === "partial") requirementsPartial++;
      else if (req.status === "non_compliant") requirementsNonCompliant++;
      else requirementsNotAssessed++;
    }
  }

  // 11. Compute maturity level
  const maturityLevel = computeMaturity(
    overallScore,
    evidenceCompletePct,
    deadlinesOverdue,
    velocityDaily,
  );

  // 12. Module scores JSON
  const moduleScores: Record<string, number> = {};
  for (const [moduleId, mod] of Object.entries(complianceScore.breakdown)) {
    moduleScores[moduleId] = mod.score;
  }

  // 13. Upsert snapshot
  await prisma.complianceSnapshot.upsert({
    where: {
      userId_snapshotDate: {
        userId,
        snapshotDate,
      },
    },
    create: {
      userId,
      organizationId: orgMember?.organizationId || null,
      snapshotDate,
      overallScore,
      euSpaceActScore: overallScore,
      nis2Score: nis2?.complianceScore ?? null,
      grade,
      moduleScores: JSON.stringify(moduleScores),
      maturityLevel,
      evidenceTotal,
      evidenceAccepted,
      evidenceExpired,
      evidenceCompletePct,
      deadlinesTotal,
      deadlinesOverdue,
      deadlinesDueSoon,
      deadlinesCompleted,
      incidentsOpen,
      incidentsCritical,
      incidentsMTTR,
      ncaNotificationsOverdue,
      maxPenaltyExposure,
      estimatedRiskEur,
      velocityDaily,
      velocity7Day,
      velocity30Day,
      requirementsTotal,
      requirementsCompliant,
      requirementsPartial,
      requirementsNonCompliant,
      requirementsNotAssessed,
    },
    update: {
      overallScore,
      euSpaceActScore: overallScore,
      nis2Score: nis2?.complianceScore ?? null,
      grade,
      moduleScores: JSON.stringify(moduleScores),
      maturityLevel,
      evidenceTotal,
      evidenceAccepted,
      evidenceExpired,
      evidenceCompletePct,
      deadlinesTotal,
      deadlinesOverdue,
      deadlinesDueSoon,
      deadlinesCompleted,
      incidentsOpen,
      incidentsCritical,
      incidentsMTTR,
      ncaNotificationsOverdue,
      maxPenaltyExposure,
      estimatedRiskEur,
      velocityDaily,
      velocity7Day,
      velocity30Day,
      requirementsTotal,
      requirementsCompliant,
      requirementsPartial,
      requirementsNonCompliant,
      requirementsNotAssessed,
    },
  });
}

async function getSnapshotDaysAgo(
  userId: string,
  days: number,
): Promise<number | null> {
  const target = new Date();
  target.setDate(target.getDate() - days);
  const dayStart = startOfDay(target);

  const snapshot = await prisma.complianceSnapshot.findUnique({
    where: {
      userId_snapshotDate: {
        userId,
        snapshotDate: dayStart,
      },
    },
    select: { overallScore: true },
  });

  return snapshot?.overallScore ?? null;
}

function computeMaturity(
  score: number,
  evidencePct: number,
  overdueDeadlines: number,
  velocity: number,
): number {
  if (
    score >= 85 &&
    evidencePct >= 90 &&
    overdueDeadlines === 0 &&
    velocity >= 0
  )
    return 5;
  if (score >= 70 && evidencePct >= 70 && overdueDeadlines === 0) return 4;
  if (score >= 50) return 3;
  if (score >= 20) return 2;
  return 1;
}
