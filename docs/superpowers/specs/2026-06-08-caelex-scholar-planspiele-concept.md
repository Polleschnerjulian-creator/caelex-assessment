# Caelex Scholar — Planspiele Concept Spec

> **Status:** CONCEPT for owner sign-off (Konzept vor Code). This is planning only —
> research + design. **No implementation** until this is approved and a
> `writing-plans` plan is drawn up.
> **Date:** 2026-06-08 · **Branch:** `feat/caelex-scholar`
> **Origin:** practice-education feedback from **Università di Genova**.
> **Scope rule:** every new artifact is Scholar-scoped
> (`src/app/(scholar)/scholar/**`, `src/lib/scholar/**`, `src/data/scholar/**`,
> additive `Scholar*` Prisma models). **No edits** to frozen
> `(atlas)` / `(pharos)` / `(trade)` / `(comply)` surfaces. Frozen engines + the
> Atlas corpus are consumed **READ-ONLY** (imported, never modified). Strictly
> **monochrome** (white / gray / black only).

---

## 0. TL;DR for the owner

**Planspiele** turns Caelex Scholar from a _reading_ surface into a _practice_
surface. A law student picks a **role** (satellite operator, national
regulator/NCA, space lawyer, insurer, debris/STM coordinator, EU/ESA body) and
**works a realistic space-law scenario like in practice** — drafting real
artifacts (an authorization application, a NIS2 incident notification, a
debris-mitigation plan, an advice memo), making consequential decisions, and
negotiating with counterparties — then gets engine-grounded + AI + instructor
feedback against a transparent rubric, followed by a structured debrief.

**The single most important design decision:** build it **Scholar-native**, but
deliberately **reuse** four things Caelex already owns: (1) the production legal
**engines** (EU Space Act, NIS2, national law) as a free, deterministic _answer
key_; (2) the generic **workflow state machine** (`src/lib/workflow/`) as the
phase/turn spine; (3) the frozen **Atlas corpus** (82 cases + ~67-jurisdiction
instruments) as a _scenario factory_ and in-cockpit research source; (4) the
proven **classroom/instructor mental model** from Academy (mirrored as new
`Scholar*` models, **not** reused directly). Everything is gated by the existing
`getScholarAuth()` and styled in the existing monochrome Scholar component
system.

**Do NOT** extend the Academy `SimulationScenario` / `AcademyClassroom` models:
they are single-role multiple-choice, dark/emerald-themed, and gated on
`User.role` rather than the `SCHOLAR` product entitlement — wrong on pedagogy,
wrong on brand, wrong on access.

---

## 1. Vision + why (the Università-di-Genova practice-education need)

### 1.1 The need

Caelex Scholar today is a free, university-licensed, SSO-gated **reader**: a
strictly-monochrome window into the frozen Atlas space-law corpus (UN treaties,
EU law including the proposed EU Space Act COM(2025) 335, national space laws
across ~67 jurisdictions, and ~82 real cases). It is excellent for _finding and
reading_ law. It is **passive**.

The originating feedback from **Università di Genova** is that practice-oriented
legal education needs students to _do_ the work, not just read it: to take on a
professional role, produce the documents a regulator would actually receive,
make decisions under real constraints and deadlines, and negotiate across
parties. This is the difference between _knowing_ Art. 11 of the EU Space Act
and _filing_ an authorization application under it.

### 1.2 The product answer — Planspiele

**Planspiele** (German for "simulation games" / role-play exercises) is a new
sub-module of Scholar at **`/scholar/planspiele`**. It is **practice-oriented
legal education**: realistic space-law compliance scenarios where students
inhabit roles and _actively work like in practice_.

### 1.3 Why this is the right bet (strategic alignment)

- **Deepens the Scholar mission.** Scholar's purpose is academic legitimacy and
  a long-horizon funnel (students who learn space law on Caelex become the
  associates who reach for **Atlas** at their firm). Planspiele makes Scholar
  _memorable and sticky_ — a professor who runs a semester of Caelex Planspiele
  is a far stronger advocate than one who points students at a search box.
- **It is mostly assembly, not greenfield.** The "work like in practice"
  machinery already exists in the codebase as production compliance tooling.
  Planspiele _re-casts_ that machinery as a teaching instrument. This is the
  same "mostly not greenfield" thesis that justified Scholar itself.
- **It flatters the partner.** Several scenario archetypes ship an explicitly
  **Italian-law** variant grounded in real corpus entries (ASI re-entry
  determination under Law 89/2025; Vega-C VV22 Italian-built launcher) — a
  direct, credible nod to Genova.
- **"Superkrass" but grounded.** The ambition is real (multi-role negotiation,
  AI counterparties, engine-graded artifacts), but every ambitious piece maps
  onto something that already works.

---

## 2. Pedagogy principles — what makes it "work like in practice"

