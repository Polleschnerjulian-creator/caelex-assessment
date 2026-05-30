# Caelex Trade — Ausfuhrvorgang-Assistent ("Darf ich liefern?")

**Status:** Design approved (2026-05-30) · **Surface:** Caelex Trade (branch `fix/trade-to-92`)
**Author:** Claude (Opus 4.8) with Julian Polleschner
**User bar:** "soll genial sein" — not just functional; it should _take the job off Klaus's plate_.

---

## 1. Problem & user

**Persona — Klaus, export-control officer at a ~40-person Bremen NewSpace company.** He is _not_ a full-time export lawyer; Compliance is ~20% of his COO role. His real fear: shipping without a required licence (§18 AWG = criminal liability), missing a BAFA deadline, or onboarding a sanctioned counterparty.

**The gap (observed in the live product):** the sidebar has **22 entity-organised tools** (Items, Counterparties, Pipeline, Licenses, Classify, EUC, Re-Export, VSD, Sammelgenehmigungen, France LOS, UK ECJU, FAA AST, Deemed Exports …). It is a complete toolbox organised like an ERP — by _data entity_, not by Klaus's _task_. Klaus doesn't think "I'll maintain an Item master record." He thinks: **"We want to ship component X to customer Y in country Z — am I allowed, and what must I do?"** That is ONE question, but the product forces him to decompose it himself into 4–5 tools in the legally-correct order. The efficiency gap is **missing orchestration**, not missing features.

**Goal:** one guided flow that answers "Darf ich liefern?" by chaining the existing (and now Sprint-A/C-corrected) engines, solving any gap inline, and ending in a plain-language verdict + a defensible record.

---

## 2. The core idea — one question, one guided flow

A single entry — **"Neuer Ausfuhrvorgang"** — asks three questions in Klaus's language:

1. **Was** liefere ich? (pick an Item, or create one: name + datasheet PDF)
2. **An wen?** (pick a Counterparty, or create one: name + country)
3. **Wohin / wozu?** (destination country + end-use)

…then runs the engines in the legally-correct order and shows **one verdict**:
🟢 **darf liefern** · 🟡 **Genehmigung nötig** · 🔴 **verboten** — each with a one-line _why_ and a concrete to-do list. Drill-down to the ECCN/§ detail is one click away (never the default view).

**Genius touches (the "genial" bar):**

- **Inline gap-solving** — no tool-switching. Item unclassified → upload datasheet → AI/regex classifies in place. Counterparty unscreened → screened on the spot. Klaus never leaves the flow.
- **Knows what's already done** — re-using an already-classified Item skips step 1; an already-CLEAR (fresh) counterparty skips step 2. The chain is idempotent and only does the work that's missing.
- **Every verdict cites its basis** — "Genehmigung nötig: 9A515.a → China (D:1), §8 AWV catch-all" — defensible, not a black box.
- **Resumable** — the flow persists a `TradeOperation` in `DRAFT`; Klaus can stop after step 2 and resume tomorrow. His work is never lost and never a throwaway side-object.
- **Audit-ready by construction** — the result _is_ a `TradeOperation` with linked classification, screening result (snapshot-hashed), and licence determination — exactly what the BAFA-Akte / §22 AWV record needs.

---

## 3. The step chain (each step = an existing engine; gaps solved inline)

| #   | Step                          | Engine (exists, verified)                                                                                                        | Inline gap-solving                                                                                                                                                             |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------- | ------------------------- |
| 1   | **Klassifizieren**            | `extractDatasheet` + `extractDatasheetViaVision` + `mergeExtractions` + `shouldSkipVision` + `parametric-matcher`                | Item without ECCN → upload datasheet PDF → regex(+Vision) extract → matcher proposes code → Klaus confirms. (Reuses the Sprint-G-optimised classify path: cache + regex-skip.) |
| 2   | **Screenen**                  | `screenParty(partyId)` (Sprint-A-hardened: token-set, fail-closed, aliases, identifier, control-no-equity)                       | Counterparty unscreened or stale → screen now against OFAC/EU/UN/BIS + 50% cascade.                                                                                            |
| 3   | **Jurisdiktion / De-minimis** | `evaluateSubjectToEAR` + `calculateDeMinimis` (Sprint-C-corrected: Sudan, D:1=25%)                                               | US content known on the item → subject-to-EAR + de-minimis computed automatically.                                                                                             |
| 4   | **Lizenz-Bedarf**             | `determineLicenseRequirements(triggerEval, deMinimis, destination, exceptionCtx, screeningCtx, actualCodes)` (Sprint-C T-M5 fix) | (ECCN × destination × end-use × screening) → gate `CLEARED                                                                                                                     | LICENSE_REQUIRED | REVIEW_NEEDED | BLOCKED` + which licence. |
| 5   | **Formular**                  | `bafa report-builder` → `serializeBafaXml` / EUC `annex-iiia-template`                                                           | Licence needed → propose the right BAFA form, pre-filled from the operation; Klaus reviews + exports.                                                                          |

