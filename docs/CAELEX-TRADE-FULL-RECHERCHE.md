# Caelex Trade — Vollständige Strategie- und Architektur-Recherche

**Status:** 2026-05-21 — nach Sprint T1-T9 + WCAG-Hotfix in Production.
**Verfasst von:** Multi-Agent Code-Audit + Domain-Synthese.
**Zweck:** Vollständige Bestandsaufnahme, Domain-Coverage-Plan, Lückenanalyse und phasierte Roadmap, damit Caelex Trade als eigenständiges Produkt **wirklich** auf Weltklasse-Niveau funktioniert — nicht nur als Skelett.

---

## 1. Executive Summary

### Die wichtigste Erkenntnis: das **Two-Worlds-Problem**

Caelex Trade existiert **doppelt** in der Codebasis:

1. **Welt A — `/dashboard/trade/*`** (legacy unter Comply-Dashboard):
   - Items-Liste mit Klassifizierung-CRUD → **production-ready**
   - Counterparties-Liste mit Screening (OFAC/BIS/DDTC/EU FSF) → **production-ready**
   - Operations-Pipeline mit Risk-Score + License-Mapping → **production-ready**
   - Operation-Detail mit Tabs (Overview/Lines/Licenses/Screening/Workflow/Documents) + Astra-Sidebar → **production-ready**
   - BAFA ELAN-K2 PDF-Generator → **production-ready** (!)
   - 7 production-ready Panel-Components in `src/components/trade/`
   - 20+ REST-Endpoints in `src/app/api/trade/*` → **production-ready**

2. **Welt B — `/trade/*`** (neue Route-Group aus T1-T9):
   - `/trade` Welcome-Dashboard → Skelett (4 KPI-Tiles ohne Daten)
   - `/trade/items|parties|operations|licenses` → 4 reine Placeholder-Pages
   - `/trade/program` → **production-ready** (T4 Posture-Layer)
   - `/trade/astra` → **production-ready** (T8 Embed)
   - `/trade-access`, `/trade-login`, `/trade-forgot-password`, `/trade-reset-password` → **production-ready** (T3 + T7)

**Das heißt:** Caelex Trade als Produkt-Schale ist da. Die Engine-Schicht ist da (mit Lücken). Die echte UI fehlt — sie lebt in der falschen Welt.

### Strategischer Hauptzug

**Welt A → Welt B portieren**, dabei **Engine-Lücken schließen** und **Sanctions-Source-Coverage komplettieren** (UK OFSI, UN). Erst dann ist Trade als Standalone-Produkt funktional auf höchstem Niveau.

### Reife-Status pro Schicht

| Schicht                    | Reife   | Anmerkung                                                      |
| -------------------------- | ------- | -------------------------------------------------------------- |
| Prisma-Schema              | **5/5** | 13 Trade-Modelle, 13 Enums, sauber gestaltet                   |
| Sanctions-Datenpipeline    | **3/5** | 4/6 Quellen, 2 Crons live, UK OFSI + UN fehlen                 |
| Classification-Engine      | **3/5** | Multi-Jurisdiktion (US/EU/MTCR/DE) aber CCL nur 24/3000 ECCNs  |
| License-Determination      | **4/5** | BIS/DDTC/BAFA/EU CA + MTCR. License-Exception-Matrix fehlt     |
| De-Minimis-Calc            | **4/5** | EAR §734.4 inkl. FDPR. Reexport-De-Minimis fehlt               |
| 50%-Rule-Cascade           | **4/5** | BFS-Traversal mit Aggregation. Tiefenlimit fehlt               |
| Risk-Score-Engine          | **4/5** | 0-100 Bands mit Faktoren. ML-Recalibration fehlt               |
| Astra-Tools (Trade)        | **5/5** | Alle 4 Tools voll implementiert                                |
| API-Schicht                | **4/5** | 20+ REST-Endpoints. Catch-all + License-Det. nicht API-exposed |
| UI **/dashboard/trade/\*** | **4/5** | Production-ready CRUD + Detail-Views                           |
| UI **/trade/\***           | **1/5** | Fast nur Placeholder-Pages                                     |
| Brand + Marketing          | **4/5** | Logo, Marketing-Page, Pricing-Mention da                       |
| Auth                       | **4/5** | Login/Forgot/Reset live, Signup deferred                       |
| Cron-Infrastruktur         | **3/5** | 2 daily Crons. License-Expiry-Reminders fehlen                 |

---

## 2. Detailliertes Inventar — was schon existiert

### 2.1 Database — vollständig

`prisma/schema.prisma` (siehe Audit-Output):

**13 Trade-Modelle:**

- `TradeItem` + `TradeItemNote` — Items mit Multi-Jurisdiktion-Codes (eccnEU, eccnUS, usmlCategory, mtcrCategory, germanAlEntry), Origin-Tracking, Property-Flags (aperture, range, payload, radHardened, milSpec, antiJam), Classification-Provenance (USER_DECLARED → BAFA_AUSKUNFT_GUETERLISTE Trust-Hierarchie)
- `TradeParty` + `TradePartyOwnership` — Counterparties mit Beneficial-Ownership-Edges (equityPercentage, controlType)
- `TradeScreeningResult` + `TradeSanctionsSnapshot` — Time-indizierte Screening-Ergebnisse + Content-addressable SHA-256 Snapshots
- `TradeOperation` + `TradeOperationLine` — Transaktions-Lifecycle mit DRAFT→AWAITING_CLASSIFICATION→SCREENING→LICENSED→EXECUTED→BLOCKED, Catch-All-Articles (Art4/5/9/10), Risk-Score
- `TradeLicense` — INDIVIDUAL/GENERAL_EXEMPTION/WRITTEN_CONSENT mit Drawn-Down-Tracking
- `TradeComplianceProgram` (T4) — Org-scoped Posture-Layer mit verschlüsselter DDTC-Nr + EO-Email
- `TradeProgramRequirementStatus` (T4) — Per-Org Requirement-Status

