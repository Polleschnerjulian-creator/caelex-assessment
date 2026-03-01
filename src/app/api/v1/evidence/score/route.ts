/**
 * GET /api/v1/evidence/score — Dual compliance score
 *
 * Returns the self-assessment score alongside the verified evidence score,
 * with per-regulation and per-module breakdowns.
 * Requires API key with `read:compliance` scope.
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, type ApiContext } from "@/lib/api-auth";
import { calculateEvidenceScore } from "@/lib/services/ace-evidence-service.server";

async function handler(_request: NextRequest, context: ApiContext) {
  const { organizationId } = context;

  const score = await calculateEvidenceScore(organizationId);

  return apiSuccess(score);
}

export const GET = withApiAuth(handler, {
  requiredScopes: ["read:compliance"],
});
