import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { calculateSatelliteComplianceState } from "@/lib/ephemeris/core/satellite-compliance-state";
import { toPublicState } from "@/lib/ephemeris/core/types";
import { generateForecast } from "@/lib/ephemeris/forecast/forecast-engine";

/**
 * POST /api/v1/ephemeris/recalculate
 * Forces a recalculation of compliance state for a satellite and persists the result.
 * Auth: Session-based
 *
 * Body:
 * {
 *   norad_id: string
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
    const { norad_id } = body;

    if (!norad_id) {
      return NextResponse.json(
        { error: "norad_id is required" },
        { status: 400 },
      );
    }

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

    const startTime = Date.now();

    // Recalculate compliance state
    const internalState = await calculateSatelliteComplianceState({
      prisma,
      orgId: membership.organizationId,
      noradId: norad_id,
      satelliteName: spacecraft.name,
      launchDate: spacecraft.launchDate,
    });

    // Persist the state (upsert SatelliteComplianceState)
    const db = prisma as unknown as Record<string, unknown>;
    const stateModel = db["satelliteComplianceState"] as
      | {
          upsert: (args: Record<string, unknown>) => Promise<unknown>;
        }
      | undefined;

    if (stateModel) {
      const stateJson = JSON.parse(
        JSON.stringify(toPublicState(internalState)),
      );
      await stateModel.upsert({
        where: {
          noradId_operatorId: {
            noradId: norad_id,
            operatorId: membership.organizationId,
          },
        },
        update: {
          stateJson,
          overallScore: internalState.overallScore,
          horizonDays: internalState.complianceHorizon.daysUntilFirstBreach,
          dataFreshness: internalState.dataFreshness,
          calculatedAt: new Date(),
        },
        create: {
          noradId: norad_id,
          satelliteName: spacecraft.name,
          operatorId: membership.organizationId,
          stateJson,
          overallScore: internalState.overallScore,
          horizonDays: internalState.complianceHorizon.daysUntilFirstBreach,
          dataFreshness: internalState.dataFreshness,
        },
      });
    }

    // Also regenerate forecast
    const forecast = await generateForecast(
      prisma,
      membership.organizationId,
      norad_id,
      spacecraft.launchDate,
    );

    const durationMs = Date.now() - startTime;

    safeLog("Ephemeris recalculation complete", {
      noradId: norad_id,
      durationMs,
      overallScore: internalState.overallScore,
    });

    return NextResponse.json({
      data: {
        state: toPublicState(internalState),
        forecast: {
          curves: forecast.forecastCurves.length,
          events: forecast.complianceEvents.length,
          horizonDays: forecast.horizonDays,
        },
      },
      meta: {
        recalculatedAt: new Date().toISOString(),
        durationMs,
      },
    });
  } catch (error) {
    safeLog("Ephemeris recalculate error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to recalculate compliance state" },
      { status: 500 },
    );
  }
}
