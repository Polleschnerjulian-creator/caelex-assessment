import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  calculateTPLRequirement,
  getRequiredInsuranceTypes,
  calculateMissionRiskLevel,
  calculateInsuranceComplianceScore,
  estimatePremiumRange,
  nationalRequirementsLookup,
  insuranceTypeDefinitions,
  type InsuranceRiskProfile,
  type JurisdictionCode,
  type OperatorType,
  type CompanySize,
  type OrbitRegime,
  type InsuranceType,
  type PolicyStatus,
} from "@/data/insurance-requirements";

interface InsuranceReport {
  organizationProfile: {
    name: string | null;
    jurisdiction: string;
    jurisdictionName: string;
    operatorType: string;
    companySize: string;
    orbitRegime: string;
    satelliteCount: number;
    missionValue: number | null;
    missionDurationYears: number;
    riskLevel: string;
  };

  tplRequirement: {
    amount: number;
    currency: string;
    basis: string;
    explanation: string;
    notes: string[];
  };

  insuranceCoverage: {
    required: Array<{
      type: InsuranceType;
      name: string;
      description: string;
      status: string;
      isRequired: boolean;
      coverageAmount: number | null;
      premium: number | null;
      insurer: string | null;
      effectiveDate: string | null;
      expirationDate: string | null;
    }>;
    optional: Array<{
      type: InsuranceType;
      name: string;
      description: string;
      status: string;
      recommendation: string;
    }>;
  };

  premiumEstimate: {
    annualTotal: { min: number; max: number };
    breakdown: Record<string, { min: number; max: number }>;
  };

  complianceStatus: {
    score: number;
    requiredPolicies: number;
    activePolicies: number;
    pendingPolicies: number;
    missingPolicies: number;
    expiringWithin90Days: number;
  };

  nationalRequirements: {
    jurisdiction: string;
    minimumTPL: number;
    insuranceRequired: boolean;
    coverageScope: string;
    governmentGuarantee: boolean;
    launchSiteInsurance: boolean;
    notes: string[];
    relevantArticles: string[];
  };

  recommendations: string[];

  generatedAt: string;
}

