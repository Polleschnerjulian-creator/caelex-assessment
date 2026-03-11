import "server-only";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  getAssetTypeConfig,
  getCategoryForType,
  CRITICALITY_WEIGHTS,
  NIS2_REQUIREMENT_LABELS,
} from "./types";
import type {
  AssetFiltersInput,
  CreateAssetInput,
  UpdateAssetInput,
} from "./validations";
import { type AssetType, Prisma } from "@prisma/client";

// ═══════════════════════════════════════════════════════════
// NEXUS — Asset Service
// ═══════════════════════════════════════════════════════════

/**
 * Create a new asset with auto-derived category, NIS2/EU Space Act flags,
 * and bulk-created default NIS2 requirements.
 */
export async function createAsset(
  input: CreateAssetInput,
  organizationId: string,
  userId: string,
) {
  const typeConfig = getAssetTypeConfig(input.assetType as AssetType);
  const category = getCategoryForType(input.assetType as AssetType);

  const asset = await prisma.asset.create({
    data: {
      name: input.name,
      assetType: input.assetType as AssetType,
      category,
      description: input.description,
      externalId: input.externalId,
      criticality: input.criticality,
      dataClassification: input.dataClassification,
      operationalStatus: input.operationalStatus,
      location: input.location,
      jurisdiction: input.jurisdiction,
      manufacturer: input.manufacturer,
      commissionedDate: input.commissionedDate
        ? new Date(input.commissionedDate)
        : undefined,
      expectedEolDate: input.expectedEolDate
        ? new Date(input.expectedEolDate)
        : undefined,
      spacecraftId: input.spacecraftId,
      operatorEntityId: input.operatorEntityId,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
      nis2Relevant: typeConfig?.nis2Relevant ?? false,
      euSpaceActRelevant: typeConfig?.euSpaceActRelevant ?? false,
      organizationId,
      createdBy: userId,
    },
  });

  // Bulk-create default NIS2 requirements if the type config has them
  if (typeConfig?.defaultNis2Requirements?.length) {
    await prisma.assetRequirement.createMany({
      data: typeConfig.defaultNis2Requirements.map((reqId) => ({
        assetId: asset.id,
        regulationFramework: "NIS2",
        requirementId: reqId,
        requirementLabel: NIS2_REQUIREMENT_LABELS[reqId] ?? reqId,
        status: "NOT_ASSESSED" as const,
      })),
      skipDuplicates: true,
    });
  }

  await logAuditEvent({
    userId,
    action: "nexus_asset_created",
    entityType: "nexus_asset",
    entityId: asset.id,
    description: `Created asset "${asset.name}"`,
    newValue: { name: asset.name, assetType: asset.assetType },
    organizationId,
  });

  return asset;
}

/**
 * Update an existing asset, capturing previous/new values for audit trail.
 */
export async function updateAsset(
  id: string,
  input: UpdateAssetInput,
  organizationId: string,
  userId: string,
) {
  const previous = await prisma.asset.findFirst({
    where: { id, organizationId },
  });

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.assetType !== undefined) {
    updateData.assetType = input.assetType as AssetType;
    updateData.category = getCategoryForType(input.assetType as AssetType);
    const typeConfig = getAssetTypeConfig(input.assetType as AssetType);
    if (typeConfig) {
      updateData.nis2Relevant = typeConfig.nis2Relevant;
      updateData.euSpaceActRelevant = typeConfig.euSpaceActRelevant;
    }
  }
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.externalId !== undefined) updateData.externalId = input.externalId;
  if (input.criticality !== undefined)
    updateData.criticality = input.criticality;
  if (input.dataClassification !== undefined)
    updateData.dataClassification = input.dataClassification;
  if (input.operationalStatus !== undefined)
    updateData.operationalStatus = input.operationalStatus;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.jurisdiction !== undefined)
    updateData.jurisdiction = input.jurisdiction;
  if (input.manufacturer !== undefined)
    updateData.manufacturer = input.manufacturer;
  if (input.commissionedDate !== undefined)
    updateData.commissionedDate = input.commissionedDate
      ? new Date(input.commissionedDate)
      : null;
  if (input.expectedEolDate !== undefined)
    updateData.expectedEolDate = input.expectedEolDate
      ? new Date(input.expectedEolDate)
      : null;
  if (input.spacecraftId !== undefined)
    updateData.spacecraftId = input.spacecraftId;
  if (input.operatorEntityId !== undefined)
    updateData.operatorEntityId = input.operatorEntityId;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;

  const updated = await prisma.asset.update({
    where: { id },
    data: updateData,
  });

  await logAuditEvent({
    userId,
    action: "nexus_asset_updated",
    entityType: "nexus_asset",
    entityId: id,
    description: `Updated asset "${updated.name}"`,
    previousValue: previous
      ? { name: previous.name, assetType: previous.assetType }
      : undefined,
    newValue: { name: updated.name, assetType: updated.assetType },
    organizationId,
  });

  return updated;
}

