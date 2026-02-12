import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import {
  getApplicableRequirements,
  type UsOperatorProfile,
  type UsOperatorType,
  type UsActivityType,
  type UsAgency,
} from "@/data/us-space-regulations";
import {
  determineRequiredLicenses,
  determineRequiredAgencies,
} from "@/lib/us-regulatory-engine.server";

// GET /api/us-regulatory - Get user's US Regulatory assessments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const assessments = await prisma.usRegulatoryAssessment.findMany({
      where: { userId },
      include: {
        requirementStatuses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error fetching US Regulatory assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/us-regulatory - Create a new US Regulatory assessment
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
      operatorTypes,
      activityTypes,
      isUsEntity = true,
      usNexus = "us_licensed",
      orbitRegime,
      altitudeKm,
      frequencyBands,
      satelliteCount,
      hasManeuverability = false,
      hasPropulsion = false,
      missionDurationYears,
      isConstellation = false,
      isSmallSatellite = false,
      isNGSO,
      providesRemoteSensing = false,
      remoteSensingResolutionM,
      launchVehicle,
      launchSite,
      launchDate,
    } = body;

    // Validate required fields
    if (
      !operatorTypes ||
      operatorTypes.length === 0 ||
      !activityTypes ||
      activityTypes.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields: operatorTypes, activityTypes",
        },
        { status: 400 },
      );
    }

    // Validate operator types
    const validOperatorTypes: UsOperatorType[] = [
      "satellite_operator",
      "launch_operator",
      "reentry_operator",
      "remote_sensing_operator",
      "spectrum_user",
      "spaceport_operator",
    ];
    for (const opType of operatorTypes) {
      if (!validOperatorTypes.includes(opType)) {
        return NextResponse.json(
          { error: `Invalid operator type: ${opType}` },
          { status: 400 },
        );
      }
    }

    // Validate activity types
    const validActivityTypes: UsActivityType[] = [
      "satellite_communications",
      "earth_observation",
      "scientific_research",
      "commercial_launch",
      "commercial_reentry",
      "spectrum_operations",
      "remote_sensing",
      "navigation",
      "broadband",
      "direct_broadcast",
    ];
    for (const activity of activityTypes) {
      if (!validActivityTypes.includes(activity)) {
        return NextResponse.json(
          { error: `Invalid activity type: ${activity}` },
          { status: 400 },
        );
      }
    }

    // Create profile for getting applicable requirements
    const profile: UsOperatorProfile = {
      operatorTypes: operatorTypes as UsOperatorType[],
      activityTypes: activityTypes as UsActivityType[],
      agencies: [] as UsAgency[], // Will be determined
      isUsEntity,
      usNexus,
      orbitRegime,
      altitudeKm,
      frequencyBands,
      satelliteCount,
      hasManeuverability,
      hasPropulsion,
      missionDurationYears,
      isConstellation,
      isSmallSatellite,
      isNGSO: isNGSO ?? orbitRegime !== "GEO",
      providesRemoteSensing,
      remotesensingResolutionM: remoteSensingResolutionM,
    };

    // Determine required agencies and licenses
    const requiredAgencies = determineRequiredAgencies(profile);
    profile.agencies = requiredAgencies;

    // Get applicable requirements
    const applicableRequirements = getApplicableRequirements(profile);

    // Determine required licenses
    const requiredLicenses = determineRequiredLicenses(profile);

    // Create assessment with requirement statuses in a transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.usRegulatoryAssessment.create({
        data: {
          userId,
          assessmentName,
          operatorTypes: JSON.stringify(operatorTypes),
          activityTypes: JSON.stringify(activityTypes),
          agencies: JSON.stringify(requiredAgencies),
          isUsEntity,
          usNexus,
          orbitRegime,
          altitudeKm,
          frequencyBands: frequencyBands
            ? JSON.stringify(frequencyBands)
            : null,
          satelliteCount,
          hasManeuverability,
          hasPropulsion,
          missionDurationYears,
          isConstellation,
          isSmallSatellite,
          isNGSO: isNGSO ?? orbitRegime !== "GEO",
          providesRemoteSensing,
          remoteSensingResolutionM: remoteSensingResolutionM,
          launchVehicle,
          launchSite,
          launchDate: launchDate ? new Date(launchDate) : null,
          status: "draft",
          overallComplianceScore: 0,
          fccComplianceScore: 0,
          faaComplianceScore: 0,
          noaaComplianceScore: 0,
        },
      });

      // Create requirement status entries for applicable requirements
      await Promise.all(
        applicableRequirements.map((requirement) =>
          tx.usRequirementStatus.create({
            data: {
              assessmentId: newAssessment.id,
              requirementId: requirement.id,
              status: "not_assessed",
            },
          }),
        ),
      );

      return newAssessment;
    });

    // Fetch with requirement statuses
    const assessmentWithStatuses =
      await prisma.usRegulatoryAssessment.findUnique({
        where: { id: assessment.id },
        include: { requirementStatuses: true },
      });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "US_REGULATORY_ASSESSMENT_CREATED",
      entityType: "UsRegulatoryAssessment",
      entityId: assessment.id,
      metadata: {
        operatorTypes,
        activityTypes,
        agencies: requiredAgencies,
        applicableRequirementsCount: applicableRequirements.length,
        requiredLicenses,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: assessmentWithStatuses,
      applicableRequirementsCount: applicableRequirements.length,
      requiredAgencies,
      requiredLicenses,
    });
  } catch (error) {
    console.error("Error creating US Regulatory assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
