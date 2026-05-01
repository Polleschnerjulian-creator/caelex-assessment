# Caelex — Build Plan (Living Document)

**Letzter Update:** 2026-05-01
**Zweck:** Persistenter Master-Plan für die "neue Comply-Vision"-Implementation. Wird nach jedem Sprint aktualisiert. **Single Source of Truth für künftige Claude-Sessions.**

---

## ⚡ FÜR KÜNFTIGE CLAUDE-SESSIONS — START HIER

Wenn du diese Doku liest und dich orientieren musst:

1. **Aktueller Sprint:** siehe Section 4 ("Current Sprint")
2. **Was schon erledigt:** siehe Section 5 ("Changelog")
3. **Endziel:** Section 1 (1-Pager-Vision)
4. **V1-Coexistence-Pflicht:** Section 2 (NIEMALS V1-Code löschen)
5. **Konzept-Doku-Reihe:** Section 7 (13 Konzept-Docs als Referenz)

**Auto-mode-Aktiv-Erwartung:** Push direkt auf main, Vercel auto-deployt. V1 bleibt erhalten als Fallback.

---

## Section 1: Endziel + Vision (1-Pager)

> **Caelex Comply 2027** ist die einzige Compliance-Plattform für europäische Raumfahrt mit:
>
> 1. Personalisierten Workflow-DAGs (COE) basierend auf verifiziertem Operator-Profil (T0-T5 Tier-System)
> 2. Live-Streaming-Operations-Console mit Multi-Pane Card-Wall, Force-Directed Workflow-Graphs und 3D Operator-Universe (Palantir-Wow-Effekt)
> 3. Mathematisch beweisbarem Audit-Trail mit Witness-Cosignatures (BAFA + BNetzA + Operator-Genossenschaft) + OpenTimestamps Bitcoin-Anchor
> 4. AI-Act-konformer Astra mit Citation-Validator + Multi-Model-Cross-Check + Hash-Chained-Decision-Logs
> 5. Perfect Pharos- + Atlas-Integration via gemeinsame Hash-Chain
> 6. 18-Min-Onboarding via Auto-Detection aus 5 öffentlichen Quellen, 5-Stage-Funnel mit Public-Pulse-Tool

**Endzustand operator-erlebt:**

