// src/lib/assessment/graph-evaluator.test.ts
//
// The bypass suite (Task 1.4) — these tests are the codified honesty
// invariants for the branch evaluator:
//   - invariant 1: tri-state answers, unsure is first-class
//   - invariant 2: unknown rounds up (unsure never matches value ops)
//   - invariant 3: server-enforced gates (no answer smuggling, no empty-payload pass)

import { describe, it, expect } from "vitest";

import type { AnswerMap } from "@/lib/assessment/answers";
import type {
  Condition,
  QuestionNode,
} from "@/data/assessment/question-graph-types";
import {
  evaluateCondition,
  visibleQuestions,
  countScreens,
  validateSubmission,
  detectContradictions,
} from "@/lib/assessment/graph-evaluator";

const SRC: QuestionNode["citation"][number] = {
  label: "Test source",
  citation: "TEST Art. 1",
  asOf: "2025-01-01",
  verified: true,
};

function node(
  partial: Partial<QuestionNode> & Pick<QuestionNode, "id">,
): QuestionNode {
  return {
    section: "identity_role",
    tier: "both",
    kind: "single",
    title: `Title for ${partial.id}`,
    why: "test why",
    citation: [SRC],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    ...partial,
  };
}

// Synthetic test graph:
//  qa          — always visible, both tiers
//  qb          — visible only when qa === "yes"
//  qc          — full tier only
//  qg1, qg2    — share screenGroup "q1_5_size" (always visible)
//  qd          — multi with a quick single-select variant, always visible
const qa = node({ id: "qa" });
const qb = node({ id: "qb", showIf: { q: "qa", op: "eq", value: "yes" } });
const qc = node({ id: "qc", tier: "full" });
const qg1 = node({
  id: "qg1",
  kind: "bands",
  screenGroup: "q1_5_size",
  options: [
    { value: "b1", label: "Band 1" },
    { value: "b2", label: "Band 2" },
  ],
});
const qg2 = node({
  id: "qg2",
  kind: "bands",
  screenGroup: "q1_5_size",
  options: [
    { value: "b1", label: "Band 1" },
    { value: "b2", label: "Band 2" },
  ],
});
const qd = node({
  id: "qd",
  kind: "multi",
  options: [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
    { value: "gamma", label: "Gamma" },
  ],
  quickVariant: {
    kind: "single",
    options: [
      { value: "alpha", label: "Alpha" },
      { value: "coarse_other", label: "Something else" },
    ],
  },
});

const GRAPH: readonly QuestionNode[] = [qa, qb, qc, qg1, qg2, qd];

/** A fully valid quick-tier answer set for GRAPH with qa = "no" (qb hidden). */
function validQuickAnswers(): AnswerMap {
  return {
    qa: { state: "answered", value: "no" },
    qb: { state: "not_asked" },
    qg1: { state: "answered", value: "b1" },
    qg2: { state: "answered", value: "b2" },
    qd: { state: "answered", value: "alpha" },
  };
}