**13 Trade-Enums** sind alle definiert und konsistent benutzt. Multi-Tenancy via `organizationId` auf jedem Modell ist enforced.

### 2.2 Engines — gut implementiert mit gezielten Lücken

`src/lib/comply-v2/trade/`:

| Engine                     | Datei                                  | Coverage                                                                                                                     |
| -------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Klassifizierung-Lookup     | `classification-lookup.ts`             | ~200 LOC, 5 Jurisdiktionen, Cross-Reference-Topics ✅                                                                        |
| Property-Trigger           | `property-trigger-engine.ts`           | ~500 LOC, 25+ Regeln (MTCR Cat I, USML EO, Rad/Mil-Spec) ✅                                                                  |
| De-Minimis                 | `de-minimis-calculator.ts`             | ~250 LOC, ITAR-zero + Embargo-Gates + 25%/10%/0%-Thresholds + FDPR ✅                                                        |
| License-Determination      | `license-determination.ts`             | ~300 LOC, BIS/DDTC/BAFA/EU CA + MTCR-Review ✅                                                                               |
| 50%-Cascade                | `screening/cascade-50pct.ts`           | ~250 LOC, BFS bis Tiefe 5/10, Diamond-Aggregation ✅                                                                         |
| OFAC SDN Parser            | `screening/sources/ofac-sdn.ts`        | ~200 LOC, RFC 4180 CSV ✅                                                                                                    |
| BIS Entity Parser          | `screening/sources/bis-entity.ts`      | ✅ implementiert                                                                                                             |
| DDTC Debarred Parser       | `screening/sources/ddtc-debarred.ts`   | ✅ implementiert                                                                                                             |
| EU FSF Parser              | `screening/sources/eu-fsf.ts`          | ✅ implementiert                                                                                                             |
| **UK OFSI Parser**         | `screening/sources/uk-ofsi.ts`         | ❌ **FEHLT** (Enum ja, Code nein)                                                                                            |
| **UN Consolidated Parser** | `screening/sources/un-consolidated.ts` | ❌ **FEHLT**                                                                                                                 |
| Sync-Orchestrator          | `screening/sync.server.ts`             | ✅ syncOneList, syncAllLists, 30s-Timeout, Dedup, idempotente Snapshots                                                      |
| Risk-Score                 | `operations/risk-score.ts`             | ~200 LOC, 0-100 Bands, Comprehensive-Sanctioned-Destination (60pt), High-Risk-Country (30pt), MTCR-Cat-I, Sector-Faktoren ✅ |
| Catch-All-Evaluator        | `operations/catch-all-evaluator.ts`    | ✅ Art 4/5/9/10 (EU Dual-Use 2021/821)                                                                                       |

**Auto-Sync Crons** (`src/app/api/cron/`):

- `trade-sync-sanctions` täglich 04:30 UTC — fetcht alle 4 (bald 6) Listen
- `trade-rescreen-stale` täglich 05:00 UTC — re-screent Parties mit veralteten Results

### 2.3 UI unter `/dashboard/trade/*` — production-ready CRUD

| Route                                       | Status | Features                                                                                      |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `/dashboard/trade`                          | ✅     | Overview + Roadmap mit Wave A/B/C Links                                                       |
| `/dashboard/trade/items`                    | ✅     | Tabelle: name/sku/manufacturer/status/codes, Filter, NewItemForm inline                       |
| `/dashboard/trade/items/[itemId]`           | ✅     | Detail + ClassificationPanel + History                                                        |
| `/dashboard/trade/counterparties`           | ✅     | Tabelle: legalName/tradeName/country/screeningStatus, Status-Tabs, NewPartyForm               |
| `/dashboard/trade/counterparties/[partyId]` | ✅     | Detail + Screening-Results + BeneficialOwnersPanel                                            |
| `/dashboard/trade/operations`               | ✅     | Tabelle: reference/type/route/counterparty/risk-score/Art-triggers/licenses, NewOperationForm |
| `/dashboard/trade/[operationId]`            | ✅     | Detail mit 6 Tabs (Overview/Lines/Licenses/Screening/Workflow/Documents) + Astra-Sidebar      |

### 2.4 Production-ready Panel-Components

`src/components/trade/`:

| Component                 | LOC     | Funktion                                                    |
| ------------------------- | ------- | ----------------------------------------------------------- |
| `ClassificationPanel`     | 16.9 KB | Item-Klassifizierung-Display/Edit, Multi-Jurisdiktion-Codes |
| `OperationLinesPanel`     | 20.0 KB | Shipment-Lines-Management innerhalb Operation               |
| `BeneficialOwnersPanel`   | 19.7 KB | 50%-Cascade-Visualisierung, Ownership-Tree                  |
| `OperationLifecyclePanel` | 14.5 KB | State-Transitions DRAFT→...→EXECUTED                        |
| `OperationLicensesPanel`  | 21.8 KB | License-Management innerhalb Operation                      |
| `BafaElanK2Document`      | 19.4 KB | **BAFA ELAN-K2 PDF-Export** — German Export-Control-Form    |
| `BafaPdfButton`           | 2.7 KB  | Trigger für BAFA PDF-Download                               |

### 2.5 Astra-Tools — alle 4 voll implementiert

`src/lib/astra/tool-definitions.ts:1937` + `tool-executor.ts` (18 KB):

| Tool                         | Input                      | Function                                        |
| ---------------------------- | -------------------------- | ----------------------------------------------- |
| `classify_trade_item`        | tradeItemId OR raw signals | Property-Trigger-Engine → ECCN-Suggestions      |
| `screen_trade_party`         | partyId                    | Jaro-Winkler vs 5 Listen + 50%-Cascade          |
| `lookup_trade_party`         | query/country/status       | TradeParty-Such-API                             |
| `lookup_classification_code` | code + jurisdiction        | Classification-Code-Lookup mit Cross-References |

### 2.6 REST-API — production-ready

`src/app/api/trade/`:

