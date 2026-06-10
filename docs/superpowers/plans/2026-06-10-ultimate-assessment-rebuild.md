# Ultimate Operator Assessment — Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. TDD on every task: the test step comes FIRST and must fail before the implementation step.

**Goal:** Replace the four facade wizards with ONE branching operator assessment on a single profile spine — a question graph evaluated server-side, the existing engines as pluggable verdict modules, an obligation map (never a score) as the output, and a quick/full/living tier ladder — with every §7 critique correction baked into the dataset so the regulatory errors cannot be recreated.

**Architecture:** One versioned `OperatorAssessmentProfile` (tri-state answers Json + verdict snapshots pinned to a rulebook semver) → declarative question graph in `src/data/assessment/` (id/section/tier/options/showIf/why/citation per question) → pure branch evaluator shared client+server → server-only verdict pipeline (applicability gates → NIS2 gateway with `needs_clarification` → `calculateCompliance()` per role via the existing merger → obligation clusters incl. the new incident-reporting/sanctions/transfer clusters) → findings as explanation envelopes (Passage `ExplainedResult` pattern, re-implemented pure in `src/lib/assessment/finding.ts` with DETERMINED/PROBABLE/INDETERMINATE bands + legislative-flux flags). Existing engines (`engine.server.ts`, `nis2-engine.server.ts`, `space-law-engine.server.ts`, `unified-engine-merger.server.ts`) are KEPT and extended, never forked.

**Tech Stack:** Next.js 15 (App Router), Prisma 5.22/Neon (additive migration only), NextAuth v5, Zod, Vitest (co-located `*.test.ts`), jsPDF server-side (verdict-dossier patterns), existing wizard UI kit (`QuestionStep`/`OptionCard`/`ProgressBar`/`MultiSelectQuestionStep`), Tailwind + glass system, Upstash rate limiting, existing `/api/assessment/lead` capture (hotfix, 2026-06-10).

**Source spec:** `docs/superpowers/specs/2026-06-09-ultimate-assessment-design.md` — §3 architecture, §4 catalog, §5 scoring, §6/§6b output+tiers, **§7 BINDING corrections**, §11 founder decisions.

**Branch:** `feat/ultimate-assessment` (new, from current main). Surface guard: no files under `src/app/(atlas|pharos|trade|comply)/**` or `src/lib/atlas/**` are touched. The Passage envelope pattern is **copied** (documented lineage), not imported across surfaces.

**Naming collision (IMPORTANT):** `model OperatorProfile` ALREADY EXISTS in `prisma/schema.prisma` (~line 6529, org-scoped 1:1 Context-Omnipresence model). The spine model is therefore named **`OperatorAssessmentProfile`**. Do NOT rename or touch the existing `OperatorProfile`.

---

## Cross-cutting honesty invariants (apply to EVERY task; unit-tested in Tasks 1.4, 1.7, 1.9)

