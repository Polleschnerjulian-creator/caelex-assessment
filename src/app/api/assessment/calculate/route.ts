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
import type { AssessmentAnswers } from "@/lib/types";

// Valid values for input validation
const VALID_ACTIVITY_TYPES = [
  "spacecraft",
  "launch_vehicle",
  "launch_site",
  "isos",
  "data_provider",
] as const;
const VALID_ENTITY_SIZES = ["small", "research", "medium", "large"] as const;
const VALID_ORBITS = ["LEO", "MEO", "GEO", "beyond"] as const;
const VALID_ESTABLISHMENTS = [
  "eu",
  "third_country_eu_services",
  "third_country_no_eu",
] as const;

/**
 * Basic input validation for assessment answers.
 * Returns null if valid, or an error message string if invalid.
 */
function validateAnswers(answers: unknown): string | null {
  if (!answers || typeof answers !== "object") {
    return "Invalid request body: expected an object";
  }

  const a = answers as Record<string, unknown>;

  // activityType is required
  if (
    a.activityType !== null &&
    !VALID_ACTIVITY_TYPES.includes(
      a.activityType as (typeof VALID_ACTIVITY_TYPES)[number],
    )
  ) {
    return "Invalid activityType";
  }

  // entitySize validation
  if (
    a.entitySize !== null &&
    !VALID_ENTITY_SIZES.includes(
      a.entitySize as (typeof VALID_ENTITY_SIZES)[number],
    )
  ) {
    return "Invalid entitySize";
  }

  // primaryOrbit validation
  if (
    a.primaryOrbit !== null &&
    !VALID_ORBITS.includes(a.primaryOrbit as (typeof VALID_ORBITS)[number])
  ) {
    return "Invalid primaryOrbit";
  }

  // establishment validation
  if (
    a.establishment !== null &&
    !VALID_ESTABLISHMENTS.includes(
      a.establishment as (typeof VALID_ESTABLISHMENTS)[number],
    )
  ) {
    return "Invalid establishment";
  }

  // constellationSize must be a positive number or null
  if (
    a.constellationSize !== null &&
    a.constellationSize !== undefined &&
    (typeof a.constellationSize !== "number" ||
      a.constellationSize < 0 ||
      a.constellationSize > 100000)
  ) {
    return "Invalid constellationSize";
  }

  // Boolean fields
  for (const field of [
    "isDefenseOnly",
    "hasPostLaunchAssets",
    "operatesConstellation",
    "offersEUServices",
  ]) {
    if (
      a[field] !== null &&
      a[field] !== undefined &&
      typeof a[field] !== "boolean"
    ) {
      return `Invalid ${field}: expected boolean or null`;
    }
  }

  return null;
}

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

    // Expect { answers: AssessmentAnswers, startedAt?: number }
    const { answers, startedAt } = body as {
      answers: unknown;
      startedAt?: number;
    };

    // ─── Anti-Bot: Timing Validation ───
    if (startedAt && typeof startedAt === "number") {
      const elapsed = Date.now() - startedAt;
      // If assessment completed in under 3 seconds, it's likely a bot
      if (elapsed < 3000) {
        return NextResponse.json(
          { error: "Assessment completed too quickly. Please try again." },
          { status: 429 },
        );
      }
    }

    // ─── Input Validation ───
    const validationError = validateAnswers(answers);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // ─── Calculate Compliance ───
    const data = loadSpaceActDataFromDisk();
    const result = calculateCompliance(answers as AssessmentAnswers, data);

    // ─── Redact sensitive article details before sending to client ───
    const redactedResult = redactArticlesForClient(result);

    return NextResponse.json(
      { result: redactedResult },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          // Prevent caching of assessment results
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  } catch (error) {
    console.error("Assessment calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate compliance assessment" },
      { status: 500 },
    );
  }
}
