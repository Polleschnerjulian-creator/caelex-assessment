/**
 * POST /api/v1/compliance/assess
 *
 * Full EU Space Act compliance assessment via API.
 * Requires API key with `read:compliance` scope.
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, apiError, ApiContext } from "@/lib/api-auth";
import { EUSpaceActAssessSchema } from "@/lib/validations/api-compliance";
import {
  calculateCompliance,
  loadSpaceActDataFromDisk,
  redactArticlesForClient,
} from "@/lib/engine.server";
import type { AssessmentAnswers } from "@/lib/types";

export const POST = withApiAuth(
  async (request: NextRequest, _context: ApiContext) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = EUSpaceActAssessSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const answers: AssessmentAnswers = {
      activityType: parsed.data.activityType,
      isDefenseOnly: parsed.data.isDefenseOnly,
      hasPostLaunchAssets: parsed.data.hasPostLaunchAssets,
      establishment: parsed.data.establishment,
      entitySize: parsed.data.entitySize,
      operatesConstellation: parsed.data.operatesConstellation,
      constellationSize: parsed.data.constellationSize,
      primaryOrbit: parsed.data.primaryOrbit,
      offersEUServices: parsed.data.offersEUServices,
    };

    const data = loadSpaceActDataFromDisk();
    const result = calculateCompliance(answers, data);
    const redacted = redactArticlesForClient(result);

    return apiSuccess(redacted, 200, {
      engine: "eu_space_act",
      version: data.metadata.version,
      timestamp: new Date().toISOString(),
    });
  },
  { requiredScopes: ["read:compliance"] },
);
