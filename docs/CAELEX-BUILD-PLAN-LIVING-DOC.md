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

### 🚨 WICHTIG — Deploy-Policy (geändert 2026-05-01)

**NICHT mehr nach jedem Sprint deployen.** User-Direktive: Vercel-Build-Minutes sind teuer; deshalb:

- **Pro Sprint:** lokal committen auf Feature-Branch, **kein push**
- **Kein Preview-Build:** `git push origin <feature-branch>` ENTFÄLLT komplett
- **Batch-Deploy nach 6-8 Sprints:** lokal `git merge` auf main + `git push origin main` → genau EIN Production-Build alle 6-8 Sprints
- **Sprint-Zähler "Pending Batch"** in Section 4 trackt wie weit der nächste Batch ist

Volle Policy: siehe `CLAUDE.md` § Deployment Policy → "IMPORTANT — Batched Deploys".

V1 bleibt erhalten als Fallback.

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

**Sprint 3 — COWF Foundation** ✅ COMPLETED 2026-05-01

- Sprint 3A: 6 Workflow-Tabellen + hash-chain service ✅ COMPLETED 2026-05-01
- Sprint 3B: defineWorkflow() DSL + W3 first concrete workflow ✅ COMPLETED 2026-05-01
- Sprint 3C: Heartbeat-Cron + scheduling service ✅ COMPLETED 2026-05-01
- Sprint 3D: Step executors + registry + auto-fire chain ✅ COMPLETED 2026-05-01

Workflows können jetzt registriert werden, von startWorkflow auto-firen, durch action+decision steps laufen, vom Heartbeat-Cron weiter getrieben werden, und tamper-evident-audited werden via WorkflowEvent hash-chain. Astra/QES/Form executors sind Stubs (Integration in spätere Sprints).

- **Ziel:** Workflow-Engine läuft, ein erster Workflow durchgespielt
- **Aufwand:** 3-4 Wochen
- **V1-Impact:** Null (parallel zu existing State-Machine)

### Phase 2: Public-Funnel + UI-Reorg (Sprints 4-5, ~6 Wochen)

**Sprint 4 — Public-Pulse-Tool** [IN PROGRESS]

- Sprint 4A: API endpoint (POST /api/public/pulse/detect) ✅ COMPLETED 2026-05-01
- Sprint 4B: /pulse public-page UI ✅ COMPLETED 2026-05-01
- Sprint 4C: Source-Verification-Stream-UI ✅ COMPLETED 2026-05-01
- Sprint 4D: 15-Page-PDF-Report ✅ COMPLETED 2026-05-01 (local — pending batch-deploy)
- Sprint 4E: Email-Capture-Flow + nurture sequence ✅ COMPLETED 2026-05-01 (local — pending batch-deploy)

**Sprint 4 (Phase 2 funnel-stage-1+2) ist damit komplett.**

- **Ziel:** Funnel-Stage-1+2 live, Lead-Generation aktiv
- **Aufwand:** 3 Wochen total (4A done in 1 day)
- **V1-Impact:** Null

**Sprint 5 — Mission-First-UI** [IN PROGRESS]

- Sprint 5A: /dashboard/missions list view + V2Sidebar entry ✅ COMPLETED 2026-05-01
- Sprint 5B: Mission-Detail-Page mit Phase-Roadmap [PENDING]
- Sprint 5C: Sidebar-Reorganisation (Mission/Workflows/Compliance/Reference) [PENDING]
- V1-Sidebar bleibt für `complyUiVersion="v1"`-User
- **Ziel:** UX-Sprung sichtbar
- **Aufwand:** 4 Wochen (≈1 Tag pro Sub-Sprint im Caelex-Tempo)
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

### Pending Deploy-Batch — Tracker

**Last main-push:** `b29dacfb` (Sprint 4C — 2026-05-01)
**Sprints in pending batch:** 3 of 6-8
**Next deploy:** when batch reaches 6-8 sprints OR user says "deploy now"

When you finish a sprint and commit it, increment this counter. When it
hits 6-8, run the deploy chain. Skip pushing the feature branch.

Sprints in current batch (chronological):

1. Sprint 4D — 15-page PDF Report (PulsePdfReport + /api/public/pulse/report/[leadId] + download button + 13 tests)
2. Sprint 4E — Email-Capture-Flow + 4-stage nurture sequence (day-0 delivery email + day-1/3/7 templates + sendPulseEmail dispatcher + PulseLead nurture-fields migration + /api/cron/pulse-nurture + 37 tests)
3. Sprint 5A — Mission-First-UI list view (getMissionsForUser aggregator + /dashboard/missions list page + V2Sidebar Missions entry + 12 tests)

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

#### Sprint 2B — CelesTrak SATCAT-Adapter ✅ COMPLETED 2026-05-01

Per ADR-010 (zero-cost pivot from Handelsregister). Lieferung:

- CelesTrak SATCAT REST-Fetcher (free, no auth, already polled by Caelex)
- 4 Felder: isConstellation, constellationSize, primaryOrbit, establishment-hint
- Helpers: classifyOrbit (LEO/MEO/GEO/HEO), celestrak3LetterToIso2 (40+ codes)
- Dispatcher-Erweiterung: Organization.name → AdapterInput.legalName, Organization.vatNumber Fallback
- 25 neue Adapter-Tests + 3 Dispatcher-Tests, 120/120 cumulative pass

#### Sprint 2C — GLEIF LEI-Adapter ✅ COMPLETED 2026-05-01

Per ADR-011 (GLEIF statt Bundesanzeiger). Lieferung:

- Real GLEIF-Fetcher gegen `api.gleif.org/api/v1/lei-records`
- `establishment`-Feld mit FULLY_CORROBORATED-Boost (0.95) vs ENTITY_SUPPLIED_ONLY (0.85)
- Multi-match disambiguation: gleich-Jurisdiction = promote, mixed = kein promote
- Status-Detection: INACTIVE/LAPSED records → no promote + warning
- Helpers: isActiveRecord, elfLabel mit 12+ EU legal forms (GmbH, AG, SARL, BV, Ltd, ...)
- Adapter-Priority: VIES → GLEIF → CelesTrak
- 22 neue Tests, 142/142 cumulative pass

#### Sprint 2D — UNOOSA Online Index Adapter ✅ COMPLETED 2026-05-01

Per ADR-012 (UNOOSA statt BAFA — kein public BAFA-Lookup-API). Lieferung:

- Real HTTP fetcher gegen UNOOSA-search-Page
- HTML-Parser für Results-Table (defensive, dependency-free)
- `establishment` extraction (conf 0.7-0.9 dependent auf agreement ratio)
- Function + Launch-Date-Range surface'd in warnings für Sprint 5
- 26 neue Tests, 168/168 cumulative pass

#### Sprint 2E — Cross-Verification Tuning [PENDING] (next)

Wenn alle 4 Adapter (VIES, GLEIF, UNOOSA, CelesTrak) live: Confidence-Weighting per Source-Authoritativeness, Conflict-Resolution-UI, entitySize-Heuristik aus legal form. Auto-Dispatch in Production aktivieren (`EVIDENCE_REVERIFICATION_AUTODISPATCH=1`).

