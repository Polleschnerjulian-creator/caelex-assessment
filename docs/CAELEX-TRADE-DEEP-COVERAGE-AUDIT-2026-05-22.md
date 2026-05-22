# Caelex Trade — Deep Coverage Audit & Strategy 2026-05-22

**Zweck.** Vollständige Standortbestimmung _was wir heute können_ gegen _was zu einer Weltklasse-Komplettlösung für Export-Compliance im Weltraumsektor fehlt_. Anschließend strategische Priorisierung als Roadmap nach Phase A/B/C.

**Aufbau.** § 1 Executive Summary · § 2 Was wir heute LIVE haben (faktischer Audit) · § 3 Regulatorisches Universum 2026 (US/EU/MTCR/Wassenaar/NSG/national + 15 Sanktions-Listen) · § 4 Coverage-Matrix · § 5 Wettbewerbslandschaft · § 6 16 Space-Sektor-Capability-Domänen die General-GTM nicht abdeckt · § 7 Tier-1 Critical Gaps · § 8 Tier-2 Important Gaps · § 9 Tier-3 Nice-to-have · § 10 Konkrete Roadmap (Phase D — J) · § 11 Strategischer Hauptzug · § 12 Risk Register · § 13 Glossar

**Methodik.** Drei parallele Audit-Streams: (a) Codebase-Inventur jeder Trade-Datei nach Phase A/B/C, (b) regulatorische Web-verifizierte Recherche aller Vorgaben für 2026 mit Anker in Federal Register / eCFR / EUR-Lex / BAFA / OFAC, (c) Wettbewerbs- und Operator-Recherche.

Dieses Dokument löst die vorhandene `CAELEX-TRADE-FULL-RECHERCHE.md` (pre-Phase-A) als kanonische strategische Quelle ab. Bestehende Living-Doc bleibt Sprint-Tracker; dieses Dokument ist die Strategie-Quelle.

---

## § 1 Executive Summary

### 1.1 Wo wir heute stehen

Nach Phase A (UI-Portierung Welt-A→Welt-B), Phase B (Engine-Gaps: 4. + 5. + 6. Sanctions-Source plus License-Exception-Matrix plus CCL-Expansion auf 49 ECCNs) und Phase C1 (License-Expiry-Reminder-Cron) hat Caelex Trade als Produkt-Schale **die Komplettheit eines mid-tier GTM** für Operator-Customers. Konkret heißt das:

- **6/6 Major-Sanctions-Sources** parsen, snapshotten, screenen (OFAC SDN, BIS Entity, DDTC Debarred, EU FSF, UK OFSI, UN Consolidated). Plus Fuzzy-Match (Jaro-Winkler) und 50%-Cascade-Engine.
- **Property-Trigger-Engine** mit 10 Regeln über 5 Jurisdiktionen (US CCL, EU Annex I, USML, MTCR, DE Anlage AL), inklusive MTCR Cat I Range×Payload-Detection und EO-Aperture-Threshold (0.50 m).
- **De-Minimis-Calculator** für EAR §734.4 inkl. FDPR-Trigger. **License-Determination-Engine** mit 5 Authorities (BIS, DDTC, BAFA, EU_COMPETENT_AUTHORITY, MTCR_REVIEW).
- **License-Exception-Matrix** für BIS STA/ENC/GOV/TMP + BAFA AGG-12/AGG-27 + EUGEA EU001.
- **Catch-All-Evaluator** für EU 2021/821 Art 4/5/9/10 + §8 AWV inklusive Notification-Duty-Flag.
- **Risk-Score-Engine** 0–100 mit Bands, gewichtete Faktoren, Audit-Trail.
- **Operation-Lifecycle** (DRAFT→AWAITING_CLASSIFICATION→SCREENING→AWAITING_LICENSE→LICENSED→EXECUTED→BLOCKED→VOLUNTARY_DISCLOSURE_FILED).
- **TradeComplianceProgram (T4)** als Posture-Layer mit AES-256-GCM-verschlüsselten DDTC-Number + EO-Email.
- **BAFA-ELAN-K2 PDF-Generator** für Antrags-Vorbereitung — der einzige Dokument-Generator und ein **Marktdifferenzierer**.
- **4 Astra-Tools** (classify_trade_item, screen_trade_party, lookup_classification_code, lookup_trade_party) eingebunden.
- **License-Expiry-Reminder-Cron** mit 3 Buckets (90/30/7d) → Notification-Rows.
- **Welt-B UI komplett** in Indigo-Light-Theme für Items, Parties, Operations, Licenses, Welcome-Dashboard und Posture-Page.

### 1.2 Was uns von "world-class complete" trennt — Top-5

Die Coverage-Lücken in absteigender strategischer Wichtigkeit:

1. **CCL/USML/MTCR Datenbreite.** US CCL 49/3000 ECCNs (1.6%), USML 5/21 Kategorien (24%), MTCR 9/130+ Items (≤7%), EU Annex I 29/530 (5.5%), DE Anlage AL 8/~100 (~8%). Ohne breitere Klassifikations-Daten kann Trade keinen Kunden außerhalb des engsten Aerospace-Subset abdecken. **Größter Gap mit Abstand.**

2. **Sanctions-List Coverage.** 6/15+ Sources. Fehlend: OFAC SSI (Sectoral Russia), NS-MBS, NS-PLC, FSE, CAPTA, CMIC, BIS UVL, BIS MEU, BIS MIEU, BIS DPL plus 8 weitere Sources die im `trade-gov-consolidated.csv` schon gefetcht aber verworfen werden. National-Listen (CH SECO, AU DFAT, NZ, Singapore MAS, UAE) komplett. Plus: **BIS Affiliate Rule** (Sept 29, 2025) erfordert 50%-Aggregation für Entity/MEU/MIEU/DPL — wir haben das nur für OFAC SDN.

3. **2024-2026 Regulatorische Updates nicht absorbiert.** License Exception CSA (Okt 2024), AWV 22nd Amendment Suborbital 0010j (Nov 2025), EU Annex I Update für Semi-SME/Cryo/Quantum (Nov 2025), BAFA C6/C7 EUC-Templates für Russia (Dez 2024), ITAR §126.18(e) AUKUS Dual-National (Dez 2025), UK Single Sanctions List (Jan 2026 — unsere ConList.csv-URL ist deprecated!), 2024 IFR neue 9A515-Subkategorien für OSAM/ADR/Space-Hotels/X-Ray-Optik/EP-Thruster ≥400mN.

4. **Operator-spezifische Workflow-Templates fehlen komplett.** Voluntary Self-Disclosure (BIS §764.5 / DDTC §127.12 / OFAC §501.604), End-Use-Certificate-Collection (BIS-711, DS-83, BAFA C1/C6/C7), Re-Export-Consent-Letter (DDTC §123.9, BIS §740.16 APR), Technology Control Plan (TCP) lebendes Dokument, Empowered Official Workflow + Sign-Off, Deemed-Export-Tracking (HR×PLM×ITAR-Access).

5. **Email + Notification Surface Zero.** License-Expiry-Cron erzeugt nur In-App-Notification-Rows. Kein Email-Template für: License Expiry, Sanctions-Hit (CONFIRMED_HIT / POTENTIAL_MATCH), Catch-All-Trigger, Operation-Blocked, Voluntary-Disclosure-Filed, Document-Expiry. Welcome-Email auf TRADE-Access-Grant fehlt.

### 1.3 Strategischer Hauptzug

Caelex Trade hat **drei Hebel** die kein Incumbent (Descartes, Thomson Reuters, SAP GTS, E2open) hat oder bauen wird:

1. **Space-native Klassifizierungs-Ontologie.** Maintained USML XV / 9A515 / MTCR-Annex / EU Annex I Cat 9 mit jedem Federal-Register-Update + Wassenaar/MTCR-Plenary. Incumbent-GTMs leben auf generischen ECCN-Tabellen und bauen Space-Spezifika nur über externe Consultants (Big-4) als Custom-Implementation — was 12-24 Monate Verzögerung gegenüber dem Regulator bedeutet.

2. **Astra-AI Trade-Copilot.** Engineer-language Interface zu Klassifikations-Komplexität. Kein anderes GTM hat einen LLM-trained, USML/EAR-aware Copilot der in natürlicher Sprache antwortet ("Ist mein rad-harter Star-Tracker ITAR oder EAR?" mit Citation zu USML XV(e)(8) und ECCN 9A515.d). Caelex hat Astra-Architektur + 4 Trade-Tools bereits live.

3. **Engineering-team UX statt Compliance-Specialist UX.** Mid-50-cap-Operator hat 50 Engineers, keine 10-köpfige Export-Compliance-Abteilung. Caelex Trade's UI ist auf engineer-CRUD optimiert (TradeItem mit BoM-Fields, klassifizieren beim CAD-Import). Incumbent-GTM (SAP, Thomson Reuters) braucht 6-18-Monate Big-4-Implementation und hat dann eine 5-Person-Specialist-Cockpit-UX.

**Empfehlung:** Phase D priorisiert CCL/USML-Datenbreite (Hebel 1) und Astra-Tool-Expansion (Hebel 2). Phase E hardent operator-workflows (VSD, TCP, Deemed-Export). Phase F deckt 2024-2026 regulatory updates ab. Phase G+H sind Differenzierung (Real-Time-Policy-Feed, Multi-Jurisdictional Layering, CMMC-Overlay). Details in § 10.

---

## § 2 Was wir heute LIVE haben (Stand 2026-05-22, post-Phase-A/B/C + UI-Fix)

### 2.1 Engines (`src/lib/comply-v2/trade/`)

| Engine                                             | LOC  | Status                                                        | Gaps                                                                                                                                                                                                                                                                  |
| -------------------------------------------------- | ---- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `classification-lookup.ts`                         | ~244 | LIVE                                                          | Keine phonetische Suche; keine WA-Munitions oder Australia-Group-Einträge; `findEntriesByCodePrefix` ist O(n) linear scan                                                                                                                                             |
| `property-trigger-engine.ts`                       | ~661 | LIVE — 10 Regeln                                              | Keine Regeln für ground-equipment, QKD, hypersonic-reentry, ADR/RPO, OSAM (obwohl Topic-Slugs existieren); keine de-minimis-Regel; Regeln 8-10 (Keyword-Heuristiken) sind confidence=LOW ohne Schwellen-Verifikation                                                  |
| `de-minimis-calculator.ts`                         | ~457 | LIVE — 5 Outcomes                                             | Country-Group-Listen hardcoded statt DB-driven; D:1 nur 4 Länder (sollte ~30 sein); FDPR-Detection flaggt nur Vorhandensein, resolved nicht spezifische Variante (Russia/Belarus FDPR vs Advanced Computing FDPR vs SME FDPR vs FN5 FDPR vs Footnote-1 vs Footnote-4) |
| `license-determination.ts`                         | ~380 | LIVE                                                          | **Ruft `matchLicenseExceptions()` noch NICHT auf** — License-Exception-Matrix existiert isoliert; UK ECJU nicht modelliert; nationale CAs (DGA-FR, UAMA-IT, CDIU-NL) collapsed zu `EU_COMPETENT_AUTHORITY`                                                            |
| `license-exception-matrix.ts`                      | ~650 | LIVE — 7 Evaluators (STA/ENC/GOV/TMP + AGG-12/AGG-27 + EU001) | DDTC ITAR-Exemptions (§125.4/§126.4) bewusst out of scope; UK OGELs nicht modelliert; AGG-16/AGG-47 nur als Enum, kein Evaluator; EUGEA EU002 selbiges; **License Exception CSA** (neu Okt 2024) fehlt                                                                |
| `operations/risk-score.ts` + `recompute.server.ts` | ~454 | LIVE — Faktoren + Bands                                       | Kein Auto-Recompute bei Operation-State-Change; kein Trigger bei Counterparty-Screening-Status-Change; Webhook fehlt                                                                                                                                                  |
| `operations/catch-all-evaluator.ts`                | ~423 | LIVE — Art 4/5/9/10 + §8 AWV                                  | Nur `shipFromCountry === "DE"` für §8 AWV; ignoriert DE-incorporated entity die aus non-DE Warehouse exportiert; Human-Rights-Country-Liste hardcoded; keine AuditLog-Write bei Catch-All-Trigger                                                                     |
| `screening/fuzzy-match.ts`                         | ~220 | LIVE — Jaro-Winkler                                           | Linear O(n) scan ohne Prefilter; matched nur auf `names[]`, nicht `addresses` oder `identifiers`; kein phonetischer Pre-Filter (Soundex/Metaphone); kein Identifier-Exact-Match-Path                                                                                  |
| `screening/cascade-50pct.ts`                       | ~273 | LIVE — BFS-Traversal                                          | `control_no_equity` (OFAC Dec-2025 Trustee-Doctrine) wird gespeichert aber **nicht in Threshold-Calculation einbezogen**; keine Graph-Visualisierung im UI; Max-Tiefe 5                                                                                               |
| `screening/screen-party.server.ts`                 | ~60+ | LIVE                                                          | Hits <0.75 (SCORE_WEAK_MATCH) werden verworfen; kein Identifier-basierter Exact-Match-Path vor Fuzzy                                                                                                                                                                  |
| `screening/sync.server.ts`                         | ~80+ | LIVE — 6 Parsers registriert                                  | 30s-Timeout pro List; per-List try/catch; **triple-fetch** des selben trade.gov-Consolidated-URLs (3×~10 MB pro Cron-Run)                                                                                                                                             |
| `screening/snapshot-store.server.ts`               | ~50+ | LIVE — SHA-256 content-addressable                            | OK                                                                                                                                                                                                                                                                    |
| `ops-events.server.ts`                             | ~40  | LIVE — fire-and-forget SSE                                    | OK                                                                                                                                                                                                                                                                    |