Grounded in legal-simulation research (Maharg's SIMPLE / "transactional
learning"), clinical legal education, healthcare-simulation best practice
(INACSL standards), Kolb's experiential cycle, and emerging LLM-as-counterpart
literature. Nine principles, each with its build implication.

| #      | Principle                                               | What it means                                                                                                                                                                                                                        | Build implication                                                                                                                                                                                                                                     |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1** | **Authentic transactional tasks**                       | Students _produce real artifacts_ (applications, notifications, memos, plans), not pick A/B/C. "Close to practice yet safe from malpractice."                                                                                        | Every Planspiel outputs a **gradeable work product**. Multiple-choice is never the primary task.                                                                                                                                                      |
| **P2** | **Distinct, asymmetric roles**                          | A shared public brief + **role-private** information. Students act _as_ the professional. Asymmetry forces genuine reasoning/negotiation.                                                                                            | Each role gets a **private briefing packet**; the operator knows its true constraints, the NCA its enforcement priorities, the insurer its risk appetite.                                                                                             |
| **P3** | **Consequential, state-tracked decisions**              | Decisions carry forward and gate later branches ("file incomplete → deficiency notice → remediate under deadline"). Stakes convert reading into doing.                                                                               | Model a Planspiel as a **state machine**; decisions mutate run state and unlock/lock downstream phases.                                                                                                                                               |
| **P4** | **Psychological safety (pre-brief + fiction contract)** | A standardized pre-brief lowers anxiety, sets a "learning contract," and promises that _mistakes are the curriculum_, surfaced only in debrief.                                                                                      | Every Planspiel opens with a **pre-brief screen**: objectives, roles, rules, "errors are safe," peer-confidentiality. Cheap to build.                                                                                                                 |
| **P5** | **The facilitated DEBRIEF is the core**                 | Strongest, most consistent finding. Undebriefed simulation = entertainment, not learning. Kolb's reflective-observation at scale; PEARLS sequence (self-assessment → facilitated reflection → directed feedback → focused teaching). | A Planspiel is **incomplete without a structured debrief**: replay the decision path, "what/why/what-next," tie every move back to the governing article/treaty (deep-link the corpus).                                                               |
| **P6** | **Engagement-fidelity > surface realism**               | Functional/contextual authenticity (real task, constraints, stakes) beats high-production visuals. Low-fi modalities match hi-fi outcomes.                                                                                           | A **gift** to the monochrome, text-first constraint. Invest the realism budget in accurate facts, authentic templates, correct consequences — **never** 3D/"metaverse".                                                                               |
| **P7** | **Scaffolding + graduated complexity**                  | From guided (single letter, heavy hints) to autonomous (multi-role, multi-week, minimal hand-holding).                                                                                                                               | A **tiered ladder**: Tier 1 single bounded artifact + Atlas hints/templates; Tier 2 multi-step + 1 counterparty; Tier 3 multi-role branching campaign.                                                                                                |
| **P8** | **Fused learn-and-assess, transparent rubric**          | Learning and assessment are fused (as in real practice). Rubrics score **process _and_ product**, visible up front.                                                                                                                  | Ship a **transparent rubric WITH every Planspiel**, scoring (a) the artifact, (b) the decision process, (c) a graded reflective write-up. AI scoring **advisory**, instructor authoritative.                                                          |
| **P9** | **AI counterparties + formative feedback**              | LLMs credibly play simulation roles and give formative feedback (cf. MASER multi-agent legal-complaint simulator). Human-expert → principles → prompt pipeline; persona + memory keep roles consistent.                              | An Atlas-grounded AI plays the **absent counterparts** (NCA reviewer, opposing counsel, insurer) AND facilitates the **PEARLS debrief** — making **solo, scalable** practice viable. AI is constrained to the corpus (RAG), never invents the regime. |

**The four-beat loop the literature converges on** (the spine of every
Planspiel):

> **PRE-BRIEF** (objectives + roles + safe-to-fail fiction contract)
> → **AUTHENTIC TRANSACTION** (produce a real artifact in role; consequential
> branching decisions)
> → **ASSESSMENT** (transparent process + product rubric)
> → **STRUCTURED DEBRIEF** (PEARLS reflection, every decision tied to the
> governing instrument in the corpus).

---

## 3. Roles

Seven roles. A Planspiel uses a fixed roster of **2–5** of them. **In solo mode,
the AI plays the absent roles**, so a single student vs an AI-NCA is a complete
experience. Each role has a goal, what they _do_, and what they _produce_.

| Role                                                          | Goal                                                                        | What they DO                                                                                                     | What they PRODUCE                                                                                                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Satellite/Launch Operator (Applicant)**                  | Get authorised + stay compliant at lowest cost/risk                         | Assemble the dossier, answer RFIs, make orbit/insurance/design trade-offs, file incident reports under the clock | Authorization application, debris-mitigation plan, end-of-life disposal plan, NCA cover letter, NIS2 early-warning + 72h notification, RFI-response memos                                           |
| **2. National Regulator / NCA**                               | Protect safety/spectrum/environment while enabling lawful activity          | Review completeness, issue RFIs, set conditions, grant/refuse/revoke, triage incidents                           | Completeness checklist, request-for-information, **reasoned authorisation decision with conditions**, refusal with grounds, supervision order. _(Only this role may fire approve/reject — see §5.)_ |
| **3. Space Lawyer / Counsel**                                 | Structure the deal/defence; advise the best lawful path                     | Research the corpus, draft opinions, negotiate conditions, frame appeals                                         | Compliance/legal memo with cited authorities, negotiation position paper, appeal brief, risk-register entry                                                                                         |
| **4. Insurer / Underwriter**                                  | Price + bound the risk; pay only valid claims                               | Assess mission risk, set coverage vs the statutory minimum, negotiate exclusions, adjudicate a loss              | Quote + policy term sheet, coverage-position letter, claim determination                                                                                                                            |
| **5. Debris / STM Coordinator**                               | Prevent collisions + unsafe re-entries                                      | Run conjunction assessment, recommend manoeuvres, evaluate disposal-orbit + casualty-risk thresholds             | Conjunction data message + manoeuvre recommendation, disposal-orbit compliance finding, re-entry casualty-risk determination                                                                        |
| **6. EU / ESA Body (DG-DEFIS / EUSPA)**                       | Protect the single market, TCO equivalence, state-aid/procurement integrity | Rule on third-country-operator equivalence, clear/block state aid, coordinate cross-border                       | TCO/adequacy determination, state-aid clearance decision, coordination opinion                                                                                                                      |
| **7. NGO / Objector / Affected party** _(optional adversary)_ | Force environmental / dark-sky / competition scrutiny                       | File objections in the comment window, demand environmental review, raise FRAND/dark-sky concerns                | Objection submission + evidentiary brief                                                                                                                                                            |

**Role ↔ corpus mapping is mechanical, not cosmetic.** Roles align to the
corpus's own applicability axes: `LegalSource.applicable_to`
(satellite*operator / launch_provider / ground_segment / data_provider /
in_orbit_services / constellation_operator / space_resource_operator) and the
EU Space Act engine's operator taxonomy (SCO / LO / LSO / ISOS / PDP / TCO).
This is \_why* role choice changes which provisions and decisions a student sees.

---

## 4. Scenario archetypes (7)

Each is grounded in real instruments + real precedents in the frozen corpus, and
each names its roles, phases, and the student artifacts produced. The corpus
join is automatic: a scenario phase references `LegalSource` ids and the runtime
surfaces the real instruments + the cases that applied them via the existing
`getCasesApplyingSource()` / `getLegalSourceById()` helpers (READ-ONLY).

### A — Licence a mega-constellation (Authorization) ★ flagship-tier

- **Roles:** Operator, NCA, Counsel, (optional NGO objector)
- **Phases** (mirror `authorizationWorkflowDefinition`): (1) Pre-filing strategy
  — choose NCA of establishment, regime (standard vs light), constellation
  scale; (2) Dossier assembly — produce application + Debris Mitigation Plan +
  End-of-Life Disposal + Large-Constellation showing; (3) Completeness gate —
  NCA issues RFI (notified-body-style `additional_info_requested` loop); (4)
  Public-comment — optional NGO objection; (5) Decision — grant with conditions
  / refuse / defer.
- **Artifacts:** authorization application, debris-mitigation plan, disposal
  plan, NCA completeness checklist + RFI, reasoned decision with conditions,
  (objection brief).
- **Grounding:** EU Space Act constellation/debris/disposal articles; cases —
  FCC Swarm 2018 (unauthorised-launch enforcement), FCC Intl-Bureau aggregate
  constellation-debris orders, FCC Kuiper milestone review.

### B — In-orbit collision/incident + NIS2 24h/72h/30d reporting ★ flagship-tier

- **Roles:** Operator, NCA, STM Coordinator, Counsel
- **Phases** (mirror `incidentWorkflowDefinition` + the four-phase NIS2 clock):
  (1) Detection — STM issues conjunction data message; Operator confirms
  anomaly/loss-of-contact; (2) Early-warning (T+24h, compressed in-sim) —
  Operator files NIS2 `early_warning`; (3) 72h notification — NCA
  acknowledges/RFIs; (4) Investigation/mitigation — root-cause + debris
  assessment; (5) Intermediate + final report.
- **Artifacts:** conjunction data message + manoeuvre recommendation, NIS2
  early-warning, 72h notification, NCA acknowledgement/RFI, final incident
  report + lessons-learned.
- **Grounding:** EU Space Act Incident Reporting + Collision-Avoidance articles;
  NIS2 Art. 23(4)(a)/(b)/(c); cases — Iridium/Cosmos-2251 (2009), Cosmos-954
  (1981 re-entry liability), Russia ASAT (2021); cyber variant — Viasat KA-SAT /
  AcidRain (2022) as an NIS2 significant incident.

### C — Export-control / ITAR / dual-use dispute (advanced)

- **Roles:** Operator (exporter), Counsel, Regulator (DDTC/BIS **or** BAFA),
  (optional EU body)
- **Phases:** (1) Classification — USML vs ECCN; deemed-export exposure for
  foreign-national engineers; (2) Licensing path — apply for the right
  authorisation, build a Technology Control Plan + denied-party screening; (3)
  Enforcement — a re-export-to-sanctioned-end-user violation surfaces; negotiate
  a consent agreement.
- **Artifacts:** classification/commodity-jurisdiction memo, deemed-export
  assessment, Technology Control Plan, screening report, voluntary
  self-disclosure, consent-agreement negotiation position.
- **Grounding:** the deep ITAR/EAR case set — US v ITT (2007), BAE (2011), ZTE
  (2017), Hughes/Loral (China-launch tech-transfer), OFAC ExPro (2023), DE-BAFA
  dual-use (2022, the EU/German angle).
- **Caveat:** the export-control engine lives in the FROZEN Trade surface;
  Scholar consumes its **pure functions READ-ONLY** (see §6.4 + Open Question on
  the cross-surface guard). Best as an advanced/expert tier; if the guard blocks
  the import, scope C to a later wave.

### D — Environmental/debris objection + launch EIS challenge

- **Roles:** NGO/Objector, Operator, NCA/launch authority, Counsel
- **Phases:** (1) Filing — Environmental Footprint Declaration / NEPA
  categorical-exclusion claim; (2) Objection — NGO challenges the exclusion,
  demands a full review; (3) Authority adjudication — does the exclusion hold
  "absent specific evidence of significant impact"; (4) Conditions or remand.
- **Artifacts:** Environmental Footprint Declaration, NEPA/EIS adequacy memo,
  NGO objection + evidentiary brief, authority's reasoned environmental
  determination.
- **Grounding:** a real doctrinal line in the corpus — CSE v DOT (1979,
  Space-Shuttle EIS) → Viasat v FCC (2021, §1.1306 categorical exclusion) → CCC
  Vandenberg (2023, cadence-increase review). Cite by case id so students read
  the actual holdings.

### E — Cross-border registration / jurisdiction conflict (TCO equivalence)

- **Roles:** Operator (third-country), two NCAs, EU body (DEFIS/EUSPA), Counsel
- **Phases:** (1) Posture — does a third-country operator offering EU services
  need EU authorisation/registration? (2) Forum contest — two Member-State NCAs
  (e.g. IT_ASI vs FR_CNES vs LU_LSA) assert/decline jurisdiction; (3) TCO
  determination — EU body rules on equivalence; (4) Registration — which
  national register + the UN register.
- **Artifacts:** jurisdiction-analysis memo, competing NCA position papers, EU
  TCO/equivalence determination, registration filing.
- **Grounding:** national-space-laws datasets (FR LOS+CNES, **IT Law 89/2025 +
  MIMIT/ASI**, LU Space-Resources+LSA, UK SIA+CAA); EU Space Act TCO articles.

### F — ITU spectrum coordination for a new LEO system

- **Roles:** Operator, home Administration (regulator), competing-system
  Administration, Counsel
- **Phases:** (1) Advance publication / filing; (2) Coordination — reach
  bilateral agreement with affected Administrations/systems; (3) Interference
  dispute — competing GEO/MSS operator claims harmful interference; negotiate
  priority/EPFD limits; (4) Notification/recording in the MIFR + bring-into-use.
- **Artifacts:** ITU coordination request, interference-analysis memo, bilateral
  coordination agreement, EPFD/priority negotiation position.
- **Grounding:** ITU Iridium MSS (1992–96, the reference precedent for modern
  LEO-constellation filings), Inmarsat-Masaoka (FRAND on space-segment SEPs),
  FCC SCS framework.
- **Note:** least "document", most "negotiation" — a good pure two-party
  bargaining Planspiel.

### G — Insurance placement + claim after a launch/in-orbit loss

- **Roles:** Operator, Insurer/Underwriter, Counsel, (optional Reinsurer)
- **Phases:** (1) Placement — meet the EU Space Act Insurance Obligation /
  Minimum Coverage + national third-party-liability minima; Insurer prices +
  proposes exclusions; (2) Negotiation — scope vs premium vs deductible; (3)
  Loss event — pad anomaly / deployment failure; (4) Claim adjudication —
  coverage-position letter (covered/excluded/partial); dispute may arbitrate.
- **Artifacts:** risk-disclosure pack, policy term sheet + exclusions,
  statutory-minimum-coverage compliance check, claim notice,
  coverage-determination letter.
- **Grounding:** AMOS-6 (2017, SpaceX pad-anomaly insurance recovery), Viasat-3
  F1 antenna (2023 deployment-anomaly settlement). Natural **second act** after
  A (authorise → insure) or B (incident → claim).

> **Italy/Genova anchors (lean in for the partner):** Archetypes B/D/E each ship
> an Italian variant grounded in real corpus entries — the **ASI Re-entry
> Determination (Mk-1, 2022)** under ASI Note 02/2022 + Law 89/2025 (casualty
> thresholds 10⁻⁴ uncontrolled / 10⁻⁵ over Italian territory) with **IT_ASI** as
> regulator, the **Vega-C VV22 failure (2022)** Italian-built Avio launcher, and
> the **Italian Space Economy Act (Law 89/2025, MIMIT + ASI)** as the home
> jurisdiction. The **ASI re-entry/debris** scenario is the recommended _first
> flagship_ (smallest roster, richest Italy-anchored cited case).

---

## 5. Mechanics

A four-layer model, copying the proven Academy _philosophy_ (drive a learner
exercise through the real engines + persist a graded snapshot) while replacing
its option-picking with artifact production.

### 5.1 Phases / turns — reuse the workflow state machine

`src/lib/workflow/` is a **generic, context-typed finite state machine**
(`WorkflowDefinition` with states + transitions + `guard` + `onEnter`/`onExit`
hooks + `requiredPermissions` per transition + optimistic-locking `newVersion`).
It already powers `AuthorizationState`
(`not_started → in_progress → ready_for_submission → submitted → under_review →
approved/rejected/withdrawn`) and `IncidentState`
(`reported → triaged → investigating → mitigating → resolved → closed /
nca_notified`). **A Planspiel _is_ a workflow.** Scholar adds a new
`ScholarPlanspielDefinition` (phases as states) + a thin
`src/lib/scholar/planspiele/sim-workflow.server.ts` wrapper — **no edits to the
engine**, which is a generic lib file, not a frozen-surface file.

- **Phase advance is guarded** — e.g. "cannot submit until all mandatory
  artifacts are present for this phase" (mirrors the authorization
  `allMandatoryComplete` guard).
