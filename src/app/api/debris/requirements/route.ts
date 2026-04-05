import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import {
  debrisRequirements,
  getApplicableRequirements,
} from "@/data/debris-requirements";
import type {
  DebrisMissionProfile,
  OrbitType,
  ConstellationTier,
  ManeuverabilityLevel,
  DeorbitStrategy,
} from "@/data/debris-requirements";
import { logger } from "@/lib/logger";

// GET /api/debris/requirements - Get requirements for an assessment
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limiting — api tier for reads
    const rateLimitResult = await checkRateLimit("api", userId);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      // Return all requirements (for reference)
      return NextResponse.json({ requirements: debrisRequirements });
    }

    // Org-scoped query: user's own OR their organization's assessments
    const orgContext = await getCurrentOrganization(userId);
    const assessment = await prisma.debrisAssessment.findFirst({
      where: {
        id: assessmentId,
        OR: [
          { userId },
          ...(orgContext?.organizationId
            ? [{ organizationId: orgContext.organizationId }]
            : []),
        ],
      },
      include: {
        requirements: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Build profile from assessment
    const profile: DebrisMissionProfile = {
      orbitType: assessment.orbitType as OrbitType,
      altitudeKm: assessment.altitudeKm || undefined,
      satelliteCount: assessment.satelliteCount,
      constellationTier: assessment.constellationTier as ConstellationTier,
      hasManeuverability: assessment.hasManeuverability as ManeuverabilityLevel,
      hasPropulsion: assessment.hasPropulsion,
      hasPassivationCapability: assessment.hasPassivationCap,
      plannedMissionDurationYears: assessment.plannedDurationYears,
      launchDate: assessment.launchDate?.toISOString(),
      deorbitStrategy: assessment.deorbitStrategy as DeorbitStrategy,
      deorbitTimelineYears: assessment.deorbitTimelineYears || undefined,
    };

    // Get applicable requirements
    const applicable = getApplicableRequirements(profile);

    // Merge with status data
    const requirementsWithStatus = applicable.map((req) => {
      const statusRecord = assessment.requirements.find(
        (r) => r.requirementId === req.id,
      );
      return {
        ...req,
        status: statusRecord?.status || "not_assessed",
        notes: statusRecord?.notes || null,
        evidenceNotes: statusRecord?.evidenceNotes || null,
        responses: (statusRecord?.responses as Record<string, unknown>) || null,
        statusId: statusRecord?.id || null,
      };
    });

    return NextResponse.json({
      requirements: requirementsWithStatus,
      assessment: {
        id: assessment.id,
        missionName: assessment.missionName,
        orbitType: assessment.orbitType,
        constellationTier: assessment.constellationTier,
        complianceScore: assessment.complianceScore,
      },
    });
  } catch (error) {
    logger.error("Error fetching debris requirements", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/debris/requirements - Update requirement status
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limiting — sensitive tier for writes
    const rateLimitResult = await checkRateLimit("sensitive", userId);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();

    const putSchema = z.object({
      assessmentId: z.string().min(1),
      requirementId: z.string().min(1),
      status: z
        .enum([
          "not_assessed",
          "compliant",
          "partial",
          "non_compliant",
          "not_applicable",
        ])
        .optional(),
      notes: z.string().nullable().optional(),
      evidenceNotes: z.string().nullable().optional(),
      responses: z.record(z.string(), z.unknown()).nullable().optional(),
    });

    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      assessmentId,
      requirementId,
      status,
      notes,
      evidenceNotes,
      responses,
    } = parsed.data;

    // Org-scoped query: user's own OR their organization's assessments
    const orgContext = await getCurrentOrganization(userId);
    const assessment = await prisma.debrisAssessment.findFirst({
      where: {
        id: assessmentId,
        OR: [
          { userId },
          ...(orgContext?.organizationId
            ? [{ organizationId: orgContext.organizationId }]
            : []),
        ],
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Get previous state for audit
    const previous = await prisma.debrisRequirementStatus.findUnique({
      where: {
        assessmentId_requirementId: {
          assessmentId,
          requirementId,
        },
      },
    });

    // Upsert requirement status
    const updated = await prisma.debrisRequirementStatus.upsert({
      where: {
        assessmentId_requirementId: {
          assessmentId,
          requirementId,
        },
      },
      update: {
        status: status ?? undefined,
        notes: notes ?? undefined,
        evidenceNotes: evidenceNotes ?? undefined,
        responses: responses !== undefined ? (responses as any) : undefined,
      },
      create: {
        assessmentId,
        requirementId,
        status: status || "not_assessed",
        notes,
        evidenceNotes,
        responses: responses ? (responses as any) : undefined,
      },
    });

    // Recalculate compliance score (weighted by severity)
    const allStatuses = await prisma.debrisRequirementStatus.findMany({
      where: { assessmentId },
    });

    const SEVERITY_WEIGHTS: Record<string, number> = {
      critical: 3,
      major: 2,
      minor: 1,
    };

    let weightedCompliant = 0;
    let totalWeight = 0;

    for (const req of allStatuses) {
      if (req.status === "not_applicable") continue;
      const reqDef = debrisRequirements.find((r) => r.id === req.requirementId);
      const weight = SEVERITY_WEIGHTS[reqDef?.severity || "minor"] || 1;
      totalWeight += weight;
      if (req.status === "compliant") weightedCompliant += weight;
      if (req.status === "partial") weightedCompliant += weight * 0.5;
    }

    const complianceScore =
      totalWeight > 0 ? Math.round((weightedCompliant / totalWeight) * 100) : 0;

    await prisma.debrisAssessment.update({
      where: { id: assessmentId },
      data: { complianceScore },
    });

    // Log audit event if status changed
    if (!previous || previous.status !== status) {
      const { ipAddress, userAgent } = getRequestContext(request);
      await logAuditEvent({
        userId,
        action: "debris_requirement_status_changed",
        entityType: "debris_requirement",
        entityId: requirementId,
        previousValue: previous ? { status: previous.status } : null,
        newValue: { status },
        description: `Changed requirement "${requirementId}" status to "${status}"`,
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json({
      requirementStatus: updated,
      complianceScore,
    });
  } catch (error) {
    logger.error("Error updating debris requirement", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