1. **Tri-state everywhere.** Every stored answer is `answered | unsure | not_asked` — three distinct states, never coerced. `unsure` is a first-class value, never mapped to `false`/`no`.
2. **Unknown rounds up (monotonic).** Adding an `unsure` may only widen the obligation set or lower confidence — never remove an obligation, never improve readiness, never produce a cleaner verdict.
3. **Server-enforced gates.** Every branch condition and applicability gate is evaluated server-side at calculate time. An empty or partial payload is a 422 validation error naming the missing questions — never a verdict.
4. **No fabricated findings.** If a lookup finds nothing, the result says "none identified". No hardcoded fallback findings, ever (the merger's fabricated-overlap fix is the precedent).
5. **Every finding cites.** Each finding carries legal basis (instrument + provision + as-of date) and the rulebook semver it was computed against. Estimates keep their provenance label through redaction ("Commission impact-assessment estimate, not an enacted fee schedule").
6. **No overall score** (founder decision §11.3). No field named `score`, `complianceScore`, or any 0–100 aggregate exists anywhere in the new result types. Per-cluster "N of M evidenced" bands only.
7. **Flux collapsed-conservative** (founder decision §11.4). Contested findings default-render "contested — conservative reading shown" with one-click expansion; full three-text scenario tables only in the PDF appendix.
8. **Gating** (founder decision §11.2): quick check free on screen + email-gated PDF (real `/api/assessment/lead` capture, unchecked consent); full tier behind free account; living tier paid.

---

## File structure (created / modified across all phases)

**Data layer**

- `prisma/schema.prisma` — MODIFY (append `OperatorAssessmentProfile`, `AssessmentVerdictSnapshot`, 2 enums; add back-relation on `User`)
- `src/data/assessment/rulebook.ts` — CREATE (semver + per-source as-of dates, §7.1-corrected labels)
- `src/data/assessment/question-graph-types.ts` — CREATE (QuestionNode, Condition AST, section/cluster ids)
- `src/data/assessment/question-graph.ts` — CREATE (the §4 catalog AS CORRECTED BY §7)
- `src/data/caelex-eu-space-act-engine.json` — MODIFY (bounded citation pass: tier names, date framing)

**Logic layer (server + pure)**

- `src/lib/assessment/answers.ts` — CREATE (TriStateAnswer + Zod)
- `src/lib/assessment/finding.ts` — CREATE (explanation envelope, Passage pattern re-implementation)
- `src/lib/assessment/graph-evaluator.ts` — CREATE (pure: visibility, validation, contradictions)
- `src/lib/assessment/nis2-gateway.server.ts` — CREATE (extended classifier, 4th state)
- `src/lib/assessment/regime-eligibility.server.ts` — CREATE (real Art 10 eligibility)
- `src/lib/assessment/applicability-gates.server.ts` — CREATE (defense / launch-timing / EU-nexus)
- `src/lib/assessment/verdict-pipeline.server.ts` — CREATE (the spine)
- `src/lib/assessment/readiness.server.ts`, `credit-map.server.ts`, `roadmap.server.ts` — CREATE (Phase 3)
- `src/lib/assessment/roadmap-deadlines.server.ts` — CREATE (Phase 3: roadmap → existing `Deadline`/timeline wiring)
- `src/lib/assessment/assessment-delta.server.ts` — CREATE (Phase 4 living tier)
- `src/lib/assessment/living-entitlement.server.ts` — CREATE (Phase 4: paid living-tier gate on the real `Subscription` record)
- `src/lib/pdf/assessment/quick-summary.server.ts` + `obligation-dossier.server.ts` — CREATE

**API**

- `src/app/api/assessment/v2/profile/route.ts` — CREATE (POST create/claim, PATCH answers, GET resume)
- `src/app/api/assessment/v2/quick/route.ts` — CREATE (public quick calculate)
- `src/app/api/assessment/v2/calculate/route.ts` — CREATE (full-tier calculate, account-gated)
- `src/app/api/assessment/v2/pdf/quick/route.ts` + `dossier/route.ts` — CREATE
- `src/app/api/assessment/lead/route.ts` — MODIFY (add `quick-check`/`full` assessmentType)
- `src/app/api/tracker/import-assessment/route.ts` — MODIFY (Phase 3: consume engine snapshot, retire articles.ts recompute)

**UI**

- `src/components/assessment/spine/` — CREATE (SpineWizard, WhyPanel, CheckYourAnswers, FormingCounter, FindingCard, ClusterSection, UnknownsList)
- `src/app/assessment/quick/page.tsx` + `quick/results/page.tsx` — CREATE
- `src/app/assessment/full/page.tsx` + `full/results/page.tsx` — CREATE
- `src/app/assessment/{eu-space-act,nis2,space-law,unified}/page.tsx` — MODIFY (Phase 4: redirects with presets)

---

# PHASE 1 — Foundation (deployable: additive-only, zero user-facing change)

All Phase-1 code is new files + an additive migration + one bounded JSON label pass. Nothing imports it from any page yet, so deploying mid-phase is safe under the batched-deploy policy.

## Task 1.1 — Rulebook version dataset

**Files:** Create `src/data/assessment/rulebook.ts`; Test `src/data/assessment/rulebook.test.ts`

- [ ] Write the failing test first: asserts (a) `RULEBOOK.version` matches `/^\d+\.\d+\.\d+$/`; (b) NO source label contains the strings `"general approach"` or `"Art 75a"` or `"Art. 75a"` (§7.1 corrections #1, #2); (c) the Council-track source is labeled a Presidency compromise; (d) every source has an ISO `asOf` date; (e) `CONTESTED_POSITIONS.applicationDate` has exactly three entries (Commission 2030 prong, Commission 2032 second prong, Council/EP 36-months) per §7.1 correction #7.
- [ ] Implement:

```ts
// src/data/assessment/rulebook.ts — pure data, importable client+server
export interface RulebookSource {
  id: string; // "com-2025-335" | "presidency-compromise" | ...
  label: string; // human label — §7.1-corrected wording
  citation: string;
  asOf: string; // ISO date
  verified: boolean; // false = could not be verified against primary text
  note?: string;
}

export const RULEBOOK = {
  version: "1.0.0",
  sources: [
    {
      id: "com-2025-335",
      label: "EU Space Act proposal — Commission text",
      citation: "COM(2025) 335",
      asOf: "2025-06-25",
      verified: true,
    },
    // §7.1 #1: NOT "Council general approach". As of June 2026 the Council has
    // adopted NO position (29 May 2026 COMPET: progress report only, file passed
    // to the Irish presidency).
    {
      id: "presidency-compromise",
      label:
        "Danish Presidency compromise text (Council track — no Council position adopted as of June 2026)",
      citation: "Council doc., Presidency compromise",
      asOf: "2025-12-05",
      verified: true,
    },
    {
      id: "ep-itre-draft",
      label: "EP ITRE draft report",
      citation: "ITRE draft report on COM(2025) 335",
      asOf: "2026-03-03",
      verified: true,
    },
    {
      id: "nis2",
      label: "NIS2 Directive",
      citation: "Directive (EU) 2022/2555",
      asOf: "2022-12-27",
      verified: true,
    },
    {
      id: "nis2umsucg-de",
      label: "German NIS2 transposition (in force, BSI competent)",
      citation: "NIS2UmsuCG",
      asOf: "2025-12-06",
      verified: true,
    },
    {
      id: "dual-use-update",
      label: "Dual-Use Annex I update (spacecraft 'mission equipment' rework)",
      citation: "Delegated Reg. (EU) 2025/2003, OJ 14 Nov 2025",
      asOf: "2025-09-08",
      verified: true,
    },
    // national space laws (FR LOS, IT 89/2025, UK SIA/OSA, LU, NL, DE SatDSiG ...) — one entry each
  ] as const satisfies readonly RulebookSource[],
} as const;

/** §7.1 #2 + #7: machine-readable contested positions for flux flags. */
export const CONTESTED_POSITIONS = {
  applicationDate: [
    { source: "com-2025-335", position: "1 January 2030" },
    {
      source: "com-2025-335",
      position: "1 January 2032 for certain assets (second prong)",
    },
    {
      source: "presidency-compromise",
      position: "36 months after entry into force",
    }, // EP ITRE same
  ],
  cyberArchitecture: [
    {
      source: "com-2025-335",
      position: "Space Act resilience chapter (Arts 74–95) as lex specialis",
    },
    {
      source: "presidency-compromise",
      position:
        "synchronisation — 'without prejudice to NIS2'; Art 75 et seq. only for operators below NIS2 Art 3 thresholds + third-country operators",
    },
    {
      source: "ep-itre-draft",
      position: "resilience chapter deleted; NIS2 extended via new Art 117a",
    },
  ],
  cdrWindow: [
    {
      source: "com-2025-335",
      position: "CDR within 12 months of entry into force",
    },
    { source: "presidency-compromise", position: "CDR within 24 months" },
  ],
} as const;
```

- [ ] Run: `npx vitest run src/data/assessment/rulebook.test.ts` — expect all green.
- [ ] Commit: `feat(assessment): rulebook semver dataset with §7-corrected source labels`

## Task 1.2 — Finding envelope (Passage pattern, assessment-native)

**Files:** Create `src/lib/assessment/finding.ts`; Test `src/lib/assessment/finding.test.ts`

Pure module, no `server-only`, no React — mirrors the contract of `src/lib/comply-v2/trade/explained-result.ts` (documented lineage in the header comment) but with the assessment's epistemic bands and flux flag. Copied, not imported (surface separation + different confidence semantics).

- [ ] Failing tests first: (a) `determinedFinding()` throws on empty sources; (b) `indeterminateFinding()` requires a non-empty `why`; (c) `isFindingComplete()` reports missing fields on a hand-built bad object; (d) a finding with `fluxFlag` set must have ≥2 `positions`; (e) confidence derivation: `deriveConfidence({ unknownsInTriggerChain: 0 }) === "DETERMINED"`, `1 → "PROBABLE"` with the unknown named, decisive-unknown → `"INDETERMINATE"`.
- [ ] Implement:

```ts
// src/lib/assessment/finding.ts
// Lineage: structural copy of the Passage ExplainedResult contract
// (src/lib/comply-v2/trade/explained-result.ts) — adapted bands + flux flag.
export type FindingConfidence = "DETERMINED" | "PROBABLE" | "INDETERMINATE";
export type FindingVerdict =
  | "applicable"
  | "conditional"
  | "contested"
  | "not_applicable"
  | "advisory";

export interface FindingSource {
  label: string; // e.g. "EU Space Act proposal — Commission text"
  citation: string; // e.g. "COM(2025) 335 Art. 23"
  asOf: string; // ISO date
  verified: boolean; // false ⇒ renderer shows "legal basis pending verification"
  url?: string;
}

/** §7.1 #2 / founder §11.4: contested-in-legislation marker, collapsed by default. */
export interface FluxFlag {
  summary: string; // "contested — conservative reading shown"
  conservativeReading: string; // what the verdict assumes
  positions: { source: string; position: string }[]; // ≥2; rendered expanded only on click / PDF appendix
}

export interface AssessmentFinding<T = unknown> {
  value: T;
  verdict: FindingVerdict;
  what: string; // one-line obligation
  why: string; // reasoning + matched rule
  wherefore: string; // what it means + single next action
  whyTrace: { questionId: string; answerLabel: string }[]; // "because you answered: …"
  confidence: FindingConfidence;
  sources: FindingSource[]; // ≥1 unless INDETERMINATE
  cluster: ClusterId;
  fluxFlag?: FluxFlag;
  /** §6 (2) full tier: ENISA-style "evidence a supervisor would accept" examples.
   *  Populated per obligation CLUSTER (not per question) from
   *  CLUSTER_EVIDENCE_EXAMPLES in the pipeline (Task 1.9); rendered in FindingCard. */
  evidenceExamples?: string[];
  rulebookVersion: string;
}

export type ClusterId =
  | "authorization_registration"
  | "transfer_change_of_control"
  | "debris_safety"
  | "resilience_cyber"
  | "incident_reporting"
  | "environment"
  | "insurance_liability"
  | "supervision_penalties"
  | "spectrum_itu"
  | "export_control_sanctions"
  | "un_registration";

export function determinedFinding<T>(
  input: Omit<AssessmentFinding<T>, "confidence"> & {
    confidence: Exclude<FindingConfidence, "INDETERMINATE">;
  },
): AssessmentFinding<T>;
export function indeterminateFinding<T>(
  input: Omit<AssessmentFinding<T>, "confidence" | "sources"> & {
    sources?: FindingSource[];
  },
): AssessmentFinding<T>;
export function isFindingComplete(f: unknown): string[]; // [] = renderable
export function deriveConfidence(input: {
  unknownsInTriggerChain: number;
  decisiveUnknown: boolean;
}): FindingConfidence;
```

- [ ] Run: `npx vitest run src/lib/assessment/finding.test.ts` — green.
- [ ] Commit: `feat(assessment): finding envelope with flux flags (passage pattern)`

## Task 1.3 — Prisma spine models + tri-state answer types

**Files:** Modify `prisma/schema.prisma` (append at end + `User` back-relation); Create `src/lib/assessment/answers.ts`; Test `src/lib/assessment/answers.test.ts`

> **BINDING unsure-encoding convention (applies to every dataset, condition and adapter in this plan):** the tri-state `{state:"unsure"}` is THE storage representation of unsure, everywhere. Question options NEVER encode unsure as an answered option value — no `QuestionOption.value` anywhere in the graph may equal `"unsure"` (enforced by an integrity test, Task 1.5). Gates that need a visible explicit unsure choice (Q1.9 dual-use, Q3.6 timing, every `unsureMode:"option"` question) get it via `unsureMode:"option"`: the wizard renders an "I'm not sure" choice as UI sugar, and selecting it stores `{state:"unsure"}` — never `{state:"answered", value:"unsure"}`. Consequently the condition ops `eq`/`in`/`includes` match ANSWERED values only and never match an unsure answer; uncertainty is matched exclusively via `{q, op:"unsure"}`. A condition like `{op:"in", value:["yes","unsure"]}` is malformed by definition and must not appear in any dataset. Server adapters (e.g. `gatewayInputFromAnswers`, Task 1.7) may translate `{state:"unsure"}` into `"unsure"` string literals for their OWN input types — that is an adapter-output shape, never a stored answer.

- [ ] Failing tests first for the Zod layer: valid `{state:"answered", value:[...]}` passes; `{state:"unsure", value:"x"}` fails (unsure carries no value); `{state:"answered"}` without value fails; an answers map with an unknown question id fails when validated against the graph's id set; round-trip serialize/parse is lossless.
- [ ] Append to `prisma/schema.prisma` (NOT touching the existing `OperatorProfile`):

```prisma
// ─── Ultimate Assessment Spine (2026-06-10 rebuild) ─────────────────────

enum AssessmentTier {
  QUICK
  FULL
}

enum AssessmentProfileStatus {
  IN_PROGRESS
  COMPLETED
}

model OperatorAssessmentProfile {
  id             String  @id @default(cuid())
  userId         String?
  user           User?   @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId String? // plain scalar — no relation, keeps schema churn minimal
  // Quick-tier carry-forward without an account: httpOnly-cookie token.
  anonymousId    String? @unique

  version Int                     @default(1) // bumped on every material answer change
  tier    AssessmentTier          @default(QUICK)
  status  AssessmentProfileStatus @default(IN_PROGRESS)

  // Record<QuestionId, TriStateAnswer> — Zod-validated server-side on every write.
  answers        Json    @default("{}")
  currentSection String?
  // Living-tier opt-in triggers (Q10.2): ["new_spacecraft","new_jurisdiction",...]
  changeTriggers String[] @default([])

  claimedAt DateTime? // anonymous → account claim timestamp
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  verdicts AssessmentVerdictSnapshot[]

  @@index([userId])
  @@index([updatedAt])
}

model AssessmentVerdictSnapshot {
  id              String                    @id @default(cuid())
  profileId       String
  profile         OperatorAssessmentProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileVersion  Int    // OperatorAssessmentProfile.version this was computed from
  tier            AssessmentTier
  rulebookVersion String // RULEBOOK.version at compute time
  result          Json   // ObligationMapResult (redacted shape)
  unknownsCount   Int
  createdAt       DateTime @default(now())

  @@index([profileId, createdAt])
}
```

- [ ] Add `assessmentProfiles OperatorAssessmentProfile[]` to `model User`.
- [ ] Implement `src/lib/assessment/answers.ts`:

```ts
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
  z.object({ state: z.literal("unsure") }).strict(),
  z.object({ state: z.literal("not_asked") }).strict(),
]);

/** Validate a map against the known question ids (graph injected to avoid a cycle). */
export function buildAnswerMapSchema(
  knownIds: ReadonlySet<string>,
): z.ZodType<AnswerMap>;
export function isAnswered(
  a: TriStateAnswer | undefined,
): a is Extract<TriStateAnswer, { state: "answered" }>;
export function answeredValue(
  map: AnswerMap,
  id: string,
): string | string[] | boolean | number | undefined;
```

- [ ] Run: `npx prisma validate && npx prisma generate` — expect "schema valid"; then `npx vitest run src/lib/assessment/answers.test.ts` — green. Create the additive migration (`npx prisma migrate dev --name assessment_spine --create-only` if `DATABASE_URL` is available; otherwise hand-write `prisma/migrations/<ts>_assessment_spine/migration.sql` with the matching `CREATE TYPE`/`CREATE TABLE`/`ALTER` statements).
- [ ] Commit: `feat(assessment): operator assessment profile schema + tri-state answers`

## Task 1.4 — Question-graph types + branch evaluator (server-enforced gates)

**Files:** Create `src/data/assessment/question-graph-types.ts`, `src/lib/assessment/graph-evaluator.ts`; Test `src/lib/assessment/graph-evaluator.test.ts`

- [ ] Failing tests first (the bypass suite — these tests are the codified honesty invariants):
  - empty payload → `validateSubmission` returns errors for every always-visible question; never a pass.
  - a question hidden by `showIf` answered as `not_asked` → valid; answered with a value → `unexpected_answer` error (no smuggling answers past branches).
  - a visible required question missing → named error.
  - `unsure` satisfies requiredness (it is an answer).
  - contradiction: `q1_2_establishment=us` + `q4_1_eu_nexus` answered `no` + later EU-service answers → `detectContradictions` returns the named pair (blocks at check-your-answers, not silently accepted).
  - condition ops: `eq/neq/in/includes/gte/answered/unsure` + `all/any/not` composition each covered.
  - **unsure-matching semantics (binding convention, Task 1.3):** `eq`/`in`/`includes` against an answer with `{state:"unsure"}` evaluate FALSE (they match answered values only); `{q, op:"unsure"}` matches exactly that state and nothing else.
  - **screen counting:** `countScreens([a, b, c])` where `a.screenGroup === b.screenGroup === "q1_5_size"` and `c` has no group returns 2 — same-group nodes render on ONE screen and count as one.
- [ ] Implement types:

```ts
// src/data/assessment/question-graph-types.ts — pure, client+server importable
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

export interface QuestionNode {
  id: string; // "q1_1_roles"
  section: SectionId;
  tier: "quick" | "full" | "both";
  kind: "single" | "multi" | "boolean" | "bands" | "country_multi" | "text";
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
  quickVariant?: { kind: QuestionNode["kind"]; options?: QuestionOption[] }; // coarse quick rendering
}
```

- [ ] Implement evaluator (PURE — no `server-only`, used by wizard for display AND by the calculate routes for enforcement):

```ts
// src/lib/assessment/graph-evaluator.ts
export function evaluateCondition(cond: Condition, answers: AnswerMap): boolean;
export function visibleQuestions(
  graph: readonly QuestionNode[],
  tier: "quick" | "full",
  answers: AnswerMap,
): QuestionNode[];
/** Counts wizard SCREENS: nodes sharing a screenGroup collapse to one. */
export function countScreens(nodes: readonly QuestionNode[]): number;
export interface SubmissionError {
  questionId: string;
  code: "missing" | "unexpected_answer" | "invalid_option";
  message: string;
}
export function validateSubmission(
  graph: readonly QuestionNode[],
  tier: "quick" | "full",
  answers: AnswerMap,
): SubmissionError[];
export interface Contradiction {
  questionIds: [string, string];
  message: string;
}
export function detectContradictions(answers: AnswerMap): Contradiction[];
```

- [ ] Run: `npx vitest run src/lib/assessment/graph-evaluator.test.ts` — green.
- [ ] Commit: `feat(assessment): question graph types + server-enforceable branch evaluator`

## Task 1.5 — Question-graph dataset, sections 1–5 (§4 catalog AS CORRECTED BY §7)

**Files:** Create `src/data/assessment/question-graph.ts` (sections 1–5); Test `src/data/assessment/question-graph.test.ts`

Transcribe the spec §4 catalog by question id. Unaffected questions (Q1.1, Q1.2, Q1.3, Q1.6, Q2.1, Q2.2, Q2.4–Q2.12, Q3.1–Q3.4, Q3.7, Q4.1, Q4.3 country-list part, Q4.4, Q4.5, Q4.6, Q4.8, Q4.9, Q5.1, Q5.2) are transcribed faithfully from §4 with `unsureMode: "option"` wherever the spec lists unsure. The §7-affected entries below are BINDING — implement exactly these shapes:

- [ ] Failing integrity tests first: unique ids; every `showIf` references an existing id; every question has non-empty `why` + ≥1 citation; **CUT questions absent** (`q1_8`, `q8_3`, `q5_3`, `q4_7`, `q3_5` must not exist as ids — §7.3); **no `QuestionOption.value` anywhere in the graph equals `"unsure"`** (Task 1.3 binding convention — unsure is rendered via `unsureMode:"option"` and stored as `{state:"unsure"}`); `q1_9` has exactly 3 options including `dual_use` and `unsureMode: "option"`; `q1_5_headcount` and `q1_5_turnover` both exist, share `screenGroup: "q1_5_size"`, and no node with id `q1_5_size_bands` exists; `q3_6` citations contain three application-date positions; no citation string anywhere contains `"general approach"` or `"75a"`.
- [ ] **Q1.4 → org-type fold** (§7.3 cuts Q4.7 + trims quick tier — research status and IGO become options of ONE question):

```ts
{
  id: "q1_4_org_type", section: "identity_role", tier: "both", kind: "single",
  title: "What type of organisation are you?",
  why: "Research/educational status drives Art 10 light-regime eligibility, Art 62 carve-outs and Italian Law 89/2025 insurance reductions. International intergovernmental organisations carry an Art 2(2) exemption that BOTH co-legislators have made contingent on bilateral agreements — that finding ships with a flux flag, folded here instead of a dedicated IGO question (§7.3).",
  citation: [
    { label: "EU Space Act proposal — Commission text", citation: "COM(2025) 335 Art. 10, Art. 2(2), Art. 62", asOf: "2025-06-25", verified: true },
    { label: "Italian space law", citation: "Law 89/2025 (insurance reductions for startups/research)", asOf: "2025-06-11", verified: true },
  ],
  unsureMode: "none",
  options: [
    { value: "commercial", label: "Commercial company" },
    { value: "research_edu", label: "Research or educational institution" },
    { value: "public_body", label: "Public body / agency" },
    { value: "igo", label: "International intergovernmental organisation (ESA, EUMETSAT, …)" },
  ],
}
```

- [ ] **Q1.5 size bands — TWO question nodes on ONE screen** (`screenGroup: "q1_5_size"`, Task 1.4) so downstream conditions (Q6.8's `showIf`, the NIS2 gateway adapter) can reference each dimension by id; corrected size-cap semantics in `why` (§7.1 #4); unsure rendered via `unsureMode:"option"` and stored `{state:"unsure"}` (Task 1.3 convention — never an option value):

```ts
{
  id: "q1_5_headcount", section: "identity_role", tier: "both", kind: "bands",
  screenGroup: "q1_5_size",
  title: "Headcount band?",
  why: "Double duty: EU SME definition (Space Act light regime, EP draft's 'small mid-cap' extension) and the NIS2 size cap. ≥250 headcount alone makes you LARGE per Rec. 2003/361 (→ NIS2 'essential' candidate); ≥50 puts you at the 'important' floor. Bands, not exact figures, to cut friction and don't-know rates.",
  citation: [
    { label: "Commission Recommendation 2003/361/EC", citation: "Annex Art. 2 (SME ceilings)", asOf: "2003-05-06", verified: true },
    { label: "NIS2 Directive", citation: "Directive (EU) 2022/2555 Art. 2(1), Art. 3", asOf: "2022-12-27", verified: true },
  ],
  unsureMode: "option",
  options: [
    { value: "h_1_9", label: "1–9" },
    { value: "h_10_49", label: "10–49" },
    { value: "h_50_249", label: "50–249" },
    { value: "h_250_plus", label: "250 or more" },
  ],
},
{
  id: "q1_5_turnover", section: "identity_role", tier: "both", kind: "bands",
  screenGroup: "q1_5_size",
  title: "Annual turnover band?",
  why: "CORRECTED (§7.1 #4): 'essential' requires LARGE per Rec. 2003/361 = ≥250 headcount OR (turnover >€50M AND balance sheet >€43M). Turnover alone never upgrades you to essential — the balance-sheet leg comes from Q1.6, and an unsure balance sheet takes the conservative (larger) reading.",
  citation: [
    { label: "Commission Recommendation 2003/361/EC", citation: "Annex Art. 2 (SME ceilings)", asOf: "2003-05-06", verified: true },
    { label: "NIS2 Directive", citation: "Directive (EU) 2022/2555 Art. 2(1), Art. 3", asOf: "2022-12-27", verified: true },
  ],
  unsureMode: "option",
  options: [
    { value: "t_lt_2m", label: "Under €2M" },
    { value: "t_2_10m", label: "€2–10M" },
    { value: "t_10_50m", label: "€10–50M" },
    { value: "t_gt_50m", label: "Over €50M" },
  ],
}
```

- [ ] **Q1.7 group structure** — `tier: "full"` (pushed out of quick per §7.3 trim; the quick verdict states "regime direction pending group verification" instead — encoded in Task 1.8's regime module, NOT as a hidden default answer).
- [ ] **Q1.9 defense gate — GATE FIX (§7.2/§7.4):** trinary + unsure, dual-use first-class:

```ts
{
  id: "q1_9_defense_exclusivity", section: "identity_role", tier: "both", kind: "single",
  title: "Are your space assets used exclusively for defence or national security?",
  why: "Art 2(3) excludes EXCLUSIVELY-defence activities. Partial/dual-use stays fully in scope and is noted in the verdict. This gate is enforced server-side; 'unsure' rounds UP to in-scope-presumed (more obligations), never to an exemption.",
  citation: [{ label: "EU Space Act proposal — Commission text", citation: "COM(2025) 335 Art. 2(3)", asOf: "2025-06-25", verified: true }],
  // §7.4 explicit-unknown gate: the rendered "I'm not sure" choice comes from
  // unsureMode and stores {state:"unsure"} (Task 1.3 convention).
  unsureMode: "option",
  options: [
    { value: "exclusively_defense", label: "Yes — exclusively defence / national security" },
    { value: "dual_use", label: "Partially — dual-use or mixed civil/defence" },
    { value: "no", label: "No — civil / commercial" },
  ],
}
```

- [ ] **Q2.3 propulsion — CALIBRATION FIX (§7.1 #6):**

```ts
{
  id: "q2_3_propulsion", section: "activity_assets", tier: "full", kind: "single",
  title: "Propulsion / manoeuvre capability per spacecraft?",
  why: "Art 66 manoeuvrability + Art 64 collision-avoidance feasibility. CALIBRATED (§7.1): the propulsion MANDATE attaches to mega (100–999) and giga (1000+) constellations — NOT at ≥10. 'None' + 10–99 emits a CONSERVATIVE ADVISORY (no cited mandate); 'none' + ≥100 emits the cited finding. The <400 km manoeuvrability carve-out (recital 63) is consumed from the orbit altitude band before either fires.",
  citation: [{ label: "EU Space Act proposal — Commission text", citation: "COM(2025) 335 Arts. 64, 66, 73(1); recital 63", asOf: "2025-06-25", verified: true }],
  unsureMode: "option",
  options: [
    { value: "full", label: "Full propulsion" },
    { value: "limited", label: "Limited (e.g. differential drag)" },
    { value: "none", label: "None" },
  ],
  showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
}
```

- [ ] **Q3.6 launch timing — three-valued contested date (§7.1 #7), SOFT gate:**

```ts
{
  id: "q3_6_launch_timing", section: "orbit_mission", tier: "both", kind: "single",
  title: "When do your space assets launch relative to the Act's application date?",
  why: "Art 2 grandfathering. The application date itself is contested THREE ways: 1 Jan 2030 (Commission) OR 1 Jan 2032 for certain assets (Commission second prong) vs 36 months after entry into force (Presidency compromise + EP ITRE). 'All before' yields a LIKELY-out-of-scope verdict carrying the scenario note and PROBABLE confidence — never an unqualified hard verdict (replenishment / lifetime-extension / transfer edge cases unverified, §7.1) and never a client-only stop.",
  citation: [
    { label: "EU Space Act proposal — Commission text", citation: "COM(2025) 335 Art. 2 + application provisions (1 Jan 2030 / 1 Jan 2032 second prong)", asOf: "2025-06-25", verified: true },
    { label: "Danish Presidency compromise text (Council track — no Council position adopted as of June 2026)", citation: "application: 36 months after entry into force", asOf: "2025-12-05", verified: true },
    { label: "EP ITRE draft report", citation: "application: 36 months after entry into force", asOf: "2026-03-03", verified: true },
  ],
  // §7.4 explicit-unknown gate: "I'm not sure" rendered via unsureMode, stored {state:"unsure"}.
  unsureMode: "option",
  options: [
    { value: "all_before", label: "All assets launch before the application date" },
    { value: "some_or_all_after", label: "Some or all launch after it" },
  ],
}
```

- [ ] **Q4.2 EU representative — CITATION FIX (§7.1 #3):** the `why` and citations cite Space Act Art 23 ONLY. Explicit dataset comment: `// §7.1: NIS2 Art 26(3) representative mechanism applies ONLY to Art 26(1)(b) digital categories — a non-EU space operator NEVER becomes "important + representative" via Art 26; NIS2 space-sector jurisdiction follows establishment (Art 26(1) chapeau). Do not re-add the "unlocks NIS2 Art 26" claim.` `showIf: { all: [{ q: "q1_2_establishment", op: "neq", value: "eu" }, { any: [{ q: "q4_1_eu_nexus", op: "eq", value: "yes" }, { q: "q4_1_eu_nexus", op: "unsure" }] }] }` (per the Task 1.3 convention: `in`/`eq` never match the unsure state — uncertainty is matched via `op:"unsure"`).
- [ ] **Q4.3 ground segment — OUTSOURCING FIX (§7.2):** quick variant single-select, NOT Y/N:

```ts
unsureMode: "option", // "I'm not sure" rendered via unsureMode, stored {state:"unsure"}
options: [
  { value: "own", label: "We operate our own ground stations / TT&C / mission control" },
  { value: "outsourced", label: "We use third-party ground-segment services (GSaaS — e.g. KSAT, AWS)" },
  { value: "none", label: "No ground-segment use" },
]
// why: "NIS2 Annex I 'Space' attaches to the infrastructure OPERATOR ('own').
// 'Outsourced' produces a supply-chain finding instead — the two outcomes
// differ legally and a Y/N cannot represent either (§7.2)."
// FULL tier follow-up q4_3b_ground_countries (country_multi) showIf own|outsourced.
```

- [ ] **Q4.10 — NEW: on-orbit transfer / change of control (§7.2 MUST-ADD):**

```ts
{
  id: "q4_10_transfer_change_of_control", section: "jurisdiction_market", tier: "full", kind: "single",
  title: "Is an acquisition, sale or transfer of in-orbit assets — or a change of control of your organisation — planned or underway?",
  why: "FR LOS, UK OSA/SIA and NL law require authorisation/consent for transfers of space objects or operator control; the EU proposal also touches transfer. Without this, a pending deal is invisible to the verdict (§7.2).",
  citation: [
    { label: "French Space Operations Act", citation: "Loi n° 2008-518 (LOS) — transfer authorisation", asOf: "2008-06-03", verified: true },
    { label: "UK Space Industry Act 2018 / Outer Space Act 1986", citation: "licence transfer consent", asOf: "2018-03-15", verified: true },
  ],
  unsureMode: "option",
  options: [
    { value: "transfer_out", label: "Sale / transfer of in-orbit assets planned or underway" },
    { value: "acquisition", label: "Acquisition of in-orbit assets planned or underway" },
    { value: "change_of_control", label: "Change of control of our organisation planned or underway" },
    { value: "no", label: "No" },
  ],
  showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
}
```

- [ ] Q1.1 roles: 10 options per §4 — ensure `component_supplier` is a role value (kills the §7.2 orphaned-branch problem ahead of Q9.5). Q5.x: only Q5.1 + Q5.2 (Q5.3 CUT — its content becomes roadmap copy in Task 3.2).
- [ ] Run: `npx vitest run src/data/assessment/question-graph.test.ts` — green.
- [ ] Commit: `feat(assessment): question graph sections 1-5 with §7 corrections inlined`

## Task 1.6 — Question-graph dataset, sections 6–10 + quick-tier arithmetic

**Files:** Modify `src/data/assessment/question-graph.ts`; Modify test `src/data/assessment/question-graph.test.ts`

Transcribe unaffected §4 questions faithfully (Q6.3, Q6.5, Q6.7, Q7.1–Q7.3, Q8.1, Q8.2, Q9.1–Q9.4, Q9.6, Q10.2) with `unsureMode: "option"` wherever the spec lists unsure — same rule as Task 1.5. The §7-affected and NEW entries below are BINDING — implement exactly these shapes:

- [ ] Failing tests first: (a) **quick-tier arithmetic closes (§7.3):** `countScreens(visibleQuestions(graph, "quick", euSpacecraftOperatorAnswers)) <= 14` and `<= 15` for a third-country profile — SCREENS, not nodes: the two `q1_5_size` nodes count as one screen (Task 1.4 `countScreens`); the §7.3 trims hold (Q1.4 fold, Q1.7 → full, quick-Q7.1 derived from role+lifecycle so NOT in quick); (b) `q6_6_battery` has exactly 10 items including `management_body_accountability`; (c) `q6_1` Yes-option routing marker present; (d) `q6_2` citation does NOT contain `"2(2)(f)"`; (e) `q9_5` showIf references only role values that exist in `q1_1_roles` options; (f) `q9_7` exists; (g) `q6_8` exists; (h) NO question with id `q8_3` or `q3_5`; (i) `q6_4_ms_transpositions` exists, its `derivedFrom` ids all exist in the graph, and its citations include the DE NIS2UmsuCG source.
- [ ] **Q6.1 ECN — GATE FIX (§7.2/§7.4):**

```ts
{
  id: "q6_1_public_ecn", section: "nis2_gateway", tier: "full", kind: "single",
  title: "Are you a public electronic-communications network or service provider?",
  why: "NIS2 Annex I 'Space' explicitly EXCLUDES public ECN providers (covered under other NIS2 sectors). A Yes answer routes to 'in scope under another NIS2 sector — outside this tool's space-sector scope' — NEVER to a clean 'NIS2 does not apply' (§7.2 gate fix). Unsure rounds up to needs-clarification.",
  citation: [{ label: "NIS2 Directive", citation: "Directive (EU) 2022/2555 Annex I, Sector 11 (Space)", asOf: "2022-12-27", verified: true }],
  unsureMode: "option", // unsure → needs-clarification (gateway), stored {state:"unsure"}
  options: [
    { value: "yes", label: "Yes — we provide public electronic-communications networks/services" },
    { value: "no", label: "No" },
  ],
  showIf: { q: "q4_3_ground_segment", op: "eq", value: "own" },
}
```

- [ ] **Q6.2 designation — CITATION FIX (§7.1 #5):** id `q6_2_ms_designation` (referenced by Q6.4 + Q6.8 showIf); `why` cites `"NIS2 Art. 2(2)(b)–(e) + final subparagraph (member-state identification list); CER-critical entities enter via Art. 2(3) / Art. 3(1)(f)"` with comment `// NOT Art 2(2)(f) — that is public administration (§7.1)`. Options yes/no with `unsureMode: "option"`; unsure → named "clarify with your NCA" flag (gateway, Task 1.7).
- [ ] **Q6.4 — member-state transposition list (spec §4, auto-derived, confirm-only):**

```ts
{
  id: "q6_4_ms_transpositions", section: "nis2_gateway", tier: "full", kind: "country_multi",
  title: "Member states where your NIS2-relevant services are provided",
  why: "Selects WHICH national transposition applies — registration duties, deadlines and sanctions differ per member state (DE NIS2UmsuCG in force 6 Dec 2025 → BSI; transposition state varies across the EU27 — 19 MS received reasoned opinions May 2025). Pre-filled from your establishment, ground-station countries and EU service markets; you confirm or edit the list (§4 Q6.4).",
  citation: [
    { label: "German NIS2 transposition (in force, BSI competent)", citation: "NIS2UmsuCG", asOf: "2025-12-06", verified: true },
    { label: "NIS2 Directive", citation: "Directive (EU) 2022/2555 Art. 41 (transposition)", asOf: "2022-12-27", verified: true },
  ],
  unsureMode: "none", // derived confirm/edit list — uncertainty is expressed by editing, not by an unsure state
  derivedFrom: ["q1_2_establishment", "q4_3b_ground_countries", "q4_1_eu_nexus"],
  showIf: { any: [
    { q: "q6_2_ms_designation", op: "eq", value: "yes" },
    { q: "q1_5_headcount", op: "in", value: ["h_50_249", "h_250_plus"] },
    { q: "q1_5_turnover", op: "in", value: ["t_10_50m", "t_gt_50m"] },
    { q: "q4_3_ground_segment", op: "eq", value: "own" },
  ]}, // = NIS2 potentially in scope
}
```

The confirmed list feeds `NIS2GatewayResult.transpositions` (Task 1.7) — the computed source for the §6 verdict-header "(DE transposition)" element rendered in Task 3.3.

- [ ] **Q6.6 battery — 10 items (§7.2 adds Art 20):** model as ONE node with `items` extension (add optional `items?: { id: string; label: string }[]` to `QuestionNode` and `kind: "battery"`); item ids: `risk_assessment, incident_detection_reporting_chain, business_continuity, supply_chain, cryptography, access_control_identity, security_training, vulnerability_management, ttc_link_protection, management_body_accountability` — last one cited `NIS2 Art. 20` (board approval, oversight, training, personal liability). Per-item statuses: `evidenced | undocumented | partial | missing | unsure`.
- [ ] **Q6.8 — NEW: NIS2 registration status (§7.2 MUST-ADD):**

```ts
{
  id: "q6_8_nis2_registration_status", section: "nis2_gateway", tier: "full", kind: "single",
  title: "Are you registered with the national NIS2 authority in each member state where you are classified?",
  why: "Classification without registration status hides the single most urgent live deadline: in Germany the BSI registration duty applies WITHOUT transition since 6 Dec 2025 (NIS2UmsuCG). The roadmap cannot show this deadline unless asked (§7.2).",
  citation: [
    { label: "German NIS2 transposition (in force, BSI competent)", citation: "NIS2UmsuCG — registration duty", asOf: "2025-12-06", verified: true },
    { label: "NIS2 Directive", citation: "Directive (EU) 2022/2555 Art. 3(3)–(4)", asOf: "2022-12-27", verified: true },
  ],
  unsureMode: "option",
  options: [
    { value: "registered_all", label: "Registered in every member state where classified" },
    { value: "partial", label: "Registered in some, not all" },
    { value: "not_registered", label: "Not registered anywhere" },
  ],
  showIf: { any: [
    { q: "q6_2_ms_designation", op: "eq", value: "yes" },
    { q: "q1_5_headcount", op: "in", value: ["h_50_249", "h_250_plus"] },
    { q: "q1_5_turnover", op: "in", value: ["t_10_50m", "t_gt_50m"] },
  ]},
}
```

- [ ] **Q7.4 — generalized launch-site environmental assessment (§7.2):** title "Is a launch-site / mission environmental assessment prepared or planned?"; `why` covers UK CAA AEE (statutory test, fit for public consultation) AND FR/SE/NO launch-site EIA obligations; finding text branches per jurisdiction nexus. Define the shared condition once and reuse it (also for Q2.12's "any UK nexus"):

```ts
export const UK_NEXUS: Condition = {
  any: [
    { q: "q1_2_establishment", op: "eq", value: "uk" },
    { q: "q4_4_licenses_held", op: "includes", value: "uk_sia_osa" },
    { q: "q4_5_considered_jurisdictions", op: "includes", value: "uk" },
    { q: "q4_3b_ground_countries", op: "includes", value: "uk" },
  ],
}; // Task 1.5's Q4.4/Q4.5 transcription MUST use these ids + option values.
// Q2.12 (Task 1.5) inlines this same condition; swap it to the shared const in this task.
```

`showIf: { any: [ UK_NEXUS, { q: "q1_1_roles", op: "includes", value: "launch_site_operator" } ] }`.

- [ ] **Q9.5 — orphan fix (§7.2):** `showIf: { any: [{ q: "q1_1_roles", op: "includes", value: "component_supplier" }, { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" }, { q: "q1_1_roles", op: "includes", value: "launch_operator" }] }` — no phantom "manufacturer" role. Note Sept 2025 'mission equipment' expansion in `why` (Delegated Reg. (EU) 2025/2003).
- [ ] **Q9.7 — NEW: EU sanctions (§7.2 MUST-ADD):**

```ts
{
  id: "q9_7_sanctions_screening", section: "spectrum_export", tier: "full", kind: "single",
  title: "Do you screen customers and end-users against EU sanctions lists — and do you supply items subject to the Russia/Belarus space-sector embargoes?",
  why: "EU restrictive measures embargo space-sector items to Russia/Belarus and require end-user screening — in 2026 the highest-frequency export risk for European space supply chains; ITAR/EAR/dual-use questions do not cover it (§7.2).",
  citation: [
    { label: "EU restrictive measures (Russia)", citation: "Council Reg. (EU) 833/2014 as amended — space-sector export restrictions", asOf: "2024-12-16", verified: true },
    { label: "EU restrictive measures (Belarus)", citation: "Council Reg. (EC) 765/2006 as amended", asOf: "2024-06-29", verified: true },
  ],
  unsureMode: "option",
  options: [
    { value: "screening_in_place", label: "Yes — systematic sanctions/end-user screening in place" },
    { value: "partial", label: "Partial — ad-hoc screening only" },
    { value: "none", label: "No screening" },
  ],
}
```

- [ ] Q8: Q8.1 (quick) + Q8.2 (full) per §4; **NO Q8.3** — the launching-State indemnification advisory is emitted unconditionally from Q4.8 facts (pipeline, Task 1.9). Q9.1–Q9.4, Q9.6 per §4. Q10.1 = review step config (`kind: "review"` sentinel handled by wizard, not a question). Q10.2 = living-tier trigger opt-in, `tier: "full"`.
- [ ] **NO Q3.5** (cut §7.3): brightness becomes a pipeline ADVISORY from constellation tier + orbit with `verified: false` citation (Task 1.9) — the Art 72 / magnitude-7 figure is UNVERIFIED (§7.1 #8) and must not ship as a cited mandate.
- [ ] Export `QUESTION_GRAPH: readonly QuestionNode[]` + `QUESTION_IDS: ReadonlySet<string>`.
- [ ] Run: `npx vitest run src/data/assessment/question-graph.test.ts` — green (incl. the arithmetic test).
- [ ] Commit: `feat(assessment): question graph sections 6-10, new clusters, quick-tier arithmetic`

## Task 1.7 — NIS2 gateway extension (4th state + §7.1 corrections)

**Files:** Create `src/lib/assessment/nis2-gateway.server.ts`; Test `src/lib/assessment/nis2-gateway.server.test.ts`. (Legacy `classifyNIS2Entity` in `src/lib/nis2-engine.server.ts` stays untouched until Phase 4 — its Rule 4 encodes the Art 26 misreading and is retired with the legacy wizards, not silently changed under them.)

- [ ] Failing tests first (the correction suite):
  - **needs_clarification is first-class:** missing size bands → `needs_clarification`, NEVER `out_of_scope` ("insufficient data is never 'does not apply'").
  - **AND-condition essential (§7.1 #4):** headcount 50–249 + turnover >€50M + balance sheet ≤€43M → `important` (NOT essential). Headcount ≥250 → essential. Turnover >€50M + balance sheet unsure → essential-presumed with `verifyNote` (conservative larger reading, monotonic round-up).
  - **Group aggregation:** partOfGroup yes + group bands large → classification from GROUP bands; partOfGroup unsure → round up + verify flag.
  - **Designation (§7.1 #5):** designated yes → in scope regardless of size, citation `Art. 2(2)(b)–(e)`; designated unsure → `needs_clarification` with "clarify with your NCA" — never a silent No.
  - **Art 2(2)(b)–(e) exceptions:** below caps + soleProvider yes → in scope; unsure → `needs_clarification`.
  - **ECN routing (§7.2 gate fix):** publicECN yes → result carries `routedToOtherSector: true` with reason "in scope under another NIS2 sector — outside this tool's space-sector scope"; classification is NOT `out_of_scope`.
  - **Non-EU correction (§7.1 #3):** non-EU established + no EU ground infra → `out_of_scope` with reason stating NIS2 space-sector jurisdiction follows establishment (Art 26(1) chapeau) and that NO Art 26 representative path exists for space operators; non-EU + EU-country ground stations → `needs_clarification` (establishment analysis required). NO path returns "important via Art 26".
  - **Annex I attachment:** ground segment `outsourced` → NOT Annex-I-space via ground infra; emits `supplyChainFinding: true` instead.
  - **Member-state transpositions (Q6.4):** `nis2ServiceStates: ["de", "fr"]` → `transpositions` contains `{ state: "de", actName: "NIS2UmsuCG", inForce: "2025-12-06", status: "in_force" }` and `{ state: "fr", actName: null, inForce: null, status: "unverified" }` — an act name is NEVER guessed for a state missing from `MS_TRANSPOSITIONS`; `nis2ServiceStates: []` (not asked) → `transpositions: []`.
  - **Monotonicity property test:** for a fixed in-scope profile, flipping any single answered input to `unsure` never moves classification toward `out_of_scope`.
- [ ] Implement:

```ts
// src/lib/assessment/nis2-gateway.server.ts
import "server-only";

export type NIS2GatewayClassification =
  | "essential"
  | "important"
  | "out_of_scope"
  | "needs_clarification";

// The "unsure" literals below are ADAPTER OUTPUT produced by gatewayInputFromAnswers
// from stored {state:"unsure"} answers (Task 1.3 convention) — never stored values.
export interface NIS2GatewayInput {
  // all fields tri-state-capable; built from the AnswerMap
  establishedInEU: boolean | "unsure";
  euGroundStationCountries: string[]; // from q4_3b; [] when none/not asked
  groundSegment: "own" | "outsourced" | "none" | "unsure";
  publicECNProvider: boolean | "unsure" | null; // null = not asked (branch hidden)
  headcountBand:
    | "h_1_9"
    | "h_10_49"
    | "h_50_249"
    | "h_250_plus"
    | "unsure"
    | null; // q1_5_headcount
  turnoverBand:
    | "t_lt_2m"
    | "t_2_10m"
    | "t_10_50m"
    | "t_gt_50m"
    | "unsure"
    | null; // q1_5_turnover
  balanceSheetBand: "bs_le_10m" | "bs_le_43m" | "bs_gt_43m" | "unsure" | null;
  partOfGroup: boolean | "unsure" | null;
  groupHeadcountBand?: NIS2GatewayInput["headcountBand"];
  groupTurnoverBand?: NIS2GatewayInput["turnoverBand"];
  designatedByMemberState: boolean | "unsure" | null;
  soleProviderOrSocietalCritical: boolean | "unsure" | null;
  nis2ServiceStates: string[]; // from q6_4 confirmed list; [] when not asked
}

/** §4 Q6.4: which national transposition applies — honest per-MS state. */
export interface MSTransposition {
  state: string; // lowercase country code, e.g. "de"
  actName: string | null; // null when status is "unverified"
  inForce: string | null; // ISO date | null
  status: "in_force" | "unverified"; // "unverified" renders "transposition status unverified"
}

/** Small static dataset — grows via the deep-research rulebook process (§11 governance).
 *  ONLY web-verified entries get an act name; everything else is honestly unverified. */
export const MS_TRANSPOSITIONS: Record<
  string,
  Omit<MSTransposition, "state">
> = {
  de: { actName: "NIS2UmsuCG", inForce: "2025-12-06", status: "in_force" },
  // all other MS deliberately absent → status "unverified" (NEVER guess an act name)
};

export interface NIS2GatewayResult {
  classification: NIS2GatewayClassification;
  reason: string;
  citation: FindingSource[]; // §7.1-corrected cites only
  verifyNotes: string[]; // e.g. "confirm group figures", "confirm balance sheet"
  routedToOtherSector: boolean; // ECN yes — never rendered as "NIS2 does not apply"
  supplyChainFinding: boolean; // outsourced ground segment
  clarificationsNeeded: { questionId: string; whatItWouldChange: string }[];
  transpositions: MSTransposition[]; // per Q6.4-confirmed MS; source for the §6 verdict-header "(DE transposition)" element (Task 3.3)
}

export function classifyNIS2Gateway(input: NIS2GatewayInput): NIS2GatewayResult;
export function gatewayInputFromAnswers(answers: AnswerMap): NIS2GatewayInput;
```

- [ ] Rule order (document in JSDoc, mirroring the legacy engine's style): 1 ECN-routing → 2 non-EU establishment analysis → 3 MS designation (incl. unsure→needs_clarification) → 4 size classification with balance-sheet AND-condition + group aggregation (unsure→round up) → 5 Art 2(2)(b)–(e) exceptions below caps → 6 needs_clarification for any decisive null/unsure → 7 (always, classification-independent) `transpositions` = `nis2ServiceStates` mapped through `MS_TRANSPOSITIONS`, absent states → `status: "unverified"`.
- [ ] Run: `npx vitest run src/lib/assessment/nis2-gateway.server.test.ts` — green.
- [ ] Commit: `feat(assessment): nis2 gateway with needs-clarification state and §7 corrections`

## Task 1.8 — Applicability gates + real light-regime eligibility + engine-JSON citation pass

**Files:** Create `src/lib/assessment/applicability-gates.server.ts`, `src/lib/assessment/regime-eligibility.server.ts`; Modify `src/data/caelex-eu-space-act-engine.json` (bounded); Tests `src/lib/assessment/applicability-gates.server.test.ts`, `src/lib/assessment/regime-eligibility.server.test.ts`

- [ ] Failing gate tests first: defense `exclusively_defense` → hard out-of-scope citing Art 2(3), `DETERMINED`; `dual_use` → in scope + noted finding; `unsure` → in scope presumed + clarification entry. Launch-timing `all_before` → **soft** out-of-scope-likely verdict, `PROBABLE`, fluxFlag with the three date positions + edge-case caveat (§7.1 #7 — NOT a hard unqualified gate); `some_or_all_after`/`unsure` → in scope. Non-EU + EU-nexus `no` → honest cited out-of-scope; nexus `unsure` → in-scope-presumed with verify flag (§4 Q4.1).
- [ ] Implement:

```ts
// src/lib/assessment/applicability-gates.server.ts
import "server-only";

export type GateOutcome =
  | { kind: "in_scope"; notes: AssessmentFinding[] } // dual-use note etc.
  | { kind: "out_of_scope"; finding: AssessmentFinding } // DETERMINED, hard
  | { kind: "out_of_scope_likely"; finding: AssessmentFinding }; // PROBABLE + fluxFlag, soft (launch timing)

export function evaluateApplicabilityGates(
  answers: AnswerMap,
  rulebookVersion: string,
): GateOutcome;
```

- [ ] Failing regime tests first: org_type research → `eligible` (Art 10); small bands + group `no` → `eligible` with reasoning chain; small bands + group `yes` + group bands large → `not_eligible`; small bands + group unsure or balance sheet unsure → `likely_eligible_verify`; quick tier (group question not asked) → `likely_eligible_verify` with note "regime direction pending group verification" (§7.3 trim semantics — never a silent eligible).
- [ ] Implement:

```ts
// src/lib/assessment/regime-eligibility.server.ts
import "server-only";

export type RegimeEligibility =
  | "eligible"
  | "likely_eligible_verify"
  | "not_eligible";
export interface RegimeResult {
  eligibility: RegimeEligibility;
  reasoning: { step: string; basis: string }[]; // the shown reasoning chain (§5 stage 3)
  finding: AssessmentFinding<RegimeEligibility>;
}
export function determineLightRegime(
  answers: AnswerMap,
  tier: "quick" | "full",
  rulebookVersion: string,
): RegimeResult;
```

- [ ] **Bounded JSON citation pass (§7.1 #9):** grep `caelex-eu-space-act-engine.json` for `medium_constellation|large_constellation|mega_constellation` and constellation tier LABEL strings; align naming to the proposal's tiers — 10–99 `constellation`, 100–999 `mega_constellation`, 1000+ `giga_constellation` (numeric bands already match — labels/keys only). Then grep for `"1 January 2030"` framing and ensure each occurrence carries the "subject to legislative adoption" qualifier. Do NOT touch `applies_to`/`excludes`/article content. Update `getConstellationTier()` in `src/lib/engine.server.ts` to emit the new tier keys/labels and add a label-compat map for previously stored results (old keys still render).
- [ ] Run: `npx vitest run src/lib/assessment/applicability-gates.server.test.ts src/lib/assessment/regime-eligibility.server.test.ts src/lib/engine.server.test.ts` (the existing engine tests must stay green).
- [ ] Commit: `feat(assessment): server gates, real light-regime eligibility, constellation tier citation pass`

## Task 1.9 — Verdict pipeline skeleton + full-tier calculate route

**Files:** Create `src/lib/assessment/verdict-pipeline.server.ts`, `src/app/api/assessment/v2/calculate/route.ts`; Tests `src/lib/assessment/verdict-pipeline.server.test.ts`, `src/app/api/assessment/v2/calculate/route.test.ts`

- [ ] Failing pipeline tests first:
  - ordering: NIS2 gateway runs BEFORE the Space Act engine (assert via injected spies/ordering log) — §5 stage 2; the cyber-cluster routing finding ALWAYS carries the `cyberArchitecture` fluxFlag (§7.1 #2 — the routing itself is contested, not the silent default).
  - empty `answers` → throws `SubmissionInvalidError` listing missing questions (invariant 3).
  - defense-only → out-of-scope result with zero cluster findings and the cited gate finding.
  - multi-role: roles `[spacecraft_operator, launch_operator]` → `calculateCompliance` invoked per role and merged via the EXISTING `mergeMultiActivityResults`.
  - **no fabricated findings:** a profile with no cross-engine overlaps → `crossFrameworkOverlaps: []` and a `noneIdentified: true` marker (invariant 4).
  - **launching-State advisory (Q8.3 cut):** Q4.8 answered → indemnification advisory emitted unconditionally; Q4.8 not asked → absent.
  - **cislunar advisory (§7.2):** orbit includes `cislunar_beyond` → planetary-protection advisory finding (OST Art IX / COSPAR policy + UN NPS Principles citations).
  - **brightness advisory (§7.1 #8):** constellation ≥10 + LEO → advisory with `verified: false` citation labeled "dark-and-quiet-skies mitigation — exact article/figure pending verification"; NO `Art 72` / `magnitude 7` strings.
  - **heterogeneous-fleet disclosure (§7.2):** multiple orbital regimes → `aggregationDisclosures` names the most-restrictive merge.
  - **national incident duties (§7.2 — incident cluster is NOT NIS2-only):** held FR license (Q4.4) → the incident cluster contains the FR LOS incident-notification finding (to the administrative authority/CNES, cited to Loi n° 2008-518) flagged per jurisdiction; UK held or considered (Q4.4/Q4.5) → the UK SIA/OSA occurrence-reporting finding (CAA) likewise; no FR/UK nexus → neither finding present (no fabricated national duties).
  - **evidence examples (§6 (2)):** a DETERMINED `applicable` finding in the `resilience_cyber` cluster carries non-empty `evidenceExamples` (from `CLUSTER_EVIDENCE_EXAMPLES`); INDETERMINATE findings carry none.
  - **UK fidelity flag (§3 [d]):** a UK-engine failure (mock it throwing) → the UK jurisdiction finding carries `fidelity: "degraded_generic_fallback"` and a visible caveat — never a silent generic result presented at full confidence.
  - result JSON has NO key matching `/score/i` (invariant 6) and carries `rulebookVersion`.
  - every finding in every cluster passes `isFindingComplete` (no incomplete envelope ships).
- [ ] Implement:

```ts
// src/lib/assessment/verdict-pipeline.server.ts
import "server-only";

export interface ObligationCluster {
  id: ClusterId;
  label: string;
  findings: AssessmentFinding[];
  counts: {
    applicable: number;
    conditional: number;
    contested: number;
    advisory: number;
  };
}

export interface UnknownToResolve {
  questionId: string;
  question: string;
  whatAnsweringChanges: string; // §6 (3): prioritized unknowns
  priority: "high" | "medium"; // spectrum-existential unknowns = high (§4 Q9.2)
}

export interface ObligationMapResult {
  rulebookVersion: string;
  computedAt: string;
  tier: "quick" | "full";
  scope: AssessmentFinding[]; // gate verdicts incl. dual-use notes
  nis2Gateway: AssessmentFinding<NIS2GatewayClassification>;
  regime: RegimeResult["finding"];
  clusters: ObligationCluster[];
  crossFrameworkOverlaps: {
    area: string;
    euSpaceActRef: string;
    nis2Ref: string;
  }[];
  noneIdentifiedOverlaps: boolean; // honest "none identified"
  unknowns: UnknownToResolve[];
  aggregationDisclosures: string[]; // heterogeneous-fleet most-restrictive notes
  contradictions: Contradiction[]; // non-empty blocks the verdict upstream
}

export class SubmissionInvalidError extends Error {
  constructor(public errors: SubmissionError[]) {
    super("assessment submission invalid");
  }
}

export async function runVerdictPipeline(input: {
  answers: AnswerMap;
  tier: "quick" | "full";
}): Promise<ObligationMapResult>;
```

Stages inside (per §5, with §7 amendments): (1) `validateSubmission` + `detectContradictions` → throw on errors; (2) `evaluateApplicabilityGates` — hard out-of-scope short-circuits with the cited finding, soft (`out_of_scope_likely`) short-circuits but keeps the flux scenario; (3) `classifyNIS2Gateway` FIRST; (4) `determineLightRegime`; (5) per-role `calculateCompliance(answersAdapter(role, answers), loadSpaceActDataFromDisk())` → `mergeMultiActivityResults`; (6) national space-law engines (`space-law-engine.server.ts`) for HELD (Q4.4) + CONSIDERED (Q4.5) jurisdictions — and the UK delegation failure becomes a VISIBLE fidelity flag on the jurisdiction findings (`fidelity: "degraded_generic_fallback"` rendered as a caveat), never a silent catch-and-fallback (§3 [d]); (7) cluster mapping — module statuses → clusters, PLUS: incident-reporting cluster (NIS2 24h/72h/1-month chain from the existing engine + Space Act occurrence-notification finding + ITU harmful-interference finding + **national-law incident-notification duties for held/considered jurisdictions from Q4.4/Q4.5 — FR LOS notification and UK SIA/OSA occurrence reporting at minimum, each emitted only on that jurisdiction's nexus and flagged per jurisdiction with the national act cited**, §7.2), export-control/sanctions cluster (Q9.4–Q9.7), transfer cluster (Q4.10), UN-registration (Q4.9), spectrum (Q9.1–Q9.3 — finally invoking `spectrum-engine.server.ts` requirements for in-scope RF users), insurance (national minimums per held/considered jurisdictions with named legal basis, NO fabricated "Art 48 TPL calculation"); during cluster mapping attach `evidenceExamples` to DETERMINED/PROBABLE findings from a `CLUSTER_EVIDENCE_EXAMPLES: Record<ClusterId, string[]>` const — short ENISA-style "what a supervisor would accept" examples per CLUSTER, not per question (e.g. `resilience_cyber`: board-approved risk-management policy, incident-response runbook covering the 24h/72h/1-month chain, access-control matrix; `debris_safety`: debris-mitigation plan submitted/approved, casualty-risk assessment, passivation design evidence; `authorization_registration`: national license/application reference, registry extract); (8) unknowns extraction from every `unsure`/clarification.

- [ ] Implement the route (account-gated, `assessment` rate-limit tier, Zod body `{ profileId: string }` — answers are read from the stored profile, never trusted from the client at calculate time): loads profile → runs pipeline → persists `AssessmentVerdictSnapshot{ profileVersion, tier: "FULL", rulebookVersion, result, unknownsCount }` → returns result. 422 with the named errors on `SubmissionInvalidError`.
- [ ] Run: `npx vitest run src/lib/assessment/verdict-pipeline.server.test.ts src/app/api/assessment/v2/calculate/route.test.ts` — green.
- [ ] Commit: `feat(assessment): verdict pipeline skeleton wiring gates, gateway and engines`

**PHASE 1 batch checkpoint:** 9 commits ≥ batch threshold. Run `npx tsc --noEmit` (no new errors) + `npx vitest run src/lib/assessment src/data/assessment` before any deploy. Deploy-safe: all additive.

---

# PHASE 2 — Quick-Check tier (deployable: new `/assessment/quick` alongside untouched legacy wizards)

## Task 2.1 — Profile API + anonymous carry-forward

**Files:** Create `src/app/api/assessment/v2/profile/route.ts`; Test `src/app/api/assessment/v2/profile/route.test.ts`

- [ ] Failing tests first: POST without session creates profile with `anonymousId` + sets httpOnly cookie `caelex_assessment_profile`; PATCH validates every answer with `buildAnswerMapSchema(QUESTION_IDS)` and bumps `version` only on material change; PATCH with foreign `anonymousId` → 404 (no enumeration); GET resumes by cookie or session; a signed-in POST with an anonymous cookie present CLAIMS the profile (`userId` set, `claimedAt` stamped, cookie cleared) — answers carry forward, never re-asked (§3 GOV.UK protocol).
- [ ] Implement route with `checkRateLimit(identifier, "assessment")`, Zod schemas, and the claim logic. No PII beyond answers; profile answers are never returned to a different identity.
- [ ] Run: `npx vitest run src/app/api/assessment/v2/profile/route.test.ts` — green.
- [ ] Commit: `feat(assessment): profile api with anonymous carry-forward and claim`

## Task 2.2 — Public quick-calculate endpoint

**Files:** Create `src/app/api/assessment/v2/quick/route.ts`; Test `src/app/api/assessment/v2/quick/route.test.ts`

- [ ] Failing tests first: `startedAt` is REQUIRED in the Zod schema (`z.number()` — not optional; omitting it is a 400, killing the decorative-bot-check class); submissions faster than 3s → 400; rate-limited via `assessment` tier; server re-validates visibility (`validateSubmission(graph, "quick", answers)`) so a payload answering hidden/full-tier questions is rejected — gates cannot be bypassed by direct API call; persists/updates the anonymous profile + a `QUICK` verdict snapshot; response is the `ObligationMapResult` quick projection (scope + regime direction + NIS2 gateway + cluster counts + top finding per cluster + unknowns count) with NO full finding bodies (quick tier shows counts + headlines, §6b).
- [ ] Implement `buildQuickProjection(result: ObligationMapResult)` in the pipeline module + the route.
- [ ] Run: `npx vitest run src/app/api/assessment/v2/quick/route.test.ts` — green.
- [ ] Commit: `feat(assessment): public quick-check calculate endpoint with enforced gates`

## Task 2.3 — Quick wizard UI + check-your-answers + forming counter

**Files:** Create `src/app/assessment/quick/page.tsx`, `src/components/assessment/spine/SpineWizard.tsx`, `WhyPanel.tsx`, `CheckYourAnswers.tsx`, `FormingCounter.tsx`; Test `src/components/assessment/spine/SpineWizard.test.tsx`

- [ ] Failing component tests first: renders only `visibleQuestions(graph, "quick", answers)` (same evaluator as the server — one source of truth); nodes sharing a `screenGroup` render on ONE screen (`q1_5_headcount` + `q1_5_turnover` appear together, Task 1.4 hint) and selecting the rendered "I'm not sure" choice PATCHes `{state:"unsure"}` — never an answered `"unsure"` value (Task 1.3 convention); every question shows the `why` panel content; `unsure` option always selectable where `unsureMode` provides it; Check-your-answers screen lists every answer with per-item Change links and the accuracy-responsibility statement and renders BEFORE submit (Q10.1 — mandatory step); contradictions from `detectContradictions` block submission with the named pair; FormingCounter shows "obligations identified so far: N" updating at section boundaries (TurboTax pattern, §6) — sourced from interim quick-calculate calls, never invented client-side.
- [ ] Build `SpineWizard` on the EXISTING kit: `QuestionStep`, `MultiSelectQuestionStep`, `OptionCard`, `ProgressBar`, Framer transitions — one thing per page; PATCH each answer to the profile API (server persistence, no localStorage); section-grouped progress.
- [ ] Run: `npx vitest run src/components/assessment/spine` — green.
- [ ] Commit: `feat(assessment): quick-check wizard on the question graph`

## Task 2.4 — Quick result page + email-gated PDF (real lead capture)

**Files:** Create `src/app/assessment/quick/results/page.tsx`, `src/components/assessment/spine/QuickResultPanel.tsx`, `src/lib/pdf/assessment/quick-summary.server.ts`, `src/app/api/assessment/v2/pdf/quick/route.ts`; Modify `src/app/api/assessment/lead/route.ts` (+ its test); Tests for PDF module + route

- [ ] Failing tests first: result panel renders scope verdict, regime DIRECTION ("likely light regime — verify group structure"), NIS2 gateway badge incl. an explicit `needs_clarification` rendering (never "does not apply" for that state), per-cluster counts + top finding, unknowns COUNT with full-tier CTA ("your N unknowns and M unassessed obligations" — §6b conversion); contested findings render the collapsed "contested — conservative reading shown" chip (founder §11.4); NO numeric overall score anywhere in the DOM (assert no `/\b\d{1,3}\s*\/\s*100\b/` and no "compliance score" text).
- [ ] Extend the lead route's Zod enum: `assessmentType: z.enum(["eu-space-act", "nis2", "space-law", "unified", "quick-check", "full"])` — reusing the hotfix's REAL capture (unchecked newsletter consent, honeypot, double-opt-in untouched).
- [ ] Implement `quick-summary.server.ts` with the verdict-dossier patterns (`src/lib/pdf/trade/verdict-dossier.server.ts` as reference): jsPDF server-side; rulebook stamp "Assessed against Caelex Rulebook v1.0.0" + source list with as-of dates; honest empties ("not provided" — never fabricated); SHA-256 of content bytes in the footer; the unknowns section; the short scope-limiting disclaimer (§6 (7) wording). PDF route: POST `{ profileId, email, company?, consentNewsletter? }` → persists the lead via the lead route logic → streams PDF. Email required for PDF, NOT for on-screen results (founder §11.2).
- [ ] Run: `npx vitest run src/lib/pdf/assessment src/app/api/assessment/v2/pdf src/app/api/assessment/lead` — green.
- [ ] Commit: `feat(assessment): quick result page and email-gated pdf summary`

**PHASE 2 non-goal (explicit):** the four legacy wizard URLs and `/assessment` picker are NOT redirected yet. `/assessment/quick` is reachable but unlinked from the picker until Phase 4 (optionally add a "new" card on the picker as the last step of 2.4 — copy only, no removals).

**PHASE 2 batch checkpoint:** 4 commits. `npx tsc --noEmit` + full new-test sweep before deploy.

---

# PHASE 3 — Full tier (deployable: `/assessment/full` behind account, legacy untouched)

## Task 3.1 — Account gate + resume + full-tier continuation wiring

**Files:** Create `src/app/assessment/full/page.tsx`; Modify `src/components/assessment/spine/SpineWizard.tsx` (tier prop already designed — wire `tier="full"`); Test `src/app/assessment/full/page.test.tsx`

- [ ] Failing tests first: unauthenticated visit → existing sign-in flow with `callbackUrl=/assessment/full` (free account — reuse the registration used by `AssessmentResultsGate`, NOT a new auth path); after sign-in with an anonymous quick profile cookie → profile claimed and quick answers PRE-FILLED (carry-forward assertion: a question answered in quick is rendered answered, with a Change affordance, and is NOT re-asked as blank); `currentSection` resume works server-side.
- [ ] Implement the page as a server component: session check → profile fetch/claim → render `SpineWizard tier="full"` with sections nav + resumability.
- [ ] Run: `npx vitest run src/app/assessment/full` — green.
- [ ] Commit: `feat(assessment): account-gated full tier with quick answer carry-forward`

## Task 3.2 — Readiness diff, credit map, roadmap modules

**Files:** Create `src/lib/assessment/readiness.server.ts`, `src/lib/assessment/credit-map.server.ts`, `src/lib/assessment/roadmap.server.ts`; Tests alongside each

- [ ] Failing tests first: readiness aggregates the Q6.6 battery (+ Q7.x debris statuses) per cluster as `{ evidenced: n, total: m }` bands — assert NO single overall number is exported (invariant 6); `unsure` battery item → counted as gap AND emitted into unknowns (§5 stage 5); credit map: ISO 27001 held → "Art 21 measure areas partially evidenced via ISO 27001 Annex A controls" entries + existing national license (Q4.4) → brownfield credits; roadmap: deadline-ordered from Q5.2 key dates + lifecycle phase + NIS2 registration status (Q6.8 — DE BSI duty surfaces as an immediate item when DE nexus + not registered) + the contested-timeline scenario DATA (rendered collapsed on screen, full table in PDF appendix only); pre-application-engagement copy ("UK CAA and CNES practice reward early engagement") appears as roadmap COPY, not a question (Q5.3 cut, §7.3).
- [ ] Implement:

```ts
export interface ClusterReadiness {
  clusterId: ClusterId;
  evidenced: number;
  undocumented: number;
  partial: number;
  missing: number;
  unsure: number;
  total: number;
}
export function computeReadiness(
  answers: AnswerMap,
  clusters: ObligationCluster[],
): ClusterReadiness[];

export interface CreditMapping {
  source: string;
  covers: string[];
  basis: string;
} // "ISO 27001" → measure areas
export function computeCreditMap(answers: AnswerMap): CreditMapping[];

export interface RoadmapItem {
  due: string | "contested";
  action: string;
  basis: FindingSource[];
  fluxFlag?: FluxFlag;
}
export function computeRoadmap(
  answers: AnswerMap,
  result: ObligationMapResult,
): RoadmapItem[];
```

- [ ] Wire all three into `runVerdictPipeline` for `tier === "full"` (extend `ObligationMapResult` with optional `readiness`, `creditMap`, `roadmap`).
- [ ] Run: `npx vitest run src/lib/assessment/readiness.server.test.ts src/lib/assessment/credit-map.server.test.ts src/lib/assessment/roadmap.server.test.ts src/lib/assessment/verdict-pipeline.server.test.ts` — green.
- [ ] Commit: `feat(assessment): readiness bands, credit map and dated roadmap`

## Task 3.3 — Full obligation-map result page

**Files:** Create `src/app/assessment/full/results/page.tsx`, `src/components/assessment/spine/FindingCard.tsx`, `ClusterSection.tsx`, `UnknownsList.tsx`, `JurisdictionMatrix.tsx`; Tests for FindingCard + JurisdictionMatrix

- [ ] Failing tests first: `FindingCard` REFUSES to render a finding failing `isFindingComplete` (renders the named-missing-fields fallback — the ExplainedPanel refusal pattern); renders verdict badge, one-line obligation, citation + as-of, the why-trace ("because you answered: …"), flux chip collapsed by default with expand, and — when `evidenceExamples` is present — the "evidence a supervisor would accept" list (§6 (2), full tier); verdict header shows scope + regime reasoning chain + the rulebook stamp pinned to the SEMVER with sources in an expandable appendix block (§7.3: pin to semver, not to named moving texts); the verdict header's NIS2 element renders the §6 "(DE transposition)" suffix FROM `nis2Gateway.transpositions` (Q6.4-derived, Task 1.7) — `status: "in_force"` states render the act name ("NIS2 important entity (DE transposition — NIS2UmsuCG)"), `status: "unverified"` states render "transposition status unverified", and the suffix is absent when `transpositions` is empty — never a hardcoded member-state string; `JurisdictionMatrix` is the FACTUAL 10-criterion comparison (timeline, insurance requirement as stated in law, indemnification, fees) with NO 0–100 favorability number and NO "recommended jurisdiction" line (founder default — favorability score replaced); `UnknownsList` is prioritized with "what answering it would change".
- [ ] Page layout per §6: (1) verdict header, (2) obligation map by cluster, (3) unknowns, (4) credit map, (5) roadmap, (6) jurisdiction comparison (only when Q4.5 answered), (7) short disclaimer at point of action + full text one click away.
- [ ] Run: `npx vitest run src/components/assessment/spine` — green.
- [ ] Commit: `feat(assessment): full obligation-map result page with envelope renderer`

## Task 3.4 — Lawyer-grade PDF dossier + JSON export

**Files:** Create `src/lib/pdf/assessment/obligation-dossier.server.ts`, `src/app/api/assessment/v2/pdf/dossier/route.ts`; Tests alongside

- [ ] Failing tests first: dossier bytes contain (string-assert on extracted text): the rulebook semver + every source label with as-of date; the FULL check-your-answers echo (every answer incl. `unsure`/`not_asked` states — counsel can verify line by line); per-finding citations; the accuracy-responsibility statement; the three-text scenario tables (application date × CDR window × cyber architecture) in the APPENDIX (founder §11.4 — PDF appendix is the only full-matrix surface); a SHA-256 attestation of the document's own content bytes; NO overall score string. Route: account-gated, `export` rate-limit tier, profile ownership enforced. JSON export = the stored `AssessmentVerdictSnapshot.result` + answers echo + rulebook block, same ownership gate.
- [ ] Implement following `verdict-dossier.server.ts` composition style (READ-ONLY substrate composition — computes nothing new; re-states the stored snapshot).
- [ ] Run: `npx vitest run src/lib/pdf/assessment src/app/api/assessment/v2/pdf` — green.
- [ ] Commit: `feat(assessment): exportable obligation dossier pdf and json`

## Task 3.5 — Save-to-dashboard on the SINGLE engine result (kill dual-dataset drift)

**Files:** Modify `src/app/api/tracker/import-assessment/route.ts`, `src/app/api/unified/save-to-dashboard/route.ts`; Tests for both routes

- [ ] Failing tests first: importing from a verdict snapshot writes `ArticleStatus`/`ChecklistStatus` rows derived from the SNAPSHOT's `applicableArticles` (the engine result the user saw) — `src/data/articles.ts` is NOT consulted (assert no import of `@/data/articles` in the new code path via a unit test on the extraction function); unknown activity labels are a 400, never silently defaulted to `SCO`; the legacy request shape (no snapshot id) keeps working unchanged for old stored results (back-compat assertion).
- [ ] Implement: new body variant `{ verdictSnapshotId: string }` → ownership check → extract articles/checklist from `snapshot.result` → upsert tracker rows. Extract the pure mapping into `src/lib/assessment/tracker-import.ts` for testability.
- [ ] Run: `npx vitest run src/app/api/tracker src/app/api/unified src/lib/assessment/tracker-import.test.ts` — green.
- [ ] Commit: `feat(assessment): dashboard import consumes the engine verdict snapshot`

## Task 3.6 — Full-tier save/CTA surfaces + conversion path

**Files:** Modify `src/app/assessment/quick/results/page.tsx` (full-tier CTA with the unknowns-gap pitch), Create `src/components/assessment/spine/SaveToDashboardButton.tsx`; Test alongside

- [ ] Failing tests first: quick→full CTA renders the gap framing from real counts ("your 9 unknowns and 31 unassessed obligations"); full results page exposes Save-to-dashboard calling Task 3.5's snapshot import; saved state reflected.
- [ ] Run: `npx vitest run src/components/assessment/spine` — green.
- [ ] Commit: `feat(assessment): conversion surfaces and dashboard save on full tier`

## Task 3.7 — Roadmap deadlines flow into the EXISTING timeline (§6b: "deadlines flow into the existing timeline/reminder infrastructure")

**Files:** Create `src/lib/assessment/roadmap-deadlines.server.ts`; Modify `src/app/api/tracker/import-assessment/route.ts` (the Task 3.5 snapshot path); Test `src/lib/assessment/roadmap-deadlines.server.test.ts`

- [ ] Failing tests first: a dated `RoadmapItem` (`due` is an ISO date, not `"contested"`) → one `Deadline` row with `userId`, `title` = the roadmap action, `dueDate`, `category: "REGULATORY"`, `priority: "HIGH"` when due ≤90 days else `"MEDIUM"`, `relatedEntityId` = `assessment:{profileId}:{stableItemKey}` (stable key = SHA-256 of `action` + first `basis` citation — survives re-computation); `due: "contested"` items create NO row (no fabricated dates, invariant 4); **idempotency:** running the upsert twice for the same snapshot creates no duplicates and updates `dueDate` in place (the schema has no compound unique on `Deadline`, so idempotency is find-by-`(userId, relatedEntityId)` → update, else create); reminder behaviour comes from the schema's `reminderDays` default `[30,14,7,3,1]` — the existing `/api/cron/deadline-reminders` infrastructure picks the rows up with ZERO new notification code.
- [ ] Implement:

```ts
// src/lib/assessment/roadmap-deadlines.server.ts
import "server-only";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import type { RoadmapItem } from "@/lib/assessment/roadmap.server";

/** Idempotent: keyed by (userId, relatedEntityId); Deadline has no compound unique. */
export async function upsertRoadmapDeadlines(
  userId: string,
  profileId: string,
  roadmap: RoadmapItem[],
): Promise<{ created: number; updated: number; skippedContested: number }> {
  // for each dated item: relatedEntityId = `assessment:${profileId}:${sha256(action + basis[0].citation).slice(0, 16)}`
  // findFirst({ where: { userId, relatedEntityId } }) → update { dueDate, title } : create
  // category: "REGULATORY", priority by due-distance, moduleSource: null (no ASSESSMENT ModuleType exists — do NOT extend the enum here)
}
```

- [ ] Wire into the Task 3.5 snapshot-import path: after tracker rows are written, call `upsertRoadmapDeadlines(userId, profileId, snapshot.result.roadmap ?? [])` — save-to-dashboard is the single trigger; no deadline rows are written at calculate time.
- [ ] Run: `npx vitest run src/lib/assessment/roadmap-deadlines.server.test.ts src/app/api/tracker` — green.
- [ ] Commit: `feat(assessment): roadmap deadlines upsert into the existing timeline`

**PHASE 3 batch checkpoint:** 7 commits. Full sweep `npx vitest run src/lib/assessment src/data/assessment src/components/assessment/spine src/app/api/assessment` + `npx tsc --noEmit` before deploy.

---

# PHASE 4 — Cutover (deployable: redirects flip, legacy retires, living tier activates)

## Task 4.1 — Redirect the four wizard URLs into the spine (SEO preserved)

**Files:** Modify `src/app/assessment/eu-space-act/page.tsx`, `nis2/page.tsx`, `space-law/page.tsx`, `unified/page.tsx`, `src/app/assessment/page.tsx` (picker → spine entry); Modify `src/app/sitemap.ts` (if present — verify via grep); Test `src/app/assessment/redirects.test.ts`

- [ ] Failing tests first: each legacy page issues a PERMANENT redirect to `/assessment/quick?preset=<section>` (`eu-space-act → space_act`, `nis2 → nis2_gateway`, `space-law → jurisdiction_market`, `unified → none/full entry`); preset pre-selects the section focus but NEVER skips the always-on gates (Q1.x identity + Q1.9 still asked — assert visibleQuestions unchanged by preset).
- [ ] Implement via `redirect()`/`permanentRedirect()` in the server components, preserving each page's `metadata` export so crawlers see the 308 + canonical. Update sitemap entries to the spine URLs.
- [ ] Run: `npx vitest run src/app/assessment/redirects.test.ts` — green.
- [ ] Commit: `feat(assessment): redirect legacy wizard urls into the spine with presets`

## Task 4.2 — Retire legacy question configs + legacy calculate paths

**Files:** Delete `src/lib/unified-assessment-questions.ts` + the standalone wizard question configs (locate the exact set first: `grep -rln "outOfScopeValue\|UnifiedQuestion" src/lib src/components/assessment`); Modify the legacy calculate routes (`src/app/api/assessment/calculate`, `src/app/api/nis2/calculate`, `src/app/api/space-law/calculate`, `src/app/api/unified/calculate`) to `410 Gone` with a JSON pointer to `/api/assessment/v2/*`; Tests on the 410s

- [ ] Before deleting: run the grep, list every importer, and migrate any type still needed by STORED-result rendering (dashboard "saved assessments" views) into a minimal `src/lib/assessment/legacy-result-types.ts` — stored verdicts must keep rendering forever.
- [ ] Failing tests first: legacy calculate routes return 410 with `{ moved: "/api/assessment/v2/quick" }`; no module in `src/` imports `unified-assessment-questions` (assert via a unit test on a generated import list or rely on `tsc` failing the build).
- [ ] Also retire the legacy `classifyNIS2Entity` Art-26 Rule 4 path from public exposure: with the standalone NIS2 wizard gone, mark the function `@deprecated — gateway in src/lib/assessment/nis2-gateway.server.ts is the corrected source of truth (§7.1 #3)`.
- [ ] Run: `npx vitest run src/app/api && npx tsc --noEmit` — green / no new errors.
- [ ] Commit: `refactor(assessment): retire legacy question configs and calculate routes`

## Task 4.3 — Living tier: change triggers + delta re-assessment + changed-findings diff

**Files:** Create `src/lib/assessment/assessment-delta.server.ts`, `src/lib/assessment/living-entitlement.server.ts`, `src/app/api/assessment/v2/reassess/route.ts`; Tests alongside

- [ ] Failing tests first: `diffVerdicts(prev, next)` returns `{ added: AssessmentFinding[], removed: AssessmentFinding[], changed: { before, after }[] }` keyed by `(cluster, citation, what)`; a rulebook bump (snapshot.rulebookVersion < RULEBOOK.version) flags the profile for re-assessment; a profile answer change touching a trigger category in `changeTriggers` (Q10.2 opt-in) produces a delta-reassessment of ONLY the affected sections (`affectedQuestions(changedAnswerIds)` walks `showIf` dependents — exception-based, Vanta pattern §6b); the diff message format matches "N findings changed" with per-finding before/after; notifications go through the EXISTING `Notification` model (no new notification infra).
- [ ] **Entitlement failing tests (founder §11.2 — the living tier is PAID):** POST `/api/assessment/v2/reassess` with a session whose org subscription is `plan: "FREE"` (the schema default), or has no `Subscription` row, or has `status: "CANCELED"` → **403** `{ error: "living_tier_required", upgrade: "/pricing" }`, NO new `AssessmentVerdictSnapshot` row is written, and `reassessProfile` is never invoked (spy); the same request with `plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE"` and `status: "ACTIVE"` or `"TRIALING"` → 200 with `{ snapshotId, delta }`.
- [ ] Implement the entitlement gate on the REAL billing record (no per-feature flag for this exists in `getPlanLimits()` yet, so gate on `Subscription.plan !== "FREE"` + a usable status):

```ts
// src/lib/assessment/living-entitlement.server.ts
import "server-only";
import { prisma } from "@/lib/prisma";

/** Founder §11.2: living tier is paid. Resolution path is the existing billing
 *  spine: OrganizationMember → Organization → Subscription (1:1, plan defaults FREE). */
export async function hasLivingTierEntitlement(
  userId: string,
): Promise<boolean> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: {
      organization: {
        select: { subscription: { select: { plan: true, status: true } } },
      },
    },
  });
  const sub = membership?.organization.subscription;
  return (
    !!sub &&
    sub.plan !== "FREE" &&
    (sub.status === "ACTIVE" || sub.status === "TRIALING")
  );
}
```

The route checks session → `hasLivingTierEntitlement(session.user.id)` BEFORE any profile load or pipeline work; non-entitled requests get the 403 upgrade payload, never a reassessment.

- [ ] Implement:

```ts
// src/lib/assessment/assessment-delta.server.ts
import "server-only";
export interface VerdictDelta {
  added: AssessmentFinding[];
  removed: AssessmentFinding[];
  changed: { before: AssessmentFinding; after: AssessmentFinding }[];
}
export function diffVerdicts(
  prev: ObligationMapResult,
  next: ObligationMapResult,
): VerdictDelta;
export function affectedQuestions(
  graph: readonly QuestionNode[],
  changedAnswerIds: string[],
): string[];
export async function reassessProfile(
  profileId: string,
  reason: "answer_change" | "rulebook_bump",
): Promise<{ snapshotId: string; delta: VerdictDelta }>;
```

- [ ] Run: `npx vitest run src/lib/assessment/assessment-delta.server.test.ts src/app/api/assessment/v2/reassess` — green.
- [ ] Commit: `feat(assessment): living-tier delta reassessment and findings diff`

## Task 4.4 — Rulebook version stamp surface + stale-verdict re-run CTA

**Files:** Modify `src/app/assessment/full/results/page.tsx`, `src/app/assessment/quick/results/page.tsx`; Create `src/components/assessment/spine/RulebookStamp.tsx`; Test alongside

- [ ] Failing tests first: every result surface renders `RulebookStamp` ("Assessed against Caelex Rulebook v{snapshot.rulebookVersion}" + expandable source list with as-of dates); when `snapshot.rulebookVersion !== RULEBOOK.version` a non-dismissable "the rulebook your verdict was computed against has changed — re-assess" banner renders; **the re-run CTA inside it is entitlement-gated (founder §11.2):** the results server component computes `livingEntitled = await hasLivingTierEntitlement(userId)` (Task 4.3) and passes it down — entitled → the re-run button wired to `/api/assessment/v2/reassess`; NOT entitled → an upgrade prompt ("Living assessment is a paid tier — upgrade to re-run against the new rulebook") linking to `/pricing` renders INSTEAD, with NO reassess call reachable from the DOM (this is the full→living conversion moment, §6b — the server-side 403 from Task 4.3 remains the enforcement backstop); PDF already stamps (Task 3.4) — assert consistency between screen stamp and stored snapshot value.
- [ ] Run: `npx vitest run src/components/assessment/spine` — green.
- [ ] Commit: `feat(assessment): rulebook stamp surface with stale-verdict rerun`

**PHASE 4 batch checkpoint:** 4 commits. Before THIS deploy additionally run the legacy-URL smoke (`npx vitest run src/app/assessment/redirects.test.ts`) and confirm `git grep -l "data/articles" src/app/api/tracker` shows the legacy path only in the back-compat branch.

---

## Final self-check (executor runs at the very end)

- [ ] `npx vitest run src/lib/assessment src/data/assessment src/components/assessment/spine src/app/api/assessment src/app/api/tracker` — all green.
- [ ] `npx tsc --noEmit` — no NEW errors vs. main.
- [ ] Grep guards: `git grep -nE "general approach|Art\.? ?75a" src/data/assessment src/lib/assessment` → empty; `git grep -niE "\bscore\b" src/lib/assessment src/components/assessment/spine` → only negated-invariant comments/tests; `git grep -n "magnitude" src/data/assessment src/lib/assessment` → only the pending-verification advisory; `git grep -n 'value: "unsure"' src/data/assessment` → empty (Task 1.3 binding convention — unsure is never an option value).
- [ ] Deploy per the batched policy: merge `feat/ultimate-assessment` → main, single push.