- **`requiredPermissions: ['regulator']`** on the `approve`/`reject` transition
  is what makes this a genuine role-play: _only the player holding the NCA role_
  (human or AI) can fire it.
- **Optimistic locking** (`expectedVersion` conflict handling) is exactly what
  concurrent multiplayer turns need.
- For the **monochrome UI**, use the state metadata `phase`/`order` for the
  progress bar; **drop the `color`/`icon`** metadata.

### 5.2 Branching — predicate guards over run state

Reuse the assessment wizard's `showIf?: (answers) => boolean` pattern as an
`unlockIf(priorChoices)` guard on each phase/decision node, so an earlier role
choice changes which decisions appear later. For richer "your choice → the
regulatory consequence" turns, optionally call the existing what-if chain/
composite scoring math (extracted into `src/lib/scholar/` if the cross-surface
guard blocks a direct import) to compute a real consequence with deltas.

### 5.3 Artifacts — first-class, gradeable outputs

Students DRAFT real outputs, stored as structured/free-text content on a
`ScholarPlanspielSubmission` row (see §6). The interaction surface is a **split
"cockpit"**: artifact editor on the left, the **relevant corpus provisions
readable in a collapsible right rail** (embedding the existing `ProvisionCard` /
`MetadataStrip` primitives) — so students draft _with the governing articles
open beside them_, and `CiteExport` can pull a verifiable citation into the
draft. **Hybrid editor recommended:** structured fields the engine can
auto-check + a free-text rationale box the AI rubric grades.

