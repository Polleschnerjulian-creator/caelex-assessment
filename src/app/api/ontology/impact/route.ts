/**
 * POST /api/ontology/impact
 *
 * Computes downstream impact when a regulatory node changes.
 * Body: { nodeId: string, changeType: "amended" | "repealed" | "new" }
 * Requires authentication.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { propagateChange } from "@/lib/ontology/impact";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { nodeId, changeType } = body;
    if (!nodeId || !changeType)
      return NextResponse.json(
        { error: "nodeId and changeType required" },
        { status: 400 },
      );

    const result = await propagateChange({ nodeId, changeType });
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Ontology impact propagation failed", error);
    return NextResponse.json(
      { error: "Impact propagation failed" },
      { status: 500 },
    );
  }
}
