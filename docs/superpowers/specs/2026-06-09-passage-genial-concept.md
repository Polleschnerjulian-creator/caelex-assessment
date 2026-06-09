# Caelex Passage — The "GENIAL" Export-Control Co-Pilot

## A transparent, human-guided product that leads the operator through classify → screen → licence → ship → file → record, with WHAT / WHY / WHEREFORE / CONFIDENCE / SOURCE / OVERRIDE on every decision

---

### 0. The One-Sentence Thesis

Export control is the single compliance domain where a black-box "verdict you must trust" is **disqualifying**, because the liability is personal and criminal and attaches to a _named human_ — the **Ausfuhrverantwortlicher** who signs the EUC, the BAFA application, and the customs declaration — never to "the AI." Passage wins by inverting the automation default: **the AI does the heavy lifting and drafts; the human reviews, decides, and is recorded; the system explains, teaches, and audits.** Every consequential output is an _editable proposal carrying its full reasoning_, never a committed fact — and any one of them can be regenerated into a one-page, court-ready "why" dossier the officer hands a regulator. That defensible-paper-trail-as-a-feature is the moat no Descartes / AEB / SAP-GTS / OpenSanctions string-lookup incumbent offers.

---

### 1. Current-State Verdict — What Passage Genuinely Has Today

Passage is **already ~70% of the way to the genial product** and must be _extended, not rebuilt_. The 2026-05-30 audit (453 files, ~153.7k LOC) closed all 12 HIGH findings (T-H1…T-H12); the engines are deterministic, cited, and conservative-by-design. The transparency primitives exist — they are just **unevenly distributed and absent at the highest-stakes seams.**

**Where it already embodies the thesis (preserve and generalise):**

- **Deterministic, explainable engines — no LLM in the decision path.** Classification is pure predicate evaluation (`parametric-matcher.ts`) over a machine-readable control-list cross-walk (`control-list-cross-walk.ts`, ~4,886 lines: EU Annex I, US CCL/ECCN, USML, MTCR, Wassenaar, NSG, DE Ausfuhrliste, Russia-833). Every match exposes the exact `canonicalId`, the matched predicates (operator · threshold · actual value), HIGH/MEDIUM/LOW confidence + written rationale, the `citation`, list-version dates, and a cross-regime `seeAlso` graph. The only LLM is a _swappable OCR front-end_ (`claude-vision-extractor.server.ts`) that extracts datasheet specs with per-attribute confidence + source badge — **it never picks the code.**
- **Three-valued logic prevents silent under-classification.** A NULL attribute is never "below threshold" — it routes to a `PossibleMatch` ("populate seuRate to confirm"), plus `NearMiss` surfacing and T-M19 sanity-range guards. This directly answers the founder's "an unknown SEU rate must NOT silently classify a rad-hard FPGA as below-threshold."
- **Screening is the strongest subsystem.** Deterministic Jaro-Winkler + token-set + exact-identifier matching across 8 wired lists (OFAC SDN+AKA, EU FSF, UN, BIS Entity, DDTC Debarred, UK OFSI, EU Annex IV, OpenSanctions); the OFAC 50%-rule ownership cascade (`cascade-50pct.ts`) with diamond-path aggregation and the post-Dec-2025 control-without-equity trustee signal; **fail-closed** on missing/stale critical lists (a would-be-CLEAR escalates to POTENTIAL_MATCH); append-only, SHA-256 snapshot-hashed provenance proving _which_ list versions were screened.
- **The "lead the human" surfaces already exist as the gold standard.** The Ausfuhrvorgang-Assistent (`operation-assistant-verdict.ts`) chains the engines into a 3-question wizard (Was? / An wen? / Wohin?) returning one verdict 🟢/🟡/🔴 with a per-step `{summary, why}` and a `Pendenzen` to-do list. `WasJetztPanel` renders WHY + the hedged probable licence + a required-docs checklist + the authority portal link + the decisive trust line _"Caelex bereitet einen ENTWURF vor und reicht NICHTS ein … Du bleibst verantwortlich."_ The applicability front-door (per-question "warum wir das fragen", "unsure" rounds UP, no false-green, "Was diese Einordnung NICHT ist") is thesis-perfect.
- **The "honesty" coverage layer is LIVE on main.** `classification-coverage.ts` communicates a missing classification as `no-data` — _"wir wissen es nicht"_, never "frei" — with the single-source disclaimer **"eine fehlende Einstufung ist keine Freigabe."** Fabricated OFAC citations were replaced with verified ones; UBO source selection is gated so no fabricated "why" renders in prod.
- **Decision-of-record infrastructure exists** (`AstraProposal`: status PENDING|APPLIED|REJECTED, `decisionLog`, `rationale`, `reviewerNote`, EU-AI-Act reproducibility = model + engine version + hashed prompts) — but is wired to Comply, **not Trade.**

