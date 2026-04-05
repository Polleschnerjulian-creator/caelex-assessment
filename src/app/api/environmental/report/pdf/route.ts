/**
 * POST /api/environmental/report/pdf — Generate EFD Report as PDF
 *
 * Auth check + rate limiting ("document_generation" tier).
 * Fetches assessment with impact results, builds ReportSection[] using
 * the jsPDF generator, and returns a downloadable PDF.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { generateDocumentPDF } from "@/lib/pdf/jspdf-generator";
import type { ReportSection } from "@/lib/pdf/types";
import {
  launchVehicles,
  propellantProfiles,
  efdGradeThresholds,
  efdRegulatoryRequirements,
  getPhaseLabel,
  formatEmissions,
  formatMass,
  type LaunchVehicleId,
  type PropellantType,
  type EFDGrade,
  type LifecyclePhase,
} from "@/data/environmental-requirements";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limiting — document_generation tier
    const rl = await checkRateLimit(
      "document_generation",
      getIdentifier(request, userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await request.json();
    const schema = z.object({
      assessmentId: z.string().min(1),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { assessmentId } = parsed.data;

    // Fetch assessment with impact results
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

    if (!assessment.totalGWP || !assessment.efdGrade) {
      return NextResponse.json(
        {
          error:
            "Environmental calculation must be completed before generating PDF",
        },
        { status: 400 },
      );
    }

    // Resolve data for sections
    const launchVehicle =
      launchVehicles[assessment.launchVehicle as LaunchVehicleId];
    const gradeInfo = efdGradeThresholds.find(
      (g) => g.grade === assessment.efdGrade,
    )!;

    const orgName =
      (assessment.user?.organization as { name?: string } | null)?.name ||
      assessment.user?.name ||
      "Unknown Organization";

    // Build ReportSection[]
    const sections: ReportSection[] = [];

    // ─── Section 1: Mission Overview ───
    sections.push({
      title: "Mission Overview",
      content: [
        {
          type: "keyValue",
          items: [
            {
              key: "Mission Name",
              value:
                assessment.missionName ||
                assessment.assessmentName ||
                "Unnamed Mission",
            },
            { key: "Operator Type", value: assessment.operatorType },
            { key: "Mission Type", value: assessment.missionType },
            {
              key: "Spacecraft Mass",
              value: formatMass(assessment.spacecraftMassKg),
            },
            {
              key: "Spacecraft Count",
              value: String(assessment.spacecraftCount),
            },
            { key: "Orbit Type", value: assessment.orbitType },
            {
              key: "Altitude",
              value: assessment.altitudeKm
                ? `${assessment.altitudeKm} km`
                : "N/A",
            },
            {
              key: "Mission Duration",
              value: `${assessment.missionDurationYears} years`,
            },
            {
              key: "Launch Vehicle",
              value: launchVehicle?.name || assessment.launchVehicle,
            },
            {
              key: "Launch Provider",
              value: launchVehicle?.provider || "Unknown",
            },
            { key: "Launch Share", value: `${assessment.launchSharePercent}%` },
            {
              key: "Deorbit Strategy",
              value: formatDeorbitStrategy(assessment.deorbitStrategy),
            },
          ],
        },
      ],
    });

    // ─── Section 2: LCA Results ───
    sections.push({
      title: "Environmental Footprint Results",
      content: [
        {
          type: "text",
          value:
            "Summary of lifecycle environmental impact calculated using the screening LCA methodology aligned with ISO 14040/14044 and anticipated EU Space Act Art. 44-46 requirements.",
        },
        {
          type: "keyValue",
          items: [
            { key: "Total GWP", value: formatEmissions(assessment.totalGWP!) },
            {
              key: "Total ODP",
              value: `${assessment.totalODP!.toFixed(4)} kg CFC-11 eq`,
            },
            {
              key: "Carbon Intensity",
              value: `${assessment.carbonIntensity!.toFixed(1)} kg CO2eq / kg payload`,
            },
            {
              key: "EFD Grade",
              value: `${assessment.efdGrade} — ${gradeInfo.label}`,
            },
            {
              key: "Compliance Score",
              value: `${assessment.complianceScore || 0}/100`,
            },
            {
              key: "Assessment Type",
              value: assessment.isSimplifiedAssessment
                ? "Simplified (Screening LCA)"
                : "Full Lifecycle Assessment",
            },
          ],
        },
      ],
    });

    // ─── Section 3: Lifecycle Phase Breakdown ───
    const phaseRows = assessment.impactResults.map((result) => [
      getPhaseLabel(result.phase as LifecyclePhase),
      formatEmissions(result.gwpKgCO2eq),
      `${result.percentOfTotal.toFixed(1)}%`,
      result.percentOfTotal > 25 ? "Yes" : "No",
    ]);

    sections.push({
      title: "Lifecycle Phase Breakdown",
      content: [
        {
          type: "text",
          value:
            "Breakdown of Global Warming Potential (GWP) by lifecycle phase. Phases contributing more than 25% of total impact are flagged as environmental hotspots.",
        },
        {
          type: "table",
          headers: [
            "Lifecycle Phase",
            "GWP (kg CO2eq)",
            "% of Total",
            "Hotspot",
          ],
          rows: phaseRows,
        },
      ],
    });

    // ─── Section 4: Grade and Carbon Intensity ───
    sections.push({
      title: "EFD Grade Assessment",
      content: [
        {
          type: "text",
          value: `This mission has been assigned an EFD Grade of ${assessment.efdGrade} (${gradeInfo.label}), based on a carbon intensity of ${assessment.carbonIntensity!.toFixed(1)} kg CO2eq per kg of payload delivered to orbit.`,
        },
        {
          type: "text",
          value: gradeInfo.description,
        },
        {
          type: "table",
          headers: [
            "Grade",
            "Label",
            "Max Carbon Intensity (kg CO2eq/kg)",
            "Description",
          ],
          rows: efdGradeThresholds.map((t) => [
            t.grade,
            t.label,
            t.maxCarbonIntensity === Infinity
              ? "> 500"
              : String(t.maxCarbonIntensity),
            t.description,
          ]),
        },
      ],
    });

    // ─── Section 5: Launch Vehicle Analysis ───
    if (launchVehicle) {
      sections.push({
        title: "Launch Vehicle Analysis",
        content: [
          {
            type: "keyValue",
            items: [
              { key: "Vehicle", value: launchVehicle.name },
              { key: "Provider", value: launchVehicle.provider },
              {
                key: "Reusability",
                value:
                  launchVehicle.reusability === "none"
                    ? "Expendable"
                    : launchVehicle.reusability === "partial"
                      ? "Partially Reusable"
                      : "Fully Reusable",
              },
              {
                key: "Sustainability Grade",
                value: launchVehicle.sustainabilityGrade,
              },
              {
                key: "Carbon Intensity (LEO)",
                value: `${launchVehicle.carbonIntensityKgCO2PerKgPayload.leo} kg CO2eq/kg`,
              },
              {
                key: "Total Launch GWP",
                value: formatEmissions(launchVehicle.emissionsProfile.gwp),
              },
              {
                key: "Launch ODP",
                value: `${launchVehicle.emissionsProfile.odp} kg CFC-11 eq`,
              },
            ],
          },
          { type: "text", value: launchVehicle.notes },
        ],
      });
    }

    // ─── Section 6: Propellant Analysis ───
    if (assessment.spacecraftPropellant) {
      const propellant =
        propellantProfiles[assessment.spacecraftPropellant as PropellantType];
      if (propellant) {
        sections.push({
          title: "Propellant Analysis",
          content: [
            {
              type: "keyValue",
              items: [
                { key: "Propellant Type", value: propellant.name },
                {
                  key: "Propellant Mass",
                  value: assessment.propellantMassKg
                    ? formatMass(assessment.propellantMassKg)
                    : "Not specified",
                },
                {
                  key: "GWP per kg",
                  value: `${propellant.gwpPerKg} kg CO2eq/kg`,
                },
                {
                  key: "ODP per kg",
                  value: `${propellant.odpPerKg} kg CFC-11 eq/kg`,
                },
                { key: "Toxicity Class", value: propellant.toxicityClass },
                {
                  key: "Sustainability Rating",
                  value: propellant.sustainabilityRating,
                },
              ],
            },
            { type: "text", value: propellant.notes },
          ],
        });
      }
    }

    // ─── Section 7: Recommendations ───
    const recommendations: string[] = [];

    if (launchVehicle?.reusability === "none") {
      recommendations.push(
        "Consider launch providers with reusable vehicles (e.g., Falcon 9) to reduce launch emissions by 30-50%.",
      );
    }
    if (
      assessment.spacecraftPropellant === "hydrazine" ||
      assessment.spacecraftPropellant === "monomethylhydrazine"
    ) {
      recommendations.push(
        "Replace hydrazine-based propellants with green alternatives (AF-M315E, LMP-103S) to improve toxicity profile and reduce handling risks.",
      );
    }
    if (assessment.carbonIntensity && assessment.carbonIntensity > 350) {
      recommendations.push(
        "Current carbon intensity exceeds industry average. Develop an environmental improvement roadmap.",
      );
    }

    const hotspotPhases = assessment.impactResults.filter(
      (r) => r.percentOfTotal > 25,
    );
    for (const hp of hotspotPhases) {
      recommendations.push(
        `${getPhaseLabel(hp.phase as LifecyclePhase)} is a major contributor (${hp.percentOfTotal.toFixed(1)}%). Investigate reduction measures for this phase.`,
      );
    }

    const pendingSuppliers = assessment.supplierRequests.filter(
      (s) => s.status === "pending" || s.status === "sent",
    ).length;
    if (pendingSuppliers > 0) {
      recommendations.push(
        `${pendingSuppliers} supplier data request(s) are pending. Follow up to improve LCA accuracy.`,
      );
    }

    if (recommendations.length > 0) {
      sections.push({
        title: "Recommendations",
        content: [
          {
            type: "text",
            value:
              "The following recommendations are provided to improve the environmental footprint of this mission:",
          },
          {
            type: "list",
            items: recommendations,
            ordered: true,
          },
        ],
      });
    }

    // ─── Section 8: Regulatory Reference ───
    const operatorAbbrev =
      assessment.operatorType === "spacecraft"
        ? "SCO"
        : assessment.operatorType === "launch"
          ? "LO"
          : "LSO";

    const applicableReqs = efdRegulatoryRequirements.filter(
      (req) =>
        req.applicableTo.includes(operatorAbbrev) ||
        req.applicableTo.includes("ALL"),
    );

    sections.push({
      title: "Regulatory Reference",
      content: [
        {
          type: "alert",
          severity: "warning",
          message:
            "EU Space Act (COM(2025) 335) is a legislative proposal and is not yet in force. Article references are from the proposed regulation. This document does not constitute legal advice.",
        },
        {
          type: "table",
          headers: ["Article", "Title", "Deadline", "Summary"],
          rows: applicableReqs.map((req) => [
            req.articleNumber,
            req.title,
            req.deadline,
            req.summary,
          ]),
        },
      ],
    });

    // ─── Section 9: Supplier Data Status ───
    if (assessment.supplierRequests.length > 0) {
      const supplierRows = assessment.supplierRequests.map((s) => [
        s.supplierName,
        s.componentType,
        s.status.charAt(0).toUpperCase() + s.status.slice(1),
        s.sentAt ? new Date(s.sentAt).toLocaleDateString() : "Not sent",
      ]);

      sections.push({
        title: "Supplier Data Status",
        content: [
          {
            type: "text",
            value: `${assessment.supplierRequests.length} supplier data request(s) tracked for this assessment.`,
          },
          {
            type: "table",
            headers: ["Supplier", "Component", "Status", "Sent Date"],
            rows: supplierRows,
          },
        ],
      });
    }

    // Generate PDF using jsPDF generator
    const pdfBlob = generateDocumentPDF(
      "Environmental Footprint Declaration (EFD)",
      sections,
      {
        documentCode: `EFD-${assessmentId.slice(0, 8).toUpperCase()}`,
        organizationName: orgName,
        classification: "NCA Confidential",
        version: "1.0",
      },
    );

    // Convert Blob to ArrayBuffer for response
    const arrayBuffer = await pdfBlob.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="efd-report-${assessmentId}.pdf"`,
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    logger.error("Error generating environmental PDF report", error);
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
