/**
 * Attestation Service
 * Manages compliance attestations: creation, SHA-256 hash chain, validation, revocation
 */

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { createActivity } from "@/lib/services/activity-service";
import crypto from "crypto";
import type { AttestationType, Prisma } from "@prisma/client";

// ─── Types ───

export interface CreateAttestationInput {
  organizationId: string;
  engagementId: string;
  type: AttestationType;
  title: string;
  statement: string;
  scope: string;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  signerOrg: string;
  validUntil?: Date;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AttestationFilters {
  type?: AttestationType;
  engagementId?: string;
  isRevoked?: boolean;
  entityType?: string;
  entityId?: string;
}

// ─── Hash Chain ───

function computeSignatureHash(
  statement: string,
  scope: string,
  signerEmail: string,
  signerOrg: string,
  issuedAt: string,
  previousHash: string | null,
): string {
  const payload = JSON.stringify({
    statement,
    scope,
    signerEmail,
    signerOrg,
    issuedAt,
    previousHash: previousHash || null,
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}

async function getLastAttestationHash(
  organizationId: string,
  engagementId: string,
): Promise<string | null> {
  const last = await prisma.complianceAttestation.findFirst({
    where: { organizationId, engagementId },
    orderBy: { createdAt: "desc" },
    select: { signatureHash: true },
  });

  return last?.signatureHash || null;
}

// ─── CRUD ───

export async function createAttestation(input: CreateAttestationInput) {
  const issuedAt = new Date().toISOString();

  // Build hash chain
  const previousHash = await getLastAttestationHash(
    input.organizationId,
    input.engagementId,
  );

  const signatureHash = computeSignatureHash(
    input.statement,
    input.scope,
    input.signerEmail,
    input.signerOrg,
    issuedAt,
    previousHash,
  );

  const attestation = await prisma.complianceAttestation.create({
    data: {
      organizationId: input.organizationId,
      engagementId: input.engagementId,
      type: input.type,
      title: input.title,
      statement: input.statement,
      scope: input.scope,
      signerName: input.signerName,
      signerTitle: input.signerTitle,
      signerEmail: input.signerEmail,
      signerOrg: input.signerOrg,
      signatureHash,
      previousHash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      issuedAt: new Date(issuedAt),
      validUntil: input.validUntil,
      entityType: input.entityType,
      entityId: input.entityId,
    },
    include: {
      engagement: {
        select: { companyName: true, type: true },
      },
    },
  });

  await logAuditEvent({
    userId: input.signerEmail,
    action: "attestation_signed",
    entityType: "compliance_attestation",
    entityId: attestation.id,
    description: `${input.signerName} signed ${input.type} attestation: "${input.title}"`,
    metadata: {
      type: input.type,
      signatureHash,
      previousHash,
    },
  });

  await createActivity({
    organizationId: input.organizationId,
    action: "completed",
    entityType: "compliance_attestation",
    entityId: attestation.id,
    entityName: input.title,
    description: `${input.signerName} (${attestation.engagement.companyName}) signed ${input.type.toLowerCase().replace(/_/g, " ")} attestation`,
  });

  return attestation;
}

export async function getAttestations(
  organizationId: string,
  filters: AttestationFilters = {},
  options: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.ComplianceAttestationWhereInput = {
    organizationId,
    ...(filters.type && { type: filters.type }),
    ...(filters.engagementId && { engagementId: filters.engagementId }),
    ...(filters.isRevoked !== undefined && { isRevoked: filters.isRevoked }),
    ...(filters.entityType && { entityType: filters.entityType }),
    ...(filters.entityId && { entityId: filters.entityId }),
  };

  const [attestations, total] = await Promise.all([
    prisma.complianceAttestation.findMany({
      where,
      include: {
        engagement: {
          select: { companyName: true, type: true, contactName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.complianceAttestation.count({ where }),
  ]);

  return {
    attestations,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAttestation(id: string, organizationId: string) {
  return prisma.complianceAttestation.findFirst({
    where: { id, organizationId },
    include: {
      engagement: {
        select: {
          id: true,
          companyName: true,
          type: true,
          contactName: true,
          contactEmail: true,
        },
      },
    },
  });
}

// ─── Verification ───

export async function verifyAttestation(id: string) {
  const attestation = await prisma.complianceAttestation.findUnique({
    where: { id },
    include: {
      engagement: {
        select: { companyName: true, type: true },
      },
      organization: {
        select: { name: true },
      },
    },
  });

  if (!attestation) {
    return { valid: false, error: "Attestation not found" } as const;
  }

  if (attestation.isRevoked) {
    return {
      valid: false,
      error: "Attestation has been revoked",
      attestation,
    } as const;
  }

  if (attestation.validUntil && attestation.validUntil < new Date()) {
    return {
      valid: false,
      error: "Attestation has expired",
      attestation,
    } as const;
  }

  // Verify hash
  const expectedHash = computeSignatureHash(
    attestation.statement,
    attestation.scope,
    attestation.signerEmail,
    attestation.signerOrg,
    attestation.issuedAt.toISOString(),
    attestation.previousHash,
  );

  const hashValid = expectedHash === attestation.signatureHash;

  // Verify chain
  let chainValid = true;
  if (attestation.previousHash) {
    const previousAttestation = await prisma.complianceAttestation.findFirst({
      where: {
        organizationId: attestation.organizationId,
        engagementId: attestation.engagementId,
        signatureHash: attestation.previousHash,
      },
    });
    chainValid = !!previousAttestation;
  }

  return {
    valid: hashValid && chainValid,
    hashValid,
    chainValid,
    attestation,
  } as const;
}

export async function verifyByHash(signatureHash: string) {
  const attestation = await prisma.complianceAttestation.findFirst({
    where: { signatureHash },
    include: {
      engagement: {
        select: { companyName: true, type: true },
      },
      organization: {
        select: { name: true },
      },
    },
  });

  if (!attestation) {
    return {
      valid: false,
      error: "No attestation found with this hash",
    } as const;
  }

  return verifyAttestation(attestation.id);
}

// ─── Revocation ───

export async function revokeAttestation(
  id: string,
  organizationId: string,
  reason: string,
  userId: string,
) {
  const attestation = await prisma.complianceAttestation.update({
    where: { id, organizationId },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    },
    include: {
      engagement: { select: { companyName: true } },
    },
  });

  await logAuditEvent({
    userId,
    action: "attestation_revoked",
    entityType: "compliance_attestation",
    entityId: id,
    description: `Revoked attestation "${attestation.title}" — Reason: ${reason}`,
  });

  await createActivity({
    organizationId,
    userId,
    action: "deleted",
    entityType: "compliance_attestation",
    entityId: id,
    entityName: attestation.title,
    description: `Revoked attestation "${attestation.title}"`,
  });

  return attestation;
}

// ─── Hash Chain Visualization ───

export async function getAttestationChain(
  organizationId: string,
  engagementId: string,
) {
  return prisma.complianceAttestation.findMany({
    where: { organizationId, engagementId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      title: true,
      signerName: true,
      signerOrg: true,
      signatureHash: true,
      previousHash: true,
      issuedAt: true,
      isRevoked: true,
      createdAt: true,
    },
  });
}

// ─── Stakeholder Attestations ───

export async function getAttestationsForStakeholder(engagementId: string) {
  return prisma.complianceAttestation.findMany({
    where: { engagementId },
    orderBy: { createdAt: "desc" },
    include: {
      organization: {
        select: { name: true },
      },
    },
  });
}
