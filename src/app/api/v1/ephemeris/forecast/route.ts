import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { generateForecast } from "@/lib/ephemeris/forecast/forecast-engine";

/**
 * GET /api/v1/ephemeris/forecast?norad_id=25544
 * Returns forecast curves and compliance events for a satellite.
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

    // Verify satellite belongs to org
    const spacecraft = await prisma.spacecraft.findFirst({
      where: {
        noradId,
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

    const forecast = await generateForecast(
      prisma,
      membership.organizationId,
      noradId,
      spacecraft.launchDate,
    );

    return NextResponse.json({
      data: {
        forecastCurves: forecast.forecastCurves,
        complianceEvents: forecast.complianceEvents,
        horizonDays: forecast.horizonDays,
        solarFluxF107: forecast.f107Used,
      },
    });
  } catch (error) {
    safeLog("Ephemeris forecast error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 },
    );
  }
}
