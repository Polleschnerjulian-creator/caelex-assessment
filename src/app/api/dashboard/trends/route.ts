/**
 * Dashboard Trends API
 *
 * GET /api/dashboard/trends
 * Returns historical trend data for compliance score
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTrendData } from "@/lib/services";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "30d";

    // Parse period (e.g., "7d", "30d", "90d", "365d")
    let days = 30;
    const match = periodParam.match(/^(\d+)d$/);
    if (match) {
      days = Math.min(parseInt(match[1], 10), 365); // Max 1 year
    }

    const trends = await getTrendData(session.user.id, days);

    // Calculate summary stats
    const scores = trends.map((t) => t.score);
    const avgScore = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length,
    );
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const trend =
      trends.length > 1 ? trends[trends.length - 1].score - trends[0].score : 0;

    return NextResponse.json({
      success: true,
      period: periodParam,
      dataPoints: trends,
      summary: {
        averageScore: avgScore,
        minScore,
        maxScore,
        trend,
        trendDirection: trend > 0 ? "up" : trend < 0 ? "down" : "stable",
        totalIncidents: trends.reduce((sum, t) => sum + t.incidents, 0),
        totalCompletedTasks: trends.reduce(
          (sum, t) => sum + t.completedTasks,
          0,
        ),
      },
    });
  } catch (error) {
    console.error("Failed to get trend data:", error);
    return NextResponse.json(
      { error: "Failed to get trend data" },
      { status: 500 },
    );
  }
}