20+ Endpoints für items, parties, operations, licenses, screening, ownership, lines, risk-recompute — alle voll implementiert mit GET/POST/PATCH/DELETE.

---

## 3. Domain-Coverage — was Export-Compliance **wirklich** abdeckt

Damit Caelex Trade auf höchstem Niveau funktioniert, muss es das gesamte regulatorische Spektrum abbilden:

### 3.1 Regulatorische Stacks

| Regulation                                        | Jurisdiktion   | Aktueller Caelex-Stand                                      |
| ------------------------------------------------- | -------------- | ----------------------------------------------------------- |
| **EAR** (15 CFR 730-774)                          | USA            | ✅ De-Minimis-Calc, ECCN-Lookup, Embargo-Gates              |
| **ITAR** (22 CFR 120-130)                         | USA            | ✅ USML-Lookup, DDTC-DSP-5-Path, Debarred-Screening         |
| **EU 2021/821** (Dual-Use)                        | EU             | ✅ Annex I + Catch-All Art 4/5/9/10                         |
| **MTCR Annex**                                    | Multilateral   | ✅ Cat I/II Lookup, Strong-Presumption-of-Denial-Gate       |
| **Wassenaar Arrangement**                         | Multilateral   | ⚠️ in EU/US-Klassifizierungen implizit, kein eigenes Module |
| **AWG/AWV + Anlage AL** (DE)                      | Deutschland    | ✅ Lookup + BAFA-Path + ELAN-K2-PDF-Export                  |
| **Export Control Act 2002** (UK)                  | GB             | ⚠️ Enum vorhanden, kein eigener UK-Path                     |
| **AWV/Décret 2001-1192** (FR)                     | Frankreich     | ❌ Nicht abgedeckt                                          |
| **D.lgs. 105/2003** (IT)                          | Italien        | ❌ Nicht abgedeckt                                          |
| **CGNL 5400.07-M / Decreto** (Nachfolgeländer EU) | EU-NL/BE/AT/LU | ❌ Nicht abgedeckt                                          |
| **NATO COCOM** (Erbe)                             | Multilateral   | ❌ Nicht abgedeckt                                          |
| **AECMA + Australia Group**                       | Multilateral   | ❌ Nicht abgedeckt                                          |

### 3.2 Sanctions-/Watch-Lists

| Liste                                  | Quelle               | Update-Frequenz | Caelex-Status                                          |
| -------------------------------------- | -------------------- | --------------- | ------------------------------------------------------ |
| **OFAC SDN**                           | treasury.gov         | Daily           | ✅ Parser + Sync-Cron                                  |
| **OFAC Consolidated** (SSI, FSE, etc.) | treasury.gov         | Daily           | ⚠️ Teil von SDN aber andere Subprogramme nicht separat |
| **BIS Entity List**                    | bis.doc.gov          | Wöchentlich     | ✅ Parser + Sync                                       |
| **BIS Unverified List**                | bis.doc.gov          | Wöchentlich     | ⚠️ Enum existiert, kein eigener Parser                 |
| **BIS Military End User (MEU) List**   | bis.doc.gov          | Wöchentlich     | ❌ Fehlt                                               |
| **DDTC Debarred Parties**              | pmddtc.state.gov     | Quarterly       | ✅ Parser + Sync                                       |
| **EU Financial Sanctions File (FSF)**  | webgate.ec.europa.eu | Daily           | ✅ Parser + Sync                                       |
| **UK OFSI Consolidated List**          | gov.uk               | Daily           | ❌ **FEHLT** (Enum ja, Parser nein)                    |
| **UN Consolidated Sanctions**          | un.org               | Ad-hoc          | ❌ **FEHLT**                                           |
| **AUSTRAC** (AU)                       | austrac.gov.au       | Periodically    | ❌ Nicht abgedeckt                                     |
| **SECO** (CH)                          | seco.admin.ch        | Periodically    | ❌ Nicht abgedeckt                                     |
| **Japan METI End-User List**           | meti.go.jp           | Periodically    | ❌ Nicht abgedeckt                                     |

### 3.3 Klassifizierungs-Systeme

| System                               | Skala           | Caelex-Coverage                    |
| ------------------------------------ | --------------- | ---------------------------------- |
| **US Commerce Control List (ECCN)**  | ~3.000 Einträge | ⚠️ Nur 24 Aerospace-ECCNs          |
| **US Munitions List (USML)**         | 21 Kategorien   | ⚠️ Partial (Aerospace-Schwerpunkt) |
| **EU Annex I Dual-Use**              | ~1.500 Einträge | ✅ Full Index                      |
| **MTCR Annex**                       | Cat I + Cat II  | ✅ Voll indiziert                  |
| **DE Anlage AL**                     | ~500 Einträge   | ✅ Voll indiziert                  |
| **UK Strategic Export Controls**     | Eigene Liste    | ❌ Nicht abgedeckt                 |
| **EU CCL (military equipment)**      | Eigene Liste    | ❌ Nicht abgedeckt                 |
| **Wassenaar Munitions List**         | 22 Items        | ⚠️ Teil von USML implizit          |
| **Australia Group Lists** (Bio/Chem) | ~200 Einträge   | ❌ Nicht abgedeckt                 |
| **Nuclear Suppliers Group**          | Trigger List    | ❌ Nicht abgedeckt                 |

### 3.4 User-Workflows

Was ein realer Export-Compliance-Customer Tag-für-Tag macht:

1. **Item-Klassifizierung** (Pre-Sales)
   - Neue Produktidee → Property-Triggers → Suggested-ECCN → Attorney-Opinion oder BAFA-Auskunft zur Güterliste → CLASSIFIED-Status
   - Item-Updates → Reclassification-Reminder → Re-Run
2. **Counterparty-Onboarding** (Pre-Order)
   - Customer fragt an → KYC-Data sammeln → Beneficial-Ownership-Tree aufnehmen → Multi-List-Screening → 50%-Cascade-Check → Risk-Score
   - Annual Re-Screening
