/**
 * Dashboard Overview API
 *
 * GET /api/dashboard/overview
 * Returns compliance overview with score and module statuses
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getComplianceOverview,
  calculateComplianceScore,
} from "@/lib/services";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get both overview and detailed score
    const [overview, detailedScore] = await Promise.all([
      getComplianceOverview(session.user.id),
      calculateComplianceScore(session.user.id),
    ]);

    return NextResponse.json({
      success: true,
      overview: {
        ...overview,
        grade: detailedScore.grade,
        detailedStatus: detailedScore.status,
      },
      score: {
        overall: detailedScore.overall,
        grade: detailedScore.grade,
        status: detailedScore.status,
        breakdown: detailedScore.breakdown,
        lastCalculated: detailedScore.lastCalculated,
      },
      topRecommendations: detailedScore.recommendations.slice(0, 5),
    });
  } catch (error) {
    console.error("Failed to get dashboard overview:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard overview" },
      { status: 500 },
    );
  }
}
