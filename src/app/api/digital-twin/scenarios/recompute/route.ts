import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  markStaleScenarios,
  recomputeScenario,
} from "@/lib/services/whatif-engine-bridge";
import { logger } from "@/lib/logger";

/**
 * POST /api/digital-twin/scenarios/recompute
 * Recompute a stale scenario or mark all stale scenarios.
 *
 * Body: { scenarioId?: string, markStale?: boolean }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scenarioId, markStale } = body as {
      scenarioId?: string;
      markStale?: boolean;
    };

    // Mark stale scenarios
    if (markStale) {
      const count = await markStaleScenarios(session.user.id);
      return NextResponse.json({
        success: true,
        data: { markedStale: count },
      });
    }

    // Recompute a specific scenario
    if (!scenarioId) {
      return NextResponse.json(
        { error: "scenarioId is required for recompute" },
        { status: 400 },
      );
    }

    const result = await recomputeScenario(session.user.id, scenarioId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Digital Twin recompute POST error", error);
    return NextResponse.json(
      { error: "Failed to recompute scenario" },
      { status: 500 },
    );
  }
}
