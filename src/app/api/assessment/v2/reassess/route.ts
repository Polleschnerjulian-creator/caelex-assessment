/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/assessment/v2/reassess — living-tier delta re-assessment
 * (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md, Task 4.3).
 *
 * Contract:
 *   - Account-gated (NextAuth session) + `assessment` rate-limit tier.
 *   - ENTITLEMENT FIRST (founder §11.2 — the living tier is PAID): the
 *     session's living-tier entitlement is checked on the REAL billing
 *     record (OrganizationMember → Organization → Subscription) BEFORE any
 *     profile load or pipeline work. Non-entitled requests get
 *     403 { error: "living_tier_required", upgrade: "/pricing" } — no
 *     snapshot is written and `reassessProfile` is never invoked.
 *   - Body is ONLY `{ profileId }` — answers are read from the STORED
 *     profile (honesty invariant 3), and the re-assessment REASON is
 *     derived server-side, never trusted from the client: a previous latest
 *     snapshot computed against a stale rulebook ⇒ "rulebook_bump",
 *     otherwise "answer_change".
 *   - `reassessProfile` runs the REAL verdict pipeline, writes a NEW
 *     AssessmentVerdictSnapshot and returns the diff vs the previous latest
 *     snapshot. Validation/contradiction errors are 422s naming the
 *     questions — never a verdict.
 *   - Success: 200 { snapshotId, delta, reason }.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { hasLivingTierEntitlement } from "@/lib/assessment/living-entitlement.server";
import {
  reassessProfile,
  isVerdictStale,
  type ReassessReason,
} from "@/lib/assessment/assessment-delta.server";
import {
  SubmissionInvalidError,
  ContradictionError,
} from "@/lib/assessment/verdict-pipeline.server";

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

    // ─── Living-tier entitlement (founder §11.2) — BEFORE any profile load
    //     or pipeline work. Non-entitled → upgrade payload, never a verdict. ───
    const entitled = await hasLivingTierEntitlement(userId);
    if (!entitled) {
      return NextResponse.json(
        { error: "living_tier_required", upgrade: "/pricing" },
        { status: 403 },
      );
    }

    // ─── Parse and validate input (profileId ONLY — never answers/reason) ───
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

    // ─── Load the STORED profile (ownership gate, calculate-route parity) ───
    const profile = await prisma.operatorAssessmentProfile.findUnique({
      where: { id: parsed.data.profileId },
    });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (profile.userId !== userId) {
      // Includes unclaimed anonymous profiles — claiming is the profile API's job.
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ─── Derive the reason server-side (never client-trusted): a latest
    //     snapshot computed against a stale rulebook is a rulebook bump. ───
    const latest = await prisma.assessmentVerdictSnapshot.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      select: { rulebookVersion: true },
    });
    const reason: ReassessReason =
      latest && isVerdictStale(latest.rulebookVersion)
        ? "rulebook_bump"
        : "answer_change";

    // ─── Re-assess (real pipeline → new snapshot → diff vs previous) ───
    let outcome: Awaited<ReturnType<typeof reassessProfile>>;
    try {
      outcome = await reassessProfile(profile.id, reason);
    } catch (error) {
      if (error instanceof SubmissionInvalidError) {
        // Invariant 3: a partial payload NAMES the missing questions — never a verdict.
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

    return NextResponse.json({
      snapshotId: outcome.snapshotId,
      delta: outcome.delta,
      reason,
    });
  } catch (error) {
    logger.error("assessment v2 reassess failed", error);
    return NextResponse.json(
      { error: "Failed to reassess assessment" },
      { status: 500 },
    );
  }
}
