/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * CRA Assessment Collection API
 *
 * GET  /api/cra — List all CRA assessments for the authenticated user
 * POST /api/cra — Create a new CRA assessment
 */

import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { decrypt, encrypt, isEncrypted } from "@/lib/encryption";
import {
  calculateCRACompliance,
  classifyCRAProduct,
} from "@/lib/cra-engine.server";
import {
  generateCRAAutoAssessments,
  generateNIS2PropagatedAssessments,
} from "@/lib/cra-auto-assessment.server";
import type { CRAAssessmentAnswers } from "@/lib/cra-types";
import { CRAAssessSchema } from "@/lib/validations/api-compliance";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

// GET /api/cra - Get all CRA assessments for user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;

    // Resolve organization context for multi-tenant scoping
    const orgContext = await getCurrentOrganization(userId);
    const where: Record<string, unknown> = { userId };
    if (orgContext?.organizationId) {
      where.organizationId = orgContext.organizationId;
    }

    const assessments = await prisma.cRAAssessment.findMany({
      where,
      include: {
        requirements: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Decrypt sensitive fields in requirements
    const decryptedAssessments = await Promise.all(
      assessments.map(async (assessment) => ({
        ...assessment,
        requirements: await Promise.all(
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
        ),
      })),
    );

    return createSuccessResponse({ assessments: decryptedAssessments });
  } catch (error) {
    logger.error("Error fetching CRA assessments", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// POST /api/cra - Create new CRA assessment
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;
    const body = await request.json();

    const parsed = CRAAssessSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    const data = parsed.data;

    // Build CRAAssessmentAnswers object from validated data
    const answers: CRAAssessmentAnswers = {
      economicOperatorRole: data.economicOperatorRole ?? "manufacturer",
      isEUEstablished: data.isEUEstablished ?? null,
      spaceProductTypeId: data.spaceProductTypeId ?? null,
      productName: data.productName ?? "Unnamed Product",
      productVersion: data.productVersion,
      hasNetworkFunction: data.hasNetworkFunction ?? null,
      processesAuthData: data.processesAuthData ?? null,
      usedInCriticalInfra: data.usedInCriticalInfra ?? null,
      performsCryptoOps: data.performsCryptoOps ?? null,
      controlsPhysicalSystem: data.controlsPhysicalSystem ?? null,
      hasMicrocontroller: data.hasMicrocontroller ?? null,
      isOSSComponent: data.isOSSComponent ?? null,
      isCommerciallySupplied: data.isCommerciallySupplied ?? null,
      segments: data.segments ?? ["space"],
      isSafetyCritical: data.isSafetyCritical ?? null,
      hasRedundancy: data.hasRedundancy ?? null,
      processesClassifiedData: data.processesClassifiedData ?? null,
      hasIEC62443: data.hasIEC62443 ?? null,
      hasETSIEN303645: data.hasETSIEN303645 ?? null,
      hasCommonCriteria: data.hasCommonCriteria ?? null,
      hasISO27001: data.hasISO27001 ?? null,
    };

    // Classify product
    const classification = classifyCRAProduct(answers);

    // Calculate full compliance result
    const complianceResult = await calculateCRACompliance(answers);

    // Resolve organization context for multi-tenant scoping
    const orgCtx = await getCurrentOrganization(userId);

    // Create assessment
    const assessment = await prisma.cRAAssessment.create({
      data: {
        userId,
        organizationId: orgCtx?.organizationId || null,
        productName: answers.productName,
        productVersion: answers.productVersion || null,
        spaceProductTypeId: answers.spaceProductTypeId,
        economicOperatorRole: answers.economicOperatorRole,
        productClassification: classification.classification,
        conformityRoute: classification.conformityRoute,
        classificationReasoning:
          classification.classificationReasoning as unknown as Prisma.InputJsonValue,
        classificationConflict:
          (classification.conflict as unknown as Prisma.InputJsonValue) ??
          Prisma.JsonNull,
        isOutOfScope: classification.isOutOfScope,
        outOfScopeReason: classification.outOfScopeReason || null,
        segments: JSON.stringify(answers.segments),
        hasNetworkFunction: answers.hasNetworkFunction,
        processesAuthData: answers.processesAuthData,
        usedInCriticalInfra: answers.usedInCriticalInfra,
        performsCryptoOps: answers.performsCryptoOps,
        controlsPhysicalSystem: answers.controlsPhysicalSystem,
        hasMicrocontroller: answers.hasMicrocontroller,
        isOSSComponent: answers.isOSSComponent,
        isCommerciallySupplied: answers.isCommerciallySupplied,
        isSafetyCritical: answers.isSafetyCritical,
        hasRedundancy: answers.hasRedundancy,
        processesClassifiedData: answers.processesClassifiedData,
        isEUEstablished: answers.isEUEstablished,
        hasIEC62443: answers.hasIEC62443,
        hasETSIEN303645: answers.hasETSIEN303645,
        hasCommonCriteria: answers.hasCommonCriteria,
        hasISO27001: answers.hasISO27001,
        complianceScore: 0,
        maturityScore: 0,
        nis2OverlapCount:
          complianceResult.nis2Overlap.overlappingRequirementCount,
      },
    });

    // Bulk-create requirement status entries for applicable requirements
    if (complianceResult.applicableRequirements.length > 0) {
      await prisma.cRARequirementStatus.createMany({
        data: complianceResult.applicableRequirements.map((req) => ({
          assessmentId: assessment.id,
          requirementId: req.id,
          status: "not_assessed",
        })),
      });

      // Auto-assess requirements based on existing certifications
      const autoAssessments = generateCRAAutoAssessments(
        complianceResult.applicableRequirements,
        answers,
      );

      // Batch auto-assess requirements (avoid N+1 sequential updates)
      const applicableAutos = autoAssessments.filter(
        (auto) => auto.suggestedStatus === "partial" && auto.reason,
      );

      let autoAssessedCount = 0;

      if (applicableAutos.length > 0) {
        const partialIds = applicableAutos.map((a) => a.requirementId);

        // Batch 1: Update status for all partial requirements at once
        const batchResult = await prisma.cRARequirementStatus.updateMany({
          where: {
            assessmentId: assessment.id,
            requirementId: { in: partialIds },
            status: "not_assessed",
          },
          data: { status: "partial" },
        });
        autoAssessedCount = batchResult.count;

        // Batch 2: Update notes individually (they differ per requirement)
        const autosWithReason = applicableAutos.filter((a) => a.reason);

        if (autosWithReason.length > 0) {
          // Encrypt all notes first, then build Prisma operations
          const encryptedNotes = await Promise.all(
            autosWithReason.map((a) => encrypt(a.reason!)),
          );
          const noteUpdates = autosWithReason.map((auto, idx) =>
            prisma.cRARequirementStatus.updateMany({
              where: {
                assessmentId: assessment.id,
                requirementId: auto.requirementId,
              },
              data: { notes: encryptedNotes[idx] },
            }),
          );
          await prisma.$transaction(noteUpdates);
        }
      }

      // Recalculate maturity score after auto-assessment
      if (autoAssessedCount > 0) {
        const updatedReqs = await prisma.cRARequirementStatus.findMany({
          where: { assessmentId: assessment.id },
        });
        const total = updatedReqs.length;
        const compliant = updatedReqs.filter(
          (r) => r.status === "compliant",
        ).length;
        const partial = updatedReqs.filter(
          (r) => r.status === "partial",
        ).length;
        const maturityScore =
          total > 0
            ? Math.round(((compliant + 0.5 * partial) / total) * 100)
            : 0;
        await prisma.cRAAssessment.update({
          where: { id: assessment.id },
          data: { maturityScore },
        });
      }

      // NIS2 Deep Propagation: If org has NIS2 assessments, propagate compliance
      const latestNIS2 = await prisma.nIS2Assessment.findFirst({
        where: {
          userId,
          ...(orgCtx?.organizationId
            ? { organizationId: orgCtx.organizationId }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (latestNIS2) {
        // Link CRA assessment to NIS2 assessment
        await prisma.cRAAssessment.update({
          where: { id: assessment.id },
          data: { nis2AssessmentId: latestNIS2.id },
        });

        // Deep propagation
        const nis2Propagated = await generateNIS2PropagatedAssessments(
          complianceResult.applicableRequirements,
          latestNIS2.id,
        );

        const propagatedPartials = nis2Propagated.filter(
          (a) => a.suggestedStatus === "partial" && a.reason,
        );

        if (propagatedPartials.length > 0) {
          const propagatedIds = propagatedPartials.map((a) => a.requirementId);

          // Update status for NIS2-propagated requirements
          await prisma.cRARequirementStatus.updateMany({
            where: {
              assessmentId: assessment.id,
              requirementId: { in: propagatedIds },
              status: "not_assessed", // Only update if not already auto-assessed
            },
            data: { status: "partial" },
          });

          // Update notes individually
          const propagatedWithReason = propagatedPartials.filter(
            (a) => a.reason,
          );

          if (propagatedWithReason.length > 0) {
            // Encrypt all notes first, then build Prisma operations
            const encryptedPropNotes = await Promise.all(
              propagatedWithReason.map((a) => encrypt(a.reason!)),
            );
            const noteUpdates = propagatedWithReason.map((auto, idx) =>
              prisma.cRARequirementStatus.updateMany({
                where: {
                  assessmentId: assessment.id,
                  requirementId: auto.requirementId,
                },
                data: { notes: encryptedPropNotes[idx] },
              }),
            );
            await prisma.$transaction(noteUpdates);
          }
        }
      }
    }

    // Fetch with requirements
    const assessmentWithRequirements = await prisma.cRAAssessment.findUnique({
      where: { id: assessment.id },
      include: { requirements: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "cra_assessment_created",
      entityType: "cra_assessment",
      entityId: assessment.id,
      newValue: {
        productClassification: classification.classification,
        conformityRoute: classification.conformityRoute,
        productName: answers.productName,
        applicableRequirements: complianceResult.applicableRequirements.length,
        nis2OverlapCount:
          complianceResult.nis2Overlap.overlappingRequirementCount,
      },
      description: `Created CRA assessment for "${answers.productName}" (${classification.classification} product)`,
      ipAddress,
      userAgent,
    });

    // NEXUS Integration: link CRA assessment to matching NEXUS asset
    try {
      const { linkCRAAssessmentToNexus } =
        await import("@/lib/nexus/integrations/cra-sync.server");
      await linkCRAAssessmentToNexus(
        assessment.id,
        answers.spaceProductTypeId,
        answers.productName,
        orgCtx?.organizationId || "",
      );
    } catch (err) {
      logger.error("Failed to link CRA assessment to NEXUS", err);
    }

    // Decrypt sensitive fields in requirements for response
    const decryptedAssessment = assessmentWithRequirements
      ? {
          ...assessmentWithRequirements,
          requirements: await Promise.all(
            assessmentWithRequirements.requirements.map(async (req) => ({
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
          ),
        }
      : null;

    return createSuccessResponse({
      assessment: decryptedAssessment,
      productClassification: classification.classification,
      conformityRoute: classification.conformityRoute,
      classificationReasoning: classification.classificationReasoning,
      applicableRequirements: complianceResult.applicableRequirements.map(
        (r) => r.id,
      ),
    });
  } catch (error) {
    logger.error("Error creating CRA assessment", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
