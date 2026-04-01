/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * CRA Product Classification API (Authenticated)
 *
 * POST /api/cra/classify — Classify a product under CRA
 */

import { auth } from "@/lib/auth";
import { classifyCRAProduct } from "@/lib/cra-engine.server";
import type { CRAAssessmentAnswers } from "@/lib/cra-types";
import { CRAClassifySchema } from "@/lib/validations/api-compliance";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

// POST /api/cra/classify - Classify a product under CRA
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const body = await request.json();

    const parsed = CRAClassifySchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    const data = parsed.data;

    // Build CRAAssessmentAnswers from classify schema (subset of full assessment)
    const answers: CRAAssessmentAnswers = {
      economicOperatorRole: data.economicOperatorRole ?? "manufacturer",
      isEUEstablished: data.isEUEstablished ?? null,
      spaceProductTypeId: data.spaceProductTypeId ?? null,
      productName: data.productName ?? "Unnamed Product",
      hasNetworkFunction: data.hasNetworkFunction ?? null,
      processesAuthData: data.processesAuthData ?? null,
      usedInCriticalInfra: data.usedInCriticalInfra ?? null,
      performsCryptoOps: data.performsCryptoOps ?? null,
      controlsPhysicalSystem: data.controlsPhysicalSystem ?? null,
      hasMicrocontroller: data.hasMicrocontroller ?? null,
      isOSSComponent: data.isOSSComponent ?? null,
      isCommerciallySupplied: data.isCommerciallySupplied ?? null,
      segments: data.segments ?? ["space"],
      isSafetyCritical: data.isSafetyCritical ?? null,
      // Fields not in classify schema — set to null
      hasRedundancy: null,
      processesClassifiedData: null,
      hasIEC62443: null,
      hasETSIEN303645: null,
      hasCommonCriteria: null,
      hasISO27001: null,
    };

    const classification = classifyCRAProduct(answers);

    return createSuccessResponse({
      classification: classification.classification,
      conformityRoute: classification.conformityRoute,
      classificationReasoning: classification.classificationReasoning,
      conflict: classification.conflict ?? null,
      isOutOfScope: classification.isOutOfScope,
      outOfScopeReason: classification.outOfScopeReason ?? null,
    });
  } catch (error) {
    logger.error("Error classifying CRA product", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
