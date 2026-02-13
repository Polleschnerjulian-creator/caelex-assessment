import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  InsuranceComplianceReportPDF,
  type InsuranceComplianceReportData,
} from "@/lib/pdf/reports/insurance-compliance-report";

// POST /api/insurance/report/pdf - Generate Insurance Compliance Report PDF
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

    // Get assessment
    const assessment = await prisma.insuranceAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
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

    // Calculate TPL requirements
    const baseTplEUR = 60000000;
    const satelliteMultiplier = Math.min(assessment.satelliteCount, 10);
    const calculatedTpl = baseTplEUR * (1 + satelliteMultiplier * 0.1);

    // Determine compliance status based on available data
    const requiredPolicies = [
      {
        type: "Third Party Liability (TPL)",
        description:
          "Coverage for damage to third parties caused by space activities",
        minimumCoverage: `€${(calculatedTpl / 1000000).toFixed(0)}M`,
        status: "pending" as const,
        notes: "Required under EU Space Act Art. 15",
      },
      {
        type: "Launch Insurance",
        description:
          "Coverage for launch vehicle failure and early orbit operations",
        minimumCoverage: "Full replacement value",
        status: "pending" as const,
        notes: "Typically required by launch provider",
      },
      {
        type: "In-Orbit Insurance",
        description: "Coverage for spacecraft loss or damage during operations",
        minimumCoverage: "Asset value",
        status: "pending" as const,
        notes: "Recommended for commercial missions",
      },
    ];

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
          ? `€${(assessment.totalMissionValueEur / 1000000).toFixed(1)}M`
          : "TBD",
        inOrbitValue: assessment.satelliteValueEur
          ? `€${(assessment.satelliteValueEur / 1000000).toFixed(1)}M`
          : "TBD",
        launchProvider: assessment.launchProvider || undefined,
        plannedLaunchDate: assessment.launchDate?.toISOString().split("T")[0],
      },

      tplAnalysis: {
        requiredCoverage: `€${(calculatedTpl / 1000000).toFixed(0)} Million`,
        requiredCoverageEUR: calculatedTpl,
        calculationBasis:
          "Based on mission parameters and EU Space Act guidelines",
        riskFactors: [
          `Satellite count: ${assessment.satelliteCount}`,
          `Orbit regime: ${assessment.orbitRegime || "LEO"}`,
          `Has propulsion: ${assessment.hasPropulsion ? "Yes" : "No"}`,
          `Has maneuverability: ${assessment.hasManeuverability ? "Yes" : "No"}`,
          "Third-party collision risk assessment",
        ],
        jurisdictionRequirements: `${assessment.primaryJurisdiction || "EU"} national space law requirements`,
        euSpaceActReference: "Article 15 - Insurance and Financial Security",
      },

      requiredPolicies,

      optionalPolicies: [
        {
          type: "Business Interruption",
          description: "Coverage for revenue loss due to spacecraft anomaly",
          recommendedCoverage: "12-24 months revenue",
          priority: "medium" as const,
          rationale: "Protects against operational downtime",
        },
        {
          type: "Cyber Liability",
          description:
            "Coverage for cyber incidents affecting space operations",
          recommendedCoverage: "€5-10M",
          priority: "high" as const,
          rationale: "NIS2 compliance and increasing cyber threats",
        },
      ],

      premiumEstimates: {
        annualPremiumMin: `€${Math.round((calculatedTpl * 0.005) / 1000)}K`,
        annualPremiumMax: `€${Math.round((calculatedTpl * 0.015) / 1000)}K`,
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
        overallStatus: "partial",
        compliantPolicies: 0,
        pendingPolicies: 3,
        missingPolicies: 0,
        gaps: ["Insurance policies pending - to be obtained before launch"],
        recommendations: [
          "Contact specialized space insurance brokers for quotes",
          "Prepare detailed mission information for underwriters",
          "Submit insurance certificate to NCA with authorization application",
          "Establish annual insurance review process",
        ],
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
          minimumCoverage: `€${(calculatedTpl / 1000000).toFixed(0)}M`,
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
    console.error("Error generating insurance report PDF:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const maxDuration = 60;
