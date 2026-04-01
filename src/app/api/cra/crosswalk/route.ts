/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * CRA <-> NIS2 Crosswalk Matrix API
 *
 * GET /api/cra/crosswalk?assessmentId=xxx — Get CRA/NIS2 overlap data
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCRACompliance } from "@/lib/cra-engine.server";
import type {
  CRAAssessmentAnswers,
  SpaceProductSegment,
} from "@/lib/cra-types";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

// GET /api/cra/crosswalk?assessmentId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;
    const assessmentId = request.nextUrl.searchParams.get("assessmentId");

    if (!assessmentId) {
      return createErrorResponse(
        "assessmentId query parameter is required",
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    // Verify ownership of the assessment
    const assessment = await prisma.cRAAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!assessment) {
      return createErrorResponse(
        "Assessment not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    // Reconstruct answers from stored assessment fields
    const segments: SpaceProductSegment[] = (() => {
      try {
        return JSON.parse(assessment.segments) as SpaceProductSegment[];
      } catch {
        return ["space"] as SpaceProductSegment[];
      }
    })();

    const answers: CRAAssessmentAnswers = {
      economicOperatorRole:
        assessment.economicOperatorRole as CRAAssessmentAnswers["economicOperatorRole"],
      isEUEstablished: assessment.isEUEstablished ?? null,
      spaceProductTypeId: assessment.spaceProductTypeId ?? null,
      productName: assessment.productName,
      productVersion: assessment.productVersion ?? undefined,
      hasNetworkFunction: assessment.hasNetworkFunction ?? null,
      processesAuthData: assessment.processesAuthData ?? null,
      usedInCriticalInfra: assessment.usedInCriticalInfra ?? null,
      performsCryptoOps: assessment.performsCryptoOps ?? null,
      controlsPhysicalSystem: assessment.controlsPhysicalSystem ?? null,
      hasMicrocontroller: assessment.hasMicrocontroller ?? null,
      isOSSComponent: assessment.isOSSComponent ?? null,
      isCommerciallySupplied: assessment.isCommerciallySupplied ?? null,
      segments,
      isSafetyCritical: assessment.isSafetyCritical ?? null,
      hasRedundancy: assessment.hasRedundancy ?? null,
      processesClassifiedData: assessment.processesClassifiedData ?? null,
      hasIEC62443: assessment.hasIEC62443 ?? null,
      hasETSIEN303645: assessment.hasETSIEN303645 ?? null,
      hasCommonCriteria: assessment.hasCommonCriteria ?? null,
      hasISO27001: assessment.hasISO27001 ?? null,
    };

    // Calculate fresh compliance result to get NIS2 overlap data
    const complianceResult = await calculateCRACompliance(answers);

    return createSuccessResponse({
      assessmentId,
      productClassification: complianceResult.productClassification,
      nis2Overlap: complianceResult.nis2Overlap,
    });
  } catch (error) {
    logger.error("Error fetching CRA/NIS2 crosswalk", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