3. **Operation-Pipeline** (Order-Fulfillment)
   - Quote → Items + Parties + Destination + End-Use eintragen
   - Catch-All-Evaluation (Art 4/5/9/10 für EU; Project 5 für US)
   - License-Determination → ggf. Lizenz-Antrag (BIS SNAP-R / DDTC DECCS / BAFA ELAN-K2)
   - Lizenz erhalten → Drawn-Down-Tracking → Shipment → Recordkeeping
4. **Recordkeeping & Audit** (5+ Jahre)
   - Export-Records archivieren (5 Jahre EAR/ITAR, 7-10 Jahre EU)
   - Voluntary Disclosure bei entdeckten Verstößen
   - Internal Audit + External Audit Vorbereitung
5. **Training & Awareness**
   - Empowered Official Training
   - Sales-Team Awareness
   - Annual Refresher
6. **Compliance-Program-Management**
   - Written Procedures Update
   - Risk-Assessment Refresh
   - Compliance-Officer-Reports an Geschäftsleitung

### 3.5 User-Personas

| Persona                                 | Role              | Daily Job in Caelex Trade                                    |
| --------------------------------------- | ----------------- | ------------------------------------------------------------ |
| **Empowered Official / Export Manager** | Senior Compliance | License-Approvals, Risk-Reviews, Vol-Disclosure-Decisions    |
| **Compliance Officer**                  | Operational       | Daily Screenings, License-Tracking, Audit-Prep               |
| **Sales / BD Manager**                  | Front-Office      | Quote-Eingabe, Quick-Check ob ein Deal screen-fähig ist      |
| **Operations / Logistics**              | Shipping          | License-Verifizierung vor Shipment, Recordkeeping-Capture    |
| **Legal Counsel** (intern oder extern)  | Advisory          | CJ-Requests, Attorney-Opinions, Voluntary-Disclosure-Filings |
| **Auditor** (intern oder BAFA/BIS)      | Review            | Audit-Trail-Export, Compliance-Program-Review                |
| **CEO/CFO**                             | Executive         | Dashboard mit Risk + Pipeline + Penalty-Exposure             |

---

## 4. Lücken-Analyse — was alles noch fehlt

### 4.1 Kritische Gaps (Trade ist ohne diese nicht ein vollwertiges Produkt)

| #      | Gap                                                             | Impact                                                                    | Effort                      |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------- |
| **C1** | UI-Portierung `/dashboard/trade/*` → `/trade/*`                 | Trade-Brand ist Schein-Produkt heute                                      | 2-3 Sprints                 |
| **C2** | UK OFSI + UN Consolidated Sanctions Parser                      | Screening unvollständig, regulatorische Lücke für UK/EU-Trade             | 1-2 Tage                    |
| **C3** | License-Exception-Matrix (EAR 740-Series, ITAR §126.5/126.6)    | License-Determination sagt "specific license needed" ohne Exception-Check | 1 Sprint                    |
| **C4** | US CCL Coverage erweitern (24/3000 ECCNs → vollständig)         | Klassifizierung greift nur für Aerospace                                  | 2 Sprints + laufende Pflege |
| **C5** | Real-Time Sanctions-List Webhook + Manual-Refresh               | Tägliche Cron reicht nicht bei Spot-Updates (z.B. Russia-Sanktion)        | 0.5 Sprint                  |
| **C6** | TradePartyOwnership Depth-Limit + Veil-Piercing-Doc             | DoS-Risiko bei pathologischen Graphen                                     | 2-4h                        |
| **C7** | Trade-spezifischer System-Prompt für Astra + Tool-Subset-Filter | Astra macht heute Comply-Antworten                                        | 0.5 Sprint                  |

### 4.2 Wichtige Gaps (Quality-of-Product)

| #       | Gap                                                                                                    | Impact                                           | Effort      |
| ------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ----------- |
| **W1**  | Cron für License-Expiry-Reminders                                                                      | User vergessen Renewals                          | 0.5 Sprint  |
| **W2**  | Cron für TCP/Audit-Cycle-Reminders                                                                     | Compliance-Program-Reife sinkt                   | 0.5 Sprint  |
| **W3**  | Email-Templates: Welcome (Trade-Grant), Screening-Alert, License-Expiry, Voluntary-Disclosure-Reminder | Notification-Loop fehlt                          | 1 Sprint    |
| **W4**  | Document-Vault-Integration für Trade-Lizenzen, BAFA-Auskünfte, TCP, EUC-Certs                          | Heute keine zentrale Document-Ablage             | 0.5 Sprint  |
| **W5**  | Audit-Log-Export (CSV für Auditoren)                                                                   | Audit-Prep manuell                               | 0.5 Sprint  |
| **W6**  | Voluntary-Disclosure-Workflow + Filing-Tracker                                                         | Heute keine UI-Unterstützung                     | 1 Sprint    |
| **W7**  | CJ-Request (Commodity Jurisdiction) Workflow                                                           | Heute manueller Prozess                          | 0.5 Sprint  |
| **W8**  | Training-Module-Integration (Empowered Official Training, Annual Refresher)                            | Compliance-Programm bleibt theoretisch           | 1-2 Sprints |
| **W9**  | EUC (End-Use Certificate) Capture + Tracking                                                           | EUC-Anforderungen sind regulatorisch oft Pflicht | 0.5 Sprint  |
| **W10** | Reexport-Tracking (EAR §734.13 — intermediate re-export chains)                                        | Heute De-Minimis nur für direct Export           | 0.5 Sprint  |
| **W11** | Snapshot-Retention-Policy (sanctions snapshots wachsen unbounded)                                      | DB-Bloat über Zeit                               | 0.5 Sprint  |
| **W12** | Conversation-Domain-Isolation Astra (Trade ≠ Comply Chats)                                             | Astra-Chats mischen sich                         | 0.5 Sprint  |

### 4.3 Nice-to-have Gaps

