/**
 * Tests for POST /api/assessment/v2/calculate (plan Task 1.9).
 *
 * PURE/MOCKED unit tests — auth, Prisma, the rate limiter, the logger and the
 * verdict pipeline are mocked. Profiles are SEEDED directly through the
 * Prisma mock (plan note: seed profiles directly in route tests).
 * (Not executed here — the orchestrator runs the suite centrally.)
 *
 * Route contract exercised:
 *   1. ACCOUNT GATE — 401 without a session; 403 for a foreign or unclaimed
 *      anonymous profile; 404 for a missing profile.
 *   2. ANSWERS FROM THE STORED PROFILE — the pipeline receives the profile's
 *      stored answers; an `answers` field smuggled into the request body is
 *      IGNORED (never trusted at calculate time — honesty invariant 3).
 *   3. 422 NAMING MISSING QUESTIONS — a SubmissionInvalidError from the
 *      pipeline maps to 422 with the named per-question errors and NO
 *      verdict and NO snapshot write. ContradictionError likewise.
 *   4. SNAPSHOT PERSISTENCE — success persists AssessmentVerdictSnapshot
 *      pinned to profileVersion + rulebookVersion with unknownsCount.
 *   5. HONESTY — rate-limit 429 short-circuits before any read; a snapshot
 *      write failure is an honest 500 (no fake success).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (declared before the route is imported) ──

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...a: unknown[]) => authMock(...a),
}));

const profileFindUniqueMock = vi.fn();
const snapshotCreateMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorAssessmentProfile: {
      findUnique: (args: unknown) => profileFindUniqueMock(args),
    },
    assessmentVerdictSnapshot: {
      create: (args: unknown) => snapshotCreateMock(args),
    },
  },
}));

const checkRateLimitMock = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (tier: string, id: string) => checkRateLimitMock(tier, id),
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too Many Requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    }),
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const runPipelineMock = vi.fn();
vi.mock("@/lib/assessment/verdict-pipeline.server", () => {
  class SubmissionInvalidError extends Error {
    constructor(
      public errors: { questionId: string; code: string; message: string }[],
    ) {
      super("assessment submission invalid");
      this.name = "SubmissionInvalidError";
    }
  }
  class ContradictionError extends Error {
    constructor(
      public contradictions: {
        questionIds: [string, string];
        message: string;
      }[],
    ) {
      super("assessment answers contradict each other");
      this.name = "ContradictionError";
    }
  }
  return {
    SubmissionInvalidError,
    ContradictionError,
    runVerdictPipeline: (...a: unknown[]) => runPipelineMock(...a),
  };
});

import { POST } from "./route";
import {
  SubmissionInvalidError,
  ContradictionError,
} from "@/lib/assessment/verdict-pipeline.server";

// ── Helpers ──

const STORED_ANSWERS = {
  q1_1_roles: { state: "answered", value: ["spacecraft_operator"] },
  q1_9_defense_exclusivity: { state: "answered", value: "no" },
};

const PROFILE = {
  id: "profile_1",
  userId: "user_1",
  organizationId: null,
  anonymousId: null,
  version: 3,
  tier: "FULL",
  status: "IN_PROGRESS",
  answers: STORED_ANSWERS,
  currentSection: null,
  changeTriggers: [],
  claimedAt: null,
  createdAt: new Date("2026-06-01T00:00:00Z"),
  updatedAt: new Date("2026-06-10T00:00:00Z"),
};

/** Minimal, contract-shaped pipeline result (no key matches /score/i). */
const FAKE_RESULT = {
  rulebookVersion: "1.0.0",
  computedAt: "2026-06-10T12:00:00.000Z",
  tier: "full",
  scope: [],
  nis2Gateway: { value: "essential" },
  regime: { value: "not_eligible" },
  clusters: [],
  crossFrameworkOverlaps: [],
  noneIdentifiedOverlaps: true,
  unknowns: [
    {
      questionId: "q9_2_itu_filing",
      question: "ITU filing stage?",
      whatAnsweringChanges: "Spectrum is existential.",
      priority: "high",
    },
  ],
  aggregationDisclosures: [],
  contradictions: [],
};

