import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  calculateComplianceScore,
  determineRiskLevel,
  generateGapAnalysis,
  generateComplianceSummary,
  generateAgencyStatus,
  findEuSpaceActCrossReferences,
  findCopuosCrossReferences,
  determineRequiredLicenses,
  determineRequiredAgencies,
  checkDeorbitCompliance,
} from "@/lib/us-regulatory-engine.server";
import {
  getApplicableRequirements,
  type UsOperatorProfile,
  type UsOperatorType,
  type UsActivityType,
  type UsAgency,
  type UsComplianceStatus,
} from "@/data/us-space-regulations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/us-regulatory/[id] - Get a specific US Regulatory assessment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const assessment = await prisma.usRegulatoryAssessment.findFirst({
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
    const operatorTypes = JSON.parse(
      assessment.operatorTypes,
    ) as UsOperatorType[];
    const activityTypes = JSON.parse(
      assessment.activityTypes,
    ) as UsActivityType[];
    const agencies = JSON.parse(assessment.agencies) as UsAgency[];

    // Build operator profile
    const profile: UsOperatorProfile = {
      operatorTypes,
      activityTypes,
      agencies,
      isUsEntity: assessment.isUsEntity,
      usNexus: assessment.usNexus as UsOperatorProfile["usNexus"],
      orbitRegime: assessment.orbitRegime as UsOperatorProfile["orbitRegime"],
      altitudeKm: assessment.altitudeKm ?? undefined,
      frequencyBands: assessment.frequencyBands
        ? JSON.parse(assessment.frequencyBands)
        : undefined,
      satelliteCount: assessment.satelliteCount ?? undefined,
      hasManeuverability: assessment.hasManeuverability,
      hasPropulsion: assessment.hasPropulsion,
      missionDurationYears: assessment.missionDurationYears ?? undefined,
      isConstellation: assessment.isConstellation,
      isSmallSatellite: assessment.isSmallSatellite,
      isNGSO: assessment.isNGSO,
      providesRemoteSensing: assessment.providesRemoteSensing,
      remotesensingResolutionM:
        assessment.remoteSensingResolutionM ?? undefined,
    };

    // Get applicable requirements
    const applicableRequirements = getApplicableRequirements(profile);

    // Determine required licenses
    const requiredLicenses = determineRequiredLicenses(profile);
    const requiredAgencies = determineRequiredAgencies(profile);

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
        status: rs.status as UsComplianceStatus,
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

    // Generate agency-specific statuses
    const agencyStatuses = requiredAgencies.map((agency) =>
      generateAgencyStatus(
        agency,
        applicableRequirements,
        assessments,
        requiredLicenses,
      ),
    );

    // Get cross-references
    const euSpaceActOverlaps = findEuSpaceActCrossReferences(
      applicableRequirements,
    );
    const copuosOverlaps = findCopuosCrossReferences(applicableRequirements);

    // Check deorbit compliance
    const deorbitCompliance = checkDeorbitCompliance(
      profile,
      assessment.plannedDisposalYears ?? undefined,
    );

    return NextResponse.json({
      assessment,
      profile,
      applicableRequirements,
      requiredLicenses,
      requiredAgencies,
      score,
      riskLevel,
      gapAnalysis,
      summary,
      agencyStatuses,
      euSpaceActOverlaps,
      copuosOverlaps,
      deorbitCompliance,
    });
  } catch (error) {
    console.error("Error fetching US Regulatory assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/us-regulatory/[id] - Update a US Regulatory assessment
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
    const existingAssessment = await prisma.usRegulatoryAssessment.findFirst({
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
      // FCC fields
      fccSpaceStationLicense,
      fccSpaceStationLicenseNo,
      fccSpectrumLicense,
      fccSpectrumLicenseNo,
      fccDebrisPlanStatus,
      // FAA fields
      faaLaunchLicense,
      faaLaunchLicenseNo,
      faaReentryLicense,
      faaSiteOperatorLicense,
      faaFinancialResponsibility,
      // NOAA fields
      noaaRemoteSensingLicense,
      noaaLicenseNo,
      noaaTierClassification,
      // Insurance
      insuranceProvider,
      insuranceCoverageUsd,
      insuranceConfirmed,
      mplDetermination,
      // Deorbit
      plannedDisposalYears,
      deorbitStrategy,
      deorbitCapabilityConfirmed,
    } = body;

    // Update assessment
    const updates: Record<string, unknown> = {};
    if (assessmentName !== undefined) updates.assessmentName = assessmentName;
    if (status !== undefined) updates.status = status;
    // FCC
    if (fccSpaceStationLicense !== undefined)
      updates.fccSpaceStationLicense = fccSpaceStationLicense;
    if (fccSpaceStationLicenseNo !== undefined)
      updates.fccSpaceStationLicenseNo = fccSpaceStationLicenseNo;
    if (fccSpectrumLicense !== undefined)
      updates.fccSpectrumLicense = fccSpectrumLicense;
    if (fccSpectrumLicenseNo !== undefined)
      updates.fccSpectrumLicenseNo = fccSpectrumLicenseNo;
    if (fccDebrisPlanStatus !== undefined)
      updates.fccDebrisPlanStatus = fccDebrisPlanStatus;
    // FAA
    if (faaLaunchLicense !== undefined)
      updates.faaLaunchLicense = faaLaunchLicense;
    if (faaLaunchLicenseNo !== undefined)
      updates.faaLaunchLicenseNo = faaLaunchLicenseNo;
    if (faaReentryLicense !== undefined)
      updates.faaReentryLicense = faaReentryLicense;
    if (faaSiteOperatorLicense !== undefined)
      updates.faaSiteOperatorLicense = faaSiteOperatorLicense;
    if (faaFinancialResponsibility !== undefined)
      updates.faaFinancialResponsibility = faaFinancialResponsibility;
    // NOAA
    if (noaaRemoteSensingLicense !== undefined)
      updates.noaaRemoteSensingLicense = noaaRemoteSensingLicense;
    if (noaaLicenseNo !== undefined) updates.noaaLicenseNo = noaaLicenseNo;
    if (noaaTierClassification !== undefined)
      updates.noaaTierClassification = noaaTierClassification;
    // Insurance
    if (insuranceProvider !== undefined)
      updates.insuranceProvider = insuranceProvider;
    if (insuranceCoverageUsd !== undefined)
      updates.insuranceCoverageUsd = insuranceCoverageUsd;
    if (insuranceConfirmed !== undefined)
      updates.insuranceConfirmed = insuranceConfirmed;
    if (mplDetermination !== undefined)
      updates.mplDetermination = mplDetermination;
    // Deorbit
    if (plannedDisposalYears !== undefined)
      updates.plannedDisposalYears = plannedDisposalYears;
    if (deorbitStrategy !== undefined)
      updates.deorbitStrategy = deorbitStrategy;
    if (deorbitCapabilityConfirmed !== undefined)
      updates.deorbitCapabilityConfirmed = deorbitCapabilityConfirmed;

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
            prisma.usRequirementStatus.upsert({
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
    const operatorTypes = JSON.parse(
      existingAssessment.operatorTypes,
    ) as UsOperatorType[];
    const activityTypes = JSON.parse(
      existingAssessment.activityTypes,
    ) as UsActivityType[];
    const agencies = JSON.parse(existingAssessment.agencies) as UsAgency[];

    // Build profile for recalculating score
    const profile: UsOperatorProfile = {
      operatorTypes,
      activityTypes,
      agencies,
      isUsEntity: existingAssessment.isUsEntity,
      usNexus: existingAssessment.usNexus as UsOperatorProfile["usNexus"],
      orbitRegime:
        existingAssessment.orbitRegime as UsOperatorProfile["orbitRegime"],
      altitudeKm: existingAssessment.altitudeKm ?? undefined,
      satelliteCount: existingAssessment.satelliteCount ?? undefined,
      hasManeuverability: existingAssessment.hasManeuverability,
      hasPropulsion: existingAssessment.hasPropulsion,
      missionDurationYears:
        existingAssessment.missionDurationYears ?? undefined,
      isConstellation: existingAssessment.isConstellation,
      isSmallSatellite: existingAssessment.isSmallSatellite,
      isNGSO: existingAssessment.isNGSO,
      providesRemoteSensing: existingAssessment.providesRemoteSensing,
    };

    const applicableRequirements = getApplicableRequirements(profile);
    const requiredLicenses = determineRequiredLicenses(profile);
    const requiredAgencies = determineRequiredAgencies(profile);

    // Fetch updated requirement statuses
    const updatedStatuses = await prisma.usRequirementStatus.findMany({
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
        status: rs.status as UsComplianceStatus,
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

    // Generate agency statuses
    const agencyStatuses = requiredAgencies.map((agency) =>
      generateAgencyStatus(
        agency,
        applicableRequirements,
        assessmentResults,
        requiredLicenses,
      ),
    );

    // Update assessment with calculated values
    updates.overallComplianceScore = score.overall;
    updates.mandatoryScore = score.mandatory;
    updates.riskLevel = riskLevel;
    updates.criticalGaps = criticalGaps;
    updates.majorGaps = majorGaps;
    updates.fccComplianceScore = score.byAgency.FCC;
    updates.faaComplianceScore = score.byAgency.FAA;
    updates.noaaComplianceScore = score.byAgency.NOAA;
    updates.euSpaceActOverlapCount = findEuSpaceActCrossReferences(
      applicableRequirements,
    ).length;
    updates.copuosOverlapCount = findCopuosCrossReferences(
      applicableRequirements,
    ).length;

    const updatedAssessment = await prisma.usRegulatoryAssessment.update({
      where: { id },
      data: updates,
      include: { requirementStatuses: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "US_REGULATORY_ASSESSMENT_UPDATED",
      entityType: "UsRegulatoryAssessment",
      entityId: id,
      metadata: {
        complianceScore: score.overall,
        riskLevel,
        criticalGaps,
        fccScore: score.byAgency.FCC,
        faaScore: score.byAgency.FAA,
        noaaScore: score.byAgency.NOAA,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: updatedAssessment,
      score,
      riskLevel,
      gapAnalysis,
      agencyStatuses,
    });
  } catch (error) {
    console.error("Error updating US Regulatory assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/us-regulatory/[id] - Delete a US Regulatory assessment
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Verify ownership
    const assessment = await prisma.usRegulatoryAssessment.findFirst({
      where: { id, userId },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Delete assessment (cascade will delete requirement statuses)
    await prisma.usRegulatoryAssessment.delete({
      where: { id },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "US_REGULATORY_ASSESSMENT_DELETED",
      entityType: "UsRegulatoryAssessment",
      entityId: id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting US Regulatory assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
