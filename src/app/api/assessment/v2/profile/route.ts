/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /api/assessment/v2/profile — the operator-assessment profile API
 * (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md, Task 2.1).
 *
 *   POST  — create or resume a profile; claim-on-signin for anonymous profiles.
 *   PATCH — persist answers (tri-state, Zod-validated, visibility-enforced).
 *   GET   — resume by anonymous cookie or session.
 *
 * Anonymous carry-forward (§3 GOV.UK protocol):
 *  - A visitor without an account gets a profile keyed by a high-entropy
 *    `anonymousId` carried ONLY in the httpOnly cookie
 *    `caelex_assessment_profile`. The id is never echoed in a response body.
 *  - A signed-in POST with that cookie present CLAIMS the profile: `userId`
 *    set, `claimedAt` stamped, `anonymousId` NULLed (the bearer token dies
 *    with the claim) and the cookie cleared. Answers carry forward — never
 *    re-asked.
 *
 * Honesty / security invariants enforced here:
 *  - Every stored answer is validated with `buildAnswerMapSchema(QUESTION_IDS)`
 *    — tri-state only, known question ids only (invariant 1).
 *  - SERVER-SIDE VISIBILITY VALIDATION on writes: a PATCH that ANSWERS a
 *    question not visible for the profile's tier + current answers (hidden
 *    branch or other tier) is a 422 naming the question — the wizard's
 *    client-side evaluation is display-only (invariant 3). The check is
 *    scoped to the keys in THIS patch; whole-map enforcement happens again
 *    at calculate time (quick route / verdict pipeline), so a stale answer
 *    from an earlier branch flip can never reach a verdict either.
 *  - `version` bumps ONLY on material answer change.
 *  - Foreign profiles are a 404, never a 403 — no enumeration.
 *  - Profile answers are never returned to a different identity.
 *
 * Rate limiting (deviation from the plan prose, documented): POST uses the
 * `assessment` tier (10/hr — creation/claim happens once per funnel); PATCH
 * and GET use the `api` tier (100/min) because the wizard persists EVERY
 * answer server-side (Task 2.3 — no localStorage) and would exhaust 10/hr on
 * the second screen.
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
import { buildAnswerMapSchema, type AnswerMap } from "@/lib/assessment/answers";
import { validateSubmission } from "@/lib/assessment/graph-evaluator";
import { QUESTION_GRAPH, QUESTION_IDS } from "@/data/assessment/question-graph";
import {
  ASSESSMENT_PROFILE_COOKIE,
  assessmentProfileCookieOptions,
  clearedAssessmentProfileCookieOptions,
  readAssessmentProfileCookie,
  generateAnonymousId,
  mergeAnswers,
  toProfilePayload,
  type AssessmentProfileRecord,
} from "@/lib/assessment/assessment-profile";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const answerMapSchema = buildAnswerMapSchema(QUESTION_IDS);

const postBodySchema = z
  .object({
    // Tier is an UPGRADE-ONLY hint: anonymous profiles are always QUICK
    // (the full tier is account-gated, founder §11.2); a signed-in QUICK→FULL
    // upgrade is allowed, FULL→QUICK downgrade is ignored.
    tier: z.enum(["QUICK", "FULL"]).optional(),
  })
  .strict();

const patchBodySchema = z
  .object({
    profileId: z.string().min(1).optional(),
    answers: z.record(z.string(), z.unknown()).optional(),
    currentSection: z.string().max(100).nullable().optional(),
  })
  .strict();

// ─── Shared helpers ──────────────────────────────────────────────────────────

function profileNotFound(): NextResponse {
  // ONE shape for missing AND foreign — no enumeration.
  return NextResponse.json({ error: "Profile not found" }, { status: 404 });
}

type ProfileRow = AssessmentProfileRecord & Record<string, unknown>;

async function findByAnonymousId(
  anonymousId: string,
): Promise<ProfileRow | null> {
  return (await prisma.operatorAssessmentProfile.findUnique({
    where: { anonymousId },
  })) as ProfileRow | null;
}

async function findLatestForUser(userId: string): Promise<ProfileRow | null> {
  return (await prisma.operatorAssessmentProfile.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  })) as ProfileRow | null;
}

