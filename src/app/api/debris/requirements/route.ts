import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
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

// GET /api/debris/requirements - Get requirements for an assessment
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      // Return all requirements (for reference)
      return NextResponse.json({ requirements: debrisRequirements });
    }

    // Verify assessment ownership
    const assessment = await prisma.debrisAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
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
    console.error("Error fetching debris requirements:", error);
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
    const body = await request.json();

    const { assessmentId, requirementId, status, notes, evidenceNotes } = body;

    if (!assessmentId || !requirementId) {
      return NextResponse.json(
        {
          error: "assessmentId and requirementId are required",
        },
        { status: 400 },
      );
    }

    // Verify assessment ownership
    const assessment = await prisma.debrisAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
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
      },
      create: {
        assessmentId,
        requirementId,
        status: status || "not_assessed",
        notes,
        evidenceNotes,
      },
    });

    // Recalculate compliance score
    const allStatuses = await prisma.debrisRequirementStatus.findMany({
      where: { assessmentId },
    });

    const compliantCount = allStatuses.filter(
      (s) => s.status === "compliant",
    ).length;
    const totalApplicable = allStatuses.filter(
      (s) => s.status !== "not_applicable",
    ).length;
    const complianceScore =
      totalApplicable > 0
        ? Math.round((compliantCount / totalApplicable) * 100)
        : 0;

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
    console.error("Error updating debris requirement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
