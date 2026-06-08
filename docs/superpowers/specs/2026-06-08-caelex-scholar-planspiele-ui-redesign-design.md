# Caelex Scholar — Planspiele UI Redesign (Design Spec)

**Date:** 2026-06-08 · **Branch:** `feat/caelex-scholar` · **Status:** DESIGN for owner sign-off (Konzept vor Code)
**Goal:** Make the Planspiele UI a markedly stronger **learning aid** — more modern, clearer, "krasser" — **within Scholar's strict monochrome system** (white / gray / black only; no green/emerald, no functional accent colour). Owner chose **full scope (A+B+C+D)** + **strictly monochrome**.
**Scope rule:** Scholar-scoped (`src/app/(scholar)/scholar/planspiele/**`). No frozen-surface edits. **No scenario-data changes** (scaffolding is derived). No new Prisma. Reuse `SCHOLAR_TYPE`, existing Scholar primitives.

---

## 0. Principles

- **Monochrome = the constraint, not a limit.** "Krass" comes from confident typography, clear depth (elevation/borders), purposeful **motion**, and **learning scaffolding woven into the flow** — the Linear/Vercel/Bloomberg playbook, not colour.
- **Learning-forward.** Surface the objective, scaffold the task live, make the payoff land, tie everything to the cited law.
- **Derive, don't re-author.** Phase objectives + the live requirement checklist are computed from data we already have (`phase.rubric`, `phase.artifact`, `scenario.answerKey`). The 7 scenario files are **not** touched.
- **Motion is progressive.** `framer-motion` (already a dependency) lives only in client islands; everything respects `prefers-reduced-motion` and degrades to static.
- **Accessibility holds.** Focus-visible rings, aria, ≥24px targets, reduced-motion — same bar as the current build.

---

## 1. New shared primitives (`planspiele/_components/`)

