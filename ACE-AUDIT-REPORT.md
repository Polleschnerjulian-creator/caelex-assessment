# ACE Feasibility Audit Report

**Autonomous Compliance Evidence Engine — Codebase Compatibility Assessment**

| Field            | Value                                             |
| ---------------- | ------------------------------------------------- |
| Report Date      | 2026-03-01                                        |
| Codebase Version | Current `HEAD` (production)                       |
| Analyst          | Claude Opus 4.6 (automated deep analysis)         |
| Scope            | Full-stack read-only analysis — zero code changes |
| Classification   | Internal / Strategic Planning                     |

---

## 1. Executive Summary

The Caelex codebase is **structurally prepared for ACE at ~60% readiness**, with critical infrastructure already in place but unevenly deployed. The NIS2 module is essentially ACE-ready today — it has programmatically evaluable compliance rules, structured evidence requirements, and a working auto-assessment engine. Three modules (NIS2, Cybersecurity, Debris) already use the production-ready `EvidencePanel` component and `ComplianceEvidence` database model. Five modules (Authorization, Environmental, Insurance, Registration, Supervision) have zero evidence integration.

The core gap is not technical capability but **architectural fragmentation**: three compliance engines with incompatible interfaces, four separate cross-reference files with four different schemas, and no unified requirement ID space. ACE requires a convergence layer that doesn't exist yet.

**Verdict: CONDITIONAL GO** — ACE is feasible, but only with a phased rollout that starts from existing strength (NIS2 → Cybersecurity/Debris → remaining modules) and builds the unification layer incrementally.

---

## 2. Codebase Snapshot

### Scale

| Metric                | Value                                                                |
| --------------------- | -------------------------------------------------------------------- |
| Prisma Schema         | 5,745 lines, 130 models, ~65 unique constraints, ~108 indices        |
| Compliance Engines    | 3 (EU Space Act, NIS2, Space Law) + 2 sub-engines (UK Space, COPUOS) |
| Assessment Models     | 10 parent + 10 child (RequirementStatus)                             |
| Service Layer         | 44 service files                                                     |
| API Routes            | 138+ route files across 34 domains                                   |
| Dashboard Modules     | 8 active compliance modules                                          |
| Regulatory Data Files | 20+ files, ~8,000 LOC of structured regulatory knowledge             |
| Cron Jobs             | 14 background jobs (polling-based, no queue)                         |

### Existing Evidence Infrastructure

| Component                               | Status     | Location                                                                                                |
| --------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `ComplianceEvidence` model              | Production | `schema.prisma:3592` — 14 fields, DRAFT→SUBMITTED→ACCEPTED lifecycle                                    |
| `ComplianceEvidenceDocument` join table | Production | `schema.prisma:3631` — links evidence to Document vault                                                 |
| `EvidencePanel` UI component            | Production | `src/components/audit/EvidencePanel.tsx` — 10 evidence types                                            |
| Evidence API                            | Production | `src/app/api/audit-center/evidence/route.ts` — GET/POST                                                 |
| Auto-assessment engine                  | Production | `src/lib/compliance/auto-assess.ts` — evaluates `ComplianceRule`                                        |
| `AssessmentFieldForm` component         | Production | `src/components/shared/AssessmentFieldForm.tsx` — reusable                                              |
| AuditLog hash chain                     | Production | `schema.prisma:256` — `entryHash` + `previousHash` (tamper-evident)                                     |
| ComplianceAttestation signing           | Production | `schema.prisma:4639` — `signatureHash` + `previousHash`                                                 |
| ComplianceSnapshot (daily)              | Production | `schema.prisma:4293` — append-only, includes `evidenceTotal`, `evidenceAccepted`, `evidenceCompletePct` |
| Document vault with checksums           | Production | `schema.prisma:1771` — versioning, SHA-256 checksum, `moduleType` linking                               |

### Module-Level Evidence Readiness

| Module        | Structured Fields      | Auto-Assessment                              | EvidencePanel | Evidence Gap                        |
| ------------- | ---------------------- | -------------------------------------------- | ------------- | ----------------------------------- |
| NIS2          | 5+ per requirement     | Yes (3-way: compliant/partial/non_compliant) | Yes           | **Low** — most mature               |
| Cybersecurity | 10-15 per requirement  | Yes (suggestComplianceStatus)                | Yes           | **Low** — full system               |
| Debris        | 5-8 per requirement    | Yes (debris-auto-assess)                     | Yes           | **Low** — full system               |
| Authorization | Document statuses only | No                                           | No            | **High** — status proxy only        |
| Environmental | Calculator inputs      | No (calculation-based)                       | No            | **Medium** — EFD is the artifact    |
| Insurance     | Policy records         | No (calculation-based)                       | No            | **Medium** — policy data = evidence |
| Registration  | Status codes only      | No                                           | No            | **High** — COSPAR ID implicit       |
| Supervision   | Incident records       | No                                           | No            | **High** — no scoring               |

---

## 3. ACE Compatibility Matrix

### Rating Scale

| Score | Meaning                                                                 |
| ----- | ----------------------------------------------------------------------- |
| 1-3   | Fundamental rebuild required — existing code provides no leverage       |
| 4-5   | Significant new work — some patterns exist but major gaps               |
| 6-7   | Moderate adaptation — infrastructure exists, needs extension and wiring |
| 8-9   | Minimal changes — existing code is nearly ACE-compatible                |
| 10    | Already implemented — just needs activation                             |

