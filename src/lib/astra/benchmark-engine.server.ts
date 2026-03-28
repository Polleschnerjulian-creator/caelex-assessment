import "server-only";
import { prisma } from "@/lib/prisma";

export interface BenchmarkResult {
  metric: string;
  userScore: number;
  averageScore: number;
  percentile: number; // 0-100, where 100 = top
  totalOrgs: number;
  comparison: "above_average" | "average" | "below_average";
  insight: string;
}

export interface BenchmarkReport {
  organizationId: string;
  benchmarks: BenchmarkResult[];
  overallPercentile: number;
  generatedAt: Date;
}

export async function generateBenchmarkReport(
  organizationId: string,
  userId: string,
): Promise<BenchmarkReport> {
  const benchmarks: BenchmarkResult[] = [];

  // Get all RRS snapshots for percentile comparison (last 30 days, latest per org)
  const allRrsSnapshots = await prisma.rRSSnapshot.findMany({
    where: {
      snapshotDate: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    select: { organizationId: true, overallScore: true },
    distinct: ["organizationId"],
    orderBy: { snapshotDate: "desc" },
  });

  // Get user's latest RRS
  const userRrs = allRrsSnapshots.find(
    (s) => s.organizationId === organizationId,
  );

  if (userRrs && allRrsSnapshots.length > 1) {
    const scores = allRrsSnapshots
      .map((s) => s.overallScore)
      .sort((a, b) => a - b);
    const percentile = calculatePercentile(userRrs.overallScore, scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    benchmarks.push({
      metric: "Regulatory Readiness Score (RRS)",
      userScore: Math.round(userRrs.overallScore),
      averageScore: Math.round(avg),
      percentile,
      totalOrgs: allRrsSnapshots.length,
      comparison: getComparison(userRrs.overallScore, avg),
      insight:
        percentile >= 75
          ? `Top ${100 - percentile}% — Hervorragende regulatorische Bereitschaft`
          : percentile >= 50
            ? `Überdurchschnittlich — aber noch Verbesserungspotenzial`
            : percentile >= 25
              ? `Unterdurchschnittlich — fokussiere auf offene Module`
              : `Untere 25% — dringender Handlungsbedarf`,
    });
  }

  // Assessment completion rates
  const allUserIds = await prisma.user.findMany({
    select: { id: true },
    where: { role: { not: "admin" } },
  });
  const totalUsers = allUserIds.length;

  if (totalUsers > 1) {
    // Debris assessment completion rate
    const debrisCount = await prisma.debrisAssessment.groupBy({
      by: ["userId"],
      _count: true,
    });
    const userHasDebris = debrisCount.some((d) => d.userId === userId);
    const debrisRate = Math.round((debrisCount.length / totalUsers) * 100);

    benchmarks.push({
      metric: "Debris Assessment",
      userScore: userHasDebris ? 100 : 0,
      averageScore: debrisRate,
      percentile: userHasDebris
        ? Math.max(debrisRate, 50)
        : Math.min(100 - debrisRate, 50),
      totalOrgs: totalUsers,
      comparison: userHasDebris
        ? debrisRate < 50
          ? "above_average"
          : "average"
        : "below_average",
      insight: userHasDebris
        ? `${debrisRate}% aller Nutzer haben ihr Debris Assessment abgeschlossen`
        : `Du gehörst zu den ${100 - debrisRate}% die noch kein Debris Assessment durchgeführt haben`,
    });

    // NIS2 assessment completion rate
    const nis2Count = await prisma.nIS2Assessment.groupBy({
      by: ["userId"],
      _count: true,
    });
    const userHasNis2 = nis2Count.some((d) => d.userId === userId);
    const nis2Rate = Math.round((nis2Count.length / totalUsers) * 100);

    benchmarks.push({
      metric: "NIS2 Assessment",
      userScore: userHasNis2 ? 100 : 0,
      averageScore: nis2Rate,
      percentile: userHasNis2
        ? Math.max(nis2Rate, 50)
        : Math.min(100 - nis2Rate, 50),
      totalOrgs: totalUsers,
      comparison: userHasNis2
        ? nis2Rate < 50
          ? "above_average"
          : "average"
        : "below_average",
      insight: userHasNis2
        ? `${nis2Rate}% aller Nutzer haben ihre NIS2-Klassifizierung abgeschlossen`
        : `Starte deine NIS2-Klassifizierung — ${nis2Rate}% haben es bereits getan`,
    });

    // Cybersecurity assessment
    const cyberCount = await prisma.cybersecurityAssessment.groupBy({
      by: ["userId"],
      _count: true,
    });
    const userHasCyber = cyberCount.some((d) => d.userId === userId);
    const cyberRate = Math.round((cyberCount.length / totalUsers) * 100);

    benchmarks.push({
      metric: "Cybersecurity Assessment",
      userScore: userHasCyber ? 100 : 0,
      averageScore: cyberRate,
      percentile: userHasCyber
        ? Math.max(cyberRate, 50)
        : Math.min(100 - cyberRate, 50),
      totalOrgs: totalUsers,
      comparison: userHasCyber
        ? cyberRate < 50
          ? "above_average"
          : "average"
        : "below_average",
      insight: userHasCyber
        ? `${cyberRate}% aller Nutzer haben ein Cybersecurity Assessment`
        : `Cybersecurity Assessment fehlt — ${cyberRate}% der Nutzer haben bereits eines`,
    });

    // Document count comparison
    const docCounts = await prisma.document.groupBy({
      by: ["userId"],
      _count: true,
    });
    const userDocCount =
      docCounts.find((d) => d.userId === userId)?._count || 0;
    const allDocCounts = docCounts.map((d) => d._count).sort((a, b) => a - b);
    const avgDocs =
      allDocCounts.length > 0
        ? allDocCounts.reduce((a, b) => a + b, 0) / allDocCounts.length
        : 0;

    benchmarks.push({
      metric: "Hochgeladene Dokumente",
      userScore: userDocCount,
      averageScore: Math.round(avgDocs),
      percentile:
        allDocCounts.length > 0
          ? calculatePercentile(userDocCount, allDocCounts)
          : 50,
      totalOrgs: totalUsers,
      comparison: getComparison(userDocCount, avgDocs),
      insight:
        userDocCount > avgDocs
          ? `${userDocCount} Dokumente — überdurchschnittlich gut dokumentiert`
          : `${userDocCount} Dokumente — Durchschnitt liegt bei ${Math.round(avgDocs)}`,
    });
  }

  const overallPercentile =
    benchmarks.length > 0
      ? Math.round(
          benchmarks.reduce((sum, b) => sum + b.percentile, 0) /
            benchmarks.length,
        )
      : 50;

  return {
    organizationId,
    benchmarks,
    overallPercentile,
    generatedAt: new Date(),
  };
}

function calculatePercentile(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 50;
  const below = sortedValues.filter((v) => v < value).length;
  return Math.round((below / sortedValues.length) * 100);
}

function getComparison(
  userScore: number,
  avgScore: number,
): "above_average" | "average" | "below_average" {
  const diff = userScore - avgScore;
  if (diff > avgScore * 0.1) return "above_average";
  if (diff < -avgScore * 0.1) return "below_average";
  return "average";
}
