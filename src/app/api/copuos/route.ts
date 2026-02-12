import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import {
  getApplicableGuidelines,
  getSatelliteCategory,
} from "@/data/copuos-iadc-requirements";
import type {
  CopuosMissionProfile,
  OrbitRegime,
  MissionType,
} from "@/data/copuos-iadc-requirements";

// GET /api/copuos - Get user's COPUOS assessments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const assessments = await prisma.copuosAssessment.findMany({
      where: { userId },
      include: {
        guidelineStatuses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error fetching COPUOS assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/copuos - Create a new COPUOS assessment
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit("assessment", session.user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      assessmentName,
      missionName,
      orbitRegime,
      altitudeKm,
      inclinationDeg,
      missionType,
      satelliteMassKg,
      hasManeuverability = false,
      hasPropulsion = false,
      plannedLifetimeYears = 5,
      isConstellation = false,
      constellationSize,
      launchDate,
      countryOfRegistry,
      deorbitStrategy,
      deorbitTimelineYears,
      caServiceProvider,
    } = body;

    // Validate required fields
    if (!orbitRegime || !missionType || !satelliteMassKg) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: orbitRegime, missionType, satelliteMassKg",
        },
        { status: 400 },
      );
    }

    // Validate orbit regime
    const validOrbitRegimes: OrbitRegime[] = [
      "LEO",
      "MEO",
      "GEO",
      "HEO",
      "GTO",
      "cislunar",
      "deep_space",
    ];
    if (!validOrbitRegimes.includes(orbitRegime)) {
      return NextResponse.json(
        { error: "Invalid orbit regime" },
        { status: 400 },
      );
    }

    // Validate mission type
    const validMissionTypes: MissionType[] = [
      "commercial",
      "scientific",
      "governmental",
      "educational",
      "military",
    ];
    if (!validMissionTypes.includes(missionType)) {
      return NextResponse.json(
        { error: "Invalid mission type" },
        { status: 400 },
      );
    }

    // Determine satellite category
    const satelliteCategory = getSatelliteCategory(satelliteMassKg);

    // Create profile for getting applicable guidelines
    const profile: CopuosMissionProfile = {
      orbitRegime: orbitRegime as OrbitRegime,
      altitudeKm,
      inclinationDeg,
      missionType: missionType as MissionType,
      satelliteCategory,
      satelliteMassKg,
      hasManeuverability,
      hasPropulsion,
      plannedLifetimeYears,
      isConstellation,
      constellationSize,
      launchDate,
      countryOfRegistry,
    };

    // Get applicable guidelines
    const applicableGuidelines = getApplicableGuidelines(profile);

    // Create assessment with guideline statuses in a transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.copuosAssessment.create({
        data: {
          userId,
          assessmentName,
          missionName,
          orbitRegime,
          altitudeKm,
          inclinationDeg,
          missionType,
          satelliteCategory,
          satelliteMassKg,
          hasManeuverability,
          hasPropulsion,
          plannedLifetimeYears,
          isConstellation,
          constellationSize,
          launchDate: launchDate ? new Date(launchDate) : null,
          countryOfRegistry,
          deorbitStrategy,
          deorbitTimelineYears,
          caServiceProvider,
          status: "draft",
          complianceScore: 0,
        },
      });

      // Create guideline status entries for applicable guidelines
      await Promise.all(
        applicableGuidelines.map((guideline) =>
          tx.copuosGuidelineStatus.create({
            data: {
              assessmentId: newAssessment.id,
              guidelineId: guideline.id,
              status: "not_assessed",
            },
          }),
        ),
      );

      return newAssessment;
    });

    // Fetch with guideline statuses
    const assessmentWithStatuses = await prisma.copuosAssessment.findUnique({
      where: { id: assessment.id },
      include: { guidelineStatuses: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "COPUOS_ASSESSMENT_CREATED",
      entityType: "CopuosAssessment",
      entityId: assessment.id,
      metadata: {
        orbitRegime,
        missionType,
        satelliteMassKg,
        applicableGuidelinesCount: applicableGuidelines.length,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: assessmentWithStatuses,
      applicableGuidelinesCount: applicableGuidelines.length,
    });
  } catch (error) {
    console.error("Error creating COPUOS assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
