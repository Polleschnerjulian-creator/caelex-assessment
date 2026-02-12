/**
 * Spectrum Assessment Report API
 *
 * Generates comprehensive reports for spectrum/ITU compliance assessments.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  type SpectrumProfile,
  type ServiceType,
  type FrequencyBand,
  type OrbitType,
  type ComplianceStatus,
  type SpectrumSource,
  type FilingPhase,
  type FilingStatus,
  type CoordinationStatus,
  getApplicableSpectrumRequirements,
  getApplicableLicenses,
  getImpactingWRCDecisions,
  calculateEstimatedFees,
  getServiceTypeName,
  getOrbitTypeName,
  frequencyBands as frequencyBandData,
} from "@/data/spectrum-itu-requirements";
import {
  performAssessment,
  generateGapAnalysis,
  analyzeFrequencyBands,
  generateFilingStatusSummary,
  generateCoordinationSummary,
  generateRecommendations,
  generateFilingTimelineReport,
  type RequirementAssessment,
  type FilingStatusSummary,
} from "@/lib/spectrum-engine.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/spectrum/report/[id] - Generate comprehensive report
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const assessment = await prisma.spectrumAssessment.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        requirementStatuses: true,
        user: {
          select: {
            name: true,
            email: true,
            organization: true,
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Parse stored JSON fields
    const serviceTypes = JSON.parse(assessment.serviceTypes) as ServiceType[];
    const frequencyBands = JSON.parse(
      assessment.frequencyBands,
    ) as FrequencyBand[];
    const additionalJurisdictions = assessment.additionalJurisdictions
      ? JSON.parse(assessment.additionalJurisdictions)
      : [];

    // Build profile
    const profile: SpectrumProfile = {
      serviceTypes,
      frequencyBands,
      orbitType: assessment.orbitType as OrbitType,
      numberOfSatellites: assessment.satelliteCount,
      isConstellation: assessment.isConstellation,
      primaryJurisdiction: (assessment.primaryJurisdiction ||
        "ITU") as SpectrumSource,
      additionalJurisdictions,
      hasExistingFilings: assessment.apiStatus !== "not_started",
      targetLaunchDate: assessment.biuDeadline ?? undefined,
      uplinkBands: frequencyBands,
      downlinkBands: frequencyBands,
      intersatelliteLinks: false,
    };

    // Get applicable requirements
    const applicableRequirements = getApplicableSpectrumRequirements(profile);

    // Map requirement statuses
    const assessments: RequirementAssessment[] =
      assessment.requirementStatuses.map((rs) => ({
        requirementId: rs.requirementId,
        status: rs.status as ComplianceStatus,
        notes: rs.notes ?? undefined,
        evidenceNotes: rs.evidenceNotes ?? undefined,
        assessedAt: rs.updatedAt,
        targetDate: rs.targetDate ?? undefined,
      }));

    // Parse filing statuses
    const filingStatuses: Record<FilingPhase, FilingStatus> = {
      API: assessment.apiStatus as FilingStatus,
      CR_C: assessment.crCStatus as FilingStatus,
      NOTIFICATION: assessment.notificationStatus as FilingStatus,
      RECORDING: assessment.recordingStatus as FilingStatus,
    };

    // Parse coordination status
    let coordinationStatuses:
      | {
          ituStatus?: string;
          bilateral?: { administration: string; status: string }[];
        }
      | undefined;
    if (assessment.coordinationStatus) {
      try {
        coordinationStatuses = JSON.parse(assessment.coordinationStatus);
      } catch {
        coordinationStatuses = undefined;
      }
    }

    // Generate all analysis components
    const fullAssessment = performAssessment(
      profile,
      assessments,
      filingStatuses,
      coordinationStatuses as {
        ituStatus?: CoordinationStatus;
        bilateral?: { administration: string; status: CoordinationStatus }[];
      },
    );

    const gapAnalysis = generateGapAnalysis(
      applicableRequirements,
      assessments,
    );
    const bandAnalysis = analyzeFrequencyBands(profile, applicableRequirements);
    const applicableLicenses = getApplicableLicenses(profile);
    const wrcDecisions = getImpactingWRCDecisions(profile);
    const estimatedFees = calculateEstimatedFees(applicableLicenses);

    // Generate filing timeline report if target date is set
    let filingTimelineReport: {
      timeline: unknown[];
      totalDurationMonths: number;
      criticalDates: { date: Date; event: string; phase: string }[];
    } | null = null;
    if (profile.targetLaunchDate) {
      try {
        filingTimelineReport = generateFilingTimelineReport(profile);
      } catch {
        // Timeline generation requires target date
      }
    }

    const filingStatusSummary = generateFilingStatusSummary(
      profile,
      filingStatuses,
    );

    const coordinationSummary = generateCoordinationSummary(
      profile,
      coordinationStatuses as {
        ituStatus?: CoordinationStatus;
        bilateral?: { administration: string; status: CoordinationStatus }[];
      },
    );

    const recommendations = generateRecommendations(
      profile,
      gapAnalysis,
      fullAssessment.score,
      filingStatusSummary as FilingStatusSummary[],
    );

    // Build frequency band details
    const frequencyBandDetails = frequencyBands.map((band) => {
      const bandInfo = frequencyBandData.find((b) => b.band === band);
      return {
        band,
        name: bandInfo?.name ?? band,
        rangeGHz: bandInfo?.rangeGHz,
        primaryServices: bandInfo?.primaryServices ?? [],
        coordinationRequired: bandInfo?.coordinationRequired ?? true,
      };
    });

    // Build service type details
    const serviceTypeDetails = serviceTypes.map((st) => ({
      type: st,
      name: getServiceTypeName(st),
    }));

    // Build comprehensive report
    const report = {
      metadata: {
        reportId: `SPECTRUM-${assessment.id.substring(0, 8).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        generatedBy: assessment.user.name || assessment.user.email,
        organization: assessment.user.organization,
        assessmentStatus: assessment.status,
      },
      networkProfile: {
        networkName: assessment.networkName,
        operatorName: assessment.operatorName,
        administrationCode: assessment.administrationCode,
        orbitType: assessment.orbitType,
        orbitTypeName: getOrbitTypeName(assessment.orbitType as OrbitType),
        altitudeKm: assessment.altitudeKm,
        inclinationDeg: assessment.inclinationDeg,
        satelliteCount: assessment.satelliteCount,
        isConstellation: assessment.isConstellation,
        primaryJurisdiction: assessment.primaryJurisdiction,
        additionalJurisdictions,
      },
      spectrum: {
        serviceTypes: serviceTypeDetails,
        frequencyBands: frequencyBandDetails,
        requiresEPFD: assessment.requiresEPFD,
        epfdCompliant: assessment.epfdCompliant,
        epfdStudyCompleted: assessment.epfdStudyCompleted,
        bandAnalysis,
      },
      complianceStatus: {
        overallScore: fullAssessment.score.overall,
        mandatoryScore: fullAssessment.score.mandatory,
        filingScore: fullAssessment.score.filing,
        coordinationScore: fullAssessment.score.coordination,
        riskLevel: assessment.riskLevel,
        bySource: fullAssessment.score.bySource,
        byCategory: fullAssessment.score.byCategory,
      },
      ituFilingStatus: {
        summary: filingStatusSummary,
        phases: {
          api: {
            status: assessment.apiStatus,
            filingDate: assessment.apiFilingDate,
            publicationDate: assessment.apiPublicationDate,
            expiryDate: assessment.apiExpiryDate,
            reference: assessment.apiReference,
          },
          crC: {
            status: assessment.crCStatus,
            filingDate: assessment.crCFilingDate,
            publicationDate: assessment.crCPublicationDate,
            reference: assessment.crCReference,
          },
          notification: {
            status: assessment.notificationStatus,
            filingDate: assessment.notificationFilingDate,
            examinationDate: assessment.notificationExaminationDate,
            reference: assessment.notificationReference,
          },
          recording: {
            status: assessment.recordingStatus,
            recordingDate: assessment.recordingDate,
            reference: assessment.recordingReference,
            mfrnReference: assessment.mfrnReference,
          },
        },
        bringingIntoUse: {
          deadline: assessment.biuDeadline,
          achieved: assessment.biuAchieved,
          date: assessment.biuDate,
        },
        timelineReport: filingTimelineReport,
      },
      ngsoMilestones:
        assessment.isConstellation ||
        assessment.orbitType === "NGSO" ||
        assessment.orbitType === "LEO" ||
        assessment.orbitType === "MEO"
          ? {
              milestone10: {
                deadline: assessment.milestone10Percent,
                achieved: assessment.milestone10Achieved,
                description:
                  "10% of constellation deployed within 2 years of BIU",
              },
              milestone50: {
                deadline: assessment.milestone50Percent,
                achieved: assessment.milestone50Achieved,
                description:
                  "50% of constellation deployed within 5 years of BIU",
              },
              milestone100: {
                deadline: assessment.milestone100Percent,
                achieved: assessment.milestone100Achieved,
                description:
                  "100% of constellation deployed within 7 years of BIU",
              },
            }
          : null,
      coordination: {
        summary: coordinationSummary,
        hasAgreements: assessment.hasCoordinationAgreements,
      },
      licensing: {
        applicableLicenses,
        jurisdictionLicenses: assessment.jurisdictionLicenses
          ? JSON.parse(assessment.jurisdictionLicenses)
          : null,
      },
      wrcCompliance: {
        applicableDecisions: wrcDecisions,
        isCompliant: assessment.wrcCompliant,
      },
      interferenceManagement: {
        analysisComplete: assessment.interferenceAnalysisComplete,
        analysisDate: assessment.interferenceAnalysisDate,
        identifiedRisks: assessment.identifiedInterferenceRisks
          ? JSON.parse(assessment.identifiedInterferenceRisks)
          : [],
        mitigationMeasures: assessment.mitigationMeasures
          ? JSON.parse(assessment.mitigationMeasures)
          : [],
      },
      gapAnalysis,
      recommendations,
      financials: {
        estimatedFees,
        totalEstimatedCost: estimatedFees.total,
      },
      requirements: {
        total: applicableRequirements.length,
        byStatus: {
          compliant: assessments.filter((a) => a.status === "compliant").length,
          partial: assessments.filter((a) => a.status === "partial").length,
          nonCompliant: assessments.filter((a) => a.status === "non_compliant")
            .length,
          notAssessed: assessments.filter((a) => a.status === "not_assessed")
            .length,
          notApplicable: assessments.filter(
            (a) => a.status === "not_applicable",
          ).length,
        },
        details: applicableRequirements.map((req) => {
          const status = assessments.find((a) => a.requirementId === req.id);
          return {
            id: req.id,
            title: req.title,
            source: req.source,
            category: req.category,
            riskLevel: req.riskLevel,
            isMandatory: req.isMandatory,
            status: status?.status ?? "not_assessed",
            notes: status?.notes,
            targetDate: status?.targetDate,
          };
        }),
      },
      disclaimer:
        "This report is generated for compliance tracking purposes. " +
        "ITU Radio Regulations and national spectrum requirements are complex and subject to change. " +
        "Consult with qualified spectrum management professionals and legal counsel for authoritative guidance. " +
        "Filing deadlines and requirements may vary based on specific circumstances.",
    };

    // Update assessment to mark report as generated
    await prisma.spectrumAssessment.update({
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
      action: "SPECTRUM_REPORT_GENERATED",
      entityType: "SpectrumAssessment",
      entityId: id,
      metadata: {
        reportId: report.metadata.reportId,
        overallScore: report.complianceStatus.overallScore,
        riskLevel: report.complianceStatus.riskLevel,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error generating Spectrum report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
