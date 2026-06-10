// src/data/assessment/question-graph-types.ts — pure, client+server importable.
//
// Question-graph type contract for the ultimate operator assessment
// (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md, Task 1.4).
//
// BINDING unsure-encoding convention (Task 1.3): the tri-state `{state:"unsure"}`
// is THE storage representation of unsure, everywhere. No `QuestionOption.value`
// anywhere in the graph may equal `"unsure"` — an explicit "I'm not sure" choice
// is rendered via `unsureMode: "option"` (UI sugar) and stored `{state:"unsure"}`.
// Consequently the condition ops `eq`/`neq`/`in`/`includes`/`gte` match ANSWERED
// values only and never match an unsure answer; uncertainty is matched
// exclusively via `{ q, op: "unsure" }`.

import type { FindingSource } from "@/lib/assessment/finding";

export type SectionId =
  | "identity_role"
  | "activity_assets"
  | "orbit_mission"
  | "jurisdiction_market"
  | "lifecycle"
  | "nis2_gateway"
  | "debris_environment"
  | "insurance_liability"
  | "spectrum_export"
  | "review";

/**
 * Pure, serializable condition AST. Evaluated by the shared branch evaluator
 * (`src/lib/assessment/graph-evaluator.ts`) — identically on the client (wizard
 * display) and the server (calculate-time enforcement; honesty invariant 3).
 *
 * Semantics (binding, Task 1.3 convention):
 * - `eq`/`neq`/`in`/`includes`/`gte` match answered values ONLY. They evaluate
 *   FALSE against `{state:"unsure"}`, `{state:"not_asked"}` and missing answers.
 * - `{ q, op: "unsure" }` matches exactly the `{state:"unsure"}` state — nothing else.
 * - `{ q, op: "answered" }` matches exactly the `{state:"answered"}` state.
 * - A condition like `{op:"in", value:["yes","unsure"]}` is malformed by
 *   definition and must not appear in any dataset (dataset integrity tests,
 *   Task 1.5, forbid `"unsure"` option values).
 */
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { q: string; op: "eq" | "neq" | "in" | "includes" | "gte"; value: unknown }
  | { q: string; op: "answered" | "unsure" };

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

/** Battery item (Q6.6 pattern, Task 1.6 `kind: "battery"` extension). */
export interface QuestionItem {
  id: string;
  label: string;
}

export interface QuestionNode {
  id: string; // "q1_1_roles"
  section: SectionId;
  tier: "quick" | "full" | "both";
  // "battery" + `items` added per Task 1.6 (Q6.6 — one node, per-item statuses).
  kind:
    | "single"
    | "multi"
    | "boolean"
    | "bands"
    | "country_multi"
    | "text"
    | "battery";
  title: string;
  why: string; // the "why we ask this" panel (CNIL pattern)
  citation: FindingSource[]; // ≥1; verified:false allowed but rendered as such
  options?: QuestionOption[];
  /** "option" = the wizard renders an explicit "I'm not sure" choice that stores
   *  `{state:"unsure"}` (UI sugar — NEVER an option value, see Task 1.3 convention);
   *  "none" = genuinely binary facts only, no unsure choice rendered. */
  unsureMode: "option" | "none";
  showIf?: Condition; // absent = always shown within its tier
  /** Rendering hint: nodes sharing a screenGroup render on ONE wizard screen;
   *  screen-count tests (Task 1.6) count screens via countScreens, not nodes. */
  screenGroup?: string;
  /** Auto-derive hint (Q6.4 pattern): question ids whose answers pre-fill this
   *  question; the wizard renders a confirm/edit list instead of a blank input. */
  derivedFrom?: string[];
  /** Battery items (Task 1.6, Q6.6) — only for `kind: "battery"`. */
  items?: QuestionItem[];
  quickVariant?: { kind: QuestionNode["kind"]; options?: QuestionOption[] }; // coarse quick rendering
}
