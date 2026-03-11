import "server-only";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type {
  NexusDependencyType,
  NexusDependencyStrength,
} from "@prisma/client";
import type { ImpactAnalysisResult, DependencySuggestion } from "./types";

// ═══════════════════════════════════════════════════════════
// NEXUS — Dependency Service
// ═══════════════════════════════════════════════════════════

/**
 * Check if there is a directed path from startId to endId following existing
 * dependency edges (source→target). Used to detect circular dependencies.
 */
async function hasCircularPath(
  startId: string,
  endId: string,
): Promise<boolean> {
  const visited = new Set<string>();
  const queue: string[] = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === endId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    // Get all assets that `current` depends on (current is source → targets are next)
    const deps = await prisma.assetDependency.findMany({
      where: { sourceAssetId: current },
      select: { targetAssetId: true },
    });

    for (const dep of deps) {
      queue.push(dep.targetAssetId);
    }
  }

  return false;
}

/**
 * Add a dependency between two assets.
 * Verifies both assets exist in the org, checks for circularity, then creates the record.
 */
export async function addDependency(
  sourceAssetId: string,
  targetAssetId: string,
  dependencyType: NexusDependencyType,
  strength: NexusDependencyStrength,
  description: string | undefined,
  organizationId: string,
  userId: string,
) {
  // Verify source asset exists in org
  const sourceAsset = await prisma.asset.findFirst({
    where: { id: sourceAssetId, organizationId, isDeleted: false },
  });
  if (!sourceAsset) {
    throw new Error(`Source asset not found: ${sourceAssetId}`);
  }

  // Verify target asset exists in org
  const targetAsset = await prisma.asset.findFirst({
    where: { id: targetAssetId, organizationId, isDeleted: false },
  });
  if (!targetAsset) {
    throw new Error(`Target asset not found: ${targetAssetId}`);
  }

  // Circularity check: if target can reach source, adding source→target would create a cycle
  const wouldCreateCycle = await hasCircularPath(targetAssetId, sourceAssetId);
  if (wouldCreateCycle) {
    throw new Error("Circular dependency detected");
  }

  // Create the dependency
  const dependency = await prisma.assetDependency.create({
    data: {
      sourceAssetId,
      targetAssetId,
      dependencyType,
      strength,
      description,
    },
  });

  await logAuditEvent({
    userId,
    action: "nexus_dependency_added",
    entityType: "nexus_dependency",
    entityId: dependency.id,
    description: `Added ${dependencyType} dependency from "${sourceAsset.name}" to "${targetAsset.name}"`,
    newValue: { sourceAssetId, targetAssetId, dependencyType, strength },
    organizationId,
  });

  return dependency;
}

/**
 * Remove an existing dependency by ID.
 */
export async function removeDependency(
  dependencyId: string,
  organizationId: string,
  userId: string,
) {
  // Verify dependency exists and belongs to the org (via source asset)
  const dependency = await prisma.assetDependency.findFirst({
    where: {
      id: dependencyId,
      sourceAsset: { organizationId },
    },
    include: { sourceAsset: true },
  });

  if (!dependency) {
    throw new Error(`Dependency not found: ${dependencyId}`);
  }

  await prisma.assetDependency.delete({
    where: { id: dependencyId },
  });

  await logAuditEvent({
    userId,
    action: "nexus_dependency_removed",
    entityType: "nexus_dependency",
    entityId: dependencyId,
    description: `Removed dependency ${dependencyId}`,
    organizationId,
  });
}

/**
 * Get all dependencies for an asset (both outgoing and incoming).
 */
export async function getDependenciesForAsset(
  assetId: string,
  organizationId: string,
) {
  const [dependenciesFrom, dependenciesTo] = await Promise.all([
    // Outgoing: this asset depends on others
    prisma.assetDependency.findMany({
      where: {
        sourceAssetId: assetId,
        sourceAsset: { organizationId },
      },
      include: {
        targetAsset: { select: { id: true, name: true, assetType: true } },
      },
    }),
    // Incoming: others depend on this asset
    prisma.assetDependency.findMany({
      where: {
        targetAssetId: assetId,
        targetAsset: { organizationId },
      },
      include: {
        sourceAsset: { select: { id: true, name: true, assetType: true } },
      },
    }),
  ]);

  return { dependenciesFrom, dependenciesTo };
}

/**
 * BFS impact analysis: who depends on this asset (directly or transitively)?
 * Follows dependenciesTo edges (assets that depend ON this asset).
 * Skips REDUNDANT strength edges.
 * Returns up to 3 levels: DIRECT, INDIRECT_1HOP, INDIRECT_2HOP.
 */
