import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  launchVehicles,
  propellantProfiles,
  efdGradeThresholds,
  efdRegulatoryRequirements,
  simplifiedRegimeCriteria,
  getPhaseLabel,
  formatEmissions,
  formatMass,
  type LaunchVehicleId,
  type PropellantType,
  type EFDGrade,
} from "@/data/environmental-requirements";

interface EnvironmentalReport {
  missionProfile: {
    name: string | null;
    operatorType: string;
    missionType: string;
    spacecraftMass: string;
    spacecraftCount: number;
    orbitType: string;
    altitude: string | null;
    missionDuration: string;
    launchVehicle: string;
    launchProvider: string;
    launchShare: string;
    deorbitStrategy: string;
  };

  environmentalFootprint: {
    totalGWP: number;
    totalGWPFormatted: string;
    totalODP: number;
    carbonIntensity: number;
    grade: EFDGrade;
    gradeLabel: string;
    gradeColor: string;
    gradeDescription: string;
  };

  lifecycleBreakdown: Array<{
    phase: string;
    phaseName: string;
    gwpKgCO2eq: number;
    gwpFormatted: string;
    percentOfTotal: number;
    isHotspot: boolean;
  }>;

  propellantAnalysis: {
    type: string | null;
    name: string | null;
    mass: string | null;
    sustainabilityRating: string | null;
    toxicityClass: string | null;
    notes: string | null;
  } | null;

  launchVehicleAnalysis: {
    name: string;
    provider: string;
    reusability: string;
    sustainabilityGrade: string;
    carbonIntensityLeo: number;
    notes: string;
  };

  regulatoryCompliance: {
    meetsDeadline: boolean;
    isSimplifiedAssessment: boolean;
    applicableRequirements: Array<{
      article: string;
      title: string;
      summary: string;
      deadline: string;
      applies: boolean;
    }>;
    simplifiedRegimeEligibility: Array<{
      criterion: string;
      threshold: string;
      applies: boolean;
      exemption: string;
    }>;
  };

  recommendations: string[];

  supplierDataStatus: {
    total: number;
    pending: number;
    sent: number;
    received: number;
    overdue: number;
  };

  complianceScore: number;

  generatedAt: string;
}

