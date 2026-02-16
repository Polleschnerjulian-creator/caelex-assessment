/**
 * POST /api/v1/compliance/space-law/assess
 *
 * Multi-jurisdiction national space law assessment via API.
 * Requires API key with `read:compliance` scope.
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, apiError, ApiContext } from "@/lib/api-auth";
import { SpaceLawAssessSchema } from "@/lib/validations/api-compliance";
import {
  calculateSpaceLawCompliance,
  redactSpaceLawResultForClient,
} from "@/lib/space-law-engine.server";
import type { SpaceLawAssessmentAnswers } from "@/lib/space-law-types";

export const POST = withApiAuth(
  async (request: NextRequest, _context: ApiContext) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = SpaceLawAssessSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const answers: SpaceLawAssessmentAnswers = {
      selectedJurisdictions: parsed.data.selectedJurisdictions,
      activityType: parsed.data.activityType,
      entityNationality: parsed.data.entityNationality,
      entitySize: parsed.data.entitySize,
      primaryOrbit: parsed.data.primaryOrbit,
      constellationSize: parsed.data.constellationSize,
      licensingStatus: parsed.data.licensingStatus,
    };

    const result = await calculateSpaceLawCompliance(answers);
    const redacted = redactSpaceLawResultForClient(result);

    return apiSuccess(redacted, 200, {
      engine: "space_law",
      jurisdictionCount: parsed.data.selectedJurisdictions.length,
      timestamp: new Date().toISOString(),
    });
  },
  { requiredScopes: ["read:compliance"] },
);
