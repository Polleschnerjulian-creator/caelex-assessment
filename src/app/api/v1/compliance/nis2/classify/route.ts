/**
 * POST /api/v1/compliance/nis2/classify
 *
 * NIS2 entity classification via API.
 * Requires API key with `read:compliance` scope.
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, apiError, ApiContext } from "@/lib/api-auth";
import { NIS2ClassifySchema } from "@/lib/validations/api-compliance";
import { classifyNIS2Entity } from "@/lib/nis2-engine.server";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";

export const POST = withApiAuth(
  async (request: NextRequest, _context: ApiContext) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = NIS2ClassifySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const answers: NIS2AssessmentAnswers = {
      sector: parsed.data.sector,
      spaceSubSector: parsed.data.spaceSubSector,
      entitySize: parsed.data.entitySize,
      isEUEstablished: parsed.data.isEUEstablished,
      operatesGroundInfra: parsed.data.operatesGroundInfra,
      operatesSatComms: parsed.data.operatesSatComms,
      providesLaunchServices: parsed.data.providesLaunchServices,
      manufacturesSpacecraft: null,
      providesEOData: null,
      employeeCount: null,
      annualRevenue: null,
      memberStateCount: null,
      offersServicesInEU: parsed.data.isEUEstablished ?? null,
      designatedByMemberState: null,
      providesDigitalInfrastructure: null,
      euControlledEntity: null,
      hasISO27001: null,
      hasExistingCSIRT: null,
      hasRiskManagement: null,
    };

    const result = classifyNIS2Entity(answers);

    return apiSuccess(result, 200, {
      engine: "nis2",
      timestamp: new Date().toISOString(),
    });
  },
  { requiredScopes: ["read:compliance"] },
);