| #       | Gap                                                                   | Impact                   | Effort      |
| ------- | --------------------------------------------------------------------- | ------------------------ | ----------- |
| **N1**  | Stripe-Pricing-Tiers für Trade (Starter/Pro/Enterprise)               | Self-Service-Buy fehlt   | 1 Sprint    |
| **N2**  | Trade-Welcome-Email + Onboarding-Wizard                               | UX-Polish                | 0.5 Sprint  |
| **N3**  | Bestandskunden-Migration-Mail (6-Mt Loyalty-Bonus)                    | Sales-Move               | 0.5 Sprint  |
| **N4**  | Trade-spezifische Telemetry/Analytics-Events                          | Product-Health-Tracking  | 0.5 Sprint  |
| **N5**  | Fuzzy-Matching für misspelled Product-Names in Classification-Lookup  | UX-Verbesserung          | 0.5 Sprint  |
| **N6**  | ML-Calibration für Property-Trigger-Confidence                        | Engine-Quality           | 1-2 Sprints |
| **N7**  | Geopolitische Tension-Triggers (z.B. Russia-Score-Boost)              | Risk-Score-Accuracy      | 0.5 Sprint  |
| **N8**  | Multi-Jurisdiktions-Map-Visualisierung                                | Marketing-Surface        | 0.5 Sprint  |
| **N9**  | BAFA-ELAN-K2 → andere PDF-Formate (BIS SNAP-R PDF-Export, DDTC DSP-5) | International-Reach      | 1-2 Sprints |
| **N10** | Real-time-Sanctions-Webhooks via OFAC/EU-Feed (statt täglich)         | Reaktionsgeschwindigkeit | 1 Sprint    |
| **N11** | French CIEEMG + Italian D.lgs 105 + andere EU-Member-Paths            | Cross-EU Reach           | 2-3 Sprints |
| **N12** | Wassenaar/Australia-Group/NSG explizite Module                        | Multi-MTCR-Coverage      | 2-3 Sprints |

---

## 5. Architektur-Review

### 5.1 Was gut gebaut ist

1. **Multi-Tenancy** ist sauber via `organizationId` enforced — keine cross-tenant-Leaks möglich
2. **Engines sind reine Pure-Functions** ohne DB-Calls → testbar, wiederverwendbar
3. **Content-addressable Sanctions-Snapshots** via SHA-256 Hash → Audit-Trail integriert
4. **Idempotente Crons** mit Bearer-Auth + Telemetry → Production-grade Operations
5. **Trust-Hierarchie für Classifications** (USER_DECLARED → BAFA_AUSKUNFT_GUETERLISTE) → Provenance integriert
6. **Astra-Tools** sind voll implementiert und mit org-context aware → AI-Layer ready
7. **Audit-Log + DerivationTrace** existieren → Compliance-Evidence-Foundation da
8. **TradeOperation-Lifecycle** als State-Machine modelliert → klare Workflow-Definition

### 5.2 Architektur-Lücken

1. **Two-Worlds-Problem** (das größte): UI in `/dashboard/trade/*` vs `/trade/*` — muss konsolidiert werden
2. **Comply-Astra hat Zugriff auf Trade-Tools** — schadet User-Experience, sollte gefiltert sein
3. **Posture-Layer und Operations-Layer sind ungekoppelt** — z.B. Risk-Score nutzt nicht den TradeComplianceProgram.hasTCP-Status
4. **Sanctions-Listen-Mismatch**: Schema-Enum hat 6 Quellen, Parser implementieren nur 4
5. **Keine WebHook-Architektur**: Alles Pull-based via Cron. Real-time Updates wären besser
6. **Document-Vault nicht integriert** — TradeLicense.documentId zeigt nirgendwo hin
7. **Email-Layer fehlt für Trade-Notifications**

### 5.3 Empfohlene Architekturentscheidungen

**A — Single-Source-of-Truth für Trade-UI**: Die `/dashboard/trade/*` Implementierungen ins TradeShell unter `/trade/*` portieren. Comply-Sidebar verliert den Trade-Eintrag (T5 hat das schon teilweise vorbereitet).

**B — Astra-Context-Splitting**: `AstraConversation` bekommt einen `productScope: ProductCode` Field. Trade-Astra zeigt nur Trade-Conversations + restringiert das Tool-Set auf Trade-Tools.

**C — Sanctions-Refresh-Architektur**: Beibehalten täglicher Cron als Default, aber ergänzen um manuellen "Refresh Now"-Button (Admin) + Webhook-Subscription wo Quellen das anbieten (OFAC RSS, EU Notifications).

**D — Document-Vault-Integration**: TradeLicense.documentId → komplettes Storage-Workflow mit R2/S3 backed.

**E — Email-Templates für Trade**: 5-7 Trade-spezifische Templates (Welcome, Screening-Alert, License-Expiry, Audit-Reminder, Voluntary-Disclosure-Reminder, Migration-from-Comply, Renewal-Coming-Up).

---

## 6. Erforderliche Integrationen

### 6.1 Sanctions-/Watch-List-Feeds

| Quelle                       | API/Feed                                                                                                             | Heutiger Stand                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| OFAC SDN CSV                 | https://www.treasury.gov/ofac/downloads/sdn.csv                                                                      | ✅ implementiert                 |
| OFAC SDN XML + Add/Alt       | https://www.treasury.gov/ofac/downloads/sdn_xml.zip                                                                  | ⚠️ Add/Alt noch nicht integriert |
| OFAC Consolidated (SSI, FSE) | https://www.treasury.gov/ofac/downloads/consolidated/consolidated.csv                                                | ❌                               |
| BIS Entity List XML          | https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern                                        | ✅                               |
| BIS Unverified List          | https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern/unverified-list                        | ❌                               |
| BIS Military End User        | https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern/1770-meu-list                          | ❌                               |
| DDTC Debarred Parties        | https://www.pmddtc.state.gov/ddtc_public/ddtc_public?id=ddtc_kb_article_page&sys_id=c22d1833dbb8d300d0a370131f9619f0 | ✅                               |
| EU FSF                       | https://webgate.ec.europa.eu/europeaid/fsd/fsf                                                                       | ✅                               |
| UK OFSI                      | https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets                          | ❌ **TODO**                      |
| UN Consolidated              | https://www.un.org/securitycouncil/content/un-sc-consolidated-list                                                   | ❌ **TODO**                      |

