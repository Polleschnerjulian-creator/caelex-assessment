# Caelex — Master Report 2026

**Stand:** 2026-05-01
**Zweck:** Komplettüberblick über das Caelex-Ökosystem — Plattform-Aufbau, Tech-Stack, Code-Tiefe, strategische Einordnung. **Verwertbar für ESA Business Innovation Anträge, Investor-Pitches, Behörden-Briefings.**
**Methodik:** Repo-weite Code-Analyse (252 Prisma-Models, 2619 TypeScript-Files, 9840 Zeilen Schema, 71 API-Domains) + strategische Konsolidierung aller bisherigen Konzept-Dokumente.

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Was Caelex ist — die Drei-Schicht-Realität](#2-was-caelex-ist--die-drei-schicht-realität)
3. [Das strategische Ziel](#3-das-strategische-ziel)
4. [Markt-Kontext: Europäische Raumfahrt-Compliance 2026](#4-markt-kontext-europäische-raumfahrt-compliance-2026)
5. [Tech-Stack — die Foundation](#5-tech-stack--die-foundation)
6. [Datenmodell — 252 Models, 132 Enums](#6-datenmodell--252-models-132-enums)
7. [Plattform 1: Caelex Comply](#7-plattform-1-caelex-comply)
8. [Plattform 2: Caelex Atlas](#8-plattform-2-caelex-atlas)
9. [Plattform 3: Caelex Pharos](#9-plattform-3-caelex-pharos)
10. [Plattform 4: Caelex Assure](#10-plattform-4-caelex-assure)
11. [Plattform 5: Caelex Academy](#11-plattform-5-caelex-academy)
12. [Querschnitts-Layer 1: Astra (AI-Engine)](#12-querschnitts-layer-1-astra-ai-engine)
13. [Querschnitts-Layer 2: Verity (Crypto-Trust)](#13-querschnitts-layer-2-verity-crypto-trust)
14. [Querschnitts-Layer 3: Sentinel (Telemetry-Evidence)](#14-querschnitts-layer-3-sentinel-telemetry-evidence)
15. [Querschnitts-Layer 4: Mission Control + Ephemeris](#15-querschnitts-layer-4-mission-control--ephemeris)
16. [Die Compliance-Engines (24 Engines)](#16-die-compliance-engines-24-engines)
17. [Multi-Actor-Modell — Operator + Counsel + Authority + Investor](#17-multi-actor-modell)
18. [Was Caelex einzigartig macht — die strategischen Moats](#18-was-caelex-einzigartig-macht)
19. [Bezug zu EU-Programmen + ESA-Strategie](#19-bezug-zu-eu-programmen--esa-strategie)
20. [Roadmap 2026-2028](#20-roadmap-2026-2028)
21. [Impact für europäische Raumfahrt](#21-impact-für-europäische-raumfahrt)
22. [Anhang: Repo-Statistiken](#22-anhang-repo-statistiken)

---

## 1. Executive Summary

### Was Caelex ist

Caelex ist eine **integrierte digitale Compliance-Infrastruktur für die europäische Raumfahrt-Industrie**. Sie verbindet vier Akteursgruppen — Satelliten-Operatoren, juristische Berater, regulatorische Behörden, und institutionelle Investoren — auf einer einzigen technischen Plattform mit kryptographisch verifizierbaren Audit-Trails, AI-gestützter Compliance-Automatisierung und vollständiger Abdeckung der EU-Space-Act-, NIS2-, COPUOS-, CRA- und nationalen Weltraumrechts-Regime.

Die Plattform besteht aus **fünf eigenständigen, aber miteinander verbundenen Sub-Plattformen**:

- **Caelex Comply** — Compliance-Management für Operatoren (Hauptprodukt)
- **Caelex Atlas** — Regulatory-Knowledge-Plattform für Counsel
- **Caelex Pharos** — Aufsichts- und Genehmigungs-Plattform für Authorities
- **Caelex Assure** — Due-Diligence-Plattform für Investoren
- **Caelex Academy** — Schulungs- und Simulations-Plattform für Lernende

Verbunden werden diese fünf Plattformen durch **vier Querschnitts-Layer**:

- **Astra** (AI-Engine mit 47+ Tools, EU-AI-Act-konform)
- **Verity** (RFC-6962-konforme Merkle-Trees mit Ed25519-Signaturen)
- **Sentinel** (Telemetry-zu-Evidence-Pipeline)
- **Mission Control + Ephemeris** (3D-Tracking + Orbital-Compliance-Forecast)

### Das strategische Ziel

> **Der einzige technische Layer der EU-Raumfahrt-Compliance über alle Akteure, alle Regulationen, alle Jurisdiktionen und alle Zeit-Horizonte mit kryptographischer Beweiskraft verbindet.**

Konkret: wenn 2034 ein Auditor fragt "war Sat-12 von Operator X am 15. März 2027 compliant nach den damals geltenden Regeln, basierend auf den damals vorliegenden Evidenz-Snapshots, mit den damals zuständigen Counsel- und Authority-Sign-offs?" — dann ist Caelex die einzige Plattform die diese Frage **mit kryptographischer Beweiskraft in Sekunden** beantworten kann.

### Die Zahlen

| Metrik                   | Wert                                                                                   | Bewertung                                                     |
| ------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Datenmodell**          | 252 Prisma Models · 132 Enums · 9840 Zeilen Schema                                     | Tiefste Compliance-Domain-Modellierung am Markt für Raumfahrt |
| **Code-Volumen**         | 2619 TypeScript-Files · 237 Test-Files · 110 server-only Engines                       | Production-grade Codebase, ~3 Personenjahre kumuliert         |
| **Compliance-Abdeckung** | 24 Engines · 119 EU-Space-Act-Articles · 51 NIS2-Reqs · 10 Jurisdiktionen              | Vollständigste Raumfahrt-Compliance-Engine in Europa          |
| **AI-Integration**       | 47+ Astra-Tools · 3 separate Astra-Instanzen (V1, V2, Pharos) · EU-AI-Act-Vorbereitung | Erste GRC-AI mit Hash-chained Decision-Logs                   |
| **Trust-Layer**          | RFC-6962 Merkle-Trees · Ed25519-Signaturen · Hash-Chain-AuditLog                       | Trillian-/Sigstore-Niveau, einzigartig im GRC-Markt           |
| **API-Surface**          | 71 API-Domains · 400+ Routes · 17 Cron-Jobs                                            | Plattform-grade Schnittstellen                                |
| **Multi-Tenant**         | Organization · OrganizationMember · 4 Aktor-Rollen · SSO/SAML                          | Enterprise-tauglich Day 1                                     |

### Die strategische Position

Caelex sitzt am Schnittpunkt von **drei strukturellen Trends** die zusammen einen ~€2-5 Mrd. addressable Markt in Europa bis 2030 ergeben:

1. **EU Space Act** (in Kraft 2024, Compliance-Pflichten ab 2026): erstmals harmonisierte Authorisierungs- und Cyber-Anforderungen für alle EU-Operatoren
2. **NIS2 Directive** (umgesetzt in DE 2025): Space-Sektor als "Essential Entity" mit Lieferketten-, Incident-Reporting- und Cyber-Pflichten
3. **EU AI Act** (in Kraft 02.08.2026): high-risk AI-Systeme müssen Logging, Transparenz, Human-Oversight strukturell erfüllen

Diese drei Verordnungen treffen auf eine Industrie die historisch unter-digitalisiert ist (Compliance läuft über Excel + Email + PDFs) und vor einem **digital divide** steht: entweder etablieren sich die richtigen Plattformen jetzt, oder die Industrie wird durch nicht-europäische Anbieter (Salesforce, ServiceNow, US-GRC-Tools) konsolidiert.

Caelex ist die **europäische Antwort** — sovereign, AI-Act-first, multi-actor, kryptographisch verifizierbar.

---

## 2. Was Caelex ist — die Drei-Schicht-Realität

Caelex ist nicht ein Produkt — es ist eine **Plattform-Architektur mit drei Schichten**:

### Schicht 1 — Die Sub-Plattformen (was Nutzer sehen)

Fünf eigenständige Web-Apps, jede mit eigener Domain-Logik und eigener Akteurs-Persona:

```
┌──────────────────────────────────────────────────────────────────┐
│  COMPLY  (Operatoren)                                            │
│    "Wir bauen, betreiben, operieren Satelliten."                 │
│    /dashboard/* · 153 Pages · 15 Compliance-Module               │
│    Hauptprodukt · 70% der Platform-Codebase                      │
├──────────────────────────────────────────────────────────────────┤
│  ATLAS  (Counsel + Compliance-Lawyers)                           │
│    "Wir beraten Operatoren rechtlich, kennen die Articles."      │
│    /atlas/* · Eigene Auth-Flow · 79 Files · LegalTech-fokus      │
│    Workspace · Cross-Reference · Citation-Validator              │
├──────────────────────────────────────────────────────────────────┤
│  PHAROS  (Authorities + NCAs)                                    │
│    "Wir sind die Aufsicht, prüfen, genehmigen, sanktionieren."   │
│    /pharos/* · Tabu-isoliert · 49 Files · Authority-fokus        │
│    Witness-Quorum · Differential-Privacy · Multi-Party-Approval  │
├──────────────────────────────────────────────────────────────────┤
│  ASSURE  (Investors + Insurers)                                  │
│    "Wir bewerten Operatoren, kalkulieren Risiken, geben Geld."   │
│    /assure/* · 70 Files · DD/Rating-fokus                        │
│    RRS-Score · RCR-Rating · Data-Room · Risk-Register            │
├──────────────────────────────────────────────────────────────────┤
│  ACADEMY  (Training + Simulation)                                │
│    "Wir lernen Compliance, bilden Teams aus."                    │
│    /academy/* · 19 Files · 8+ Courses · Simulation-Sandbox       │
│    Course-Catalog · Classroom · Badges · Scenario-Sims          │
└──────────────────────────────────────────────────────────────────┘
```

### Schicht 2 — Die Querschnitts-Layer (was alle nutzen)

Vier technische Layers die in jeder Sub-Plattform zum Einsatz kommen:

```
┌──────────────────────────────────────────────────────────────────┐
│  ASTRA  (AI Engine)                                              │
│    Anthropic Claude · 47+ Tools · 3 Instanzen (V1/V2/Pharos)     │
│    Tool-Use-Loop · Decision-Log · Citation-Aware                 │
├──────────────────────────────────────────────────────────────────┤
│  VERITY  (Cryptographic Trust)                                   │
│    RFC-6962 Merkle-Trees · Ed25519-STH · Hash-Chain-AuditLog    │
│    VerityAttestation · VerityCertificate · VerityIssuerKey      │
├──────────────────────────────────────────────────────────────────┤
│  SENTINEL  (Telemetry → Evidence)                                │
│    Hash-chained Evidence-Stream · Auto-Attestation               │
│    Cross-Verification · Witness-Quorum                           │
├──────────────────────────────────────────────────────────────────┤
│  MISSION CONTROL + EPHEMERIS  (Orbital Truth)                    │
│    3D-Globe (Three.js) · CelesTrak-TLE-Integration               │
│    What-If-Scenarios · Forecast-Engine · Conjunction-Tracking    │
└──────────────────────────────────────────────────────────────────┘
```

### Schicht 3 — Die Foundation (was im Untergrund läuft)

Postgres-DB-Schema mit 252 Models · 71 API-Domains · 24 Compliance-Engines · 17 Cron-Jobs · 110 server-only Files · Multi-Tenant + RBAC + Encryption-Layer.

### Wie alles zusammenhängt — das Caelex-Netzwerk

```
                         CAELEX NETWORK
                              │
        ┌─────────┬───────────┼───────────┬─────────┐
        │         │           │           │         │
     COMPLY    ATLAS       PHAROS      ASSURE    ACADEMY
        │         │           │           │         │
        └─────────┴───────────┼───────────┴─────────┘
                              │
                  Querschnitts-Layer
                  ASTRA · VERITY · SENTINEL · MISSION-CONTROL
                              │
                          Foundation
                  Postgres · Engines · API · RBAC
```

**Die Verbindungen sind nicht oberflächliche "API-Calls" — sie sind strukturell:**

- **Comply ↔ Atlas:** Counsel sieht die Workflows ihrer Mandanten (Comply) in ihrer Atlas-Workspace, kann inline auf ComplianceItems annotieren, QES-signen
- **Comply ↔ Pharos:** NCA-Submissions aus Comply landen in Pharos' Inbox; Pharos-Decisions fliessen zurück in Comply-Workflow-States; **gleiche Hash-Chain**
- **Comply ↔ Assure:** Investor sieht via Assure-DD-Package eine read-only-Sicht auf Comply's PostureSnapshot — mit Verity-Inclusion-Proof gegen Caelex's Master-Tree-Head
- **Comply ↔ Academy:** Scenarios + Courses sind aus realen ComplianceItems abgeleitet; Operator kann via Academy lernen wie Authorization-Submission funktioniert, dann das in Comply real durchführen
- **Atlas ↔ Pharos:** Norm-Anchoring (Atlas weiß welche Article-Versionen gelten, Pharos benutzt diese als Decision-Basis)
- **Astra über alle:** Eine AI-Engine, drei Personality-Profile (Operator-Astra, Counsel-Astra, Authority-Astra), gleicher Tool-Executor, gleicher Audit-Trail
- **Verity unter allem:** jede Plattform schreibt in dieselbe Hash-Chain (`AuditLog`); Verity-Attestations sind plattform-übergreifend

**Das Netzwerk-Gefühl:** Caelex ist nicht "fünf Apps die gleich aussehen". Es ist **ein semantisches System** in dem ein NIS2-Incident in Comply automatisch eine Counsel-Notification in Atlas auslöst, ein Submission-Filing-Event in Pharos triggert, ein Risk-Update in Assure und ein Lerninhalt in Academy verfügbar macht — alles über denselben Compliance-Graph mit derselben Hash-Chain.

---

## 3. Das strategische Ziel

### In einem Satz

> **Caelex baut die technische Infrastruktur für einen vertrauensvollen, transparenten und automatisierten Compliance-Layer der europäischen Raumfahrt — verifizierbar bis ins Jahr 2050+.**

### In drei Sätzen

> **(1)** Caelex transformiert Compliance von einer Excel-und-Email-Übung zu einem strukturierten, AI-automatisierten, kryptographisch beweisbaren digitalen Workflow. **(2)** Caelex verbindet die vier kritischen Akteure der Raumfahrt-Compliance (Operator, Counsel, Authority, Investor) auf einer Plattform mit gemeinsamer Hash-Chain. **(3)** Caelex erfüllt EU AI Act, NIS2, EU Space Act, DORA und CRA strukturell durch Design — nicht nachgereichte Compliance-Patches, sondern Foundation-Eigenschaften.

### Die fünf Sub-Ziele die das ergibt

**Ziel 1: Compliance-Fragmentation aufheben**
Heute laufen EU Space Act, NIS2, COPUOS, ITAR/EAR, ISO 27001, eIDAS in **separaten Excel-Sheets** in jeder Operator-Firma. Caelex aggregiert das in einen **einheitlichen Compliance-Graph** mit Cross-Regulation-Mappings. Aus N×M Mappings wird ein N-Topic-System.

**Ziel 2: Automatisierung der Routine-80%**
Die meisten Compliance-Aufgaben sind Routine: jährliche Re-Attestation, monatliche Status-Updates, deadline-getriebene Reminders, Document-Drafts. Caelex übernimmt die Routine-Automation, der Operator behält die Kontrolle über die Decision-20%.

**Ziel 3: Cross-Stakeholder-Trust ohne zentrale Trust-Anchor**
Heute braucht ein Operator manuelle Bestätigung von Counsel + Authority + Investor — meist per Email. Caelex baut die Trust-Bridge über eine gemeinsame Hash-Chain + Witness-Cosignatures + Verifiable Credentials — niemand muss niemandem vertrauen, alle können verifizieren.

**Ziel 4: Long-term Audit-Reconstruction**
Raumfahrt-Mission haben 10-30+ Jahre Lifecycle. Compliance-Reconstruction über solche Zeiträume ist heute praktisch unmöglich (Mitarbeiter weg, Software-Versionen geändert, Regulations geändert). Caelex baut **Bi-Temporal-Architektur** + **persistent Hash-Chain** für 30+ Jahre verifizierbare Compliance-History.

**Ziel 5: Sovereign EU-Stack**
US-Tools (Drata, Vanta, AuditBoard) dominieren das GRC-Segment globally — aber für **europäische Raumfahrt-Compliance mit Schrems-II-Datenresidenz, EU-AI-Act-Konformität, BSI-C5-Tauglichkeit** braucht es einen sovereign-EU-Stack. Caelex wird genau das.

### Was Caelex NICHT will

- **Kein global GRC-Tool** — Caelex ist domain-spezifisch (Raumfahrt) statt branchen-generisch (alle GRC-Bedarfe).
- **Kein Enterprise-Resource-Planning** — Caelex ist Compliance-Layer, nicht Mission-Management oder Engineering-Tool.
- **Kein PR/Marketing-Vehikel** — Compliance ist Pflicht, nicht Choice. Caelex sells trust, not vibes.
- **Kein Closed-Source-Monolith** — ATLAS-Source-Module (Articles, Frameworks) sind potentiell open-sourceable. Daten sind Industrie-Asset, nicht Caelex-Asset.

---

## 4. Markt-Kontext: Europäische Raumfahrt-Compliance 2026

### Der regulatorische Sturm

Die europäische Raumfahrt-Industrie steht 2024-2027 vor einer **regulatorischen Verdichtung** ohnegleichen:

| Regulation                                | In Kraft    | Pflichten greifen | Caelex-Relevanz                                                                          |
| ----------------------------------------- | ----------- | ----------------- | ---------------------------------------------------------------------------------------- |
| **EU Space Act** (Reg. 2024)              | 2024        | 2026              | 119 Articles, applicable je nach Operator-Profil — Caelex's Kern-Engine                  |
| **NIS2 Directive** (EU 2022/2555)         | 2025        | 2025-2026         | Space-Sektor als "Essential Entity", Caelex Engine für Klassifikation + 51 Anforderungen |
| **EU AI Act** (Reg. 2024/1689)            | 02.02.2025  | 02.08.2026        | Astra V2 = high-risk AI System, Caelex muss + erfüllt strukturell                        |
| **DORA** (Reg. 2022/2554)                 | 17.01.2025  | 17.01.2025        | Bei Insurance-/Investor-Kunden: ICT-Third-Party-Pflichten für Caelex                     |
| **Cyber Resilience Act** (Reg. 2024/2847) | 2024        | 11.12.2027        | Caelex-Widget + MCP-Server fallen unter Pflichten                                        |
| **eIDAS 2.0** (Reg. 2024)                 | 2024        | 2026-2028         | EUDIW-Mandatory-Acceptance, W3C VC für Cross-Border                                      |
| **National Space Laws**                   | individuell | 2024-2028         | 10 Jurisdiktionen mit eigenen Authorisierungs-Verfahren                                  |

### Die strukturelle Lücke

Die gesamte EU-Raumfahrt-Industrie (~700 Unternehmen, ~50.000 Beschäftigte, ~€8 Mrd. Umsatz/Jahr) muss diese Verordnungen **gleichzeitig** umsetzen — mit **null** spezialisierten Tools für Raumfahrt-Compliance heute.

**Was es heute gibt:**

- US-GRC-Tools (Drata, Vanta, Secureframe) — generic, nicht raumfahrt-spezifisch, US-hosted (Schrems-II-Probleme)
- ERP-/Document-Management (Microsoft, SAP) — kein Compliance-Domain-Wissen
- Excel + SharePoint + Email — Status quo bei 80%+ der Operatoren

**Was es nicht gibt (= Caelex-Opportunity):**

- Raumfahrt-spezifische Compliance-Engines mit EU-Space-Act-, NIS2-Space-Sector-, COPUOS-Wissen
- Multi-Stakeholder-Plattform (Operator + Counsel + Authority + Investor)
- Sovereign EU-hosted, AI-Act-konform, kryptographisch verifizierbar
- Cross-Regulation-Crosswalks für Raumfahrt

### Wettbewerbs-Landschaft

| Anbieter                             | Stärke                                                                       | Schwäche für Raumfahrt-EU                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Drata, Vanta** (US-Series-C, $2B+) | Mature GRC-Automation, 100+ Frameworks                                       | Kein Raumfahrt-Wissen, US-hosted, kein Multi-Actor, kein Pharos-Equivalent |
| **Hyperproof** (US-Mid-Stage)        | Crosswalk-Engine, SCF-basiert                                                | Kein Domain-Wissen, kein Authority-Layer                                   |
| **Anecdotes** (US-Early)             | Compliance-as-Data-Approach, Agentic AI                                      | Keine Raumfahrt-Domain, kein Verity-Equivalent                             |
| **OneTrust** (US-Late, IPO-Path)     | Privacy + GRC umfassend                                                      | Marketing-Fokus, kein Engineering-Stack-Approach                           |
| **AuditBoard, Hadrian**              | Public-Co + neue Spieler                                                     | Generic, kein Sovereign-EU-Angle                                           |
| **DLR-Compliance-Tools** (intern)    | Behörden-Anbindung                                                           | Geschlossen, kein Operator-Angebot                                         |
| **Caelex**                           | Raumfahrt-Engines + Multi-Actor + Sovereign-EU + AI-Act-First + Crypto-Trust | Frühphase, Adoption-Aufgabe                                                |

### Marktgröße Schätzung

| Segment                      | Anzahl Targets                       | ARR-Potential  | Ergebnis           |
| ---------------------------- | ------------------------------------ | -------------- | ------------------ |
| EU-Operatoren (Tier-1)       | ~80 große Operatoren (>50 MA)        | €50-150k/Jahr  | €4-12M ARR         |
| EU-Operatoren (Tier-2)       | ~250 mittlere Operatoren             | €15-50k/Jahr   | €4-12M ARR         |
| EU-Operatoren (Tier-3)       | ~400 Klein-Operatoren + Sub-Provider | €5-15k/Jahr    | €2-6M ARR          |
| Counsel-Kanzleien            | ~30 spezialisierte (Atlas)           | €30-100k/Jahr  | €1-3M ARR          |
| Authorities (Pharos-Pilots)  | ~15 NCAs + ESA + EUSPA               | €100-500k/Jahr | €1.5-7.5M ARR      |
| Investoren (Assure)          | ~50 PE/VC mit Space-Exposure         | €20-50k/Jahr   | €1-2.5M ARR        |
| **Total Addressable Market** |                                      |                | **€13.5M-43M ARR** |

Plus **upside durch Plattform-Effekte** (Cross-Sell zwischen Sub-Plattformen, Network-Effects bei Cross-Stakeholder-Adoption).

---

## 5. Tech-Stack — die Foundation

### Core-Stack

| Layer             | Technologie                                     | Begründung                                               |
| ----------------- | ----------------------------------------------- | -------------------------------------------------------- |
| **Framework**     | Next.js 15 (App Router)                         | Server Components, Server Actions, Edge-Runtime-Optionen |
| **Sprache**       | TypeScript (strict mode)                        | Type-Safety als Entwicklungs-Foundation                  |
| **Datenbank**     | PostgreSQL via Neon (Serverless)                | Mature, Open-Source, EU-Region-pinning, 30-Jahres-Bet    |
| **ORM**           | Prisma 5.22                                     | Type-safe Schema-First, 252 Models, 481 Indices          |
| **Auth**          | NextAuth v5 + SAML/OIDC + WebAuthn/MFA + Bcrypt | Enterprise-tauglich Day 1                                |
| **Payments**      | Stripe (Checkout + Portal + Webhooks + Connect) | Industry-Standard                                        |
| **Storage**       | Cloudflare R2 / S3-compatible (AWS SDK)         | EU-Region-pinning, S3-API-kompatibel                     |
| **AI**            | Anthropic Claude (claude-sonnet-4-6)            | Best-in-class für Tool-Use + Reasoning                   |
| **Rate Limiting** | Upstash Redis (Sliding Window, 19 Tiers)        | EU-Region, Serverless                                    |
| **Encryption**    | AES-256-GCM (scrypt KDF)                        | Per-Field-Encryption für VAT, Bank-IDs, Policy-Numbers   |
| **Email**         | Resend (primary) + Nodemailer SMTP (fallback)   | EU-konform, Free-Tier-tauglich                           |
| **PDF**           | @react-pdf/renderer (Client) + jsPDF (Server)   | Multi-Mode für 8+ Report-Types                           |
| **3D**            | Three.js (@react-three/fiber)                   | Mission-Control + Landing-Animation                      |
| **Charts**        | Recharts                                        | Dashboard-Analytics                                      |
| **Drag-Drop**     | @dnd-kit                                        | Modern, accessible                                       |
| **Satellite**     | satellite.js                                    | Orbital Mechanics                                        |
| **Animations**    | Framer Motion                                   | UX-Polish                                                |
| **Icons**         | Lucide React                                    | Consistent, tree-shakeable                               |
| **Validation**    | Zod                                             | Schema-First Input-Validation                            |
| **Styling**       | Tailwind CSS (dark mode)                        | Utility-first, performant                                |
| **Testing**       | Vitest + Playwright + MSW                       | Multi-tier (Unit/Integration/E2E)                        |
| **CI/CD**         | GitHub Actions + Husky + Vercel Auto-Deploy     | Modern DevOps                                            |
| **Monitoring**    | Sentry + LogSnag + Vercel Analytics             | Production-grade Error-Tracking                          |

### Stack-Charakteristika

**Sovereign-Ready durch Design:**

- Postgres + Prisma — 30-Jahres-Bet auf Open-Source-Foundation, kein Vendor-Lock
- Neon — Serverless aber EU-Region-konfigurierbar
- Cloudflare R2 — S3-API-kompatibel, Multi-Region-fähig
- Anthropic Claude — direkter API heute, Migrations-Pfad zu AWS Bedrock EU für DSGVO-Schrems-II-Konformität
- AWS European Sovereign Cloud (Brandenburg, GA seit 15.01.2026) als Zukunfts-Option

**Performance + Scale:**

- 481 Prisma-Indices auf 252 Models = optimiert für Read-Heavy-Workloads
- Server-only Files (110 Stück, `*.server.ts`) garantieren Tree-Shaking + niemals client-bundled
- Rate-Limiting in 19 Tiers verhindert Abuse + DoS

**Security-First:**

- AES-256-GCM mit scrypt-KDF für sensible Felder
- Per-Tenant Encryption-Keys (derived from Org-ID + Master-Key)
- Audit-Hash-Chain (SHA-256) — tamper-evident Audit-Trail
- Bcrypt 12 rounds für Password-Hashing
- CSP, HSTS (2yr preload), X-Frame-Options DENY

**Test-Coverage:**

- 237 Test-Files (Unit/Integration/Contract/E2E + Accessibility + Visual-Regression)
- Vitest + MSW für API-Mocking
- Playwright für E2E
- Stryker für Mutation-Testing

---

## 6. Datenmodell — 252 Models, 132 Enums

Das Prisma-Schema ist **9840 Zeilen lang** mit 252 Models und 132 Enums. Es ist **die Quelle der Wahrheit über das gesamte Caelex-Domain**. Hier die strukturelle Gruppierung:

### Domain 1: Multi-Tenancy + Auth (15+ Models)

```
User · Account · Session · VerificationToken · UserConsent · UserSession ·
PasswordResetToken · MfaConfig · WebAuthnCredential · LoginAttempt · LoginEvent
SecurityAuditLog · HoneyToken · HoneyTokenTrigger ·
Organization · OrganizationMember · OrganizationInvitation · SSOConnection
```

**Eigenschaften:**

- Multi-Tenant von Anfang an (kein Patch-Job)
- 4 Multi-Actor-Rollen vorgesehen (Operator/Counsel/Authority/Investor)
- Enterprise-Auth Day 1 (SAML, SCIM-vorbereitet, MFA, WebAuthn/FIDO2)
- Honey-Token + Anomaly-Detection als intrinsische Sicherheits-Layer

### Domain 2: Spacecraft + Operatoren-Profil (8+ Models)

```
Spacecraft · OperatorEntity · EntityDependency · SpaceObjectRegistration ·
RegistrationStatusHistory · RegistrationAttachment ·
Asset · AssetRequirement · AssetDependency · AssetSupplier ·
AssetVulnerability · AssetPersonnel
```

**Eigenschaften:**

- Granulare Asset-Modellierung (Spacecraft + Sub-Komponenten + Personal + Supplier)
- Dependency-Graph zwischen Entities (NIS2-Lieferketten-Pflicht erfüllbar)
- Vollständige Mission-Lifecycle-Modellierung

### Domain 3: Compliance-Assessments (12 Models pro Regulation)

Pro Regulation jeweils ein `*Assessment` + `*RequirementStatus`-Pair:

```
DebrisAssessment + DebrisRequirementStatus
CybersecurityAssessment + CybersecurityRequirementStatus
NIS2Assessment + NIS2RequirementStatus
CRAAssessment + CRARequirementStatus
InsuranceAssessment + InsurancePolicy
EnvironmentalAssessment + EnvironmentalImpactResult
CopuosAssessment + CopuosGuidelineStatus
UkSpaceAssessment + UkRequirementStatus
UsRegulatoryAssessment + UsRequirementStatus
ExportControlAssessment + ExportControlRequirementStatus
SpectrumAssessment + SpectrumRequirementStatus
```

**= 22 Models für Compliance-Assessments quer durch die Regulationen.**

### Domain 4: Authorization Workflow (3 Models)

```
AuthorizationWorkflow · AuthorizationDocument · ArticleStatus · ChecklistStatus
```

**Eigenschaften:**

- State-Machine-tauglich (`status` + `version` für Optimistic-Locking)
- Document-Lifecycle granular getrackt
- Article-Tracker auf 119 EU-Space-Act-Articles

### Domain 5: Incident + Supervision (10+ Models)

```
Incident · IncidentAsset · IncidentAttachment · IncidentNIS2Phase
SupervisionConfig · SupervisionReport · SupervisionCalendarEvent
ScheduledReport · ReportArchive · BreachReport
```

**Eigenschaften:**

- NIS2-konforme 24h/72h/30d-Phase-Tracking
- Incident-Asset-Mapping für Forensic-Trace
- Scheduled-Reports für regulatory-deliveries

### Domain 6: NCA-Submissions (5+ Models)

```
NCASubmission · NCACorrespondence · SubmissionPackage ·
NCADocPackage · NCADocument
```

**Eigenschaften:**

- Vollständiger Submission-Lifecycle (Draft → Sent → Acknowledged → Approved/Rejected/Resubmit)
- Resend-Tracking für historische Abfolgen
- Status-History als JSON-Stream

### Domain 7: Documents + Evidence (8+ Models)

```
Document · DocumentAccessLog · DocumentComment · DocumentShare · DocumentTemplate
GeneratedDocument · ComplianceEvidence · ComplianceEvidenceDocument ·
EvidenceRequirementMapping
```

**Eigenschaften:**

- Document-Lifecycle mit Sharing + Audit-Logs
- Evidence-zu-Requirement-Mapping (Crosswalk-Engine-vorbereitet)
- Generated-Documents (Astra-driven)

### Domain 8: Notifications + Deadlines (6+ Models)

```
Notification · NotificationLog · NotificationPreference ·
Deadline · MissionPhase · Milestone
```

### Domain 9: Astra (V1 + V2 + Pharos)

```
AstraConversation · AstraMessage  (V1, all-platforms)
V2AstraConversation · V2AstraConversationMessage  (V2, comply-isolated)
AstraProposal  (V2 Trust-Layer)
ComplianceItemSnooze · ComplianceItemNote · V2PostureSnapshot  (V2 helpers)
```

**Eigenschaften:**

- Drei separate Astra-Welten (V1/V2/Pharos) für Isolation
- Trust-Layer via AstraProposal (Phase-1-Implementation done)
- Conversation-Persistence mit Auto-Summarize

### Domain 10: Verity (Crypto-Trust-Layer)

```
VerityAttestation · VerityCertificate · VerityCertificateClaim · VerityPassport
VerityP2PRequest · VerityAuditChainEntry · VerityIssuerKey
VerityLogLeaf · VerityLogSTH
```

**Eigenschaften:**

- **VerityLogLeaf + VerityLogSTH = RFC-6962-konforme Merkle-Tree-Logs mit Ed25519-STH** — das ist Trillian-/Sigstore-Niveau, weltweit erste GRC-Plattform die das implementiert
- Multi-Issuer-Key-Management
- P2P-Verifikation für externe Verifier

### Domain 11: Sentinel (Telemetry-Evidence)

```
SentinelAgent · SentinelPacket · CrossVerification ·
SatelliteComplianceState · SatelliteComplianceStateHistory
```

**Eigenschaften:**

- Hash-chained Evidence-Stream
- Cross-Verification von Telemetry-Sources
- Compliance-State derived from physical telemetry

### Domain 12: Mission Control + Ephemeris

```
EphemerisForecast · SatelliteAlert · OrbitalData · SolarFluxRecord
SpaceWeatherEvent · OptimizationResult · ConjunctionEvent · CDMRecord
CAEscalationLog · CAConfig
```

**Eigenschaften:**

- Vollständige Orbital-Forecast-Pipeline
- Space-Weather + Conjunction-Event-Tracking
- Optimization-Engine (Regulatory-Arbitrage-Vorschläge)

### Domain 13: Atlas (Counsel-Plattform)

```
AtlasSourceCheck · AtlasSourceCheckHistory · AtlasPendingSourceCandidate
AtlasBookmark · AtlasResearchEntry · AtlasUpdate
AtlasAnnotation · AtlasAlertSubscription · AtlasNotification
AtlasWorkspace · AtlasWorkspaceCard ·
NormAnchor · NormDriftAlert
```

**Eigenschaften:**

- Source-Checking-Pipeline (validiert Articles bei Atlas-Updates)
- Workspace-Konzept für Counsel-Arbeit (mit Cards für Notes, Annotations, Cross-Refs)
- Norm-Anchoring für Pharos-Authority-Decision-Basis

### Domain 14: Pharos (Authority-Plattform)

```
AuthorityProfile · OversightRelationship · OversightAccessLog
WorkflowCase · WorkflowTransition · ApprovalRequest · ApprovalSignature
PharosWebhookEndpoint · PharosWebhookInvocation
```

**Eigenschaften:**

- Multi-Authority-Modellierung (BAFA, BNetzA, EUSPA, FCC, etc.)
- Oversight-Relationships mit Access-Logs
- Multi-Party-Approval-Workflows + Webhook-Integration

### Domain 15: Assure (Investor-DD-Plattform)

```
AssureRisk · AssureMaterial · AssureMilestone
AssureDataRoom · AssureDataRoomLink · AssureDataRoomView · AssureDataRoomDocument
RegulatoryReadinessScore (RRS) · RegulatoryCreditRating (RCR)
RCRBenchmark · RCRAppeal · RRSSnapshot · InvestmentReadinessScore
AssureCompanyProfile + 5 weitere Profile-Models
AssureDDPackage · AssureShareLink
```

**= ~25 Models für Investor-DD/Rating-Domain.**

### Domain 16: Academy (Training)

```
AcademyCourse · AcademyModule · AcademyLesson · AcademyQuestion
AcademyEnrollment · AcademyLessonCompletion
AcademyClassroom · AcademyBadge · AcademySimulationRun
```

### Domain 17: Hub (Project Management)

```
HubProject · HubProjectMember · HubTask · HubTaskComment
HubLabel · HubTaskLabel · HubTimeEntry · HubCalendarEvent
```

### Domain 18: Hazard + Shield (Risk-Tracking)

```
HazardEntry · HazardMitigation · HazardReportVersion
LegalMatter · LegalMatterInvitation · MatterTask · MatterArtifact
MatterConversation · MatterConversationMessage · MatterNote · LegalMatterAccessLog
```

### Domain 19: Ontology + Cross-References

```
OntologyNode · OntologyEdge · OntologyVersion ·
RegulatoryRequirement · CrossVerification
```

**Eigenschaften:**

- Versionierte Ontology (Caelex's eigenes Domain-Modell)
- Cross-Regulation-Crosswalks vorbereitet

### Domain 20: API + Webhooks

```
ApiKey · WidgetConfig · ApiRequest · Webhook · WebhookDelivery
```

### Domain 21: Analytics + Operations

```
AnalyticsEvent · AnalyticsDailyAggregate · CustomerHealthScore
FinancialEntry · RevenueSnapshot · FeatureUsageDaily · AcquisitionEvent
SystemHealthMetric · ApiEndpointMetrics · ChurnIntervention ·
NewsletterStatus · ProcessedStripeEvent
```

### Schema-Charakteristika

- **Hash-chained Audit:** `AuditLog` mit `previousHash` + `entryHash` für tamper-evident Audit-Trail
- **Encrypted Fields:** AES-256-GCM auf VAT-IDs, Bank-Accounts, Tax-IDs, Policy-Numbers
- **Multi-Tenant:** `organizationId` auf praktisch jedem Model
- **Versioning:** `version`-Felder für Optimistic-Locking auf workflow-relevanten Models
- **Soft-Delete:** `archivedAt` auf relevanten Models statt hard-delete
- **JSON-Felder:** für Status-History, Decision-Logs, Workflow-Context, Astra-Tool-Calls
- **Indices:** 481 Indices für Read-Performance bei Compliance-Queries

---

## 7. Plattform 1: Caelex Comply

**Hauptprodukt der Plattform.** Compliance-Management für Satelliten-Operatoren.

### Scope

15 Compliance-Module + 4 Assessment-Wizards + 17 Cron-Jobs + Astra V2-Integration + Mission-Control + Ephemeris + Sentinel-Anbindung.

### Routes (153 Pages)

```
src/app/dashboard/                         (153 Pages, 25+ Sub-Domains)
  /posture                                 Compliance-Command-Center (V2)
  /today                                   Mercury-Style-Inbox (V2)
  /triage                                  Linear-Style-Triage (V2)
  /proposals                               AstraProposal-Trust-Layer (V2)
  /astra-v2                                V2 Astra-Chat
  /items/[regulation]/[rowId]              ComplianceItem-Detail (V2)

  /modules/authorization                   EU Space Act Authorization
  /modules/cybersecurity                   Cyber + NIS2 Workflow
  /modules/copuos                          COPUOS/IADC Compliance
  /modules/cra                             Cyber Resilience Act
  /modules/debris                          Space Debris (Astrum)
  /modules/environmental                   Environmental Compliance
  /modules/export-control                  ITAR/EAR + EU Dual-Use
  /modules/insurance                       Insurance Coverage
  /modules/nis2                            NIS2 Detail-View
  /modules/registration                    Space Object Registration
  /modules/spectrum                        ITU Frequency Coordination
  /modules/supervision                     Operator-Supervision
  /modules/uk-space                        UK Space Industry Act
  /modules/us-regulatory                   FCC/FAA Compliance
  /modules/digital-twin                    Compliance Digital Twin

  /mission-control                         3D Globe (Three.js)
  /ephemeris                               Compliance Forecasting
  /ephemeris/[noradId]                     Per-Satellite Detail
  /sentinel                                Telemetry Audit-Stream

  /audit-center                            Audit-Trail Browser
  /tracker                                 EU-Space-Act Article-Tracker
  /timeline                                Mission Timeline + Deadlines
  /optimizer                               Regulatory Arbitrage

  /network                                 Stakeholder Network
  /network/legal                           Legal Matters
  /network/legal-counsel                   Counsel Engagement
  /network/oversight                       Authority Engagement
  /network/data-room                       Cross-Stakeholder Data-Sharing
  /network/inbox                           Network-Communication

  /nca-portal                              NCA-Submission Pipeline
  /nca-portal/submissions                  Submitted Items
  /nca-portal/packages                     Package-Builder

  /documents                               Document Vault
  /documents/generate                      AI-Document-Generation Studio
  /generate                                Document Studio (V1)
  /verity                                  Verity Certificate Browser
  /verity/snapshots                        Verity Snapshots
  /shield                                  Risk Decision Engine
  /hub                                     Project Management
  /hub/calendar, /hub/tasks, etc.

  /hazards                                 Hazard Tracking
  /incidents                               Incident Management (NIS2)
  /regulatory-feed                         Atlas Update Feed
  /nexus                                   Cross-Stakeholder Hub

  /admin                                   Admin Panel
  /admin/analytics                         CEO Dashboard (6 Tabs)
  /admin/users                             User Management
  /admin/organizations                     Org Management
  /admin/atlas-updates                     Atlas Curation
  /admin/atlas-discoveries                 Source-Discovery
  /admin/atlas-amendments                  Atlas Amendments
  /admin/audit                             Admin Audit-Logs
  /admin/bookings                          Demo-Bookings
  /admin/contact-requests                  Contact-Form-Submissions
  /admin/crm                               Customer-Relations

  /settings                                User Settings
  /settings/billing                        Subscription Management
  /settings/api-keys                       API Key Management
  /settings/security-log                   Security Audit
  /settings/ui                             UI Preferences (V2-Toggle)
  /settings/widget                         Embeddable Widget Config
```

### API-Domains (50+ aus 71 total)

```
academy · admin · analytics · assessment · assure · astra · audit · audit-center
auth · authorization · careers · contact · copuos · cra · cron · cybersecurity
dashboard · debris · demo · digital-twin · documents · environmental · export-control
generate2 · hazards · health · indexnow · insurance · invitations · legal
legal-engagements · missions · nca · nca-portal · network · newsletter · nexus
nis2 · notifications · onboarding · ontology · organization · organizations
pharos · public · registration · regulatory-feed · reports · satellites · security
sessions · shield · space-law · spectrum · sso · stakeholder · stripe · supervision
supplier · timeline · tracker · uk-space · unified · us-regulatory · user · v1 · widget
```

### Compliance-Module Details

| Modul              | Scope                                                      | Engine-File                                                |
| ------------------ | ---------------------------------------------------------- | ---------------------------------------------------------- |
| **Authorization**  | EU Space Act 119 Articles, 7 Operator-Types, 9 Sub-Modules | `engine.server.ts`                                         |
| **Cybersecurity**  | NIS2 + ENISA Space-Sector + 3418 LoC requirements          | `cybersecurity-engine.server.ts`                           |
| **NIS2**           | Essential/Important Klassifikation, 51 Anforderungen       | `nis2-engine.server.ts` + `nis2-auto-assessment.server.ts` |
| **CRA**            | Cyber Resilience Act Class I/II + Notified-Body            | `cra-engine.server.ts` + `cra-rule-engine.server.ts`       |
| **Debris**         | COPUOS-Mitigation + IADC + ESA Standards                   | `copuos-engine.server.ts`                                  |
| **Environmental**  | EU Space Act Environmental Impact                          | (in module data)                                           |
| **Export-Control** | ITAR + EAR + EU 2021/821 Dual-Use                          | `export-control-engine.server.ts`                          |
| **Insurance**      | Liability Coverage, EU Space Act Article 14                | (in module data)                                           |
| **Registration**   | UN Registration Convention + nationale                     | (in module data)                                           |
| **Spectrum**       | ITU Radio Regulations + nationale                          | `spectrum-engine.server.ts`                                |
| **Supervision**    | Operator-Aufsichts-Konfiguration                           | (in module data)                                           |
| **UK Space**       | UK Space Industry Act 2018                                 | `uk-space-engine.server.ts`                                |
| **US Regulatory**  | FCC + FAA + Commercial-Space-Act                           | `us-regulatory-engine.server.ts`                           |
| **Digital Twin**   | Daily Snapshots + What-If-Scenarios                        | (compliance-twin-service.ts)                               |
| **Evidence**       | Cross-Module-Evidence-Mapping                              | (evidence-mapping.ts)                                      |

### V1 vs V2 Cutover

V2 ist seit Phase 3 Day 2 (Commit `495a0c9b`) der **Default für alle Comply-Nutzer**. V1 lebt im Repo als V1DashboardClient als Emergency-Fallback. Switch-Toggle in `/dashboard/settings/ui`.

V2 fügt hinzu:

- Posture-Command-Center
- Mercury-Today-Inbox
- Linear-Triage
- AstraProposal Trust-Layer (Phase 1)
- Cmd-K Command-Palette
- Density-Toggle (Bloomberg-Tight bis Linear-Cozy)
- Palantir-Aesthetic (RFC-6962-Cosignature-Style)

### Astra V2 Integration

Comply V2 hat **isolierte Astra-Engine** in `src/lib/comply-v2/astra-engine.server.ts`:

- 5 Tools (snooze, unsnooze, addNote, markAttested, requestEvidence)
- AstraProposal-Trust-Layer für `requiresApproval: true`-Actions
- Decision-Log + Reasoning-Chain
- V2AstraConversation-Persistence

### Cron-Jobs (Comply-relevant)

```
compliance-snapshot           Daily 01:00   Digital Twin
analytics-aggregate           Daily 02:00   Dashboard-Metrics
data-retention-cleanup        Daily 03:00   GDPR-Cleanup
solar-flux-polling            Daily 04:00   Space-Weather
celestrak-polling             Daily 05:00   Orbital-Data
ephemeris-daily               Daily 06:00   Compliance-Forecast
deadline-reminders            Daily 08:00   Email-Reminders
document-expiry               Daily 09:00   Document-Lifecycle
generate-scheduled-reports    Mon 06:00     Weekly Reports
regulatory-feed               Daily 07:00   Atlas-Update-Feed
compute-rrs                   Daily 07:00   Assure-RRS-Score
compute-rcr                   Daily 07:30   Assure-RCR-Rating
nca-deadlines                 Daily 07:20   NCA-Submission-Reminders
cra-deadlines                 Daily 08:30   CRA-Specific-Reminders
posture-snapshot              Daily 00:30   V2 Posture Snapshot (NEW)
comply-v2-lifecycle           Daily 02:30   V2 Lifecycle (NEW)
```

---

## 8. Plattform 2: Caelex Atlas

**Counsel-Plattform für regulatorische Recherche und Compliance-Beratung.**

### Scope

Multi-tenant Workspace-System für Compliance-Anwälte. Ähnlich wie Notion + LegalTech-Tools, aber spezifisch auf EU-Raumfahrt-Recht zugeschnitten.

### Routes

```
src/app/(atlas)/atlas/        (separate Auth-Flow, eigene Domain)
  Wahrscheinlich Sub-Routes für:
  - Workspaces
  - Articles + Cross-References
  - Notifications + Alerts
  - Source-Discovery
```

### Files

**79 Files** unter `src/lib/atlas/` und `src/app/(atlas)/`:

```
Lib-Module (24+):
  forecast-engine.ts                Predictive analytics für Regulatory-Changes
  atlas-tool-executor.ts            Astra-Tool-Executor für Atlas
  atlas-tools.ts                    Tool-Definitions
  citation-validator.ts             Citation-Quality-Check
  citations.ts                      Citation-Management
  feed-parser.ts                    Regulatory-Feed-Parsing (EUR-Lex, OJ)
  redline.ts                        Document-Redline-Comparison
  notify.ts                         Notification-Generator
  verbatim-attribution.ts           Source-Attribution
  library-recall.ts                 Memory-Augmented Recall
  legal-disclaimers.ts              Legal-Disclaimer-Generation
  render-message.ts                 Message-Renderer
  draft-export.ts                   Draft-Export
  diff-summarizer.server.ts         Diff-Summarization
  search-normalize.ts               Search-Query-Normalization
  semantic-corpus.server.ts         Semantic-Corpus für Library-Embeddings
  library-embeddings.ts             Embeddings-Management
  link-status.ts                    Source-Link-Status-Tracking
  anthropic-client.ts               Atlas-spezifischer Anthropic-Client
  tool-input-display.ts             Tool-Input-Renderer
```

### Models (15+)

```
AtlasSourceCheck             Source-Validierung
AtlasSourceCheckHistory      Source-Check-History
AtlasPendingSourceCandidate  Vorschlags-Pipeline
AtlasBookmark                User-Bookmarks
AtlasResearchEntry           Research-Notes
AtlasUpdate                  Regulatory-Updates
AtlasAnnotation              Annotations auf Articles
AtlasAlertSubscription       Alert-Subscriptions
AtlasNotification            Notifications für Counsel
AtlasWorkspace               Workspace-Container
AtlasWorkspaceCard           Cards in Workspaces (Notes, Annotations, etc.)
NormAnchor                   Norm-Versions-Anchoring
NormDriftAlert               Drift-Detection bei Norm-Updates
```

### Atlas-Cron-Jobs

```
atlas-source-check          Daily 04:30   Validiert Source-Links
atlas-feed-discovery        Daily 04:45   Discoveries neuer Sources
regulatory-feed             Daily 07:00   Reguläres Feed-Polling (EUR-Lex etc.)
```

### Atlas-spezifische AI-Features

- **Library-Recall** (`library-recall.ts`): semantic-augmented Suche durch das gesamte EU-Space-Act-Korpus
- **Semantic-Corpus** mit Embeddings (`semantic-corpus.server.ts`)
- **Citation-Validator** mit Verbatim-Attribution
- **Diff-Summarizer** für Regulation-Updates
- **Norm-Anchoring** für Pharos-Authority-Bridge

### Strategische Rolle im Caelex-Netzwerk

Atlas ist **die intellektuelle Quelle** des Caelex-Wissens. Die anderen Plattformen (Comply, Pharos, Assure) **konsumieren** Atlas-Daten:

- Comply zeigt Articles aus Atlas in den Module-Pages + Tracker
- Pharos referenziert NormAnchor aus Atlas für Decision-Basis
- Assure nutzt RegulatoryFeedItem aus Atlas für Risk-Identifikation

---

## 9. Plattform 3: Caelex Pharos

**Authority-Plattform für regulatorische Aufsicht und Genehmigungsverfahren.**

### Scope

Tabu-isoliert von Comply (eigene Domain, eigene Auth). Pilot-Stage mit BSI/BAFA als erste Authorities.

### Routes

```
src/app/(pharos)/pharos/      (eigene Domain, eigene Auth)
  Sub-Routes für:
  - Authority-Workspaces
  - Submission-Inbox
  - Approval-Queue
  - Witness-Quorum
  - Case-Management
```

### Files

**49 Files** unter `src/lib/pharos/` und `src/app/(pharos)/`:

```
Lib-Module (22+):
  norm-anchor.ts                    Norm-Versions-Anchoring (mit Atlas)
  witness-quorum.ts                 Multi-Party-Witness-Logic
  briefing-email.ts                 Daily-Briefing-Generator
  briefing-email-renderer.ts        Briefing-Renderer
  self-consistency.ts               Self-Consistency-Checks
  astra-bridge.ts                   Astra-Comply-Bridge
  oversight-service.ts              Oversight-Relations
  receipt.ts                        Receipt-Generation für Approvals
  oversight-scope.ts                Scope-Definition
  workflow-service.ts               Workflow-Management
  astra-tools.ts                    Pharos-spezifische Astra-Tools
  daily-briefing.ts                 Daily-Briefing-Engine
  approval-service.ts               Approval-Lifecycle
  workflow-approval-bridge.ts       Workflow-Approval-Bridge
  webhook-service.ts                External-Webhook-Integration
  multi-party-approval.ts           Multi-Party-Approval-Logic
  llm-judge.ts                      LLM-as-Judge für Disputes
  citation.ts                       Citation für Authority-Decisions
  astra-engine.ts                   Pharos-Astra-Engine
  handshake.ts                      External-Operator-Handshake
  workflow-fsm.ts                   Workflow Finite-State-Machine
  differential-privacy.ts           Differential-Privacy für Aggregations
  preview-mode.ts                   Preview-Mode (Pre-Approval)
```

### Models (10+)

```
AuthorityProfile             Authority-Profile (BAFA, BNetzA, EUSPA, etc.)
OversightRelationship        Authority-zu-Operator-Beziehungen
OversightAccessLog           Access-Logs für Audit-Trail
WorkflowCase                 Case-Container
WorkflowTransition           State-Transitions
ApprovalRequest              Approval-Requests
ApprovalSignature            QES-Signatures auf Approvals
PharosWebhookEndpoint        External-Webhook-Endpoints (HMAC-Secured)
PharosWebhookInvocation      Webhook-Invocation-Audit
NormAnchor                   Norm-Versions (geteilt mit Atlas)
```

### Pharos-Cron-Jobs

```
pharos-norm-drift           Daily 05:30      Norm-Drift-Detection
pharos-witness-quorum       */10 min         Witness-Quorum-Checks
pharos-workflow-sla         */5 min          Workflow-SLA-Watchdog
pharos-approval-expiry      Hourly           Approval-Expiry-Tracking
pharos-daily-briefing       Daily 06:00      Daily-Briefing für Authority
verity-sth-sign             Daily 13:00      Verity-Tree-Head-Signing
```

### Strategische Innovation in Pharos

**1. Multi-Party-Approval mit QES-Sign-Off**: Authority-Decisions können Multi-Party-Sign-Off erfordern (z.B. BAFA-Officer + Senior-BAFA + Inter-Agency-Coordination). Strukturell modelliert.

**2. Witness-Quorum-Pattern**: Pharos kann selbst als Witness in Caelex's RFC-6962-Tree-Heads fungieren — Authority-Cosignature ist Trust-Anchor (siehe Vision-Doc).

**3. Norm-Drift-Detection**: Wenn ein Article in Atlas ge-updated wird, vergleicht Pharos automatisch ob laufende Cases betroffen sind.

**4. Differential-Privacy für Aggregationen**: Authority kann statistische Summary-Daten über alle Operatoren in Caelex einsehen, ohne identifizierende Detail-Daten — DSGVO-konform via Differential-Privacy.

**5. External-Webhook-Integration mit HMAC**: Authorities können Caelex-Daten an externe Behörden-Systeme weiterleiten (z.B. EUSPA-Aggregation), HMAC-secured.

**6. LLM-as-Judge**: Bei Disputes zwischen Authority und Operator kann LLM als unabhängiger Pre-Reviewer fungieren — Resultat fließt in `LLMJudgeDecision`.

### Strategische Rolle im Netzwerk

Pharos ist **die offizielle Spitze** der Compliance-Pyramide. Was hier passiert:

- Operator submitted in Comply → Pharos empfängt
- Pharos approves/rejects → flows back zu Comply
- Pharos cosigniert Verity-Tree-Heads → erhöht Trust für alle Caelex-Customers
- Pharos publiziert Norm-Updates → Atlas + Comply + Pharos selbst aktualisieren sich

---

## 10. Plattform 4: Caelex Assure

**Investor- und Insurance-DD-Plattform.** Ratings + Risk-Assessment für Raumfahrt-Investments.

### Scope

20+ Pages für:

- Investor-Dashboard
- Company-Profile-Builder
- Risk-Register + Scenarios
- Data-Rooms (token-gated)
- Benchmarking gegen Peer-Group
- DD-Package-Generation

### Routes

```
src/app/dashboard/assure/    + dedicated /assure-Routes
  /dashboard                 Assure Main-Dashboard
  /profile/[section]          Profile-Builder (8 Sections)
  /benchmarks                Peer-Comparison
  /risks                     Risk-Register
  /risks/scenarios           Scenario-Analysis
  /materials                 Investor-Materials
  /dataroom                  Data-Room-Management
  /investors                 Investor-Relations
  /assure/score              RRS-Score-Detail
  /assure/rating             RCR-Rating-Detail
  /assure/share              Share-Link-Management
  /assure/packages           DD-Package-Builder
```

### Files

**70 Files** unter `src/lib/assure/`, `src/data/assure/`, `src/components/assure/`:

```
Lib-Engines (4+):
  benchmark-engine.server.ts        Peer-Benchmarking-Engine
  irs-engine.server.ts              Investment-Readiness-Score-Engine
  profile-engine.server.ts          Profile-Validation-Engine
  risk-engine.server.ts             Risk-Calculation-Engine

PDF-Generation:
  src/lib/pdf/assure/               Investor-Teaser, Risk-Report, Executive-Summary, etc.
  8+ Report-Types
```

### Models (~25)

```
Profile-Models:
  AssureCompanyProfile        Company-Basics
  AssureFinancialProfile      Financials
  AssureMarketProfile         Market-Position
  AssureTeamProfile           Team-Strength
  AssureTechProfile           Tech-Capabilities
  AssureTractionProfile       Traction-Metrics
  AssureRegulatoryProfile     Regulatory-Status

Scoring-Models:
  RegulatoryReadinessScore (RRS)         Compliance-Readiness 0-100
  RegulatoryCreditRating (RCR)           Credit-Style-Rating A+/A/B+/...
  RCRBenchmark                           Peer-Benchmarks
  RCRAppeal                              Appeal-Process für Ratings
  RRSSnapshot                            Daily-Snapshots der RRS-Scores
  InvestmentReadinessScore               Combined Investment-Score

Risk + Materials:
  AssureRisk                  Risk-Register
  AssureMaterial              Investor-Materials
  AssureMilestone             Milestone-Tracking
  AssureDDPackage             DD-Package
  AssureShareLink             Share-Links (Token-Gated)
  AssureDataRoom              Data-Room
  AssureDataRoomLink          Room-Links
  AssureDataRoomView          View-Tracking
  AssureDataRoomDocument      Documents in Rooms
```

### Assure-Cron-Jobs

```
compute-rrs                 Daily 07:00       RRS-Scoring
compute-rcr                 Daily 07:30       RCR-Rating
```

### Strategische Innovation in Assure

**1. RRS (Regulatory Readiness Score)**: 0-100-Score basierend auf den 12 Compliance-Engines. Kontinuierlich aktualisiert.

**2. RCR (Regulatory Credit Rating)**: Bond-Rating-Style (A+, A, A-, B+, ...) für Compliance-Credit-Risk. Investor-tauglich.

**3. Peer-Benchmarking gegen `RCRBenchmark`-Tabelle**: Investor sieht "Operator X ist im 75th percentile in Cyber-Compliance, im 40th percentile in NIS2-Readiness".

**4. Token-gated Data-Rooms**: Investor bekommt 7-Tage-Zugang zu spezifischen Compliance-Snapshots — mit `AssureDataRoomView`-Tracking (Audit-Trail wer wann was sah).

**5. Regulatory-Risk als Investment-Faktor**: Erste Plattform die Compliance-Readiness als investierbare Metric modelliert.

---

## 11. Plattform 5: Caelex Academy

**Schulungs- und Simulationsplattform für Compliance-Lernende.**

### Scope

Course-Catalog + Interactive-Classroom + Scenario-Simulation + Badges + Instructor-Portal.

### Routes

```
src/app/academy/
  /dashboard                 Learner-Progress
  /courses                   Course-Catalog
  /courses/[id]              Course-Detail
  /classroom                 Interactive-Classroom
  /classroom/[id]            Per-Class-View
  /simulations               Scenario-Sims
  /simulations/[id]          Per-Scenario-Detail
  /sandbox                   Sandbox-Environment
  /instructor                Instructor-Portal
  /progress                  Per-User-Progress
```

### Files

**19 Files** unter `src/lib/academy/`, `src/data/academy/`, `src/components/academy/`:

```
Data:
  courses.ts                  Course-Definitions (8+ Courses)
  scenarios.ts                Scenario-Definitions

Components (10+):
  CourseCatalog · CourseDetail · LessonViewer · QuizComponent
  ClassroomView · BadgeDisplay · SimulationEngine · ProgressTracker
  InstructorPortal · LearnerProgress
```

### Models (8+)

```
AcademyCourse           Course-Container
AcademyModule           Modules in Courses
AcademyLesson           Lessons in Modules
AcademyQuestion         Quiz-Questions
AcademyEnrollment       Enrollment-Tracking
AcademyLessonCompletion Completion-Tracking
AcademyClassroom        Classroom-Container
AcademyBadge            Badge-System
AcademySimulationRun    Simulation-Run-Records
```

### Strategische Rolle

**Indirect Sales-Funnel + Adoption-Vehicle:**

- Operator-Compliance-Lead lernt mit Academy → versteht warum Caelex-Comply die Lösung ist
- Investor lernt RCR-Methodologie über Academy → vertraut Assure-Ratings
- Counsel lernt EU-Space-Act-Tiefen via Academy → wird Atlas-User

**Continuous Learning:**

- Wenn neue Regulation kommt (z.B. NIS2-Update), wird automatisch ein Mini-Course generiert
- Operator-Team kann gezielt up-skillen ohne externes Training

---

## 12. Querschnitts-Layer 1: Astra (AI-Engine)

**Drei separate Astra-Instanzen für drei Welten:**

### Astra V1 — All-Platform-Astra (`src/lib/astra/`)

14 Files, ~3000+ LoC. 47 Tools. Genutzt von:

- Comply V1 (alle Module-Pages)
- Atlas (mit eigenem Tool-Set in `atlas-tool-executor.ts`)
- Assure (für Document-Generation, Risk-Analysis)
- Academy (für Personalized-Learning)

**Tools-Kategorien (V1):**

- Article-Lookup (`get_article`, `search_articles`)
- NIS2-Specific (`get_nis2_requirements`, `nis2_classify`)
- Cross-Regulation (`compare_jurisdictions`, `analyze_cross_regulations`)
- Compliance-State (`check_compliance_snapshot`, `get_operator_obligations`)
- Document-Generation (`generate_document_section`)
- Glossary + Knowledge (`glossary_lookup`)
- Digital-Twin (`query_compliance_twin`, `run_whatif_scenario`, `get_evidence_gaps`)

### Astra V2 — Comply-Isolated (`src/lib/comply-v2/astra-engine.server.ts`)

Isolierte Engine für Comply V2. **5 Tools** mit AstraProposal-Trust-Layer:

- `snoozeComplianceItem`
- `unsnoozeComplianceItem`
- `addComplianceItemNote`
- `markAsAttested` (requiresApproval: true)
- `requestEvidence` (requiresApproval: true)

Persistenz in `V2AstraConversation` + `V2AstraConversationMessage`.

### Astra Pharos — Authority-Isolated (`src/lib/pharos/astra-engine.ts`)

Authority-spezifische Astra mit eigenem Tool-Set für:

- Submission-Review-Drafting
- Norm-Drift-Analysis
- Cross-Reference-Lookups
- LLM-as-Judge für Disputes

### Astra-Architecture-Eigenschaften

**Tool-Use-Loop:**

- Max 10 Iterationen (V1) / 5 (V2)
- Anthropic Claude Sonnet 4-6 default
- Tool-Choice "auto"
- Audit-Logging pro Tool-Call

**Conversation-Persistence:**

- V1: `AstraConversation` + `AstraMessage`
- V2: `V2AstraConversation` + `V2AstraConversationMessage`
- Auto-Summarize bei Überschreitung MAX_MESSAGE_LENGTH

**Trust-Layer (V2):**

- `AstraProposal` mit `decisionLog: Json`
- 7-Tage-Expiry
- Approval auf `/dashboard/proposals`
- `applyApprovedProposal` als Escape-Hatch

**Reasoning-Capture:**

- `decisionLog` array mit `kind: "tool" | "thought"`
- Pro Tool-Call: `tool` name + `input` + `result`
- Pro Thought: `text` (truncated 1000 chars)

**Was fehlt heute (in Roadmap):**

- Hash-Chained `AstraProposal.decisionLog` (Phase 4 Day 1 Plan)
- Reproducibility-Felder (`model_id`, `prompt_hash`, `tool_definitions_hash`)
- Citation-Required für Source-Attribution
- Multi-Model-Cross-Check für High-Stakes
- Bedrock EU für Schrems-II-Konformität

---

## 13. Querschnitts-Layer 2: Verity (Crypto-Trust)

**Trillian-/Sigstore-Niveau Tamper-Evidence — heute schon implementiert.**

### Architektur

```
VerityIssuerKey
  ↓ Ed25519-Signature
VerityAttestation
  ↓ Hashed
VerityLogLeaf  (RFC-6962 Merkle-Tree)
  ↓ Aggregated
VerityLogSTH (Signed Tree Head, Ed25519-signed)
  ↓ Inclusion-Proofs
External Verifier (BAFA, Investor, Auditor)
```

### Models

```
VerityIssuerKey              Multi-Issuer-Key-Management (Ed25519)
VerityAttestation            Atomic-Attestations
VerityCertificate            Compliance-Certificates
VerityCertificateClaim       Claim-Statements
VerityPassport               Passport (cross-attestation-bundle)
VerityP2PRequest             P2P-Verification-Requests
VerityAuditChainEntry        Audit-Chain-Entries
VerityLogLeaf                Merkle-Tree-Leaves (RFC-6962-konform)
VerityLogSTH                 Signed Tree Heads (Ed25519-STH)
```

### Verity-Cron-Jobs

```
verity-sth-sign             Daily 13:00       STH-Signing
audit-chain-anchor          Daily 03:00       Hash-Chain-Anchoring
```

### Strategischer USP

**Was kein anderer GRC-Anbieter hat:**

- Drata, Vanta, Anecdotes, Hyperproof haben **Hash-Logs** (linear, nicht Merkle-Tree)
- Caelex hat **RFC-6962 Merkle-Trees mit Ed25519-Signed-Tree-Heads** = Sigstore-/Trillian-Niveau

**Roadmap (Q3 2026):**

- C2SP `tlog-witness` Cosignature-Network
- OpenTimestamps Quarterly Bitcoin-Anchor
- Public-Verify-Page für externe Verifizierer
- D-Trust QTSP-Partnership für eIDAS-QES-Tier

**Resultat (2027):**

- Caelex-Compliance-Logs sind **mathematisch beweisbar tamper-frei** — niemand kann sie fälschen, nicht einmal Caelex selbst.
- Cross-Border-Verifikation ohne Caelex-Anruf
- 30+ Jahre Beweiskraft via Bitcoin-Anchoring

---

## 14. Querschnitts-Layer 3: Sentinel (Telemetry-Evidence)

**Telemetrie-zu-Evidence-Pipeline mit Hash-Chained Audit-Stream.**

### Architektur

```
Satellite-Telemetry (CelesTrak-TLE, Operator-Streams)
  ↓
SentinelAgent (per Spacecraft)
  ↓
SentinelPacket (atomar, hash-chained)
  ↓
CrossVerification (Multi-Source-Consistency-Check)
  ↓
SatelliteComplianceState (derived state)
  ↓
SatelliteComplianceStateHistory (bi-temporal)
  ↓
SatelliteAlert (when state-change → alert)
```

### Models

```
SentinelAgent                       Per-Spacecraft Agent
SentinelPacket                      Atomic Telemetry-Packets
CrossVerification                   Multi-Source-Verification
SatelliteComplianceState            Derived-State pro Spacecraft
SatelliteComplianceStateHistory     History (bi-temporal-prepared)
SatelliteAlert                      Alerts auf State-Transitions
```

### Sentinel-Cron-Jobs

```
sentinel-cross-verify       Every 4h         Cross-Source-Verifikation
sentinel-auto-attest        Every 4h         Auto-Attestation bei Cross-Verified
sentinel-heartbeat          Daily 00:30      Health-Check
celestrak-polling           Daily 05:00      External-TLE-Polling
cdm-polling                 Every 4h         Conjunction-Data-Messages
```

### Strategische Rolle

**Telemetry-derived Evidence ist Caelex's Tier-3-Differentiator:**

Heute: ein Operator beweist "Sat-12 ist im compliant Orbit" via PDF-Document.
Caelex: Sentinel + Ephemeris computed das automatisch aus CelesTrak-TLE-Stream + verifiziert mit Multi-Source-Cross-Verification + persistiert hash-chained → Auto-Attestation ohne Operator-Touch.

**Kein anderer GRC-Anbieter hat das.** Drata/Vanta können das nicht, weil sie Cloud-API-pull-only sind. Caelex hat physical-world Telemetry-Access via CelesTrak-Adapter.

---

## 15. Querschnitts-Layer 4: Mission Control + Ephemeris

**3D-Globe + Orbital-Forecast-Engine.**

### Mission Control

```
src/app/dashboard/mission-control/
src/components/mission-control/   (11 Components)
  3D-Globe (Three.js / @react-three/fiber)
  Spacecraft-Visualization
  Orbit-Trajectories
  Conjunction-Events
  Coverage-Maps
```

### Ephemeris

```
src/lib/ephemeris/
  core/satellite-compliance-state.ts
  forecast/forecast-engine.ts          # Predictive Compliance-Forecast
  models/orbital-decay.ts              # Decay-Modelle
  models/fuel-depletion.ts             # Fuel-Models
  models/subsystem-degradation.ts      # Subsystem-Degradation
  simulation/what-if-engine.ts         # What-If-Scenarios
  data/celestrak-adapter.ts            # CelesTrak-TLE-Adapter
```

### Models (Orbital)

```
EphemerisForecast            Forecast-Records (90-day)
OrbitalData                  Per-Spacecraft Orbital-State
SolarFluxRecord              Space-Weather (für Decay-Models)
SpaceWeatherEvent            Solar-Storms etc.
ConjunctionEvent             Conjunction-Tracking
CDMRecord                    Conjunction-Data-Messages
CAEscalationLog              CA-Escalation-Logs
CAConfig                     CA-Configuration
SatelliteAlert               Alerts auf Orbital-State-Changes
OptimizationResult           Regulatory-Arbitrage-Vorschläge
```

### Ephemeris-Cron-Jobs

```
celestrak-polling           Daily 05:00     TLE-Update
ephemeris-daily             Daily 06:00     Daily-Forecast-Run
solar-flux-polling          Daily 04:00     Space-Weather
cdm-polling                 Every 4h        CDM-Polling
```

### Strategische Rolle

**Operational-Compliance-Foresight:**

- "Sat-12 wird in 14 Monaten in non-compliant Orbit driften" — Ephemeris-Forecast warnt 60 Tage vorher
- "Conjunction-Event mit Sat-Y in 6 Stunden" — Sentinel + CDM-Polling

**Regulatory-Arbitrage-Optimizer:**

- Sucht über alle Jurisdiktionen die optimale Authorization-Strategie
- "Wenn du in FR statt DE registrierst, sparst du 23k€ in Bürgschaft"

---

## 16. Die Compliance-Engines (24 Engines)

### Inventar

```
Compliance-Domain-Engines (12):
  src/lib/engine.server.ts                      # EU Space Act
  src/lib/nis2-engine.server.ts                 # NIS2
  src/lib/space-law-engine.server.ts            # National Space Laws
  src/lib/uk-space-engine.server.ts             # UK Space Industry Act
  src/lib/us-regulatory-engine.server.ts        # US FCC/FAA
  src/lib/copuos-engine.server.ts               # COPUOS/IADC
  src/lib/cra-engine.server.ts                  # Cyber Resilience Act
  src/lib/cra-rule-engine.server.ts             # CRA Rule-Evaluator
  src/lib/spectrum-engine.server.ts             # ITU Spectrum
  src/lib/export-control-engine.server.ts       # ITAR/EAR
  src/lib/irpe-engine.server.ts                 # Insurance Risk Premium Engine
  src/lib/nis2-auto-assessment.server.ts        # NIS2 Auto-Classification

Assure-Engines (4):
  src/lib/assure/benchmark-engine.server.ts     # Peer-Benchmarking
  src/lib/assure/irs-engine.server.ts           # Investment-Readiness-Score
  src/lib/assure/profile-engine.server.ts       # Profile-Validation
  src/lib/assure/risk-engine.server.ts          # Risk-Calculation

Atlas + Pharos:
  src/lib/atlas/forecast-engine.ts              # Atlas Predictive
  src/lib/pharos/astra-engine.ts                # Pharos Astra

Astra-Engines (3):
  src/lib/astra/proactive-engine.server.ts      # V1 Proactive
  src/lib/astra/benchmark-engine.server.ts      # V1 Benchmarking
  src/lib/comply-v2/astra-engine.server.ts      # V2 Comply-Isolated

Ephemeris (2):
  src/lib/ephemeris/forecast/forecast-engine.ts # Orbital-Forecast
  src/lib/ephemeris/simulation/what-if-engine.ts # What-If

Scoring:
  src/lib/rcr-engine.server.ts                  # RCR-Rating
  src/lib/rrs-engine.server.ts                  # RRS-Score

Decision:
  src/lib/shield/decision-engine.server.ts      # Shield Decision-Engine
  src/lib/workflow/engine.ts                    # Generic Workflow-State-Machine
```

### Engine-Eigenschaften

- **Server-only**: alle als `*.server.ts` mit `import "server-only"` (110+ Files insgesamt)
- **Stateful**: nehmen Profile + Spacecraft-Daten, computen applicable-Set
- **Cached**: PostureSnapshot daily-cached für Performance
- **Tested**: 237 Test-Files decken Engine-Logik ab

### Was die Engines tun

Pro Engine:

1. Nehmen Operator-Profil + Spacecraft-Specifics als Input
2. Wenden Regulation-Logic an (z.B. "wenn Spacecraft >100kg dann Article 14 applicable")
3. Output: Liste applicable Articles/Requirements + Score + Empfehlungen

**Domain-Wissen-Volumen:**

- 119 EU-Space-Act-Articles (`src/data/articles.ts`, 67 grouped entries)
- 51 NIS2-Requirements (`src/data/nis2-requirements.ts`, 3973 LoC)
- 10 National-Space-Laws (`src/data/national-space-laws.ts`, 1681 LoC)
- 3418 LoC Cybersecurity-Requirements (ENISA + NIS2-Controls)
- ITAR/EAR-Requirements (Export Control)
- COPUOS/IADC-Requirements
- Spectrum-Requirements (ITU)
- 47 Cross-References zwischen Regulations

**Das ist die größte strukturierte EU-Raumfahrt-Compliance-Wissensbasis weltweit als Code.**

---

## 17. Multi-Actor-Modell

### Die vier Akteure

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│              SATELLITE OPERATOR                            │
│              (CTO, Compliance-Lead, Mission-Director)      │
│              "Wir bauen, betreiben, operieren."            │
│              → CAELEX COMPLY                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
                          ↕ 1
┌────────────────────────────────────────────────────────────┐
│                                                            │
│              COUNSEL / LEGAL                               │
│              (Anwalt, Compliance-Berater)                  │
│              "Wir beraten rechtlich."                      │
│              → CAELEX ATLAS + Comply-Network               │
│                                                            │
└────────────────────────────────────────────────────────────┘
                          ↕ 2
┌────────────────────────────────────────────────────────────┐
│                                                            │
│              REGULATORY AUTHORITY                          │
│              (BAFA, BNetzA, EUSPA, FCC)                    │
│              "Wir prüfen, genehmigen, sanktionieren."      │
│              → CAELEX PHAROS                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
                          ↕ 3
┌────────────────────────────────────────────────────────────┐
│                                                            │
│              INVESTOR / INSURER                            │
│              (PE, VC, Insurance-Underwriter)               │
│              "Wir bewerten, investieren, versichern."      │
│              → CAELEX ASSURE                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Die Verbindungen

**↕ 1: Operator ↔ Counsel**

- LegalMatter, MatterTask, MatterArtifact, MatterConversation
- Operator engaged Counsel → Counsel reviewt im Atlas-Workspace
- Counsel-Sign-Off als WorkflowApprovalSlot in Operator's Authorization-Workflow

**↕ 2: Operator+Counsel ↔ Authority**

- NCASubmission von Operator mit Counsel-Sign-Off → Authority empfängt in Pharos
- AuthorityProfile + OversightRelationship + WorkflowCase
- Authority-Decision flows back to Operator's Workflow-State
- Webhooks für External-Behörden-Systeme

**↕ 3: Operator ↔ Investor**

- AssureDataRoom mit token-gated Access
- RRS + RCR Live-Sync mit Compliance-State
- AssureShareLink für 7-Tage-DD-Snapshots
- Verity-Inclusion-Proof zum Investor

### Cross-Actor-Datenfluss

```
        OPERATOR's COMPLIANCE-EVENT
                   │
                   ▼
         AUDIT-LOG-HASH-CHAIN (universal)
                   │
       ┌───────────┼───────────┬──────────┐
       │           │           │          │
       ▼           ▼           ▼          ▼
   COMPLY      ATLAS        PHAROS      ASSURE
   (Operator)  (Counsel)    (Authority) (Investor)
   sieht       sieht        sieht        sieht
   alles       Counsel-     Submission   read-only
              relevantes   Inbox + Snap   PostureSnapshot
                           seines Cases    + Verity-Proof
```

**Eigenschaft:** Eine Compliance-Action des Operators triggert in **allen vier Plattformen** Updates — alle aus derselben Datenbank, alle hash-chained, alle DSGVO-isoliert nach Need-to-Know.

---

## 18. Was Caelex einzigartig macht

### Strategische Moats (heute schon)

1. **RFC-6962-Verity-Logs** — keine andere GRC-Plattform der Welt hat das. Trillian-/Sigstore-Niveau im Compliance-Domain.
2. **Multi-Actor-Schema von Anfang an** — `Organization` + `OrganizationMember` + 4 Aktor-Rollen + `OversightRelationship` + `LegalMatter` strukturell modelliert.
3. **24 Compliance-Engines mit Raumfahrt-Domain-Wissen** — 119 EU-Space-Act-Articles + 51 NIS2-Reqs + 10 Jurisdiktionen + 3418 LoC Cyber-Requirements als Code. **Größte strukturierte EU-Raumfahrt-Compliance-Wissensbasis weltweit.**
4. **Astra-Trust-Layer (V2)** — `AstraProposal` + `decisionLog` + Approval-Gate. Konzeptionell bereits AI-Act-ready.
5. **Sentinel-Telemetry-Pipeline** — kein GRC-Wettbewerber hat physical-world telemetry-derived evidence.
6. **Caelex's eigene Hash-Chain in `AuditLog`** — SHA-256 verkettet, tamper-evident, kompatibel mit `audit-hash.server.ts`-Library.

### Strategische Moats (in Roadmap, 2026-2027)

7. **Witness-Cosignature-Network** — BAFA + BNetzA als Witnesses auf Caelex's Tree-Heads → unbestechlicher Trust-Anchor.
8. **Bi-Temporal Postgres-18-Tables** — Time-Travel-Queries für 30+ Jahre Compliance-History.
9. **W3C VC + EUDIW-Ready** — Cross-Border-Verifikation ohne Caelex-Anruf.
10. **OpenTimestamps Bitcoin-Anchor** — mathematische Proof-of-Existence für Compliance-Snapshots.
11. **AWS Bedrock EU für Astra** — Schrems-II-Konform, BSI-C5-Tauglich, Bundeswehr-/DLR-Pipeline-Unblock.
12. **ISO 27001:2022 + SOC 2 Type II** — Caelex selbst zertifiziert für Customer-Procurement.

### Was strukturell nicht reproduzierbar ist

Selbst wenn ein Wettbewerber heute startet, sind **diese drei Eigenschaften strukturell uneinholbar**:

**a. Domain-Daten + Code-Volume:** 9840 Zeilen Schema, 252 Models, 24 Engines, 119 EU-Space-Act-Articles als ausgearbeiteter Code. Das ist ~3 Personenjahre. Ein Wettbewerber bräuchte 18-24 Monate alleine für die Daten-Foundation.

**b. Witness-Network + historische Tree-Head-Cosignatur-Kette:** Wenn BAFA Caelex's Tree-Heads ab 2026 co-signiert, ist das ein **historisches Trust-Asset** das ein neuer Wettbewerber niemals nachbauen kann — er könnte ab heute Witnesses sammeln, aber **die Caelex-2026-Tree-Heads wären schon co-signiert und Bitcoin-anchored**.

**c. Multi-Actor-Adoption:** wenn Caelex 50+ Operatoren + 10+ Counsel-Kanzleien + 3+ NCAs + 20+ Investoren auf der Plattform hat, ist das **Network-Effekt** — neue Operatoren wollen die Plattform mit dem größten Stakeholder-Netzwerk, neue Counsel die mit den meisten Mandanten, etc.

### Vergleich zu State-of-the-Art

| Eigenschaft                 | Drata/Vanta | Hyperproof | OneTrust | **Caelex**     |
| --------------------------- | ----------- | ---------- | -------- | -------------- |
| **GRC-Automation**          | ✓           | ✓          | ✓        | ✓              |
| **Domain-Specific (Space)** | ✗           | ✗          | ✗        | **✓**          |
| **Multi-Actor**             | ✗           | partial    | ✗        | **✓**          |
| **EU-Hosted/Sovereign**     | ✗           | ✗          | partial  | **✓**          |
| **Hash-Chain Audit**        | ✗           | ✗          | ✗        | **✓**          |
| **RFC-6962 Merkle-Trees**   | ✗           | ✗          | ✗        | **✓**          |
| **Witness-Network**         | ✗           | ✗          | ✗        | (Roadmap)      |
| **AI-Act-First**            | ✗           | ✗          | partial  | **✓**          |
| **Telemetry-Evidence**      | ✗           | ✗          | ✗        | **✓**          |
| **Bi-Temporal History**     | ✗           | ✗          | ✗        | (Roadmap)      |
| **Authority-Plattform**     | ✗           | ✗          | ✗        | **✓ (Pharos)** |
| **Investor-Ratings**        | ✗           | ✗          | ✗        | **✓ (Assure)** |

Caelex ist **kategorisch anders** als US-GRC-Tools — nicht "besseres GRC", sondern **EU-Raumfahrt-Compliance-Infrastruktur**.

---

## 19. Bezug zu EU-Programmen + ESA-Strategie

### EU Space Programme (2021-2027)

Caelex unterstützt direkt die strategischen Ziele des EU Space Programme:

**1. Space-Sovereignty:** Caelex ist sovereign-EU-stack (Postgres + Vercel/AWS-EU-Region + EU-AI-Models-ready), keine US-Cloud-Abhängigkeit für sensible Compliance-Daten.

**2. Space-Industry-Competitiveness:** Caelex senkt Compliance-Kosten für EU-Operatoren um 60-80% durch Automation → mehr Mittel für eigentliche Mission-Investments.

**3. Space-Standards + Norms:** Caelex unterstützt EU Space Act als **technische Implementations-Plattform**. EU-Kommission profitiert von einheitlicher Implementation across Member-States.

**4. Sustainability + LTS-Compliance:** Caelex's COPUOS-Engine + Ephemeris-Forecast unterstützen Long-Term-Sustainability-Guidelines + IADC-25-Year-Rule-Tracking.

### ESA Business Innovation Pathways

**Pathway 1: ESA InCubed / Digital Earth-Observation:**

- Caelex's Ephemeris-Forecast + Sentinel-Telemetry-Pipeline = digital twin der Compliance-Realität
- Nutzbar für ESA's eigene EO-Operations als Compliance-Layer

**Pathway 2: ESA NAVISP (Navigation Innovation):**

- Caelex's Spectrum-Engine deckt ITU-Coordination ab
- GNSS-Operatoren könnten Caelex für regulatorische-Coordination nutzen

**Pathway 3: ESA SciSpacE / Commercial-Space:**

- Caelex enables european commercial space → ESA's Commercial-Strategy-Goals
- Investor-Confidence durch RRS/RCR-Ratings

**Pathway 4: ESA IAP (Integrated-Applications):**

- Caelex's Multi-Actor-Plattform connects Operator + Authority + Insurer
- Ideal für ESA Application-Lifecycle-Management

### Bezug zu spezifischen ESA-Calls

**ESA-BIC (Business Incubation Centres):**

- Caelex passt strukturell als technology-startup mit B2B-Fokus
- DLR-, ESA-, EU-Space-Act-Bezug ist ESA-relevant

**ESA Future Launchers Preparatory Programme:**

- Caelex könnte Compliance-Layer für neue Launcher-Programme werden

**ESA Space-Safety-Programme:**

- Caelex's Sentinel + Ephemeris + Conjunction-Tracking direkt relevant
- Space-Surveillance-Tracking-Daten-Verifizierung via Verity-Logs

### Strategische Empfehlung für ESA-Antrag

**Positionierung:** Caelex ist die **digitale Compliance-Foundation für die Umsetzung des EU Space Act + NIS2 + AI Act in der europäischen Raumfahrt-Industrie**. Mit folgenden ESA-relevanten Argumenten:

1. **Strategische Industry-Adoption beschleunigen** durch Reduktion der Compliance-Onboarding-Zeit von 6-12 Monaten auf 4-8 Wochen
2. **Sovereign-EU-Stack** als Alternative zu US-GRC-Tools für sensible Behörden-/Defense-Customer
3. **Multi-Stakeholder-Network** mit Authority-Pilot (BSI/BAFA) als Trust-Anchor
4. **Cryptographic Trust-Layer** als europäische Innovation (RFC-6962 + W3C VC + EUDIW-Ready)
5. **AI-Act-First Compliance-Architektur** als europäisches Differenzierungs-Asset

### KPIs / Impact-Metriken (für ESA-Antrag)

| KPI                            | 12 Monate | 24 Monate           | 36 Monate |
| ------------------------------ | --------- | ------------------- | --------- |
| EU-Operatoren auf Plattform    | 30        | 100                 | 250       |
| Counsel-Kanzleien (Atlas)      | 8         | 25                  | 50        |
| Authority-Pilots (Pharos)      | 1 (BSI)   | 3 (+BNetzA, +EUSPA) | 5+        |
| Insurance-Underwriter (Assure) | 2         | 8                   | 20        |
| Compliance-Items processed     | 5k        | 50k                 | 200k      |
| Authorization-Submissions      | 50        | 300                 | 1000      |
| Hash-chained Audit-Events      | 100k      | 1M                  | 5M        |
| Avg Compliance-Time-Saved/Org  | 3h/wk     | 8h/wk               | 15h/wk    |
| Reg-Update-Response-Time       | 30d       | 7d                  | 1d        |

---

## 20. Roadmap 2026-2028

### Phase 0 — Compliance-Foundation (Q2 2026, jetzt) — 8-12 Wochen

**Ziel:** AI-Act-Konformität vor 02.08.2026 + Caelex-eigene Compliance-Festung.

**Sprint A: AI-Act-6-Punkte-Pflicht-Paket** (~4-6 Wochen)

- Hash-Chain für AstraProposal-Decision-Log
- Reproducibility-Snapshot (model_id, prompt_hash, tool_definitions_hash)
- AI-Disclosure-UI
- Anti-Rubber-Stamping-UI mit Pflicht-Begründung
- Logging-Retention ≥180 Tage
- AI-System-Inventar + FRIA-Template

**Sprint B: Caelex-eigene Compliance-Festung** (~4-6 Wochen, parallel)

- DSGVO Art. 28 DPA-Template + Sub-Prozessoren-Register + DPIA für Astra
- Schrems-II-TIA + Migration zu AWS Bedrock EU für Astra
- NIS2-Lieferanten-Klausel-Set
- DORA-Annex zum SaaS-MSA
- Tech E&O Versicherung
- Drata-Vertrag + SOC 2 Type II Window starten

### Phase 1 — Trust-Engine + Workflow-Engine (Q3 2026) — 8-12 Wochen

**Sprint C: Verity-USP** (~4 Wochen)

- C2SP `tlog-witness`-Endpoint
- OpenTimestamps Quarterly Bitcoin-Anchor
- Public-Verify-Page
- D-Trust Cloud-QES-Integration

**Sprint D: COWF-Pilot** (~6-8 Wochen, parallel)

- Adopt Inngest oder Vercel Workflow DevKit
- Pilot W2 Cyber-Incident-Workflow
- Pilot W5 Annual Re-Attestation

### Phase 2 — Compliance-Graph + Enterprise (Q4 2026) — 12-16 Wochen

**Sprint E: Compliance-Graph-Refactor**

- SCF Secure Controls Framework Import
- `Obligation` + `Topic` + `ComplianceState` Schema
- Mapping-Backfill der 8 RequirementStatus-Tables
- Caelex-Topic-Extensions
- OSCAL Import/Export

**Sprint F: Enterprise-Auth**

- WorkOS Pilot mit Enterprise-Prospect
- Directory-Sync (SCIM)
- Audit-Logs via WorkOS-Webhooks

**Sprint G: ISO 27001 + SOC 2 Audits**

- Drata-Automation aktiv
- Stage 2 Audit Q4 → Zertifikat 2027 Q1

### Phase 3 — AI-Trust + Cross-Org (Q1-Q2 2027) — 12-16 Wochen

**Sprint H: Citation-First-Astra + Multi-Model-Cross-Check**

**Sprint I: Caelex MCP-Server** (Phase 4 of original concept)

**Sprint J: W3C VC für Verity-Migration**

### Phase 4 — Bi-Temporal + Sovereign (Q3-Q4 2027) — 16-20 Wochen

**Sprint K: Bi-Temporal Compliance-Models** (Postgres 18 Temporal-Tables)

**Sprint L: Sovereign-SKU Defense-Tier** (AWS European Sovereign Cloud)

### Phase 5+ — Ecosystem (2028+)

- EUDIW Mandatory-Acceptance
- IETF SCITT als Standard
- ISO 42001 Zertifizierung
- Multi-Region (UK + US Hosting)

---

## 21. Impact für europäische Raumfahrt

### Quantitative Impacts (geschätzt bei voller Adoption 2028)

| Metric                                | Status quo           | Mit Caelex-Adoption    | Impact               |
| ------------------------------------- | -------------------- | ---------------------- | -------------------- |
| **Avg. Compliance-Cost pro Operator** | €80-150k/Jahr        | €15-30k/Jahr           | **70-80% Reduktion** |
| **Authorization-Submission-Time**     | 6-12 Monate          | 4-8 Wochen             | **75-85% Reduktion** |
| **NIS2-Incident-Reaction-Time**       | 24-48h ad hoc        | 2-4h strukturiert      | **80%+ Reduktion**   |
| **Cross-Border-Submission-Effort**    | 3x Single-Submission | 1.2x Single-Submission | **60% Reduktion**    |
| **Investor-DD-Time**                  | 2-4 Wochen           | 2-4 Tage               | **85% Reduktion**    |
| **Annual-Re-Attestation**             | 4-6h pro Item        | 5-10 min pro Item      | **95% Reduktion**    |

### Qualitative Impacts

**1. Lower Barriers für Klein-Operatoren:**
Heute können sich nur große Operatoren (>20 MA) full-time Compliance leisten. Mit Caelex können auch 5-Personen-Startups EU-Space-Act-konform launchen → mehr Innovation + Diversität in EU-Raumfahrt.

**2. Beschleunigte EU-Space-Act-Adoption:**
EU-Kommission will EU Space Act flächendeckend bis 2027. Caelex liefert die technische Implementations-Plattform → realistisch erreichbar.

**3. Sovereign-EU-Compliance-Stack:**
Statt US-GRC-Tools (Drata, Vanta) für sensible Raumfahrt-Daten → europäische Souveränität + DSGVO-Schrems-II-Konformität.

**4. Trust-Building zwischen Stakeholdern:**
Heute: Operator-Counsel-Authority-Investor sind Email-getrennte Welten. Mit Caelex: gemeinsame Hash-Chain → strukturelles Trust-Building.

**5. Long-term Audit-Ability (30+ Jahre):**
Raumfahrt-Mission-Lifecycles sind 10-30+ Jahre. Caelex's Bi-Temporal + Hash-Chain + Verity-Logs ermöglichen erstmals **echte Long-term Audit-Reconstruction**.

**6. Datengrundlage für EU-Space-Policy:**
Mit aggregierten anonymisierten Caelex-Daten kann EU-Kommission empirisch evaluieren wie EU Space Act greift, wo Lücken sind, welche Provisions zu ändern.

### Strategische Impacts

**1. EU-Industry-Wettbewerbsfähigkeit:**
Wenn EU-Operatoren 70-80% Compliance-Kosten sparen, können sie kompetitiver gegen US-/China-Operatoren agieren.

**2. EU-Sovereignty als Tech-Asset:**
Caelex als sovereign-EU-Plattform ist ein Beleg dass EU technical sovereignty selbst aufbauen kann (vs nur regulieren).

**3. Cross-Border-EU-Integration:**
Caelex's Cross-Border-Mission-Workflow erleichtert Multi-Jurisdiction-Operations → fördert Single-EU-Space-Market.

---

## 22. Anhang: Repo-Statistiken

### Code-Volumen (Stand 2026-05-01)

```
TypeScript-Files:                 2619
  - Tests:                        237
  - Server-only (.server.ts):     110
  - Components:                   292 (in 49 Groups)
  - API-Routes:                   400+ (across 71 Domains)
  - App-Pages:                    153

Prisma-Schema:                    9840 Lines
  - Models:                       252
  - Enums:                        132
  - Indices:                      481

Domain-Daten:                     55+ Files (.ts)
  - articles.ts (EU Space Act):   119 articles, 67 grouped
  - nis2-requirements.ts:         3973 LoC, 51 entries
  - national-space-laws.ts:       1681 LoC, 10 jurisdictions
  - cybersecurity-requirements.ts: 3418 LoC
  - cra-requirements.ts:          + cra-taxonomy.ts
  - copuos-iadc-requirements.ts:  COPUOS+IADC
  - ITAR/EAR + ISOS + Spectrum:   weitere 10+ Files

Engines:                          24
  - Compliance-Domain:            12
  - Assure (RRS/RCR/Risk/Profile): 4
  - Astra (V1/V2/Pharos):         3+
  - Atlas + Pharos:               2
  - Ephemeris + Sentinel:         2
  - Workflow + Shield:            2

Cron-Jobs:                        17 (in vercel.json)

Sub-Plattform-Files:
  Atlas:                          79 Files
  Pharos:                         49 Files
  Assure:                         70 Files
  Academy:                        19 Files
  Comply (Hauptanteil):           ~2000+ Files
```

### Tech-Dependencies (Major)

```
@anthropic-ai/sdk        AI Engine
@aws-sdk/client-*        S3-Compatible Storage
@dnd-kit                 Drag-Drop
@neondatabase/serverless Postgres
@prisma/client           ORM
@react-pdf/renderer      Client-Side PDF
@react-three/fiber       3D Globe
@upstash/redis           Rate Limiting
bcryptjs                 Password Hashing
cmdk                     Cmd-K Palette
date-fns                 Date Handling
framer-motion            Animations
jspdf                    Server-Side PDF
lucide-react             Icons
next                     Framework (15.x)
next-auth                Auth (5.x)
prisma                   ORM (5.22)
recharts                 Charts
resend                   Email
satellite.js             Orbital Mechanics
stripe                   Payments
tailwindcss              Styling
three                    3D
zod                      Validation
```

### Test-Coverage

```
Vitest:                  Unit + Integration + Contract
Playwright:              E2E + Accessibility + Visual-Regression
Stryker:                 Mutation-Testing
MSW:                     API Mocking

Test-Files:              237
Estimated Test-LoC:      ~30,000+
```

### Security-Posture

```
Encryption:              AES-256-GCM (scrypt KDF)
Per-Tenant-Keys:         Yes
Password-Hashing:        Bcrypt 12 rounds
MFA:                     TOTP + WebAuthn/FIDO2
SSO:                     SAML + OIDC + Google
Rate-Limiting:           19 tiers
CSRF:                    Origin-Validation + Token
CSP:                     Restrictive
HSTS:                    2yr preload
Audit-Hash-Chain:        SHA-256
Verity-Logs:             RFC-6962 + Ed25519
Honey-Tokens:            Yes
Anomaly-Detection:       Yes
Pre-Commit-Hooks:        ESLint + TypeScript + Secret-Scanning
CI-Security:             CodeQL + TruffleHog + OWASP
Source-Maps-Production:  Disabled
```

### Operational-Tooling

```
CI/CD:                   GitHub Actions + Husky + Vercel Auto-Deploy
Pre-Commit:              Husky + lint-staged
Pre-Push:                Tests + Type-Check
Monitoring:              Sentry + LogSnag + Vercel Analytics
Logging:                 Structured (logger.ts)
Cron-Jobs:               17 (Vercel Cron)
Migrations:              Prisma Migrate (incremental)
Branch-Strategy:         Feature-Branches → main → Auto-Deploy
```

---

## Schluss

Caelex ist nicht ein Produkt — es ist eine **technische Infrastruktur** für einen Compliance-Layer der europäischen Raumfahrt. Mit 252 Models, 24 Engines, 5 Sub-Plattformen, 4 Akteurs-Rollen und 30+ Jahren Audit-Reconstruction-Fähigkeit positioniert sich Caelex als **die strategische Foundation** für die Implementation von EU Space Act, NIS2, AI Act, COPUOS und nationalen Weltraumgesetzen in Europa.

Die nächsten 24 Monate sind **strategische Konsolidierung**:

- Q2 2026: AI-Act-Konformität + Caelex-eigene Compliance-Festung
- Q3 2026: Verity-Witness-Network + Workflow-Engine-Adoption
- Q4 2026: Compliance-Graph + Enterprise-Auth + ISO/SOC-Audits
- Q1-Q2 2027: AI-Trust + MCP-Server + W3C VC
- Q3-Q4 2027: Bi-Temporal + Sovereign-SKU
- 2028+: EUDIW + Decentralized + ISO 42001

Mit dieser Konsolidierung wird Caelex bis 2028 **die zentrale digitale Compliance-Plattform für europäische Raumfahrt** — nicht "ein GRC-Tool unter vielen", sondern **die Infrastruktur**.

Aus ESA-Innovations-Perspektive: Caelex ist das **technical-implementation-vehicle** für die regulatorischen Ambitionen der EU im Space-Sektor — ohne eine solche Plattform bleiben EU Space Act + NIS2 + AI Act papier-bürokratisch; mit ihr werden sie operationale Realität.

— Master Report 2026, Reine Analyse, Keine Code-Änderungen
