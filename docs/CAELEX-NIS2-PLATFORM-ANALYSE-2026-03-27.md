# CAELEX Platform — Technische Analyse & NIS2-Compliance-Status

**Erstellt:** 2026-03-27
**Zweck:** Grundlage fuer externe NIS2-Compliance-Gap-Analysis
**Methode:** Statische Codebase-Analyse (kein Runtime-Test, keine Deployment-Inspektion)
**Codebase-Pfad:** `/Users/julianpolleschner/caelex-assessment`

---

## Teil 1: Architektur-Ueberblick

### 1.1 Tech Stack

| Komponente        | Technologie                    | Version           |
| ----------------- | ------------------------------ | ----------------- |
| Framework         | Next.js (App Router)           | 15.5.12           |
| Sprache           | TypeScript (strict mode)       | 5.3.0             |
| Runtime           | Node.js                        | 20 (via .nvmrc)   |
| UI                | React                          | 18.2.0            |
| Styling           | Tailwind CSS                   | 3.4.0             |
| Datenbank         | PostgreSQL (Neon Serverless)   | —                 |
| ORM               | Prisma                         | 5.22.0            |
| Auth              | NextAuth                       | v5.0.0-beta.30    |
| AI                | Anthropic Claude SDK           | 0.74.0            |
| Payments          | Stripe                         | 20.3.0            |
| Email (primaer)   | Resend                         | 6.9.1             |
| Email (fallback)  | Nodemailer                     | 7.0.13            |
| Storage           | Cloudflare R2 (via AWS S3 SDK) | 3.982.0           |
| Rate Limiting     | Upstash Redis                  | 1.36.2            |
| Monitoring        | Sentry                         | 10.38.0           |
| 3D Visualisierung | Three.js + React Three Fiber   | 0.160.0 / 8.17.10 |
| Orbital Mechanics | satellite.js (SGP4)            | 6.0.2             |
| PDF Generation    | @react-pdf/renderer + jsPDF    | 4.3.2 / 4.1.0     |
| Validation        | Zod                            | 4.3.6             |
| Testing           | Vitest + Playwright            | 4.0.18 / 1.58.1   |

### 1.2 Gesamtumfang

| Metrik                                  | Wert        |
| --------------------------------------- | ----------- |
| TypeScript/TSX-Dateien (src/)           | 1.842       |
| Geschaetzte Lines of Code (src/)        | ~580.000    |
| React Components (.tsx)                 | 332         |
| API Route Handlers (route.ts)           | 519         |
| Server-only Engine Files (\*.server.ts) | 68          |
| Daten-Dateien (src/data/)               | 68          |
| Library Files (src/lib/)                | 342         |
| Test-Dateien                            | 410         |
| CSS (globals.css)                       | ~44.000 LoC |
| Prisma Schema                           | 7.420 LoC   |
| Datenbank-Modelle                       | 194         |
| Datenbank-Enums                         | 106         |
| Datenbank-Indizes                       | 481         |
| API-Domains                             | 56          |
| Cron Jobs                               | 22          |
| Seiten/Views                            | 153+        |

### 1.3 Deployment

**Status:** ✅ Vollstaendig

| Aspekt                | Detail                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------ |
| **Plattform**         | Vercel (Auto-Deploy on git push)                                                           |
| **Projekt-ID**        | prj_2oxB9yKX57J5ui3LDQMTSLecXzsN                                                           |
| **Build Command**     | `prisma generate && prisma db push && next build`                                          |
| **Node Version**      | 20 (pinned via .nvmrc)                                                                     |
| **Datenbank**         | Neon PostgreSQL (serverless, connection pooling)                                           |
| **File Storage**      | Cloudflare R2 (S3-kompatibel)                                                              |
| **Rate Limiting**     | Upstash Redis (19 Tiers)                                                                   |
| **CI/CD**             | GitHub Actions (Lint, Typecheck, Unit Tests, E2E, Security Audit, Bundle Size, Lighthouse) |
| **Security Scanning** | CodeQL (SAST), TruffleHog (Secrets), OWASP Dependency Check                                |
| **Pre-Commit**        | Husky + lint-staged (ESLint, Prettier, TypeScript)                                         |

**22 Vercel Cron Jobs konfiguriert** — von Compliance-Snapshots (01:00 UTC) bis Demo-Follow-ups (12:00 UTC), inkl. CelesTrak-Polling (05:00), Ephemeris-Forecast (06:00), CDM-Polling (alle 30 Min), Sentinel Cross-Verify (alle 4h).

### 1.4 Monorepo vs. Multi-Repo

**Status:** Single-Repo (kein Monorepo)

- Einzelne Next.js-App am Root
- `packages/`-Verzeichnis existiert, ist aber leer
- `sentinel/` ist ein separater Docker-basierter Service (Compliance Intelligence / Satellite Monitoring), wird unabhaengig betrieben und ueber API synchronisiert
- Kein turbo.json, kein pnpm-workspace.yaml

---

## Teil 2: Compliance-Module

### 2.1 Regulatory Ontology / Knowledge Graph

**Status:** ✅ Vollstaendig

| Metrik         | Wert                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Dateien        | 7 Core-Dateien                                                                                     |
| LoC            | ~2.093                                                                                             |
| Knoten         | ~400                                                                                               |
| Kanten         | ~3.000                                                                                             |
| Knotentypen    | 8 (REGULATION, OBLIGATION, JURISDICTION, OPERATOR_TYPE, EVIDENCE_REQ, STANDARD, AUTHORITY, DOMAIN) |
| Kantentypen    | 11 (IMPLEMENTS, APPLIES_TO, REQUIRES_EVIDENCE, CONFLICTS_WITH, SUPERSEDES, etc.)                   |
| Jurisdiktionen | 10 (EU, UK, FR, DE, IT, BE, LU, NL, DK, AT, NO)                                                    |
| Datenstruktur  | PostgreSQL relational (Prisma: OntologyNode, OntologyEdge)                                         |

**Funktionen:**

- Semantischer Graph: EU Space Act (67 Artikel), NIS2 Directive, nationale Raumfahrtgesetze
- Graph-Traversierung mit Query-Funktionen (`traverse.ts`)
- Konflikt-Erkennung zwischen Jurisdiktionen (`conflicts.ts`)
- Impact-Propagation bei regulatorischen Aenderungen (`impact.ts`)
- ETL-Pipeline zum Seeden des Graphen (`seed.ts`)

**UI:** Dashboard unter `/dashboard/ontology/` — Graph Explorer + Node Detail View

**API-Endpoints (8):** `/api/ontology/full`, `/api/ontology/graph`, `/api/ontology/obligations`, `/api/ontology/conflicts`, `/api/ontology/impact`, `/api/ontology/node/[id]`, `/api/ontology/stats`, `POST /api/ontology/seed`