### 5.4 Solo vs classroom — ONE model with a mode flag

Both run on the **same** `ScholarPlanspielRun` discriminated by
`ScholarSimMode {SOLO, CLASSROOM}` — avoiding two parallel systems:

- **SOLO:** the student owns the run; **all non-student role-assignments are
  flagged `isAI = true`** and the Scholar AI coach plays the counterpart roles
  (the student is the operator drafting; the AI is the NCA issuing RFIs).
- **CLASSROOM:** the instructor creates the run from a `ScholarClassroom`;
  `assignedUserId` is set per role to different enrolled students; the
  phase-advance guard requires all human role-submissions for the current phase.
- **Negotiation** = a sequence of `NEGOTIATION_MSG` events between two
  role-assignments, optionally AI-mediated.

**MVP recommendation: SOLO with AI counterparts first.** True synchronous
multi-student play needs presence/turn-arbitration infra that Scholar does not
have today (no websocket layer). The data model is designed
(`roleAssignments`-ready) so multiplayer is an additive phase, **not** a
migration churn. (See Key Decision KD-1.)

### 5.5 AI feedback — a Scholar-native coach, NOT the Astra engine

The full Astra engine is **not reusable**: `AstraEngine.processMessage()` calls
`buildCompleteContext(userId, organizationId)` which fetches the _org's live
compliance posture_ and wires an org-bound tool-executor — both wrong inside a
fictional teaching scenario, and Astra is a frozen surface. **Reuse only the
Anthropic _call pattern_** in a new `src/lib/scholar/planspiele/sim-coach.server.ts`:

- model from an env var with a graceful **no-key fallback** (if
  `ANTHROPIC_API_KEY` is unset, the module degrades to engine-only +
  rubric-checklist self-assessment — preserving zero-cost operability);
- a **scenario-scoped** system prompt (the scenario's facts + the Atlas
  regulatory-knowledge static files) — **no** `buildCompleteContext`, **no** org
  tool-executor;
- run `validateCitations()` (the existing citation-validator) on **every** AI
  critique/NPC turn so a hallucinated regulatory reference is flagged before it
  reaches the student.

### 5.6 Scoring — a transparent, two-track hybrid (P8)

Visible to students **before** they start. Final grade precedence:
**`instructorScore ?? aiRubric.suggested ?? engineScore`** — the instructor is
**always authoritative** (essential for a university partner where pedagogical
accountability sits with faculty).

