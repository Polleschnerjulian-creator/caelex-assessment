/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * CRA Single Assessment API
 *
 * GET    /api/cra/[assessmentId] — Get assessment details
 * PATCH  /api/cra/[assessmentId] — Update assessment profile
 * DELETE /api/cra/[assessmentId] — Delete assessment
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { decrypt, isEncrypted } from "@/lib/encryption";
import {
  calculateCRACompliance,
  classifyCRAProduct,
} from "@/lib/cra-engine.server";
import { generateCRAAutoAssessments } from "@/lib/cra-auto-assessment.server";
import type {
  CRAAssessmentAnswers,
  SpaceProductSegment,
} from "@/lib/cra-types";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

// GET /api/cra/[assessmentId] - Get assessment details with requirement metadata
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

    const assessment = await prisma.cRAAssessment.findFirst({
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

    // Enrich requirements with metadata from the CRA requirements data file
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
        implementationTimeWeeks: number;
        canBeSimplified: boolean;
        nis2Ref?: string;
        iso27001Ref?: string;
        iec62443Ref?: string;
        ecssRef?: string;
      }
    > = {};

    try {
      const { CRA_REQUIREMENTS } = await import("@/data/cra-requirements");
      const metaMap: typeof requirementMeta = {};
      for (const req of CRA_REQUIREMENTS) {
        metaMap[req.id] = {
          title: req.title,
          articleRef: req.articleRef,
          category: req.category,
          severity: req.severity,
          complianceQuestion: req.complianceQuestion,
          description: req.description,
          spaceSpecificGuidance: req.spaceSpecificGuidance,
          implementationTimeWeeks: req.implementationTimeWeeks,
          canBeSimplified: req.canBeSimplified,
          nis2Ref: req.nis2Ref,
          iso27001Ref: req.iso27001Ref,
          iec62443Ref: req.iec62443Ref,
          ecssRef: req.ecssRef,
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

    const decryptedAssessment = {
      ...assessment,
      requirements: decryptedRequirements,
    };

    return createSuccessResponse({
      assessment: decryptedAssessment,
      requirementMeta,
    });
  } catch (error) {
    logger.error("Error fetching CRA assessment", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// PATCH /api/cra/[assessmentId] - Update assessment profile
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
      productName: z.string().min(1).max(200).optional(),
      productVersion: z.string().max(50).optional(),
      spaceProductTypeId: z.string().nullable().optional(),
      economicOperatorRole: z
        .enum(["manufacturer", "importer", "distributor"])
        .optional(),
      segments: z.array(z.enum(["space", "ground", "link", "user"])).optional(),
      hasNetworkFunction: z.boolean().nullable().optional(),
      processesAuthData: z.boolean().nullable().optional(),
      usedInCriticalInfra: z.boolean().nullable().optional(),
      performsCryptoOps: z.boolean().nullable().optional(),
      controlsPhysicalSystem: z.boolean().nullable().optional(),
      hasMicrocontroller: z.boolean().nullable().optional(),
      isOSSComponent: z.boolean().nullable().optional(),
      isCommerciallySupplied: z.boolean().nullable().optional(),
      isSafetyCritical: z.boolean().nullable().optional(),
      hasRedundancy: z.boolean().nullable().optional(),
      processesClassifiedData: z.boolean().nullable().optional(),
      isEUEstablished: z.boolean().nullable().optional(),
      hasIEC62443: z.boolean().nullable().optional(),
      hasETSIEN303645: z.boolean().nullable().optional(),
      hasCommonCriteria: z.boolean().nullable().optional(),
      hasISO27001: z.boolean().nullable().optional(),
      maturityScore: z.number().min(0).max(100).optional(),
    });

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    // Verify ownership
    const existing = await prisma.cRAAssessment.findFirst({
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

    if (data.productName !== undefined)
      updateData.productName = data.productName;
    if (data.productVersion !== undefined)
      updateData.productVersion = data.productVersion;
    if (data.spaceProductTypeId !== undefined)
      updateData.spaceProductTypeId = data.spaceProductTypeId;
    if (data.economicOperatorRole !== undefined)
      updateData.economicOperatorRole = data.economicOperatorRole;
    if (data.segments !== undefined)
      updateData.segments = JSON.stringify(data.segments);
    if (data.hasNetworkFunction !== undefined)
      updateData.hasNetworkFunction = data.hasNetworkFunction;
    if (data.processesAuthData !== undefined)
      updateData.processesAuthData = data.processesAuthData;
    if (data.usedInCriticalInfra !== undefined)
      updateData.usedInCriticalInfra = data.usedInCriticalInfra;
    if (data.performsCryptoOps !== undefined)
      updateData.performsCryptoOps = data.performsCryptoOps;
    if (data.controlsPhysicalSystem !== undefined)
      updateData.controlsPhysicalSystem = data.controlsPhysicalSystem;
    if (data.hasMicrocontroller !== undefined)
      updateData.hasMicrocontroller = data.hasMicrocontroller;
    if (data.isOSSComponent !== undefined)
      updateData.isOSSComponent = data.isOSSComponent;
    if (data.isCommerciallySupplied !== undefined)
      updateData.isCommerciallySupplied = data.isCommerciallySupplied;
    if (data.isSafetyCritical !== undefined)
      updateData.isSafetyCritical = data.isSafetyCritical;
    if (data.hasRedundancy !== undefined)
      updateData.hasRedundancy = data.hasRedundancy;
    if (data.processesClassifiedData !== undefined)
      updateData.processesClassifiedData = data.processesClassifiedData;
    if (data.isEUEstablished !== undefined)
      updateData.isEUEstablished = data.isEUEstablished;
    if (data.hasIEC62443 !== undefined)
      updateData.hasIEC62443 = data.hasIEC62443;
    if (data.hasETSIEN303645 !== undefined)
      updateData.hasETSIEN303645 = data.hasETSIEN303645;
    if (data.hasCommonCriteria !== undefined)
      updateData.hasCommonCriteria = data.hasCommonCriteria;
    if (data.hasISO27001 !== undefined)
      updateData.hasISO27001 = data.hasISO27001;
    if (data.maturityScore !== undefined)
      updateData.maturityScore = data.maturityScore;

    // Recalculate classification if profile fields changed
    const profileFields = [
      "spaceProductTypeId",
      "economicOperatorRole",
      "segments",
      "hasNetworkFunction",
      "processesAuthData",
      "usedInCriticalInfra",
      "performsCryptoOps",
      "controlsPhysicalSystem",
      "hasMicrocontroller",
      "isOSSComponent",
      "isCommerciallySupplied",
      "isSafetyCritical",
      "isEUEstablished",
    ] as const;
    const profileChanged = profileFields.some((f) => data[f] !== undefined);

    if (profileChanged) {
      // Build new answers from merged existing + new data
      const existingSegments: SpaceProductSegment[] = (() => {
        try {
          return JSON.parse(existing.segments) as SpaceProductSegment[];
        } catch {
          return ["space"] as SpaceProductSegment[];
        }
      })();

      const answers: CRAAssessmentAnswers = {
        economicOperatorRole: (data.economicOperatorRole ??
          existing.economicOperatorRole) as CRAAssessmentAnswers["economicOperatorRole"],
        isEUEstablished:
          data.isEUEstablished ?? existing.isEUEstablished ?? null,
        spaceProductTypeId:
          data.spaceProductTypeId ?? existing.spaceProductTypeId ?? null,
        productName: data.productName ?? existing.productName,
        productVersion:
          data.productVersion ?? existing.productVersion ?? undefined,
        hasNetworkFunction:
          data.hasNetworkFunction ?? existing.hasNetworkFunction ?? null,
        processesAuthData:
          data.processesAuthData ?? existing.processesAuthData ?? null,
        usedInCriticalInfra:
          data.usedInCriticalInfra ?? existing.usedInCriticalInfra ?? null,
        performsCryptoOps:
          data.performsCryptoOps ?? existing.performsCryptoOps ?? null,
        controlsPhysicalSystem:
          data.controlsPhysicalSystem ??
          existing.controlsPhysicalSystem ??
          null,
        hasMicrocontroller:
          data.hasMicrocontroller ?? existing.hasMicrocontroller ?? null,
        isOSSComponent: data.isOSSComponent ?? existing.isOSSComponent ?? null,
        isCommerciallySupplied:
          data.isCommerciallySupplied ??
          existing.isCommerciallySupplied ??
          null,
        segments: data.segments ?? existingSegments,
        isSafetyCritical:
          data.isSafetyCritical ?? existing.isSafetyCritical ?? null,
        hasRedundancy: data.hasRedundancy ?? existing.hasRedundancy ?? null,
        processesClassifiedData:
          data.processesClassifiedData ??
          existing.processesClassifiedData ??
          null,
        hasIEC62443: data.hasIEC62443 ?? existing.hasIEC62443 ?? null,
        hasETSIEN303645:
          data.hasETSIEN303645 ?? existing.hasETSIEN303645 ?? null,
        hasCommonCriteria:
          data.hasCommonCriteria ?? existing.hasCommonCriteria ?? null,
        hasISO27001: data.hasISO27001 ?? existing.hasISO27001 ?? null,
      };

      // Reclassify
      const classification = classifyCRAProduct(answers);
      updateData.productClassification = classification.classification;
      updateData.conformityRoute = classification.conformityRoute;
      updateData.classificationReasoning =
        classification.classificationReasoning;
      updateData.classificationConflict = classification.conflict ?? null;
      updateData.isOutOfScope = classification.isOutOfScope;
      updateData.outOfScopeReason = classification.outOfScopeReason || null;

      // Recalculate compliance for updated requirements
      const complianceResult = await calculateCRACompliance(answers);
      updateData.nis2OverlapCount =
        complianceResult.nis2Overlap.overlappingRequirementCount;

      // Update applicable requirements
      const existingReqs = await prisma.cRARequirementStatus.findMany({
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
        await prisma.cRARequirementStatus.createMany({
          data: toAdd.map((r) => ({
            assessmentId,
            requirementId: r.id,
            status: "not_assessed",
          })),
        });

        // Auto-assess newly added requirements
        const autoAssessments = generateCRAAutoAssessments(toAdd, answers);
        const autoUpdates = autoAssessments
          .filter((auto) => auto.suggestedStatus === "partial" && auto.reason)
          .map((auto) =>
            prisma.cRARequirementStatus.updateMany({
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
      // (e.g., user re-ran wizard with new certifications)
      const existingNotAssessed = existingReqs.filter(
        (r) =>
          r.status === "not_assessed" && applicableReqIds.has(r.requirementId),
      );
      if (existingNotAssessed.length > 0) {
        const existingApplicable =
          complianceResult.applicableRequirements.filter((r) =>
            existingNotAssessed.some((er) => er.requirementId === r.id),
          );
        const autoForExisting = generateCRAAutoAssessments(
          existingApplicable,
          answers,
        );
        const existingAutoUpdates = autoForExisting
          .filter((auto) => auto.suggestedStatus === "partial" && auto.reason)
          .map((auto) =>
            prisma.cRARequirementStatus.updateMany({
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
      const allReqs = await prisma.cRARequirementStatus.findMany({
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
        await prisma.cRARequirementStatus.deleteMany({
          where: {
            id: { in: toRemove.map((r) => r.id) },
          },
        });
      }
    }

    const updated = await prisma.cRAAssessment.update({
      where: { id: assessmentId },
      data: updateData,
      include: { requirements: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "cra_assessment_updated",
      entityType: "cra_assessment",
      entityId: assessmentId,
      previousValue: { ...existing },
      newValue: data,
      description: "Updated CRA assessment profile",
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
    logger.error("Error updating CRA assessment", error);
    return createErrorResponse(
      "Internal server error",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// DELETE /api/cra/[assessmentId] - Delete assessment
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
    const existing = await prisma.cRAAssessment.findFirst({
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
    await prisma.cRAAssessment.delete({
      where: { id: assessmentId },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "cra_assessment_deleted",
      entityType: "cra_assessment",
      entityId: assessmentId,
      previousValue: {
        deleted: true,
        productName: existing.productName,
      },
      description: "Deleted CRA assessment",
      ipAddress,
      userAgent,
    });

    return createSuccessResponse({ success: true });
  } catch (error) {
    logger.error("Error deleting CRA assessment", error);
    return createErrorResponse(
      "Internal server error",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
