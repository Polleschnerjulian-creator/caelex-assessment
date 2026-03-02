# Caelex Platform — Vollständiges Funktions-Audit

**Datum:** 2. März 2026
**Erstellt von:** Automatisiertes Codebase-Audit
**Version:** Stand des aktuellen Codebases

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Assessment-Module (Öffentlich)](#2-assessment-module-öffentlich)
3. [Dashboard-Module (13 Compliance-Module)](#3-dashboard-module-13-compliance-module)
4. [ASTRA — KI-Compliance-Copilot](#4-astra--ki-compliance-copilot)
5. [Compliance-Engines (Server-Side)](#5-compliance-engines-server-side)
6. [Assure-Plattform (Investment Readiness)](#6-assure-plattform-investment-readiness)
7. [Academy (Lernplattform)](#7-academy-lernplattform)
8. [Dokument-Management & Generation](#8-dokument-management--generation)
9. [NCA-Portal & Behördenkommunikation](#9-nca-portal--behördenkommunikation)
10. [Incident Management](#10-incident-management)
11. [Digital Twin & What-If-Szenarien](#11-digital-twin--what-if-szenarien)
12. [Stakeholder- & Supplier-Portal](#12-stakeholder---supplier-portal)
13. [Billing & Subscriptions (Stripe)](#13-billing--subscriptions-stripe)
14. [API v1 (Externe Integration)](#14-api-v1-externe-integration)
15. [Sicherheitsfeatures](#15-sicherheitsfeatures)
16. [PDF-Reports (10 Typen)](#16-pdf-reports-10-typen)
17. [Email-System (6 Templates)](#17-email-system-6-templates)
18. [Cron-Jobs (14 Scheduled Tasks)](#18-cron-jobs-14-scheduled-tasks)
19. [Öffentliche Seiten & Content](#19-öffentliche-seiten--content)
20. [SEO & Structured Data](#20-seo--structured-data)
21. [Datenbank-Schema (147 Modelle)](#21-datenbank-schema-147-modelle)
22. [Services-Layer (47 Services)](#22-services-layer-47-services)
23. [Regulatorische Datenbasis](#23-regulatorische-datenbasis)
24. [Zusammenfassung — Zahlen & Fakten](#24-zusammenfassung--zahlen--fakten)

---

## 1. Executive Summary

**Caelex** ist eine Full-Stack Space Regulatory Compliance SaaS-Plattform für Satellitenbetreiber, Launch-Provider und Space-Service-Unternehmen. Die Plattform deckt Compliance mit dem EU Space Act (COM(2025) 335), der NIS2-Richtlinie (EU 2022/2555) und nationalen Weltraumgesetzen in 10+ Jurisdiktionen ab.

### Kernzahlen

| Metrik                      | Wert                                        |
| --------------------------- | ------------------------------------------- |
| Datenbank-Modelle           | 147                                         |
| API-Routen                  | 87+ Endpoints (48 Route-Dateien)            |
| Compliance-Engines          | 8 regulatorische Engines                    |
| Dashboard-Module            | 13 Compliance-Module                        |
| Assessment-Wizards          | 4 (EU Space Act, NIS2, Space Law, Unified)  |
| ASTRA KI-Tools              | 35 spezialisierte Tools                     |
| Services                    | 47 Business-Logic-Services                  |
| PDF-Report-Typen            | 10                                          |
| Cron-Jobs                   | 14                                          |
| Unterstützte Jurisdiktionen | 10 EU + UK + US                             |
| Öffentliche Seiten          | 87 page.tsx-Dateien                         |
| Dashboard-Seiten            | 56 page.tsx-Dateien                         |
| React-Komponenten           | 298 (42 Verzeichnisse)                      |
| Pricing-Stufen              | 4 (Free, Starter, Professional, Enterprise) |

---

## 2. Assessment-Module (Öffentlich)

### 2.1 EU Space Act Assessment (`/assessment/eu-space-act`)

- **8-Fragen-Wizard** zur Bestimmung des Betreibertyps
- **7 Betreibertypen:** SCO (Spacecraft Operator), LO (Launch Operator), LSO (Launch Site Operator), ISOS (In-Space Services), CAP (Capability Provider), PDP (Primary Data Provider), TCO (Third Country Operator)
- **Ergebnis:** Filtert 119 EU Space Act-Artikel nach Betreibertyp, bestimmt Regime (Standard vs. Light), berechnet Modulstatus über 9 Module
- **Checklisten:** Pre-Authorization, Ongoing, End-of-Life

### 2.2 NIS2 Assessment (`/assessment/nis2`)

- **Entity-Klassifizierung:** Essential / Important / Out-of-Scope nach Art. 2-3
- **Raum-spezifische Scoping:** SATCOM, Bodeninfrastruktur, Launch-Services
- **51 Requirements** gemappt auf Art. 21(2)(a-j) + Art. 23/27/29
- **Incident-Timeline:** 24h Early Warning, 72h Notification, 1 Monat Final Report
- **Penalties:** EUR 10M oder 2% (Essential), EUR 7M oder 1.4% (Important)

### 2.3 National Space Law Assessment (`/assessment/space-law`)

- **10 Jurisdiktionen:** FR, UK, BE, NL, LU, AT, DK, DE, IT, NO
- **Favorability Scoring** mit gewichteten Faktoren
- **Multi-Jurisdictions-Vergleichsmatrizen**
- **EU Space Act Cross-References** (47 Mappings)

### 2.4 Unified Assessment (`/assessment/unified`)

- **Kombinierter Wizard** für alle 3 Frameworks in einem Flow
- **300+ Cross-Framework-Fragen**
- **Aggregiertes Compliance-Profil** über alle Regulierungen

---

## 3. Dashboard-Module (13 Compliance-Module)

### 3.1 Authorization (`/dashboard/modules/authorization`)

- NCA-Pathway-Bestimmung (Primary/Secondary NCA)
- Pre-Authorization-Dokumentenliste
- 4-Phasen-Workflow: Draft → In Review → Approved → Post-Approval
- Betreibertyp-Klassifizierung
- Dokumentenstatus-Tracking

### 3.2 Registration (`/dashboard/modules/registration`)

- Space Object Registration (EU Registry, UNOOSA)
- COSPAR/NORAD Tracking-Nummern
- Orbital-Regime-Klassifizierung (LEO/MEO/GEO/HEO)
- Mission-Timeline-Integration
- CSV-Export für UNOOSA-Meldungen

### 3.3 Cybersecurity (`/dashboard/modules/cybersecurity`)

- Maturity-Level-Assessment (Stufe 1-5)
- NIS2 Art. 21(2) + EU Space Act Art. 27-30
- ISO 27001 Certification Tracking
- NIST CSF Mapping
- ENISA Space Controls Catalog
- Simplified Regime für kleine Entitäten

### 3.4 Debris Mitigation (`/dashboard/modules/debris`)

- EU Space Act Art. 31-37, IADC Compliance
- Constellation-Tier-Berechnung
- Deorbit-Strategien: Passivation, Controlled Re-entry, Active Removal
- Höhenbasierte Compliance (LEO 25-year rule)
- Manövrierbarkeits-Assessment

### 3.5 Environmental (`/dashboard/modules/environmental`)

- EU Space Act Art. 44-46
- Environmental Footprint Declaration (EFD) mit Graden A-D
- Lifecycle Assessment (LCA)
- Launch-Propellant-Profile
- Emissionen pro Phase
- Supplier-Koordination für Zulieferdaten

### 3.6 Insurance (`/dashboard/modules/insurance`)

- EU Space Act Art. 47-50
- Mission Risk Scoring
- Versicherungstypen: Pre-Launch, Launch, In-Orbit, TPL
- Prämien-Schätzung
- Jurisdiktions-spezifische Mindestbeträge
- Policy-Status-Tracking

### 3.7 NIS2 (`/dashboard/modules/nis2`)

- Directive 2022/2555 Compliance
- Entity-Klassifizierung (Essential/Important)
- Art. 21(2) Requirement Mapping (a-j)
- Incident-Reporting-Timeline
- Penalty-Berechnung

### 3.8 Export Control (`/dashboard/modules/export-control`)

- ITAR/EAR Compliance
- Technology Control Lists
- Deemed Export Restrictions
- US Nexus Assessment
- Foreign Person Screening
- 5 Klassen, 10 Regimes

### 3.9 Spectrum (`/dashboard/modules/spectrum`)

- ITU Radio Regulations
- Service-Typ-Klassifizierung (FSS, MSS, BSS, EESS etc.)
- Orbital Slot Allocation
- Frequency Band Coordination
- Interference Analysis
- Nationale Spectrum-Authority-Requirements

### 3.10 COPUOS / UN Space Law (`/dashboard/modules/copuos`)

- Outer Space Treaty (OST) Obligations
- UN-Registrierung
- National Authorization Principles (Art. I & II OST)
- Continuous Supervision Art. V
- Liability Regime Art. VII

### 3.11 UK Space Law (`/dashboard/modules/uk-space`)

- UK Space Industry Act 2018
- UK Licensing Pathway
- Spaceport Licensing
- Operator-Typ-Klassifizierung (Launch/Satellite/Return)
- Post-Brexit Sonderregelungen

### 3.12 US Regulatory (`/dashboard/modules/us-regulatory`)

- FCC Spectrum Licensing
- FAA Launch Licensing
- NOAA Remote Sensing Compliance
- Foreign Entity Restrictions
- US Commercial Rights

### 3.13 Supervision (`/dashboard/modules/supervision`)

- Ongoing Supervisory Obligations (Art. 74-78 EU Space Act)
- NCA-Kontaktmanagement
- Incident Reporting Procedures
- Annual Reporting Schedules
- Compliance Calendar
- Supervisory Deadlines Tracking

---

## 4. ASTRA — KI-Compliance-Copilot

### Identität

**ASTRA** = Autonomous Space & Telecommunications Regulatory Agent

- **LLM:** Claude Sonnet 4.6 (Anthropic)
- **35 spezialisierte Tools** in 8 Kategorien
- **Sprachen:** EN/DE (formale Terminologie)

### 4.1 Compliance Analysis Tools (7)

| Tool                          | Funktion                                               |
| ----------------------------- | ------------------------------------------------------ |
| `checkComplianceStatus`       | Aktueller Score & Status (alle Module oder spezifisch) |
| `getArticleRequirements`      | Detaillierte Requirements für spezifischen Artikel     |
| `runGapAnalysis`              | Gap-Priorisierung mit Empfehlungen                     |
| `checkCrossRegulationOverlap` | NIS2 + EU Space Act Overlap + Effort Savings           |
| `compareJurisdictions`        | Side-by-side Vergleich (10 Jurisdiktionen)             |
| `getDeadlineTimeline`         | Alle anstehenden Deadlines                             |
| `assessRegulatoryImpact`      | Impact-Analyse auf Compliance-Module                   |

### 4.2 Assessment Tools (4)

| Tool                        | Funktion                                    |
| --------------------------- | ------------------------------------------- |
| `getAssessmentResults`      | Ergebnisse aller 7 Assessment-Typen abrufen |
| `getOperatorClassification` | Betreibertyp + Pflichten + Artikel          |
| `getNis2Classification`     | Entity-Klassifizierung + Requirements       |
| `suggestCompliancePath`     | Sequenzierter Roadmap zur Full Compliance   |

### 4.3 Document Tools (9)

| Tool                               | Funktion                                 |
| ---------------------------------- | ---------------------------------------- |
| `listDocuments`                    | Vault mit Category/Status/Expiry Filtern |
| `checkDocumentCompleteness`        | Fehlende Docs für Modul/Authorization    |
| `generateComplianceReport`         | Umfassender PDF-Report (5 Typen)         |
| `generateAuthorizationApplication` | NCA-Antragsdokument                      |
| `generateDebrisMitigationPlan`     | Debris-Plan (ISO 24113, IADC)            |
| `generateCybersecurityFramework`   | NIST CSF/ISO 27001 Framework             |
| `generateEnvironmentalReport`      | EFD mit Lifecycle Assessment             |
| `generateInsuranceReport`          | TPL-Analyse + Coverage Status            |
| `generateNIS2Report`               | NIS2 Assessment + Gap Analysis           |

### 4.4 Knowledge Tools (6)

| Tool                  | Funktion                                     |
| --------------------- | -------------------------------------------- |
| `searchRegulation`    | Semantische Suche über alle Regulierungen    |
| `getArticleDetail`    | Volltext + Interpretation + Cross-References |
| `getCrossReferences`  | EU Space Act ↔ NIS2 ↔ National Laws Mappings |
| `explainTerm`         | Glossar-Definitionen (Space-spezifisch)      |
| `queryComplianceTwin` | Echtzeit-Compliance-Status (Digital Twin)    |
| `runWhatifScenario`   | Szenario-Simulation                          |

### 4.5 NCA Submission Tools (5)

| Tool                       | Funktion                      |
| -------------------------- | ----------------------------- |
| `getNcaSubmissions`        | Liste der NCA-Einreichungen   |
| `getSubmissionDetail`      | Status + NCA-Korrespondenz    |
| `checkPackageCompleteness` | Dokument-Readiness % pro NCA  |
| `getNcaDeadlines`          | NCA-spezifische Deadlines     |
| `listDocuments`            | Dokumentfilter nach Kategorie |

### 4.6 Incident Management Tools (6)

| Tool                      | Funktion                                                         |
| ------------------------- | ---------------------------------------------------------------- |
| `reportIncident`          | Incident Autopilot (auto-Klassifizierung, NIS2 Art. 23 Workflow) |
| `getIncidentStatus`       | Workflow-Status + Countdown                                      |
| `listActiveIncidents`     | Filter nach Category/Severity                                    |
| `draftNcaNotification`    | Template für NIS2-Phasen                                         |
| `advanceIncidentWorkflow` | Lifecycle: Triage → Investigate → Mitigate → Resolve → Close     |

### 4.7 Analysis & Planning Tools (2)

| Tool                         | Funktion                       |
| ---------------------------- | ------------------------------ |
| `estimateComplianceCostTime` | Aufwand/Kosten-Schätzung       |
| `getEvidenceGaps`            | Fehlende Evidenz/Dokumentation |

### ASTRA Verhaltensregeln

- **EU AI Act Art. 50 Compliance:** Muss sich als KI identifizieren
- **Zitationspflicht:** Jede Aussage mit spezifischem Artikel belegt
- **Confidence Levels:** HIGH/MEDIUM/LOW mit Handlungsempfehlungen
- **Proaktives Flagging:** Verwandte Pflichten über Frameworks hinweg

---

## 5. Compliance-Engines (Server-Side)

### 8 regulatorische Engines

| Engine            | Datei                             | Scope                                                |
| ----------------- | --------------------------------- | ---------------------------------------------------- |
| **EU Space Act**  | `engine.server.ts`                | 7 Betreibertypen → 119 Artikel, 9 Module             |
| **NIS2**          | `nis2-engine.server.ts`           | Essential/Important-Klassifizierung, 51 Requirements |
| **Space Law**     | `space-law-engine.server.ts`      | 10 EU-Jurisdiktionen, Favorability Scoring           |
| **COPUOS/IADC**   | `copuos-engine.server.ts`         | Orbital Debris Mitigation                            |
| **ITAR/EAR**      | `export-control-engine.server.ts` | US Export Control (5 Klassen, 10 Regimes)            |
| **US Regulatory** | `us-regulatory-engine.server.ts`  | FCC, FAA, NOAA Compliance                            |
| **Spectrum**      | `spectrum-engine.server.ts`       | ITU Frequency/Spectrum                               |
| **UK Space**      | `uk-space-engine.server.ts`       | UK Space Industry Act                                |

### Zusätzliche Engines

| Engine                | Datei                             | Scope                                            |
| --------------------- | --------------------------------- | ------------------------------------------------ |
| **RCR**               | `rcr-engine.server.ts`            | Regulatory Credit Rating (Investment Readiness)  |
| **RRS**               | `rrs-engine.server.ts`            | Regulatory Readiness Score (Compliance Maturity) |
| **Unified Merger**    | `unified-engine-merger.server.ts` | Aggregiert alle 8 Engine-Outputs                 |
| **Anomaly Detection** | `anomaly-detection.server.ts`     | ML-basierte Compliance-Risk-Anomalien            |

---

## 6. Assure-Plattform (Investment Readiness)

### Seiten & Features

| Seite                           | Funktion                                   |
| ------------------------------- | ------------------------------------------ |
| `/assure/dashboard`             | Main Assure Dashboard                      |
| `/assure/profile`               | Unternehmensprofil (Multidimensional)      |
| `/assure/score`                 | Investment-Grade Score (IRS, RCR, RRS)     |
| `/assure/benchmarks`            | Peer Benchmarking                          |
| `/assure/risks`                 | Risk Register                              |
| `/assure/risks/scenarios`       | Risk Scenario Analysis                     |
| `/assure/dataroom`              | Data Room Management                       |
| `/assure/dataroom/analytics`    | Data Room Usage Analytics                  |
| `/assure/materials`             | Materials Library (Templates)              |
| `/assure/materials/generator`   | Material Generation Tool                   |
| `/assure/investors`             | Investor Reporting Hub                     |
| `/assure/investors/updates`     | Investor Update Posts                      |
| `/assure/investors/milestones`  | Milestone Tracking                         |
| `/assure/onboarding`            | Setup Wizard                               |
| `/assure/book`                  | Demo/Booking                               |
| `/assure/view/[token]`          | Öffentliches Compliance-Profil (Shareable) |
| `/assure/dataroom/view/[token]` | Geteilter Data Room View                   |

### Scoring-Metriken

- **IRS** — Investment Readiness Score
- **RCR** — Regulatory Credit Rating
- **RRS** — Regulatory Readiness Score

---

## 7. Academy (Lernplattform)

### Seiten & Features

| Seite                                           | Funktion                          |
| ----------------------------------------------- | --------------------------------- |
| `/academy`                                      | Academy Hub (öffentlich)          |
| `/academy/dashboard`                            | User Progress Dashboard           |
| `/academy/courses`                              | Kurs-Listing                      |
| `/academy/courses/[slug]`                       | Einzelne Kursseite                |
| `/academy/courses/[slug]/learn/[lesson]`        | Lektion mit Progress Tracking     |
| `/academy/classroom`                            | Classroom Management              |
| `/academy/classroom/[id]`                       | Einzelnes Classroom               |
| `/academy/classroom/join`                       | Classroom-Beitritt                |
| `/academy/instructor`                           | Instructor Dashboard              |
| `/academy/instructor/classrooms`                | Instructor-Classrooms             |
| `/academy/instructor/classrooms/new`            | Neues Classroom erstellen         |
| `/academy/instructor/classrooms/[id]/analytics` | Classroom Analytics               |
| `/academy/simulations`                          | Compliance-Szenarien-Simulationen |
| `/academy/simulations/[id]`                     | Einzelne Simulation               |
| `/academy/sandbox`                              | Compliance Engine Sandbox         |
| `/academy/progress`                             | Lernfortschritt                   |

### Features

- Kurse mit Modulen und Lektionen
- Quizzes und Tests
- Badge-System (Achievements)
- Instructor-Tools für Classroom-Management
- Student-Analytics
- Compliance-Simulationen (Praxisszenarien)
- Sandbox zum Testen der Compliance-Engine

---

## 8. Dokument-Management & Generation

### Document Vault (`/dashboard/documents`)

- Upload, Speicherung, Versionierung
- Kategorisierung nach Modul/Typ
- Access Logging (Audit Trail)
- Expiry-Tracking mit automatischen Benachrichtigungen
- Sharing mit Links
- Template-Bibliothek

### AI-gestützte Dokumentengenerierung (Generate 2.0)

- **16 NCA-Dokumenttypen** generierbar
- Chunk-basierte Generierung (Abschnitt für Abschnitt)
- Editierbare Zwischenergebnisse
- PDF-Export
- Komplettes NCA-Submission-Package (alle 16 Docs auf einmal)
- Readiness-Scores pro Dokumenttyp

### Generierbare Dokumente

| Dokument                  | Zweck                                          |
| ------------------------- | ---------------------------------------------- |
| Authorization Application | NCA-Antrag (New/Modification/Renewal/Transfer) |
| Debris Mitigation Plan    | ISO 24113, IADC, ESA Template                  |
| Cybersecurity Framework   | NIST CSF/ISO 27001 aligned                     |
| Environmental Report      | EFD mit Lifecycle Assessment                   |
| Insurance Report          | TPL-Analyse + Coverage                         |
| NIS2 Report               | Entity-Klassifizierung + Gap Analysis          |
| Compliance Summary        | Executive Summary (1-Seite)                    |
| Compliance Certificate    | Nachweis für Partner                           |

---

## 9. NCA-Portal & Behördenkommunikation

### Features

| Feature               | Beschreibung                                   |
| --------------------- | ---------------------------------------------- |
| Submission Management | Erstellen & Einreichen von Regulatory Packages |
| Package Completeness  | Readiness-Check für NCA-Submissions            |
| NCA Correspondence    | Email/Message-Tracking mit Behörden            |
| Document Packages     | Bündeln aller erforderlichen Dokumente         |
| Deadline Tracking     | NCA-spezifische Fristen & SLAs                 |
| Multi-NCA Support     | Gleichzeitige Submissions an mehrere NCAs      |

### Unterstützte NCAs

- France (CNES), Germany (BMWK), Belgium, Netherlands, Luxembourg, Austria, Denmark, Italy, Norway, UK (CAA)
- 29 nationale Behörden im Katalog

---

## 10. Incident Management

### Incident Autopilot

- **Automatische Klassifizierung** nach Severity
- **NIS2 Art. 23 Workflow** automatisch angelegt
- **Lifecycle:** Triage → Investigate → Mitigate → Resolve → Close → Reopen
- **NCA-Notification Templates** für jede Phase

### NIS2-Reporting-Timeline

| Phase               | Deadline    | Aktion                       |
| ------------------- | ----------- | ---------------------------- |
| Early Warning       | 24 Stunden  | Erste Meldung an NCA         |
| Notification        | 72 Stunden  | Vollständiger Initialbericht |
| Intermediate Report | Auf Anfrage | Zwischenbericht              |
| Final Report        | 1 Monat     | Umfassender Abschlussbericht |

### Features

- Incident-Registry mit Severity/Status
- Betroffene Spacecraft/Assets verknüpfen
- Attachments (Beweismaterial)
- NCA-Submission-Tracking pro Phase
- Korrespondenz-Protokoll

---

## 11. Digital Twin & What-If-Szenarien

### Compliance Digital Twin

- **Täglicher Compliance-Snapshot** (Cron-gesteuert)
- **Echtzeit-Compliance-Status** abfragbar
- **What-If-Simulationen:**
  - "Was passiert bei Expansion auf 50 Satelliten?"
  - "Was passiert bei Markteintritt in neue Jurisdiktion?"
  - "Wie ändert sich der Score bei Dokumenten-Upload?"
- **Impact-Projektion** auf alle Compliance-Module

### Mission Control (`/dashboard/mission-control`)

- Real-Time Mission Status Dashboard
- Mission Phases & Events
- Compliance-verknüpfte Timeline

---

## 12. Stakeholder- & Supplier-Portal

### Stakeholder Portal (`/stakeholder/`)

- **Token-basierter Zugang** (kein Account nötig)
- Compliance-Profile einsehen
- Data Room Zugang
- Attestation Documents signieren/einsehen
- Für Investoren, Partner, Kunden

### Supplier Portal (`/supplier/[token]`)

- **Externe Zulieferer-Datenerfassung**
- Environmental Footprint Daten
- LCA (Lifecycle Assessment) Daten
- Component-spezifische Datenfelder
- Deadline-Management für Zulieferer

---

## 13. Billing & Subscriptions (Stripe)

### Pricing-Stufen

| Plan             | Preis   | Users      | Spacecraft | Module     | Storage    | API | SSO |
| ---------------- | ------- | ---------- | ---------- | ---------- | ---------- | --- | --- |
| **Free**         | €0      | 1          | 1          | Assessment | 0 GB       | ✗   | ✗   |
| **Starter**      | €299/mo | 3          | 5          | 4 Module   | 5 GB       | ✗   | ✗   |
| **Professional** | €799/mo | 10         | 25         | Alle 8     | 25 GB      | ✓   | ✗   |
| **Enterprise**   | Custom  | Unbegrenzt | Unbegrenzt | Alle 8     | Unbegrenzt | ✓   | ✓   |

### Features

- Stripe Checkout & Customer Portal
- Webhook-Integration für Subscription-Events
- Usage Tracking
- Invoice-Management

---

## 14. API v1 (Externe Integration)

### API-Domains (48 Route-Dateien, 87+ Endpoints)

#### Organization Management (15 Endpoints)

- CRUD für Organizations, Members, Spacecraft, Invitations
- Operator Profile Management

#### Compliance & Evidence (13 Endpoints)

- Evidence CRUD mit Pagination/Filtering
- Gap Analysis (fehlende/abgelaufene/ausstehende Evidenz)
- Dual Compliance Score (Self-Assessment + Verified Evidence)
- Coverage Summary pro Regulierung
- Full Compliance Assessment (EU Space Act, NIS2, Space Law)
- Module-by-Module Score Breakdown
- Entity Classification (NIS2)

#### API Key Management (5 Endpoints)

- CRUD für API Keys
- Scope-basierte Berechtigungen (read:compliance, write:compliance, etc.)

#### Webhooks (7 Endpoints)

- CRUD für Webhooks
- Delivery History & Retry

#### Registration/URSO (8 Endpoints)

- Registration CRUD
- COSPAR ID Generation
- CSV-Export für UNOOSA
- Submit to URSO

#### Document Generation (10 Endpoints)

- AI-gestützte NCA-Dokumentengenerierung
- Chunked Section Generation
- PDF Export
- Full NCA Package Generation

#### Cybersecurity (8 Endpoints)

- Assessment CRUD
- Requirements Management
- Framework Generation mit Gap Analysis

#### Sonstige (21 Endpoints)

- Contact Form, Demo Request
- Widget Configuration
- Spacecraft Registry

### API-Authentifizierung

- **Session-basiert:** NextAuth v5 (Browser)
- **API Key-basiert:** `/api/v1/*` Routes mit Scopes
- **Rate Limiting:** 7 Tiers (api, auth, registration, assessment, export, sensitive, supplier)

---

## 15. Sicherheitsfeatures

### Authentifizierung

| Feature            | Details                                    |
| ------------------ | ------------------------------------------ |
| Credentials Login  | Email + Passwort (bcrypt, 12 Rounds)       |
| Google OAuth       | NextAuth Provider                          |
| Enterprise SSO     | SAML 2.0, OIDC, Azure AD                   |
| WebAuthn/FIDO2     | Passkey-Registrierung & -Authentifizierung |
| MFA                | TOTP, SMS, Email OTP                       |
| Session Management | Concurrent Sessions, Revocation            |

### Sicherheitsschichten

| Schicht                | Implementierung                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| CSRF Protection        | Origin Header Validation + Double-Submit Cookie                   |
| Rate Limiting          | Upstash Redis Sliding Window (7 Tiers)                            |
| Brute Force Protection | 5 Login-Versuche / 15 Minuten, Event Logging                      |
| Bot Detection          | User-Agent Blocking + Honeypot Tokens + Timing Validation         |
| Encryption             | AES-256-GCM (scrypt Key Derivation) für sensible Felder           |
| Audit Trail            | SHA-256 Hash-Chain für forensische Integrität                     |
| Security Headers       | HSTS (2yr preload), X-Frame-Options DENY, CSP, Permissions-Policy |
| RBAC                   | 5 Rollen: OWNER, ADMIN, MANAGER, MEMBER, VIEWER                   |

### Datenschutz (DSGVO)

- Consent Tracking (Art. 6-7)
- Breach Reporting (Art. 33/34)
- Data Retention Cleanup (Cron)
- Right to Erasure (Cascading Deletes)

---

## 16. PDF-Reports (10 Typen)

| Report                        | Zweck                             |
| ----------------------------- | --------------------------------- |
| Audit Center Report           | Audit-Center-Ergebnisse           |
| Full Audit Trail              | Forensik, Compliance-Nachweis     |
| Authorization Application     | Formale NCA-Einreichung           |
| Compliance Certificate        | Compliance-Zertifikat für Partner |
| Compliance Summary            | Executive Summary (1 Seite)       |
| Debris Mitigation Plan        | Debris-Modul, NCA-Submission      |
| Insurance Compliance Report   | Versicherungs-Policy-Alignment    |
| NCA Annual Compliance Report  | Jahresbericht an NCA              |
| NCA Incident Report           | Art. 33/34 Breach Reporting       |
| NCA Significant Change Report | Art. 19 Wesentliche Änderungen    |

**Engine:** @react-pdf/renderer (Client-Side) + JSPdf (Fallback)

---

## 17. Email-System (6 Templates)

| Template              | Zweck                                   |
| --------------------- | --------------------------------------- |
| Deadline Reminder     | Regulatorische Frist-Erinnerungen       |
| Document Expiry       | Dokumenten-Ablauf-Warnungen             |
| Incident Alert        | Incident-Benachrichtigungen             |
| Supplier Data Request | Zulieferer-Portal-Einladungen           |
| Weekly Digest         | Wöchentliche Compliance-Zusammenfassung |
| Suspicious Login      | Sicherheitswarnung bei neuem Login      |

**Provider:** Resend (Primary) / Nodemailer SMTP (Fallback)

---

## 18. Cron-Jobs (14 Scheduled Tasks)

| Job                          | Schedule         | Zweck                                    |
| ---------------------------- | ---------------- | ---------------------------------------- |
| `deadline-reminders`         | Täglich 8:00 UTC | Frist-Erinnerungs-Emails                 |
| `document-expiry`            | Täglich 9:00 UTC | Dokumenten-Ablauf-Warnungen              |
| `generate-scheduled-reports` | Montags 6:00 UTC | Geplante Reports generieren              |
| `analytics-aggregate`        | Täglich          | Analytics-Daten aggregieren              |
| `churn-detection`            | Täglich          | ML-basierte Churn-Vorhersage             |
| `compliance-snapshot`        | Täglich          | Digital Twin Compliance-Snapshot         |
| `compute-rcr`                | Täglich          | Regulatory Credit Rating berechnen       |
| `compute-rrs`                | Täglich          | Regulatory Readiness Score berechnen     |
| `data-retention-cleanup`     | Wöchentlich      | DSGVO Data Retention Enforcement         |
| `demo-followup`              | Täglich          | Follow-up-Emails an Demo-Anfragen        |
| `nca-deadlines`              | Täglich          | NCA-spezifische Frist-Benachrichtigungen |
| `onboarding-emails`          | Täglich          | Onboarding-Email-Sequenzen               |
| `reengagement`               | Täglich          | Churn-Intervention & Win-back            |
| `regulatory-feed`            | Täglich          | Regulatorische Updates fetchen           |

---

## 19. Öffentliche Seiten & Content

### Hauptseiten

| Route         | Inhalt                                                                            |
| ------------- | --------------------------------------------------------------------------------- |
| `/`           | Landing Page (Hero, Features, Blog Showcase, How It Works, ASTRA, Ecosystem, ACE) |
| `/platform`   | Plattform-Übersicht                                                               |
| `/pricing`    | Pricing-Stufen und Pläne                                                          |
| `/about`      | Über Caelex                                                                       |
| `/contact`    | Kontaktformular                                                                   |
| `/demo`       | Demo anfordern                                                                    |
| `/security`   | Sicherheitsseite                                                                  |
| `/governance` | Governance-Information                                                            |
| `/logos`      | Brand Assets                                                                      |

### Content-Bereiche

| Bereich       | Routes                                                                                                  | Inhalt                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Blog          | `/blog`, `/blog/[slug]`                                                                                 | 30+ Artikel, Kategorien, Featured Posts, TOC, Related Posts |
| Guides        | `/guides`, `/guides/[slug]`                                                                             | Anleitungen mit Breadcrumbs                                 |
| Glossary      | `/glossary`, `/glossary/[term]`                                                                         | Fachbegriffe-Lexikon                                        |
| Resources     | `/resources`, `/resources/faq`, `/resources/timeline`, `/resources/glossary`, `/resources/eu-space-act` | FAQ, Timeline, Glossar, EU Space Act Deep-Dive              |
| Modules       | `/modules`, `/modules/[slug]`                                                                           | 8 Modul-Detailseiten                                        |
| Jurisdictions | `/jurisdictions`, `/jurisdictions/[slug]`                                                               | 10 Jurisdiktions-Profile                                    |
| Careers       | `/careers`, `/careers/[id]`, `/careers/apply`                                                           | Stellenangebote + Bewerbungsformular                        |

### Legal (DE + EN)

| Route               | Inhalt                    |
| ------------------- | ------------------------- |
| `/legal/impressum`  | Impressum (DE)            |
| `/legal/privacy`    | Datenschutzerklärung (DE) |
| `/legal/privacy-en` | Privacy Policy (EN)       |
| `/legal/terms`      | AGB (DE)                  |
| `/legal/terms-en`   | Terms of Service (EN)     |
| `/legal/cookies`    | Cookie-Richtlinie (DE)    |
| `/legal/cookies-en` | Cookie Policy (EN)        |

### Auth

| Route                 | Inhalt           |
| --------------------- | ---------------- |
| `/login`              | Login (NextAuth) |
| `/signup`             | Registrierung    |
| `/auth/mfa-challenge` | MFA-Challenge    |

---

## 20. SEO & Structured Data

### JSON-LD Schemas (10 Typen)

- Organization, WebSite, SoftwareApplication
- Article, BlogPosting, FAQPage
- BreadcrumbList, DefinedTermSet, DefinedTerm
- HowTo, Product

### Sitemap

- **300+ dynamische URLs**
- Static Pages (Priority 1.0 für Homepage)
- Module Pages (9 Module, Priority 0.9)
- Jurisdiction Pages (10 Jurisdiktionen, Priority 0.85)
- Blog Posts (dynamisch, Priority 0.7)
- Guides, Glossary, Comparison Pages, Legal, Assessment

### Breadcrumbs

- Visuelle Breadcrumbs + JSON-LD Schema
- Helper-Funktionen: Module, Jurisdiction, Blog, Guide, Glossary, Compare

### Middleware-gesteuert

- `X-Robots-Tag: noindex, nofollow` für `/api`, `/dashboard`, JSON-Dateien
- hreflang Alternate Links (DE/EN)

---

## 21. Datenbank-Schema (147 Modelle)

### Modell-Kategorien

| Kategorie                     | Modelle | Beispiele                                                                                     |
| ----------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| **Auth & Authorization**      | 5       | User, Account, Session, VerificationToken, MfaConfig                                          |
| **Multi-Tenancy**             | 3       | Organization, OrganizationMember, OrganizationInvitation                                      |
| **EU Space Act**              | 4       | ArticleStatus, ChecklistStatus, AuthorizationWorkflow, AuthorizationDocument                  |
| **Modul-Assessments**         | 12      | Debris-, Cybersecurity-, Insurance-, Environmental-Assessment + RequirementStatus             |
| **Weitere Regulierungen**     | 12      | NIS2, COPUOS, UK Space, US Regulatory, Export Control, Spectrum                               |
| **Incident Management**       | 7       | Incident, IncidentAsset, IncidentAttachment, IncidentNIS2Phase, NCASubmission                 |
| **Timeline & Deadlines**      | 4       | Deadline, MissionPhase, Milestone, SupervisionCalendarEvent                                   |
| **Documents & Vault**         | 6       | Document, DocumentAccessLog, DocumentComment, DocumentShare, DocumentTemplate                 |
| **Notifications**             | 3       | Notification, NotificationPreference, NotificationLog                                         |
| **Audit & Security**          | 9       | AuditLog (SHA-256), SecurityAuditLog, LoginAttempt, WebAuthnCredential, HoneyToken            |
| **Reporting**                 | 4       | ScheduledReport, ReportArchive, SupervisionReport, SupervisionConfig                          |
| **Spacecraft & Registration** | 5       | Spacecraft, SpaceObjectRegistration, RegistrationStatusHistory                                |
| **Billing**                   | 3       | Subscription, SubscriptionUsage, Invoice                                                      |
| **API & Integration**         | 4       | ApiKey, Webhook, WebhookDelivery, SSOConnection                                               |
| **AI (ASTRA)**                | 3       | AstraConversation, AstraMessage, GeneratedDocument                                            |
| **Analytics**                 | 6       | AnalyticsEvent, DailyAggregate, CustomerHealthScore, FeatureUsageDaily                        |
| **Data Privacy**              | 4       | UserConsent, BreachReport, ComplianceEvidence, ComplianceEvidenceDocument                     |
| **Digital Twin**              | 2       | ComplianceSnapshot, WhatIfScenario                                                            |
| **NCA Portal**                | 3       | NCADocument, NCADocPackage, NCASubmissionPackage                                              |
| **Engagement**                | 4       | StakeholderEngagement, NewsletterSubscription, DemoRequest, ChurnIntervention                 |
| **Assure Plattform**          | 35+     | AssureShareLink, AssureCompanyProfile, RCRBenchmark, InvestmentReadinessScore, AssureDataRoom |
| **Academy**                   | 7       | AcademyCourse, AcademyModule, AcademyLesson, AcademyQuestion, AcademyEnrollment               |
| **Finance & Data**            | 5       | FinancialEntry, RevenueSnapshot, AcquisitionEvent, RegulatoryUpdate                           |
| **Sonstiges**                 | 3       | Activity, WidgetConfig, ApiRequest                                                            |

---

## 22. Services-Layer (47 Services)

| Service                           | Zweck                                        |
| --------------------------------- | -------------------------------------------- |
| `academy-badge-service`           | Badge-System (Achievements, Completions)     |
| `ace-evidence-service`            | ACE für Authorization Workflows              |
| `activity-service`                | User Activity Logging                        |
| `api-key-service`                 | API Key Management (Create, Revoke, Rotate)  |
| `attestation`                     | Compliance-Attestierungen & Zertifizierungen |
| `audit-center-service`            | Zentrales Audit Trail Management             |
| `audit-export-service`            | Audit-Log-Export (PDF, JSON, CSV)            |
| `audit-package-service`           | Audit Records für Regulatory Submission      |
| `authorization-service`           | Authorization Workflow Orchestrierung        |
| `breach-notification-service`     | DSGVO Art. 33/34 Breach Reporting            |
| `churn-intervention-service`      | Customer Retention & Re-engagement           |
| `comment-service`                 | Echtzeit-Collaboration auf Dokumenten        |
| `compliance-scoring-service`      | Modul-/Org-weite Compliance Scores           |
| `compliance-twin-service`         | Digital Twin: Compliance-Spiegelung, What-If |
| `cross-regulation-alert-service`  | Multi-Jurisdictions-Alerting                 |
| `cross-regulation-service`        | Cross-Reference über 10 Jurisdiktionen       |
| `dashboard-analytics-service`     | Dashboard Metriken, Trends, Alerts           |
| `data-room`                       | Secure Document Vault                        |
| `document-completeness-service`   | Workflow-Readiness (Lücken, Blocker)         |
| `eurlex-service`                  | EUR-Lex Integration                          |
| `incident-autopilot`              | KI-Incident-Klassifizierung & NCA-Timeline   |
| `incident-notification-templates` | Incident Alert Templates                     |
| `incident-response-service`       | Incident Lifecycle Management                |
| `nca-correspondence-service`      | NCA Email/Message Tracking                   |
| `nca-portal-service`              | Multi-Jurisdiktions NCA-Portal               |
| `nca-submission-service`          | Regulatory Package Submission                |
| `notification-service`            | Multi-Channel Notifications                  |
| `onboarding-email-service`        | Welcome Sequence & Automation                |
| `operator-profile-service`        | Betreiber-Profil-Management                  |
| `organization-service`            | Multi-Tenant Org Management                  |
| `reengagement-service`            | Win-back Campaigns                           |
| `registration-service`            | Space Object Registration                    |
| `report-generation-service`       | PDF/JSON Report Generation                   |
| `report-scheduler-service`        | Scheduled Report Generation                  |
| `security-audit-service`          | Security Event Logging                       |
| `session-service`                 | Session Management                           |
| `spacecraft-service`              | Spacecraft Registry                          |
| `sso-service`                     | Enterprise SSO (SAML/OIDC)                   |
| `stakeholder-engagement`          | Stakeholder Communication Tracking           |
| `subscription-service`            | Stripe Billing Management                    |
| `supplier-outreach-service`       | Supplier Portal Einladungen                  |
| `webhook-service`                 | Custom Webhooks                              |
| `whatif-engine-bridge`            | ASTRA ↔ What-If Engine Bridge                |
| `whatif-simulation-service`       | Digital Twin Szenarien                       |

---

## 23. Regulatorische Datenbasis

### Daten-Dateien (31 Dateien, ~1.2 MB)

| Datei                           | Größe   | Inhalt                                 |
| ------------------------------- | ------- | -------------------------------------- |
| `articles.ts`                   | ~36 KB  | EU Space Act (67 Gruppen, 119 Artikel) |
| `nis2-requirements.ts`          | ~160 KB | NIS2 Directive (51 Requirements)       |
| `national-space-laws.ts`        | ~57 KB  | 10 Jurisdiktionen                      |
| `cybersecurity-requirements.ts` | ~131 KB | ISO 27001, NIST, ENISA Space Controls  |
| `copuos-iadc-requirements.ts`   | ~50 KB  | COPUOS/IADC Guidelines                 |
| `debris-requirements.ts`        | ~33 KB  | Orbital Debris Mitigation              |
| `enisa-space-controls.ts`       | ~65 KB  | ENISA Space Cybersecurity              |
| `environmental-requirements.ts` | ~37 KB  | Environmental Impact Assessment        |
| `insurance-requirements.ts`     | ~50 KB  | Launch/Operations Insurance            |
| `itar-ear-requirements.ts`      | ~71 KB  | US Export Control (ITAR, EAR)          |
| `spectrum-itu-requirements.ts`  | ~54 KB  | ITU Frequency Allocation               |
| `uk-space-industry-act.ts`      | ~43 KB  | UK Space Industry Act                  |
| `us-space-regulations.ts`       | ~65 KB  | FCC, FAA, NOAA                         |

### Referenz-Daten

- Module definitions & completion criteria
- Authorization document types
- National authorities catalog (29 NCAs)
- Regulation timeline (Phase-ins)
- Cross-references (EU Space Act ↔ NIS2 ↔ National Laws)
- Space benchmarks, risk templates, dataroom structures

---

## 24. Zusammenfassung — Zahlen & Fakten

### Plattform-Übersicht

| Bereich                    | Metric                                      |
| -------------------------- | ------------------------------------------- |
| **Gesamtseiten**           | 143 page.tsx (87 öffentlich + 56 Dashboard) |
| **React-Komponenten**      | 298 Dateien in 42 Verzeichnissen            |
| **API Endpoints**          | 87+ über 48 Route-Dateien                   |
| **Datenbank-Modelle**      | 147 Prisma Models, 108 Indices              |
| **Compliance-Engines**     | 8 regulatorische + 4 Scoring-Engines        |
| **Assessment-Wizards**     | 4 (EU Space Act, NIS2, Space Law, Unified)  |
| **Dashboard-Module**       | 13 Compliance-Module                        |
| **ASTRA KI-Tools**         | 35 spezialisierte Tools                     |
| **Services**               | 47 Business-Logic-Services (24.674 LOC)     |
| **PDF-Reports**            | 10 Typen                                    |
| **Email-Templates**        | 6 Typen                                     |
| **Cron-Jobs**              | 14 Scheduled Tasks                          |
| **Regulatorische Dateien** | 31 Dateien (~1.2 MB)                        |
| **Jurisdiktionen**         | 10 EU + UK + US                             |
| **EU Space Act Artikel**   | 119 (67 Gruppen)                            |
| **NIS2 Requirements**      | 51                                          |
| **NCAs im Katalog**        | 29 nationale Behörden                       |
| **Pricing-Stufen**         | 4 (Free → Enterprise)                       |
| **JSON-LD Schemas**        | 10 Typen                                    |
| **Sitemap-URLs**           | 300+                                        |
| **Unterstützte Sprachen**  | 4 (EN, DE, FR, ES)                          |
| **Portale**                | 3 (Stakeholder, Supplier, Assure)           |

### Was man mit Caelex machen kann (Zusammenfassung)

1. **Compliance bewerten** — 4 Assessment-Wizards für EU Space Act, NIS2, nationale Gesetze + Unified
2. **Compliance managen** — 13 Dashboard-Module für alle regulatorischen Bereiche
3. **KI-Compliance-Beratung** — ASTRA mit 35 Tools für Analyse, Dokumentation, Szenarien
4. **Dokumente generieren** — 16 NCA-Dokumenttypen, 10 PDF-Reports, AI-gestützt
5. **Behörden-Submissions** — NCA-Portal mit Multi-Jurisdictions-Support
6. **Incidents managen** — Autopilot mit NIS2 Art. 23 Workflow
7. **Digital Twin** — Echtzeit-Compliance-Status + What-If-Szenarien
8. **Investment Readiness** — Assure-Plattform mit IRS/RCR/RRS Scoring, Data Rooms
9. **Lernen & Schulen** — Academy mit Kursen, Simulationen, Classrooms
10. **Team-Kollaboration** — Multi-Tenant, RBAC, Comments, Activity Stream
11. **Externe Integrationen** — API v1, Webhooks, SSO, Widget
12. **Zulieferer-Management** — Supplier Portal für Environmental Data
13. **Stakeholder-Zugang** — Token-basiertes Portal für Investoren/Partner
14. **Automatisierte Überwachung** — 14 Cron-Jobs für Deadlines, Reports, Analytics
15. **Enterprise Security** — MFA, WebAuthn, SSO, Encryption, Audit Trail

---

_Ende des Funktions-Audits_