describe("evaluateCondition — value ops match answered values only", () => {
  it("eq matches an answered value and nothing else", () => {
    const cond = { q: "qa", op: "eq", value: "yes" } as const;
    expect(
      evaluateCondition(cond, { qa: { state: "answered", value: "yes" } }),
    ).toBe(true);
    expect(
      evaluateCondition(cond, { qa: { state: "answered", value: "no" } }),
    ).toBe(false);
    expect(evaluateCondition(cond, { qa: { state: "unsure" } })).toBe(false);
    expect(evaluateCondition(cond, { qa: { state: "not_asked" } })).toBe(false);
    expect(evaluateCondition(cond, {})).toBe(false);
  });

  it("eq never matches an array answer (use includes)", () => {
    expect(
      evaluateCondition(
        { q: "qd", op: "eq", value: "alpha" },
        { qd: { state: "answered", value: ["alpha"] } },
      ),
    ).toBe(false);
  });

  it("neq matches answered values only — unsure/not_asked/missing never satisfy neq", () => {
    const cond = { q: "q1_2_establishment", op: "neq", value: "eu" } as const;
    expect(
      evaluateCondition(cond, {
        q1_2_establishment: { state: "answered", value: "us" },
      }),
    ).toBe(true);
    expect(
      evaluateCondition(cond, {
        q1_2_establishment: { state: "answered", value: "eu" },
      }),
    ).toBe(false);
    // BINDING (Task 1.3 convention): an unsure answer is NOT "an answered value ≠ eu".
    expect(
      evaluateCondition(cond, { q1_2_establishment: { state: "unsure" } }),
    ).toBe(false);
    expect(
      evaluateCondition(cond, { q1_2_establishment: { state: "not_asked" } }),
    ).toBe(false);
    expect(evaluateCondition(cond, {})).toBe(false);
  });

  it("in matches a scalar answered value against the list", () => {
    const cond = {
      q: "q1_5_headcount",
      op: "in",
      value: ["h_50_249", "h_250_plus"],
    } as const;
    expect(
      evaluateCondition(cond, {
        q1_5_headcount: { state: "answered", value: "h_250_plus" },
      }),
    ).toBe(true);
    expect(
      evaluateCondition(cond, {
        q1_5_headcount: { state: "answered", value: "h_1_9" },
      }),
    ).toBe(false);
    expect(
      evaluateCondition(cond, { q1_5_headcount: { state: "unsure" } }),
    ).toBe(false);
  });

  it("includes matches array membership, and scalar equality for coarse quick variants", () => {
    const cond = {
      q: "q1_1_roles",
      op: "includes",
      value: "spacecraft_operator",
    } as const;
    expect(
      evaluateCondition(cond, {
        q1_1_roles: {
          state: "answered",
          value: ["launch_operator", "spacecraft_operator"],
        },
      }),
    ).toBe(true);
    expect(
      evaluateCondition(cond, {
        q1_1_roles: { state: "answered", value: ["launch_operator"] },
      }),
    ).toBe(false);
    // coarse single-select answer still satisfies includes
    expect(
      evaluateCondition(cond, {
        q1_1_roles: { state: "answered", value: "spacecraft_operator" },
      }),
    ).toBe(true);
    expect(evaluateCondition(cond, { q1_1_roles: { state: "unsure" } })).toBe(
      false,
    );
  });

  it("gte compares numbers only", () => {
    const cond = { q: "qn", op: "gte", value: 10 } as const;
    expect(
      evaluateCondition(cond, { qn: { state: "answered", value: 10 } }),
    ).toBe(true);
    expect(
      evaluateCondition(cond, { qn: { state: "answered", value: 11 } }),
    ).toBe(true);
    expect(
      evaluateCondition(cond, { qn: { state: "answered", value: 9 } }),
    ).toBe(false);
    expect(
      evaluateCondition(cond, { qn: { state: "answered", value: "10" } }),
    ).toBe(false);
    expect(evaluateCondition(cond, { qn: { state: "unsure" } })).toBe(false);
  });

  it("answered matches exactly the answered state", () => {
    const cond = { q: "qa", op: "answered" } as const;
    expect(
      evaluateCondition(cond, { qa: { state: "answered", value: "no" } }),
    ).toBe(true);
    expect(evaluateCondition(cond, { qa: { state: "unsure" } })).toBe(false);
    expect(evaluateCondition(cond, { qa: { state: "not_asked" } })).toBe(false);
    expect(evaluateCondition(cond, {})).toBe(false);
  });

  it("unsure matches exactly the unsure state and nothing else (binding convention)", () => {
    const cond = { q: "qa", op: "unsure" } as const;
    expect(evaluateCondition(cond, { qa: { state: "unsure" } })).toBe(true);
    expect(
      evaluateCondition(cond, { qa: { state: "answered", value: "yes" } }),
    ).toBe(false);
    // an answered value that LOOKS like unsure is still an answered value —
    // it never matches op:"unsure" (and the dataset integrity tests forbid it).
    expect(
      evaluateCondition(cond, { qa: { state: "answered", value: "unsure" } }),
    ).toBe(false);
    expect(evaluateCondition(cond, { qa: { state: "not_asked" } })).toBe(false);
    expect(evaluateCondition(cond, {})).toBe(false);
  });
});