**Where it is still a black box / fragmented (the genial cut targets exactly these):**

1. **The ship gate trusts the human blindly at the highest-stakes moment.** `LICENSED → EXECUTED` is gated on the enum value alone (`api/trade/operations/[id]/route.ts`); the server never re-checks that every line is covered by a valid licence, that screening is CLEAR, or that catch-all duties were discharged. A user can advance an operation still showing a Catch-all banner or a POTENTIAL_MATCH counterparty to "Executed."
2. **The verdict vanishes after creation.** The full 5-step licence verdict is rendered only by `VerdictPanel`, mounted **only in the creation wizard.** The persistent detail page (`operations/[id]/page.tsx`) shows risk + catch-all + sham but **never calls `/assess`** — so a returning operator sees no licence verdict, no type, no authority, no "why."
3. **"File customs" effectively does not exist.** No Ausfuhranmeldung / ATLAS / EZT surface; the journey dead-ends silently at "Executed." The only artefacts are unlabelled BAFA-PDF/XML and US-DCS icon-buttons, with no teaching and fabricated placeholder identifiers (EIN `000000000`, EORI `DE000000000000000`, port `0000`).
4. **The AI assistant is the lowest-guardrail surface wearing the highest-authority skin.** Astra's mutating trade tools bypass the approval gate (T-H10 residual / **B3-DEFER**); the engine passes `ALL_TOOLS` _unconditionally_ (`engine.ts:343,449`) — not product-scoped, auditor read-only enforced only by prompt. `/trade/astra` is a 36-line generic embed with no Trade prompt, per its own JSDoc.
5. **Classification permits author = approver self-sign-off (T-M18)** — no second-set-of-eyes on the single highest-liability call. `Modify` in the copilot cannot actually edit the proposed code, and raw ECCN overwrites on item-detail bypass the audited-reasoning discipline.
6. **Gate 0 is dead at operation level.** The non-derogable EU 833/2014 Annex IV Art. 2b PROHIBITION can fire in `license-determination.ts`, but `screeningContext` is never threaded into the operation classifier (`operation-assistant.server.ts:77` passes only `destinationCountry`) — so the strongest block never shows its legal basis.
7. **Vision prompt-injection on VALUES (T-M17)** — attribute names are whitelisted, values are not; a malicious datasheet can steer the classified verdict.

> **The genial insight:** the explanation envelope, the proposal gate, the provenance substrate, and the guided wizard all _already exist somewhere in the codebase._ The cut is to **promote these scattered primitives into ONE universal, enforced "explanation envelope" that wraps EVERY AI/engine output, and close the leaks where the black box still shows through.** Transparency present on the classifier but absent on the AI assistant is not transparency — it is a trust illusion that one un-gated tool call destroys.

---

### 2. The Canonical Guided Process + Authorities (the product's spine)

