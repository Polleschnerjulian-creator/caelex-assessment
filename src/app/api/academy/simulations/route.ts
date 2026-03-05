/**
 * Academy Simulations API
 * GET: List available simulation scenarios with user's best scores
 * POST: Start a new simulation run (records intent, returns scenario data)
 *
 * Auth required for both operations.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

// Simulation scenarios — in production these would come from a data file
const SIMULATION_SCENARIOS = [
  {
    id: "scenario-satellite-operator",
    title: "Satellite Communication Operator",
    description:
      "Classify and assess a medium-sized SATCOM operator under the EU Space Act",
    difficulty: "INTERMEDIATE" as const,
    category: "EU_SPACE_ACT" as const,
    estimatedMinutes: 30,
    operatorProfile: {
      name: "EuroSat Communications GmbH",
      type: "Satellite Communication Operator",
      jurisdiction: "DE",
      employees: 250,
      revenue: 50_000_000,
      satellites: 12,
      services: ["broadband", "IoT", "maritime"],
    },
    expectedAnswers: {
      operatorType: "SCO",
      regime: "standard",
      keyArticles: ["Art. 4", "Art. 8", "Art. 10", "Art. 15", "Art. 22"],
      criticalModules: ["authorization", "cybersecurity", "registration"],
      nis2Classification: "essential",
    },
  },
  {
    id: "scenario-launch-provider",
    title: "European Launch Service Provider",
    description:
      "Assess a launch service provider for EU Space Act and NIS2 compliance",
    difficulty: "ADVANCED" as const,
    category: "EU_SPACE_ACT" as const,
    estimatedMinutes: 45,
    operatorProfile: {
      name: "ArianeNext Launch Services",
      type: "Launch Service Operator",
      jurisdiction: "FR",
      employees: 2000,
      revenue: 500_000_000,
      launchesPerYear: 8,
      services: ["GTO", "LEO", "SSO"],
    },
    expectedAnswers: {
      operatorType: "LSO",
      regime: "standard",
      keyArticles: [
        "Art. 4",
        "Art. 5",
        "Art. 8",
        "Art. 12",
        "Art. 15",
        "Art. 18",
      ],
      criticalModules: [
        "authorization",
        "insurance",
        "environmental",
        "debris",
      ],
      nis2Classification: "essential",
    },
  },
  {
    id: "scenario-small-research",
    title: "Small Research Entity",
    description:
      "Determine the light regime eligibility for a university CubeSat project",
    difficulty: "BEGINNER" as const,
    category: "EU_SPACE_ACT" as const,
    estimatedMinutes: 20,
    operatorProfile: {
      name: "TU Delft Space Lab",
      type: "Research Entity",
      jurisdiction: "NL",
      employees: 15,
      revenue: 0,
      satellites: 1,
      services: ["earth-observation-research"],
    },
    expectedAnswers: {
      operatorType: "SCO",
      regime: "light",
      keyArticles: ["Art. 4", "Art. 10"],
      criticalModules: ["registration"],
      nis2Classification: "out-of-scope",
    },
  },
  {
    id: "scenario-ground-infrastructure",
    title: "Ground Segment Infrastructure Provider",
    description:
      "Classify a ground station network under EU Space Act and NIS2",
    difficulty: "ADVANCED" as const,
    category: "CROSS_REGULATORY" as const,
    estimatedMinutes: 40,
    operatorProfile: {
      name: "Nordic Ground Network AB",
      type: "In-Orbit Service/Support Operator",
      jurisdiction: "NO",
      employees: 120,
      revenue: 30_000_000,
      groundStations: 8,
      services: ["TT&C", "data-downlink", "mission-control"],
    },
    expectedAnswers: {
      operatorType: "ISOS",
      regime: "standard",
      keyArticles: ["Art. 4", "Art. 8", "Art. 15", "Art. 20"],
      criticalModules: ["cybersecurity", "supervision"],
      nis2Classification: "important",
    },
  },
];

export async function GET(request: Request) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Rate limit
    const identifier = getIdentifier(request, userId);
    const rateLimit = await checkRateLimit("academy", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Fetch user's best scores per scenario
    const bestScores = await prisma.academySimulationRun.groupBy({
      by: ["scenarioId"],
      where: { userId },
      _max: { score: true },
      _count: { id: true },
    });

    const bestScoreMap: Record<
      string,
      { bestScore: number | null; attempts: number }
    > = {};
    for (const entry of bestScores) {
      bestScoreMap[entry.scenarioId] = {
        bestScore: entry._max.score,
        attempts: entry._count.id,
      };
    }

    // Format scenarios with user data
    const scenarios = SIMULATION_SCENARIOS.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      difficulty: scenario.difficulty,
      category: scenario.category,
      estimatedMinutes: scenario.estimatedMinutes,
      operatorProfile: {
        name: scenario.operatorProfile.name,
        type: scenario.operatorProfile.type,
        jurisdiction: scenario.operatorProfile.jurisdiction,
      },
      userProgress: bestScoreMap[scenario.id] ?? {
        bestScore: null,
        attempts: 0,
      },
    }));

    return NextResponse.json({ scenarios });
  } catch (error) {
    logger.error("[Academy Simulations GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch simulations" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Rate limit
    const identifier = getIdentifier(request, userId);
    const rateLimit = await checkRateLimit("academy", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { scenarioId } = body as { scenarioId: string };

    if (!scenarioId) {
      return NextResponse.json(
        { error: "scenarioId is required" },
        { status: 400 },
      );
    }

    // Find the scenario
    const scenario = SIMULATION_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    // Return scenario data for the client to begin the simulation
    return NextResponse.json({
      scenario: {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        difficulty: scenario.difficulty,
        category: scenario.category,
        estimatedMinutes: scenario.estimatedMinutes,
        operatorProfile: scenario.operatorProfile,
      },
      message:
        "Simulation started. Submit results to /api/academy/simulations/run",
    });
  } catch (error) {
    logger.error("[Academy Simulations POST]", error);
    return NextResponse.json(
      { error: "Failed to start simulation" },
      { status: 500 },
    );
  }
}