The verdict maps directly from the step results:

- any step **BLOCKED / PROHIBITED / sanctions confirmed-hit** → 🔴 **verboten**
- else any **LICENSE_REQUIRED / REVIEW_NEEDED / POTENTIAL_MATCH / screening review** → 🟡 **Genehmigung nötig** (+ which + the form)
- else (all clear, all critical lists consulted) → 🟢 **darf liefern (NLR/EAR99)**

The result is persisted as a **`TradeOperation`** (status walks `DRAFT → AWAITING_CLASSIFICATION → SCREENING → AWAITING_LICENSE → LICENSED/BLOCKED`) with `TradeOperationLine`(s). The assistant is the _guided creation of an operation_, not a parallel system — Klaus's work lands exactly where the existing Pipeline/audit expects it.

---

## 4. Architecture (small; orchestration + presentation over existing engines)

- **New orchestrator (pure-ish, server):** `src/lib/trade/operation-assistant.server.ts`
  - `export async function assessOperationStep(input): Promise<StepResult>` per step, and a top-level `assessOperation(operationId)` that runs the chain over the operation's line(s) and returns `{ verdict, steps: StepResult[], pendenzen: Pendenz[] }`.
  - **Line-based from day one:** the orchestrator iterates `operation.lines` even though v1 UI submits exactly one line — multi-item is then a UI-only extension, no orchestrator rewrite.
  - Each `StepResult = { step, status: "done"|"gap"|"blocked", summary, why, detailRef }`. Pure composition of the 5 engines; no new compliance logic; unit-testable with mocked engine outputs.
- **New route / UI:** `src/app/(trade)/trade/operations/new` — a 3-question wizard that **composes existing components** (ClassificationPanel, the screening result panel, BAFA export button) rather than rebuilding them. A "Neuer Ausfuhrvorgang" CTA on `/trade` (Overview) and `/trade/operations` (Pipeline) is the entry.
- **API:** reuse the existing gated routes (all now behind `getTradeAuth` from Sprint B): `POST /api/trade/operations` (create), `POST .../classify/extract-vision` (step 1 gap), `POST .../parties/[id]/screen` (step 2 gap), `GET .../operations/[id]/recompute-risk` / a new `GET .../operations/[id]/assess` that calls the orchestrator. Add at most ONE new route (`assess`); everything else exists.
- **No new DB model** — writes `TradeOperation` + `TradeOperationLine`, links `TradeItem` / `TradeParty` / `TradeLicense`. (Money fields are still `Float` pending Sprint D's T-H12 migration — the assistant reads them as-is; no new precision risk introduced here.)

---

## 5. Error handling & edge cases

- **Engine failure** (e.g. Vision down): the step returns `status:"gap"` with a clear message, never a crash; the operation stays `DRAFT` and resumable. (Mirrors the route layer's existing `Promise.allSettled` + fail-soft.)
- **Missing critical sanctions list** (Sprint-A T-H3): screening returns non-CLEAR → the verdict is 🟡 (review), never a false 🟢.
- **Stale screening:** if the counterparty's last screen is older than the freshness window, step 2 re-screens rather than trusting a stale CLEAR.
- **Destination unknown until step 3:** classification at step 1 stays destination-agnostic (Sprint-C T-H6); destination-specific gates only fire once Klaus enters the destination.

## 6. Testing

- Orchestrator unit tests with mocked engine outputs: each verdict path (🟢/🟡/🔴) + each inline-gap branch (unclassified item, unscreened party, licence-required, blocked). Assert the verdict mapping is conservative (any blocked/confirmed-hit ⇒ 🔴; any review/licence ⇒ 🟡).
- A "knows what's done" test: an already-classified item + fresh-CLEAR party skips steps 1–2 (engines not called).
- Wizard component tests: 3-question submit → operation created → verdict rendered; resume a DRAFT operation.

## 7. Deliberately NOT in v1 (YAGNI)

Multi-item BoM operations in the UI (orchestrator is already line-based, so this is a later UI add), mandate/customer templates, batch operations, automatic BAFA submission, the licence-time predictor surfaced inline. → only after the single-item flow is excellent.

---

## 8. Why this is "genial" and cheap at once

The assistant adds **no new compliance logic** — it is an orchestration + plain-language presentation layer over engines that already exist and (after Sprint A/C) are correct. The risk lives only in the chaining and the inline gap-solving, not in new legal reasoning. That's what makes "biggest efficiency jump, almost free" true: it turns a powerful-but-fragmented toolbox into "it does my job" — the single highest-leverage UX change for Klaus.