### 6.2 Govt-API-Endpoints für Live-Lookups

| Endpoint                   | Zweck                                                 | Heutiger Stand                               |
| -------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| BIS Decision Tree (SNAP-R) | License Application Tracking                          | ❌ Nur Eingabe-Form (PDF-Gen-fähig nur BAFA) |
| DDTC DECCS                 | DSP-5 Application Tracking                            | ❌                                           |
| BAFA ELAN-K2               | German export form                                    | ✅ PDF-Export implementiert                  |
| EU TRACES NT               | EU-Lebensmittel/Tier (nicht relevant für Trade-Items) | n/a                                          |
| Datalix (commercial)       | Cross-jurisdiction lookup                             | ❌                                           |

### 6.3 Sonstige Drittsysteme

| System                    | Zweck                      | Status                                                         |
| ------------------------- | -------------------------- | -------------------------------------------------------------- |
| Stripe                    | Subscriptions              | ⏸ deferred (T6)                                                |
| Resend / Sendgrid         | Email                      | ⚠️ Resend für Comply genutzt, Trade-Templates fehlen           |
| R2 / S3                   | Document Vault             | ⚠️ existiert für Comply, nicht für Trade-spezifische Templates |
| LogSnag                   | Telemetry                  | ⚠️ Comply-Events ja, Trade-Events fehlen                       |
| Sentry                    | Error Tracking             | ✅ global aktiv                                                |
| OpenSanctions (3rd party) | Alternative Sanctions Feed | ❌ nicht benutzt                                               |
| Refinitiv / Worldcheck    | Premium Sanctions/PEP      | ❌ nicht benutzt (cost)                                        |

---

## 7. Phasierte Roadmap

### Phase A — Foundation Polish (1 Woche, 5 Sprints)

**Ziel:** Heute sichtbare Lücken schließen, Trade-Brand sauber zum Laufen bringen.

| Sprint | Ziel                                                                                                | Effort   |
| ------ | --------------------------------------------------------------------------------------------------- | -------- |
| A1     | **UI-Portierung Items**: `/dashboard/trade/items/*` → `/trade/items/*` mit TradeShell-Wrapper       | 1 Tag    |
| A2     | **UI-Portierung Counterparties**: `/dashboard/trade/counterparties/*` → `/trade/parties/*`          | 1 Tag    |
| A3     | **UI-Portierung Operations**: `/dashboard/trade/operations/*` → `/trade/operations/*` + Detail-Tabs | 1.5 Tage |
| A4     | **UI-Portierung Licenses**: TradeLicense-Liste + Detail unter `/trade/licenses/*`                   | 1 Tag    |
| A5     | **Welcome-Dashboard mit echten Aggregaten**: KPI-Tiles zeigen tatsächliche Counts                   | 0.5 Tag  |

Output: Funktional komplett portierte Trade-Surface — User können bei Trade nicht mehr aus dem Brand fallen.

### Phase B — Engine + Source Completion (1 Woche, 4 Sprints)

**Ziel:** Sanctions-Coverage und Engine-Tiefe komplettieren.

| Sprint | Ziel                                                                                                                                          | Effort   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| B1     | **UK OFSI Parser** + Sync-Integration + Tests                                                                                                 | 0.5 Tag  |
| B2     | **UN Consolidated Parser** + Sync-Integration + Tests                                                                                         | 0.5 Tag  |
| B3     | **License-Exception-Matrix**: EAR 740-Series (TMP, RPL, GOV, TSR, STA), ITAR §126.5/126.6 — Decision-Tree-Logic + Exception-Eligibility-Check | 2 Tage   |
| B4     | **CCL Coverage erweitern**: weitere 50-100 ECCNs für Critical Sectors (5A002 Crypto, 0A501 Firearms, etc.)                                    | 1-2 Tage |

Output: Engine + Quellen auf Production-Niveau.

### Phase C — Workflow & Notifications (1 Woche, 5 Sprints)

**Ziel:** Compliance-Lifecycle-Workflows schließen.

| Sprint | Ziel                                                                                                                       | Effort  |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | ------- |
| C1     | **License-Expiry-Reminders Cron**: täglich, schickt Mail X Tage vor Ablauf                                                 | 0.5 Tag |
| C2     | **TCP/Audit/Training-Reminders Cron**: Posture-Field-getriebene Reminders                                                  | 0.5 Tag |
| C3     | **Trade-Email-Templates**: 6 Templates (Welcome/Screening-Alert/License-Expiry/Audit-Reminder/Vol-Disc-Reminder/Migration) | 1 Tag   |
| C4     | **Voluntary-Disclosure-Workflow**: UI für Filing-Status + Behörden-Templates                                               | 1 Tag   |
| C5     | **Document-Vault für Trade**: TradeLicense.documentId-Wiring + Upload-Flow + Retrieval                                     | 1 Tag   |

Output: Vollständige Workflow-Notifications + Doc-Management.

### Phase D — Polish & Astra-Isolation (3-5 Tage, 3 Sprints)

**Ziel:** UX-Polish + Astra in Trade-Modus.

| Sprint | Ziel                                                                                                    | Effort  |
| ------ | ------------------------------------------------------------------------------------------------------- | ------- |
| D1     | **Astra Trade-Modus**: `AstraConversation.productScope`, Tool-Subset für Trade, System-Prompt für Trade | 1 Tag   |
| D2     | **Snapshot-Retention-Policy**: Janitor-Cron alt-archive nach 90 Tagen                                   | 0.5 Tag |
| D3     | **Audit-Log-Export für Trade**: CSV-Export der Screening-Decisions + License-Drawdown-Events            | 0.5 Tag |