### 2.2 Sanctions Parser (`screening/sources/`)

| Parser                               | Status | Coverage                                                           | Critical Gap                                                                                                                                                                                                                                |
| ------------------------------------ | ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ofac-sdn.ts`                        | LIVE   | Primary SDN names, programs, vessel fields                         | **`alt.csv` (AKAs) und `add.csv` (addresses) NICHT geparsed** — AKAs senken Match-Scores; remarks-Field enthält oft DOB/POB/Passport aber wird nicht in `identifiers` extrahiert                                                            |
| `trade-gov-consolidated.ts`          | LIVE   | OFAC_SDN, BIS_ENTITY, DDTC_DEBARRED                                | **8 von 11+ Sources werden gefetcht aber verworfen** — Sectoral Sanctions, Denied Persons, Military End User, Nonproliferation, Unverified List, MEU, DPL, FSE haben keine Prisma-Enum-Values und keine Parser                              |
| `bis-entity.ts` + `ddtc-debarred.ts` | LIVE   | Wrappers über trade-gov-consolidated                               | Triple-fetch desselben URLs (3× pro Cron)                                                                                                                                                                                                   |
| `eu-fsf.ts`                          | LIVE   | sanctionEntity-XML mit allen aliases, addresses, identifiers       | Stateful global Regex (`lastIndex = 0` muss reset werden — fragile); EU FSF URL enthält hardcoded Token (`token=dG9rZW4tMjAxNw`) der sich ändern kann                                                                                       |
| `uk-ofsi.ts`                         | LIVE   | ConList.csv mit Group-ID-Aggregation, Multi-Row-Aliases, Addresses | **UK hat zum 28. Januar 2026 auf eine einzige UK Sanctions List umgestellt** — `ofsistorage.blob.core.windows.net/publishedlists/ConList.csv` ist offiziell deprecated. Wir müssen auf `search-uk-sanctions-list.service.gov.uk` umsteigen. |
| `un-consolidated.ts`                 | LIVE   | INDIVIDUALS + ENTITIES, aliases, addresses, documents              | Stateful global Regex (gleiches Problem)                                                                                                                                                                                                    |

### 2.3 Classification-Daten (`src/data/trade/`)

| File                        | Entries   | % Coverage                                    | Scope                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | --------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `us-ccl.ts`                 | 49        | 1.6 % (49/3000)                               | Cat 1 (1C002), 2 (2B510), 3 (3A001.a.1 + .a.5 + .b.3 + 3A002), 4 (4A001, 4A003), 5/1 (5A001.a, .b, .c, .f), 5/2 (5A002, 5A002.a.1, 5D002, 5E002), 6 (6A002, 6A003, 6A005.a/b, 6A006, 6A008), 7 (7A001, 7A002, 7A003, 7A004, 7A005, 7A101, 7A102, 7A103), 9 (9A001, 9A004, 9A005, 9A007, 9A009, 9A010, 9A011, 9A101, 9A105, 9A515.a/.b/.d/.g/.h/.j, 9D001, 9D004, 9E001, 9E101) |
| `eu-annex-i.ts`             | 29        | 5.5 % (29/530)                                | Aerospace-fokussiert; keine Cat 0 (nuklear), keine CB-Items, keine konventionellen Waffen                                                                                                                                                                                                                                                                                      |
| `usml.ts`                   | 19        | ~24 % (5/21 Kategorien): IV, XV, XI, XII, XVI | Categories I–III (konventionelle Waffen), V–X (Sprengstoffe, Schiffe, Tanks, Flugzeuge ex Spacecraft), XIII–XIV, XVII–XXI komplett                                                                                                                                                                                                                                             |
| `mtcr.ts`                   | 9         | <7 % (9/130+)                                 | 1.A.1, 1.A.2, 2.A.1, 2.A.2, 2.C, 9.A.101, 9.A.106, 9.B.108; sub-items komplett                                                                                                                                                                                                                                                                                                 |
| `de-anlage-al.ts`           | 8         | ~8 %                                          | 0009, 0014 + Wassenaar-spiegelung                                                                                                                                                                                                                                                                                                                                              |
| `cross-reference-topics.ts` | 17 topics | –                                             | OSAM, optical-comm-terminals, manpads-and-anti-spacecraft haben Topic-Slugs aber keine oder wenige Einträge die darauf zeigen                                                                                                                                                                                                                                                  |

### 2.4 Prisma-Models (13 Trade-Modelle, gut gestaltet)

`TradeItem` + `TradeItemNote` + `TradeParty` + `TradePartyOwnership` + `TradeScreeningResult` + `TradeSanctionsSnapshot` + `TradeOperation` + `TradeOperationLine` + `TradeLicense` + `TradeComplianceProgram` + `TradeProgramRequirementStatus` + 13 Enums.

**Dead-Schema-Felder (in Prisma definiert, nirgendwo gelesen/geschrieben):**

- `TradeItem.classificationEvidenceUrl`, `TradeItem.classifiedById`, `TradeItem.manufacturerPartNo` (write-only)
- `TradeParty.iso3166Region`, `TradeParty.ducnsNumber` (nicht im UI)
- `TradeOperation.missionRefId` (relation existiert, kein Code schreibt), `TradeOperation.closedAt` (nie auf terminal-state gesetzt)
- `TradeLicense.documentId` (kein Upload), `TradeLicense.drawnDownValue` (kein Code aktualisiert)
- `TradeComplianceProgram.activeITARLicenses` + 5 weitere License-Counter (display null)

### 2.5 API Routes (16 Files)

`/api/trade/items`, `/api/trade/items/[id]`, `/api/trade/parties`, `/api/trade/parties/[id]`, `/api/trade/parties/[id]/owners`, `/api/trade/parties/[id]/owners/[id]`, `/api/trade/parties/[id]/screen`, `/api/trade/parties/[id]/screenings/[id]/decide`, `/api/trade/operations` (+ [id], +/lines, +/lines/[id], +/licenses, +/licenses/[id], +/recompute-risk), `/api/trade/licenses`.

**Missing API surfaces:**

- Keine v1 public API endpoints unter `/api/v1/compliance/trade/**`
- Kein PATCH/Update für TradeLicense
- Kein License-Drawdown-Endpoint bei Operation-EXECUTED
- Kein Bulk-Create für Items (CSV-Upload für BoM-Klassifizierung wäre hochwertig)
- Kein Astra-tool-only-API für `lookup_item_by_partno` (Manufacturer-Part-Number-Search)

### 2.6 UI Pages

**Welt B (`/trade/*`, Indigo-Light-Theme):** Items + Detail + ClassificationPanel · Parties + Detail + BeneficialOwnersPanel · Operations + Detail + OperationLifecyclePanel + OperationLinesPanel + OperationLicensesPanel · Licenses · Program · Astra · Welcome-Dashboard.

**Welt A (`/dashboard/trade/*`, Dark-Theme — Sunset Aug 2026):** `dashboard/trade/`, `/dashboard/trade/items[+/[id]]`, `/dashboard/trade/counterparties[+/[id]]` (enthält **Triage-Decision-UI für POTENTIAL_MATCH-Screening — die fehlt in Welt-B!**), `/dashboard/trade/operations[+/[id]]`.

**Missing UI Surfaces:**

- Triage-Decision-UI für POTENTIAL_MATCH (nur Welt-A)
- Edit-Forms für TradeComplianceProgram (T4 ist read-only)
- License-Edit-Form (Add gibt's, Edit nicht)
- Document-Upload-Component für License-PDFs
- Bulk-Import (CSV) für Items
- Per-Operation "Recompute Risk" Button (API existiert)
- Operations-State-Machine-Transitions (Panel zeigt visuell, aber Server-Side-Transition-Wiring fehlt)

### 2.7 Cron Routes (3)

- `/api/cron/trade-sync-sanctions` (täglich 04:30 UTC) — 6 Listen sync
- `/api/cron/trade-rescreen-stale` (täglich 05:00 UTC) — Parties >30d
- `/api/cron/trade-license-expiry` (täglich 08:30 UTC, **NEU C1**) — 3 Buckets 90/30/7d → Notification

**Missing crons:**

- License-Expiry-Email-Sender (separate von Notification-Cron)
- Pending-Voluntary-Disclosure-Reminder
- Annual-Self-Assessment-Reminder
- Catch-All-Trigger-Daily-Digest

### 2.8 Astra-Tools (4)

`classify_trade_item`, `screen_trade_party`, `lookup_classification_code`, `lookup_trade_party` (alle in `tool-definitions.ts:1290-1941` + `tool-executor.ts:2919+`).

**Astra kann NICHT:**

- De-Minimis berechnen
- License-Determination ausführen
- License-Exception-Matching ausführen
- Operation-Risk-Score recomputen
- Catch-All evaluieren
- TradeItems/Parties/Operations erstellen oder updaten
- Sanctions-Snapshot-State abfragen ("wann war OFAC SDN letztes mal aktualisiert?")
- License lookup
- TCP / Program lookup

### 2.9 Tests

**Engine + Parser tests: 644 describe/it total, 17 test files.** Detaillierte Coverage: property-trigger (60), classification-pipeline (79), license-determination (63), classification-lookup (52), de-minimis (52), license-exception-matrix (35), risk-score (45), catch-all (34), fuzzy-match (40), cascade-50pct (26), trade-gov-consolidated (26), types (27), eu-fsf (27), uk-ofsi (23), un-consolidated (18), ofac-sdn (21), types-utility (5).

**Tests-Lücken:**

- `sync.server.ts`, `snapshot-store.server.ts`, `screen-party.server.ts`, `cascade-50pct.server.ts`, `risk-score.server.ts/recompute.server.ts`, `ops-events.server.ts` — alle .server.ts ohne Tests
- Alle API-Routes ohne Route-Tests
- Alle UI-Pages ohne Component-Tests

### 2.10 Document-Generation

**Nur eines:** `BafaElanK2Document.tsx` (`@react-pdf/renderer`, client-side PDF, 10 BAFA-Sections für Antrags-Vorbereitung).

**Fehlt komplett:**

- BIS-752 / BIS EAR License Application Support Document
- DDTC DSP-5 / DSP-73 Form Pre-Fill
- DDTC DS-83 (Nontransfer and Use Certificate)
- SED / AES (Shipper's Export Declaration) für US Customs
- Compliance-Certification-Letter (Annual Self-Assessment)
- Voluntary-Self-Disclosure-Package (Narrative + Cover-Letter + Tabelle der Vorgänge)
- End-User-Certificate-Request-Letter
- Re-Export-Consent-Letter-Request
- Server-Side-PDF für Bulk-Generation oder Email-Attachment

### 2.11 Email-Templates

**Zero.** `src/lib/email/` enthält keine Trade-Templates. License-Expiry-Cron (`trade-license-expiry/route.ts`) erzeugt nur Notification-Rows, sendet keine Mails.

---

## § 3 Regulatorisches Universum 2026 — Was es zu decken gibt

### 3.1 US — EAR (15 CFR Parts 730–774)

**CCL-Struktur:** 10 Kategorien (0–9) × 5 Produktgruppen (A–E equipment / B test / C materials / D software / E technology) = 50 Buckets. Insgesamt ~3000 ECCNs.

**Reasons for Control:** NS (National Security), MT (Missile Technology), NP (Non-Proliferation), CB (Chemical/Biological), AT (Anti-Terrorism), RS (Regional Stability), CC (Crime Control), FC (Firearms Convention), EI (Encryption Items), SI (Significant Items), SS (Short Supply), UN.

**Kritisches Update — 23. Oktober 2024 IFR (89 FR 84713):**

- Shift 9A004.x / 9A515.x from NS1/RS1 to NS2/RS2 (für Country Group A:5 loosened).
- **68 neue .y Sub-Paragraphen** zu 9A515 (low-sensitivity CCATS-cleared items).
- Neue Spacecraft-Sub-Kategorien: On-Orbit-Servicing/Proximity-Operations, Space-Hotels, Debris-Removal, Space-Qualified-Optics, X-Ray-Grazing-Incidence-Optics, **Elektrische Triebwerke ≥400 mN Thrust**.
- **License Exception CSA (§740.X)** neu eingeführt für Commercial Space Activities — AUKUS-Spacecraft-Items größtenteils ohne individuelle Lizenz.
- **Rad-hard Microelectronics von USML XV(c)/(e) zu ECCN 9A515.d/.e verschoben.**
- Comments waren 22. Nov 2024 fällig.

**Andere kritische Updates 2024-2026:**

- **Dec 2, 2024 — SME FDPR (§734.9(l))** für Semiconductor-Manufacturing-Equipment + FN5 FDPR (§734.9(k))
- **Sept 29, 2025 — BIS Affiliate Rule** — 50%-Aggregation für Entity List + MEU + MIEU + DPL (analog OFAC's 50%-Rule)

**License Exceptions space-relevant:** STA (§740.20), ENC (§740.17), CSA (§740.X — neu), GOV (§740.11), TMP (§740.9), TSU (§740.13), RPL (§740.10), AVS (§740.15).

**Country Groups:** A:1 (Wassenaar, ~42), A:5 (STA Tier-1, 36 close-ally), A:6 (subset), B (NS reduced), D:1/D:2/D:3/D:4/D:5 (concern: NS/NP/CB/MT/Arms-Embargo), E:1 (Terror-State: IR/KP/SY), E:2 (Cuba). Russia: D:1, D:2, D:3, D:4, D:5. Belarus: D:5. China: D:1, D:3, D:4, D:5.

**Deemed-Export Rule (§734.13(b)):** Release von Tech/Source-Code an Foreign Person in den USA = Deemed Export. Visa-Holder (H-1B/L-1/O-1/F-1 OPT) sind Foreign Persons. Excluded: Citizens, Permanent Residents, Protected Individuals (Asylees/Refugees).

**De-Minimis (§734.4):** 25 % allgemein, 10 % für D:1/D:5/E:1/E:2, 0 % für 9x515 / 600-Series zu D:5/E:1/E:2/CN/RU/BY oder Items unter Russia/Belarus FDPR.

**FDPR-Varianten (§734.9):** (a) NS-FDPR · (e) Entity-List-FDPR Footnote 1 (Huawei) · (f) Russia/Belarus · (g) Russia/Belarus Luxury · (h) Advanced Computing · (i) Supercomputer-End-Use · (j) Entity-List-FDPR Footnote 4 · (k) FN5 (neu Dec 2024) · (l) SME (neu Dec 2024).

**Restricted-Party-Listen US:** Entity List (Supplement 4 Part 744), Unverified List (UVL, Supplement 6), Military End-User List (MEU, Supplement 7), Military Intelligence End-User List (MIEU, Supplement 7), Denied Persons List (Part 764/766 orders).

**Voluntary Self-Disclosure (§764.5):** Initial Notification → Narrative Account binnen 180 Tagen. VSD = "great-weight mitigating factor". Non-Disclosure ist seit 2022–2023 explizit aggravating. Max Civil Penalty $364,992/violation oder 2× Transaction Value. Criminal: bis $1M/violation + 20 Jahre.

**Recordkeeping (Part 762):** 5 Jahre ab spätestem von Export / known re-export / transaction termination.

### 3.2 US — ITAR (22 CFR Parts 120–130)

**USML (§121.1):** 21 Kategorien. Space-kritisch:

- **Cat IV (Launch Vehicles, Missiles, Rockets):** Aug 2025 Final-Rule deckte 15/21 Kategorien; tiefere IV/XV-Revisionen in Pipeline.
- **Cat XV (Spacecraft):** XV(a)(1)-(6) military intelligence/early-warning/ASAT. **XV(a)(7)(i) EO <0.50 m GSD** (2024 Proposal: relax auf 0.20 m — abgelehnt im Oct 2024 IFR; **0.50 m bleibt USML-Schwelle**). **XV(a)(7)(ii) SAR-Bandwidth >300 MHz** (2024 Proposal: 500 MHz — Industrie argumentiert kommerzielle SAR nutzt 600-2000 MHz, also de facto immer USML). XV(b) Ground-Control für XV(a). XV(c) Anti-Jam-Waveforms. XV(d) Nuclear-Hardening. XV(e) Technical Data + Defense Services. XV(f) Autonomous-Rendezvous-GNC.
- **Cat XI (Military Electronics)** — TT&C, EW-Payloads.
- **Cat XII (Fire Control, Laser, Imaging, Guidance)** — IR-Focal-Plane-Arrays, Laser-Systems, Inertial-Reference-Units.

**Registration (Part 122):** Erforderlich für jeden US-Person der manufactures / exports / temp-imports defense articles ODER furnishes defense services. **2025 Fee Structure:** Tier 1 $3,000/yr, Tier 2 $4,000/yr (≤10 licenses), Tier 3 $4,000 + $1,100/licence über 5 hinaus.

**Empowered Official (§120.67):** US-Person, direct employee, legal authority to bind entity, authority and responsibility for license signing AND inquiring into legitimacy. Mehrere EOs erlaubt.

**License-Types:** DSP-5 (perm export), DSP-73 (temp export), DSP-61 (temp import), DSP-85 (classified), DSP-94 (FMS), TAA (Technical Assistance Agreement), MLA (Manufacturing License Agreement), WDA (Warehouse and Distribution Agreement), GC (General Correspondence). Online-Portal: DECCS (Defense Export Control and Compliance System, ersetzt DTrade2).

**§126.18 Dual/Third-Country National Exemption:** Transfers von Defense Articles by Foreign Licensees an Bona-Fide-Regular-Employees ohne separate authorization wenn TAA/MLA + NDA-Program + Screening + Security-Clearance (oder Substantive-Contacts-Screening und NDAs).

**§126.18(e) (Dec 30, 2025):** Spezial-Provisions für Classified-Defense-Article-Transfers an AUKUS-Dual-Nationals (Australien + UK).

**Brokering (Part 129):** Registration + manchmal prior approval.

**Voluntary Disclosure (§127.12):** Initial Notification → Full Disclosure binnen 60 Tagen. **Max Civil Penalty 2025: $1,271,078/violation oder 2× Transaction Value.**

**Debarment:** Statutory (§127.7(b)) nach AECA-Criminal-Conviction, automatic; Administrative (§127.7(a)) nach Part 128 proceeding.

**§126.1 Embargoed Destinations:** AF, BY, MM, CF, CN, CU, CY, CD, ER, HT, IR, IQ, LB, LY, KP, RU, SO, SS, SD, SY, VE, ZW — case-by-case-denial-policy; no exemptions.

### 3.3 EU — Regulation (EU) 2021/821 (Dual-Use)

In Kraft 9. Sept 2021. Ersetzt Reg (EC) 428/2009.

**Annex I:** EU Dual-Use Control List (10 Categories 0–9, ~530 Einträge). Replikat von Wassenaar/MTCR/NSG/AG/CWC.

**Annex II:** EU GEAs EU001–EU008 (EU001 = low-risk-allies; EU002–EU008 = themen-spezifisch).

**Annex III:** Standard form individual/global/general authorizations.

**Annex IV:** Sensitive intra-EU transfer items (Stealth, Cryptanalysis, Very-high-end).

**Catch-Alls:** Article 4 (WMD-end-use), Article 5 (Cyber-Surveillance — EU Recommendation 2024/2659 Oct 2024 Guidelines), Article 9 (National Catch-All — >50% der MS haben adopted, inkl. DE/FR/NL/ES/IT/FI/SE; cover emerging tech, semiconductor SME, quantum), Article 10 (Cross-MS-Notification).

**Article 12 Internal Compliance Programmes:** Required für globale Authorisations. EU Recommendation 2019/1318 (7-element model).

**Sectoral Sanctions in Council Regulations:** **EU 833/2014 Russia** (Annex VII Advanced Tech Goods, Annex XI Aerospace, Annex IX, Annex XIX...) — **20th sanctions package Mid-2025** added chemical precursors, machine-tool-components, banned commercial space-based services + AI + HPC services zu Russia. EU 765/2006 (Belarus), EU 267/2012 (Iran), EU 2017/1509 (DPRK), EU 2024/1485 (Russia mil goods).

**2025 Annex I Update (Delegated Reg 2025/XXX, effective 15. Nov 2025):** Semiconductor-Manufacturing-Equipment (Lithography, Etching, Deposition über Schwellen), Cryogenics (≤4 K mit specified COP), Quantum-Computing (Qubit-Schwellen), Advanced Computing (mirrors US ECCN 4A090/3A090).

### 3.4 Multilaterale Regimes

**Wassenaar Arrangement (42 PS):** WAML (22 Cat conventional arms) + Dual-Use + Sensitive/Very-Sensitive Lists. Plenary Dec 2024: Clarifications optical sensors, rocket propulsion, encryption, intrusion software, IP-network surveillance. Quantum: national-action stage (kein Consensus). Plenary Dec 2025: weitere Refinements.

**MTCR (35 PS):** Annex Cat I (strong-presumption-of-denial: complete rocket/UAV systems with ≥500 kg payload AND ≥300 km range + major subsystems + production facilities) und Cat II (greater flexibility, case-by-case; 20+ dual-use items). Jan 2025 US policy guidance update.

**NSG (48 PG):** Part 1 Trigger List + Part 2 Dual-Use. **July 2025 Plenary Cape Town** — updated Part 2. Space-relevance: RTGs für Deep-Space-Missions (Pu-238 production facilities).

**Australia Group (42 PS):** CBW precursors + Dual-Use Chem-Manufacturing Equipment + Biological Agents + Dual-Use Bio Equipment. Space-relevance: bestimmte Coatings, Propellant-Chemistry.

**HCoC (145+ subscribing states):** Pre-Launch-Notifications (PLNs) für ballistic missile + SLV launches/tests. Annual Declarations. Uruguay 2025–2026 Chair. **Direkte Relevanz für SLV-Provider:** PLN-Coordination über National HCoC-PoC (typically Foreign Ministry).

### 3.5 Nationale Implementierungen

**DE:** AWG (Foreign Trade and Payments Act) + AWV (implementing ordinance) + Anlage AL (national export list ergänzt EU Annex I). **AWV 21st Amendment** (June 2024), **AWV 22nd Amendment** (Nov 1, 2025) adds **Suborbital Vehicles (Item 0010j)** als neue Sub-Position + cryptocurrency-related dual-use + due-diligence. **§8 AWG National Catch-All** für non-AL items mit sensitive end-use. Authority: **BAFA** (Eschborn). Portal: **ELAN-K2**.

**ELAN-K2 Updates Sept 1, 2025:** Mandatory Commodity-Code (Tariff) Entry, Self-Declaration of Awareness, Specific-Reason für null-cert requests, Accept eIDAS Art. 26 Advanced-Electronic-Signatures (Handwritten + Stamp obsolet).

**BAFA EUC Templates Dec 10, 2024:** **C1** Standard, **C6** _NEU_ Export-restricted items to Russia, **C7** _NEU_ Dual-use to Russia (replaces C1 for Russia).

**German Article 9 catch-all national list:** Quantum, Semiconductor SME, Biotech-Precursors added.

**FR:** DGRIS (strategic policy), SGDSN (chairs CIEEMG), SBDU (dual-use). Code de la défense L.2335 + Décret 2001-1192 + Arrêté du 27 juin 2012. **ANFR** (satellite frequencies). FR adopted Article 9 emerging-tech list.

**UK:** Export Control Act 2002 + Export Control Order 2008. **ECJU** (Export Control Joint Unit) within Department for Business and Trade. **71 OGELs in force** (2 new 2024, 24 amended). **OGEL Space** + **AUKUS OGEL** (Aug 16, 2024 in force Sep 1, 2024; updated Mar 20, 2025). **SIEL** (Standard Individual Export Licence), **OIEL** (Open Individual). Portal: **LITE** (Public BETA Sept 2024 — replaces SPIRE).

**IT:** MAECI + UAMA (war materiel) + MAECI/MIMIT (dual-use D.lgs. 221/2017).

**ES:** Secretaría de Estado de Comercio + SGDDU (Law 53/2007 + RD 679/2014).

**JP:** METI + FEFTA (Gaitame Hou) + METI End-User List. **CISTEC** als de-facto ICP reference body.

**IL:** DECA (Defense Export Controls Agency) — Defense Export Control Law 5767-2007. **Extraterritorial reach.** Plus civilian dual-use via Foreign Trade Administration.

**CA:** Global Affairs Canada (GAC) — Export and Import Permits Act + Export Control List + Area Control List (BY/KP/RU).

### 3.6 Sanctions-Listen die der Markt erwartet

| List                                         | Source           | Wir?                              |
| -------------------------------------------- | ---------------- | --------------------------------- |
| OFAC SDN                                     | US Treasury      | ✅                                |
| OFAC SSI (Sectoral Russia)                   | US Treasury      | ❌                                |
| OFAC NS-MBS                                  | US Treasury      | ❌                                |
| OFAC NS-PLC                                  | US Treasury      | ❌                                |
| OFAC FSE                                     | US Treasury      | ❌                                |
| OFAC CAPTA                                   | US Treasury      | ❌                                |
| OFAC NS-CMIC                                 | US Treasury      | ❌                                |
| OFAC Consolidated (rolled-up)                | US Treasury      | ⚠️ (subset über trade.gov)        |
| BIS Entity List                              | US Commerce      | ✅                                |
| BIS Unverified List (UVL)                    | US Commerce      | ❌                                |
| BIS Military End-User (MEU)                  | US Commerce      | ❌                                |
| BIS Military Intelligence End-User (MIEU)    | US Commerce      | ❌                                |
| BIS Denied Persons List (DPL)                | US Commerce      | ❌                                |
| DDTC AECA Debarred                           | US State         | ✅                                |
| State Nonproliferation (E.O. 12938 + INKSNA) | US State         | ❌                                |
| EU FSF (Consolidated Financial)              | EU Commission    | ✅                                |
| EU Sectoral (Annexes 833/2014 etc)           | EU Commission    | ❌ (entries lookup nötig pro Reg) |
| UK Sanctions List (Single from Jan 28 2026)  | UK FCDO          | ⚠️ (alte URL — deprecated!)       |
| UN Consolidated                              | UN SC            | ✅                                |
| Swiss SECO                                   | Switzerland      | ❌                                |
| Australian DFAT                              | Australia        | ❌                                |
| NZ Russia + Targeted                         | NZ MFAT          | ❌                                |
| Singapore MAS                                | Singapore        | ❌                                |
| UAE Local                                    | UAE              | ❌                                |
| French Registre national des gels            | France DG Trésor | ❌                                |
| Polish Sanctions Act 2022                    | Poland UOKiK     | ❌                                |
| Japan METI End-User List                     | Japan METI       | ❌                                |
| Israeli DECA Debarred                        | Israel           | ❌                                |
| Interpol Red Notices (adjacent)              | Interpol         | ❌                                |

**Commercial Enhancers (paid PEP + adverse-media + sanctions):** World-Check (LSEG/Refinitiv), Dow Jones Risk & Compliance, Sayari, Kharon, Sigma Ratings, ComplyAdvantage, MK Denial. Wir haben keinen Enhancer.

### 3.7 Adjacent Regulatory Layers (out-of-scope aktuell, aber market expects)

- **NOAA CRSRA** (Commercial Remote Sensing Regulatory Affairs, 15 CFR Part 960) — separat von EAR/ITAR; Pre-Publication-Buffer (Shutter-Control), Tier-1/2/3-Licensing, Kyl-Bingaman 0.4m für Israel-Imagery
- **FCC + NTIA + ITU** Spectrum-Licensing — Part 25 Satellite, Part 5 Experimental, ITU-R Article 11 (filings)
- **FAA-AST** Part 450 Launch/Reentry Licensing
- **NASA DTSA** TTCP-Review für Foreign-Launch
- **NIST SP 800-171** + **CMMC 2.0 Level 2** (mandatory ab **10. Nov 2025** für DoD-CUI handling — affects every space DoD supplier)
- **DFARS** 252.225-7048, 252.204-7012, 7019/7020, 7021 als Standard-Klauseln in Primes' Contracts
- **Space ISAC** (Information Sharing and Analysis Center) Membership

---

## § 4 Coverage-Matrix — Was wir können × was der Markt erwartet

Legende: ✅ live · ⚠️ partial · ⏳ on roadmap · ❌ fehlt

### 4.1 Classification

| Capability                                             | Status                           | Datei-Anker                                                         |
| ------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------- |
| US CCL Cat 3/4/5/6/7/9 aerospace subset                | ✅                               | `us-ccl.ts` (49 entries)                                            |
| US CCL Cat 0 (nuclear)                                 | ❌                               | –                                                                   |
| US CCL Cat 1 chemicals beyond 1C002                    | ❌                               | –                                                                   |
| US CCL Cat 2 beyond 2B510                              | ❌                               | –                                                                   |
| US CCL Cat 8 marine                                    | ❌                               | –                                                                   |
| US CCL 600-series military                             | ❌                               | –                                                                   |
| US CCL 9A515 sub-paragraphs .b, .d, .e, .f, .g, .h, .j | ⚠️ (.a/.b/.d/.g/.h/.j only)      | `us-ccl.ts`                                                         |
| US CCL 9A515.y suffix (STA-ineligible)                 | ❌                               | referenziert in license-exception-matrix aber kein Eintrag in data  |
| US CCL 9A515.x (specially-designed parts/components)   | ❌                               | –                                                                   |
| EU Annex I Cat 9 aerospace                             | ⚠️ (29 entries)                  | `eu-annex-i.ts`                                                     |
| EU Annex I Cat 0/4/8                                   | ❌                               | –                                                                   |
| USML Cat IV, XV, XI, XII, XVI                          | ⚠️ (19 entries, 5/21 categories) | `usml.ts`                                                           |
| USML Cat I-III, V-X, XIII-XIV, XVII-XXI                | ❌                               | –                                                                   |
| MTCR Annex Cat I                                       | ⚠️ (1.A.1, 1.A.2 only)           | `mtcr.ts`                                                           |
| MTCR Annex Cat II                                      | ⚠️ (5 items)                     | `mtcr.ts`                                                           |
| MTCR Cat II Items 3-20 sub-components                  | ❌                               | –                                                                   |
| DE Anlage AL aerospace                                 | ⚠️ (8 entries)                   | `de-anlage-al.ts`                                                   |
| DE Anlage AL national-autonomous Cat 0-8               | ❌                               | –                                                                   |
| Cross-reference traversal (5 jurisdictions)            | ✅                               | `classification-lookup.ts`, `cross-reference-topics.ts` (17 topics) |
| Wassenaar Munitions List (WAML) Cat 1-22               | ❌                               | –                                                                   |
| UK Strategic Export Control List                       | ❌                               | –                                                                   |
| FR/IT/ES/JP national lists                             | ❌                               | –                                                                   |

### 4.2 Property-Trigger Engine

| Rule                                                                     | Status              | Notes                                                             |
| ------------------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------- |
| MTCR Cat I (range≥300km AND payload≥500kg)                               | ✅                  | Range+Payload combined                                            |
| MTCR Cat II range-only                                                   | ✅                  | –                                                                 |
| USML EO high-res (aperture≥0.50m)                                        | ✅                  | Aber NICHT mit 0.35m/0.40m Sub-Tiers                              |
| USML EO sub-0.50m (0.20m proposed)                                       | ❌                  | –                                                                 |
| Kyl-Bingaman 0.40m Israel-Imagery cap                                    | ❌                  | –                                                                 |
| CCL EO commercial (≥0.50m)                                               | ✅                  | –                                                                 |
| Rad-hard electronics (TID ≥5×10⁴/5×10⁵)                                  | ✅                  | Aber **post-Oct-2024 IFR Move-zu-9A515.d** noch nicht reflectiert |
| Mil-spec spacecraft                                                      | ✅                  | –                                                                 |
| Anti-jam GNSS/TT&C                                                       | ✅                  | –                                                                 |
| Anti-jam null-steering / SAASM / M-code                                  | ❌                  | –                                                                 |
| Electric propulsion (≥400 mN Thrust per Oct 2024 IFR)                    | ❌                  | Keyword-Rule existiert, kein Threshold                            |
| SAR/Radar per-frequency-band thresholds                                  | ❌                  | Generischer Topic-Slug, keine Schwellen-Logik                     |
| Launch-vehicle keywords                                                  | ⚠️ (LOW confidence) | –                                                                 |
| In-Orbit-Servicing / Proximity-Operations                                | ❌                  | Topic-Slug existiert, keine Regel                                 |
| Active Debris Removal                                                    | ❌                  | –                                                                 |
| Quantum Key Distribution                                                 | ❌                  | –                                                                 |
| Hypersonic Reentry-Vehicle                                               | ❌                  | –                                                                 |
| Optical-Comm-Terminal (5A001.f + 6A005 + USML XV composite)              | ❌                  | Topic existiert, keine composite-Klassifikation                   |
| Free-Space Lasers Wavelength × Pulse-Energy × Repetition                 | ❌                  | –                                                                 |
| EO Multispectral/Hyperspectral pro Band-Count + Resolution               | ❌                  | –                                                                 |
| ECCN 4A090 / 3A090 Advanced-Computing (US 2022+)                         | ❌                  | –                                                                 |
| Semiconductor-Manufacturing-Equipment per 2025 EU Annex I + US §734.9(l) | ❌                  | –                                                                 |
| Cryogenics ≤4K (per 2025 EU Annex I)                                     | ❌                  | –                                                                 |
| Spacecraft-as-Integrated-System (BoM Classification)                     | ❌                  | –                                                                 |
| Post-2014 "see-through carve-out" für 9A515                              | ❌                  | –                                                                 |
| AGC autonomy software (MTCR Annex Item 18)                               | ❌                  | –                                                                 |

### 4.3 De-Minimis + FDPR

| Item                                                                                                            | Status                           |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| EAR §734.4 (10%/25%/0%)                                                                                         | ✅                               |
| 9x515 / 600-series 0% to D:5/E:1/E:2                                                                            | ✅                               |
| FDPR detection (flag presence)                                                                                  | ✅                               |
| FDPR variants resolved (NS/Entity-FN1/Russia/Russia-Luxury/Advanced-Computing/Supercomputer/Entity-FN4/SME/FN5) | ❌ — all → REQUIRES_LEGAL_REVIEW |
| Reexport De-Minimis (foreign re-incorporation)                                                                  | ❌                               |
| Country Group lists DB-driven                                                                                   | ❌ (hardcoded)                   |

### 4.4 License Determination + Exception Matrix

| Item                                                           | Status                            |
| -------------------------------------------------------------- | --------------------------------- |
| License-Determination 5 Authorities (BIS/DDTC/BAFA/EU CA/MTCR) | ✅                                |
| **License-Determination calls License-Exception-Matrix**       | ❌ — isolated engines             |
| BIS STA / ENC / GOV / TMP                                      | ✅                                |
| **License Exception CSA** (neu Okt 2024)                       | ❌                                |
| BIS TSU / RPL / AVS / BAG / GFT / APR / AGR / AVS              | ❌                                |
| DDTC ITAR Exemptions (§125.4 / §126.4)                         | ❌                                |
| AUKUS / Five-Eyes spacecraft-carve-out                         | ❌                                |
| BAFA AGG-12 / AGG-27 / EUGEA EU001                             | ✅                                |
| BAFA AGG-16 / AGG-47 / EUGEA EU002                             | ❌ (Enum-Values, kein Evaluator)  |
| UK OGELs (71 in force, incl. OGEL Space + AUKUS OGEL)          | ❌                                |
| FR/IT/ES/JP National General Authorisations                    | ❌                                |
| UK ECJU separately modeled                                     | ❌                                |
| FR DGRIS / IT UAMA / NL CDIU separately modeled                | ❌ (all → EU_COMPETENT_AUTHORITY) |

### 4.5 Sanctions Coverage

| Source                                                                     | Status | Notes                                                         |
| -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------- |
| OFAC SDN                                                                   | ✅     | Primary names only — no alt.csv (AKAs) or add.csv (addresses) |
| OFAC SSI                                                                   | ❌     | Sectoral Russia separate list                                 |
| OFAC NS-MBS / NS-PLC / FSE / CAPTA / CMIC                                  | ❌     | –                                                             |
| BIS Entity                                                                 | ✅     | via trade.gov consolidated                                    |
| BIS UVL / MEU / MIEU / DPL                                                 | ❌     | gefetcht aber verworfen in trade-gov-consolidated             |
| **BIS Affiliate Rule** (50% Entity/MEU/MIEU/DPL aggregation, Sept 29 2025) | ❌     | Wir haben 50% nur für OFAC                                    |
| State Nonproliferation (E.O. 12938 + INKSNA)                               | ❌     | –                                                             |
| DDTC Debarred                                                              | ✅     | –                                                             |
| EU FSF                                                                     | ✅     | –                                                             |
| EU Sectoral (Annexes 833/2014 + 20 Russia packages)                        | ❌     | –                                                             |
| UK Sanctions List (single, Jan 28 2026)                                    | ⚠️     | Wir parsen alte ConList.csv URL — deprecated!                 |
| UN Consolidated                                                            | ✅     | –                                                             |
| Swiss SECO                                                                 | ❌     | –                                                             |
| AU DFAT, NZ MFAT, SG MAS, UAE                                              | ❌     | –                                                             |
| FR DG Trésor / PL UOKiK / JP METI End-User / IL DECA                       | ❌     | –                                                             |
| Commercial Enhancers (World-Check / Dow Jones / Sayari / Kharon)           | ❌     | –                                                             |

**Beneficial Ownership Cascade:** ✅ for OFAC 50% — control_no_equity tracked but not aggregated. Needs extension to BIS Affiliate Rule.

### 4.6 Operations + Lifecycle + Risk

| Item                                                             | Status                   |
| ---------------------------------------------------------------- | ------------------------ |
| Operation lifecycle 8 states                                     | ✅                       |
| Risk score 0-100 + bands + factors                               | ✅                       |
| Catch-all evaluator Art 4/5/9/10 + §8 AWV                        | ✅                       |
| Auto-recompute on operation state change                         | ❌                       |
| Auto-recompute on counterparty screening change                  | ❌                       |
| Drawdown engine (TradeLicense.drawnDownValue update on EXECUTED) | ❌                       |
| Server-side state-machine transitions wired                      | ❌ (Panel zeigt visuell) |

### 4.7 Compliance Program

| Item                                                           | Status                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| TradeComplianceProgram model + read-only page                  | ✅                                                      |
| AES-256-GCM encrypted DDTC-Number + EO-Email                   | ✅                                                      |
| Edit forms for program data                                    | ❌                                                      |
| Technology Control Plan (TCP) document generation              | ❌                                                      |
| TCP lebendes Dokument mit Annual-Review-Reminder               | ❌                                                      |
| Empowered Official sign-off workflow                           | ❌                                                      |
| 9-Element ICP (BIS / EU 2019/1318 / Wassenaar) self-assessment | ⚠️ (program requirement statuses tracked, but no model) |
| BAFA ICP (Innerbetriebliches Sicherheitsmanagement)            | ❌                                                      |
| Annual self-assessment scheduling + reminders                  | ❌                                                      |
| Deemed-Export tracking (HR × Engineer × ITAR access)           | ❌                                                      |

### 4.8 Documents

| Item                                                             | Status |
| ---------------------------------------------------------------- | ------ |
| BAFA-ELAN-K2 Antrag-Vorbereitung PDF                             | ✅     |
| BIS-752 / BIS EAR-Application support                            | ❌     |
| DDTC DSP-5 / DSP-73 / DSP-85 support                             | ❌     |
| DS-83 Nontransfer and Use Certificate                            | ❌     |
| SED / AES Shipper's Export Declaration                           | ❌     |
| End-User Certificate request letter (BIS-711, BAFA C1/C6/C7)     | ❌     |
| Re-Export Consent Letter request (DDTC §123.9)                   | ❌     |
| Voluntary-Self-Disclosure package (Narrative + Cover + Schedule) | ❌     |
| Compliance Certification Letter (annual)                         | ❌     |
| License-PDF storage (TradeLicense.documentId set but no upload)  | ❌     |

### 4.9 Astra-Tools

| Tool                                                          | Status |
| ------------------------------------------------------------- | ------ |
| classify_trade_item                                           | ✅     |
| screen_trade_party                                            | ✅     |
| lookup_classification_code                                    | ✅     |
| lookup_trade_party                                            | ✅     |
| **calc_de_minimis**                                           | ❌     |
| **determine_license_requirements**                            | ❌     |
| **match_license_exceptions**                                  | ❌     |
| **recompute_operation_risk**                                  | ❌     |
| **evaluate_catch_all**                                        | ❌     |
| **create_trade_item / party / operation**                     | ❌     |
| **update_trade_classification** (write-back)                  | ❌     |
| **lookup_license_by_number**                                  | ❌     |
| **lookup_program**                                            | ❌     |
| **lookup_snapshot_state** ("when was OFAC SDN last updated?") | ❌     |
| **plan_voluntary_disclosure**                                 | ❌     |
| **draft_end_use_certificate**                                 | ❌     |
| **draft_reexport_consent_letter**                             | ❌     |

### 4.10 Cron + Notifications + Email

| Item                                                      | Status |
| --------------------------------------------------------- | ------ |
| Sanctions sync cron                                       | ✅     |
| Re-screen-stale cron                                      | ✅     |
| License-expiry-reminder cron (3 buckets)                  | ✅     |
| **Email for license expiry**                              | ❌     |
| Email for sanctions hit (POTENTIAL_MATCH / CONFIRMED_HIT) | ❌     |
| Email for catch-all trigger                               | ❌     |
| Email for operation BLOCKED                               | ❌     |
| Email for VSD-filed                                       | ❌     |
| Welcome email on TRADE-access grant                       | ❌     |
| Annual-self-assessment-reminder cron                      | ❌     |
| Pending-VSD-reminder cron                                 | ❌     |
| Catch-all-trigger daily digest cron                       | ❌     |

### 4.11 API Surface

| Item                                                | Status                                                   |
| --------------------------------------------------- | -------------------------------------------------------- |
| `/api/trade/items` CRUD                             | ⚠️ (kein DELETE, kein bulk)                              |
| `/api/trade/parties` CRUD                           | ⚠️ (kein PATCH update, kein bulk)                        |
| `/api/trade/operations` CRUD + lines + licenses     | ✅                                                       |
| `/api/trade/licenses` GET + POST                    | ⚠️ (kein PATCH/Update)                                   |
| Public v1 API `/api/v1/compliance/trade/**`         | ❌ (Stripe-for-Space-Compliance positioning braucht das) |
| Webhooks für Operation-Status-Change                | ❌                                                       |
| Webhooks für Sanctions-List-Update                  | ❌                                                       |
| Webhooks für License-Expiry                         | ❌                                                       |
| Embeddable widget (analog Caelex Compliance Widget) | ❌                                                       |

---

## § 5 Wettbewerbslandschaft 2026

### 5.1 Markt-Tier-Struktur

| Tier                      | Player                                                                                           | Customer        | Annual Spend |
| ------------------------- | ------------------------------------------------------------------------------------------------ | --------------- | ------------ |
| **Tier 1 Enterprise**     | SAP GTS · Thomson Reuters ONESOURCE · Oracle GTM                                                 | Fortune 1000    | $250k–$2M+   |
| **Tier 2 Mid-Market**     | Descartes (Visual Compliance + OCR EASE) · E2open (Amber Road) · MIC Customs · Integration Point | Large Mid-Cap   | $50k–$250k   |
| **Tier 3 SMB / Embedded** | Avalara Trade Compliance · 3rdwave · Sanction Scanner · KYG Trade · ECCN.help                    | E-commerce, SMB | $5k–$50k     |

**Strukturelle Beobachtung:** Kein Tier ist space-native. A&D ist _eine von vielen_ Vertikalen, typischerweise mit generischen ECCN-Tabellen die externe Big-4-Consultants (KPMG/PwC/Westernacher/Crave Infotech) für USML-XV/9A515-Logik customizen müssen. Der "Space-Stack" ist im Markt nicht von der Stange erhältlich.

### 5.2 Konkrete Inkumbent-Analyse

**Descartes Visual Compliance + OCR EASE.** 2000+ customers, 67,500+ subscribers, 100+ countries. Stärkstes "Screening + Classification" Combo. **Aerospace/Defense-leaning** (Reference Customer: Meggitt PLC). Pricing: few-thousand to $100k+. **Gaps für Space:** keine native USML-XV-Taxonomie, keine Spacecraft-as-Integrated-System Klassifikation, keine 0.50m EO-Threshold-Gating, keine MTCR Cat I auto-detection, keine BAFA-ELAN-K2-Integration, keine OSAM/ADR mission-class handling, kein Astra-AI-Copilot.

**Thomson Reuters ONESOURCE.** Mid-to-upper enterprise. World-Check + CLEAR Daten-Feeds. **Tax/Financial-controls-DNA** — Engineering-Team-UX schwach. **Gaps für Space:** identisch zu Descartes plus Big-4-Implementation-Cycle (6-18 Monate) inkompatibel mit NewSpace-Tempo, per-seat-Pricing.

**E2open (Amber Road).** **900+ global lists** — Industry-leading Coverage-Breadth + Transliteration (Cyrillic/Arabic/Chinese). **Gaps für Space:** Generic-GTM ontology, kein USML-XV, kein Mission-Class-Awareness, Supply-Chain-Network-Effect (Stärke) maps nicht zu Small-Bespoke-Space-Supply-Chains.

**SAP GTS.** Tightest ERP-Integration (because it IS SAP). 95%+ automation sanctioned-party-screening, 60-80% faster customs. $500k-$2M+ implementations via Big-4. **Pure Enterprise.** **Gaps für Space:** Wrong-Customer-DNA, 6-18-Month-SI-Engagement, kein native Space-Vertical, per-User-Pricing-Model unrealistisch für 50-Person Space-Startup, kein Agentic-AI für Export-Compliance.

**MIC Customs Solutions** (Austrian) — **strong für European-Customs** (ATLAS/NCTS/AIS). Customs-anchored. **Gaps für Space:** kein USML/DDTC, customs-not-licensing-focused.

**Avalara Trade Compliance.** Tax-anchored. **SMB e-commerce + Mid-market.** Stripe-of-Cross-Border-Tax. **Komplette Mismatch:** kein RPS, kein ECCN, kein License-Workflow — designed für DDP-e-commerce nicht für ITAR.

### 5.3 Feature-Whitespace — Wo NO Incumbent gewinnt

Die 16 Capability-Domänen die _kein_ Incumbent ausreichend abdeckt:

1. **Native USML XV / 9A515 Decision Trees** — maintained, versioned, space-spezifische Ontologie. Customers heute via Consulting.
2. **Spacecraft-as-Integrated-System Classification** — BoM-aware Klassifizierer mit Post-2014-See-Through-Rule.
3. **Post-2014 See-Through Carve-Out** für 9A515 — Logik dass ITAR-Komponente im 9A515-Spacecraft _nicht_ die ganze Satellit zu USML elevatet.
4. **MTCR Cat I Auto-Gating** — Range×Payload-Calculator.
5. **OSAM / ADR Mission-Class Wizards** — Customer-Consent-Letter-Templates, BIS-Advisory-Opinion-Library.
6. **ADR ASAT-Adjacency Disclosure** — Art-4-Catch-All-Logic + ASAT-Risk-Scoring.
7. **EO Resolution Gating** — Continuous-Variable Classifier mit Sub-Tiers (0.20m / 0.35m / 0.40m KBA / 0.50m / 0.80m).
8. **Shutter-Control + KBA per-Destination** — Real-Time-Policy-Event-Integration.
9. **SAR per-Frequency-Band Threshold Gating.**
10. **Optical-Comm Composite Classification** — 5A001.f + 6A005 + USML XV multi-ECCN.
11. **Launch-Vehicle MTCR-Layering** — MT-Overlay on top of ECCN.
12. **GNC Software MTCR Annex Item 18** — Source-Component-Level-Classifier.
13. **Ground-Station Composite** — 5A001.c + 9A515.b + USML XV mit Anti-Jam-Feature-Detection aus Spec-Sheet.
14. **Deemed-Export Workflow** — HR + PLM + Access-Control + Audit-Trail per Engineer per ITAR-Artifact.
15. **Living TCP + Empowered Official Workflow** — ITAR-Compliance-Program-as-Code.
16. **CMMC Level 2 + ITAR Data-Handling Overlay** — Combined Classification + Handling-Control.

### 5.4 Operator-Pain-Points (Real-World Evidence)

- **SpaceX** — DOJ-INA-Litigation (2023-2025): DOJ sued SpaceX für Hiring-Discrimination gegen Asylees/Refugees, ITAR-US-Person vs INA-Hiring-Law. Highlights den **Operator-Pain wo ITAR ↔ Labor-Law konfligieren.**
- **Planet Labs** — KBA 0.4m Cap für Israel + **April 2026 Shutter-Control-Activation**: indefinite Iran-Imagery-Blackout. Pain-Point: rapid Policy-Event-Response.
- **ICEYE** (FI) + **ICEYE Polska sp. z o.o.** — Multi-Jurisdictional Layering EU + US + Poland; SAR 0.25m sitzt USML-equivalent zone. May 2026 POLSARIS-Deal mit Polish-Armed-Forces.
- **Capella Space** — US-SAR, USML XV trotz 2024 IFR-easing für Mid-Res; foreign sales benötigen TAA + case-by-case-Licensing.
- **Rocket Lab** — Dual jurisdiction US/NZ + Wallops + Andøya geography; Reusable Architecture (Neutron) → MTCR Cat II/I considerations; SEC 10-K material-risk.
- **Isar Aerospace** — Spectrum (~700-1000 kg LEO) → almost certainly MTCR Cat I; BAFA + Norway-Andøya-Authority. **First Spectrum flight March 2025 failed shortly post-launch.**
- **RFA** — RFA One (1300 kg LEO, Cat I capable); Static-Fire-Failure Aug 2024 Shetland.
- **HyImpulse / OHB** — German launcher + integrator; OHB Multi-National-Structure (DE/IT/SE) + heavy US-origin-component-integration + regular Re-Export-Licensing.
- **Boeing 2024** $51M Consent Agreement (DDTC) — Foreign-Person-Employees + Contractors accessing Technical Data without proper licenses. **Genau das Deemed-Export-Tracking-Gap-Failure.**
- **RTX 2025** Record $200M Settlement — ITAR violations.

---

## § 6 16 Capability-Domänen — Tiefe pro Domäne

(Konsolidierung der Wettbewerbs-Whitespace § 5.3 mit Domain-Detail aus Recherche)

### 6.1 USML XV / 9A515 native Decision Trees

Die 9A515-Subparagraphen-Logik wechselt seit 2013-2014 4-mal (2013 SLV-Reform, 2014 Satellite-Reform, 2024 IFR, 2025 Commercial-Sat-Liberalization). Software klassifiziert 2022 ist 2026 falsch.

**Was wir brauchen:** Maintained Reference-Data-Set, versioned mit jedem Federal-Register-Update. Status: 9A515.a/.b/.d/.g/.h/.j in `us-ccl.ts` (6 sub-paragraphs). Fehlt: 9A515.c/.e/.f/.x/.y, plus **68 neue .y-Paragraphen** added Okt 2024 IFR.

### 6.2 Spacecraft-as-Integrated-System Classification

Satellit = 200-500 Komponenten Mix aus USML / ECCN 9A515 / ECCN 600-Series / EAR99-COTS. Per-SKU-Classification ist ungenügend.

**Was wir brauchen:** Integrated-Spacecraft-Classification-Engine mit BoM-Input → per-Item Jurisdiction + Integrated Jurisdiction (Post-2014-Carve-Out angewendet) + Citation zu Federal-Register-Text.

### 6.3 Post-2014 See-Through Rule Carve-Out (9A515-only)

**Status:** Nicht modelliert. Hat **enormous** Pricing-Konsequenzen wenn falsch klassifiziert.

### 6.4 MTCR Cat I Auto-Gating

✅ partial: wir haben Range × Payload Combined-Detection in `property-trigger-engine.ts`. Aber: Reusable-Launcher-Considerations (First-Stage konfiguriert anders) fehlen. Sounding-Rocket-Höhe ≥300km mit sub-500kg-Payload kann auch Cat I sein (range-or-altitude metric).

### 6.5 OSAM / ADR Mission-Class Wizards

Players: Northrop MEV-1/2 + MRV-MEP, Astroscale ELSA-d/ELSA-M/ADRAS-J, ClearSpace-1, Orbit-Fab, Starfish Space, NEO Aerospace.

**Klassifizierung-Gap:** Kein dedicated ECCN. Fällt zurück auf 9A515.a + 9A004-catch-all + 9D515/9E515 software/tech + manchmal USML XV(a)(5)/(6).

**Workflow-Gap:** Owner-Consent (Liability/Registration Convention) + Export-Authorization + End-Use-Statement. Drei legale Artifakte in einem Workflow → kein GTM hat das.

### 6.6 ADR ASAT-Adjacency Disclosure

EU 2021/821 Article 4 catch-all → BAFA/ECJU/DGA/UAMA können Article 4 auf nicht-gelistete ADR-Vehicle anwenden. **Duty-to-Inform** wenn military-end-use known/suspected. ScienceDirect 2018 + Russia Kosmos 2543/2542 (2020) + India Mission Shakti (2019) sharpened ASAT-Concern.

### 6.7 EO Resolution-Threshold Gating

| Resolution         | Classification                                          |
| ------------------ | ------------------------------------------------------- |
| <0.10m             | USML XV(a)(7)(i) extreme                                |
| 0.10m–0.50m        | USML XV(a)(7)(i)                                        |
| 0.35m–0.50m        | 9A515.g.1 (optics only, not whole spacecraft)           |
| =0.50m boundary    | Ambiguous (operators target 0.50m für EAR-jurisdiction) |
| >0.50m             | 9A515.a                                                 |
| All EO over Israel | KBA 0.4m cap                                            |

**2024 IFR retained 0.50m** (industry wanted 0.80m). **Shutter-Control aktiviert April 2026** — Planet Labs Iran-Blackout per US-Gov-Request.

### 6.8 Shutter-Control + KBA per-Destination

NOAA's CRSRA Suspension (15 CFR Part 960 + §744.21). Kyl-Bingaman 1996 (modified 2018 + Federal Register 2020-15770 — cap dropped to 0.4m GSD from previous 2m).

### 6.9 SAR per-Frequency-Band Thresholds

USML XV(a)(7)(ii) Bandwidth >300 MHz threshold (2024 proposal 500 MHz declined). Different thresholds per band (X/C/L/S/P). Industry Status 2026: Capella USML, ICEYE EU+Wassenaar, Umbra USML, Synspective JP-controls, iQPS JP, Spacety CN-entity-list-adjacent.

### 6.10 Optical-Comm Composite Classification

5A001.f telecom-laser + 6A005.a continuous-wave + 6A005.b pulsed + USML XV anti-jam-waveforms. Mynaric CONDOR Mk3, TESAT SCOT80, General Atomics Optical Terminals, Skyloom — composite classification ist die Realität, kein incumbent modelliert.

### 6.11 Launch-Vehicle MTCR-Layering

USML Cat IV + ECCN 9A004/9A005/9A007/9A009/9A011 jeder mit **MT (Missile Technology)** designation. License-Exception-STA für many MT-controlled excluded for many destinations. 9A004 Oct 2024 IFR: NS1→NS2, aber license-required für RU/CN/VE.

### 6.12 GNC Autonomy Software (MTCR Annex Item 18)

9D001 / 9D004 / 9E001 / MTCR Annex Item 18. STA cannot be used for 9D001/9D002 specific propulsion-components oder 9D004.f/.g software. Modern reusable-launcher-GNC stack ≈ terminal-guidance-of-missile stack — Dual-Use-Software-Component-Level classification needed.

### 6.13 Ground-Station Composite

5A001.b + 5A001.c + 9A515.b + USML XV(b). Newer GNSS Anti-Jam-Adds: SAASM, Null-Steering-Antennas, Electronically Steerable, Security Modules. Viasat, Kratos, KSAT, Atlas Space, AWS Ground Station, Microsoft Azure Orbital — composite classification ist Reality.

### 6.14 Deemed-Export Workflow (HR × PLM × ITAR-Access)

Boeing 2024 $51M Consent ≈ exact dieses Failure-Mode. Foreign-National-Engineer Access zu Controlled-Data ohne Deemed-Export-License. Common Red Flags: Chinese / Russian / Iranian Dual-Nationals on Hardware-Engineering-Teams.

**Was wir brauchen:** HR-Integration für Engineer-Citizenship + PLM-Integration für Assembly-Access + Audit-Trail per Engineer per ITAR-controlled Artifact.

### 6.15 Living TCP + Empowered Official Workflow

Per ITAR §120.67 + DDTC Compliance Program Guidelines. TCP-Sections: Physical Security · Logical Access Controls · Recordkeeping · Training · Foreign-National Procedures · Visitor Procedures · Annual Update. EO Personal-Liability — DDTC can debar individuals.

### 6.16 CMMC Level 2 + ITAR Data-Handling Overlay

**Effective 10. November 2025** für DoD-Contractors handling CUI (inkl ITAR/EAR data). NIST SP 800-171 mit 110 Controls als Baseline. CMMC L2 + DFARS 252.225-7048 + 252.204-7012/7019/7020/7021 — Same Artifact, four Regimes.

---

## § 7 Tier-1 Critical Gaps (Show-Stopper für "world-class complete")

Hier alle Gaps die Caelex Trade von "credible Mid-Market Mission" zu "World-Class Complete" trennen. Sortiert nach Impact-pro-Aufwand.

### T1-1 — License Exception CSA + AUKUS Spacecraft Carve-Out integrieren

**Why critical:** Oct 2024 IFR introduzed License Exception CSA für AUKUS-spacecraft. Customers brauchen es für AU/UK-Destinations. Wir liegen jetzt schon 19+ Monate hinter dem Regulator.
**Implementation:** New evaluator in `license-exception-matrix.ts`. Plus Country-Group `AUKUS` (US/UK/AU). Plus Country-Group `FIVE_EYES` (US/UK/AU/CA/NZ). Hooks in `license-determination.ts` (which doesn't call exception matrix yet!).
**Effort:** 1-2 Sprints.

### T1-2 — License-Determination ruft License-Exception-Matrix

**Why critical:** B3 baute matrix in Isolation. `license-determination.ts` weiß nichts davon. Customers sehen "REQUIRED" wo `EXCEPTION_MAY_APPLY` korrekt wäre.
**Implementation:** Call `matchLicenseExceptions(input)` at end of `determineLicenseRequirements()`, fold `applicable[]` in respective requirements als `status = EXCEPTION_MAY_APPLY`.
**Effort:** 1 Sprint.

### T1-3 — UK Sanctions List Migration auf Single-List (Jan 28 2026)

**Why critical:** Unsere ConList.csv URL ist deprecated. Wir fetchen veraltete Daten — Compliance-Risk.
**Implementation:** New parser `uk-sanctions-list.ts` für `search-uk-sanctions-list.service.gov.uk`. Replace `uk-ofsi.ts` (oder rename). Plus separate parser für UK OFSI Sectoral + OTSI Trade-Sanctions.
**Effort:** 1-2 Sprints.

### T1-4 — BIS Affiliate Rule (50% Aggregation Entity/MEU/MIEU/DPL)

**Why critical:** Sept 29 2025 BIS adopted explicit 50%-Rule. Wir haben 50% nur für OFAC SDN. Customers screening parties via Entity-List + MEU + MIEU verfehlen Cascade-Hits.
**Implementation:** Extend `cascade-50pct.ts` für additional list-types. Trigger source-of-truth in TradeParty.screeningStatus when Entity-List-Affiliate ≥50%.
**Effort:** 1 Sprint.

### T1-5 — Sanctions-Source-Expansion: trade-gov consolidated 8 fehlende Sources

**Why critical:** Trade.gov CSV enthält 11+ Sources, wir mappen 3. Sectoral Sanctions, Denied Persons, MEU, DPL, UVL, FSE, Non-proliferation — bereits gefetcht, bereits geparsed, nur SOURCE_TO_LIST-Mapping fehlt + Enum-Values.
**Implementation:** Add 8 TradeSanctionsList enum values. Extend SOURCE_TO_LIST map. Per-source parser wrappers. Per-source UI badges.
**Effort:** 2 Sprints.

### T1-6 — OFAC SSI (Sectoral Russia) als separate Source

**Why critical:** Russia is hottest sanctions theatre. SSI nicht in SDN — operators that screen only SDN miss Sectoral Russia.
**Implementation:** New parser `ofac-ssi.ts` against `https://www.treasury.gov/ofac/downloads/ssi/ssilist.pdf` (XML/CSV available).
**Effort:** 1 Sprint.

### T1-7 — CCL Datenbreite — 49 → 250+ ECCNs

**Why critical:** 49/3000 (1.6%) covers nur Aerospace. Customers außerhalb engsten Space-Subset bekommen "unknown ECCN".
**Implementation:** Expand `us-ccl.ts` systematisch: Cat 5 Part 2 (encryption) komplettieren, Cat 3 (electronics) breiter, Cat 4 (computers) komplett, Cat 6 (sensors/lasers) breiter, 600-Series militärisch (9A610/9A619 etc), Cat 0 (nuclear) für RTGs.
**Effort:** 3-4 Sprints + ongoing maintenance.

### T1-8 — USML 5 → 21 Kategorien Coverage

**Why critical:** USML I-III, V-X, XIII-XIV, XVII-XXI fehlen. Customer mit Munitions-Components (Cat III ammunition + Cat IV missile + Cat XV satellite) sieht halben Picture.
**Implementation:** Expand `usml.ts` mit allen 21 categories minimum 1-2 representative entries each.
**Effort:** 3 Sprints.

### T1-9 — MTCR Annex 9 → 50+ Items

**Why critical:** MTCR Cat I gating requires accurate MTCR-Annex Detection. 9/130+ items = high false-negative rate für sub-system Klassifizierung.
**Implementation:** Expand `mtcr.ts` mit Cat II sub-items 3-20 (Propellants, Composites, Pyrolytic Deposition, Production-Tech, Flight-Control-Servos, Gyros, GPS-Guidance-Kits, Radomes, Thermal-Protection, Telemetry).
**Effort:** 2-3 Sprints.

### T1-10 — Voluntary-Self-Disclosure Workflow (BIS + DDTC + OFAC)

**Why critical:** VSD = "great-weight mitigating factor" für Penalty (BIS §764.5, DDTC §127.12, OFAC §501.604). Wenn Customer einen Vorgang als violation erkennt, brauchen sie strukturierte VSD-Prep workflow.
**Implementation:** New model `VoluntaryDisclosure` (linked to Operations/Items/Parties). VSD-Lifecycle (INITIAL_NOTIFICATION_DRAFTED → INITIAL_NOTIFICATION_SUBMITTED → NARRATIVE_DRAFTED → NARRATIVE_SUBMITTED → CLOSED). VSD-Cover-Letter + Narrative-Template (jurisdiction-aware). Schedule of violations table. Senior-Official-Certification signature workflow.
**Effort:** 4-5 Sprints (Phase E core).

### T1-11 — Email-Templates für 6 Trigger-Events

**Why critical:** C1 Notification-Cron ohne Email = Customer sieht es nur wenn er in Inbox kommt. Critical-Bucket (≤7d) sollte Mail-out triggern.
**Implementation:** 6 Templates (License-Expiry + Sanctions-Hit + Catch-All + Operation-Blocked + VSD-Filed + Welcome-Trade-Access). Resend-Client wrapping. Per-User-Notification-Preference table.
**Effort:** 2 Sprints (Phase C2).

### T1-12 — Astra-Tool-Expansion: De-Minimis + License-Determination + Exception-Matching

**Why critical:** Astra heute kann nicht den core engine path execute. Engineer fragt "Brauche ich Lizenz für 5A002.a.1 nach Frankreich?" — Astra sagt "Ich kann nicht determinieren." Limitiert Astra zu Lookup-Tool.
**Implementation:** 3 neue Tools: `calc_de_minimis`, `determine_license_requirements`, `match_license_exceptions`. Output mit explainable factors + citations.
**Effort:** 2 Sprints.

### T1-13 — Operations State-Machine Transitions wired

**Why critical:** UI zeigt Pipeline visually (DRAFT→AWAITING_CLASSIFICATION→SCREENING→AWAITING_LICENSE→LICENSED→EXECUTED→BLOCKED). Customers können nicht advance.
**Implementation:** PATCH `/api/trade/operations/[id]/status` mit allowed-transitions matrix + validation (z.B. AWAITING_LICENSE→LICENSED braucht ≥1 TradeLicense attached + no unclassified lines). UI buttons in OperationLifecyclePanel wired to PATCH.
**Effort:** 1-2 Sprints.

### T1-14 — License-Drawdown-Engine

**Why critical:** TradeLicense.drawnDownValue ist immer 0. Customer mit value-cap-bound license (z.B. BAFA AGG-12 mit 500.000 EUR cap) sieht keine warnings wenn Operations cumulative value cap exceeden.
**Implementation:** Drawdown-Engine: at Operation EXECUTED, sum line-values × FX, add to attached licenses' drawnDownValue. Alert when ≥80% / ≥90% / ≥100%.
**Effort:** 2 Sprints.

### T1-15 — TradeComplianceProgram Edit-Forms

**Why critical:** T4 ist read-only. Customer onboarding muss currently über Admin-Backend / DB-Manual. Show-stopper für Self-Service-Onboarding.
**Implementation:** Edit-Forms für jede der 7 Sections + Encrypted-Field-Handling (write goes through program-service.ts encryption-boundary).
**Effort:** 3 Sprints.

### T1-16 — Document-Vault für License-PDFs + BAFA-Anträge + EUCs

**Why critical:** TradeLicense.documentId existiert, Upload nicht. Customer kann License-PDF nicht persisten → kein audit-trail.
**Implementation:** R2-storage upload component + GET signed URL + per-document access-log. Integrate with TradeLicense (license-PDF), TradeOperation (BAFA-Antrag-PDF + EUCs), TradeComplianceProgram (TCP-PDF).
**Effort:** 3 Sprints (Phase C4).

---

## § 8 Tier-2 Important Gaps (Polish + Depth)

### T2-1 — Property-Trigger neue Rules

Für 2024-2026 regulatory additions: Electric-Propulsion-Threshold ≥400 mN, OSAM/RPO mission-class, ADR mission-class, Quantum-Key-Distribution, Hypersonic-Reentry, Semiconductor-SME-per-2025-Annex-I, Cryogenics ≤4K, SAR-per-Frequency-Band thresholds, Multispectral/Hyperspectral per-Band, Anti-Jam-Null-Steering/SAASM/M-Code, Optical-Comm-Composite-Classification.

### T2-2 — FDPR Variant Resolution

Heute alle FDPR-Trigger → REQUIRES_LEGAL_REVIEW. Resolve in spezifische Variante (NS / Entity-FN1 / Russia / Russia-Luxury / Advanced-Computing / Supercomputer / Entity-FN4 / SME / FN5) mit per-Variant-Action-Path.

### T2-3 — UK ECJU separately modeled

License-Authority-Enum extend mit UK_ECJU. Plus 71 OGELs als License-Type-Enum (OGEL_SPACE, OGEL_AUKUS, etc).

### T2-4 — National EU Authorities separately modeled

DGA-FR, UAMA-IT, CDIU-NL, BIS-ES, MIMIT-IT — alle aktuell collapsed zu EU_COMPETENT_AUTHORITY. Differentiate.

### T2-5 — Spacecraft-as-Integrated-System Classifier (Stage 1)

BoM-Import (CSV) → per-line classification + integrated classification + post-2014 see-through rule application.

### T2-6 — Re-Export-Consent-Letter Workflow

Templates per major US OEM (Sodern, Jena-Optronik, Honeywell, Rockwell Collins, BAE, Microsemi). Email-out + reply-tracking + escalation.

### T2-7 — End-Use-Certificate Collection Templates

BAFA C1/C6/C7, BIS-711, DS-83 — pre-filled per Operation. Customer Email-out + reply-tracking.

### T2-8 — BIS-752 / DDTC DSP-5 Application Support Documents

PDF-Generator analog BAFA-ELAN-K2. Pre-fill aus TradeOperation + TradeComplianceProgram.

### T2-9 — Triage-Decision-UI in Welt-B

POTENTIAL_MATCH-Decision (CONFIRMED_HIT / FALSE_POSITIVE_DISMISSED) ist nur in Welt-A `dashboard/trade/counterparties/[id]`. Port to Welt-B.

### T2-10 — Auto-Recompute auf State-Change

Operation update → recompute risk. Counterparty screening change → recompute affected operations. Sanctions snapshot change → re-screen affected parties (this already exists via cron, but on-demand trigger would be valuable).

### T2-11 — Per-Operation "Recompute Risk" Button

API exists, UI Button fehlt in Welt-B `/trade/operations/[id]`.

### T2-12 — Sanctions Identifier-Based Exact-Match-Path

Vor Fuzzy-Match: try exact-match on VAT/LEI/DUNS/CAGE/Passport. Higher confidence + less false-positives.

### T2-13 — OFAC SDN companion files alt.csv + add.csv

Parse aliases + addresses für full canonical entries.

### T2-14 — Astra-Tool: Snapshot-State Lookup

"When was OFAC SDN last updated?" → returns latest TradeSanctionsSnapshot per list with fetchedAt + upstreamVersion + entryCount.

### T2-15 — Astra-Tool: Operation-Risk-Recompute + Catch-All

`recompute_operation_risk` and `evaluate_catch_all` tools — Astra can recompute operation when user updates classification.

### T2-16 — Tests für .server.ts files

sync.server.ts, snapshot-store.server.ts, screen-party.server.ts, cascade-50pct.server.ts, recompute.server.ts — currently zero tests.

### T2-17 — Public v1 API Endpoints `/api/v1/compliance/trade/**`

`/classify`, `/screen`, `/de-minimis`, `/license-determination`, `/snapshot-state` — for "Stripe for Space Compliance" positioning. API-Key-based auth + rate-limits + audit-logs.

### T2-18 — Webhook System

Operation-Status-Change, Sanctions-List-Update, License-Expiry, Catch-All-Trigger.

### T2-19 — Embeddable Widget für Space-Sector-Suppliers

Star-Tracker / Reaction-Wheel / Solar-Cell suppliers embeddet "Caelex Trade Check" widget — customer enters destination → vendor sees red/amber/green pre-cleared check.

### T2-20 — Annual-Self-Assessment Scheduling

Cron + email + assessment-form. ICP 9-element model.

### T2-21 — Pending VSD Reminder Cron

If VoluntaryDisclosure status = INITIAL_NOTIFICATION_SUBMITTED and >150 days old (BIS) or >50 days (DDTC), reminder email to EO.

### T2-22 — Catch-All Daily Digest Email

Per-Org daily digest of new catch-all triggers in last 24h.

### T2-23 — OperationLine "Recompute Risk" inline UI

When user edits a line's quantity/value, hint that risk needs recompute.

### T2-24 — Multi-Org Switcher in TradeShell

Currently TradeShell shows org-name but no switcher. Required for multi-org users (LAW_FIRM Atlas-customers + Operator-customers).

### T2-25 — Welcome-Email auf TRADE-Access-Grant

When `grantProductAccess(orgId, "TRADE")` fires, send welcome with onboarding-checklist.

---

## § 9 Tier-3 Nice-to-have (Differenzierung, M&A-Optional)

### T3-1 — World-Check / Dow Jones / Sayari Integration

Commercial PEP + adverse-media enhancement. Caelex-licensed B2B reseller arrangement oder customer-bring-your-own-key.

### T3-2 — Multi-Jurisdictional License-Layering Tracker

Single Operation needs concurrent licenses from US (BIS+DDTC) + EU (BAFA) + UK (ECJU). Track per-jurisdiction status side-by-side.

### T3-3 — TCP als Lebendes Dokument

Versioned TCP-Sections, annual-review-reminders, EO-Sign-Off-Workflow, change-log.

### T3-4 — CMMC Level 2 Overlay

ITAR-controlled data artifact → auto-assign CMMC-required handling controls. Integration with M365 / Google Workspace permissions.

### T3-5 — Deemed-Export Tracking Module

HR (Engineer-Nationality) × PLM (Assemblies-Touched) × ITAR-Access-Log. Daily-Digest of Deemed-Export-Events for EO review.

### T3-6 — Space ISAC Integration

ISAC-Membership-Status + Incident-Reporting-Workflow + ISAC-Threat-Feed.

### T3-7 — Real-Time Policy Event Ingestion

Federal Register API + EUR-Lex + BAFA RSS + UK Government feeds → daily delta + impact-analysis ("New License Exception added — affects 17 of your TradeItems").

### T3-8 — DECCS / SNAP-R / LITE / ELAN-K2 Direct-Submission Connectors

Direct file submission to authority portals (rather than PDF prep). Heavy compliance + per-portal integration work.

### T3-9 — BoM Bulk-Import + CAD-Integration

CSV-bulk-import. PLM-Adapter for Siemens NX / Catia / Solidworks.

### T3-10 — Mission-Class Wizards (OSAM / ADR / EO / SAR / Launch)

Guided workflows per archetype: customer-consent-letter, BIS-advisory-opinion-request, end-use-statement, dual-use-disclosure.

### T3-11 — TCP / EO / ICP per-Operator-Archetype Templates

Pre-built compliance programs for satellite-operator, launch-provider, EO-operator, SAR-operator, OSAM-venture archetypes.

### T3-12 — Multi-Jurisdiction-Expansion: UK/FR/IT/AT/BE additional CCL/MTCR data

Each jurisdiction's national list digitized for classification-engine.

---

## § 10 Konkrete Roadmap — Phase D bis J

Vorgeschlagene Sprint-Sequenz, jeweils mit Effort-Estimate. Phase-Größe 4-6 Wochen jeweils.

### Phase D — Regulatory Updates 2024-2026 absorbieren (4 Wochen)

**Ziel:** Compliance-Risk eliminate. Bestehende Engines aufholen mit dem Regulator.

- **D1** UK Sanctions List Migration auf Single-List (T1-3) — 1 Sprint
- **D2** BIS Affiliate Rule (50% Aggregation Entity/MEU/MIEU/DPL) (T1-4) — 1 Sprint
- **D3** License Exception CSA + AUKUS Spacecraft Carve-Out (T1-1) — 1-2 Sprints
- **D4** License-Determination ruft License-Exception-Matrix (T1-2) — 1 Sprint
- **D5** Property-Trigger Rules für 2024 IFR additions (T2-1) — 2 Sprints
- **D6** AWV 22nd Amendment Suborbital Item 0010j + BAFA C6/C7 EUC-Templates — 1 Sprint
- **D7** Living-Doc + Vercel-Deploy + Verifizierung — 0.5 Sprint

### Phase E — Workflows (5-6 Wochen)

**Ziel:** Operator-specific Compliance-Workflows from "engine result" zu "filed disclosure / certified compliance".

- **E1** Voluntary-Self-Disclosure Workflow (T1-10) — 4 Sprints (BIS + DDTC + OFAC variants)
- **E2** Email-Templates für 6 Trigger-Events (T1-11, C2 = Phase-C deferred) — 2 Sprints
- **E3** TradeComplianceProgram Edit-Forms (T1-15) — 3 Sprints
- **E4** Re-Export-Consent-Letter Workflow (T2-6) — 2 Sprints
- **E5** End-Use-Certificate Collection Templates BAFA C1/C6/C7 + BIS-711 + DS-83 (T2-7) — 2 Sprints

### Phase F — Sanctions Coverage Expansion (4 Wochen)

**Ziel:** 6 → 15+ List-Coverage. Market parity.

- **F1** OFAC SSI separate parser (T1-6) — 1 Sprint
- **F2** Trade-Gov Consolidated 8 unmapped Sources (T1-5) — 2 Sprints (NS-MBS, NS-PLC, FSE, CAPTA, CMIC, BIS UVL, MEU, MIEU, DPL + Enum-Values + UI-Badges)
- **F3** EU Sectoral Sanctions (833/2014 Annexes I/IV/VII/IX/XI/XIX) — 2 Sprints
- **F4** Swiss SECO + AU DFAT + NZ MFAT + SG MAS — 3 Sprints
- **F5** OFAC SDN companion files alt.csv + add.csv (T2-13) — 1 Sprint
- **F6** Identifier-Based Exact-Match-Path (T2-12) — 1 Sprint

### Phase G — Data Depth (5 Wochen)

**Ziel:** US CCL 49 → 250+ ECCNs, USML 5 → 21 categories, MTCR 9 → 50+ items.

- **G1** US CCL Cat 0 (nuclear, RTGs) + Cat 1 (materials beyond 1C002) — 1 Sprint
- **G2** US CCL Cat 5 Part 2 (encryption full subset) + Cat 4 (computers full) — 1 Sprint
- **G3** US CCL 600-Series military (9A610, 9A619 etc) — 1 Sprint
- **G4** US CCL 9A515 missing sub-paragraphs (.c/.e/.f/.x/.y inkl. 68 neuen Y) — 1 Sprint
- **G5** USML I-III + V-X + XIII-XIV + XVII-XXI — 3 Sprints
- **G6** MTCR Cat II Items 3-20 sub-components — 2 Sprints
- **G7** EU Annex I beyond Cat 9 (Cat 5 Part 1+2, Cat 3, Cat 6) — 2 Sprints
- **G8** DE Anlage AL national-autonomous beyond Cat 9 — 1 Sprint

### Phase H — Astra-Expansion + Operations-Polish (4 Wochen)

- **H1** Astra Tools: `calc_de_minimis` + `determine_license_requirements` + `match_license_exceptions` + `evaluate_catch_all` + `recompute_operation_risk` (T1-12, T2-15) — 2 Sprints
- **H2** Operations State-Machine Transitions wired (T1-13) — 1-2 Sprints
- **H3** License-Drawdown-Engine (T1-14) — 2 Sprints
- **H4** Welt-B Triage-Decision-UI (T2-9) — 1 Sprint
- **H5** Per-Operation Recompute-Risk Button (T2-11) — 0.5 Sprint
- **H6** Document-Vault für License-PDFs + BAFA-Anträge (T1-16, Phase C4) — 3 Sprints

### Phase I — Public API + Webhook System (3-4 Wochen)

- **I1** Public v1 API `/api/v1/compliance/trade/{classify,screen,de-minimis,license-determination,snapshot-state}` (T2-17) — 3 Sprints
- **I2** Webhook System (T2-18) — 2 Sprints
- **I3** Embeddable Widget für Suppliers (T2-19) — 2 Sprints
- **I4** Rate-Limiting + API-Key-Management — 1 Sprint

### Phase J — Differentiation (Open-Ended, M&A/PMF Driver)

- **J1** Real-Time Policy Event Ingestion (T3-7) — 3-4 Sprints
- **J2** Spacecraft-as-Integrated-System Classifier Stage 1 (T2-5) — 4-5 Sprints
- **J3** Mission-Class Wizards OSAM / ADR / Launch (T3-10) — 4 Sprints
- **J4** Deemed-Export Tracking Module (T3-5) — 5-6 Sprints
- **J5** TCP Living Document + EO Sign-Off (T3-3) — 3 Sprints
- **J6** CMMC Level 2 Overlay (T3-4) — Open-ended (compliance + integration)
- **J7** Federal Register API + EUR-Lex + BAFA RSS ingestion — 2 Sprints
- **J8** World-Check / Dow Jones / Sayari Integration (T3-1) — Variable depending on partner

### Phase-Reihenfolge-Rationale

D first weil regulatory-compliance risk. E weil das core operator-Workflow ist (VSD ist eine der häufigsten "warum sollte ich Caelex kaufen"-Antworten). F second-to-last in core-functionality weil sanctions sind kommodität — viele Inkumbents haben das. G ist breadth-expansion; gut to schaffen sich aber nicht show-stopper. H polished operation lifecycle. I+J sind Differenzierungs-Plays.

---

## § 11 Strategischer Hauptzug

### 11.1 Positioning

**Caelex Trade = "Stripe for Space-Sector Export-Compliance"**. Operatoren-fokussiert (orgType=OPERATOR), Space-native Ontologie, Engineer-friendly UX, Astra-AI Trade-Copilot.

Konkurriert NICHT mit:

- SAP GTS (Pure-Enterprise, Big-4-Implementation)
- Avalara Trade Compliance (e-commerce SMB)

Konkurriert MIT:

- Descartes (kein space-native)
- Thomson Reuters (kein space-native + Big-4 implementation)
- Internal-built tools (Excel + Google Sheets bei den meisten 50-500-person NewSpace operators)

Differenziert durch:

- Space-native USML XV / 9A515 / MTCR Annex ontology, versioned mit Federal-Register-Updates
- Astra-AI Trade-Copilot mit natural-language engineer interface
- BAFA-ELAN-K2 PDF preparation (market-unique heute)
- Engineering-team UX statt Compliance-Specialist UX

### 11.2 Beach-Head-Customer-Profile

Best fit: **50-500-engineer NewSpace operator mit multi-jurisdictional supply chain.**

- ICEYE (FI, with US + Poland subsidiaries) — multi-jurisdictional, SAR-specific
- Astroscale (JP/UK/US) — OSAM, multi-jurisdictional
- RFA (DE) — launch, MTCR-Cat-I-near
- Isar Aerospace (DE) — launch, MTCR-Cat-I
- HyImpulse (DE) — launch
- Synspective (JP) — SAR
- Capella (US) — SAR
- ClearSpace (CH/UK) — ADR
- Orbex (UK) — launch
- Skyrora (UK) — launch
- OHB (DE/IT/SE) — integrator
- Mynaric (DE) — optical-comm hardware
- TESAT-Spacecom (DE) — optical-comm hardware
- D-Orbit (IT) — in-orbit transportation
- Atomos Space (US) — in-space transportation
- Starfish Space (US) — OSAM

Reference-Logo-Acquisition als Priority 1 sales play.

### 11.3 Moat

**Space-domain-depth, not features.**

Speziell:

1. Maintained USML XV / 9A515 ontology mit jedem Federal Register update
2. Maintained MTCR Annex mit jedem Plenary update
3. Maintained CCL Cat 9 / Cat 5 mit jedem EAR amendment
4. Library von BIS advisory opinions for OSAM / ADR / SAR / EO precedents
5. Pre-built TCP / EO / ICP templates per operator archetype
6. Astra-AI Trade-Copilot mit space-domain training corpus

**Incumbents werden das nicht bauen** — Space-TAM ist relative zu Cores zu klein. Strukturelle Opportunity.

### 11.4 GTM-Sequence-Recommendation

**Q3 2026:** Phase D + E parallel — regulatory-compliance + VSD-workflow.

**Q4 2026:** Phase F + erste Reference-Customers (ICEYE oder Astroscale Pilot).

**Q1 2027:** Phase G + Stripe-Pricing-Activation (T6 von ursprünglicher Roadmap).

**Q2 2027:** Phase H + Public API launch.

**Q3 2027+:** Phase I + J — Differenzierung-Plays.

### 11.5 Revenue-Hypothesis

**Mid-market Operator Pricing (annualized):** $50k–$150k. Vergleichbar zu Descartes mid-market.

**Enterprise Tier (3+ jurisdictions, deemed-export tracking, CMMC overlay):** $150k–$400k.

**Public-API/Widget for Supplier-Sector** (star tracker manufacturers, reaction-wheel vendors, etc): $5k–$25k volume play, ggf. transaction-based.

**Per Operator ROI:** Boeing $51M Consent (2024) + RTX $200M (2025) → ROI-Story für $100k/year is trivial.

---

## § 12 Risk Register

| Risk                                                                                           | Likelihood | Impact       | Mitigation                                                                                                              |
| ---------------------------------------------------------------------------------------------- | ---------- | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Regulatory update slips through; customer files based on stale data → fine                     | Medium     | Catastrophic | Real-time Federal-Register-Ingestion (Phase J). Customer-facing "Last Updated" badges. ITAR-jurisdiction-watchdog cron  |
| Sanctions hit missed because list not covered → fine                                           | Medium     | High         | Phase F coverage expansion. Disclaimer in UI ("Coverage: 6/15 lists. World-Check enhancer recommended for enterprise.") |
| False positive screening hit → blocked customer business → contract loss                       | High       | Medium       | Triage-Decision UI in Welt-B (T2-9). Score-tier-explanation in panel. Audit trail of decisions                          |
| ITAR-vs-Labor-Law conflict (SpaceX-style DOJ case) → customer liability                        | Low        | High         | Deemed-Export module (Phase J4) plus customer-facing legal-disclaimer text per CLAUDE.md                                |
| Big-4 (KPMG/PwC) launches space-vertical add-on                                                | Medium     | High         | Space-domain-depth moat ist hart zu replizieren. Reference-customer-flywheel + Astra-AI moat                            |
| SAP / Descartes acquires space-vertical startup                                                | Low        | High         | M&A-defensible position requires reference-customer flywheel + paid-pilot at 3+ operators                               |
| Operator customer changes regulators (e.g. UK Brexit-style) → license-engine-rule-set obsolete | Low        | Medium       | Real-time policy ingestion + per-jurisdiction modular rule-engines                                                      |
| Astra-AI gives wrong classification → customer files based on it                               | Medium     | High         | Always include citation + "screening-level guidance" disclaimer. Never auto-submit. Human-in-the-loop required          |
| Encryption-key rotation incident (TradeComplianceProgram encrypted fields)                     | Low        | High         | Key-rotation runbook + per-org key derivation already documented                                                        |

---

## § 13 Glossar

- **AECA** — Arms Export Control Act (22 USC §2778)
- **AGG** — Allgemeine Genehmigung (BAFA General Authorisation: Nr. 12, 16, 27, 47)
- **AKA** — Also-Known-As (sanctions alias)
- **APR** — Additional Permissive Reexports (License Exception §740.16)
- **ASAT** — Anti-Satellite Weapon
- **ATLAS** — German Customs Electronic Filing System
- **AUKUS** — Australia-UK-US Security Pact
- **AVS** — Aircraft, Vessels and Spacecraft in Transit (License Exception §740.15)
- **AWG** — Außenwirtschaftsgesetz (German Foreign Trade and Payments Act)
- **AWV** — Außenwirtschaftsverordnung (Implementing Ordinance)
- **BAFA** — Bundesamt für Wirtschaft und Ausfuhrkontrolle
- **BAG** — Baggage (License Exception §740.14)
- **BIS** — US Bureau of Industry and Security
- **BoM** — Bill of Materials
- **CAPTA** — Correspondent Account or Payable-Through Account Sanctions
- **CCL** — Commerce Control List
- **CCATS** — Commodity Classification Automated Tracking System
- **CFIUS** — Committee on Foreign Investment in the United States
- **CISTEC** — Center for Information on Security Trade Control (JP)
- **CMIC** — Non-SDN Chinese Military-Industrial Complex Companies List
- **CMMC** — Cybersecurity Maturity Model Certification
- **CRSRA** — Commercial Remote Sensing Regulatory Affairs (NOAA)
- **CSA** — Commercial Space Activities (License Exception §740.X, neu Okt 2024)
- **CUI** — Controlled Unclassified Information
- **DECCS** — Defense Export Control and Compliance System (replaces DTrade2)
- **DDTC** — US Directorate of Defense Trade Controls (State Department)
- **DFARS** — Defense Federal Acquisition Regulation Supplement
- **DPL** — Denied Persons List (BIS)
- **DSP-5/73/85** — Permanent / Temporary / Classified Export licenses (DDTC)
- **EAR** — Export Administration Regulations
- **ECCN** — Export Control Classification Number
- **ECJU** — Export Control Joint Unit (UK)
- **ECR** — Export Control Reform (US 2013-2014)
- **EEI** — Electronic Export Information (US AES filing)
- **EI** — Encryption Items (CCL Reason for Control)
- **ELAN-K2** — BAFA Electronic Application System
- **ENC** — Encryption (License Exception §740.17)
- **EO** — Empowered Official (ITAR §120.67) / Earth Observation
- **EORI** — Economic Operator Registration and Identification (EU)
- **EUC** — End-User Certificate
- **EUGEA** — EU General Export Authorisation (EU001–EU008)
- **EUS** — End-Use Statement
- **FDPR** — Foreign Direct Product Rule (15 CFR §734.9)
- **FCDO** — UK Foreign, Commonwealth and Development Office
- **FN1/FN4/FN5** — Entity List Footnote designations (different FDPR scopes)
- **FOCI** — Foreign Ownership, Control or Influence
- **FSE** — Foreign Sanctions Evaders List
- **FSF** — EU Financial Sanctions File
- **GAC** — Global Affairs Canada
- **GBS** — Group B Shipments (legacy License Exception, retired)
- **GFT** — Gift Parcels and Humanitarian Donations (License Exception §740.12)
- **GNSS** — Global Navigation Satellite Systems
- **GOV** — Governments + ISS (License Exception §740.11)
- **GSD** — Ground Sample Distance (EO resolution)
- **HCoC** — Hague Code of Conduct against Ballistic Missile Proliferation
- **HS / HTS** — Harmonised System / Harmonised Tariff Schedule
- **ICP** — Internal Compliance Programme
- **IFR** — Interim Final Rule
- **INKSNA** — Iran, North Korea, Syria Nonproliferation Act
- **IMO** — International Maritime Organization number
- **ISL** — Inter-Satellite Link
- **ITAR** — International Traffic in Arms Regulations
- **KBA** — Kyl-Bingaman Amendment (1996, Israel imagery cap)
- **LEI** — Legal Entity Identifier
- **LITE** — UK Export Licensing Platform (replaces SPIRE)
- **MAECI** — Italian Ministry of Foreign Affairs and International Cooperation
- **MEU** — Military End-User List (BIS)
- **METI** — Japanese Ministry of Economy, Trade and Industry
- **MIEU** — Military Intelligence End-User List (BIS)
- **MLA** — Manufacturing License Agreement (DDTC)
- **MT** — Missile Technology (CCL Reason for Control)
- **MTCR** — Missile Technology Control Regime
- **NDA** — Non-Disclosure Agreement
- **NIS2** — EU Cybersecurity Directive (separate from export controls)
- **NLR** — No License Required
- **NS** — National Security (CCL Reason for Control)
- **NSG** — Nuclear Suppliers Group
- **OFAC** — Office of Foreign Assets Control (Treasury)
- **OFSI** — Office of Financial Sanctions Implementation (UK)
- **OGEL** — Open General Export Licence (UK)
- **OIEL** — Open Individual Export Licence (UK)
- **OSAM** — On-Orbit Servicing, Assembly and Manufacturing
- **OTSI** — Office of Trade Sanctions Implementation (UK, since Oct 2024)
- **PEP** — Politically Exposed Person
- **PNT** — Position, Navigation and Timing
- **POLSARIS** — Polish Armed Forces SAR Imagery (ICEYE Polska contract)
- **PPS** — Precise Positioning Service (US GPS military signal)
- **PSAC** — Polnische SAR-Beschaffungsmission
- **RPO** — Rendezvous and Proximity Operations
- **RPS** — Restricted Party Screening
- **RTG** — Radioisotope Thermoelectric Generator
- **SAASM** — Selective Availability Anti-Spoofing Module
- **SAR** — Synthetic Aperture Radar
- **SBDU** — Service des Biens à Double Usage (FR)
- **SECO** — Swiss State Secretariat for Economic Affairs
- **SDA** — Space Development Agency (US)
- **SDN** — Specially Designated Nationals (OFAC)
- **SED** — Shipper's Export Declaration (US, replaced by EEI)
- **SI** — Significant Items (CCL Reason for Control)
- **SIEL** — Standard Individual Export Licence (UK)
- **SME** — Semiconductor Manufacturing Equipment
- **SNAP-R** — Simplified Network Application Processing — Redesign (BIS portal)
- **SS** — Short Supply (CCL Reason for Control)
- **SSI** — Sectoral Sanctions Identifications List (OFAC, Russia-focused)
- **STA** — Strategic Trade Authorization (License Exception §740.20)
- **TAA** — Technical Assistance Agreement (DDTC)
- **TARIC** — EU Integrated Tariff Database
- **TCP** — Technology Control Plan
- **TMP** — Temporary Imports, Exports, Re-exports (License Exception §740.9)
- **TSU** — Technology and Software — Unrestricted (License Exception §740.13)
- **TT&C** — Telemetry, Tracking and Command
- **TTCP** — Technology Transfer Control Plan
- **UAMA** — Italian Unit for Authorization of Armaments Materials
- **UVL** — Unverified List (BIS)
- **USML** — United States Munitions List (ITAR §121.1)
- **VAT** — Value Added Tax (used as identifier)
- **VSD** — Voluntary Self-Disclosure
- **WAML** — Wassenaar Munitions List
- **WDA** — Warehouse and Distribution Agreement (DDTC)
- **Wassenaar** — Wassenaar Arrangement on Export Controls for Conventional Arms and Dual-Use Goods and Technologies

---

## § 14 Quellen + Anker

**Codebase audit:** alle Datei-Pfade dieses Dokuments verweisen auf den HEAD-State 2026-05-22 (commit `5f6bc94e` + `ad9e5b10`). Detail-Inventar im internen Audit-Output unter `tasks/af27200c2681c6c8d.output`.

**Regulatorischer Anker** (selected primary sources, full list in den Recherche-Outputs):

- 15 CFR Parts 730–774 (EAR) — ecfr.gov/current/title-15
- 22 CFR Parts 120–130 (ITAR) — ecfr.gov/current/title-22
- Regulation (EU) 2021/821 consolidated 15. Nov 2025 — eur-lex.europa.eu/eli/reg/2021/821/oj/eng
- Federal Register 89 FR 84713 (Oct 23 2024) — federalregister.gov/documents/2024/10/23/2024-23958
- Federal Register 2024-28270 (FDPR Additions Dec 2024)
- Federal Register 2025-23998 (ITAR §126.18(e) AUKUS Dec 2025)
- AWV 22. Novelle (Nov 1 2025)
- UK Sanctions List Single (Jan 28 2026)
- BAFA ELAN-K2 updates (Sept 1 2025)
- MTCR US policy guidance (Jan 7 2025)
- NSG 2025 Plenary Cape Town
- Wassenaar 2024 + 2025 Plenaries

**Competitive landscape:** Recherche-Outputs zitieren ~80 URLs zu Vendor-Sites, G2/Gartner-Reviews, Industry-Coverage. Full source-listing im internen task-output `tasks/a393cb7615d9b0b3f.output`.

---

**Ende. Geprüft, in sich konsistent, dokumentiert.**

**Versions-Manifest:** Diese Audit wird durch jeden Major-Phase-Close (D, E, F, G, H, I, J) revidiert. Nächste Revision frühestens beim Abschluss von Phase D.
