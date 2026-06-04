# Caelex Passage (Trade) — Automation Maturity & Roadmap (2026-06)

> **Goal of this analysis:** determine what is still needed to automate export
> control for space companies AS FAR AS POSSIBLE.
> **Method:** 4 parallel grounded code-analysis subagents over the core
> subsystems (Classification, Screening, Operations/AVA, Licensing). Reporting/
> Filings + AI/Astra deep-dives were not separately run (stopped by user); their
> key facts are folded in from the licensing + operations analyses and prior
> recon. NOT adversarially verified (that would be the `ultracode` workflow).

## TL;DR

Passage already has an **unusually strong, conservative decision layer** — the
parametric matcher, the 8-list sanctions engine, the 5-step AVA "Darf ich
liefern?" verdict, and the multi-gate license-determination engine are all built,
pure, tested, and zero-cost to run. The automation frontier is **not more
reasoning** — it is three things:

1. **Wire the engines to triggers** (they fire on button-clicks today, not events).
2. **Close the dead-end pipelines** (work that's built but never lands).
3. **Build a front door** (every transaction is hand-typed; no order/PDF/ERP ingress).

Most of the highest-impact wins are **wire-ups with no DB migration**.

## The four cross-cutting patterns

**A. Engines exist; triggers/wiring don't.** Classification matcher, screening,
verdict, license-determination, license-draft, reminder services — all built. The
gap is overwhelmingly orchestration (triggers, write-backs, chaining), not new
logic. → mostly small effort, no migration.

**B. Dead-end pipelines (built but never lands).** Two glaring examples:

- The **classify copilot** extracts → matches → drafts → human-accepts… and then
  the accepted classification is **never written back to the item** (the classify
  page's `tradeItemId` is hardcoded `null`; no "apply candidate" button). The
  operator does all the AI work, then **re-types the code by hand**.
- **5 of 6 licence-reminder crons are written + tested but NOT scheduled** in
  `vercel.json` (Sammelgenehmigung, UK-ECJU, France-LOS, FAA-AST, Supplement-2).
  They silently never fire in prod.

**C. No front door — everything is manual data-entry.** An export operation is
~100% hand-built in a 4-step wizard (one item, one party, typed country). There
is **no** order/quote/PO/email/ERP/CSV ingress anywhere. Items are created
one-at-a-time; ownership graphs are hand-typed. The intelligence sits downstream
of a fully manual entry step. **This is the single biggest unlock.**

**D. The decision layer is conservative-by-design — and that's a feature.**
Human-confirm gates are everywhere (`REQUIRES_REVIEW`, draft-only applications,
"suggestion not Freigabe", emphatic disclaimers). Automation must preserve these.
The realistic near-term ceiling is **"prepare everything; human clicks submit"** —
true e-filing is blocked on external agency portals (BAFA ELAN-K2, BIS SNAP-R,
DDTC DECCS, UK SPIRE, CNES, FAA) having no public APIs.

## Automation maturity by lifecycle stage

| Stage                                    | Maturity                 | Note                                                                                                                                                                |
| ---------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Applicability** (does control apply?)  | ✅ engine / 🟡 input     | Deterministic regime triage; 7 answers hand-entered; auto-seeds org profile.                                                                                        |
| **Classify** (is the item controlled?)   | 🟡                       | Matcher + auto-classify-on-create ✅, but copilot output dead-ends (no writeback); only 6 of ~50 attributes captured at create; top-1 only.                         |
| **Screen** (is the party sanctioned?)    | ✅ engine / 🟡 coverage  | Mature; delta-rescreen just shipped. Missing: staleness gate, PEP/adverse-media, real UBO, push alerts.                                                             |
| **Operation / AVA verdict**              | ✅ verdict / ❌ assembly | Verdict + license-determination excellent; operation 100% hand-built; no auto-screen/recompute/assess on create.                                                    |
| **License** (apply + manage)             | 🟡                       | Auto-draft ✅ (BAFA/BIS/DDTC) + Bescheid-parser ✅; 5 reminder crons dead; no e-filing; renewal BAFA-only; EUC a shell.                                             |
| **Report / File** (tell the authorities) | 🟡                       | BAFA XML, ATLAS-DE customs XML, DCS, Supp-2 generate payloads; **no submission** anywhere; BAFA XSD unverified.                                                     |
| **Monitor / ICP**                        | 🟡                       | compliance-health + license-analytics + predictor exist but under-wired; no regulatory-change→impact; Astra trade tools are **read-only** (no gated write-actions). |

## Prioritized roadmap

Effort S/M/L · Impact H/M/L · "mig?" = needs a DB migration (user-gated).

### Tier 0 — close the dead-ends (trivial, ship-now, no migration)

| #   | Lever                                                                                                                                       | Effort | Impact | mig? |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ---- |
| 0.1 | **Register the 5 dormant reminder crons** in `vercel.json` (built+tested, just unscheduled)                                                 | S      | H      | no   |
| 0.2 | **Classification draft-accept → item write-back** + a one-click "apply candidate" button on the matcher panel (reuse `fieldForCanonicalId`) | S–M    | H      | no   |
| 0.3 | **Snapshot-staleness fail-closed** at screen-time (extend the existing T-H3 missing-list gate with a max-age check)                         | S      | H      | no   |
| 0.4 | Fix the **UK_OFSI dead source URL** (or formally rely on OpenSanctions)                                                                     | S      | M      | no   |

### Tier 1 — the orchestration spine (chain existing engines on events)

| #   | Lever                                                                                                                                                                   | Effort | Impact | mig? |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ---- |
| 1.1 | **Auto-screen + auto-recompute + auto-assess on operation create/change** (replaces 3 manual button-clicks; chain `screenParty`→`recomputeOperation`→`assessOperation`) | S–M    | H      | no   |
| 1.2 | **New-hit PUSH alert** — when a rescreen flips a party CLEAR→POTENTIAL_MATCH, write an in-app `Notification` + ops event (today: email only)                            | S–M    | H      | no   |
| 1.3 | **Widen item-create to the full ~50-attribute vocabulary** + multi-regime fan-out (write every distinct-regime top candidate, not just one)                             | M      | H      | no   |
| 1.4 | **Auto-select & attach an existing valid licence** to an operation (clears the licence gate automatically)                                                              | M      | H      | no   |
| 1.5 | **AI auto-draft EUC (Annex IIIa)** from operation data (template + PDF renderer already exist; also fixes the T-H11 enum-label bug)                                     | M      | H      | no   |
| 1.6 | **Auto-draft licence renewal on the expiry cron** (generalise the BAFA clone-and-confirm to all regimes)                                                                | M      | H      | no   |
| 1.7 | **Verdict-driven status auto-advance** (DRAFT→…→LICENSED driven by the verdict, not buttons)                                                                            | M      | M      | no   |
| 1.8 | Wire the **approval-time predictor** into the draft + back-date the "apply-by" reminder                                                                                 | S      | M      | no   |

### Tier 2 — the front door (the biggest unlock; build-new)

| #   | Lever                                                                                                                                                    | Effort | Impact | mig?   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ |
| 2.1 | **Inbound order/PO/email/ERP → auto-built operation** (parse → {lines, buyer, consignee, destination, end-use}; reuse the proven Vision-extract pattern) | L      | H      | likely |
| 2.2 | **Auto-link parsed lines→items + names→parties** (fuzzy match, create-if-missing → flows through auto-classify + auto-screen)                            | M      | H      | maybe  |
| 2.3 | **Bulk import + classify** (CSV/parts-list → batch create → REQUIRES_REVIEW queue)                                                                       | M–L    | H      | maybe  |

### Tier 3 — breadth, intelligence & agentic (some external dependencies)

| #   | Lever                                                                                                                                                                                     | Effort | Impact | mig?  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ----- |
| 3.1 | **Regulatory-change → impact analysis** + re-classification when the control-list cross-walk version changes ("3 items' ECCNs changed; 2 operations now need a licence")                  | M      | M      | maybe |
| 3.2 | **PEP screening** (stop dropping OpenSanctions PEP topics → non-blocking EDD flag) + **adverse-media**                                                                                    | M      | M–H    | yes   |
| 3.3 | **Real UBO auto-discovery** (implement the real Orbis adapter behind the existing interface; render the chip on the new surface)                                                          | L      | H      | no    |
| 3.4 | **Real-time per-entry sanctions delta** (hourly OpenSanctions delta → rescreen only colliding parties)                                                                                    | M      | H      | small |
| 3.5 | **SAG-vs-individual recommendation** from repeat-shipment analytics                                                                                                                       | M      | M      | no    |
| 3.6 | **Agentic, write-gated Astra** — let the assistant _do_ the workflow (classify/draft/prepare), every write behind the approval gate (the Atlas chat-approval-gate pattern already exists) | M      | H      | no    |
| 3.7 | **BAFA XSD-conformance test** (close T-H9) → then **e-filing** where portals allow                                                                                                        | M→L    | H      | maybe |

## What "maximal automation" looks like (the end state)

> A quote/order arrives (email/ERP/PDF) → operation **auto-built** + lines
> **auto-linked** to items → items **auto-classified** → parties **auto-screened**
> (+ UBO/PEP) → **AVA verdict** computed → licence/EUC/customs docs **auto-drafted**
> → human approves at the gates → (where an API exists) **auto-filed**, else
> one-click portal hand-off. Continuous monitoring re-screens on sanctions deltas
> and re-classifies on control-list changes, pushing alerts.

Everything except the **human approval gates** and **agency submission** is
automatable — and ~80 % of the engines already exist. The work is Tier 0→1
(wire-up, no migration) then Tier 2 (the front door, the one big new build).

## Hard dependencies / ceilings (not code problems)

- **Legal human-in-loop is mandatory** — auto = suggestion, never Freigabe. Keep the gates.
- **External agency portals have no public APIs** — true e-filing is blocked on agency cooperation; "prepare + human-submit" is the near-term ceiling.
- **Commercial data licensing** — real UBO (Orbis) + premium adverse-media are paid; PEP + the delta feed are free via OpenSanctions.
- **The classification cross-walk is a curated seed (~99 entries, space-focused)** — broad auto-classification under-fires until the corpus is expanded (data/expert curation, ongoing — Sprint H in the to-92 plan).
- **Open correctness items** to close before widening auto-write: matcher T-M5/T-M20/T-M17/T-M18; licensing T-H9 (XSD); money T-H12 (Float→cents on older models).

## Already shipped this session (baseline)

Screening-triage hardening (CAS race fix, a11y, 2-step confirm, debounce) ·
event-driven auto-classification on item create · sanctions-list delta →
immediate rescreen trigger. (Live on prod.)

_Synthesised 2026-06 from 4 grounded subsystem analyses. For the exhaustive,
adversarially-verified version, run the `ultracode` workflow._
