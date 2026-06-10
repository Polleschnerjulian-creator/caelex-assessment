/**
 * Tests for the living-tier delta re-assessment (plan Task 4.3).
 *
 * PURE/MOCKED unit tests — Prisma, the logger and the verdict pipeline are
 * mocked; diff/walk helpers are exercised pure. (Not executed here — the
 * orchestrator runs the suite centrally.)
 *
 * Contract exercised:
 *   1. diffVerdicts(prev, next) → { added, removed, changed:{before,after}[] }
 *      keyed by (cluster, citation, what); unchanged findings are EXCLUDED
 *      (the delta never fabricates); stamps (rulebookVersion) and whyTrace
 *      provenance are not substance.
 *   2. affectedQuestions(graph, changedAnswerIds) walks showIf dependents
 *      transitively (exception-based delta, Vanta pattern §6b).
 *   3. isVerdictStale — a rulebook bump (stored version !== RULEBOOK.version)
 *      flags the profile for re-assessment.
 *   4. reassessProfile runs the REAL pipeline import against the STORED
 *      answers, writes a NEW AssessmentVerdictSnapshot (calculate-route
 *      shape, the pipeline result VERBATIM — no merging), returns the diff
 *      vs the previous latest snapshot, and notifies "N findings changed"
 *      through the EXISTING Notification model with the reason recorded.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// ── Mocks (declared before the module under test is imported) ──

const profileFindUniqueMock = vi.fn();
const snapshotFindFirstMock = vi.fn();
const snapshotCreateMock = vi.fn();
const notificationCreateMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorAssessmentProfile: {
      findUnique: (args: unknown) => profileFindUniqueMock(args),
    },
    assessmentVerdictSnapshot: {
      findFirst: (args: unknown) => snapshotFindFirstMock(args),
      create: (args: unknown) => snapshotCreateMock(args),
    },
    notification: {
      create: (args: unknown) => notificationCreateMock(args),
    },
  },
}));

const loggerWarnMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: (...a: unknown[]) => loggerWarnMock(...a),
    info: vi.fn(),
  },
}));

const runPipelineMock = vi.fn();
vi.mock("@/lib/assessment/verdict-pipeline.server", () => ({
  runVerdictPipeline: (...a: unknown[]) => runPipelineMock(...a),
}));

import { RULEBOOK } from "@/data/assessment/rulebook";
import type { AssessmentFinding } from "@/lib/assessment/finding";
import type { QuestionNode } from "@/data/assessment/question-graph-types";
import type { ObligationMapResult } from "@/lib/assessment/verdict-pipeline.server";
import {
  diffVerdicts,
  affectedQuestions,
  isVerdictStale,
  collectFindings,
  formatDeltaMessage,
  reassessProfile,
} from "./assessment-delta.server";

// ── Fixtures ──

function finding(over: Partial<AssessmentFinding> = {}): AssessmentFinding {
  return {
    value: "authorization_required",
    verdict: "applicable",
    what: "National authorisation required.",
    why: "You operate spacecraft from an EU establishment.",
    wherefore: "Apply to your NCA before launch.",
    whyTrace: [
      { questionId: "q1_1_roles", answerLabel: "spacecraft_operator" },
    ],
    confidence: "DETERMINED",
    sources: [
      {
        label: "EU Space Act proposal — Commission text",
        citation: "COM(2025) 335 Art. 5",
        asOf: "2025-06-25",
        verified: true,
      },
    ],
    cluster: "authorization_registration",
    rulebookVersion: "1.0.0",
    ...over,
  };
}

const GATEWAY_FINDING = finding({
  value: "essential",
  what: "NIS2 gateway: classified essential (space sector).",
  cluster: "resilience_cyber",
  sources: [
    {
      label: "NIS2 Directive",
      citation: "Directive (EU) 2022/2555 Annex I",
      asOf: "2022-12-27",
      verified: true,
    },
  ],
});

const REGIME_FINDING = finding({
  value: "not_eligible",
  what: "Light regime: not eligible.",
  cluster: "authorization_registration",
  sources: [
    {
      label: "EU Space Act proposal — Commission text",
      citation: "COM(2025) 335 Art. 10",
      asOf: "2025-06-25",
      verified: true,
    },
  ],
});

/** Minimal contract-shaped ObligationMapResult carrying the given cluster findings. */
function resultWith(
  findings: AssessmentFinding[],
  over: Partial<ObligationMapResult> = {},
): ObligationMapResult {
  return {
    rulebookVersion: RULEBOOK.version,
    computedAt: "2026-06-10T12:00:00.000Z",
    tier: "full",
    scope: [],
    nis2Gateway: GATEWAY_FINDING as ObligationMapResult["nis2Gateway"],
    regime: REGIME_FINDING as ObligationMapResult["regime"],
    clusters: [
      {
        id: "authorization_registration",
        label: "Authorisation & registration",
        findings,
        counts: {
          applicable: findings.length,
          conditional: 0,
          contested: 0,
          advisory: 0,
        },
      },
    ],
    crossFrameworkOverlaps: [],
    noneIdentifiedOverlaps: true,
    unknowns: [],
    aggregationDisclosures: [],
    contradictions: [],
    ...over,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// diffVerdicts — keyed by (cluster, citation, what); never fabricates
// ─────────────────────────────────────────────────────────────────────────────

describe("diffVerdicts", () => {
  it("an identical result diffs to an EMPTY delta (unchanged findings are excluded)", () => {
    const a = resultWith([finding()]);
    const b = resultWith([finding()]);
    const delta = diffVerdicts(a, b);
    expect(delta.added).toEqual([]);
    expect(delta.removed).toEqual([]);
    expect(delta.changed).toEqual([]);
  });

  it("a finding only in next is ADDED; only in prev is REMOVED", () => {
    const debris = finding({
      what: "Debris-mitigation plan required.",
      cluster: "debris_safety",
      sources: [
        {
          label: "EU Space Act proposal — Commission text",
          citation: "COM(2025) 335 Art. 30",
          asOf: "2025-06-25",
          verified: true,
        },
      ],
    });
    const insurance = finding({
      what: "Third-party-liability insurance minimum applies.",
      cluster: "insurance_liability",
      sources: [
        {
          label: "Italian Space Economy Act",
          citation: "Legge 13 giugno 2025, n. 89",
          asOf: "2025-06-11",
          verified: true,
        },
      ],
    });
    const delta = diffVerdicts(
      resultWith([finding(), insurance]),
      resultWith([finding(), debris]),
    );
    expect(delta.added).toEqual([debris]);
    expect(delta.removed).toEqual([insurance]);
    expect(delta.changed).toEqual([]);
  });

  it("same key (cluster, citation, what) with a different verdict is CHANGED with before/after", () => {
    const before = finding({ verdict: "conditional" });
    const after = finding({ verdict: "applicable" });
    const delta = diffVerdicts(resultWith([before]), resultWith([after]));
    expect(delta.changed).toEqual([{ before, after }]);
    expect(delta.added).toEqual([]);
    expect(delta.removed).toEqual([]);
  });

  it("a confidence-band move (DETERMINED → PROBABLE) is a CHANGE (unknown rounds up must surface)", () => {
    const before = finding({ confidence: "DETERMINED" });
    const after = finding({ confidence: "PROBABLE" });
    const delta = diffVerdicts(resultWith([before]), resultWith([after]));
    expect(delta.changed).toHaveLength(1);
    expect(delta.changed[0].before.confidence).toBe("DETERMINED");
    expect(delta.changed[0].after.confidence).toBe("PROBABLE");
  });

  it("a pure rulebook re-stamp (only rulebookVersion differs) is NOT a change — stamps are not substance", () => {
    const before = finding({ rulebookVersion: "1.0.0" });
    const after = finding({ rulebookVersion: "1.1.0" });
    const delta = diffVerdicts(resultWith([before]), resultWith([after]));
    expect(delta.changed).toEqual([]);
    expect(delta.added).toEqual([]);
    expect(delta.removed).toEqual([]);
  });

  it("whyTrace answer-label churn alone is NOT a change — provenance is not substance", () => {
    const before = finding({
      whyTrace: [
        { questionId: "q1_1_roles", answerLabel: "Spacecraft operator" },
      ],
    });
    const after = finding({
      whyTrace: [
        { questionId: "q1_1_roles", answerLabel: "spacecraft_operator" },
      ],
    });
    const delta = diffVerdicts(resultWith([before]), resultWith([after]));
    expect(delta.changed).toEqual([]);
  });

  it("a changed `what` produces added+removed (the what is part of the KEY), never a merged 'changed'", () => {
    const before = finding({ what: "National authorisation required." });
    const after = finding({
      what: "National authorisation and registration required.",
    });
    const delta = diffVerdicts(resultWith([before]), resultWith([after]));
    expect(delta.changed).toEqual([]);
    expect(delta.removed).toEqual([before]);
    expect(delta.added).toEqual([after]);
  });

  it("the same what+citation under a DIFFERENT cluster is a different key (added+removed)", () => {
    const before = finding({ cluster: "authorization_registration" });
    const after = finding({ cluster: "supervision_penalties" });
    const delta = diffVerdicts(resultWith([before]), resultWith([after]));
    expect(delta.changed).toEqual([]);
    expect(delta.removed).toEqual([before]);
    expect(delta.added).toEqual([after]);
  });

  it("key-order differences in deserialized JSON do not fabricate changes (stable comparison)", () => {
    const before = finding();
    // Simulate a DB JSON round trip that reordered object keys at every level.
    const reordered = {
      rulebookVersion: "1.0.0",
      cluster: "authorization_registration",
      sources: [
        {
          verified: true,
          asOf: "2025-06-25",
          citation: "COM(2025) 335 Art. 5",
          label: "EU Space Act proposal — Commission text",
        },
      ],
      confidence: "DETERMINED",
      whyTrace: [
        { answerLabel: "spacecraft_operator", questionId: "q1_1_roles" },
      ],
      wherefore: "Apply to your NCA before launch.",
      why: "You operate spacecraft from an EU establishment.",
      what: "National authorisation required.",
      verdict: "applicable",
      value: "authorization_required",
    } as AssessmentFinding;
    const delta = diffVerdicts(resultWith([before]), resultWith([reordered]));
    expect(delta.changed).toEqual([]);
    expect(delta.added).toEqual([]);
    expect(delta.removed).toEqual([]);
  });

  it("a value-payload change (e.g. jurisdiction fidelity degradation) IS a change", () => {
    const before = finding({
      value: { jurisdiction: "UK", nexus: "held_license", fidelity: "full" },
    });
    const after = finding({
      value: {
        jurisdiction: "UK",
        nexus: "held_license",
        fidelity: "degraded_generic_fallback",
      },
    });
    const delta = diffVerdicts(resultWith([before]), resultWith([after]));
    expect(delta.changed).toHaveLength(1);
  });

  it("duplicate keys are paired positionally — a finding is never silently dropped", () => {
    const dupA = finding();
    const dupB = finding({ verdict: "conditional" });
    // prev has TWO findings under the same key; next has ONE (identical to dupA).
    const delta = diffVerdicts(resultWith([dupA, dupB]), resultWith([dupA]));
    expect(delta.changed).toEqual([]);
    expect(delta.removed).toEqual([dupB]); // the unpaired leftover surfaces as removed
    expect(delta.added).toEqual([]);
  });

  it("collectFindings walks scope + nis2Gateway + regime + cluster findings and tolerates missing arrays", () => {
    const full = resultWith([finding()]);
    const collected = collectFindings(full);
    expect(collected).toContainEqual(GATEWAY_FINDING);
    expect(collected).toContainEqual(REGIME_FINDING);
    expect(collected).toContainEqual(finding());

    // Older / partial stored JSON: no throw, no fabrication.
    const partial = {
      rulebookVersion: "0.9.0",
    } as unknown as ObligationMapResult;
    expect(collectFindings(partial)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// affectedQuestions — showIf dependents, transitive (exception-based delta)
// ─────────────────────────────────────────────────────────────────────────────

function node(id: string, over: Partial<QuestionNode> = {}): QuestionNode {
  return {
    id,
    section: "identity_role",
    tier: "both",
    kind: "single",
    title: id,
    why: "test",
    citation: [
      {
        label: "EU Space Act proposal — Commission text",
        citation: "COM(2025) 335",
        asOf: "2025-06-25",
        verified: true,
      },
    ],
    unsureMode: "none",
    ...over,
  };
}

const GRAPH: QuestionNode[] = [
  node("q1_1_roles"),
  node("q1_9_defense_exclusivity"),
  node("q2_1_spacecraft_count", {
    showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
  }),
  node("q2_2_constellation_detail", {
    showIf: {
      all: [
        { q: "q2_1_spacecraft_count", op: "answered" },
        {
          not: {
            q: "q1_9_defense_exclusivity",
            op: "eq",
            value: "exclusively_defense",
          },
        },
      ],
    },
  }),
  node("q3_1_orbital_regimes"),
  node("q9_1_rf_spectrum", {
    showIf: {
      any: [
        { q: "q1_1_roles", op: "includes", value: "launch_operator" },
        { q: "q3_1_orbital_regimes", op: "unsure" },
      ],
    },
  }),
];

describe("affectedQuestions", () => {
  it("includes the changed question itself plus its direct showIf dependents", () => {
    expect(affectedQuestions(GRAPH, ["q3_1_orbital_regimes"])).toEqual([
      "q3_1_orbital_regimes",
      "q9_1_rf_spectrum",
    ]);
  });

  it("walks dependents TRANSITIVELY (q1_1 → q2_1 → q2_2) and through any/not nesting", () => {
    expect(affectedQuestions(GRAPH, ["q1_1_roles"])).toEqual([
      "q1_1_roles",
      "q2_1_spacecraft_count",
      "q2_2_constellation_detail", // via q2_1 (all[answered]) — transitive
      "q9_1_rf_spectrum", // via any[]
    ]);
  });

  it("walks a `not`-wrapped reference (defense gate dependents)", () => {
    expect(affectedQuestions(GRAPH, ["q1_9_defense_exclusivity"])).toEqual([
      "q1_9_defense_exclusivity",
      "q2_2_constellation_detail",
    ]);
  });

  it("unrelated questions are NOT affected (exception-based — only affected sections re-run)", () => {
    const affected = affectedQuestions(GRAPH, ["q1_1_roles"]);
    expect(affected).not.toContain("q3_1_orbital_regimes");
    expect(affected).not.toContain("q1_9_defense_exclusivity");
  });

  it("returns [] for no changes and ignores ids the graph does not know", () => {
    expect(affectedQuestions(GRAPH, [])).toEqual([]);
    // An unknown id influences nothing here and never appears in the output.
    expect(affectedQuestions(GRAPH, ["q99_9_ghost"])).toEqual([]);
  });

  it("output is in graph order regardless of input order", () => {
    expect(
      affectedQuestions(GRAPH, ["q3_1_orbital_regimes", "q1_1_roles"]),
    ).toEqual([
      "q1_1_roles",
      "q2_1_spacecraft_count",
      "q2_2_constellation_detail",
      "q3_1_orbital_regimes",
      "q9_1_rf_spectrum",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isVerdictStale — rulebook bump flags the profile for re-assessment
// ─────────────────────────────────────────────────────────────────────────────

describe("isVerdictStale", () => {
  it("a snapshot computed against the CURRENT rulebook is not stale", () => {
    expect(isVerdictStale(RULEBOOK.version)).toBe(false);
  });

  it("a snapshot computed against any other rulebook version is stale (rulebook bump)", () => {
    expect(isVerdictStale("0.9.0")).toBe(true);
    expect(isVerdictStale("")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatDeltaMessage — plan-pinned "N findings changed" + reason recorded
// ─────────────────────────────────────────────────────────────────────────────

describe("formatDeltaMessage", () => {
  it('matches the "N findings changed" format with per-bucket counts', () => {
    const msg = formatDeltaMessage(
      {
        added: [finding()],
        removed: [],
        changed: [{ before: finding(), after: finding() }],
      },
      "answer_change",
    );
    expect(msg).toMatch(/^2 findings changed/);
    expect(msg).toContain("1 added");
    expect(msg).toContain("0 removed");
    expect(msg).toContain("1 changed");
  });

  it("records the literal reason on the message (honesty: reason is recorded)", () => {
    expect(
      formatDeltaMessage(
        { added: [], removed: [], changed: [] },
        "rulebook_bump",
      ),
    ).toContain("reason: rulebook_bump");
    expect(
      formatDeltaMessage(
        { added: [], removed: [], changed: [] },
        "answer_change",
      ),
    ).toContain("reason: answer_change");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// reassessProfile — real pipeline, new snapshot, diff vs previous, notification
// ─────────────────────────────────────────────────────────────────────────────

const STORED_ANSWERS = {
  q1_1_roles: { state: "answered", value: ["spacecraft_operator"] },
  q1_9_defense_exclusivity: { state: "answered", value: "no" },
};

const PROFILE = {
  id: "profile_1",
  userId: "user_1",
  organizationId: "org_1",
  anonymousId: null,
  version: 4,
  tier: "FULL",
  status: "IN_PROGRESS",
  answers: STORED_ANSWERS,
  currentSection: null,
  changeTriggers: ["new_jurisdiction"],
  claimedAt: null,
  createdAt: new Date("2026-06-01T00:00:00Z"),
  updatedAt: new Date("2026-06-10T00:00:00Z"),
};

const PREV_RESULT = resultWith([finding({ verdict: "conditional" })], {
  rulebookVersion: "0.9.0",
});
const NEXT_RESULT = resultWith([finding({ verdict: "applicable" })]);

const PREV_SNAPSHOT = {
  id: "snap_prev",
  profileId: "profile_1",
  profileVersion: 3,
  tier: "FULL",
  rulebookVersion: "0.9.0",
  result: PREV_RESULT,
  unknownsCount: 0,
  createdAt: new Date("2026-06-05T00:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  profileFindUniqueMock.mockReset().mockResolvedValue(PROFILE);
  snapshotFindFirstMock.mockReset().mockResolvedValue(PREV_SNAPSHOT);
  snapshotCreateMock.mockReset().mockResolvedValue({ id: "snap_new" });
  notificationCreateMock.mockReset().mockResolvedValue({ id: "notif_1" });
  runPipelineMock.mockReset().mockResolvedValue(NEXT_RESULT);
  loggerWarnMock.mockReset();
});

describe("reassessProfile", () => {
  it("runs the REAL pipeline import against the STORED answers at the profile's tier", async () => {
    await reassessProfile("profile_1", "answer_change");
    expect(runPipelineMock).toHaveBeenCalledTimes(1);
    expect(runPipelineMock).toHaveBeenCalledWith({
      answers: STORED_ANSWERS,
      tier: "full",
    });
  });

  it("maps a QUICK-tier profile to the quick pipeline tier and a QUICK snapshot", async () => {
    profileFindUniqueMock.mockResolvedValue({ ...PROFILE, tier: "QUICK" });
    await reassessProfile("profile_1", "answer_change");
    expect(runPipelineMock).toHaveBeenCalledWith({
      answers: STORED_ANSWERS,
      tier: "quick",
    });
    const arg = snapshotCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.tier).toBe("QUICK");
  });

  it("writes a NEW AssessmentVerdictSnapshot in the calculate-route shape with the pipeline result VERBATIM (no merging)", async () => {
    await reassessProfile("profile_1", "answer_change");
    expect(snapshotCreateMock).toHaveBeenCalledTimes(1);
    const arg = snapshotCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.profileId).toBe("profile_1");
    expect(arg.data.profileVersion).toBe(4);
    expect(arg.data.tier).toBe("FULL");
    expect(arg.data.rulebookVersion).toBe(NEXT_RESULT.rulebookVersion);
    expect(arg.data.unknownsCount).toBe(0);
    // The snapshot IS the verdict — the pipeline result, never merged with prev.
    expect(arg.data.result).toEqual(NEXT_RESULT);
  });

  it("returns the new snapshot id and the diff vs the PREVIOUS LATEST snapshot", async () => {
    const { snapshotId, delta } = await reassessProfile(
      "profile_1",
      "answer_change",
    );
    expect(snapshotId).toBe("snap_new");
    // conditional → applicable on the same key = exactly one changed pair.
    expect(delta.changed).toHaveLength(1);
    expect(delta.changed[0].before.verdict).toBe("conditional");
    expect(delta.changed[0].after.verdict).toBe("applicable");
    expect(delta.added).toEqual([]);
    expect(delta.removed).toEqual([]);
    // previous latest = newest snapshot for this profile
    const findArg = snapshotFindFirstMock.mock.calls[0][0] as {
      where: { profileId: string };
      orderBy: { createdAt: string };
    };
    expect(findArg.where.profileId).toBe("profile_1");
    expect(findArg.orderBy).toEqual({ createdAt: "desc" });
  });

  it("with NO previous snapshot every finding is added — nothing fabricated as changed/removed", async () => {
    snapshotFindFirstMock.mockResolvedValue(null);
    const { delta } = await reassessProfile("profile_1", "answer_change");
    expect(delta.removed).toEqual([]);
    expect(delta.changed).toEqual([]);
    expect(delta.added).toEqual(collectFindings(NEXT_RESULT));
  });

  it('notifies through the EXISTING Notification model: "N findings changed", reason recorded', async () => {
    await reassessProfile("profile_1", "rulebook_bump");
    expect(notificationCreateMock).toHaveBeenCalledTimes(1);
    const arg = notificationCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.userId).toBe("user_1");
    expect(arg.data.organizationId).toBe("org_1");
    expect(arg.data.type).toBe("COMPLIANCE_UPDATED");
    expect(arg.data.entityType).toBe("assessment-profile");
    expect(arg.data.entityId).toBe("profile_1");
    expect(arg.data.message).toMatch(/^1 findings changed/);
    expect(arg.data.message).toContain("reason: rulebook_bump");
  });

  it("writes NO notification when nothing changed (no fabricated alerts)", async () => {
    runPipelineMock.mockResolvedValue(PREV_RESULT); // identical to the previous snapshot
    const { delta } = await reassessProfile("profile_1", "answer_change");
    expect(delta.added).toEqual([]);
    expect(delta.removed).toEqual([]);
    expect(delta.changed).toEqual([]);
    expect(notificationCreateMock).not.toHaveBeenCalled();
  });

  it("writes NO notification for an anonymous (unclaimed) profile — there is no user to notify", async () => {
    profileFindUniqueMock.mockResolvedValue({
      ...PROFILE,
      userId: null,
      anonymousId: "anon_abc",
    });
    await reassessProfile("profile_1", "rulebook_bump");
    expect(snapshotCreateMock).toHaveBeenCalledTimes(1); // the verdict still lands
    expect(notificationCreateMock).not.toHaveBeenCalled();
  });

  it("a notification write failure is logged and does NOT fail the re-assessment (the verdict is already persisted)", async () => {
    notificationCreateMock.mockRejectedValue(new Error("notif db down"));
    const { snapshotId } = await reassessProfile("profile_1", "answer_change");
    expect(snapshotId).toBe("snap_new");
    expect(loggerWarnMock).toHaveBeenCalledTimes(1);
  });

  it("propagates pipeline validation errors and writes NO snapshot (never a verdict)", async () => {
    runPipelineMock.mockRejectedValue(
      new Error("assessment submission invalid"),
    );
    await expect(reassessProfile("profile_1", "answer_change")).rejects.toThrow(
      "assessment submission invalid",
    );
    expect(snapshotCreateMock).not.toHaveBeenCalled();
    expect(notificationCreateMock).not.toHaveBeenCalled();
  });

  it("throws for an unknown profile and touches nothing else", async () => {
    profileFindUniqueMock.mockResolvedValue(null);
    await expect(reassessProfile("missing", "answer_change")).rejects.toThrow(
      /profile not found/,
    );
    expect(runPipelineMock).not.toHaveBeenCalled();
    expect(snapshotCreateMock).not.toHaveBeenCalled();
  });
});
