import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  DebrisMitigationPlanPDF,
  type DebrisMitigationPlanData,
} from "@/lib/pdf/reports/debris-mitigation-plan";
import {
  debrisRequirements,
  orbitTypeConfig,
} from "@/data/debris-requirements";

// POST /api/debris/plan/pdf - Generate Debris Mitigation Plan PDF
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
    const assessment = await prisma.debrisAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        requirements: true,
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

    // Get orbit config
    const orbitConfig =
      orbitTypeConfig[assessment.orbitType as keyof typeof orbitTypeConfig];

    // Build requirements matrix
    const requirementsMatrix = assessment.requirements.map((reqStatus) => {
      const reqDef = debrisRequirements.find(
        (r) => r.id === reqStatus.requirementId,
      );
      return {
        id: reqStatus.requirementId,
        title: reqDef?.title || reqStatus.requirementId,
        articleRef: reqDef?.articleRef || "",
        status: reqStatus.status as
          | "compliant"
          | "in_progress"
          | "not_compliant"
          | "not_applicable",
        notes: reqStatus.notes,
      };
    });

    // Calculate risk level based on compliance score
    const complianceScore = assessment.complianceScore || 0;
    const riskLevel: "low" | "medium" | "high" | "critical" =
      complianceScore >= 80
        ? "low"
        : complianceScore >= 60
          ? "medium"
          : complianceScore >= 40
            ? "high"
            : "critical";

    // Deorbit strategy descriptions
    const deorbitDescriptions: Record<string, string> = {
      active_deorbit: "Active deorbit maneuver using onboard propulsion",
      passive_decay: "Passive atmospheric decay (natural reentry)",
      graveyard_orbit: "Transfer to graveyard/disposal orbit",
      adr_contracted: "Active Debris Removal service contracted",
    };

    // Build PDF data
    const pdfData: DebrisMitigationPlanData = {
      reportNumber: `DMP-${assessment.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      reportDate: new Date(),
      organization:
        assessment.user.organization || assessment.user.name || "Unknown",
      generatedBy: assessment.user.name || assessment.user.email || "System",

      missionName: assessment.missionName || "Unnamed Mission",
      operator:
        assessment.user.organization || assessment.user.name || "Unknown",
      orbitType: orbitConfig?.label || assessment.orbitType,
      orbitParameters: `${orbitConfig?.label || assessment.orbitType}${assessment.altitudeKm ? ` at ${assessment.altitudeKm} km` : ""}`,
      altitudeKm: assessment.altitudeKm || undefined,
      missionDuration: `${assessment.plannedDurationYears} years`,
      plannedDurationYears: assessment.plannedDurationYears,
      satelliteCount: assessment.satelliteCount,
      constellationTier: assessment.constellationTier,

      spacecraft: {
        mass: assessment.satelliteCount > 1 ? "Multiple spacecraft" : "TBD",
        hasPropulsion: assessment.hasPropulsion,
        maneuverability:
          (assessment.hasManeuverability as "full" | "limited" | "none") ||
          "none",
      },

      collisionAvoidance: {
        strategy:
          assessment.hasManeuverability === "full"
            ? "Active collision avoidance with full maneuverability"
            : assessment.hasManeuverability === "limited"
              ? "Limited collision avoidance capability"
              : "No onboard collision avoidance capability",
        serviceProvider:
          assessment.caServiceProvider ||
          "To be determined (EUSST or commercial provider)",
        maneuverCapability: assessment.hasPropulsion
          ? `Propulsion system available with ${assessment.hasManeuverability || "limited"} maneuverability`
          : "No onboard propulsion",
        procedures: [
          "Monitor conjunction warnings from CA service provider",
          assessment.hasPropulsion
            ? "Execute avoidance maneuvers when probability exceeds threshold"
            : "Coordinate with operators of maneuverable spacecraft",
          "Maintain up-to-date ephemeris data with CA service",
          "Report all executed maneuvers to space surveillance networks",
        ],
      },

      endOfLifeDisposal: {
        method: assessment.deorbitStrategy,
        methodDescription:
          deorbitDescriptions[assessment.deorbitStrategy] ||
          assessment.deorbitStrategy,
        timeline: assessment.deorbitTimelineYears
          ? `Within ${assessment.deorbitTimelineYears} years post-mission`
          : assessment.orbitType === "LEO"
            ? "Within 25 years (5-year target for new missions)"
            : "To be determined based on orbital analysis",
        propellantBudget: assessment.hasPropulsion
          ? "Propellant reserved for end-of-life disposal maneuver"
          : "Natural decay / ADR required",
        backupStrategy:
          assessment.deorbitStrategy === "adr_contracted"
            ? "ADR service contracted as primary or backup"
            : assessment.hasPropulsion
              ? "ADR service as backup if primary disposal fails"
              : "ADR service required if natural decay insufficient",
      },

      fragmentationAvoidance: {
        designMeasures: [
          "Propellant tanks designed to minimize rupture risk",
          "Battery thermal protection to prevent runaway",
          "Pressure vessel design with burst mitigation",
          "No intentional fragmentation planned",
        ],
        operationalProcedures: [
          "Monitor battery health throughout mission",
          "Avoid operations that could cause tank overpressure",
          "Passivation planned before end-of-life",
        ],
      },

      passivation: {
        energySources: [
          assessment.hasPropulsion ? "Propellant tanks" : null,
          "Batteries",
          "Reaction wheels / CMGs",
          "Solar arrays",
        ].filter(Boolean) as string[],
        procedures: assessment.hasPassivationCap
          ? [
              "Deplete remaining propellant (vent or burn)",
              "Discharge batteries to safe level",
              "De-spin momentum wheels",
              "Disconnect solar arrays from charging circuit",
            ]
          : [
              "Limited passivation capability - passive discharge planned",
              "Battery discharge through natural self-discharge",
            ],
        timeline:
          "Passivation to be completed within 30 days of end-of-mission",
        hasCapability: assessment.hasPassivationCap,
      },

      complianceVerification: {
        twentyFiveYearCompliance:
          assessment.orbitType === "LEO"
            ? (assessment.deorbitTimelineYears || 25) <= 25
            : true,
        calculationMethod:
          "Orbital lifetime analysis using DRAMA/STK/GMAT with Monte Carlo uncertainty propagation",
        uncertaintyMargin:
          "Conservative assumptions used (1-sigma solar activity, worst-case ballistic coefficient)",
        complianceStatement:
          assessment.orbitType === "LEO"
            ? (assessment.deorbitTimelineYears || 25) <= 25
              ? "The mission is designed to comply with the 25-year orbital lifetime limit through the planned disposal strategy."
              : "Additional mitigation measures required to meet 25-year compliance."
            : "Not applicable for non-LEO orbit - graveyard orbit disposal planned.",
      },

      requirementsMatrix,
      complianceScore,
      riskLevel,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <DebrisMitigationPlanPDF data={pdfData} />,
    );

    // Update assessment
    await prisma.debrisAssessment.update({
      where: { id: assessmentId },
      data: {
        planGenerated: true,
        planGeneratedAt: new Date(),
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "debris_plan_pdf_generated",
      entityType: "debris_assessment",
      entityId: assessmentId,
      newValue: {
        reportNumber: pdfData.reportNumber,
        complianceScore,
      },
      description: "Generated Debris Mitigation Plan PDF",
      ipAddress,
      userAgent,
    });

    // Return PDF - convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Debris-Mitigation-Plan-${pdfData.reportNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating debris plan PDF:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const maxDuration = 60;
