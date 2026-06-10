/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Server-Side Assessment Calculation API
 *
 * Accepts assessment answers and returns a compliance result.
 * The regulatory data and calculation logic never leave the server.
 * Article details (summary, operator_action) are redacted from the response.
 *
 * Rate limited: 10 requests per hour per IP (public endpoint).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  calculateCompliance,
  loadSpaceActDataFromDisk,
  redactArticlesForClient,
} from "@/lib/engine.server";
import type { AssessmentAnswers } from "@/lib/types";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { EUSpaceActCalculateSchema } from "@/lib/validations";
import {
  createSuccessResponse,
  createValidationError,
  createEngineErrorResponse,
} from "@/lib/api-response";
import { isAssessmentTooFast } from "@/lib/engines/shared.server";

export async function POST(request: NextRequest) {
  try {
    // ─── Rate Limiting ───
    const identifier = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("assessment", identifier);

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // ─── Parse and Validate Input ───
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = EUSpaceActCalculateSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    const { startedAt } = parsed.data;

    // ─── Anti-Bot: Timing Validation ───
    // startedAt is REQUIRED by the schema (a missing value is a 400 above),
    // so this check can no longer be bypassed by simply omitting the field.
    // If the assessment completed in under 3 seconds, it's likely a bot.
    if (isAssessmentTooFast(startedAt)) {
      return NextResponse.json(
        { error: "Assessment completed too quickly. Please try again." },
        { status: 429 },
      );
    }

    // ─── Calculate Compliance ───
    try {
      const data = loadSpaceActDataFromDisk();

      // Normalize the validated payload into a complete AssessmentAnswers
      // object. The scope-gate fields (isDefenseOnly, hasPostLaunchAssets,
      // establishment) are guaranteed present by the schema; the remaining
      // optional fields default to explicit null (= "not answered"), matching
      // the wizard's semantics. The engine enforces the hard-stop gates and
      // returns the honest out-of-scope verdict when one fires.
      const a = parsed.data.answers;
      const answers: AssessmentAnswers = {
        activityType: a.activityType ?? null,
        isDefenseOnly: a.isDefenseOnly,
        hasPostLaunchAssets: a.hasPostLaunchAssets,
        establishment: a.establishment,
        entitySize: a.entitySize ?? null,
        operatesConstellation: a.operatesConstellation ?? null,
        constellationSize: a.constellationSize ?? null,
        primaryOrbit: a.primaryOrbit ?? null,
        offersEUServices: a.offersEUServices ?? null,
      };

      const result = calculateCompliance(answers, data);

      // ─── Redact sensitive article details before sending to client ───
      const redactedResult = redactArticlesForClient(result);

      const response = createSuccessResponse({ result: redactedResult });
      response.headers.set(
        "X-RateLimit-Remaining",
        rateLimitResult.remaining.toString(),
      );
      // Prevent caching of assessment results
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate",
      );
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    } catch (error) {
      logger.error("Assessment calculation error", error);
      return createEngineErrorResponse(error);
    }
  } catch (error) {
    logger.error("Assessment calculation error", error);
    return createEngineErrorResponse(error);
  }
}
