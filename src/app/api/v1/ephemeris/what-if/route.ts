import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { calculateSatelliteComplianceState } from "@/lib/ephemeris/core/satellite-compliance-state";
import { runWhatIfScenario } from "@/lib/ephemeris/simulation/what-if-engine";
import type { WhatIfScenario } from "@/lib/ephemeris/core/types";

const VALID_SCENARIO_TYPES = [
  "JURISDICTION_CHANGE",
  "ORBIT_RAISE",
  "FUEL_BURN",
  "THRUSTER_FAILURE",
  "EOL_EXTENSION",
] as const;

/**
 * POST /api/v1/ephemeris/what-if
 * Runs a what-if scenario against a satellite's current compliance state.
 * Auth: Session-based
 *
 * Body:
 * {
 *   norad_id: string,
 *   scenario: {
 *     type: "JURISDICTION_CHANGE" | "ORBIT_RAISE" | "FUEL_BURN" | "THRUSTER_FAILURE" | "EOL_EXTENSION",
 *     parameters: { ... }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await request.json();
    const { norad_id, scenario } = body;

    if (!norad_id) {
      return NextResponse.json(
        { error: "norad_id is required" },
        { status: 400 },
      );
    }

    if (!scenario?.type || !scenario?.parameters) {
      return NextResponse.json(
        { error: "scenario with type and parameters is required" },
        { status: 400 },
      );
    }

    if (
      !VALID_SCENARIO_TYPES.includes(
        scenario.type as (typeof VALID_SCENARIO_TYPES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error: `Invalid scenario type: ${scenario.type}. Valid types: ${VALID_SCENARIO_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Verify satellite belongs to org
    const spacecraft = await prisma.spacecraft.findFirst({
      where: {
        noradId: norad_id,
        organizationId: membership.organizationId,
      },
      select: { name: true, launchDate: true },
    });
    if (!spacecraft) {
      return NextResponse.json(
        { error: "Satellite not found in your organization" },
        { status: 404 },
      );
    }

    // Calculate current baseline state
    const baselineState = await calculateSatelliteComplianceState({
      prisma,
      orgId: membership.organizationId,
      noradId: norad_id,
      satelliteName: spacecraft.name,
      launchDate: spacecraft.launchDate,
    });

    const whatIfScenario: WhatIfScenario = {
      type: scenario.type,
      parameters: scenario.parameters,
    };

    const result = await runWhatIfScenario(
      prisma,
      membership.organizationId,
      norad_id,
      spacecraft.name,
      spacecraft.launchDate,
      whatIfScenario,
      baselineState,
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    safeLog("Ephemeris what-if error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to run what-if scenario" },
      { status: 500 },
    );
  }
}
