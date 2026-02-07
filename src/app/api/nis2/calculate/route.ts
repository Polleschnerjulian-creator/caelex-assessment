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
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";

// Valid values for input validation
const VALID_SECTORS = [
  "space",
  "energy",
  "transport",
  "banking",
  "financial_market",
  "health",
  "drinking_water",
  "waste_water",
  "digital_infrastructure",
  "ict_service_management",
  "public_administration",
  "postal_courier",
  "waste_management",
  "chemicals",
  "food",
  "manufacturing",
  "digital_providers",
  "research",
  "other",
] as const;

const VALID_SPACE_SUB_SECTORS = [
  "ground_infrastructure",
  "satellite_communications",
  "spacecraft_manufacturing",
  "launch_services",
  "earth_observation",
  "navigation",
  "space_situational_awareness",
] as const;

const VALID_ENTITY_SIZES = ["micro", "small", "medium", "large"] as const;

/**
 * Basic input validation for NIS2 assessment answers.
 * Returns null if valid, or an error message string if invalid.
 */
function validateNIS2Answers(answers: unknown): string | null {
  if (!answers || typeof answers !== "object") {
    return "Invalid request body: expected an object";
  }

  const a = answers as Record<string, unknown>;

  // sector validation
  if (
    a.sector !== null &&
    a.sector !== undefined &&
    !VALID_SECTORS.includes(a.sector as (typeof VALID_SECTORS)[number])
  ) {
    return "Invalid sector";
  }

  // spaceSubSector validation
  if (
    a.spaceSubSector !== null &&
    a.spaceSubSector !== undefined &&
    !VALID_SPACE_SUB_SECTORS.includes(
      a.spaceSubSector as (typeof VALID_SPACE_SUB_SECTORS)[number],
    )
  ) {
    return "Invalid spaceSubSector";
  }

  // entitySize validation
  if (
    a.entitySize !== null &&
    a.entitySize !== undefined &&
    !VALID_ENTITY_SIZES.includes(
      a.entitySize as (typeof VALID_ENTITY_SIZES)[number],
    )
  ) {
    return "Invalid entitySize";
  }

  // memberStateCount must be a positive number or null
  if (
    a.memberStateCount !== null &&
    a.memberStateCount !== undefined &&
    (typeof a.memberStateCount !== "number" ||
      a.memberStateCount < 0 ||
      a.memberStateCount > 27)
  ) {
    return "Invalid memberStateCount";
  }

  // Boolean fields
  for (const field of [
    "isEUEstablished",
    "operatesGroundInfra",
    "operatesSatComms",
    "manufacturesSpacecraft",
    "providesLaunchServices",
    "providesEOData",
    "hasISO27001",
    "hasExistingCSIRT",
    "hasRiskManagement",
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

    // Expect { answers: NIS2AssessmentAnswers, startedAt?: number }
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
    const validationError = validateNIS2Answers(answers);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // ─── Calculate NIS2 Compliance ───
    const result = await calculateNIS2Compliance(
      answers as NIS2AssessmentAnswers,
    );

    // ─── Redact sensitive details before sending to client ───
    const redactedResult = redactNIS2ResultForClient(result);

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
    console.error("NIS2 assessment calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate NIS2 compliance assessment" },
      { status: 500 },
    );
  }
}