/**
 * Resolve the profile the CALLER is allowed to touch. Authorization is part
 * of resolution: an existing-but-foreign profile resolves to null exactly
 * like a missing one (no enumeration).
 */
async function resolveOwnedProfile(input: {
  profileId?: string;
  userId: string | null;
  anonymousId: string | null;
}): Promise<ProfileRow | null> {
  const { profileId, userId, anonymousId } = input;

  if (profileId) {
    const profile = (await prisma.operatorAssessmentProfile.findUnique({
      where: { id: profileId },
    })) as ProfileRow | null;
    if (!profile) return null;
    const ownedBySession = userId !== null && profile.userId === userId;
    const ownedByCookie =
      profile.userId === null &&
      anonymousId !== null &&
      profile.anonymousId === anonymousId;
    return ownedBySession || ownedByCookie ? profile : null;
  }

  if (userId !== null) {
    const own = await findLatestForUser(userId);
    if (own) return own;
  }
  if (anonymousId !== null) {
    const anon = await findByAnonymousId(anonymousId);
    if (anon && anon.userId === null) return anon;
  }
  return null;
}

// ─── POST — create / resume / claim ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const identifier = getIdentifier(request, userId ?? undefined);
    const rateLimitResult = await checkRateLimit("assessment", identifier);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Body is optional ({} when absent/empty).
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text.trim().length > 0) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = postBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const requestedTier = parsed.data.tier;

    const cookieAnonymousId = readAssessmentProfileCookie(request);

    // ── Signed-in path: claim → resume → create ──
    if (userId !== null) {
      let clearCookie = false;

      if (cookieAnonymousId !== null) {
        const anonProfile = await findByAnonymousId(cookieAnonymousId);
        clearCookie = true; // the anonymous token is consumed either way

        if (anonProfile && anonProfile.userId === null) {
          // CLAIM: userId set, claimedAt stamped, bearer token destroyed.
          const claimed = (await prisma.operatorAssessmentProfile.update({
            where: { id: anonProfile.id },
            data: {
              userId,
              claimedAt: new Date(),
              anonymousId: null,
              ...(requestedTier === "FULL" && anonProfile.tier === "QUICK"
                ? { tier: "FULL" as const }
                : {}),
            },
          })) as ProfileRow;
          const response = NextResponse.json({
            success: true,
            profile: toProfilePayload(claimed),
          });
          response.cookies.set(
            ASSESSMENT_PROFILE_COOKIE,
            "",
            clearedAssessmentProfileCookieOptions(),
          );
          return response;
        }

        if (anonProfile && anonProfile.userId === userId) {
          // Already mine (stale cookie after an earlier claim) — just resume.
          const response = NextResponse.json({
            success: true,
            profile: toProfilePayload(anonProfile),
          });
          response.cookies.set(
            ASSESSMENT_PROFILE_COOKIE,
            "",
            clearedAssessmentProfileCookieOptions(),
          );
          return response;
        }
        // Foreign or missing — never touched; fall through to own profile.
      }

      let profile = await findLatestForUser(userId);
      if (profile) {
        if (requestedTier === "FULL" && profile.tier === "QUICK") {
          profile = (await prisma.operatorAssessmentProfile.update({
            where: { id: profile.id },
            data: { tier: "FULL" },
          })) as ProfileRow;
        }
      } else {
        profile = (await prisma.operatorAssessmentProfile.create({
          data: { userId, tier: requestedTier ?? "QUICK" },
        })) as ProfileRow;
      }

      const response = NextResponse.json({
        success: true,
        profile: toProfilePayload(profile),
      });
      if (clearCookie) {
        response.cookies.set(
          ASSESSMENT_PROFILE_COOKIE,
          "",
          clearedAssessmentProfileCookieOptions(),
        );
      }
      return response;
    }

    // ── Anonymous path: resume by cookie, else create (QUICK only) ──
    if (cookieAnonymousId !== null) {
      const anonProfile = await findByAnonymousId(cookieAnonymousId);
      if (anonProfile && anonProfile.userId === null) {
        return NextResponse.json({
          success: true,
          profile: toProfilePayload(anonProfile),
        });
      }
      // Stale/foreign cookie — replaced below with a fresh profile + token.
    }

    // Anonymous profiles are QUICK-tier only: the full tier is account-gated
    // (founder §11.2) — a requested FULL is deliberately ignored here.
    const anonymousId = generateAnonymousId();
    const created = (await prisma.operatorAssessmentProfile.create({
      data: { anonymousId, tier: "QUICK" },
    })) as ProfileRow;

    const response = NextResponse.json({
      success: true,
      profile: toProfilePayload(created),
    });
    response.cookies.set(
      ASSESSMENT_PROFILE_COOKIE,
      anonymousId,
      assessmentProfileCookieOptions(),
    );
    return response;
  } catch (error) {
    logger.error("assessment v2 profile POST failed", error);
    return NextResponse.json(
      { error: "Failed to create assessment profile" },
      { status: 500 },
    );
  }
}