**Luecken:** Keine wesentlichen fuer den aktuellen Scope.

---

### 2.2 Compliance Engines

**Status:** ✅ Vollstaendig

**11 Assessment Engines implementiert:**

| Engine                | Datei                             | LoC (ca.) | Abdeckung                                                             |
| --------------------- | --------------------------------- | --------- | --------------------------------------------------------------------- |
| EU Space Act          | `engine.server.ts`                | 2.500     | 7 Betreibertypen, 119 Artikel, 9 Module, Standard/Light Regime        |
| NIS2 Directive        | `nis2-engine.server.ts`           | 1.800     | Essential/Important Klassifizierung, 51 Requirements, Incident-Phasen |
| National Space Law    | `space-law-engine.server.ts`      | 1.200     | 10 Jurisdiktionen, Favorability Scoring                               |
| UK Space Industry Act | `uk-space-engine.server.ts`       | 800       | UK-spezifische Anforderungen                                          |
| US Regulatory         | `us-regulatory-engine.server.ts`  | 900       | FCC/FAA/ITAR                                                          |
| COPUOS/IADC           | `copuos-engine.server.ts`         | 700       | Debris Mitigation Guidelines                                          |
| Export Control        | `export-control-engine.server.ts` | 600       | ITAR/EAR Requirement Mapping                                          |
| Spectrum/ITU          | `spectrum-engine.server.ts`       | 500       | Frequency Licensing                                                   |
| NIS2 Auto             | `nis2-auto-assessment.server.ts`  | 400       | Auto-Klassifizierung aus Betreiberprofil                              |
| Unified               | `unified-engine-merger.server.ts` | 1.000     | Multi-Regulation Aggregation + IST/SOLL Gap Analysis                  |
| Assure RRS            | `rrs-engine.server.ts`            | 1.200     | Regulatory Readiness Score (Investor Due Diligence)                   |
| Assure RCR            | `rcr-engine.server.ts`            | 800       | Regulatory Credit Rating                                              |

**Gap Analysis (IST vs. SOLL):** Ja — der Unified Engine berechnet Luecken zwischen aktuellem Status und regulatorischem Ziel. Jede Bewertung liefert `RequirementStatus[]` mit `COMPLIANT | PARTIAL | NON_COMPLIANT | UNKNOWN`. Evidence-Gaps werden ueber `/api/evidence`-Routen identifiziert.

**9 zusaetzliche Security/Support Engines:** MFA, WebAuthn, Login Security, Audit Hash, Anomaly Detection, HMAC Signing, Honey Tokens, CORS, Cache.

---

### 2.3 Ephemeris / Orbital Mechanics

**Status:** ✅ Vollstaendig (groesstes Subsystem)

| Metrik       | Wert                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------- |
| Dateien      | 45+                                                                                       |
| LoC          | ~20.103                                                                                   |
| Datenquellen | CelesTrak (TLE), NOAA (Solar Flux), LEOLabs, Space-Track, Sentinel (proprietary), EUR-Lex |

**Berechnungen:**

- **SGP4 Orbit Propagation** via satellite.js
- **Orbital Decay Forecasting** — Tage bis Deorbit unter Beruecksichtigung atmosphaerischer Dichte
- **Fuel Depletion Prediction** — Burn Rates, Propellant Margins
- **Subsystem Degradation** — Thruster Aging, Battery Capacity, Radiation Effects
- **Perigee Altitude Compliance** — 25-Jahres-Regel, 5 Jahre Post-Mission
- **Conjunction Risk** — CA Probability + Miss Distance Trending

**Cascade Engine:** Ja (`src/lib/ephemeris/cascade/dependency-graph.ts`, `conflict-detector.ts`) — Mission-weite Impact-Propagation

**Anomaly Detection:** Ja (`src/lib/ephemeris/anomaly/anomaly-detector.ts`) — Behavioral Anomaly Detection

**Fleet Intelligence:** Ja (`src/lib/ephemeris/fleet/fleet-intelligence.ts`) — Multi-Satellite Analysis

**What-If Engine:** Ja (`src/lib/ephemeris/simulation/what-if-engine.ts`) — 9 Handler (Orbital, ISOS, Launch, Hardware, Environment, Dependency, TCO, PDP, CAP)

**Live Compliance State Machines:** 8 Operator-Typ-spezifische State Engines (LSO, ISOs, PDP, TCO, CAP, etc.)

**Datenmodelle:** `EphemerisForecast`, `OrbitalData`, `SolarFluxRecord`, `SatelliteAlert`, `SatelliteComplianceState`, `ComplianceSnapshot`, `WhatIfScenario`

**API-Endpoints:** 30+ unter `/api/v1/ephemeris/` + 3 Cron Jobs (celestrak-polling, solar-flux-polling, ephemeris-daily)

**UI:** Dashboard unter `/dashboard/ephemeris/` + 3D Globe in `/components/mission-control/`

---

### 2.4 Caelex Shield / Conjunction Assessment

**Status:** ✅ Vollstaendig

| Metrik  | Wert   |
| ------- | ------ |
| Dateien | 17     |
| LoC     | ~4.311 |

**CDM-Ingestion:** Ja — von Space-Track API + LEOLabs. Parsing Raw CDM → Canonical Format (`ParsedCDM`). CDM History Tracking, Version Trending, Deduplication.

**Collision Probability Berechnung:** Ja

- Pc (Collision Probability) Monitoring ueber Zeit
- Trend-Analyse: INCREASING | DECREASING | STABLE | VOLATILE
- 95th Percentile PC Trajectory
- Peak PC Estimation at TCA (Time of Closest Approach)

**Risk Classification:**
| Stufe | Schwelle |
|-------|----------|
| EMERGENCY | Pc >= 1e-3, Miss <= 100m |
| HIGH | Pc >= 1e-4, Miss <= 500m |
| ELEVATED | Pc >= 1e-5, Miss <= 1km |
| MONITOR | Pc >= 1e-7, Miss <= 5km |

NCA-anpassbare Schwellenwerte pro Jurisdiktion (`nca-thresholds.server.ts`).

**Alert-System:** Ja

- Urgency: CRITICAL (TCA < 24h), URGENT (TCA < 48h), ELEVATED (TCA < 72h), ROUTINE
- Automatische Eskalation, Email-Alerts an Betreiber + NCA
- Dashboard-Benachrichtigungen in Echtzeit

**Datenmodelle:** `ConjunctionAssessmentEvent`, `ConjunctionAssessmentCDM`, `ConjunctionAssessmentDecision`, `ConjunctionAssessmentAlert`, `ConjunctionAssessmentManeuver`