#### (Later — out of Sprint-2-scope) — Bundesanzeiger / Handelsregister-DE

Bundesanzeiger entfällt (durch GLEIF abgedeckt — der LOU IST Bundesanzeiger Verlag).
Handelsregister-DE bleibt offen (nur via fragiles HTML scraping zero-cost machbar). Wenn nach Sprint 2D+2E die Coverage bei 30%+ liegt, wird Handelsregister gestrichen.

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

### 2026-05-01: Sprint 4E — Email-Capture-Flow + Nurture Sequence ✅ (LOCAL — not yet deployed)

**Sprint 4 ist damit komplett.** Phase 2 funnel-stage-1+2 funktioniert end-to-end: prospect submit → Pulse-Run → PDF-Download → email-delivery → 4-stage nurture sequence.

**Geliefert:**

- **Email-Templates** `src/lib/email/pulse/templates.ts` — 4 stages (day-0 delivery + day-1 highlights + day-3 pitfalls + day-7 final nudge). HTML + plaintext fallback per template. Personalisierung mit legalName + detected establishment + field-counts. T0/T2 unterschiedliches copy. XSS-safe via escapeHtml() für operator-input. Brand-konformes Layout mit Caelex navy + emerald.
- **Dispatcher** `src/lib/email/pulse/dispatcher.server.ts`:
  - `sendPulseEmail(leadId, stage)` — builds context aus lead+detectionResult, routes durch existing `sendEmail()` (Resend/SMTP fallback), schreibt `lastEmailStage` + `lastEmailSentAt` für idempotenz
  - `fireDay0Delivery(leadId)` — fire-and-forget wrapper für die Pulse-API-routes (catches throws)
  - Skip-paths: lead-not-found, unsubscribed, already-sent (stage-order check)
- **Schema-Migration** `20260501224330_pulse_lead_nurture_fields/` — additive: `unsubscribed`, `unsubscribedAt`, `lastEmailStage`, `lastEmailSentAt` + composite index `(lastEmailStage, createdAt)` für cron query performance
- **Day-0-Trigger** in `/api/public/pulse/detect` und `/api/public/pulse/stream` — `void fireDay0Delivery(lead.id)` nach lead-create / nach `complete` event. Email-fail blockiert API response nicht.
- **Daily Cron** `/api/cron/pulse-nurture`:
  - Schedule: 30 10 \* \* \* (10:30 UTC, zwischen onboarding-emails 10:00 und churn-detection 10:00)
  - Env-flag `PULSE_NURTURE_ENABLED=1` (default OFF, conservative rollout)
  - Auth via CRON_SECRET timing-safe equality
  - Queries day-1/day-3/day-7 candidates separately, ordered, MAX_EMAILS_PER_TICK=200
  - Filters: unsubscribed=false AND convertedAt=null AND age >= N days AND lastEmailStage in [previous stages]
  - Returns structured response: totalCandidates, byStage, sent, skipped, failed, truncated, durationMs
- **NotificationType + EntityType union extensions** — `pulse_nurture` + `pulse_lead` purely additive
- **37 neue Tests:** 16 templates (subject/html/text shape, T0/T2 copy variation, XSS escape, dispatcher routing) + 10 dispatcher (skip paths, happy path, stage-update, URL personalisation, throw-safety, fireDay0Delivery never-throws contract) + 11 cron (auth, env-flag-gate, candidate query per stage, send dispatch, skipped/failed counting, truncation, error path)

**Cumulative status:** 606/606 vitest pass across 42 test files. Zero net new TypeScript errors (864 baseline).

**Deploy-Batch:** 2/6-8. Letzter main-push: `b29dacfb` (Sprint 4C).

### 2026-05-01: Sprint 4D — 15-Page-PDF-Report ✅ (LOCAL — not yet deployed)

**Geliefert:**

- **`src/lib/pdf/reports/pulse/pulse-report.tsx`** — 15-Page React-PDF Document mit kompletter Caelex-Markenidentität (navy + emerald palette). Pages: Cover → Executive Summary → Methodology → 4× Source-Detail → Cross-Verification-Matrix → EU-Space-Act-Overview → NIS2-Overview → Jurisdictional-Authorities → COPUOS-Debris → Gaps + Next-Steps → Platform-Overview → Next-Steps + CTA. Fixed page-header + footer mit Lead-ID + page numbering.
- **`/api/public/pulse/report/[leadId]/route.tsx`** (GET) — streamed application/pdf response via `renderToBuffer`. Auth: leadId itself ist der access token (CUIDs sind opaque). Rate-limit re-uses `pulse` tier (3/hr per IP). Filename sanitisation aus legalName. Defensive null-snapshot handling für edge case "lead created but detection never ran".
- **Download-Button** auf `/pulse` result-panel — `<a target="_blank" rel="noopener" href="/api/public/pulse/report/{leadId}">` mit FileDown-Icon.
- **Tests** (13 neue + 1 page test): rate-limit 429, leadId-validation 404, missing-lead 404, lookup-error 500, render-error 500, happy-path content-type + content-disposition + filename sanitisation (incl. all-non-alphanumeric fallback), T0 + null-snapshot defensive paths, page download link assertion.

**V1-Impact:** Null. Reine Additionen.

**Honest scope:**

- PDF rendert from stored `PulseLead.detectionResult` snapshot — keine externe-API hits beim Download. Re-runs vom selben leadId zeigen dieselben Daten.
- Jurisdiction-page hardcoded-DE-detail wenn detection ergibt establishment=DE; sonst generic. Sprint 5+ kann das auf alle 27 NCAs ausdehnen.
- Methodology-page erklärt zero-cost-direktive + privacy-posture (PII bleibt server-side)

**Cumulative status:** 356/356 vitest pass across 23 test files. Zero net new TypeScript errors (864 baseline). V1 untouched.

**Deploy-Batch:** 1/6-8 (Sprint 4D nur lokal commited; warten auf weitere Sprints bevor batch-deploy). Letzter main-push: `b29dacfb` (Sprint 4C).

### 2026-05-01: Sprint 4C — Source-Verification-Stream-UI ✅

**Wow-Effekt aktiv.** Anonyme Operatoren sehen jetzt nicht mehr ein 4-Sekunden-Stillstand und dann das Ergebnis — sie sehen jeden Adapter LIVE: VIES "Querying…" → ✓ Confirmed; GLEIF "Querying…" → ✗ remote-error; UNOOSA "Querying…" → ✓ Confirmed; CelesTrak "Querying…" → ✓ Confirmed. Strukturelle Vorlage für Sprint 7's Live-Streaming-Backbone.

**Geliefert:**

- **SSE-Endpoint** `src/app/api/public/pulse/stream/route.ts` (POST):
  - Gleicher Auth + Rate-limit + Validation + Lead-Capture wie `/detect`
  - Returns `Content-Type: text/event-stream` mit ReadableStream-body
  - Event-Sequenz: `lead` → `source-checking` × N → `source-result` × N → `complete`
  - Promise.allSettled über alle adapters parallel — events feuern in completion-order, NICHT registry-order (organisches Reveal)
  - Adapter-throw → ok:false event mit errorKind:"remote-error" (defensive)
  - x-accel-buffering:no header verhindert Vercel/nginx-buffering
