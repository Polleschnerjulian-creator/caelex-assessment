import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { roleHasPermission } from "@/lib/permissions";
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
import { logger } from "@/lib/logger";

// GET /api/debris - Get user's debris assessment(s)
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

    const assessments = await prisma.debrisAssessment.findMany({
      where,
      include: {
        requirements: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    logger.error("Error fetching debris assessments", error);
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

    const schema = z.object({
      missionName: z.string().optional(),
      orbitType: z.enum(["LEO", "MEO", "GEO", "HEO", "cislunar", "deep_space"]),
      altitudeKm: z.number().optional(),
      satelliteCount: z.number().optional().default(1),
      hasManeuverability: z.enum(["full", "limited", "none"]),
      hasPropulsion: z.boolean().optional().default(false),
      hasPassivationCapability: z.boolean().optional().default(false),
      plannedMissionDurationYears: z.number().optional().default(5),
      launchDate: z.string().optional(),
      deorbitStrategy: z.enum([
        "active_deorbit",
        "passive_decay",
        "graveyard_orbit",
        "adr_contracted",
      ]),
      deorbitTimelineYears: z.number().optional(),
      caServiceProvider: z.string().optional(),
      spacecraftId: z.string().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      missionName,
      orbitType,
      altitudeKm,
      satelliteCount,
      hasManeuverability,
      hasPropulsion,
      hasPassivationCapability,
      plannedMissionDurationYears,
      launchDate,
      deorbitStrategy,
      deorbitTimelineYears,
      caServiceProvider,
      spacecraftId,
    } = parsed.data;

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

    // Resolve organization context for multi-tenant scoping
    const orgCtx = await getCurrentOrganization(userId);

    // Create assessment with requirement statuses in a transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.debrisAssessment.create({
        data: {
          userId,
          organizationId: orgCtx?.organizationId || null,
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
          spacecraftId: spacecraftId || null,
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

    // Sync to authorization document status (best-effort)
    try {
      const { syncAssessmentToAuthorizationDocs } =
        await import("@/lib/services/authorization-document-sync.server");
      await syncAssessmentToAuthorizationDocs(
        orgCtx?.organizationId || null,
        userId,
        "debris",
      );
    } catch (syncErr) {
      logger.warn("Failed to sync to authorization docs", syncErr);
    }

    return NextResponse.json({
      assessment: assessmentWithRequirements,
      applicableRequirements: applicableRequirements.map((r) => r.id),
    });
  } catch (error) {
    logger.error("Error creating debris assessment", error);
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

    const updateSchema = z
      .object({
        assessmentId: z.string().min(1),
        missionName: z.string().optional(),
        orbitType: z
          .enum(["LEO", "MEO", "GEO", "HEO", "cislunar", "deep_space"])
          .optional(),
        altitudeKm: z.number().optional(),
        satelliteCount: z.number().optional(),
        hasManeuverability: z.enum(["full", "limited", "none"]).optional(),
        hasPropulsion: z.boolean().optional(),
        hasPassivationCapability: z.boolean().optional(),
        plannedMissionDurationYears: z.number().optional(),
        launchDate: z.string().nullable().optional(),
        deorbitStrategy: z
          .enum([
            "active_deorbit",
            "passive_decay",
            "graveyard_orbit",
            "adr_contracted",
          ])
          .optional(),
        deorbitTimelineYears: z.number().optional(),
        caServiceProvider: z.string().nullable().optional(),
        spacecraftId: z.string().nullable().optional(),
      })
      .partial()
      .required({ assessmentId: true });

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { assessmentId, ...updateData } = parsed.data;

    // Resolve organization context for multi-tenant scoping
    const orgCtxPut = await getCurrentOrganization(userId);
    const putWhere: Record<string, unknown> = { id: assessmentId, userId };
    if (orgCtxPut?.organizationId) {
      putWhere.organizationId = orgCtxPut.organizationId;
    }

    // Verify ownership
    const existing = await prisma.debrisAssessment.findFirst({
      where: putWhere,
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
    if (updateData.spacecraftId !== undefined)
      prismaUpdateData.spacecraftId = updateData.spacecraftId;
    // complianceScore is server-calculated only — not accepted from client input

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
    logger.error("Error updating debris assessment", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/debris - Delete a debris assessment
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting — sensitive tier for deletes
    const deleteRateLimitResult = await checkRateLimit(
      "sensitive",
      session.user.id,
    );
    if (!deleteRateLimitResult.success) {
      return createRateLimitResponse(deleteRateLimitResult);
    }

    const userId = session.user.id;
    const body = await request.json();

    const deleteSchema = z.object({
      assessmentId: z.string().min(1),
    });

    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { assessmentId } = parsed.data;

    // RBAC: require compliance:write (MANAGER+) for DELETE
    const orgContext = await getCurrentOrganization(userId);
    if (orgContext && !roleHasPermission(orgContext.role, "compliance:write")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Org-scoped query: user's own OR their organization's assessments
    const deleteWhere: Record<string, unknown> = { id: assessmentId, userId };
    if (orgContext?.organizationId) {
      deleteWhere.organizationId = orgContext.organizationId;
    }

    const existing = await prisma.debrisAssessment.findFirst({
      where: deleteWhere,
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Delete (cascades to requirement statuses)
    await prisma.debrisAssessment.delete({
      where: { id: assessmentId },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "debris_assessment_deleted",
      entityType: "debris_assessment",
      entityId: assessmentId,
      previousValue: {
        deleted: true,
        missionName: existing.missionName,
        orbitType: existing.orbitType,
      },
      description: "Deleted debris assessment",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting debris assessment", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
