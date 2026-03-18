/**
 * Regulatory Ontology — Graph Traversal
 *
 * Core query functions for navigating the regulatory knowledge graph:
 * - getObligationsForOperator: Find obligations for a specific operator type + jurisdictions
 * - getSubgraph: BFS traversal from a center node up to depth 3
 * - getNodeDetail: Full detail for a single node including all edges
 */
import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ObligationResult,
  SubgraphResult,
  NodeDetailResult,
} from "./types";

export async function getObligationsForOperator(params: {
  operatorType: string;
  jurisdictions: string[];
  domain?: string;
  includeProposals?: boolean;
}): Promise<ObligationResult[]> {
  const minConfidence = params.includeProposals ? 0 : 0.9;

  // Normalize operator code: accept both "SCO" and "OP-SCO"
  const operatorCode = params.operatorType.startsWith("OP-")
    ? params.operatorType
    : `OP-${params.operatorType}`;

  // Base query: obligations that APPLIES_TO this operator type
  const baseResults = await prisma.$queryRaw<
    Array<{
      nodeId: string;
      code: string;
      label: string;
      confidence: number;
      properties: Record<string, unknown>;
      domain: string;
    }>
  >`
    SELECT DISTINCT
      n.id as "nodeId",
      n.code,
      n.label,
      n.confidence,
      n.properties,
      dom.code as domain
    FROM "OntologyNode" n
    -- Must apply to the operator type
    JOIN "OntologyEdge" e_op ON e_op."fromNodeId" = n.id AND e_op.type = 'APPLIES_TO'
    JOIN "OntologyNode" op ON op.id = e_op."toNodeId" AND op.code = ${operatorCode}
    -- Must belong to a domain
    JOIN "OntologyEdge" e_dom ON e_dom."fromNodeId" = n.id AND e_dom.type = 'BELONGS_TO'
    JOIN "OntologyNode" dom ON dom.id = e_dom."toNodeId"
    WHERE n.type = 'OBLIGATION'
      AND n."validUntil" IS NULL
      AND n.confidence >= ${minConfidence}
      ${params.domain ? Prisma.sql`AND dom.code = ${`DOMAIN-${params.domain}`}` : Prisma.empty}
    ORDER BY n.confidence DESC, n.label ASC
  `;

  // Also get jurisdiction-scoped obligations
  let jurResults: typeof baseResults = [];
  if (params.jurisdictions.length > 0) {
    const jurisdictionCodes = params.jurisdictions.map((j) =>
      j.startsWith("JUR-") ? j : `JUR-${j}`,
    );

    jurResults = await prisma.$queryRaw<typeof baseResults>`
      SELECT DISTINCT
        n.id as "nodeId",
        n.code,
        n.label,
        n.confidence,
        n.properties,
        dom.code as domain
      FROM "OntologyNode" n
      JOIN "OntologyEdge" e_jur ON e_jur."fromNodeId" = n.id AND e_jur.type = 'SCOPED_TO'
      JOIN "OntologyNode" jur ON jur.id = e_jur."toNodeId" AND jur.code IN (${Prisma.join(jurisdictionCodes)})
      JOIN "OntologyEdge" e_dom ON e_dom."fromNodeId" = n.id AND e_dom.type = 'BELONGS_TO'
      JOIN "OntologyNode" dom ON dom.id = e_dom."toNodeId"
      WHERE n.type = 'OBLIGATION'
        AND n."validUntil" IS NULL
        AND n.confidence >= ${minConfidence}
        ${params.domain ? Prisma.sql`AND dom.code = ${`DOMAIN-${params.domain}`}` : Prisma.empty}
      ORDER BY n.confidence DESC
    `;
  }

  // Merge and deduplicate by code
  const seen = new Set<string>();
  const merged: typeof baseResults = [];
  for (const r of [...baseResults, ...jurResults]) {
    if (!seen.has(r.code)) {
      seen.add(r.code);
      merged.push(r);
    }
  }

  // For each obligation, fetch jurisdiction scopes and evidence requirements
  const results: ObligationResult[] = [];
  for (const r of merged) {
    // Get jurisdictions this obligation is scoped to
    const jurisdictions = await prisma.ontologyEdge.findMany({
      where: { fromNodeId: r.nodeId, type: "SCOPED_TO", validUntil: null },
      include: {
        toNode: { select: { code: true, label: true } },
      },
    });

    // Get evidence requirements
    const evidence = await prisma.ontologyEdge.findMany({
      where: {
        fromNodeId: r.nodeId,
        type: "REQUIRES_EVIDENCE",
        validUntil: null,
      },
      include: {
        toNode: { select: { code: true, label: true } },
      },
    });

    // Check for EU Space Act mapping (inbound CODIFIES/EXTENDS edges)
    const euMapping = await prisma.ontologyEdge.findFirst({
      where: {
        toNodeId: r.nodeId,
        type: { in: ["CODIFIES", "EXTENDS", "NEW_OBLIGATION"] },
        validUntil: null,
      },
      include: {
        fromNode: { select: { code: true, properties: true } },
      },
    });

    const properties = (r.properties ?? {}) as Record<string, unknown>;

    results.push({
      nodeId: r.nodeId,
      code: r.code,
      label: r.label,
      confidence: r.confidence,
      source: {
        framework: (properties.framework as string) || "",
        reference: (properties.reference as string) || "",
      },
      domain: r.domain,
      jurisdictions: jurisdictions.map((j) => j.toNode.code),
      evidenceRequired: evidence.map((e) => ({
        code: e.toNode.code,
        label: e.toNode.label,
      })),
      euSpaceActMapping: euMapping
        ? {
            articleRef:
              ((euMapping.fromNode.properties as Record<string, unknown>)
                ?.articleRef as string) || euMapping.fromNode.code,
            relationship: euMapping.type,
          }
        : null,
    });
  }

  return results;
}

