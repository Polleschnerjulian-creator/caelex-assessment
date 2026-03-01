/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Public National Space Law Calculation API
 *
 * Rate limited: 10 requests per hour per IP (public endpoint).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

const spaceLawAnswersSchema = z.object({
  selectedJurisdictions: z
    .array(z.enum(SPACE_LAW_COUNTRY_CODES as unknown as [string, ...string[]]))
    .min(1, "Select at least 1 jurisdiction")
    .max(3, "Select at most 3 jurisdictions"),
  activityType: z
    .enum([
      "spacecraft_operation",
      "launch_vehicle",
      "launch_site",
      "in_orbit_services",
      "earth_observation",
      "satellite_communications",
      "space_resources",
    ])
    .nullable()
    .optional(),
  entityNationality: z
    .enum(["domestic", "eu_other", "non_eu", "esa_member"])
    .nullable()
    .optional(),
  entitySize: z.enum(["small", "medium", "large"]).nullable().optional(),
  primaryOrbit: z.enum(["LEO", "MEO", "GEO", "beyond"]).nullable().optional(),
  constellationSize: z.number().min(0).nullable().optional(),
  licensingStatus: z
    .enum(["new_application", "existing_license", "renewal", "pre_assessment"])
    .nullable()
    .optional(),
});

const spaceLawBodySchema = z.object({
  answers: spaceLawAnswersSchema,
  startedAt: z.number().optional(),
});

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

    const parsed = spaceLawBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { answers, startedAt } = parsed.data;

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