- **Track 1 — Objective / engine-graded (free, deterministic, reproducible).**
  When a role artifact is a classification or a licence checklist, feed it into
  the real `calculateCompliance` / `calculateNIS2Compliance` /
  `calculateSpaceLawCompliance` engines (called server-side, READ-ONLY) and
  score with a Scholar copy of the proven weighted partial-credit scorer
  (`scoreSimulation` precedent: operator-classification, regime, article-ID
  _partial credit_, module-prioritization, NIS2, completeness). The engines are
  the **authoritative answer key** — "work like in practice" authenticity for
  free.
- **Track 2 — Free-text / AI-rubric (advisory).** For drafted prose (cover
  letter, debris plan, advice memo), the `sim-coach` grades clarity, correct
  legal basis, completeness, citation accuracy — returning the same
  `{category, weight, earned, correct, note}` feedback shape the Academy already
  renders, re-skinned monochrome.
- **Engine-graded vs rubric-graded is declared per phase** so content authors
  know which decisions get a real-engine verdict.

### 5.7 Debrief — the pedagogical core (P5)

A mandatory final phase: a transcript replaying decisions + artifacts +
feedback, each item **deep-linked back to the cited source/case page** in the
Scholar corpus, plus a graded **reflective write-up** (PEARLS prompts:
self-assessment → reflection → directed feedback → focused teaching). Solo: the
AI facilitates; classroom: the instructor drives a group debrief. Exportable
(reuse the existing `CiteExport` + account-export pattern). Budget design time
here, not on graphics.

---

## 6. Data model + reuse map

### 6.1 The non-negotiable patterns (mirror existing Scholar)

All existing Scholar models (`ScholarUserPreferences`, `ScholarSearchHistory`,
`ScholarBookmark`, `ScholarReadingList`, `ScholarReadingListItem`) are
**Scholar-prefixed and deliberately User-DECOUPLED** — a bare `userId String`
with **no relation field on `User`**, "so Scholar schema additions don't require
a User migration." Every new `Scholar*` model **must** follow this: bare
`userId` (+ `instructorId` for the classroom), `@@index([userId, …])`, `@@unique`
composites, cuid() ids, additive `db push`. **Note:** this is the one place
Academy is a _bad_ template — its `AcademyClassroom`/`AcademyBadge`/
`AcademySimulationRun` all carry a `User` relation; Scholar must NOT.

Every read/write is **IDOR-safe** per `saved-items.server.ts`: filter by
`userId`; mutate owned rows with `updateMany`/`deleteMany where {id, userId}`
(no-match → count 0 → false, no throw/leak); verify **parent ownership first**
(`findFirst {id, userId}`) before touching child rows; per-user caps;
corpus-resolved refs drop dead ids. Each entity gets a server-only service +
`'use server'` action pair, gated on `getScholarAuth()`, Zod-validated + bounded,
rate-limited, `revalidatePath`'d.

### 6.2 Scenarios live in CODE, not the DB (for MVP)

Mirroring how Academy keeps scenarios in `src/data/academy/scenarios.ts` and
persists only _runs_, Planspiel **scenario definitions are typed code modules**
under **`src/data/scholar/planspiele/`** (new dir — does not exist yet):
`id`, `titleKey` (i18n), `difficulty`, `roles[]` (`{roleKey, brief, privateBrief,
objectives, artifactSpec, successRubric}`), `phases[]` (`{phaseKey, advanceRule,
unlockIf}`), `citedSourceIds[]` / `citedCaseIds[]` (resolved via the corpus
helpers), `rubric[]`. Keeping scenarios in code = no seed migration, i18n via the
existing pattern, free corpus-citation, and a clean re-authoring of the legal
content (NOT a cross-surface import from `src/data/academy/`).

### 6.3 New additive Prisma models (6 models + 2 enums)

| Model                                | Purpose                                              | Key fields (all User-decoupled)                                                                                                                                                                                                                              |
| ------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`ScholarClassroom`**               | Instructor cohort container                          | `instructorId`, `organizationId`, `joinCode @unique`, `name`, `assignedScenarioIds String[]`, `deadlines Json?`, `isActive`                                                                                                                                  |
| **`ScholarPlanspielRun`**            | One play-through (per user × scenario × role)        | `scenarioId`, `classroomId?`, `mode (SOLO\|CLASSROOM)`, `ownerUserId`, `status` (workflow state), `currentPhase`, `version Int` (optimistic lock), `startedAt`, `completedAt`, `@@index([ownerUserId])`, `@@index([classroomId])`                            |
| **`ScholarPlanspielRoleAssignment`** | Map a role to a student (or mark AI)                 | `runId`, `roleKey`, `assignedUserId?`, `isAI Boolean`, `@@unique([runId, roleKey])`, `@@index([assignedUserId])`                                                                                                                                             |
| **`ScholarPlanspielSubmission`**     | The graded artifact (both tracks + override)         | `runId`, `roleAssignmentId`, `phaseKey`, `artifactType`, `contentJson Json` (the draft), `engineScore Float?`, `engineFeedback Json?`, `aiRubricJson Json?`, `instructorScore Float?`, `instructorNote String?`, `submittedAt`, `@@index([runId, phaseKey])` |
| **`ScholarPlanspielEvent`**          | Append-only timeline (replay/audit/multiplayer feed) | `runId`, `actorUserId?`, `kind (PHASE_ADVANCED\|SUBMISSION\|GRADE\|ROLE_ASSIGNED\|NEGOTIATION_MSG)`, `payload Json`, `createdAt`, `@@index([runId, createdAt])`                                                                                              |
| **`ScholarPlanspielBadge`**          | Completion/mastery record (monochrome)               | bare `userId`, `badgeKey`, `earnedAt`, `metadata Json?`, `@@unique([userId, badgeKey])` — a Scholar-native badge, NOT `AcademyBadge` (which relates to User + is colored/gamified)                                                                           |

**Enums:** `ScholarSimMode {SOLO, CLASSROOM}` and `ScholarPlanspielRunStatus`
(mirrors the workflow phase set). String discriminators (matching existing
Scholar style) are fine where an enum is overkill.

### 6.4 REUSE MAP — what is reused vs built Scholar-native