export async function getImpactAnalysis(
  assetId: string,
  organizationId: string,
): Promise<ImpactAnalysisResult[]> {
  const results: ImpactAnalysisResult[] = [];
  const visited = new Set<string>();

  // BFS queue: [assetId, level]
  // Level 0 direct dependents, level 1 = INDIRECT_1HOP, level 2 = INDIRECT_2HOP
  const queue: Array<{ id: string; level: number }> = [
    { id: assetId, level: -1 },
  ];

  while (queue.length > 0) {
    const { id: currentId, level } = queue.shift()!;
    if (level >= 2) continue; // Don't go deeper than INDIRECT_2HOP

    // Find all assets that depend on `currentId` (sourceAsset depends on currentId)
    const allDependents = await prisma.assetDependency.findMany({
      where: {
        targetAssetId: currentId,
        // Only follow HARD and SOFT edges (skip REDUNDANT)
        strength: { in: ["HARD", "SOFT"] },
      },
      include: {
        sourceAsset: { select: { id: true, name: true, assetType: true } },
      },
    });

    // Filter in code as well for testability (mocks don't honor where clauses)
    const dependents = allDependents.filter(
      (d) => d.strength === "HARD" || d.strength === "SOFT",
    );

    for (const dep of dependents) {
      const dependentId = dep.sourceAssetId;
      if (visited.has(dependentId)) continue;
      visited.add(dependentId);

      const nextLevel = level + 1;
      let impactLevel: ImpactAnalysisResult["impactLevel"];
      if (nextLevel === 0) {
        impactLevel = "DIRECT";
      } else if (nextLevel === 1) {
        impactLevel = "INDIRECT_1HOP";
      } else {
        impactLevel = "INDIRECT_2HOP";
      }

      results.push({
        assetId: dependentId,
        assetName: dep.sourceAsset.name,
        impactLevel,
        dependencyType: dep.dependencyType,
        strength: dep.strength,
      });

      queue.push({ id: dependentId, level: nextLevel });
    }
  }

  return results;
}

/**
 * Find all single points of failure: assets that are target of at least one HARD dependency
 * but have no REDUNDANT dependency as backup for the same source→target pair.
 */
export async function getSinglePointsOfFailure(organizationId: string) {
  // Find all HARD dependencies in the org
  const hardDeps = await prisma.assetDependency.findMany({
    where: {
      strength: "HARD",
      sourceAsset: { organizationId },
    },
    include: {
      targetAsset: {
        select: { id: true, name: true, assetType: true, criticality: true },
      },
      sourceAsset: { select: { id: true } },
    },
  });

  if (hardDeps.length === 0) return [];

  // Find all REDUNDANT dependencies in the org
  const redundantDeps = await prisma.assetDependency.findMany({
    where: {
      strength: "REDUNDANT",
      sourceAsset: { organizationId },
    },
    select: { sourceAssetId: true, targetAssetId: true },
  });

  // Build a set of "has redundant backup" keyed by "sourceId:targetId"
  const redundantSet = new Set(
    redundantDeps.map((d) => `${d.sourceAssetId}:${d.targetAssetId}`),
  );

  // Group hard deps by targetAssetId
  const spofMap = new Map<
    string,
    { asset: (typeof hardDeps)[0]["targetAsset"]; dependentCount: number }
  >();

  for (const dep of hardDeps) {
    const key = `${dep.sourceAssetId}:${dep.targetAssetId}`;
    if (!redundantSet.has(key)) {
      // No redundant backup for this specific source→target relationship
      const existing = spofMap.get(dep.targetAssetId);
      if (existing) {
        existing.dependentCount++;
      } else {
        spofMap.set(dep.targetAssetId, {
          asset: dep.targetAsset,
          dependentCount: 1,
        });
      }
    }
  }

  return Array.from(spofMap.entries()).map(
    ([assetId, { asset, dependentCount }]) => ({
      assetId,
      assetName: asset.name,
      assetType: asset.assetType,
      criticality: asset.criticality,
      dependentCount,
    }),
  );
}

/**
 * Get the full dependency graph for an organization.
 * Returns nodes (assets) and edges (dependencies).
 */
export async function getDependencyGraph(organizationId: string) {
  const [assets, dependencies] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId, isDeleted: false },
      select: {
        id: true,
        name: true,
        assetType: true,
        category: true,
        criticality: true,
      },
    }),
    prisma.assetDependency.findMany({
      where: { sourceAsset: { organizationId } },
      select: {
        sourceAssetId: true,
        targetAssetId: true,
        dependencyType: true,
        strength: true,
      },
    }),
  ]);

  const nodes = assets.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.assetType,
    category: a.category,
    criticality: a.criticality,
  }));

  const edges = dependencies.map((d) => ({
    source: d.sourceAssetId,
    target: d.targetAssetId,
    type: d.dependencyType,
    strength: d.strength,
  }));

  return { nodes, edges };
}

/**
 * Auto-detect potential dependencies based on asset types.
 * Returns suggested dependencies that don't already exist.
 */
