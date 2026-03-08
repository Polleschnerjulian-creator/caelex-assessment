import "server-only";
import type { PrismaClient } from "@prisma/client";
import type {
  CrossTypeFleetIntelligence,
  EntityDependencyGraph,
  EntityGraphNode,
  RiskConcentration,
  CascadeRiskAssessment,
  CascadeChain,
  TypeCorrelationMatrix,
} from "../core/types";
import { buildDependencyGraph } from "../cross-type/dependency-graph";

// ─── Risk Category ──────────────────────────────────────────────────────────

function getRiskCategory(score: number): string {
  if (score >= 85) return "NOMINAL";
  if (score >= 70) return "WATCH";
  if (score >= 50) return "WARNING";
  return "CRITICAL";
}

// ─── Cross-Type Fleet Intelligence ──────────────────────────────────────────

/**
 * Compute cross-type fleet intelligence for an organization.
 * Combines dependency graph analysis with fleet-wide risk metrics.
 */
export async function computeCrossTypeIntelligence(
  organizationId: string,
  prisma: PrismaClient,
  entityScores?: Map<string, { score: number; horizon: number | null }>,
): Promise<CrossTypeFleetIntelligence> {
  // Build the dependency graph
  const graph = await buildDependencyGraph(
    organizationId,
    prisma,
    entityScores,
  );

  // Calculate fleet-wide metrics
  const fleetScore =
    graph.nodes.length > 0
      ? Math.round(
          graph.nodes.reduce((sum, n) => sum + n.score, 0) / graph.nodes.length,
        )
      : 0;

  const riskDistribution: Record<string, number> = {
    NOMINAL: 0,
    WATCH: 0,
    WARNING: 0,
    CRITICAL: 0,
  };
  for (const node of graph.nodes) {
    const cat = getRiskCategory(node.score);
    riskDistribution[cat] = (riskDistribution[cat] ?? 0) + 1;
  }

  // Identify single points of failure
  const singlePointsOfFailure = identifySPOFs(graph);

  // Assess risk concentrations
  const riskConcentration = assessRiskConcentrations(graph);

  // Assess cascade risk
  const cascadeRisk = assessCascadeRisk(graph);

  // Calculate type correlation matrix
  const typeCorrelation = calculateTypeCorrelation(graph.nodes);

  return {
    fleetScore,
    entityCount: graph.nodes.length,
    riskDistribution,
    dependencyGraph: graph,
    singlePointsOfFailure,
    riskConcentration,
    cascadeRisk,
    typeCorrelation,
  };
}

// ─── Single Points of Failure ───────────────────────────────────────────────

/**
 * Identify entities with high criticality (many dependents) AND low score.
 * These are the highest-risk nodes in the network.
 */
function identifySPOFs(graph: EntityDependencyGraph): EntityGraphNode[] {
  return graph.nodes
    .filter((n) => n.dependentCount > 0) // Must have dependents
    .sort((a, b) => {
      // Sort by risk impact: criticality * (100 - score)
      const riskA = a.criticality * (100 - a.score);
      const riskB = b.criticality * (100 - b.score);
      return riskB - riskA;
    })
    .slice(0, 10); // Top 10 SPOFs
}

// ─── Risk Concentration ─────────────────────────────────────────────────────

function assessRiskConcentrations(
  graph: EntityDependencyGraph,
): RiskConcentration[] {
  const concentrations: RiskConcentration[] = [];

  for (const cluster of graph.clusters) {
    const memberNodes = graph.nodes.filter((n) =>
      cluster.entityIds.includes(n.entityId),
    );
    const avgScore =
      memberNodes.length > 0
        ? memberNodes.reduce((sum, n) => sum + n.score, 0) / memberNodes.length
        : 100;
    const minScore = memberNodes.reduce(
      (min, n) => Math.min(min, n.score),
      100,
    );
    const weakestNode = memberNodes.find((n) => n.score === minScore);

    let riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    let reason: string;

    if (minScore < 50) {
      riskLevel = "CRITICAL";
      reason = `${memberNodes.length} entities in cluster, weakest score ${minScore} (${weakestNode?.name ?? "unknown"})`;
    } else if (minScore < 70) {
      riskLevel = "HIGH";
      reason = `Cluster average ${Math.round(avgScore)}, weakest member at ${minScore}`;
    } else if (avgScore < 80) {
      riskLevel = "MEDIUM";
      reason = `Cluster average ${Math.round(avgScore)} — room for improvement`;
    } else {
      riskLevel = "LOW";
      reason = `Cluster healthy with average score ${Math.round(avgScore)}`;
    }

    concentrations.push({
      clusterId: cluster.id,
      clusterName: cluster.name,
      riskLevel,
      reason,
    });
  }

  return concentrations.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.riskLevel] - order[b.riskLevel];
  });
}

