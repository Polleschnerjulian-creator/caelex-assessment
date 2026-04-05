import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import {
  calculateTPLRequirement,
  getRequiredInsuranceTypes,
  estimatePremiumRange,
  insuranceTypeDefinitions,
  type InsuranceRiskProfile,
  type JurisdictionCode,
  type OperatorType,
  type CompanySize,
  type OrbitRegime,
  type InsuranceType,
} from "@/data/insurance-requirements";
import {
  InsuranceComplianceReportPDF,
  type InsuranceComplianceReportData,
} from "@/lib/pdf/reports/insurance-compliance-report";
import { logger } from "@/lib/logger";

// POST /api/insurance/report/pdf - Generate Insurance Compliance Report PDF
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting — document generation tier
    const rateLimitResult = await checkRateLimit(
      "document_generation",
      session.user.id,
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
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

    // Get assessment WITH policies
    const assessment = await prisma.insuranceAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        policies: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, organization: true },
    });

    const orgName = user?.organization || user?.name || "Unknown Organization";
    const generatedBy = user?.name || user?.email || "System";

    // Build the risk profile (same as generate/route.ts)
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

    // Calculate TPL using the real engine (jurisdiction-aware)
    const tplResult = calculateTPLRequirement(profile);
    const calculatedTpl = tplResult.amount;

    // Get required insurance types
    const requiredTypes = getRequiredInsuranceTypes(profile);

    // Calculate premium estimates from engine
    const premiumEst = estimatePremiumRange(profile, requiredTypes);

    // Build requiredPolicies from actual policy data
    const requiredPolicies = assessment.policies
      .filter((p) => requiredTypes.includes(p.insuranceType as InsuranceType))
      .map((p) => {
        const typeDef =
          insuranceTypeDefinitions[p.insuranceType as InsuranceType];
        const policyStatus = p.status as
          | "not_started"
          | "quote_requested"
          | "quote_received"
          | "under_review"
          | "bound"
          | "active"
          | "expiring_soon"
          | "expired"
          | "not_required";

        // Map policy status to PDF status
        let pdfStatus: "covered" | "pending" | "missing";
        if (policyStatus === "active" || policyStatus === "bound") {
          pdfStatus = "covered";
        } else if (
          policyStatus === "not_started" ||
          policyStatus === "expired"
        ) {
          pdfStatus = "missing";
        } else {
          pdfStatus = "pending";
        }

        return {
          type: typeDef?.name || p.insuranceType,
          description: typeDef?.description || "",
          minimumCoverage:
            p.insuranceType === "third_party_liability"
              ? `\u20AC${(calculatedTpl / 1000000).toFixed(0)}M`
              : p.coverageAmount
                ? `\u20AC${(p.coverageAmount / 1000000).toFixed(1)}M`
                : "TBD",
          status: pdfStatus,
          notes: p.insurer
            ? `Insurer: ${p.insurer}`
            : "Required under applicable space law",
        };
      });

    // If no policies matched required types, add a fallback entry for TPL
    if (requiredPolicies.length === 0) {
      requiredPolicies.push({
        type: "Third Party Liability (TPL)",
        description:
          "Coverage for damage to third parties caused by space activities",
        minimumCoverage: `\u20AC${(calculatedTpl / 1000000).toFixed(0)}M`,
        status: "missing" as const,
        notes: tplResult.basis,
      });
    }

    // Count actual compliance from real policy data
    const compliantCount = requiredPolicies.filter(
      (p) => p.status === "covered",
    ).length;
    const pendingCount = requiredPolicies.filter(
      (p) => p.status === "pending",
    ).length;
    const missingCount = requiredPolicies.filter(
      (p) => p.status === "missing",
    ).length;

    // Determine overall status
    let overallStatus: "compliant" | "partial" | "non_compliant";
    if (missingCount === 0 && pendingCount === 0) {
      overallStatus = "compliant";
    } else if (compliantCount > 0) {
      overallStatus = "partial";
    } else {
      overallStatus = "non_compliant";
    }

    // Build optional policies from real data
    const optionalPolicies = assessment.policies
      .filter((p) => !requiredTypes.includes(p.insuranceType as InsuranceType))
      .map((p) => {
        const typeDef =
          insuranceTypeDefinitions[p.insuranceType as InsuranceType];
        return {
          type: typeDef?.name || p.insuranceType,
          description: typeDef?.description || "",
          recommendedCoverage: p.coverageAmount
            ? `\u20AC${(p.coverageAmount / 1000000).toFixed(1)}M`
            : "TBD",
          priority: "medium" as const,
          rationale: `Status: ${p.status}`,
        };
      });

    // Build gaps and recommendations from real data
    const gaps: string[] = [];
    if (missingCount > 0) {
      gaps.push(
        `${missingCount} required insurance policy(ies) not yet obtained`,
      );
    }
    if (pendingCount > 0) {
      gaps.push(
        `${pendingCount} insurance policy(ies) pending — not yet active`,
      );
    }

    const recommendations: string[] = [];
    if (missingCount > 0) {
      recommendations.push(
        "Contact specialized space insurance brokers for quotes",
      );
      recommendations.push(
        "Prepare detailed mission information for underwriters",
      );
    }
    if (pendingCount > 0) {
      recommendations.push(
        "Follow up on pending policies to ensure timely binding",
      );
    }
    recommendations.push(
      "Submit insurance certificate to NCA with authorization application",
    );
    recommendations.push("Establish annual insurance review process");

    // Build PDF data
    const pdfData: InsuranceComplianceReportData = {
      reportNumber: `INS-${assessment.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      reportDate: new Date(),
      organization: orgName,
      generatedBy,

      operatorProfile: {
        name: orgName,
        jurisdiction: assessment.primaryJurisdiction || "EU",
        operatorType: assessment.operatorType || "Spacecraft Operator",
        companySize: assessment.companySize || "SME",
      },

      missionProfile: {
        missionName: assessment.assessmentName || "Space Mission",
        missionType: "Commercial",
        orbitType: assessment.orbitRegime || "LEO",
        satelliteCount: assessment.satelliteCount,
        totalMassKg: 0,
        launchValue: assessment.totalMissionValueEur
          ? `\u20AC${(assessment.totalMissionValueEur / 1000000).toFixed(1)}M`
          : "TBD",
        inOrbitValue: assessment.satelliteValueEur
          ? `\u20AC${(assessment.satelliteValueEur / 1000000).toFixed(1)}M`
          : "TBD",
        launchProvider: assessment.launchProvider || undefined,
        plannedLaunchDate: assessment.launchDate?.toISOString().split("T")[0],
      },

      tplAnalysis: {
        requiredCoverage: `\u20AC${(calculatedTpl / 1000000).toFixed(0)} Million`,
        requiredCoverageEUR: calculatedTpl,
        calculationBasis: tplResult.basis,
        riskFactors: [
          `Satellite count: ${assessment.satelliteCount}`,
          `Orbit regime: ${assessment.orbitRegime || "LEO"}`,
          `Has propulsion: ${assessment.hasPropulsion ? "Yes" : "No"}`,
          `Has maneuverability: ${assessment.hasManeuverability ? "Yes" : "No"}`,
          ...tplResult.notes,
        ],
        jurisdictionRequirements: tplResult.explanation,
        euSpaceActReference: "Article 15 - Insurance and Financial Security",
      },

      requiredPolicies,

      optionalPolicies,

      premiumEstimates: {
        annualPremiumMin: `\u20AC${Math.round(premiumEst.total.min / 1000)}K`,
        annualPremiumMax: `\u20AC${Math.round(premiumEst.total.max / 1000)}K`,
        factors: [
          "Mission risk profile",
          "Operator track record",
          "Spacecraft heritage",
          "Launch vehicle reliability",
          "Market conditions",
        ],
        marketConditions:
          "Space insurance market - early engagement recommended",
      },

      complianceStatus: {
        overallStatus,
        compliantPolicies: compliantCount,
        pendingPolicies: pendingCount,
        missingPolicies: missingCount,
        gaps,
        recommendations,
      },

      regulatoryRequirements: [
        {
          jurisdiction: "EU Space Act",
          requirement: "Third Party Liability Insurance",
          minimumCoverage: "Per Art. 15 guidelines",
          applicability: "All EU-authorized operators",
        },
        {
          jurisdiction: assessment.primaryJurisdiction || "EU",
          requirement: "TPL Insurance Certificate",
          minimumCoverage: `\u20AC${(calculatedTpl / 1000000).toFixed(0)}M`,
          applicability: "Licensed operators",
        },
      ],

      nextSteps: [
        "Contact specialized space insurance brokers",
        "Prepare mission information package for underwriters",
        "Obtain TPL coverage before authorization application",
        "Submit insurance certificates to NCA",
        "Document all policies in compliance records",
      ],
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <InsuranceComplianceReportPDF data={pdfData} />,
    );

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "insurance_report_pdf_generated",
      entityType: "insurance_assessment",
      entityId: assessmentId,
      newValue: {
        reportNumber: pdfData.reportNumber,
        requiredTpl: calculatedTpl,
      },
      description: "Generated Insurance Compliance Report PDF",
      ipAddress,
      userAgent,
    });

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Insurance-Report-${pdfData.reportNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("Error generating insurance report PDF", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const maxDuration = 60;