Export control is not one decision but a recurring **six-stage gauntlet** that must clear BEFORE every shipment, technology transfer, or even an internal disclosure to a foreign-national colleague. The same physical space item (star tracker, GNSS receiver, reaction wheel, rad-hard FPGA, propulsion module) can be subject simultaneously to **four overlapping regimes** with a strict precedence: **ITAR exclusive** (22 CFR §120.5; EAR §734.3 carves USML out) → **EU 833/2014 Annex IV hard PROHIBITION** (Russia/Belarus end-users, no licence available) → **US EAR / CCL** → **EU Annex I** (Reg. 2021/821) → **national lists** (DE Ausfuhrliste / AWG-AWV §8/§9 catch-alls) → **Wassenaar/MTCR/NSG/AG** multilateral baseline (never controls standalone).

The six stages, and **with whom** each is transacted (jurisdiction-specific, non-substitutable):

- **STAGE 1 — CLASSIFY.** Test the item against every list that can reach it; resolve precedence; if US content, run de-minimis (25% std / 10% E:1-E:2 / 0% ITAR, 15 CFR §734.4) + FDPR (§734.9). _Authorities for a binding answer:_ **BAFA** Auskunft zur Güterliste (AzG); **BIS** CCATS; **DDTC** Commodity Jurisdiction (DS-4076) when ITAR-vs-EAR is unclear.
- **STAGE 2 — SCREEN.** Screen every party AND its UBO chain against all lists; run the ≥50%-rule cascade; resolve end-use/end-user red flags (WMD, military, cyber-surveillance, nuclear §9(1) AWV, extended-military §9(2) AWV catch-alls). _Authorities/lists:_ EU Consolidated/FSF, **OFAC** SDN, **BIS** Entity/DPL/Unverified, **DDTC** debarred, UN, UK OFSI.
- **STAGE 3 — DETERMINE LICENCE.** Run the gate logic to a verdict (PROHIBITED / DENIED / REQUIRED / EXCEPTION_MAY_APPLY / NLR) and pick the **type**: DE Einzelausfuhrgenehmigung / Sammelgenehmigung / Allgemeine Genehmigung (AGG); EU GEA EU001-EU008; US BIS specific licence or License Exception (STA/ENC/CSA); ITAR DSP-5/DSP-73/TAA/MLA. _The conservative default is correct:_ the engine refuses to auto-pick a general authorisation and flags `approximate=true` so the UI hedges.
- **STAGE 4 — FILE (with the authority).** Assemble application + EUC + DCS for the right body and portal. _Non-substitutable mapping:_ **DE → BAFA via ELAN-K2**; **EU GEA → used through BAFA** (register/report); **US EAR → BIS via SNAP-R** (Form BIS-748P); **US ITAR → DDTC via DECCS** (after DS-2032 registration); **UK → ECJU via SPIRE→LITE**; **France → SBDU via EGIDE/SIGALE** (war-material on the separate CIEEMG track). _Hard ceiling:_ none of these portals have public APIs — the realistic end-state is **"prepare everything; the human clicks submit."**
- **STAGE 5 — SHIP / FILE CUSTOMS.** The export declaration: **DE Ausfuhranmeldung via ATLAS / EZT**; **US AES via ACE/AESDirect** (CATAIR-coded); the **Destination Control Statement** (15 CFR §758.6) that must travel with the shipment.
- **STAGE 6 — RECORD & ongoing obligations.** 5-year retention (22 CFR §122.5; 15 CFR §762; AWV); EUC lifecycle (BAFA C1/C6/C7, BIS-711, DDTC DS-83); re-export consent (§17 AWV / Art. 11 / §734.16); deemed-export authorizations (tech to foreign-national in-country = export to their nationality, 22 CFR §120.54); periodic AGG/GEA reports; and **Voluntary Self-Disclosure** (22 CFR §127.12 / 15 CFR §764.5) when something breaks.

This linear, resumable spine — with a per-stage "what the law requires / who decides" panel — is the product. Passage already implements every stage's _logic_; the genial product makes the **journey itself** explicit and unbroken.

---

### 3. The Target Experience — The "Show-Your-Work" Co-Pilot

The core stance, stated as an **enforceable contract**: no Passage surface may emit a consequential output (classification, screening result, licence determination, verdict, generated EUC/BAFA/customs filing) without carrying **six fields**. This is made the _only_ return type for engine results, so an un-explained verdict **cannot compile.**

