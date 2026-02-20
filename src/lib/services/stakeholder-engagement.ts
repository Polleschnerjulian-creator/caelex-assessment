/**
 * Stakeholder Engagement Service
 * Manages stakeholder lifecycle: invitations, token access, IP allowlists, access tracking
 */

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { createActivity } from "@/lib/services/activity-service";
import crypto from "crypto";
import type { StakeholderType, EngagementStatus, Prisma } from "@prisma/client";

// ─── Types ───

export interface CreateEngagementInput {
  organizationId: string;
  type: StakeholderType;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  jurisdiction?: string;
  licenseNumber?: string;
  website?: string;
  scope: string;
  contractRef?: string;
  retainerStart?: Date;
  retainerEnd?: Date;
  ipAllowlist?: string[];
  mfaRequired?: boolean;
  tokenExpiryDays?: number;
}

export interface UpdateEngagementInput {
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  jurisdiction?: string;
  licenseNumber?: string;
  website?: string;
  scope?: string;
  contractRef?: string;
  retainerStart?: Date;
  retainerEnd?: Date;
  status?: EngagementStatus;
  ipAllowlist?: string[];
  mfaRequired?: boolean;
}

export interface EngagementFilters {
  type?: StakeholderType;
  status?: EngagementStatus;
  search?: string;
}

// ─── Token Generation ───

function generateAccessToken(): string {
  return `stkn_${crypto.randomBytes(32).toString("base64url")}`;
}

// ─── CRUD ───

export async function createEngagement(
  input: CreateEngagementInput,
  userId: string,
) {
  const tokenExpiryDays = input.tokenExpiryDays || 90;
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + tokenExpiryDays);

  const accessToken = generateAccessToken();

  const engagement = await prisma.stakeholderEngagement.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      companyName: input.companyName,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      jurisdiction: input.jurisdiction,
      licenseNumber: input.licenseNumber,
      website: input.website,
      scope: input.scope,
      contractRef: input.contractRef,
      retainerStart: input.retainerStart,
      retainerEnd: input.retainerEnd,
      accessToken,
      tokenExpiresAt,
      ipAllowlist: input.ipAllowlist || [],
      mfaRequired: input.mfaRequired || false,
    },
    include: {
      dataRooms: true,
      attestations: true,
      _count: {
        select: { dataRooms: true, attestations: true, accessLogs: true },
      },
    },
  });

  await logAuditEvent({
    userId,
    action: "stakeholder_invited",
    entityType: "stakeholder_engagement",
    entityId: engagement.id,
    description: `Invited ${input.companyName} as ${input.type}`,
    metadata: { type: input.type, contactEmail: input.contactEmail },
  });

  await createActivity({
    organizationId: input.organizationId,
    userId,
    action: "created",
    entityType: "stakeholder_engagement",
    entityId: engagement.id,
    entityName: input.companyName,
    description: `Invited ${input.companyName} as ${input.type.toLowerCase().replace("_", " ")}`,
  });

  return { engagement, accessToken };
}

