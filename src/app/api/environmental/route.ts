import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  calculateScreeningLCA,
  type MissionProfile,
  type LaunchVehicleId,
} from "@/data/environmental-requirements";

// GET /api/environmental - List user's environmental assessments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const assessments = await prisma.environmentalAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        impactResults: true,
        supplierRequests: {
          select: {
            id: true,
            status: true,
            componentType: true,
          },
        },
      },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error fetching environmental assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/environmental - Create new environmental assessment
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      assessmentName,
      missionName,
      operatorType,
      missionType,
      spacecraftMassKg,
      spacecraftCount,
      orbitType,
      altitudeKm,
      missionDurationYears,
      launchVehicle,
      launchSharePercent,
      launchSiteCountry,
      spacecraftPropellant,
      propellantMassKg,
      groundStationCount,
      dailyContactHours,
      deorbitStrategy,
      isSmallEnterprise,
      isResearchEducation,
    } = body;

    // Validate required fields
    if (!spacecraftMassKg || !orbitType || !launchVehicle || !deorbitStrategy) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: spacecraftMassKg, orbitType, launchVehicle, deorbitStrategy",
        },
        { status: 400 },
      );
    }

    // Create assessment
    const assessment = await prisma.environmentalAssessment.create({
      data: {
        userId,
        assessmentName:
          assessmentName ||
          `Environmental Assessment ${new Date().toLocaleDateString()}`,
        status: "draft",
        missionName,
        operatorType: operatorType || "spacecraft",
        missionType: missionType || "commercial",
        spacecraftMassKg,
        spacecraftCount: spacecraftCount || 1,
        orbitType,
        altitudeKm,
        missionDurationYears: missionDurationYears || 5,
        launchVehicle,
        launchSharePercent: launchSharePercent || 100,
        launchSiteCountry,
        spacecraftPropellant,
        propellantMassKg,
        groundStationCount: groundStationCount || 1,
        dailyContactHours: dailyContactHours || 2,
        deorbitStrategy,
        isSmallEnterprise: isSmallEnterprise || false,
        isResearchEducation: isResearchEducation || false,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "environmental_assessment_created",
      entityType: "environmental_assessment",
      entityId: assessment.id,
      newValue: {
        missionName,
        spacecraftMassKg,
        orbitType,
        launchVehicle,
      },
      description: "Created Environmental Footprint Assessment",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error("Error creating environmental assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
