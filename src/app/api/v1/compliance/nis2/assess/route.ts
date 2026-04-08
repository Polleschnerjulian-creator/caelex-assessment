/**
 * POST /api/v1/compliance/nis2/assess
 *
 * Full NIS2 compliance assessment via API.
 * Requires API key with `read:compliance` scope.
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, apiError, ApiContext } from "@/lib/api-auth";
import { NIS2AssessSchema } from "@/lib/validations/api-compliance";
import {
  calculateNIS2Compliance,
  redactNIS2ResultForClient,
} from "@/lib/nis2-engine.server";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";

export const POST = withApiAuth(
  async (request: NextRequest, _context: ApiContext) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = NIS2AssessSchema.safeParse(body);
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
      manufacturesSpacecraft: parsed.data.manufacturesSpacecraft,
      providesEOData: parsed.data.providesEOData,
      employeeCount: parsed.data.employeeCount,
      annualRevenue: parsed.data.annualRevenue,
      memberStateCount: parsed.data.memberStateCount,
      offersServicesInEU: parsed.data.isEUEstablished ?? null,
      designatedByMemberState: null,
      providesDigitalInfrastructure: null,
      euControlledEntity: null,
      hasISO27001: parsed.data.hasISO27001,
      hasExistingCSIRT: parsed.data.hasExistingCSIRT,
      hasRiskManagement: parsed.data.hasRiskManagement,
    };

    const result = await calculateNIS2Compliance(answers);
    const redacted = redactNIS2ResultForClient(result);

    return apiSuccess(redacted, 200, {
      engine: "nis2",
      timestamp: new Date().toISOString(),
    });
  },
  { requiredScopes: ["read:compliance"] },
);
