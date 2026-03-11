import "server-only";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// ═══════════════════════════════════════════════════════════
// NEXUS — Supplier Service
// ═══════════════════════════════════════════════════════════

/**
 * Add a supplier to an asset.
 */
export async function addSupplier(
  assetId: string,
  data: {
    supplierName: string;
    supplierType: string;
    jurisdiction?: string;
    riskLevel?: string;
    certifications?: string[];
    lastAssessed?: Date;
    contractExpiry?: Date;
    singlePointOfFailure?: boolean;
    alternativeAvailable?: boolean;
    notes?: string;
  },
  organizationId: string,
  userId: string,
) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId, isDeleted: false },
  });
  if (!asset) throw new Error("Asset not found");

  const supplier = await prisma.assetSupplier.create({
    data: {
      assetId,
      supplierName: data.supplierName,
      supplierType: data.supplierType as never,
      jurisdiction: data.jurisdiction,
      riskLevel: (data.riskLevel as never) ?? "MEDIUM",
      certifications: data.certifications ?? [],
      lastAssessed: data.lastAssessed,
      contractExpiry: data.contractExpiry,
      singlePointOfFailure: data.singlePointOfFailure ?? false,
      alternativeAvailable: data.alternativeAvailable ?? false,
      notes: data.notes,
    },
  });

  await logAuditEvent({
    userId,
    action: "nexus_supplier_added",
    entityType: "nexus_supplier",
    entityId: supplier.id,
    description: `Added supplier "${supplier.supplierName}" to asset`,
    newValue: {
      supplierName: supplier.supplierName,
      supplierType: supplier.supplierType,
    },
    organizationId,
  });

  return supplier;
}

/**
 * Update an existing supplier.
 */
export async function updateSupplier(
  supplierId: string,
  data: {
    supplierName?: string;
    supplierType?: string;
    jurisdiction?: string;
    riskLevel?: string;
    certifications?: string[];
    lastAssessed?: Date;
    contractExpiry?: Date;
    singlePointOfFailure?: boolean;
    alternativeAvailable?: boolean;
    notes?: string;
  },
  organizationId: string,
  userId: string,
) {
  const existing = await prisma.assetSupplier.findFirst({
    where: { id: supplierId },
    include: { asset: { select: { organizationId: true } } },
  });
  if (!existing || existing.asset.organizationId !== organizationId) {
    throw new Error("Supplier not found");
  }

  const updateData: Record<string, unknown> = {};
  if (data.supplierName !== undefined)
    updateData.supplierName = data.supplierName;
  if (data.supplierType !== undefined)
    updateData.supplierType = data.supplierType;
  if (data.jurisdiction !== undefined)
    updateData.jurisdiction = data.jurisdiction;
  if (data.riskLevel !== undefined) updateData.riskLevel = data.riskLevel;
  if (data.certifications !== undefined)
    updateData.certifications = data.certifications;
  if (data.lastAssessed !== undefined)
    updateData.lastAssessed = data.lastAssessed;
  if (data.contractExpiry !== undefined)
    updateData.contractExpiry = data.contractExpiry;
  if (data.singlePointOfFailure !== undefined)
    updateData.singlePointOfFailure = data.singlePointOfFailure;
  if (data.alternativeAvailable !== undefined)
    updateData.alternativeAvailable = data.alternativeAvailable;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await prisma.assetSupplier.update({
    where: { id: supplierId },
    data: updateData,
  });

  await logAuditEvent({
    userId,
    action: "nexus_supplier_updated",
    entityType: "nexus_supplier",
    entityId: supplierId,
    description: `Updated supplier "${updated.supplierName}"`,
    previousValue: {
      supplierName: existing.supplierName,
      riskLevel: existing.riskLevel,
    },
    newValue: {
      supplierName: updated.supplierName,
      riskLevel: updated.riskLevel,
    },
    organizationId,
  });

  return updated;
}

/**
 * Get all suppliers for an asset.
 */
export async function getSuppliersForAsset(
  assetId: string,
  organizationId: string,
) {
  return prisma.assetSupplier.findMany({
    where: {
      assetId,
      asset: { organizationId },
    },
  });
}

/**
 * Get supply chain risk dashboard for an organization.
 */
export async function getSupplyChainRiskDashboard(organizationId: string) {
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  const [
    totalSuppliers,
    spofCount,
    critical,
    high,
    medium,
    low,
    expiringContracts,
    suppliers,
  ] = await Promise.all([
    prisma.assetSupplier.count({ where: { asset: { organizationId } } }),
    prisma.assetSupplier.count({
      where: {
        singlePointOfFailure: true,
        alternativeAvailable: false,
        asset: { organizationId },
      },
    }),
    prisma.assetSupplier.count({
      where: { riskLevel: "CRITICAL", asset: { organizationId } },
    }),
    prisma.assetSupplier.count({
      where: { riskLevel: "HIGH", asset: { organizationId } },
    }),
    prisma.assetSupplier.count({
      where: { riskLevel: "MEDIUM", asset: { organizationId } },
    }),
    prisma.assetSupplier.count({
      where: { riskLevel: "LOW", asset: { organizationId } },
    }),
    prisma.assetSupplier.count({
      where: {
        contractExpiry: { lte: ninetyDaysFromNow, gte: new Date() },
        asset: { organizationId },
      },
    }),
    prisma.assetSupplier.findMany({
      where: { asset: { organizationId } },
      select: { jurisdiction: true },
    }),
  ]);

  // Build jurisdiction distribution
  const jurisdictionDistribution: Record<string, number> = {};
  for (const s of suppliers) {
    const j = s.jurisdiction ?? "Unknown";
    jurisdictionDistribution[j] = (jurisdictionDistribution[j] ?? 0) + 1;
  }

  return {
    totalSuppliers,
    spofCount,
    byRiskLevel: { CRITICAL: critical, HIGH: high, MEDIUM: medium, LOW: low },
    expiringContracts,
    jurisdictionDistribution,
  };
}
