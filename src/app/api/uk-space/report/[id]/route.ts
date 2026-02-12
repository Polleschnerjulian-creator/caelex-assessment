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
  generateRecommendations,
  determineRequiredLicenses,
  getLicenseRequirementSummaries,
  getUkEuComparisonSummary,
  generateCaaDocumentationChecklist,
} from "@/lib/uk-space-engine.server";
import {
  getApplicableRequirements,
  allUkSpaceRequirements,
  licenseTypeConfig,
  categoryConfig,
  ukEuComparisons,
  type UkSpaceProfile,
  type UkOperatorType,
  type UkActivityType,
  type UkComplianceStatus,
} from "@/data/uk-space-industry-act";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/uk-space/report/[id] - Generate compliance report for assessment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Fetch assessment
    const assessment = await prisma.ukSpaceAssessment.findFirst({
      where: { id, userId },
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

    // Map assessments
    const assessmentResults = assessment.requirementStatuses.map(
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

    // Calculate all compliance metrics
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
    const summary = generateComplianceSummary(
      profile,
      applicableRequirements,
      assessmentResults,
    );
    const euSpaceActOverlaps = findEuSpaceActCrossReferences(
      applicableRequirements,
    );
    const recommendations = generateRecommendations(
      profile,
      score,
      gapAnalysis,
      requiredLicenses,
    );
    const licenseAnalysis = getLicenseRequirementSummaries(
      profile,
      assessmentResults,
    );
    const ukEuComparison = getUkEuComparisonSummary(profile);
    const caaChecklist = generateCaaDocumentationChecklist(
      profile,
      assessmentResults,
    );

    // Generate detailed requirement results
    const requirementResults = applicableRequirements.map((requirement) => {
      const status = assessment.requirementStatuses.find(
        (rs: { requirementId: string }) => rs.requirementId === requirement.id,
      );
      return {
        id: requirement.id,
        sectionRef: requirement.sectionRef,
        title: requirement.title,
        description: requirement.description,
        category: requirement.category,
        bindingLevel: requirement.bindingLevel,
        severity: requirement.severity,
        status: status?.status ?? "not_assessed",
        notes: status?.notes,
        evidenceNotes: status?.evidenceNotes,
        complianceQuestion: requirement.complianceQuestion,
        evidenceRequired: requirement.evidenceRequired,
        implementationGuidance: requirement.implementationGuidance,
        caaGuidanceRef: requirement.caaGuidanceRef,
        euSpaceActCrossRef: requirement.euSpaceActCrossRef,
        licenseTypes: requirement.licenseTypes,
      };
    });

    // Group by status
    const byStatus = {
      compliant: requirementResults.filter((r) => r.status === "compliant"),
      partial: requirementResults.filter((r) => r.status === "partial"),
      nonCompliant: requirementResults.filter(
        (r) => r.status === "non_compliant",
      ),
      notAssessed: requirementResults.filter(
        (r) => r.status === "not_assessed",
      ),
      notApplicable: requirementResults.filter(
        (r) => r.status === "not_applicable",
      ),
    };

    // Group by category
    const byCategory: Record<string, typeof requirementResults> = {};
    for (const category of Object.keys(categoryConfig)) {
      byCategory[category] = requirementResults.filter(
        (r) => r.category === category,
      );
    }

    // Group by license type
    const byLicenseType: Record<string, typeof requirementResults> = {};
    for (const license of requiredLicenses) {
      byLicenseType[license] = requirementResults.filter((r) =>
        r.licenseTypes.includes(license),
      );
    }

    // Generate report data structure
    const reportData = {
      metadata: {
        reportId: `UK-SPACE-${id}`,
        generatedAt: new Date().toISOString(),
        assessmentId: id,
        assessmentName: assessment.assessmentName ?? "Untitled Assessment",
        version: "1.0",
      },
      organization: {
        name: assessment.user.organization ?? "Not specified",
        contactName: assessment.user.name,
        contactEmail: assessment.user.email,
      },
      operatorProfile: {
        operatorType: assessment.operatorType,
        activityTypes,
        launchFromUk: assessment.launchFromUk,
        launchToOrbit: assessment.launchToOrbit,
        isSuborbital: assessment.isSuborbital,
        hasUkNexus: assessment.hasUkNexus,
        involvesPeople: assessment.involvesPeople,
        isCommercial: assessment.isCommercial,
        spacecraftName: assessment.spacecraftName,
        spacecraftMassKg: assessment.spacecraftMassKg,
        plannedLaunchSite: assessment.plannedLaunchSite,
        targetOrbit: assessment.targetOrbit,
        missionDurationYears: assessment.missionDurationYears,
      },
      licenseInformation: {
        requiredLicenses: requiredLicenses.map((license) => ({
          type: license,
          label: licenseTypeConfig[license].label,
          regulator: licenseTypeConfig[license].regulator,
          section: licenseTypeConfig[license].section,
        })),
        licenseAnalysis: licenseAnalysis.map((la) => ({
          licenseType: la.licenseType,
          label: licenseTypeConfig[la.licenseType].label,
          complianceScore: la.complianceScore,
          gapCount: la.gaps.length,
          highPriorityGaps: la.gaps.filter((g) => g.priority === "high").length,
        })),
      },
      complianceOverview: {
        overallScore: score.overall,
        mandatoryScore: score.mandatory,
        recommendedScore: score.recommended,
        riskLevel,
        scoreByCategory: score.byCategory,
        scoreByLicenseType: score.byLicenseType,
      },
      summary: {
        totalRequirements: summary.totalRequirements,
        applicable: summary.applicable,
        compliant: summary.compliant,
        partial: summary.partial,
        nonCompliant: summary.nonCompliant,
        notAssessed: summary.notAssessed,
        notApplicable: summary.notApplicable,
        criticalGaps: summary.criticalGaps,
        majorGaps: summary.majorGaps,
      },
      requirements: {
        all: requirementResults,
        byStatus,
        byCategory,
        byLicenseType,
      },
      gapAnalysis: gapAnalysis.slice(0, 20), // Top 20 gaps
      recommendations,
      caaDocumentationChecklist: caaChecklist,
      euSpaceActCrossReferences: {
        articles: euSpaceActOverlaps,
        count: euSpaceActOverlaps.length,
        ukEuComparison,
        relevantComparisons: ukEuComparisons.filter((c) =>
          euSpaceActOverlaps.some(
            (ref) =>
              c.ukRequirement.includes(ref) || c.euEquivalent?.includes(ref),
          ),
        ),
        note: "Post-Brexit: UK operators with EU activities may need to comply with both UK and EU Space Act requirements.",
      },
      safetyCaseStatus: {
        status: assessment.safetyCaseStatus,
        reference: assessment.safetyCaseRef,
      },
      insuranceStatus: {
        provider: assessment.insuranceProvider,
        coverage: assessment.insuranceCoverage,
        confirmed: assessment.insuranceConfirmed,
      },
      registrationStatus: {
        ukRegistryRef: assessment.ukRegistryRef,
        status: assessment.registrationStatus,
      },
      regulatoryFramework: {
        primary: "UK Space Industry Act 2018",
        secondary: "Space Industry Regulations 2021",
        regulator: "Civil Aviation Authority (CAA)",
        guidance: "CAP 2210-2226 Series",
      },
      disclaimer:
        "This report is generated based on self-assessment data provided by the operator. It should be reviewed by qualified personnel and does not constitute legal advice or CAA approval. Formal licence applications must be submitted through official CAA channels.",
    };

    // Update assessment to mark report as generated
    await prisma.ukSpaceAssessment.update({
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
      action: "UK_SPACE_REPORT_GENERATED",
      entityType: "UkSpaceAssessment",
      entityId: id,
      metadata: {
        complianceScore: score.overall,
        riskLevel,
        requiredLicenses,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Error generating UK Space report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