### Dimension Ratings

#### 3.1 Schema Readiness — **7/10**

**What exists:**

- `ComplianceEvidence` model with full lifecycle (DRAFT → SUBMITTED → ACCEPTED / REJECTED / EXPIRED)
- `ComplianceEvidenceDocument` join table linking evidence to the Document vault
- `validFrom` / `validUntil` on evidence records for temporal validity
- `@@unique([organizationId, regulationType, requirementId, title])` — proper scoping
- All 10 `*RequirementStatus` models have `evidenceNotes @db.Text` and `responses Json?`
- `ComplianceSnapshot` already tracks `evidenceTotal`, `evidenceAccepted`, `evidenceExpired`, `evidenceCompletePct`

**What's missing:**

- No `EvidenceRecord` as described in ACE spec — the existing `ComplianceEvidence` model is close but lacks `sourceType` (manual/api/document/automated), `hash` (integrity), and structured `metadata`
- No `RegulatoryKnowledgeGraph` model — cross-references are hardcoded arrays in TypeScript files, not queryable database records
- No `EvidenceMapping` table for coverage percentage tracking per requirement
- Requirement IDs are strings referencing data file entries (e.g., `"nis2-001"`, `"debris-trackability"`), not database-managed entities — no unified requirement table exists

**ACE gap:** Extend `ComplianceEvidence` with ~5 fields or create a new `ACEEvidenceRecord` model. Build `RegulatoryRequirement` and `RequirementCrossReference` tables to make the knowledge graph queryable. The 10 existing `*RequirementStatus` models can be kept as-is and linked via `requirementId`.

#### 3.2 Engine Extensibility — **5/10**

**What exists (per engine):**

| Engine       | Evidence-Ready                                                   | Programmatic Rules                                           | Extensible Interface                            |
| ------------ | ---------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| NIS2         | Yes (`evidenceRequired[]`, `complianceRule`, `assessmentFields`) | Yes (`requiredTrue`, `requiredNotEmpty`, `numberThresholds`) | Moderate (async import, pure functions)         |
| EU Space Act | No (server-side only, stripped from client)                      | Partial (article filtering yes, `decision_tree` unused)      | Low (JSON file, tightly coupled)                |
| Space Law    | No (descriptive text only)                                       | No (requirements are prose)                                  | Low (favorability score, not compliance status) |

**Critical insight:** The three engines have **incompatible output types**:

- EU Space Act → `ComplianceResult` with 4-state module statuses (`not_applicable` / `required` / `simplified` / `recommended`) — no numeric score
- NIS2 → `NIS2ComplianceResult` with classification + requirement list + maturity score (0-100)
- Space Law → `SpaceLawComplianceResult` with favorability scores (0-100) + comparison matrix

ACE needs a **Unified Compliance Interface** (UCI) that wraps all three engines with a common output format. The NIS2 engine's `ComplianceRule` + `AssessmentField` pattern is the template — it needs to be ported to the other two engines.

**ACE gap:** Major. The EU Space Act engine operates on a proprietary JSON file (`caelex-eu-space-act-engine.json`) with ~119 articles, but those articles have `required_documents` and `estimated_cost` fields that are currently stripped by `redactArticlesForClient()`. These fields could serve as evidence scaffolding. The Space Law engine would need the most work — its 10 jurisdiction profiles have licensing requirements with `mandatory: boolean` but no `evidenceRequired` or `assessmentFields`.

#### 3.3 API Architecture — **7/10**

**What exists:**

- Evidence API at `/api/audit-center/evidence` (GET/POST with regulation type + requirement ID scoping)
- Outbound webhook system with 28 event types and HMAC-SHA256 signing — can emit evidence lifecycle events
- External API (`/api/v1/compliance/*`) with API key auth and scope validation
- Consistent auth patterns (NextAuth sessions for dashboard, API keys for external)
- Rate limiting (7 tiers via Upstash Redis)

**What's missing:**