export async function getEngagements(
  organizationId: string,
  filters: EngagementFilters = {},
  options: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.StakeholderEngagementWhereInput = {
    organizationId,
    ...(filters.type && { type: filters.type }),
    ...(filters.status && { status: filters.status }),
    ...(filters.search && {
      OR: [
        { companyName: { contains: filters.search, mode: "insensitive" } },
        { contactName: { contains: filters.search, mode: "insensitive" } },
        { contactEmail: { contains: filters.search, mode: "insensitive" } },
      ],
    }),
  };

  const [engagements, total] = await Promise.all([
    prisma.stakeholderEngagement.findMany({
      where,
      include: {
        _count: {
          select: { dataRooms: true, attestations: true, accessLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.stakeholderEngagement.count({ where }),
  ]);

  return {
    engagements,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getEngagement(id: string, organizationId: string) {
  return prisma.stakeholderEngagement.findFirst({
    where: { id, organizationId },
    include: {
      dataRooms: {
        include: {
          _count: { select: { documents: true, accessLogs: true } },
        },
      },
      attestations: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { dataRooms: true, attestations: true, accessLogs: true },
      },
    },
  });
}

export async function updateEngagement(
  id: string,
  organizationId: string,
  input: UpdateEngagementInput,
  userId: string,
) {
  const engagement = await prisma.stakeholderEngagement.update({
    where: { id, organizationId },
    data: {
      ...(input.companyName !== undefined && {
        companyName: input.companyName,
      }),
      ...(input.contactName !== undefined && {
        contactName: input.contactName,
      }),
      ...(input.contactEmail !== undefined && {
        contactEmail: input.contactEmail,
      }),
      ...(input.contactPhone !== undefined && {
        contactPhone: input.contactPhone,
      }),
      ...(input.jurisdiction !== undefined && {
        jurisdiction: input.jurisdiction,
      }),
      ...(input.licenseNumber !== undefined && {
        licenseNumber: input.licenseNumber,
      }),
      ...(input.website !== undefined && { website: input.website }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.contractRef !== undefined && {
        contractRef: input.contractRef,
      }),
      ...(input.retainerStart !== undefined && {
        retainerStart: input.retainerStart,
      }),
      ...(input.retainerEnd !== undefined && {
        retainerEnd: input.retainerEnd,
      }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.ipAllowlist !== undefined && {
        ipAllowlist: input.ipAllowlist,
      }),
      ...(input.mfaRequired !== undefined && {
        mfaRequired: input.mfaRequired,
      }),
    },
    include: {
      _count: {
        select: { dataRooms: true, attestations: true, accessLogs: true },
      },
    },
  });

  await logAuditEvent({
    userId,
    action: "stakeholder_updated",
    entityType: "stakeholder_engagement",
    entityId: id,
    description: `Updated stakeholder engagement for ${engagement.companyName}`,
  });

  return engagement;
}

export async function revokeEngagement(
  id: string,
  organizationId: string,
  userId: string,
) {
  const engagement = await prisma.stakeholderEngagement.update({
    where: { id, organizationId },
    data: {
      status: "REVOKED",
      isRevoked: true,
      revokedAt: new Date(),
      revokedBy: userId,
    },
  });

  await logAuditEvent({
    userId,
    action: "stakeholder_revoked",
    entityType: "stakeholder_engagement",
    entityId: id,
    description: `Revoked access for ${engagement.companyName}`,
  });

  await createActivity({
    organizationId,
    userId,
    action: "deleted",
    entityType: "stakeholder_engagement",
    entityId: id,
    entityName: engagement.companyName,
    description: `Revoked stakeholder access for ${engagement.companyName}`,
  });

  return engagement;
}

export async function rotateToken(
  id: string,
  organizationId: string,
  userId: string,
  tokenExpiryDays: number = 90,
) {
  const newToken = generateAccessToken();
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + tokenExpiryDays);

  const engagement = await prisma.stakeholderEngagement.update({
    where: { id, organizationId },
    data: {
      accessToken: newToken,
      tokenExpiresAt,
    },
  });

  await logAuditEvent({
    userId,
    action: "stakeholder_token_rotated",
    entityType: "stakeholder_engagement",
    entityId: id,
    description: `Rotated access token for ${engagement.companyName}`,
  });

  return { engagement, accessToken: newToken };
}

// ─── Token Validation ───

export async function validateToken(token: string, ipAddress?: string) {
  const engagement = await prisma.stakeholderEngagement.findUnique({
    where: { accessToken: token },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
    },
  });

  if (!engagement) {
    return { valid: false, error: "Invalid token" } as const;
  }

  if (engagement.isRevoked || engagement.status === "REVOKED") {
    return { valid: false, error: "Access has been revoked" } as const;
  }

  if (engagement.tokenExpiresAt < new Date()) {
    return { valid: false, error: "Token has expired" } as const;
  }

  if (engagement.status === "SUSPENDED") {
    return { valid: false, error: "Engagement is suspended" } as const;
  }

  if (engagement.status === "COMPLETED") {
    return { valid: false, error: "Engagement is completed" } as const;
  }

  // IP allowlist check
  if (engagement.ipAllowlist.length > 0 && ipAddress) {
    if (!engagement.ipAllowlist.includes(ipAddress)) {
      return { valid: false, error: "IP address not allowed" } as const;
    }
  }

  // Update access tracking
  await prisma.stakeholderEngagement.update({
    where: { id: engagement.id },
    data: {
      lastAccessAt: new Date(),
      accessCount: { increment: 1 },
      status: engagement.status === "INVITED" ? "ACTIVE" : engagement.status,
    },
  });

  return { valid: true, engagement } as const;
}

// ─── Access Logging ───

export async function logStakeholderAccess(
  engagementId: string,
  action: string,
  options?: {
    entityType?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return prisma.stakeholderAccessLog.create({
    data: {
      engagementId,
      action,
      entityType: options?.entityType,
      entityId: options?.entityId,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      metadata: options?.metadata || undefined,
    },
  });
}

export async function getAccessLogs(
  engagementId: string,
  options: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where = { engagementId };

  const [logs, total] = await Promise.all([
    prisma.stakeholderAccessLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.stakeholderAccessLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Stats ───

export async function getNetworkStats(organizationId: string) {
  const [
    totalEngagements,
    activeEngagements,
    openDataRooms,
    totalAttestations,
    pendingAttestations,
  ] = await Promise.all([
    prisma.stakeholderEngagement.count({ where: { organizationId } }),
    prisma.stakeholderEngagement.count({
      where: { organizationId, status: "ACTIVE" },
    }),
    prisma.dataRoom.count({
      where: { organizationId, isActive: true },
    }),
    prisma.complianceAttestation.count({ where: { organizationId } }),
    prisma.stakeholderEngagement.count({
      where: { organizationId, status: "INVITED" },
    }),
  ]);

  return {
    totalEngagements,
    activeEngagements,
    openDataRooms,
    totalAttestations,
    pendingAttestations,
  };
}
