/**
 * GET /api/v1/evidence/[id] — Get single evidence by ID
 * PATCH /api/v1/evidence/[id] — Update evidence record
 *
 * Requires API key with appropriate scopes.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  withApiAuth,
  apiSuccess,
  apiError,
  type ApiContext,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// ─── GET: Single evidence ───

async function getHandler(request: NextRequest, context: ApiContext) {
  const { organizationId } = context;

  // Extract ID from URL path: /api/v1/evidence/[id]
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 1];

  if (!id) {
    return apiError("Evidence ID is required", 400);
  }

  const evidence = await prisma.complianceEvidence.findFirst({
    where: { id, organizationId },
    include: {
      documents: {
        include: {
          document: {
            select: {
              id: true,
              name: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              category: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
      requirementMappings: {
        include: {
          requirement: {
            select: {
              id: true,
              regulationType: true,
              requirementId: true,
              title: true,
              category: true,
              severity: true,
              mandatory: true,
            },
          },
        },
      },
    },
  });

  if (!evidence) {
    return apiError("Evidence not found", 404);
  }

  return apiSuccess(evidence);
}

export const GET = withApiAuth(getHandler, {
  requiredScopes: ["read:compliance"],
});

// ─── PATCH: Update evidence ───

const updateEvidenceSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z
    .enum(["DRAFT", "SUBMITTED", "ACCEPTED", "REJECTED", "EXPIRED"])
    .optional(),
  reviewNotes: z.string().max(5000).nullable().optional(),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
});

async function patchHandler(request: NextRequest, context: ApiContext) {
  const { organizationId, apiKey } = context;

  // Extract ID from URL path
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 1];

  if (!id) {
    return apiError("Evidence ID is required", 400);
  }

  // Verify ownership via organizationId
  const existing = await prisma.complianceEvidence.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return apiError("Evidence not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = updateEvidenceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 400, {
      details: parsed.error.flatten().fieldErrors,
    });
  }

  // Build update data from validated fields
  const updateData: Record<string, unknown> = {};

  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined)
    updateData.description = parsed.data.description;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.reviewNotes !== undefined)
    updateData.reviewNotes = parsed.data.reviewNotes;
  if (parsed.data.validFrom !== undefined) {
    updateData.validFrom = parsed.data.validFrom
      ? new Date(parsed.data.validFrom)
      : null;
  }
  if (parsed.data.validUntil !== undefined) {
    updateData.validUntil = parsed.data.validUntil
      ? new Date(parsed.data.validUntil)
      : null;
  }

  // Track review actions
  if (parsed.data.status === "ACCEPTED" || parsed.data.status === "REJECTED") {
    updateData.reviewedBy = apiKey.id;
    updateData.reviewedAt = new Date();
  }

  const evidence = await prisma.complianceEvidence.update({
    where: { id },
    data: updateData,
    include: {
      documents: {
        include: {
          document: {
            select: {
              id: true,
              name: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
            },
          },
        },
      },
      requirementMappings: {
        include: {
          requirement: {
            select: {
              id: true,
              regulationType: true,
              requirementId: true,
              title: true,
              category: true,
            },
          },
        },
      },
    },
  });

  const action =
    parsed.data.status && parsed.data.status !== existing.status
      ? "evidence_status_changed"
      : "evidence_updated";

  await logAuditEvent({
    userId: apiKey.id,
    action,
    entityType: "compliance_evidence",
    entityId: id,
    description: `Updated evidence "${evidence.title}" via API`,
    previousValue: { status: existing.status },
    newValue: updateData,
    organizationId,
  });

  return apiSuccess(evidence);
}

export const PATCH = withApiAuth(patchHandler, {
  requiredScopes: ["write:compliance"],
});
