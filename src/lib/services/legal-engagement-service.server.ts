/**
 * Legal Engagement Service
 * CRUD operations for legal engagements: creation, listing, detail, update, revocation.
 * Follows the pattern from stakeholder-engagement.ts.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { createActivity } from "@/lib/services/activity-service";
import { resolveAutoScope } from "@/lib/services/legal-scope-service.server";
import { logger } from "@/lib/logger";

// ─── Types ───

export interface CreateLegalEngagementInput {
  organizationId: string;
  engagementType: string;
  title: string;
  firmId?: string;
  firmName?: string;
  firmCity?: string;
  attorneyEmail: string;
  expiresAt: Date;
  allowExport?: boolean;
  note?: string;
  customScope?: {
    modules: string[];
    dataTypes: string[];
    includeNIS2Overlap?: boolean;
  };
}

export interface UpdateLegalEngagementInput {
  scopedModules?: string[];
  scopedDataTypes?: string[];
  includeNIS2Overlap?: boolean;
  expiresAt?: Date;
  allowExport?: boolean;
  note?: string;
}

// ─── CRUD ───

/**
 * Create a new legal engagement.
 * Auto-resolves scope from engagement type unless custom scope is provided.
 * If firmId is not provided, creates or finds the firm by name + city.
 */
export async function createEngagement(
  input: CreateLegalEngagementInput,
  userId: string,
) {
  // Resolve or create firm
  let firmId = input.firmId;

  if (!firmId) {
    if (!input.firmName) {
      throw new Error("Either firmId or firmName is required");
    }

    // Look for existing firm by name + city
    const existingFirm = await prisma.legalFirm.findFirst({
      where: {
        name: input.firmName,
        ...(input.firmCity ? { city: input.firmCity } : {}),
      },
    });

    if (existingFirm) {
      firmId = existingFirm.id;
    } else {
      const newFirm = await prisma.legalFirm.create({
        data: {
          name: input.firmName,
          city: input.firmCity || null,
        },
      });
      firmId = newFirm.id;
    }
  }

  // Resolve scope: auto from engagement type, or custom
  let scopedModules: string[] = [];
  let scopedDataTypes: string[] = [];
  let includeNIS2Overlap = false;

  if (input.customScope) {
    scopedModules = input.customScope.modules;
    scopedDataTypes = input.customScope.dataTypes;
    includeNIS2Overlap = input.customScope.includeNIS2Overlap ?? false;
  } else {
    const autoScope = resolveAutoScope(input.engagementType);
    if (autoScope) {
      scopedModules = autoScope.modules;
      scopedDataTypes = autoScope.dataTypes;
      includeNIS2Overlap = autoScope.includeNIS2Overlap;
    }
  }

  // Calculate default expiry (90 days if not specified)
  const expiresAt =
    input.expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const engagement = await prisma.legalEngagement.create({
    data: {
      organizationId: input.organizationId,
      firmId,
      engagementType: input.engagementType,
      title: input.title,
      status: "pending",
      scopedModules,
      scopedDataTypes,
      scopedAssessmentIds: [],
      includeNIS2Overlap,
      expiresAt,
      allowExport: input.allowExport ?? false,
      ipWhitelist: [],
      invitedBy: userId,
      note: input.note || null,
    },
    include: {
      firm: {
        select: { id: true, name: true, city: true },
      },
      _count: {
        select: { attorneys: true, accessLogs: true, comments: true },
      },
    },
  });

  // Audit logging
  await logAuditEvent({
    userId,
    action: "legal_engagement_created",
    entityType: "legal_engagement",
    entityId: engagement.id,
    organizationId: input.organizationId,
    description: `Created legal engagement "${input.title}" with ${engagement.firm.name}`,
    metadata: {
      engagementType: input.engagementType,
      firmId,
      attorneyEmail: input.attorneyEmail,
    },
  });

  await createActivity({
    organizationId: input.organizationId,
    userId,
    action: "created",
    entityType: "legal_engagement",
    entityId: engagement.id,
    entityName: input.title,
    description: `Created legal engagement "${input.title}" with ${engagement.firm.name}`,
  });

  return engagement;
}

/**
 * List all legal engagements for an organization.
 */
export async function getEngagements(organizationId: string) {
  const engagements = await prisma.legalEngagement.findMany({
    where: { organizationId },
    include: {
      firm: {
        select: { id: true, name: true, city: true },
      },
      _count: {
        select: { attorneys: true, accessLogs: true, comments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return engagements;
}

/**
 * Get a single legal engagement with attorney details.
 */
export async function getEngagement(id: string, organizationId: string) {
  const engagement = await prisma.legalEngagement.findFirst({
    where: { id, organizationId },
    include: {
      firm: {
        select: { id: true, name: true, city: true, website: true },
      },
      attorneys: {
        include: {
          attorney: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
      _count: {
        select: { attorneys: true, accessLogs: true, comments: true },
      },
    },
  });

  return engagement;
}

/**
 * Update a legal engagement (scope, expiry, export permission).
 */
export async function updateEngagement(
  id: string,
  organizationId: string,
  input: UpdateLegalEngagementInput,
  userId: string,
) {
  const engagement = await prisma.legalEngagement.update({
    where: { id, organizationId },
    data: {
      ...(input.scopedModules !== undefined && {
        scopedModules: input.scopedModules,
      }),
      ...(input.scopedDataTypes !== undefined && {
        scopedDataTypes: input.scopedDataTypes,
      }),
      ...(input.includeNIS2Overlap !== undefined && {
        includeNIS2Overlap: input.includeNIS2Overlap,
      }),
      ...(input.expiresAt !== undefined && {
        expiresAt: input.expiresAt,
      }),
      ...(input.allowExport !== undefined && {
        allowExport: input.allowExport,
      }),
      ...(input.note !== undefined && {
        note: input.note,
      }),
    },
    include: {
      firm: {
        select: { id: true, name: true, city: true },
      },
      _count: {
        select: { attorneys: true, accessLogs: true, comments: true },
      },
    },
  });

  await logAuditEvent({
    userId,
    action: "legal_engagement_updated",
    entityType: "legal_engagement",
    entityId: id,
    organizationId,
    description: `Updated legal engagement "${engagement.title}"`,
    metadata: { updatedFields: Object.keys(input) },
  });

  return engagement;
}

/**
 * Revoke a legal engagement. Sets status to "revoked" and records revokedAt timestamp.
 */
export async function revokeEngagement(
  id: string,
  organizationId: string,
  userId: string,
) {
  const engagement = await prisma.legalEngagement.update({
    where: { id, organizationId },
    data: {
      status: "revoked",
      revokedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId,
    action: "legal_engagement_revoked",
    entityType: "legal_engagement",
    entityId: id,
    organizationId,
    description: `Revoked legal engagement "${engagement.title}"`,
  });

  await createActivity({
    organizationId,
    userId,
    action: "deleted",
    entityType: "legal_engagement",
    entityId: id,
    entityName: engagement.title,
    description: `Revoked legal engagement "${engagement.title}"`,
  });

  return engagement;
}
