import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { safeJsonParseArray } from "@/lib/validations";
import {
  cybersecurityRequirements,
  getApplicableRequirements,
  getMaturityLevel,
  getImplementationTimeEstimate,
  categoryConfig,
  maturityLevelConfig,
  type CybersecurityProfile,
  type OrganizationSize,
  type SpaceSegmentComplexity,
  type DataSensitivityLevel,
  type RequirementStatus,
  type RequirementCategory,
} from "@/data/cybersecurity-requirements";

interface CybersecurityFramework {
  organizationProfile: {
    name: string | null;
    organizationSize: string;
    spaceSegmentComplexity: string;
    dataSensitivity: string;
    simplifiedRegime: boolean;
    existingCertifications: string[];
  };

  maturityAssessment: {
    overallScore: number;
    maturityLevel: string;
    maturityDescription: string;
    categoryScores: Record<
      string,
      { score: number; compliant: number; total: number }
    >;
  };

  complianceStatus: {
    totalRequirements: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
    notApplicable: number;
  };

  gapAnalysis: {
    critical: Array<{
      id: string;
      title: string;
      articleRef: string;
      status: string;
      implementationWeeks: number;
    }>;
    major: Array<{
      id: string;
      title: string;
      articleRef: string;
      status: string;
      implementationWeeks: number;
    }>;
    minor: Array<{
      id: string;
      title: string;
      articleRef: string;
      status: string;
      implementationWeeks: number;
    }>;
  };

  implementationPlan: {
    totalEstimatedWeeks: number;
    phases: Array<{
      name: string;
      category: string;
      requirements: Array<{
        id: string;
        title: string;
        priority: string;
        estimatedWeeks: number;
      }>;
    }>;
  };

  recommendations: string[];

  generatedAt: string;
}