**The Explanation Envelope (`ExplainedResult<T>`):**

| Field          | Meaning                                                                               | Already-built source to compose                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **WHAT**       | the decision, stated plainly                                                          | `VerdictResult{verdict, headline}`; `CandidateMatch{canonicalId, regime}`                                                       |
| **WHY**        | legal-basis citation + exact matched rule/list entry + matched parameters + reasoning | `matchedPredicates` (attribute·op·expected·got); `LicenseRequirement.reason/triggerCode`; the refuting predicate on near-misses |
| **WHEREFORE**  | what it means + the single recommended next action                                    | `Pendenz{label, actionHref}`; `recommendations[]`                                                                               |
| **CONFIDENCE** | explicit; UNKNOWN surfaced, never implied                                             | `ConfidenceBadge` HIGH/MEDIUM/LOW; three-valued PossibleMatch/NearMiss lanes — **extend to screening, which lacks it**          |
| **SOURCE**     | list/corpus version + snapshot hash + as-of timestamp                                 | `snapshotHash` + content-addressed snapshots; `AstraProposal.reproducibility` — **surface in UI, currently server-side only**   |
| **OVERRIDE**   | output is an editable PROPOSAL; the human is recorded as decision-maker               | `AstraProposal{status, decisionLog, reviewerNote}` — **wire to Trade**                                                          |

**The four UX mechanisms that operationalise the contract:**

**(a) The Explanation Panel — progressive disclosure, one artifact for expert and novice.** Every output renders a one-line **verdict layer** (🟢/🟡/🔴 + the single recommended action) — all the expert needs to skim and sign — plus a collapsed **"Show reasoning"** disclosure that expands the matched rule entry, the parameter table, the confidence basis, the list-version provenance, and the citation. The content is _identical underneath_; depth is the reader's choice. This is the founder's "good cut": **teaching is a free side effect of the transparency the auditor already requires** — the novice learns export-control reasoning by reading the same "why" the expert collapses. High-stakes banners (e.g. the ITAR §123.1(b) see-through "Do not proceed on engine output alone") stay **un-collapsible.**

**(b) The Suggestion-vs-Decision model — a visible state machine.** A consistent vocabulary across every surface so the AI's status is never ambiguous: **AI-PROPOSED** (editable, provisional, amber) → **HUMAN-REVIEWED** (recorded decision-maker, green) → **UNVERIFIED** (list/source unavailable or stale — neutral-but-blocking, **never green**). The AI pre-fills; it never auto-files. Mandatory disclaimers ride as persistent, non-dismissible chrome on AI-proposed outputs, not a one-time toast. Crucially, this routes **every mutating Astra trade tool through the proposal gate** (closing T-H10) and adds **author ≠ approver** to classification (closing T-M18) — an AI screening becomes a _proposal a human applies_, never a committed write or an auto-sent sanctions-hit email.

**(c) The Teaching Wizard — the spine made linear.** Promote the empty-org-only `HomeOnboarding` scaffold into a **persistent six-stage progress spine** (reuse `OperationStepper`) on the operations list and a "where am I / what's next" rail on the populated dashboard. Each stage carries its "what the law requires / who decides / what you must do next" panel. The Ausfuhrvorgang-Assistent's per-step `{summary, why}` _is_ the teaching engine — generalise it so the journey never reverts to a bare alert-inbox for returning users.

**(d) The Audit Trail — the unforgettable feature.** ANY consequential decision regenerates on demand into a **one-page, regulator-ready "Why this?" dossier**: the matched rule/list text, the exact triggering parameters, the list/corpus version + snapshot hash + as-of timestamp, the AI's stated rationale + confidence, and the **named human** who reviewed/decided and when. The substrate exists (append-only screening provenance + `AstraProposal.decisionLog` + reproducibility for EU AI Act Art. 12 + the `AuditLog` SHA-256 hash-chain) — it needs unifying into one export reachable from every verdict. Position it as _"defensible paper trail, generated — not assembled by hand the night before a BAFA audit."_ This converts the officer's personal liability from a _reason-to-distrust-software_ into the precise _reason-to-buy-this-software._