describe("evaluateCondition — all/any/not composition", () => {
  const answers: AnswerMap = {
    q1_2_establishment: { state: "answered", value: "us" },
    q4_1_eu_nexus: { state: "unsure" },
  };

  it("composes all + any + value ops + unsure (the Q4.2 showIf shape)", () => {
    // showIf of Q4.2 from the plan: non-EU establishment AND (nexus yes OR nexus unsure)
    const cond: Condition = {
      all: [
        { q: "q1_2_establishment", op: "neq", value: "eu" },
        {
          any: [
            { q: "q4_1_eu_nexus", op: "eq", value: "yes" },
            { q: "q4_1_eu_nexus", op: "unsure" },
          ],
        },
      ],
    };
    expect(evaluateCondition(cond, answers)).toBe(true);
    expect(
      evaluateCondition(cond, {
        ...answers,
        q4_1_eu_nexus: { state: "answered", value: "no" },
      }),
    ).toBe(false);
    expect(
      evaluateCondition(cond, {
        ...answers,
        q1_2_establishment: { state: "answered", value: "eu" },
      }),
    ).toBe(false);
  });

  it("not negates", () => {
    expect(
      evaluateCondition(
        { not: { q: "qa", op: "eq", value: "yes" } },
        { qa: { state: "answered", value: "no" } },
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { not: { q: "qa", op: "eq", value: "yes" } },
        { qa: { state: "answered", value: "yes" } },
      ),
    ).toBe(false);
  });

  it("all:[] is vacuously true; any:[] is false", () => {
    expect(evaluateCondition({ all: [] }, {})).toBe(true);
    expect(evaluateCondition({ any: [] }, {})).toBe(false);
  });
});

describe("visibleQuestions — tier + showIf", () => {
  it("filters by tier: full-only questions are not visible in quick", () => {
    const visible = visibleQuestions(GRAPH, "quick", validQuickAnswers());
    expect(visible.map((n) => n.id)).not.toContain("qc");
    expect(
      visibleQuestions(GRAPH, "full", validQuickAnswers()).map((n) => n.id),
    ).toContain("qc");
  });

  it("hides showIf branches until their condition holds, preserving graph order", () => {
    expect(visibleQuestions(GRAPH, "quick", {}).map((n) => n.id)).toEqual([
      "qa",
      "qg1",
      "qg2",
      "qd",
    ]);
    expect(
      visibleQuestions(GRAPH, "quick", {
        qa: { state: "answered", value: "yes" },
      }).map((n) => n.id),
    ).toEqual(["qa", "qb", "qg1", "qg2", "qd"]);
  });

  it("an unsure answer does not open an eq-gated branch (unknown rounds up via gates, not branches)", () => {
    expect(
      visibleQuestions(GRAPH, "quick", { qa: { state: "unsure" } }).map(
        (n) => n.id,
      ),
    ).not.toContain("qb");
  });
});

describe("countScreens — screens, not nodes", () => {
  it("nodes sharing a screenGroup count as ONE screen", () => {
    // Plan-named case: a.screenGroup === b.screenGroup === "q1_5_size", c ungrouped → 2
    expect(countScreens([qg1, qg2, qa])).toBe(2);
  });

  it("counts each distinct group once and each ungrouped node individually", () => {
    expect(countScreens([])).toBe(0);
    expect(countScreens([qa, qd])).toBe(2);
    expect(countScreens([qg1, qg2])).toBe(1);
    expect(countScreens(GRAPH)).toBe(5); // qa, qb, qc, [qg1+qg2], qd
  });
});

