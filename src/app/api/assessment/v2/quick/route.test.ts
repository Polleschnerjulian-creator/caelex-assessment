/**
 * Tests for POST /api/assessment/v2/quick (plan Task 2.2).
 *
 * PURE/MOCKED unit tests — auth, Prisma, the rate limiter, the logger and the
 * verdict pipeline are mocked. The question graph, the branch evaluator, the
 * answer Zod layer and the anti-bot timing gate are the REAL modules: the
 * bypass tests exercise the REAL quick-tier visibility enforcement against
 * the REAL dataset, so a direct API call can never answer hidden or
 * full-tier questions.
 * (Not executed here — the orchestrator runs the suite centrally.)
 *
 * Contract exercised (plan Task 2.2):
 *  1. `startedAt` is REQUIRED — omitting it is a 400 (kills the
 *     decorative-bot-check class); submissions faster than 3s are a 400.
 *  2. Server re-validates QUICK-tier visibility via the real graph — a
 *     payload answering hidden/full-tier questions is a 422 naming them.
 *  3. Persists/updates the anonymous profile + a QUICK verdict snapshot.
 *  4. The response is the quick PROJECTION (counts + headlines), never the
 *     full ObligationMapResult.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (declared before the route is imported) ──

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...a: unknown[]) => authMock(...a),
}));

const profileFindUniqueMock = vi.fn();
const profileFindFirstMock = vi.fn();
const profileCreateMock = vi.fn();
const profileUpdateMock = vi.fn();
const snapshotCreateMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorAssessmentProfile: {
      findUnique: (args: unknown) => profileFindUniqueMock(args),
      findFirst: (args: unknown) => profileFindFirstMock(args),
      create: (args: unknown) => profileCreateMock(args),
      update: (args: unknown) => profileUpdateMock(args),
    },
    assessmentVerdictSnapshot: {
      create: (args: unknown) => snapshotCreateMock(args),
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

const runPipelineMock = vi.fn();
const buildQuickProjectionMock = vi.fn();
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
    buildQuickProjection: (...a: unknown[]) => buildQuickProjectionMock(...a),
  };
});

import { POST } from "./route";
import {
  SubmissionInvalidError,
  ContradictionError,
} from "@/lib/assessment/verdict-pipeline.server";
import { QUESTION_GRAPH } from "@/data/assessment/question-graph";
import { validateSubmission } from "@/lib/assessment/graph-evaluator";
import { ASSESSMENT_PROFILE_COOKIE } from "@/lib/assessment/assessment-profile";
import type { AnswerMap, TriStateAnswer } from "@/lib/assessment/answers";
import type {
  QuestionNode,
  QuestionOption,
} from "@/data/assessment/question-graph-types";

// ── A complete, VALID quick-tier submission built against the REAL graph ──
// Fixed-point construction: answer everything visible until validateSubmission
// is clean — robust against dataset-lane changes (the contract is the real
// graph, not a hardcoded snapshot of it).

function effectiveSpec(node: QuestionNode): {
  kind: QuestionNode["kind"];
  options?: QuestionOption[];
} {
  if (node.quickVariant !== undefined) {
    return {
      kind: node.quickVariant.kind,
      options: node.quickVariant.options ?? node.options,
    };
  }
  return { kind: node.kind, options: node.options };
}

function autoAnswer(node: QuestionNode): TriStateAnswer {
  const spec = effectiveSpec(node);
  const first = spec.options?.[0]?.value;
  switch (spec.kind) {
    case "single":
    case "bands":
      return { state: "answered", value: first ?? "x" };
    case "multi":
      return { state: "answered", value: first !== undefined ? [first] : [] };
    case "country_multi":
      return { state: "answered", value: ["de"] };
    case "text":
      return { state: "answered", value: "test" };
    case "boolean":
      return { state: "answered", value: true };
    default:
      return { state: "unsure" };
  }
}

function buildValidQuickAnswers(seed: AnswerMap = {}): AnswerMap {
  const answers: AnswerMap = { ...seed };
  const nodesById = new Map(QUESTION_GRAPH.map((n) => [n.id, n]));
  for (let i = 0; i < 25; i++) {
    const errors = validateSubmission(QUESTION_GRAPH, "quick", answers);
    if (errors.length === 0) return answers;
    for (const error of errors) {
      if (error.code === "unexpected_answer") {
        delete answers[error.questionId];
      } else {
        const node = nodesById.get(error.questionId);
        if (node) answers[error.questionId] = autoAnswer(node);
      }
    }
  }
  const remaining = validateSubmission(QUESTION_GRAPH, "quick", answers);
  if (remaining.length > 0) {
    throw new Error(
      `test setup: could not build a valid quick submission: ${JSON.stringify(remaining)}`,
    );
  }
  return answers;
}

const VALID_ANSWERS = buildValidQuickAnswers();

const FAKE_RESULT = {
  rulebookVersion: "1.0.0",
  computedAt: "2026-06-10T12:00:00.000Z",
  tier: "quick",
  scope: [],
  nis2Gateway: { value: "needs_clarification" },
  regime: { value: "likely_eligible_verify" },
  clusters: [
    {
      id: "authorization_registration",
      label: "Authorisation & registration",
      findings: [{ what: "x", why: "FULL_BODY_ONLY_MARKER" }],
      counts: { applicable: 1, conditional: 0, contested: 0, advisory: 0 },
    },
  ],
  crossFrameworkOverlaps: [],
  noneIdentifiedOverlaps: true,
  unknowns: [
    {
      questionId: "q9_1_rf_spectrum",
      question: "RF?",
      whatAnsweringChanges: "Spectrum.",
      priority: "high",
    },
    {
      questionId: "q8_1_tpl_insurance",
      question: "TPL?",
      whatAnsweringChanges: "Insurance.",
      priority: "medium",
    },
  ],
  aggregationDisclosures: [],
  contradictions: [],
};

const PROJECTION = {
  kind: "quick_projection",
  rulebookVersion: "1.0.0",
  unknownsCount: 2,
};

const CREATED_PROFILE = {
  id: "p_created",
  userId: null,
  anonymousId: "generated",
  version: 1,
  tier: "QUICK",
  answers: {},
};

function req(body: unknown, cookie?: string): Request {
  return new Request("http://localhost/api/assessment/v2/quick", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** A human-plausible startedAt: 60s before now. */