// ─── Cascade Risk Assessment ────────────────────────────────────────────────

function assessCascadeRisk(
  graph: EntityDependencyGraph,
): CascadeRiskAssessment {
  // Find all directed chains using DFS
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const existing = adjacency.get(edge.targetEntityId) ?? [];
    existing.push(edge.sourceEntityId);
    adjacency.set(edge.targetEntityId, existing);
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.entityId, n]));
  const allChains: CascadeChain[] = [];
  let maxDepth = 0;

  // DFS from each node to find chains
  for (const node of graph.nodes) {
    const chains = findChainsFromNode(
      node.entityId,
      adjacency,
      nodeMap,
      new Set(),
    );
    for (const chain of chains) {
      if (chain.entities.length > 1) {
        maxDepth = Math.max(maxDepth, chain.entities.length - 1);
        allChains.push(chain);
      }
    }
  }

  // Filter to high-risk chains (any node is WARNING or CRITICAL)
  const highRiskChains = allChains
    .filter((c) => c.weakestScore < 70)
    .sort((a, b) => a.weakestScore - b.weakestScore)
    .slice(0, 10);

  return {
    maxCascadeDepth: maxDepth,
    highRiskChains,
  };
}

function findChainsFromNode(
  nodeId: string,
  adjacency: Map<string, string[]>,
  nodeMap: Map<string, EntityGraphNode>,
  visited: Set<string>,
): CascadeChain[] {
  visited.add(nodeId);
  const neighbors = adjacency.get(nodeId) ?? [];
  const chains: CascadeChain[] = [];
  const currentNode = nodeMap.get(nodeId);

  if (neighbors.length === 0 || visited.size > 5) {
    // Leaf node or max depth — return single-node "chain"
    if (currentNode) {
      chains.push({
        entities: [nodeId],
        weakestScore: currentNode.score,
        weakestEntity: nodeId,
        chainType: currentNode.operatorType,
      });
    }
    visited.delete(nodeId);
    return chains;
  }

  for (const neighbor of neighbors) {
    if (visited.has(neighbor)) continue;
    const subChains = findChainsFromNode(neighbor, adjacency, nodeMap, visited);
    for (const sub of subChains) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;
      const extended = {
        entities: [nodeId, ...sub.entities],
        weakestScore: Math.min(node.score, sub.weakestScore),
        weakestEntity:
          node.score < sub.weakestScore ? nodeId : sub.weakestEntity,
        chainType: `${node.operatorType} → ${sub.chainType}`,
      };
      chains.push(extended);
    }
  }

  visited.delete(nodeId);
  return chains;
}

// ─── Type Correlation Matrix ────────────────────────────────────────────────

function calculateTypeCorrelation(
  nodes: EntityGraphNode[],
): TypeCorrelationMatrix {
  // Group scores by operator type
  const typeScores = new Map<string, number[]>();
  for (const node of nodes) {
    const existing = typeScores.get(node.operatorType) ?? [];
    existing.push(node.score);
    typeScores.set(node.operatorType, existing);
  }

  const types = Array.from(typeScores.keys()).sort();
  const correlations: { typeA: string; typeB: string; correlation: number }[] =
    [];

  // Compute pairwise correlations using average scores per type
  for (let i = 0; i < types.length; i++) {
    for (let j = i + 1; j < types.length; j++) {
      const scoresA = typeScores.get(types[i]!)!;
      const scoresB = typeScores.get(types[j]!)!;

      const avgA =
        scoresA.reduce((s, v) => s + v, 0) / Math.max(1, scoresA.length);
      const avgB =
        scoresB.reduce((s, v) => s + v, 0) / Math.max(1, scoresB.length);

      // Simple correlation proxy: 1 - |avgA - avgB| / 100
      const correlation =
        Math.round((1 - Math.abs(avgA - avgB) / 100) * 100) / 100;

      correlations.push({
        typeA: types[i]!,
        typeB: types[j]!,
        correlation,
      });
    }
  }

  return { correlations };
}