describe("validateSubmission — server-enforced gates (the bypass suite)", () => {
  it("empty payload → errors for EVERY always-visible question; never a pass", () => {
    const errors = validateSubmission(GRAPH, "quick", {});
    expect(errors.length).toBeGreaterThan(0);
    const missingIds = errors
      .filter((e) => e.code === "missing")
      .map((e) => e.questionId);
    // every always-visible quick question is named
    expect(missingIds).toEqual(
      expect.arrayContaining(["qa", "qg1", "qg2", "qd"]),
    );
    // each error names the question for the 422 body
    for (const e of errors) {
      expect(e.message).toContain(e.questionId);
    }
  });

  it("a fully valid submission passes", () => {
    expect(validateSubmission(GRAPH, "quick", validQuickAnswers())).toEqual([]);
  });

  it("a question hidden by showIf answered as not_asked is valid", () => {
    const answers = validQuickAnswers(); // qa = "no" → qb hidden, recorded not_asked
    expect(validateSubmission(GRAPH, "quick", answers)).toEqual([]);
  });

  it("a hidden question answered WITH A VALUE → unexpected_answer (no smuggling past branches)", () => {
    const answers: AnswerMap = {
      ...validQuickAnswers(),
      qb: { state: "answered", value: "yes" }, // qa = "no" → qb is hidden
    };
    const errors = validateSubmission(GRAPH, "quick", answers);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      questionId: "qb",
      code: "unexpected_answer",
    });
  });

  it("an answered value for an other-tier question → unexpected_answer", () => {
    const answers: AnswerMap = {
      ...validQuickAnswers(),
      qc: { state: "answered", value: "yes" }, // full-only, quick submission
    };
    const errors = validateSubmission(GRAPH, "quick", answers);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      questionId: "qc",
      code: "unexpected_answer",
    });
  });

  it("an answered value for an unknown question id → unexpected_answer", () => {
    const answers: AnswerMap = {
      ...validQuickAnswers(),
      q_does_not_exist: { state: "answered", value: "yes" },
    };
    const errors = validateSubmission(GRAPH, "quick", answers);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      questionId: "q_does_not_exist",
      code: "unexpected_answer",
    });
  });

  it("a visible required question missing → named error", () => {
    const answers = validQuickAnswers();
    delete answers.qg1;
    const errors = validateSubmission(GRAPH, "quick", answers);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ questionId: "qg1", code: "missing" });
    expect(errors[0].message).toContain("qg1");
    expect(errors[0].message).toContain(qg1.title);
  });

  it("not_asked on a VISIBLE question counts as missing", () => {
    const answers: AnswerMap = {
      ...validQuickAnswers(),
      qa: { state: "not_asked" },
    };
    const errors = validateSubmission(GRAPH, "quick", answers);
    expect(
      errors.some((e) => e.questionId === "qa" && e.code === "missing"),
    ).toBe(true);
  });

  it("unsure satisfies requiredness (it IS an answer)", () => {
    const answers: AnswerMap = {
      ...validQuickAnswers(),
      qa: { state: "unsure" }, // qb stays hidden (unsure opens no eq branch)
    };
    expect(validateSubmission(GRAPH, "quick", answers)).toEqual([]);
  });

  it("an answered value outside the options → invalid_option", () => {
    const answers: AnswerMap = {
      ...validQuickAnswers(),
      qa: { state: "answered", value: "maybe" },
    };
    const errors = validateSubmission(GRAPH, "quick", answers);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      questionId: "qa",
      code: "invalid_option",
    });
  });

  it('a smuggled {state:"answered", value:"unsure"} fails option membership (binding convention)', () => {
    const answers: AnswerMap = {
      ...validQuickAnswers(),
      qa: { state: "answered", value: "unsure" },
    };
    const errors = validateSubmission(GRAPH, "quick", answers);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      questionId: "qa",
      code: "invalid_option",
    });
  });

  it("quick tier validates against the coarse quickVariant options", () => {
    // qd is multi in full, single coarse in quick
    const quickAnswers: AnswerMap = {
      ...validQuickAnswers(),
      qd: { state: "answered", value: "coarse_other" },
    };
    expect(validateSubmission(GRAPH, "quick", quickAnswers)).toEqual([]);

    // an array answer is invalid against the quick single-select rendering
    const arrayInQuick: AnswerMap = {
      ...validQuickAnswers(),
      qd: { state: "answered", value: ["alpha"] },
    };
    expect(
      validateSubmission(GRAPH, "quick", arrayInQuick).some(
        (e) => e.questionId === "qd" && e.code === "invalid_option",
      ),
    ).toBe(true);
  });

  it("full tier validates against the base multi options", () => {
    const fullAnswers: AnswerMap = {
      qa: { state: "answered", value: "no" },
      qb: { state: "not_asked" },
      qc: { state: "answered", value: "yes" },
      qg1: { state: "answered", value: "b1" },
      qg2: { state: "answered", value: "b2" },
      qd: { state: "answered", value: ["alpha", "beta"] },
    };
    expect(validateSubmission(GRAPH, "full", fullAnswers)).toEqual([]);

    // the coarse quick-only option is not a full-tier option
    const coarseInFull: AnswerMap = {
      ...fullAnswers,
      qd: { state: "answered", value: ["coarse_other"] },
    };
    expect(
      validateSubmission(GRAPH, "full", coarseInFull).some(
        (e) => e.questionId === "qd" && e.code === "invalid_option",
      ),
    ).toBe(true);
  });
});