- **Updated `/pulse/page.tsx`** mit progressivem UI:
  - **`SourceCard` sub-component** mit 4 states: idle/checking/success/failed mit state-spezifischer Tone + Icon
  - **Layout-Animation** via framer-motion `layout` prop
  - **`consumeStream(body)`** liest `body.getReader()`, decodes UTF-8, splits auf `\n\n`, dispatches per event-type
  - **`parseSseEvent(raw)`** pure helper, handhabt comments + multi-line-data + missing-data
  - **Fallback-Path** zu `/detect` wenn `res.body` fehlt (alte Browser)
  - **aria-live="polite"** auf source-grid

**Tests** (9 stream-route + 5 page-test updates):

- Stream-route: auth-gates, validation 400s, lead-create 500, response headers, event sequence (lead first, complete last), adapter-throw → ok:false, T0_UNVERIFIED on empty merge, canDetect filtering
- Page tests: stream-mock helpers (`makeStreamResponse`, `happyStreamResponse`, `mixedStreamResponse`, `t0StreamResponse`), URL assertion auf `/stream`, failed-source test mit mixed-stream
- 38/38 pulse-related tests pass

**V1-Impact:** Null. `/api/public/pulse/detect` (Sprint 4A) bleibt funktional als Fallback.

**Honest scope:**

- Stream-events feuern wenn Promise.allSettled-Adapter resolven — kein artificial throttling
- Browser support: Chrome 105+ / Firefox 113+ / Safari 15.4+; ältere fallen auf `/detect` zurück
- Keine reconnection logic — Sprint 7 macht das robust
- Lead-row wird VOR adapter-runs erstellt, bleibt bei adapter-fails erhalten

**Cumulative status:** 343/343 vitest pass across 22 test files. Zero net new TypeScript errors (864 baseline). V1 untouched.

### 2026-05-01: Sprint 4B — /pulse Public UI Page ✅

**Funnel-Stage-1 ist live.** Anonyme Operatoren können jetzt unter `/pulse` ihren legalName + email + VAT-ID eingeben, einen Echtzeit-Cross-Verification-Run gegen 4 öffentliche Quellen auslösen, und das Ergebnis als strukturiertes UI sehen.

**Geliefert:**

- **`src/app/pulse/page.tsx`** — Client-Component (`"use client"`):
  - **Hero-Section** mit Caelex-branded heading, free-no-signup badge, claim "your compliance posture in 30 seconds"
  - **Form** mit 3 fields (legalName _, vatId optional, email _), client-side disabling des submit-buttons until required fields filled, autocomplete-attributes per field
  - **Source-Preview-Grid** unter dem Formular (4 cards: VIES, GLEIF, UNOOSA, CelesTrak SATCAT) mit icon + label + 1-line-description — setzt expectations
  - **Loading-State** mit `Checking 4 sources…` + spinner während fetch
  - **PulseResult Sub-Component** — rendered via AnimatePresence:
    - Source-outcomes-Grid (4 cards mit Status-Indicator: success ✓ / failed mit errorKind / not-applicable)
    - Merged-Fields-List (field name → value mit "X/Y sources confirmed" agreement-count)
    - Warnings-List (top 5 warnings)
    - Tier-Badge (T2 emerald "Source-verified" / T0 amber "manual setup needed")
    - Footer-CTAs (signup + reset)
    - Lead-ID footer für support
  - **Error-Handling**: 429 rate-limit message, 400 validation-issues message, network-error fallback
  - **Reset-Flow**: "Run another check" button clears result + error, returns to form
  - **A11y**: aria-label auf form + result region, role="alert" auf error, autocomplete attributes

**Design-System-Compliance** (per CLAUDE.md):

- Dark navy palette (bg-navy-950 / 900 / 800 / 700)
- Emerald-500 accent for primary CTAs + success badges
- Amber-500 for warnings + soft-fail badges
- Lucide React icons (Sparkles, ArrowRight, CheckCircle2, AlertTriangle, Shield, Globe2, Building2, Satellite, Database, Loader2, RefreshCw)
- Framer-Motion for entrance + result-swap transitions
- Semantic type tokens (text-display, text-display-lg, text-heading, text-body-lg, text-body, text-small, text-caption)
- Focus-visible styles on inputs + buttons
- Mobile-responsive grid (sm:grid-cols-2, md:grid-cols-4)

**Tests** (15 new RTL tests):

- Initial render: hero + form + 4 source cards
- Form validation: button disabled without legalName + email
- Submit calls `/api/public/pulse/detect` with right body
- Empty vatId omitted from body
- T2_SOURCE_VERIFIED renders emerald badge
- T0_UNVERIFIED renders amber badge
- Merged fields rendered with agreement-count
- Failed sources render errorKind
- Warnings list rendered
- Lead ID rendered in footer
- 429 → rate-limit message
- 400 with issues → validation message
- Network error → "Network error" fallback
- "Run another check" resets to form

**V1-Impact:** Null. Reine Additionen — neue Public-Route `/pulse`, kein V1-Code modifiziert.

**Honest scope:**

- **Sprint 4B = static result rendering** — nicht streaming. Sprint 4C (laut Master Plan + Section 4) wird Server-Sent-Events einführen für progressive source-by-source reveal animation. Sprint 4B's "Loading 4 sources…" wartet auf alle 4 Adapter parallel und rendert dann das fertige Ergebnis.
- **15-Page-PDF-Report** ist Sprint 4D
- **Email-nurture-Flow** ist Sprint 4E
- **No SEO meta yet** — `metadata` export könnte als follow-up PR ergänzt werden

**Cumulative status:** 334/334 vitest pass across 21 test files. Zero net new TypeScript errors (864 baseline). V1 untouched.

**Live-Demo:** sobald deployed wird, ist `https://app.caelex.com/pulse` (oder unter custom domain `caelex.eu/pulse`) public-zugreifbar. Operator kann `OneWeb Limited` + `anna@example.com` + `DE123456789` eingeben → sieht 4-source-cross-verification-result.

### 2026-05-01: Sprint 4A — Public Pulse-Tool API endpoint ✅

**Phase 2 — Public-Funnel + UI-Reorg ist gestartet.** Sprint 4A liefert das Backend für die `caelex.eu/pulse` Public-Page: anonyme Cross-Verification über 4 freie öffentliche Quellen, ohne Auth, ohne Caelex-Account.

**Geliefert:**

- **Schema** (purely additive — V1 untouched):
  - `PulseLead` Prisma-Model — captures every pulse-detection run als sales lead (legalName, vatId, email, IP, UA, UTM-tracking, detection-snapshot, status NEW/DEMO_BOOKED/SIGNED_UP/CONVERTED)
  - Migration `20260501214511_pulse_lead/migration.sql`
- **Rate limiting** — neuer `pulse` tier in `src/lib/ratelimit.ts`: 3/hr per IP (Redis), 1/hr in-memory fallback. Strikt weil jeder Call 4 externe Quellen trifft + DB-Row schreibt.
- **Validation** `src/lib/validations/pulse.ts` — Zod-Schema mit length bounds, normalisation, format checks, empty→undefined coercion
- **Dispatcher extension** `dispatcher.server.ts`:
  - `dispatchOne()` now accepts `options.persist`
  - **`dispatchAnonymous()`** new — no orgId required, hard-codes `persist: false`, builds AdapterInput directly
