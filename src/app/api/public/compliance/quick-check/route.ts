/**
 * POST /api/public/compliance/quick-check
 * OPTIONS /api/public/compliance/quick-check
 *
 * Unauthenticated quick EU Space Act compliance check.
 * Rate limited: 5 requests/hour per IP.
 * Returns minimal data to encourage full sign-up.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
  createRateLimitHeaders,
} from "@/lib/ratelimit";
import { QuickCheckSchema } from "@/lib/validations/api-compliance";
import {
  calculateCompliance,
  loadSpaceActDataFromDisk,
} from "@/lib/engine.server";
import {
  applyCorsHeaders,
  handleCorsPreflightResponse,
} from "@/lib/cors.server";
import type { AssessmentAnswers } from "@/lib/types";

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

  const parsed = QuickCheckSchema.safeParse(body);
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

  // Build full answers with defaults for optional fields
  const answers: AssessmentAnswers = {
    activityType: parsed.data.activityType,
    isDefenseOnly: null,
    hasPostLaunchAssets: null,
    establishment: parsed.data.establishment,
    entitySize: parsed.data.entitySize,
    operatesConstellation: null,
    constellationSize: null,
    primaryOrbit: null,
    offersEUServices: null,
  };

  const data = loadSpaceActDataFromDisk();
  const result = calculateCompliance(answers, data);

  // Return minimal data
  const topModules = result.moduleStatuses
    .filter((m) => m.status === "required" || m.status === "simplified")
    .slice(0, 3)
    .map((m) => ({ id: m.id, name: m.name, status: m.status }));

  const responseData = {
    operatorType: result.operatorAbbreviation,
    operatorTypeLabel: result.operatorTypeLabel,
    regime: result.regime,
    regimeLabel: result.regimeLabel,
    applicableArticleCount: result.applicableCount,
    totalArticles: result.totalArticles,
    topModules,
    ctaUrl: "https://app.caelex.eu/assessment/eu-space-act",
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
