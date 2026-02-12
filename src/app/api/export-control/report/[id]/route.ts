/**
 * ITAR/EAR Export Control Assessment Report API
 *
 * LEGAL DISCLAIMER: This report is for compliance tracking purposes only.
 * It does NOT constitute legal advice. Violations of ITAR/EAR can result
 * in criminal penalties up to 20 years imprisonment and $1M per violation.
 * Always consult qualified export control counsel before making export decisions.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  type ExportControlProfile,
  type ExportControlApplicability,
  type ComplianceStatus,
  exportControlEUComparisons,
  usmlCategories,
  cclCategories,
  formatPenalty,
} from "@/data/itar-ear-requirements";
import {
  performAssessment,
  assessDeemedExportRisks,
  assessScreeningRequirements,
  assessTCPRequirements,
  generateDocumentationChecklist,
  assessPenaltyExposure,
  analyzeLicenseExceptions,
  type RequirementAssessment,
} from "@/lib/export-control-engine.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/export-control/report/[id] - Generate comprehensive compliance report
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const assessment = await prisma.exportControlAssessment.findFirst({
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
    const companyTypes = JSON.parse(
      assessment.companyTypes,
    ) as ExportControlApplicability[];
    const foreignNationalCountries = assessment.foreignNationalCountries
      ? JSON.parse(assessment.foreignNationalCountries)
      : [];
    const exportsToCountries = assessment.exportsToCountries
      ? JSON.parse(assessment.exportsToCountries)
      : [];
    const licenseExceptionsUsed = assessment.licenseExceptionsUsed
      ? JSON.parse(assessment.licenseExceptionsUsed)
      : [];

    // Build profile
    const profile: ExportControlProfile = {
      companyType: companyTypes,
      hasITARItems: assessment.hasITARItems,
      hasEARItems: assessment.hasEARItems,
      hasForeignNationals: assessment.hasForeignNationals,
      foreignNationalCountries,
      exportsToCountries,
      hasTechnologyTransfer: assessment.hasTechnologyTransfer,
      hasDefenseContracts: assessment.hasDefenseContracts,
      hasManufacturingAbroad: assessment.hasManufacturingAbroad,
      hasJointVentures: assessment.hasJointVentures,
      annualExportValue: assessment.annualExportValue ?? undefined,
      registeredWithDDTC: assessment.registeredWithDDTC,
      hasTCP: assessment.hasTCP,
      hasECL: assessment.hasECL,
    };

    // Map requirement statuses
    const requirementAssessments: RequirementAssessment[] =
      assessment.requirementStatuses.map((rs) => ({
        requirementId: rs.requirementId,
        status: rs.status as ComplianceStatus,
        notes: rs.notes ?? undefined,
        evidenceNotes: rs.evidenceNotes ?? undefined,
        assessedAt: rs.updatedAt,
        targetDate: rs.targetDate ?? undefined,
        responsibleParty: rs.responsibleParty ?? undefined,
      }));

    // Perform full assessment
    const assessmentResult = performAssessment(profile, requirementAssessments);

    // Assess deemed export risks
    const deemedExportAssessment = assessDeemedExportRisks(profile);

    // Assess screening requirements
    const screeningAssessment = assessScreeningRequirements(profile);

    // Assess TCP requirements
    const tcpAssessment = assessTCPRequirements(profile);

    // Generate documentation checklist
    const documentationChecklists = generateDocumentationChecklist(profile);

    // Assess penalty exposure
    const penaltyAssessment = assessPenaltyExposure(
      profile,
      assessment.hasECL,
      assessment.hasVoluntaryDisclosures,
    );

    // Analyze license exceptions
    const licenseExceptionAnalysis = analyzeLicenseExceptions(profile);

    // Get relevant USML/CCL category details
    const relevantUSMLCategories = assessment.hasITARItems
      ? usmlCategories.filter((c) =>
          ["USML_IV", "USML_XV", "USML_XI", "USML_XII"].includes(c.category),
        )
      : [];

    const relevantCCLCategories = assessment.hasEARItems
      ? cclCategories.filter((c) =>
          ["CCL_9A", "CCL_9D", "CCL_9E", "CCL_3A", "CCL_5A", "EAR99"].includes(
            c.category,
          ),
        )
      : [];

    // Build comprehensive report
    const report = {
      metadata: {
        reportId: `EXP-${assessment.id.slice(-8).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        assessmentId: assessment.id,
        assessmentName: assessment.assessmentName,
        status: assessment.status,
      },
      disclaimer: {
        text:
          "IMPORTANT LEGAL DISCLAIMER: This report is for COMPLIANCE TRACKING AND EDUCATIONAL PURPOSES ONLY. " +
          "It does NOT constitute legal advice and should NOT be relied upon for export control compliance decisions. " +
          "Violations of ITAR and EAR can result in CRIMINAL PENALTIES including IMPRISONMENT UP TO 20 YEARS " +
          "and FINES UP TO $1,000,000 PER VIOLATION. ALWAYS consult with qualified export control counsel " +
          "and/or the appropriate government agencies (DDTC, BIS) before making any export control decisions.",
        acknowledgementRequired: true,
      },
      companyProfile: {
        companyTypes: companyTypes.map((ct) => ({
          type: ct,
          label: ct.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        })),
        hasITARItems: assessment.hasITARItems,
        hasEARItems: assessment.hasEARItems,
        hasForeignNationals: assessment.hasForeignNationals,
        foreignNationalCountries,
        exportsToCountries,
        hasTechnologyTransfer: assessment.hasTechnologyTransfer,
        hasDefenseContracts: assessment.hasDefenseContracts,
        hasManufacturingAbroad: assessment.hasManufacturingAbroad,
        hasJointVentures: assessment.hasJointVentures,
        annualExportValue: assessment.annualExportValue,
      },
      jurisdictionDetermination: {
        determination: assessment.jurisdictionDetermination,
        determinationDate: assessment.jurisdictionDeterminationDate,
        hasPendingCJRequest: assessment.hasCJRequest,
        cjRequestDate: assessment.cjRequestDate,
        cjDeterminationDate: assessment.cjDeterminationDate,
        cjDetermination: assessment.cjDetermination,
      },
      registrationStatus: {
        ddtc: {
          registered: assessment.registeredWithDDTC,
          registrationNo: assessment.ddtcRegistrationNo,
          expiry: assessment.ddtcRegistrationExpiry,
          empoweredOfficial: {
            name: assessment.empoweredOfficialName,
            email: assessment.empoweredOfficialEmail,
            title: assessment.empoweredOfficialTitle,
          },
        },
        required: assessmentResult.requiredRegistrations,
      },
      complianceOverview: {
        overallScore: assessmentResult.score.overall,
        mandatoryScore: assessmentResult.score.mandatory,
        criticalScore: assessmentResult.score.critical,
        riskLevel: assessmentResult.riskLevel,
        byRegulation: assessmentResult.score.byRegulation,
        byCategory: assessmentResult.score.byCategory,
      },
      regulationAnalysis: assessmentResult.regulationStatuses.map((status) => ({
        regulation: status.regulation,
        score: status.score,
        riskLevel: status.riskLevel,
        requirementsCount: status.requirements.length,
        compliantCount: status.compliantCount,
        partialCount: status.partialCount,
        nonCompliantCount: status.nonCompliantCount,
        gapsCount: status.gaps.length,
        requiredLicenses: status.requiredLicenses,
        topGaps: status.gaps.slice(0, 5).map((g) => ({
          requirement: g.requirement,
          gap: g.gap,
          riskLevel: g.riskLevel,
          recommendation: g.recommendation,
          potentialPenalty: g.potentialPenalty,
        })),
      })),
      licensingStatus: {
        itar: {
          activeLicenses: assessment.activeITARLicenses,
          pendingApplications: assessment.pendingITARLicenses,
          activeTAAs: assessment.activeTAAs,
          activeMLAs: assessment.activeMLAs,
        },
        ear: {
          activeLicenses: assessment.activeEARLicenses,
          pendingApplications: assessment.pendingEARLicenses,
          usesExceptions: assessment.usesLicenseExceptions,
          exceptionsUsed: licenseExceptionsUsed,
        },
        requiredLicenses: assessmentResult.requiredLicenses,
        availableExceptions: licenseExceptionAnalysis,
      },
      deemedExportAnalysis: {
        hasForeignNationals: deemedExportAssessment.hasForeignNationals,
        foreignNationalCountries:
          deemedExportAssessment.foreignNationalCountries,
        tcpRequired: deemedExportAssessment.tcpRequired,
        tcpStatus: {
          hasTCP: assessment.hasTCP,
          lastReviewDate: assessment.tcpLastReviewDate,
          implementationPriority: tcpAssessment.implementationPriority,
          requiredElements: tcpAssessment.requiredElements,
        },
        itarRisks: deemedExportAssessment.itarRisks,
        earRisks: deemedExportAssessment.earRisks,
        licensesRequired: deemedExportAssessment.deemedExportLicensesRequired,
        recommendations: deemedExportAssessment.recommendations,
      },
      screeningRequirements: {
        requiredLists: screeningAssessment.requiredLists,
        screeningFrequency: screeningAssessment.screeningFrequency,
        automatedScreeningRequired:
          screeningAssessment.automatedScreeningRequired,
        hasAutomatedScreening: assessment.hasAutomatedScreening,
        screeningVendor: assessment.screeningVendor,
        redFlagProceduresRequired:
          screeningAssessment.redFlagProceduresRequired,
      },
      gapAnalysis: {
        totalGaps: assessmentResult.gapAnalysis.length,
        byRiskLevel: {
          critical: assessmentResult.gapAnalysis.filter(
            (g) => g.riskLevel === "critical",
          ).length,
          high: assessmentResult.gapAnalysis.filter(
            (g) => g.riskLevel === "high",
          ).length,
          medium: assessmentResult.gapAnalysis.filter(
            (g) => g.riskLevel === "medium",
          ).length,
          low: assessmentResult.gapAnalysis.filter((g) => g.riskLevel === "low")
            .length,
        },
        byRegulation: {
          ITAR: assessmentResult.gapAnalysis.filter(
            (g) => g.regulation === "ITAR",
          ).length,
          EAR: assessmentResult.gapAnalysis.filter(
            (g) => g.regulation === "EAR",
          ).length,
        },
        prioritizedGaps: assessmentResult.gapAnalysis.slice(0, 15).map((g) => ({
          requirementId: g.requirementId,
          requirement: g.requirement,
          gap: g.gap,
          riskLevel: g.riskLevel,
          regulation: g.regulation,
          recommendation: g.recommendation,
          estimatedEffort: g.estimatedEffort,
          potentialPenalty: g.potentialPenalty,
        })),
      },
      trainingAndAudit: {
        training: {
          lastDate: assessment.lastTrainingDate,
          nextDue: assessment.nextTrainingDue,
          completionRate: assessment.trainingCompletionRate,
        },
        audit: {
          lastDate: assessment.lastAuditDate,
          nextDue: assessment.nextAuditDue,
          lastFindings: assessment.lastAuditFindings,
        },
        voluntaryDisclosure: {
          hasDisclosures: assessment.hasVoluntaryDisclosures,
          count: assessment.voluntaryDisclosureCount,
          lastDate: assessment.lastVoluntaryDisclosureDate,
        },
      },
      penaltyExposure: {
        maxCivilPerViolation: formatPenalty(
          penaltyAssessment.maxCivilPerViolation,
        ),
        maxCriminalPerViolation: formatPenalty(
          penaltyAssessment.maxCriminalPerViolation,
        ),
        maxImprisonmentYears: penaltyAssessment.maxImprisonmentYears,
        additionalConsequences: penaltyAssessment.additionalConsequences,
        mitigatingFactors: penaltyAssessment.mitigatingFactors,
        aggravatingFactors: penaltyAssessment.aggravatingFactors,
      },
      documentationChecklists,
      regulatoryReference: {
        usmlCategories: relevantUSMLCategories,
        cclCategories: relevantCCLCategories,
        euComparisons: exportControlEUComparisons,
      },
      recommendations: assessmentResult.recommendations,
      nextSteps: [
        assessment.hasITARItems && !assessment.registeredWithDDTC
          ? "CRITICAL: Register with DDTC immediately - operating without registration is a serious violation"
          : null,
        assessment.hasForeignNationals &&
        !assessment.hasTCP &&
        assessment.hasITARItems
          ? "CRITICAL: Implement Technology Control Plan - foreign national access without TCP may constitute deemed exports"
          : null,
        !assessment.hasAutomatedScreening
          ? "Implement automated restricted party screening for all transactions"
          : null,
        assessment.hasITARItems && !assessment.empoweredOfficialName
          ? "Designate an Empowered Official for ITAR compliance"
          : null,
        "Conduct annual export control training for all personnel",
        "Perform internal compliance audit within 12 months",
      ].filter(Boolean),
    };

    // Update report generated timestamp
    await prisma.exportControlAssessment.update({
      where: { id },
      data: {
        reportGenerated: true,
        reportGeneratedAt: new Date(),
        documentationChecklistJson: JSON.stringify(documentationChecklists),
        overallComplianceScore: assessmentResult.score.overall,
        mandatoryScore: assessmentResult.score.mandatory,
        criticalScore: assessmentResult.score.critical,
        itarComplianceScore: assessmentResult.score.byRegulation.ITAR,
        earComplianceScore: assessmentResult.score.byRegulation.EAR,
        riskLevel: assessmentResult.riskLevel,
        criticalGaps: assessmentResult.gapAnalysis.filter(
          (g) => g.riskLevel === "critical",
        ).length,
        highGaps: assessmentResult.gapAnalysis.filter(
          (g) => g.riskLevel === "high",
        ).length,
        maxCivilPenalty: penaltyAssessment.maxCivilPerViolation,
        maxCriminalPenalty: penaltyAssessment.maxCriminalPerViolation,
        maxImprisonment: penaltyAssessment.maxImprisonmentYears,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "EXPORT_CONTROL_REPORT_GENERATED",
      entityType: "ExportControlAssessment",
      entityId: id,
      metadata: {
        reportId: report.metadata.reportId,
        overallScore: report.complianceOverview.overallScore,
        riskLevel: report.complianceOverview.riskLevel,
        totalGaps: report.gapAnalysis.totalGaps,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating Export Control report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
