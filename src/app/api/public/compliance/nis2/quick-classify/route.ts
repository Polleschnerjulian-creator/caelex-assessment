/**
 * POST /api/public/compliance/nis2/quick-classify
 * OPTIONS /api/public/compliance/nis2/quick-classify
 *
 * Unauthenticated quick NIS2 entity classification.
 * Rate limited: 5 requests/hour per IP.
 * Returns minimal classification data.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
  createRateLimitHeaders,
} from "@/lib/ratelimit";
import { NIS2QuickClassifySchema } from "@/lib/validations/api-compliance";
import { classifyNIS2Entity } from "@/lib/nis2-engine.server";
import {
  applyCorsHeaders,
  handleCorsPreflightResponse,
} from "@/lib/cors.server";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return handleCorsPreflightResponse(origin, "*");
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Rate limiting
  const identifier = getIdentifier(request);
  const rateLimitResult = await checkRateLimit("public_api", identifier);
  if (!rateLimitResult.success) {
    const response = createRateLimitResponse(rateLimitResult);
    return applyCorsHeaders(response, origin, "*");
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const response = NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
    return applyCorsHeaders(response, origin, "*");
  }

  const parsed = NIS2QuickClassifySchema.safeParse(body);
  if (!parsed.success) {
    const response = NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
    return applyCorsHeaders(response, origin, "*");
  }

  // Build minimal NIS2 answers
  const answers: NIS2AssessmentAnswers = {
    sector: "space",
    spaceSubSector: null,
    entitySize: parsed.data.entitySize,
    isEUEstablished: true,
    operatesGroundInfra: null,
    operatesSatComms: null,
    providesLaunchServices: null,
    manufacturesSpacecraft: null,
    providesEOData: null,
    employeeCount: null,
    annualRevenue: null,
    memberStateCount: null,
    hasISO27001: null,
    hasExistingCSIRT: null,
    hasRiskManagement: null,
  };

  const result = classifyNIS2Entity(answers);

  const penaltyRange =
    result.classification === "essential"
      ? "Up to EUR 10M or 2% of global turnover"
      : result.classification === "important"
        ? "Up to EUR 7M or 1.4% of global turnover"
        : "N/A - out of scope";

  const responseData = {
    classification: result.classification,
    reason: result.reason,
    articleRef: result.articleRef,
    penaltyRange,
    ctaUrl: "https://app.caelex.eu/assessment/nis2",
  };

  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
  const response = NextResponse.json(
    { data: responseData },
    {
      status: 200,
      headers: Object.fromEntries(rateLimitHeaders.entries()),
    },
  );

  return applyCorsHeaders(response, origin, "*");
}
