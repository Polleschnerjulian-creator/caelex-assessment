import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  getApplicableRequirements,
  getConstellationTier,
} from "@/data/debris-requirements";
import type {
  DebrisMissionProfile,
  OrbitType,
  ManeuverabilityLevel,
  DeorbitStrategy,
} from "@/data/debris-requirements";

// GET /api/debris - Get user's debris assessment(s)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const assessments = await prisma.debrisAssessment.findMany({
      where: { userId },
      include: {
        requirements: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error fetching debris assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/debris - Create a new debris assessment
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      missionName,
      orbitType,
      altitudeKm,
      satelliteCount = 1,
      hasManeuverability,
      hasPropulsion = false,
      hasPassivationCapability = false,
      plannedMissionDurationYears = 5,
      launchDate,
      deorbitStrategy,
      deorbitTimelineYears,
      caServiceProvider,
    } = body;

    // Validate required fields
    if (!orbitType || !hasManeuverability || !deorbitStrategy) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: orbitType, hasManeuverability, deorbitStrategy",
        },
        { status: 400 },
      );
    }

    // Determine constellation tier
    const constellationTier = getConstellationTier(satelliteCount);

    // Create profile for getting applicable requirements
    const profile: DebrisMissionProfile = {
      orbitType: orbitType as OrbitType,
      altitudeKm,
      satelliteCount,
      constellationTier,
      hasManeuverability: hasManeuverability as ManeuverabilityLevel,
      hasPropulsion,
      hasPassivationCapability,
      plannedMissionDurationYears,
      launchDate,
      deorbitStrategy: deorbitStrategy as DeorbitStrategy,
      deorbitTimelineYears,
    };

    // Get applicable requirements
    const applicableRequirements = getApplicableRequirements(profile);

    // Create assessment with requirement statuses in a transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.debrisAssessment.create({
        data: {
          userId,
          missionName,
          orbitType,
          altitudeKm,
          satelliteCount,
          constellationTier,
          hasManeuverability,
          hasPropulsion,
          hasPassivationCap: hasPassivationCapability,
          plannedDurationYears: plannedMissionDurationYears,
          launchDate: launchDate ? new Date(launchDate) : null,
          deorbitStrategy,
          deorbitTimelineYears,
          caServiceProvider,
          complianceScore: 0,
        },
      });

      // Create requirement status entries
      await Promise.all(
        applicableRequirements.map((req) =>
          tx.debrisRequirementStatus.create({
            data: {
              assessmentId: newAssessment.id,
              requirementId: req.id,
              status: "not_assessed",
            },
          }),
        ),
      );

      return newAssessment;
    });

    // Fetch with requirements
    const assessmentWithRequirements = await prisma.debrisAssessment.findUnique(
      {
        where: { id: assessment.id },
        include: { requirements: true },
      },
    );

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "debris_assessment_created",
      entityType: "debris_assessment",
      entityId: assessment.id,
      newValue: {
        orbitType,
        satelliteCount,
        constellationTier,
        applicableRequirements: applicableRequirements.length,
      },
      description: `Created debris assessment for ${constellationTier} ${orbitType} mission`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: assessmentWithRequirements,
      applicableRequirements: applicableRequirements.map((r) => r.id),
    });
  } catch (error) {
    console.error("Error creating debris assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/debris - Update debris assessment
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { assessmentId, ...updateData } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const existing = await prisma.debrisAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Build update data
    const prismaUpdateData: Record<string, unknown> = {};

    if (updateData.missionName !== undefined)
      prismaUpdateData.missionName = updateData.missionName;
    if (updateData.orbitType !== undefined)
      prismaUpdateData.orbitType = updateData.orbitType;
    if (updateData.altitudeKm !== undefined)
      prismaUpdateData.altitudeKm = updateData.altitudeKm;
    if (updateData.satelliteCount !== undefined) {
      prismaUpdateData.satelliteCount = updateData.satelliteCount;
      prismaUpdateData.constellationTier = getConstellationTier(
        updateData.satelliteCount,
      );
    }
    if (updateData.hasManeuverability !== undefined)
      prismaUpdateData.hasManeuverability = updateData.hasManeuverability;
    if (updateData.hasPropulsion !== undefined)
      prismaUpdateData.hasPropulsion = updateData.hasPropulsion;
    if (updateData.hasPassivationCapability !== undefined)
      prismaUpdateData.hasPassivationCap = updateData.hasPassivationCapability;
    if (updateData.plannedMissionDurationYears !== undefined)
      prismaUpdateData.plannedDurationYears =
        updateData.plannedMissionDurationYears;
    if (updateData.launchDate !== undefined)
      prismaUpdateData.launchDate = updateData.launchDate
        ? new Date(updateData.launchDate)
        : null;
    if (updateData.deorbitStrategy !== undefined)
      prismaUpdateData.deorbitStrategy = updateData.deorbitStrategy;
    if (updateData.deorbitTimelineYears !== undefined)
      prismaUpdateData.deorbitTimelineYears = updateData.deorbitTimelineYears;
    if (updateData.caServiceProvider !== undefined)
      prismaUpdateData.caServiceProvider = updateData.caServiceProvider;
    if (updateData.complianceScore !== undefined)
      prismaUpdateData.complianceScore = updateData.complianceScore;

    const updated = await prisma.debrisAssessment.update({
      where: { id: assessmentId },
      data: prismaUpdateData,
      include: { requirements: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "debris_assessment_updated",
      entityType: "debris_assessment",
      entityId: assessmentId,
      previousValue: { ...existing },
      newValue: updateData,
      description: "Updated debris assessment",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ assessment: updated });
  } catch (error) {
    console.error("Error updating debris assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