// POST /api/environmental/report/generate - Generate Environmental Footprint Report
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

    // Get assessment with all related data
    const assessment = await prisma.environmentalAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        impactResults: true,
        supplierRequests: true,
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

    // Check if calculation has been run
    if (!assessment.totalGWP || !assessment.efdGrade) {
      return NextResponse.json(
        {
          error:
            "Environmental calculation must be completed before generating report",
        },
        { status: 400 },
      );
    }

    // Get launch vehicle info
    const launchVehicle =
      launchVehicles[assessment.launchVehicle as LaunchVehicleId];

    // Get propellant info if applicable
    let propellantAnalysis = null;
    if (assessment.spacecraftPropellant) {
      const propellant =
        propellantProfiles[assessment.spacecraftPropellant as PropellantType];
      if (propellant) {
        propellantAnalysis = {
          type: assessment.spacecraftPropellant,
          name: propellant.name,
          mass: assessment.propellantMassKg
            ? formatMass(assessment.propellantMassKg)
            : null,
          sustainabilityRating: propellant.sustainabilityRating,
          toxicityClass: propellant.toxicityClass,
          notes: propellant.notes,
        };
      }
    }

    // Get grade info
    const gradeInfo = efdGradeThresholds.find(
      (g) => g.grade === assessment.efdGrade,
    )!;

    // Build lifecycle breakdown with hotspot marking
    const lifecycleBreakdown = assessment.impactResults.map((result) => ({
      phase: result.phase,
      phaseName: getPhaseLabel(result.phase as any),
      gwpKgCO2eq: result.gwpKgCO2eq,
      gwpFormatted: formatEmissions(result.gwpKgCO2eq),
      percentOfTotal: result.percentOfTotal,
      isHotspot: result.percentOfTotal > 25,
    }));

    // Generate recommendations based on current state
    const recommendations: string[] = [];

    // Launch recommendations
    if (launchVehicle.reusability === "none") {
      recommendations.push(
        "Consider launch providers with reusable vehicles (e.g., Falcon 9) to reduce launch emissions by 30-50%.",
      );
    }

    // Propellant recommendations
    if (
      assessment.spacecraftPropellant === "hydrazine" ||
      assessment.spacecraftPropellant === "monomethylhydrazine"
    ) {
      recommendations.push(
        "Replace hydrazine-based propellants with green alternatives (AF-M315E, LMP-103S) to improve toxicity profile and reduce handling risks.",
      );
    }

    // Grade-based recommendations
    if (assessment.carbonIntensity && assessment.carbonIntensity > 350) {
      recommendations.push(
        "Current carbon intensity exceeds industry average. Develop an environmental improvement roadmap.",
      );
    }

    // Hotspot recommendations
    const launchHotspot = lifecycleBreakdown.find(
      (p) => p.phase === "launch" && p.isHotspot,
    );
    if (launchHotspot && assessment.launchSharePercent < 80) {
      recommendations.push(
        "Rideshare launches can significantly reduce per-payload environmental impact. Consider consolidating payloads.",
      );
    }

    const manufacturingHotspot = lifecycleBreakdown.find(
      (p) =>
        (p.phase === "manufacturing" ||
          p.phase === "raw_material_extraction") &&
        p.isHotspot,
    );
    if (manufacturingHotspot) {
      recommendations.push(
        "Manufacturing is a significant contributor. Request environmental data from key suppliers per Art. 99.",
      );
      recommendations.push(
        "Prioritize suppliers with recycled material content and renewable energy certifications.",
      );
    }

    // Supplier data recommendations
    const pendingSuppliers = assessment.supplierRequests.filter(
      (s) => s.status === "pending" || s.status === "sent",
    ).length;
    if (pendingSuppliers > 0) {
      recommendations.push(
        `${pendingSuppliers} supplier data request(s) are pending. Follow up to improve LCA accuracy.`,
      );
    }

    // Simplified regime eligibility
    const simplifiedEligibility = simplifiedRegimeCriteria.map((criterion) => ({
      criterion: criterion.criterion,
      threshold: criterion.threshold,
      exemption: criterion.exemption,
      applies: evaluateSimplifiedCriterion(criterion.criterion, assessment),
    }));

    // Applicable regulatory requirements
    const operatorAbbrev =
      assessment.operatorType === "spacecraft"
        ? "SCO"
        : assessment.operatorType === "launch"
          ? "LO"
          : "LSO";

    const applicableRequirements = efdRegulatoryRequirements.map((req) => ({
      article: req.articleNumber,
      title: req.title,
      summary: req.summary,
      deadline: req.deadline,
      applies:
        req.applicableTo.includes(operatorAbbrev) ||
        req.applicableTo.includes("ALL"),
    }));

    // Supplier data status
    const supplierDataStatus = {
      total: assessment.supplierRequests.length,
      pending: assessment.supplierRequests.filter((s) => s.status === "pending")
        .length,
      sent: assessment.supplierRequests.filter((s) => s.status === "sent")
        .length,
      received: assessment.supplierRequests.filter(
        (s) => s.status === "received",
      ).length,
      overdue: assessment.supplierRequests.filter((s) => s.status === "overdue")
        .length,
    };

    // Build report
    const report: EnvironmentalReport = {
      missionProfile: {
        name: assessment.missionName || assessment.assessmentName,
        operatorType: assessment.operatorType,
        missionType: assessment.missionType,
        spacecraftMass: formatMass(assessment.spacecraftMassKg),
        spacecraftCount: assessment.spacecraftCount,
        orbitType: assessment.orbitType,
        altitude: assessment.altitudeKm ? `${assessment.altitudeKm} km` : null,
        missionDuration: `${assessment.missionDurationYears} years`,
        launchVehicle: launchVehicle.name,
        launchProvider: launchVehicle.provider,
        launchShare: `${assessment.launchSharePercent}%`,
        deorbitStrategy: formatDeorbitStrategy(assessment.deorbitStrategy),
      },
      environmentalFootprint: {
        totalGWP: assessment.totalGWP!,
        totalGWPFormatted: formatEmissions(assessment.totalGWP!),
        totalODP: assessment.totalODP!,
        carbonIntensity: assessment.carbonIntensity!,
        grade: assessment.efdGrade as EFDGrade,
        gradeLabel: gradeInfo.label,
        gradeColor: gradeInfo.color,
        gradeDescription: gradeInfo.description,
      },
      lifecycleBreakdown,
      propellantAnalysis,
      launchVehicleAnalysis: {
        name: launchVehicle.name,
        provider: launchVehicle.provider,
        reusability:
          launchVehicle.reusability === "none"
            ? "Expendable"
            : launchVehicle.reusability === "partial"
              ? "Partially Reusable"
              : "Fully Reusable",
        sustainabilityGrade: launchVehicle.sustainabilityGrade,
        carbonIntensityLeo: launchVehicle.carbonIntensityKgCO2PerKgPayload.leo,
        notes: launchVehicle.notes,
      },
      regulatoryCompliance: {
        meetsDeadline: new Date() < new Date("2030-01-01"),
        isSimplifiedAssessment: assessment.isSimplifiedAssessment,
        applicableRequirements,
        simplifiedRegimeEligibility: simplifiedEligibility,
      },
      recommendations,
      supplierDataStatus,
      complianceScore: assessment.complianceScore || 0,
      generatedAt: new Date().toISOString(),
    };

    // Update assessment to mark report as generated
    await prisma.environmentalAssessment.update({
      where: { id: assessmentId },
      data: {
        status: "review",
        reportGenerated: true,
        reportGeneratedAt: new Date(),
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "environmental_report_generated",
      entityType: "environmental_assessment",
      entityId: assessmentId,
      newValue: {
        grade: assessment.efdGrade,
        totalGWP: assessment.totalGWP,
        carbonIntensity: assessment.carbonIntensity,
        complianceScore: assessment.complianceScore,
      },
      description: "Generated Environmental Footprint Report",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error generating environmental report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function formatDeorbitStrategy(strategy: string): string {
  const labels: Record<string, string> = {
    controlled_deorbit: "Controlled Deorbit",
    passive_decay: "Passive Decay",
    graveyard_orbit: "Graveyard Orbit",
    retrieval: "Active Retrieval/ADR",
  };
  return labels[strategy] || strategy;
}

function evaluateSimplifiedCriterion(
  criterion: string,
  assessment: any,
): boolean {
  switch (criterion) {
    case "Organization Size":
      return assessment.isSmallEnterprise || assessment.isResearchEducation;
    case "Mission Mass":
      return assessment.spacecraftMassKg * assessment.spacecraftCount < 100;
    case "Rideshare Launch":
      return assessment.launchSharePercent < 10;
    case "Secondary Mission":
      return false; // Would need additional tracking
    default:
      return false;
  }
}