- **Public route** `/api/public/pulse/detect`:
  - POST + OPTIONS (CORS)
  - Rate-limit gate → Zod validation → create PulseLead → dispatchAnonymous → update lead with snapshot → return sanitized PulseDetectResponse
  - Strips rawArtifact from response (privacy + payload size)
  - Surfaces rate-limit headers for frontend countdown
- **Tests** (40 new): 12 validation + 14 route + 14 dispatcher (incl. dispatchAnonymous)

**V1-Impact:** Null. Reine Additionen — neue Prisma-Tabelle, neuer Rate-Limit-Tier, neue Route, neue Validierung. V1 unangetastet.

**Honest scope:**

- **Sprint 4A ist BACKEND only.** Sprint 4B baut die UI-Seite, Sprint 4C den 15-Page-PDF-Report, Sprint 4D den Email-Capture-Flow.
- **Idempotenz:** jeder POST erzeugt eine neue PulseLead-Row, auch von derselben Email. Intentional — Per-Attempt Funnel-Daten.
- **Privacy:** keine Cookies, keine Tracking-Pixel, keine Third-Party-Calls. Nur email + legalName + vatId + UTM.
- **bestPossibleTier:** T2_SOURCE_VERIFIED wenn ≥1 field merged, T0_UNVERIFIED sonst.

**Cumulative status:** 319/319 vitest pass across 20 test files. Zero net new TypeScript errors (864 baseline). V1 untouched.

**Funnel-Stage-1 ist live** sobald Sprint 4B (UI) deployed wird. Backend bereit:
`curl -X POST https://app.caelex.com/api/public/pulse/detect -d '{"legalName":"OneWeb Limited","email":"x@y.com","vatId":"DE123456789"}'` produziert eine Cross-Verification-Antwort.

### 2026-05-01: Sprint 3D — COWF Step Executors + Registry ✅

**Sprint 3 ist damit komplett.** Workflows können jetzt registriert werden, automatisch starten, durch ihre States laufen, und werden vom Heartbeat-Cron weiter getrieben.

**Geliefert:**

- **Registry** `src/lib/cowf/registry.server.ts` — globaler Singleton-Lookup für in-memory `WorkflowDef` Handlers. Persistiert die `storedInput`-Hälfte via `registerWorkflowDef()` (Sprint 3A) + cached die `handlers`-Map (Sprint 3B) im Modul-State. Indexed by `defId` und `name+version`. App-Boot ruft `registerCanonicalWorkflows()` (Sprint 3D registriert nur W3; W1/W2/W4-W9 folgen).
- **Executor-Dispatcher** `src/lib/cowf/executor.server.ts` — `executeStep({ workflowId, stepKey, causedBy })`:
  1. Loads instance + def + step (mit clean skip-paths für not-found / state-mismatch / max-depth)
  2. Builds `StepContext` (workflow + subject + state-bag)
  3. Emits STEP_STARTED event (hash-chained)
  4. Dispatches via switch(step.kind) zu kind-specific handler
  5. On success: emits STEP_COMPLETED + advances state via `advanceState()`
  6. **Auto-fire chain** — wenn der nächste State einen `autoFireOnEnter:true`-Step hat, recurse mit `_depth+1`. Hard cap MAX_AUTO_CHAIN_DEPTH=20 als defense-in-depth.
  7. On handler throw: emits ERROR event + KEIN state-advance
- **Action executor** — vollständig wired: ruft `handlers.run(ctx)`, transitions zu `step.to`
- **Decision executor** — vollständig wired: `evaluatePredicate(branch.predicate, ctx.state)` für jede branch in order, picks first match, routes zu `branch.step` mit `branch.to ?? step.to`. Predicate-language: `{ key: literal }` (equals shortcut), `{ key: { equals: x } }`, `{ key: { not: x } }`. ALL keys must match.
- **Stubs** für astra/form/approval/waitForEvent/qes — emit STEP_STARTED but don't transition. Stubs differ per kind:
  - `astra` — stub log only (Astra-V2 integration in next sprint)
  - `form` — stub log only (form-submit API integration deferred)
  - `approval` — **upserts WorkflowApprovalSlot per `requireRoles[]`** (Sprint 3D wires the slot-creation; UI-driven approval click + transition wires later)
  - `waitForEvent` — **creates WorkflowEventListener row** + emits WAIT_REGISTERED event (listener-firing-on-event-publish wires later)
  - `qes` — stub log only (D-Trust integration in Sprint 8)
- **Heartbeat-Integration** — extended `runHeartbeatTick`-internal to call `executeStep` AFTER emitting SCHEDULE_FIRED + marking schedule fired. Race-tolerant via executor's state-mismatch skip.
- **startWorkflow auto-fire** — extended `startWorkflow()` to call `maybeAutoFireInitialStep()` immediately after first STATE_TRANSITION event. Lazy-imports executor.server to avoid circular dep instances↔executor↔events. If def not in registry (test environment), gracefully skips.
- **Tests:** 26 neue Tests (6 registry + 19 executor + 1 heartbeat-integration). Cumulative 290/290.

**V1-Impact:** Null. Reine Additionen.

**Honest scope:**

- Astra/Form/QES: stubs only — emit STEP_STARTED but no transition. Workflows that hit these steps "wait" until external integration arrives.
- Approval/WaitForEvent: stubs PLUS DB-side effects (create slots/listener rows). UI/event-publisher wires the transition trigger separately.
- W3 today: SCANNING → SNAPSHOT_TAKEN → DRIFT_CHECK_DONE → drift-decision (no branch matches because run handlers are empty; `ctx.state.driftDelta` never set) → workflow stays at DRIFT_CHECK_DONE. To make W3 fully drive end-to-end, the action handlers (compute-snapshot, diff-against-prior) need to populate `ctx.state` — that wiring lands in a "Sprint 3E — W3 production-wiring" or similar.
- Astra-step transition: needs Astra-V2 callback path that emits STEP_COMPLETED on AstraProposal completion. Lands when comply-v2/astra-engine integration is wired.

**Cumulative status:** 290/290 vitest pass across 18 test files. Zero net new TypeScript errors (864 baseline). V1 untouched.

### 2026-05-01: Sprint 3C — COWF Heartbeat-Cron ✅

**Geliefert:**

- **Scheduling-Service** `src/lib/cowf/scheduling.server.ts`:
  - `createSchedule({ workflowId, stepKey, fireAt })` — neue PENDING-Row
  - `cancelSchedule(id, reason?)` — idempotent (no-op auf already-FIRED)
  - `cancelSchedulesForStep(workflowId, stepKey)` — bulk cancel für completed step
  - `listDueSchedules({ now, limit })` — fetch PENDING + fireAt≤now + attemptCount<MAX, ordered by fireAt ASC
  - `markScheduleFired(id)` — atomic PENDING→FIRED transition
  - `recordScheduleFailure(id, error)` — increments attemptCount, flips to FAILED beim Cap (5 attempts)
