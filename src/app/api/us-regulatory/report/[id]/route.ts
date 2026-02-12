import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  performAssessment,
  getLicenseRequirementSummaries,
  generateAgencyDocumentationChecklist,
  calculateDeorbitRequirements,
  generateRecommendations,
} from "@/lib/us-regulatory-engine.server";
import {
  getApplicableRequirements,
  type UsOperatorProfile,
  type UsOperatorType,
  type UsActivityType,
  type UsAgency,
  type UsComplianceStatus,
  usEuComparisons,
} from "@/data/us-space-regulations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/us-regulatory/report/[id] - Generate comprehensive compliance report
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

    // Perform full assessment
    const assessmentResult = performAssessment(profile, assessments);

    // Get license-specific summaries
    const licenseSummaries = getLicenseRequirementSummaries(
      profile,
      assessments,
    );

    // Get agency documentation checklists
    const documentationChecklists = generateAgencyDocumentationChecklist(
      profile,
      assessments,
    );

    // Calculate deorbit compliance
    const deorbitCalculation = calculateDeorbitRequirements(
      profile,
      assessment.launchDate ?? undefined,
      undefined,
      undefined,
    );

    // Get relevant US-EU comparisons
    const relevantComparisons = usEuComparisons.filter((comp) => {
      return (
        (agencies.includes("FCC") && comp.usRequirement.includes("FCC")) ||
        (agencies.includes("FAA") && comp.usRequirement.includes("FAA")) ||
        (agencies.includes("NOAA") && comp.usRequirement.includes("NOAA")) ||
        comp.usRequirement.includes("ITAR") ||
        comp.usRequirement.includes("Registry")
      );
    });

    // Build comprehensive report
    const report = {
      metadata: {
        reportId: `USR-${assessment.id.slice(-8).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        assessmentId: assessment.id,
        assessmentName: assessment.assessmentName,
        status: assessment.status,
      },
      operatorProfile: {
        operatorTypes: operatorTypes.map((ot) => ({
          type: ot,
          label: ot.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        })),
        activityTypes: activityTypes.map((at) => ({
          type: at,
          label: at.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        })),
        agencies,
        usNexus: assessment.usNexus,
        isUsEntity: assessment.isUsEntity,
        orbitRegime: assessment.orbitRegime,
        altitudeKm: assessment.altitudeKm,
        isConstellation: assessment.isConstellation,
        satelliteCount: assessment.satelliteCount,
        isNGSO: assessment.isNGSO,
        providesRemoteSensing: assessment.providesRemoteSensing,
      },
      complianceOverview: {
        overallScore: assessmentResult.score.overall,
        mandatoryScore: assessmentResult.score.mandatory,
        riskLevel: assessmentResult.riskLevel,
        byAgency: assessmentResult.score.byAgency,
        byCategory: assessmentResult.score.byCategory,
      },
      agencyAnalysis: assessmentResult.agencyStatuses.map((status) => ({
        agency: status.agency,
        fullName: status.fullName,
        score: status.score,
        riskLevel: status.riskLevel,
        requirementsCount: status.requirements.length,
        compliantCount: status.compliantCount,
        partialCount: status.partialCount,
        nonCompliantCount: status.nonCompliantCount,
        gapsCount: status.gaps.length,
        requiredLicenses: status.requiredLicenses,
        topGaps: status.gaps.slice(0, 5).map((g) => ({
          requirement: g.cfrReference,
          gap: g.gap,
          priority: g.priority,
          recommendation: g.recommendation,
        })),
      })),
      licenseAnalysis: licenseSummaries.map((ls) => ({
        licenseType: ls.licenseType,
        agency: ls.agency,
        cfrPart: ls.cfrPart,
        score: ls.complianceScore,
        requirementsCount: ls.requirements.length,
        gapsCount: ls.gaps.length,
        criticalGaps: ls.gaps.filter((g) => g.priority === "high").length,
      })),
      licenseStatus: {
        fcc: {
          spaceStation: {
            status: assessment.fccSpaceStationLicense,
            licenseNo: assessment.fccSpaceStationLicenseNo,
          },
          spectrum: {
            status: assessment.fccSpectrumLicense,
            licenseNo: assessment.fccSpectrumLicenseNo,
          },
          debrisPlan: assessment.fccDebrisPlanStatus,
        },
        faa: {
          launch: {
            status: assessment.faaLaunchLicense,
            licenseNo: assessment.faaLaunchLicenseNo,
          },
          reentry: assessment.faaReentryLicense,
          siteOperator: assessment.faaSiteOperatorLicense,
          financialResponsibility: assessment.faaFinancialResponsibility,
          mplDetermination: assessment.mplDetermination,
        },
        noaa: {
          remoteSensing: {
            status: assessment.noaaRemoteSensingLicense,
            licenseNo: assessment.noaaLicenseNo,
          },
          tierClassification: assessment.noaaTierClassification,
        },
      },
      deorbitCompliance: deorbitCalculation,
      gapAnalysis: {
        totalGaps: assessmentResult.gapAnalysis.length,
        byPriority: {
          high: assessmentResult.gapAnalysis.filter(
            (g) => g.priority === "high",
          ).length,
          medium: assessmentResult.gapAnalysis.filter(
            (g) => g.priority === "medium",
          ).length,
          low: assessmentResult.gapAnalysis.filter((g) => g.priority === "low")
            .length,
        },
        byAgency: {
          FCC: assessmentResult.gapAnalysis.filter((g) => g.agency === "FCC")
            .length,
          FAA: assessmentResult.gapAnalysis.filter((g) => g.agency === "FAA")
            .length,
          NOAA: assessmentResult.gapAnalysis.filter((g) => g.agency === "NOAA")
            .length,
        },
        prioritizedGaps: assessmentResult.gapAnalysis.slice(0, 15).map((g) => ({
          agency: g.agency,
          cfrReference: g.cfrReference,
          gap: g.gap,
          priority: g.priority,
          recommendation: g.recommendation,
          estimatedEffort: g.estimatedEffort,
          dependencies: g.dependencies,
          potentialPenalty: g.potentialPenalty,
        })),
      },
      documentationChecklists,
      crossReferences: {
        euSpaceAct: assessmentResult.euSpaceActOverlaps,
        copuos: assessmentResult.copuosOverlaps,
        usEuComparisons: relevantComparisons,
      },
      recommendations: assessmentResult.recommendations,
      insurance: {
        provider: assessment.insuranceProvider,
        coverageUsd: assessment.insuranceCoverageUsd,
        confirmed: assessment.insuranceConfirmed,
      },
    };

    // Update report generated timestamp
    await prisma.usRegulatoryAssessment.update({
      where: { id },
      data: {
        reportGenerated: true,
        reportGeneratedAt: new Date(),
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "US_REGULATORY_REPORT_GENERATED",
      entityType: "UsRegulatoryAssessment",
      entityId: id,
      metadata: {
        reportId: report.metadata.reportId,
        overallScore: report.complianceOverview.overallScore,
        riskLevel: report.complianceOverview.riskLevel,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating US Regulatory report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