**API-Endpoints:** 18+ unter `/api/shield/` inkl. NCA-Benachrichtigung, Manoeuver-Entscheidung, Compliance-Verifikation

---

### 2.5 NEXUS / Space Asset Register

**Status:** ✅ Vollstaendig

| Metrik  | Wert   |
| ------- | ------ |
| Dateien | 9      |
| LoC     | ~2.635 |

**Asset-Typen:** SATELLITE, GROUND_STATION, LAUNCH_FACILITY, MISSION_CONTROL, DATA_CENTER, PAYLOAD, COMPONENT

**Asset-Erstellung:**

- Manuell: UI-Formular unter `/dashboard/nexus/`
- Import: Bulk CSV/JSON mit TLE Auto-Linking
- API: RESTful CRUD ueber `/api/nexus/assets/`

**Zusaetzliche Features:**

- Dependency Graph (Asset-zu-Asset: contains, manages, transmits_to, depends_on)
- Supplier Mapping (externe Vendors, Contractors)
- Personnel Assignment (Operators, Engineers, Compliance Officers)
- Vulnerability Tracking (CVE-Links, CVSS Scores, Remediation Status)
- NIS2 Relevanz-Flag (Boolean pro Asset)
- Criticality-Bewertung (LOW, MEDIUM, HIGH, CRITICAL)

**Datenmodelle:** `Asset`, `AssetDependency`, `AssetRequirement`, `AssetVulnerability`, `AssetSupplier`, `AssetPersonnel`

**API-Endpoints:** 30+ unter `/api/nexus/`

---

### 2.6 ASTRA AI Copilot

**Status:** ✅ Vollstaendig

| Metrik  | Wert   |
| ------- | ------ |
| Dateien | 30+    |
| LoC     | ~9.883 |

**LLM:** Anthropic Claude (`claude-sonnet-4-6`), Tool-Use Loop mit max. 10 Iterationen, 120s Timeout pro API-Call

**Funktionen:**

- Chat-Interface mit regulatorischer Experten-Persona
- 20+ Tools (Compliance Score, Assessment Status, Requirements, Evidence, Article Search, Gap Analysis, Document Drafts, Evidence Verification, Workflow Status, Scenario Simulation, Jurisdiction Rules, Cross-Reference)
- Konversations-Persistenz in DB (`AstraConversation`, `AstraMessage`)
- Auto-Summarization bei Ueberschreitung des Token-Budgets
- Topic Detection fuer gezielten Kontext

**Kontext-Mechanismus:**

- RAG: `context-builder.ts` fetcht Compliance-Daten aus DB
- System Prompt: Regulatorische Experten-Persona (`system-prompt.ts`)
- Tool Use: 20+ Compliance-spezifische Tool-Definitionen
- Static Knowledge: Regulatorisches Wissen in `/regulatory-knowledge/`

**UI:** 14 Chat-Komponenten unter `/components/astra/` — Widget, Full Page, Message Bubbles, Tool Execution Cards, Context Bar, Chat Input

---

### 2.7 Document Generation (Generate 2.0)

**Status:** ✅ Vollstaendig

| Metrik  | Wert    |
| ------- | ------- |
| Dateien | 40+     |
| LoC     | ~10.394 |

**Dokumenttypen (NCA-Submission Templates):**

| Code | Dokument                       |
| ---- | ------------------------------ |
| A1   | Data Management Plan           |
| A2   | Orbital Lifetime Assessment    |
| A4   | End-of-Life Disposal Plan      |
| B1   | Cybersecurity Policy           |
| B2   | Cyber Risk Assessment          |
| B3   | Incident Response Plan         |
| C1   | Authorization Application      |
| C2   | Environmental Footprint Report |
| C3   | Insurance Compliance Plan      |

**Generation Engine:** Chunked Generation (Section-by-Section, 3072 Tokens/Section via Claude). Readiness Scoring vor Generation (Daten-Vollstaendigkeit in %). Consistency Check nach Generation (Cross-Reference Validation).

**Export:** PDF (Client-side via @react-pdf/renderer), Word-kompatibel (jsPDF Server-side)

**NCA-spezifisch:** Ja — jeder Dokumenttyp hat NCA-Compliance Section Markers.

---

### 2.8 Audit Center

**Status:** ✅ Vollstaendig

| Metrik       | Wert |
| ------------ | ---- |
| Aktionstypen | 130+ |

**Was wird geloggt:**

- Jede User-Aktion: Document Ops, Workflow State Changes, Assessment Updates, Evidence Linking, Stakeholder Invitations, Data Room Access, Attestation Signing, Compliance Scoring, NIS2 Phase Transitions
- Metadaten: User ID, Timestamp, IP, User-Agent, Entity ID/Type, Change Delta (Before/After), Outcome

**Audit-Trail-Funktion:** Ja — SHA-256 Hash-Chain. Jeder Eintrag referenziert den Hash des vorherigen Eintrags (tamper-evident). Verification via `chain-verifier.ts`.

**Audit-Pakete exportieren:** Ja — CSV-Export ueber `/api/audit-center/export`. Zusaetzlich Hash-Chain Integritaetspruefung via `/api/audit-center/verify-chain`.

**Separate Security Audit Logs:** `SecurityAuditLog` fuer Auth-Events + `HoneyToken`/`HoneyTokenTrigger` fuer Intrusion Detection.

---

### 2.9 Verity / Cryptographic Attestation

**Status:** ✅ Vollstaendig

| Metrik  | Wert   |
| ------- | ------ |
| Dateien | 30     |
| LoC     | ~2.866 |

**Kryptographische Verfahren:**

- Signatur: **Ed25519** (Elliptic Curve)
- Hashing: **SHA-256** (Hash Chains, Merkle Trees)
- Implementation: Native Node.js `crypto` Module

**Merkle Trees:** Ja — Passport-Dokumente enthalten Merkle Tree ueber alle Attestierungen. Root Hash wird gegen einzelne Signatur verifiziert.

**Was wird attestiert:**

- Compliance-Datenpunkte (regulatorische Requirement Compliance)
- Evidence Measurements (Dokument-Uploads, Testergebnisse, Zertifizierungen)
- Quotas (Bandbreite, Lizenz-Seat-Counts, API Rate Limits)
- Temporal Snapshots (Compliance-Status zu bestimmtem Zeitpunkt)

**Attestation Structure:**

- operatorId, regulationRef, regulationName, dataPoint, result (Boolean), evidence (Document Hash), collected_at
- Issuer: public_key (Ed25519 hex), algorithm, trusted_by (Array of Authorities)
- Signatur: Ed25519 ueber signed fields (SHA-256 hash), signed_at, expires_at

**Verifikations-API:** Ja

