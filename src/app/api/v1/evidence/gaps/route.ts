/**
 * GET /api/v1/evidence/gaps — Gap analysis across all regulations
 *
 * Identifies missing, expired, and pending evidence with prioritized actions.
 * Requires API key with `read:compliance` scope.
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, type ApiContext } from "@/lib/api-auth";
import { performGapAnalysis } from "@/lib/services/ace-evidence-service.server";
import type { RegulationType } from "@prisma/client";

async function handler(request: NextRequest, context: ApiContext) {
  const { organizationId } = context;
  const url = new URL(request.url);

  // Optional filter by regulation type
  const regulationType = url.searchParams.get(
    "regulationType",
  ) as RegulationType | null;

  const analysis = await performGapAnalysis(
    organizationId,
    regulationType || undefined,
  );

  return apiSuccess(analysis);
}

export const GET = withApiAuth(handler, {
  requiredScopes: ["read:compliance"],
});
