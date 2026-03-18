/**
 * GET /api/ontology/obligations?operatorType=SCO&jurisdictions=FR,DE&domain=debris&includeProposals=true
 *
 * Returns obligations for a given operator type, optionally filtered by
 * jurisdictions and domain. Set includeProposals=true to include EU Space Act
 * proposal obligations (confidence < 0.9).
 * Requires authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getObligationsForOperator } from "@/lib/ontology/traverse";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const operatorType = searchParams.get("operatorType");
    const jurisdictionsParam = searchParams.get("jurisdictions");
    const domain = searchParams.get("domain") || undefined;
    const includeProposals = searchParams.get("includeProposals") === "true";

    if (!operatorType) {
      return NextResponse.json(
        { error: "operatorType query parameter is required" },
        { status: 400 },
      );
    }

    const jurisdictions = jurisdictionsParam
      ? jurisdictionsParam.split(",").filter(Boolean)
      : [];

    const obligations = await getObligationsForOperator({
      operatorType,
      jurisdictions,
      domain,
      includeProposals,
    });

    return NextResponse.json({
      obligations,
      count: obligations.length,
      filters: {
        operatorType,
        jurisdictions,
        domain: domain ?? null,
        includeProposals,
      },
    });
  } catch (error) {
    logger.error("Error fetching ontology obligations", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
