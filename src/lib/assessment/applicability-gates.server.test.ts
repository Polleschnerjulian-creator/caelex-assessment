/**
 * Tests for the server-enforced applicability gates (Task 1.8).
 *
 * Codifies the plan's gate test list:
 *  - defense `exclusively_defense` → hard out-of-scope citing Art 2(3), DETERMINED
 *  - `dual_use` → in scope + noted finding
 *  - defense `unsure` → in scope presumed + clarification entry (rounds UP)
 *  - launch-timing `all_before` → SOFT out-of-scope-likely, PROBABLE,
 *    fluxFlag with the three contested date positions + edge-case caveat
 *  - `some_or_all_after` / unsure → in scope
 *  - non-EU + EU-nexus `no` → honest cited out-of-scope
 *  - nexus `unsure` → in-scope-presumed with verify flag
 */

import { describe, it, expect, vi } from "vitest";
import type { AnswerMap, TriStateAnswer } from "@/lib/assessment/answers";

// ─── Mock server-only so the module can be imported in Vitest ───
vi.mock("server-only", () => ({}));

const { evaluateApplicabilityGates } =
  await import("@/lib/assessment/applicability-gates.server");

const RB = "1.0.0";

const answered = (value: string): TriStateAnswer => ({
  state: "answered",
  value,
});
const unsure = (): TriStateAnswer => ({ state: "unsure" });

/** A civil, EU-established, post-application-date operator — fully in scope. */
function baseAnswers(overrides: AnswerMap = {}): AnswerMap {
  return {
    q1_9_defense_exclusivity: answered("no"),
    q1_2_establishment: answered("eu"),
    q3_6_launch_timing: answered("some_or_all_after"),
    ...overrides,
  };
}

describe("evaluateApplicabilityGates — defence gate (Art 2(3))", () => {
  it("exclusively_defense → HARD out_of_scope, DETERMINED, citing Art. 2(3)", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({
        q1_9_defense_exclusivity: answered("exclusively_defense"),
      }),
      RB,
    );
    expect(outcome.kind).toBe("out_of_scope");
    if (outcome.kind !== "out_of_scope") throw new Error("unreachable");
    expect(outcome.finding.confidence).toBe("DETERMINED");
    expect(outcome.finding.verdict).toBe("not_applicable");
    expect(
      outcome.finding.sources.some((s) => s.citation.includes("Art. 2(3)")),
    ).toBe(true);
    expect(outcome.finding.rulebookVersion).toBe(RB);
    expect(
      outcome.finding.whyTrace.some(
        (t) => t.questionId === "q1_9_defense_exclusivity",
      ),
    ).toBe(true);
  });

  it("dual_use → in scope WITH a noted DETERMINED finding (never an exemption)", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({ q1_9_defense_exclusivity: answered("dual_use") }),
      RB,
    );
    expect(outcome.kind).toBe("in_scope");
    if (outcome.kind !== "in_scope") throw new Error("unreachable");
    const note = outcome.notes.find(
      (n) => n.value === "dual_use_in_scope_note",
    );
    expect(note).toBeDefined();
    expect(note?.confidence).toBe("DETERMINED");
    expect(note?.verdict).toBe("applicable");
    expect(note?.sources.some((s) => s.citation.includes("Art. 2(3)"))).toBe(
      true,
    );
  });

  it("unsure → in scope PRESUMED + clarification entry (rounds UP, never an exemption)", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({ q1_9_defense_exclusivity: unsure() }),
      RB,
    );
    expect(outcome.kind).toBe("in_scope");
    if (outcome.kind !== "in_scope") throw new Error("unreachable");
    const note = outcome.notes.find(
      (n) => n.value === "in_scope_presumed_defense_unclear",
    );
    expect(note).toBeDefined();
    expect(note?.confidence).toBe("INDETERMINATE");
    expect(
      note?.whyTrace.some(
        (t) =>
          t.questionId === "q1_9_defense_exclusivity" &&
          t.answerLabel === "I'm not sure",
      ),
    ).toBe(true);
  });

  it("civil 'no' → in scope without any defence note", () => {
    const outcome = evaluateApplicabilityGates(baseAnswers(), RB);
    expect(outcome.kind).toBe("in_scope");
    if (outcome.kind !== "in_scope") throw new Error("unreachable");
    expect(
      outcome.notes.filter((n) => String(n.value).includes("defense")),
    ).toHaveLength(0);
  });
});

