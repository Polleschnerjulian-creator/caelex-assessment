/**
 * GET /api/v1/evidence/score — Dual compliance score
 *
 * Returns the self-assessment score alongside the verified evidence score,
 * with per-regulation and per-module breakdowns.
 * Requires API key with `read:compliance` scope.
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, apiSuccess, type ApiContext } from "@/lib/api-auth";
import { calculateEvidenceScore } from "@/lib/services/ace-evidence-service.server";

async function handler(_request: NextRequest, context: ApiContext) {
  try {
    const { organizationId } = context;

    const score = await calculateEvidenceScore(organizationId);

    return apiSuccess(score);
  } catch (error) {
    logger.error("[evidence/score]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withApiAuth(handler, {
  requiredScopes: ["read:compliance"],
});
