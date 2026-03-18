/**
 * GET /api/ontology/graph?nodeId=xxx&depth=2&edgeTypes=APPLIES_TO,BELONGS_TO
 *
 * Returns a subgraph centered on the given node, traversed up to the specified
 * depth (capped at 3). Optionally filter by edge types.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubgraph } from "@/lib/ontology/traverse";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId");
    const depthParam = searchParams.get("depth");
    const edgeTypesParam = searchParams.get("edgeTypes");

    if (!nodeId) {
      return NextResponse.json(
        { error: "nodeId query parameter is required" },
        { status: 400 },
      );
    }

    const depth = depthParam ? Math.min(parseInt(depthParam, 10) || 1, 3) : 1;
    const edgeTypes = edgeTypesParam
      ? edgeTypesParam.split(",").filter(Boolean)
      : undefined;

    const subgraph = await getSubgraph({ nodeId, depth, edgeTypes });

    if (!subgraph.centerNode.code) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return NextResponse.json(subgraph);
  } catch (error) {
    logger.error("Error fetching ontology subgraph", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