Output: Astra ist Trade-aware, Audit-fertig.

### Phase E — Multi-Jurisdiktion-Expansion (2-3 Wochen, optional)

**Ziel:** Multi-Country Reach.

| Sprint | Ziel                                                                                         | Effort   |
| ------ | -------------------------------------------------------------------------------------------- | -------- |
| E1     | **UK Strategic Export Controls** Lookup + Path                                               | 1-2 Tage |
| E2     | **French CIEEMG** Lookup + Path                                                              | 1-2 Tage |
| E3     | **Italian D.lgs 105** Lookup + Path                                                          | 1-2 Tage |
| E4     | **Australia Group + NSG** Lookups (bio/chem/nuclear)                                         | 1-2 Tage |
| E5     | **Wassenaar-Explicit-Tracking**: Eigene Lookup-API (heute nur über USML/EU/Annex-I implizit) | 1 Tag    |

Output: Cross-EU + Multilateral.

### Phase F — Stripe + Self-Service (1 Woche, deferred bis Customer-Demand)

**Ziel:** Real-Pricing + Self-Service-Buying.

| Sprint | Ziel                                                                      | Effort   |
| ------ | ------------------------------------------------------------------------- | -------- |
| F1     | **Stripe-Trade-Products definieren** (Starter / Pro / Enterprise)         | 0.5 Tag  |
| F2     | **resolvePriceToProduct** erweitern für Trade-PriceIDs in webhook-handler | 0.5 Tag  |
| F3     | **Trade-spezifische Pricing-Page** mit echten Tier-Cards                  | 1 Tag    |
| F4     | **Trade-Signup-Flow** (`/trade-signup`)                                   | 1-2 Tage |
| F5     | **Bestandskunden-Loyalty-Bonus-Mail-Sequenz**                             | 1 Tag    |

Output: Self-Service-Trade-Buying.

---

## 8. Offene Strategische Entscheidungen

| #       | Entscheidung                                                 | Optionen                                                                                                                                   |
| ------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **D1**  | UI-Portierung-Strategie                                      | (a) Komplettes Move /dashboard/trade/_ → /trade/_ mit Sidebar-Cleanup, (b) Mirror + 90-Tage-Sunset, (c) Beide parallel als Übergang        |
| **D2**  | OpenSanctions vs Self-Built Parser                           | (a) Selbstbau aller Quellen (heute), (b) OpenSanctions API als Aggregator, (c) Hybrid (Self-Built für Cores + OpenSanctions für Long-Tail) |
| **D3**  | Premium-Feeds (Refinitiv/Worldcheck) als Enterprise-Tier?    | (a) Nein — wir bleiben bei free public sources, (b) Ja als Add-on-Tier                                                                     |
| **D4**  | License-Application-API-Integration (BIS SNAP-R, DDTC DECCS) | (a) Nur PDF-Export wie BAFA ELAN-K2 (gov-Forms manuell submittable), (b) Direct-API-Submission                                             |
| **D5**  | Astra-Trade-Modus-Tiefe                                      | (a) Minimal: Tool-Subset + Prompt-Tweak, (b) Eigene AstraEngine-Subclass, (c) Eigener Conversation-Domain                                  |
| **D6**  | Multi-Jurisdiktions-Tiefe                                    | (a) Nur DE+US+EU+MTCR (Status quo), (b) UK+FR ergänzen, (c) Voll Multi-EU (5+ Länder)                                                      |
| **D7**  | Bestandskunden-Migration                                     | (a) 6-Monate Trade-Starter gratis, (b) Loyalty-Bonus für Existing Comply-Export-Control-Users, (c) Sales-only Mode                         |
| **D8**  | Real-time-Sanctions-Updates                                  | (a) Daily Cron reicht (heute), (b) Webhook-Subscriptions, (c) Hybrid: Cron + Manual-Refresh-Button                                         |
| **D9**  | Welche Personas zuerst polishen                              | Compliance Officer / Empowered Official / Sales / Legal Counsel / Auditor                                                                  |
| **D10** | Tests-Strategie für Trade-UI                                 | (a) Vitest-Unit nur, (b) + Playwright E2E, (c) + Visual-Regression                                                                         |

---

## 9. Risk Register

| Risiko                                                                          | Wahrscheinlichkeit | Impact    | Mitigation                                                                        |
| ------------------------------------------------------------------------------- | ------------------ | --------- | --------------------------------------------------------------------------------- |
| **Two-Worlds-Konfusion** — User auf /trade vs /dashboard/trade gleichzeitig     | Hoch               | Hoch      | Phase-A-Portierung mit klarem Cut + Redirect                                      |
| **Schema-Drift** zwischen `/dashboard/trade/*` und `/trade/*` Implementierungen | Mittel             | Hoch      | Single-Source-of-Truth-Strategie via Shared-Components in `src/components/trade/` |
| **Sanctions-Sync-Outage** (OFAC/BIS-API down)                                   | Mittel             | Hoch      | Retry-Policy + Backup-Source via OpenSanctions + Alert-on-Stale                   |
| **False-Positives im Fuzzy-Match**                                              | Hoch               | Mittel    | Tunable Confidence-Threshold + Manual-Review-Queue                                |
| **Regulatorische Änderung** (z.B. neue ITAR-Reform 2026)                        | Sicher (zeitnah)   | Hoch      | Regulatory-Feed-Subscription + Quarterly-Schema-Review                            |
| **OFAC-50%-Rule-Update**                                                        | Mittel             | Hoch      | Audit-Trail-Snapshot-Hash-Chain dokumentiert die jeweils geltende Logik           |
| **DB-Bloat** durch unbounded Snapshots                                          | Mittel             | Mittel    | Phase-D-Retention-Policy                                                          |
| **Customer-Adoption-Lücke** zwischen Comply-Customers und Trade-Buyers          | Hoch               | Mittel    | Loyalty-Bonus für Bestandskunden + Sales-Outreach                                 |
| **Stripe-Pricing-Verschiebung** schadet Pipeline                                | Niedrig            | Mittel    | Sales-Only-Mode hält Pipeline offen                                               |
| **Encryption-Key-Rotation** bricht TradeComplianceProgram-Decryption            | Niedrig            | Hoch      | Key-Versioning-Policy dokumentieren                                               |
| **Performance-Degradation** bei Counterparties >10k                             | Mittel             | Mittel    | DB-Indexing (schon da) + Pagination + Async-Re-Screening                          |
| **Multi-Tenancy-Leak** (TradeItem cross-org sichtbar)                           | Niedrig            | Sehr Hoch | Prisma-Middleware-Tests + Regression-Suite                                        |

