import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  calculateComplianceScore,
  determineRiskLevel,
  generateGapAnalysis,
  generateComplianceSummary,
  findEuSpaceActCrossReferences,
  determineRequiredLicenses,
} from "@/lib/uk-space-engine.server";
import {
  getApplicableRequirements,
  type UkSpaceProfile,
  type UkOperatorType,
  type UkActivityType,
  type UkComplianceStatus,
} from "@/data/uk-space-industry-act";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/uk-space/[id] - Get a specific UK Space assessment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const assessment = await prisma.ukSpaceAssessment.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        requirementStatuses: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Parse stored JSON fields
    const activityTypes = JSON.parse(
      assessment.activityTypes,
    ) as UkActivityType[];

    // Build operator profile
    const profile: UkSpaceProfile = {
      operatorType: assessment.operatorType as UkOperatorType,
      activityTypes,
      launchFromUk: assessment.launchFromUk,
      launchToOrbit: assessment.launchToOrbit,
      isSuborbital: assessment.isSuborbital,
      hasUkNexus: assessment.hasUkNexus,
      involvesPeople: assessment.involvesPeople,
      isCommercial: assessment.isCommercial,
      spacecraftMassKg: assessment.spacecraftMassKg ?? undefined,
      plannedLaunchSite: assessment.plannedLaunchSite ?? undefined,
      targetOrbit: assessment.targetOrbit ?? undefined,
      missionDurationYears: assessment.missionDurationYears ?? undefined,
    };

    // Get applicable requirements
    const applicableRequirements = getApplicableRequirements(profile);

    // Determine required licenses
    const requiredLicenses = determineRequiredLicenses(profile);

    // Map requirement statuses
    const assessments = assessment.requirementStatuses.map(
      (rs: {
        requirementId: string;
        status: string;
        notes: string | null;
        evidenceNotes: string | null;
        updatedAt: Date;
      }) => ({
        requirementId: rs.requirementId,
        status: rs.status as UkComplianceStatus,
        notes: rs.notes ?? undefined,
        evidenceNotes: rs.evidenceNotes ?? undefined,
        assessedAt: rs.updatedAt,
      }),
    );

    // Calculate current compliance score
    const score = calculateComplianceScore(applicableRequirements, assessments);
    const riskLevel = determineRiskLevel(
      score,
      applicableRequirements,
      assessments,
    );
    const gapAnalysis = generateGapAnalysis(
      applicableRequirements,
      assessments,
    );
    const summary = generateComplianceSummary(
      profile,
      applicableRequirements,
      assessments,
    );
    const euSpaceActOverlaps = findEuSpaceActCrossReferences(
      applicableRequirements,
    );

    return NextResponse.json({
      assessment,
      profile,
      applicableRequirements,
      requiredLicenses,
      score,
      riskLevel,
      gapAnalysis,
      summary,
      euSpaceActOverlaps,
    });
  } catch (error) {
    console.error("Error fetching UK Space assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/uk-space/[id] - Update a UK Space assessment
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
    const existingAssessment = await prisma.ukSpaceAssessment.findFirst({
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
      requirementStatuses,
      safetyCaseStatus,
      safetyCaseRef,
      insuranceProvider,
      insuranceCoverage,
      insuranceConfirmed,
      ukRegistryRef,
      registrationStatus,
    } = body;

    // Update assessment
    const updates: Record<string, unknown> = {};
    if (assessmentName !== undefined) updates.assessmentName = assessmentName;
    if (status !== undefined) updates.status = status;
    if (safetyCaseStatus !== undefined)
      updates.safetyCaseStatus = safetyCaseStatus;
    if (safetyCaseRef !== undefined) updates.safetyCaseRef = safetyCaseRef;
    if (insuranceProvider !== undefined)
      updates.insuranceProvider = insuranceProvider;
    if (insuranceCoverage !== undefined)
      updates.insuranceCoverage = insuranceCoverage;
    if (insuranceConfirmed !== undefined)
      updates.insuranceConfirmed = insuranceConfirmed;
    if (ukRegistryRef !== undefined) updates.ukRegistryRef = ukRegistryRef;
    if (registrationStatus !== undefined)
      updates.registrationStatus = registrationStatus;

    // Update requirement statuses if provided
    if (requirementStatuses && Array.isArray(requirementStatuses)) {
      await Promise.all(
        requirementStatuses.map(
          (rs: {
            requirementId: string;
            status: string;
            notes?: string;
            evidenceNotes?: string;
            targetDate?: string;
          }) =>
            prisma.ukRequirementStatus.upsert({
              where: {
                assessmentId_requirementId: {
                  assessmentId: id,
                  requirementId: rs.requirementId,
                },
              },
              update: {
                status: rs.status,
                notes: rs.notes,
                evidenceNotes: rs.evidenceNotes,
                targetDate: rs.targetDate ? new Date(rs.targetDate) : null,
              },
              create: {
                assessmentId: id,
                requirementId: rs.requirementId,
                status: rs.status,
                notes: rs.notes,
                evidenceNotes: rs.evidenceNotes,
                targetDate: rs.targetDate ? new Date(rs.targetDate) : null,
              },
            }),
        ),
      );
    }

    // Parse stored JSON fields
    const activityTypes = JSON.parse(
      existingAssessment.activityTypes,
    ) as UkActivityType[];

    // Build profile for recalculating score
    const profile: UkSpaceProfile = {
      operatorType: existingAssessment.operatorType as UkOperatorType,
      activityTypes,
      launchFromUk: existingAssessment.launchFromUk,
      launchToOrbit: existingAssessment.launchToOrbit,
      isSuborbital: existingAssessment.isSuborbital,
      hasUkNexus: existingAssessment.hasUkNexus,
      involvesPeople: existingAssessment.involvesPeople,
      isCommercial: existingAssessment.isCommercial,
      spacecraftMassKg: existingAssessment.spacecraftMassKg ?? undefined,
    };

    const applicableRequirements = getApplicableRequirements(profile);

    // Fetch updated requirement statuses
    const updatedStatuses = await prisma.ukRequirementStatus.findMany({
      where: { assessmentId: id },
    });

    const assessmentResults = updatedStatuses.map(
      (rs: {
        requirementId: string;
        status: string;
        notes: string | null;
        evidenceNotes: string | null;
      }) => ({
        requirementId: rs.requirementId,
        status: rs.status as UkComplianceStatus,
        notes: rs.notes ?? undefined,
        evidenceNotes: rs.evidenceNotes ?? undefined,
      }),
    );

    // Recalculate scores
    const score = calculateComplianceScore(
      applicableRequirements,
      assessmentResults,
    );
    const riskLevel = determineRiskLevel(
      score,
      applicableRequirements,
      assessmentResults,
    );
    const gapAnalysis = generateGapAnalysis(
      applicableRequirements,
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
    updates.euSpaceActOverlapCount = findEuSpaceActCrossReferences(
      applicableRequirements,
    ).length;

    const updatedAssessment = await prisma.ukSpaceAssessment.update({
      where: { id },
      data: updates,
      include: { requirementStatuses: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "UK_SPACE_ASSESSMENT_UPDATED",
      entityType: "UkSpaceAssessment",
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
    console.error("Error updating UK Space assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/uk-space/[id] - Delete a UK Space assessment
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Verify ownership
    const assessment = await prisma.ukSpaceAssessment.findFirst({
      where: { id, userId },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Delete assessment (cascade will delete requirement statuses)
    await prisma.ukSpaceAssessment.delete({
      where: { id },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "UK_SPACE_ASSESSMENT_DELETED",
      entityType: "UkSpaceAssessment",
      entityId: id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting UK Space assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