| Component                  | Type   | Responsibility                                                                                                                                                                                          |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PhaseStepper.tsx`         | server | Named, numbered steps (Authority → Application → …) with done / current / upcoming states. Replaces the thin `PhaseProgress` bar. Monochrome: filled gray-900 = done/current, gray-300 ring = upcoming. |
| `RequirementChecklist.tsx` | client | Live "what this artifact needs" checklist, **derived** from the current phase (see §2.3). Ticks as the student fills the form. Pure derivation fn + presentational list.                                |
| `ScoreReveal.tsx`          | client | Animated count-up of a 0–100 score (framer-motion `useMotionValue`/spring), monochrome bar/ring. Reduced-motion → instant value.                                                                        |
| `ProgressBadge.tsx`        | server | Catalog status chip: `not started` / `in progress` / `completed · NN%`. Monochrome (filled vs outline).                                                                                                 |
| `scaffold.ts`              | pure   | `derivePhaseObjective(phase)` + `deriveRequirements(phase, answer)` — pure, unit-tested, shared by cockpit + tests. No DOM.                                                                             |

`scaffold.ts` is the load-bearing new logic and the only part with real tests.

---

## 2. A — Cockpit (`run/[runId]` + `Cockpit.tsx`)

The heart. Today: a flat 2-column grid (editor | corpus links). New: a **3-zone practice workspace**.

### 2.1 Layout

- **Top:** `PhaseStepper` (named steps) + the scenario title eyebrow.
- **Left context rail** (collapsible on mobile): a **role-identity chip** ("Du bist: _Satellite Operator_"), a collapsible **"Dein Dossier"** drawer = the student-role's `privateBriefKey`, and **"In dieser Phase bewertet:"** = the phase's rubric labels (so the student knows what's graded — pure scaffolding, no new data).
- **Center:** the artifact editor (unchanged field logic — `boolean|select|text` + free-text), more generous spacing + confident headings.
- **Right corpus rail:** upgraded — for each cited source, render a real **`ProvisionCard`-style excerpt** (title + official reference + a short summary/first-provision snippet) + the deep link, not just a bare link. Cases keep the link form.

### 2.2 Motion

- Phase advance: center column cross-fades (framer-motion), the stepper advances. Reduced-motion → no fade.
- Checklist items tick with a subtle scale/opacity transition.

### 2.3 The derived requirement checklist (`deriveRequirements`)

Computed from the current phase, updates on every keystroke:

- **authority_choice / application_form:** one item per `answerKey.allOf` field ("✓ Insurance included" once toggled) + one per required `select` ("Authority chosen", "Casualty band set"). Met = field present/truthy. _No correctness leak_ — it checks _presence_, not whether the answer is right (that's the graded reveal later).
- **cover_letter:** "≥ N provisions cited (k/N)" (reuse `countCitations`) + "Draft has substance" (min length).
- **deficiency_response:** "Revision written" + "Addresses the notice" (min length).
  Derivation is a pure function over `phase` + the live `answer` object; unit-tested.

### 2.4 Files

Modify `Cockpit.tsx` (layout + integrate the 3 primitives), `run/[runId]/page.tsx` (pass role/dossier/objective props + the richer CorpusRail). Upgrade `CorpusRail.tsx` to render excerpts. Replace `PhaseProgress` usage with `PhaseStepper`.

---

## 3. B — Results & Debrief (`debrief/page.tsx` + `ResultsPanel.tsx`)

Turn the score table into a payoff.

- **`ScoreReveal`** animates the per-phase % and an overall score header.
- **Model-answer comparison** per engine criterion: using `scenario.answerKey`, show **"Du: AGCOM · Muster: ASI"** inline (for `exactMatch`; for `allOf`, "3/4 Pflichtelemente"). AI criteria keep their coach note. This is the single biggest learning upgrade — the student sees _the right answer and why_, deep-linked to the source.
- **Debrief as a vertical timeline:** each phase a step — your artifact summary, the score, the model comparison, the governing corpus excerpt (deep-linked). Reuse the existing reflection form + export.
- Monochrome correctness: `Check` (gray-900) / `X` (gray-400) + bar fill — never hue.

Modify `ResultsPanel.tsx` (model comparison + ScoreReveal), `debrief/page.tsx` (timeline layout; it already recomputes both tracks server-side — pass the answerKey expected values down).

---

## 4. C — Catalog & Brief

### 4.1 Catalog (`planspiele/page.tsx`)

- Each card gets a **`ProgressBadge`** (from `listRunsForUser` status — already fetched), a **module chip** (`scenario.module`), and a difficulty glyph. Stronger card hierarchy + a motion stagger on load.
- Optional **group-by-module** headers so the catalog reads as an 8-module **curriculum**, not a flat list. (Default: grouped.)

### 4.2 Brief (`[id]/page.tsx`)

- Recompose as a **"Mission-Briefing"**: role identity front-and-centre, an **objectives list** (derived: the union of the scenario's phase rubric themes), the fiction-contract as a confident "Spielregeln" panel, a prominent start CTA. Same data, stronger layout + hierarchy.

---

## 5. D — Systemic polish

- **Elevation tiers** — a consistent monochrome card vocabulary (rest: `border-gray-200/70 shadow-sm`; hover: `border-gray-300 shadow-md`; active/selected: `border-gray-900`). Applied uniformly.
- **Typography & density** — bigger, more confident headings via the existing `SCHOLAR_TYPE` tokens; better vertical rhythm.
- **Motion** — list staggers, hovers, the score reveal; all reduced-motion-safe.

---

## 6. Build sequence (incremental, each shippable)

1. **Primitives + `scaffold.ts`** (PhaseStepper, RequirementChecklist, ScoreReveal, ProgressBadge) + unit tests for the pure derivations.
2. **Cockpit (A)** — the biggest learning lever.
3. **Results & Debrief (B)** — the payoff.
4. **Catalog & Brief (C)**.
5. **Polish pass (D)** — woven, final.

Deploy can happen after any step (all pure data/UI, no DB, no schema). The owner can stop between steps.

---

## 7. Testing

- **Pure logic** (`scaffold.ts`): `derivePhaseObjective` + `deriveRequirements` unit-tested across all artifact kinds (met/unmet, citation counts, presence-not-correctness).
- **Model comparison**: a unit test that the results builder pulls the right `answerKey` expected value per engine criterion.
- **tsc gate** per screen; **a11y**: focus-visible + reduced-motion + aria retained.
- No regression: the existing 45 planspiele tests stay green.

---

## 8. Non-goals / constraints

- **No colour** (strict monochrome). **No new scenario data** (all scaffolding derived). **No new Prisma / DB change.** **No frozen-surface edits.** No new artifact kinds. Keep the existing field/editor logic; this is a presentation + scaffolding upgrade, not an engine change.
