import "server-only";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
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
 * This does NOT auto-modify NIS2 assessment data. It only logs the event
 * to signal that a manual NIS2 sync may be needed.
 */
export async function syncNexusStatusToNis2(
  assetId: string,
  requirementId: string,
  newStatus: ComplianceStatus,
): Promise<void> {
  // Determine the org for the audit log
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, isDeleted: false },
    select: { organizationId: true },
  });

  if (!asset) return;

  await logAuditEvent({
    userId: "system",
    action: "nexus_requirement_synced",
    entityType: "nexus_requirement",
    entityId: assetId,
    description: `NEXUS requirement "${requirementId}" status changed to "${newStatus}", manual NIS2 sync may be needed`,
    newValue: { requirementId, status: newStatus, direction: "nexus_to_nis2" },
    organizationId: asset.organizationId,
  });
}
