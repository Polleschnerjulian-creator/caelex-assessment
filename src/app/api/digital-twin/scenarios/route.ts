import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  simulateScenario,
  simulateChain,
  type ScenarioInput,
} from "@/lib/services/whatif-simulation-service";
import { computeRegulationVersionHash } from "@/lib/services/whatif-engine-bridge";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const favoritesOnly = searchParams.get("favorites") === "true";
    const staleOnly = searchParams.get("stale") === "true";

    const where: Record<string, unknown> = { userId: session.user.id };
    if (favoritesOnly) where.isFavorite = true;
    if (staleOnly) where.isStale = true;

    const scenarios = await prisma.whatIfScenario.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: scenarios.map((s) => ({
        ...s,
        results: JSON.parse(s.results),
        parameters: JSON.parse(s.parameters),
      })),
    });
  } catch (error) {
    console.error("Digital Twin scenarios GET error:", error);
    return NextResponse.json(
      { error: "Failed to load scenarios" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scenarioType, name, parameters } = body as ScenarioInput;

    if (!scenarioType || !name || !parameters) {
      return NextResponse.json(
        { error: "Missing required fields: scenarioType, name, parameters" },
        { status: 400 },
      );
    }

    const validTypes = [
      "add_jurisdiction",
      "change_operator_type",
      "add_satellites",
      "expand_operations",
      "composite",
      "chain",
    ];
    if (!validTypes.includes(scenarioType)) {
      return NextResponse.json(
        { error: `Invalid scenarioType. Valid: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    // Run simulation — chain uses its own function
    let result;
    if (scenarioType === "chain") {
      result = await simulateChain(session.user.id, { name, parameters });
    } else {
      result = await simulateScenario(session.user.id, {
        scenarioType,
        name,
        parameters,
      });
    }

    // Get organization membership
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    // Compute regulation version hash for stale detection
    const regulationVersion = computeRegulationVersionHash();

    // Determine scores from result
    const baselineScore =
      "baselineScore" in result
        ? (result as { baselineScore: number }).baselineScore
        : 0;
    const projectedScore =
      "projectedScore" in result
        ? (result as { projectedScore: number }).projectedScore
        : "finalScore" in result
          ? (result as { finalScore: number }).finalScore
          : 0;
    const scoreDelta =
      "scoreDelta" in result
        ? (result as { scoreDelta: number }).scoreDelta
        : "totalScoreDelta" in result
          ? (result as { totalScoreDelta: number }).totalScoreDelta
          : 0;

    // Save scenario
    const scenario = await prisma.whatIfScenario.create({
      data: {
        userId: session.user.id,
        organizationId: orgMember?.organizationId || null,
        name,
        scenarioType,
        parameters: JSON.stringify(parameters),
        baselineScore,
        projectedScore,
        scoreDelta,
        results: JSON.stringify(result),
        computedAt: new Date(),
        regulationVersion,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        scenario: {
          ...scenario,
          results: result,
          parameters,
        },
        result,
      },
    });
  } catch (error) {
    console.error("Digital Twin scenarios POST error:", error);
    return NextResponse.json(
      { error: "Failed to run simulation" },
      { status: 500 },
    );
  }
}