export async function getSubgraph(params: {
  nodeId: string;
  depth: number;
  edgeTypes?: string[];
}): Promise<SubgraphResult> {
  const maxDepth = Math.min(params.depth, 3);

  // Verify center node exists
  const center = await prisma.ontologyNode.findUnique({
    where: { id: params.nodeId },
  });
  if (!center) {
    return {
      centerNode: {
        id: params.nodeId,
        code: "",
        label: "Not Found",
        type: "UNKNOWN",
        properties: {},
      },
      nodes: [],
      edges: [],
    };
  }

  // Use recursive CTE for BFS traversal
  const nodes = await prisma.$queryRaw<
    Array<{
      id: string;
      code: string;
      label: string;
      type: string;
      confidence: number;
      depth: number;
    }>
  >`
    WITH RECURSIVE reachable AS (
      SELECT e."toNodeId" as "nodeId", 1 as depth
      FROM "OntologyEdge" e
      WHERE e."fromNodeId" = ${params.nodeId}
        AND e."validUntil" IS NULL
      UNION
      SELECT e."fromNodeId" as "nodeId", 1 as depth
      FROM "OntologyEdge" e
      WHERE e."toNodeId" = ${params.nodeId}
        AND e."validUntil" IS NULL
      UNION ALL
      SELECT e."toNodeId", r.depth + 1
      FROM "OntologyEdge" e
      JOIN reachable r ON e."fromNodeId" = r."nodeId"
      WHERE r.depth < ${maxDepth}
        AND e."validUntil" IS NULL
      UNION ALL
      SELECT e."fromNodeId", r.depth + 1
      FROM "OntologyEdge" e
      JOIN reachable r ON e."toNodeId" = r."nodeId"
      WHERE r.depth < ${maxDepth}
        AND e."validUntil" IS NULL
    )
    SELECT DISTINCT n.id, n.code, n.label, n.type, n.confidence, MIN(r.depth)::int as depth
    FROM reachable r
    JOIN "OntologyNode" n ON n.id = r."nodeId"
    WHERE n."validUntil" IS NULL
    GROUP BY n.id, n.code, n.label, n.type, n.confidence
  `;

  // Get all edges between found nodes
  const nodeIds = [params.nodeId, ...nodes.map((n) => n.id)];
  const edgeWhere: Prisma.OntologyEdgeWhereInput = {
    fromNodeId: { in: nodeIds },
    toNodeId: { in: nodeIds },
    validUntil: null,
  };
  if (params.edgeTypes && params.edgeTypes.length > 0) {
    edgeWhere.type = { in: params.edgeTypes };
  }

  const edges = await prisma.ontologyEdge.findMany({
    where: edgeWhere,
    include: {
      fromNode: { select: { code: true } },
      toNode: { select: { code: true } },
    },
  });

  return {
    centerNode: {
      id: center.id,
      code: center.code,
      label: center.label,
      type: center.type,
      properties: center.properties as Record<string, unknown>,
    },
    nodes: nodes.map((n) => ({
      id: n.id,
      code: n.code,
      label: n.label,
      type: n.type,
      confidence: n.confidence,
      depth: Number(n.depth),
    })),
    edges: edges.map((e) => ({
      id: e.id,
      type: e.type,
      fromCode: e.fromNode.code,
      toCode: e.toNode.code,
      weight: e.weight,
    })),
  };
}

export async function getNodeDetail(
  nodeId: string,
): Promise<NodeDetailResult | null> {
  const node = await prisma.ontologyNode.findUnique({
    where: { id: nodeId },
    include: {
      outEdges: {
        where: { validUntil: null },
        include: {
          toNode: { select: { code: true, label: true, type: true } },
        },
      },
      inEdges: {
        where: { validUntil: null },
        include: {
          fromNode: { select: { code: true, label: true, type: true } },
        },
      },
    },
  });

  if (!node) return null;

  return {
    id: node.id,
    code: node.code,
    label: node.label,
    type: node.type,
    properties: node.properties as Record<string, unknown>,
    confidence: node.confidence,
    validFrom: node.validFrom,
    validUntil: node.validUntil,
    sourceFile: node.sourceFile,
    outEdges: node.outEdges.map((e) => ({
      edgeType: e.type,
      toCode: e.toNode.code,
      toLabel: e.toNode.label,
      toType: e.toNode.type,
    })),
    inEdges: node.inEdges.map((e) => ({
      edgeType: e.type,
      fromCode: e.fromNode.code,
      fromLabel: e.fromNode.label,
      fromType: e.fromNode.type,
    })),
  };
}