| Capability                                                                                                                                                                                                            | Decision                        | How                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Legal engines** (`engine.server.ts`, `nis2-engine.server.ts`, `space-law-engine.server.ts`; + export-control/spectrum/copuos)                                                                                       | **REUSE READ-ONLY**             | Import the **pure functions only** as the deterministic answer key (Track 1). Call **server-side** under `getScholarAuth()`; respect `redact*ForClient()` — surface only teaching output + the student's own draft, never the raw IP payload. NEVER import the DB-coupled `*-service.ts` orchestrators (incident-autopilot, nca-submission-service) — re-implement persistence against `Scholar*` models. |
| **Workflow state machine** (`src/lib/workflow/`)                                                                                                                                                                      | **REUSE (generic lib)**         | Add a `ScholarPlanspielDefinition` + thin wrapper. It is a generic lib file, not a frozen surface. Use guards, `requiredPermissions`, optimistic locking; drop color/icon metadata.                                                                                                                                                                                                                       |
| **Atlas corpus** (`src/data/legal-sources`, `src/data/legal-cases`, treaties, national-space-laws)                                                                                                                    | **REUSE READ-ONLY**             | Scenario factory (case → playable scenario via `facts`/`ruling`/`holding`/`remedy`/`applied_sources`) + in-cockpit research (Scholar search/source-detail libs already read it). Treat `applied_sources` ids as a **read-only contract** — no scenario hard-codes a source id a future corpus correction could rename without a resolver fallback.                                                        |
| **Anthropic call pattern** (shape of `astra/engine.ts`: env-model, no-key fallback, retry/backoff, citation-validator)                                                                                                | **MIRROR pattern only**         | New `sim-coach.server.ts`. **Do NOT** reuse `AstraEngine` / `buildCompleteContext` / org tool-executor (org-bound + frozen).                                                                                                                                                                                                                                                                              |
| **Academy scoring loop** (`scoreSimulation` weighted partial-credit)                                                                                                                                                  | **COPY pattern**                | A Scholar copy of the scorer for Track 1. The _legal content_ of the 10 Academy scenarios is **re-authored** (not imported) into `src/data/scholar/planspiele/`, preserving the article-grounded feedback as model-answer rubrics.                                                                                                                                                                        |
| **Academy classroom/instructor concept** (`AcademyClassroom`: instructor, CSPRNG join-code, assignedCourses, deadlines, enrollments + instructor-analytics endpoint)                                                  | **MIRROR concept, NEW models**  | New `ScholarClassroom` gated on `getScholarAuth()` (instructor = org role OWNER/ADMIN/MANAGER; student = MEMBER). **Copy only the `generateJoinCode()` CSPRNG helper** (`node:crypto.randomInt`) and the analytics-endpoint _shape_. Do NOT reuse `AcademyClassroom` — it is `User.role`-gated (not SCHOLAR-entitled) + its `organizationId` is an unscoped loose String.                                 |
| **Academy enrollment/progress/badge mechanics**                                                                                                                                                                       | **COPY patterns, NEW taxonomy** | Re-implement the idempotent badge-award + streak patterns with a **role-play taxonomy** (role mastery, agreement-reached, full-lifecycle) — NOT the quiz-centric `AcademyBadgeType` (`SIMULATION_MASTER` = "complete all 10 scenarios").                                                                                                                                                                  |
| **Academy `SimulationRunner.tsx` interaction flow** (briefing → stepped decisions → calculating → results)                                                                                                            | **REFERENCE only**              | Re-skin the _structure_ monochrome with Scholar `_components`. Import **zero** `components/academy/*` or `GlassCard` — they are navy/emerald and break the monochrome mandate.                                                                                                                                                                                                                            |
| **Scholar gate** (`getScholarAuth()`)                                                                                                                                                                                 | **REUSE verbatim**              | Single choke point for every new server action and any `/api/scholar/planspiele/*` route.                                                                                                                                                                                                                                                                                                                 |
| **Scholar persistence/IDOR pattern** (`saved-items.server.ts` + actions)                                                                                                                                              | **REUSE pattern verbatim**      | Per-entity service + action pair, including the account-deletion-cascade discipline Scholar already tests (these are student-PII-bearing drafts under GDPR).                                                                                                                                                                                                                                              |
| **Scholar UI primitives** (`ScholarShell`, `ScholarPage`, `PageHeader`, `SCHOLAR_TYPE`, `SourceRow`/`CaseRow`, `ProvisionCard`, `MetadataStrip`, `CiteExport`, `AiDisclosure`, `SettingsTabs` RSC→Client tab pattern) | **REUSE**                       | Compose the entire Planspiele UI from these.                                                                                                                                                                                                                                                                                                                                                              |
| **Scholar i18n** (`_i18n/*` per-namespace, `t(locale, NS, key)`, EN source-of-truth, `as const satisfies ScholarNamespace`)                                                                                           | **REUSE + EXTEND**              | Add `planspiele.ts` (chrome/catalog) + `planspiele-play.ts` (workspace) namespaces in all five locales (EN/DE/IT/FR/ES — **IT matters for Genova**), + one `planspiele` key in `nav.ts` ×5.                                                                                                                                                                                                               |

### 6.5 Entitlement & rate-limit

- **Entitlement:** Planspiele sits **under the existing `SCHOLAR` ProductCode** —
  one university licence unlocks reader + Planspiele. `getScholarAuth()` already
  gates the whole surface uniformly; no separate `ProductCode` is proposed.
  (There is **no `ACADEMY` ProductCode** — another reason Academy can't host
  this.) See KD-3.
- **Rate-limit:** start on the existing `scholar` Upstash tier; a turn-heavy +
  AI-graded workspace may warrant a dedicated `scholar_sim` tier in
  `src/lib/ratelimit.ts` (the one config touch outside Scholar-scoped files — an
  additive change). See KD-5.

---

## 7. UX flows (monochrome Scholar style)

### 7.1 Surface integration (five existing seams, all already present)

1. **Route group** — new pages under `src/app/(scholar)/scholar/planspiele/**`
   inherit `getScholarAuth()` + MFA + SCHOLAR entitlement from the group
   `layout.tsx` for **free** (no new gating code).
2. **Sidebar nav** — append `{labelKey:'planspiele', href:'/scholar/planspiele',
icon: <Drama|Swords|Gamepad2|Users>}` to `MAIN_NAV` in `ScholarShell.tsx`
   (the comment forbids nav items whose href doesn't exist → **add the route
   first, the nav entry last**), + a `planspiele` key in all 5 `nav.ts` locale
   blocks. The icon inherits the dark-sidebar styling automatically.
3. **i18n** — new namespace files (no barrel to update; namespaces are imported
   per-file).
