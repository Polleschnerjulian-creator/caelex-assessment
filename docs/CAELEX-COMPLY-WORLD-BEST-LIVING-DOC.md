# CAELEX COMPLY — World-Best Edition · Living Document

> **STATUS:** Active — Sprint A1 + Q0 shipped, Sprint A2 ready to start
> **VERSION:** 1.1 (Sprint A1 + Q0 complete)
> **LAST UPDATED:** 2026-05-20
> **OWNER:** Julian Polleschner (polleschnerjulian@gmail.com)
> **CONTRIBUTORS:** Julian + Claude Opus 4.7 (1M context)
>
> **⚡ FOR FUTURE CLAUDE SESSIONS (post-compaction):** Read sections 1, 2, 4, and 11 first. Section 11 (How to Use This Doc) tells you exactly how to maintain and consume this file. Sections 5 + 6 are the execution truth — start there for any "what should I do next?" question.

---

## Table of Contents

1. [TL;DR — Context Recovery in 30 Seconds](#1-tldr)
2. [The Vision (North Star)](#2-vision)
3. [The Three Strategic Constraints](#3-constraints)
4. [Locked Decisions (Hard-Committed)](#4-decisions-locked)
5. [Current State Snapshot (from 6-Agent Audit, 2026-05-20)](#5-current-state)
6. [The 14-Week Plan (Phase A → E)](#6-plan)
7. [Active Sprint Tracker](#7-sprint-tracker)
8. [Decision Log (chronological)](#8-decision-log)
9. [Open Questions / Pending Decisions](#9-open-questions)
10. [Risk Register](#10-risk-register)
11. [Glossary](#11-glossary)
12. [Reference Map (audit findings + source docs)](#12-reference-map)
13. [Code Anchor Map (key files discovered)](#13-code-anchor-map)
14. [How to Use This Document (update protocol)](#14-update-protocol)

---

<a id="1-tldr"></a>

## 1. TL;DR — Context Recovery in 30 Seconds

**What we're building:** Caelex Comply — World-Best Edition. The only EU-sovereign trilateral cryptographic compliance mesh for the space industry. Operator (Comply) × Counsel (Atlas) × Authority (Pharos) automatically connected on a shared, hash-chain-verified compliance truth. Zero external costs (only AI tokens). EU-wide Day-1 identity resolution via VIES + BRIS + GLEIF.

**Why it matters:** Drata/Vanta serve only operators. Palantir Foundry is horizontal. No one has space-vertical multi-actor with live physics + cryptographic provenance. We win by being structurally uncopyable.

**Where we are:** Audit complete (2026-05-20). ~70-75% of Palantir-level DNA already built. Building the remaining 25-30% in **14 weeks** across 5 phases.

**Next action:** Sprint A1 — EU Tier-1 Adapter (VIES + BRIS + GLEIF) → unlocks all 27 EU + EFTA Day-1 identity resolution.

**Authoritative sources:**

- This document (single source of truth for current plan)
- [docs/CAELEX-COMPLY-CONCEPT.md](docs/CAELEX-COMPLY-CONCEPT.md) (parent concept doc)
- [docs/CAELEX-COMPLY-2027-VISION.md](docs/CAELEX-COMPLY-2027-VISION.md) (long-term vision)
- 6 audit reports from session 2026-05-20 (see Section 12)

---

<a id="2-vision"></a>

## 2. The Vision (North Star)

> **In one sentence:** The only platform where an EU satellite operator sees a fully pre-generated compliance roadmap with 47+ ComplianceItems, 3 pre-filled authorization drafts, an auto-matched counsel, and auto-detected supervisory NCAs — all cryptographically attestable, within 90 seconds of Google SSO, at zero external cost beyond AI tokens.

### The Day-1 Magic Moment

```
T+0:00   User clicks "Continue with Google" at caelex.eu
T+0:08   Background enrichment runs:
         - VIES validates VAT, returns name + address (all 27 EU)
         - BRIS finds business registry record (cross-border)
         - GLEIF returns Legal Entity ID + ownership structure
         - UNOOSA scans space-object filings under operator name
         - CelesTrak/Space-Track find any pre-existing satellites
         → EnrichedProfile at VerificationTier T1 (auto-detected)

T+0:15   "Welcome Anton. We found Caelex GmbH in DE-HRB.
          Confirm 3 things — we'll build your compliance world."
         [Confirm: Berlin HQ] [Confirm: LEO Earth Observation]
         [Confirm: 6 satellites planned 2026-2028]

T+1:30   Astra has generated:
         - 47 ComplianceItems (EU Space Act × 23, NIS2 × 11, DE BWRG × 8, COPUOS × 5)
         - 3 Authorization-Drafts (Pre-Filed: BMWK, BNetzA, BAFA, 80% complete)
         - 12-month roadmap with critical-path dependencies
         - Sentinel-Forecast for planned orbits
         - Peer-Posture: "47th percentile vs. 14 DE LEO Operators"
         - Suggested Counsel: Dr. Schmidt @ BHO Legal (auto-discovered)
         - Supervising NCAs: BMWK, BNetzA, BAFA (auto-detected)

T+1:35   /dashboard/today shows curated inbox.
         Anton clicks first item → pre-filled draft.
         5 minutes of operator work. 90 seconds of platform work.
         All lineage cryptographically anchored.
```

### The Trilateral Choreography

The genius is not Comply alone. It's the auto-connected three-actor flow:

```
OPERATOR (Comply)              COUNSEL (Atlas)              AUTHORITY (Pharos)

Anton drafts BMWK     ────▶    Auto-discovered counsel      Auto-discovered NCA
authorization                  Dr. Schmidt @ BHO Legal      BMWK + BNetzA + BAFA
                               sees draft in Atlas queue
                               WITH context, mandate-
                               scoped data view

                               Reviews in Multiplayer-
                               Canvas with Anton live  ─▶   Sees structured dossier:
                                                            - Operator hash-chain
                               Approves & forwards          - Counsel signature
                               via Atlas              ─▶   - Verity attestation
                                                            - Full data lineage
                                                            - Bitcoin anchor

                                                            Sachbearbeiter clicks
                                                            "Pre-approved" in
                                                            Pharos workflow
```

Three actors. One cryptographic truth. Three seconds.

No competitor has this. Drata/Vanta don't model authorities. Palantir doesn't do space. We do all of it.

---

<a id="3-constraints"></a>

## 3. The Three Strategic Constraints

Confirmed 2026-05-20 in conversation with founder:

### Constraint 1: EU-Wide, Not Just Germany

Coverage target: **27 EU member states + UK + EFTA (NO, CH, IS, LI)**. Tier-1 free APIs (VIES + BRIS + GLEIF) cover all 27 + EFTA. Tier-2 country-specific adapters prioritize space-industry volume.

### Constraint 2: Zero External Costs (AI tokens only)

**Allowed:**

- Anthropic Claude API tokens (Astra)
- Free public APIs (VIES, BRIS, GLEIF, CelesTrak, Space-Track, UNOOSA, EUR-Lex, ESA DISCOS, ENISA, CISA, EU Sanctions, UN Sanctions, country-specific free registries)
- HTML scraping of public portals (fragile but free)

**Forbidden:**

- OpenCorporates Subscription
- Paid data providers (Bureau van Dijk, Refinitiv, Dun & Bradstreet)
- Any per-API-call cost beyond AI tokens

### Constraint 3: Trilateral Ecosystem is the Core

Comply, Atlas, and Pharos must be **automatically connected**, not separate products. Auto-discovery patterns:

1. Operator → Counsel (Pattern 1)
2. Operator → NCA (Pattern 2)
3. Counsel finds new mandates (Pattern 3)
4. Authority sees compliance pipeline (Pattern 4)
5. Cross-operator pattern detection (Pattern 5, anonymized)

---

<a id="4-decisions-locked"></a>

## 4. Locked Decisions (Hard-Committed 2026-05-20)

| #   | Decision                                                                        | Rationale                                                                             |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | **EU Tier-1 (VIES + BRIS + GLEIF) as Phase A1** instead of DE-only              | Strategically fundamental — pitch story changes from "DE-tool" to "EU-infrastructure" |
| 2   | **Top-10 EU Tier-2 country adapters in Sprint A2** (+4 days)                    | Demo requires multi-country evidence                                                  |
| 3   | **Phase A = 4 weeks** (was 3), to include Trilateral Auto-Discovery (Sprint A4) | This is the moat. Cannot defer.                                                       |
| 4   | **Phase E = 2 weeks** (was 1) for MCP + Ecosystem-Bridge APIs                   | Distribution-channel enabler                                                          |
| 5   | **Total = 14 weeks** (was 12)                                                   | World-Best needs the extra 2 weeks                                                    |

**Plus quick-win pre-Sprint:**

- **Q0 (2 hours):** Fix Authorization-Module Generate-Document button to point at `POST /api/generate2/documents` (currently routes to non-existent `?type=` query-param endpoint)

**Plus longer-term:**

- **EnrichedProfile model strategy:** Repurpose existing `DerivationTrace.sourceRef` with rigid schema convention (no new migration) for Phase A. Dedicated models only if Phase 2 justifies it.

---

<a id="5-current-state"></a>

## 5. Current State Snapshot (from 6-Agent Audit, 2026-05-20)

### What We Have (Production-Ready)

#### Comply-V2 Core

- **[src/lib/comply-v2/types.ts](src/lib/comply-v2/types.ts)** — 171 LOC — ComplianceItem projection over 10+ legacy `*RequirementStatus` tables. Status normalization. **PRODUCTION**.
- **[src/lib/comply-v2/actions/define-action.ts](src/lib/comply-v2/actions/define-action.ts)** — **569 LOC** — Single mutation layer with Auth + Validation + Rate-Limit + Audit + Approval-Routing + Palette registration + Astra-tool projection. **PRODUCTION**.
- **[src/lib/comply-v2/actions/compliance-item-actions.ts](src/lib/comply-v2/actions/compliance-item-actions.ts)** — 724 LOC — 7 registered actions: snooze, unsnooze, addNote, markAttested, requestEvidence, delegate, attachDocument.
- **[src/lib/comply-v2/actions/astra-bridge.server.ts](src/lib/comply-v2/actions/astra-bridge.server.ts)** — 237 LOC — Astra ↔ Action-Layer bridge. **PARTIAL** — NOT YET WIRED into engine.ts.

#### Ontology

- **[src/lib/ontology/types.ts](src/lib/ontology/types.ts)** — 146 LOC — **8 Node Types** (REGULATION, OBLIGATION, JURISDICTION, OPERATOR_TYPE, EVIDENCE_REQ, STANDARD, AUTHORITY, DOMAIN), **12 Edge Types** (IMPLEMENTS, APPLIES_TO, REQUIRES_EVIDENCE, CONFLICTS_WITH, SUPERSEDES, CODIFIES, EXTENDS, NEW_OBLIGATION, ADMINISTERED_BY, BELONGS_TO, SCOPED_TO, CONTAINS).
- **[src/lib/ontology/traverse.ts](src/lib/ontology/traverse.ts)** — 326 LOC — getObligationsForOperator, getSubgraph (BFS), getNodeDetail. **PRODUCTION**.

#### Trust Layer (the surprise — fully built)

- **`DerivationTrace`** model — schema.prisma:6232–6301 — T0-T5 VerificationTier + Hash-Chain per org. **PRODUCTION**.
- **`VerificationTier`** enum — schema.prisma:6320–6327 — T0_UNVERIFIED → T5_CRYPTOGRAPHIC_PROOF.
- **`ProfileSnapshot`** — schema.prisma:6338–6386 — signed frozen profiles.
- **`OperatorProfile`** — schema.prisma:6186–6218 — EU Space Act unified classification.
- **`AuditLog`** with Hash-Chain — schema.prisma:398–452.
- **`AuditTimestampAnchor`** (Bitcoin/OpenTimestamps) — schema.prisma:453–495 (Sprint 8A).
- **`AstraProposal`** with reproducibility JSON — schema.prisma:10322–10382 (Sprint 6B — EU AI Act Art. 12).
- **`VerityAttestation`**, `VerityCertificate`, `VerityIssuerKey`, `VerityLogLeaf`, `VerityLogSTH` — schema.prisma:7562–7799 (RFC 6962 transparency log). **255 green crypto tests.**
- **`SentinelAgent`, `SentinelPacket`, `CrossVerification`** — schema.prisma:7456–7556.

#### Astra Engine

- **[src/lib/astra/engine.ts](src/lib/astra/engine.ts)** — 1,133 LOC — max 10 tool iterations, streaming, retry. Model: `claude-sonnet-4-6`.
- **[src/lib/astra/tool-definitions.ts](src/lib/astra/tool-definitions.ts)** — 1,659 LOC — **51 tools** in 10+ categories.
- **[src/lib/astra/tool-executor.ts](src/lib/astra/tool-executor.ts)** — 3,389 LOC.
- **[src/lib/astra/conversation-manager.ts](src/lib/astra/conversation-manager.ts)** — 581 LOC — auto-summarization.
- **[src/lib/astra/system-prompt.ts](src/lib/astra/system-prompt.ts)** — 501 LOC — persona-aware (operator/consultant/auditor/investor).
- **[src/lib/astra/reproducibility.ts](src/lib/astra/reproducibility.ts)** — 120+ LOC — EU AI Act Art. 12 audit trail.
- **regulatory-knowledge/** — 6 files, ~2,500 LOC (EU Space Act, NIS2, CRA, jurisdictions, glossary, cross-regulation-map).

#### Dashboard Surfaces (17 PRODUCTION)

| Surface                            | LOC          | Status                                                     |
| ---------------------------------- | ------------ | ---------------------------------------------------------- |
| `/dashboard/today`                 | 1,196        | PRODUCTION (Mercury Inbox + Demo Mode)                     |
| `/dashboard/posture`               | 970          | PRODUCTION (KPI Strip + TopRisksCard + Peer-Benchmark IQR) |
| `/dashboard/modules`               | 459          | PRODUCTION (14 modules, 3 categories)                      |
| `/dashboard/audit-chain`           | 84           | PRODUCTION (Hash-Chain + Bitcoin Anchor viz)               |
| `/dashboard/audit-log`             | 100+         | PRODUCTION                                                 |
| `/dashboard/audit-center`          | 100+         | PRODUCTION (Evidence Coverage Ring)                        |
| `/dashboard/time-travel`           | 80+          | PRODUCTION (90-day posture history, Sprint 10F)            |
| `/dashboard/article-tracker`       | 100+         | PRODUCTION                                                 |
| `/dashboard/missions`              | 100+         | PRODUCTION                                                 |
| `/dashboard/network`               | 100+         | PRODUCTION (StakeholderEngagement)                         |
| `/dashboard/notifications`         | 123          | PRODUCTION                                                 |
| `/dashboard/triage`                | 77           | PRODUCTION (J/K/A/D keyboard nav)                          |
| `/dashboard/proposals`             | 244          | PRODUCTION (Sprint 6B reproducibility-display)             |
| `/dashboard/generate`              | 10 (wrapper) | Wraps Generate2Page component                              |
| `/dashboard/modules/authorization` | 100+         | FUNCTIONAL (4-step wizard)                                 |
| `/dashboard/modules/debris`        | 100+         | PRODUCTION                                                 |
| `/dashboard/modules/nis2`          | 100+         | FUNCTIONAL                                                 |
| `/dashboard/modules/cra`           | 100+         | FUNCTIONAL (Cyber Resilience Act)                          |

#### External Integrations (6 productive)

- **CelesTrak adapter** — [src/lib/ephemeris/data/celestrak-adapter.ts](src/lib/ephemeris/data/celestrak-adapter.ts) — 4h-cache, 5s-timeout.
- **Space-Track CDM** — Bearer auth.
- **NOAA SWPC + ESA SWE** — router-pattern fallback.
- **UNOOSA Online Index** — `unoosa-adapter.server.ts` — HTML parse, ISO mapping, 15s timeout, confidence 0.7–0.9.
- **EUR-Lex** — `eurlex-service` — daily polling.
- **Sentinel agents** — `sentinel-adapter` — crypto signatures + cross-verify.

#### Cron Infrastructure (46 jobs)

Bearer-token auth, Vercel edge runtime, error sampling. All 46 jobs documented in [vercel.json](vercel.json).

#### API Surface

**91 Comply-relevant routes** across 12 domains:

- Astra: 6 (chat streaming, MCP with 5 tools, document-analyze, benchmarks, insights, workflows)
- Generate2: 14 (NCA documents)
- Documents: 10
- Audit: 7
- Dashboard: 10
- V1/Compliance: 10
- Tracker: 5
- Public: 6
- Authorization: 6
- Onboarding: 5
- Unified: 2
- Plus 46 cron routes

**Note:** `defineAction()` framework has **0% adoption in API routes** — only used in client-side server actions. This is a future Phase E2 initiative.

#### Schema Stats

- **290 models**, 147 enums, 758 indices, 12,681 lines
- **`Organization.complyUiVersion`** field exists (schema.prisma:3041) — V1/V2 feature flag ready
- All 10 assessment frameworks have models (Debris, Cybersecurity, NIS2, CRA, Insurance, Environmental, COPUOS, UK, US, Export, Spectrum)

#### Components

- **44 V2 components** (~11,429 LOC) including V2Shell (112), V2Sidebar (614), V2TopBar (165), CommandPalette (cmdk-based), NextStepActionPanel (100), ProvenanceTimeline (229), ProposalCard (493), StakeholderNetworkGraph (461 — deterministic radial), HealthPulseClient (streaming), TimeTravelClient (385).
- **17 V1 primitives** (~1,900 LOC) including GlassMotion (111 — entrance animation), Input (85), Button (205).
- **`@xyflow/react`** installed (for future Lineage-Graph).

### What We Don't Have (Net-New)

| Component                                                                              | Status                                   | Effort                    |
| -------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------- |
| VIES adapter (EU VAT)                                                                  | NET-NEW                                  | 2-3 days, ~150 LOC        |
| BRIS adapter (EU business registries)                                                  | NET-NEW                                  | 3-4 days, ~200 LOC        |
| GLEIF adapter (LEI)                                                                    | NET-NEW                                  | 1-2 days, ~120 LOC        |
| 10 country-specific adapters                                                           | NET-NEW                                  | 8-10 days total, ~960 LOC |
| `precision-engine/` (item generation from enrichment)                                  | NET-NEW                                  | 4-5 days, ~800 LOC        |
| Pregenerate Astra tools (authorization, DPIA, risk-assessment, supplier-questionnaire) | NET-NEW                                  | 3 days                    |
| Trilateral auto-discovery (counsel-matcher, NCA-matcher, cross-actor-notifier)         | NET-NEW                                  | 4-5 days, ~550 LOC        |
| Ghost-Text engine                                                                      | NET-NEW                                  | 3-4 weeks                 |
| Background-Autofill (LLM-driven)                                                       | NET-NEW                                  | 3-4 weeks                 |
| AI Blocks model + execution engine                                                     | NET-NEW                                  | 2-3 weeks                 |
| Astra-Bridge → engine.ts wiring                                                        | PARTIAL — code exists, needs integration | 1-2 days, 50-100 LOC      |
| `/dashboard/lineage` page                                                              | NET-NEW                                  | 1 week                    |
| `LineageNode` / `LineageEdge` models (or extend DerivationTrace)                       | DECISION TBD                             | 0-3 days                  |
| Bi-Temporal TSTZRANGE on ComplianceItem                                                | NET-NEW                                  | 1 week                    |
| MCP Server expansion (5 → 51 tools)                                                    | NET-NEW                                  | 3-4 days (wrapping)       |
| Ecosystem-Bridge APIs (connect-counsel, connect-authority, proposal-relay)             | NET-NEW                                  | 1 week                    |
| UI primitives (Tooltip, Sheet, Tabs, Combobox)                                         | NET-NEW                                  | 2-3 days, ~280 LOC        |

### Authorization-Module Quick Fix (Q0)

- **Button at `src/app/dashboard/modules/authorization/page.tsx:1192`** routes to `/dashboard/documents/generate?type=AUTHORIZATION_APPLICATION` (404 — endpoint doesn't exist)
- **Correct endpoint:** `POST /api/generate2/documents` with JSON body
- **Fix:** Route button to `/dashboard/generate` with prefill state OR call the API directly with JSON
- **Effort:** 2 hours
- **Priority:** **DO BEFORE Sprint A1**

---

<a id="6-plan"></a>

## 6. The 14-Week Plan (Phase A → E)

### Pre-Sprint: Q0 — Authorization Quick-Fix (2 hours)

Fix the dead-end "ASTRA Generate Document" button. See Section 5 for details.

---

### Phase A — EU-Wide Pre-Knowledge + Trilateral Auto-Discovery (4 weeks)

**Goal:** When a German/French/Spanish/any-EU operator signs up, the platform knows them in 90 seconds — including their counsel and NCAs.

#### Sprint A1 (Week 1): EU Tier-1 Adapters

**Files to create:**

- `src/lib/profile-enrichment/vies-adapter.ts` (~150 LOC) — VAT validation, basic info, 27 EU + IS, NO, LI
- `src/lib/profile-enrichment/bris-adapter.ts` (~200 LOC) — Cross-border business registry search via EU e-justice portal
- `src/lib/profile-enrichment/gleif-adapter.ts` (~120 LOC) — Global LEI + ownership structure
- `src/lib/profile-enrichment/orchestrator.ts` (~200 LOC) — Parallel calls, confidence merge, conflict resolution
- `src/lib/profile-enrichment/types.ts` (~80 LOC) — EnrichedProfile shape

**Cron route to create:**

- `src/app/api/cron/profile-enrichment/sync/route.ts` (~100 LOC) — Daily enrichment for all active orgs

**Schema strategy:**

- Reuse existing `DerivationTrace.sourceRef` with rigid convention: `{system: "vies"|"bris"|"gleif", id: "...", confidence: 0.0-1.0, fetchedAt: ISO8601}`
- Reuse existing `AssureCompanyProfile` Handelsregister cache fields where applicable
- **NO new Prisma migrations in Sprint A1**

**Tests to write:**

- Mock fixture tests for each adapter (~3 test files)
- Integration test: full enrichment flow for fake "Caelex GmbH" through orchestrator

**Done criteria:**

- VIES + BRIS + GLEIF return EnrichedProfile for at least 3 test entities (DE, FR, NL)
- Confidence scores reasonable (T1 tier auto-set)
- All test fixtures recorded; can replay offline
- Cron route deployable + observable

---

#### Sprint A2 (Week 2): Top-10 EU Country Tier-2 Adapters

Priority order (by space-industry volume):

| #   | Country | Source                     | API Type           | LOC est. |
| --- | ------- | -------------------------- | ------------------ | -------- |
| 1   | 🇫🇷 FR   | SIRENE/INSEE API           | JSON-API           | 120      |
| 2   | 🇩🇪 DE   | OffeneRegister.de          | HTML scrape        | 150      |
| 3   | 🇬🇧 UK   | Companies House API        | JSON-API (strong)  | 100      |
| 4   | 🇮🇹 IT   | InfoCamere                 | HTML/limited       | 150      |
| 5   | 🇪🇸 ES   | Registro Mercantil Central | HTML               | 150      |
| 6   | 🇳🇱 NL   | KvK Handelsregister        | API (limited free) | 120      |
| 7   | 🇧🇪 BE   | KBO/BCE                    | HTML               | 120      |
| 8   | 🇸🇪 SE   | Bolagsverket               | API/HTML           | 120      |
| 9   | 🇩🇰 DK   | CVR API                    | JSON-API (strong)  | 100      |
| 10  | 🇫🇮 FI   | PRH/YTJ                    | API                | 100      |

Total: ~10 adapters × 120 LOC avg = ~1,200 LOC

**Files to create:**

- `src/lib/profile-enrichment/country/{cc}-adapter.ts` per country
- `src/lib/profile-enrichment/country/index.ts` — country-router (dispatches by ISO 2-letter)

**Done criteria:**

- All 10 adapters live + test-fixture covered
- Country-router dispatches correctly based on ISO code from VIES
- Demo: enrich entities from 5 different countries end-to-end

---

#### Sprint A3 (Week 3): Precision Engine + Pregenerate Tools

**Files to create:**

- `src/lib/comply-v2/precision-engine/applicability-resolver.ts` (~250 LOC) — Combines EnrichedProfile + Ontology + jurisdiction-mapping → returns applicable Articles
- `src/lib/comply-v2/precision-engine/item-generator.ts` (~300 LOC) — Generates `*RequirementStatus` rows + DerivationTrace with `origin="ai-inferred"` at T1 tier
- `src/lib/comply-v2/precision-engine/dependency-resolver.ts` (~150 LOC) — DAG builder for item dependencies
- `src/lib/comply-v2/precision-engine/time-backward-planner.ts` (~100 LOC) — From deadlines backward to start dates

**Astra tools to add (in [src/lib/astra/tool-definitions.ts](src/lib/astra/tool-definitions.ts) + executor):**

- `pregenerate_authorization_draft({operatorId, ncaType})` — Generates Antrag draft
- `pregenerate_dpia({operatorId})` — Data Protection Impact Assessment template
- `pregenerate_risk_assessment({operatorId, framework})` — NIS2 risk assessment template
- `pregenerate_supplier_questionnaire({operatorId})` — Cyber supply chain questionnaire

**UI work:**

- Polling state on `/dashboard/today`: "Astra processes 47 items… 12s remaining"
- First-visit walkthrough overlay: "Here's your roadmap. Click first action."

**Done criteria:**

- New operator gets 30-80 pre-generated ComplianceItems within 90 seconds
- 3 of 4 pregenerate tools produce reviewable Document drafts in vault
- Polling state never shows blank screen post-onboarding

---

#### Sprint A4 (Week 4): Trilateral Auto-Discovery

**Files to create:**

- `src/lib/network-discovery/operator-counsel-matcher.ts` (~200 LOC) — Pattern 1: scans Atlas mandates + LinkedIn-public + filed-document-counsels → suggests counsel
- `src/lib/network-discovery/operator-nca-matcher.ts` (~150 LOC) — Pattern 2: jurisdiction × operator-type → NCAs (existing `determineNCA()` function as foundation)
- `src/lib/network-discovery/cross-actor-notifier.ts` (~200 LOC) — Patterns 3 + 4 + 5: search-alerts to Atlas, pipeline-visibility to Pharos, cross-operator anomaly detection

**UI work:**

- PreKnowledgeBanner component on `/dashboard/today` first-visit:
  ```
  ✓ Caelex GmbH found (BRIS + GLEIF, T1 verified)
  ⚡ Suggested counsel: Dr. Schmidt @ BHO Legal (12 similar mandates) [Invite]
  ⚡ Supervising NCAs: BMWK, BNetzA, BAFA (auto-detected) [Connect]
  ```
- One-click counsel-invite (email via Resend, existing integration)
- One-click NCA-connect (creates OversightRelationship row if Pharos-customer)

**Done criteria:**

- Operator gets at least 1 counsel suggestion (or "No match found, browse Atlas Directory")
- Counsel invite email actually delivers
- NCA auto-detection works for top-5 EU jurisdictions

---

### Phase B — AI Substrate (4 weeks)

**Goal:** Astra is everywhere. Ghost-text in forms, background-autofill on uploads, AI Blocks pinned per ComplianceItem, proposal-queue UX upgraded.

#### Sprint B1 (Week 5): Astra-Bridge Wiring + Ghost-Text MVP

- **WIRING:** Integrate `astra-bridge.server.ts` into `engine.ts` (1-2 days, 50-100 LOC)
- **NEW:** `GhostTextInput` component (~120 LOC) — wraps existing `Input.tsx` pattern
- **NEW:** `/api/astra/ghost/route.ts` — streaming via AI SDK 6 (already in package.json)
- Wire into 5 top forms:
  1. NCA-Determination (Authorization Module)
  2. Document-Upload Description
  3. Evidence-Notes on item detail
  4. Incident-Description on incident form
  5. Spacecraft-Description in onboarding

#### Sprint B2 (Week 6): Background Autofill

- `useBackgroundAutofill(formId, context)` hook
- `BackgroundAutofillToast` (~80 LOC) — reuses `Toast.tsx`
- Triggers:
  - New Spacecraft added → Astra infers operator class + jurisdiction + applicable regs → creates AstraProposal
  - Document uploaded → Astra parses content + suggests `moduleType` + `regulatoryRef` + `issueDate`
  - Incident reported → Astra suggests `severity` + `nis2Phase` + `affectedRequirements[]`

#### Sprint B3 (Week 7): AI Blocks

- **NEW Migration:** `AIBlock` model + `AIBlockExecution` model (~80 LOC schema)
- `AIBlockCard` (~250 LOC) — reuses `ProposalCard.tsx` pattern
- `AIBlocksGrid` (~150 LOC)
- Pin AI Blocks on ComplianceItem detail page
- Cron-triggered re-runs on evidence change

#### Sprint B4 (Week 8): AstraProposal-Queue UX Upgrade

- Email notifications when proposal pending (Resend)
- 24h-before-expiry reminders
- Inline education modal: "This action requires admin approval"
- Decision-log viewer (data is already in `AstraProposal.reproducibility` JSON)
- Bulk operations: "Approve all proposals for items X, Y, Z"

---

### Phase C — Lineage + Bi-Temporal (2 weeks)

#### Sprint C1 (Week 9): Lineage Surface

- **NEW:** `/dashboard/lineage/page.tsx` (~150 LOC server-fetch)
- **NEW:** `LineageGraphWrapper` (~400-500 LOC) — uses `@xyflow/react` + deterministic layout pattern from `StakeholderNetworkGraph.tsx`
- **NEW:** `LineageGraphTimeline` (~200 LOC) — reuses `ProvenanceTimeline.tsx` pattern
- Data sources (all already exist): `DerivationTrace.upstreamTraceIds`, `AstraProposal.decisionLog`, `AuditLog` hash-chain
- Add to V2Sidebar under Audit & System group

#### Sprint C2 (Week 10): Bi-Temporal Layer

- Schema migration: Add `validTime` + `systemTime` TSTZRANGE to ComplianceItem (via `*RequirementStatus` tables)
- **NEW:** `GET /api/v1/items/at?date=YYYY-MM-DD` route
- Make `AsOfPicker` (exists in Audit Center) globally available via context

---

### Phase D — Surface Consolidation + Cmd-K Power Mode (2 weeks)

#### Sprint D1 (Week 11): Sidebar Cut + UI Primitives

- Extract UI primitives: `Tooltip` (~60 LOC), `Sheet` (~80 LOC), `Tabs` (~80 LOC), `Combobox` (~60 LOC)
- Restructure V2Sidebar from 25 to 8 primary items:
  ```
  TODAY          (collapsed: Triage, Proposals, Notifications, Astra → Cmd-K)
  MISSIONS       (collapsed: Mission Control, Ephemeris → sub-tabs)
  COMPLIANCE     (collapsed: Posture, Modules, Article Tracker → sub-tabs)
  DOCUMENTS      (collapsed: Vault + Generate → unified)
  NETWORK        (collapsed: Stakeholders, NCA Portal → sub-tabs)
  AUDIT          (collapsed: Audit Center, Audit Log, Hash Chain, Lineage → sub-tabs)
  SETTINGS
  HELP
  ```
- Everything else accessible via Cmd-K (existing cmdk integration)

#### Sprint D2 (Week 12): Cmd-K Power Mode

- Expand existing palette to verb-engine: "Snooze all overdue items" / "Generate DPIA" / "Approve proposal X"
- AI-English → action via Astra
- Context-aware suggestions per current page

---

### Phase E — MCP + Ecosystem-Bridge APIs (2 weeks)

#### Sprint E1 (Week 13): MCP Server Full Expansion

- Expand `src/app/api/astra/mcp/route.ts` from 5 to 51 tools (wrap existing `tool-definitions.ts`)
- Streaming via SSE
- PR & marketing materials:
  - Blog: "Why we made Caelex an MCP Server"
  - Cursor Community post
  - LinkedIn demo video
  - Reddit r/MachineLearning + r/space

#### Sprint E2 (Week 14): Ecosystem-Bridge APIs

- `/api/v1/ecosystem/connect-counsel` — operator-initiated mandate
- `/api/v1/ecosystem/connect-authority` — operator-initiated oversight relationship
- `/api/v1/ecosystem/proposal-relay` — AstraProposal propagates across Comply/Atlas/Pharos
- Webhook system for cross-actor events
- Demo: full trilateral flow (Anton drafts → Dr. Schmidt reviews in Atlas → BAFA sees in Pharos)

---

<a id="7-sprint-tracker"></a>

## 7. Active Sprint Tracker

Update after every sprint. Use this table as the single source of truth for "where are we?"

| Sprint                                    | Status        | Owner  | Started    | Done       | Notes                                                             |
| ----------------------------------------- | ------------- | ------ | ---------- | ---------- | ----------------------------------------------------------------- |
| Q0 — Authorization Quick-Fix              | ✅ Done       | Claude | 2026-05-20 | 2026-05-20 | Button + Generate2Page `?type=` param                             |
| A1 — EU Tier-1 Adapters                   | ✅ Done       | Claude | 2026-05-20 | 2026-05-20 | VIES + GLEIF + BRIS-router + orchestrator + cron + 41 tests green |
| A2 — Top-10 Country Tier-2                | ☐ Not Started | —      | —          | —          | Week 2 — next                                                     |
| A3 — Precision Engine + Pregenerate       | ☐ Not Started | —      | —          | —          | Week 3                                                            |
| A4 — Trilateral Auto-Discovery            | ☐ Not Started | —      | —          | —          | Week 4                                                            |
| B1 — Astra-Bridge Wiring + Ghost-Text MVP | ☐ Not Started | —      | —          | —          | Week 5                                                            |
| B2 — Background Autofill                  | ☐ Not Started | —      | —          | —          | Week 6                                                            |
| B3 — AI Blocks                            | ☐ Not Started | —      | —          | —          | Week 7                                                            |
| B4 — AstraProposal-Queue UX               | ☐ Not Started | —      | —          | —          | Week 8                                                            |
| C1 — Lineage Surface                      | ☐ Not Started | —      | —          | —          | Week 9                                                            |
| C2 — Bi-Temporal Layer                    | ☐ Not Started | —      | —          | —          | Week 10                                                           |
| D1 — Sidebar Cut + UI Primitives          | ☐ Not Started | —      | —          | —          | Week 11                                                           |
| D2 — Cmd-K Power Mode                     | ☐ Not Started | —      | —          | —          | Week 12                                                           |
| E1 — MCP Full Expansion                   | ☐ Not Started | —      | —          | —          | Week 13                                                           |
| E2 — Ecosystem-Bridge APIs                | ☐ Not Started | —      | —          | —          | Week 14                                                           |

**Status legend:** ☐ Not Started · 🟡 In Progress · ✅ Done · ⛔ Blocked · ⏸ Paused

### Per-Sprint Detail Template (copy this when a sprint starts)

```markdown
### Sprint X — [Name]

**Status:** 🟡 In Progress
**Started:** YYYY-MM-DD
**Target End:** YYYY-MM-DD
**Actual End:** —

**Goal:** [from plan]

**Deliverables:**

- [ ] File 1
- [ ] File 2
- [ ] Tests
- [ ] Done-criteria 1
- [ ] Done-criteria 2

**Blockers:** None

**Notes:**

- [chronological log of decisions, discoveries, gotchas]

**Verification:**

- [ ] Ran `npm run typecheck` — passes
- [ ] Ran relevant `vitest run` — passes
- [ ] Tested in browser if UI changes
- [ ] No regressions in /dashboard/today flow
```

---

<a id="8-decision-log"></a>

## 8. Decision Log (chronological)

| Date       | Decision                                                                                                                                                                                    | Made By                         | Rationale                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 2026-05-20 | Build World-Best Edition (14 weeks) instead of basic 12-week plan                                                                                                                           | Julian + Claude                 | Strategic constraints: EU-wide, zero external cost, trilateral ecosystem                                      |
| 2026-05-20 | Use VIES + BRIS + GLEIF as Tier-1 (not just DE Handelsregister)                                                                                                                             | Julian                          | All-EU positioning required for moat                                                                          |
| 2026-05-20 | Reuse `DerivationTrace.sourceRef` instead of new `EnrichedProfile` model in Phase A                                                                                                         | Claude (proposed), Julian (TBD) | Avoids migration, leverages existing T0-T5 + hash-chain                                                       |
| 2026-05-20 | Trilateral auto-discovery is Sprint A4 (not deferred)                                                                                                                                       | Julian                          | This is THE moat. Cannot defer.                                                                               |
| 2026-05-20 | Q0 fix Authorization-Module button before Sprint A1                                                                                                                                         | Claude (proposed), Julian (TBD) | 2-hour quick-win, blocks UX otherwise                                                                         |
| 2026-05-20 | Top-10 country adapters in Sprint A2                                                                                                                                                        | Julian                          | Demo needs multi-country evidence                                                                             |
| 2026-05-20 | MCP expansion (5→51 tools) in Phase E with marketing push                                                                                                                                   | Julian                          | Distribution differentiator                                                                                   |
| 2026-05-20 | Q0 + Sprint A1 implementation completed in one session                                                                                                                                      | Claude                          | Founder said "Automodus, baller alles durch" — autonomous execution                                           |
| 2026-05-20 | BRIS-as-portal is UI-only, no clean API; revised to country-router that dispatches to Tier-2 adapters (built in A2)                                                                         | Claude                          | Original plan assumed BRIS had a clean API. Country-router pattern is cleaner, keeps orchestrator code stable |
| 2026-05-20 | DerivationTrace persistence deferred to follow-up sprint (origin "source-backed" validator only accepts "legal-source"/"regulatory-feed" sourceRef kinds; extending it is additive, ~5 LOC) | Claude                          | Sprint A1 orchestrator returns provenance in-memory only. AssureCompanyProfile receives the mapped fields.    |
| 2026-05-20 | Enrichment-cron schedule: `15 3 * * *` daily (03:15 UTC, non-conflicting slot in vercel.json)                                                                                               | Claude                          | Picked the first free slot between data-retention-cleanup (03:00) and atlas-notification-cleanup (03:30)      |

---

<a id="9-open-questions"></a>

## 9. Open Questions / Pending Decisions

These need answers as we progress. Update with [DECIDED] + date when resolved.

| #   | Question                                                                                                | Phase Affected | Default Assumption                   |
| --- | ------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------ |
| 1   | EnrichedProfile model: repurpose DerivationTrace or new model?                                          | A1             | Repurpose (default)                  |
| 2   | Country adapter priority for Sprint A2: stick with Top-10 list or pivot if data shows different volume? | A2             | Stick with list                      |
| 3   | ITU SNS adapter: include in Phase A or defer to Phase 2?                                                | A              | Defer (complex auth)                 |
| 4   | BNetzA adapter: include in Phase A or defer?                                                            | A              | Defer (similar to ITU)               |
| 5   | Action-Layer adoption in API routes: side-track in Phase E2 or separate initiative post-14-weeks?       | E2             | Separate initiative                  |
| 6   | Pricing model adjustment: Per-Sat × Per-Jurisdiction stays the same or refine?                          | n/a            | Stays the same                       |
| 7   | EU Commission DG DEFIS / EUSPA anchor-customer outreach: when?                                          | n/a            | Phase 2 after demo-ready             |
| 8   | Should the trilateral demo be a separate physical event (Space Tech Expo Bremen 2026)?                  | n/a            | Yes, target                          |
| 9   | Counsel auto-discovery via LinkedIn-scrape: legal risk (LinkedIn ToS)?                                  | A4             | Use public web only, no LinkedIn API |
| 10  | BAFA-Pilot for Pharos cross-actor demo: when to engage?                                                 | A4 / E2        | After Sprint A4 working              |

---

<a id="10-risk-register"></a>

## 10. Risk Register

| Risk                                                                  | Phase         | Likelihood | Impact | Mitigation                                                                          |
| --------------------------------------------------------------------- | ------------- | ---------- | ------ | ----------------------------------------------------------------------------------- |
| Handelsregister/OffeneRegister.de site structure changes break parser | A2            | Medium     | Medium | Test-fixture recording; selenium fallback ready; partner with data vendor as backup |
| BAFA/BNetzA portals require authentication or headless browser        | A4 (deferred) | High       | Low    | Defer to Phase 2                                                                    |
| ITU SNS API has undocumented rate limits                              | A (deferred)  | Medium     | Low    | Defer to Phase 2                                                                    |
| Astra-Bridge wiring more complex than estimated                       | B1            | Low        | Medium | 2-day buffer in Sprint B1                                                           |
| AI Block UX rejected by operators                                     | B3            | Medium     | Medium | A/B test in Sprint B3, pivot to read-only if needed                                 |
| Counsel auto-match has poor accuracy (false positives)                | A4            | Medium     | Medium | Show as "suggestion" with confidence score, never auto-execute                      |
| `/dashboard/lineage` performance with deep graphs                     | C1            | Medium     | Low    | Pagination + node-clustering; @xyflow/react has virtualization                      |
| TSTZRANGE migration affects production reads                          | C2            | Low        | High   | Migration on follower DB first, swap pattern                                        |
| Sidebar cut from 25 to 8 items confuses existing users                | D1            | Medium     | Medium | A/B with `complyUiVersion` flag; gradual rollout                                    |
| MCP marketing push falls flat                                         | E1            | Low        | Low    | Cursor + Anthropic community are warm audiences                                     |
| 14-week timeline slips                                                | overall       | Medium     | Medium | Sprint buffers built in; can defer Phase E if needed                                |
| Demo content reveals competitive intelligence                         | n/a           | Low        | Low    | Use Caelex GmbH (our own org) as demo entity                                        |

---

<a id="11-glossary"></a>

## 11. Glossary

| Term                       | Definition                                                                |
| -------------------------- | ------------------------------------------------------------------------- | ---- |
| **Comply**                 | Operator-facing surface at `/dashboard/*` — the target of this plan       |
| **Atlas**                  | Lawyer-facing surface at `/atlas/*` — production with BHO Legal pilot     |
| **Pharos**                 | Authority-facing surface at `/(pharos)/*` — beta, BAFA/BNetzA targets     |
| **Assure**                 | Investor due diligence surface at `/assure/*` — 23 production pages       |
| **Astra**                  | The AI compliance copilot — 51 tools, Anthropic Claude Sonnet 4.6         |
| **Verity**                 | Zero-knowledge cryptographic attestation system — 255 green tests         |
| **Sentinel**               | Distributed satellite-telemetry agent network with hash-chain             |
| **Ephemeris**              | Orbital compliance forecasting subsystem (CelesTrak + physics)            |
| **ComplianceItem**         | The atom — normalized view over 10+ `*RequirementStatus` tables           |
| **DerivationTrace**        | Production-ready provenance tracking with T0-T5 verification + hash-chain |
| **VerificationTier T0-T5** | Trust ladder: T0 unverified → T5 cryptographic proof                      |
| **AstraProposal**          | Approval-gated AI action with full EU AI Act Art. 12 reproducibility      |
| **MCP**                    | Model Context Protocol — Anthropic standard for external AI tool access   |
| **Trilateral**             | Comply × Atlas × Pharos automatically connected                           |
| **VIES**                   | EU VAT validation system — all 27 MS, free, no auth                       |
| **BRIS**                   | Business Registers Interconnection System — EU mandatory cross-border     |
| **GLEIF**                  | Global Legal Entity Identifier Foundation — free LEI lookup               |
| **UNOOSA**                 | UN Office for Outer Space Affairs (Online Index of Objects Launched)      |
| **NCA**                    | National Competent Authority (BAFA, BNetzA, CAA, DGA, AESA…)              |
| **complyUiVersion**        | Feature flag on Organization model: "v1"                                  | "v2" |
| **Q0**                     | Pre-Sprint Quick-Fix (Authorization-Module button)                        |
| **MS**                     | Member State (EU)                                                         |
| **EFTA**                   | European Free Trade Association (NO, CH, IS, LI)                          |

---

<a id="12-reference-map"></a>

## 12. Reference Map

### Parent Strategy Documents (highest authority)

- [docs/CAELEX-COMPLY-2027-VISION.md](docs/CAELEX-COMPLY-2027-VISION.md) — Long-term Comply vision
- [docs/CAELEX-COMPLY-CONCEPT.md](docs/CAELEX-COMPLY-CONCEPT.md) — Original concept doc with Palantir-pattern research
- [docs/CAELEX-COMPLY-GUIDED-COMPLIANCE.md](docs/CAELEX-COMPLY-GUIDED-COMPLIANCE.md) — "Autopilot not power-user" framing
- [docs/CAELEX-PRECISION-COMPLIANCE-ENGINE.md](docs/CAELEX-PRECISION-COMPLIANCE-ENGINE.md) — Engine architecture
- [docs/CAELEX-OPERATOR-WALKTHROUGH-DAY-1-TO-90.md](docs/CAELEX-OPERATOR-WALKTHROUGH-DAY-1-TO-90.md) — Intended operator journey

### Sibling Plans (separate but related)

- [docs/CAELEX-BUILD-PLAN-LIVING-DOC.md](docs/CAELEX-BUILD-PLAN-LIVING-DOC.md) — Existing build plan (broader, not Comply-specific)
- [docs/ATLAS-V2-MASTER-PLAN.md](docs/ATLAS-V2-MASTER-PLAN.md) — Atlas transformation plan (untouchable in Phase A-D per scope rule)
- [docs/PHAROS-CONCEPT.md](docs/PHAROS-CONCEPT.md) — Pharos vision
- [docs/PHAROS-VISION.md](docs/PHAROS-VISION.md) — Pharos symbolic positioning

### Briefing Documents (for context)

- [docs/ASSESSMENT-BRIEFING.md](docs/ASSESSMENT-BRIEFING.md) — Assessment funnel pitch
- [docs/VERITY-BRIEFING.md](docs/VERITY-BRIEFING.md) — Cryptographic attestation pitch
- [docs/PLATFORM-OVERVIEW.md](docs/PLATFORM-OVERVIEW.md) — Complete platform map
- [docs/FEATURES.md](docs/FEATURES.md) — Feature catalog (German)

### Audit Reports (2026-05-20 session)

The 6 audit agents produced detailed reports in the session conversation. Key findings captured in Section 5 of this doc. If full audit data needed, re-spawn the 6 agents with the same prompts:

1. Comply-V2 Architecture + Ontology + Actions
2. Astra Engine Complete Inventory
3. Dashboard Surfaces Page-by-Page
4. Database Models Comprehensive
5. External Integrations + Cron Jobs
6. API Routes Comply Map
7. UI Component Inventory

---

<a id="13-code-anchor-map"></a>

## 13. Code Anchor Map

Key file paths discovered in audit. Use these as starting points for any work, not as exhaustive list.

### Comply-V2 Architecture

- [src/lib/comply-v2/types.ts](src/lib/comply-v2/types.ts) — 171 LOC
- [src/lib/comply-v2/actions/define-action.ts](src/lib/comply-v2/actions/define-action.ts) — 569 LOC (PRODUCTION)
- [src/lib/comply-v2/actions/compliance-item-actions.ts](src/lib/comply-v2/actions/compliance-item-actions.ts) — 724 LOC
- [src/lib/comply-v2/actions/triage-actions.ts](src/lib/comply-v2/actions/triage-actions.ts)
- [src/lib/comply-v2/actions/astra-bridge.server.ts](src/lib/comply-v2/actions/astra-bridge.server.ts) — 237 LOC (NOT YET WIRED)

### Ontology

- [src/lib/ontology/types.ts](src/lib/ontology/types.ts) — 146 LOC
- [src/lib/ontology/traverse.ts](src/lib/ontology/traverse.ts) — 326 LOC

### Astra Engine

- [src/lib/astra/engine.ts](src/lib/astra/engine.ts) — 1,133 LOC
- [src/lib/astra/tool-definitions.ts](src/lib/astra/tool-definitions.ts) — 1,659 LOC (51 tools)
- [src/lib/astra/tool-executor.ts](src/lib/astra/tool-executor.ts) — 3,389 LOC
- [src/lib/astra/conversation-manager.ts](src/lib/astra/conversation-manager.ts) — 581 LOC
- [src/lib/astra/system-prompt.ts](src/lib/astra/system-prompt.ts) — 501 LOC
- [src/lib/astra/reproducibility.ts](src/lib/astra/reproducibility.ts) — 120+ LOC

### External Adapters (existing pattern to copy)

- [src/lib/ephemeris/data/celestrak-adapter.ts](src/lib/ephemeris/data/celestrak-adapter.ts)
- `src/lib/ephemeris/data/sentinel-adapter.ts`
- `unoosa-adapter.server.ts` (find via grep)
- `eurlex-service` (find via grep)

### Dashboard Layouts + Sidebar

- [src/app/dashboard/layout.tsx](src/app/dashboard/layout.tsx)
- [src/components/dashboard/v2/V2Shell.tsx](src/components/dashboard/v2/V2Shell.tsx) — 112 LOC
- [src/components/dashboard/v2/V2Sidebar.tsx](src/components/dashboard/v2/V2Sidebar.tsx) — 614 LOC
- [src/components/dashboard/v2/V2TopBar.tsx](src/components/dashboard/v2/V2TopBar.tsx) — 165 LOC
- [src/components/dashboard/v2/CommandPalette.tsx](src/components/dashboard/v2/CommandPalette.tsx)

### Dashboard Surfaces (key pages)

- [src/app/dashboard/today/page.tsx](src/app/dashboard/today/page.tsx) — 1,196 LOC
- [src/app/dashboard/posture/page.tsx](src/app/dashboard/posture/page.tsx) — 970 LOC
- [src/app/dashboard/modules/page.tsx](src/app/dashboard/modules/page.tsx) — 459 LOC
- [src/app/dashboard/proposals/page.tsx](src/app/dashboard/proposals/page.tsx) — 244 LOC
- [src/app/dashboard/triage/page.tsx](src/app/dashboard/triage/page.tsx) — 77 LOC
- [src/app/dashboard/audit-chain/page.tsx](src/app/dashboard/audit-chain/page.tsx) — 84 LOC
- [src/app/dashboard/audit-center/page.tsx](src/app/dashboard/audit-center/page.tsx) — 100+ LOC
- [src/app/dashboard/modules/authorization/page.tsx](src/app/dashboard/modules/authorization/page.tsx) — line 1192 has the broken "ASTRA Generate Document" button

### API Routes (key)

- [src/app/api/astra/chat/route.ts](src/app/api/astra/chat/route.ts)
- [src/app/api/astra/mcp/route.ts](src/app/api/astra/mcp/route.ts) — 290 LOC, 5 tools today
- [src/app/api/unified/calculate/route.ts](src/app/api/unified/calculate/route.ts)
- [src/app/api/unified/save-to-dashboard/route.ts](src/app/api/unified/save-to-dashboard/route.ts)
- [src/app/api/generate2/documents/route.ts](src/app/api/generate2/documents/route.ts) — the correct generate endpoint

### Schema

- [prisma/schema.prisma](prisma/schema.prisma) — 12,681 lines, 290 models, 147 enums
- Key line refs:
  - `Organization.complyUiVersion` — line 3041
  - `OperatorProfile` — line 6186
  - `DerivationTrace` + `VerificationTier` — lines 6232–6327
  - `ProfileSnapshot` — line 6338
  - `AssureCompanyProfile` (Handelsregister cache fields) — line 6692
  - `SentinelAgent` + `SentinelPacket` — lines 7456–7556
  - `VerityAttestation` + related — lines 7562–7799
  - `AstraProposal` (with reproducibility) — lines 10322–10382
  - `ComplianceItemSnooze` / `ComplianceItemNote` — lines 10208–10320

### Cron Routes

- [vercel.json](vercel.json) — defines all 47 cron schedules (was 46, +1 from A1)
- `src/app/api/cron/celestrak-polling/route.ts` — reference pattern
- `src/app/api/cron/solar-flux-polling/route.ts` — reference pattern (router fallback)
- `src/app/api/cron/regulatory-feed/route.ts` — reference pattern (EUR-Lex)
- [src/app/api/cron/profile-enrichment/sync/route.ts](src/app/api/cron/profile-enrichment/sync/route.ts) — **Sprint A1**, daily 03:15 UTC

### Profile-Enrichment Subsystem (Sprint A1)

- [src/lib/profile-enrichment/types.ts](src/lib/profile-enrichment/types.ts) — 226 LOC — EnrichedProfile, EnrichmentSourceRef, mergeFields helper
- [src/lib/profile-enrichment/vies-adapter.ts](src/lib/profile-enrichment/vies-adapter.ts) — 264 LOC — EU VAT (all 27 MS), free, no auth
- [src/lib/profile-enrichment/gleif-adapter.ts](src/lib/profile-enrichment/gleif-adapter.ts) — 318 LOC — LEI + ownership chain, free, no auth
- [src/lib/profile-enrichment/bris-country-router.ts](src/lib/profile-enrichment/bris-country-router.ts) — 144 LOC — Country dispatcher (Sprint A1 stubs, Sprint A2 fills in)
- [src/lib/profile-enrichment/orchestrator.ts](src/lib/profile-enrichment/orchestrator.ts) — 277 LOC — parallel dispatch + confidence-weighted merge + AssureCompanyProfile persistence helper

**Tests:** [tests/unit/profile-enrichment/](tests/unit/profile-enrichment/) — 41 tests, all green (13 VIES + 14 GLEIF + 14 orchestrator)

---

<a id="14-update-protocol"></a>

## 14. How to Use This Document (Update Protocol)

### For Julian

- This doc is your single-pane-of-glass for "where are we?"
- Section 7 (Sprint Tracker) is where progress lives
- Section 8 (Decision Log) captures every strategic call
- Section 9 (Open Questions) is the parking lot for "we'll figure this out later"
- When in doubt, update this doc before writing code

### For Future Claude Sessions (post-compaction or new session)

**On session start:**

1. Read Section 1 (TL;DR) — 30 seconds
2. Read Section 4 (Locked Decisions) — these are non-negotiable
3. Check Section 7 (Sprint Tracker) — find the current 🟡 In Progress sprint, or the next ☐ Not Started one
4. Read the per-sprint detail in Section 6 for that sprint
5. Look up referenced files in Section 13 (Code Anchor Map)

**When making changes:**

- If the user asks "where are we?" → quote Section 7
- If the user asks "what's next?" → quote Section 6 for the current/next sprint
- If a strategic decision is made → add to Section 8 (Decision Log) with date + rationale
- If a new risk emerges → add to Section 10 (Risk Register)
- If a question can't be answered now → add to Section 9 (Open Questions) with default assumption
- When a sprint starts → update Section 7 row to 🟡 + add per-sprint detail block (template provided)
- When a sprint completes → update Section 7 to ✅, mark done date, add notes

**When introducing new code patterns or files:**

- Add the file path to Section 13 (Code Anchor Map)
- If the file replaces an old approach → note that in Section 8 (Decision Log)

**Versioning:**

- Bump the VERSION at the top whenever a non-trivial section is updated
- Update LAST UPDATED date at the top
- Major restructures (e.g., adding new phase) → 2.0, minor sprint completions → 1.x

**Don't:**

- Don't delete old decisions from the log — strikethrough or add "[SUPERSEDED]"
- Don't change locked decisions in Section 4 without explicit founder approval (add to Decision Log)
- Don't duplicate plan content from Section 6 elsewhere — link to it

### When This Doc Conflicts with Code

- **Code is source of truth for what EXISTS** — re-audit if you suspect drift
- **This doc is source of truth for what we INTEND** — update as plans evolve
- If they conflict, ask the founder before reconciling

### When to Spawn Audit Agents Again

If 3+ months have passed since 2026-05-20, or major refactors have happened, re-run the 6 audits (Section 12 lists the agent prompts). Update Section 5 with fresh findings.

---

## Closing Thought

> _"Drata shows a checklist. Vanta shows a checklist with checkmarks. We show a verified compliance world."_

We're building the EU-Space-Compliance-Infrastructure. Not a tool. Not a SaaS product. **Critical infrastructure.**

14 weeks. Then the demo. Then the world.

Let's go.

— Caelex Comply, 2026-05-20
