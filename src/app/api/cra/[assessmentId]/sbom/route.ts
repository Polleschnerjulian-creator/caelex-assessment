/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * CRA SBOM Upload & Analysis API
 *
 * POST /api/cra/[assessmentId]/sbom — Upload and analyze an SBOM
 * GET  /api/cra/[assessmentId]/sbom — Get latest SBOM analysis for an assessment
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { parseSBOM, assessSBOMCompliance } from "@/lib/cra-sbom-service.server";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

// ─── Validation ───

const sbomUploadSchema = z.object({
  sbomContent: z.string().min(2).max(2_000_000), // 2MB max — real SBOMs are well under this
});

// ─── Requirement ID Mapping ───

const CRA_SBOM_REQUIREMENT_IDS = {
  sbomGeneration: "cra-038",
  ossLicense: "cra-039",
  vulnTracking: "cra-040",
} as const;

// ─── POST: Upload & Analyze SBOM ───

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    // Rate limit: 10/hr per user (assessment tier)
    const ip = getIdentifier(request, session.user.id);
    const rateLimitResult = await checkRateLimit("assessment", ip);
    if (!rateLimitResult.success) {
      return createErrorResponse(
        "Too many requests",
        ErrorCode.RATE_LIMITED,
        429,
      );
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    // Parse and validate body
    const body = await request.json();
    const parsed = sbomUploadSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(
        "Invalid request body. Provide a valid SBOM JSON string in the 'sbomContent' field.",
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    // Verify assessment belongs to user (include organizationId for evidence storage)
    const assessment = await prisma.cRAAssessment.findFirst({
      where: { id: assessmentId, userId },
      select: { id: true, productName: true, organizationId: true },
    });

    if (!assessment) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    // Parse SBOM
    const analysis = parseSBOM(parsed.data.sbomContent);
    if (analysis.format === "unknown" && analysis.componentCount === 0) {
      return createErrorResponse(
        "Could not parse SBOM. Provide a valid CycloneDX or SPDX JSON document.",
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    // Assess compliance
    const compliance = assessSBOMCompliance(analysis);

    // Use the assessment's organization (not session org) for evidence storage
    const organizationId = assessment.organizationId;

    // Store SBOM analysis as ComplianceEvidence if user has an org
    if (organizationId) {
      // Upsert: remove previous SBOM evidence for this assessment, then create new
      await prisma.complianceEvidence.deleteMany({
        where: {
          organizationId,
          regulationType: "CYBERSECURITY",
          requirementId: `sbom:${assessmentId}`,
        },
      });

      // Serialize metadata through JSON roundtrip for Prisma InputJsonValue compatibility
      const sbomMetadata = JSON.parse(
        JSON.stringify({
          type: "sbom_analysis",
          assessmentId,
          analysis: {
            format: analysis.format,
            specVersion: analysis.specVersion,
            componentCount: analysis.componentCount,
            licenses: analysis.licenses,
            openSourceCount: analysis.openSourceCount,
            proprietaryCount: analysis.proprietaryCount,
            hasKnownVulnerableComponents: analysis.hasKnownVulnerableComponents,
            vulnerableComponents: analysis.vulnerableComponents,
          },
          compliance,
          uploadedAt: new Date().toISOString(),
        }),
      );

      await prisma.complianceEvidence.create({
        data: {
          organizationId,
          createdBy: userId,
          regulationType: "CYBERSECURITY",
          requirementId: `sbom:${assessmentId}`,
          title: `SBOM Analysis: ${assessment.productName}`,
          description: `${analysis.format.toUpperCase()} SBOM with ${analysis.componentCount} components. ${analysis.openSourceCount} open-source, ${analysis.proprietaryCount} proprietary.`,
          evidenceType: "OTHER",
          status: "ACCEPTED",
          sourceType: "AUTOMATED",
          confidence: analysis.format !== "unknown" ? 0.95 : 0.3,
          metadata: sbomMetadata,
        },
      });
    }

    // Auto-update CRA requirement statuses
    const requirementUpdates: Array<{
      requirementId: string;
      status: string;
      notes: string;
    }> = [];

    // cra-038: SBOM generated
    if (compliance.cra038_sbomGenerated) {
      requirementUpdates.push({
        requirementId: CRA_SBOM_REQUIREMENT_IDS.sbomGeneration,
        status: "compliant",
        notes: `[Auto-assessed via SBOM upload] ${compliance.cra038_details}`,
      });
    }

    // cra-039: License compliance
    if (compliance.cra039_licensesCompliant) {
      requirementUpdates.push({
        requirementId: CRA_SBOM_REQUIREMENT_IDS.ossLicense,
        status: "compliant",
        notes: `[Auto-assessed via SBOM upload] ${compliance.cra039_details}`,
      });
    } else if (
      compliance.cra039_unknownLicenses.length > 0 &&
      compliance.cra039_unknownLicenses.length < analysis.componentCount
    ) {
      requirementUpdates.push({
        requirementId: CRA_SBOM_REQUIREMENT_IDS.ossLicense,
        status: "partial",
        notes: `[Auto-assessed via SBOM upload] ${compliance.cra039_details}`,
      });
    }

    // cra-040: Vulnerability tracking
    const trackablePercent =
      analysis.componentCount > 0
        ? (compliance.cra040_trackableComponents / analysis.componentCount) *
          100
        : 0;

    if (compliance.cra040_vulnerabilityTracking) {
      requirementUpdates.push({
        requirementId: CRA_SBOM_REQUIREMENT_IDS.vulnTracking,
        status: "compliant",
        notes: `[Auto-assessed via SBOM upload] ${compliance.cra040_details}`,
      });
    } else if (trackablePercent > 50) {
      requirementUpdates.push({
        requirementId: CRA_SBOM_REQUIREMENT_IDS.vulnTracking,
        status: "partial",
        notes: `[Auto-assessed via SBOM upload] ${compliance.cra040_details}`,
      });
    }

    // Apply requirement status updates
    for (const update of requirementUpdates) {
      await prisma.cRARequirementStatus.updateMany({
        where: {
          assessmentId,
          requirementId: update.requirementId,
        },
        data: {
          status: update.status,
          notes: update.notes,
        },
      });
    }

    // Recalculate maturity score
    const allReqs = await prisma.cRARequirementStatus.findMany({
      where: { assessmentId },
    });
    const total = allReqs.length;
    const compliant = allReqs.filter((r) => r.status === "compliant").length;
    const partial = allReqs.filter((r) => r.status === "partial").length;
    const newMaturityScore =
      total > 0 ? Math.round(((compliant + 0.5 * partial) / total) * 100) : 0;

    await prisma.cRAAssessment.update({
      where: { id: assessmentId },
      data: { maturityScore: newMaturityScore },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "cra_sbom_uploaded",
      entityType: "cra_assessment",
      entityId: assessmentId,
      newValue: {
        format: analysis.format,
        componentCount: analysis.componentCount,
        requirementUpdates: requirementUpdates.map((u) => ({
          id: u.requirementId,
          status: u.status,
        })),
      },
      description: `Uploaded ${analysis.format.toUpperCase()} SBOM with ${analysis.componentCount} components for "${assessment.productName}"`,
      ipAddress,
      userAgent,
    });

    // NEXUS Integration: sync SBOM components into dependency graph
    try {
      const { syncSBOMToNexus } =
        await import("@/lib/nexus/integrations/sbom-sync.server");
      await syncSBOMToNexus(
        assessmentId,
        analysis.components,
        assessment.organizationId || "",
        userId,
      );
    } catch (err) {
      logger.error("Failed to sync SBOM to NEXUS", err);
    }

    return createSuccessResponse({
      analysis: {
        format: analysis.format,
        specVersion: analysis.specVersion,
        componentCount: analysis.componentCount,
        licenses: analysis.licenses,
        openSourceCount: analysis.openSourceCount,
        proprietaryCount: analysis.proprietaryCount,
        hasKnownVulnerableComponents: analysis.hasKnownVulnerableComponents,
        vulnerableComponents: analysis.vulnerableComponents,
      },
      compliance,
      requirementUpdates: requirementUpdates.map((u) => ({
        requirementId: u.requirementId,
        status: u.status,
      })),
      maturityScore: newMaturityScore,
    });
  } catch (error) {
    logger.error("Error processing SBOM upload", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Failed to process SBOM"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// ─── GET: Fetch Latest SBOM Analysis ───

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    // Verify assessment belongs to user
    const assessment = await prisma.cRAAssessment.findFirst({
      where: { id: assessmentId, userId },
    });

    if (!assessment) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    // Resolve organization context
    const orgContext = await getCurrentOrganization(userId);
    const organizationId = orgContext?.organizationId;

    if (!organizationId) {
      return createSuccessResponse({ sbomAnalysis: null });
    }

    // Find latest SBOM evidence for this assessment
    const evidence = await prisma.complianceEvidence.findFirst({
      where: {
        organizationId,
        regulationType: "CYBERSECURITY",
        requirementId: `sbom:${assessmentId}`,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!evidence || !evidence.metadata) {
      return createSuccessResponse({ sbomAnalysis: null });
    }

    const metadata = evidence.metadata as Record<string, unknown>;
    if (metadata.type !== "sbom_analysis") {
      return createSuccessResponse({ sbomAnalysis: null });
    }

    return createSuccessResponse({
      sbomAnalysis: {
        analysis: metadata.analysis,
        compliance: metadata.compliance,
        uploadedAt: metadata.uploadedAt,
        evidenceId: evidence.id,
      },
    });
  } catch (error) {
    logger.error("Error fetching SBOM analysis", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Failed to fetch SBOM analysis"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
