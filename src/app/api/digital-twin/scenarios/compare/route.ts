import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/digital-twin/scenarios/compare
 * Compare 2-4 scenarios side-by-side with weighted ranking.
 *
 * Body: { scenarioIds: string[] }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scenarioIds } = body as { scenarioIds: string[] };

    if (!scenarioIds || !Array.isArray(scenarioIds)) {
      return NextResponse.json(
        { error: "scenarioIds must be an array" },
        { status: 400 },
      );
    }

    if (scenarioIds.length < 2 || scenarioIds.length > 4) {
      return NextResponse.json(
        { error: "Compare 2-4 scenarios at a time" },
        { status: 400 },
      );
    }

    const scenarios = await prisma.whatIfScenario.findMany({
      where: {
        id: { in: scenarioIds },
        userId: session.user.id,
      },
    });

    if (scenarios.length !== scenarioIds.length) {
      return NextResponse.json(
        { error: "One or more scenarios not found" },
        { status: 404 },
      );
    }

    // Parse results and build comparison matrix
    const parsed = scenarios.map((s) => ({
      id: s.id,
      name: s.name,
      scenarioType: s.scenarioType,
      baselineScore: s.baselineScore,
      projectedScore: s.projectedScore,
      scoreDelta: s.scoreDelta,
      isStale: s.isStale,
      parameters: JSON.parse(s.parameters),
      results: JSON.parse(s.results),
    }));

    // Weighted ranking criteria
    const weights = {
      score: 0.35,
      riskLevel: 0.25,
      financialImpact: 0.25,
      requirementCount: 0.15,
    };

    const riskLevelScore: Record<string, number> = {
      low: 100,
      medium: 70,
      high: 40,
      critical: 10,
    };

    const ranked = parsed
      .map((s) => {
        const result = s.results;
        const scoreMetric = s.projectedScore;
        const risk =
          riskLevelScore[result.riskAssessment?.level || "medium"] || 50;
        const financial = Math.max(
          0,
          100 - (result.financialImpact?.delta || 0) / 100_000,
        );
        const reqCount = Math.max(
          0,
          100 - (result.newRequirements?.length || 0) * 10,
        );

        const weightedScore =
          scoreMetric * weights.score +
          risk * weights.riskLevel +
          financial * weights.financialImpact +
          reqCount * weights.requirementCount;

        return {
          ...s,
          weightedScore: Math.round(weightedScore * 10) / 10,
        };
      })
      .sort((a, b) => b.weightedScore - a.weightedScore);

    // Build comparison dimensions
    const dimensions = [
      {
        dimension: "Projected Score",
        values: ranked.map((s) => ({
          scenarioId: s.id,
          value: s.projectedScore,
          label: `${s.projectedScore}%`,
        })),
      },
      {
        dimension: "Score Delta",
        values: ranked.map((s) => ({
          scenarioId: s.id,
          value: s.scoreDelta,
          label: `${s.scoreDelta >= 0 ? "+" : ""}${s.scoreDelta}`,
        })),
      },
      {
        dimension: "New Requirements",
        values: ranked.map((s) => ({
          scenarioId: s.id,
          value: s.results.newRequirements?.length || 0,
          label: `${s.results.newRequirements?.length || 0}`,
        })),
      },
      {
        dimension: "Risk Level",
        values: ranked.map((s) => ({
          scenarioId: s.id,
          value:
            riskLevelScore[s.results.riskAssessment?.level || "medium"] || 50,
          label: s.results.riskAssessment?.level || "medium",
        })),
      },
      {
        dimension: "Financial Impact",
        values: ranked.map((s) => ({
          scenarioId: s.id,
          value: s.results.financialImpact?.delta || 0,
          label: `EUR ${((s.results.financialImpact?.delta || 0) / 1_000_000).toFixed(1)}M`,
        })),
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        scenarios: ranked,
        dimensions,
        recommendation: {
          bestScenarioId: ranked[0].id,
          bestScenarioName: ranked[0].name,
          reason: `Highest weighted score (${ranked[0].weightedScore}) considering compliance impact, risk, financial exposure, and requirement complexity.`,
        },
      },
    });
  } catch (error) {
    console.error("Digital Twin compare POST error:", error);
    return NextResponse.json(
      { error: "Failed to compare scenarios" },
      { status: 500 },
    );
  }
}
