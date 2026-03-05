/**
 * Academy Simulation Run Detail API
 * GET: Get a specific simulation run result
 *
 * Auth required. Verifies run belongs to the requesting user.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
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

    const { runId } = await params;

    // Fetch the simulation run
    const run = await prisma.academySimulationRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Simulation run not found" },
        { status: 404 },
      );
    }

    // Verify ownership
    if (run.userId !== userId) {
      return NextResponse.json(
        { error: "Simulation run not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: run.id,
      scenarioId: run.scenarioId,
      scenarioTitle: run.scenarioTitle,
      operatorProfile: run.operatorProfile,
      decisions: run.decisions,
      engineResult: run.engineResult,
      score: run.score,
      feedback: run.feedback,
      timeSpent: run.timeSpent,
      completedAt: run.completedAt,
    });
  } catch (error) {
    logger.error("[Academy Simulation Run GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch simulation run" },
      { status: 500 },
    );
  }
}