describe("detectContradictions — named pairs, never silent acceptance", () => {
  it("third-country + EU-nexus 'no' + later EU member-state service answers → the named pair", () => {
    const answers: AnswerMap = {
      q1_2_establishment: { state: "answered", value: "us" },
      q4_1_eu_nexus: { state: "answered", value: "no" },
      q6_4_ms_transpositions: { state: "answered", value: ["de", "fr"] },
    };
    const contradictions = detectContradictions(answers);
    expect(contradictions).toHaveLength(1);
    expect(contradictions[0].questionIds).toEqual([
      "q4_1_eu_nexus",
      "q6_4_ms_transpositions",
    ]);
    expect(contradictions[0].message.length).toBeGreaterThan(0);
  });

  it("EU-nexus 'no' + EU-located ground-segment countries → the named pair", () => {
    const answers: AnswerMap = {
      q1_2_establishment: { state: "answered", value: "us" },
      q4_1_eu_nexus: { state: "answered", value: "no" },
      q4_3b_ground_countries: { state: "answered", value: ["us", "de"] },
    };
    const contradictions = detectContradictions(answers);
    expect(contradictions).toHaveLength(1);
    expect(contradictions[0].questionIds).toEqual([
      "q4_1_eu_nexus",
      "q4_3b_ground_countries",
    ]);
  });

  it("no contradiction when EU nexus is affirmed, unsure, or the EU-service answers are empty/non-EU", () => {
    expect(
      detectContradictions({
        q4_1_eu_nexus: { state: "answered", value: "yes" },
        q6_4_ms_transpositions: { state: "answered", value: ["de"] },
      }),
    ).toEqual([]);
    // unsure rounds up via the gates — it is not a contradiction
    expect(
      detectContradictions({
        q4_1_eu_nexus: { state: "unsure" },
        q6_4_ms_transpositions: { state: "answered", value: ["de"] },
      }),
    ).toEqual([]);
    expect(
      detectContradictions({
        q4_1_eu_nexus: { state: "answered", value: "no" },
        q6_4_ms_transpositions: { state: "answered", value: [] },
      }),
    ).toEqual([]);
    expect(
      detectContradictions({
        q4_1_eu_nexus: { state: "answered", value: "no" },
        q4_3b_ground_countries: { state: "answered", value: ["us", "uk"] },
      }),
    ).toEqual([]);
    expect(detectContradictions({})).toEqual([]);
  });

  it("both EU-service signals present → both named pairs returned", () => {
    const answers: AnswerMap = {
      q4_1_eu_nexus: { state: "answered", value: "no" },
      q6_4_ms_transpositions: { state: "answered", value: ["nl"] },
      q4_3b_ground_countries: { state: "answered", value: ["se"] },
    };
    const contradictions = detectContradictions(answers);
    expect(contradictions).toHaveLength(2);
    expect(contradictions.map((c) => c.questionIds[1]).sort()).toEqual([
      "q4_3b_ground_countries",
      "q6_4_ms_transpositions",
    ]);
  });
});