function humanStartedAt(): number {
  return Date.now() - 60_000;
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockReset().mockResolvedValue(null);
  profileFindUniqueMock.mockReset().mockResolvedValue(null);
  profileFindFirstMock.mockReset().mockResolvedValue(null);
  profileCreateMock
    .mockReset()
    .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...CREATED_PROFILE, ...data, id: "p_created" }),
    );
  profileUpdateMock
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
          ...CREATED_PROFILE,
          id: where.id,
          ...data,
          version:
            typeof data.version === "object" && data.version !== null ? 2 : 1,
        }),
    );
  snapshotCreateMock.mockReset().mockResolvedValue({ id: "snap_1" });
  runPipelineMock.mockReset().mockResolvedValue(FAKE_RESULT);
  buildQuickProjectionMock.mockReset().mockReturnValue(PROJECTION);
  checkRateLimitMock.mockReset().mockResolvedValue({
    success: true,
    remaining: 9,
    reset: Date.now() + 3_600_000,
    limit: 10,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bot checks — startedAt is REQUIRED, timing enforced
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/quick — bot checks", () => {
  it("returns 400 when startedAt is MISSING (required by schema, never skippable)", async () => {
    const res = await POST(req({ answers: VALID_ANSWERS }) as never);
    expect(res.status).toBe(400);
    expect(runPipelineMock).not.toHaveBeenCalled();
    expect(profileCreateMock).not.toHaveBeenCalled();
    expect(snapshotCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the submission is faster than a human plausibly could (<3s)", async () => {
    const res = await POST(
      req({ startedAt: Date.now(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(400);
    expect(runPipelineMock).not.toHaveBeenCalled();
    expect(snapshotCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a clock-skewed future startedAt", async () => {
    const res = await POST(
      req({ startedAt: Date.now() + 60_000, answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(400);
    expect(runPipelineMock).not.toHaveBeenCalled();
  });

  it("returns 429 via the assessment rate-limit tier before any other work", async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 3_600_000,
      limit: 10,
    });
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(429);
    expect(checkRateLimitMock).toHaveBeenCalledWith("assessment", "ip:1.2.3.4");
    expect(runPipelineMock).not.toHaveBeenCalled();
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 on a non-JSON body", async () => {
    const res = await POST(req("not json") as never);
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Answer-layer validation (tri-state Zod, known ids)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/quick — answer validation", () => {
  it("rejects unknown question ids — 400 naming the id", async () => {
    const res = await POST(
      req({
        startedAt: humanStartedAt(),
        answers: {
          ...VALID_ANSWERS,
          q_fake_question: { state: "answered", value: "yes" },
        },
      }) as never,
    );
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toContain("q_fake_question");
    expect(runPipelineMock).not.toHaveBeenCalled();
  });

  it("rejects an unsure answer smuggling a value — 400 (tri-state, invariant 1)", async () => {
    const res = await POST(
      req({
        startedAt: humanStartedAt(),
        answers: {
          ...VALID_ANSWERS,
          q1_9_defense_exclusivity: { state: "unsure", value: "no" },
        },
      }) as never,
    );
    expect(res.status).toBe(400);
    expect(runPipelineMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REAL-GRAPH visibility enforcement — gates cannot be bypassed by direct call
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/quick — server-enforced quick-tier gates", () => {
  it("rejects a payload answering a FULL-tier question — 422 naming it (no engine work)", async () => {
    const res = await POST(
      req({
        startedAt: humanStartedAt(),
        answers: {
          ...VALID_ANSWERS,
          // q9_7 is tier:"full" in the real graph — invisible at quick tier.
          q9_7_sanctions_screening: { state: "answered", value: "none" },
        },
      }) as never,
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      errors: { questionId: string; code: string }[];
    };
    expect(
      body.errors.some(
        (e) =>
          e.questionId === "q9_7_sanctions_screening" &&
          e.code === "unexpected_answer",
      ),
    ).toBe(true);
    expect(runPipelineMock).not.toHaveBeenCalled();
    expect(profileCreateMock).not.toHaveBeenCalled();
    expect(snapshotCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a partial payload — 422 NAMING the missing questions, never a verdict", async () => {
    const partial: AnswerMap = { ...VALID_ANSWERS };
    delete partial.q1_9_defense_exclusivity;
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: partial }) as never,
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      errors: { questionId: string; code: string }[];
      result?: unknown;
    };
    expect(
      body.errors.some(
        (e) =>
          e.questionId === "q1_9_defense_exclusivity" && e.code === "missing",
      ),
    ).toBe(true);
    expect(body.result).toBeUndefined();
    expect(runPipelineMock).not.toHaveBeenCalled();
  });

  it("an EMPTY payload is a 422 naming every visible question — never a verdict", async () => {
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: {} }) as never,
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { errors: { code: string }[] };
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body.errors.every((e) => e.code === "missing")).toBe(true);
    expect(runPipelineMock).not.toHaveBeenCalled();
  });

  it("rejects a smuggled answered 'unsure' option value — 422 invalid_option (binding convention)", async () => {
    const res = await POST(
      req({
        startedAt: humanStartedAt(),
        answers: {
          ...VALID_ANSWERS,
          q1_9_defense_exclusivity: { state: "answered", value: "unsure" },
        },
      }) as never,
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      errors: { questionId: string; code: string }[];
    };
    expect(
      body.errors.some(
        (e) =>
          e.questionId === "q1_9_defense_exclusivity" &&
          e.code === "invalid_option",
      ),
    ).toBe(true);
    expect(runPipelineMock).not.toHaveBeenCalled();
  });

  it("accepts {state:'unsure'} on a visible question (unsure satisfies requiredness)", async () => {
    // Rebuild around the unsure seed so branch-dependent visibility stays
    // consistent (the builder never overwrites a seeded answer — unsure
    // satisfies requiredness and is never reported missing).
    const withUnsure = buildValidQuickAnswers({
      q1_9_defense_exclusivity: { state: "unsure" },
    });
    expect(withUnsure.q1_9_defense_exclusivity).toEqual({ state: "unsure" });
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: withUnsure }) as never,
    );
    expect(res.status).toBe(200);
    expect(runPipelineMock).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline invocation + 422 passthrough
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/quick — pipeline", () => {
  it("runs the pipeline in QUICK mode on the validated answers", async () => {
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(200);
    const input = runPipelineMock.mock.calls[0][0] as {
      answers: AnswerMap;
      tier: string;
    };
    expect(input.tier).toBe("quick");
    expect(input.answers).toEqual(VALID_ANSWERS);
  });

  it("maps a pipeline SubmissionInvalidError to 422 — no snapshot", async () => {
    runPipelineMock.mockRejectedValue(
      new SubmissionInvalidError([
        { questionId: "q1_1_roles", code: "missing", message: "missing" },
      ]),
    );
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(422);
    expect(snapshotCreateMock).not.toHaveBeenCalled();
  });

  it("maps a ContradictionError to 422 naming the pair — no snapshot", async () => {
    runPipelineMock.mockRejectedValue(
      new ContradictionError([
        {
          questionIds: ["q4_1_eu_nexus", "q4_3b_ground_countries"],
          message: "contradiction",
        },
      ]),
    );
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      contradictions: { questionIds: string[] }[];
    };
    expect(body.contradictions[0].questionIds).toContain("q4_1_eu_nexus");
    expect(snapshotCreateMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Profile persistence + snapshot + honest projection response
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/quick — persistence + response", () => {
  it("creates an anonymous profile with the answers and sets the httpOnly cookie", async () => {
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(200);

    expect(profileCreateMock).toHaveBeenCalledTimes(1);
    const created = profileCreateMock.mock.calls[0][0] as {
      data: { anonymousId?: string; tier?: string; answers?: unknown };
    };
    expect(typeof created.data.anonymousId).toBe("string");
    expect(created.data.tier).toBe("QUICK");
    expect(created.data.answers).toEqual(VALID_ANSWERS);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain(`${ASSESSMENT_PROFILE_COOKIE}=`);
    expect(setCookie).toContain(created.data.anonymousId!);
    expect(setCookie?.toLowerCase()).toContain("httponly");

    // The bearer token never leaks into the body.
    const bodyText = JSON.stringify(await res.json());
    expect(bodyText).not.toContain(created.data.anonymousId!);
  });

  it("persists a QUICK snapshot pinned to profile version + rulebook semver with the FULL result", async () => {
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(200);
    expect(snapshotCreateMock).toHaveBeenCalledTimes(1);
    const arg = snapshotCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.profileId).toBe("p_created");
    expect(arg.data.tier).toBe("QUICK");
    expect(arg.data.profileVersion).toBe(1);
    expect(arg.data.rulebookVersion).toBe("1.0.0");
    expect(arg.data.unknownsCount).toBe(2);
    expect(arg.data.result).toEqual(FAKE_RESULT);
  });

  it("responds with the quick PROJECTION — the full result never reaches the wire", async () => {
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(200);
    expect(buildQuickProjectionMock).toHaveBeenCalledWith(FAKE_RESULT);
    const body = (await res.json()) as {
      success: boolean;
      profileId: string;
      result: unknown;
    };
    expect(body.success).toBe(true);
    expect(body.profileId).toBe("p_created");
    expect(body.result).toEqual(PROJECTION);
    // Full finding bodies stay server-side.
    expect(JSON.stringify(body)).not.toContain("FULL_BODY_ONLY_MARKER");
  });

  it("sets no-store and noindex headers (public verdict endpoint)", async () => {
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("updates the existing anonymous profile via the cookie (merge + version bump)", async () => {
    profileFindUniqueMock.mockResolvedValue({
      ...CREATED_PROFILE,
      id: "p_existing",
      anonymousId: "anon_abc",
      answers: { q1_2_establishment: { state: "answered", value: "other" } },
    });
    const res = await POST(
      req(
        { startedAt: humanStartedAt(), answers: VALID_ANSWERS },
        `${ASSESSMENT_PROFILE_COOKIE}=anon_abc`,
      ) as never,
    );
    expect(res.status).toBe(200);
    expect(profileCreateMock).not.toHaveBeenCalled();
    expect(profileUpdateMock).toHaveBeenCalledTimes(1);
    const arg = profileUpdateMock.mock.calls[0][0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(arg.where.id).toBe("p_existing");
    expect(arg.data.version).toEqual({ increment: 1 });
    // Snapshot pinned to the POST-bump version returned by the update.
    const snap = snapshotCreateMock.mock.calls[0][0] as {
      data: { profileVersion: number; profileId: string };
    };
    expect(snap.data.profileId).toBe("p_existing");
    expect(snap.data.profileVersion).toBe(2);
    // No fresh anonymous cookie is issued for an existing profile.
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("NEVER writes to a cookie profile claimed by someone else — creates a fresh one", async () => {
    profileFindUniqueMock.mockResolvedValue({
      ...CREATED_PROFILE,
      id: "p_foreign",
      userId: "u2",
      anonymousId: "anon_abc",
    });
    const res = await POST(
      req(
        { startedAt: humanStartedAt(), answers: VALID_ANSWERS },
        `${ASSESSMENT_PROFILE_COOKIE}=anon_abc`,
      ) as never,
    );
    expect(res.status).toBe(200);
    expect(profileUpdateMock).not.toHaveBeenCalled();
    expect(profileCreateMock).toHaveBeenCalledTimes(1);
  });

  it("updates the signed-in user's own in-progress profile when no cookie is present", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    profileFindFirstMock.mockResolvedValue({
      ...CREATED_PROFILE,
      id: "p_user",
      userId: "u1",
      anonymousId: null,
    });
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(200);
    expect(profileFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", status: "IN_PROGRESS" },
      }),
    );
    expect(profileUpdateMock).toHaveBeenCalledTimes(1);
    expect(profileCreateMock).not.toHaveBeenCalled();
  });

  it("returns an honest 500 (no fake success, no detail leak) when the snapshot write fails", async () => {
    snapshotCreateMock.mockRejectedValue(new Error("db down"));
    const res = await POST(
      req({ startedAt: humanStartedAt(), answers: VALID_ANSWERS }) as never,
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; success?: boolean };
    expect(body.success).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("db down");
  });
});
