# Caelex Platform — Technischer Zustandsbericht

**Datum:** 05.03.2026
**Erstellt von:** Automatisierte Codebase-Analyse (vollstandige Zeile-fur-Zeile-Analyse)
**Zweck:** Datengrundlage fur Business Plan & Investorenkommunikation

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Plattform-Ubersicht](#2-plattform-ubersicht)
3. [Tech Stack & Architektur](#3-tech-stack--architektur)
4. [Offentliche Seiten & Marketing](#4-offentliche-seiten--marketing)
5. [Assessment-Module (Offentlich)](#5-assessment-module-offentlich)
6. [Dashboard & Compliance-Module](#6-dashboard--compliance-module)
7. [Compliance-Engines (Kernlogik)](#7-compliance-engines-kernlogik)
8. [Regulatorische Datenbasis](#8-regulatorische-datenbasis)
9. [API-Infrastruktur](#9-api-infrastruktur)
10. [Datenbank-Schema](#10-datenbank-schema)
11. [Authentifizierung & Zugriffskontrolle](#11-authentifizierung--zugriffskontrolle)
12. [Sicherheitsinfrastruktur](#12-sicherheitsinfrastruktur)
13. [Verity — Kryptographische Attestierung](#13-verity--kryptographische-attestierung)
14. [Ephemeris — Predictive Compliance](#14-ephemeris--predictive-compliance)
15. [Sentinel — Evidence Chain](#15-sentinel--evidence-chain)
16. [Astra — AI-Assistent](#16-astra--ai-assistent)
17. [Academy — Lernplattform](#17-academy--lernplattform)
18. [Assure — Investor Readiness](#18-assure--investor-readiness)
19. [Billing & Monetarisierung](#19-billing--monetarisierung)
20. [Email, PDF & Kommunikation](#20-email-pdf--kommunikation)
21. [Testing & CI/CD](#21-testing--cicd)
22. [Deployment & Monitoring](#22-deployment--monitoring)
23. [Kennzahlen-Zusammenfassung](#23-kennzahlen-zusammenfassung)

---

## 1. Executive Summary

Caelex ist eine **enterprise-grade Full-Stack SaaS-Plattform** fur regulatorische Compliance im Weltraumsektor. Die Plattform hilft Satellitenbetreibern, Startdienstleistern und Raumfahrtunternehmen bei der Einhaltung des **EU Space Act (COM(2025) 335)**, der **NIS2-Richtlinie (EU 2022/2555)** und nationaler Weltraumgesetze in 10 europaischen Jurisdiktionen.

### Kerndaten auf einen Blick

| Metrik                    | Wert                                    |
| ------------------------- | --------------------------------------- |
| Datenbank-Modelle         | 158                                     |
| Datenbankfelder           | ~4.500+                                 |
| Datenbank-Indizes         | 428                                     |
| API-Routen (Handler)      | 383                                     |
| API-Domains               | 57                                      |
| Compliance-Engines        | 18                                      |
| Service-Dateien           | 70+                                     |
| React-Komponenten         | 130+                                    |
| Seiten-Routen             | 44+                                     |
| Regulatorische Datensatze | 32.000+ Zeilen Code                     |
| EU Space Act Artikel      | 119                                     |
| NIS2-Anforderungen        | 51                                      |
| Jurisdiktionen            | 10 EU + UK + US                         |
| Compliance-Module         | 14                                      |
| Test-Dateien              | 154 (111 Unit + 37 Integration + 6 E2E) |
| Prisma-Schema             | 2.424 Zeilen                            |

---

## 2. Plattform-Ubersicht

### Was Caelex lost

Der europaische Weltraumsektor steht vor einer regulatorischen Zeitenwende: Der EU Space Act tritt 2026-2030 stufenweise in Kraft und verpflichtet erstmals alle Weltraumbetreiber zu umfassender Compliance. Caelex automatisiert diesen Prozess von der Erstbewertung bis zur laufenden Uberwachung.

### Kernfunktionen

1. **Compliance-Assessment** — Automatische Bestimmung regulatorischer Pflichten anhand von Betreibertyp, Jurisdiktion und Missionsparametern
2. **14 Compliance-Module** — Vollstandige Abdeckung aller regulatorischen Domanen (Autorisierung, Cybersicherheit, Debris, Umwelt, Versicherung, NIS2, Registrierung, Aufsicht, COPUOS, Exportkontrolle, Spektrum, UK, US, Digital Twin)
3. **Artikel-Tracker** — Einzelartikel-Tracking fur alle 119 EU Space Act Artikel
4. **Dokumentenvault** — Sichere Dokumentenverwaltung mit Compliance-Mapping
5. **NCA-Portal** — Direkte Kommunikation mit nationalen Aufsichtsbehorden
6. **Stakeholder-Netzwerk** — Verschlusselte Datenraume fur Investoren, Auditoren, Versicherer
7. **Kryptographische Attestierung (Verity)** — Zero-Knowledge Compliance-Nachweise
8. **Predictive Compliance (Ephemeris)** — Vorhersage regulatorischer Risiken uber die gesamte Missionslaufzeit
9. **AI-Assistent (Astra)** — KI-gestutzter Compliance-Berater

---

## 3. Tech Stack & Architektur

### Frontend

| Technologie             | Version     | Zweck                                                    |
| ----------------------- | ----------- | -------------------------------------------------------- |
| Next.js                 | 15          | App Router, SSR/SSG                                      |
| React                   | 19          | UI-Komponenten                                           |
| TypeScript              | Strict Mode | Typsicherheit                                            |
| Tailwind CSS            | 3.4         | Styling (Dark Mode, Custom Design System)                |
| Framer Motion           | —           | Animationen (Scroll-Trigger, Carousel, Page Transitions) |
| Three.js / @react-three | —           | 3D-Visualisierungen (Landing Page)                       |
| Recharts                | —           | Daten-Charts (Donut, Bar, Radar, Timeline)               |
| Lucide React            | —           | Icon-Bibliothek                                          |
| @react-pdf/renderer     | —           | Client-seitige PDF-Generierung                           |

### Backend

| Technologie        | Version | Zweck                                                 |
| ------------------ | ------- | ----------------------------------------------------- |
| Next.js API Routes | 15      | 383 API-Handler                                       |
| Prisma ORM         | 5.22    | Datenbank-Abstraction (158 Modelle)                   |
| PostgreSQL         | —       | Primare Datenbank (Neon Serverless)                   |
| NextAuth           | v5      | Authentifizierung (Credentials, OAuth, WebAuthn, SSO) |
| Upstash Redis      | —       | Rate Limiting (19 Tiers, Sliding Window)              |
| Zod                | —       | Input-Validierung                                     |

### Infrastruktur

| Technologie    | Zweck                                |
| -------------- | ------------------------------------ |
| Vercel         | Hosting, Edge Functions, Auto-Deploy |
| Neon           | Serverless PostgreSQL                |
| Cloudflare R2  | Datei-Storage (S3-kompatibel)        |
| Stripe         | Zahlungsabwicklung                   |
| Resend + SMTP  | Email-Versand                        |
| Sentry         | Error Tracking                       |
| LogSnag        | Event Analytics                      |
| GitHub Actions | CI/CD Pipeline                       |

### Kryptographie

| Algorithmus | Zweck                                       |
| ----------- | ------------------------------------------- |
| AES-256-GCM | Verschlusselung sensibler Datenbankfelder   |
| Ed25519     | Digitale Signaturen (Verity Attestierungen) |
| SHA-256     | Hash-Commitments, Audit-Trail-Integritat    |
| Scrypt      | Schlusselableitung (N=32768, r=8, p=1)      |
| Bcrypt      | Passwort-Hashing (12 Runden)                |
| HMAC-SHA256 | API-Key-Signierung, Webhook-Verifizierung   |

### Projektstruktur

```
src/
  app/                  44 Seiten-Routen + 138 API-Routendateien
  components/           130+ React-Komponenten in 20 Verzeichnissen
  data/                 20 regulatorische Datendateien (32.000+ LOC)
  lib/                  Business Logic, Engines, Services, Utilities
    engine.server.ts    EU Space Act Engine
    nis2-engine.server.ts  NIS2 Engine
    space-law-engine.server.ts  Space Law Engine
    services/           70+ Service-Dateien
    email/              Email-Templates & Versand
    pdf/                PDF-Report-Generierung
    stripe/             Stripe-Integration
    storage/            R2/S3 File Storage
  hooks/                Custom React Hooks
  types/                TypeScript-Deklarationen

prisma/
  schema.prisma         2.424 Zeilen, 158 Modelle, 428 Indizes

packages/               5 Standalone-Krypto-Pakete (Verity)

tests/
  unit/                 111 Unit-Tests
  integration/          37 Integrationstests
  e2e/                  6 E2E-Tests (Playwright)
```

---

## 4. Offentliche Seiten & Marketing

### Landing Page (`/`)

| Sektion               | Beschreibung                                                                                                        | Technologie                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Hero**              | Vollbild-Video-Hintergrund (MP4), Headline "The World's Space Regulatory Intelligence Platform", CTA-Buttons        | Autoplay Video, Framer Motion                                 |
| **Blog Showcase**     | Horizontaler Carousel mit 6 Produktkarten (Sentinel, Ephemeris, Ground Stations, Comply, Verity, Ecosystem)         | Framer Motion Spring-Animation, Drag/Swipe, Auto-Advance (8s) |
| **Mission Statement** | Animierter Textreveal mit blinkender Cursor-Animation                                                               | Character-by-Character Stagger (0.006s)                       |
| **Software Showcase** | 6 Produkte in Zeilen (Comply, Sentinel, Astra, Ephemeris, Genome, Verity) — Name+Tagline links, Beschreibung rechts | Framer Motion whileHover, Scroll-Trigger                      |

### Weitere offentliche Seiten

| Seite              | Route                     | Inhalt                                                                               |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------ |
| **Assessment Hub** | `/assessment`             | Modulauswahl, "Unified Compliance Profile" Karte, 3 Frameworks, ~35 Fragen, 8-10 Min |
| **Pricing**        | `/pricing`                | 3 Tiers (Starter/Professional/Enterprise), Feature-Matrix, FAQ, animierte Zahler     |
| **About**          | `/about`                  | Unternehmensgeschichte, 4 Werte, Timeline (2025-2030), Standort Berlin               |
| **Demo**           | `/demo`                   | Demo-Anfrageformular mit Trust-Signals, Statistiken                                  |
| **Contact**        | `/contact`                | Kontaktformular, 3 Kontaktmethoden, FAQ-Links                                        |
| **Resources Hub**  | `/resources`              | Guides, Blog, Glossar, Module, Jurisdiktionen, FAQ                                   |
| **FAQ**            | `/resources/faq`          | 40+ FAQs in 6 Kategorien, Accordion-Style                                            |
| **Glossar**        | `/resources/glossary`     | 30+ Begriffe, alphabetisch, Suchfunktion, Schema.org JSON-LD                         |
| **Timeline**       | `/resources/timeline`     | EU Space Act Zeitplan (Juli 2025 — 2030), Countdown                                  |
| **EU Space Act**   | `/resources/eu-space-act` | 119 Artikel, 10 Annexe, Durchsetzung & Strafen                                       |
| **Blog**           | `/blog`                   | Artikelindex, Kategoriefilter, Featured Articles                                     |
| **Module**         | `/modules`                | 12 Compliance-Module als Karten                                                      |
| **Jurisdiktionen** | `/jurisdictions`          | 10 EU-Lander + EU-weite Regulierung                                                  |
| **Legal**          | `/legal/*`                | Impressum, Datenschutz (DE+EN), AGB, Cookies                                         |
| **Verity**         | `/verity`                 | 8-Sektionen Dark-Theme Marketing-Seite fur kryptographische Attestierung             |
| **Ephemeris**      | `/systems/ephemeris`      | Predictive Compliance Marketing-Seite mit animierten Charts                          |

### SEO & Strukturierte Daten

- JSON-LD Schema: `SoftwareApplication`, `FAQPage`, `DefinedTerm`
- Dynamische Metadata-Generierung pro Route
- Open Graph Tags fur Social Sharing
- Sitemap-Generierung

---

## 5. Assessment-Module (Offentlich)

### EU Space Act Assessment (`/assessment/eu-space-act`)

**8-Fragen-Wizard zur Bestimmung regulatorischer Pflichten:**

| Frage | Inhalt                        | Auswirkung                                                |
| ----- | ----------------------------- | --------------------------------------------------------- |
| 1     | Welche Weltraumaktivitaten?   | Bestimmt Betreibertyp (SCO, LO, LSO, ISOS, CAP, PDP, TCO) |
| 2     | Ausschliesslich Verteidigung? | Ausschluss bei reiner Verteidigung                        |
| 3     | Post-Launch-Betrieb?          | Satellitenbetrieb ja/nein                                 |
| 4     | EU-Niederlassung?             | EU vs. Drittland-Pflichten                                |
| 5     | Unternehmensgrosse?           | Micro/Small/Medium/Large → Regime (Light vs. Standard)    |
| 6     | Konstellationsbetrieb?        | Sonderregeln fur Konstellationen                          |
| 7     | Konstellationsgrosse?         | Tier-Bestimmung                                           |
| 8     | Primarer Orbit?               | LEO/MEO/GEO/HEO                                           |

**Ergebnis:** Betreibertyp, Regime, anwendbare Artikel (0-119), 9 Modulstatus, Checklisten (Pre-Authorization, Ongoing, End-of-Life), geschatzte Autorisierungskosten.

**Anti-Bot-Schutz:** Timing-basierte Erkennung (`startedAt` Timestamp).

### NIS2 Assessment (`/assessment/nis2`)

**7-Fragen-Wizard:**

1. Space Sub-Sektor
2. EU-Niederlassung
3. Entitatsgrosse
4. Anzahl Mitgliedstaaten
5. Ground Infrastructure Operations
6. ISO 27001 Status
7. Incident Response Capability

**Ergebnis:** Klassifizierung (Essential/Important/Out-of-Scope), 51 anwendbare Anforderungen, Incident-Reporting-Timeline (24h/72h/1 Monat), Strafrahmen.

### Space Law Assessment (`/assessment/space-law`)

**Multi-Jurisdiktionsvergleich:**

- 10 europaische Jurisdiktionen
- Favorability Score (0-100)
- Vergleichsmatrix (11 Kriterien)
- EU Space Act Cross-Referenzen

---

## 6. Dashboard & Compliance-Module

### Dashboard-Ubersicht (`/dashboard`)

**Hauptansicht mit:**

- 9 Modul-Fortschrittsanzeigen (Donut-Charts)
- Compliance-Score-Breakdown
- Modul-Fortschrittsbalken (Timeline)
- Regulatorisches Radardiagramm (6 Achsen)
- Kennzahlen: Compliance-%, Artikel, Deadlines
- Letzte Aktivitaten & ausstehende Aktionen
- Featured Articles Carousel

### 14 Compliance-Module

#### Modul 1: Authorization (EU Space Act Art. 6-22)

**Funktionen:**

- NCA-Bestimmung (primar + sekundar)
- Betreibertypauswahl (SCO, LO, LSO etc.)
- Pathway-Selektion (Fast-Track vs. Standard)
- Dokumentenmanagement (Antrage, Zertifizierungen, Anderungen)
- Workflow-Zustandsmaschine: DRAFT → SUBMITTED → APPROVED
- Dokumentenstatus-Tracking mit Checkliste
- NCA-Interaktions- & Einreichungstracking

**Status:** Vollstandig implementiert

#### Modul 2: Registration (UN Registry of Space Objects, Art. 24)

**Funktionen:**

- URSO-Registrierung fur Raumfahrzeuge
- Status-Tracking (DRAFT → SUBMITTED → REGISTERED → DEREGISTERED)
- CSV-Export fur UNOOSA-Einreichung
- Filter nach Status + Suche
- Amendment-Workflow

**Status:** Vollstandig implementiert

#### Modul 3: Cybersecurity (NIS2 Art. 21(2) + ISO 27001)

**Funktionen (106.8KB Komponente):**

- Organisationsgrosse & Komplexitatsprofiling
- Space Segment Complexity Assessment
- Datensensitivitats-Klassifizierung
- Auto-Assessment-Vorschlage (ASTRA-Integration)
- 51 NIS2-Anforderungen in Kategorien:
  - Access Control (4 Anforderungen)
  - Encryption (3)
  - Incident Response (2)
  - Supply Chain (3)
  - - weitere
- Evidence Panel fur Dokumentation
- Maturity Level Scoring
- Zertifizierungsoptionen (ISO 27001, SOC 2, IEC 62645)

**Status:** Vollstandig implementiert

#### Modul 4: Debris (EU Space Act Art. 12 + COPUOS/IADC)

**Funktionen (76.4KB):**

- Missionsprofil (Orbit, Hohe, Dauer, Konstellations-Tier)
- Manoeuvrierbarkeitsbewertung
- Passivierungs- & Antriebsanalyse
- Deorbit-Strategie:
  - Aktives Deorbit (< 25 Jahre)
  - Passiver Verfall (25-30 Jahre)
  - Graveyard Orbit (GEO)
- Risikobewertungssystem

**Status:** Vollstandig implementiert

#### Modul 5: Environmental (EU Space Act Art. 11)

**Funktionen (88.6KB):**

- Tragerraketen-Auswahl (Ariane 5, Falcon 9, Vega etc.)
- Treibstoffprofiling (LOX/RP-1, Feststoff etc.)
- EFD-Bewertungsrechner (Environmental Footprint Declaration)
- Lifecycle-Bewertung nach Phase
- Lieferanten-Tracking
- Umweltberichtgenerierung

**Status:** Vollstandig implementiert

#### Modul 6: Insurance (EU Space Act Art. 20)

**Funktionen (84.3KB):**

- Versicherungstyp-Selektor (Pre-Launch, Launch, In-Orbit, TPL)
- Risikoprofil-Builder
- TPL-Berechnungsengine (EUR 300K - EUR 8M pro Mission)
- Pramienabschatzung
- Nationale Anforderungen (10 Jurisdiktionen)
- Policen-Status-Tracker

**Status:** Vollstandig implementiert

#### Modul 7: NIS2 (Richtlinie (EU) 2022/2555)

**Funktionen:**

- 7-Fragen Scoping Wizard
- Entitatsklassifizierung (Essential/Important/Out-of-Scope)
- 51 Art. 21 Anforderungsmapping
- Compliance-Scoring
- Uberlappungserkennung mit EU Space Act
- Risikostufenbewertung
- Incident-Reporting-Timeline (24h/72h/30d)

**Status:** Vollstandig implementiert

#### Modul 8: Supervision (NCA-Reporting)

**Funktionen (56.6KB):**

- NCA-Auswahl & Kontakteinrichtung
- Reporting-Pflichten-Tracker
- Incident-Kategorie & Schweregrad
- Berichtszeitraum-Management
- Kalenderansicht
- Multi-Lander-Uberwachung
- Benachrichtigungsprafenzen

**Status:** Vollstandig implementiert

#### Module 9-14: Erweiterte regulatorische Abdeckung

| Modul              | Regulierung           | Funktionen                                                          |
| ------------------ | --------------------- | ------------------------------------------------------------------- |
| **COPUOS/IADC**    | UN-Leitlinien         | Orbital Debris Mitigation, Konstellations-Tier, Manoeuvrierbarkiet  |
| **Export Control** | ITAR & EAR            | Klassifizierung kontrollierter Guter, Foreign National Restrictions |
| **Spectrum**       | ITU Radio Regulations | Frequenzkoordination, Orbitalslot-Registrierung, EPFD-Limits        |
| **UK Space Act**   | SIA 2018              | UK-Lizenzierung, Safety Cases, CAA-Verfahren                        |
| **US Regulatory**  | FCC/FAA/NORAD         | FCC-Lizenzierung, FAA-Genehmigung, 5-Jahres-Deorbit-Regel           |
| **Digital Twin**   | --                    | 3D-Visualisierung, Missionssimulation, Szenario-Tests               |

### Weitere Dashboard-Features

#### Compliance Tracker (`/dashboard/tracker`)

- Artikel-fur-Artikel-Tracking aller 119 EU Space Act Artikel
- Status-Workflow: Not Started → In Progress → Under Review → Compliant → N/A
- Modulfilterung, Suche, Gruppierung, CSV-Export
- Checklisten-Ansicht nach Phasen

#### Document Vault (`/dashboard/documents`)

- 15+ Dokumentenkategorien
- Drag-Drop Upload
- Status-Tracking (Draft/Submitted/Approved/Expired)
- Ablaufdatum-Management & Alarme
- Compliance-Verlinkung zu Modulen
- Tags & Volltextsuche, CSV-Export

#### Timeline & Deadlines (`/dashboard/timeline`)

- 8 Deadline-Kategorien (Regulatory, License, Reporting, Insurance etc.)
- Dringlichkeitssystem (Uberfalling, Heute, Diese Woche, Diesen Monat)
- Kalenderansicht
- Missionsphasen mit Gantt-Darstellung
- Meilensteine pro Phase (PDR, CDR, Launch Readiness Review etc.)

#### Incidents & Reporting (`/dashboard/incidents`)

- NIS2 Incident Workflow: Detection → Assessment → Notification → Resolution
- Schweregrade: Critical, High, Medium, Low
- Phasen-Tracking mit Countdown-Timern (24h, 72h, 1 Monat)
- NCA-Referenz-Tracking

#### Evidence Coverage (`/dashboard/evidence`)

- Evidenz-Statistiken (eingereicht, akzeptiert, ausstehend, abgelehnt)
- Coverage-Mapping uber 15 Regulierungen
- Chain-Integrity-Verifizierung

#### Network & Stakeholder Portal (`/dashboard/network`)

- Stakeholder-Typen: Rechtsberater, Versicherer, Auditoren, Lieferanten, NCAs
- Engagement-Tracking
- Datenraum-Sharing
- Attestierungs-Verteilung
- Einladungsmanagement

#### NCA Portal (`/dashboard/nca-portal`)

- Paket-Erstellung & Einreichung
- Einreichungsverfolgung
- Status-Updates
- Multi-NCA-Koordination

#### Settings (`/dashboard/settings`)

- 9 Tabs: Profile, Organization, Security, Billing, API Keys, Notifications, Theme, Language, Security Log
- Session-Management mit Remote-Logout
- Passkey-Verwaltung
- MFA (TOTP + Backup Codes)

#### Admin Panel (`/dashboard/admin`)

- Benutzer- & Organisationsmanagement
- Plattform-Analytik (Nutzer, Revenue, Akquisition, Produkt, Infrastruktur)
- Audit-Log-Viewer
- Demo-/Buchungsverwaltung

---

## 7. Compliance-Engines (Kernlogik)

### EU Space Act Engine (`engine.server.ts`)

**Eingaben:**

- Aktivitatstyp → Betreibertyp-Mapping (7 Typen + ALL)
- Niederlassung (EU vs. Drittland)
- Entitatsgrosse (Micro/Small/Medium/Large)
- Konstellationsgrosse & Primarorbit

**Algorithmus:**

1. Map Aktivitat → Betreibertyp (SCO, LO, LSO, ISOS, CAP, PDP, TCO)
2. Lade 119 Artikel aus `caelex-eu-space-act-engine.json` (73 KB)
3. Filtere nach `applies_to` (Betreibertyp + Drittland-Flag)
4. Bestimme Regime: Light (kleine/Forschungs-Entitaten per Art. 10) vs. Standard
5. Mappe Artikel auf 9 Module
6. Berechne Modulstatus: `not_applicable`, `simplified`, `recommended`, `required`
7. Generiere Checklisten: Pre-Authorization, Ongoing, End-of-Life
8. Berechne Autorisierungskosten (EUR 100k/Satellit, EUR 150-300k/Start)

**Ausgabe:**

```
operatorType, regime (light/standard), applicableArticles[],
totalArticles: 119, moduleStatuses[9], checklist[],
keyDates[], estimatedAuthorizationCost, authorizationPath
```

### NIS2 Engine (`nis2-engine.server.ts`)

**Klassifizierungslogik (Art. 2-3):**

| Entitatsgrosse  | Annex I (Space) | Ergebnis                               |
| --------------- | --------------- | -------------------------------------- |
| Micro (<10 MA)  | Ja              | Out-of-scope (sofern nicht designiert) |
| Small (10-50)   | Ja              | Important                              |
| Medium (50-250) | Ja              | Important (Default) oder Essential     |
| Large (>250)    | Ja              | Essential                              |

**Ausgabe:** Klassifizierung, 51 anwendbare Anforderungen, Incident-Timeline (24h/72h/30d), Strafrahmen (EUR 10M/2% bzw. EUR 7M/1.4%).

### Space Law Engine (`space-law-engine.server.ts`)

**10 Jurisdiktionen mit Favorability Scoring (0-100):**

| Land        | Gesetz                     | Jahr | Favorability |
| ----------- | -------------------------- | ---- | ------------ |
| Frankreich  | FSLA 2008                  | 2008 | Hoch         |
| UK          | SIA 2018                   | 2018 | Hoch         |
| Belgien     | SBAA 1968                  | 1968 | Mittel       |
| Niederlande | WBSA 1968                  | 1968 | Mittel       |
| Luxemburg   | LSL 2004 + Space Resources | 2004 | Sehr Hoch    |
| Osterreich  | OSBG 2011                  | 2011 | Mittel       |
| Danemark    | DSBF 1995                  | 1995 | Mittel       |
| Deutschland | Nur Outer Space Treaty     | —    | Niedrig      |
| Italien     | ISDA 1979                  | 1979 | Mittel       |
| Norwegen    | NSL 1969                   | 1969 | Mittel       |

**Scoring-Faktoren:** Timeline-Bonus, Entschadigungsregelung, Haftungsregime, Reifegrad, Sonderbestimmungen, Registrierungssystem, KMU-Vorteile, EU Space Act Beziehung.

### Weitere Engines (15)

| Engine                | Datei                             | Zweck                                 |
| --------------------- | --------------------------------- | ------------------------------------- |
| UK Space Industry Act | `uk-space-engine.server.ts`       | UK-Lizenzierung (CAA, 2 Lizenztypen)  |
| Export Control        | `export-control-engine.server.ts` | ITAR/EAR (600+ kontrollierte Guter)   |
| NIS2 Auto-Assessment  | `nis2-auto-assessment.server.ts`  | Auto-Population aus Firmenprofil      |
| Unified Engine Merger | `unified-engine-merger.server.ts` | Cross-Engine-Konsistenz               |
| Spectrum/ITU          | `spectrum-engine.server.ts`       | ITU Radio Regulations (1.000+ Seiten) |
| US Regulatory         | `us-regulatory-engine.server.ts`  | FCC/FAA/NORAD                         |
| COPUOS/IADC           | `copuos-engine.server.ts`         | ~28.000 registrierte Objekte          |
| RCR                   | `rcr-engine.server.ts`            | Resonance Collision Risk              |
| RRS                   | `rrs-engine.server.ts`            | Relative Risk Scoring                 |
| Anomaly Detection     | `anomaly-detection.server.ts`     | Risiko-Anomalieerkennung              |

---

## 8. Regulatorische Datenbasis

### Dateien & Umfang

| Datei                             | Zeilen | Inhalt                                         |
| --------------------------------- | ------ | ---------------------------------------------- |
| `caelex-eu-space-act-engine.json` | 73 KB  | 119 Artikel, 67 Gruppen, 9 Titel               |
| `articles.ts`                     | 1.117  | 67 Artikelgruppen, 10 Compliance-Typen         |
| `nis2-requirements.ts`            | 3.973  | 51 NIS2-Anforderungen (Art. 21-27)             |
| `cybersecurity-requirements.ts`   | 3.418  | 51+ Cyber-Anforderungen mit Bedrohungsmodellen |
| `enisa-space-controls.ts`         | 1.476  | 21 ENISA Space Controls, NIST/ISO-Mapping      |
| `national-space-laws.ts`          | 1.682  | 10 Jurisdiktionen mit Lizenzanforderungen      |
| `insurance-requirements.ts`       | 1.647  | Versicherungsschwellen nach Betreibertyp       |
| `environmental-requirements.ts`   | 1.333  | 50+ Umweltmetriken, EFD-Bewertung              |
| `debris-requirements.ts`          | 1.114  | 40+ Debris-Regeln, IADC-Leitlinien             |
| `itar-ear-requirements.ts`        | 2.146  | ITAR/EAR Kontrolllisten                        |
| `spectrum-itu-requirements.ts`    | 1.772  | ITU Frequenzbander, EPFD-Limits                |
| `uk-space-industry-act.ts`        | 1.347  | 25+ UK-Lizenzanforderungen                     |
| `us-space-regulations.ts`         | 1.886  | FCC/FAA/NORAD-Regeln                           |
| `copuos-iadc-requirements.ts`     | 1.536  | 50+ COPUOS/IADC-Leitlinien                     |
| `cross-references.ts`             | 1.223  | 100+ NIS2 ↔ EU Space Act Mappings              |
| `modules.ts`                      | 203    | 9 Moduldefinitionen                            |
| `checklists.ts`                   | 570    | 100+ Checklisten-Items                         |

**Gesamtumfang: ~32.000+ Zeilen regulatorischer Code**

### Abgedeckte Regulierungen

1. **EU Space Act (COM(2025) 335)** — 119 Artikel, 10 Annexe, 9 Module
2. **NIS2-Richtlinie (EU 2022/2555)** — 51 Anforderungen, Art. 21-29
3. **Nationale Weltraumgesetze** — 10 EU-Jurisdiktionen
4. **UK Space Industry Act 2018** — 25+ Lizenzanforderungen
5. **US-Regulierung** — FCC, FAA, NORAD
6. **ITAR/EAR** — Exportkontrolle (600+ Guter)
7. **ITU Radio Regulations** — Frequenzkoordination
8. **COPUOS/IADC-Leitlinien** — Debris Mitigation
9. **ISO 27001** — Informationssicherheit
10. **ENISA Space Controls** — 21 sektorspezifische Kontrollen

---

## 9. API-Infrastruktur

### Ubersicht: 383 Route-Handler in 57 Domains

#### Assessment & Compliance (V1 API)

- `/api/v1/compliance/assess` — EU Space Act Assessment (POST)
- `/api/v1/compliance/nis2/assess` — NIS2-Klassifizierung (POST)
- `/api/v1/compliance/space-law/assess` — Multi-Jurisdiktionsanalyse (POST)
- `/api/v1/compliance/articles` — Anwendbare Artikel (GET)
- `/api/v1/compliance/modules` — Modul-Metadaten (GET)
- `/api/v1/compliance/score` — Compliance-Scoring (POST)
- `/api/public/compliance/quick-check` — Offentlicher Quick-Check (POST, ohne Auth)

#### Evidence & Verifizierung

- `/api/v1/evidence/*` — CRUD + Scoring + Coverage + Gap-Analyse
- `/api/v1/verity/attestation/generate` — Attestierungs-Generierung
- `/api/v1/verity/attestation/verify` — Attestierungs-Verifizierung
- `/api/v1/verity/certificate/*` — Zertifikats-Management
- `/api/v1/verity/public-key` — Offentlicher Schlussel

#### Sentinel (Evidence Chain)

- `/api/v1/sentinel/ingest` — Evidence-Paket-Aufnahme
- `/api/v1/sentinel/chain/verify` — Chain-Integritatsprufung
- `/api/v1/sentinel/cross-verify` — Cross-Regulation-Verifizierung
- `/api/v1/sentinel/agents` — Agent-Management

#### Ephemeris (Orbital Intelligence)

- `/api/v1/ephemeris/state` — Aktueller Orbitalzustand
- `/api/v1/ephemeris/forecast` — 72h-Vorhersage
- `/api/v1/ephemeris/simulate` — Orbitalsimulation
- `/api/v1/ephemeris/what-if` — What-If-Analyse
- `/api/v1/ephemeris/fleet` — Flottenanalyse
- `/api/v1/ephemeris/alerts` — Orbital-Alarme

#### Module-spezifische APIs

- `/api/authorization/*` — Workflow-Management (State Machine)
- `/api/cybersecurity/*` — Assessment + Framework-Generierung
- `/api/debris/*` — Assessment + Plan-Generierung
- `/api/environmental/*` — Assessment + EFD-Berechnung
- `/api/insurance/*` — Assessment + Policen-Management
- `/api/nis2/*` — Assessment + Crosswalk + Requirements
- `/api/supervision/*` — Incidents + Reports + Calendar

#### NCA Portal

- `/api/nca-portal/*` — NCA-Officer-Dashboard, Einreichungen, Korrespondenz, Analytik
- `/api/nca/*` — Operator-Einreichungen

#### Netzwerk & Datenraume

- `/api/network/data-rooms/*` — Sichere Datenraume (CRUD + Access Logs)
- `/api/network/engagements/*` — Stakeholder-Engagement
- `/api/network/attestations/*` — Attestierungs-Verteilung
- `/api/stakeholder/*` — Stakeholder-Portal (Token-basierter Zugang)

#### Administration

- `/api/admin/users/*` — Benutzerverwaltung
- `/api/admin/organizations/*` — Organisationsverwaltung
- `/api/admin/analytics/*` — Plattform-Analytik (Overview, Customers, Revenue, Acquisition, Product, Infrastructure)
- `/api/admin/honey-tokens/*` — Honeypot-Token-Management
- `/api/admin/audit` — Sicherheits-Audit-Logs

#### Cron Jobs (15 Scheduled Functions)

| Job                          | Zeitplan         | Zweck                     |
| ---------------------------- | ---------------- | ------------------------- |
| `deadline-reminders`         | Taglich 8:00 UTC | Deadline-Erinnerungen     |
| `document-expiry`            | Taglich 9:00 UTC | Dokumentenablauf          |
| `generate-scheduled-reports` | Montag 6:00 UTC  | Automatische Reports      |
| `demo-followup`              | Taglich          | Demo-Follow-up-Sequenzen  |
| `compliance-snapshot`        | Periodisch       | Compliance-Snapshots      |
| `churn-detection`            | Periodisch       | At-Risk-Kunden            |
| `reengagement`               | Periodisch       | Re-Engagement-Kampagnen   |
| `ephemeris-daily`            | Taglich          | Orbitalvorhersagen-Update |
| `ephemeris-compute-rcr`      | Periodisch       | Resonance Collision Risk  |
| `ephemeris-compute-rrs`      | Periodisch       | Relative Risk Scoring     |
| `data-retention-cleanup`     | Periodisch       | DSGVO-Datenloschung       |
| `nca-deadlines`              | Periodisch       | NCA-Deadline-Tracking     |
| `onboarding-emails`          | Periodisch       | Onboarding-Sequenzen      |
| `regulatory-feed`            | Periodisch       | EUR-Lex Scraping          |
| `analytics-aggregate`        | Periodisch       | Metrik-Aggregation        |

---

## 10. Datenbank-Schema

### Ubersicht

| Metrik             | Wert                                       |
| ------------------ | ------------------------------------------ |
| Prisma-Schema      | 2.424 Zeilen                               |
| Modelle (Tabellen) | 158                                        |
| Felder gesamt      | ~4.500+                                    |
| Indizes            | 428                                        |
| Unique Constraints | 76 Enums                                   |
| Relationen         | Multi-Tenant mit kaskadierenden Loschungen |

### Modelle nach Domain

| Domain                       | Anzahl Modelle | Beispiele                                                                             |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| Auth & Sessions              | 5              | User, Account, Session, VerificationToken, MfaConfig                                  |
| Security & Access            | 10             | WebAuthnCredential, LoginEvent, SecurityEvent, ApiKey, Webhook                        |
| Organisation & Multi-Tenancy | 5              | Organization, OrganizationMember, Invitation, Subscription, SSOConnection             |
| Audit & Evidence             | 6              | AuditLog, ComplianceEvidence, ComplianceAttestation                                   |
| Compliance Assessments       | 12             | Debris-, Cyber-, Insurance-, Environmental-, NIS2-, CopuosAssessment + Status-Modelle |
| Regulatory Frameworks        | 10             | UK, US, ExportControl, Spectrum Assessments + Status                                  |
| Dokumente & Vault            | 7              | Document, DocumentAccessLog, DocumentComment, NCADocument                             |
| Workflow & Autorisierung     | 4              | AuthorizationWorkflow, AuthorizationDocument, Deadline, MissionPhase                  |
| Incidents & Breaches         | 5              | Incident, IncidentAsset, IncidentNIS2Phase, BreachReport                              |
| Reports & Supervision        | 6              | SupervisionConfig, SupervisionReport, ScheduledReport, NCASubmission                  |
| Spacecraft & Registrierung   | 5              | Spacecraft, SpaceObjectRegistration, RegistrationStatusHistory                        |
| Notifications                | 2              | Notification, NotificationPreference                                                  |
| Analytics & Health           | 9              | AnalyticsEvent, CustomerHealthScore, FeatureUsageDaily, RevenueSnapshot               |
| AI & Automation              | 5              | AstraConversation, AstraMessage, GeneratedDocument, Comment, Activity                 |
| Assure (Investor Readiness)  | 24             | RRS, DDPackage, CompanyProfile, RCR, DataRoom etc.                                    |
| Academy (Lernen)             | 9              | Course, Module, Lesson, Question, Enrollment, Badge, Simulation                       |
| Ephemeris (Predictive)       | 4              | SatelliteComplianceState, EphemerisForecast, SatelliteAlert                           |
| Sentinel & Attestation       | 6              | SentinelAgent, SentinelPacket, VerityAttestation, VerityCertificate                   |
| API & Widget                 | 3              | ApiRequest, WidgetConfig, NewsletterSubscription                                      |
| Engagement & Booking         | 2              | Booking, StakeholderEngagement                                                        |
| Datenraume                   | 3              | DataRoom, DataRoomDocument, DataRoomAccessLog                                         |

### Verschlusselte Felder (AES-256-GCM)

| Modell                         | Felder                                                   |
| ------------------------------ | -------------------------------------------------------- |
| User                           | taxId, phoneNumber                                       |
| Organization                   | vatNumber, bankAccount, taxId                            |
| InsuranceAssessment            | policyNumber                                             |
| EnvironmentalAssessment        | internalNotes                                            |
| Incident                       | description, rootCause, impactAssessment, lessonsLearned |
| CybersecurityRequirementStatus | notes, evidenceNotes                                     |
| NIS2RequirementStatus          | notes, evidenceNotes                                     |
| SupervisionReport              | content, rejectionReason                                 |

---

## 11. Authentifizierung & Zugriffskontrolle

### Authentifizierungsmethoden

| Methode           | Technologie            | Details                                        |
| ----------------- | ---------------------- | ---------------------------------------------- |
| Email/Passwort    | Bcrypt (12 Runden)     | Rate Limit: 5 Versuche/15 Min                  |
| Google OAuth      | NextAuth Provider      | Prompt: "consent" + Offline-Zugang             |
| Apple OAuth       | NextAuth Provider      | Optional                                       |
| WebAuthn/Passkeys | FIDO2                  | TouchID/FaceID, Challenge-Tokens (5 Min)       |
| TOTP 2FA          | SHA-256, 6 Digits, 30s | AES-verschlusseltes Secret, 8 Backup-Codes     |
| SAML/OIDC SSO     | Enterprise             | IdP-initiated + SP-initiated, JIT-Provisioning |
| API Keys          | SHA-256 Hash           | Scoped, HMAC-signiert, ratenlimitiert          |

### RBAC-Rollensystem

| Rolle   | Level | Berechtigungen                                                                |
| ------- | ----- | ----------------------------------------------------------------------------- |
| OWNER   | 0     | Vollzugriff (`*`)                                                             |
| ADMIN   | 1     | 26 Berechtigungen (Org, Mitglieder, Compliance, Reports, Audit, API, Network) |
| MANAGER | 2     | 20 Berechtigungen (Compliance, Reports, Spacecraft, Dokumente)                |
| MEMBER  | 3     | 12 Berechtigungen (Compliance, Reports, Dokumente, Incidents)                 |
| VIEWER  | 4     | 7 Berechtigungen (nur Lesezugriff)                                            |

### API-Key-Scopes

```
read:compliance, write:reports, read:spacecraft,
read:incidents, write:incidents, read:assessments,
read:documents, read:users, read:subscriptions
```

---

## 12. Sicherheitsinfrastruktur

### Implementierte Sicherheitsmassnahmen

| Bereich                | Implementierung                                                       |
| ---------------------- | --------------------------------------------------------------------- |
| **CSRF-Schutz**        | Origin-Header-Validierung + Token-Cookie (`__Host-authjs.csrf-token`) |
| **Rate Limiting**      | 19 Tiers via Upstash Redis + In-Memory Fallback                       |
| **Verschlusselung**    | AES-256-GCM mit Scrypt-Schlusselableitung, per-Org Key Isolation      |
| **CSP**                | Nonce-basiert, `strict-dynamic`, keine Inline-Scripts                 |
| **HSTS**               | 2 Jahre Preload                                                       |
| **X-Frame-Options**    | DENY                                                                  |
| **Permissions-Policy** | 14 Einschrankungen (Kamera, Mikrofon, Geolocation etc.)               |
| **Bot-Erkennung**      | User-Agent-Blocking (10+ Patterns)                                    |
| **Brute-Force-Schutz** | 5 Login-Versuche → 15 Min Lockout, 10 Versuche → 30 Min               |
| **Honeypot-Tokens**    | Credential-Decoys mit Trigger-Alerts                                  |
| **Audit-Trail**        | SHA-256 Hash-Chain (tamper-proof), 100+ Action Types                  |
| **Source Maps**        | In Produktion deaktiviert                                             |
| **Pre-Commit**         | ESLint, TypeScript, TruffleHog Secret Scanning                        |
| **CI Security**        | CodeQL SAST, Dependency Review, npm audit                             |

### Rate Limiting Tiers (Auswahl)

| Tier       | Limit   | Window   | Zweck                 |
| ---------- | ------- | -------- | --------------------- |
| api        | 100/min | 1 Min    | Allgemeine API        |
| auth       | 5/min   | 1 Min    | Login/Signup          |
| assessment | 10/h    | 1 Stunde | Assessment-Erstellung |
| sensitive  | 5/h     | 1 Stunde | Passwortwechsel       |
| mfa        | 5/min   | 1 Min    | TOTP-Verifizierung    |

### Audit-Trail Hash-Chain

```
entryHash = SHA256(
  userId + action + entityType + entityId +
  timestamp + previousValue + newValue +
  ipAddress + userAgent + previousHash
)
```

Chain-Root: `GENESIS_{organizationId}`. Manipulation eines Eintrags bricht alle nachfolgenden Hashes.

---

## 13. Verity — Kryptographische Attestierung

### Konzept

Verity ermoglicht es Satellitenbetreibern, Compliance gegenuber Regulierungsbehorden **kryptographisch zu beweisen, ohne operative Daten offenzulegen** (Zero-Knowledge-Prinzip).

### 5 Standalone-Pakete

| Paket                         | Zweck                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `@caelex/verity-core`         | Kryptographische Primitiven: Ed25519 Signaturen, SHA-256 Commitments, Canonical JSON, AES-256-GCM Key Encryption |
| `@caelex/verity-server`       | API-Server mit PostgreSQL, Auth-Middleware, Transparency Log                                                     |
| `@caelex/verity-transparency` | Merkle-Baum, Hash-Chain, Checkpoint-Verifizierung                                                                |
| `@caelex/verity-verifier-sdk` | Offline-Verifizierungs-SDK (Zero Dependencies, kein Netzwerk notig)                                              |
| `@caelex/verity-cli`          | CLI-Tool: `verity verify-attestation`, `verify-cert`, `verify-proof`, `show`                                     |

### Ablauf

1. **Datenaufnahme:** Betreiber ubermittelt Telemetrie an Caelex
2. **Evaluierung:** Compliance-Engine pruft gegen regulatorischen Schwellenwert
3. **Hash & Commit:** Rohwert wird SHA-256-gehasht (Commitment ohne Offenlegung)
4. **Signierung:** Ed25519 Dual-Signatur (Operator + Attester)
5. **Zerstorung:** Rohwert wird irreversibel geloscht
6. **Verifizierung:** Jeder kann mit Caelex Public Key offline verifizieren

### Marketing-Seite (`/verity`)

8 Sektionen: Hero, Compliance Paradox, How It Works (4 Steps), Split-Screen (Operator vs. Regulator), Architecture (3 Crypto-Karten), Use Cases, Embedded Verify Tool, CTA.

### Demo-Seite (`/testdemo1`)

Fullscreen 4-Thread Terminal-Visualisierung des Attestierungsprozesses mit Live-Kryptographie-Simulation.

---

## 14. Ephemeris — Predictive Compliance

### Konzept

Ephemeris modelliert jeden Satelliten als **lebendigen Digital Twin** und berechnet die Compliance-Zukunft — fur jede Regulierung, jeden Satelliten, jeden Tag der nachsten funf Jahre.

### Funktionen

- **Fleet Overview:** Flottenweite Compliance-Ubersicht mit NORAD-IDs
- **Compliance Horizon:** Tage bis zum ersten regulatorischen Verstoss
- **Alert-System:** Aktive Alarme (Deorbit nahert sich, Kollisionsrisiko)
- **Szenario-Builder:** Block-Palette-Interface fur What-If-Analysen
- **Jurisdiktions-Simulator:** Compliance pro Jurisdiktion
- **Data Freshness Tracking:** Aktualitat der Datenquellen

### Datenquellen

- CelesTrak TLE-Integration
- Solar-Flux-Vorhersagen
- Sentinel-5P atmospharische Dichte

### APIs

- State, Forecast (72h), Simulate, What-If, Fleet, Alerts, History, Horizon, Recalculate

---

## 15. Sentinel — Evidence Chain

### Konzept

Autonome Agenten, die bei Betreibern eingesetzt werden und kontinuierlich operative Daten uberwachen, gegen regulatorische Anforderungen validieren und Evidence-basierte Compliance-Berichte an Caelex senden.

### Funktionen

- Agent-Registrierung & Management
- Evidence-Paket-Aufnahme (kryptographisch signiert)
- Hash-Chain-Verifizierung (tamper-evident)
- Cross-Verification gegen offentliche Orbitaldaten
- Trust Scoring pro Agent

---

## 16. Astra — AI-Assistent

### Funktionen

- **Auto-Fill:** Formularfelder automatisch aus Kontext ausfullen
- **Compliance-Vorschlage:** Status-Anderungen empfehlen
- **Report-Zusammenfassungen:** Berichte automatisch generieren
- **Bulk-Operationen:** Multi-Feld-Batch-Operations
- **Chat-Interface:** Vollstandige Konversations-UI (AstraFullPage)
- **Modul-Integration:** Verfugbar in allen Compliance-Modulen

### Datenmodelle

- `AstraConversation` — Gesprache mit Topic-Area (compliance/regulatory/technical)
- `AstraMessage` — Chat-Verlauf (user/assistant) mit Metadaten

---

## 17. Academy — Lernplattform

### Funktionen

- **Kurse & Module:** Strukturiertes Curriculum
- **Lektionen:** Textinhalt, Video, geschatzte Zeit
- **Quizzes:** Multiple-Choice mit Erklarungen
- **Enrollment-System:** Kurseinschreibung mit Fortschrittstracking
- **Classrooms:** Instruktor-Raume mit Studenten-Roster & Analytik
- **Badges:** Gamification mit Achievement-System
- **Compliance-Simulationen:** Praxisnahe Szenario-Ubungen
- **Sandbox:** Compliance-Berechnungs-Sandbox

### Datenmodelle (9)

AcademyCourse, AcademyModule, AcademyLesson, AcademyQuestion, AcademyEnrollment, AcademyLessonCompletion, AcademyClassroom, AcademyBadge, AcademySimulationRun

---

## 18. Assure — Investor Readiness

### Konzept

Plattform fur regulatorische Due Diligence und Investment Readiness von Raumfahrtunternehmen.

### Funktionen (24 Modelle)

#### Regulatory Readiness Score (RRS)

- Compliance-Score + Maturity-Score
- Historische Snapshots
- Externe Share-Links (tokenisiert, zeitbegrenzt)

#### Regulatory Credit Rating (RCR)

- Branchenvergleich (Benchmarks)
- Rating-Appelle
- Zeitreihen-Tracking

#### Due Diligence Pakete

- Firmenprofil, Tech-Profil, Marktprofil, Team-Profil
- Finanz- & Regulierungsprofil
- Wettbewerbs- & Traktionsanalyse
- Investment Readiness Score

#### Datenraume

- Sichere Kollaborationsraume
- Zeitbegrenzte Zugriffslinks
- Audit-Trail fur Zugriffe
- Dokumentenmanagement

---

## 19. Billing & Monetarisierung

### Preistiers

| Plan             | Nutzer     | Spacecraft | Preis          | Features                           |
| ---------------- | ---------- | ---------- | -------------- | ---------------------------------- |
| **Free**         | 1          | 1          | EUR 0          | Basis-Assessments, keine Reports   |
| **Starter**      | 5          | 5          | ~EUR 99/Monat  | Alle Assessments + 5 Reports/Jahr  |
| **Professional** | 25         | 50         | ~EUR 599/Monat | Unlimitierte Reports + API-Zugang  |
| **Enterprise**   | Unbegrenzt | Unbegrenzt | Individuell    | SSO + Webhooks + Dedicated Support |

### Stripe-Integration

- Checkout-Session-Erstellung
- Customer Billing Portal (Self-Service)
- Subscription-Management
- Webhook-Handler (payment_succeeded, subscription.updated etc.)
- Usage-based Overage Charges
- 14-Tage Trial

### Feature Gating

`FeatureGate`-Komponente sperrt Module je nach Subscription-Plan.

---

## 20. Email, PDF & Kommunikation

### Email-System

| Template                | Zweck                                   |
| ----------------------- | --------------------------------------- |
| `deadline-reminder`     | Bevorstehende Compliance-Deadline       |
| `document-expiry`       | Dokument lauft in 30/14/7 Tagen ab      |
| `incident-alert`        | NIS2 Incident gemeldet                  |
| `weekly-digest`         | Wochentliche Compliance-Zusammenfassung |
| `supplier-data-request` | Umwelt-Lieferanten-Fragebogen           |
| `base-layout`           | Basis-HTML-Layout                       |

**Provider:** Resend (primar), Nodemailer SMTP (Fallback), Graceful No-Op ohne Konfiguration.

### PDF-Generierung (11 Report-Typen)

| Kategorie      | Reports                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| NCA Reports    | Incident Report, Annual Compliance Report, Significant Change Report, Compliance Summary |
| Modul Reports  | Debris Mitigation Plan, Insurance Compliance Report, Authorization Application           |
| Assure Reports | Executive Summary, Investment Teaser, Company Profile, Risk Report                       |
| Sonstige       | Audit Report, Compliance Certificate                                                     |

### Dateispeicherung

- **Backend:** Cloudflare R2 (S3-kompatibel, EUR 0.015/GB/Monat)
- **Upload:** Presigned URLs (1h gultig), Client-seitig direkt zu R2
- **Max. Grosse:** 100 MB
- **Erlaubte Formate:** PDF, DOCX, XLSX, PPTX, PNG, JPG, SVG, XML, JSON, CSV, TXT

---

## 21. Testing & CI/CD

### Test-Infrastruktur

| Typ               | Framework             | Dateien | Coverage-Ziel                |
| ----------------- | --------------------- | ------- | ---------------------------- |
| Unit Tests        | Vitest 3.0            | 111     | 85% Statements, 80% Branches |
| Integration Tests | Vitest + MSW          | 37      | 85% Lines                    |
| E2E Tests         | Playwright (Chromium) | 6       | —                            |

### Getestete Bereiche

- Compliance Engines (EU Space Act, NIS2, Space Law)
- Permission System (RBAC-Checks)
- Encryption/Decryption
- Rate Limiting
- CSRF Tokens
- Audit Hashing (Chain Integrity)
- API Key Validation
- Webhook Delivery

### CI/CD Pipeline (GitHub Actions)

| Pipeline       | Schritte                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **CI**         | Lint + Typecheck → Unit/Integration Tests (Coverage) → E2E Tests → Security Audit → Bundle Size Check → Lighthouse Performance |
| **Security**   | CodeQL SAST (wochentlich + PRs) → Dependency Review → TruffleHog Secret Scanning                                               |
| **Pre-Commit** | ESLint + TypeScript auf Staged Files + Secret Detection (Regex fur API Keys, AWS Keys, Private Keys, Passwort-Patterns)        |
| **Deployment** | Vercel Auto-Deploy bei Push auf `main`                                                                                         |

---

## 22. Deployment & Monitoring

### Deployment

| Aspekt               | Detail                             |
| -------------------- | ---------------------------------- |
| Platform             | Vercel (Auto-Deploy bei Push)      |
| Database             | Neon PostgreSQL (Serverless)       |
| Build                | `prisma generate && next build`    |
| Node.js              | >= 18.0.0                          |
| Source Maps          | Deaktiviert in Produktion          |
| Edge Functions       | Middleware auf Vercel Edge Runtime |
| Serverless Functions | API Routes                         |
| CDN                  | Vercel Edge Network                |

### Monitoring

| System           | Zweck                                                          |
| ---------------- | -------------------------------------------------------------- |
| Sentry           | Error Tracking                                                 |
| LogSnag          | Event Analytics                                                |
| Vercel Analytics | Web Analytics & Web Vitals                                     |
| Custom Metrics   | AnalyticsEvent-Modell (Event Type, Properties, Timestamp)      |
| API Logging      | ApiRequest-Modell (Method, Path, Status, ResponseTime, IP, UA) |
| Security Events  | SecurityEvent-Modell (Type, Severity, Metadata)                |
| Audit Trail      | AuditLog + Hash-Chain-Verifizierung                            |

---

## 23. Kennzahlen-Zusammenfassung

### Plattform-Metriken

| Kategorie           | Metrik                   | Wert                                                  |
| ------------------- | ------------------------ | ----------------------------------------------------- |
| **Codebase**        | Datenbank-Modelle        | 158                                                   |
|                     | Datenbankfelder          | ~4.500+                                               |
|                     | Datenbank-Indizes        | 428                                                   |
|                     | Prisma-Schema            | 2.424 Zeilen                                          |
| **API**             | Route-Handler            | 383                                                   |
|                     | API-Domains              | 57                                                    |
|                     | Cron Jobs                | 15                                                    |
| **Engines**         | Compliance-Engines       | 18                                                    |
|                     | Service-Dateien          | 70+                                                   |
| **Regulierung**     | EU Space Act Artikel     | 119                                                   |
|                     | NIS2-Anforderungen       | 51                                                    |
|                     | Jurisdiktionen           | 10 EU + UK + US                                       |
|                     | Compliance-Module        | 14                                                    |
|                     | Regulatorische Daten     | 32.000+ Zeilen                                        |
| **Frontend**        | Seiten-Routen            | 44+                                                   |
|                     | React-Komponenten        | 130+                                                  |
|                     | Komponentenverzeichnisse | 20                                                    |
| **Testing**         | Test-Dateien gesamt      | 154                                                   |
|                     | Unit Tests               | 111                                                   |
|                     | Integration Tests        | 37                                                    |
|                     | E2E Tests                | 6                                                     |
|                     | Coverage-Ziel            | 85% Statements                                        |
| **Sicherheit**      | Auth-Methoden            | 6 (Credentials, OAuth, WebAuthn, TOTP, SSO, API Keys) |
|                     | Rate Limiting Tiers      | 19                                                    |
|                     | RBAC-Rollen              | 5                                                     |
|                     | Verschlusselte Felder    | 15+                                                   |
|                     | Audit Action Types       | 100+                                                  |
| **Monetarisierung** | Preistiers               | 4 (Free, Starter, Professional, Enterprise)           |
|                     | Email-Templates          | 6                                                     |
|                     | PDF-Report-Typen         | 11                                                    |

### Reife-Bewertung

| Feature-Bereich                                                      | Status                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Landing Page & Marketing                                             | Produktionsreif                                             |
| Assessment-Wizards (EU Space Act, NIS2, Space Law)                   | Produktionsreif                                             |
| Dashboard & 8 Kern-Module                                            | Produktionsreif                                             |
| 6 Erweiterte Module (COPUOS, Export, Spectrum, UK, US, Digital Twin) | Produktionsreif                                             |
| Dokumentenvault & Compliance Tracker                                 | Produktionsreif                                             |
| Timeline & Deadline Management                                       | Produktionsreif                                             |
| NCA Portal & Einreichungen                                           | Produktionsreif                                             |
| Incident Management (NIS2 Workflow)                                  | Produktionsreif                                             |
| Settings, Admin Panel, Multi-Tenancy                                 | Produktionsreif                                             |
| Authentifizierung & Sicherheit                                       | Enterprise-Grade                                            |
| Verity (Kryptographische Attestierung)                               | Funktional (Marketing-Seite + Demo + APIs + Crypto-Pakete)  |
| Ephemeris (Predictive Compliance)                                    | Funktional (Fleet API + Dashboard + Szenario-Builder)       |
| Sentinel (Evidence Chain)                                            | Architektur vorhanden, Agent-System teilweise implementiert |
| Astra (AI-Assistent)                                                 | Funktional (Chat UI + Modul-Integration)                    |
| Academy (Lernplattform)                                              | Funktional (Kurse, Quizzes, Badges, Simulationen)           |
| Assure (Investor Readiness)                                          | Funktional (24 Modelle, RRS, RCR, Datenraume)               |
| Billing (Stripe)                                                     | Produktionsreif                                             |
| Network & Stakeholder Portal                                         | Funktional                                                  |

---

**Dieses Dokument basiert auf einer vollstandigen, automatisierten Analyse aller Quelldateien der Caelex-Plattform zum Stichtag 05.03.2026.**
