/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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
import { ASSESSMENT_MIN_DURATION_MS } from "@/lib/engines/shared.server";

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
    if (startedAt && typeof startedAt === "number") {
      const elapsed = Date.now() - startedAt;
      // If assessment completed in under 3 seconds, it's likely a bot
      if (elapsed < ASSESSMENT_MIN_DURATION_MS) {
        return NextResponse.json(
          { error: "Assessment completed too quickly. Please try again." },
          { status: 429 },
        );
      }
    }

    // ─── Calculate Compliance ───
    try {
      const data = loadSpaceActDataFromDisk();
      const result = calculateCompliance(parsed.data.answers, data);

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