4. **Persistence** — new `Scholar*` models + IDOR-safe service/action pairs.
5. **Server actions / API** — `getScholarAuth()`-gated; a streaming AI coach
   would use a `/api/scholar/planspiele/*` route handler (mirrors
   `/api/scholar/search`), form-style mutations use server actions (mirror
   `saved-items-actions`).

### 7.2 Student flow

1. **Catalog** (`/scholar/planspiele`) — `ScholarPage` + `PageHeader` + card
   rows (reuse the `SourceRow`/`CaseRow` pattern): scenario title, role,
   difficulty/duration eyebrows, a "past attempts" strip. Filter by module /
   jurisdiction / tier.
2. **Brief + role pick** (`/scholar/planspiele/[id]`) — the **pre-brief screen**
   (P4): objectives, roles, the safe-to-fail fiction contract; the operator-
   profile facts via `MetadataStrip`; "Rolle übernehmen & starten".
3. **The cockpit** (`/scholar/planspiele/[id]/run/[runId]`) — split view: \*\*task
   - artifact editor** (structured fields / monochrome textarea) on the left;
     collapsible **"Rechtsquellen" corpus rail** (embedded `ProvisionCard` /
     `MetadataStrip`, deep-linking `/scholar/sources/{id}` + `/scholar/cases/{id}`)
     on the right; a sticky **phase-progress bar** (monochrome fill/borders, no
     color); "Phase abschließen" advances the guarded workflow. Composed with the
     RSC→Client discipline (server fetches run + scenario, renders panels as
     `ReactNode` into a client shell — reusing the `SettingsTabs` WCAG tab/keyboard
     pattern; pass server actions as props, **never plain functions\*\*).
4. **Results** — a monochrome re-skin of the `SimulationRunner` results screen:
   score ring redrawn in gray, the two-track rubric breakdown, model-answer
   reveal.
