/**
 * Assure Scenario Analysis Run API
 * POST: Run a specific scenario analysis against the org's risks.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { runScenario } from "@/lib/assure/risk-engine.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id: scenarioId } = await params;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const result = await runScenario(membership.organizationId, scenarioId);

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_scenario_run",
      entityType: "assure_risk",
      entityId: scenarioId,
      metadata: {
        scenarioId,
        scenarioName: result.scenarioName,
        risksAffected: result.affectedRisks?.length ?? 0,
      },
      organizationId: membership.organizationId,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Assure scenario run error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