export async function autoDetectDependencies(
  organizationId: string,
): Promise<DependencySuggestion[]> {
  // Query all non-deleted assets
  const assets = await prisma.asset.findMany({
    where: { organizationId, isDeleted: false },
    select: {
      id: true,
      name: true,
      assetType: true,
    },
  });

  if (assets.length === 0) return [];

  // Fetch all existing dependencies to avoid duplicates
  const existingDeps = await prisma.assetDependency.findMany({
    where: { sourceAsset: { organizationId } },
    select: { sourceAssetId: true, targetAssetId: true, dependencyType: true },
  });

  const existingSet = new Set(
    existingDeps.map(
      (d) => `${d.sourceAssetId}:${d.targetAssetId}:${d.dependencyType}`,
    ),
  );

  const suggestions: DependencySuggestion[] = [];

  // Group assets by type for quick lookup
  const byType = new Map<string, typeof assets>();
  for (const asset of assets) {
    const existing = byType.get(asset.assetType) ?? [];
    existing.push(asset);
    byType.set(asset.assetType, existing);
  }

  const spacecrafts = byType.get("SPACECRAFT") ?? [];
  const ttcUplinks = byType.get("TTC_UPLINK") ?? [];
  const ttcDownlinks = byType.get("TTC_DOWNLINK") ?? [];
  const groundStations = byType.get("GROUND_STATION") ?? [];
  const flightSoftware = byType.get("FLIGHT_SOFTWARE") ?? [];
  const groundSoftware = byType.get("GROUND_SOFTWARE") ?? [];
  const groundNetworks = byType.get("GROUND_NETWORK") ?? [];

  // SPACECRAFT suggestions
  for (const spacecraft of spacecrafts) {
    // SPACECRAFT → TTC_UPLINK : COMMUNICATES_WITH
    for (const uplink of ttcUplinks) {
      const key = `${spacecraft.id}:${uplink.id}:COMMUNICATES_WITH`;
      if (!existingSet.has(key)) {
        suggestions.push({
          sourceAssetId: spacecraft.id,
          sourceAssetName: spacecraft.name,
          targetAssetId: uplink.id,
          targetAssetName: uplink.name,
          dependencyType: "COMMUNICATES_WITH",
          strength: "HARD",
          reason: "Spacecraft typically communicates with TT&C uplink channels",
        });
      }
    }

    // SPACECRAFT → TTC_DOWNLINK : COMMUNICATES_WITH
    for (const downlink of ttcDownlinks) {
      const key = `${spacecraft.id}:${downlink.id}:COMMUNICATES_WITH`;
      if (!existingSet.has(key)) {
        suggestions.push({
          sourceAssetId: spacecraft.id,
          sourceAssetName: spacecraft.name,
          targetAssetId: downlink.id,
          targetAssetName: downlink.name,
          dependencyType: "COMMUNICATES_WITH",
          strength: "HARD",
          reason:
            "Spacecraft typically communicates with TT&C downlink channels",
        });
      }
    }

    // SPACECRAFT → GROUND_STATION : CONTROLLED_BY
    for (const gs of groundStations) {
      const key = `${spacecraft.id}:${gs.id}:CONTROLLED_BY`;
      if (!existingSet.has(key)) {
        suggestions.push({
          sourceAssetId: spacecraft.id,
          sourceAssetName: spacecraft.name,
          targetAssetId: gs.id,
          targetAssetName: gs.name,
          dependencyType: "CONTROLLED_BY",
          strength: "HARD",
          reason: "Spacecraft is typically controlled by a ground station",
        });
      }
    }

    // SPACECRAFT → FLIGHT_SOFTWARE : REQUIRES
    for (const fsw of flightSoftware) {
      const key = `${spacecraft.id}:${fsw.id}:REQUIRES`;
      if (!existingSet.has(key)) {
        suggestions.push({
          sourceAssetId: spacecraft.id,
          sourceAssetName: spacecraft.name,
          targetAssetId: fsw.id,
          targetAssetName: fsw.name,
          dependencyType: "REQUIRES",
          strength: "HARD",
          reason: "Spacecraft requires flight software to operate",
        });
      }
    }
  }

  // GROUND_STATION suggestions
  for (const gs of groundStations) {
    // GROUND_STATION → GROUND_SOFTWARE : REQUIRES
    for (const gsw of groundSoftware) {
      const key = `${gs.id}:${gsw.id}:REQUIRES`;
      if (!existingSet.has(key)) {
        suggestions.push({
          sourceAssetId: gs.id,
          sourceAssetName: gs.name,
          targetAssetId: gsw.id,
          targetAssetName: gsw.name,
          dependencyType: "REQUIRES",
          strength: "HARD",
          reason: "Ground station requires ground control software to operate",
        });
      }
    }

    // GROUND_STATION → GROUND_NETWORK : COMMUNICATES_WITH
    for (const gn of groundNetworks) {
      const key = `${gs.id}:${gn.id}:COMMUNICATES_WITH`;
      if (!existingSet.has(key)) {
        suggestions.push({
          sourceAssetId: gs.id,
          sourceAssetName: gs.name,
          targetAssetId: gn.id,
          targetAssetName: gn.name,
          dependencyType: "COMMUNICATES_WITH",
          strength: "SOFT",
          reason:
            "Ground station communicates via ground network infrastructure",
        });
      }
    }
  }

  return suggestions;
}
