import "server-only";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// ═══════════════════════════════════════════════════════════
// NEXUS — Personnel Service
// ═══════════════════════════════════════════════════════════

/**
 * Add personnel to an asset.
 */
export async function addPersonnel(
  assetId: string,
  data: {
    personName: string;
    role: string;
    accessLevel: string;
    mfaEnabled?: boolean;
    lastTraining?: Date;
    trainingRequired?: boolean;
    clearanceLevel?: string;
    accessGrantedAt?: Date;
    accessExpiresAt?: Date;
    isActive?: boolean;
  },
  organizationId: string,
  userId: string,
) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId, isDeleted: false },
  });
  if (!asset) throw new Error("Asset not found");

  const personnel = await prisma.assetPersonnel.create({
    data: {
      assetId,
      personName: data.personName,
      role: data.role as never,
      accessLevel: data.accessLevel as never,
      mfaEnabled: data.mfaEnabled ?? false,
      lastTraining: data.lastTraining,
      trainingRequired: data.trainingRequired ?? true,
      clearanceLevel: data.clearanceLevel,
      accessGrantedAt: data.accessGrantedAt ?? new Date(),
      accessExpiresAt: data.accessExpiresAt,
      isActive: data.isActive ?? true,
    },
  });

  await logAuditEvent({
    userId,
    action: "nexus_personnel_added",
    entityType: "nexus_personnel",
    entityId: personnel.id,
    description: `Added personnel "${personnel.personName}" to asset`,
    newValue: { personName: personnel.personName, role: personnel.role },
    organizationId,
  });

  return personnel;
}

/**
 * Update an existing personnel record.
 */
export async function updatePersonnel(
  personnelId: string,
  data: {
    personName?: string;
    role?: string;
    accessLevel?: string;
    mfaEnabled?: boolean;
    lastTraining?: Date;
    trainingRequired?: boolean;
    clearanceLevel?: string;
    accessGrantedAt?: Date;
    accessExpiresAt?: Date;
    isActive?: boolean;
  },
  organizationId: string,
  userId: string,
) {
  const existing = await prisma.assetPersonnel.findFirst({
    where: { id: personnelId },
    include: { asset: { select: { organizationId: true } } },
  });
  if (!existing || existing.asset.organizationId !== organizationId) {
    throw new Error("Personnel not found");
  }

  const updateData: Record<string, unknown> = {};
  if (data.personName !== undefined) updateData.personName = data.personName;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.accessLevel !== undefined) updateData.accessLevel = data.accessLevel;
  if (data.mfaEnabled !== undefined) updateData.mfaEnabled = data.mfaEnabled;
  if (data.lastTraining !== undefined)
    updateData.lastTraining = data.lastTraining;
  if (data.trainingRequired !== undefined)
    updateData.trainingRequired = data.trainingRequired;
  if (data.clearanceLevel !== undefined)
    updateData.clearanceLevel = data.clearanceLevel;
  if (data.accessGrantedAt !== undefined)
    updateData.accessGrantedAt = data.accessGrantedAt;
  if (data.accessExpiresAt !== undefined)
    updateData.accessExpiresAt = data.accessExpiresAt;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.assetPersonnel.update({
    where: { id: personnelId },
    data: updateData,
  });

  await logAuditEvent({
    userId,
    action: "nexus_personnel_updated",
    entityType: "nexus_personnel",
    entityId: personnelId,
    description: `Updated personnel "${updated.personName}"`,
    previousValue: { personName: existing.personName, role: existing.role },
    newValue: { personName: updated.personName, role: updated.role },
    organizationId,
  });

  return updated;
}

/**
 * Get all personnel for an asset.
 */
export async function getPersonnelForAsset(
  assetId: string,
  organizationId: string,
) {
  return prisma.assetPersonnel.findMany({
    where: {
      assetId,
      asset: { organizationId },
    },
  });
}

/**
 * Get MFA adoption rate: count(mfaEnabled=true, isActive=true) / count(isActive=true) * 100.
 */
export async function getMfaAdoptionRate(organizationId: string) {
  const [totalActive, mfaEnabled] = await Promise.all([
    prisma.assetPersonnel.count({
      where: { isActive: true, asset: { organizationId } },
    }),
    prisma.assetPersonnel.count({
      where: { isActive: true, mfaEnabled: true, asset: { organizationId } },
    }),
  ]);

  if (totalActive === 0) return 100;
  return (mfaEnabled / totalActive) * 100;
}

/**
 * Get training dashboard for an organization.
 */
export async function getTrainingDashboard(organizationId: string) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const [totalActive, trainingCompliant, trainingOverdue, personnel] =
    await Promise.all([
      prisma.assetPersonnel.count({
        where: { isActive: true, asset: { organizationId } },
      }),
      prisma.assetPersonnel.count({
        where: {
          isActive: true,
          trainingRequired: true,
          lastTraining: { gte: oneYearAgo },
          asset: { organizationId },
        },
      }),
      prisma.assetPersonnel.count({
        where: {
          isActive: true,
          trainingRequired: true,
          OR: [{ lastTraining: { lt: oneYearAgo } }, { lastTraining: null }],
          asset: { organizationId },
        },
      }),
      prisma.assetPersonnel.findMany({
        where: { isActive: true, asset: { organizationId } },
        select: { role: true },
      }),
    ]);

  // Build role distribution
  const byRole: Record<string, number> = {};
  for (const p of personnel) {
    byRole[p.role] = (byRole[p.role] ?? 0) + 1;
  }

  return {
    totalActive,
    trainingCompliant,
    trainingOverdue,
    byRole,
  };
}