**Dual-control escalation.** High-stakes irreversible steps escalate to **four-eyes** with a separate human approver, recorded immutably: confirming a sanctions hit, filing a BAFA/ELAN-K2 submission, classifying an item that triggers the ITAR see-through rule, and drawing down a Sammelgenehmigung quota (paired with the race-safe atomic draw-down already shipped under T-H7).

---

### 4. Gap Analysis — Where Today's Passage Over-Automates / Hides the Why / Fragments the Journey

| #   | Gap (thesis violation)                                                                                                                                       | Master-plan / audit ref                                         | Type                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------- |
| G1  | Ship gate `LICENSED→EXECUTED` re-checks nothing — blind trust at the highest-stakes step                                                                     | new (UX-journey audit); adjacent to operation lifecycle         | over-automates                                  |
| G2  | Licence verdict + type + authority + "why" vanish after the creation wizard (detail page never calls `/assess`)                                              | new (UX + ops-engine audits)                                    | hides the why                                   |
| G3  | "File customs" stage absent — journey dead-ends at "Executed"; fabricated placeholder identifiers; no preview before download                                | new (UX + ops-engine audits)                                    | fragments the journey                           |
| G4  | Astra trade tools bypass the approval gate; engine passes `ALL_TOOLS` unconditionally; auditor read-only is prompt-advisory, not enforced                    | **T-H10** residual / **B3-DEFER**                               | over-automates                                  |
| G5  | Classification author = approver self-sign-off; `Modify` can't modify; raw ECCN overwrite skips audited reasoning                                            | **T-M18**                                                       | hides the why / over-automates                  |
| G6  | Gate 0 (Annex IV Art. 2b PROHIBITION) dead at operation level — `screeningContext` never threaded                                                            | new (ops-engine audit) + strengthens **T-H4/H5** screening work | hides the why (under-fires the strongest block) |
| G7  | Vision prompt-injection on VALUES — malicious datasheet steers the verdict                                                                                   | **T-M17**                                                       | hides the why                                   |
| G8  | Screening hit shows THAT + which list + score, but not the reason-for-listing (OFAC program, BIS policy, EU reg ref) — `listMetadata` parsed, never surfaced | new (classification/screening explainability audit)             | hides the why                                   |
| G9  | Two un-reconciled de-minimis paths — operation verdict uses operator-typed % not the auditable BOM rollup                                                    | T-M3/M4 (reconciled) + new wiring gap                           | hides the why                                   |
| G10 | Model-tiering could silently flip a classification verdict                                                                                                   | **G4-DEFER** (correctly held until accuracy A/B)                | over-automates (latent)                         |
| G11 | Corpus is a ~99-entry seed → broad auto-classification under-fires; the "no-data honesty" path is load-bearing                                               | **Sprint H** (partial)                                          | (honesty path mitigates)                        |
| G12 | Strategy docs drift (3 self-"canonical", 3× test counts); newest fixes on branches not all on main                                                           | **Sprint I5** (docs reconcile)                                  | process                                         |

**The pattern:** every gap is either (a) an _un-gated AI write_ (G4, G5), (b) a _hidden why_ (G2, G6, G7, G8, G9), or (c) a _broken journey_ (G1, G3) — exactly the three things the explanation envelope + proposal gate + linear spine are designed to fix. The conservative-by-design strengths (three-valued logic, order-of-review precedence, fail-closed screening, append-only provenance, "auto = suggestion never Freigabe") **must be preserved, not broken.**

---

### 5. Phased Roadmap (P0 / P1 / P2)

The new layer is the **transparency/guidance spine** threaded through the existing master plan and the successor AUTOMATION-ROADMAP. Reuse what overlaps; build the envelope, the gate-wiring, and the dossier as the genial differentiators. Everything is zero-new-external-cost (sole runtime cost = the Claude API, already minimised by Sprint G).

