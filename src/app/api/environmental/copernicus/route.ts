import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { fetchAtmosphericData } from "@/lib/data-sources";
import { getLaunchSiteForVehicle } from "@/data/launch-sites";

/**
 * GET /api/environmental/copernicus?assessmentId=xxx
 *
 * Fetches Copernicus Sentinel-5P atmospheric data for the launch site
 * associated with an environmental assessment.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 },
      );
    }

    // Load assessment to get launch vehicle
    const assessment = await prisma.environmentalAssessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
      select: {
        id: true,
        launchVehicle: true,
        launchSiteCountry: true,
        totalGWP: true,
        totalODP: true,
        carbonIntensity: true,
        efdGrade: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Resolve launch site coordinates
    const site = getLaunchSiteForVehicle(assessment.launchVehicle);
    if (!site) {
      return NextResponse.json({
        data: null,
        error: `No coordinates mapped for launch vehicle: ${assessment.launchVehicle}`,
        launchVehicle: assessment.launchVehicle,
      });
    }

    // Fetch last 7 days of atmospheric data
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateRange = {
      from: weekAgo.toISOString(),
      to: now.toISOString(),
    };

    const result = await fetchAtmosphericData(
      site.lat,
      site.lon,
      site.radiusKm,
      dateRange,
    );

    return NextResponse.json({
      data: result.data,
      source: result.source.name,
      launchSite: site.name,
      launchSiteCoords: { lat: site.lat, lon: site.lon },
      radiusKm: site.radiusKm,
      fetchedAt: result.fetchedAt,
      durationMs: result.durationMs,
      error: result.primaryFailureReason,
      // Include assessment context for verification
      assessment: {
        totalGWP: assessment.totalGWP,
        carbonIntensity: assessment.carbonIntensity,
        efdGrade: assessment.efdGrade,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: getSafeErrorMessage(
          error,
          "Failed to fetch Copernicus atmospheric data",
        ),
      },
      { status: 500 },
    );
  }
}
