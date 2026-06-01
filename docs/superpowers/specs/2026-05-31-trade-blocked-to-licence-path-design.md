# Trade — "BLOCKED → what now" Licence-Application Path + Liability Framing (Design Spec)

**Date:** 2026-05-31
**Status:** Draft (design) — pending spec review
**Branch:** `fix/trade-to-92`
**Surface:** `src/app/(trade)/trade/**` (the guided "Darf ich liefern?" verdict)
**Predecessors:** Ausfuhrvorgang-Assistent (verdict engine, deployed), Phase 3B licence-renewal ("auto-prepare, human confirms" pattern, deployed)

---

## Goal

Two gaps, in priority order:

1. **BLOCKED/REVIEW → guided next step.** Today the guided operation check (`assessOperation`) returns 🟢 GO / 🟡 REVIEW / 🔴 BLOCKED with a step list and `pendenzen`, but on REVIEW/BLOCKED a novice is **stranded**: the verdict names a failing gate ("Genehmigung erforderlich" / "Lieferung verboten") and a flat pendenz string ("BAFA-Antrag (ELAN-K2) erstellen") with **no link, no licence type, no document list, no draft**. Close this: a **"Was jetzt?"** panel that, in plain German, states WHY (the failing gate), the **likely required licence type + authority** (already computed by the engine — see Architecture), the **required-documents checklist**, and an **"Antrag vorbereiten"** action that builds a pre-filled licence **DRAFT** (reusing the Phase-3B renewal-draft discipline, seeded from the operation/item/party), which the human reviews + confirms; plus a deep-link to the authority's own portal. Honest: it prepares, it does **not** submit, it is **not** legal advice.

2. **Louder liability / over-trust framing.** The current liability line is too quiet: a licences-page footnote in 11px muted text, and a verdict that says "auto-classified / auto-screened" — which a novice reads as "done, trust it." Make the **"decision-support — you remain responsible — get expert sign-off for REVIEW/BLOCKED/uncertain"** message **unmissable at the verdict**, with a lighter persistent cue near the auto-classification/auto-screening claims. Make 🟢 GO honest too: **GO ≠ "no obligations"** (record-keeping, EUC retention, re-verification before shipment still apply).

### The persona (who this is for)

An engineer at a 20–30-person satellite company, **no compliance background, sole compliance owner**. They run "Darf ich liefern?", hit 🔴 BLOCKED or 🟡 REVIEW, and today either (a) give up / escalate blindly, or (b) **ship anyway** because they don't know a licence path exists. They do not know what "BAFA Einzelausfuhrgenehmigung" is, which portal ELAN-K2 is, or that an End-Use Certificate is needed. The feature must hand them the _next concrete action_, pre-filled, while making the legal stakes loud enough that they don't mistake "draft prepared" for "cleared to ship."

---

## Non-Goals (YAGNI — explicitly OUT)

