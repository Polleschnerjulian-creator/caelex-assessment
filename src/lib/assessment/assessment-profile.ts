/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Shared PURE helpers for the operator-assessment profile surface
 * (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md,
 * Tasks 2.1/2.2). One cookie contract for the profile API and the public
 * quick-calculate route — both read and write the SAME anonymous-carry-forward
 * cookie, so the helpers live in one module.
 *
 * No `server-only`, no React, no Prisma imports — importable everywhere.
 *
 * Anonymous carry-forward model:
 *  - A visitor without an account gets an `OperatorAssessmentProfile` row
 *    keyed by a high-entropy `anonymousId`.
 *  - The id travels ONLY in the httpOnly cookie below — it is a bearer
 *    credential and is NEVER echoed in any response body.
 *  - On sign-in, the profile API claims the profile (sets `userId`,
 *    stamps `claimedAt`, NULLs `anonymousId`) and clears the cookie —
 *    answers carry forward, never re-asked (§3 GOV.UK protocol).
 */

import type { AnswerMap, TriStateAnswer } from "@/lib/assessment/answers";

/** httpOnly cookie carrying the anonymous profile token (plan Task 2.1). */
export const ASSESSMENT_PROFILE_COOKIE = "caelex_assessment_profile";

/** 30 days — long enough to come back and claim, short enough to expire stale funnels. */
export const ASSESSMENT_PROFILE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Cookie attributes for setting the anonymous profile token.
 * `sameSite: "lax"` (not "strict") so the cookie survives the top-level
 * sign-in redirect that precedes claim-on-signin; all profile mutations are
 * same-origin fetches, and the global middleware enforces Origin checks on
 * state-changing requests.
 */
export function assessmentProfileCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ASSESSMENT_PROFILE_COOKIE_MAX_AGE_SECONDS,
  };
}

/** Cookie attributes that CLEAR the anonymous profile token (claim / stale cookie). */
export function clearedAssessmentProfileCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: 0;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}

/**
 * Read the anonymous-profile token from the request's Cookie header.
 * Header parsing (instead of `NextRequest.cookies`) keeps the routes
 * testable with a plain `Request` and behaves identically in production
 * (`NextRequest` extends `Request`). Malformed values yield null — never
 * a throw on hostile input.
 */
export function readAssessmentProfileCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== ASSESSMENT_PROFILE_COOKIE) continue;
    const raw = part.slice(eq + 1).trim();
    if (raw.length === 0) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * High-entropy anonymous profile token (122 bits). The token is the bearer
 * credential for an unclaimed profile — UUID entropy matches the codebase's
 * existing token patterns (newsletter confirmation, lead capture).
 */
export function generateAnonymousId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Structural equality for tri-state answers (material-change detection —
 * the profile `version` bumps ONLY on material change, plan Task 2.1).
 * Array values compare element-wise in order; a reordered multi-select
 * counts as material (a cheap, conservative over-bump, never an under-bump).
 */
export function answersEqual(
  a: TriStateAnswer | undefined,
  b: TriStateAnswer,
): boolean {
  if (a === undefined) return false;
  if (a.state !== b.state) return false;
  if (a.state === "answered" && b.state === "answered") {
    const av = a.value;
    const bv = b.value;
    if (Array.isArray(av) || Array.isArray(bv)) {
      return (
        Array.isArray(av) &&
        Array.isArray(bv) &&
        av.length === bv.length &&
        av.every((v, i) => v === bv[i])
      );
    }
    return av === bv;
  }
  // unsure === unsure, not_asked === not_asked — neither carries a value.
  return true;
}

/**
 * Merge a validated answer patch into the stored map.
 * `material` is true when any patched key differs from what is stored —
 * the caller bumps `version` only then.
 */
export function mergeAnswers(
  stored: AnswerMap,
  patch: AnswerMap,
): { merged: AnswerMap; material: boolean } {
  const merged: AnswerMap = { ...stored };
  let material = false;
  for (const [id, answer] of Object.entries(patch)) {
    if (!answersEqual(stored[id], answer)) material = true;
    merged[id] = answer;
  }
  return { merged, material };
}

/** The profile fields the routes read/return — kept independent of Prisma types. */
export interface AssessmentProfileRecord {
  id: string;
  userId: string | null;
  anonymousId: string | null;
  tier: "QUICK" | "FULL";
  status: "IN_PROGRESS" | "COMPLETED";
  version: number;
  answers: unknown;
  currentSection: string | null;
  changeTriggers: string[];
  claimedAt: Date | null;
}

/** The wire shape returned to the profile's OWNER. */
export interface AssessmentProfilePayload {
  id: string;
  tier: "QUICK" | "FULL";
  status: "IN_PROGRESS" | "COMPLETED";
  version: number;
  answers: AnswerMap;
  currentSection: string | null;
  changeTriggers: string[];
  claimed: boolean;
}

/**
 * Serialize a profile row for its owner. The `anonymousId` is DELIBERATELY
 * absent — it is a bearer credential that travels only in the httpOnly
 * cookie. Answers are returned (resume/carry-forward) — the routes guarantee
 * this payload is only ever built for the verified owner identity.
 */
export function toProfilePayload(
  profile: AssessmentProfileRecord,
): AssessmentProfilePayload {
  return {
    id: profile.id,
    tier: profile.tier,
    status: profile.status,
    version: profile.version,
    answers: (profile.answers ?? {}) as AnswerMap,
    currentSection: profile.currentSection,
    changeTriggers: profile.changeTriggers,
    claimed: profile.userId !== null,
  };
}
