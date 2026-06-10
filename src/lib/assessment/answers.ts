// src/lib/assessment/answers.ts — Ultimate Assessment spine, Task 1.3.
// Tri-state answer storage: types + Zod layer + narrow helpers.
// PURE module: no "server-only", no React — importable client+server.
// Persisted as `OperatorAssessmentProfile.answers` (Json), Zod-validated
// server-side on every write via `buildAnswerMapSchema`.
//
// ─────────────────────────────────────────────────────────────────────────
// BINDING unsure-encoding convention (code contract — applies to every
// dataset, condition and adapter in the ultimate-assessment rebuild; see
// docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md, Task 1.3):
//
// The tri-state `{ state: "unsure" }` is THE storage representation of
// unsure, everywhere. Question options NEVER encode unsure as an answered
// option value — no `QuestionOption.value` anywhere in the graph may equal
// `"unsure"` (enforced by an integrity test, Task 1.5). Gates that need a
// visible explicit unsure choice (Q1.9 dual-use, Q3.6 timing, every
// `unsureMode:"option"` question) get it via `unsureMode:"option"`: the
// wizard renders an "I'm not sure" choice as UI sugar, and selecting it
// stores `{ state: "unsure" }` — never `{ state: "answered", value: "unsure" }`.
// Consequently the condition ops `eq`/`in`/`includes` match ANSWERED values
// only and never match an unsure answer; uncertainty is matched exclusively
// via `{ q, op: "unsure" }`. A condition like `{ op: "in", value: ["yes",
// "unsure"] }` is malformed by definition and must not appear in any dataset.
// Server adapters (e.g. `gatewayInputFromAnswers`, Task 1.7) may translate
// `{ state: "unsure" }` into `"unsure"` string literals for their OWN input
// types — that is an adapter-output shape, never a stored answer.
// ─────────────────────────────────────────────────────────────────────────
//
// Honesty invariants enforced at this layer:
//   * Tri-state everywhere — `answered | unsure | not_asked`, three distinct
//     states, never coerced. `unsure` is a first-class value, never mapped
//     to false/no.
//   * `unsure` and `not_asked` carry NO value (strict objects — a payload
//     that smuggles a value alongside either state is rejected).
//   * Unknown question ids are rejected at validation time (graph id set
//     injected to avoid a module cycle with the question graph).

import { z } from "zod";

export type TriStateAnswer =
  | { state: "answered"; value: string | string[] | boolean | number }
  | { state: "unsure" }
  | { state: "not_asked" }; // branch skipped — recorded EXPLICITLY at submit

export type AnswerMap = Record<string, TriStateAnswer>;

export const triStateAnswerSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("answered"),
    value: z.union([z.string(), z.array(z.string()), z.boolean(), z.number()]),
  }),
  // .strict(): unsure carries no value — `{state:"unsure", value:"x"}` is invalid.
  z.object({ state: z.literal("unsure") }).strict(),
  z.object({ state: z.literal("not_asked") }).strict(),
]);

/**
 * Validate a map against the known question ids (graph injected to avoid a
 * cycle). Any key outside `knownIds` produces a named issue at that key's
 * path — answers can never be smuggled in under ids the graph doesn't know.
 *
 * Requiredness/visibility is NOT checked here — that is `validateSubmission`
 * (graph-evaluator, Task 1.4). An empty map is structurally valid.
 */
export function buildAnswerMapSchema(
  knownIds: ReadonlySet<string>,
): z.ZodType<AnswerMap> {
  const schema: z.ZodType<AnswerMap> = z
    .record(z.string(), triStateAnswerSchema)
    .superRefine((map, ctx) => {
      for (const id of Object.keys(map)) {
        if (!knownIds.has(id)) {
          ctx.addIssue({
            code: "custom",
            path: [id],
            message: `Unknown question id: "${id}"`,
          });
        }
      }
    });
  return schema;
}

/** Type guard: narrows to the answered variant; false for unsure/not_asked/missing. */
export function isAnswered(
  a: TriStateAnswer | undefined,
): a is Extract<TriStateAnswer, { state: "answered" }> {
  return a !== undefined && a.state === "answered";
}

/**
 * The answered value for a question id, or undefined.
 * Per the binding convention, `unsure` and `not_asked` yield undefined —
 * they are never coerced into a value.
 */
export function answeredValue(
  map: AnswerMap,
  id: string,
): string | string[] | boolean | number | undefined {
  const a = map[id];
  return isAnswered(a) ? a.value : undefined;
}