/**
 * Soft-delete an asset (sets isDeleted=true).
 */
export async function softDeleteAsset(
  id: string,
  organizationId: string,
  userId: string,
) {
  const asset = await prisma.asset.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId,
    action: "nexus_asset_deleted",
    entityType: "nexus_asset",
    entityId: id,
    description: `Deleted asset "${asset.name}"`,
    organizationId,
  });

  return asset;
}

/**
 * Get an asset by ID with all related data included.
 */
export async function getAssetById(id: string, organizationId: string) {
  return prisma.asset.findFirst({
    where: { id, organizationId, isDeleted: false },
    include: {
      requirements: true,
      dependenciesFrom: {
        include: { targetAsset: true },
      },
      dependenciesTo: {
        include: { sourceAsset: true },
      },
      suppliers: true,
      vulnerabilities: true,
      personnel: true,
      spacecraft: true,
      operatorEntity: true,
    },
  });
}

/**
 * Get a paginated, filtered list of assets for an organization.
 */
export async function getAssetsByOrganization(
  organizationId: string,
  filters: AssetFiltersInput,
) {
  const {
    search,
    category,
    assetType,
    criticality,
    operationalStatus,
    minComplianceScore,
    maxComplianceScore,
    showDecommissioned,
    page,
    limit,
    sortBy,
    sortOrder,
  } = filters;

  const where: Record<string, unknown> = {
    organizationId,
    isDeleted: false,
  };

  if (!showDecommissioned) {
    where.operationalStatus = { not: "DECOMMISSIONED" };
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (category) {
    const categories = category.split(",").map((c) => c.trim());
    where.category = { in: categories };
  }

  if (assetType) {
    const types = assetType.split(",").map((t) => t.trim());
    where.assetType = { in: types };
  }

  if (criticality) {
    const criticalities = criticality.split(",").map((c) => c.trim());
    where.criticality = { in: criticalities };
  }

  if (operationalStatus) {
    const statuses = operationalStatus.split(",").map((s) => s.trim());
    where.operationalStatus = { in: statuses };
  }

  if (minComplianceScore !== undefined || maxComplianceScore !== undefined) {
    const scoreFilter: Record<string, number> = {};
    if (minComplianceScore !== undefined) scoreFilter.gte = minComplianceScore;
    if (maxComplianceScore !== undefined) scoreFilter.lte = maxComplianceScore;
    where.complianceScore = scoreFilter;
  }

  const skip = (page - 1) * limit;

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.asset.count({ where }),
  ]);

  return { assets, total, page, limit };
}

// ─── Requirement weights ───
const CRITICAL_REQUIREMENTS = new Set([
  "art_21_2_a",
  "art_21_2_b",
  "art_21_2_e",
  "art_21_2_h",
]);
const MAJOR_REQUIREMENTS = new Set(["art_21_2_c", "art_21_2_d", "art_21_2_f"]);

function getRequirementWeight(requirementId: string): number {
  if (CRITICAL_REQUIREMENTS.has(requirementId)) return 2.0;
  if (MAJOR_REQUIREMENTS.has(requirementId)) return 1.5;
  return 1.0;
}

function getComplianceScore(status: string): number | null {
  switch (status) {
    case "COMPLIANT":
      return 1.0;
    case "PARTIAL":
      return 0.5;
    case "NON_COMPLIANT":
      return 0.0;
    case "NOT_ASSESSED":
      return 0.0;
    case "NOT_APPLICABLE":
      return null; // skip
    default:
      return 0.0;
  }
}

/**
 * Calculate the compliance score for an asset and persist it.
 * Returns the calculated score (0–100).
 */
export async function calculateAssetComplianceScore(
  assetId: string,
): Promise<number> {
  const requirements = await prisma.assetRequirement.findMany({
    where: { assetId },
  });

  if (!requirements.length) {
    await prisma.asset.update({
      where: { id: assetId },
      data: { complianceScore: 0, lastAssessedAt: new Date() },
    });
    return 0;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const req of requirements) {
    const score = getComplianceScore(req.status);
    if (score === null) continue; // NOT_APPLICABLE — skip

    const weight = getRequirementWeight(req.requirementId);
    weightedSum += score * weight;
    totalWeight += weight;
  }

  const complianceScore =
    totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

  await prisma.asset.update({
    where: { id: assetId },
    data: { complianceScore, lastAssessedAt: new Date() },
  });

  return complianceScore;
}