- **Heartbeat-Poller** `src/lib/cowf/heartbeat.server.ts`:
  - `runHeartbeatTick()` — pure async, no setTimeout. Kein transactional batching (jede schedule unabhängig).
  - Per-schedule: emits SCHEDULE_FIRED WorkflowEvent (hash-chained!) + flips zu FIRED
  - Try/catch isolation — eine fehlgeschlagene schedule blockiert nicht den restlichen tick
  - Race-tolerance: markFired no-op (status≠PENDING) wird trotzdem als "fired" gezählt (event ging raus)
  - Returns `HeartbeatTickResult` mit totalDue, fired, failed, retryQueued, durationMs, sample (capped at 10)
- **Cron-Route** `/api/cron/cowf-heartbeat`:
  - Auth via CRON_SECRET (timing-safe equality)
  - Env-flag-gated: `COWF_HEARTBEAT_ENABLED=1` aktiviert tatsächlichen tick. Default OFF in Production bis Sprint 3D's Executor live ist (sonst emittieren wir SCHEDULE_FIRED-Events, die niemand konsumiert).
  - 503 wenn CRON_SECRET nicht gesetzt, 401 ohne / falscher auth, 200 sonst
- **Vercel.json**: Cron-Schedule hinzugefügt — `*/5 * * * *` (alle 5 Minuten). Sprint 3D wird auf 1-Minute hochsetzen wenn Executor stable ist.
- 26 neue Tests (11 scheduling + 8 heartbeat + 7 cron-route)

**V1-Impact:** Null. Reine Additionen — kein V1-Code modifiziert.

**Honest scope:**

