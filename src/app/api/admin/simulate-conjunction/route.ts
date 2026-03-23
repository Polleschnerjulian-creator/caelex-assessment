import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  simulateConjunction,
  type SimulationScenario,
} from "@/lib/shield/simulator.server";

const VALID_SCENARIOS: SimulationScenario[] = [
  "emergency",
  "escalating",
  "resolved",
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!member) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { scenario } = body as { scenario: unknown };

    if (
      !scenario ||
      !VALID_SCENARIOS.includes(scenario as SimulationScenario)
    ) {
      return NextResponse.json(
        {
          error: `Invalid scenario. Must be one of: ${VALID_SCENARIOS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const result = await simulateConjunction({
      organizationId: member.organizationId,
      scenario: scenario as SimulationScenario,
    });

    if (!result.success) {
      logger.error("Conjunction simulation failed", {
        userId: session.user.id,
        organizationId: member.organizationId,
        scenario,
        error: result.error,
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    logger.info("Conjunction simulation completed", {
      userId: session.user.id,
      organizationId: member.organizationId,
      scenario,
      eventId: result.eventId,
    });

    await prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: "CONJUNCTION_SIMULATED",
          entityType: "ConjunctionEvent",
          entityId: result.eventId,
          description: `Simulated ${scenario} conjunction — ${result.cdmCount} CDMs, ${result.escalationCount} escalations (${result.conjunctionId})`,
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      conjunctionId: result.conjunctionId,
      scenario: result.scenario,
      cdmCount: result.cdmCount,
      escalationCount: result.escalationCount,
    });
  } catch (error) {
    logger.error("simulate-conjunction route error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