function req(body: unknown): Request {
  return new Request("http://localhost/api/assessment/v2/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockReset().mockResolvedValue({ user: { id: "user_1" } });
  profileFindUniqueMock.mockReset().mockResolvedValue(PROFILE);
  snapshotCreateMock.mockReset().mockResolvedValue({ id: "snap_1" });
  runPipelineMock.mockReset().mockResolvedValue(FAKE_RESULT);
  checkRateLimitMock.mockReset().mockResolvedValue({
    success: true,
    remaining: 9,
    reset: Date.now() + 3_600_000,
    limit: 10,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Account gate + ownership
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/calculate — account gate", () => {
  it("returns 401 without a session and touches nothing", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(401);
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
    expect(runPipelineMock).not.toHaveBeenCalled();
    expect(snapshotCreateMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown profile", async () => {
    profileFindUniqueMock.mockResolvedValue(null);
    const res = await POST(req({ profileId: "missing" }) as never);
    expect(res.status).toBe(404);
    expect(runPipelineMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a profile owned by someone else (IDOR guard)", async () => {
    profileFindUniqueMock.mockResolvedValue({ ...PROFILE, userId: "user_2" });
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(403);
    expect(runPipelineMock).not.toHaveBeenCalled();
    expect(snapshotCreateMock).not.toHaveBeenCalled();
  });

  it("returns 403 for an unclaimed anonymous profile (claiming is the profile API's job)", async () => {
    profileFindUniqueMock.mockResolvedValue({
      ...PROFILE,
      userId: null,
      anonymousId: "anon_abc",
    });
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(403);
    expect(runPipelineMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Input validation + rate limiting
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/calculate — input + rate limit", () => {
  it("returns 400 on a non-JSON body", async () => {
    const res = await POST(req("not json") as never);
    expect(res.status).toBe(400);
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 when profileId is missing", async () => {
    const res = await POST(req({}) as never);
    expect(res.status).toBe(400);
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 429 before any profile read when the rate limit is exceeded", async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 3_600_000,
      limit: 10,
    });
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(429);
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "assessment",
      "user:user_1",
    );
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Answers come from the STORED profile — never from the client
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/calculate — stored-profile answers", () => {
  it("runs the pipeline on the STORED answers at full tier", async () => {
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(200);
    expect(runPipelineMock).toHaveBeenCalledTimes(1);
    const input = runPipelineMock.mock.calls[0][0] as {
      answers: unknown;
      tier: string;
    };
    expect(input.answers).toEqual(STORED_ANSWERS);
    expect(input.tier).toBe("full");
  });

  it("IGNORES answers smuggled into the request body (invariant 3)", async () => {
    const res = await POST(
      req({
        profileId: "profile_1",
        answers: {
          q1_9_defense_exclusivity: {
            state: "answered",
            value: "exclusively_defense",
          },
        },
      }) as never,
    );
    expect(res.status).toBe(200);
    const input = runPipelineMock.mock.calls[0][0] as { answers: unknown };
    // the pipeline saw the stored answers, not the smuggled ones
    expect(input.answers).toEqual(STORED_ANSWERS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 422 — partial payloads name the missing questions, NEVER a verdict
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/calculate — 422 paths", () => {
  it("maps SubmissionInvalidError to 422 NAMING the missing questions — no verdict, no snapshot", async () => {
    runPipelineMock.mockRejectedValue(
      new SubmissionInvalidError([
        {
          questionId: "q1_1_roles",
          code: "missing",
          message: 'Missing answer for required question "roles" (q1_1_roles).',
        },
        {
          questionId: "q3_6_launch_timing",
          code: "missing",
          message:
            'Missing answer for required question "launch timing" (q3_6_launch_timing).',
        },
      ]),
    );
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      error: string;
      errors: { questionId: string; code: string; message: string }[];
      result?: unknown;
    };
    expect(body.error).toBe("assessment submission invalid");
    expect(body.errors.map((e) => e.questionId)).toEqual([
      "q1_1_roles",
      "q3_6_launch_timing",
    ]);
    expect(body.result).toBeUndefined(); // never a verdict
    expect(snapshotCreateMock).not.toHaveBeenCalled();
  });

  it("maps ContradictionError to 422 naming the contradictory pair — no snapshot", async () => {
    runPipelineMock.mockRejectedValue(
      new ContradictionError([
        {
          questionIds: ["q4_1_eu_nexus", "q4_3b_ground_countries"],
          message: "EU ground segment contradicts 'no EU nexus'.",
        },
      ]),
    );
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      contradictions: { questionIds: string[] }[];
      result?: unknown;
    };
    expect(body.contradictions[0].questionIds).toContain("q4_1_eu_nexus");
    expect(body.result).toBeUndefined();
    expect(snapshotCreateMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot persistence + honest failure
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/calculate — snapshot + result", () => {
  it("persists an AssessmentVerdictSnapshot pinned to profile version + rulebook semver", async () => {
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(200);
    expect(snapshotCreateMock).toHaveBeenCalledTimes(1);
    const arg = snapshotCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.profileId).toBe("profile_1");
    expect(arg.data.profileVersion).toBe(3);
    expect(arg.data.tier).toBe("FULL");
    expect(arg.data.rulebookVersion).toBe("1.0.0");
    expect(arg.data.unknownsCount).toBe(1);
    expect(arg.data.result).toEqual(FAKE_RESULT);
  });

  it("returns the obligation map (and no key in the response matches /score/i)", async () => {
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; result: unknown };
    expect(body.success).toBe(true);
    expect(body.result).toEqual(FAKE_RESULT);

    const keys = new Set<string>();
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) return v.forEach(walk);
      if (v !== null && typeof v === "object") {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          keys.add(k);
          walk(val);
        }
      }
    };
    walk(body);
    for (const k of keys) expect(k).not.toMatch(/score/i);
  });

  it("returns an honest 500 (no fake success) when the snapshot write fails", async () => {
    snapshotCreateMock.mockRejectedValue(new Error("db down"));
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; success?: boolean };
    expect(body.error).toBeTruthy();
    expect(body.success).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("db down"); // no detail leak
  });

  it("returns an honest 500 when the pipeline fails unexpectedly", async () => {
    runPipelineMock.mockRejectedValue(new Error("engine data corrupt"));
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(500);
    expect(snapshotCreateMock).not.toHaveBeenCalled();
    expect(JSON.stringify(await res.json())).not.toContain(
      "engine data corrupt",
    );
  });
});
