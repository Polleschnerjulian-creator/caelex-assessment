/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * CRA Requirement Status Tracking API
 *
 * GET   /api/cra/requirements?assessmentId=xxx — Get requirement statuses
 * PATCH /api/cra/requirements — Update a requirement status
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

// GET /api/cra/requirements?assessmentId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;
    const assessmentId = request.nextUrl.searchParams.get("assessmentId");

    if (!assessmentId) {
      return createErrorResponse(
        "assessmentId query parameter is required",
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    // Verify ownership of the assessment
    const assessment = await prisma.cRAAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!assessment) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    const requirements = await prisma.cRARequirementStatus.findMany({
      where: { assessmentId },
      orderBy: { requirementId: "asc" },
    });

    // Decrypt sensitive fields
    const decryptedRequirements = await Promise.all(
      requirements.map(async (req) => ({
        ...req,
        notes:
          req.notes && isEncrypted(req.notes)
            ? await decrypt(req.notes)
            : req.notes,
        evidenceNotes:
          req.evidenceNotes && isEncrypted(req.evidenceNotes)
            ? await decrypt(req.evidenceNotes)
            : req.evidenceNotes,
        responses: req.responses
          ? (req.responses as Record<string, unknown>)
          : null,
      })),
    );

    return createSuccessResponse({ requirements: decryptedRequirements });
  } catch (error) {
    logger.error("Error fetching CRA requirements", error);
    return createErrorResponse(
      "Internal server error",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// PATCH /api/cra/requirements - Update requirement status
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;
    const body = await request.json();

    const requirementSchema = z.object({
      assessmentId: z.string().min(1),
      requirementId: z.string().min(1),
      status: z
        .enum([
          "not_assessed",
          "compliant",
          "partial",
          "non_compliant",
          "not_applicable",
        ])
        .optional(),
      notes: z.string().nullable().optional(),
      evidenceNotes: z.string().nullable().optional(),
      targetDate: z.string().nullable().optional(),
      responses: z.record(z.string(), z.unknown()).nullable().optional(),
    });

    const parsed = requirementSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    const {
      assessmentId,
      requirementId,
      status,
      notes,
      evidenceNotes,
      targetDate,
      responses,
    } = parsed.data;

    // Verify ownership of the assessment
    const assessment = await prisma.cRAAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!assessment) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    // Get previous state for audit
    const existing = await prisma.cRARequirementStatus.findUnique({
      where: {
        assessmentId_requirementId: {
          assessmentId,
          requirementId,
        },
      },
    });

    // Encrypt sensitive text fields before storage
    const encryptedNotes =
      notes !== undefined && notes !== null ? await encrypt(notes) : notes;
    const encryptedEvidenceNotes =
      evidenceNotes !== undefined && evidenceNotes !== null
        ? await encrypt(evidenceNotes)
        : evidenceNotes;

    // Upsert requirement status
    const prismaResponses = responses as Prisma.InputJsonValue | undefined;
    const updated = await prisma.cRARequirementStatus.upsert({
      where: {
        assessmentId_requirementId: {
          assessmentId,
          requirementId,
        },
      },
      update: {
        status: status ?? undefined,
        notes: encryptedNotes ?? undefined,
        evidenceNotes: encryptedEvidenceNotes ?? undefined,
        ...(prismaResponses !== undefined
          ? { responses: prismaResponses }
          : {}),
      },
      create: {
        assessmentId,
        requirementId,
        status: status || "not_assessed",
        notes: encryptedNotes,
        evidenceNotes: encryptedEvidenceNotes,
        ...(prismaResponses !== undefined
          ? { responses: prismaResponses }
          : {}),
      },
    });

    // Recalculate maturity score for the assessment
    if (status !== undefined) {
      const allStatuses = await prisma.cRARequirementStatus.findMany({
        where: { assessmentId },
      });

      const total = allStatuses.length;
      const compliant = allStatuses.filter(
        (s) => s.status === "compliant",
      ).length;
      const partial = allStatuses.filter((s) => s.status === "partial").length;

      const maturityScore =
        total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;

      await prisma.cRAAssessment.update({
        where: { id: assessmentId },
        data: { maturityScore },
      });
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "cra_requirement_status_changed",
      entityType: "cra_requirement",
      entityId: existing?.id ?? updated.id,
      previousValue: existing
        ? { status: existing.status, notes: existing.notes }
        : null,
      newValue: { status, notes, evidenceNotes },
      description: `Updated CRA requirement ${requirementId} status to ${status || "unchanged"}`,
      ipAddress,
      userAgent,
    });

    // Decrypt sensitive fields for response
    const decryptedUpdated = {
      ...updated,
      notes:
        updated.notes && isEncrypted(updated.notes)
          ? await decrypt(updated.notes)
          : updated.notes,
      evidenceNotes:
        updated.evidenceNotes && isEncrypted(updated.evidenceNotes)
          ? await decrypt(updated.evidenceNotes)
          : updated.evidenceNotes,
    };

    return createSuccessResponse({ requirement: decryptedUpdated });
  } catch (error) {
    logger.error("Error updating CRA requirement", error);
    return createErrorResponse(
      "Internal server error",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
