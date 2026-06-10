/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/assessment/v2/quick — the PUBLIC quick-check calculate endpoint
 * (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md, Task 2.2).
 *
 * Contract:
 *  - PUBLIC: no account required. Rate-limited (`assessment` tier, per IP /
 *    per user) and bot-checked: `startedAt` (epoch ms when the wizard opened)
 *    is REQUIRED by the Zod schema — omitting it is a 400, killing the
 *    decorative-bot-check class — and a submission faster than a human
 *    plausibly could (3s) is a 400.
 *  - SERVER-ENFORCED GATES (honesty invariant 3): the submitted answers are
 *    re-validated against the REAL question graph at QUICK-tier visibility
 *    (`validateSubmission(QUESTION_GRAPH, "quick", answers)`). A payload
 *    answering hidden-branch or full-tier questions is a 422 naming them —
 *    branching cannot be bypassed by a direct API call. The verdict pipeline
 *    re-runs the same validation as its own stage 1 (defense in depth).
 *  - Runs `runVerdictPipeline` in quick mode, persists/updates the anonymous
 *    profile (same `caelex_assessment_profile` cookie contract as the profile
 *    API) and a `QUICK` AssessmentVerdictSnapshot, then responds with the
 *    quick PROJECTION — counts + headlines, never full finding bodies, NO
 *    overall score (§6b / invariant 6). The snapshot keeps the full result
 *    server-side as substrate for the email-gated quick PDF (Task 2.4); the
 *    wire response is ALWAYS `buildQuickProjection(result)`.
 *  - No PII: the payload is answers + timing only. Lead capture (email for
 *    the PDF) stays on the existing /api/assessment/lead pattern.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { isAssessmentTooFast } from "@/lib/engines/shared.server";
import { buildAnswerMapSchema, type AnswerMap } from "@/lib/assessment/answers";
import { validateSubmission } from "@/lib/assessment/graph-evaluator";
import { QUESTION_GRAPH, QUESTION_IDS } from "@/data/assessment/question-graph";
import {
  runVerdictPipeline,
  buildQuickProjection,
  SubmissionInvalidError,
  ContradictionError,
  type ObligationMapResult,
} from "@/lib/assessment/verdict-pipeline.server";
import {
  ASSESSMENT_PROFILE_COOKIE,
  assessmentProfileCookieOptions,
  readAssessmentProfileCookie,
  generateAnonymousId,
  mergeAnswers,
} from "@/lib/assessment/assessment-profile";

const answerMapSchema = buildAnswerMapSchema(QUESTION_IDS);

const bodySchema = z.object({
  // REQUIRED — not optional. A missing startedAt is a 400 (the timing check
  // can never be bypassed by simply omitting the field).
  startedAt: z.number(),
  answers: z.record(z.string(), z.unknown()),
});

type ProfileRow = {
  id: string;
  userId: string | null;
  anonymousId: string | null;
  version: number;
  tier: "QUICK" | "FULL";
  answers: unknown;
};

export async function POST(request: NextRequest) {
  try {
    // ─── Rate limiting (public endpoint — per IP, per user when signed in) ───
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const identifier = getIdentifier(request, userId ?? undefined);
    const rateLimitResult = await checkRateLimit("assessment", identifier);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // ─── Parse + validate input ───
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // ─── Anti-bot timing gate (plan Task 2.2: faster than 3s → 400) ───
    if (isAssessmentTooFast(parsed.data.startedAt)) {
      return NextResponse.json(
        { error: "Assessment completed too quickly. Please try again." },
        { status: 400 },
      );
    }

    // ─── Tri-state + known-id validation (invariant 1) ───
    const answersParsed = answerMapSchema.safeParse(parsed.data.answers);
    if (!answersParsed.success) {
      return NextResponse.json(
        {
          error: "Invalid answers",
          details: answersParsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }
    const answers: AnswerMap = answersParsed.data;

    // ─── SERVER-SIDE VISIBILITY ENFORCEMENT at quick tier (invariant 3) ───
    // Hidden-branch / full-tier answers and missing visible questions are a
    // 422 NAMING the questions — never a verdict. The pipeline re-checks this
    // as its stage 1 (defense in depth); this early check guarantees a named
    // 422 before any engine work.
    const submissionErrors = validateSubmission(
      QUESTION_GRAPH,
      "quick",
      answers,
    );
    if (submissionErrors.length > 0) {
      return NextResponse.json(
        { error: "assessment submission invalid", errors: submissionErrors },
        { status: 422 },
      );
    }

    // ─── Run the verdict pipeline in quick mode ───
    let result: ObligationMapResult;
    try {
      result = await runVerdictPipeline({ answers, tier: "quick" });
    } catch (error) {
      if (error instanceof SubmissionInvalidError) {
        return NextResponse.json(
          { error: "assessment submission invalid", errors: error.errors },
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

    // ─── Persist / update the profile (anonymous carry-forward) ───
    // Resolution order: own anonymous-cookie profile → (signed in) own latest
    // in-progress profile → fresh anonymous profile + cookie. A cookie
    // pointing at a profile CLAIMED by someone else is never written to.
    const cookieAnonymousId = readAssessmentProfileCookie(request);
    let target: ProfileRow | null = null;

    if (cookieAnonymousId !== null) {
      const byCookie = (await prisma.operatorAssessmentProfile.findUnique({
        where: { anonymousId: cookieAnonymousId },
      })) as ProfileRow | null;
      if (
        byCookie &&
        (byCookie.userId === null ||
          (userId !== null && byCookie.userId === userId))
      ) {
        target = byCookie;
      }
    }
    if (target === null && userId !== null) {
      target = (await prisma.operatorAssessmentProfile.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        orderBy: { updatedAt: "desc" },
      })) as ProfileRow | null;
    }

    let profile: ProfileRow;
    let newAnonymousId: string | null = null;

    if (target !== null) {
      const stored = (target.answers ?? {}) as AnswerMap;
      const { merged, material } = mergeAnswers(stored, answers);
      profile = (await prisma.operatorAssessmentProfile.update({
        where: { id: target.id },
        data: {
          answers: merged as unknown as Prisma.InputJsonValue,
          ...(material ? { version: { increment: 1 } } : {}),
        },
      })) as ProfileRow;
    } else {
      newAnonymousId = generateAnonymousId();
      profile = (await prisma.operatorAssessmentProfile.create({
        data: {
          anonymousId: newAnonymousId,
          tier: "QUICK",
          answers: answers as unknown as Prisma.InputJsonValue,
        },
      })) as ProfileRow;
    }

    // ─── Persist the QUICK verdict snapshot (pinned to version + rulebook) ───
    await prisma.assessmentVerdictSnapshot.create({
      data: {
        profileId: profile.id,
        profileVersion: profile.version,
        tier: "QUICK",
        rulebookVersion: result.rulebookVersion,
        result: result as unknown as Prisma.InputJsonValue,
        unknownsCount: result.unknowns.length,
      },
    });

    // ─── Respond with the quick PROJECTION — never the full result ───
    const response = NextResponse.json({
      success: true,
      profileId: profile.id,
      result: buildQuickProjection(result),
    });
    if (newAnonymousId !== null) {
      response.cookies.set(
        ASSESSMENT_PROFILE_COOKIE,
        newAnonymousId,
        assessmentProfileCookieOptions(),
      );
    }
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  } catch (error) {
    logger.error("assessment v2 quick calculate failed", error);
    return NextResponse.json(
      { error: "Failed to calculate assessment" },
      { status: 500 },
    );
  }
}
