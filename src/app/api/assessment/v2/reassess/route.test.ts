/**
 * Tests for POST /api/assessment/v2/reassess (plan Task 4.3).
 *
 * PURE/MOCKED unit tests — auth, Prisma, the rate limiter, the logger and
 * the delta service are mocked. The living-tier entitlement gate is NOT
 * mocked: the REAL `hasLivingTierEntitlement` runs against the Prisma mock,
 * so the founder-§11.2 subscription matrix (plan/status on the real billing
 * record) is exercised end-to-end at the route level.
 * (Not executed here — the orchestrator runs the suite centrally.)
 *
 * Route contract exercised:
 *   1. ACCOUNT GATE — 401 without a session, nothing touched.
 *   2. ENTITLEMENT FIRST (founder §11.2 — living tier is PAID) — plan FREE
 *      (the schema default), no Subscription row, no membership, or an
 *      unusable status (CANCELED/…) → 403 { error: "living_tier_required",
 *      upgrade: "/pricing" }; NO profile load, NO snapshot write, and
 *      `reassessProfile` is NEVER invoked (spy). STARTER/PROFESSIONAL/
 *      ENTERPRISE with ACTIVE or TRIALING → 200 { snapshotId, delta }.
 *   3. OWNERSHIP — 404 unknown profile; 403 foreign/unclaimed-anonymous.
 *   4. REASON derived server-side: stale latest-snapshot rulebook ⇒
 *      "rulebook_bump", else "answer_change" — never client-trusted.
 *   5. 422 — pipeline validation/contradiction errors name the questions,
 *      never a verdict; honest 500 with no detail leak otherwise.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// ── Mocks (declared before the route is imported) ──

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...a: unknown[]) => authMock(...a),
}));

const memberFindFirstMock = vi.fn();
const profileFindUniqueMock = vi.fn();
const snapshotFindFirstMock = vi.fn();
const snapshotCreateMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findFirst: (args: unknown) => memberFindFirstMock(args),
    },
    operatorAssessmentProfile: {
      findUnique: (args: unknown) => profileFindUniqueMock(args),
    },
    assessmentVerdictSnapshot: {
      findFirst: (args: unknown) => snapshotFindFirstMock(args),
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

// The delta SERVICE is mocked (reassessProfile spy — plan: "reassessProfile is
// never invoked" must be assertable); isVerdictStale mirrors RULEBOOK 1.0.0.
const reassessProfileMock = vi.fn();
vi.mock("@/lib/assessment/assessment-delta.server", () => ({
  reassessProfile: (...a: unknown[]) => reassessProfileMock(...a),
  isVerdictStale: (v: string) => v !== "1.0.0",
}));

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
  return { SubmissionInvalidError, ContradictionError };
});

import { POST } from "./route";
import {
  SubmissionInvalidError,
  ContradictionError,
} from "@/lib/assessment/verdict-pipeline.server";

// ── Helpers ──

const PROFILE = {
  id: "profile_1",
  userId: "user_1",
  organizationId: "org_1",
  anonymousId: null,
  version: 3,
  tier: "FULL",
  status: "IN_PROGRESS",
  answers: {
    q1_1_roles: { state: "answered", value: ["spacecraft_operator"] },
  },
  currentSection: null,
  changeTriggers: ["new_jurisdiction"],
  claimedAt: null,
  createdAt: new Date("2026-06-01T00:00:00Z"),
  updatedAt: new Date("2026-06-10T00:00:00Z"),
};

const DELTA = {
  added: [],
  removed: [],
  changed: [
    {
      before: {
        what: "National authorisation required.",
        verdict: "conditional",
      },
      after: {
        what: "National authorisation required.",
        verdict: "applicable",
      },
    },
  ],
};

function subscription(plan: string, status: string): unknown {
  return { organization: { subscription: { plan, status } } };
}

function req(body: unknown): Request {
  return new Request("http://localhost/api/assessment/v2/reassess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockReset().mockResolvedValue({ user: { id: "user_1" } });
  // Entitled by default — individual tests override the billing record.
  memberFindFirstMock
    .mockReset()
    .mockResolvedValue(subscription("PROFESSIONAL", "ACTIVE"));
  profileFindUniqueMock.mockReset().mockResolvedValue(PROFILE);
  snapshotFindFirstMock
    .mockReset()
    .mockResolvedValue({ rulebookVersion: "1.0.0" });
  snapshotCreateMock.mockReset();
  reassessProfileMock
    .mockReset()
    .mockResolvedValue({ snapshotId: "snap_new", delta: DELTA });
  checkRateLimitMock.mockReset().mockResolvedValue({
    success: true,
    remaining: 9,
    reset: Date.now() + 3_600_000,
    limit: 10,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Account gate + rate limit
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/reassess — account gate", () => {
  it("returns 401 without a session and touches nothing", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(401);
    expect(memberFindFirstMock).not.toHaveBeenCalled();
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
    expect(reassessProfileMock).not.toHaveBeenCalled();
  });

  it("returns 429 before the entitlement read when the rate limit is exceeded", async () => {
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
    expect(memberFindFirstMock).not.toHaveBeenCalled();
    expect(reassessProfileMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Entitlement gate (founder §11.2 — the living tier is PAID)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/reassess — living-tier entitlement", () => {
  it.each([
    ["no organization membership", null],
    ["no Subscription row", { organization: { subscription: null } }],
    ["plan FREE (the schema default) + ACTIVE", subscription("FREE", "ACTIVE")],
    [
      "plan FREE + TRIALING (the schema defaults)",
      subscription("FREE", "TRIALING"),
    ],
    [
      "paid plan with status CANCELED",
      subscription("PROFESSIONAL", "CANCELED"),
    ],
    ["paid plan with status PAST_DUE", subscription("STARTER", "PAST_DUE")],
  ])(
    "%s → 403 upgrade payload; NO profile load, NO snapshot, reassessProfile NEVER invoked",
    async (_label, membership) => {
      memberFindFirstMock.mockResolvedValue(membership);
      const res = await POST(req({ profileId: "profile_1" }) as never);
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string; upgrade: string };
      expect(body).toEqual({
        error: "living_tier_required",
        upgrade: "/pricing",
      });
      // Entitlement is checked BEFORE any profile load or pipeline work.
      expect(profileFindUniqueMock).not.toHaveBeenCalled();
      expect(reassessProfileMock).not.toHaveBeenCalled();
      expect(snapshotCreateMock).not.toHaveBeenCalled();
    },
  );

  it("non-entitled requests get the 403 even with a malformed body (entitlement precedes parsing)", async () => {
    memberFindFirstMock.mockResolvedValue(subscription("FREE", "ACTIVE"));
    const res = await POST(req("not json") as never);
    expect(res.status).toBe(403);
    expect(reassessProfileMock).not.toHaveBeenCalled();
  });

  it.each([
    ["STARTER", "ACTIVE"],
    ["PROFESSIONAL", "TRIALING"],
    ["ENTERPRISE", "ACTIVE"],
  ] as const)(
    "plan %s + status %s → 200 with { snapshotId, delta }",
    async (plan, status) => {
      memberFindFirstMock.mockResolvedValue(subscription(plan, status));
      const res = await POST(req({ profileId: "profile_1" }) as never);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        snapshotId: string;
        delta: unknown;
      };
      expect(body.snapshotId).toBe("snap_new");
      expect(body.delta).toEqual(DELTA);
      expect(reassessProfileMock).toHaveBeenCalledTimes(1);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Input validation + ownership
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/reassess — input + ownership", () => {
  it("returns 400 on a non-JSON body (entitled)", async () => {
    const res = await POST(req("not json") as never);
    expect(res.status).toBe(400);
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 when profileId is missing", async () => {
    const res = await POST(req({}) as never);
    expect(res.status).toBe(400);
    expect(reassessProfileMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown profile", async () => {
    profileFindUniqueMock.mockResolvedValue(null);
    const res = await POST(req({ profileId: "missing" }) as never);
    expect(res.status).toBe(404);
    expect(reassessProfileMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a profile owned by someone else (IDOR guard)", async () => {
    profileFindUniqueMock.mockResolvedValue({ ...PROFILE, userId: "user_2" });
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(403);
    expect(reassessProfileMock).not.toHaveBeenCalled();
  });

  it("returns 403 for an unclaimed anonymous profile", async () => {
    profileFindUniqueMock.mockResolvedValue({
      ...PROFILE,
      userId: null,
      anonymousId: "anon_abc",
    });
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(403);
    expect(reassessProfileMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reason derivation (server-side, never client-trusted)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/reassess — reason derivation", () => {
  it('a stale latest-snapshot rulebook ⇒ reassessProfile(profileId, "rulebook_bump")', async () => {
    snapshotFindFirstMock.mockResolvedValue({ rulebookVersion: "0.9.0" });
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(200);
    expect(reassessProfileMock).toHaveBeenCalledWith(
      "profile_1",
      "rulebook_bump",
    );
    const body = (await res.json()) as { reason: string };
    expect(body.reason).toBe("rulebook_bump");
  });

  it('a current latest-snapshot rulebook ⇒ "answer_change"', async () => {
    snapshotFindFirstMock.mockResolvedValue({ rulebookVersion: "1.0.0" });
    await POST(req({ profileId: "profile_1" }) as never);
    expect(reassessProfileMock).toHaveBeenCalledWith(
      "profile_1",
      "answer_change",
    );
  });

  it('no previous snapshot ⇒ "answer_change" (a first re-run is not a rulebook bump)', async () => {
    snapshotFindFirstMock.mockResolvedValue(null);
    await POST(req({ profileId: "profile_1" }) as never);
    expect(reassessProfileMock).toHaveBeenCalledWith(
      "profile_1",
      "answer_change",
    );
  });

  it("a reason smuggled into the request body is IGNORED (server-derived only)", async () => {
    snapshotFindFirstMock.mockResolvedValue({ rulebookVersion: "1.0.0" });
    await POST(
      req({ profileId: "profile_1", reason: "rulebook_bump" }) as never,
    );
    expect(reassessProfileMock).toHaveBeenCalledWith(
      "profile_1",
      "answer_change",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 422 paths + honest failure
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/reassess — 422 + 500", () => {
  it("maps SubmissionInvalidError to 422 NAMING the missing questions — never a verdict", async () => {
    reassessProfileMock.mockRejectedValue(
      new SubmissionInvalidError([
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
      errors: { questionId: string }[];
      snapshotId?: unknown;
    };
    expect(body.error).toBe("assessment submission invalid");
    expect(body.errors[0].questionId).toBe("q3_6_launch_timing");
    expect(body.snapshotId).toBeUndefined();
  });

  it("maps ContradictionError to 422 naming the contradictory pair", async () => {
    reassessProfileMock.mockRejectedValue(
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
    };
    expect(body.contradictions[0].questionIds).toContain("q4_1_eu_nexus");
  });

  it("returns an honest 500 (no fake success, no detail leak) on an unexpected failure", async () => {
    reassessProfileMock.mockRejectedValue(new Error("db down"));
    const res = await POST(req({ profileId: "profile_1" }) as never);
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("db down");
    expect(text).not.toContain("snapshotId");
  });
});
