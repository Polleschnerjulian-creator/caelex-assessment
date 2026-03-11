import { prisma } from "@/lib/prisma";
import { getImpactAnalysis } from "../dependency-service.server";
import type { ImpactAnalysisResult } from "../types";

// ═══════════════════════════════════════════════════════════
// NEXUS ↔ Incident Management — Integration Bridge
// ═══════════════════════════════════════════════════════════

/**
 * Run NEXUS impact analysis for all assets linked to an incident.
 *
 * Queries all IncidentAsset records for the given incident that have a
 * nexusAssetId, runs getImpactAnalysis for each, then flattens and
 * deduplicates the results by assetId+impactLevel key.
 */
export async function getImpactForIncident(
  incidentId: string,
  organizationId: string,
): Promise<ImpactAnalysisResult[]> {
  const linkedAssets = await prisma.incidentAsset.findMany({
    where: {
      incidentId,
      nexusAssetId: { not: null },
    },
    select: { nexusAssetId: true },
  });

  if (linkedAssets.length === 0) return [];

  const assetIds = linkedAssets
    .map((a) => a.nexusAssetId)
    .filter((id): id is string => id !== null);

  // Run impact analysis for each linked NEXUS asset in parallel
  const analyses = await Promise.all(
    assetIds.map((assetId) => getImpactAnalysis(assetId, organizationId)),
  );

  // Flatten all results
  const flat = analyses.flat();

  // Deduplicate by assetId + impactLevel (keep first occurrence, which is the
  // highest-priority impact level from the BFS traversal)
  const seen = new Set<string>();
  const deduplicated: ImpactAnalysisResult[] = [];

  for (const result of flat) {
    const key = `${result.assetId}:${result.impactLevel}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(result);
    }
  }

  return deduplicated;
}

/**
 * Check whether it is safe to decommission a NEXUS asset.
 *
 * Returns safe=true only when there are no open incidents (status not
 * 'resolved' or 'closed') referencing the asset via IncidentAsset.nexusAssetId.
 */
export async function checkDecommissionSafety(assetId: string): Promise<{
  safe: boolean;
  openIncidents: number;
  incidentIds: string[];
}> {
  const openLinks = await prisma.incidentAsset.findMany({
    where: {
      nexusAssetId: assetId,
      incident: {
        status: {
          notIn: ["resolved", "closed"],
        },
      },
    },
    select: { incidentId: true },
  });

  const incidentIds = [...new Set(openLinks.map((l) => l.incidentId))];

  return {
    safe: incidentIds.length === 0,
    openIncidents: incidentIds.length,
    incidentIds,
  };
}
