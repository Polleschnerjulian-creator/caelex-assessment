import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  performAssessment,
  calculateComplianceScore,
  determineRiskLevel,
  generateGapAnalysis,
  generateComplianceSummary,
  findEuSpaceActCrossReferences,
} from "@/lib/copuos-engine.server";
import {
  getApplicableGuidelines,
  getSatelliteCategory,
  type CopuosMissionProfile,
  type OrbitRegime,
  type MissionType,
  type ComplianceStatus,
} from "@/data/copuos-iadc-requirements";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/copuos/[id] - Get a specific COPUOS assessment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const assessment = await prisma.copuosAssessment.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        guidelineStatuses: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Build mission profile
    const profile: CopuosMissionProfile = {
      orbitRegime: assessment.orbitRegime as OrbitRegime,
      altitudeKm: assessment.altitudeKm ?? undefined,
      inclinationDeg: assessment.inclinationDeg ?? undefined,
      missionType: assessment.missionType as MissionType,
      satelliteCategory: getSatelliteCategory(assessment.satelliteMassKg),
      satelliteMassKg: assessment.satelliteMassKg,
      hasManeuverability: assessment.hasManeuverability,
      hasPropulsion: assessment.hasPropulsion,
      plannedLifetimeYears: assessment.plannedLifetimeYears,
      isConstellation: assessment.isConstellation,
      constellationSize: assessment.constellationSize ?? undefined,
      launchDate: assessment.launchDate?.toISOString(),
      countryOfRegistry: assessment.countryOfRegistry ?? undefined,
    };

    // Get applicable guidelines
    const applicableGuidelines = getApplicableGuidelines(profile);

    // Map guideline statuses
    const assessments = assessment.guidelineStatuses.map((gs) => ({
      guidelineId: gs.guidelineId,
      status: gs.status as ComplianceStatus,
      notes: gs.notes ?? undefined,
      evidenceNotes: gs.evidenceNotes ?? undefined,
      assessedAt: gs.updatedAt,
    }));

    // Calculate current compliance score
    const score = calculateComplianceScore(applicableGuidelines, assessments);
    const riskLevel = determineRiskLevel(
      score,
      applicableGuidelines,
      assessments,
    );
    const gapAnalysis = generateGapAnalysis(applicableGuidelines, assessments);
    const summary = generateComplianceSummary(
      applicableGuidelines,
      assessments,
    );
    const euSpaceActOverlaps =
      findEuSpaceActCrossReferences(applicableGuidelines);

    return NextResponse.json({
      assessment,
      applicableGuidelines,
      score,
      riskLevel,
      gapAnalysis,
      summary,
      euSpaceActOverlaps,
    });
  } catch (error) {
    console.error("Error fetching COPUOS assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/copuos/[id] - Update a COPUOS assessment
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const body = await request.json();

    // Verify ownership
    const existingAssessment = await prisma.copuosAssessment.findFirst({
      where: { id, userId },
    });

    if (!existingAssessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    const {
      assessmentName,
      status,
      guidelineStatuses,
      deorbitStrategy,
      deorbitTimelineYears,
      passivationPlan,
      caServiceProvider,
      caServiceActive,
    } = body;

    // Update assessment
    const updates: Record<string, unknown> = {};
    if (assessmentName !== undefined) updates.assessmentName = assessmentName;
    if (status !== undefined) updates.status = status;
    if (deorbitStrategy !== undefined)
      updates.deorbitStrategy = deorbitStrategy;
    if (deorbitTimelineYears !== undefined)
      updates.deorbitTimelineYears = deorbitTimelineYears;
    if (passivationPlan !== undefined)
      updates.passivationPlan = passivationPlan;
    if (caServiceProvider !== undefined)
      updates.caServiceProvider = caServiceProvider;
    if (caServiceActive !== undefined)
      updates.caServiceActive = caServiceActive;

    // Update guideline statuses if provided
    if (guidelineStatuses && Array.isArray(guidelineStatuses)) {
      await Promise.all(
        guidelineStatuses.map(
          (gs: {
            guidelineId: string;
            status: string;
            notes?: string;
            evidenceNotes?: string;
            targetDate?: string;
          }) =>
            prisma.copuosGuidelineStatus.upsert({
              where: {
                assessmentId_guidelineId: {
                  assessmentId: id,
                  guidelineId: gs.guidelineId,
                },
              },
              update: {
                status: gs.status,
                notes: gs.notes,
                evidenceNotes: gs.evidenceNotes,
                targetDate: gs.targetDate ? new Date(gs.targetDate) : null,
              },
              create: {
                assessmentId: id,
                guidelineId: gs.guidelineId,
                status: gs.status,
                notes: gs.notes,
                evidenceNotes: gs.evidenceNotes,
                targetDate: gs.targetDate ? new Date(gs.targetDate) : null,
              },
            }),
        ),
      );
    }

    // Build profile for recalculating score
    const profile: CopuosMissionProfile = {
      orbitRegime: existingAssessment.orbitRegime as OrbitRegime,
      altitudeKm: existingAssessment.altitudeKm ?? undefined,
      inclinationDeg: existingAssessment.inclinationDeg ?? undefined,
      missionType: existingAssessment.missionType as MissionType,
      satelliteCategory: getSatelliteCategory(
        existingAssessment.satelliteMassKg,
      ),
      satelliteMassKg: existingAssessment.satelliteMassKg,
      hasManeuverability: existingAssessment.hasManeuverability,
      hasPropulsion: existingAssessment.hasPropulsion,
      plannedLifetimeYears: existingAssessment.plannedLifetimeYears,
      isConstellation: existingAssessment.isConstellation,
      constellationSize: existingAssessment.constellationSize ?? undefined,
    };

    const applicableGuidelines = getApplicableGuidelines(profile);

    // Fetch updated guideline statuses
    const updatedStatuses = await prisma.copuosGuidelineStatus.findMany({
      where: { assessmentId: id },
    });

    const assessmentResults = updatedStatuses.map((gs) => ({
      guidelineId: gs.guidelineId,
      status: gs.status as ComplianceStatus,
      notes: gs.notes ?? undefined,
      evidenceNotes: gs.evidenceNotes ?? undefined,
    }));

    // Recalculate scores
    const score = calculateComplianceScore(
      applicableGuidelines,
      assessmentResults,
    );
    const riskLevel = determineRiskLevel(
      score,
      applicableGuidelines,
      assessmentResults,
    );
    const gapAnalysis = generateGapAnalysis(
      applicableGuidelines,
      assessmentResults,
    );

    // Count critical and major gaps
    const criticalGaps = gapAnalysis.filter(
      (g) =>
        g.priority === "high" &&
        (g.status === "non_compliant" || g.status === "not_assessed"),
    ).length;
    const majorGaps = gapAnalysis.filter(
      (g) =>
        g.priority === "medium" &&
        (g.status === "non_compliant" || g.status === "not_assessed"),
    ).length;

    // Update assessment with calculated values
    updates.complianceScore = score.overall;
    updates.mandatoryScore = score.mandatory;
    updates.riskLevel = riskLevel;
    updates.criticalGaps = criticalGaps;
    updates.majorGaps = majorGaps;
    updates.euSpaceActOverlapCount =
      findEuSpaceActCrossReferences(applicableGuidelines).length;

    const updatedAssessment = await prisma.copuosAssessment.update({
      where: { id },
      data: updates,
      include: { guidelineStatuses: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "COPUOS_ASSESSMENT_UPDATED",
      entityType: "CopuosAssessment",
      entityId: id,
      metadata: {
        complianceScore: score.overall,
        riskLevel,
        criticalGaps,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: updatedAssessment,
      score,
      riskLevel,
      gapAnalysis,
    });
  } catch (error) {
    console.error("Error updating COPUOS assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/copuos/[id] - Delete a COPUOS assessment
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Verify ownership
    const assessment = await prisma.copuosAssessment.findFirst({
      where: { id, userId },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Delete assessment (cascade will delete guideline statuses)
    await prisma.copuosAssessment.delete({
      where: { id },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "COPUOS_ASSESSMENT_DELETED",
      entityType: "CopuosAssessment",
      entityId: id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting COPUOS assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