- QR-Codes in physischen Attestierungen verlinken auf Verification URL
- Public Key Distribution: `/api/v1/verity/public-key`
- Verification Endpoint: `/api/v1/verity/audit-chain/verify`
- Checklist: Structure Validation → Expiration Check → Algorithm Check → Signature Verification → Trust Anchor Check → Chain Verification

**Passport System:**

- Aggregiertes Compliance-Credential pro Operator
- Generation: `/api/v1/verity/passport/generate`
- Viewer: `/verity/passport/[passportId]/PassportView.tsx`
- P2P Verification: Request/Response/Verify Flow

**Datenmodelle:** `VerityAttestation`, `VerityCertificate`, `VerityIssuerKey`, `VerityPassport`, `VerityP2PRequest`, `VerityNCABundle`

---

## Teil 3: NIS2-spezifische Funktionen

### Art. 2/3 — Scope & Klassifizierung

**Status:** ✅ Vollstaendig

**Dateien:** `src/lib/nis2-engine.server.ts`, `src/lib/nis2-types.ts`, `src/lib/nis2-auto-assessment.server.ts`

**Implementation:**

- Drei-Stufen-Klassifizierung: "essential" | "important" | "out_of_scope"
- Entity-Size-Logik: Micro (ausgeschlossen), Small/Medium (important), Large (essential)
- Sektor-Erkennung: Space (Annex I high criticality)
- Space Subsektor: ground_infrastructure, satellite_communications, spacecraft_manufacturing, launch_services, earth_observation, navigation, space_situational_awareness
- EU-Establishment-Check (Art. 2, Art. 26)
- SATCOM Exception Handling fuer Micro-Enterprises (Art. 2(2)(b))

**Luecken:** Keine.

---

### Art. 4 — Lex Specialis Routing

**Status:** ⚠️ Teilweise (60%)

**Dateien:** `src/lib/unified-engine-merger.server.ts`, `src/lib/space-law-engine.server.ts`, `src/lib/ontology/conflicts.ts`, `src/lib/astra/regulatory-knowledge/cross-regulation-map.ts`

**Was existiert:**

- EU Space Act als primaere Regulation fuer Space Sector anerkannt
- Unified Merger aggregiert Ergebnisse aus mehreren Engines
- Cross-Regulation Conflict Detection im Ontology-System
- Cross-Regulation Map in ASTRA Knowledge Base

**Was fehlt:**

- Kein expliziter Lex-Specialis-Entscheidungsbaum
- Kein automatisches DORA-Routing (Digital Operational Resilience Act)
- Keine formale Vorrang-Logik als dokumentierter Decision Tree

---

### Art. 20 — Governance

**Status:** ⚠️ Teilweise (40%)

**Dateien:** `src/data/nis2-requirements.ts` (nis2-governance-\*), `src/app/governance/page.tsx`

**Was existiert:**

- Governance-Kategorie in NIS2 Requirements
- Governance-Fragen im Assessment Flow
- Compliance Score Breakdown inkl. Governance-Gewichtung

**Was fehlt:**

- ❌ Board-Approval-Tracking (Signaturen, Daten)
- ❌ Management-Cybersecurity-Training-Nachweis-Speicherung
- ❌ Automatischer Briefing-Generator fuer Board-Level Security Briefings
- ❌ Governance-Meeting-Scheduler / Decision Log
- ❌ Attestierungsmodell fuer Board Sign-off

---

### Art. 21(a) — Risk Analysis

**Status:** ✅ Vollstaendig

**Dateien:** `src/lib/assure/risk-engine.server.ts`, `src/data/assure/risk-templates.ts`, `src/lib/shield/risk-classifier.server.ts`, `src/data/enisa-space-controls.ts`

**Implementation:**

- Risk Assessment Methodology dokumentiert
- Risk Register (Prisma: `AssureRisk`)
- Risk Templates fuer Space-spezifische Szenarien (Jamming, Spoofing, ASAT)
- ENISA Control Mapping fuer Space Sector
- Risk Reassessment Tracking (annual cycles)
- Severity Calculation Engine

---

### Art. 21(b) — Incident Handling

**Status:** ✅ Vollstaendig

**Dateien:** `src/lib/workflow/definitions/incident.ts`, `src/lib/services/incident-response-service.ts`, `src/lib/services/incident-autopilot.ts`, `src/lib/services/incident-notification-templates.ts`

**Implementation:**

- State Machine: reported → triaged → investigating → mitigating → resolved → closed
- Incident-Klassifizierung nach Kategorie (Cyber, Debris, Loss of Contact, etc.)
- Severity Calculation
- CSIRT-aligned Detection Method Tracking
- Root Cause Investigation Tracking
- Post-Mortem / Lessons Learned
- Auto-Transition Logic
- Datenmodelle: `Incident`, `IncidentAsset`, `IncidentAttachment`, `IncidentNIS2Phase`

---

### Art. 21(c) — Business Continuity

**Status:** ⚠️ Teilweise (30%)

**Dateien:** `src/data/nis2-requirements.ts` (nis2-003), `src/lib/generate/prompts/document-templates/a4-eol-disposal.ts`

**Was existiert:**

- BCP als Requirement-Kategorie referenziert
- End-of-Life/Decommission Timeline Modeling
- Continuity in Risk Templates referenziert

**Was fehlt:**

- ❌ BCP Template Generator
- ❌ DR Test Tracking System
- ❌ Recovery Scenario Planning UI
- ❌ RTO/RPO Calculation Tool
- ❌ Business Continuity Exercise Scheduling

---

### Art. 21(d) — Supply Chain Security

**Status:** ✅ Vollstaendig

**Dateien:** `src/lib/nexus/supplier-service.server.ts`, `src/lib/nexus/dependency-service.server.ts`

**Implementation:**

- Supplier CRUD mit Risk Level (HIGH/MEDIUM/LOW)
- Supplier Type Classification + Jurisdiction Tracking
- Certification Verification
- Single Point of Failure Detection
- Alternative Supplier Availability Flag
- Contract Expiry Monitoring
- Supplier Scoring/Risk Rating
- Dependency Graph Modeling

**Luecken:** Kein Vendor Security Questionnaire, keine Incident-Propagation durch Supply Chain.

---

### Art. 21(e) — Secure Development & Vulnerability Handling

**Status:** ✅ Vollstaendig

**Dateien:** `src/lib/nexus/vulnerability-service.server.ts`, Prisma: `AssetVulnerability`

**Implementation:**

- CVE Tracking mit CVSS Scores
- Vulnerability Severity Classification
- Patch Status Tracking (OPEN/MITIGATED/RESOLVED)
- Affected Component Mapping
- Workaround Documentation
- Discovery/Mitigation/Resolution Date Tracking

**Luecken:** Kein CVE Feed Auto-Import, kein SDLC Process Enforcement, kein Patch Management Workflow.