describe("evaluateApplicabilityGates — EU-nexus gate (Art 2 scope)", () => {
  it("non-EU + nexus 'no' → honest cited HARD out_of_scope, DETERMINED", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({
        q1_2_establishment: answered("us"),
        q4_1_eu_nexus: answered("no"),
      }),
      RB,
    );
    expect(outcome.kind).toBe("out_of_scope");
    if (outcome.kind !== "out_of_scope") throw new Error("unreachable");
    expect(outcome.finding.confidence).toBe("DETERMINED");
    expect(outcome.finding.verdict).toBe("not_applicable");
    expect(
      outcome.finding.sources.some((s) => s.citation.includes("COM(2025) 335")),
    ).toBe(true);
    expect(
      outcome.finding.whyTrace.some((t) => t.questionId === "q4_1_eu_nexus"),
    ).toBe(true);
  });

  it("non-EU + nexus unsure → in-scope-PRESUMED with verify flag (§4 Q4.1)", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({
        q1_2_establishment: answered("us"),
        q4_1_eu_nexus: unsure(),
      }),
      RB,
    );
    expect(outcome.kind).toBe("in_scope");
    if (outcome.kind !== "in_scope") throw new Error("unreachable");
    const note = outcome.notes.find(
      (n) => n.value === "in_scope_presumed_eu_nexus_unclear",
    );
    expect(note).toBeDefined();
    expect(note?.confidence).toBe("INDETERMINATE");
    expect(note?.wherefore.toLowerCase()).toContain("verify");
  });

  it("non-EU + nexus 'yes' → in scope without a nexus note", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({
        q1_2_establishment: answered("us"),
        q4_1_eu_nexus: answered("yes"),
      }),
      RB,
    );
    expect(outcome.kind).toBe("in_scope");
    if (outcome.kind !== "in_scope") throw new Error("unreachable");
    expect(
      outcome.notes.find((n) => String(n.value).includes("eu_nexus")),
    ).toBeUndefined();
  });

  it("establishment unsure → in scope presumed + clarification (never out-of-scope)", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({
        q1_2_establishment: unsure(),
        // even with a 'no' nexus answer, an unsure establishment must round UP
        q4_1_eu_nexus: answered("no"),
      }),
      RB,
    );
    expect(outcome.kind).toBe("in_scope");
    if (outcome.kind !== "in_scope") throw new Error("unreachable");
    expect(
      outcome.notes.find(
        (n) => n.value === "in_scope_presumed_establishment_unclear",
      ),
    ).toBeDefined();
  });
});

describe("evaluateApplicabilityGates — launch-timing gate (SOFT, §7.1 #7)", () => {
  it("all_before → out_of_scope_LIKELY (soft), PROBABLE, with fluxFlag carrying the three date positions", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({ q3_6_launch_timing: answered("all_before") }),
      RB,
    );
    expect(outcome.kind).toBe("out_of_scope_likely");
    if (outcome.kind !== "out_of_scope_likely") throw new Error("unreachable");
    expect(outcome.finding.confidence).toBe("PROBABLE");
    expect(outcome.finding.fluxFlag).toBeDefined();
    expect(outcome.finding.fluxFlag?.positions).toHaveLength(3);
    expect(outcome.finding.fluxFlag?.summary).toContain("contested");
    // edge-case caveat (§7.1: replenishment / lifetime-extension / transfer unverified)
    expect(outcome.finding.why.toLowerCase()).toContain("replenishment");
    // it is NEVER the hard variant
    expect(outcome.kind).not.toBe("out_of_scope");
  });

  it("the three flux positions name the contested application-date scenarios", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({ q3_6_launch_timing: answered("all_before") }),
      RB,
    );
    if (outcome.kind !== "out_of_scope_likely") throw new Error("unreachable");
    const positions = outcome.finding.fluxFlag?.positions ?? [];
    expect(positions.some((p) => p.position.includes("2030"))).toBe(true);
    expect(positions.some((p) => p.position.includes("2032"))).toBe(true);
    expect(positions.some((p) => p.position.includes("36 months"))).toBe(true);
  });

  it("some_or_all_after → in scope", () => {
    const outcome = evaluateApplicabilityGates(baseAnswers(), RB);
    expect(outcome.kind).toBe("in_scope");
  });

  it("unsure → in scope (rounds UP) with a clarification note", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({ q3_6_launch_timing: unsure() }),
      RB,
    );
    expect(outcome.kind).toBe("in_scope");
    if (outcome.kind !== "in_scope") throw new Error("unreachable");
    expect(
      outcome.notes.find(
        (n) => n.value === "in_scope_presumed_launch_timing_unclear",
      ),
    ).toBeDefined();
  });
});

describe("evaluateApplicabilityGates — cross-cutting honesty invariants", () => {
  it("every finding and note carries the rulebook version", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({
        q1_9_defense_exclusivity: answered("dual_use"),
        q3_6_launch_timing: unsure(),
      }),
      "9.9.9",
    );
    if (outcome.kind !== "in_scope") throw new Error("unreachable");
    expect(outcome.notes.length).toBeGreaterThan(0);
    for (const note of outcome.notes) {
      expect(note.rulebookVersion).toBe("9.9.9");
    }
  });

  it("hard gates take precedence over the soft timing gate", () => {
    const outcome = evaluateApplicabilityGates(
      baseAnswers({
        q1_9_defense_exclusivity: answered("exclusively_defense"),
        q3_6_launch_timing: answered("all_before"),
      }),
      RB,
    );
    expect(outcome.kind).toBe("out_of_scope"); // defence hard out, not the soft timing
  });

  it("monotonicity: flipping any single answer to unsure never produces out_of_scope", () => {
    const inScope = baseAnswers();
    for (const id of Object.keys(inScope)) {
      const flipped = { ...inScope, [id]: unsure() };
      const outcome = evaluateApplicabilityGates(flipped, RB);
      expect(outcome.kind).toBe("in_scope");
    }
  });

  it("every emitted finding cites at least one source (invariant 5)", () => {
    const outcomes = [
      evaluateApplicabilityGates(
        baseAnswers({
          q1_9_defense_exclusivity: answered("exclusively_defense"),
        }),
        RB,
      ),
      evaluateApplicabilityGates(
        baseAnswers({ q3_6_launch_timing: answered("all_before") }),
        RB,
      ),
      evaluateApplicabilityGates(
        baseAnswers({
          q1_2_establishment: answered("us"),
          q4_1_eu_nexus: answered("no"),
        }),
        RB,
      ),
    ];
    for (const outcome of outcomes) {
      if (outcome.kind === "in_scope") continue;
      expect(outcome.finding.sources.length).toBeGreaterThan(0);
      for (const s of outcome.finding.sources) {
        expect(s.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
