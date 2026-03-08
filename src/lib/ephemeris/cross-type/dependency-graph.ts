import "server-only";
import type { PrismaClient } from "@prisma/client";
import type {
  EntityDependencyGraph,
  EntityGraphNode,
  EntityGraphEdge,
  EntityCluster,
  DependencyStrength,
} from "../core/types";

// ─── Constants ──────────────────────────────────────────────────────────────

const STRENGTH_MULTIPLIERS: Record<string, number> = {
  CRITICAL: 1.0,
  HIGH: 0.7,
  MEDIUM: 0.4,
  LOW: 0.15,
};

const IMPACT_MULTIPLIERS: Record<string, number> = {
  CRITICAL: 0.8,
  HIGH: 0.5,
  MEDIUM: 0.3,
  LOW: 0.1,
};

// ─── Risk Category ──────────────────────────────────────────────────────────

function getRiskCategory(score: number): string {
  if (score >= 85) return "NOMINAL";
  if (score >= 70) return "WATCH";
  if (score >= 50) return "WARNING";
  return "CRITICAL";
}

// ─── Build Dependency Graph ─────────────────────────────────────────────────

/**
 * Build a complete dependency graph for an organization.
 * Includes entity nodes, dependency edges, clusters, and criticality scores.
 */
export async function buildDependencyGraph(
  organizationId: string,
  prisma: PrismaClient,
  entityScores?: Map<string, { score: number; horizon: number | null }>,
): Promise<EntityDependencyGraph> {
  // Fetch all entities and active dependencies
  const [entities, dependencies] = await Promise.all([
    prisma.operatorEntity.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { id: true, name: true, operatorType: true },
    }),
    prisma.entityDependency.findMany({
      where: { organizationId, isActive: true },
      select: {
        sourceEntityId: true,
        targetEntityId: true,
        dependencyType: true,
        strength: true,
      },
    }),
  ]);

  if (entities.length === 0) {
    return { nodes: [], edges: [], clusters: [] };
  }

  // Build adjacency structures
  const dependentCounts = new Map<string, number>(); // How many entities depend on this entity
  const dependencyCounts = new Map<string, number>(); // How many entities this entity depends on

  for (const dep of dependencies) {
    dependentCounts.set(
      dep.targetEntityId,
      (dependentCounts.get(dep.targetEntityId) ?? 0) + 1,
    );
    dependencyCounts.set(
      dep.sourceEntityId,
      (dependencyCounts.get(dep.sourceEntityId) ?? 0) + 1,
    );
  }

  // Calculate max possible dependents for criticality normalization
  const maxDependents = Math.max(1, ...Array.from(dependentCounts.values()));

  // Build nodes
  const nodes: EntityGraphNode[] = entities.map((entity) => {
    const scoreData = entityScores?.get(entity.id);
    const score = scoreData?.score ?? 50; // Default to 50 if no score available
    const horizon = scoreData?.horizon ?? null;
    const depCount = dependentCounts.get(entity.id) ?? 0;

    // Criticality: weighted dependent count normalized to 0-100
    const weightedDeps = dependencies
      .filter((d) => d.targetEntityId === entity.id)
      .reduce((sum, d) => sum + (STRENGTH_MULTIPLIERS[d.strength] ?? 0.4), 0);
    const criticality = Math.round(
      (weightedDeps / Math.max(1, maxDependents)) * 100,
    );

    return {
      entityId: entity.id,
      name: entity.name,
      operatorType: entity.operatorType,
      score,
      horizon,
      riskCategory: getRiskCategory(score),
      dependencyCount: dependencyCounts.get(entity.id) ?? 0,
      dependentCount: depCount,
      criticality: Math.min(100, criticality),
    };
  });

  // Build edges
  const edges: EntityGraphEdge[] = dependencies.map((dep) => ({
    sourceEntityId: dep.sourceEntityId,
    targetEntityId: dep.targetEntityId,
    dependencyType: dep.dependencyType,
    strength: dep.strength,
    impactMultiplier: IMPACT_MULTIPLIERS[dep.strength] ?? 0.3,
  }));

  // Detect clusters
  const clusters = detectClusters(nodes, edges, entities);

  return { nodes, edges, clusters };
}