// POST /api/cybersecurity/framework/generate - Generate Cybersecurity Framework
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { assessmentId } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 },
      );
    }

    // Get assessment with requirements
    const assessment = await prisma.cybersecurityAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        requirements: true,
        user: {
          select: {
            name: true,
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

    // Build profile
    const profile: CybersecurityProfile = {
      organizationSize: assessment.organizationSize as OrganizationSize,
      employeeCount: assessment.employeeCount ?? undefined,
      annualRevenue: assessment.annualRevenue ?? undefined,
      spaceSegmentComplexity:
        assessment.spaceSegmentComplexity as SpaceSegmentComplexity,
      satelliteCount: assessment.satelliteCount ?? undefined,
      hasGroundSegment: assessment.hasGroundSegment,
      groundStationCount: assessment.groundStationCount ?? undefined,
      dataSensitivityLevel:
        assessment.dataSensitivityLevel as DataSensitivityLevel,
      processesPersonalData: assessment.processesPersonalData,
      handlesGovData: assessment.handlesGovData,
      existingCertifications: safeJsonParseArray<string>(
        assessment.existingCertifications,
      ),
      hasSecurityTeam: assessment.hasSecurityTeam,
      securityTeamSize: assessment.securityTeamSize ?? undefined,
      hasIncidentResponsePlan: assessment.hasIncidentResponsePlan,
      hasBCP: assessment.hasBCP,
      criticalSupplierCount: assessment.criticalSupplierCount ?? undefined,
      supplierSecurityAssessed: assessment.supplierSecurityAssessed,
    };

    // Get applicable requirements
    const applicableRequirements = getApplicableRequirements(profile);

    // Build status map
    const statusMap: Record<string, RequirementStatus> = {};
    assessment.requirements.forEach((r) => {
      statusMap[r.requirementId] = r.status as RequirementStatus;
    });

    // Calculate category scores
    const categoryScores: Record<
      string,
      { score: number; compliant: number; total: number }
    > = {};
    const categories = Object.keys(categoryConfig) as RequirementCategory[];

    for (const cat of categories) {
      const catReqs = applicableRequirements.filter((r) => r.category === cat);
      if (catReqs.length === 0) continue;

      let compliant = 0;
      for (const req of catReqs) {
        const status = statusMap[req.id] || "not_assessed";
        if (status === "compliant") compliant++;
        else if (status === "partial") compliant += 0.5;
      }

      categoryScores[cat] = {
        score: Math.round((compliant / catReqs.length) * 100),
        compliant: Math.round(compliant),
        total: catReqs.length,
      };
    }

    // Compliance status counts
    const complianceStatus = {
      totalRequirements: applicableRequirements.length,
      compliant: 0,
      partial: 0,
      nonCompliant: 0,
      notAssessed: 0,
      notApplicable: 0,
    };

    for (const req of applicableRequirements) {
      const status = statusMap[req.id] || "not_assessed";
      switch (status) {
        case "compliant":
          complianceStatus.compliant++;
          break;
        case "partial":
          complianceStatus.partial++;
          break;
        case "non_compliant":
          complianceStatus.nonCompliant++;
          break;
        case "not_applicable":
          complianceStatus.notApplicable++;
          break;
        default:
          complianceStatus.notAssessed++;
      }
    }

    // Gap analysis
    const gapAnalysis = {
      critical: [] as Array<{
        id: string;
        title: string;
        articleRef: string;
        status: string;
        implementationWeeks: number;
      }>,
      major: [] as Array<{
        id: string;
        title: string;
        articleRef: string;
        status: string;
        implementationWeeks: number;
      }>,
      minor: [] as Array<{
        id: string;
        title: string;
        articleRef: string;
        status: string;
        implementationWeeks: number;
      }>,
    };

    for (const req of applicableRequirements) {
      const status = statusMap[req.id] || "not_assessed";
      if (status === "compliant" || status === "not_applicable") continue;

      const gap = {
        id: req.id,
        title: req.title,
        articleRef: req.articleRef,
        status,
        implementationWeeks: req.implementationTimeWeeks || 0,
      };

      if (req.severity === "critical") gapAnalysis.critical.push(gap);
      else if (req.severity === "major") gapAnalysis.major.push(gap);
      else gapAnalysis.minor.push(gap);
    }

    // Implementation plan by phase
    const phases = [
      { name: "Phase 1: Governance & Policy", category: "governance" },
      { name: "Phase 2: Risk Assessment", category: "risk_assessment" },
      { name: "Phase 3: Access & Information Security", category: "infosec" },
      { name: "Phase 4: Cryptography", category: "cryptography" },
      {
        name: "Phase 5: Monitoring & Detection",
        category: "detection_monitoring",
      },
      { name: "Phase 6: Business Continuity", category: "business_continuity" },
      { name: "Phase 7: Incident Response", category: "incident_reporting" },
      { name: "Phase 8: EUSRN Integration", category: "eusrn" },
    ];

    const implementationPlan = {
      totalEstimatedWeeks: getImplementationTimeEstimate(
        applicableRequirements,
        statusMap,
      ),
      phases: phases
        .map((phase) => {
          const phaseReqs = applicableRequirements.filter(
            (r) =>
              r.category === phase.category &&
              statusMap[r.id] !== "compliant" &&
              statusMap[r.id] !== "not_applicable",
          );

          return {
            name: phase.name,
            category: phase.category,
            requirements: phaseReqs
              .sort((a, b) => {
                const severityOrder = { critical: 0, major: 1, minor: 2 };
                return severityOrder[a.severity] - severityOrder[b.severity];
              })
              .map((r) => ({
                id: r.id,
                title: r.title,
                priority: r.severity,
                estimatedWeeks: r.implementationTimeWeeks || 0,
              })),
          };
        })
        .filter((p) => p.requirements.length > 0),
    };

    // Generate recommendations
    const recommendations: string[] = [];

    if (complianceStatus.nonCompliant > 0 || complianceStatus.notAssessed > 0) {
      recommendations.push(
        "Prioritize addressing critical gaps in incident response capabilities to meet 24-hour early warning requirements.",
      );
    }

    if (!assessment.hasSecurityTeam) {
      recommendations.push(
        "Consider establishing a dedicated security function or engaging a virtual CISO to manage cybersecurity obligations.",
      );
    }

    if (!assessment.hasIncidentResponsePlan) {
      recommendations.push(
        "Develop an incident response plan aligned with NIS2 notification timelines (24h early warning, 72h detailed report).",
      );
    }

    if (!assessment.hasBCP) {
      recommendations.push(
        "Establish a business continuity plan covering space operations and ground infrastructure.",
      );
    }

    if (
      assessment.spaceSegmentComplexity !== "ground_only" &&
      gapAnalysis.critical.some((g) => g.id === "space_link_encryption")
    ) {
      recommendations.push(
        "Implement space link encryption using CCSDS standards to protect command and telemetry communications.",
      );
    }

    if (assessment.isSimplifiedRegime) {
      recommendations.push(
        "As a Simplified Regime operator (Art. 86-88), focus on core requirements and leverage simplified alternatives where available.",
      );
    }

    if ((profile.existingCertifications || []).includes("iso27001")) {
      recommendations.push(
        "Leverage existing ISO 27001 controls to demonstrate compliance with NIS2-aligned requirements.",
      );
    } else {
      recommendations.push(
        "Consider ISO 27001 certification as a foundation for demonstrating cybersecurity maturity.",
      );
    }

    const maturityLevel = getMaturityLevel(assessment.maturityScore || 0);
    const maturityConfig = maturityLevelConfig[maturityLevel];

    // Build framework
    const framework: CybersecurityFramework = {
      organizationProfile: {
        name:
          assessment.assessmentName ||
          assessment.user.organization ||
          assessment.user.name,
        organizationSize: assessment.organizationSize,
        spaceSegmentComplexity: assessment.spaceSegmentComplexity,
        dataSensitivity: assessment.dataSensitivityLevel,
        simplifiedRegime: assessment.isSimplifiedRegime,
        existingCertifications: profile.existingCertifications || [],
      },
      maturityAssessment: {
        overallScore: assessment.maturityScore || 0,
        maturityLevel: maturityConfig.label,
        maturityDescription: maturityConfig.description,
        categoryScores,
      },
      complianceStatus,
      gapAnalysis,
      implementationPlan,
      recommendations,
      generatedAt: new Date().toISOString(),
    };

    // Update assessment to mark framework as generated
    await prisma.cybersecurityAssessment.update({
      where: { id: assessmentId },
      data: {
        frameworkGenerated: true,
        frameworkGeneratedAt: new Date(),
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "cybersecurity_framework_generated",
      entityType: "cybersecurity_assessment",
      entityId: assessmentId,
      newValue: {
        maturityScore: assessment.maturityScore,
        requirementsCount: applicableRequirements.length,
        gapCount:
          gapAnalysis.critical.length +
          gapAnalysis.major.length +
          gapAnalysis.minor.length,
      },
      description: "Generated Cybersecurity Framework",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ framework });
  } catch (error) {
    console.error("Error generating cybersecurity framework:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
