import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { calculateSatelliteComplianceState } from "@/lib/ephemeris/core/satellite-compliance-state";
import { formatHorizonSummary } from "@/lib/ephemeris/forecast/compliance-horizon";

/**
 * GET /api/v1/ephemeris/horizon?norad_id=25544
 * Returns the compliance horizon (days until first breach) for a satellite.
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
      select: { name: true, launchDate: true },
    });
    if (!spacecraft) {
      return NextResponse.json(
        { error: "Satellite not found in your organization" },
        { status: 404 },
      );
    }

    const state = await calculateSatelliteComplianceState({
      prisma,
      orgId: membership.organizationId,
      noradId,
      satelliteName: spacecraft.name,
      launchDate: spacecraft.launchDate,
    });

    return NextResponse.json({
      data: {
        noradId,
        satelliteName: spacecraft.name,
        horizon: state.complianceHorizon,
        summary: formatHorizonSummary(state.complianceHorizon),
        overallScore: state.overallScore,
      },
    });
  } catch (error) {
    safeLog("Ephemeris horizon error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to calculate compliance horizon" },
      { status: 500 },
    );
  }
}
