/**
 * GET /api/ontology/conflicts?jurisdictions=JUR-FR,JUR-DE&operatorType=SCO&domain=debris
 *
 * Detects regulatory conflicts between jurisdictions.
 * At least 2 jurisdictions required.
 * Requires authentication.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectConflicts } from "@/lib/ontology/conflicts";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const jurisdictions =
      searchParams.get("jurisdictions")?.split(",").filter(Boolean) || [];
    const operatorType = searchParams.get("operatorType") || "";
    const domain = searchParams.get("domain") || undefined;

    if (jurisdictions.length < 2)
      return NextResponse.json(
        { error: "At least 2 jurisdictions required" },
        { status: 400 },
      );
    if (!operatorType)
      return NextResponse.json(
        { error: "operatorType required" },
        { status: 400 },
      );

    const conflicts = await detectConflicts({
      jurisdictions,
      operatorType,
      domain,
    });
    return NextResponse.json({ conflicts, count: conflicts.length });
  } catch (error) {
    logger.error("Ontology conflict detection failed", error);
    return NextResponse.json(
      { error: "Conflict detection failed" },
      { status: 500 },
    );
  }
}
