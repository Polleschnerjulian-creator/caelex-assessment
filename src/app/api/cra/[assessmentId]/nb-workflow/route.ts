/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * CRA Notified Body Workflow API
 *
 * GET   /api/cra/[assessmentId]/nb-workflow — Get current NB workflow state + document checklist
 * POST  /api/cra/[assessmentId]/nb-workflow — Initialize NB workflow (creates workflow record)
 * PATCH /api/cra/[assessmentId]/nb-workflow — Update workflow state, document status, or add communication
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  createInitialNBWorkflowData,
  requiresNBWorkflow,
  isNBMandatory,
  notifiedBodyWorkflowDefinition,
} from "@/lib/workflow/definitions/notified-body";
import type {
  NBWorkflowData,
  NBWorkflowState,
} from "@/lib/workflow/definitions/notified-body";

// ─── Constants ───

const NB_EVIDENCE_TITLE = "CRA Notified Body Workflow State";
const NB_REQUIREMENT_ID = "nb-workflow";

// ─── Helpers ───

/**
 * Find the ComplianceEvidence record storing the NB workflow state.
 */
async function findNBWorkflowRecord(
  assessmentId: string,
  organizationId: string,
) {
  return prisma.complianceEvidence.findFirst({
    where: {
      organizationId,
      evidenceType: "OTHER",
      requirementId: `${NB_REQUIREMENT_ID}:${assessmentId}`,
      title: NB_EVIDENCE_TITLE,
    },
  });
}

/**
 * Verify the user owns the CRA assessment and resolve org context.
 */
async function verifyAssessmentAccess(userId: string, assessmentId: string) {
  const orgContext = await getCurrentOrganization(userId);

  const assessment = await prisma.cRAAssessment.findFirst({
    where: {
      id: assessmentId,
      userId,
    },
  });

  if (!assessment) return null;

  return {
    assessment,
    organizationId: orgContext?.organizationId || assessment.organizationId,
  };
}

