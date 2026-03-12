import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { formatHorizonSummary } from "@/lib/ephemeris/forecast/compliance-horizon";
import type { ComplianceHorizon, Confidence } from "@/lib/ephemeris/core/types";

/**
 * GET /api/v1/ephemeris/horizon?norad_id=25544
 * Returns the compliance horizon (days until first breach) for a satellite.
 * Reads from the DB cache instead of running the full compliance calculation.
 * Auth: Session-based
 */
export async function GET(request: NextRequest) {
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

    const noradId = request.nextUrl.searchParams.get("norad_id");
    if (!noradId) {
      return NextResponse.json(
        { error: "norad_id query parameter is required" },
        { status: 400 },
      );
    }

    const spacecraft = await prisma.spacecraft.findFirst({
      where: {
        noradId,
        organizationId: membership.organizationId,
      },
      select: { name: true },
    });
    if (!spacecraft) {
      return NextResponse.json(
        { error: "Satellite not found in your organization" },
        { status: 404 },
      );
    }

    const cachedState = await prisma.satelliteComplianceState.findUnique({
      where: {
        noradId_operatorId: {
          noradId,
          operatorId: membership.organizationId,
        },
      },
      select: {
        horizonDays: true,
        horizonRegulation: true,
        horizonConfidence: true,
        overallScore: true,
        calculatedAt: true,
      },
    });

    if (!cachedState) {
      return NextResponse.json(
        {
          error:
            "No compliance state available. Run /recalculate or wait for daily cron.",
        },
        { status: 404 },
      );
    }

    const horizon: ComplianceHorizon = {
      daysUntilFirstBreach: cachedState.horizonDays,
      firstBreachRegulation: cachedState.horizonRegulation,
      firstBreachType: null,
      confidence: cachedState.horizonConfidence as Confidence,
    };

    return NextResponse.json({
      data: {
        noradId,
        satelliteName: spacecraft.name,
        horizon: {
          daysUntilFirstBreach: horizon.daysUntilFirstBreach,
          firstBreachRegulation: horizon.firstBreachRegulation,
          confidence: horizon.confidence,
        },
        summary: formatHorizonSummary(horizon),
        overallScore: cachedState.overallScore,
        cachedAt: cachedState.calculatedAt.toISOString(),
      },
    });
  } catch (error) {
    safeLog("Ephemeris horizon error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to retrieve compliance horizon" },
      { status: 500 },
    );
  }
}