- No evidence-specific API versioning (current evidence API is part of audit-center, not a first-class domain)
- No bulk evidence upload/validation endpoint
- No evidence search/filter API (current API returns by regulation type only)
- No webhook events for evidence state changes (the 28 existing event types don't include evidence events)
- No queue system — all processing is synchronous or via polling crons

**ACE gap:** Create dedicated `/api/v1/evidence/*` endpoints. Add evidence lifecycle events to the webhook system. The existing webhook infrastructure (encrypted secrets, SSRF protection, retry logic) can be reused directly.

#### 3.4 Frontend Readiness — **6/10**

**What exists:**

- `EvidencePanel` component supports 10 evidence types: DOCUMENT, CERTIFICATE, ATTESTATION, POLICY, PROCEDURE, TEST_RESULT, LOG_EXTRACT, SCREENSHOT, EXTERNAL_REPORT, OTHER
- `AssessmentFieldForm` renders boolean, number, text, date, and select fields from `assessmentFields` definitions
- `auto-assess.ts` evaluates `ComplianceRule` against user responses and suggests compliance status
- Article-level tracker (`/dashboard/tracker`) with per-article status and module progress bars
- Compliance Digital Twin overview (`/api/digital-twin/overview`) aggregates score, modules, evidence, deadlines, velocity

**What's missing:**

- 5 of 8 modules don't render `EvidencePanel` — Authorization, Environmental, Insurance, Registration, Supervision
- No evidence coverage visualization (percentage of requirements with accepted evidence)
- No evidence timeline/history view
- No cross-regulation evidence reuse UI (e.g., ISO 27001 cert satisfying both NIS2 and EU Space Act)
- `evidencePct` in the Digital Twin module status is hardcoded to `0` — TODO comment in codebase

**ACE gap:** Deploy `EvidencePanel` to the remaining 5 modules. Build evidence coverage dashboard. Wire `evidencePct` in the Digital Twin. The component infrastructure exists — it's a deployment problem, not a development problem.

#### 3.5 Data Integrity & Immutability — **8/10**

**What exists:**

- `AuditLog` with SHA-256 hash chain (`entryHash` + `previousHash`) — tamper-evident, indexed
- `ComplianceAttestation` with `signatureHash` + `previousHash` — same pattern
- `Document` model with SHA-256 `checksum` field
- `ComplianceEvidence` lifecycle prevents deletion (DRAFT → SUBMITTED → ACCEPTED/REJECTED/EXPIRED, no DELETE status)
- `ComplianceSnapshot` is append-only with `@@unique([userId, snapshotDate])`
- Token revocation pattern (never delete, only invalidate) on 4 models
- `DocumentAccessLog` is append-only (no `updatedAt`)

**What's missing:**

- `ComplianceEvidence` itself does NOT have an `entryHash` or `previousHash` field — unlike AuditLog and ComplianceAttestation
- No Merkle tree or content-addressable storage for evidence bundles
- Document version tree is a parent/child pattern (`parentId`) but doesn't chain evidence to document versions

**ACE gap:** Add `entryHash` + `previousHash` to `ComplianceEvidence` (copy the AuditLog pattern — already proven). The existing hash chain implementation in `src/lib/audit.ts` can be reused directly.

#### 3.6 Regulatory Knowledge Base — **5/10**

**What exists:**

- NIS2: 51 requirements with `evidenceRequired[]`, `assessmentFields[]`, `complianceRule`, `spaceSpecificGuidance`, `euSpaceActRef`, `iso27001Ref`, `enisaControlIds`, `implementationTimeWeeks` — **gold standard**
- EU Space Act: 119 articles in JSON with `applies_to`, `excludes`, `compliance_type`, `required_documents` (server-side only), `estimated_cost` — structured but not evidence-mapped
- Space Law: 10 jurisdictions with licensing requirements — descriptive only
- 67 article groups in `articles.ts` for client-side tracker
- `COMPLIANCE_TYPE_MAP` normalizes 26 raw types → 5 canonical categories
- 9 module definitions with EU Space Act article range mappings

**What's missing:**

- No unified regulatory knowledge graph — cross-references scattered across 4 files:
  1. `src/data/cross-references.ts` (NIS2 ↔ EU Space Act, 6 regulation types)
  2. `src/data/space-law-cross-references.ts` (national law ↔ EU Space Act)
  3. `src/lib/astra/regulatory-knowledge/cross-regulation-map.ts` (AI knowledge, has `timeSavingsPercent`)
  4. Inline `euSpaceActRef` on NIS2Requirement objects
- No shared ID space across regulation types
- EU Space Act articles lack `evidenceRequired` (only NIS2 has this)
- No database-backed requirement catalog — all in TypeScript files/JSON

**ACE gap:** This is the **hardest dimension**. Building the Regulatory Knowledge Graph requires:

1. A `RegulatoryRequirement` table migrating all requirements from TypeScript to database
2. A `RequirementCrossReference` table unifying the 4 cross-reference sources
3. Adding `evidenceRequired` to EU Space Act articles and Space Law licensing requirements
4. Estimated: 500-800 requirement entries to seed

#### 3.7 Evidence Lifecycle Management — **5/10**

**What exists:**

- `ComplianceEvidence.status` enum: DRAFT, SUBMITTED, ACCEPTED, REJECTED, EXPIRED
- `validFrom` / `validUntil` on ComplianceEvidence
- Daily `compliance-snapshot` cron tracks `evidenceTotal`, `evidenceAccepted`, `evidenceExpired`, `evidenceCompletePct`
- `document-expiry` cron sends document expiration alerts
- Document model tracks `expiryDate` with `@@index([userId, status, expiryDate])`

**What's missing:**

- No automated evidence validation (all transitions are manual)
- No evidence renewal workflow (expired evidence just sits)
- No evidence-to-requirement coverage calculation at query time
- No evidence scoring (all evidence has equal weight regardless of type or source)
- No evidence chain-of-custody tracking (who submitted, who reviewed, who accepted)
- The `compliance-snapshot` cron queries `evidenceTotal` etc. but these fields appear to be **placeholders** — the actual query in the cron uses a simplified count

**ACE gap:** Build `EvidenceLifecycleService` with automated expiry detection, renewal notifications, and coverage calculation. The daily cron infrastructure exists — add evidence-specific jobs. Consider Inngest or Trigger.dev for event-driven evidence workflows instead of polling.

#### 3.8 Cross-Regulation Mapping — **4/10**

**What exists:**

- NIS2 engine calculates `euSpaceActOverlap` (count + weeks saved) from `CROSS_REFERENCES` array
- `CROSS_REFERENCES` entries have `relationship` (implements/overlaps/extends/supersedes/references) and `confidence` (confirmed/interpreted/potential)
- ASTRA knowledge graph has `timeSavingsPercent` per cross-regulation mapping
- Space Law engine generates EU Space Act transition preview per jurisdiction

**What's missing:**

- No shared evidence across regulations (ISO 27001 cert uploaded for NIS2 can't be auto-linked to EU Space Act Art. 74-76)
- Cross-references are read-only arrays used for display — no write path
- No cross-regulation compliance calculation (e.g., "satisfying NIS2-001 auto-satisfies EU-SA Art. 74")
- The 4 cross-reference sources are structurally incompatible (different schemas, different ID spaces)
- No transitive closure — if A implements B and B overlaps C, the system doesn't infer A relates to C

**ACE gap:** This is the second-hardest dimension after the knowledge graph. Requires the `RequirementCrossReference` table from §3.6, plus a `SharedEvidence` concept where one evidence record can satisfy requirements across regulation types. The NIS2 overlap calculation provides the algorithmic template.

#### 3.9 Automation & Processing — **6/10**

**What exists:**

- `auto-assess.ts` evaluates `ComplianceRule` against user responses — template for automated evidence evaluation
- `suggestComplianceStatus()` returns `compliant | partial | non_compliant | null`
- `compliance-snapshot` cron processes all users daily (batches of 50)
- `regulatory-feed` cron queries EUR-Lex SPARQL for new regulatory documents
- `nca-deadlines` cron monitors NIS2 incident phases (24h/72h/30d)
- `incident-autopilot` service orchestrates incident lifecycle
- Outbound webhooks can trigger external systems on compliance events

**What's missing:**

- No queue system — all async work is polling-based crons on Vercel (120s max)
- No document content extraction (uploaded PDFs are opaque blobs in R2)
- No AI/LLM integration despite regulatory complexity
- `auto-assess.ts` only evaluates boolean/numeric rules, not document content
- No evidence auto-classification from document metadata
- No OCR or NLP pipeline for certificate/policy parsing

**ACE gap:** The auto-assessment engine is a strong foundation but operates only on structured form inputs. ACE's document ingestion layer needs either: (a) AI-powered document classification, or (b) a metadata-first approach where users tag evidence types during upload. Option (b) aligns with the existing `EvidencePanel` 10-type taxonomy and avoids AI infrastructure complexity.

#### 3.10 Scalability & Performance — **5/10**

**What exists:**

- Neon Serverless PostgreSQL (auto-scaling reads)
- Upstash Redis for rate limiting (7 tiers)
- Presigned URL pattern for file uploads (bypass server for file bytes)
- `ComplianceSnapshot` batching (50 users per batch)
- Lazy module imports for compliance engines (code splitting)
- ~108 database indices optimized for common query patterns

**What's missing:**

- No background job queue (Inngest, Trigger.dev, BullMQ) — Vercel cron max 120s
- `compliance-snapshot` cron won't scale beyond ~500 users without timeout
- No read replicas or caching layer for compliance calculations
- `evidencePct` per module is a TODO (hardcoded 0)
- Report generation is synchronous (`renderToBuffer()` in request handler)
- Scheduled report archive uses local path reference, not R2 upload

**ACE gap:** For MVP (<100 orgs), current infrastructure suffices. For scale, add Inngest for event-driven evidence processing. Move report generation to background jobs. Add Redis caching for compliance calculations.

### Compatibility Summary

| #   | Dimension                 | Score      | Critical Path?                          |
| --- | ------------------------- | ---------- | --------------------------------------- |
| 1   | Schema Readiness          | 7/10       | No — extend existing model              |
| 2   | Engine Extensibility      | 5/10       | **Yes** — unified interface needed      |
| 3   | API Architecture          | 7/10       | No — add endpoints to existing patterns |
| 4   | Frontend Readiness        | 6/10       | No — deploy existing component          |
| 5   | Data Integrity            | 8/10       | No — patterns proven, copy to evidence  |
| 6   | Regulatory Knowledge Base | 5/10       | **Yes** — knowledge graph is foundation |
| 7   | Evidence Lifecycle        | 5/10       | **Yes** — core ACE value proposition    |
| 8   | Cross-Regulation Mapping  | 4/10       | **Yes** — enables evidence reuse        |
| 9   | Automation & Processing   | 6/10       | Partially — MVP can be manual-first     |
| 10  | Scalability               | 5/10       | No — sufficient for MVP                 |
|     | **Weighted Average**      | **5.8/10** |                                         |

---

## 4. Aufwand-Schätzung (Effort Estimation)

### Phase 0 — Foundation (2-3 Wochen)

**Ziel:** Unified requirement ID space + evidence hash chain

| Task                                                                          | Aufwand | Risiko                                        |
| ----------------------------------------------------------------------------- | ------- | --------------------------------------------- |
| Create `RegulatoryRequirement` Prisma model                                   | 2d      | Low                                           |
| Seed NIS2 requirements (51 entries) from TypeScript → DB                      | 3d      | Medium — data migration, validate consistency |
| Add `entryHash` + `previousHash` to `ComplianceEvidence`                      | 1d      | Low — copy AuditLog pattern                   |
| Add `sourceType` enum (MANUAL/DOCUMENT/API/AUTOMATED) to `ComplianceEvidence` | 0.5d    | Low                                           |
| Create `/api/v1/evidence` REST endpoints (CRUD + search)                      | 3d      | Low — follow existing API patterns            |
| Wire `evidencePct` in `compliance-twin-service.ts` (replace hardcoded 0)      | 1d      | Low                                           |

**Total: 10-12 working days**

### Phase 1 — NIS2 Evidence MVP (3-4 Wochen)

**Ziel:** Full evidence lifecycle for NIS2 module — the most mature module becomes ACE showcase

| Task                                                                                           | Aufwand | Risiko                                |
| ---------------------------------------------------------------------------------------------- | ------- | ------------------------------------- |
| Migrate NIS2 `evidenceRequired[]` to per-requirement evidence checklists in DB                 | 2d      | Low                                   |
| Build `EvidenceChecklist` component showing required vs. submitted evidence per requirement    | 3d      | Low                                   |
| Add evidence coverage calculation to NIS2 dashboard (% of requirements with accepted evidence) | 2d      | Low                                   |
| Add evidence lifecycle notifications (submitted, accepted, expiring)                           | 2d      | Low — use existing `notifyUser()`     |
| Add evidence events to webhook system (4 new event types)                                      | 1d      | Low — extend existing webhook-service |
| Build evidence audit trail view (who submitted, who reviewed, chain verification)              | 3d      | Medium                                |
| Integration testing                                                                            | 2d      | Low                                   |

**Total: 15-18 working days**

### Phase 2 — Cybersecurity + Debris Extension (4-6 Wochen)

**Ziel:** Deploy evidence system to Cybersecurity and Debris modules (both already have EvidencePanel)

| Task                                                                              | Aufwand | Risiko                                      |
| --------------------------------------------------------------------------------- | ------- | ------------------------------------------- |
| Seed Cybersecurity requirements to `RegulatoryRequirement` table                  | 2d      | Medium — different data structure than NIS2 |
| Seed Debris requirements to `RegulatoryRequirement` table                         | 2d      | Medium                                      |
| Add evidence checklists to Cybersecurity module                                   | 2d      | Low — copy NIS2 pattern                     |
| Add evidence checklists to Debris module                                          | 2d      | Low                                         |
| Build cross-module evidence dashboard (unified view across NIS2 + Cyber + Debris) | 4d      | Medium                                      |
| Add evidence status to `ComplianceSnapshot` per module (currently aggregate only) | 2d      | Low                                         |
| Add evidence score weighting to `compliance-scoring-service.ts`                   | 3d      | Medium — scoring algorithm change           |
| Testing + QA                                                                      | 3d      | Low                                         |

**Total: 20-28 working days**

### Phase 3 — Remaining 5 Modules (6-8 Wochen)

**Ziel:** Evidence integration for Authorization, Environmental, Insurance, Registration, Supervision

| Task                                                                           | Aufwand | Risiko                            |
| ------------------------------------------------------------------------------ | ------- | --------------------------------- |
| Authorization: Define evidence requirements for document checklist             | 3d      | Medium — new data modeling        |
| Authorization: Deploy `EvidencePanel`, link to workflow documents              | 3d      | Medium                            |
| Environmental: Map EFD calculation inputs to evidence requirements             | 2d      | Medium                            |
| Environmental: Add `EvidencePanel` for supplier data and calculation artifacts | 2d      | Low                               |
| Insurance: Map policy records to evidence (policy docs, certificates)          | 2d      | Low — policy data is the evidence |
| Insurance: Deploy `EvidencePanel`                                              | 1d      | Low                               |
| Registration: Map COSPAR/NORAD IDs to evidence                                 | 1d      | Low                               |
| Registration: Deploy `EvidencePanel`                                           | 1d      | Low                               |
| Supervision: Map incident records and NCA correspondence to evidence           | 3d      | Medium                            |
| Supervision: Deploy `EvidencePanel`                                            | 2d      | Low                               |
| Unified evidence dashboard across all 8 modules                                | 4d      | Medium                            |
| Testing + QA                                                                   | 4d      | Low                               |

**Total: 28-36 working days**

### Phase 4 — Cross-Regulation Graph + Automation (8-12 Wochen)

**Ziel:** Regulatory Knowledge Graph, cross-regulation evidence reuse, automated validation

| Task                                                                                  | Aufwand | Risiko                                                       |
| ------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| Create `RequirementCrossReference` model + seed from 4 existing sources               | 5d      | **High** — schema reconciliation across incompatible formats |
| Migrate EU Space Act articles to `RegulatoryRequirement` table (~119 entries)         | 4d      | Medium — JSON-to-DB migration                                |
| Migrate Space Law requirements (~100 entries across 10 jurisdictions)                 | 3d      | Medium                                                       |
| Build "Shared Evidence" feature — one evidence record satisfies multiple requirements | 5d      | **High** — cross-regulation logic                            |
| Build Evidence Auto-Classification service (metadata-based, no AI)                    | 4d      | Medium                                                       |
| Add evidence expiry monitoring to daily cron                                          | 2d      | Low                                                          |
| Add evidence renewal workflow (notifications, re-upload flow)                         | 3d      | Medium                                                       |
| Build Regulatory Knowledge Graph API (`/api/v1/knowledge-graph`)                      | 4d      | Medium                                                       |
| Build Knowledge Graph visualization (requirements → articles → evidence)              | 5d      | **High** — complex UI                                        |
| Add Inngest or Trigger.dev for event-driven evidence processing                       | 4d      | Medium — new infrastructure                                  |
| Migrate `compliance-snapshot` cron to background job                                  | 2d      | Low                                                          |
| End-to-end testing                                                                    | 5d      | Medium                                                       |

**Total: 46-56 working days**

### Gesamtaufwand

| Phase                      | Wochen           | Cumulative      |
| -------------------------- | ---------------- | --------------- |
| Phase 0: Foundation        | 2-3              | 2-3             |
| Phase 1: NIS2 Evidence MVP | 3-4              | 5-7             |
| Phase 2: Cyber + Debris    | 4-6              | 9-13            |
| Phase 3: Remaining Modules | 6-8              | 15-21           |
| Phase 4: Knowledge Graph   | 8-12             | 23-33           |
| **Total**                  | **23-33 Wochen** | **~6-8 Monate** |

**MVP (Phase 0+1) in 5-7 Wochen lieferbar.** Phase 4 kann parallel zu Phasen 2-3 begonnen werden (Knowledge Graph ist unabhängig von module-level evidence deployment).

---

## 5. Risiken & Red Flags

### Red Flag 1: Engine Fragmentation (Severity: HIGH)

Die drei Compliance-Engines haben **inkompatible Schnittstellen**:

```
EU Space Act → 4-state discrete status (no score)
NIS2         → 3-level classification + maturity score (0-100)
Space Law    → favorability score (0-100) + comparison matrix
```

ACE benötigt eine **Unified Compliance Interface** (UCI). Ohne UCI kann ACE keine cross-regulation Evidence-Wiederverwendung leisten. Die NIS2-Engine hat den richtigen Ansatz (`ComplianceRule` + `AssessmentField`), aber dieser muss auf die EU Space Act Engine portiert werden — was bedeutet, den proprietären JSON-Corpus (`caelex-eu-space-act-engine.json`) mit evidence-mapping Feldern anzureichern.

**Mitigation:** Adapter-Pattern. Baue einen `UnifiedComplianceAdapter` der die Engine-Outputs normalisiert, statt die Engines selbst umzubauen. Akzeptiere, dass EU Space Act modules zunächst nur document-checklist-level Evidence haben (wie die bestehende Authorization-Module).

### Red Flag 2: No Queue Infrastructure (Severity: MEDIUM)

Alle Hintergrundverarbeitung läuft über Vercel Cron (max 120s, polling-basiert). Die `compliance-snapshot` Cron verarbeitet Batches von 50 Usern pro Durchlauf. Bei 200+ Organisationen mit evidence processing wird das timeout-anfällig.

**Mitigation:** Inngest (Vercel-native, serverless queues) einführen. Starter-Tier ist kostenlos. Kann inkrementell eingeführt werden — zuerst für evidence processing, später für report generation und andere bestehende Crons.

### Red Flag 3: JSON Escape Hatches (Severity: MEDIUM)

~50+ Felder über 40+ Models verwenden `Json?` oder `String @db.Text` für strukturierte Daten. Besonders kritisch:

- `responses Json?` auf allen 10 `*RequirementStatus` Models — enthält die assessmentField-Antworten
- `User.unifiedAssessmentResult String? @db.Text` — gesamtes Assessment-Ergebnis als JSON-Blob

Für ACE muss evidence-relevante Information aus diesen JSON-Blobs extrahierbar und queryable sein. Aktuell ist keine SQL-Query möglich über Requirement-Antworten hinweg.

**Mitigation:** Für Phase 0-2 akzeptabel — `responses` bleiben JSON, evidence metadata wird in eigenen Feldern gespeichert. Für Phase 4 prüfen, ob PostgreSQL JSONB-Queries ausreichen oder ob ein Schema-Refactoring nötig ist.

### Red Flag 4: Cross-Reference Schema Inkonsistenz (Severity: HIGH)

Vier separate Cross-Reference-Quellen mit vier verschiedenen Schemas:

| Quelle                            | Schema                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `cross-references.ts`             | `sourceRegulation` / `targetRegulation` / `relationship` / `confidence`          |
| `space-law-cross-references.ts`   | `topicArea` / `euSpaceActArticles` / `relationship` / `applicableCountries`      |
| `cross-regulation-map.ts` (ASTRA) | `sourceRegulation` / `targetRegulation` / `timeSavingsPercent`                   |
| NIS2Requirement inline            | `euSpaceActRef` / `euSpaceActArticleNumbers` / `iso27001Ref` / `enisaControlIds` |

Es gibt kein gemeinsames ID-System, keine gemeinsame Relationship-Taxonomie, keine gemeinsame Datenbank-Tabelle. Die Vereinigung dieser 4 Quellen ist die technisch anspruchsvollste Aufgabe des gesamten ACE-Projekts.

**Mitigation:** Startpunkt ist die NIS2-Engine's Cross-Reference-Berechnung (`calculateEUSpaceActOverlap()`), die bereits `CROSS_REFERENCES` programmatisch auswertet. Diesen Algorithmus auf eine DB-basierte `RequirementCrossReference`-Tabelle umstellen und die anderen 3 Quellen als Seeds verwenden.

### Red Flag 5: Evidence Digital Twin Gap (Severity: LOW)

`compliance-twin-service.ts` aggregiert 8 parallele DB-Queries zu einem Compliance-Zustandsbild, aber:

- `evidencePct` ist auf allen Modulen hardcoded `0`
- Die Velocity-Berechnung (7d/30d/90d-Trend) berücksichtigt keine Evidence-Metriken
- Der 90-Tage-Forecast (lineare Regression) basiert nur auf ComplianceSnapshot-Scores, nicht auf Evidence-Fortschritt

**Mitigation:** Geringer Aufwand. `evidencePct` kann in Phase 1 verdrahtet werden. Evidence-Velocity in Phase 2. Forecast-Integration in Phase 4.

### Red Flag 6: Kein AI/LLM-Layer (Severity: LOW für MVP)

Trotz der regulatorischen Komplexität (119 EU Space Act Artikel, 51 NIS2-Anforderungen, 10 Jurisdiktionen) gibt es keine AI-Integration. Die EUR-Lex-Klassifizierung ist keyword-basiert. Document-Parsing existiert nicht.

**Mitigation:** ACE MVP kann ohne AI funktionieren — metadata-first Ansatz (User taggt Evidence-Typ beim Upload). AI-basierte Document-Klassifizierung ist ein Phase-5-Feature (nicht in dieser Schätzung enthalten).

---

## 6. Strategische Empfehlung

### Empfohlene Strategie: "Inside-Out"

Statt ACE als separates System zu bauen und dann zu integrieren, empfehle ich eine **Inside-Out-Strategie**: Die bestehende NIS2-Evidence-Infrastruktur wird zum ACE-Kern, und die anderen Module werden schrittweise angeschlossen.

```
NIS2 (bereits ACE-ready)
  ↓ Phase 1: Evidence MVP
Cybersecurity + Debris (EvidencePanel existiert)
  ↓ Phase 2: Evidence Extension
Authorization + Insurance + Environmental + Registration + Supervision
  ↓ Phase 3: Full Coverage
Cross-Regulation Knowledge Graph
  ↓ Phase 4: Unification
```

### Warum Inside-Out statt Top-Down:

1. **Kein Big-Bang-Risiko** — Jede Phase liefert sofort Kundennutzen
2. **Bestehende Infrastruktur nutzen** — `EvidencePanel`, `auto-assess.ts`, `ComplianceEvidence` sind production-ready
3. **NIS2 als Proof-of-Concept** — Der strengste regulatorische Rahmen (Art. 21(2)(a)-(j)) validiert das ACE-Konzept
4. **Inkrementelle Datenmigration** — Requirements kommen Modul für Modul in die DB, nicht als riskante Massenmigration
5. **Revenue-Aligned** — NIS2-Compliance ist der aktuell heißeste Verkaufsargument im EU Space Sector

### Architektur-Empfehlung: Was NICHT bauen

| ACE-Spec-Element                     | Empfehlung                                                                         | Begründung                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Immutable Evidence Store             | **Adaptieren** — bestehendes AuditLog hash-chain Pattern kopieren                  | Kein separater Store nötig, PostgreSQL + hash chain reicht                               |
| Document Parsing / AI Classification | **Verschieben** auf Post-MVP                                                       | Metadata-first Ansatz mit bestehender EvidencePanel-Taxonomie (10 Typen) ist ausreichend |
| Regulatory Knowledge Graph (full)    | **Inkrementell** — DB-Tabelle ja, Graph-Visualisierung erst Phase 4                | Cross-Reference-Vereinigung ist riskant, querybarer Table genügt zunächst                |
| Real-time Compliance Evaluation      | **Adaptieren** — bestehendes `auto-assess.ts` + `ComplianceRule` Pattern erweitern | Kein neues Engine-Framework nötig                                                        |
| Evidence API (external)              | **Bauen** — `/api/v1/evidence/*` als First-Class-API                               | Direkte Anbindung an bestehendes API-Key-System                                          |

### Was das Compliance-Scoring verändert

Aktuell berechnet `compliance-scoring-service.ts` einen 0-100 Score über 6 Module mit festen Gewichten:

```
Authorization: 25%, Debris: 20%, Cybersecurity: 20%,
Insurance: 15%, Environmental: 10%, Reporting: 10%
```

ACE sollte einen **Evidence-basierten Score** einführen, der parallel zum bestehenden Score läuft:

```
Evidence Score = Σ (accepted_evidence_count / required_evidence_count) × module_weight
```

Der bestehende Score bleibt als "Self-Assessment Score" erhalten. Der neue Evidence Score wird zum "Verified Compliance Score". Die Differenz zwischen beiden zeigt den "Verification Gap".

---

## 7. Verdict

### CONDITIONAL GO

ACE ist machbar und strategisch sinnvoll. Die Codebase hat überraschend viel bestehende Infrastruktur (ComplianceEvidence, hash chains, EvidencePanel, auto-assessment), die den Aufwand gegenüber einem Greenfield-Ansatz um geschätzte 40-50% reduziert.

### Bedingungen für GO:

| #   | Bedingung                                                            | Begründung                                                                                                |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | **Phased Rollout starten mit NIS2**                                  | Einziges Modul mit `evidenceRequired[]` + `ComplianceRule` + `EvidencePanel` — alle drei ACE-Kernelemente |
| 2   | **Unified Requirement ID Space in Phase 0**                          | Ohne DB-basierte `RegulatoryRequirement`-Tabelle kann ACE keine cross-regulation Evidence verwalten       |
| 3   | **Queue-System einführen vor Phase 4**                               | Polling-basierte Crons skalieren nicht für evidence processing bei >100 Organisationen                    |
| 4   | **Cross-Reference-Vereinigung als eigenständiges Projekt behandeln** | 4 inkompatible Quellen, höchstes technisches Risiko — nicht als Side-Task                                 |
| 5   | **EU Space Act Engine NICHT umbauen für Phase 1-3**                  | Adapter-Pattern statt Engine-Rewrite — der JSON-Corpus bleibt, ein Adapter normalisiert die Ausgabe       |

### HOLD-Kriterien (was den GO zum HOLD macht):

- Wenn parallel ein Engine-Rewrite geplant ist → ACE und Engine-Rewrite müssen koordiniert werden
- Wenn <6 Monate Dev-Kapazität verfügbar → Phase 0+1 sind das Minimum (5-7 Wochen), alles darunter liefert kein kohärentes Feature
- Wenn AI/LLM-basierte Document-Klassifizierung ein Day-1-Requirement ist → erhöht den Aufwand um ~8-12 Wochen und erfordert neue Infrastruktur (LLM API, Token-Budget, Evaluation Pipeline)

### NO-GO-Kriterien:

- Keine identifiziert. Die technischen Risiken sind beherrschbar, die bestehende Infrastruktur ist solide, und der phased Ansatz eliminiert Big-Bang-Risiko.

---

## Appendix A: Key Files Reference

| File                                             | Why Essential for ACE                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `prisma/schema.prisma:3592-3645`                 | `ComplianceEvidence` + `ComplianceEvidenceDocument` — existing evidence models |
| `prisma/schema.prisma:256-295`                   | `AuditLog` — hash chain pattern to copy                                        |
| `src/components/audit/EvidencePanel.tsx`         | Production evidence UI component (10 types)                                    |
| `src/lib/compliance/auto-assess.ts`              | Auto-assessment engine (evaluates `ComplianceRule`)                            |
| `src/lib/compliance/types.ts`                    | `AssessmentField` + `ComplianceRule` type definitions                          |
| `src/data/nis2-requirements.ts`                  | Gold standard: 51 requirements with full evidence mapping                      |
| `src/lib/nis2-engine.server.ts:177-230`          | Cross-regulation overlap calculation                                           |
| `src/lib/services/compliance-twin-service.ts`    | Digital twin aggregation (needs `evidencePct` wiring)                          |
| `src/lib/services/compliance-scoring-service.ts` | Scoring algorithm (needs evidence weight addition)                             |
| `src/app/api/audit-center/evidence/route.ts`     | Existing evidence API                                                          |
| `src/lib/services/webhook-service.ts`            | 28 event types (add evidence events)                                           |
| `src/app/api/cron/compliance-snapshot/route.ts`  | Daily snapshot (already tracks evidence metrics)                               |
| `src/data/cross-references.ts`                   | Primary cross-reference source (NIS2 ↔ EU Space Act)                           |
| `src/lib/engine.server.ts:481-496`               | `redactArticlesForClient()` — strips `required_documents` (unlock for ACE)     |

## Appendix B: Existing vs. Required Models

| ACE Concept                 | Existing Model                | Gap                                                                    |
| --------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| EvidenceRecord              | `ComplianceEvidence`          | Add `sourceType`, `entryHash`, `previousHash`, `metadata Json`         |
| EvidenceDocument Link       | `ComplianceEvidenceDocument`  | None — fully functional                                                |
| Regulatory Requirement      | None (TypeScript files only)  | **Create** `RegulatoryRequirement` table                               |
| Requirement Cross-Reference | None (4 separate TS arrays)   | **Create** `RequirementCrossReference` table                           |
| Evidence Mapping            | None                          | **Create** `EvidenceRequirementMapping` with `coveragePct`             |
| Immutable Evidence Store    | `AuditLog` hash chain pattern | Copy pattern to `ComplianceEvidence`                                   |
| Evidence Snapshot           | `ComplianceSnapshot`          | Already has `evidenceTotal`, `evidenceAccepted`, `evidenceCompletePct` |
| Evidence Attestation        | `ComplianceAttestation`       | None — fully functional with signature hash                            |
| Document Vault              | `Document`                    | None — versioning, checksum, `moduleType` linking all exist            |

---

_Report generated by automated deep analysis of 5,745 lines of Prisma schema, 3 compliance engines, 44 services, 138+ API routes, and 8 dashboard modules. No code was modified during this analysis._