- **No e-filing / submission integration.** Caelex never auto-submits to BAFA ELAN-K2, BIS SNAP-R, or DDTC DECCS. The "Antrag vorbereiten" action produces an **internal DRAFT `TradeLicense` record** + a deep-link to the authority's own portal. The human files it themselves. (Same boundary as Phase-3B renewal and the existing BAFA-XML export.)
- **No new authority APIs, no new sanctions/licence feeds, no scraping.** Zero new external cost.
- **No new Prisma migration.** The DRAFT licence reuses the existing `TradeLicense` model + `TradeLicenseStatus.DRAFT` (already in the schema). The operation↔draft lineage is recorded in the existing `conditions` JSON (`applicationFor` key — mirrors Phase-3B's `renewalOf`), exactly like renewal did with zero schema change. **This is a key design decision: the link stays additive-in-JSON.**
- **No new licence types.** The `TradeLicenseType` enum (BAFA*\* / BIS*_ / DDTC\__ / EU / OTHER) is frozen. The new builder _maps onto_ it; it does not extend it.
- **No Anthropic call.** Building the application draft is pure deterministic field-copy from data the engine already produced — no LLM. (The existing Bescheid-PDF parser uses Claude Vision; this feature does not touch it.)
- **No new verdict computation.** `deriveVerdict` / `determineLicenseRequirements` are **not** changed in behaviour. This feature **surfaces** what they already compute and **drafts** from it. (Two _small, additive, test-covered_ exposures are needed — see "What's new on the engine side" — but no gate/threshold/classification logic changes.)
- **No EUC generation.** The required-docs checklist _names_ the documents (EUC, BoM, technical specs, …) and deep-links the existing EUC flow where one exists; it does not auto-generate certificates.

---

## Architecture

### What the verdict engine ALREADY gives you (the crux)

This was the central exploration question — and the answer is: **the engine already determines the required licence type + authority per line.** The feature is therefore **~70% "surface what exists" + ~30% "build a draft + a docs checklist."**

`GET /api/trade/operations/[id]/assess` → `assessOperation()` (`src/lib/trade/operation-assistant.server.ts`) returns an `OperationAssessment`:

```ts
interface OperationAssessment extends VerdictResult {
  operationId: string;
  counterpartyId: string;
  lines: Array<{
    lineId: string;
    itemId: string;
    itemName: string;
    classification: ClassificationResult | null; // ← carries licenseDetermination
  }>;
}
// VerdictResult = { verdict: "GO"|"REVIEW"|"BLOCKED"; headline; steps[]; pendenzen[] }
```

Each `line.classification.licenseDetermination` is the **full `LicenseDetermination`** from `src/lib/comply-v2/trade/license-determination.ts`:

```ts
interface LicenseDetermination {
  requirements: LicenseRequirement[];   // ← per-jurisdiction: authority + licenceType + reason + recommendedAction
  gate: "CLEARED" | "REVIEW_NEEDED" | "BLOCKED";
  mtcrCatIBlock: boolean; itarBlock: boolean; embargoBlock: boolean; annexIVBlock: boolean;
  nextSteps: string[];                  // ← human-readable, urgency-ordered
  applicableExceptions?: ApplicableException[];
  disclaimer: string;                   // ← already an honest screening-only disclaimer
}
interface LicenseRequirement {
  jurisdiction: string;                 // e.g. "Export to RU", "EU / DE", "US (ITAR)"
  authority: "BIS" | "DDTC" | "BAFA" | "EU_COMPETENT_AUTHORITY" | "MTCR_REVIEW";
  status: "REQUIRED" | "LIKELY_REQUIRED" | "EXCEPTION_MAY_APPLY" | "NLR" | "DENIED" | "PROHIBITED" | "UNKNOWN";
  licenseType: "SPECIFIC_LICENSE" | "LICENSE_EXCEPTION" | "GENERAL_LICENSE" | "NLR" | "TAA" | "DSP5" | "BAFA_ANTRAG" | null;
  reason: string;                       // WHY this requirement fired
  recommendedAction: string;            // what to do
  triggerCode?: string;
  applicableException?: { code; label; citation; conditions[] };
}
```

**So the engine already answers "which authority + which licence type."** Examples it produces today:

| Situation                           | `authority`              | `licenseType` (engine union) | `status`     |
| ----------------------------------- | ------------------------ | ---------------------------- | ------------ |
| EU Annex I item, non-EU destination | `BAFA`                   | `BAFA_ANTRAG`                | `REQUIRED`   |
| ITAR / USML item                    | `DDTC`                   | `DSP5`                       | `REQUIRED`   |
| US de-minimis exceeded              | `BIS`                    | `SPECIFIC_LICENSE`           | `REQUIRED`   |
| MTCR Cat. I                         | `MTCR_REVIEW` / `BAFA`   | `null` / `BAFA_ANTRAG`       | `DENIED`     |
| Annex IV counterparty (Art. 2b)     | `EU_COMPETENT_AUTHORITY` | `null`                       | `PROHIBITED` |
| Embargoed destination               | `BIS`                    | `SPECIFIC_LICENSE`           | `DENIED`     |

**The gap is two-fold and small:**

1. **Type granularity.** The engine emits a _coarse_ `licenseType` (`BAFA_ANTRAG`, `DSP5`, `SPECIFIC_LICENSE`, …). The licence-create flow + DRAFT record need the _fine-grained_ `TradeLicenseType` Prisma enum (`BAFA_EINZEL`, `DDTC_DSP5`, `BIS_EAR`, …). → A **pure deterministic mapper** bridges these. It is conservative: when the engine type is ambiguous (e.g. `SPECIFIC_LICENSE` for BIS could be `BIS_EAR`), it picks the safest "specific individual licence" of that authority and the panel says "likely <type> — confirm."
2. **It's not surfaced or actionable.** The VerdictPanel shows the 5-step list + pendenzen, but **discards `licenseDetermination`** beyond the verdict roll-up. → The "Was jetzt?" panel reads the _strongest_ requirement across lines and renders it (authority, licence type, why, docs, action).

#### What's NEW on the engine side (minimal, additive, pure, node-tested)

The verdict already roll-ups `requirements` into a coarse verdict, but the **per-requirement detail is dropped before it reaches the client** (the API serialises `lines[].classification`, which _does_ include `licenseDetermination`, so technically the client receives it — but it is raw and per-line, not a single actionable recommendation). To avoid the client re-implementing the "pick the strongest requirement" + "map to a fileable licence type" logic, we add **one pure module** that does it on the server (or client — it's pure) and is node-tested:

```
src/lib/trade/
  license-application.ts            ← PURE, NEW (node tests):
                                       (1) selectApplicationTarget(determinations[]) → the single
                                           strongest actionable LicenseRequirement across all lines
                                       (2) mapToTradeLicenseType(authority, engineLicenseType, …)
                                           → fine-grained TradeLicenseType (conservative)
                                       (3) deriveRequiredDocuments(target, operationContext)
                                           → ordered RequiredDoc[] checklist
                                       (4) buildLicenseApplicationDraft(target, operationContext)
                                           → DRAFT create-payload (clone-prefill, blanks the no./dates)
                                       (5) authorityPortal(authority) → { label, url } deep-link
  license-application.test.ts       ← node tests for all of the above
```

**No change to `deriveVerdict`, `determineLicenseRequirements`, `classifyItemForOperation`, or the assess route.** `license-application.ts` consumes the existing `LicenseDetermination[]` (one per classified line, already on the API response) — it is a _pure post-processor_, so the assess route + engine stay untouched and the new logic is fully node-testable in isolation.

### The application-draft approach — reuses the Phase-3B renewal pattern

Phase-3B's `buildLicenseRenewalDraft(prior)` (`src/lib/trade/license-renewal.ts`) is the template. It is a **pure clone/prefill** that:

- copies the _substance_ (licenseType, conditions, cap, currency) from a prior licence,
- **deliberately blanks** `licenseNumber`, `issuedAt`, `validUntil` (a renewal is a NEW authorisation — its number/dates are unknown until the authority issues it),
- stamps `conditions.renewalOf` for lineage,
- returns `status: "DRAFT"` + a `carriedSummary` + a verbatim `disclaimer`,
- and is POSTed by a thin modal to the **existing** `POST /api/trade/licenses`.

`buildLicenseApplicationDraft(target, operationContext)` is the **same shape, seeded from operation/item/party context instead of a prior licence**:

| Field                           | Source (PRE-FILLED)                                                                                                                                                                               | Notes                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `licenseType`                   | `mapToTradeLicenseType(target.authority, target.licenseType)` (e.g. `BAFA_EINZEL`, `DDTC_DSP5`, `BIS_EAR`)                                                                                        | the fine-grained enum                                                  |
| `conditions.coveredCodes`       | the item ECCN/USML codes that _triggered_ the requirement (`eccnEU`/`eccnUS`/`usmlCategory` per line, + `target.triggerCode`)                                                                     | so the DRAFT carries what it's _for_                                   |
| `conditions.coveredCountries`   | `[operation.shipToCountry]` (+ `endUseCountry` if set)                                                                                                                                            | destination(s) the licence must cover                                  |
| `conditions.endUseRestrictions` | derived from `operation.declaredEndUse` (CIVIL → `["civilian end-use only"]`, etc.)                                                                                                               |                                                                        |
| `conditions.applicationFor`     | `operation.id`                                                                                                                                                                                    | **lineage key (mirrors `renewalOf`)** — additive-in-JSON, no migration |
| `conditions.notes`              | a generated human note: "Antragsentwurf aus Vorgang <reference>; Gegenpartei <legalName>; Grund: <reason>"                                                                                        | editable in the modal                                                  |
| `totalCapValue`                 | the operation's total line value (Σ quantity × unitValue), as a **starting** cap                                                                                                                  | euros (API serialises cents→euros)                                     |
| `capCurrency`                   | the operation's line currency (default EUR)                                                                                                                                                       |                                                                        |
| `licenseNumber`                 | **BLANK** (`undefined`)                                                                                                                                                                           | **never fabricate an authority number**                                |
| `issuedAt`                      | **BLANK** (`undefined`)                                                                                                                                                                           | unknown until issued                                                   |
| `validUntil`                    | **BLANK** (`undefined`)                                                                                                                                                                           | unknown until issued                                                   |
| `status`                        | `"DRAFT"`                                                                                                                                                                                         |                                                                        |
| `carriedSummary`                | generated: "Vorbefüllt aus Vorgang … — Lizenztyp, betroffene Codes, Zielland, Endverwendung. Nummer, Ausstellungsdatum und Gültigkeit trägst du ein, sobald die Behörde die Genehmigung erteilt." |                                                                        |
| `disclaimer`                    | verbatim `APPLICATION_DISCLAIMER` (below)                                                                                                                                                         | mandatory, shown in modal                                              |

The modal (`LicenseApplicationModal`, near-clone of `LicenseRenewalModal`) lets the human edit cap/notes, fill the new dates if known, **confirm**, then POSTs to the **existing `POST /api/trade/licenses`** with `status: "DRAFT"` → a DRAFT licence appears in `/trade/licenses`, linked to the operation via `conditions.applicationFor`. After creation, the modal surfaces the authority deep-link ("Jetzt bei BAFA ELAN-K2 einreichen ↗") so the human's _next_ physical step is one click away.

**What it deliberately blanks / never does:** the authority licence number, the issue date, the validity window (all unknown until the real Bescheid/licence is issued), and it never marks the DRAFT as `ACTIVE`/`PENDING` — it is an internal `DRAFT` until the human has actually filed and the authority has responded. It never claims the application was submitted.

### The required-documents derivation

`deriveRequiredDocuments(target, operationContext)` is a **pure lookup** keyed by `target.authority` (+ a couple of operation facts), returning an ordered `RequiredDoc[]`:

```ts
interface RequiredDoc {
  key: string; // stable id, e.g. "EUC", "BOM", "TECH_SPEC", "DSP83", "BIS711"
  label: string; // German label, e.g. "Endverbleibserklärung (EUC)"
  why: string; // one line: why this authority needs it
  mandatory: boolean; // hard-required vs. recommended
  actionHref?: string; // deep-link to an existing Caelex flow if one exists (e.g. /trade/euc)
}
```

The mapping is **static, derived from what each authority's individual-licence application actually requires** (no external call), e.g.:

- **BAFA (Einzelausfuhrgenehmigung):** Endverbleibserklärung/EUC (BAFA C1/C6/C7 — link `/trade/euc`), technische Spezifikation des Guts, Stückliste/BoM, Angaben zum Endverwender, ggf. Toll-Manufacturing-Erklärung.
- **DDTC (DSP-5):** End-Use Certificate / DSP-83 (Nonproliferation/NDAA statement, `DDTC_DS83`), technical data package, Letter of Explanation, consignee/end-user details.
- **BIS (specific EAR licence):** BIS-711 (Statement by Ultimate Consignee & Purchaser, `BIS_711`), technical specs, end-use/end-user statement, support documentation per 15 CFR §748.
- **MTCR_REVIEW / PROHIBITED / DENIED targets:** **no application docs** — instead the panel renders a _stop_ state (see below): the docs section is replaced by "Kein Antrag möglich — <reason>. Vorgang abbrechen + dokumentieren / Auskunft zur Güterliste anfragen / qualifizierte Rechtsberatung."

The deriver consults `target.status`: for `DENIED`/`PROHIBITED` it returns an empty docs list + a `stopGuidance` string instead, so the UI never invites a novice to "prepare an application" for a hard-blocked export.

### The "Was jetzt?" panel — design

Rendered **inside `VerdictPanel`**, _below_ the 5-step list, **only when `verdict !== "GO"`**. Structure adapts to the strongest requirement's `status`:

**REVIEW (licence-obtainable) — the actionable path:**

```
┌─ Was jetzt? ────────────────────────────────────────────────┐
│ ⚠ Warum?  „<reason from the strongest requirement>“           │  ← plain German, the failing gate
│                                                                │
│ Wahrscheinlich benötigte Genehmigung                           │
│   ┌──────────────────────────────────────────────┐            │
│   │ BAFA Einzelausfuhrgenehmigung   [DE · BAFA]    │            │  ← authority + fine-grained type
│   │ Grund: EU-Anhang-I-Dual-Use, Ausfuhr nach RU   │            │
│   └──────────────────────────────────────────────┘            │
│   ⓘ Wahrscheinliche Einstufung — vor Einreichung bestätigen.   │  ← honest hedge when mapping is not exact
│                                                                │
│ Benötigte Unterlagen                                           │
│   ☐ Endverbleibserklärung (EUC)         [öffnen ↗]  (Pflicht) │  ← deep-links existing flow
│   ☐ Technische Spezifikation             (Pflicht)            │
│   ☐ Stückliste / BoM                      (empfohlen)         │
│                                                                │
│ [ Antrag vorbereiten ]   Behörde: BAFA ELAN-K2 ↗               │  ← primary action + portal deep-link
│                                                                │
│ ⓘ Caelex bereitet einen ENTWURF vor und reicht NICHTS ein.    │  ← honest boundary (see Liability)
│   Keine Rechtsberatung. Du bleibst verantwortlich.            │
└────────────────────────────────────────────────────────────────┘
```

**BLOCKED (hard stop — no application) — the stop path:**

```
┌─ Was jetzt? ────────────────────────────────────────────────┐
│ 🔴 Lieferung verboten — kein Genehmigungsantrag möglich.       │
│ Warum?  „<reason: ITAR / Embargo / Annex-IV Art. 2b / MTCR>“   │
│                                                                │
│ Nächste Schritte                                               │
│   • Vorgang abbrechen und Abbruch dokumentieren.               │  ← from stopGuidance
│   • Parteiidentität gegen die aktuelle Liste re-verifizieren.  │
│   • Qualifizierte Exportkontroll-Rechtsberatung hinzuziehen.   │
│                                                                │
│ ⛔ Nicht liefern. Caelex ist Entscheidungs­unterstützung,      │  ← LOUD liability (see below)
│   keine Rechtsberatung — die Verantwortung bleibt bei dir.    │
└────────────────────────────────────────────────────────────────┘
```

Clicking **"Antrag vorbereiten"** opens `LicenseApplicationModal` (the renewal-modal clone) pre-filled via `buildLicenseApplicationDraft`. On confirm → DRAFT created → toast + the authority deep-link.

**Reuse, not reinvent:** the panel reuses the existing `--trade-*` tokens, the lucide icon set, the amber/red verdict colour classes already in `VerdictPanel`, and the modal is a structural clone of `LicenseRenewalModal` (same `inputClass`/`labelClass`, same POST shape, same verbatim-disclaimer block).

### The liability / over-trust framing (⑤) — exact placements

The message has **three tiers of loudness**, placed so a novice cannot miss the one that matters:

1. **LOUDEST — at the verdict, on REVIEW & BLOCKED (the moment of decision).**
   A dedicated, high-contrast **liability banner** rendered by `VerdictPanel` directly under the verdict headline whenever `verdict !== "GO"`:

   > **Entscheidungsunterstützung — keine Freigabe.** Caelex klassifiziert und screent automatisch, um dir Arbeit abzunehmen — die **Verantwortung bleibt bei dir**. Bei „Prüfung nötig" / „Verboten" und in jedem Zweifelsfall **vor der Lieferung fachkundige Freigabe** einholen (qualifizierter Ausfuhrverantwortlicher / Rechtsberatung).

   Styled like the verdict block (amber for REVIEW, red for BLOCKED), with an `AlertTriangle`/`ShieldAlert` icon — i.e. _as prominent as the verdict itself_, not a footnote.

2. **HONEST GREEN — at the verdict, on GO.**
   GO must not read as "no obligations." Under the green headline, a calmer (still visible, not muted-11px) note:

   > 🟢 **Darf liefern — aber nicht „nichts tun".** Auch ohne Genehmigung gelten Pflichten: **Ausfuhrnachweise 5 Jahre aufbewahren**, EUC/Endverwendung dokumentieren, und **vor jeder Lieferung re-verifizieren** (Einstufung, Empfänger, Ziel können sich ändern). Bei neuen Erkenntnissen erneut prüfen.

3. **PERSISTENT-LIGHT — near the auto-classification / auto-screening claims.**
   Wherever the UI says "auto-classified" / "auto-screened" (the `classify` + `screen` step rows, and the classification-details `<details>`), append a small, persistent inline cue (a `ⓘ` with hover/short text):

   > Automatisch — als Vorschlag, nicht als Freigabe. Endgültige Einstufung bestätigt der Ausfuhrverantwortliche.

   This directly counters the "auto- = done" misread at the exact spot it arises. Implemented as a tiny shared `AutoSuggestHint` inline component (one line) reused by the step rows.

**Single source of truth for the strings:** all three tiers' German copy + the `APPLICATION_DISCLAIMER` live as exported consts in `license-application.ts` (pure, node-importable), so the wording is testable ("must contain 'keine Rechtsberatung'", "must contain 'Verantwortung bleibt bei dir'") and never drifts between the panel, the modal, and the banner.

### Legal honesty boundaries (explicit — this is a regulated domain)

The feature must, at every surface, make these true and visible:

- It tells you the **likely** licence + **prepares a draft**. It does **not** decide your case, and the mapping can be wrong → every recommendation is hedged ("wahrscheinlich … bestätigen").
- It **does not submit** anything to any authority. The DRAFT is internal; filing is the human's manual step via the authority's own portal.
- It is **not legal advice** and **not a substitute for a qualified Ausfuhrverantwortlicher / export-control counsel**.
- For **BLOCKED**, it never offers an "apply" path — a hard prohibition (ITAR/embargo/Annex-IV Art. 2b/MTCR Cat. I) has no licence remedy, and offering one would be dangerous. The panel renders a _stop_ state instead.
- The carried-over draft conditions are a **starting point, not a guarantee** — the authority may impose different conditions; the human re-verifies against the issued Bescheid before any shipment (same language as Phase-3B).

---

## API touchpoints

- **Reuse `POST /api/trade/licenses`** (no change) to persist the DRAFT — exactly as Phase-3B renewal does. Accepts `{ licenseType, licenseNumber?, issuedAt?, validUntil?, conditions, totalCapValue?, capCurrency, status, documentId? }`. The draft sends `status:"DRAFT"`, blanks `licenseNumber/issuedAt/validUntil`, and puts lineage in `conditions.applicationFor`.
- **Reuse `GET /api/trade/operations/[id]/assess`** (no change) — it already returns `lines[].classification.licenseDetermination`, which is everything `license-application.ts` needs. The "Was jetzt?" panel consumes the _existing_ assessment already loaded by `VerdictPanel`; **no new fetch.**
- **No new API route. No new query params. No webhook. No cron.** Confirmed: the draft, the docs checklist, the portal links, and all three liability tiers are _pure client/derived_ on top of data already on the wire.

> **Optional follow-up (explicitly deferred, not in scope):** a future `/trade/licenses?applicationFor=<opId>` filter or an operation-detail "Anträge zu diesem Vorgang" panel that lists DRAFTs linked via `conditions.applicationFor`. The lineage key is written now so this is _possible later_ with zero rework — but this spec does **not** build it.

---

## Testing strategy

Mirrors the established Trade convention: **pure logic node-tested; components gated by tsc + eslint + source review** (jsdom component tests **hang** on this machine — do NOT add them).

| Concern                                                                | Where                                                                            | Tested by                            |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| `selectApplicationTarget` (pick strongest requirement across lines)    | `lib/trade/license-application.ts` (pure)                                        | **node unit tests**                  |
| `mapToTradeLicenseType` (engine authority+type → `TradeLicenseType`)   | `lib/trade/license-application.ts` (pure)                                        | **node unit tests**                  |
| `deriveRequiredDocuments` (per-authority docs + BLOCKED stop-guidance) | `lib/trade/license-application.ts` (pure)                                        | **node unit tests**                  |
| `buildLicenseApplicationDraft` (prefill + deliberate blanks + lineage) | `lib/trade/license-application.ts` (pure)                                        | **node unit tests**                  |
| `authorityPortal` deep-links + the three liability copy consts         | `lib/trade/license-application.ts` (pure)                                        | **node unit tests** (string asserts) |
| "Was jetzt?" panel + verdict liability banner + `AutoSuggestHint`      | `VerdictPanel.tsx` + `LicenseApplicationModal` + `_components/WasJetztPanel.tsx` | **tsc + eslint + source review**     |
| Persisting the DRAFT                                                   | existing `POST /api/trade/licenses` (no change)                                  | already has `route.test.ts`          |

**Pure-test coverage targets (the legally-sensitive core):**

- BLOCKED statuses (`DENIED`/`PROHIBITED`/MTCR) → `buildLicenseApplicationDraft` is **never** offered; `deriveRequiredDocuments` returns `stopGuidance`, empty docs.
- `buildLicenseApplicationDraft` **always** blanks `licenseNumber`/`issuedAt`/`validUntil` (assert undefined) and **always** sets `status:"DRAFT"` + `conditions.applicationFor` + the verbatim disclaimer.
- `mapToTradeLicenseType` is conservative + total: every `(authority, engineLicenseType)` pair the engine can emit maps to a concrete `TradeLicenseType` (never throws, never `null`); ambiguous BIS `SPECIFIC_LICENSE` → `BIS_EAR` with the "confirm" hedge flagged.
- `selectApplicationTarget` prefers the **most severe** requirement (PROHIBITED > DENIED > REQUIRED > LIKELY_REQUIRED > UNKNOWN) and, within REQUIRED, a deterministic authority order, across all lines.
- The liability copy consts contain the mandatory phrases ("keine Rechtsberatung", "Verantwortung bleibt bei dir", "fachkundige Freigabe", and for GO "5 Jahre").

---

## Risks

1. **Wrong licence-type mapping misleads a novice.** Mitigation: the mapper is conservative (safest individual licence of the authority), the panel **always** hedges ("wahrscheinliche Einstufung — bestätigen"), and the DRAFT is just a draft the human edits. The mapper is total + node-tested over every engine output.
2. **Novice mistakes "draft prepared" for "submitted / cleared."** Mitigation: this is the entire point of the liability framing (⑤) — the modal disclaimer, the post-create toast, and the panel's "bereitet einen ENTWURF vor und reicht NICHTS ein" line all say it; the DRAFT status in `/trade/licenses` reinforces it.
3. **Offering an "apply" path on a BLOCKED export.** Mitigation: `deriveRequiredDocuments`/the panel hard-branch on `DENIED`/`PROHIBITED`/MTCR → _stop_ state, no "Antrag vorbereiten" button. Node-tested.
4. **Over-trust of a 🟢 GO.** Mitigation: tier-2 honest-green note (record-keeping/re-verify), tested for the "5 Jahre" string.
5. **Copy drift between panel/modal/banner.** Mitigation: single-source German consts in the pure module, asserted by tests.
6. **Scope creep into e-filing.** Mitigation: Non-Goals are explicit; the boundary ("prepare-and-link only, never submit") is repeated in spec, plan, disclaimer, and UI copy.
