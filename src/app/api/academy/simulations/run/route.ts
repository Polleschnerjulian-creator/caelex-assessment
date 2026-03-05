/**
 * Academy Simulation Execution API
 * POST: Execute a simulation against the real compliance engines
 *
 * Auth required. Runs the EU Space Act and NIS2 engines server-side,
 * scores the results, creates AcademySimulationRun record, and checks badges.
 *
 * Body: { scenarioId: string, answers: AssessmentAnswers, decisions: object, timeSpent: number }
 */

import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import {
  calculateCompliance,
  loadSpaceActDataFromDisk,
} from "@/lib/engine.server";
import { calculateNIS2Compliance } from "@/lib/nis2-engine.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Import scenario data — these match the scenarios in simulations/route.ts
// In production, centralize this in a shared data file
const SIMULATION_SCENARIOS = [
  {
    id: "scenario-satellite-operator",
    title: "Satellite Communication Operator",
    difficulty: "INTERMEDIATE",
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
    difficulty: "ADVANCED",
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
    difficulty: "BEGINNER",
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
    difficulty: "ADVANCED",
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

// ─── Scoring Helpers ───

/**
 * Map operator type abbreviation to assessment activityType value.
 */
function mapOperatorToActivity(operatorType: string): string {
  const mapping: Record<string, string> = {
    SCO: "satellite-operator",
    LO: "launch-operator",
    LSO: "launch-service-operator",
    ISOS: "in-orbit-servicing",
    CAP: "constellation-platform",
    PDP: "payload-data-provider",
    TCO: "tracking-command",
  };
  return mapping[operatorType] ?? operatorType.toLowerCase();
}

/**
 * Determine the regime from student answers.
 */
function determineRegime(studentAnswers: Record<string, unknown>): string {
  const entitySize = studentAnswers.entitySize as string | undefined;
  const isResearch = studentAnswers.isResearch as boolean | undefined;

  if (entitySize === "micro" || entitySize === "small" || isResearch) {
    return "light";
  }
  return "standard";
}

/**
 * Calculate module prioritization score (15 points).
 * Checks if critical modules appear in the engine results.
 */
function calculateModuleScore(
  engineResult: Record<string, unknown>,
  criticalModules: string[],
): number {
  if (!criticalModules || criticalModules.length === 0) return 15;

  const moduleStatuses = engineResult.moduleStatuses as
    | Array<{ module?: string; status?: string }>
    | undefined;

  if (!moduleStatuses || moduleStatuses.length === 0) return 5;

  const foundModules = moduleStatuses
    .filter((m) => m.status !== "not_applicable")
    .map((m) => m.module?.toLowerCase() ?? "");

  let matchCount = 0;
  for (const critical of criticalModules) {
    if (foundModules.some((m) => m.includes(critical.toLowerCase()))) {
      matchCount++;
    }
  }

  return Math.min(15, Math.round((matchCount / criticalModules.length) * 15));
}

/**
 * Check NIS2 classification match (15 points).
 */
function checkNIS2Match(
  studentAnswers: Record<string, unknown>,
  expectedClassification: string,
): boolean {
  const nis2Answer =
    (studentAnswers.nis2Classification as string) ??
    (studentAnswers.entityClassification as string) ??
    "";
  return nis2Answer.toLowerCase() === expectedClassification.toLowerCase();
}

/**
 * Score a simulation run based on the student's answers and engine results.
 */
function scoreSimulation(
  scenario: (typeof SIMULATION_SCENARIOS)[number],
  studentAnswers: Record<string, unknown>,
  engineResult: Record<string, unknown>,
): { score: number; feedback: Array<Record<string, unknown>> } {
  let totalScore = 0;
  const feedback: Array<Record<string, unknown>> = [];

  // Operator Classification (20%)
  const operatorCorrect =
    studentAnswers.activityType ===
    mapOperatorToActivity(scenario.expectedAnswers.operatorType);
  totalScore += operatorCorrect ? 20 : 0;
  feedback.push({
    category: "Operator Classification",
    correct: operatorCorrect,
    weight: 20,
    earned: operatorCorrect ? 20 : 0,
    expected: scenario.expectedAnswers.operatorType,
    received: studentAnswers.activityType,
  });

  // Regime Determination (15%)
  const regimeCorrect =
    determineRegime(studentAnswers) === scenario.expectedAnswers.regime;
  totalScore += regimeCorrect ? 15 : 0;
  feedback.push({
    category: "Regime Determination",
    correct: regimeCorrect,
    weight: 15,
    earned: regimeCorrect ? 15 : 0,
    expected: scenario.expectedAnswers.regime,
    received: determineRegime(studentAnswers),
  });

  // Article Identification (20%) — partial credit
  const applicableArticles = engineResult.applicableArticles as
    | unknown[]
    | undefined;
  const identifiedArticles = applicableArticles?.length ?? 0;
  const expectedArticles = scenario.expectedAnswers.keyArticles.length;
  const articleScore = Math.min(
    20,
    Math.round((identifiedArticles / Math.max(expectedArticles, 1)) * 20),
  );
  totalScore += articleScore;
  feedback.push({
    category: "Article Identification",
    correct: articleScore >= 15,
    weight: 20,
    earned: articleScore,
    expectedCount: expectedArticles,
    identifiedCount: identifiedArticles,
  });

  // Module Prioritization (15%)
  const moduleScore = calculateModuleScore(
    engineResult,
    scenario.expectedAnswers.criticalModules,
  );
  totalScore += moduleScore;
  feedback.push({
    category: "Module Prioritization",
    correct: moduleScore >= 12,
    weight: 15,
    earned: moduleScore,
    criticalModules: scenario.expectedAnswers.criticalModules,
  });

  // Cross-Regulatory / NIS2 (15%)
  const nis2Correct = checkNIS2Match(
    studentAnswers,
    scenario.expectedAnswers.nis2Classification,
  );
  totalScore += nis2Correct ? 15 : 0;
  feedback.push({
    category: "Cross-Regulatory (NIS2)",
    correct: nis2Correct,
    weight: 15,
    earned: nis2Correct ? 15 : 0,
    expected: scenario.expectedAnswers.nis2Classification,
  });

  // Remediation / Completeness (15%) — base points for completing
  totalScore += 10;
  feedback.push({
    category: "Remediation & Completeness",
    correct: true,
    weight: 15,
    earned: 10,
    note: "Base points for completing the simulation",
  });

  return { score: Math.min(100, totalScore), feedback };
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

    // Parse body
    const body = await request.json();
    const {
      scenarioId,
      answers,
      decisions,
      timeSpent = 0,
    } = body as {
      scenarioId: string;
      answers: Record<string, unknown>;
      decisions: Record<string, unknown>;
      timeSpent?: number;
    };

    if (!scenarioId || !answers) {
      return NextResponse.json(
        { error: "scenarioId and answers are required" },
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

    // Run the EU Space Act compliance engine with student's answers
    const spaceActData = loadSpaceActDataFromDisk();
    const engineResult = calculateCompliance(
      answers as unknown as Parameters<typeof calculateCompliance>[0],
      spaceActData,
    );

    // Also run NIS2 engine if the student provided NIS2-relevant answers
    let nis2Result = null;
    try {
      if (answers.nis2Classification || answers.entityClassification) {
        nis2Result = await calculateNIS2Compliance(
          answers as unknown as Parameters<typeof calculateNIS2Compliance>[0],
        );
      }
    } catch {
      // NIS2 engine failure is non-fatal for scoring
      console.warn("[Academy Simulation] NIS2 engine call failed, skipping");
    }

    // Score the simulation
    const engineResultObj = engineResult as unknown as Record<string, unknown>;
    const { score, feedback } = scoreSimulation(
      scenario,
      answers,
      engineResultObj,
    );

    // Create the simulation run record
    const simulationRun = await prisma.academySimulationRun.create({
      data: {
        userId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        operatorProfile: scenario.operatorProfile as Prisma.InputJsonValue,
        decisions: (decisions ?? {}) as Prisma.InputJsonValue,
        engineResult: {
          spaceAct: engineResultObj,
          nis2: nis2Result ?? null,
        } as Prisma.InputJsonValue,
        score,
        feedback: feedback as unknown as Prisma.InputJsonValue,
        timeSpent,
      },
    });

    // Check SIMULATION_MASTER badge (score >= 90)
    if (score >= 90) {
      try {
        await prisma.academyBadge.upsert({
          where: {
            userId_badgeType: {
              userId,
              badgeType: "SIMULATION_MASTER",
            },
          },
          create: {
            userId,
            badgeType: "SIMULATION_MASTER",
            metadata: {
              scenarioId: scenario.id,
              score,
              runId: simulationRun.id,
            },
          },
          update: {},
        });
      } catch {
        // Badge already exists — that's fine
      }
    }

    // Batch update best sim score on active enrollments (avoid N+1)
    try {
      await prisma.academyEnrollment.updateMany({
        where: {
          userId,
          status: "ACTIVE",
          OR: [{ bestSimScore: null }, { bestSimScore: { lt: score } }],
        },
        data: { bestSimScore: score },
      });
    } catch {
      // Non-critical update
    }

    return NextResponse.json({
      runId: simulationRun.id,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      score,
      feedback,
      engineResult: {
        spaceAct: engineResultObj,
        nis2: nis2Result,
      },
      timeSpent,
      completedAt: simulationRun.completedAt,
      badgeAwarded: score >= 90 ? "SIMULATION_MASTER" : null,
    });
  } catch (error) {
    logger.error("[Academy Simulation Run POST]", error);
    return NextResponse.json(
      { error: "Failed to execute simulation" },
      { status: 500 },
    );
  }
}