// ─── PATCH — persist answers (validated + visibility-enforced) ───────────────

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const identifier = getIdentifier(request, userId ?? undefined);
    // `api` tier (100/min): the wizard persists every answer server-side.
    const rateLimitResult = await checkRateLimit("api", identifier);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { profileId, currentSection } = parsed.data;

    // Tri-state + known-id validation of the patch (invariant 1).
    let answerPatch: AnswerMap | undefined;
    if (parsed.data.answers !== undefined) {
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
      answerPatch = answersParsed.data;
    }

    if (answerPatch === undefined && currentSection === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const cookieAnonymousId = readAssessmentProfileCookie(request);
    const profile = await resolveOwnedProfile({
      profileId,
      userId,
      anonymousId: cookieAnonymousId,
    });
    if (!profile) return profileNotFound();

    const stored = (profile.answers ?? {}) as AnswerMap;
    let merged = stored;
    let material = false;

    if (answerPatch !== undefined) {
      const mergeResult = mergeAnswers(stored, answerPatch);
      merged = mergeResult.merged;
      material = mergeResult.material;

      // ── SERVER-SIDE VISIBILITY VALIDATION (invariant 3) ──
      // Evaluated on the MERGED map (a patch may flip a branch and answer the
      // newly revealed questions atomically), scoped to the patched keys:
      // an ANSWERED value on a question hidden for this tier+answers is a 422.
      // "missing" errors are EXPECTED mid-wizard and not write-blocking here —
      // completeness is enforced at calculate time.
      const tier = profile.tier === "FULL" ? "full" : "quick";
      const patchedIds = new Set(Object.keys(answerPatch));
      const violations = validateSubmission(
        QUESTION_GRAPH,
        tier,
        merged,
      ).filter((e) => e.code !== "missing" && patchedIds.has(e.questionId));
      if (violations.length > 0) {
        return NextResponse.json(
          { error: "assessment answers invalid", errors: violations },
          { status: 422 },
        );
      }
    }

    const updated = (await prisma.operatorAssessmentProfile.update({
      where: { id: profile.id },
      data: {
        ...(answerPatch !== undefined
          ? { answers: merged as unknown as Prisma.InputJsonValue }
          : {}),
        ...(material ? { version: { increment: 1 } } : {}),
        ...(currentSection !== undefined ? { currentSection } : {}),
      },
    })) as ProfileRow;

    return NextResponse.json({
      success: true,
      profile: toProfilePayload(updated),
    });
  } catch (error) {
    logger.error("assessment v2 profile PATCH failed", error);
    return NextResponse.json(
      { error: "Failed to update assessment profile" },
      { status: 500 },
    );
  }
}

// ─── GET — resume by cookie or session ───────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const identifier = getIdentifier(request, userId ?? undefined);
    const rateLimitResult = await checkRateLimit("api", identifier);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const cookieAnonymousId = readAssessmentProfileCookie(request);
    const profile = await resolveOwnedProfile({
      userId,
      anonymousId: cookieAnonymousId,
    });
    if (!profile) return profileNotFound();

    return NextResponse.json({
      success: true,
      profile: toProfilePayload(profile),
    });
  } catch (error) {
    logger.error("assessment v2 profile GET failed", error);
    return NextResponse.json(
      { error: "Failed to load assessment profile" },
      { status: 500 },
    );
  }
}
