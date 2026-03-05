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
import { z } from "zod";
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
import { logger } from "@/lib/logger";

const answersSchema = z.object({
  activityType: z
    .enum([
      "spacecraft",
      "launch_vehicle",
      "launch_site",
      "isos",
      "data_provider",
    ])
    .nullable()
    .optional(),
  entitySize: z
    .enum(["small", "research", "medium", "large"])
    .nullable()
    .optional(),
  primaryOrbit: z.enum(["LEO", "MEO", "GEO", "beyond"]).nullable().optional(),
  establishment: z
    .enum(["eu", "third_country_eu_services", "third_country_no_eu"])
    .nullable()
    .optional(),
  constellationSize: z.number().min(0).max(100000).nullable().optional(),
  isDefenseOnly: z.boolean().nullable().optional(),
  hasPostLaunchAssets: z.boolean().nullable().optional(),
  operatesConstellation: z.boolean().nullable().optional(),
  offersEUServices: z.boolean().nullable().optional(),
});

const calculateBodySchema = z.object({
  answers: answersSchema,
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

    // ─── Parse and Validate Input ───
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = calculateBodySchema.safeParse(body);
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
      // If assessment completed in under 3 seconds, it's likely a bot
      if (elapsed < 3000) {
        return NextResponse.json(
          { error: "Assessment completed too quickly. Please try again." },
          { status: 429 },
        );
      }
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
    logger.error("Assessment calculation error", error);
    return NextResponse.json(
      { error: "Failed to calculate compliance assessment" },
      { status: 500 },
    );
  }
}
