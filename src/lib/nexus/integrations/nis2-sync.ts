import "server-only";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { nis2StatusToComplianceStatus } from "../types";
import { calculateAssetComplianceScore } from "../asset-service.server";
import type { ComplianceStatus } from "@prisma/client";

// ═══════════════════════════════════════════════════════════
// NEXUS ↔ NIS2 — Compliance Status Sync
// ═══════════════════════════════════════════════════════════

/**
 * Sync a NIS2 requirement status change into NEXUS.
 *
 * Finds all AssetRequirements for the given requirementId where the asset
 * belongs to orgId, maps the NIS2 string status to a ComplianceStatus enum
 * value, updates each record, and recalculates the parent asset's compliance
 * score. Emits a `nexus_requirement_synced` audit event per asset.
 */
export async function syncNis2StatusToNexus(
  requirementId: string,
  newStatus: string,
  orgId: string,
): Promise<void> {
  const mappedStatus: ComplianceStatus =
    nis2StatusToComplianceStatus(newStatus);

  // Find all matching AssetRequirements in the org
  const requirements = await prisma.assetRequirement.findMany({
    where: {
      requirementId,
      asset: { organizationId: orgId, isDeleted: false },
    },
    select: { id: true, assetId: true },
  });

  if (requirements.length === 0) return;

  // Collect unique asset IDs for score recalculation
  const assetIds = [...new Set(requirements.map((r) => r.assetId))];

  // Update all matching requirements
  await prisma.assetRequirement.updateMany({
    where: {
      requirementId,
      asset: { organizationId: orgId, isDeleted: false },
    },
    data: { status: mappedStatus },
  });

  // Recalculate compliance score for each affected asset and log audit event
  for (const assetId of assetIds) {
    await calculateAssetComplianceScore(assetId);

    await logAuditEvent({
      userId: "system",
      action: "nexus_requirement_synced",
      entityType: "nexus_requirement",
      entityId: assetId,
      description: `NIS2 requirement "${requirementId}" synced to NEXUS status "${mappedStatus}"`,
      newValue: { requirementId, status: mappedStatus },
      organizationId: orgId,
    });
  }
}

/**
 * Reverse sync: called when a NEXUS requirement status changes.
 *
 * Maps the NEXUS ComplianceStatus to a NIS2 status string, finds the org's
 * latest NIS2 assessment, and updates the matching NIS2RequirementStatus row.
 */
export async function syncNexusStatusToNis2(
  assetId: string,
  requirementId: string,
  newStatus: ComplianceStatus,
): Promise<void> {
  // Determine the org for the asset
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, isDeleted: false },
    select: { organizationId: true },
  });

  if (!asset) return;

  const organizationId = asset.organizationId;

  // Map NEXUS ComplianceStatus to NIS2 status string
  const statusMap: Record<string, string> = {
    COMPLIANT: "compliant",
    PARTIALLY_COMPLIANT: "partial",
    NON_COMPLIANT: "non_compliant",
    NOT_ASSESSED: "not_assessed",
  };

  const nis2Status = statusMap[newStatus] || "not_assessed";

  // Find the org's latest NIS2 assessment
  const nis2Assessment = await prisma.nIS2Assessment.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!nis2Assessment) {
    logger.info(
      "[NEXUS->NIS2] No NIS2 assessment found for org, skipping sync",
    );
    return;
  }

  // Try to update the matching NIS2 requirement status
  const updated = await prisma.nIS2RequirementStatus.updateMany({
    where: {
      assessmentId: nis2Assessment.id,
      requirementId: requirementId,
    },
    data: {
      status: nis2Status,
      notes: `[Auto-synced from NEXUS Asset Register] Status updated to ${nis2Status} based on asset compliance.`,
    },
  });

  if (updated.count > 0) {
    logger.info(`[NEXUS->NIS2] Synced ${requirementId} to ${nis2Status}`);
  }

  await logAuditEvent({
    userId: "system",
    action: "nexus_nis2_reverse_sync",
    entityType: "nexus_asset",
    entityId: assetId,
    newValue: {
      requirementId,
      nis2Status,
      syncedToAssessment: nis2Assessment.id,
    },
    description: `Reverse-synced NEXUS requirement ${requirementId} status to NIS2 assessment`,
    organizationId,
  });
}