---

### Art. 21(f) — Effectiveness Assessment

**Status:** ✅ Vollstaendig

**Dateien:** `src/lib/services/compliance-scoring-service.ts`, `src/lib/verity/score/calculator.ts`, `src/lib/services/cybersecurity-score.ts`, `src/lib/rrs-engine.server.ts`, `src/lib/rcr-engine.server.ts`

**Implementation:**

- Compliance Score 0-100 mit Letter Grade (A-F)
- Module-Level Scores (Authorization 22%, Debris 17%, Cybersecurity 17%, etc.)
- KPI Dashboard mit Module Breakdowns
- RRS (Regulatory Readiness Score) — Investor Readiness
- RCR (Regulatory Credit Rating) — Regulatory Quality Rating
- Evidence-basiertes Scoring
- Recommendations nach Prioritaet (Critical/High/Medium/Low)

---

### Art. 21(g) — Cyber Hygiene & Training

**Status:** ⚠️ Teilweise (50%)

**Dateien:** `src/app/academy/`, `src/data/academy/courses.ts`, `src/lib/nexus/personnel-service.server.ts`

**Was existiert:**

- Training Course Catalog (NIS2-spezifisch + allgemein)
- Enrollment + Completion Tracking
- Badge System (Gamification)
- Personnel Security Profiles
- Datenmodelle: `AcademyCourse`, `AcademyModule`, `AcademyEnrollment`, `AcademyBadge`

**Was fehlt:**

- ❌ Training Compliance Deadline Tracking
- ❌ Phishing Simulation Integration
- ❌ Security Awareness Metriken/KPIs
- ❌ Training Sign-off Verification
- ❌ Role-basierte Training-Zuweisung

---

### Art. 21(h) — Cryptography Policies

**Status:** ⚠️ Teilweise (60%)

**Dateien:** `src/lib/encryption.ts`, `src/data/regulatory/standards/ccsds-security.ts`, `src/data/regulatory/standards/iso-27001.ts`

**Was existiert:**

- AES-256-GCM Encryption fuer sensitive DB-Felder
- Scrypt Key Derivation fuer Per-Organization Encryption
- TLS/HTTPS erzwungen in Middleware
- Key Management in Standards referenziert

**Was fehlt:**

- ❌ TLS Configuration Audit/Monitoring
- ❌ Encryption Policy Generator
- ❌ Key Rotation Scheduling
- ❌ Cryptographic Material Inventory
- ❌ Algorithm Selection Guidance

---

### Art. 21(i) — HR Security & Access Control

**Status:** ⚠️ Teilweise (50%)

**Dateien:** `src/lib/nexus/personnel-service.server.ts`, `src/lib/permissions.ts`, `src/lib/auth.ts`

**Was existiert:**

- Personnel Record Tracking
- RBAC: 5 Rollen (OWNER, ADMIN, MANAGER, MEMBER, VIEWER), 13 Permission-Kategorien
- MFA (TOTP + WebAuthn/FIDO2)
- Login Attempt Monitoring
- Session Management

**Was fehlt:**

- ❌ JML-Prozess (Joiner/Mover/Leaver) Automation
- ❌ Access Review Scheduling
- ❌ Asset Inventory pro User
- ❌ Privileged Access Management (PAM)
- ❌ Role Recertification

---

### Art. 21(j) — MFA & Secure Communications

**Status:** ✅ Vollstaendig

**Dateien:** `src/lib/auth.ts`, `src/lib/mfa.server.ts`, `src/lib/webauthn.server.ts`, `src/components/settings/MfaSetupCard.tsx`

**Implementation:**

- TOTP (Time-based One-Time Password) mit QR-Code Setup
- Backup Codes
- WebAuthn/FIDO2 Hardware Key Support
- 5 Login-Versuche / 15 Minuten Brute Force Protection
- Session Timeout
- Bcrypt 12 Rounds Password Hashing

**Luecken:** Kein Emergency Communication Protocol, kein Break-Glass-Verfahren.

---

### Art. 23 — Incident Reporting

**Status:** ✅ Vollstaendig

**Dateien:** `src/app/api/supervision/incidents/[id]/nis2-phases/route.ts`, `src/lib/services/incident-notification-templates.ts`, `src/app/api/supervision/incidents/[id]/draft-notification/route.ts`

**Implementation — alle 4 NIS2-Phasen:**
| Phase | Frist | Status |
|-------|-------|--------|
| Early Warning | 24h ab Detection (Art. 23(4)(a)) | ✅ |
| Notification | 72h ab Detection (Art. 23(4)(b)) | ✅ |
| Intermediate Report | Auf Anforderung der Behoerde | ✅ |
| Final Report | 1 Monat ab Detection (Art. 23(4)(d)) | ✅ |

- Template-basierte Draft-Generation (Auto-Fill aus Incident-Daten)
- NCA Reference Number Tracking
- Report Status: draft → submitted → acknowledged
- Deadline Calculation mit Auto-Alerts
- Multi-Authority Routing Capability

---

### Art. 24/25 — Certification & Standards

**Status:** ⚠️ Teilweise (50%)

**Dateien:** `src/data/regulatory/standards/iso-27001.ts`, `src/data/regulatory/standards/ccsds-security.ts`, `src/data/cross-references.ts`

**Was existiert:**

- ISO 27001 Control Mappings (A.5.1, A.10.1, etc.)
- NIS2 → ISO 27001 Cross-Reference Matrix
- CCSDS Security Standard Alignment
- Attestation Model fuer Certification Proof

**Was fehlt:**

- ❌ Certification Tracking Model (Valid From/To Dates)
- ❌ Certification Body Registry
- ❌ Audit Scope Definition
- ❌ Audit Scheduling
- ❌ Certificate Storage/Verification (separate von Verity)

---

### Art. 26 — Jurisdiction

**Status:** ✅ Vollstaendig

**Dateien:** `src/data/regulatory/jurisdictions/` (10 Dateien), `src/lib/space-law-engine.server.ts`, `src/data/ncas.ts`

**Implementation:**

- 10 EU-Mitgliedstaaten + UK abgedeckt (BE, DK, FR, DE, IT, LU, NL, NO, AT, UK)
- NCA-Profile pro Jurisdiktion
- Jurisdiktions-spezifische Document Guidance
- Favorability Scoring pro Jurisdiktion
- EU Establishment Check (Art. 26)
- Non-EU Representative Option
- Member State Designation Recognition

---

### Art. 27 — NCA Registration

**Status:** ⚠️ Teilweise (60%)

**Dateien:** `src/app/dashboard/nca-portal/`, Prisma: `NCASubmission`, `NCACorrespondence`, `NCADocPackage`, `SubmissionPackage`

**Was existiert:**