---

## 10. Success-Metriken

Wie messen wir, ob Caelex Trade funktioniert?

### Functional (Produktreife)

- **Coverage**: % der wichtigen Workflows die als UI verfügbar sind (Ziel: 90%)
- **Engine-Accuracy**: % der korrekten Klassifizierungs-Suggestions in Testset (Ziel: 85%)
- **Screening-Latency**: Time-to-result für ein Single-Party-Screen (Ziel: <300ms p95)
- **Sanctions-List-Freshness**: Last-Sync-Age für jede aktive Liste (Ziel: <24h)
- **License-Determination-Coverage**: % der Operations für die ein License-Pfad bestimmt werden kann (Ziel: 95%)

### Operational

- **Cron-Erfolgsrate**: % Trade-Crons die erfolgreich durchlaufen (Ziel: 99.5%)
- **Audit-Trail-Vollständigkeit**: % screening-decisions mit vollständigem Trail (Ziel: 100%)
- **DB-Growth-Rate**: GB/Monat (Ziel: <2 GB/Monat bei 1000 Orgs)

### Business (sobald T6/Stripe live)

- **Trade-Conversion**: % Comply-Customers die Trade dazubuchen (Ziel: 25% im Jahr 1)
- **Average Time-to-First-Operation**: vom Trade-Activate bis erste echte TradeOperation (Ziel: <7 Tage)
- **Trade NPS** (eigene Survey): Ziel >40

---

## 11. Empfehlung & Sofortige Next Steps

### Prioritäten-Reihenfolge

1. **Phase A starten — UI-Portierung** (höchster ROI für "die ui ist quatsch"-Feedback)
   - Beginnen mit A1 (Items-Portierung) als kleinster Sprint
2. **Phase B parallelisierbar** — UK OFSI + UN Parser können von einem 2. Track angegangen werden
3. **Phase C nach Phase A** — Email + Cron-Reminders bauen erst Sinn auf wenn UI da ist
4. **Phase D als Polish** — Astra-Isolation + Snapshot-Retention nach Customer-Feedback
5. **Phase E nur bei Demand** — Multi-Jurisdiction nur wenn Kunden außerhalb DE/US/EU
6. **Phase F nach Stripe-Customer-Demand** — heute Sales-Only ok

### Sofort-Aktionen (heute / morgen)

- [ ] **A1 Sprint** — Items-Portierung mit TradeShell-Wrapper anstoßen
- [ ] **B1 Sprint** — UK OFSI Parser als Quick-Win (4h)
- [ ] **D2 Sprint** — Snapshot-Retention-Policy definieren + Cron implementieren (Quick-Win)
- [ ] **Konsolidiere `src/components/trade/`** als geteilte Component-Library für beide Welten (Übergangslösung während Portierung)

### Long-Term

- **Quarterly Regulatory Review** (z.B. erste Märzwoche jedes Quartals): Was hat sich in EAR/ITAR/EU 2021/821 geändert?
- **Bi-Annual Test-Set Refresh**: Real-world-Items + -Parties + -Operations zum Engine-Testing
- **Annual External Compliance Audit**: BAFA-zertifizierte Auditor reviewt Caelex-Trade-Engine

---

## 12. Glossar (für künftige Session-Anker)

- **ECCN** — Export Control Classification Number (US BIS, 15 CFR 738)
- **USML** — United States Munitions List (DDTC, 22 CFR 121)
- **EU Annex I** — Liste der Dual-Use-Güter unter EU 2021/821
- **MTCR** — Missile Technology Control Regime
- **CCL** — Commerce Control List (US BIS)
- **EAR** — Export Administration Regulations (15 CFR 730-774)
- **ITAR** — International Traffic in Arms Regulations (22 CFR 120-130)
- **BIS** — Bureau of Industry and Security (US Commerce)
- **DDTC** — Directorate of Defense Trade Controls (US State Dept)
- **BAFA** — Bundesamt für Wirtschaft und Ausfuhrkontrolle (DE)
- **OFAC** — Office of Foreign Assets Control (US Treasury)
- **SDN** — Specially Designated Nationals (OFAC)
- **OFSI** — Office of Financial Sanctions Implementation (UK)
- **FSF** — EU Financial Sanctions File
- **TCP** — Technology Control Plan (ITAR-Compliance-Document)
- **CJ** — Commodity Jurisdiction (DDTC-Anfrage ob ITAR oder EAR gilt)
- **FDPR** — Foreign Direct Product Rule (EAR §734.9)
- **TAA** — Technical Assistance Agreement (DDTC)
- **MLA** — Manufacturing License Agreement (DDTC)
- **EUC** — End-Use Certificate
- **DPL** — Denied Persons List (synonym mit BIS Denied)
- **SNAP-R** — BIS License Application System
- **DECCS** — DDTC Digital Defense Commerce System
- **ELAN-K2** — BAFA German Export License Application Form

---

**Diese Recherche ist die kanonische Strategie-Quelle für Caelex Trade.** Bei jedem neuen Sprint sollte dieses Dokument als Lückenanker verwendet werden. Updates sind sinnvoll quarterly oder bei größeren regulatorischen Änderungen.