**P0 — Close the black-box leaks + make transparency structural (the thesis's enforcement boundary):**

- **Define `ExplainedResult<T>` as the only return type** for classification, screening, licence-determination, de-minimis, and the operation verdict; make the renderer refuse a result missing any of the six fields. _(M)_
- **Route every mutating Astra trade tool through the `AstraProposal` gate** + product-scope the tool surface + enforce auditor read-only at the tool layer (fix G4 / T-H10 / B3-DEFER, `engine.ts:343,449`). _(M)_
- **Add author ≠ approver** to classification approval and the enumerated high-stakes actions; make `Modify` actually editable; gate raw ECCN overrides behind a source + justification (fix G5 / T-M18). _(M)_
- **Enforce a real pre-ship precondition gate** before `LICENSED→EXECUTED`: re-run assess, 409 with the specific unresolved reasons (uncovered line / not-CLEAR counterparty / open catch-all), surface them in the confirm dialog for a logged override (fix G1). _(M)_
- **Fail screening CLOSED to an explicit UNVERIFIED state** the envelope surfaces, never a green GO (harden G-cluster). _(S)_

**P1 — Surface the why everywhere + complete the journey:**

- **Render the licence verdict on the persistent detail page** (reuse `VerdictPanel`/`WasJetztPanel`) (fix G2). _(M)_
- **Thread counterparty `matchedLists` into the operation classifier** so Gate 0 Annex IV PROHIBITED fires with its legal basis (fix G6). _(M)_
- **Ship the one-click "Why this?" court-ready dossier** from every verdict — the unforgettable feature (composes existing provenance). _(M)_
- **Add the customs-filing stage** after EXECUTED: a guided "Zollanmeldung — was jetzt?" panel that explains the DCS/EAD, an on-screen preview of every BAFA/AES/ATLAS payload before download, and exporter identifiers sourced from the org profile (no placeholders) (fix G3). _(L)_
- **Surface the reason-for-listing** (`listMetadata`: OFAC program, BIS policy, EU reg ref) + clickable source citation on each screening hit (fix G8 — pure presentation, data already parsed). _(M)_
- **Value-level guard + "why-was-this-extracted" provenance** on Vision extraction (fix G7 / T-M17). _(M)_
- **Make progressive disclosure the universal pattern**; flag matched-name-vs-AKA on hits; surface the "UBO not resolved in prod" state loudly. _(S)_

**P2 — Unify, teach, and reach the agentic end-state (every write still gated):**

- **Persistent six-stage teaching spine** for returning users (reuse `OperationStepper`); scope `/trade/astra` to a Trade prompt + restricted tool-subset (fix G11/journey). _(M)_
- **Unify de-minimis** — feed the auditable BOM calculator into the operation verdict, or label the input as self-declared (fix G9). _(M)_
- **Active EXECUTED → recordkeeping hand-off** + the deferred tamper-evident hash-chain viewer; instrument a **VSD-prompt** when a post-hoc screen flips a shipped operation to a hit (§127.12 / §764.5, 60-day clock). _(M)_
- **Agentic write-gated Astra** (AUTOMATION-ROADMAP Tier-3.6): the assistant _does_ the workflow, every write behind the approval gate, reusing the Atlas chat-approval-gate pattern — the natural home for the thesis. **Gate G4 model-tiering on an accuracy A/B first** (fix G10). _(L)_
- **Stamp engine reference data with a visible "current as of" date**; complete the docs-reconcile (Sprint I5, fix G12). _(S)_

---

### Closing — Why This Wins

Passage already does the labor (extraction, matching, screening, drafting) at full speed, so experts are not slowed; the human reviews and decides with one keystroke; the system explains-and-records always, so the novice is taught by the _same artifact_ the expert skims. The genial product is not a rebuild — it is the **promotion of scattered transparency primitives into one enforced envelope, the closing of three un-gated-write leaks the audit already named, and the unification of provenance into a court-ready dossier.** An export-control officer staking personal criminal liability will not buy a faster black box. They will buy the one product that hands a regulator the complete reasoning chain — the matched rule, the parameters, the list version, the AI's rationale, and the named human who decided — instead of a score.
