/**
 * GET /api/v1/evidence — List evidence with pagination + filtering
 * POST /api/v1/evidence — Create a new evidence record
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
import { parsePaginationLimit } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { computeEvidenceHashFields } from "@/lib/services/ace-evidence-service.server";
import type { RegulationType, EvidenceType } from "@prisma/client";

// ─── GET: List evidence ───

async function listHandler(request: NextRequest, context: ApiContext) {
  const { organizationId } = context;
  const url = new URL(request.url);

  // Pagination
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = parsePaginationLimit(url.searchParams.get("limit"), 20);
  const skip = (page - 1) * limit;

  // Filters
  const status = url.searchParams.get("status");
  const regulationType = url.searchParams.get("regulationType");
  const requirementId = url.searchParams.get("requirementId");

  const where: Record<string, unknown> = { organizationId };
  if (status) where.status = status;
  if (regulationType) where.regulationType = regulationType;
  if (requirementId) where.requirementId = requirementId;

  const [evidence, total] = await Promise.all([
    prisma.complianceEvidence.findMany({
      where,
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
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.complianceEvidence.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return apiSuccess(evidence, 200, {
    pagination: { page, limit, total, totalPages },
  });
}

export const GET = withApiAuth(listHandler, {
  requiredScopes: ["read:compliance"],
});

// ─── POST: Create evidence ───

const createEvidenceSchema = z.object({
  title: z.string().min(1, "title is required").max(500),
  description: z.string().max(5000).optional(),
  regulationType: z.string().min(1, "regulationType is required"),
  requirementId: z.string().min(1, "requirementId is required"),
  evidenceType: z.string().min(1, "evidenceType is required"),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  documentIds: z.array(z.string()).max(50).optional(),
});

async function createHandler(request: NextRequest, context: ApiContext) {
  const { organizationId, apiKey } = context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = createEvidenceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 400, {
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const {
    title,
    description,
    regulationType,
    requirementId,
    evidenceType,
    validFrom,
    validUntil,
    documentIds,
  } = parsed.data;

  // Create the evidence record
  const now = new Date();
  const evidence = await prisma.complianceEvidence.create({
    data: {
      organizationId,
      createdBy: apiKey.id, // API key ID as creator for API-originated records
      regulationType: regulationType as RegulationType,
      requirementId,
      title,
      description: description || null,
      evidenceType: evidenceType as EvidenceType,
      sourceType: "API_IMPORT",
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
    },
  });

  // Compute hash-chain fields (best-effort, never blocks creation)
  const hashFields = await computeEvidenceHashFields(organizationId, {
    id: evidence.id,
    createdBy: evidence.createdBy,
    regulationType: evidence.regulationType,
    requirementId: evidence.requirementId,
    title: evidence.title,
    description: evidence.description,
    evidenceType: evidence.evidenceType,
    status: evidence.status,
    validFrom: evidence.validFrom,
    validUntil: evidence.validUntil,
    createdAt: evidence.createdAt,
  });

  if (hashFields) {
    await prisma.complianceEvidence.update({
      where: { id: evidence.id },
      data: {
        entryHash: hashFields.entryHash,
        previousHash: hashFields.previousHash,
      },
    });
  }

  // Link documents if provided
  if (documentIds && documentIds.length > 0) {
    await prisma.complianceEvidenceDocument.createMany({
      data: documentIds.map((docId: string) => ({
        evidenceId: evidence.id,
        documentId: docId,
      })),
      skipDuplicates: true,
    });
  }

  // Fetch the created record with relations
  const created = await prisma.complianceEvidence.findUnique({
    where: { id: evidence.id },
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
    },
  });

  await logAuditEvent({
    userId: apiKey.id,
    action: "evidence_created",
    entityType: "compliance_evidence",
    entityId: evidence.id,
    description: `Created evidence "${title}" for ${regulationType}/${requirementId} via API`,
    newValue: { regulationType, requirementId, title, evidenceType },
    organizationId,
  });

  return apiSuccess(created, 201);
}

export const POST = withApiAuth(createHandler, {
  requiredScopes: ["write:compliance"],
});
