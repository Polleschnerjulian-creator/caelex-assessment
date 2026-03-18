/**
 * GET /api/ontology/full
 *
 * Returns every node and edge in the regulatory ontology graph.
 * Designed for the Graph Explorer page — ~400 nodes + ~3000 edges fits
 * comfortably in a single JSON response.
 * Requires authentication.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [nodes, edges] = await Promise.all([
      prisma.ontologyNode.findMany({
        where: { validUntil: null },
        select: {
          id: true,
          code: true,
          label: true,
          type: true,
          confidence: true,
          properties: true,
          sourceFile: true,
        },
        orderBy: { code: "asc" },
      }),
      prisma.ontologyEdge.findMany({
        where: { validUntil: null },
        select: {
          id: true,
          type: true,
          fromNodeId: true,
          toNodeId: true,
          weight: true,
        },
      }),
    ]);

    return NextResponse.json({
      nodes: nodes.map((n) => ({
        id: n.id,
        code: n.code,
        label: n.label,
        type: n.type,
        confidence: n.confidence,
        properties: n.properties as Record<string, unknown>,
        sourceFile: n.sourceFile,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        type: e.type,
        source: e.fromNodeId,
        target: e.toNodeId,
        weight: e.weight,
      })),
      totalNodes: nodes.length,
      totalEdges: edges.length,
    });
  } catch (error) {
    logger.error("Error fetching full ontology graph", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
