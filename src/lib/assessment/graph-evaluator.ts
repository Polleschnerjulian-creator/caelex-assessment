// src/lib/assessment/graph-evaluator.ts
//
// PURE branch evaluator for the ultimate operator assessment question graph
// (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md, Task 1.4).
//
// Deliberately NOT `server-only`: the wizard uses it for display and the
// calculate routes use the SAME functions for enforcement — one source of
// truth for branching (honesty invariant 3: gates are server-enforced; an
// empty or partial payload is a validation error naming the missing
// questions — never a verdict).
//
// Imports are type-only by design: this module has zero runtime dependencies,
// so it cannot drift from (or break with) the answer-helper implementations.

import type { AnswerMap, TriStateAnswer } from "@/lib/assessment/answers";
import type {
  Condition,
  QuestionNode,
  QuestionOption,
} from "@/data/assessment/question-graph-types";

type AnsweredValue = Extract<TriStateAnswer, { state: "answered" }>["value"];

/** Local, dependency-free read of an answered value (undefined unless `{state:"answered"}`). */
function answeredValueOf(
  answers: AnswerMap,
  questionId: string,
): AnsweredValue | undefined {
  const a = answers[questionId];
  return a !== undefined && a.state === "answered" ? a.value : undefined;
}

/**
 * Evaluate a condition against an answer map.
 *
 * BINDING semantics (Task 1.3 unsure-encoding convention):
 * - Value ops (`eq`/`neq`/`in`/`includes`/`gte`) match ANSWERED values only.
 *   They evaluate FALSE against `{state:"unsure"}`, `{state:"not_asked"}` and
 *   missing answers. Uncertainty is matched exclusively via `{q, op:"unsure"}`.
 * - Shape mismatches are deterministic FALSE (e.g. `eq` against an array
 *   answer, `gte` against a non-number): use `includes` for multi answers.
 * - `includes` additionally accepts a scalar answered value equal to the
 *   condition value, so a coarse `quickVariant` single-select still satisfies
 *   conditions written against the full-tier multi-select.
 * - `{all: []}` is vacuously true; `{any: []}` is false.
 */
export function evaluateCondition(
  cond: Condition,
  answers: AnswerMap,
): boolean {
  if ("all" in cond) {
    return cond.all.every((c) => evaluateCondition(c, answers));
  }
  if ("any" in cond) {
    return cond.any.some((c) => evaluateCondition(c, answers));
  }
  if ("not" in cond) {
    return !evaluateCondition(cond.not, answers);
  }

  const answer = answers[cond.q];

  switch (cond.op) {
    case "answered":
      return answer !== undefined && answer.state === "answered";
    case "unsure":
      // Matches exactly the unsure STATE — never an answered value, never not_asked.
      return answer !== undefined && answer.state === "unsure";
    case "eq": {
      const value = answeredValueOf(answers, cond.q);
      if (value === undefined || Array.isArray(value)) return false;
      return value === cond.value;
    }
    case "neq": {
      // Also a value op: matches answered values only. An unsure or skipped
      // answer never satisfies `neq` (it is not "an answered value ≠ x").
      const value = answeredValueOf(answers, cond.q);
      if (value === undefined || Array.isArray(value)) return false;
      return value !== cond.value;
    }
    case "in": {
      const value = answeredValueOf(answers, cond.q);
      if (value === undefined || Array.isArray(value)) return false;
      return Array.isArray(cond.value) && cond.value.includes(value);
    }
    case "includes": {
      const value = answeredValueOf(answers, cond.q);
      if (value === undefined) return false;
      if (Array.isArray(value)) return value.includes(cond.value as string);
      // Coarse quickVariant single-select answering a multi-select question.
      return value === cond.value;
    }
    case "gte": {
      const value = answeredValueOf(answers, cond.q);
      return (
        typeof value === "number" &&
        typeof cond.value === "number" &&
        value >= cond.value
      );
    }
    default: {
      // Exhaustiveness guard — unknown ops never match (fail closed).
      const _exhaustive: never = cond;
      void _exhaustive;
      return false;
    }
  }
}

/**
 * The questions visible for a tier given the current answers, in graph order.
 * A node is visible when its tier matches (`both` or the requested tier) AND
 * its `showIf` (if any) evaluates true.
 */
export function visibleQuestions(
  graph: readonly QuestionNode[],
  tier: "quick" | "full",
  answers: AnswerMap,
): QuestionNode[] {
  return graph.filter(
    (node) =>
      (node.tier === "both" || node.tier === tier) &&
      (node.showIf === undefined || evaluateCondition(node.showIf, answers)),
  );
}

