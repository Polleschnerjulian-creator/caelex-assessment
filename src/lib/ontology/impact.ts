/**
 * Regulatory Ontology — Impact Propagation
 *
 * Computes downstream impact when a regulatory node changes
 * (amendment, repeal, new obligation). Uses a 4-depth recursive CTE
 * to walk the graph and find all reachable nodes.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { ImpactResult } from "./types";

/**
 * Given a changed node, find all downstream nodes affected by the change.
 * Uses recursive CTE to walk the graph and find all reachable nodes.
 */
export async function propagateChange(params: {
  nodeId: string;
  changeType: "amended" | "repealed" | "new";
}): Promise<{
  changedNode: { code: string; label: string; type: string };
  affectedNodes: ImpactResult[];
  totalAffected: number;
}> {
  // Get the changed node
  const changedNode = await prisma.ontologyNode.findUnique({
    where: { id: params.nodeId },
    select: { code: true, label: true, type: true },
  });
  if (!changedNode) throw new Error("Node not found");

  // Walk the graph FORWARD from the changed node through these edge types:
  // IMPLEMENTS (if standard changes, national implementations affected)
  // CODIFIES/EXTENDS (if enacted standard changes, proposal mappings affected)
  // REQUIRES_EVIDENCE (if obligation changes, evidence requirements affected)
  // CONTAINS (if regulation changes, its obligations affected)
  // SCOPED_TO reverse (if jurisdiction changes, its scoped obligations affected)

  const propagationEdgeTypes = [
    "IMPLEMENTS",
    "CODIFIES",
    "EXTENDS",
    "REQUIRES_EVIDENCE",
    "CONTAINS",
    "SCOPED_TO",
  ];

  const affected = await prisma.$queryRaw<
    Array<{
      nodeId: string;
      code: string;
      label: string;
      type: string;
      depth: number;
      edgePath: string;
    }>
  >`
    WITH RECURSIVE impact AS (
      -- Direct: edges FROM the changed node
      SELECT
        e."toNodeId" as "nodeId",
        e.type as "edgeType",
        1 as depth,
        e.type as "edgePath"
      FROM "OntologyEdge" e
      WHERE e."fromNodeId" = ${params.nodeId}
        AND e.type IN (${Prisma.join(propagationEdgeTypes)})
        AND e."validUntil" IS NULL

      UNION

      -- Reverse: edges TO the changed node (e.g., SCOPED_TO, IMPLEMENTS point TO standards)
      SELECT
        e."fromNodeId" as "nodeId",
        e.type as "edgeType",
        1 as depth,
        e.type as "edgePath"
      FROM "OntologyEdge" e
      WHERE e."toNodeId" = ${params.nodeId}
        AND e.type IN (${Prisma.join(propagationEdgeTypes)})
        AND e."validUntil" IS NULL

      UNION ALL

      -- Recursive forward propagation
      SELECT
        e."toNodeId",
        e.type,
        i.depth + 1,
        i."edgePath" || ' > ' || e.type
      FROM "OntologyEdge" e
      JOIN impact i ON e."fromNodeId" = i."nodeId"
      WHERE i.depth < 4
        AND e.type IN (${Prisma.join(propagationEdgeTypes)})
        AND e."validUntil" IS NULL
    )
    SELECT DISTINCT
      n.id as "nodeId",
      n.code,
      n.label,
      n.type,
      MIN(i.depth) as depth,
      MIN(i."edgePath") as "edgePath"
    FROM impact i
    JOIN "OntologyNode" n ON n.id = i."nodeId"
    WHERE n."validUntil" IS NULL
      AND n.id != ${params.nodeId}
    GROUP BY n.id, n.code, n.label, n.type
    ORDER BY MIN(i.depth) ASC, n.type ASC
  `;

  return {
    changedNode,
    affectedNodes: affected.map((a) => ({
      affectedNode: { code: a.code, label: a.label, type: a.type },
      impactLevel:
        Number(a.depth) === 1 ? ("direct" as const) : ("indirect" as const),
      depth: Number(a.depth),
      edgePath: a.edgePath.split(" > "),
    })),
    totalAffected: affected.length,
  };
}