// POST /api/insurance/report/generate - Generate Insurance Compliance Report
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

    // Get assessment with policies
    const assessment = await prisma.insuranceAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        policies: true,
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
    const profile: InsuranceRiskProfile = {
      primaryJurisdiction: assessment.primaryJurisdiction as JurisdictionCode,
      operatorType: assessment.operatorType as OperatorType,
      companySize: assessment.companySize as CompanySize,
      orbitRegime: assessment.orbitRegime as OrbitRegime,
      satelliteCount: assessment.satelliteCount,
      satelliteValueEur: assessment.satelliteValueEur || 0,
      totalMissionValueEur: assessment.totalMissionValueEur || 0,
      isConstellationOperator: assessment.isConstellationOperator,
      hasManeuverability: assessment.hasManeuverability,
      missionDurationYears: assessment.missionDurationYears,
      hasFlightHeritage: assessment.hasFlightHeritage,
      launchVehicle: assessment.launchVehicle || undefined,
      launchProvider: assessment.launchProvider || undefined,
      hasADR: assessment.hasADR,
      hasPropulsion: assessment.hasPropulsion,
      hasHazardousMaterials: assessment.hasHazardousMaterials,
      crossBorderOps: assessment.crossBorderOps,
      annualRevenueEur: assessment.annualRevenueEur || undefined,
      turnoversShareSpace: assessment.turnoversShareSpace || undefined,
    };

    // Calculate requirements
    const tplRequirement = calculateTPLRequirement(profile);
    const requiredTypes = getRequiredInsuranceTypes(profile);
    const riskLevel = calculateMissionRiskLevel(profile);
    const premiumEstimate = estimatePremiumRange(profile, requiredTypes);

    // Build status map
    const statusMap: Record<string, PolicyStatus> = {};
    assessment.policies.forEach((p) => {
      statusMap[p.insuranceType] = p.status as PolicyStatus;
    });

    const complianceScore = calculateInsuranceComplianceScore(
      requiredTypes,
      statusMap,
    );

    // Get national requirements
    const nationalReqs =
      nationalRequirementsLookup[
        assessment.primaryJurisdiction as JurisdictionCode
      ];

    // Count policy statuses
    let activePolicies = 0;
    let pendingPolicies = 0;
    let missingPolicies = 0;
    let expiringWithin90Days = 0;
    const now = new Date();
    const ninetyDaysFromNow = new Date(
      now.getTime() + 90 * 24 * 60 * 60 * 1000,
    );

    for (const policy of assessment.policies) {
      if (!requiredTypes.includes(policy.insuranceType as InsuranceType))
        continue;

      if (policy.status === "active" || policy.status === "bound") {
        activePolicies++;
        if (
          policy.expirationDate &&
          new Date(policy.expirationDate) <= ninetyDaysFromNow
        ) {
          expiringWithin90Days++;
        }
      } else if (
        policy.status === "quote_requested" ||
        policy.status === "quote_received" ||
        policy.status === "under_review"
      ) {
        pendingPolicies++;
      } else if (policy.status === "not_started") {
        missingPolicies++;
      }
    }

    // Build required and optional coverage arrays
    const requiredCoverage = assessment.policies
      .filter((p) => requiredTypes.includes(p.insuranceType as InsuranceType))
      .map((p) => {
        const typeDef =
          insuranceTypeDefinitions[p.insuranceType as InsuranceType];
        return {
          type: p.insuranceType as InsuranceType,
          name: typeDef?.name || p.insuranceType,
          description: typeDef?.description || "",
          status: p.status,
          isRequired: p.isRequired,
          coverageAmount: p.coverageAmount,
          premium: p.premium,
          insurer: p.insurer,
          effectiveDate: p.effectiveDate?.toISOString() || null,
          expirationDate: p.expirationDate?.toISOString() || null,
        };
      });

    const optionalCoverage = assessment.policies
      .filter((p) => !requiredTypes.includes(p.insuranceType as InsuranceType))
      .map((p) => {
        const typeDef =
          insuranceTypeDefinitions[p.insuranceType as InsuranceType];
        return {
          type: p.insuranceType as InsuranceType,
          name: typeDef?.name || p.insuranceType,
          description: typeDef?.description || "",
          status: p.status,
          recommendation: getOptionalRecommendation(
            p.insuranceType as InsuranceType,
            profile,
          ),
        };
      });

    // Generate recommendations
    const recommendations: string[] = [];

    if (missingPolicies > 0) {
      recommendations.push(
        `Obtain insurance coverage for ${missingPolicies} required policy type(s) to achieve full compliance.`,
      );
    }

    if (expiringWithin90Days > 0) {
      recommendations.push(
        `${expiringWithin90Days} policy(ies) expiring within 90 days - initiate renewal process.`,
      );
    }

    if (
      tplRequirement.amount > 0 &&
      !assessment.policies.some(
        (p) =>
          p.insuranceType === "third_party_liability" &&
          p.coverageAmount &&
          p.coverageAmount >= tplRequirement.amount,
      )
    ) {
      recommendations.push(
        `Ensure TPL coverage meets the minimum requirement of ${formatCurrency(tplRequirement.amount)}.`,
      );
    }

    if (profile.hasHazardousMaterials) {
      recommendations.push(
        "Consider additional nuclear/hazardous materials liability coverage given your mission profile.",
      );
    }

    if (profile.isConstellationOperator && profile.satelliteCount > 10) {
      recommendations.push(
        "Review fleet coverage options which may offer cost efficiencies for constellation operators.",
      );
    }

    if (!profile.hasFlightHeritage) {
      recommendations.push(
        "Expect higher premiums due to lack of flight heritage. Consider partial coverage for initial missions.",
      );
    }

    if (riskLevel === "high" || riskLevel === "very_high") {
      recommendations.push(
        "Given elevated risk level, consider engaging a specialist space insurance broker for optimal coverage structuring.",
      );
    }

    if (assessment.crossBorderOps) {
      recommendations.push(
        "Cross-border operations may require insurance certificates recognized in multiple jurisdictions.",
      );
    }

    // Map operator type label
    const operatorTypeLabels: Record<string, string> = {
      spacecraft: "Spacecraft Operator",
      launch: "Launch Services Provider",
      launch_site: "Launch Site Operator",
    };

    // Map risk level label
    const riskLevelLabels: Record<string, string> = {
      low: "Low",
      medium: "Medium",
      high: "High",
      very_high: "Very High",
    };

    // Build report
    const report: InsuranceReport = {
      organizationProfile: {
        name:
          assessment.assessmentName ||
          assessment.user.organization ||
          assessment.user.name,
        jurisdiction: assessment.primaryJurisdiction,
        jurisdictionName:
          nationalReqs?.country || assessment.primaryJurisdiction,
        operatorType:
          operatorTypeLabels[assessment.operatorType] ||
          assessment.operatorType,
        companySize: assessment.companySize,
        orbitRegime: assessment.orbitRegime.toUpperCase(),
        satelliteCount: assessment.satelliteCount,
        missionValue: assessment.totalMissionValueEur,
        missionDurationYears: assessment.missionDurationYears,
        riskLevel: riskLevelLabels[riskLevel] || riskLevel,
      },
      tplRequirement: {
        amount: tplRequirement.amount,
        currency: tplRequirement.currency,
        basis: tplRequirement.basis,
        explanation: tplRequirement.explanation,
        notes: tplRequirement.notes,
      },
      insuranceCoverage: {
        required: requiredCoverage,
        optional: optionalCoverage,
      },
      premiumEstimate: {
        annualTotal: premiumEstimate.total,
        breakdown: premiumEstimate.breakdown,
      },
      complianceStatus: {
        score: complianceScore,
        requiredPolicies: requiredTypes.length,
        activePolicies,
        pendingPolicies,
        missingPolicies,
        expiringWithin90Days,
      },
      nationalRequirements: {
        jurisdiction: nationalReqs?.country || assessment.primaryJurisdiction,
        minimumTPL: nationalReqs?.minimumTPL || 0,
        insuranceRequired: nationalReqs?.insuranceRequired ?? true,
        coverageScope: nationalReqs?.coverageScope || "Not specified",
        governmentGuarantee: nationalReqs?.governmentGuarantee ?? false,
        launchSiteInsurance: nationalReqs?.launchSiteInsurance ?? false,
        notes: nationalReqs?.notes || [],
        relevantArticles: nationalReqs?.relevantLegislation || [],
      },
      recommendations,
      generatedAt: new Date().toISOString(),
    };

    // Update assessment to mark report as generated
    await prisma.insuranceAssessment.update({
      where: { id: assessmentId },
      data: {
        complianceScore,
        reportGenerated: true,
        reportGeneratedAt: new Date(),
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "insurance_report_generated",
      entityType: "insurance_assessment",
      entityId: assessmentId,
      newValue: {
        complianceScore,
        riskLevel,
        tplAmount: tplRequirement.amount,
        requiredPolicies: requiredTypes.length,
      },
      description: "Generated Insurance Compliance Report",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error generating insurance report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getOptionalRecommendation(
  type: InsuranceType,
  profile: InsuranceRiskProfile,
): string {
  switch (type) {
    case "contingent_liability":
      return profile.launchProvider
        ? "Recommended if launch provider coverage has exclusions that could affect your mission."
        : "Consider if using third-party launch services.";
    case "loss_of_revenue":
      return profile.totalMissionValueEur &&
        profile.totalMissionValueEur > 10000000
        ? "Recommended for high-value commercial missions to protect revenue streams."
        : "May be beneficial for missions with revenue-generating payloads.";
    case "pre_launch":
      if (profile.operatorType === "launch")
        return "Required for launch service providers.";
      return "Consider for valuable spacecraft during integration and transport phases.";
    case "launch_plus_life":
      return "Combined coverage may offer cost savings compared to separate launch and in-orbit policies.";
    default:
      return "Evaluate based on specific mission requirements and risk appetite.";
  }
}