/**
 * Counts wizard SCREENS: nodes sharing a `screenGroup` collapse to one screen
 * (e.g. `q1_5_headcount` + `q1_5_turnover` share `"q1_5_size"` and count as
 * one). Nodes without a group count individually. Used by the quick-tier
 * arithmetic tests (Task 1.6) — screens, not nodes.
 */
export function countScreens(nodes: readonly QuestionNode[]): number {
  const seenGroups = new Set<string>();
  let screens = 0;
  for (const node of nodes) {
    if (node.screenGroup !== undefined) {
      if (!seenGroups.has(node.screenGroup)) {
        seenGroups.add(node.screenGroup);
        screens += 1;
      }
    } else {
      screens += 1;
    }
  }
  return screens;
}

export interface SubmissionError {
  questionId: string;
  code: "missing" | "unexpected_answer" | "invalid_option";
  message: string;
}

/** Effective rendering spec for a node in a tier (quick may use the coarse variant). */
function effectiveSpec(
  node: QuestionNode,
  tier: "quick" | "full",
): { kind: QuestionNode["kind"]; options?: QuestionOption[] } {
  if (tier === "quick" && node.quickVariant !== undefined) {
    return {
      kind: node.quickVariant.kind,
      options: node.quickVariant.options ?? node.options,
    };
  }
  return { kind: node.kind, options: node.options };
}

/**
 * Validate one answered value against the node's effective kind/options.
 * Returns an error message, or null when valid. Note that because no option
 * value may ever equal `"unsure"` (Task 1.3 convention), a smuggled
 * `{state:"answered", value:"unsure"}` fails option membership here.
 */
function validateAnsweredValue(
  node: QuestionNode,
  tier: "quick" | "full",
  value: AnsweredValue,
): string | null {
  const spec = effectiveSpec(node, tier);
  const optionValues =
    spec.options !== undefined && spec.options.length > 0
      ? new Set(spec.options.map((o) => o.value))
      : undefined;

  switch (spec.kind) {
    case "single":
    case "bands": {
      if (typeof value !== "string") {
        return `Question "${node.title}" (${node.id}) expects a single option value.`;
      }
      if (optionValues !== undefined && !optionValues.has(value)) {
        return `"${value}" is not a valid option for question "${node.title}" (${node.id}).`;
      }
      return null;
    }
    case "multi": {
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
        return `Question "${node.title}" (${node.id}) expects a list of option values.`;
      }
      if (optionValues !== undefined) {
        const invalid = value.find((v) => !optionValues.has(v));
        if (invalid !== undefined) {
          return `"${invalid}" is not a valid option for question "${node.title}" (${node.id}).`;
        }
      }
      return null;
    }
    case "boolean": {
      if (typeof value !== "boolean") {
        return `Question "${node.title}" (${node.id}) expects a boolean answer.`;
      }
      return null;
    }
    case "country_multi": {
      if (
        !Array.isArray(value) ||
        value.some((v) => typeof v !== "string" || v.length === 0)
      ) {
        return `Question "${node.title}" (${node.id}) expects a list of country codes.`;
      }
      return null;
    }
    case "text": {
      if (typeof value !== "string") {
        return `Question "${node.title}" (${node.id}) expects a text answer.`;
      }
      return null;
    }
    case "battery": {
      // Per-item status encoding is owned by the dataset/gateway lanes
      // (Task 1.6/1.7); the evaluator does not constrain its value shape.
      return null;
    }
    default: {
      const _exhaustive: never = spec.kind;
      void _exhaustive;
      return null;
    }
  }
}

/**
 * Server-enforceable submission validation (honesty invariant 3).
 *
 * - Every VISIBLE question must carry `{state:"answered"}` or `{state:"unsure"}`
 *   — unsure satisfies requiredness (it IS an answer). Missing or
 *   `{state:"not_asked"}` on a visible question → `missing`, naming the question.
 * - Answered values on questions NOT visible in this tier (hidden branch,
 *   other tier, or unknown id) → `unexpected_answer` — no smuggling answers
 *   past branches. `{state:"not_asked"}` (and `{state:"unsure"}`) on a hidden
 *   question is valid: neither carries a branch-bypassing value, and a stale
 *   unsure can only widen the unknowns list (unknown rounds UP, invariant 2).
 * - Answered values are checked against the node's effective options for the
 *   tier (`invalid_option`).
 */