- NCA Submission Pipeline
- Document Package Preparation
- Correspondence Tracking
- Submission Status Workflow (draft → submitted → acknowledged → resolved)

**Was fehlt:**

- ❌ Registration Form Generator
- ❌ NCA Registration Deadline Tracking
- ❌ Multi-Authority Registration (fuer Satellite Networks)
- ❌ Registration Renewal Scheduling
- ❌ Authority-spezifische Form Templates

---

### Art. 29/30 — Information Sharing

**Status:** ⚠️ Teilweise (50%)

**Dateien:** `src/app/dashboard/network/`, `src/app/api/network/attestations/route.ts`, Prisma: `StakeholderEngagement`, `ComplianceAttestation`

**Was existiert:**

- Stakeholder Network fuer Peer Engagement
- Attestation Exchange Mechanismus (P2P Verification)
- Data Room Sharing
- Network Dashboard

**Was fehlt:**

- ❌ Threat Intelligence Feed (externes OSINT)
- ❌ Vulnerability Disclosure Workflow
- ❌ Information Sharing Agreement (ISA) Templates
- ❌ CSIRT Coordination Automation
- ❌ Threat Taxonomy/Ontology

---

### Art. 32/33 — Supervision Readiness

**Status:** ✅ Vollstaendig

**Dateien:** `src/app/dashboard/audit-center/`, `src/app/api/v1/evidence/`, `src/lib/services/ace-evidence-service.server.ts`

**Implementation:**

- Evidence Artifact Collection & Storage
- Audit Log mit SHA-256 Hash Chain (tamper-evident)
- Evidence Gap Analysis gegen NIS2 Requirements
- Evidence Scoring/Completeness Tracking
- Document Vault mit Access Control
- On-demand Audit Export (CSV)
- Hash Chain Integrity Verification

---

### Art. 34 — Fine Calculator

**Status:** ❌ Nicht vorhanden

Keine Implementierung gefunden. Kein Fine Calculator, kein Penalty Exposure Modeling, kein Remediation Timeline Impact, keine Was-wenn-Szenarien fuer finanzielle Auswirkungen.

---

### Art. 35 — GDPR Overlap

**Status:** ⚠️ Teilweise (70%)

**Dateien:** `src/lib/services/incident-response-service.ts`, `src/app/api/security/breach-report/route.ts`, `src/app/api/cron/data-retention-cleanup/route.ts`, `src/app/api/user/export/route.ts`, `src/app/api/user/delete/route.ts`

**Was existiert:**

- Dual Timeline: NIS2 (24h/72h/30d) + GDPR (72h Authority, sofort Betroffene)
- Data Subject Export (Art. 15 GDPR)
- Data Subject Deletion (Art. 17 GDPR)
- Data Retention Cleanup (30-Tage Default, konfigurierbar)
- Privacy Policy (DE + EN)

**Was fehlt:**

- ❌ Personal Data Detection in Incident Description
- ❌ Automatic Pseudonymization
- ❌ Privacy Impact Assessment (DPIA) Automation
- ❌ Data Processing Agreement (DPA) Templates

---

## Teil 4: Testing & Quality

### 4.1 Test-Abdeckung

| Kategorie                            | Anzahl |
| ------------------------------------ | ------ |
| **Test-Dateien gesamt**              | 410    |
| Unit Tests                           | 133    |
| Integration Tests                    | 38     |
| E2E Tests                            | 17     |
| Contract Tests                       | 1      |
| Src-level Tests (\*.test.ts in src/) | 221    |

**Coverage Thresholds (vitest.config.ts):** 80% Branches, 80% Functions, 85% Lines, 85% Statements

**Test-Frameworks:** Vitest 4.0.18 (Unit/Integration), Playwright 1.58.1 (E2E), MSW 2.12.7 (API Mocking), Stryker (Mutation Testing), @axe-core/playwright (Accessibility)

### 4.2 Top 5 Module mit meisten Tests

1. **Unit Services** — 29 Testdateien (Auth, Authorization, Subscriptions, etc.)
2. **Unit Lib** — 29 Testdateien (Utilities, Engines, Helpers)
3. **Integration API** — 23 Testdateien
4. **E2E** — 17 Testdateien (Full Journey, Assessment Flow, Auth Flow, etc.)
5. **Unit Ephemeris** — 16 Testdateien (Orbital Mechanics, Forecasting)

### 4.3 Module mit wenigsten/keinen Tests

**Getestete Engines (6 von 16):** EU Space Act, RCR, Benchmark, IRS, Profile, Risk

**NICHT getestete Engines (10 von 16):**

- nis2-engine.server.ts
- space-law-engine.server.ts
- uk-space-engine.server.ts
- us-regulatory-engine.server.ts
- copuos-engine.server.ts
- export-control-engine.server.ts
- spectrum-engine.server.ts
- unified-engine-merger.server.ts
- rrs-engine.server.ts
- nis2-auto-assessment.server.ts

**API-Domains OHNE Tests (50 von 56):** academy, admin, analytics, assure, astra, audit-center, dashboard, documents, generate2, nexus, nis2, ontology, shield, supervision, und 36 weitere.

### 4.4 E2E Tests (Playwright)

17 Testdateien: accessibility, admin, api-health, assessment-flow, auth-flow, dashboard-navigation, documents, full-journey, nis2-assessment, pricing-checkout, public-pages, responsive, security, settings, space-law-assessment, visual-regression

---

## Teil 5: Datenquellen & Integrationen

### 5.1 Externe APIs/Datenquellen

| Quelle           | Status                    | Zweck                                   | Datei                                           |
| ---------------- | ------------------------- | --------------------------------------- | ----------------------------------------------- |
| CelesTrak        | ✅ Aktiv (Cron 05:00 UTC) | TLE/GP Daten fuer alle Satelliten       | `src/lib/ephemeris/data/celestrak-adapter.ts`   |
| Space-Track.org  | ✅ Aktiv                  | CDM-Daten, Enhanced Orbit Determination | `src/lib/shield/space-track-client.server.ts`   |
| LEOLabs          | ✅ Aktiv                  | Conjunction Assessment Events           | `src/lib/shield/leolabs-client.server.ts`       |
| NOAA Solar Flux  | ✅ Aktiv (Cron 04:00 UTC) | F10.7 Index fuer Atmosphaerendichte     | Cron: `solar-flux-polling`                      |
| Copernicus       | ✅ Aktiv                  | Environmental Impact Assessment         | `src/app/api/environmental/copernicus/route.ts` |
| EUR-Lex          | ✅ Konfiguriert           | Regulatory Updates                      | `src/lib/ephemeris/data/eurlex-adapter.ts`      |
| Anthropic Claude | ✅ Aktiv                  | ASTRA AI Copilot + Document Generation  | `src/lib/astra/engine.ts`                       |
| Stripe           | ✅ Aktiv                  | Payments, Subscriptions, Billing        | `src/lib/stripe/client.ts`                      |