- Sprint 3C emits SCHEDULE_FIRED events; Sprint 3D's executor consumes them und ruft tatsächlich `step.action.run`, `step.astra.execute`, etc. auf
- Default-OFF env-flag = sicherer Rollout (cron läuft, no-ops bis 3D landed)
- 5-Minute cron statt 1-Minute (Vercel Pro+ braucht's für 1-min, plus compliance-workflows haben tag/woche-deadlines — 5 min reicht)
- Race-handling: cron-at-most-once von Vercel sollte race verhindern, aber updateMany WHERE status='PENDING' macht uns idempotent gegen edge-cases

**Cumulative status:** 264/264 vitest pass across 16 test files. Zero net new TypeScript errors (864 baseline unchanged).

### 2026-05-01: Sprint 3B — COWF DSL + erstes Workflow (W3) ✅

**Geliefert:**

- **Step-Factories** in `src/lib/cowf/steps.ts` — alle 7 step-types als TypeScript factory functions:
  - `step.action({ key, from, to, run })` — synchron Code-Run
  - `step.form({ key, from, to, schema, requireRoles, validate })` — wartet auf User-Form
  - `step.approval({ key, from, to, requireRoles, qesRequired, slaBy, escalations })` — multi-actor mit SLA
  - `step.astra({ key, from, to, promptTemplate, requiredCitations, maxLoops })` — AI-reasoning
  - `step.waitForEvent({ key, from, to, eventType, predicate, timeout, onTimeout })` — event-driven wait
  - `step.decision({ key, from, to, branches })` — conditional branching
  - `step.qes({ key, from, to, documentRefs, signingProfile })` — D-Trust QES sign
  - Jede Factory validiert Required-Felder (z.B. `step.approval` rejected leeres requireRoles)
- **`defineWorkflow()`-Factory** in `src/lib/cowf/define-workflow.ts` — produziert WorkflowDef mit:
  - `storedInput` — JSONB-serialisierbar, fed to `registerWorkflowDef()`
  - `handlers` — in-memory Map<stepKey, handlers> für Sprint-3D-Executor
  - `meta` — accessor für engine + UI
  - **Graph-Validation at definition-time:** name+version validity, initialState ∈ states, step.from/.to ∈ states, decision branch step refs, waitForEvent.onTimeout refs, mindestens ein step exits initialState. Aggregiert mehrere Issues in einem `WorkflowDefinitionError`.
- **Erstes konkretes Workflow** in `src/lib/cowf/workflows/continuous-heartbeat.ts` — **W3 Continuous Compliance Heartbeat**:
  - 8 states: SCANNING → SNAPSHOT_TAKEN → DRIFT_CHECK_DONE → (NO_CHANGE | DRIFT_DETECTED) → ASTRA_REASONED → PROPOSALS_GENERATED → CLOSED
  - 7 steps mixing action + decision + astra
  - Demonstriert die DSL für die einfachste der 9 kanonischen Workflows
- 35 neue Tests (17 step-factories + 18 defineWorkflow incl. W3 self-validation), 238/238 cumulative

**Validation in Action:** wenn Sprint 3D-Executor versehentlich einen falschen `to`-state schreibt, wirft die Validation in CI bevor der Workflow registriert wird. Gleich für `decision.branches[*].step` references — keine Stuck-Workflows aus Tippfehlern.

**Honest scope:**

- W3-Action-Bodies sind purposely empty in Sprint 3B (set `ctx.state.snapshotComputedAt` only) — Sprint 3D verdrahtet sie an `compliance-snapshot-service.ts` und Astra V2 engine
- Step.action's `run`-handler wird vom Engine-Executor invoked (Sprint 3D), Sprint 3B persistiert nur die Stored-Shape
- W1 (Authorization Submission) und W2 (Cyber-Incident-Response) folgen wenn Sprint 3D's Executor steht

**Cumulative status:** 238/238 vitest pass (35 evidence + 15 profile + 11 cron + 22 VIES + 25 CelesTrak + 22 GLEIF + 26 UNOOSA + 12 cross-verifier + 11 dispatcher + 18 cowf-events + 17 cowf-instances + 17 cowf-steps + 18 cowf-define-workflow). Zero net new TypeScript errors.

### 2026-05-01: Sprint 3A — COWF Schema Foundation ✅

**Architektur-Entscheidung:** ADR-013 — COWF-Modelle additiv neben V1 (`AuthorizationWorkflow` + `WorkflowCase` bleiben unangetastet)

**Geliefert:**

- **6 neue Prisma-Modelle** in `schema.prisma` (additiv, FRESH-CREATE only):
  1. `OperatorWorkflowDef` — versioned templates (name + version unique, replay-safe)
  2. `OperatorWorkflowInstance` — concrete runs, materialised currentState + actionableBy
  3. `WorkflowEvent` — append-only hash-chained event stream (per-workflowId chain)
  4. `WorkflowSchedule` — time-based wakeups (Vercel-cron polled)
  5. `WorkflowEventListener` — event-based wakeups
  6. `WorkflowApprovalSlot` — multi-actor approvals (one row per required role)
- **Migration** `prisma/migrations/20260501203902_cowf_foundation/migration.sql` — pure CREATE TABLE + INDEX
- **Type-Modul** `src/lib/cowf/types.ts` — StepType (7 kinds), WorkflowEventType (16 values), StoredStep discriminated union, AdapterInput/Output shapes
- **Hash-Chain Service** `src/lib/cowf/events.server.ts` — `appendWorkflowEvent`, `verifyChain`, `getLatestEvent`, `loadEvents`. Mirrors `evidence.server.ts` pattern (Serializable txn + fallback row + CRITICAL SecurityEvent on degradation)
- **CRUD Service** `src/lib/cowf/instances.server.ts` — `registerWorkflowDef`, `findWorkflowDef`, `startWorkflow`, `advanceState`, `completeWorkflow`, `pauseWorkflow`, `loadInstance`, `listActiveInstances`, `listInboxForUser`. Atomicity rule: event-append before column-update (chain wins on disagreement).
- 35 neue Tests (18 events + 17 instances), 203/203 cumulative pass

**V1-Impact:** Null. Purely additive — no V1 modifications, no migrations on existing tables, no shared code paths.

**Honest scope:**

- Sprint 3A ist **schema + service-foundation only**. Keine DSL (3B), kein Heartbeat-Cron (3C), keine Step-Executors (3D)
- `OperatorWorkflowDef.steps` ist serialised JSON — actual handler-code lives in TypeScript, registered separately in Sprint 3B
- `WorkflowEventListener.predicate` ist JSON — predicate-evaluator landet in Sprint 3D
- `WorkflowApprovalSlot` schema ready aber ohne UI in 3A — Sprint 5

**Hash-Chain-Properties:** per-workflow-instance chain (genesis = `GENESIS_<workflowId>`), strict-increment sequence (no gaps), SHA-256 over canonical JSON of all relevant fields including prevHash. Tamper-detection covers: prevHash mismatch, sequence gap, payload-tamper.

**Ready for Sprint 3B:** `defineWorkflow()` DSL — TypeScript factory that produces `StoredStep[]` and registers via `registerWorkflowDef()`.

### 2026-05-01: Sprint 2D — UNOOSA Online Index Adapter (Zero-Cost) ✅

**Architektur-Entscheidung:** ADR-012 — Pivot von BAFA auf UNOOSA. Begründung: BAFA hat keine public-API für Lizenz-Lookups (Lizenzdaten sind vertraulich). UNOOSA dagegen ist die UN-Authoritäts-Registry für Space-Objects — frei zugänglich, hochrelevant für Caelex's Zielgruppe.

**Geliefert:**

- `src/lib/operator-profile/auto-detection/unoosa-adapter.server.ts` — echter HTTP-Fetcher gegen `https://www.unoosa.org/oosa/osoindex/search-ng.jspx`
- HTML-Parser für Search-Results-Table (defensive — gibt empty array zurück bei Layout-Anomalien, kein throw)
- Field-Extraction:
  - `establishment` (T2, conf 0.7-0.9) — aus State-of-Registry-Spalte; confidence steigt mit Anteil unanimous matches
  - Function-Distribution (Communications/Earth-Obs/Military) → warnings (für Sprint 5 isDefenseOnly-Heuristik)
  - Launch-Date-Range → warnings ("Operator aktiv seit YYYY")
- Helpers:
  - `parseUnoosaHtml()` — exported für Tests
  - `mapStateOfRegistryToIso2()` — handles 3-letter UN codes (DEU/FRA/USA/ESA), full English names ("Germany"/"United Kingdom"), und alpha-2 unchanged
  - `stripHtml()` — entity-decoding + tag-stripping für Cell-Inhalte
- Adapter-Priorität: VIES → GLEIF → UNOOSA → CelesTrak (UN-Authoritäts-Daten vor satellite-OWNER-Hint)
- 26 neue Tests (heavy parser coverage)

**Cross-Verification jetzt 4-fach:** Wenn VIES + GLEIF + UNOOSA + CelesTrak alle dieselbe Jurisdiction melden → agreementCount=4, stärkstes mögliches Signal. Operator UI: "Tax-Authority + Corporate-Registry + UN-Registry + Satellite-Catalog — vier unabhängige Authoritäten bestätigen DE."

**Honest scope — UNOOSA fragility:**

- HTML-Parsing ist regex-based ohne externe Lib (keine Dependencies hinzugefügt)
- Bei UN-Layout-Änderung returnt der Parser empty array → kein system-wide failure, sondern adapter wird in cross-verifier ignoriert für diesen run
- UN-Filings können Wochen nach Launch erscheinen (filing-delay) — UNOOSA-Daten sind nicht real-time
- Service Unavailable Pages werden als zero-records behandelt (graceful)

**Gesamt-Test-Status nach Sprint 2D:** 168/168 vitest pass

**V1-Impact:** Null. Adapter-Framework bleibt purely additive.

**Sprint 2 ist damit weitgehend abgeschlossen** — 4 echte Zero-Cost-Adapter live (VIES, GLEIF, UNOOSA, CelesTrak). Sprint 2E folgt für Cross-Verification-Tuning + Auto-Dispatch-Aktivierung in Production.

### 2026-05-01: Sprint 2C — GLEIF LEI-Adapter (Zero-Cost) ✅

**Architektur-Entscheidung:** ADR-011 — Pivot von Bundesanzeiger auf GLEIF. Begründung: Bundesanzeiger.de hat CAPTCHAs + ist DE-only + scraping ist fragil. GLEIF ist die G20/ISO-mandatierte Authoritäts-Registry — saubere REST-API, free, EU-weit, JSON:API-konform. Der deutsche LOU für GLEIF ist tatsächlich Bundesanzeiger Verlag selbst, also bekommen wir dieselben Quelldaten in besser strukturierter Form.

**Geliefert:**

- `src/lib/operator-profile/auto-detection/gleif-adapter.server.ts` — echter GLEIF-Fetcher (`https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=<name>`)
- Field-Extraction:
  - `establishment` (T2, conf 0.85-0.95) — aus `entity.jurisdiction`. Confidence-Boost (0.95) wenn `validatedAs: FULLY_CORROBORATED`, sonst 0.85 für `ENTITY_SUPPLIED_ONLY`
  - Status-Warning wenn alle Records inactive/dissolved/lapsed sind
  - LEI surface'd in warnings (für UI in Sprint 5)
  - Legal-Form (ELF-Code → Label) surface'd in warnings (für Sprint 5 wenn legalForm ein WritableVerifiedField wird)
- Multi-Match-Logik:
  - Multiple records mit gleicher Jurisdiction → promote, mit "needs disambiguation"-warning
  - Multiple records mit unterschiedlichen Jurisdictions → KEIN promote, warning für manual review
- Helpers: `isActiveRecord()`, `elfLabel()`, ELF_LABELS dictionary (12+ EU forms)
- Adapter-Priorität: VIES → GLEIF → CelesTrak (LEI-Registry vor Satellite-Owner-Hint)
- 22 neue Tests

**Cross-Verification-Synergie:** Wenn VIES + GLEIF + CelesTrak alle dieselbe Jurisdiction melden → 3-way agreement, stärkstes Signal das Sprint 2 produzieren kann. Cross-Verifier setzt agreementCount=3 → operator UI sieht "3 unabhängige Authoritäten bestätigen DE".

**Gesamt-Test-Status nach Sprint 2C:** 142/142 vitest pass

**V1-Impact:** Null. Adapter-Framework bleibt purely additive.

**Honest scope:**

- GLEIF liefert KEINEN direkten `entitySize` — Sprint 2D/2E müssen das via BAFA-Mitarbeiterzahl + Heuristik aus legal form klären
- LEI-Code wird noch nicht persistiert — wird in Sprint 5 als writable field hinzugefügt
- Operator-Name muss exakt-substring matchen (Acme≠ACME GMBH); GLEIF ist case-sensitive aber wir uppercased automatisch

**Ready for Sprint 2D:** BAFA Public Register — `isDefenseOnly`, Export-Lizenz-Status

### 2026-05-01: Sprint 2B — CelesTrak SATCAT Adapter (Zero-Cost) ✅

**Architektur-Entscheidung:** ADR-010 — Pivot von Handelsregister-DE auf CelesTrak. Begründung: User-Direktive "wichtig ist keine externe Kosten" + Caelex pollt CelesTrak bereits via `/api/cron/celestrak-polling` → null neue Vendor-Beziehungen.

**Geliefert:**

- `src/lib/operator-profile/auto-detection/celestrak-adapter.server.ts` — echter CelesTrak-SATCAT-Fetcher (`https://celestrak.org/satcat/records.php?NAME=<query>&FORMAT=json`)
- Field-Extraction:
  - `isConstellation` (T2, conf 0.85) — true ab 2 active payloads
  - `constellationSize` (T2, conf 0.85) — count active payloads
  - `primaryOrbit` (T2, conf 0.6-0.85) — LEO/MEO/GEO/HEO from APOGEE/PERIGEE majority
  - `establishment` (T2, conf 0.5-0.7) — most-common OWNER country
- Filter-Logic: rocket bodies, debris, decayed objects, inactive payloads excluded
- Helper-Functions: `classifyOrbit()`, `celestrak3LetterToIso2()` (40+ country codes)
- Registry-Integration: VIES → CelesTrak priority order
- Dispatcher-Erweiterung: Organization.name → AdapterInput.legalName, Organization.vatNumber als Fallback wenn keine Evidence-Row für vatId
- 25 neue Tests + 3 dispatcher-Erweiterungs-Tests

**Gesamt-Test-Status nach Sprint 2B:** 120/120 vitest pass

**V1-Impact:** Null. Kein neuer Cron, keine neue API, keine neue DB-Tabelle. CelesTrak-Adapter ist purely additive Implementation an der bestehenden adapter-framework Schnittstelle.

**Honest scope:**

- Operator-Name-Matching ist fuzzy — "SpaceX" matched nicht "STARLINK-\*". Confidence ist deshalb moderat (0.5-0.85), nicht 0.98 wie VIES
- Cross-Verifier erkennt `establishment`-Übereinstimmung VIES↔CelesTrak — wenn beide Quellen dasselbe Land melden, ist das ein Signal-Boost (agreementCount=2 → höheres Vertrauen)
- `primaryOrbit` ist neu — VIES kann das nicht liefern, CelesTrak liefert es authoritativ aus Bahn-Daten

**Ready for Sprint 2C:** Bundesanzeiger HTML-Adapter (für `entitySize` aus Bilanz-Größenklassen) — zero-cost via Bundesanzeiger.de Public-Search

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

### ADR-013: Sprint 3A — COWF-Schema additiv neben V1-Workflow

**Datum:** 2026-05-01 (Sprint 3A)
**Kontext:** Caelex hat bereits zwei Workflow-Subsysteme:

- **`AuthorizationWorkflow`** + **`AuthorizationDocument`** (V1, line 234+ schema.prisma) — operator-side Authorization-state-machine
- **`WorkflowCase`** + **`WorkflowTransition`** (V1, line 9467+) — Pharos-side Authority-FSMs (z.B. BNetzA-Spektrum-Antrag)

COWF v2 (per `CAELEX-OPERATOR-WORKFLOW-FOUNDATION.md`) ist eine **dritte, parallele** Workflow-Engine mit anderen Anforderungen: AI-aware (AstraStep first-class), multi-actor, durable ohne externe Vendor.

**Entscheidung:** COWF läuft additiv neben V1. Keine Modifikationen, keine Migrationen, keine Replacements.

**Begründung:**

1. **V1 bleibt funktional** — Authorization-Workflows + Pharos-FSMs sind seit Jahren in Production
2. **Naming-Disjunktheit** — COWF nutzt `OperatorWorkflowDef`, `OperatorWorkflowInstance`, `WorkflowEvent`, `WorkflowSchedule`, `WorkflowEventListener`, `WorkflowApprovalSlot` — null Konflikte mit V1
3. **Code-Pfad-Disjunktheit** — V1 lebt unter `src/lib/workflow/`, COWF unter `src/lib/cowf/`
4. **Schema-Pfad** — alle 6 neuen Tabellen sind FRESH-CREATE (keine ALTER auf existing tables)

**Konsequenz:**

- 6 neue Prisma-Modelle in einer neuen "COWF" Schema-Section am Ende von `schema.prisma`
- Migration `20260501203902_cowf_foundation` ist purely additive (`CREATE TABLE` only, no ALTER)
- Sprint 3B-D bauen Engine on top of dieses Schemas
- V1-Workflow-Engine bleibt unangetastet — kann theoretisch parallel laufen

**Trade-off:** Drei Workflow-Subsysteme im Repo (V1-Operator + V1-Pharos + V2-COWF). Code-Cohesion suboptimal aber V1-Coexistence ist non-negotiable. Sprint 5+ entscheidet ggf. Migration-Path (COWF wird zur primary-Engine, V1 wird über complyUiVersion-Toggle deprecated).

### ADR-012: Sprint 2D = UNOOSA, NICHT BAFA (kein public BAFA-Lookup)

**Datum:** 2026-05-01 (Sprint 2D)
**Kontext:** Sprint 2D war im Master-Plan als BAFA-Public-Register-Adapter geplant. Bei näherer Betrachtung:

- BAFA hat **keine public-API** für Export-Lizenz-Lookups — Lizenzdaten sind vertraulich
- BAFA publiziert nur Sanktionslisten + Embargo-Listen + Statistik-Reports
- Die Liste **autorisierter Zoll-Spediteure** ist public aber nicht relevant für Compliance-Auto-Detection
- Es gibt kein BAFA-äquivalent zu VIES/GLEIF/CelesTrak für Operator-Profil-Felder

**Bessere Quelle: UNOOSA Online Index**

UNOOSA (UN Office for Outer Space Affairs) führt das offizielle UN-Registry für space objects unter dem Registration Convention von 1976. Vorteile:

- **Free, public, no auth, no API key**
- **UN-authoritative** — höchste Authoritation für satellite-registration-Daten
- **Operator-spezifisch** — direkt relevant für Caelex's Zielgruppe
- **Cross-verifies CelesTrak** — wenn beide melden DE-registrierter Satellit, agreementCount=2
- **Felder die wir kriegen:**
  - `establishment` (jurisdiction of registry) — primäre Authoritäts-Quelle
  - `plannedLaunchDate` (für past launches: tatsächliches Launch-Datum)
  - `satelliteMassKg` (sometimes — abhängig vom Filing der Member-State)
  - Function/Purpose (military / commercial / research)

**Limitation:** UNOOSA's Search-Page ist JSF-basiert mit ViewState-Tokens und PrimeFaces AJAX-Forms. HTML-Parsing ist nicht trivial. Wir bauen den Adapter mit:

1. Defensives Parsing — bei HTML-Layout-Änderungen `errorKind: parse-error` graceful
2. Fallback auf UNOOSA's annual JSON-Export für static lookups (falls verfügbar)
3. Strict-Timeout — UNOOSA-Server sind manchmal langsam (1-3 sec response)

**Konsequenz:**

- Sprint 2D: UNOOSA-Adapter via HTML-Parsing der Search-Page
- BAFA entfällt aus Sprint-2-Fenster
- Sprint 2E: Cross-Verification-Tuning + entitySize-Heuristik aus den 4 Quellen (VIES + GLEIF + CelesTrak + UNOOSA)

**Trade-off:** UNOOSA-Parsing ist fragiler als die anderen 3 Adapter. Mitigation: graceful-error-handling-pattern, plus die anderen 3 Adapter ergänzen sich auch ohne UNOOSA.

### ADR-011: Sprint 2C = GLEIF, NICHT Bundesanzeiger

**Datum:** 2026-05-01 (Sprint 2C)
**Kontext:** Sprint 2C war im Master-Plan als Bundesanzeiger-Adapter geplant. Bei näherer Betrachtung ist Bundesanzeiger.de eine schlechte Wahl:

- **CAPTCHA auf Detail-Seiten** — Bundesanzeiger blockt aktiv automation
- **DE-only** — wir wollen EU-weit
- **HTML-Search ohne API** — fragiles Parsing
- **Implicit ToS-Risiken** für scraping public services
- **Würde "korrekt und echt"-Direktive verletzen** wenn der Parser bei Layout-Änderungen kaputt geht

**Bessere Quelle: GLEIF (Global Legal Entity Identifier Foundation)**

GLEIF ist die G20/ISO-mandatierte Authoritätsregistry für Legal Entity Identifiers (LEI). Vorteile:

- **Free, no auth, no API key** — pure öffentliche REST-API
- **JSON:API-konform** — sauberes Parsing
- **EU-weit + global** — funktioniert für alle Mitgliedsstaaten plus UK/US/etc.
- **Authoritative** — Daten stammen direkt von den Local Operating Units (LOUs) in jedem Land (für DE: Bundesanzeiger Verlag selbst!)
- **Felder die wir kriegen:**
  - `legalName` (canonical, with language tag)
  - `jurisdiction` (ISO-Code) — confirmt VIES + CelesTrak
  - `legalForm` (ELF-Code: GmbH/AG/Ltd/SARL/etc.)
  - Entity status (ACTIVE/INACTIVE/DISSOLVED) — Warning-Signal
  - Registration authority (für DE = Handelsregister!)
- **Stable Endpoint:** `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=<name>`

**Entscheidung:** Sprint 2C liefert GLEIF-Adapter. Bundesanzeiger entfällt — was Bundesanzeiger an Daten hätte liefern können, kommt indirekt via GLEIF (weil der Bundesanzeiger Verlag die deutsche LOU für GLEIF ist, also dieselben Quelldaten in besser strukturiertem Format).

**Trade-off:** GLEIF liefert KEINEN direkten `entitySize`-Wert. Wir bekommen aber `legalForm` (GmbH/AG/etc.), woraus sich grobe Größenklassen-Heuristiken ableiten lassen — das wird erst in Sprint 2E (Cross-Verification Tuning) finalisiert wenn wir alle Quellen kennen.

**Konsequenz:**

- Sprint 2C: GLEIF-Adapter
- Sprint 2D: BAFA Public Register (entitySize via Mitarbeiter/Umsatz aus Public-Register)
- Sprint 2E: Cross-Verification + entitySize-Heuristik aus den 4 Quellen
- Bundesanzeiger entfällt komplett aus dem Sprint-2-Fenster

**Erweiterung WritableVerifiedField:** legalForm wird in Sprint 5 (UI-Reorg) hinzugefügt; Sprint 2C nutzt das Feld noch nicht direkt sondern surfaced es in `warnings` ähnlich wie VIES das mit legalName macht.

### ADR-010: Sprint 2B = CelesTrak-Adapter, NICHT Handelsregister-DE

**Datum:** 2026-05-01 (Sprint 2B)
**Kontext:** Nach ADR-009 war Sprint 2B als Handelsregister-DE-Adapter geplant. User-Direktive "wichtig ist keine externe Kosten" zwingt Re-Evaluation:

**Handelsregister-DE Optionen — alle problematisch:**

- **RegisterPortal SOAP-API** (offiziell): kostenpflichtig — RAUS
- **handelsregister.de Public-Search**: kostenlos, ABER nur HTML-Form (keine API), JSF-basiert, fragiles Parsing, robots.txt-Restrictions
- **OpenCorporates** (Drittanbieter): kostenlos bis 500 Req/Monat, ABER API-Key-Pflicht und Drittanbieter-Lock-In — gegen "keine externe Kosten" Geist
- **OpenRegister.de** (Drittanbieter-Scraper): Free-Tier-Limit, Drittanbieter-Risiko
- **Bundesanzeiger.de**: kostenlos, ABER nur Publikationen/Bilanzen, nicht Live-Registry-Search

**Pivot-Entscheidung:** Sprint 2B liefert stattdessen **CelesTrak SATCAT-Adapter**.

**Begründung:**

1. **Echt zero-cost:** CelesTrak ist free, public, no auth, no third-party-broker. Wird bereits von Caelex genutzt (`/api/cron/celestrak-polling`, `src/lib/ephemeris/data/celestrak-adapter.ts`).
2. **Operator-Spezifisch:** CelesTrak-Daten sind Satellite-Operator-Daten. Caelex's Zielgruppe = Satellite-Operators. Direkt relevant.
3. **Felder, die VIES nicht hat:** `isConstellation`, `constellationSize`, `primaryOrbit` aus Apogee/Perigee, country-of-registry-Hinweis aus OWNER. VIES liefert nur `establishment` — CelesTrak ergänzt orbital + constellation-Felder.
4. **Authoritative Quelle:** SATCAT ist von US-Air-Force/CSpOC abgeleitet, public. Höchste Daten-Authoritation für Satellite-Daten.
5. **Stabiles Endpoint:** `https://celestrak.org/satcat/records.php?NAME=<name>&FORMAT=json` ist seit Jahren stabil. Wartungsarm.

**Konsequenz:**

- Sprint 2B: CelesTrak-SATCAT-Adapter — fuzzy operator-name match → constellation detection
- Sprint 2C wird statt UNOOSA → **Bundesanzeiger HTML-Adapter** (für `entitySize` aus Bilanz-Größenklassen) ODER **EuroCAS / EU sanctions list scan**
- Handelsregister-DE wird als "later"-Sprint markiert oder entfällt — re-evaluiert nach Sprint 2C+2D Erfahrung
- ADR-009's Reihenfolge wird teilweise revidiert: VIES → CelesTrak → (Bundesanzeiger ODER EuroCAS) → BAFA-Public-Register

**Trade-off:** Operator-Name-Matching ist fuzzy (operators benennen Satelliten oft nicht mit ihrem Firmennamen). Confidence des Adapters ist niedriger als VIES (~0.6-0.8 statt 0.98). Aber als zusätzliche Quelle in der Cross-Verification trotzdem wertvoll.

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
