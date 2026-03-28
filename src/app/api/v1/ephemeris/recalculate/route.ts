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
    const stateJson = structuredClone(toPublicState(internalState));
    const moduleScores = structuredClone(internalState.modules);
    const dataSources = structuredClone(internalState.dataSources);

    await prisma.satelliteComplianceState.upsert({
      where: {
        noradId_operatorId: {
          noradId: norad_id,
          operatorId: membership.organizationId,
        },
      },
      update: {
        stateJson,
        satelliteName: spacecraft.name,
        overallScore: internalState.overallScore,
        moduleScores,
        dataSources,
        horizonDays: internalState.complianceHorizon.daysUntilFirstBreach,
        horizonRegulation:
          internalState.complianceHorizon.firstBreachRegulation,
        horizonConfidence: internalState.complianceHorizon.confidence,
        dataFreshness: internalState.dataFreshness,
        calculatedAt: new Date(),
      },
      create: {
        noradId: norad_id,
        satelliteName: spacecraft.name,
        operatorId: membership.organizationId,
        stateJson,
        overallScore: internalState.overallScore,
        moduleScores,
        dataSources,
        horizonDays: internalState.complianceHorizon.daysUntilFirstBreach,
        horizonRegulation:
          internalState.complianceHorizon.firstBreachRegulation,
        horizonConfidence: internalState.complianceHorizon.confidence,
        dataFreshness: internalState.dataFreshness,
      },
    });

    // Append to history (matches cron behavior)
    const horizonDays = internalState.complianceHorizon.daysUntilFirstBreach;
    const { forecastP10, forecastP50, forecastP90 } = deriveForecastPercentiles(
      horizonDays,
      internalState.complianceHorizon.confidence,
    );

    await prisma.satelliteComplianceStateHistory.create({
      data: {
        noradId: norad_id,
        operatorId: membership.organizationId,
        stateJson: structuredClone(toPublicState(internalState)),
        overallScore: internalState.overallScore,
        moduleScores: structuredClone(internalState.modules),
        horizonDays,
        horizonRegulation:
          internalState.complianceHorizon.firstBreachRegulation,
        dataFreshness: internalState.dataFreshness,
        forecastP10,
        forecastP50,
        forecastP90,
      },
    });

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

/**
 * Derive P10/P50/P90 forecast percentiles from compliance horizon.
 * Uses confidence-based multipliers:
 *   HIGH   → ±10% band around nominal
 *   MEDIUM → ±30% band
 *   LOW    → ±50% band
 */
function deriveForecastPercentiles(
  horizonDays: number | null,
  confidence: string,
): {
  forecastP10: number | null;
  forecastP50: number | null;
  forecastP90: number | null;
} {
  if (horizonDays === null) {
    return { forecastP10: null, forecastP50: null, forecastP90: null };
  }

  let spread: number;
  switch (confidence) {
    case "HIGH":
      spread = 0.1;
      break;
    case "MEDIUM":
      spread = 0.3;
      break;
    default:
      spread = 0.5;
      break;
  }

  return {
    forecastP10: Math.round(horizonDays * (1 - spread)),
    forecastP50: horizonDays,
    forecastP90: Math.round(horizonDays * (1 + spread)),
  };
}