/**
 * Calculate the risk score for an asset and persist it.
 * Returns the calculated score (0–100, capped).
 */
export async function calculateAssetRiskScore(
  assetId: string,
): Promise<number> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId },
    include: {
      requirements: true,
      vulnerabilities: true,
      dependenciesTo: true,
    },
  });

  if (!asset) return 0;

  const criticalityWeight =
    CRITICALITY_WEIGHTS[
      asset.criticality as keyof typeof CRITICALITY_WEIGHTS
    ] ?? 0.5;
  const complianceScore = asset.complianceScore ?? 0;

  const base = criticalityWeight * (100 - complianceScore);

  // Count open vulnerabilities
  const openVulns = asset.vulnerabilities.filter(
    (v: { status: string }) =>
      v.status === "OPEN" || v.status === "IN_PROGRESS",
  );
  const openCriticalVulns = openVulns.filter(
    (v: { severity: string }) => v.severity === "CRITICAL",
  ).length;
  const openHighVulns = openVulns.filter(
    (v: { severity: string }) => v.severity === "HIGH",
  ).length;

  const rawVulnFactor = 1 + openCriticalVulns * 0.2 + openHighVulns * 0.1;
  const vulnFactor = Math.min(rawVulnFactor, 2.0);

  // SPOF: true if there is at least one HARD dependency with no REDUNDANT of the same type
  const deps = asset.dependenciesTo as Array<{
    strength: string;
    dependencyType: string;
  }>;
  const hasHardDep = deps.some((d) => d.strength === "HARD");
  const hasRedundantDep = deps.some((d) => d.strength === "REDUNDANT");
  const spofFactor = hasHardDep && !hasRedundantDep ? 1.3 : 1.0;

  const rawRiskScore = base * vulnFactor * spofFactor;
  const riskScore = Math.min(rawRiskScore, 100);

  await prisma.asset.update({
    where: { id: assetId },
    data: { riskScore },
  });

  return riskScore;
}

/**
 * Recalculate compliance and risk scores for all non-deleted assets in an org.
 */
export async function recalculateOrganizationScores(
  organizationId: string,
  userId: string,
) {
  const assets = await prisma.asset.findMany({
    where: { organizationId, isDeleted: false },
    select: { id: true },
  });

  for (const asset of assets) {
    await calculateAssetComplianceScore(asset.id);
    await calculateAssetRiskScore(asset.id);
  }

  await logAuditEvent({
    userId,
    action: "nexus_scores_recalculated",
    entityType: "nexus_asset",
    entityId: organizationId,
    description: `Recalculated scores for ${assets.length} assets`,
    newValue: { assetCount: assets.length },
    organizationId,
  });
}

/**
 * Get a high-level risk overview for an organization.
 */
export async function getOrganizationRiskOverview(organizationId: string) {
  const assets = await prisma.asset.findMany({
    where: { organizationId, isDeleted: false },
    select: {
      id: true,
      name: true,
      category: true,
      criticality: true,
      complianceScore: true,
      riskScore: true,
    },
  });

  const totalAssets = assets.length;

  if (!totalAssets) {
    return {
      totalAssets: 0,
      byCategory: {},
      byCriticality: {},
      averageComplianceScore: 0,
      averageRiskScore: 0,
      topRiskAssets: [],
      lowComplianceCount: 0,
    };
  }

  // By category count
  const byCategory: Record<string, number> = {};
  for (const asset of assets) {
    byCategory[asset.category] = (byCategory[asset.category] ?? 0) + 1;
  }

  // By criticality count
  const byCriticality: Record<string, number> = {};
  for (const asset of assets) {
    byCriticality[asset.criticality] =
      (byCriticality[asset.criticality] ?? 0) + 1;
  }

  // Averages
  const complianceScores = assets
    .map((a) => a.complianceScore ?? 0)
    .filter((s) => s !== null) as number[];
  const riskScores = assets
    .map((a) => a.riskScore ?? 0)
    .filter((s) => s !== null) as number[];

  const averageComplianceScore =
    complianceScores.reduce((acc, s) => acc + s, 0) / totalAssets;
  const averageRiskScore =
    riskScores.reduce((acc, s) => acc + s, 0) / totalAssets;

  // Top 5 highest risk assets
  const topRiskAssets = [...assets]
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 5);

  // Count assets with compliance < 50%
  const lowComplianceCount = assets.filter(
    (a) => (a.complianceScore ?? 0) < 50,
  ).length;

  return {
    totalAssets,
    byCategory,
    byCriticality,
    averageComplianceScore,
    averageRiskScore,
    topRiskAssets,
    lowComplianceCount,
  };
}
