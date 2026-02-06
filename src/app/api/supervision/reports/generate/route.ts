/**
 * Report Generation API
 *
 * POST /api/supervision/reports/generate
 * Generate PDF reports for NCA submissions
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  generateReport,
  getAvailableReportTypes,
  type GenerateReportOptions,
} from "@/lib/services/report-generation-service";

// ============================================================================
// Request Validation
// ============================================================================

const GenerateIncidentReportSchema = z.object({
  type: z.literal("incident"),
  incidentId: z.string().min(1, "Incident ID is required"),
  includeResolutionDetails: z.boolean().optional().default(true),
});

const GenerateAnnualComplianceReportSchema = z.object({
  type: z.literal("annual_compliance"),
  supervisionId: z.string().min(1, "Supervision ID is required"),
  reportYear: z.string().regex(/^\d{4}$/, "Report year must be a 4-digit year"),
});

const ImpactAssessmentSchema = z.object({
  safetyImpact: z.enum(["none", "low", "medium", "high"]),
  debrisImpact: z.enum(["none", "low", "medium", "high"]),
  thirdPartyImpact: z.enum(["none", "low", "medium", "high"]),
  regulatoryImpact: z.enum(["none", "low", "medium", "high"]),
});

const OwnershipTransferSchema = z.object({
  currentOwner: z.string(),
  newOwner: z.string(),
  newOwnerCountry: z.string(),
  newOwnerRegistration: z.string().optional(),
  transferDate: z.string().transform((s) => new Date(s)),
  liabilityTransfer: z.boolean(),
});

const GenerateSignificantChangeReportSchema = z.object({
  type: z.literal("significant_change"),
  workflowId: z.string().min(1, "Workflow ID is required"),
  changeType: z.enum([
    "ownership_transfer",
    "mission_modification",
    "technical_change",
    "operational_change",
    "orbital_change",
    "end_of_life_update",
    "insurance_change",
    "contact_change",
    "other",
  ]),
  changeData: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    justification: z.string().min(1),
    effectiveDate: z.string().transform((s) => new Date(s)),
    currentState: z.array(z.object({ field: z.string(), value: z.string() })),
    proposedState: z.array(z.object({ field: z.string(), value: z.string() })),
    impactAssessment: ImpactAssessmentSchema,
    impactDescription: z.string().optional(),
    mitigationMeasures: z.array(z.string()).optional(),
    ownershipTransfer: OwnershipTransferSchema.optional(),
  }),
});

const GenerateReportRequestSchema = z.discriminatedUnion("type", [
  GenerateIncidentReportSchema,
  GenerateAnnualComplianceReportSchema,
  GenerateSignificantChangeReportSchema,
]);

// ============================================================================
// GET - List available report types
// ============================================================================

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportTypes = getAvailableReportTypes();

    return NextResponse.json({
      success: true,
      reportTypes,
    });
  } catch (error) {
    console.error("Failed to list report types:", error);
    return NextResponse.json(
      { error: "Failed to list report types" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Generate a report
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = GenerateReportRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const requestData = validationResult.data;

    // Build options based on report type
    let options: GenerateReportOptions;

    switch (requestData.type) {
      case "incident":
        options = {
          type: "incident",
          incidentId: requestData.incidentId,
          userId: session.user.id,
          includeResolutionDetails: requestData.includeResolutionDetails,
        };
        break;

      case "annual_compliance":
        options = {
          type: "annual_compliance",
          supervisionId: requestData.supervisionId,
          reportYear: requestData.reportYear,
          userId: session.user.id,
        };
        break;

      case "significant_change":
        options = {
          type: "significant_change",
          workflowId: requestData.workflowId,
          changeType: requestData.changeType,
          changeData: requestData.changeData,
          userId: session.user.id,
        };
        break;

      default:
        return NextResponse.json(
          { error: "Unknown report type" },
          { status: 400 },
        );
    }

    // Generate the report
    const result = await generateReport(options);

    if (!result.success) {
      const statusCode =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "UNAUTHORIZED"
            ? 403
            : result.code === "INVALID_DATA"
              ? 400
              : 500;

      return NextResponse.json({ error: result.error }, { status: statusCode });
    }

    // Return the PDF as a downloadable file
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(result.report.buffer);
    const response = new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": result.report.contentType,
        "Content-Disposition": `attachment; filename="${result.report.filename}"`,
        "X-Report-Id": result.report.reportId,
        "X-Report-Type": result.report.reportType,
      },
    });

    return response;
  } catch (error) {
    console.error("Report generation failed:", error);
    return NextResponse.json(
      { error: "Report generation failed" },
      { status: 500 },
    );
  }
}
