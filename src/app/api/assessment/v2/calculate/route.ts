/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/assessment/v2/calculate — full-tier verdict calculation
 * (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md, Task 1.9).
 *
 * Phase-1 ADDITIVE route: unreachable from any UI yet (deploy-safe).
 *
 * Contract:
 *   - Account-gated (NextAuth session) + `assessment` rate-limit tier.
 *   - Body is ONLY `{ profileId }` — answers are read from the STORED
 *     OperatorAssessmentProfile, never trusted from the client at calculate
 *     time (honesty invariant 3: gates are server-enforced).
 *   - Runs the verdict pipeline; a partial/empty answer set is a 422 NAMING
 *     the missing questions — never a verdict. Contradictory answers are a
 *     422 naming the pair.
 *   - On success persists an AssessmentVerdictSnapshot pinned to the profile
 *     version + rulebook semver, then returns the obligation map.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  runVerdictPipeline,
  SubmissionInvalidError,
  ContradictionError,
  type ObligationMapResult,
} from "@/lib/assessment/verdict-pipeline.server";
import type { AnswerMap } from "@/lib/assessment/answers";

const bodySchema = z.object({
  profileId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // ─── Account gate ───
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // ─── Rate limiting (assessment tier, per user) ───
    const rateLimitResult = await checkRateLimit(
      "assessment",
      `user:${userId}`,
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // ─── Parse and validate input (profileId ONLY — never answers) ───
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // ─── Load the STORED profile (answers are never read from the client) ───
    const profile = await prisma.operatorAssessmentProfile.findUnique({
      where: { id: parsed.data.profileId },
    });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (profile.userId !== userId) {
      // Includes unclaimed anonymous profiles — claiming is the profile API's
      // job (Task 2.1), not the calculate route's.
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const answers = (profile.answers ?? {}) as AnswerMap;

    // ─── Run the pipeline (server-enforced gates; 422 paths below) ───
    let result: ObligationMapResult;
    try {
      result = await runVerdictPipeline({ answers, tier: "full" });
    } catch (error) {
      if (error instanceof SubmissionInvalidError) {
        // Invariant 3: a partial payload NAMES the missing questions — never a verdict.
        return NextResponse.json(
          {
            error: "assessment submission invalid",
            errors: error.errors,
          },
          { status: 422 },
        );
      }
      if (error instanceof ContradictionError) {
        return NextResponse.json(
          {
            error: "assessment answers contradict each other",
            contradictions: error.contradictions,
          },
          { status: 422 },
        );
      }
      throw error;
    }

    // ─── Persist the verdict snapshot (pinned to profile version + rulebook) ───
    await prisma.assessmentVerdictSnapshot.create({
      data: {
        profileId: profile.id,
        profileVersion: profile.version,
        tier: "FULL",
        rulebookVersion: result.rulebookVersion,
        result: result as unknown as Prisma.InputJsonValue,
        unknownsCount: result.unknowns.length,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.error("assessment v2 calculate failed", error);
    return NextResponse.json(
      { error: "Failed to calculate assessment" },
      { status: 500 },
    );
  }
}