5. **Debrief** — replay + reflective write-up + corpus deep-links; exportable.
6. **AI transparency throughout** — reuse `AiDisclosure` + the existing "not
   legal advice / no warranty" footer on every Planspiele screen and every
   AI-graded item (consistent with the search page's EU-AI-Act framing).

### 7.3 Instructor flow

- **Instructor surface** at `/scholar/planspiele/instructor`: list the
  instructor's Scholar classes, **assign** a scenario to a class, and view a
  **submissions list** (one row per student run: name, status from the workflow
  state, score, last activity) — the `AcademyClassroom` roster _shape_, rebuilt
  monochrome with IDOR-scoped `ScholarClassroom`/`ScholarPlanspielRun` queries +
  the instructor-ownership-checked analytics endpoint shape (progress
  distribution, completion, time, common mistakes).
- **Instructor controls = guarded workflow transitions** (`requiredPermissions:
['instructor']`, resolved from `ScholarClassroom.instructorId ===
getScholarAuth().userId`): assign-roles, advance-phase (the all-submissions
  guard), **review/grade** (write `instructorScore` + `instructorNote`,
  authoritative), reopen-phase.
- **Cohort = the SSO-gated university org** for MVP (Scholar is already
  org-entitled; the org _is_ the cohort) — a per-class **join code** (reusing the
  CSPRNG helper) is a Phase-3 nicety for cross-cohort multiplayer.

---

## 8. MVP — smallest end-to-end valuable slice + the Genova demo story

### 8.1 MVP scope (one vertical slice, demoable end-to-end)

- **ONE flagship scenario.** Recommended: the **ASI Re-entry/Debris (Italy)**
  scenario for maximum Genova resonance — _or_ the **"Authorize a German LEO
  Earth-observation satellite"** scenario for the most complete RFI→decision loop
  (re-frame the existing `sim-leo-sat-auth` content from quiz to practice). Pick
  one; both are flagship-tier. (See KD-2.)
- **Role:** the **Operator/Applicant** (the student); **AI plays the NCA**.
- **Mode:** SOLO.
- **4 phases** producing real artifacts: P1 determine the competent authority &
  pathway (decision + 1-line justification citing the governing article); P2
  assemble the application — a structured form (insurance / debris / cybersecurity
  toggles) with the articles open in the rail, validated live by the engine; P3
  draft the NCA cover letter (free-text, must reference ≥2 provisions, CiteExport
  available); P4 respond to an NCA deficiency notice (revise one artifact).
- **Scoring:** Track 1 engine-graded for the objective parts; Track 2
  AI-rubric for the free-text (with the **no-key fallback** to
  rubric-checklist self-assessment so the MVP runs at zero external cost if
  needed).
- **Debrief:** transcript + corpus deep-links + a short reflective write-up.
- **Instructor:** a thin "assign + view submissions (read-only scores)" view;
  grade-override is Phase 2.
- **i18n:** **EN + DE + IT fully** for the demo; FR/ES strings stubbed via the
  namespace pattern.

### 8.2 The 10-minute Genova demo story

1. Open `caelex.eu/scholar` (SSO-gated, monochrome, "powered by Atlas"). Click
   **Planspiele** in the sidebar → catalog → open the flagship scenario (in IT or
   DE).
2. Read the **role brief** (a real operator profile), accept the fiction
   contract, click "Rolle übernehmen".
3. **P1:** choose the competent authority — open the right rail, read the
   governing article **verbatim from the frozen corpus**, pick the NCA, write a
   one-line justification.
4. **P2:** assemble the application — toggle insurance/debris/cybersecurity with
   the relevant articles readable alongside; the EU Space Act engine validates
   completeness **live**.
5. **P3:** draft the NCA cover letter citing two provisions (CiteExport pulls the
   citation).
6. **Submit** → score + AI rubric feedback ("strong legal basis, but you omitted
   the debris end-of-life note") + model-answer reveal; the AI-NCA returns a
   deficiency notice; **P4** revise.
7. Switch to the **instructor view**: the professor sees the cohort's submissions
   and scores.

The narrative lands three differentiators at once: **grounded** in the real
corpus students already read in Scholar; **production, not multiple-choice**; and
**slots into a professor's class with zero setup**. Everything in the demo is
inside MVP scope.

---

## 9. Phased build plan (rough effort)

> Effort bands are rough order-of-magnitude for a single engineer; each phase is
> independently shippable. The data model is designed in Phase 1 to accommodate
> later phases without migration churn.

| Phase  | Title                                                   | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                  | Effort          |
| ------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **P1** | **MVP vertical slice (Genova-demoable)**                | §8 scope: 1 flagship scenario (code-defined), Operator role, SOLO, AI-NCA, 4 phases, Track-1 engine grading + Track-2 AI rubric (with no-key fallback), debrief, thin instructor assign+view. New `Scholar*` models + IDOR-safe services/actions; `ScholarPlanspielDefinition` + workflow wrapper; cockpit UI from Scholar `_components`; `planspiele` + `planspiele-play` i18n namespaces (EN/DE/IT full, FR/ES stub); nav entry last. | **~2.5–3.5 wk** |
| **P2** | **Breadth + instructor grading + badges**               | 3–4 scenarios across modules (add Archetype B NIS2-incident on `IncidentState`, a debris/STM scenario, a cross-border advice memo); richer artifact editors; **instructor grade-override + written feedback**; monochrome Scholar completion badges (role-play taxonomy); instructor-analytics endpoint (progress/completion/common-mistakes).                                                                                          | **~2–3 wk**     |
| **P3** | **Multiplayer roles**                                   | Two students hold operator vs regulator on the **same** workflow instance (operator submits → regulator reviews → approves/issues deficiency), via workflow transitions + a turn/handoff + notification (start **async** with poll + `revalidatePath`; live presence is a stretch); per-class join code; classroom cohort assignment; live instructor "classroom board".                                                                | **~3–4 wk**     |
| **P4** | **Instructor scenario authoring ("superkrass" payoff)** | Promote `ScholarPlanspielScenario` to a persisted, IDOR-safe model + a builder UI (define roles, phases, artifact schemas, rubric, corpus links) so Genova faculty author their own Planspiele. Largest scope lever; explicitly out of v1.                                                                                                                                                                                              | **~4–6 wk**     |

---

## 10. Key decisions / open questions for the owner

| #        | Question                                                                                                                                                                                                                                                                                                                                   | Options                                                                                                                                                                                                                                                       | Recommendation                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KD-1** | **Solo vs synchronous multiplayer for v1?** This is the single biggest architecture fork. Synchronous multi-student play needs presence/turn-arbitration (no websocket layer exists in Scholar today).                                                                                                                                     | (a) **SOLO + AI counterparts** (async, zero new infra); (b) **synchronous multi-student** (new realtime infra).                                                                                                                                               | **(a) for v1**, with the data model `roleAssignments`-ready so multiplayer (Phase 3) is additive, starting async (poll + `revalidatePath`) before any live presence.                                                                                  |
| **KD-2** | **Which flagship scenario ships in the MVP** for the Genova demo?                                                                                                                                                                                                                                                                          | (a) **ASI Re-entry/Debris (Italy)** — flatters Genova, smallest roster, richest Italy-anchored cited case; (b) **German LEO Authorization** — most complete RFI→decision loop, reuses `sim-leo-sat-auth`.                                                     | **(a) for partner resonance**; build (b) immediately after in Phase 2. (Owner's call on demo emphasis.)                                                                                                                                               |
| **KD-3** | **Entitlement granularity** — does Planspiele need its own ProductCode/metering, or is it included under `SCHOLAR`?                                                                                                                                                                                                                        | (a) **Under existing `SCHOLAR`** (one licence = reader + Planspiele); (b) a separate gate/meter.                                                                                                                                                              | **(a)** — `getScholarAuth()` gates uniformly; simplest for a free university licence.                                                                                                                                                                 |
| **KD-4** | **AI-coach cost posture** vs the "zero external cost" stance. Track-1 engine grading is free; Track-2 free-text critique + AI NPCs cost Anthropic tokens.                                                                                                                                                                                  | (a) **AI advisory with a per-classroom/per-student quota**; (b) **instructor-triggered batch grade** (bounds spend); (c) **engine-only + rubric-checklist** (zero cost, no free-text critique).                                                               | **Ship (c) as the guaranteed-free fallback (no-key path); enable (a) where `ANTHROPIC_API_KEY` is configured.** Confirm the acceptable quota.                                                                                                         |
| **KD-5** | **Instructor identity** on a university SCHOLAR licence (university orgs may not map onto OWNER/ADMIN/MANAGER cleanly), and **rate-limit tier**.                                                                                                                                                                                           | (a) instructor = org role (OWNER/ADMIN/MANAGER) from `ScholarAuthContext`; (b) an explicit `ScholarClassroom`-level instructor flag/grant; + keep `scholar` tier or add `scholar_sim`.                                                                        | **(a) for MVP** (simplest); revisit a dedicated educator grant + `scholar_sim` tier when classroom/multiplayer lands.                                                                                                                                 |
| **KD-6** | **Cross-surface guard on engine/corpus imports.** The legal engines + corpus live outside `src/lib/scholar/`; the path-based pre-commit guard blocks Atlas/Pharos/Trade/Comply _file edits_ — does it also block Scholar code from _importing_ frozen lib/data READ-ONLY? Determines whether "re-run the real engines" is buildable as-is. | (a) reads are allowed (import-only) → build as designed; (b) reads are blocked → extract pure scoring + corpus-lookup helpers into `src/lib/scholar/`, or scope to EU-Space-Act + NIS2 + national-law engines (export-control/spectrum live in frozen Trade). | **Verify early.** Plan A if allowed; otherwise extract pure helpers into Scholar and defer Archetype C (export-control) to a later wave.                                                                                                              |
| **KD-7** | **Artifact grading fidelity / editor surface.**                                                                                                                                                                                                                                                                                            | (a) free-text prose graded by AI rubric; (b) structured forms auto-checked by engines; (c) **hybrid** (structured fields for Track 1 + a free-text rationale box for Track 2).                                                                                | **(c)** — maximizes reuse of both graders and feels most "practice-like".                                                                                                                                                                             |
| **KD-8** | **Assessment stakes + GDPR.** Formative self-practice vs summative university credit (raises validity/integrity/audit needs); reflective journals + free-text drafts are student PII (and may be sent to Anthropic). Scholar prefs already default search-history/semantic-search **OFF** (Art. 25(2)).                                    | (a) formative-only v1; (b) summative with instructor sign-off on every grade + audit trail.                                                                                                                                                                   | **(a) formative-only v1**, instructor-authoritative grading; make free-text AI-grading **opt-in** per the existing privacy-by-default stance; auto-expire completed runs on a retention timer; the existing Scholar export/delete must join run data. |
