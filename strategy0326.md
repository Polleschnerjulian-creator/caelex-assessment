# CAELEX — Strategischer Plattformbericht

**Datum:** 4. März 2026
**Klassifikation:** Vertraulich — Nur für Geschäftsleitung
**Umfang:** Vollständige Code-Analyse aller ~200.000+ Zeilen, 384 API-Routen, 50+ Datenbankmodelle, 130+ UI-Komponenten, 80+ Seiten

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Plattform-Architektur](#2-plattform-architektur)
3. [Produkt-Bestandsaufnahme](#3-produkt-bestandsaufnahme)
4. [Compliance Engines — Das Herzstück](#4-compliance-engines)
5. [Advanced Systems — Differenzierung](#5-advanced-systems)
6. [API-Landschaft](#6-api-landschaft)
7. [Datenbank & Infrastruktur](#7-datenbank--infrastruktur)
8. [Security Posture](#8-security-posture)
9. [Qualitätssicherung & Testing](#9-qualitätssicherung--testing)
10. [UI/UX & Design System](#10-uiux--design-system)
11. [Redundanzen & Architektur-Schulden](#11-redundanzen--architektur-schulden)
12. [Fehler & Risiken — Priorisiert](#12-fehler--risiken)
13. [Wettbewerbsposition](#13-wettbewerbsposition)
14. [Strategische Empfehlungen](#14-strategische-empfehlungen)
15. [Anhang: Vollständige Dateninventare](#15-anhang)

---

## 1. Executive Summary

### Was ist Caelex?

Caelex ist eine **Full-Stack SaaS-Plattform für Weltraum-Regulierungs-Compliance**, gebaut mit Next.js 15, PostgreSQL (Neon), Prisma ORM und NextAuth v5. Die Plattform hilft Satellitenbetreibern, Raketenstart-Anbietern und Weltraum-Dienstleistern bei der Einhaltung des EU Space Act (COM(2025) 335), der NIS2-Richtlinie (EU 2022/2555) und nationaler Weltraumgesetze über 10 europäische Jurisdiktionen.

### Kernmetriken

| Metrik                    | Wert                                                 |
| ------------------------- | ---------------------------------------------------- |
| Codezeilen (geschätzt)    | ~200.000+                                            |
| API-Endpunkte             | ~550+ über 384 Route-Dateien                         |
| Datenbankmodelle          | 50+ mit 108 Indices                                  |
| UI-Komponenten            | 130+ über 20 Verzeichnisse                           |
| Seitenrouten              | 80+ (44 Dashboard + Marketing/Legal)                 |
| Regulierungsdaten         | 33.700 Zeilen strukturierter Compliance-Daten        |
| Test-Dateien              | 132 (86 Unit + 31 Integration + 14 E2E + 1 Contract) |
| Produktionsabhängigkeiten | 43 npm-Packages                                      |
| Cron-Jobs                 | 15 täglich/wöchentlich                               |
| Compliance-Module         | 13 regulatorische Bewertungsmodule                   |
| Jurisdiktionen            | 10 europäische + US + international                  |

### Stärken auf einen Blick

1. **Regulatorische Tiefe ist ein echtes Competitive Moat**: 33.700 Zeilen kodifizierter Regulierungsdaten (119 EU Space Act Artikel, 51 NIS2-Anforderungen, 10 Jurisdiktionen) sind nicht trivial reproduzierbar
2. **Echte Kryptographie, keine Attrappen**: Verity (Ed25519 Signaturen), Sentinel (Hash-Chains), AES-256-GCM Verschlüsselung — produktionsreife Implementierungen
3. **Vollständige Feature-Abdeckung**: Fast jedes Dashboard-Modul ist voll funktionsfähig mit Datenabruf, Fehlerbehandlung, Lade-States und substantivem UI
4. **Defense-in-Depth Security**: Doppelte CSRF-Schutzschichten, Session-gebundene Tokens, 7-stufiges Rate-Limiting, Audit-Hash-Chain, Per-Tenant-Verschlüsselung

### Schwächen auf einen Blick

1. **NextAuth v5 Beta in Produktion** — Pre-Release-Abhängigkeit als Authentifizierungs-Backbone
2. **Architekturelle Redundanzen**: Digital Twin vs. Ephemeris, zwei Data-Room-Implementierungen, zwei NCA-APIs
3. **Test-Coverage-Illusion**: 85% Schwellenwerte, aber 80%+ der Codebasis ist von Coverage-Messung ausgenommen
4. **Light/Dark-Mode Inkonsistenz**: Migration unvollständig — einige Komponenten zeigen weißen Text auf weißem Hintergrund
5. **Rate-Limiting-Lücken**: 40% der Endpunkte haben kein Rate-Limiting, inkl. rechenintensive Ephemeris-Routen

---

## 2. Plattform-Architektur

### Tech Stack

| Schicht         | Technologie                         | Status                     |
| --------------- | ----------------------------------- | -------------------------- |
| Framework       | Next.js 15 (App Router)             | Aktuell                    |
| Sprache         | TypeScript (Strict Mode)            | Exzellent                  |
| Datenbank       | PostgreSQL via Neon Serverless      | Produktionsreif            |
| ORM             | Prisma 5.22                         | Aktuell                    |
| Auth            | NextAuth v5 (5.0.0-beta.30)         | **BETA — Risiko**          |
| Payments        | Stripe                              | Produktionsreif            |
| Storage         | Cloudflare R2 (S3-kompatibel)       | Produktionsreif            |
| Rate Limiting   | Upstash Redis                       | Konfigurationsabhängig     |
| Verschlüsselung | AES-256-GCM (scrypt)                | OWASP-konform              |
| Email           | Resend + SMTP-Fallback              | Dual-Provider              |
| AI              | Anthropic Claude Sonnet 4.6         | Produktionsreif (optional) |
| 3D              | Three.js (@react-three/fiber)       | Nur Landing Page           |
| PDF             | @react-pdf/renderer + jsPDF         | Dual-Engine                |
| Monitoring      | Sentry + LogSnag + Vercel Analytics | Produktionsreif            |
| CI/CD           | GitHub Actions + Vercel Auto-Deploy | Produktionsreif            |

### Verzeichnisstruktur

```
src/
├── app/                    80+ Seitenrouten + 384 API-Route-Dateien
│   ├── (root)              Landing Page, Layout, Globals
│   ├── academy/            Lernplattform (16 Seiten)
│   ├── assessment/         3 Bewertungs-Wizards + Unified Wizard
│   ├── assure/             Investment-Readiness-Plattform (16+ Seiten)
│   ├── dashboard/          Authentifiziertes Dashboard mit 13 Modulen
│   ├── api/                384 Route-Handler über 55+ Domänen
│   ├── resources/          Öffentliche Ressourcen
│   └── legal/              Rechtliche Seiten (DE + EN)
├── components/             130+ React-Komponenten
├── data/                   33.700 Zeilen regulatorische Daten
├── lib/                    Business-Logik, Engines, Services
│   ├── astra/              AI-Copilot (16 Dateien)
│   ├── assure/             Investment-Readiness-Engines (7 Dateien)
│   ├── ephemeris/          Prädiktive Compliance (21 Dateien)
│   ├── verity/             Kryptographische Attestierungen (18 Dateien)
│   ├── services/           24 Service-Dateien
│   └── ...                 Engines, Validierung, Verschlüsselung
├── hooks/                  4 Custom React Hooks
└── types/                  2 Typ-Deklarationen

prisma/schema.prisma        2.424 Zeilen, 50+ Modelle, 108 Indices
tests/                      132 Test-Dateien
```

---

## 3. Produkt-Bestandsaufnahme

### 3.1 Kernprodukt: Compliance-Bewertung & Management

| Feature                                             | Implementierungsstatus    | Bewertung       |
| --------------------------------------------------- | ------------------------- | --------------- |
| **EU Space Act Assessment** (8 Fragen, 119 Artikel) | Vollständig implementiert | Produktionsreif |
| **NIS2 Assessment** (51 Anforderungen)              | Vollständig implementiert | Produktionsreif |
| **National Space Laws** (10 Jurisdiktionen)         | Vollständig implementiert | Produktionsreif |
| **Unified Assessment** (~35 Fragen, 3 Frameworks)   | Vollständig implementiert | Produktionsreif |
| **Results Gate** (Lead-Capture)                     | Vollständig implementiert | Produktionsreif |
| Auto-Save/Resume                                    | Ja (localStorage, 7 Tage) | Gut             |
| Google OAuth Return                                 | Ja                        | Gut             |

### 3.2 Dashboard-Module (13 Compliance-Module)

| Modul                     | Zeilen       | API-Routen | Status                                                        |
| ------------------------- | ------------ | ---------- | ------------------------------------------------------------- |
| Authorization & Licensing | ~62KB        | 6          | Vollständig mit NCA-Bestimmung, Workflow-State-Machine        |
| Cybersecurity             | ~107KB       | 4          | Vollständig, Art. 21(2) (a)-(j), **sollte aufgeteilt werden** |
| NIS2 Directive            | 1.109 Zeilen | 5          | Vollständig mit Entity-Klassifikation                         |
| Debris Mitigation         | ~76KB        | 3          | Vollständig mit Konstellations-Tiering                        |
| Environmental Footprint   | ~89KB        | 8          | Vollständig mit Screening-LCA                                 |
| Insurance & Liability     | ~84KB        | 4          | Vollständig mit TPL-Berechnung                                |
| Registration (URSO)       | 633 Zeilen   | 5          | Vollständig mit COSPAR-ID-Generierung                         |
| Supervision & Reporting   | —            | 13         | Vollständig mit verschlüsselten Incident-Feldern              |
| Spectrum & ITU            | ~57KB        | 4          | Vollständig                                                   |
| Export Control (ITAR/EAR) | ~59KB        | 4          | Vollständig                                                   |
| COPUOS/IADC               | ~57KB        | 4          | Vollständig                                                   |
| UK Space Act 2018         | ~64KB        | 4          | Vollständig mit dedizierter UK-Engine                         |
| US Regulatory (FCC/FAA)   | ~82KB        | 5          | Vollständig                                                   |

**Fazit:** Jedes Modul ist vollständig implementiert mit domain-spezifischen Daten, Bewertungs-Wizards, Anforderungstracking und Report-Generierung. Die Compliance-Module repräsentieren erhebliche Domain-Expertise.

### 3.3 Advanced Systems

| System                                     | Dateien                  | Status                   | Differenzierungswert                                            |
| ------------------------------------------ | ------------------------ | ------------------------ | --------------------------------------------------------------- |
| **Verity** (Kryptographische Attestierung) | 18 Lib + 6 API + 5 UI    | Produktionsreif          | **SEHR HOCH** — Echte Ed25519-Kryptographie, Privacy-Preserving |
| **Sentinel** (Autonome Evidenz-Sammlung)   | Services + 7 API + 1 UI  | Server-Seite vollständig | **HOCH** — Hash-Chains, CelesTrak-Integration, SGP4             |
| **Ephemeris** (Prädiktive Compliance)      | 21 Lib + 9 API + 17 UI   | Vollständig              | **SEHR HOCH** — 5 Vorhersagemodelle, Szenario-Builder           |
| **ASTRA** (AI-Copilot)                     | 16 Lib + 1 API + 14 UI   | Bedingt (API-Key)        | **HOCH** — Claude Sonnet, Tool-Ausführung, Kontext-Awareness    |
| **Digital Twin**                           | 1 Service + 8 API + 1 UI | Vollständig              | **MITTEL** — Überschneidung mit Ephemeris                       |
| **Assure** (Investment Readiness)          | 7 Lib + 52 API + 20+ UI  | Vollständig              | **HOCH** — Eigenständiges Produkt innerhalb Caelex              |
| **Compliance Network**                     | 12 API + UI              | Vollständig              | **MITTEL** — Stakeholder-Management, Data-Rooms                 |
| **NCA Portal**                             | 9 API + 4 UI             | Vollständig              | **HOCH** — End-to-End NCA-Einreichungen                         |
| **Regulatory Feed**                        | Cron + API + UI          | Vollständig              | **MITTEL** — EUR-Lex-Monitoring                                 |
| **Academy**                                | 16 API + UI              | Vollständig              | **MITTEL** — Lernplattform mit Quizzes, Simulationen            |

### 3.4 SaaS-Infrastruktur

| Feature                        | Status                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| Multi-Tenant-Organisationen    | Vollständig (Org > Members > Roles)                             |
| RBAC (5 Rollen)                | Vollständig (OWNER > ADMIN > MANAGER > MEMBER > VIEWER)         |
| 48+ granulare Berechtigungen   | Vollständig                                                     |
| Stripe-Billing (4 Pläne)       | Vollständig (FREE, STARTER €299, PROFESSIONAL €799, ENTERPRISE) |
| Feature-Gating pro Plan        | Vollständig                                                     |
| Dokument-Vault mit R2-Storage  | Vollständig                                                     |
| Audit-Trail mit Hash-Chain     | Vollständig                                                     |
| API v1 mit Key-Management      | Vollständig                                                     |
| Webhook-System                 | Vollständig                                                     |
| SSO (SAML/OIDC)                | Vollständig                                                     |
| MFA (TOTP + Passkeys/WebAuthn) | Vollständig                                                     |
| i18n (EN/DE, erweiterbar)      | Teilweise (Dashboard ja, Landing nein)                          |
| Embeddable Compliance Widget   | Vollständig (3 Widget-Typen)                                    |
| Scheduled Reports              | Vollständig                                                     |
| GDPR-Compliance                | Vollständig (Export, Löschung, Retention, Cookie-Consent)       |

---

## 4. Compliance Engines — Das Herzstück

### 4.1 EU Space Act Engine (`engine.server.ts`, 496 Zeilen)

- Lädt 1.651-Zeilen JSON-Datensatz (119 Artikel, COM(2025) 335) beim Kaltstart
- Unterstützt 7 Operatortypen: SCO, LO, LSO, ISOS, PDP, CAP, TCO
- Bestimmt Regime (Standard vs. Light) basierend auf Unternehmensgröße
- Berechnet Modulstatus über 9 Module
- IP-Schutz via `redactArticlesForClient()` — proprietäre Felder werden nie an Client gesendet

**Kritische Lücke:** CAP (Collision Avoidance Provider) ist im Datenmodell definiert, aber hat **kein Mapping im Assessment-Wizard**. Nutzer können sich nicht als CAP-Betreiber bewerten.

**Fehlerhafter Fallback:** `getChecklist()` gibt für ISOS- und PDP-Operatoren den `spacecraft_operator_eu`-Checklist zurück — ISOS haben aber andere Verpflichtungen.

### 4.2 NIS2 Engine (`nis2-engine.server.ts`, 419 Zeilen)

- Entity-Klassifikation: essential/important/out_of_scope gemäß Art. 2-3
- 51 strukturierte Anforderungen mit Assessment-Feldern, Compliance-Regeln, 4-Framework-Cross-References
- Incident-Timeline: 24h Frühwarnung, 72h Meldung, 1 Monat Endbericht
- Strafberechnung: €10M oder 2% (essential), €7M oder 1.4% (important)

**Duplikation:** `classifyNIS2Entity()` existiert sowohl in der Engine ALS AUCH in `nis2-requirements.ts` (Datendatei) mit **unterschiedlicher Logik**. Die Engine-Version handhabt Non-EU-Entities und SATCOM-Micro-Ausnahmen; die Datendatei-Version hat abweichende Klassifikation.

### 4.3 Space Law Engine (`space-law-engine.server.ts`, 993 Zeilen)

- 10 Jurisdiktionen: DE, FR, UK, BE, NL, LU, AT, DK, IT, NO
- Favorability-Scoring (0-100) mit gewichteten Faktoren
- UK wird an dedizierte UK-Engine delegiert (1.347 Zeilen UK-spezifische Daten)
- 10-Kriterien-Vergleichsmatrix über Jurisdiktionen

**Dead Code:** Gebühren-Scoring (Zeile 649-653) gibt immer 3 zurück unabhängig vom Gebührenwert (`fee.includes("EUR") ? 3 : 3`).

**Deutschland-Sonderfall:** Korrekt als "nur SatDSiG (Fernerkundung)" markiert — kein umfassendes Weltraumgesetz vorhanden.

### 4.4 Regulierungsdaten-Inventar

| Datei                             | Zeilen      | Inhalt                                              |
| --------------------------------- | ----------- | --------------------------------------------------- |
| `caelex-eu-space-act-engine.json` | 1.651       | 119 Artikel mit Compliance-Typen, Operatorzuordnung |
| `nis2-requirements.ts`            | 3.973       | 51 NIS2-Anforderungen mit Assessment-Feldern        |
| `national-space-laws.ts`          | 1.682       | 10 Jurisdiktionen mit Lizenzbedingungen             |
| `cybersecurity-requirements.ts`   | 3.418       | Cybersecurity-Anforderungen                         |
| `insurance-requirements.ts`       | 1.647       | Versicherungs-/Haftungsanforderungen                |
| `environmental-requirements.ts`   | 1.333       | Umwelt-Anforderungen                                |
| `debris-requirements.ts`          | 1.114       | Debris-Minderungs-Anforderungen                     |
| `uk-space-industry-act.ts`        | 1.347       | UK-spezifische regulatorische Daten                 |
| `cross-references.ts`             | 1.223       | Cross-Regulation-Mappings                           |
| Weitere 12 Dateien                | ~16.312     | COPUOS, ENISA, ITAR/EAR, ITU, US, NCAs, etc.        |
| **Gesamt**                        | **~33.700** | **Strukturierte Regulierungsintelligenz**           |

---

## 5. Advanced Systems — Differenzierung

### 5.1 Verity — Privacy-Preserving Compliance Attestation

**Was es tut:** Ermöglicht Satellitenbetreibern, Regulierungs-Compliance nachzuweisen **ohne tatsächliche Betriebswerte offenzulegen** (z.B. Treibstoffstand, Patch-Compliance). Verwendet Ed25519-Signaturen und SHA-256-Commitments für fälschungssichere Attestierungen, die offline verifizierbar sind.

**Technische Tiefe:**

- `generateAttestation()`: Evaluiert Schwellenwert (ABOVE/BELOW), erstellt SHA-256-Commitment mit Blinding-Factor
- `createCommitment()`: `SHA-256(canonicalJson(context) || IEEE754_BE(value) || 256-bit_blinding_factor)` — kryptographisch hiding und binding
- Ed25519-Schlüsselverwaltung mit AES-256-GCM-verschlüsselten Private Keys
- Zertifikat-Bündelung: Multiple Attestierungen in ein signiertes Zertifikat
- `actual_value` wird NIEMALS in Attestierung, Logs oder API-Responses exponiert

**Phase 2 vorbereitet:** `crypto-provider.ts` definiert Interface für Pedersen-Commitments (@noble/curves Ristretto255) — Backend-Austausch ohne API/UI/DB-Änderung.

**Fehlend:** Zertifikat-Liste/Sichtbarkeit/Widerruf-API-Endpunkte (UI referenziert sie, aber nicht gefunden). Evidence-Level 3-4 im Evidence-Resolver geben null zurück.

### 5.2 Sentinel — Autonome Compliance-Evidenz-Sammlung

**Was es tut:** On-Premise Docker-Agenten, die automatisch Compliance-Evidenz sammeln. Ed25519-signierte, hash-verkettete Evidenz-Pakete bilden eine manipulationssichere Kette. Cross-Verification gegen öffentliche CelesTrak-Daten via SGP4 Orbitalberechnung.

**Technische Tiefe:**

- 6-Stufen-Ingestion-Pipeline: Agent-Fetch → Ed25519-Signatur → Content-Hash → Chain-Kontinuität → Storage → Agent-State-Update
- Vertrauenshierarchie: L0 (0.50, Self-Assessment) → L1 (0.60) → L2 (0.70, +Signatur) → L3 (0.80, +Chain) → L4 (0.90, +Cross-Check) → L5 (0.95) → L6 (0.98, Multiple Sources)
- CelesTrak-Integration: Real HTTP-Fetch, 4h In-Memory-Cache, TLE-Parsing, SGP4-Propagation via satellite.js

**Fehlend:** Kein tatsächliches Agent-Binary/Docker-Image (nur Server-Seite). Kein Token-Management-Dashboard. Kein Webhook für Chain-Brüche.

### 5.3 Ephemeris — Prädiktive Compliance-Intelligence

**Was es tut:** Berechnet Real-Time Compliance-Zustände pro Satellit und prognostiziert, wann regulatorische Schwellenwerte überschritten werden. Aggregiert Daten aus Sentinel, CelesTrak, Verity und Assessments.

**5 Vorhersagemodelle:**

| Modell                | Methode                                        | Datenquelle         |
| --------------------- | ---------------------------------------------- | ------------------- |
| Orbital Decay         | Atmosphärischer Drag mit F10.7-Solarflux       | CelesTrak + NOAA    |
| Fuel Depletion        | Verbrauchsmodellierung (nominal/CA/worst-case) | Sentinel-Zeitreihen |
| Subsystem Degradation | Thruster/Batterie/Solar-Array-Trendanalyse     | Sentinel + Defaults |
| Deadline Events       | Kalender-basierte regulatorische Fristen       | Assessments + DB    |
| Regulatory Change     | EUR-Lex Impact-Assessment                      | Regulatory Feed     |

**Compliance Horizon:** "847 Tage bis zur ersten Verletzung" — die Killer-Metrik. Findet den Faktor mit dem kleinsten positiven `daysToThreshold`.

**Szenario-Builder:** Drag-and-Drop-Pipeline mit 6 Block-Typen (Orbit Raise, Fuel Burn, Thruster Failure, EOL Extension, Jurisdiction Change, Regulatory Change). @dnd-kit-basiert.

**Fehlend:** Ground-Station-Modul gibt UNKNOWN zurück (Platzhalter). Registration-Modul ebenfalls. `SatelliteAlert`-Modell-Zugriff ist dynamisch typisiert.

### 5.4 ASTRA — AI-Compliance-Copilot

**Was es tut:** Konversationeller AI-Berater für Regulierungsfragen, angetrieben von Claude Sonnet 4.6 (Anthropic). Tool-Ausführung, Quellenangaben, kontextbezogene Antworten.

**Technische Tiefe:**

- `AstraEngine` mit Anthropic SDK, max 10 Tool-Loop-Iterationen
- Regulatorische Wissensbasis: EU Space Act, NIS2, 10 Jurisdiktionen, Glossar, Cross-Regulation-Map
- Kontext-Builder zieht Nutzerdaten aus DB (Assessments, Deadlines, Dokumente)
- Graceful Degradation: Hochwertige Placeholder-Responses ohne `ANTHROPIC_API_KEY`
- Konversations-Management mit Auto-Summarization

### 5.5 Assure — Investment Readiness (Eigenständiges Produkt)

**Was es tut:** Vollständige Investment-Readiness-Plattform für Space-Unternehmen. IRS (Investment Readiness Score), Due-Diligence-Pakete, Benchmarking, Regulatory Compliance Rating (RCR).

**Umfang:** ~52 API-Routen, 7 Library-Dateien, 16+ Standalone-Seiten. Das API-intensivste System der Plattform.

**IRS-Engine:** 6 gewichtete Komponenten: Market Opportunity (20%), Technology (20%), Team (15%), Financial (15%), Regulatory (15%), Traction (15%). Data-Completeness-Penalty, Stage-Adjustments, Comply-Integration-Bonus.

### 5.6 Datenfluss zwischen Systemen

```
CelesTrak (TLE) ──────┐
                       v
                  ┌─────────┐     ┌───────────┐
Operator Site ──> │ SENTINEL │────>│  VERITY   │──> Attestierungen
(Docker Agent)    │ (Agenten)│     │(Attestation│    & Zertifikate
                  └────┬────┘     │  Engine)  │
                       │          └─────┬─────┘
                       v                v
                  ┌─────────┐     ┌───────────┐
EUR-Lex ────────> │EPHEMERIS│     │DIGITAL TWIN│
                  │(Predict) │     │(Aggregate) │
                  └────┬────┘     └─────┬─────┘
                       │                │
                       v                v
                  ┌─────────┐     ┌───────────┐
                  │  ASTRA  │     │   ASSURE  │
                  │  (AI)   │     │ (Invest)  │
                  └─────────┘     └───────────┘
```

**Shared Data Sources:**

- `COMPLIANCE_THRESHOLDS` (1 Datei, 2 Consumer: Verity + Ephemeris)
- `SentinelPacket` (geschrieben von Sentinel, gelesen von Verity + Ephemeris)
- `VerityAttestation` (geschrieben von Verity, gelesen von Ephemeris + Network)

---

## 6. API-Landschaft

### 6.1 Endpunkt-Inventar

| Domäne                                        | Route-Dateien | Endpunkte     | Auth-Pattern                             |
| --------------------------------------------- | ------------- | ------------- | ---------------------------------------- |
| Admin                                         | 22            | ~50           | Session + Admin-Role                     |
| Auth                                          | 14            | ~20           | Session/Public                           |
| Academy                                       | 16            | ~25           | Session + Rate-Limit                     |
| Assure                                        | 52            | ~80           | Session + Rate-Limit                     |
| V1 API                                        | 38            | ~60           | Gemischt (API-Key/Session/Bearer/Public) |
| Cron                                          | 15            | 30 (GET+POST) | CRON_SECRET                              |
| Compliance-Module                             | 30+           | ~60           | Session                                  |
| Supervision                                   | 13            | ~25           | Session                                  |
| NCA Portal                                    | 9             | ~15           | Session                                  |
| Network                                       | 12            | ~20           | Session + Permissions                    |
| Digital Twin                                  | 8             | ~15           | Session                                  |
| Dokumente                                     | 9             | ~15           | Session                                  |
| Dashboard/Timeline/Tracker                    | 15+           | ~30           | Session                                  |
| Sonstiges (Contact, Newsletter, Widget, etc.) | ~15           | ~25           | Gemischt                                 |
| **Gesamt**                                    | **~384**      | **~550+**     | —                                        |

### 6.2 Auth-Patterns (5 Typen)

| Pattern                         | Verwendung                         | Endpunkte |
| ------------------------------- | ---------------------------------- | --------- |
| Session (`auth()`)              | Dashboard/interne Routen           | ~300+     |
| API Key (`withApiAuth()`)       | v1/compliance API                  | ~8        |
| CRON_SECRET (`timingSafeEqual`) | Cron-Jobs                          | 15        |
| Bearer Token (Custom)           | Sentinel-Agenten                   | ~3        |
| Public (kein Auth)              | Verity verify, Contact, Public API | ~15       |

**Problem:** V1-Endpunkte verwenden inkonsistente Auth. `v1/compliance/` nutzt API-Keys, aber `v1/ephemeris/`, `v1/evidence/`, `v1/sentinel/` nutzen Session-Auth. Externe Consumer können Ephemeris-Endpunkte nicht programmatisch nutzen.

### 6.3 Rate-Limiting-Coverage

| Abgedeckt (~60%)                         | Nicht abgedeckt (~40%)         |
| ---------------------------------------- | ------------------------------ |
| Auth (Signup, MFA)                       | MFA Status/Backup-Codes        |
| Academy (alle Routen)                    | Dashboard-Routen               |
| Assure (meiste Routen)                   | V1/Ephemeris (rechenintensiv!) |
| Assessment                               | V1/Sentinel                    |
| V1/Compliance                            | NCA Portal                     |
| Contact, Newsletter, Widget              | Supervision                    |
| Spectrum, Export Control, UK, US, COPUOS | Network                        |

### 6.4 Org-Resolution — 3 konkurrierende Patterns

1. `getCurrentOrganization()` aus Middleware
2. `prisma.organizationMember.findFirst({ where: { userId } })` inline
3. `verifyOrganizationAccess()` Helper

**Empfehlung:** Auf ein einziges Pattern konsolidieren.

---

## 7. Datenbank & Infrastruktur

### 7.1 Schema-Qualität

**Stärken:**

- Konsistente `cuid()` für IDs
- Korrekte Cascade-Deletes auf Parent-Child-Beziehungen
- Hash-Chain für Audit-Trail-Integrität (`entryHash`, `previousHash`)
- 108 Indices mit durchdachten Composite-Indices

**Kritische Schema-Issues:**

| Priorität   | Issue                                                   | Auswirkung                               |
| ----------- | ------------------------------------------------------- | ---------------------------------------- |
| **HOCH**    | `User.email` ist nullable (`String?`)                   | Login-Identifier kann null sein          |
| **HOCH**    | `User.role` ist Freeform-String statt Enum              | Ungültige Rollenwerte möglich            |
| **HOCH**    | `InsurancePolicy` verwendet `Float` für Geldbeträge     | Fließkomma-Ungenauigkeit bei Finanzdaten |
| **MITTEL**  | Exzessive JSON-String-Felder statt Relations            | DB-Level-Querying nicht möglich          |
| **MITTEL**  | `Notification.organizationId` ohne Foreign-Key-Relation | Keine referentielle Integrität           |
| **NIEDRIG** | Legacy `User.organization` String-Feld noch im Schema   | Migrations-Altlast                       |

### 7.2 Sicherheits-Infrastruktur

| Komponente          | Implementierung                                               | Bewertung |
| ------------------- | ------------------------------------------------------------- | --------- |
| **Verschlüsselung** | AES-256-GCM, scrypt (N=32768, r=8, p=1), Per-Org-Keys         | Exzellent |
| **CSRF**            | Session-gebundener Double-Submit-Cookie + Origin-Validation   | Exzellent |
| **Audit**           | SHA-256 Hash-Chain, PII-Sanitierung, 100+ Action-Types        | Sehr gut  |
| **Auth**            | JWT, 24h Sessions, Account-Lockout, bcrypt(12)                | Sehr gut  |
| **Passkeys**        | WebAuthn (SimpleWebAuthn), signierter Token-Austausch         | Gut       |
| **Logging**         | Strukturiertes JSON (Prod), PII-Redaktion, Sentry-Integration | Gut       |
| **DAL**             | CVE-2025-29927 Mitigation, `React.cache()` Memoization        | Exzellent |

### 7.3 Infrastruktur-Lücken

| Lücke                                                      | Risiko  | Empfehlung                             |
| ---------------------------------------------------------- | ------- | -------------------------------------- |
| **Kein Virus-Scanning** auf Datei-Uploads                  | HOCH    | ClamAV oder AWS GuardDuty integrieren  |
| **Keine Server-seitige MIME-Typ-Verifikation**             | HOCH    | Magic-Bytes prüfen                     |
| **Kein Schlüsselrotations-Mechanismus** für Encryption Key | MITTEL  | Versioniertes Key-System               |
| **Kein Health-Check-Endpunkt** (`/api/health`)             | MITTEL  | DB/Redis-Connectivity prüfen           |
| **Keine Background-Job-Queue**                             | MITTEL  | Bull/BullMQ für Retries                |
| **Kein Email-Retry-Mechanismus**                           | MITTEL  | Queue für kritische Notifications      |
| **Batch-Audit-Logging überspringt Hash-Chain**             | HOCH    | `createMany()` berechnet keine Hashes  |
| **Audit-Log IP-Extraction inkonsistent**                   | MITTEL  | leftmost vs. rightmost X-Forwarded-For |
| **PDF-Generierung client-seitig**                          | NIEDRIG | Sensitive Daten im Browser             |
| **Keine DB-Migrations-Strategie**                          | MITTEL  | `db push` statt `prisma migrate`       |

---

## 8. Security Posture

### 8.1 Stärken

1. **Defense-in-Depth CSRF**: Doppelte Schicht (Origin-Validation + Session-gebundener Double-Submit-Cookie mit Constant-Time-Comparison)
2. **Per-Tenant-Verschlüsselung**: Kryptographische Tenant-Isolation via scrypt mit Org-spezifischem Salt
3. **Audit Hash-Chain**: Tamper-evident Audit-Trail (SHA-256)
4. **MFA-Optionen**: TOTP + WebAuthn/Passkeys + Backup-Codes
5. **Account-Lockout**: 2-Stufen-System (Email-basiert 5 Versuche/15min + User-Level 10 Versuche → 30min Sperre)
6. **Security Headers**: HSTS (2 Jahre, Preload), X-Frame-Options DENY, CSP mit Nonce, Permissions-Policy
7. **Bot-Detection**: User-Agent-Blocking auf Assessment-Endpunkten
8. **Pre-Commit Secret Scanning**: API-Keys, AWS-Keys, Private Keys, DB-URIs
9. **Sentry GDPR-Compliance**: Cookie-Consent vor Init, PII-Scrubbing, maskAllText

### 8.2 Schwächen

| #   | Schwäche                                                                          | Schweregrad |
| --- | --------------------------------------------------------------------------------- | ----------- |
| 1   | **Passkey-Token hat keinen Replay-Schutz** — Token innerhalb TTL wiederverwendbar | MITTEL      |
| 2   | **Rate-Limiting fail-open** ohne Redis — alle Limits fallen weg                   | MITTEL      |
| 3   | **Encryption-Field-Enforcement nur manuell** — kein Prisma-Middleware             | MITTEL      |
| 4   | **Kein CSRF-Token auf den meisten POST/PATCH/DELETE** — nur Origin-Validation     | MITTEL      |
| 5   | **setInterval in serverless** für In-Memory-Cache-Cleanup — fired nie in Vercel   | NIEDRIG     |
| 6   | **Document-Upload ohne Virus-Scan**                                               | HOCH        |
| 7   | **Content-Length spoofing** — Client-kontrolliert, Vercel 4.5MB als Backstop      | NIEDRIG     |

---

## 9. Qualitätssicherung & Testing

### 9.1 Test-Inventar

| Typ               | Dateien | Scope                                                        |
| ----------------- | ------- | ------------------------------------------------------------ |
| Unit Tests        | 86      | Engines, Encryption, CSRF, Permissions, Services, Components |
| Integration Tests | 31      | API-Routen, Middleware, Stripe, SSO                          |
| E2E Tests         | 14      | Full Journeys, Auth, Assessment, Security, Accessibility     |
| Contract Tests    | 1       | API-Schema-Validierung                                       |
| **Gesamt**        | **132** | —                                                            |

### 9.2 Coverage-Konfiguration — KRITISCHES FINDING

**Coverage-Schwellenwerte:** Branches 80%, Functions 80%, Lines 85%, Statements 85%

**ABER:** Folgende Bereiche sind von der Coverage-Messung **ausgeschlossen**:

- `src/app/api/**` — Alle 384 API-Routen
- `src/components/**` — Alle 130+ Komponenten
- `src/hooks/**` — Alle Hooks
- `src/data/**` — Alle Datendateien
- `src/app/**/layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- ASTRA, Email, i18n, PDF, Storage, Widget

**Konsequenz:** Die 85%/80% Schwellenwerte gelten nur für ~20% der Codebasis (Engines, Services, Utils). Die tatsächliche Plattform-Coverage ist erheblich niedriger.

### 9.3 CI/CD Pipeline

| Job                 | Blocking?     | Status                             |
| ------------------- | ------------- | ---------------------------------- | ------ | --------------------------------- |
| Lint + Typecheck    | Ja            | Gut                                |
| Vitest + Coverage   | Ja            | Gut (aber Coverage-Scope begrenzt) |
| E2E (nur Chromium)  | Ja            | Firefox/WebKit/Mobile fehlen       |
| Security Audit      | **Nein** (`   |                                    | true`) | **Kritische Vulns blocken nicht** |
| Bundle Size (PRs)   | Ja            | Gut                                |
| Lighthouse (PRs)    | Ja            | Performance ≥70%, A11y ≥80%        |
| CodeQL + TruffleHog | Ja (auf main) | Gut                                |

### 9.4 Was NICHT getestet wird

1. Kein Test für `useAnalyticsTracking` (GDPR-Consent-Logik)
2. Kein Test für Logger PII-Sanitierung
3. Kein Test für env-Validierung (`src/lib/env.ts`)
4. Kein Test für Email-Templates
5. Kein Test für PDF-Generierung
6. Kein Test für Storage-Layer
7. Kein Test für ASTRA AI
8. Kein Test für i18n
9. Kein Load/Performance-Test
10. Keine Snapshot-Tests für Email-Templates
11. E2E nur in Chromium in CI — Firefox, WebKit, Mobile übersprungen
12. **Stryker-Dependency fehlt** in package.json — `test:mutation` Script schlägt fehl

---

## 10. UI/UX & Design System

### 10.1 Design-System-Tokens

**Light-Mode-Palette (Dashboard):**

```
Headings:     #111827
Body:         #374151, #4B5563
Secondary:    #6B7280
Muted:        #9CA3AF, #D1D5DB
Surfaces:     #F1F3F5, #F7F8FA
Borders:      #E5E7EB
Background:   white
Accent:       Emerald (primary), Amber (warning), Red (critical)
```

**Glass Design System (Dark-Mode):**

- `glass-surface`, `glass-elevated`, `glass-floating` — 3-Tier-Elevation
- `glass-interactive`, `glass-accent` — Modifier

**Type Scale:** 12 semantische Stufen von `text-micro` (10px) bis `text-display-lg` (48px)

### 10.2 Light/Dark-Mode-Inkonsistenz — KRITISCHES FINDING

Die Plattform migriert von Dark-Mode-First zu Light-Mode-First. Diese Migration ist **unvollständig**:

| Korrekt (Light-Mode)            | Fehlerhaft (Dark-Mode hardcoded)              |
| ------------------------------- | --------------------------------------------- |
| Dashboard Layout (`bg-white`)   | `ui/EmptyState` — `text-white`                |
| Sidebar, TopBar                 | `ui/Toast` — `text-white`                     |
| Alle Module-Pages               | Verity-Page — `text-white`, `bg-white/[0.03]` |
| Ephemeris, Evidence             | Error-Page — `bg-[#0A0F1E] text-white`        |
| Billing, API Keys, Security Log | 404-Page — `bg-dark-bg text-white`            |
|                                 | Tracker Checklist-View — `text-white/45`      |

**Auswirkung:** In Light-Mode: weißer Text auf weißem Hintergrund = unsichtbar.

### 10.3 Accessibility

**Stärken:**

- Skip-to-Content Link
- Konsistente ARIA-Attribute (`role`, `aria-expanded`, `aria-live`, `sr-only`)
- `prefers-reduced-motion` respektiert in GlassMotion
- Focus-Trap in NotificationCenter

**Lücken:**

- Fehlende Focus-Traps auf den meisten Modals (Registration, API Key, Widget)
- Fehlende Escape-Key-Behandlung auf vielen Modals
- Keine expliziten Focus-Ring-Styles (Browser-Defaults)

### 10.4 Responsive Design

**Gut:** Sidebar-Collapse, responsive Grids, Mobile-Navigation
**Lücken:** 107KB Cybersecurity-Seite möglicherweise problematisch auf Mobile. Szenario-Builder (Drag-and-Drop) braucht Mobile-Handling. Mission Control (3D Globe) ohne Mobile-Viewport-Handling.

---

## 11. Redundanzen & Architektur-Schulden

### 11.1 Systeme mit Überschneidungen

| Redundanz               | System A                    | System B                            | Empfehlung                                      |
| ----------------------- | --------------------------- | ----------------------------------- | ----------------------------------------------- |
| **Compliance-Scoring**  | Digital Twin (Org-Level)    | Ephemeris (Satellite-Level)         | Digital Twin sollte Ephemeris-Daten konsumieren |
| **Data Rooms**          | Network (Stakeholder-DRs)   | Assure (Investor-DRs)               | Zu einem Data-Room-Service vereinen             |
| **NCA Submissions**     | `/api/nca/` (alt)           | `/api/nca-portal/` (neu)            | Alte NCA-API deprecaten                         |
| **Canonical JSON**      | Verity `canonical-json.ts`  | Sentinel inline `canonicalize()`    | Konsolidieren                                   |
| **NIS2-Klassifikation** | `nis2-engine.server.ts`     | `nis2-requirements.ts`              | Zu einer Version konsolidieren                  |
| **EmptyState**          | `ui/EmptyState` (dark-only) | `dashboard/EmptyState` (light+dark) | UI-Version ersetzen                             |

### 11.2 Fehlende Integrationen

| Von             | Nach         | Status                        | Sollte                      |
| --------------- | ------------ | ----------------------------- | --------------------------- |
| Digital Twin    | Ephemeris    | Unabhängig                    | Ephemeris-Daten konsumieren |
| Verity          | Network      | Attestation-Sharing existiert | Vollständig integriert      |
| ASTRA           | Alle Systeme | Kontext-Builder vorhanden     | Tool-Executor erweitern     |
| Sentinel        | Ephemeris    | Via sentinel-adapter          | Vollständig integriert      |
| Regulatory Feed | Ephemeris    | Via eurlex-adapter            | Vollständig integriert      |

### 11.3 Technische Schulden

1. **3 PDF-Libraries** installiert: `@react-pdf/renderer`, `jsPDF`, `react-pdf` — überlappende Funktionalität
2. **Three.js auf Landing Page** — ~500KB+ gzipped für eine kosmetische 3D-Animation
3. **Legacy `User.organization` String-Feld** im Schema — Migration-Altlast
4. **Hardcoded Regulatory Dates** in Engine-Funktionen statt in Konfiguration
5. **`legacy-peer-deps=true`** in `.npmrc` — maskiert Dependency-Konflikte
6. **React 18 mit Next.js 15** — React 19 Support nicht genutzt

---

## 12. Fehler & Risiken — Priorisiert

### KRITISCH (sofort beheben)

| #   | Issue                                                     | Location                       | Impact                                      |
| --- | --------------------------------------------------------- | ------------------------------ | ------------------------------------------- |
| 1   | **NextAuth v5 ist Beta** (5.0.0-beta.30)                  | `package.json:76`              | Auth-Library kann Breaking Changes haben    |
| 2   | **Security Audit non-blocking in CI**                     | `.github/workflows/ci.yml:122` | Kritische Vulns verhindern Deployment nicht |
| 3   | **Coverage-Schwellenwerte gelten nur für ~20% des Codes** | `vitest.config.ts:26-37`       | Falsche Qualitätssicherheits-Illusion       |
| 4   | **Kein Virus-Scanning auf Datei-Uploads**                 | `src/lib/storage/`             | Malware-Risiko für Compliance-Plattform     |
| 5   | **Batch-Audit-Logging überspringt Hash-Chain**            | `src/lib/audit.ts`             | Tamper-Evidence kompromittiert              |
| 6   | **Fehlender CAP-Operator in Assessment**                  | `engine.server.ts`             | Nutzer-Segment nicht bedienbar              |

### HOCH (innerhalb 2 Wochen)

| #   | Issue                                            | Location                         | Impact                                         |
| --- | ------------------------------------------------ | -------------------------------- | ---------------------------------------------- |
| 7   | **Light/Dark-Mode Inkonsistenz**                 | 6+ Komponenten                   | Weißer Text auf weißem Hintergrund             |
| 8   | **Rate-Limiting auf Ephemeris-Endpunkten fehlt** | `src/app/api/v1/ephemeris/`      | DoS-Risiko auf rechenintensiven Routen         |
| 9   | **Inkonsistente V1-Auth** (Session vs. API-Key)  | `src/app/api/v1/`                | Externe Consumer können Ephemeris nicht nutzen |
| 10  | **Hardcoded Compliance-Score** in simulate route | `ephemeris/simulate/route.ts:66` | `const currentScore = 75` statt echtem Wert    |
| 11  | **Stryker-Dependency fehlt**                     | `package.json`                   | `test:mutation` Script funktioniert nicht      |
| 12  | **12 Empty Catch Blocks**                        | Dashboard, NotificationCenter    | Runtime-Fehler unentdeckt                      |
| 13  | **Fehlerhafter Checklist-Fallback** für ISOS/PDP | `engine.server.ts:287-293`       | Falscher Checklist für 2 Operatortypen         |
| 14  | **Float für Geldbeträge**                        | Schema: InsurancePolicy          | Fließkomma-Ungenauigkeit                       |

### MITTEL (innerhalb 4 Wochen)

| #   | Issue                                             | Location                             | Impact                                           |
| --- | ------------------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| 15  | Duplizierte NIS2-Klassifikation                   | Engine + Data-Datei                  | Divergenz-Risiko                                 |
| 16  | Passkey-Token ohne Replay-Schutz                  | `auth.ts`                            | Wiederverwendung innerhalb TTL                   |
| 17  | Keine Email-Retry-Mechanismus                     | `src/lib/email/`                     | Kritische Notifications verloren                 |
| 18  | 51 `any`-Typ-Nutzungen                            | 25 Dateien                           | Typ-Sicherheit degradiert                        |
| 19  | Dependabot ignoriert Patches                      | `.github/dependabot.yml`             | Security-Patches verpasst                        |
| 20  | Cron-Schedule-Kollision                           | `vercel.json`                        | onboarding-emails + churn-detection gleichzeitig |
| 21  | 3 verschiedene Org-Resolution-Patterns            | Diverse API-Routen                   | Code-Inkonsistenz                                |
| 22  | Keine GDPR Data-Export-Implementierung            | Service-Layer                        | Art. 15 Right-of-Access                          |
| 23  | IP-Extraction inkonsistent (Audit vs. Middleware) | `audit.ts` vs `middleware.ts`        | Audit-Logs mit falscher IP                       |
| 24  | Dead Code in Jurisdiction-Comparison              | `space-law-engine.server.ts:649-653` | Fee-Scoring differenziert nie                    |

### NIEDRIG (Backlog)

| #   | Issue                                  | Impact                          |
| --- | -------------------------------------- | ------------------------------- |
| 25  | 3 PDF-Libraries installiert            | Bundle-Size                     |
| 26  | Three.js nur für Landing Page          | ~500KB+ Bundle                  |
| 27  | 41 eslint-disable Comments             | Code-Qualität                   |
| 28  | Fehlende Focus-Traps auf Modals        | Accessibility                   |
| 29  | Polling ohne Visibility-API-Check      | Unnecessary Background Requests |
| 30  | Cybersecurity-Seite 107KB              | Maintenance-Risiko              |
| 31  | Landing Page nicht internationalisiert | Marktbeschränkung               |
| 32  | 30+ ungenutzte Landing-Komponenten     | Dead Code                       |
| 33  | `User.organization` Legacy-Feld        | Schema-Altlast                  |

---

## 13. Wettbewerbsposition

### 13.1 Competitive Moat — Was nicht trivial reproduzierbar ist

1. **33.700 Zeilen kodifizierte Regulierungsdaten** — 119 EU Space Act Artikel, 51 NIS2-Anforderungen, 10 Jurisdiktionen, 13 Cross-References, space-spezifische Kontextualisierung. Erfordert tiefe juristische und technische Expertise.

2. **Echte Kryptographie** — Verity (Ed25519 + SHA-256 Commitments, Privacy-Preserving), Sentinel (Hash-Chains mit Cross-Verification). Keine Mocks, keine Attrappen.

3. **5 physikalische/statistische Vorhersagemodelle** in Ephemeris — Orbitalabfall, Treibstoffverbrauch, Subsystem-Degradation, regulatorische Fristen, regulatorische Änderungen.

4. **End-to-End Compliance Lifecycle** — Assessment → Tracking → Evidenz → Vorhersage → Attestierung → NCA-Einreichung → Audit. Kein Wettbewerber deckt die gesamte Kette ab.

5. **Multi-Framework-Kreuzreferenzierung** — NIS2 ↔ EU Space Act Overlap-Kalkulation mit Zeitersparnis-Schätzung. Space Law ↔ EU Space Act Cross-References.

### 13.2 Produktbreite vs. Tiefe

Die Plattform ist **bemerkenswert breit** (13 Compliance-Module, 6 Advanced Systems, Academy, Assure, Widget) UND **bemerkenswert tief** (echte Kryptographie, echte Physik-Modelle, echte AI-Integration).

**Risiko:** Die Breite könnte Fokus kosten. Assure ist de facto ein eigenständiges Produkt mit 52 API-Routen — fast so groß wie das Core Compliance-Produkt.

### 13.3 Positioning-Matrix

| Capability                     | Caelex                 | Generic GRC Tools | Space-spezifisch |
| ------------------------------ | ---------------------- | ----------------- | ---------------- |
| EU Space Act Assessment        | Vollständig            | Nicht vorhanden   | Teilweise        |
| NIS2 (Space-spezifisch)        | Vollständig            | Generisch         | Nicht vorhanden  |
| Multi-Jurisdiction Comparison  | 10 Jurisdiktionen      | N/A               | 2-3 max          |
| Privacy-Preserving Attestation | Verity (real crypto)   | Nicht vorhanden   | Nicht vorhanden  |
| Autonomous Evidence Collection | Sentinel (hash-chains) | Agent-basiert     | Nicht vorhanden  |
| Predictive Compliance          | Ephemeris (5 Modelle)  | Nicht vorhanden   | Nicht vorhanden  |
| AI Copilot                     | ASTRA (Claude)         | ChatGPT-Wrapper   | Nicht vorhanden  |
| Investment Readiness           | Assure (vollständig)   | Nicht vorhanden   | Nicht vorhanden  |
| NCA Submission Management      | Vollständig            | Generisch         | Teilweise        |

---

## 14. Strategische Empfehlungen

### 14.1 Sofort-Maßnahmen (Woche 1-2)

1. **NextAuth v5 Risiko evaluieren**: Entweder auf stable Release planen oder Fallback-Strategie dokumentieren. 5.0.0-beta.30 in Produktion ist das höchste technische Risiko.

2. **Security Audit in CI blocking machen**: `npm audit --audit-level=high` → Build-Failure statt `|| true`.

3. **Virus-Scanning für Uploads implementieren**: ClamAV-Integration über externen Service. Compliance-Plattform muss eigene Datei-Integrität sicherstellen.

4. **Light/Dark-Mode-Fix**: Die 6 betroffenen Komponenten (EmptyState, Toast, Verity, Error, 404, Tracker-Checklist) auf Light-Mode-First umstellen.

5. **Rate-Limiting auf Ephemeris aktivieren**: Mindestens `api` Tier auf alle rechenintensiven Endpunkte.

### 14.2 Kurzfristig (Monat 1)

6. **V1 API Auth konsolidieren**: Alle V1-Routen auf `withApiAuth()` standardisieren. Ephemeris als API-Key-gesichert exponieren = sofort monetarisierbar.

7. **Test-Coverage-Scope erweitern**: Mindestens API-Routen und kritische Komponenten in Coverage-Schwellenwerte aufnehmen. Aktuelle 85% gelten nur für 20% des Codes.

8. **CAP-Operator-Mapping hinzufügen**: Marktsegment-Lücke schließen.

9. **Batch-Audit-Logging mit Hash-Chain**: `logAuditEventsBatch()` muss per-Entry Hashes berechnen.

10. **NIS2-Klassifikations-Duplikation auflösen**: Eine Version, zwei Consumer.

### 14.3 Mittelfristig (Quartal 1)

11. **Digital Twin mit Ephemeris integrieren**: Digital Twin sollte Ephemeris-Satellite-Level-Daten konsumieren statt eigenen State zu berechnen. Reduziert Code-Duplikation und erhöht Konsistenz.

12. **Data-Room-Service vereinheitlichen**: Network- und Assure-Data-Rooms zu einem Service konsolidieren.

13. **Alte NCA-API (`/api/nca/`) deprecaten**: NCA Portal ist die vollständigere Implementierung.

14. **Sentinel Agent-Binary entwickeln**: Server-Seite ist produktionsreif. Ein Docker-Image mit Agent-Logik + Ed25519-Signierung würde Sentinel von Konzept zu verkaufbarem Produkt machen.

15. **Assure als separates Produkt positionieren oder tiefer integrieren**: 52 API-Routen und 16+ Seiten sind de facto ein eigenständiges Produkt. Strategische Entscheidung: Spin-off oder Integration.

### 14.4 Langfristig (6-12 Monate)

16. **Verity Phase 2 — Pedersen Commitments**: Abstraktionsschicht ist vorbereitet. Pedersen-Commitments ermöglichen mathematisch beweisbare Zero-Knowledge-Aussagen — stärkstes Differenzierungsmerkmal.

17. **ASTRA Streaming + RAG**: Aktuelle Implementierung ist Full-Response-Only. Streaming verbessert UX erheblich. RAG/Embeddings ermöglichen tiefere Regulierungskontexte.

18. **Internationalisierung vervollständigen**: Landing Page, Assessment-Fragen, Error-Messages. Frankreich, Italien und Norwegen sind Zielmärkte.

19. **SOC 2 / ISO 27001 Zertifizierung**: Die technische Infrastruktur ist weitgehend bereit (Audit-Trail, Verschlüsselung, Access Controls). Formale Zertifizierung stärkt Enterprise-Sales.

20. **Background-Job-Queue**: Bull/BullMQ für Email-Retries, Webhook-Deliveries, Report-Generierung. Ersetzt das aktuelle synchrone Modell.

---

## 15. Anhang

### 15.1 Vollständige API-Domänen-Liste

`admin` (22), `auth` (14), `academy` (16), `assure` (52), `assessment` (4), `audit` (7), `authorization` (6), `careers` (1), `contact` (1), `copuos` (4), `cron` (15), `cybersecurity` (4), `dashboard` (5), `debris` (3), `demo` (1), `digital-twin` (8), `documents` (9), `environmental` (8), `export-control` (4), `insurance` (4), `invitations` (3), `nca` (4), `nca-portal` (9), `network` (12), `newsletter` (2), `nis2` (5), `notifications` (6), `organization` (3), `organizations` (8), `public` (3), `registration` (5), `regulatory-feed` (1), `reports` (4), `security` (3), `sessions` (2), `space-law` (2), `spectrum` (4), `sso` (2), `stakeholder` (8), `stripe` (4), `supervision` (13), `timeline` (7), `tracker` (4), `uk-space` (4), `unified` (2), `us-regulatory` (5), `user` (5), `v1/compliance` (8), `v1/ephemeris` (9), `v1/evidence` (6), `v1/keys` (2), `v1/sentinel` (7), `v1/spacecraft` (1), `v1/verity` (6), `v1/webhooks` (3), `widget` (2)

### 15.2 Prisma-Modell-Inventar

**Auth:** User, Account, Session, VerificationToken
**Multi-Tenancy:** Organization, OrganizationMember, OrganizationInvitation
**Assessments (12 Module):** DebrisAssessment, CybersecurityAssessment, NIS2Assessment, InsuranceAssessment, EnvironmentalAssessment, CopuosAssessment, UkSpaceAssessment, UsRegulatoryAssessment, ExportControlAssessment, SpectrumAssessment (jeweils mit RequirementStatus-Modell)
**Spacecraft:** Spacecraft, SpaceObjectRegistration, RegistrationStatusHistory, RegistrationAttachment
**Compliance:** ArticleStatus, ChecklistStatus, AuthorizationWorkflow, AuthorizationDocument
**Security:** SecurityAuditLog, SecurityEvent, LoginEvent, LoginAttempt, MfaConfig, WebAuthnCredential, HoneyToken, HoneyTokenTrigger
**Supervision:** SupervisionConfig, Incident, IncidentAsset, IncidentAttachment, IncidentNIS2Phase, SupervisionReport, SupervisionCalendarEvent
**Documents:** Document, DocumentAccessLog, DocumentComment, DocumentShare, DocumentTemplate
**Notifications:** Notification, NotificationPreference, NotificationLog
**API:** ApiKey, ApiRequest, Webhook, WebhookDelivery, WidgetConfig
**NCA:** NCASubmission, NCACorrespondence, SubmissionPackage
**Audit:** AuditLog
**Timeline:** Deadline, MissionPhase, Milestone
**Billing:** Subscription
**SSO:** SSOConnection, UserSession
**Supplier:** SupplierDataRequest, SupplierPortalToken
**Collaboration:** Comment

### 15.3 Cron-Job-Schedule

| Job                        | Schedule (UTC) | Max Duration |
| -------------------------- | -------------- | ------------ |
| ephemeris-daily            | 06:00          | 300s         |
| compute-rrs                | 07:00          | 120s         |
| regulatory-feed            | 07:00          | 120s         |
| compute-rcr                | 07:30          | 300s         |
| compliance-snapshot        | 01:00          | 300s         |
| analytics-aggregate        | 02:00          | 300s         |
| data-retention-cleanup     | 03:00          | 120s         |
| deadline-reminders         | 08:00          | 120s         |
| document-expiry            | 09:00          | 120s         |
| onboarding-emails          | 10:00          | 120s         |
| churn-detection            | **10:00** ⚠️   | 120s         |
| reengagement               | 11:00          | 120s         |
| demo-followup              | 12:00          | 120s         |
| generate-scheduled-reports | Mo 06:00       | 300s         |
| nca-deadlines              | —              | 300s         |

⚠️ `onboarding-emails` und `churn-detection` teilen sich denselben Schedule (10:00 UTC)

### 15.4 Environment Variables — Vollständige Liste

**Required:** DATABASE*URL, AUTH_SECRET, AUTH_URL, ENCRYPTION_KEY, ENCRYPTION_SALT
**Recommended:** UPSTASH_REDIS_REST_URL/TOKEN, SENTRY_DSN, CRON_SECRET, STRIPE_SECRET_KEY/WEBHOOK_SECRET, RESEND_API_KEY
**Optional:** AUTH_GOOGLE_ID/SECRET, SMTP*_, R2\__, LOGSNAG_TOKEN, ANTHROPIC_API_KEY, VERITY_MASTER_KEY

### 15.5 Dependency Risk Assessment

| Dependency        | Version       | Risk         | Reason                          |
| ----------------- | ------------- | ------------ | ------------------------------- |
| next-auth         | 5.0.0-beta.30 | **KRITISCH** | Pre-Release in Production       |
| react             | ^18.2.0       | NIEDRIG      | Stabil, aber React 19 verfügbar |
| three             | ^0.160.0      | NIEDRIG      | Alte Version, nur Landing Page  |
| @anthropic-ai/sdk | ^0.74.0       | NIEDRIG      | Optional, graceful degradation  |
| zod               | ^4.3.6        | NIEDRIG      | Stabil                          |
| stripe            | ^20.3.0       | NIEDRIG      | Stabil                          |

---

_Dieser Bericht basiert auf der vollständigen Analyse aller Quelldateien der Caelex-Plattform, durchgeführt am 4. März 2026. Jeder Abschnitt wurde durch systematisches Lesen des Quellcodes verifiziert, nicht durch Annahmen._