### 5.2 Email/Notification Services

| Service         | Status      | Zweck                              |
| --------------- | ----------- | ---------------------------------- |
| Resend          | ✅ Primaer  | Transactional Emails (9 Templates) |
| Nodemailer/SMTP | ✅ Fallback | SMTP-basierte Email-Zustellung     |

### 5.3 Storage Services

| Service         | Zweck                                                   |
| --------------- | ------------------------------------------------------- |
| Cloudflare R2   | File Storage (Dokumente, Uploads) via S3-kompatible API |
| Neon PostgreSQL | Primaere Datenbank (Serverless)                         |
| Upstash Redis   | Rate Limiting + Caching                                 |

### 5.4 Webhook/Event-Driven Architecture

- Custom Webhooks API: `/api/v1/webhooks/[webhookId]` mit Delivery Tracking + Retry
- Stripe Webhooks: Invoice Success/Fail, Subscription Updated/Deleted
- SSO Webhooks: OIDC Callback, SAML ACS
- 22 Cron Jobs fuer Event-basierte Verarbeitung

---

## Teil 6: UI & User-Facing Features

### 6.1 Routen-Uebersicht (153+ Seiten)

**Public (ungezaehlt):** Landing, Assessment Wizards (4), Pricing, Platform, About, Security, Contact, Resources (FAQ, Glossary, Timeline), Legal (DE+EN), Blog, Careers, Jurisdictions, Modules, Guides, Solutions, Industries, Capabilities, API Docs (Swagger), Supplier Portal, Stakeholder Portal, Verity (Public Passport Viewer)

**Auth:** Login, Signup, MFA Challenge

**Dashboard (31 Module):** Main Dashboard, 15 Compliance Modules (Authorization, COPUOS, Cybersecurity, Debris, Environmental, Export Control, Insurance, NIS2, Registration, Spectrum, Supervision, UK Space, US Regulatory), Documents, Generate, Timeline, Tracker, ASTRA, Mission Control, Ephemeris, Sentinel, Optimizer, Network + Data Room, NCA Portal, Audit Center, Incidents, Regulatory Feed, Verity, Settings (Security Log, API Keys, Billing, Widget), Admin, Digital Twin, Evidence, Hazards, Hub (Project Management), NEXUS, Ontology, Shield

**Assure (20+ Seiten):** Dashboard, Profile (8 Sections), Benchmarks, Score, Risks + Scenarios, Materials + Generator, Data Room + Analytics, Investors + Milestones, Packages, Rating + Appeal + Methodology + Report

**Academy (15+ Seiten):** Dashboard, Courses + Learn, Classroom + Join, Instructor + Analytics, Simulations, Progress, Sandbox

### 6.2 Dashboard

Das Haupt-Dashboard zeigt:

- Compliance Score Card (0-100, Letter Grade)
- Module-Level Compliance Status (15 Module)
- Deadlines & Milestones Timeline
- Recent Activity Feed
- Analytics Charts (Recharts)
- Quick Actions

### 6.3 Reporting/Export

| Format   | Berichte                                                                                                                                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PDF**  | 12+ Typen: Compliance Summary, Compliance Certificate, Authorization Application, Debris Mitigation Plan, Environmental Footprint, Insurance Compliance, NCA Annual Report, NCA Incident Report, NCA Significant Change Report, Audit Report, Hazard Report, Optimization Report |
| **CSV**  | Audit Log Export                                                                                                                                                                                                                                                                 |
| **JSON** | API-Responses, Public Data Exports                                                                                                                                                                                                                                               |

### 6.4 Design System