export function validateSubmission(
  graph: readonly QuestionNode[],
  tier: "quick" | "full",
  answers: AnswerMap,
): SubmissionError[] {
  const errors: SubmissionError[] = [];
  const visible = visibleQuestions(graph, tier, answers);
  const visibleIds = new Set(visible.map((n) => n.id));
  const nodesById = new Map(graph.map((n) => [n.id, n]));

  for (const node of visible) {
    const answer = answers[node.id];
    if (answer === undefined || answer.state === "not_asked") {
      errors.push({
        questionId: node.id,
        code: "missing",
        message: `Missing answer for required question "${node.title}" (${node.id}).`,
      });
      continue;
    }
    if (answer.state === "answered") {
      const valueError = validateAnsweredValue(node, tier, answer.value);
      if (valueError !== null) {
        errors.push({
          questionId: node.id,
          code: "invalid_option",
          message: valueError,
        });
      }
    }
    // `{state:"unsure"}` satisfies requiredness — nothing to validate.
  }

  for (const [questionId, answer] of Object.entries(answers)) {
    if (answer.state !== "answered") continue;
    if (visibleIds.has(questionId)) continue;
    const node = nodesById.get(questionId);
    errors.push({
      questionId,
      code: "unexpected_answer",
      message:
        node !== undefined
          ? `Question "${node.title}" (${questionId}) is not asked for this submission (hidden branch or other tier) but carries an answered value.`
          : `Unknown question id "${questionId}" carries an answered value.`,
    });
  }

  return errors;
}

export interface Contradiction {
  questionIds: [string, string];
  message: string;
}

/** EU-27 member-state codes as used by `country_multi` values (lowercase; both Greece codes). */
const EU_MEMBER_STATE_CODES: ReadonlySet<string> = new Set([
  "at",
  "be",
  "bg",
  "hr",
  "cy",
  "cz",
  "dk",
  "ee",
  "fi",
  "fr",
  "de",
  "el",
  "gr",
  "hu",
  "ie",
  "it",
  "lv",
  "lt",
  "lu",
  "mt",
  "nl",
  "pl",
  "pt",
  "ro",
  "sk",
  "si",
  "es",
  "se",
]);

/**
 * Cross-answer contradiction detection. Surfaced at check-your-answers and
 * re-checked server-side at calculate time (non-empty blocks the verdict —
 * Task 1.9). Rules operate on ANSWERED values only: an unsure EU-nexus answer
 * is handled by the applicability gates (in-scope-presumed), not flagged as a
 * contradiction.
 *
 * Rule family — the third-country EU-nexus denial (Task 1.4 bypass suite):
 * `q4_1_eu_nexus` answered `"no"` ("no space services or space-based data in
 * the EU, directly or indirectly") contradicts later answers that name an EU
 * service footprint:
 *  - `q6_4_ms_transpositions` answered with a non-empty member-state list
 *    (NIS2-relevant services provided in named member states), or
 *  - `q4_3b_ground_countries` containing an EU member state (EU-located
 *    ground segment / TT&C is an indirect EU nexus per Q4.1's own framing).
 */
export function detectContradictions(answers: AnswerMap): Contradiction[] {
  const contradictions: Contradiction[] = [];

  const euNexus = answeredValueOf(answers, "q4_1_eu_nexus");
  if (euNexus === "no") {
    const transpositions = answeredValueOf(answers, "q6_4_ms_transpositions");
    if (Array.isArray(transpositions) && transpositions.length > 0) {
      contradictions.push({
        questionIds: ["q4_1_eu_nexus", "q6_4_ms_transpositions"],
        message:
          "You answered that you provide no space services or space-based data in the EU, but later named EU member states where your NIS2-relevant services are provided. Please revisit one of these answers.",
      });
    }

    const groundCountries = answeredValueOf(answers, "q4_3b_ground_countries");
    if (
      Array.isArray(groundCountries) &&
      groundCountries.some((c) =>
        EU_MEMBER_STATE_CODES.has(String(c).toLowerCase()),
      )
    ) {
      contradictions.push({
        questionIds: ["q4_1_eu_nexus", "q4_3b_ground_countries"],
        message:
          "You answered that you provide no space services or space-based data in the EU, but listed ground-segment countries inside the EU — EU-located TT&C is an indirect EU nexus. Please revisit one of these answers.",
      });
    }
  }

  return contradictions;
}