- Tag 0: 18 Min bis erstem gelösten Compliance-Problem (Anna's Walkthrough)
- Tag 90: 5-8 Min/Tag Compliance-Routine (alles andere im Hintergrund)
- Time-Saved: ~150-200h vs manuelle Compliance = €22.500-30.000/90d bei CTO-Stundensatz

**Tech-Stack:** Next.js 15 + Postgres (Neon) + Anthropic Claude (→ AWS Bedrock EU) + Vercel + Three.js + React-Flow + Framer Motion + Server-Sent-Events. **Null externe Workflow-Costs** (kein Inngest/Temporal/WorkOS).

**Strategischer Win:** Caelex wird **die digitale Compliance-Infrastruktur für EU-Raumfahrt**, nicht "ein GRC-Tool unter vielen".

---

## Section 2: V1-Preservation-Strategie (KRITISCH)

### Grundregeln

**1. V1-Code wird NIEMALS gelöscht.** Alle V1-Routes, V1-UIs, V1-Components bleiben funktional im Repo.

**2. Switching-Mechanismus existiert bereits:** `Organization.complyUiVersion` und `User.complyUiVersion` (Felder existieren in `prisma/schema.prisma`). Settings-Page `/dashboard/settings/ui` erlaubt User-Switch zwischen "v1" und "v2".

**3. Default-Toggle-Strategie:**

- Bei Sprint 1 Deploy: `complyUiVersion @default("v2")` bleibt (V2 ist Default-Live)
- V1 ist für Disaster-Recovery, einzelne User können manuell switchen
- Wenn ein V2-Bug User blockiert → Caelex-Admin kann user-individuell auf V1 zurückschalten

**4. Schema-Migrations sind additiv:**

- Neue Models/Felder werden hinzugefügt
- Existing Models/Felder werden NICHT geändert
- Wenn ein Feld umbenannt werden muss: alten Namen behalten, neuen Namen mit Migration parallel laufen lassen, später Old-Name deprecaten (nicht löschen)

**5. Routes-Coexistence:**

- V1-Routes bleiben unter `/dashboard/modules/*` etc.
- V2-Routes leben unter `/dashboard/posture`, `/dashboard/today`, `/dashboard/missions`, etc.
- Sidebar entscheidet via `complyUiVersion` welche Routes sichtbar sind

**6. Komponenten-Coexistence:**

- V1-Komponenten unter `src/components/dashboard/*` bleiben
- V2-Komponenten unter `src/components/dashboard/v2/*`
- V2-Primitives unter `src/components/ui/v2/*`

**7. Engine-Coexistence:**

- 24 Compliance-Engines werden NICHT verändert (V1+V2 nutzen die gleichen)
- COE wird **on top of Engines** gebaut, nicht ersetzt
- Astra V1 + V2 + Pharos bleiben separate Astra-Engines

**8. Multi-Tenancy + Auth bleiben unverändert.**

### Was darf gelöscht werden?

- **Nichts in `src/`** ohne explizite User-Bestätigung
- **Konzept-Docs in `docs/`** dürfen markiert werden als "überholt" — aber nicht gelöscht (für Audit-Trail-Geschichte)

### Rollback-Strategie wenn V2 ausfällt

```sql
-- Disaster-Recovery via SQL:
UPDATE "Organization" SET "complyUiVersion" = 'v1' WHERE "id" = '...';
-- Oder global:
UPDATE "Organization" SET "complyUiVersion" = 'v1';
```

User klickt Browser-Refresh → ist auf V1 — **30 Sekunden Recovery-Zeit**.

---

## Section 3: Master-Sprint-Plan (Implementation-Roadmap)

### Phase 1: Foundation (Sprints 1-3, ~8-10 Wochen)

**Sprint 1 — Verified-Profile-Foundation** [STATUS: STARTING]

- Sprint 1A: ProfileEvidence Schema + Hash-Chain
- Sprint 1B: OperatorProfile Model + Verification-Tiers
- Sprint 1C: Re-Verification-Cron-Skeleton
- **Ziel:** Operator-Profil mit Provenance-Kette + V1-Coexistence
- **Aufwand:** 3 Wochen
- **V1-Impact:** Null (rein additiv)

**Sprint 2 — Auto-Detection-Engine** [STARTING NOW]

- Sprint 2A: Adapter-Framework + VIES-Adapter (EU-VAT-Validation) — see ADR-009
- Sprint 2B: Handelsregister-DE Adapter (HTML parser or 3rd-party — ADR-010 to follow)
- Sprint 2C: UNOOSA Online Index Adapter
- Sprint 2D: BAFA-Public-Register Adapter
- Sprint 2E: Cross-Verification Tuning + Confidence-Scoring
- **Ziel:** 30%+ Profil-Coverage ohne Operator-Input
- **Aufwand:** 3-4 Wochen
- **V1-Impact:** Null

**Sprint 3 — COWF Foundation** [PENDING]

- Sprint 3A: 6 Workflow-Tabellen (Def, Instance, Event, Schedule, Listener, ApprovalSlot)
- Sprint 3B: defineWorkflow() DSL
- Sprint 3C: Heartbeat-Cron + Hash-Chain-Integration
- Sprint 3D: 7 Step-Types (action/form/approval/astra/waitFor/decision/qes)
- **Ziel:** Workflow-Engine läuft, ein erster Workflow durchgespielt
- **Aufwand:** 3-4 Wochen
- **V1-Impact:** Null (parallel zu existing State-Machine)

### Phase 2: Public-Funnel + UI-Reorg (Sprints 4-5, ~6 Wochen)

**Sprint 4 — Public-Pulse-Tool** [PENDING]

- caelex.eu/pulse Public-Page
- Source-Verification-Stream-UI
- Hypothesen-Compliance-Map
- 15-Page-PDF-Report
- Email-Capture-Flow
- **Ziel:** Funnel-Stage-1+2 live, Lead-Generation aktiv
- **Aufwand:** 3 Wochen
- **V1-Impact:** Null

**Sprint 5 — Mission-First-UI** [PENDING]

- /dashboard/missions als V2-Landing
- Mission-Detail-Page mit Phase-Roadmap
- Sidebar-Reorganisation (Mission/Workflows/Compliance/Reference)
- V1-Sidebar bleibt für `complyUiVersion="v1"`-User
- **Ziel:** UX-Sprung sichtbar
- **Aufwand:** 4 Wochen
- **V1-Impact:** Null (V1-Sidebar bleibt für V1-User)

### Phase 3: AI-Härtung + Live-Streaming (Sprints 6-7, ~6-8 Wochen)

**Sprint 6 — Astra-Härtungs-Layer** [PENDING]

- Citation-Validator portieren von Atlas zu Comply
- Reproducibility-Felder auf AstraProposal
- Multi-Model-Cross-Check (Bedrock-Claude + GPT-4o-mini)
- LLM-as-Judge portieren
- AI-Disclosure-UI (EU AI Act Art. 50)
- Anti-Rubber-Stamping-UI (EU AI Act Art. 14)
- **Ziel:** EU-AI-Act-konform vor 02.08.2026
- **Aufwand:** 4 Wochen
- **V1-Impact:** Null (V2-Astra-spezifisch)

**Sprint 7 — Live-Streaming-Backbone** [PENDING]

- Server-Sent-Events Infrastructure
- Postgres LISTEN/NOTIFY Setup
- Anthropic Streaming-API Integration
- Mission-Operations-Console UI (Wow-Pattern #3)
- Live-Astra-Reasoning-Stream UI (Wow-Pattern #5)
- **Ziel:** Sichtbarer Wow-Effekt für Demo
- **Aufwand:** 4 Wochen
- **V1-Impact:** Null

### Phase 4: USP + Polish (Sprints 8-10, ~8-10 Wochen)

**Sprint 8 — Witness-Network + OpenTimestamps** [PENDING]

- C2SP tlog-witness Endpoint
- OpenTimestamps Quarterly-Cron
- Public-Verify-Page
- D-Trust QES-Integration für Verity-Tier
- **Aufwand:** 4 Wochen
- **V1-Impact:** Null

**Sprint 9 — COE Full Implementation** [PENDING]

- 6 Sub-Engines (Dependency, Stakeholder, Time, Re-Use, Constraints, Risk)
- Personalized-DAG-Generation
- DAG-Re-Generation-Triggers
- Workflow-DAG-Force-Graph UI (Wow-Pattern #4)
- **Aufwand:** 6-8 Wochen
- **V1-Impact:** Null

**Sprint 10 — Wow-Effekt-Patterns + Polish** [PENDING]

- 3D Operator-Universe (Wow-Pattern #6)
- Hash-Chain-Block-Visualizer (Wow-Pattern #7)
- Provenance-Timeline (Wow-Pattern #8)
- Compliance-Health-Pulse (Wow-Pattern #9)
- Stakeholder-Network-Graph (Wow-Pattern #11)
- Time-Travel-Slider (Wow-Pattern #12)
- **Aufwand:** 6-8 Wochen
- **V1-Impact:** Null

### Phase 5: Pharos + Atlas Integration (Sprint 11, ~4 Wochen)

**Sprint 11 — Cross-Plattform-Bridges** [PENDING]

- Pharos-Submission-Webhook-Bridge
- Atlas-Counsel-Engagement-Flow
- Cross-Hash-Chain-Verifizierung
- Multi-Plattform-Test-Suite
- **Aufwand:** 4 Wochen
- **V1-Impact:** Pharos+Atlas existing, nur Bridges neu

**Total: ~50-60 Wochen mit 1 Engineer, ~24-30 Wochen mit 2-3 Engineers parallel**

---

## Section 4: Current Sprint

### Sprint 2 — Auto-Detection-Engine [IN PROGRESS]

**Status:** Sprint 2A done (VIES adapter + framework). Sprint 2B next (Handelsregister-DE).
**Started:** 2026-05-01

#### Sprint 2A — Adapter-Framework + VIES-Adapter ✅ COMPLETED 2026-05-01

Per ADR-009 (VIES-first). Lieferung:

- Adapter-Contract (types.ts + registry.ts)
- VIES REST-Adapter (echte EU-API, free, no mock)
- Cross-Verifier (multi-adapter merge with conflict-detection)
- Dispatcher (bridge stale-row enumeration → adapter runs)
- Cron-Wiring (env-gated auto-dispatch)
- 42 neue Tests, 92/92 cumulative pass

#### Sprint 2B — Handelsregister-DE [PENDING] (next)

#### Sprint 2C — UNOOSA Online Index [PENDING]

#### Sprint 2D — BAFA Public Register [PENDING]

#### Sprint 2E — Cross-Verification Tuning [PENDING]

---

### Sprint 1 — Verified-Profile-Foundation ✅ COMPLETED 2026-05-01

**Status:** All sub-sprints (1A, 1B, 1C) done. Next: Sprint 2 — Auto-Detection-Engine.
**Started:** 2026-05-01
**Completed:** 2026-05-01
**Sub-Sprints:**

#### Sprint 1A — DerivationTrace-Extension + Verification-Tier-Hash-Chain ✅ COMPLETED 2026-05-01

**Architektur-Entscheidung (siehe ADR-008):** Extend existing `DerivationTrace` table statt neue ProfileEvidence-Tabelle.

**Goals:**

- [x] ADR-008 dokumentiert (DerivationTrace-Extension statt parallele Tabelle)
- [x] `VerificationTier` Prisma-Enum (T0_UNVERIFIED bis T5_CRYPTOGRAPHIC_PROOF)
- [x] Additive Spalten auf `DerivationTrace`: verificationTier, sourceHash, prevHash, entryHash, verifiedAt, verifiedBy, attestationRef, revokedAt, revokedReason
- [x] Schema-Migration SQL (additive ALTER TABLE only)
- [x] Service-Layer `src/lib/operator-profile/evidence.server.ts` — append-with-hash-chain
- [x] Service-Shell `src/lib/operator-profile/profile.server.ts` — placeholder für Sprint 1B
- [x] Type-Modul `src/lib/operator-profile/types.ts` — Tier-System + Adapter-Types
- [x] Tests `src/lib/operator-profile/evidence.test.ts` — 24/24 pass (Hash-Chain-Integrität, Tier-Validation, Tamper-Detection)

**Files to create:**

- `prisma/migrations/20260501XXXXXX_verified_profile_tier_extension/migration.sql`
- `src/lib/operator-profile/types.ts`
- `src/lib/operator-profile/evidence.server.ts`
- `src/lib/operator-profile/profile.server.ts`
- `src/lib/operator-profile/evidence.test.ts`

**Files to extend:**

- `prisma/schema.prisma` — VerificationTier enum + DerivationTrace fields

**V1-Impact:** Null

- Existing `DerivationTrace`-Konsumer (`trust-tokens.ts`, `cybersecurity-provenance.ts`, `derivation-trace-service.ts`) lesen weiter — neue Felder sind alle nullable
- `OperatorProfile` bleibt unangetastet (existiert bereits mit operatorType, euOperatorCode etc.)
- Existing `derivation-trace-service.ts` bleibt unverändert

**Estimated time:** 2-3 Tage

#### Sprint 1B — Verified-Field Write-API ✅ COMPLETED 2026-05-01

**Goals:**

- [x] `setVerifiedField()` — appends evidence row + mirrors to legacy column
- [x] `bulkSetVerifiedFields()` — sequential append for auto-detection adapters
- [x] `revokeFieldEvidence()` — flips revokedAt without deleting the row
- [x] Tier-revocation via `revokeOlderEvidence` flag on setVerifiedField
- [x] Tests: 15/15 vitest pass (legacy-mirror, hash-chain link, revocation, idempotent no-op writes)

**Files extended:**

- `src/lib/operator-profile/profile.server.ts` — write API added (~280 LOC appended)
- `src/lib/operator-profile/profile.test.ts` — new test file

**V1-Impact:** Null. Writes go through new code path; old `operator-profile-service.ts` continues to work for callers that haven't migrated.

#### Sprint 1C — Re-Verification-Cron-Skeleton ✅ COMPLETED 2026-05-01

**Goals:**

- [x] Cron route `/api/cron/evidence-reverification` (auth + enumeration + tier-breakdown logging)
- [x] `findStaleEvidence()` + `countStaleEvidenceByTier()` helpers in evidence.server.ts
- [x] Schedule registered in `vercel.json` (04:15 UTC daily, between solar-flux and celestrak)
- [x] Hard caps: 1000 rows/page, 5 pages/run (5000 rows max, prevents runaway)
- [x] Tests: 8/8 vitest pass (auth gates including timing-safe-equality, happy path, cap behaviour, error path)

**Skeleton scope:** enumerates + logs structured per-batch telemetry. Sprint 2 plugs in T1 (self-confirm email), T2 (re-fetch public source), T3 (re-engage counsel) adapters that consume this enumeration.

**Files created:**

- `src/app/api/cron/evidence-reverification/route.ts`
- `src/app/api/cron/evidence-reverification/route.test.ts`

**Files extended:**

- `vercel.json` — added cron schedule entry
- `src/lib/operator-profile/evidence.server.ts` — added findStaleEvidence + countStaleEvidenceByTier

---

## Section 5: Changelog (was schon erledigt)

### 2026-05-01: Sprint 0 — Konzept-Phase abgeschlossen

- 13 Konzept-Docs in `docs/` committed
- Master-Plan (dieses Doc) erstellt
- V1-Preservation-Strategie definiert

### 2026-05-01: Sprint 2A — Auto-Detection Framework + VIES Adapter ✅

**Architektur-Entscheidung:** ADR-009 — Pivot von Handelsregister-DE auf VIES als ersten Adapter (EU-weite VAT-Validation, echte REST-API, frei zugänglich)

**Geliefert:**

- `src/lib/operator-profile/auto-detection/types.ts` — Adapter-Contract: AdapterInput, AdapterResult, AdapterOutcome, AutoDetectionAdapter, MergedField, CrossVerificationResult
- `src/lib/operator-profile/auto-detection/registry.ts` — statische Adapter-Liste (priority-ordered)
- `src/lib/operator-profile/auto-detection/vies-adapter.server.ts` — echter VIES REST-Fetcher (POST `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`)
- `src/lib/operator-profile/auto-detection/cross-verifier.server.ts` — Multi-Adapter-Merge mit Conflict-Detection, Tier-Mapping, T2_SOURCE_VERIFIED-Append via bulkSetVerifiedFields
- `src/lib/operator-profile/auto-detection/dispatcher.server.ts` — Bridge zwischen Sprint-1C-Cron und Cross-Verifier (per-org grouping, identity-hint extraction)
- Cron-Integration: `EVIDENCE_REVERIFICATION_AUTODISPATCH=1` Env-Flag aktiviert Auto-Detection-Dispatch im täglichen 04:15-Cron
- 42 neue Tests (22 VIES + 12 cross-verifier + 8 dispatcher)

**Gesamt-Test-Status nach Sprint 2A:** 92/92 vitest pass

**V1-Impact:** Null. Adapter-Framework ist purely additive. Auto-dispatch ist env-gated — produziert in Default-Config (flag unset) keinen Traffic an externe APIs.

**Honest scope notes:**

- VIES für DE/ES gibt nur `establishment` (Privacy: name/address sind redacted "---")
- Andere EU-Member-States (NL, FR, IT, ...) liefern auch `legalName` + `address`, aber `legalName` ist in Sprint 2A noch nicht im WritableVerifiedField-Set — kommt in Sprint 5
- Auto-Dispatch Default OFF — wird in Production aktiviert sobald Cron-Logs einen vollen Tag Stable-State zeigen

**Ready for Sprint 2B:** Handelsregister-DE (HTML-Parser oder Drittanbieter-Source-Decision via ADR-010)

### 2026-05-01: Sprint 1B — Verified-Field Write-API + Sprint 1C — Re-Verification-Cron-Skeleton ✅

**Sprint 1B:**

- `setVerifiedField()` + `bulkSetVerifiedFields()` + `revokeFieldEvidence()` added to `profile.server.ts`
- Each write produces a hash-chained evidence row AND mirrors into the legacy OperatorProfile column → V1 readers see new values without migration
- `revokeOlderEvidence` flag on setVerifiedField for tier-supersession (e.g. T4 BAFA decision supersedes T2 Handelsregister entry)
- 15/15 vitest pass

**Sprint 1C:**

- `/api/cron/evidence-reverification` Vercel cron route (auth-gated, page-capped, structured logging)
- `findStaleEvidence()` + `countStaleEvidenceByTier()` helpers in evidence.server.ts
- Scheduled at 04:15 UTC daily — quiet window between solar-flux and celestrak polling
- 8/8 vitest pass (including timing-safe-equality)
- Skeleton ready for Sprint 2 adapter dispatch

**Combined Sprint 1 totals:**

- 47/47 tests pass across evidence.test.ts (24) + profile.test.ts (15) + route.test.ts (8)
- Sprint 1 (1A + 1B + 1C) complete in 1 day vs estimated 3 weeks — on track
- V1-coexistence preserved throughout: zero modifications to existing models, services, or read paths

### 2026-05-01: Sprint 1A — DerivationTrace-Extension + Verification-Tier-Hash-Chain ✅

**Architektur-Entscheidung:** ADR-008 (extend existing DerivationTrace, do not create parallel ProfileEvidence table)

**Geliefert:**

- Schema-Migration `20260501192647_verified_profile_tier_extension`:
  - VerificationTier enum (T0_UNVERIFIED .. T5_CRYPTOGRAPHIC_PROOF)
  - 9 additive nullable columns auf DerivationTrace (verificationTier, sourceHash, prevHash, entryHash, verifiedAt, verifiedBy, attestationRef, revokedAt, revokedReason)
  - 3 neue Indices (verificationTier, entryHash, revokedAt)
- `src/lib/operator-profile/types.ts` — Tier-System + AttestationRef discriminated union + UI palette
- `src/lib/operator-profile/evidence.server.ts` — append-only hash-chain service mirroring audit-hash.server.ts pattern (Serializable transaction, fallback row, SecurityEvent on degradation)
- `src/lib/operator-profile/profile.server.ts` — read-side shell mit `loadVerifiedOperatorProfile()` + `loadVerifiedField()`
- `src/lib/operator-profile/evidence.test.ts` — 24 tests (canonicalization, source-hash, entry-hash, happy path, tier validation, fallback path, chain verification — including tampered-prev + tampered-value detection)

**V1-Impact:** Null. Existing DerivationTrace-Konsumer (`trust-tokens.ts`, `cybersecurity-provenance.ts`, `derivation-trace-service.ts`, `operator-profile-service.ts`) lesen weiter — alle neuen Felder sind nullable.

**Test-Status:**

- 24/24 vitest-Tests pass
- TypeScript clean auf Sprint-1A-Files
- Existing DerivationTrace-Konsumer typecheck weiter

(Updates kommen pro Sprint hier rein)

---

## Section 6: Architektur-Entscheidungen-Log (ADRs)

### ADR-001: Postgres-only Workflow-Engine (kein Inngest)

**Datum:** 2026-05-01
**Begründung:** Workflow-State == Compliance-State. Audit-Trail in einer DB. Keine externen Vendor-Costs. Vercel-Cron + Postgres-LISTEN/NOTIFY reichen für Compliance-Tempo.
**Konsequenz:** COWF-Implementation mit 6 Tabellen + Heartbeat-Cron.

### ADR-002: V1-Coexistence statt Migration

**Datum:** 2026-05-01
**Begründung:** Risk-Mitigation. V1 hat 2 Jahre Production-Erfahrung. V2 wird parallel gebaut. Switch-Toggle für User.
**Konsequenz:** Alle V2-Code unter `v2/`-Prefix. V1-Code unverändert. Niemals V1-Code löschen.

### ADR-003: Verified-Profile-Tier-System (T0-T5)

**Datum:** 2026-05-01
**Begründung:** Compliance-Daten brauchen Provenance. "Wir glauben halt" reicht nicht. Cross-Verification + Hash-Chain.
**Konsequenz:** ProfileEvidence-Tabelle mit Hash-Chain-Verkettung.

### ADR-004: Astra V2 als Comply-isolierte Engine

**Datum:** prior to 2026-05-01 (existing decision)
**Begründung:** Comply-spezifische AstraProposal-Trust-Layer. Isolation von V1+Pharos.
**Konsequenz:** `src/lib/comply-v2/astra-engine.server.ts` separate Engine.

### ADR-005: Hash-Chain auf jedem schreibenden Layer

**Datum:** 2026-05-01
**Begründung:** Tamper-Evidence ist USP. Plus EU-AI-Act-Art.-12-Pflicht.
**Konsequenz:** AuditLog + WorkflowEvent + ProfileEvidence + AstraProposal alle hash-chained.

### ADR-006: Server-Sent-Events (kein WebSocket)

**Datum:** 2026-05-01
**Begründung:** SSE ist native, einfacher, reicht für unsere Update-Frequenz (~7 Events/Sek Peak). Vercel-Edge-kompatibel.
**Konsequenz:** Live-Updates via SSE + Postgres LISTEN/NOTIFY.

### ADR-007: Free-Tier mit Limits, nicht Trial-Expiry

**Datum:** 2026-05-01
**Begründung:** Compliance-Workflows sind 6-12 Monate lang. Trial-Expire mid-workflow = garantierter Customer-Loss.
**Konsequenz:** Free-Tier mit harten Limits (1 Mission, 2 Workflows, 100 Astra-Calls/mo). Keine Trial-Expiry.

### ADR-009: Auto-Detection-Reihenfolge — VIES vor Handelsregister

**Datum:** 2026-05-01 (Sprint 2A)
**Kontext:** Sprint 2A schlug ursprünglich vor, mit Handelsregister-DE-Adapter zu starten. Bei Investigation der Datenquellen wurde klar:

- **Handelsregister.de** hat keine offene REST-API. Die offizielle Schnittstelle ist die kostenpflichtige SOAP-API (RegisterPortal). Public-Search liefert nur HTML — Parsing ist fragil, bricht bei Layout-Updates.
- **VIES (EU-VAT-Validation)** hat eine reale öffentliche REST/SOAP-API. Free. Tax-authority-validated. Funktioniert für ALLE EU-Mitgliedsstaaten, nicht nur DE.
- **OpenCorporates / OpenRegister** sind Drittanbieter — Vendor-Lock-Risiko.

**Entscheidung:** Sprint 2A liefert **VIES-Adapter + Adapter-Framework**. Sprint 2B wird Handelsregister-DE (via HTML-Parser oder Drittanbieter-Adapter, separate Architektur-Entscheidung).

**Begründung:**

1. **Real, no demos:** VIES ist eine echte öffentliche EU-API, kein HTML-Scraper. Null Demo-Risiko.
2. **EU-weit statt DE-only:** wir gewinnen Coverage für alle 27 Mitgliedsstaaten in einem Sprint.
3. **Pattern-Set:** das Adapter-Framework wird mit einer simplen, gut-definierten Datenquelle eingeführt — Handelsregister-Komplexität (HTML-Parsing, Pagination, CAPTCHA-Risiko) folgt erst, wenn das Framework steht.
4. **Felder geliefert:** VIES gibt `companyName` + `address` für nicht-DE Firmen; für DE-Firmen nur "valid" — aber das reicht bereits, um `establishment="DE"` zu T2-verifizieren, was der wichtigste einzelne Trust-Field ist.

**Konsequenz:**

- Sprint 2A: Adapter-Framework (`src/lib/operator-profile/auto-detection/types.ts` + `registry.ts` + `cross-verifier.ts`) + VIES-Adapter (`vies-adapter.server.ts`)
- Sprint 2B (re-prioritisiert): Handelsregister-DE-Adapter (Architektur-Entscheidung über Quellen-Wahl wird in Sprint 2B als ADR-010 dokumentiert)
- Sprint 2C: UNOOSA Online Index Adapter
- Sprint 2D: BAFA-Public-Register Adapter
- Sprint 2E (neu): Cross-Verification Tuning (war ursprünglich Teil von 2D — wird eigener Sub-Sprint nachdem alle 4 Adapter da sind)

### ADR-008: DerivationTrace-Extension statt parallele ProfileEvidence-Tabelle

**Datum:** 2026-05-01 (Sprint 1A)
**Kontext:** Sprint 1A schlug ursprünglich vor, eine neue `ProfileEvidence` Prisma-Tabelle zu schaffen. Bei der Investigation der existing schema fanden wir:

- `DerivationTrace` (line 5738+) existiert bereits als append-only provenance-ledger
- `derivation-trace-service.ts` existiert mit kompletter Read/Write API
- `DerivationTrace` hat bereits `origin` (deterministic | source-backed | assessment | user-asserted | ai-inferred), `confidence`, `modelVersion`, `sourceRef`, `expiresAt`, `upstreamTraceIds`
- Das ist exakt die provenance-foundation, die ProfileEvidence aufbauen wollte
- Konsumer existieren in 3+ Files (`trust-tokens.ts`, `cybersecurity-provenance.ts`, `derivation-trace-service.ts`)

**Entscheidung:** `DerivationTrace` wird mit Verification-Tier-Feldern + Hash-Chain erweitert, statt eine parallele Tabelle zu schaffen.

**Begründung:**

1. **V1-Coexistence-Pflicht** (siehe ADR-002): Additive Spalten = null Breaking-Changes für 3+ existing Consumers
2. **Trust-Scaffold ist da**: origin/confidence/sourceRef sind bereits da — nur Tier-Mapping + Hash-Chain fehlen
3. **Single-Source-of-Truth**: Eine Provenance-Tabelle statt zwei = einfachere Queries, einfacheres Mental Model
4. **Service-Reuse**: `derivation-trace-service.ts` Read-API kann unverändert bleiben

**Konsequenz:**

- Neue Spalten auf `DerivationTrace`: `verificationTier`, `sourceHash`, `prevHash`, `entryHash`, `verifiedAt`, `verifiedBy`, `attestationRef`, `revokedAt`, `revokedReason`
- Neuer Enum: `VerificationTier` (T0_UNVERIFIED bis T5_CRYPTOGRAPHIC_PROOF)
- Neuer Service: `src/lib/operator-profile/evidence.server.ts` mirrors `audit-hash.server.ts` Pattern (computeEntryHash + getLatestHash + Serializable Transaction)
- Existing `derivation-trace-service.ts` bleibt unverändert — Sprint 1B kann es optional erweitern um Tier-Awareness
- ADR-005 (Hash-Chain auf jedem schreibenden Layer) bleibt: jetzt zusätzlich auf DerivationTrace-Schreibvorgängen

**Trade-off bewusst akzeptiert:** `DerivationTrace` wird zur "fat table" mit verification + provenance. Aber Cohesion ist hoch — alles dreht sich um "wie kam dieser Wert zustande?". Splitting wäre premature optimization.

(weitere ADRs werden hier ergänzt)

---

## Section 7: Konzept-Doku-Reihe (Reference)

Diese 13 Konzept-Docs sind die Foundation. Bei Unklarheit: dort nachschauen.

| Doc                                          | Zweck                                                   | Status                                 |
| -------------------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| `CAELEX-COMPLY-CONCEPT.md`                   | Original-Konzept (Multi-Actor + AstraProposal + Verity) | Foundation                             |
| `CAELEX-ARCHITECTURE-DEEP-RESEARCH-2026.md`  | 24-Monats-Strategie aus 5 Streams                       | Reference                              |
| `CAELEX-OPERATOR-WORKFLOW-FOUNDATION.md`     | COWF-Spec                                               | **Sprint 3 Reference**                 |
| `CAELEX-V1-WORKFLOW-INVENTORY.md`            | V1-Bestandsaufnahme                                     | Reference                              |
| `CAELEX-COMPLY-2027-VISION.md`               | Power-User-Vision                                       | Überholt                               |
| `CAELEX-COMPLY-GUIDED-COMPLIANCE.md`         | Mission-First-UX                                        | **Sprint 5 Reference**                 |
| `CAELEX-MASTER-REPORT-2026.md`               | ESA-Master-Report (Komplett-Ökosystem)                  | Reference                              |
| `CAELEX-OPERATOR-PROFILE-TRUST-STRATEGY.md`  | Trust-Strategie (Confidence-basiert)                    | Überholt                               |
| `CAELEX-PRECISION-COMPLIANCE-ENGINE.md`      | Verified-Only-Architektur (T0-T5 Tiers)                 | **Sprint 1+2 Reference**               |
| `CAELEX-OPERATOR-WALKTHROUGH-DAY-1-TO-90.md` | Anna's 90-Tage-Story                                    | Test-Story für jede Sprint-Validierung |
| `CAELEX-UI-AND-FUNNEL-DESIGN.md`             | UI-Sidebar + 5-Stage-Funnel                             | **Sprint 4+5 Reference**               |
| `CAELEX-WORKFLOW-MASTER-SPEC.md`             | Definitive Workflow-Spec mit Wow-Effekt                 | **Sprint 3+5+7+9+10 Reference**        |
| `CAELEX-V1-VS-NEW-VISION-HONEST-DIFF.md`     | Ehrlicher V1-Vergleich                                  | Reality-Check                          |

---

## Section 8: Wichtige Hinweise für künftige Claude-Sessions

### Allgemeine Regeln

1. **Push direkt auf main** — User hat das explicit autorisiert (CLAUDE.md). Vercel auto-deployt.
2. **V1 niemals löschen** — siehe Section 2
3. **Hash-Chain-Integrität immer beibehalten** — neuer Event muss prevHash referenzieren
4. **Tests für jede neue Server-Funktion** — Vitest, in `*.test.ts` neben dem File
5. **Type-safe immer** — `npx tsc --noEmit` muss clean sein vor Commit
6. **Pre-Commit-Hook respect** — Husky läuft ESLint + Prettier
7. **Konventionelle Commits** — `feat(comply-v2): ...`, `docs: ...`, `fix: ...`

### Nach jedem Sprint

1. Update Section 4 ("Current Sprint") — markiere Sprint als COMPLETED + nächsten als STARTING
2. Update Section 5 ("Changelog") — was wurde gemacht
3. Wenn Architektur-Entscheidung: ADR in Section 6 ergänzen
4. Validiere gegen Anna's Walkthrough (`CAELEX-OPERATOR-WALKTHROUGH-DAY-1-TO-90.md`) — passt der Sprint zur User-Story?
5. Push auf main — Vercel auto-deploy

### Wenn Kontext-Fenster voll wird

1. **Lies dieses Dokument** (`CAELEX-BUILD-PLAN-LIVING-DOC.md`) zuerst.
2. **Lies das Konzept-Doc für aktuellen Sprint** (siehe Section 4).
3. **Prüfe `git log --oneline -20`** — was wurde zuletzt commited?
4. **Prüfe `git status`** — gibt es uncommitted changes?
5. Mache weiter wo es aufhört.

### Häufige Pitfalls

- **Nicht V1-Code modifizieren** — wenn unsicher: neue Datei mit `v2/`-Prefix erstellen
- **Nicht Engine-Code ändern** ohne V1-Auswirkungs-Check — die 24 Engines werden von V1+V2 genutzt
- **Schema-Migrations sind additiv** — keine BREAKING-Changes
- **Mission-Critical-Crons nicht stoppen** (vercel.json) — neue Crons hinzufügen, alte nicht entfernen

---

## Section 9: Pharos + Atlas Integration (Endstadium)

Bei Sprint 11 erreichen wir Cross-Plattform. Vorbereitung:

**Pharos-Bridge:**

- Comply submitted Authorization → Pharos empfängt via Webhook (existing infrastructure)
- Comply's Hash-Chain + Pharos's Hash-Chain müssen über gemeinsame Tree-Heads verlinkt sein
- Pharos-Decisions flow zurück zu Comply-Workflow-State

**Atlas-Bridge:**

- Counsel-Engagement: Operator (in Comply) invitet Counsel (in Atlas)
- Counsel sieht Counsel-View des Workflows in Atlas
- Counsel-Sign-Off als Multi-Actor-Approval-Slot in Comply-Workflow

**Verity-Cross-Reference:**

- Eine Tree-Head pro Org spans across Comply + Atlas + Pharos events
- Operator + Counsel + Authority sehen gleichen Tree-Head, nur jeweils ihre eigenen Events

**Implementation-Reihenfolge:**

1. Comply baut COWF mit gemeinsamem WorkflowEvent-Schema
2. Pharos + Atlas adaptieren um WorkflowEvents zu emitten
3. Verity-Tree-Head-Aggregator holt Events aus allen 3 Plattformen

Reference: alle Konzept-Docs unter "Multi-Plattform-Ökosystem".

---

## END OF LIVING DOC

This document is updated after every sprint. Last update: **2026-05-01**.

Next: Section 4 update after Sprint 1A completion.
