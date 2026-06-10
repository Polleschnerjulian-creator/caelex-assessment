/**
 * Tests for /api/assessment/v2/profile (plan Task 2.1).
 *
 * PURE/MOCKED unit tests — auth, Prisma, the rate limiter and the logger are
 * mocked; the question graph, the branch evaluator and the answer Zod layer
 * are the REAL modules (one source of truth — the same evaluation the wizard
 * uses for display is enforced here on writes).
 * (Not executed here — the orchestrator runs the suite centrally.)
 *
 * Contract exercised (plan Task 2.1):
 *  1. POST without session creates a profile with `anonymousId` and sets the
 *     httpOnly cookie `caelex_assessment_profile`; the token never appears in
 *     the response body.
 *  2. A signed-in POST with an anonymous cookie CLAIMS the profile (userId
 *     set, claimedAt stamped, anonymousId nulled, cookie cleared) — answers
 *     carry forward, never re-asked.
 *  3. PATCH validates every answer with buildAnswerMapSchema(QUESTION_IDS)
 *     and bumps `version` only on material change.
 *  4. PATCH with a foreign anonymousId/profile → 404 (no enumeration).
 *  5. SERVER-SIDE VISIBILITY VALIDATION: answering a hidden-branch or
 *     other-tier question is a 422 naming the question.
 *  6. GET resumes by cookie or session; answers are never returned to a
 *     different identity.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (declared before the route is imported) ──

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...a: unknown[]) => authMock(...a),
}));

const findUniqueMock = vi.fn();
const findFirstMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorAssessmentProfile: {
      findUnique: (args: unknown) => findUniqueMock(args),
      findFirst: (args: unknown) => findFirstMock(args),
      create: (args: unknown) => createMock(args),
      update: (args: unknown) => updateMock(args),
    },
  },
}));

const checkRateLimitMock = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (tier: string, id: string) => checkRateLimitMock(tier, id),
  getIdentifier: (_req: unknown, userId?: string) =>
    userId ? `user:${userId}` : "ip:1.2.3.4",
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

import { POST, PATCH, GET } from "./route";
import { ASSESSMENT_PROFILE_COOKIE } from "@/lib/assessment/assessment-profile";

// ── Helpers ──

const PROFILE = {
  id: "p1",
  userId: null as string | null,
  organizationId: null,
  anonymousId: "anon_abc" as string | null,
  version: 1,
  tier: "QUICK" as const,
  status: "IN_PROGRESS" as const,
  answers: {} as Record<string, unknown>,
  currentSection: null as string | null,
  changeTriggers: [] as string[],
  claimedAt: null as Date | null,
  createdAt: new Date("2026-06-01T00:00:00Z"),
  updatedAt: new Date("2026-06-10T00:00:00Z"),
};

function req(
  method: "POST" | "PATCH" | "GET",
  opts: { body?: unknown; cookie?: string } = {},
): Request {
  return new Request("http://localhost/api/assessment/v2/profile", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    ...(opts.body !== undefined
      ? {
          body:
            typeof opts.body === "string"
              ? opts.body
              : JSON.stringify(opts.body),
        }
      : {}),
  });
}

const anonCookie = `${ASSESSMENT_PROFILE_COOKIE}=anon_abc`;

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockReset().mockResolvedValue(null);
  findUniqueMock.mockReset().mockResolvedValue(null);
  findFirstMock.mockReset().mockResolvedValue(null);
  createMock
    .mockReset()
    .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...PROFILE, ...data, id: "p_created" }),
    );
  updateMock
    .mockReset()
    .mockImplementation(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) =>
        Promise.resolve({
          ...PROFILE,
          id: where.id,
          ...data,
          version:
            typeof data.version === "object" && data.version !== null
              ? PROFILE.version + 1
              : PROFILE.version,
        }),
    );
  checkRateLimitMock.mockReset().mockResolvedValue({
    success: true,
    remaining: 9,
    reset: Date.now() + 3_600_000,
    limit: 10,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST — anonymous create
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/profile — anonymous create", () => {
  it("creates a profile with an anonymousId and sets the httpOnly cookie", async () => {
    const res = await POST(req("POST") as never);
    expect(res.status).toBe(200);

    expect(createMock).toHaveBeenCalledTimes(1);
    const created = createMock.mock.calls[0][0] as {
      data: { anonymousId?: string; userId?: string; tier?: string };
    };
    expect(typeof created.data.anonymousId).toBe("string");
    expect(created.data.anonymousId!.length).toBeGreaterThanOrEqual(32);
    expect(created.data.userId).toBeUndefined();
    expect(created.data.tier).toBe("QUICK");

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain(`${ASSESSMENT_PROFILE_COOKIE}=`);
    expect(setCookie).toContain(created.data.anonymousId!);
    expect(setCookie?.toLowerCase()).toContain("httponly");
    expect(setCookie).toContain("Path=/");

    // The bearer token NEVER appears in the response body.
    const body = (await res.json()) as { profile: Record<string, unknown> };
    expect(JSON.stringify(body)).not.toContain(created.data.anonymousId!);
    expect(body.profile.id).toBe("p_created");
  });

  it("resumes an existing anonymous profile via the cookie instead of creating", async () => {
    findUniqueMock.mockResolvedValue({ ...PROFILE });
    const res = await POST(req("POST", { cookie: anonCookie }) as never);
    expect(res.status).toBe(200);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { anonymousId: "anon_abc" },
    });
    expect(createMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { profile: { id: string } };
    expect(body.profile.id).toBe("p1");
  });

  it("forces QUICK for anonymous visitors even when FULL is requested (account-gated tier)", async () => {
    const res = await POST(req("POST", { body: { tier: "FULL" } }) as never);
    expect(res.status).toBe(200);
    const created = createMock.mock.calls[0][0] as { data: { tier: string } };
    expect(created.data.tier).toBe("QUICK");
  });

  it("returns 429 before any DB access when rate-limited", async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 3_600_000,
      limit: 10,
    });
    const res = await POST(req("POST") as never);
    expect(res.status).toBe(429);
    expect(checkRateLimitMock).toHaveBeenCalledWith("assessment", "ip:1.2.3.4");
    expect(createMock).not.toHaveBeenCalled();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST — claim-on-signin
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/profile — claim-on-signin", () => {
  const storedAnswers = {
    q1_1_roles: { state: "answered", value: ["spacecraft_operator"] },
    q1_2_establishment: { state: "answered", value: "eu" },
  };

  beforeEach(() => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
  });

  it("claims the anonymous profile: userId set, claimedAt stamped, token destroyed, cookie cleared", async () => {
    findUniqueMock.mockResolvedValue({ ...PROFILE, answers: storedAnswers });
    updateMock.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...PROFILE,
          answers: storedAnswers,
          ...data,
        }),
    );

    const res = await POST(req("POST", { cookie: anonCookie }) as never);
    expect(res.status).toBe(200);

    expect(updateMock).toHaveBeenCalledTimes(1);
    const arg = updateMock.mock.calls[0][0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(arg.where.id).toBe("p1");
    expect(arg.data.userId).toBe("u1");
    expect(arg.data.claimedAt).toBeInstanceOf(Date);
    expect(arg.data.anonymousId).toBeNull();

    // Cookie cleared (the bearer token is consumed by the claim).
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain(`${ASSESSMENT_PROFILE_COOKIE}=`);
    expect(setCookie).toContain("Max-Age=0");

    // Answers carry forward — never re-asked.
    const body = (await res.json()) as {
      profile: { answers: Record<string, unknown>; claimed: boolean };
    };
    expect(body.profile.answers).toEqual(storedAnswers);
    expect(body.profile.claimed).toBe(true);
  });

  it("upgrades the claimed profile to FULL when requested", async () => {
    findUniqueMock.mockResolvedValue({ ...PROFILE });
    await POST(
      req("POST", { cookie: anonCookie, body: { tier: "FULL" } }) as never,
    );
    const arg = updateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.tier).toBe("FULL");
  });

  it("NEVER touches a cookie profile already claimed by someone else", async () => {
    findUniqueMock.mockResolvedValue({ ...PROFILE, userId: "u2" });
    const res = await POST(req("POST", { cookie: anonCookie }) as never);
    expect(res.status).toBe(200);
    // No claim update on the foreign profile — a fresh own profile instead.
    expect(updateMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledTimes(1);
    const created = createMock.mock.calls[0][0] as {
      data: { userId?: string };
    };
    expect(created.data.userId).toBe("u1");
    // Stale cookie cleared.
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("resumes the latest own profile when signed in without a cookie", async () => {
    findFirstMock.mockResolvedValue({
      ...PROFILE,
      id: "p_user",
      userId: "u1",
      anonymousId: null,
    });
    const res = await POST(req("POST") as never);
    expect(res.status).toBe(200);
    expect(createMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { profile: { id: string } };
    expect(body.profile.id).toBe("p_user");
  });

  it("creates a user-owned profile when none exists", async () => {
    const res = await POST(req("POST", { body: { tier: "FULL" } }) as never);
    expect(res.status).toBe(200);
    const created = createMock.mock.calls[0][0] as {
      data: { userId?: string; tier?: string; anonymousId?: string };
    };
    expect(created.data.userId).toBe("u1");
    expect(created.data.tier).toBe("FULL");
    expect(created.data.anonymousId).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — answer persistence
// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/assessment/v2/profile — validation", () => {
  it("rejects an unsure answer smuggling a value (tri-state Zod layer) — 400", async () => {
    findUniqueMock.mockResolvedValue({ ...PROFILE });
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          answers: { q1_2_establishment: { state: "unsure", value: "x" } },
        },
      }) as never,
    );
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown question id — 400 naming the id", async () => {
    findUniqueMock.mockResolvedValue({ ...PROFILE });
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          answers: { q99_made_up: { state: "answered", value: "yes" } },
        },
      }) as never,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      details: { path: string; message: string }[];
    };
    expect(JSON.stringify(body.details)).toContain("q99_made_up");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects an empty patch (nothing to update) — 400", async () => {
    const res = await PATCH(
      req("PATCH", { cookie: anonCookie, body: {} }) as never,
    );
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/assessment/v2/profile — ownership (no enumeration)", () => {
  it("returns 404 for a foreign anonymousId cookie", async () => {
    findUniqueMock.mockResolvedValue(null); // no profile for this token
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          answers: { q1_2_establishment: { state: "answered", value: "eu" } },
        },
      }) as never,
    );
    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 404 (not 403) for someone else's profileId — indistinguishable from missing", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    findUniqueMock.mockImplementation(({ where }: { where: { id?: string } }) =>
      Promise.resolve(
        where.id === "p1"
          ? { ...PROFILE, userId: "u2", anonymousId: null }
          : null,
      ),
    );
    const res = await PATCH(
      req("PATCH", {
        body: {
          profileId: "p1",
          answers: { q1_2_establishment: { state: "answered", value: "eu" } },
        },
      }) as never,
    );
    expect(res.status).toBe(404);
    const missing = await PATCH(
      req("PATCH", {
        body: {
          profileId: "p_missing",
          answers: { q1_2_establishment: { state: "answered", value: "eu" } },
        },
      }) as never,
    );
    // Same status + same body shape for foreign and missing.
    expect(missing.status).toBe(404);
    expect(await res.clone().json()).toEqual(await missing.clone().json());
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when an anonymous caller targets a CLAIMED profile by id", async () => {
    findUniqueMock.mockResolvedValue({
      ...PROFILE,
      userId: "u2",
      anonymousId: "anon_abc",
    });
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          profileId: "p1",
          answers: { q1_2_establishment: { state: "answered", value: "eu" } },
        },
      }) as never,
    );
    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/assessment/v2/profile — version bump on material change only", () => {
  beforeEach(() => {
    findUniqueMock.mockResolvedValue({
      ...PROFILE,
      answers: { q1_2_establishment: { state: "answered", value: "eu" } },
    });
  });

  it("bumps version when an answer materially changes", async () => {
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          answers: { q1_2_establishment: { state: "answered", value: "us" } },
        },
      }) as never,
    );
    expect(res.status).toBe(200);
    const arg = updateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.version).toEqual({ increment: 1 });
    expect(
      (arg.data.answers as Record<string, unknown>).q1_2_establishment,
    ).toEqual({ state: "answered", value: "us" });
  });

  it("does NOT bump version for an identical re-submission", async () => {
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          answers: { q1_2_establishment: { state: "answered", value: "eu" } },
        },
      }) as never,
    );
    expect(res.status).toBe(200);
    const arg = updateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.version).toBeUndefined();
  });

  it("updates currentSection without a version bump", async () => {
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: { currentSection: "jurisdiction_market" },
      }) as never,
    );
    expect(res.status).toBe(200);
    const arg = updateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.currentSection).toBe("jurisdiction_market");
    expect(arg.data.version).toBeUndefined();
    expect(arg.data.answers).toBeUndefined();
  });

  it("merges the patch into stored answers (untouched keys survive)", async () => {
    findUniqueMock.mockResolvedValue({
      ...PROFILE,
      answers: {
        q1_2_establishment: { state: "answered", value: "eu" },
        q1_9_defense_exclusivity: { state: "answered", value: "no" },
      },
    });
    await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          answers: {
            q1_1_roles: { state: "answered", value: ["spacecraft_operator"] },
          },
        },
      }) as never,
    );
    const arg = updateMock.mock.calls[0][0] as {
      data: { answers: Record<string, unknown> };
    };
    expect(Object.keys(arg.data.answers).sort()).toEqual([
      "q1_1_roles",
      "q1_2_establishment",
      "q1_9_defense_exclusivity",
    ]);
  });
});

describe("PATCH /api/assessment/v2/profile — server-side visibility validation", () => {
  it("rejects answering a FULL-tier question on a QUICK profile — 422 naming it", async () => {
    findUniqueMock.mockResolvedValue({ ...PROFILE, tier: "QUICK" });
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          answers: {
            // q9_7 is tier:"full" in the real graph — invisible on quick.
            q9_7_sanctions_screening: { state: "answered", value: "none" },
          },
        },
      }) as never,
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      errors: { questionId: string; code: string }[];
    };
    expect(
      body.errors.some((e) => e.questionId === "q9_7_sanctions_screening"),
    ).toBe(true);
    expect(body.errors[0].code).toBe("unexpected_answer");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects answering a hidden-branch question (EU establishment hides the EU-nexus gate) — 422", async () => {
    findUniqueMock.mockResolvedValue({
      ...PROFILE,
      answers: { q1_2_establishment: { state: "answered", value: "eu" } },
    });
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          answers: { q4_1_eu_nexus: { state: "answered", value: "yes" } },
        },
      }) as never,
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { errors: { questionId: string }[] };
    expect(body.errors.some((e) => e.questionId === "q4_1_eu_nexus")).toBe(
      true,
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("accepts a branch flip together with the newly revealed answer in ONE patch", async () => {
    findUniqueMock.mockResolvedValue({
      ...PROFILE,
      answers: { q1_2_establishment: { state: "answered", value: "eu" } },
    });
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          answers: {
            q1_2_establishment: { state: "answered", value: "us" },
            q4_1_eu_nexus: { state: "answered", value: "yes" },
          },
        },
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid option value (incl. a smuggled answered 'unsure') — 422", async () => {
    findUniqueMock.mockResolvedValue({ ...PROFILE });
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: {
          // BINDING convention (Task 1.3): "unsure" is never an option value,
          // so an answered "unsure" fails option membership.
          answers: {
            q1_9_defense_exclusivity: { state: "answered", value: "unsure" },
          },
        },
      }) as never,
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { errors: { code: string }[] };
    expect(body.errors[0].code).toBe("invalid_option");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("stores {state:'unsure'} on a visible question (unsure is a first-class answer)", async () => {
    findUniqueMock.mockResolvedValue({
      ...PROFILE,
      answers: { q1_2_establishment: { state: "answered", value: "us" } },
    });
    const res = await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: { answers: { q4_1_eu_nexus: { state: "unsure" } } },
      }) as never,
    );
    expect(res.status).toBe(200);
    const arg = updateMock.mock.calls[0][0] as {
      data: { answers: Record<string, unknown> };
    };
    expect(arg.data.answers.q4_1_eu_nexus).toEqual({ state: "unsure" });
  });

  it("uses the api rate-limit tier for answer writes (per-answer persistence)", async () => {
    findUniqueMock.mockResolvedValue({ ...PROFILE });
    await PATCH(
      req("PATCH", {
        cookie: anonCookie,
        body: { currentSection: "identity_role" },
      }) as never,
    );
    expect(checkRateLimitMock).toHaveBeenCalledWith("api", "ip:1.2.3.4");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET — resume
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/assessment/v2/profile — resume", () => {
  it("resumes the anonymous profile by cookie", async () => {
    findUniqueMock.mockResolvedValue({
      ...PROFILE,
      answers: { q1_2_establishment: { state: "answered", value: "eu" } },
      currentSection: "identity_role",
    });
    const res = await GET(req("GET", { cookie: anonCookie }) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      profile: { id: string; currentSection: string };
    };
    expect(body.profile.id).toBe("p1");
    expect(body.profile.currentSection).toBe("identity_role");
  });

  it("resumes by session (latest profile)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    findFirstMock.mockResolvedValue({
      ...PROFILE,
      id: "p_user",
      userId: "u1",
      anonymousId: null,
    });
    const res = await GET(req("GET") as never);
    expect(res.status).toBe(200);
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } }),
    );
    const body = (await res.json()) as { profile: { id: string } };
    expect(body.profile.id).toBe("p_user");
  });

  it("returns 404 without any identity", async () => {
    const res = await GET(req("GET") as never);
    expect(res.status).toBe(404);
  });

  it("returns 404 for a stale cookie pointing at a CLAIMED profile (answers never cross identities)", async () => {
    findUniqueMock.mockResolvedValue({
      ...PROFILE,
      userId: "u2",
      answers: { q1_2_establishment: { state: "answered", value: "eu" } },
    });
    const res = await GET(req("GET", { cookie: anonCookie }) as never);
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain("q1_2");
  });
});
