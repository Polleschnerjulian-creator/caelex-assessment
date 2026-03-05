import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import {
  calculateScreeningLCA,
  type MissionProfile,
  type LaunchVehicleId,
} from "@/data/environmental-requirements";
import { logger } from "@/lib/logger";

// GET /api/environmental - List user's environmental assessments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Resolve organization context for multi-tenant scoping
    const orgContext = await getCurrentOrganization(userId);
    const where: Record<string, unknown> = { userId };
    if (orgContext?.organizationId) {
      where.organizationId = orgContext.organizationId;
    }

    const assessments = await prisma.environmentalAssessment.findMany({
      where,
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
    logger.error("Error fetching environmental assessments", error);
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

    const schema = z.object({
      assessmentName: z.string().optional(),
      missionName: z.string().optional(),
      operatorType: z.enum(["spacecraft", "launch", "launch_site"]).optional(),
      missionType: z
        .enum(["commercial", "research", "government", "educational"])
        .optional(),
      spacecraftMassKg: z.number().positive(),
      spacecraftCount: z.number().optional(),
      orbitType: z.enum(["LEO", "MEO", "GEO", "HEO", "cislunar", "deep_space"]),
      altitudeKm: z.number().optional(),
      missionDurationYears: z.number().optional(),
      launchVehicle: z.string().min(1),
      launchSharePercent: z.number().optional(),
      launchSiteCountry: z.string().optional(),
      spacecraftPropellant: z.string().optional(),
      propellantMassKg: z.number().optional(),
      groundStationCount: z.number().optional(),
      dailyContactHours: z.number().optional(),
      deorbitStrategy: z.enum([
        "controlled_deorbit",
        "passive_decay",
        "graveyard_orbit",
        "retrieval",
      ]),
      isSmallEnterprise: z.boolean().optional(),
      isResearchEducation: z.boolean().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

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
    } = parsed.data;

    // Resolve organization context for multi-tenant scoping
    const orgCtx = await getCurrentOrganization(userId);

    // Create assessment
    const assessment = await prisma.environmentalAssessment.create({
      data: {
        userId,
        organizationId: orgCtx?.organizationId || null,
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
    logger.error("Error creating environmental assessment", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
