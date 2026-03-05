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

import { z } from "zod";
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
import { logger } from "@/lib/logger";

// Valid values for input validation
// Caelex is space-only — only "space" sector is accepted
const VALID_SECTORS = ["space"] as const;

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

    const calculateSchema = z.object({
      answers: z.object({
        sector: z.enum(["space"]).nullable().optional(),
        spaceSubSector: z
          .enum([
            "ground_infrastructure",
            "satellite_communications",
            "spacecraft_manufacturing",
            "launch_services",
            "earth_observation",
            "navigation",
            "space_situational_awareness",
          ])
          .nullable()
          .optional(),
        entitySize: z
          .enum(["micro", "small", "medium", "large"])
          .nullable()
          .optional(),
        employeeCount: z.number().nullable().optional(),
        annualRevenue: z.number().nullable().optional(),
        memberStateCount: z.number().int().min(0).max(27).nullable().optional(),
        isEUEstablished: z.boolean().nullable().optional(),
        operatesGroundInfra: z.boolean().nullable().optional(),
        operatesSatComms: z.boolean().nullable().optional(),
        manufacturesSpacecraft: z.boolean().nullable().optional(),
        providesLaunchServices: z.boolean().nullable().optional(),
        providesEOData: z.boolean().nullable().optional(),
        hasISO27001: z.boolean().nullable().optional(),
        hasExistingCSIRT: z.boolean().nullable().optional(),
        hasRiskManagement: z.boolean().nullable().optional(),
      }),
      startedAt: z.number().optional(),
    });

    const parsed = calculateSchema.safeParse(body);
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

    // ─── Legacy Input Validation ───
    const validationError = validateNIS2Answers(answers);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
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
    logger.error("NIS2 assessment calculation error", error);
    return NextResponse.json(
      { error: "Failed to calculate NIS2 compliance assessment" },
      { status: 500 },
    );
  }
}
