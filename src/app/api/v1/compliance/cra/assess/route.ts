/**
 * POST /api/v1/compliance/cra/assess
 *
 * Full CRA compliance assessment via API.
 * Requires API key with `read:compliance` scope.
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, apiError, ApiContext } from "@/lib/api-auth";
import { CRAAssessSchema } from "@/lib/validations/api-compliance";
import {
  calculateCRACompliance,
  redactCRAResultForClient,
} from "@/lib/cra-engine.server";
import type { CRAAssessmentAnswers } from "@/lib/cra-types";

export const POST = withApiAuth(
  async (request: NextRequest, _context: ApiContext) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = CRAAssessSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const answers: CRAAssessmentAnswers = {
      economicOperatorRole: parsed.data.economicOperatorRole ?? "manufacturer",
      isEUEstablished: parsed.data.isEUEstablished ?? null,
      spaceProductTypeId: parsed.data.spaceProductTypeId ?? null,
      productName: parsed.data.productName ?? "Unnamed Product",
      productVersion: parsed.data.productVersion,
      segments: (parsed.data.segments as CRAAssessmentAnswers["segments"]) ?? [
        "space",
      ],
      hasNetworkFunction: parsed.data.hasNetworkFunction ?? null,
      processesAuthData: parsed.data.processesAuthData ?? null,
      usedInCriticalInfra: parsed.data.usedInCriticalInfra ?? null,
      performsCryptoOps: parsed.data.performsCryptoOps ?? null,
      controlsPhysicalSystem: parsed.data.controlsPhysicalSystem ?? null,
      hasMicrocontroller: parsed.data.hasMicrocontroller ?? null,
      isOSSComponent: parsed.data.isOSSComponent ?? null,
      isCommerciallySupplied: parsed.data.isCommerciallySupplied ?? null,
      isSafetyCritical: parsed.data.isSafetyCritical ?? null,
      hasRedundancy: parsed.data.hasRedundancy ?? null,
      processesClassifiedData: parsed.data.processesClassifiedData ?? null,
      hasIEC62443: parsed.data.hasIEC62443 ?? null,
      hasETSIEN303645: parsed.data.hasETSIEN303645 ?? null,
      hasCommonCriteria: parsed.data.hasCommonCriteria ?? null,
      hasISO27001: parsed.data.hasISO27001 ?? null,
    };

    const result = await calculateCRACompliance(answers);
    const redacted = redactCRAResultForClient(result);

    return apiSuccess(redacted, 200, {
      engine: "cra",
      timestamp: new Date().toISOString(),
    });
  },
  { requiredScopes: ["read:compliance"] },
);
