/**
 * GET /api/ontology/stats
 *
 * Returns node/edge counts and type breakdowns for the regulatory ontology.
 * Requires authentication.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { OntologyStats } from "@/lib/ontology/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalNodes,
      totalEdges,
      nodesByTypeRaw,
      edgesByTypeRaw,
      latestVersion,
    ] = await Promise.all([
      prisma.ontologyNode.count(),
      prisma.ontologyEdge.count(),
      prisma.ontologyNode.groupBy({
        by: ["type"],
        _count: { type: true },
      }),
      prisma.ontologyEdge.groupBy({
        by: ["type"],
        _count: { type: true },
      }),
      prisma.ontologyVersion.findFirst({
        orderBy: { seededAt: "desc" },
      }),
    ]);

    const nodesByType: Record<string, number> = {};
    for (const n of nodesByTypeRaw) {
      nodesByType[n.type] = n._count.type;
    }

    const edgesByType: Record<string, number> = {};
    for (const e of edgesByTypeRaw) {
      edgesByType[e.type] = e._count.type;
    }

    const stats: OntologyStats = {
      totalNodes,
      totalEdges,
      nodesByType,
      edgesByType,
      lastSeeded: latestVersion?.seededAt.toISOString() ?? null,
      version: latestVersion?.version ?? null,
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error("Error fetching ontology stats", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