// ─── Cluster Detection ──────────────────────────────────────────────────────

function detectClusters(
  nodes: EntityGraphNode[],
  edges: EntityGraphEdge[],
  entities: { id: string; name: string; operatorType: string }[],
): EntityCluster[] {
  // Build undirected adjacency list
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.entityId, new Set());
  }
  for (const edge of edges) {
    adjacency.get(edge.sourceEntityId)?.add(edge.targetEntityId);
    adjacency.get(edge.targetEntityId)?.add(edge.sourceEntityId);
  }

  // Find connected components using BFS
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of nodes) {
    if (visited.has(node.entityId)) continue;

    const component: string[] = [];
    const queue = [node.entityId];
    visited.add(node.entityId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (component.length >= 2) {
      components.push(component);
    }
  }

  // Convert components to clusters
  const nodeMap = new Map(nodes.map((n) => [n.entityId, n]));
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  return components.map((component, idx) => {
    const memberNodes = component
      .map((id) => nodeMap.get(id))
      .filter(Boolean) as EntityGraphNode[];

    const clusterScore =
      memberNodes.length > 0
        ? Math.round(
            memberNodes.reduce((sum, n) => sum + n.score, 0) /
              memberNodes.length,
          )
        : 0;

    const weakestNode = memberNodes.reduce(
      (min, n) => (n.score < min.score ? n : min),
      memberNodes[0]!,
    );

    // Auto-name the cluster
    const types = new Set(memberNodes.map((n) => n.operatorType));
    const name = generateClusterName(memberNodes, entityMap, types);

    // Critical path: find the path through lowest-scoring nodes
    const criticalPath = memberNodes
      .sort((a, b) => a.score - b.score)
      .slice(0, Math.min(5, memberNodes.length))
      .map((n) => n.entityId);

    return {
      id: `cluster-${idx + 1}`,
      name,
      entityIds: component,
      clusterScore,
      weakestLink: weakestNode.entityId,
      criticalPath,
    };
  });
}

function generateClusterName(
  nodes: EntityGraphNode[],
  entityMap: Map<string, { id: string; name: string; operatorType: string }>,
  types: Set<string>,
): string {
  // If cluster has LSO + LO + SCO pattern → "Launch Cluster: {LSO name}"
  if (types.has("LSO") && types.has("LO")) {
    const lso = nodes.find((n) => n.operatorType === "LSO");
    if (lso) return `Launch Cluster: ${lso.name}`;
  }

  // If cluster has TCO + multiple SCO → "Ground Network: {TCO name}"
  if (types.has("TCO")) {
    const scoCount = nodes.filter((n) => n.operatorType === "SCO").length;
    if (scoCount >= 2) {
      const tco = nodes.find((n) => n.operatorType === "TCO");
      if (tco) return `Ground Network: ${tco.name}`;
    }
  }

  // If all SCO → "Constellation: {common prefix}"
  if (types.size === 1 && types.has("SCO")) {
    const names = nodes.map((n) => n.name);
    const prefix = findCommonPrefix(names);
    if (prefix.length >= 3) return `Constellation: ${prefix.trim()}`;
    return "Satellite Fleet";
  }

  // If has ISOS → "Servicing Mission: {ISOS name}"
  if (types.has("ISOS")) {
    const isos = nodes.find((n) => n.operatorType === "ISOS");
    if (isos) return `Servicing Mission: ${isos.name}`;
  }

  // Generic fallback
  const typeList = Array.from(types).sort().join("/");
  return `${typeList} Cluster`;
}

function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  let prefix = strings[0]!;
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i]!.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === "") return "";
    }
  }
  return prefix;
}