// ─── GET ───

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

    const access = await verifyAssessmentAccess(userId, assessmentId);
    if (!access) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    const { assessment, organizationId } = access;

    // Check if NB workflow is applicable
    const applicable = requiresNBWorkflow(
      assessment.productClassification,
      assessment.conformityRoute,
    );

    if (!applicable) {
      return createSuccessResponse({
        applicable: false,
        mandatory: false,
        workflow: null,
        message:
          "Notified-Body-Workflow ist für dieses Produkt nicht erforderlich",
      });
    }

    const mandatory = isNBMandatory(assessment.productClassification);

    // Look for existing workflow record
    if (!organizationId) {
      return createSuccessResponse({
        applicable: true,
        mandatory,
        workflow: null,
        initialized: false,
        message:
          "Organisation erforderlich — bitte zuerst einer Organisation beitreten",
      });
    }

    const record = await findNBWorkflowRecord(assessmentId, organizationId);

    if (!record) {
      return createSuccessResponse({
        applicable: true,
        mandatory,
        workflow: null,
        initialized: false,
      });
    }

    const workflowData = record.metadata as unknown as NBWorkflowData;

    // Calculate document progress
    const mandatoryDocs = workflowData.documents.filter((d) => d.mandatory);
    const uploadedMandatory = mandatoryDocs.filter(
      (d) => d.status !== "missing",
    );

    return createSuccessResponse({
      applicable: true,
      mandatory,
      initialized: true,
      workflow: {
        ...workflowData,
        evidenceId: record.id,
      },
      progress: {
        mandatoryTotal: mandatoryDocs.length,
        mandatoryUploaded: uploadedMandatory.length,
        allMandatoryReady: uploadedMandatory.length === mandatoryDocs.length,
      },
    });
  } catch (error) {
    logger.error("Error fetching NB workflow", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// ─── POST ───

export async function POST(
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

    const access = await verifyAssessmentAccess(userId, assessmentId);
    if (!access) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    const { assessment, organizationId } = access;

    if (!organizationId) {
      return createErrorResponse(
        "Organisation erforderlich",
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    // Check if NB workflow is applicable
    if (
      !requiresNBWorkflow(
        assessment.productClassification,
        assessment.conformityRoute,
      )
    ) {
      return createErrorResponse(
        "Notified-Body-Workflow ist für dieses Produkt nicht anwendbar",
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    // Check if already initialized
    const existing = await findNBWorkflowRecord(assessmentId, organizationId);
    if (existing) {
      return createErrorResponse(
        "Notified-Body-Workflow wurde bereits initialisiert",
        ErrorCode.CONFLICT,
        409,
      );
    }

    // Create initial workflow data
    const workflowData = createInitialNBWorkflowData();

    // Optionally read body for NB details
    let notifiedBodyName: string | undefined;
    let notifiedBodyId: string | undefined;
    try {
      const body = await request.json();
      notifiedBodyName = body.notifiedBodyName;
      notifiedBodyId = body.notifiedBodyId;
    } catch {
      // No body provided — that's fine
    }

    if (notifiedBodyName) workflowData.notifiedBodyName = notifiedBodyName;
    if (notifiedBodyId) workflowData.notifiedBodyId = notifiedBodyId;

    // Store as ComplianceEvidence with evidenceType OTHER
    const evidence = await prisma.complianceEvidence.create({
      data: {
        organizationId,
        createdBy: userId,
        regulationType: "CYBERSECURITY",
        requirementId: `${NB_REQUIREMENT_ID}:${assessmentId}`,
        title: NB_EVIDENCE_TITLE,
        description: `Notified-Body-Workflow für CRA-Assessment "${assessment.productName}"`,
        evidenceType: "OTHER",
        status: "DRAFT",
        sourceType: "MANUAL",
        metadata: JSON.parse(JSON.stringify(workflowData)),
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "nb_workflow_initialized",
      entityType: "cra_assessment",
      entityId: assessmentId,
      newValue: {
        evidenceId: evidence.id,
        productClassification: assessment.productClassification,
        mandatory: isNBMandatory(assessment.productClassification),
        notifiedBodyName,
        notifiedBodyId,
      },
      description: `Notified-Body-Workflow für "${assessment.productName}" initialisiert`,
      ipAddress,
      userAgent,
    });

    return createSuccessResponse(
      {
        initialized: true,
        evidenceId: evidence.id,
        workflow: workflowData,
      },
      201,
    );
  } catch (error) {
    logger.error("Error initializing NB workflow", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// ─── PATCH ───

const PatchSchema = z
  .object({
    // State transition
    transition: z
      .enum([
        "start",
        "documents_complete",
        "submit",
        "incomplete",
        "acknowledge",
        "request_info",
        "provide_info",
        "approve",
        "reject",
        "resubmit",
      ])
      .optional(),
    transitionNote: z.string().max(500).optional(),

    // Document status update
    documentUpdate: z
      .object({
        documentId: z.string(),
        status: z.enum(["missing", "uploaded", "accepted", "rejected"]),
        linkedDocumentId: z.string().optional(),
      })
      .optional(),

    // Add communication entry
    communication: z
      .object({
        direction: z.enum(["outbound", "inbound"]),
        subject: z.string().min(1).max(200),
        summary: z.string().min(1).max(2000),
      })
      .optional(),

    // NB details update
    notifiedBodyName: z.string().max(200).optional(),
    notifiedBodyId: z.string().max(50).optional(),
    submissionDate: z.string().optional(),
    expectedResponseDate: z.string().optional(),
  })
  .refine(
    (data) =>
      data.transition ||
      data.documentUpdate ||
      data.communication ||
      data.notifiedBodyName ||
      data.notifiedBodyId ||
      data.submissionDate ||
      data.expectedResponseDate,
    {
      message:
        "Mindestens ein Update-Feld muss angegeben werden (transition, documentUpdate, communication oder NB-Details)",
    },
  );

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

    const access = await verifyAssessmentAccess(userId, assessmentId);
    if (!access) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    const { organizationId } = access;

    if (!organizationId) {
      return createErrorResponse(
        "Organisation erforderlich",
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    const data = parsed.data;

    // Wrap the entire read-modify-write in a serializable transaction
    // to prevent lost updates from concurrent PATCH requests.
    const txResult = await prisma.$transaction(
      async (tx) => {
        // Find existing workflow (inside transaction for consistency)
        const record = await tx.complianceEvidence.findFirst({
          where: {
            organizationId,
            evidenceType: "OTHER",
            requirementId: `${NB_REQUIREMENT_ID}:${assessmentId}`,
            title: NB_EVIDENCE_TITLE,
          },
        });

        if (!record) {
          return { error: "NOT_FOUND" as const };
        }

        const workflowData = {
          ...(record.metadata as unknown as NBWorkflowData),
        };

        // 1. Process state transition
        if (data.transition) {
          const currentState = workflowData.currentState;
          const stateDef = notifiedBodyWorkflowDefinition.states[currentState];

          if (!stateDef) {
            return {
              error: "INVALID_STATE" as const,
              message: `Ungültiger aktueller Status: ${currentState}`,
            };
          }

          const transitionDef = stateDef.transitions[data.transition];
          if (!transitionDef) {
            return {
              error: "INVALID_TRANSITION" as const,
              message: `Transition "${data.transition}" ist im Status "${currentState}" nicht verfügbar. Verfügbare Transitionen: ${Object.keys(stateDef.transitions).join(", ")}`,
            };
          }

          const targetState = transitionDef.to as NBWorkflowState;

          // Check guard conditions for documents_complete transition
          if (data.transition === "documents_complete") {
            const mandatoryDocs = workflowData.documents.filter(
              (d) => d.mandatory,
            );
            const allUploaded = mandatoryDocs.every(
              (d) => d.status !== "missing",
            );
            if (!allUploaded) {
              return {
                error: "DOCS_INCOMPLETE" as const,
                message: "Nicht alle Pflichtdokumente hochgeladen",
              };
            }
          }

          workflowData.currentState = targetState;
          workflowData.stateHistory.push({
            state: targetState,
            timestamp: new Date().toISOString(),
            note: data.transitionNote,
          });

          // Set submission date when submitting
          if (data.transition === "submit") {
            workflowData.submissionDate = new Date().toISOString();
          }
        }

        // 2. Process document status update
        if (data.documentUpdate) {
          const docIndex = workflowData.documents.findIndex(
            (d) => d.id === data.documentUpdate!.documentId,
          );

          if (docIndex === -1) {
            return {
              error: "DOC_NOT_FOUND" as const,
              message: `Dokument "${data.documentUpdate.documentId}" nicht gefunden`,
            };
          }

          workflowData.documents[docIndex] = {
            ...workflowData.documents[docIndex],
            status: data.documentUpdate.status,
            documentId: data.documentUpdate.linkedDocumentId,
            uploadedAt:
              data.documentUpdate.status === "uploaded"
                ? new Date().toISOString()
                : workflowData.documents[docIndex].uploadedAt,
          };
        }

        // 3. Process communication entry
        if (data.communication) {
          workflowData.communications.push({
            date: new Date().toISOString(),
            direction: data.communication.direction,
            subject: data.communication.subject,
            summary: data.communication.summary,
          });
        }

        // 4. Update NB details
        if (data.notifiedBodyName !== undefined)
          workflowData.notifiedBodyName = data.notifiedBodyName;
        if (data.notifiedBodyId !== undefined)
          workflowData.notifiedBodyId = data.notifiedBodyId;
        if (data.submissionDate !== undefined)
          workflowData.submissionDate = data.submissionDate;
        if (data.expectedResponseDate !== undefined)
          workflowData.expectedResponseDate = data.expectedResponseDate;

        // Determine evidence status based on workflow state
        let evidenceStatus: "DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED" =
          "DRAFT";
        if (
          [
            "submitted_to_nb",
            "under_review",
            "additional_info_requested",
          ].includes(workflowData.currentState)
        ) {
          evidenceStatus = "SUBMITTED";
        } else if (workflowData.currentState === "approved") {
          evidenceStatus = "ACCEPTED";
        } else if (workflowData.currentState === "rejected") {
          evidenceStatus = "REJECTED";
        }

        // Persist updated workflow (inside transaction)
        await tx.complianceEvidence.update({
          where: { id: record.id },
          data: {
            metadata: JSON.parse(JSON.stringify(workflowData)),
            status: evidenceStatus,
          },
        });

        return {
          error: null,
          workflowData,
          evidenceId: record.id,
        };
      },
      { isolationLevel: "Serializable" },
    );

    // Handle transaction result errors
    if (txResult.error === "NOT_FOUND") {
      return createErrorResponse(
        "Notified-Body-Workflow nicht initialisiert — bitte zuerst POST aufrufen",
        ErrorCode.NOT_FOUND,
        404,
      );
    }
    if (txResult.error === "INVALID_STATE") {
      return createErrorResponse(
        txResult.message!,
        ErrorCode.ENGINE_ERROR,
        500,
      );
    }
    if (txResult.error === "INVALID_TRANSITION") {
      return createErrorResponse(
        txResult.message!,
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }
    if (txResult.error === "DOCS_INCOMPLETE") {
      return createErrorResponse(
        txResult.message!,
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }
    if (txResult.error === "DOC_NOT_FOUND") {
      return createErrorResponse(txResult.message!, ErrorCode.NOT_FOUND, 404);
    }

    const { workflowData, evidenceId } = txResult;

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "nb_workflow_updated",
      entityType: "cra_assessment",
      entityId: assessmentId,
      newValue: {
        transition: data.transition,
        documentUpdate: data.documentUpdate,
        communication: data.communication
          ? data.communication.subject
          : undefined,
        currentState: workflowData.currentState,
      },
      description: data.transition
        ? `NB-Workflow-Transition: ${data.transition} → ${workflowData.currentState}`
        : "NB-Workflow aktualisiert",
      ipAddress,
      userAgent,
    });

    // Calculate progress
    const mandatoryDocs = workflowData.documents.filter((d) => d.mandatory);
    const uploadedMandatory = mandatoryDocs.filter(
      (d) => d.status !== "missing",
    );

    return createSuccessResponse({
      workflow: {
        ...workflowData,
        evidenceId,
      },
      progress: {
        mandatoryTotal: mandatoryDocs.length,
        mandatoryUploaded: uploadedMandatory.length,
        allMandatoryReady: uploadedMandatory.length === mandatoryDocs.length,
      },
    });
  } catch (error) {
    logger.error("Error updating NB workflow", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
