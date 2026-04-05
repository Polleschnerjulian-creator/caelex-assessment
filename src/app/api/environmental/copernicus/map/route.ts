import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { copernicusProvider } from "@/lib/data-sources";
import { getLaunchSiteForVehicle } from "@/data/launch-sites";

/**
 * GET /api/environmental/copernicus/map?assessmentId=xxx&variable=NO2
 *
 * Returns a Sentinel-5P atmospheric concentration map as PNG image
 * for the launch site region of an environmental assessment.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "assessment",
      getIdentifier(req, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get("assessmentId");
    const variable = searchParams.get("variable") || "NO2";

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 },
      );
    }

    const assessment = await prisma.environmentalAssessment.findFirst({
      where: { id: assessmentId, userId: session.user.id },
      select: { launchVehicle: true },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    const site = getLaunchSiteForVehicle(assessment.launchVehicle);
    if (!site) {
      return NextResponse.json(
        { error: "No coordinates for launch vehicle" },
        { status: 400 },
      );
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateRange = {
      from: weekAgo.toISOString(),
      to: now.toISOString(),
    };

    const imageBuffer = await copernicusProvider.fetchMapImage(
      site.lat,
      site.lon,
      site.radiusKm,
      variable,
      dateRange,
      640,
      480,
    );

    if (!imageBuffer) {
      return NextResponse.json(
        { error: "No satellite imagery available for this region/period" },
        { status: 404 },
      );
    }

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "X-Data-Source": "Copernicus Sentinel-5P TROPOMI",
        "X-Launch-Site": site.name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: getSafeErrorMessage(
          error,
          "Failed to fetch Copernicus map image",
        ),
      },
      { status: 500 },
    );
  }
}
