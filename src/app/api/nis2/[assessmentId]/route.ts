/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * NIS2 Single Assessment API
 *
 * GET    /api/nis2/[assessmentId] — Get assessment details
 * PATCH  /api/nis2/[assessmentId] — Update assessment profile
 * DELETE /api/nis2/[assessmentId] — Delete assessment
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { decrypt, isEncrypted } from "@/lib/encryption";
import {
  calculateNIS2Compliance,
  classifyNIS2Entity,
} from "@/lib/nis2-engine.server";
import {
  generateAutoAssessments,
  generateRecommendations,
} from "@/lib/nis2-auto-assessment.server";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

// GET /api/nis2/[assessmentId] - Get assessment details with requirement metadata
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

    const assessment = await prisma.nIS2Assessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        requirements: true,
      },
    });

    if (!assessment) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    // Enrich requirements with metadata from the data file (title, article, category, etc.)
    // This data is server-only and cannot be loaded on the client.
    let requirementMeta: Record<
      string,
      {
        title: string;
        articleRef: string;
        category: string;
        severity: string;
        complianceQuestion: string;
        description: string;
        spaceSpecificGuidance: string;
        tips: string[];
        evidenceRequired: string[];
        euSpaceActRef?: string;
        iso27001Ref?: string;
        canBeSimplified?: boolean;
        implementationTimeWeeks?: number;
      }
    > = {};

    try {
      const { NIS2_REQUIREMENTS } = await import("@/data/nis2-requirements");
      const metaMap: typeof requirementMeta = {};
      for (const req of NIS2_REQUIREMENTS) {
        metaMap[req.id] = {
          title: req.title,
          articleRef: req.articleRef,
          category: req.category,
          severity: req.severity,
          complianceQuestion: req.complianceQuestion,
          description: req.description,
          spaceSpecificGuidance: req.spaceSpecificGuidance,
          tips: req.tips,
          evidenceRequired: req.evidenceRequired,
          euSpaceActRef: req.euSpaceActRef,
          iso27001Ref: req.iso27001Ref,
          canBeSimplified: req.canBeSimplified,
          implementationTimeWeeks: req.implementationTimeWeeks,
        };
      }
      requirementMeta = metaMap;
    } catch {
      // If requirements data file fails to load, return without enrichment
    }

    // Decrypt sensitive fields in requirements
    const decryptedRequirements = await Promise.all(
      assessment.requirements.map(async (req) => ({
        ...req,
        notes:
          req.notes && isEncrypted(req.notes)
            ? await decrypt(req.notes)
            : req.notes,
        evidenceNotes:
          req.evidenceNotes && isEncrypted(req.evidenceNotes)
            ? await decrypt(req.evidenceNotes)
            : req.evidenceNotes,
      })),
    );

    // Generate smart recommendations & gap analysis
    let recommendations = null;
    try {
      recommendations = generateRecommendations(
        {
          hasISO27001: assessment.hasISO27001,
          hasExistingCSIRT: assessment.hasExistingCSIRT,
          hasRiskManagement: assessment.hasRiskManagement,
          operatesGroundInfra: assessment.operatesGroundInfra,
          operatesSatComms: assessment.operatesSatComms,
          organizationSize: assessment.organizationSize,
          entityClassification: assessment.entityClassification,
          subSector: assessment.subSector,
        },
        decryptedRequirements.map((r) => ({
          requirementId: r.requirementId,
          status: r.status,
          notes: r.notes,
        })),
        requirementMeta,
      );
    } catch (recError) {
      logger.error("Error generating recommendations", recError);
    }

    const decryptedAssessment = {
      ...assessment,
      requirements: decryptedRequirements,
    };

    return createSuccessResponse({
      assessment: decryptedAssessment,
      requirementMeta,
      recommendations,
    });
  } catch (error) {
    logger.error("Error fetching NIS2 assessment", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// PATCH /api/nis2/[assessmentId] - Update assessment profile
export async function PATCH(
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
    const body = await request.json();

    const patchSchema = z.object({
      assessmentName: z.string().optional(),
      sector: z
        .enum([
          "space",
          "energy",
          "transport",
          "banking",
          "financial_market",
          "health",
          "drinking_water",
          "waste_water",
          "digital_infrastructure",
          "ict_service_management",
        ])
        .optional(),
      subSector: z
        .enum([
          "ground_infrastructure",
          "satellite_communications",
          "spacecraft_manufacturing",
          "launch_services",
          "earth_observation",
          "navigation",
          "space_situational_awareness",
        ])
        .nullable()
        .optional(),
      organizationSize: z
        .enum(["micro", "small", "medium", "large"])
        .optional(),
      employeeCount: z.number().nullable().optional(),
      annualRevenue: z.number().nullable().optional(),
      memberStateCount: z.number().int().min(0).max(27).optional(),
      operatesGroundInfra: z.boolean().optional(),
      operatesSatComms: z.boolean().optional(),
      manufacturesSpacecraft: z.boolean().optional(),
      providesLaunchServices: z.boolean().optional(),
      providesEOData: z.boolean().optional(),
      hasISO27001: z.boolean().optional(),
      hasExistingCSIRT: z.boolean().optional(),
      hasRiskManagement: z.boolean().optional(),
      isEUEstablished: z.boolean().optional(),
      maturityScore: z.number().min(0).max(100).optional(),
    });

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    // Verify ownership
    const existing = await prisma.nIS2Assessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!existing) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.assessmentName !== undefined)
      updateData.assessmentName = data.assessmentName;
    if (data.sector !== undefined) updateData.sector = data.sector;
    if (data.subSector !== undefined) updateData.subSector = data.subSector;
    if (data.organizationSize !== undefined)
      updateData.organizationSize = data.organizationSize;
    if (data.employeeCount !== undefined)
      updateData.employeeCount = data.employeeCount;
    if (data.annualRevenue !== undefined)
      updateData.annualRevenue = data.annualRevenue;
    if (data.memberStateCount !== undefined)
      updateData.memberStateCount = data.memberStateCount;
    if (data.operatesGroundInfra !== undefined)
      updateData.operatesGroundInfra = data.operatesGroundInfra;
    if (data.operatesSatComms !== undefined)
      updateData.operatesSatComms = data.operatesSatComms;
    if (data.manufacturesSpacecraft !== undefined)
      updateData.manufacturesSpacecraft = data.manufacturesSpacecraft;
    if (data.providesLaunchServices !== undefined)
      updateData.providesLaunchServices = data.providesLaunchServices;
    if (data.providesEOData !== undefined)
      updateData.providesEOData = data.providesEOData;
    if (data.hasISO27001 !== undefined)
      updateData.hasISO27001 = data.hasISO27001;
    if (data.hasExistingCSIRT !== undefined)
      updateData.hasExistingCSIRT = data.hasExistingCSIRT;
    if (data.hasRiskManagement !== undefined)
      updateData.hasRiskManagement = data.hasRiskManagement;
    if (data.maturityScore !== undefined)
      updateData.maturityScore = data.maturityScore;

    // Recalculate classification if profile fields changed
    const profileFields = [
      "sector",
      "subSector",
      "organizationSize",
      "operatesGroundInfra",
      "operatesSatComms",
      "isEUEstablished",
    ] as const;
    const profileChanged = profileFields.some((f) => data[f] !== undefined);

    if (profileChanged) {
      // Build new answers from merged existing + new data
      const answers: NIS2AssessmentAnswers = {
        sector: (data.sector ||
          existing.sector) as NIS2AssessmentAnswers["sector"],
        spaceSubSector: (data.subSector ??
          existing.subSector ??
          null) as NIS2AssessmentAnswers["spaceSubSector"],
        operatesGroundInfra:
          data.operatesGroundInfra ?? existing.operatesGroundInfra,
        operatesSatComms: data.operatesSatComms ?? existing.operatesSatComms,
        manufacturesSpacecraft:
          data.manufacturesSpacecraft ?? existing.manufacturesSpacecraft,
        providesLaunchServices:
          data.providesLaunchServices ?? existing.providesLaunchServices,
        providesEOData: data.providesEOData ?? existing.providesEOData,
        entitySize: (data.organizationSize ||
          existing.organizationSize) as NIS2AssessmentAnswers["entitySize"],
        employeeCount: data.employeeCount ?? existing.employeeCount ?? null,
        annualRevenue: data.annualRevenue ?? existing.annualRevenue ?? null,
        memberStateCount: data.memberStateCount ?? existing.memberStateCount,
        isEUEstablished: true, // Must be EU-established to be in scope
        offersServicesInEU: true, // EU-established entities serve EU by definition
        designatedByMemberState: null,
        providesDigitalInfrastructure: null,
        euControlledEntity: null,
        hasISO27001: data.hasISO27001 ?? existing.hasISO27001,
        hasExistingCSIRT: data.hasExistingCSIRT ?? existing.hasExistingCSIRT,
        hasRiskManagement: data.hasRiskManagement ?? existing.hasRiskManagement,
      };

      // Reclassify
      const classification = classifyNIS2Entity(answers);
      updateData.entityClassification = classification.classification;
      updateData.classificationReason = classification.reason;

      // Recalculate compliance for updated requirements
      const complianceResult = await calculateNIS2Compliance(answers);
      updateData.euSpaceActOverlapCount =
        complianceResult.euSpaceActOverlap.count;
      updateData.riskLevel =
        classification.classification === "essential"
          ? "high"
          : classification.classification === "important"
            ? "medium"
            : "low";

      // Update applicable requirements
      const existingReqs = await prisma.nIS2RequirementStatus.findMany({
        where: { assessmentId },
      });

      const existingReqIds = new Set(existingReqs.map((r) => r.requirementId));
      const applicableReqIds = new Set(
        complianceResult.applicableRequirements.map((r) => r.id),
      );

      // Add new requirements
      const toAdd = complianceResult.applicableRequirements.filter(
        (r) => !existingReqIds.has(r.id),
      );
      if (toAdd.length > 0) {
        await prisma.nIS2RequirementStatus.createMany({
          data: toAdd.map((r) => ({
            assessmentId,
            requirementId: r.id,
            status: "not_assessed",
          })),
        });

        // Auto-assess newly added requirements based on updated answers
        // Batch all auto-assessment updates in parallel (avoid N+1)
        const autoAssessments = generateAutoAssessments(toAdd, answers);
        const autoUpdates = autoAssessments
          .filter((auto) => auto.suggestedStatus === "partial" && auto.reason)
          .map((auto) =>
            prisma.nIS2RequirementStatus.updateMany({
              where: {
                assessmentId,
                requirementId: auto.requirementId,
                status: "not_assessed",
              },
              data: {
                status: auto.suggestedStatus,
                notes: auto.reason,
              },
            }),
          );
        await Promise.all(autoUpdates);
      }

      // Also auto-assess existing requirements that are still "not_assessed"
      // (e.g., user re-ran wizard with new ISO 27001 certification)
      const existingNotAssessed = existingReqs.filter(
        (r) =>
          r.status === "not_assessed" && applicableReqIds.has(r.requirementId),
      );
      if (existingNotAssessed.length > 0) {
        const existingApplicable =
          complianceResult.applicableRequirements.filter((r) =>
            existingNotAssessed.some((er) => er.requirementId === r.id),
          );
        const autoForExisting = generateAutoAssessments(
          existingApplicable,
          answers,
        );
        // Batch all existing auto-assessment updates in parallel (avoid N+1)
        const existingAutoUpdates = autoForExisting
          .filter((auto) => auto.suggestedStatus === "partial" && auto.reason)
          .map((auto) =>
            prisma.nIS2RequirementStatus.updateMany({
              where: {
                assessmentId,
                requirementId: auto.requirementId,
                status: "not_assessed",
              },
              data: {
                status: auto.suggestedStatus,
                notes: auto.reason,
              },
            }),
          );
        await Promise.all(existingAutoUpdates);
      }

      // Recalculate maturity score
      const allReqs = await prisma.nIS2RequirementStatus.findMany({
        where: { assessmentId },
      });
      const total = allReqs.length;
      const compliant = allReqs.filter((r) => r.status === "compliant").length;
      const partial = allReqs.filter((r) => r.status === "partial").length;
      updateData.maturityScore =
        total > 0 ? Math.round(((compliant + 0.5 * partial) / total) * 100) : 0;

      // Remove requirements that are no longer applicable
      const toRemove = existingReqs.filter(
        (r) => !applicableReqIds.has(r.requirementId),
      );
      if (toRemove.length > 0) {
        await prisma.nIS2RequirementStatus.deleteMany({
          where: {
            id: { in: toRemove.map((r) => r.id) },
          },
        });
      }
    }

    const updated = await prisma.nIS2Assessment.update({
      where: { id: assessmentId },
      data: updateData,
      include: { requirements: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "nis2_assessment_updated",
      entityType: "nis2_assessment",
      entityId: assessmentId,
      previousValue: { ...existing },
      newValue: data,
      description: "Updated NIS2 assessment profile",
      ipAddress,
      userAgent,
    });

    // Decrypt sensitive fields in requirements for response
    const decryptedUpdatedRequirements = await Promise.all(
      updated.requirements.map(async (req) => ({
        ...req,
        notes:
          req.notes && isEncrypted(req.notes)
            ? await decrypt(req.notes)
            : req.notes,
        evidenceNotes:
          req.evidenceNotes && isEncrypted(req.evidenceNotes)
            ? await decrypt(req.evidenceNotes)
            : req.evidenceNotes,
      })),
    );

    return createSuccessResponse({
      assessment: {
        ...updated,
        requirements: decryptedUpdatedRequirements,
      },
    });
  } catch (error) {
    logger.error("Error updating NIS2 assessment", error);
    return createErrorResponse(
      "Internal server error",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// DELETE /api/nis2/[assessmentId] - Delete assessment
export async function DELETE(
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

    // Verify ownership
    const existing = await prisma.nIS2Assessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!existing) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    // Delete (cascades to requirements)
    await prisma.nIS2Assessment.delete({
      where: { id: assessmentId },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "nis2_assessment_deleted",
      entityType: "nis2_assessment",
      entityId: assessmentId,
      previousValue: {
        deleted: true,
        assessmentName: existing.assessmentName,
      },
      description: "Deleted NIS2 assessment",
      ipAddress,
      userAgent,
    });

    return createSuccessResponse({ success: true });
  } catch (error) {
    logger.error("Error deleting NIS2 assessment", error);
    return createErrorResponse(
      "Internal server error",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
