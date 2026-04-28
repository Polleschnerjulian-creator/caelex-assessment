/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * CRA Benchmark API
 *
 * GET /api/cra/benchmark — Return anonymized cross-customer CRA compliance
 * benchmark data for the authenticated organization.
 *
 * Returns null when fewer than 5 organizations have CRA assessments
 * (privacy threshold — see cra-benchmark-service.server.ts).
 */

import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { calculateCRABenchmark } from "@/lib/cra-benchmark-service.server";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;
    const orgContext = await getCurrentOrganization(userId);

    if (!orgContext?.organizationId) {
      return createSuccessResponse({
        benchmark: null,
        message: "No organization context found.",
      });
    }

    const benchmark = await calculateCRABenchmark(orgContext.organizationId);

    if (!benchmark) {
      return createSuccessResponse({
        benchmark: null,
        message:
          "Not enough organizations have completed CRA assessments to generate a benchmark. At least 5 organizations are required.",
      });
    }

    return createSuccessResponse({ benchmark });
  } catch (error) {
    logger.error("Error computing CRA benchmark", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
