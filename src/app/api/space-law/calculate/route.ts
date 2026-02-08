/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Public National Space Law Calculation API
 *
 * Rate limited: 10 requests per hour per IP (public endpoint).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  calculateSpaceLawCompliance,
  redactSpaceLawResultForClient,
} from "@/lib/space-law-engine.server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { SPACE_LAW_COUNTRY_CODES } from "@/lib/space-law-types";
import type { SpaceLawAssessmentAnswers } from "@/lib/space-law-types";

const VALID_ACTIVITY_TYPES = [
  "spacecraft_operation",
  "launch_vehicle",
  "launch_site",
  "in_orbit_services",
  "earth_observation",
  "satellite_communications",
  "space_resources",
] as const;

const VALID_ENTITY_NATIONALITIES = [
  "domestic",
  "eu_other",
  "non_eu",
  "esa_member",
] as const;

const VALID_ENTITY_SIZES = ["small", "medium", "large"] as const;

const VALID_ORBITS = ["LEO", "MEO", "GEO", "beyond"] as const;

const VALID_LICENSING_STATUSES = [
  "new_application",
  "existing_license",
  "renewal",
  "pre_assessment",
] as const;

function validateSpaceLawAnswers(answers: unknown): string | null {
  if (!answers || typeof answers !== "object") {
    return "Invalid request body: expected an object";
  }

  const a = answers as Record<string, unknown>;

  // selectedJurisdictions: required, array of valid country codes, 1-3
  if (!Array.isArray(a.selectedJurisdictions)) {
    return "selectedJurisdictions must be an array";
  }
  if (
    a.selectedJurisdictions.length < 1 ||
    a.selectedJurisdictions.length > 3
  ) {
    return "Select 1 to 3 jurisdictions";
  }
  for (const code of a.selectedJurisdictions) {
    if (
      !SPACE_LAW_COUNTRY_CODES.includes(
        code as (typeof SPACE_LAW_COUNTRY_CODES)[number],
      )
    ) {
      return `Invalid jurisdiction code: ${code}`;
    }
  }

  // activityType: optional but if present must be valid
  if (
    a.activityType !== null &&
    a.activityType !== undefined &&
    !VALID_ACTIVITY_TYPES.includes(
      a.activityType as (typeof VALID_ACTIVITY_TYPES)[number],
    )
  ) {
    return "Invalid activityType";
  }

  // entityNationality
  if (
    a.entityNationality !== null &&
    a.entityNationality !== undefined &&
    !VALID_ENTITY_NATIONALITIES.includes(
      a.entityNationality as (typeof VALID_ENTITY_NATIONALITIES)[number],
    )
  ) {
    return "Invalid entityNationality";
  }

  // entitySize
  if (
    a.entitySize !== null &&
    a.entitySize !== undefined &&
    !VALID_ENTITY_SIZES.includes(
      a.entitySize as (typeof VALID_ENTITY_SIZES)[number],
    )
  ) {
    return "Invalid entitySize";
  }

  // primaryOrbit
  if (
    a.primaryOrbit !== null &&
    a.primaryOrbit !== undefined &&
    !VALID_ORBITS.includes(a.primaryOrbit as (typeof VALID_ORBITS)[number])
  ) {
    return "Invalid primaryOrbit";
  }

  // constellationSize
  if (
    a.constellationSize !== null &&
    a.constellationSize !== undefined &&
    (typeof a.constellationSize !== "number" || a.constellationSize < 0)
  ) {
    return "Invalid constellationSize";
  }

  // licensingStatus
  if (
    a.licensingStatus !== null &&
    a.licensingStatus !== undefined &&
    !VALID_LICENSING_STATUSES.includes(
      a.licensingStatus as (typeof VALID_LICENSING_STATUSES)[number],
    )
  ) {
    return "Invalid licensingStatus";
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

    // ─── Parse Input ───
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { answers, startedAt } = body as {
      answers: unknown;
      startedAt?: number;
    };

    // ─── Anti-Bot: Timing Validation ───
    if (startedAt && typeof startedAt === "number") {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 3000) {
        return NextResponse.json(
          { error: "Assessment completed too quickly. Please try again." },
          { status: 429 },
        );
      }
    }

    // ─── Validation ───
    const validationError = validateSpaceLawAnswers(answers);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // ─── Calculate ───
    const result = await calculateSpaceLawCompliance(
      answers as SpaceLawAssessmentAnswers,
    );

    // ─── Redact ───
    const redactedResult = redactSpaceLawResultForClient(result);

    return NextResponse.json(
      { result: redactedResult },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  } catch (error) {
    console.error("Space law assessment calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate space law compliance assessment" },
      { status: 500 },
    );
  }
}
