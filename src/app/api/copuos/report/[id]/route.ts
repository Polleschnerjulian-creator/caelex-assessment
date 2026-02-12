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
} from "@/lib/copuos-engine.server";
import {
  getApplicableGuidelines,
  getSatelliteCategory,
  allCopuosIadcGuidelines,
  type CopuosMissionProfile,
  type OrbitRegime,
  type MissionType,
  type ComplianceStatus,
} from "@/data/copuos-iadc-requirements";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/copuos/report/[id] - Generate compliance report for assessment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Fetch assessment
    const assessment = await prisma.copuosAssessment.findFirst({
      where: { id, userId },
      include: {
        guidelineStatuses: true,
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

    // Map assessments
    const assessmentResults = assessment.guidelineStatuses.map((gs) => ({
      guidelineId: gs.guidelineId,
      status: gs.status as ComplianceStatus,
      notes: gs.notes ?? undefined,
      evidenceNotes: gs.evidenceNotes ?? undefined,
    }));

    // Calculate all compliance metrics
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
    const summary = generateComplianceSummary(
      applicableGuidelines,
      assessmentResults,
    );
    const euSpaceActOverlaps =
      findEuSpaceActCrossReferences(applicableGuidelines);
    const recommendations = generateRecommendations(
      profile,
      score,
      gapAnalysis,
    );

    // Generate detailed guideline results
    const guidelineResults = applicableGuidelines.map((guideline) => {
      const status = assessment.guidelineStatuses.find(
        (gs) => gs.guidelineId === guideline.id,
      );
      return {
        id: guideline.id,
        source: guideline.source,
        referenceNumber: guideline.referenceNumber,
        title: guideline.title,
        description: guideline.description,
        category: guideline.category,
        bindingLevel: guideline.bindingLevel,
        severity: guideline.severity,
        status: status?.status ?? "not_assessed",
        notes: status?.notes,
        evidenceNotes: status?.evidenceNotes,
        complianceQuestion: guideline.complianceQuestion,
        evidenceRequired: guideline.evidenceRequired,
        implementationGuidance: guideline.implementationGuidance,
        euSpaceActCrossRef: guideline.euSpaceActCrossRef,
        isoReference: guideline.isoReference,
        iadcReference: guideline.iadcReference,
      };
    });

    // Group by status
    const byStatus = {
      compliant: guidelineResults.filter((g) => g.status === "compliant"),
      partial: guidelineResults.filter((g) => g.status === "partial"),
      nonCompliant: guidelineResults.filter(
        (g) => g.status === "non_compliant",
      ),
      notAssessed: guidelineResults.filter((g) => g.status === "not_assessed"),
      notApplicable: guidelineResults.filter(
        (g) => g.status === "not_applicable",
      ),
    };

    // Group by source
    const bySource = {
      COPUOS: guidelineResults.filter((g) => g.source === "COPUOS"),
      IADC: guidelineResults.filter((g) => g.source === "IADC"),
      ISO: guidelineResults.filter((g) => g.source === "ISO"),
    };

    // Generate report data structure
    const reportData = {
      metadata: {
        reportId: `COPUOS-${id}`,
        generatedAt: new Date().toISOString(),
        assessmentId: id,
        assessmentName:
          assessment.assessmentName ??
          assessment.missionName ??
          "Untitled Assessment",
        version: "1.0",
      },
      organization: {
        name: assessment.user.organization ?? "Not specified",
        contactName: assessment.user.name,
        contactEmail: assessment.user.email,
      },
      missionProfile: {
        name: assessment.missionName,
        orbitRegime: assessment.orbitRegime,
        altitudeKm: assessment.altitudeKm,
        inclinationDeg: assessment.inclinationDeg,
        missionType: assessment.missionType,
        satelliteCategory: assessment.satelliteCategory,
        satelliteMassKg: assessment.satelliteMassKg,
        hasManeuverability: assessment.hasManeuverability,
        hasPropulsion: assessment.hasPropulsion,
        plannedLifetimeYears: assessment.plannedLifetimeYears,
        isConstellation: assessment.isConstellation,
        constellationSize: assessment.constellationSize,
        launchDate: assessment.launchDate,
        countryOfRegistry: assessment.countryOfRegistry,
        deorbitStrategy: assessment.deorbitStrategy,
        deorbitTimelineYears: assessment.deorbitTimelineYears,
        caServiceProvider: assessment.caServiceProvider,
      },
      complianceOverview: {
        overallScore: score.overall,
        mandatoryScore: score.mandatory,
        recommendedScore: score.recommended,
        riskLevel,
        scoreBySource: score.bySource,
        scoreByCategory: score.byCategory,
      },
      summary: {
        totalGuidelines: summary.totalGuidelines,
        applicable: summary.applicable,
        compliant: summary.compliant,
        partial: summary.partial,
        nonCompliant: summary.nonCompliant,
        notAssessed: summary.notAssessed,
        notApplicable: summary.notApplicable,
        criticalGaps: summary.criticalGaps,
        majorGaps: summary.majorGaps,
      },
      guidelines: {
        all: guidelineResults,
        byStatus,
        bySource,
      },
      gapAnalysis: gapAnalysis.slice(0, 20), // Top 20 gaps
      recommendations,
      euSpaceActCrossReferences: {
        articles: euSpaceActOverlaps,
        count: euSpaceActOverlaps.length,
        note: "These EU Space Act articles have overlapping requirements with the assessed COPUOS/IADC/ISO guidelines",
      },
      standards: {
        copuosLts: "COPUOS Long-Term Sustainability Guidelines (2019)",
        iadc: "IADC Space Debris Mitigation Guidelines (2025 Update)",
        iso: "ISO 24113:2024 Space Debris Mitigation Requirements",
      },
      disclaimer:
        "This report is generated based on self-assessment data provided by the operator. It should be reviewed by qualified personnel and does not constitute legal advice or regulatory approval.",
    };

    // Update assessment to mark report as generated
    await prisma.copuosAssessment.update({
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
      action: "COPUOS_REPORT_GENERATED",
      entityType: "CopuosAssessment",
      entityId: id,
      metadata: {
        complianceScore: score.overall,
        riskLevel,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Error generating COPUOS report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
