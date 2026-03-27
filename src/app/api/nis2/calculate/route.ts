/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Public NIS2 Scoping Calculation API
 *
 * Accepts NIS2 assessment answers and returns entity classification
 * and applicable requirements. Regulatory data and calculation logic
 * never leave the server. Article details are redacted from the response.
 *
 * Rate limited: 10 requests per hour per IP (public endpoint).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  calculateNIS2Compliance,
  redactNIS2ResultForClient,
} from "@/lib/nis2-engine.server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { NIS2CalculateSchema } from "@/lib/validations";
import {
  createSuccessResponse,
  createValidationError,
  createEngineErrorResponse,
} from "@/lib/api-response";
import { ASSESSMENT_MIN_DURATION_MS } from "@/lib/engines/shared.server";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";
import { logger } from "@/lib/logger";

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

    const parsed = NIS2CalculateSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    const { answers, startedAt } = parsed.data;

    // ─── Anti-Bot: Timing Validation ───
    if (startedAt && typeof startedAt === "number") {
      const elapsed = Date.now() - startedAt;
      // If assessment completed too quickly, it's likely a bot
      if (elapsed < ASSESSMENT_MIN_DURATION_MS) {
        return NextResponse.json(
          { error: "Assessment completed too quickly. Please try again." },
          { status: 429 },
        );
      }
    }

    // Caelex is space-only — ensure sector is always "space"
    const normalizedAnswers = {
      ...(answers as NIS2AssessmentAnswers),
      sector: "space" as const,
    };

    // ─── Calculate NIS2 Compliance ───
    const result = await calculateNIS2Compliance(normalizedAnswers);

    // ─── Redact sensitive details before sending to client ───
    const redactedResult = redactNIS2ResultForClient(result);

    const response = createSuccessResponse({ result: redactedResult });
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString(),
    );
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  } catch (error) {
    logger.error("NIS2 assessment calculation error", error);
    return createEngineErrorResponse(error);
  }
}