| Aspekt        | Detail                                                         |
| ------------- | -------------------------------------------------------------- |
| Framework     | Tailwind CSS 3.4.0                                             |
| Theme         | Dark Mode — "Liquid Glass" (3-Tier Glass Elevation)            |
| Color Palette | Navy-950 (#0A0F1E) Basis, Emerald (#10B981) Accent             |
| Typography    | 11-stufige Type Scale (10px-48px)                              |
| UI Primitives | 16 (Button, Card, Dialog, Dropdown, Input, Select, etc.)       |
| Card Variants | default, glass, elevated, interactive                          |
| 3D            | Three.js (Mission Control Globe, Landing Page 3D Scene)        |
| Charts        | Recharts (Compliance Dashboards, Analytics)                    |
| Graphs        | React Flow (Dependency Graphs), React Force Graph 2D (Network) |
| Animations    | Framer Motion 11.0                                             |
| Icons         | Lucide React                                                   |

---

## Teil 7: Sicherheit der Plattform selbst

### 7.1 Auth

**Status:** ✅ Vollstaendig

- **System:** NextAuth v5 (beta 30)
- **Provider:** Credentials (Email/Password), Google OAuth, Apple OAuth, SAML/OIDC SSO (Enterprise)
- **MFA:** TOTP + WebAuthn/FIDO2
- **Session:** JWT mit Rotation, HttpOnly + Secure + SameSite=Lax Cookies
- **Password:** Bcrypt 12 Rounds
- **Brute Force:** 5 Versuche / 15 Minuten mit Account Lockout
- **Anomaly Detection:** Behavioral Analysis, Suspicious Login Alerts

### 7.2 RBAC/Permissions

**Status:** ✅ Vollstaendig

- **5 Rollen:** OWNER, ADMIN, MANAGER, MEMBER, VIEWER
- **13 Permission-Kategorien:** org, members, compliance, reports, audit, settings, spacecraft, documents, incidents, api, network, assure, academy
- **Aktionen:** read, write, delete, invite, remove, role, update, billing, generate, submit, export, manage, attest
- **Enforcement:** Organization-Level via `OrganizationMember.role`

### 7.3 API Security

**Status:** ✅ Vollstaendig

- **Rate Limiting:** 19 Tiers via Upstash Redis (Production), In-Memory Fallback (Dev)
- **API Keys:** DB-basiert, scope-basierte Permissions, Bearer Token oder direkt
- **HMAC Signing:** Optional fuer sensitive Endpoints
- **CORS:** Public API (\*), Widget (registered domains only)
- **CSRF:** Session-bound Double Submit Cookie Pattern (SHA-256)
- **Cron Auth:** Timing-safe Bearer Token Validation (CRON_SECRET)

### 7.4 Data Encryption

**Status:** ✅ Vollstaendig

- **At Rest:** AES-256-GCM fuer sensitive DB-Felder (VAT, Bank, Tax IDs, Policy Numbers)
- **Key Derivation:** Scrypt (N=32768, r=8, p=1) — OWASP 2024+ Parameter
- **Per-Organization:** Unique Encryption Key abgeleitet aus Org ID + Master Key
- **In Transit:** TLS/HTTPS erzwungen via Middleware + HSTS (2 Jahre, Preload)

### 7.5 Secrets Management

**Status:** ✅ Vollstaendig

- Environment Variables via Vercel (niemals hardcoded)
- `.env*.local` in `.gitignore`
- TruffleHog Secret Scanning in CI
- Separate Encryption Keys pro Concern (AUTH_SECRET, ENCRYPTION_KEY, ENCRYPTION_SALT, CRON_SECRET)
- Key Generation Commands dokumentiert

### 7.6 Zusaetzliche Security-Features

- **Security Headers:** CSP (nonce-basiert), HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy
- **Source Maps:** Deaktiviert in Production
- **DOM Sanitization:** isomorphic-dompurify gegen XSS
- **Hash-chained Audit Log:** Tamper-evident (SHA-256)
- **Honey Tokens:** Canary Tokens fuer Intrusion Detection
- **Anomaly Detection:** Behavioral Analysis Engine
- **CodeQL + OWASP:** SAST + Dependency Checks in CI

---

## Zusammenfassungstabelle: NIS2-Checkpoints

| #   | NIS2-Artikel | Thema                        | Status             | Vollstaendigkeit | Geschaetzter Aufwand zum Schliessen                                  |
| --- | ------------ | ---------------------------- | ------------------ | ---------------- | -------------------------------------------------------------------- |
| 1   | Art. 2/3     | Scope & Klassifizierung      | ✅ Vollstaendig    | 100%             | —                                                                    |
| 2   | Art. 4       | Lex Specialis Routing        | ⚠️ Teilweise       | 60%              | 2-3 Tage (Decision Tree, DORA-Routing)                               |
| 3   | Art. 20      | Governance                   | ⚠️ Teilweise       | 40%              | 5-7 Tage (Board Approval, Training Proof, Briefing Generator)        |
| 4   | Art. 21(a)   | Risk Analysis                | ✅ Vollstaendig    | 100%             | —                                                                    |
| 5   | Art. 21(b)   | Incident Handling            | ✅ Vollstaendig    | 100%             | —                                                                    |
| 6   | Art. 21(c)   | Business Continuity          | ⚠️ Teilweise       | 30%              | 7-10 Tage (BCP Templates, DR Tracking, RTO/RPO, Exercise Scheduling) |
| 7   | Art. 21(d)   | Supply Chain Security        | ✅ Vollstaendig    | 100%             | —                                                                    |
| 8   | Art. 21(e)   | Secure Development           | ✅ Vollstaendig    | 100%             | —                                                                    |
| 9   | Art. 21(f)   | Effectiveness Assessment     | ✅ Vollstaendig    | 100%             | —                                                                    |
| 10  | Art. 21(g)   | Cyber Hygiene & Training     | ⚠️ Teilweise       | 50%              | 5-7 Tage (Phishing Sim, Awareness KPIs, Deadline Tracking)           |
| 11  | Art. 21(h)   | Cryptography Policies        | ⚠️ Teilweise       | 60%              | 3-5 Tage (TLS Audit, Key Rotation, Crypto Inventory)                 |
| 12  | Art. 21(i)   | HR Security & Access Control | ⚠️ Teilweise       | 50%              | 5-7 Tage (JML Workflow, Access Reviews, PAM)                         |
| 13  | Art. 21(j)   | MFA & Secure Communications  | ✅ Vollstaendig    | 100%             | —                                                                    |
| 14  | Art. 23      | Incident Reporting           | ✅ Vollstaendig    | 100%             | —                                                                    |
| 15  | Art. 24/25   | Certification & Standards    | ⚠️ Teilweise       | 50%              | 3-5 Tage (Cert Tracking, Audit Scheduling, Cert Storage)             |
| 16  | Art. 26      | Jurisdiction                 | ✅ Vollstaendig    | 100%             | —                                                                    |
| 17  | Art. 27      | NCA Registration             | ⚠️ Teilweise       | 60%              | 3-4 Tage (Form Generator, Deadline Tracking, Renewal)                |
| 18  | Art. 29/30   | Information Sharing          | ⚠️ Teilweise       | 50%              | 5-7 Tage (Threat Intel Feed, ISA Templates, CSIRT Automation)        |
| 19  | Art. 32/33   | Supervision Readiness        | ✅ Vollstaendig    | 100%             | —                                                                    |
| 20  | Art. 34      | Fine Calculator              | ❌ Nicht vorhanden | 0%               | 3-5 Tage (Fine Calculator, Exposure Modeling)                        |
| 21  | Art. 35      | GDPR Overlap                 | ⚠️ Teilweise       | 70%              | 3-4 Tage (PII Detection, DPIA Automation, DPA Templates)             |

### Gesamtbewertung

| Metrik                                        | Wert                 |
| --------------------------------------------- | -------------------- |
| **NIS2-Artikel mit vollstaendiger Abdeckung** | 10 von 21 (48%)      |
| **NIS2-Artikel mit teilweiser Abdeckung**     | 10 von 21 (48%)      |
| **NIS2-Artikel ohne Abdeckung**               | 1 von 21 (4%)        |
| **Gewichtete Gesamtabdeckung**                | ~76%                 |
| **Geschaetzter Restaufwand**                  | 44-64 Entwicklertage |

### Staerken der Plattform

1. **Exzellentes Incident Management** (Art. 23) — praezise Timeline-Deadlines (24h, 72h, 30d) mit Template-basierter Draft-Generation
2. **Umfassende Entity-Klassifizierung** (Art. 2/3) — Space-Sektor-Nuancen korrekt abgebildet
3. **Starke Risk & Supply Chain Funktionen** (Art. 21(a,d)) — Asset-Level Granularitaet mit Dependency Graphs
4. **Multi-Jurisdiktion** (Art. 26) — 10 EU-Staaten + UK vollstaendig abgedeckt
5. **Audit/Supervision Readiness** (Art. 32/33) — Hash-Chain-Integritaet, Evidence Gap Analysis
6. **Enterprise Security** — AES-256-GCM, Ed25519, MFA/FIDO2, 19-Tier Rate Limiting, Honey Tokens

### Kritische Luecken

1. **Art. 34 — Fine Calculator** — vollstaendig fehlend
2. **Art. 21(c) — Business Continuity** — nur 30% abgedeckt, keine BCP Templates oder DR Test Tracking
3. **Art. 20 — Governance** — nur 40% abgedeckt, kein Board-Approval-Tracking
4. **Test-Abdeckung API Routes** — 50 von 56 API-Domains ohne Tests
5. **Test-Abdeckung Engines** — 10 von 16 Compliance-Engines ohne Unit Tests
