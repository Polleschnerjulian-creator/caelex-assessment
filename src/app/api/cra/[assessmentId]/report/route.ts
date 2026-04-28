/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * CRA Report Generation API
 *
 * POST /api/cra/[assessmentId]/report — Generate PDF report
 *   Body: { reportType: "cra_declaration" | "cra_compliance_summary" }
 *   Returns: PDF as download
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDocumentPDF } from "@/lib/pdf/jspdf-generator";
import { generateCRADeclarationSections } from "@/lib/pdf/reports/cra-eu-declaration";
import type { CRAAssessmentData } from "@/lib/pdf/reports/cra-eu-declaration";
import { generateCRAComplianceSummarySections } from "@/lib/pdf/reports/cra-compliance-summary";
import type { CRAComplianceSummaryData } from "@/lib/pdf/reports/cra-compliance-summary";
import {
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { CRA_REQUIREMENTS } from "@/data/cra-requirements";

// ─── Validation ─────────────────────────────────────────────────────────────

const reportRequestSchema = z.object({
  reportType: z.enum(["cra_declaration", "cra_compliance_summary"]),
});

// ─── Category labels ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  security_by_design: "Security by Design",
  vulnerability_handling: "Vulnerability Handling",
  documentation: "Documentation",
  conformity_assessment: "Conformity Assessment",
  incident_reporting: "Incident Reporting",
  post_market_obligations: "Post-Market",
  software_update: "Software Update",
  sbom: "SBOM",
  support_period: "Support Period",
};

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    // Parse body
    const body = await request.json();
    const parsed = reportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }
    const { reportType } = parsed.data;

    // Fetch assessment with ownership check
    const assessment = await prisma.cRAAssessment.findFirst({
      where: { id: assessmentId, userId },
      include: {
        requirements: true,
        organization: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    if (!assessment) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    // Compute requirement stats
    const reqStatuses = assessment.requirements.map((r) => r.status);
    const requirementStats = {
      total: reqStatuses.length,
      compliant: reqStatuses.filter((s) => s === "compliant").length,
      partial: reqStatuses.filter((s) => s === "partial").length,
      nonCompliant: reqStatuses.filter((s) => s === "non_compliant").length,
    };

    // Parse classification reasoning
    const classificationReasoning = (
      Array.isArray(assessment.classificationReasoning)
        ? assessment.classificationReasoning
        : []
    ) as Array<{
      criterion: string;
      legalBasis: string;
      satisfied: boolean;
      reasoning: string;
    }>;

    const orgName =
      assessment.organization?.name ||
      assessment.user?.name ||
      "Unknown Organization";

    // Base assessment data
    const baseData: CRAAssessmentData = {
      productName: assessment.productName,
      productVersion: assessment.productVersion,
      productClassification: assessment.productClassification,
      conformityRoute: assessment.conformityRoute,
      classificationReasoning,
      organizationName: orgName,
      maturityScore: assessment.maturityScore,
      requirementStats,
      createdAt: assessment.createdAt.toISOString(),
    };

    let pdfBlob: Blob;
    let fileName: string;

    if (reportType === "cra_declaration") {
      // Generate EU Declaration of Conformity
      const sections = generateCRADeclarationSections(baseData);
      pdfBlob = generateDocumentPDF("EU Declaration of Conformity", sections, {
        documentCode: `CRA-DoC-${assessment.id.slice(0, 8).toUpperCase()}`,
        organizationName: orgName,
        classification: "REGULATORY DOCUMENT",
        version: "1.0",
      });
      fileName = `cra-eu-declaration-${assessment.id}.pdf`;
    } else {
      // Generate CRA Compliance Summary Report
      // Build category breakdown
      const reqMetaMap = new Map<
        string,
        { category: string; title: string; severity: string }
      >();
      for (const req of CRA_REQUIREMENTS) {
        reqMetaMap.set(req.id, {
          category: req.category,
          title: req.title,
          severity: req.severity,
        });
      }

      const categoryMap = new Map<
        string,
        {
          total: number;
          compliant: number;
          partial: number;
          nonCompliant: number;
          notAssessed: number;
        }
      >();

      for (const req of assessment.requirements) {
        const meta = reqMetaMap.get(req.requirementId);
        const cat = meta?.category || "unknown";
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, {
            total: 0,
            compliant: 0,
            partial: 0,
            nonCompliant: 0,
            notAssessed: 0,
          });
        }
        const entry = categoryMap.get(cat)!;
        entry.total++;
        if (req.status === "compliant") entry.compliant++;
        else if (req.status === "partial") entry.partial++;
        else if (req.status === "non_compliant") entry.nonCompliant++;
        else entry.notAssessed++;
      }

      const categoryBreakdown = Array.from(categoryMap.entries()).map(
        ([cat, stats]) => ({
          category: cat,
          categoryLabel: CATEGORY_LABELS[cat] || cat,
          ...stats,
        }),
      );

      // Top gaps (non-compliant and partial, sorted by severity)
      const severityOrder: Record<string, number> = {
        mandatory: 0,
        critical: 1,
        recommended: 2,
        optional: 3,
      };

      const topGaps = assessment.requirements
        .filter((r) => r.status === "non_compliant" || r.status === "partial")
        .map((r) => {
          const meta = reqMetaMap.get(r.requirementId);
          return {
            requirementId: r.requirementId,
            title: meta?.title || r.requirementId,
            category:
              CATEGORY_LABELS[meta?.category || ""] ||
              meta?.category ||
              "Unknown",
            severity: meta?.severity || "unknown",
            status: r.status,
          };
        })
        .sort(
          (a, b) =>
            (severityOrder[a.severity] ?? 99) -
            (severityOrder[b.severity] ?? 99),
        );

      const summaryData: CRAComplianceSummaryData = {
        ...baseData,
        categoryBreakdown,
        nis2OverlapCount: assessment.nis2OverlapCount,
        nis2AssessmentId: assessment.nis2AssessmentId,
        topGaps,
        certifications: {
          iec62443: assessment.hasIEC62443 ?? false,
          etsiEN303645: assessment.hasETSIEN303645 ?? false,
          commonCriteria: assessment.hasCommonCriteria ?? false,
          iso27001: assessment.hasISO27001 ?? false,
        },
        riskLevel: assessment.riskLevel,
        complianceScore: assessment.complianceScore,
      };

      const sections = generateCRAComplianceSummarySections(summaryData);
      pdfBlob = generateDocumentPDF("CRA Compliance Summary Report", sections, {
        documentCode: `CRA-CSR-${assessment.id.slice(0, 8).toUpperCase()}`,
        organizationName: orgName,
        classification: "CONFIDENTIAL",
        version: "1.0",
      });
      fileName = `cra-compliance-summary-${assessment.id}.pdf`;
    }

    // Convert Blob to ArrayBuffer for response
    const arrayBuffer = await pdfBlob.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    logger.error("Error generating CRA report", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Failed to generate report"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
