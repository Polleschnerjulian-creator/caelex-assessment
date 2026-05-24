# MEVA — Research: Wie machen wir das Produkt deutlich intelligenter und bahnbrechender?

**Datum:** 2026-05-24
**Status:** Research-Dokument, nicht entschieden
**Owner:** ongoing

Dieses Dokument analysiert, wo MEVA (Caelex Trade) **kategorienverändernd**
besser werden kann — nicht inkrementell, sondern so dass Konkurrenten
(Descartes, Amber Road, SAP GTS, Visual Compliance, Sayari) plötzlich
wie Produkte aus 2015 aussehen.

Drei Ambitionsstufen:

1. **AI-native Upgrades** — bestehende Flows × 10 besser (3–6 Monate)
2. **Predictive Layer** — Risiken aufdecken bevor sie auftreten (6 Monate)
3. **Compliance Auto-Pilot** — Plattform-Play, Operator wird zum Exception-Handler (12+ Monate)

Was MEVA **heute schon** hat (Stand 2026-05-24):

| Block                                                                                                                                | Status                           |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| 26 Prisma-Trade-Modelle                                                                                                              | ✅ Production                    |
| 25+ Trade-Services (classify, screen, license-determination, EUC, VSD, …)                                                            | ✅ Production                    |
| Astra Engine — Claude-powered, mit document-intelligence, proactive-engine, guided-workflows, benchmark-engine, regulatory-knowledge | ✅ Production                    |
| 5 Sanktions-Listen (OFAC SDN, BIS Entity, DDTC Debarred, UK OFSI, UN)                                                                | ✅ Production                    |
| Multi-Jurisdiktion: US (EAR/ITAR), EU (Annex I/IV), DE (AWG/AWV), UK (ECJU), FR (LOS), JP (METI), IN (SCOMET)                        | ✅ Production                    |
| Audit-Log mit Hash-Chain                                                                                                             | ✅ Production                    |
| Cron-Jobs (license expiry, EUC expiry, VSD deadlines, sanctions sync)                                                                | ✅ Production                    |
| ⌘K Palette, Help Center, Action Inbox, Onboarding, Bulk Operations, Term-Tooltips                                                    | ✅ Production (Phase 2-7 Sprint) |

---

## Stufe 1: AI-native Upgrades — bestehende Flows × 10 besser

### 1A — Multimodal Classification Engine (Datasheet → ECCN/USML)

**Problem heute:** Operator liest 80-Seiten-Datasheet, extrahiert manuell die
controlling-relevanten Parameter (Aperture, GSD, RF-Leistung, etc.), gibt sie
ins Klassifizierungs-Formular ein. Astra kann _suggesten_ wenn man die
Parameter eintippt, aber nicht das PDF selbst lesen.

**Bahnbrechende Lösung:**

- Drag-Drop PDF → Claude (oder GPT-4o Vision) extrahiert technische Attribute
- Parallel: ECCN-Predictor läuft mit den extrahierten Attributen gegen den
  bestehenden parametric-matcher
- Zeigt **Confidence + Provenance**: "Aperture 0.30 m extrahiert aus Seite 12,
  Tabelle 4.1.2 — Spalte 'Optical Aperture'. Classification 9A515.a.5
  basierend auf parametric-matcher Regel #47."
- Operator sieht: PDF-Seite mit Highlight + extrahierter Wert + Klassifikation +
  Vergleich mit ähnlichen Items in eigener DB

**Existierende Infrastructure:** `document-intelligence.server.ts` existiert
schon. Erweitern auf strukturierte Attribute-Extraktion.

**Why bahnbrechend:** Kein Wettbewerber macht das. Sayari hat OCR aber keine
Compliance-spezifische Attribute-Extraction. Descartes lässt operatoren
weiterhin alles manuell tippen.

**Effort:** 2–3 Wochen MVP, 2 Monate production.

---

### 1B — Self-Learning Classification mit Operator-Feedback

**Problem heute:** Wenn Astra "ECCN 5A002.a.1" vorschlägt und der Operator
overridet auf "5A992.c", lernt das System nichts. Beim nächsten ähnlichen
Item schlägt Astra wieder 5A002.a.1 vor.

**Bahnbrechende Lösung:**

- Jeder Override wird als `ClassificationOverride` mit Begründung gespeichert
- Periodischer Job (täglich) baut einen RAG-Index aus Org-spezifischen Overrides
- Bei neuer Klassifikation: Astra fragt zuerst den Org-RAG ("haben wir vor
  Kurzem ähnliche Items klassifiziert?") und referenziert die letzten 5
  Operator-Entscheidungen
- Org bekommt eine "Klassifizierungs-Linie" → automatische Konsistenz

**Bonus:** Wenn ein qualifizierter AV neu im Team ist, sieht er sofort die
"so klassifizieren wir das hier seit Jahren" Mustererkennung.

**Effort:** 1–2 Wochen MVP (Override-Capture + RAG-Lookup im Astra-Prompt).

---

### 1C — Live BAFA-Bescheid / DDTC-CJ Parser

**Problem heute:** Operator bekommt ein BAFA-Bescheid-PDF, tippt manuell
in MEVA ein: Bescheidnummer, validUntil, totalCapValue, covered codes,
covered countries, conditions.

**Bahnbrechende Lösung:**

- Drag-Drop BAFA-Bescheid → strukturierte Extraktion aller Felder
- Claude-prompt mit Few-Shot aus 10 BAFA-Bescheid-Mustern (in
  `regulatory-knowledge/`)
- Pre-fill des "Neue Lizenz" Formulars mit Field-Level-Confidence
- Operator validiert nur, fügt nichts mehr ein

**Why bahnbrechend:** Reduziert "Bescheid → System" Zeit von 15 min auf
30 Sekunden. Eliminiert Tippfehler die später drawn-down-Berechnungen
verzerren.

**Effort:** 1 Woche MVP.

---

### 1D — Agentic Sanctions Triage

**Problem heute:** Sanctions-Screening produziert einen `POTENTIAL_MATCH`.
Operator muss manuell entscheiden: ist das wirklich die gleiche Entität?
Recherche dauert 10–30 Minuten pro Hit (Beneficial Owner Chain, andere
Listen, geografische Match, etc.).

**Bahnbrechende Lösung:**

- Sobald ein POTENTIAL_MATCH erkannt wird: Astra-Agent läuft autonom an:
  - Liest die gesamte SDN-Eintrag-Datei
  - Vergleicht UBO-Chain (über deine bereits gebaute Beneficial-Ownership-Graph)
  - Checked andere Listen (UK OFSI, EU CFSP, UN, Kanada)
  - Geo-Match: Country-Code, Operating-Country, addresses
  - Liest News-Quellen (Reuters, FT) für recent context
- Liefert dem Operator eine "Triage Brief" Karte:
  - **Match Confidence: 88% (HOCH)** oder **23% (NIEDRIG, Same-Name False-Positive)**
  - Reasoning-Chain mit Quellen
  - Recommendation: BLOCK / CLEAR / ESCALATE-TO-COUNSEL
- Operator klickt eine Taste, statt 20 Minuten zu recherchieren

**Existierende Infrastructure:** `tool-executor.ts` (2,046 LOC), Beneficial-
Ownership-Graph in `TradePartyOwnership` Modell.

**Effort:** 3 Wochen MVP.

---

### 1E — Astra Drafting für Documents

Komplette Document-Generation pipeline:

- **EUC-Anfrage:** Astra schreibt den E-Mail-Text + den BAFA-EUC-Prefill basierend
  auf Operation-Context (counterparty, end-use, items). Operator reviewed und
  sendet ab.
- **VSD-Draft:** Bei einem entdeckten Violation kann Astra einen ersten
  Disclosure-Narrative-Entwurf produzieren basierend auf Operation-History,
  Communications, Audit-Log.
- **BAFA-Antrag:** Auto-Pre-fill aller AGG/Einzel-Antrags-Felder aus existing
  data.
- **Re-Export-Consent Letter:** Auto-Generate basierend auf originaler Lizenz.

**Why bahnbrechend:** Jedes dieser Dokumente kostet aktuell 1–4 Stunden
Tipp-Arbeit eines hochbezahlten AVs. Auto-Drafting reduziert auf 10
Minuten Review. Saves €€€.

**Effort:** Per Document-Typ ~1 Woche. Insgesamt 6–8 Wochen für alle 4.

---

## Stufe 2: Predictive Layer — Risiken aufdecken bevor sie auftreten

### 2A — Predictive Sanctions Watch

**Problem heute:** OFAC sanctioniert Acme Corp am 1. Juni. Du hast Acme
Corp als Counterparty in 12 in-flight Operations. MEVA blockiert sie
sofort — aber du hast bereits 6 Wochen Lieferzeit investiert und musst
einen VSD filen.

**Bahnbrechende Lösung:** **Predictive Sanctions Watch.**

- Daily Job analysiert deine Counterparty-DB gegen Public-Source-Signals:
  - News-Sources (Reuters, FT, government press releases)
  - SEC/EDGAR filings (Form 8-K material events)
  - LinkedIn org-changes
  - Patent-Filings unter Dual-Use-Klassen
  - OFAC-Designation-Patterns (welche Industries werden gerade gesweept?)
- Astra produziert Daily Risk-Score pro Counterparty:
  - "Acme Corp: 23% → 67% Sanctions-Risk in 30d (Reason: parent company
    XYZ added to Entity List 2 weeks ago, supply chain links detected
    in news)"
- Operator entscheidet **3 Wochen früher**: De-risk operations, ask for
  warranties, plan alternative supplier.

**Why bahnbrechend:** Niemand macht das. Sayari hat eine Risk-Score aber
keine vorhersagende Modellierung. Descartes hat Daily List-Refreshes,
aber keine Prediction.

**Tech:** Claude prompts den daily Job zur Generation. Datenquellen:
news-feeds-poller, EDGAR-API, simple ETL.

**Effort:** 4–6 Wochen MVP.

---

### 2B — License-Stack Optimizer

**Problem heute:** Operator hat 30 Einzel-Lizenzen für 30 Operations.
Jede individuell beantragen kostet je 4-6 Wochen + 5k€ Anwalts-Kosten.
Wenn man 25 davon in eine AGG bundeln könnte, würde man 80% sparen —
aber niemand sieht das Muster.

**Bahnbrechende Lösung:** **License-Stack Optimizer**

- Astra-Job läuft monatlich über alle aktiven Operations + Lizenzen
- Erkennt: "Diese 25 Operations alle für Customer X in DE/FR/IT mit ECCN
  9A515 — könnten unter einer einzigen AGG-12 zusammengefasst werden."
- Berechnet: "Bei deinem Volumen würde das €18,400/Jahr Anwalts-Kosten +
  120 Stunden Operator-Zeit sparen."
- Generiert: Pre-filled AGG-12-Antrag mit allen Daten aus den existing
  Lizenzen + Operations.
- Operator reviewt, sendet ab.

**Why bahnbrechend:** Compliance wird **profit-center** statt cost-center.
Konkrete €€-ROI für jede Lizenz-Strategie-Entscheidung.

**Effort:** 3–4 Wochen MVP (data analysis + recommendation engine).

---

### 2C — Operation Risk Forecasting

**Problem heute:** Operator filed BAFA-Antrag heute. Wann kommt der
Bescheid? "BAFA sagt 8 Wochen" — aber realiter dauert es für deine
Item-Kategorie + Counterparty-Land 14 Wochen.

**Bahnbrechende Lösung:**

- ML-Modell trained auf aggregierte BAFA/BIS/DDTC-Response-Times (anonyme
  Daten von allen MEVA-Kunden)
- Bei neuem Antrag: "Predicted Response Time: 11–16 Wochen (89% Konfidenz,
  basierend auf 247 ähnlichen Anträgen letzte 24 Monate)"
- Wenn länger als predicted → automatischer Eskalations-Reminder
- Operator kann timing-orientierte Decisions besser planen

**Why bahnbrechend:** Macht Compliance **plannbar**. Reduziert "warten ohne
zu wissen wie lange" Zustand.

**Effort:** 2 Wochen MVP (Datenmodell + Predictor mit Random Forest).
Network-Effekt: bessere Predictions mit mehr Kunden.

---

### 2D — Catch-All Auto-Detection

**Problem heute:** EU 2021/821 Article 4 (Military-End-Use Catch-All)
trigger ist subtil. Manche Operatoren übersehen Signals (z.B. counterparty
listet "civil aerospace" als Branche, hat aber 3 Direktoren mit
militärischem Hintergrund).

**Bahnbrechende Lösung:** Astra-Agent läuft auto auf jeder neuen Operation,
prüft:

- Counterparty-Website-Crawl: end-use signals
- Directors/Founders LinkedIn: military affiliations
- Procurement-Patterns: do they typically buy military-grade items?
- Geographic: are they in a known military-cluster (Sankt-Petersburg,
  Tehran-South, etc.)?

Liefert: "Catch-All Art. 4 Risk: 73% (HOCH). Reasoning: 2 of 5
Founders former military, located in known dual-use cluster, recent
procurement of restricted items detected in news."

Operator entscheidet — aber bekommt das Signal **vor** dem Versand.

**Why bahnbrechend:** Verhindert die meisten VSDs (Voluntary Self-
Disclosures) bevor sie nötig werden. Jeder vermiedener VSD ist
€50k–€500k Anwalts-Kosten gespart.

**Effort:** 4–6 Wochen MVP (web-scraping + LLM-Analyse).

---

## Stufe 3: Compliance Auto-Pilot — Plattform-Play

### 3A — "Stripe for Export Compliance" — ERP/PLM Native Integration

**Vision:** MEVA wird zu einer **API-First Compliance Platform**, die
Customers via SDK in ihre ERP/PLM-Stacks einbauen. Operator wird zum
Exception-Handler, nicht zum Bottleneck.

**Architektur:**

```
SAP/Oracle/IFS ERP
       ↓
  Caelex Trade API (POST /api/v1/compliance/screen)
       ↓
   Decision: ALLOW / REVIEW / BLOCK
       ↓
   ERP continues or pauses
```

**Was das ändert:**

- Jeder neue BoM-Line im SAP wird auto-klassifiziert beim Create
- Jede Purchase Order wird auto-gescreened beim Issue
- Jede Sales Order wird auto-license-checked beim Confirm
- Operator sieht nur die <5% die wirklich human-attention brauchen

**Why bahnbrechend:** **Macht Compliance unsichtbar.** Statt "wir haben ein
Compliance-System" wird Compliance Teil der Order-to-Cash + Procure-to-Pay
Pipelines. Wettbewerber haben APIs, aber niemand hat **Native ERP-
Integration mit Auto-Pilot Modus**.

**Existierende Infrastructure:** API v1 ist schon da (per CLAUDE.md). Webhook
infrastructure ist da. Was fehlt: SDK-Library (Node/Python/Java), SAP-
Connector, ERP-Cookbook.

**Effort:** 3–6 Monate für SAP/Oracle SDK + Reference Implementations.

---

### 3B — Verity: Cryptographic Compliance Provenance

**Vision:** Jede MEVA-Entscheidung bekommt einen kryptografischen Beweis
("dieses Item wurde klassifiziert von Model X, mit Reasoning Y, basierend
auf Inputs Z, zum Zeitpunkt T") — signiert + verifiable.

**Why bahnbrechend:**

- **EU AI Act Article 50** verlangt provenance + transparency für AI-
  Entscheidungen die rechtliche Wirkung haben. Compliance-Klassifizierungen
  qualifizieren genau dafür.
- Audit-Trail wird unbestreitbar: "Zur Zeit T hat Model X, Version Y, mit
  Input Z entschieden Q. Hier ist der signed receipt."
- Im Streitfall kann der Operator dem Regulator den exakten Reasoning-Chain
  - Inputs vorlegen — niemand kann nachträglich behaupten dass es anders
    war.

**Tech:** Sentinel-Anchor-Pattern (Caelex hat das schon im
`src/lib/verity/` Modul für Comply). Anwenden auf Trade-Entscheidungen.

**Effort:** 2–4 Wochen (Tech ist da, Trade-Integration ist Plumbing).

---

### 3C — Compliance Simulation / What-If Engine

**Vision:** Operator fragt "Was passiert wenn Russland 833/2014 neue
Kategorie X hinzufügt?" oder "Was wenn USA ITAR auf KI-Modelle erweitert?"

MEVA simuliert:

- Welche existing Items + Operations wären betroffen
- Welche Lizenzen würden invalid werden
- Welche neuen Anträge wären nötig
- Was wäre der Business-Impact (€-Estimate basierend auf draw-down values)

**Existierende Infrastructure:** "What-If" Simulation gibt's schon im
Digital-Twin-Module (in dashboard). Anwenden auf Trade-Decisions.

**Why bahnbrechend:** Statt **reagieren** wenn Regulierungen kommen, kann
der Customer **planen**. CFO bekommt eine konkrete €-Zahl bevor BAFA das
Rundschreiben veröffentlicht.

**Effort:** 4–6 Wochen MVP.

---

### 3D — Network Effect: Aggregate Intelligence

**Vision:** MEVA wird zur Compliance-Datenquelle für die ganze Branche
(anonymisiert + aggregiert).

**Features:**

- **Benchmark-Insights:** "Companies your size (10-50 MA) in your industry
  (Space-Hardware) filed 0.8 VSDs/Jahr im Schnitt — du bist bei 2.3.
  Wo liegen die meisten Verfahren?"
- **License-Approval-Database:** "BIS-License-Anträge für ECCN 9A515 nach
  Brazil haben 73% Approval Rate. Approved Cases hatten X/Y/Z Pattern."
- **Counterparty-Reputation:** "Acme Corp wurde von 14 anderen MEVA-Kunden
  gescreened. 12 fertigen weiter (CLEAR), 2 mit POTENTIAL_MATCH (resolved).
  Last activity 3 Wochen alt."
- **Catch-All Pattern Pool:** "Operationen mit dieser Counterparty +
  Country-Combination haben in 67% der Fälle Catch-All ausgelöst."

**Why bahnbrechend:** **Niemand sonst hat diese Daten.** Caelex wird zum
Bloomberg Terminal der Export-Compliance.

**Privacy:** alles k-Anonymity-aggregated (mindestens 5 Customers pro
Bucket), keine PII, opt-in für Customers die teilen wollen.

**Effort:** 6–8 Wochen Phase 1 (Benchmark Layer existiert schon im
`benchmark-engine.server.ts`). Network-Effect baut sich über Zeit auf.

---

### 3E — Conversational Compliance Audit

**Vision:** Regulator (oder interner Auditor) kommt rein und sagt:
"Zeig mir wie ihr 9A515.a Items in 2025 klassifiziert habt, und wer
welche Entscheidungen wann getroffen hat."

Statt 8 Stunden in Audit-Logs zu wühlen, fragt der Auditor Astra:
**"Show me 9A515.a classifications in 2025"** → Astra produziert eine
audit-grade Tabelle mit Reasoning-Chain pro Entscheidung + signed
Provenance + Operator-Notes + Override-History.

**Why bahnbrechend:** Macht **Audit-Prep** von 1 Woche → 1 Stunde.
Verändert die ROI-Calculation für Compliance.

**Effort:** 3–4 Wochen MVP (Audit-Log-Query + Astra-Natural-Language
Interface).

---

## Was nicht in den scope gehört (bewusst)

Die folgenden Ideen sind **nicht** part der Recommendation, weil sie
entweder anderen Caelex-Produkten gehören, oder weil sie strategisch
falsch sind:

- ❌ **In-orbit servicing / debris** — gehört Caelex Comply, nicht Trade.
  User-Direktive war explicit: "Trade = export controls only."
- ❌ **Crypto-Trading-Compliance** — anderes Markt, anderes Produkt.
- ❌ **AI für militärische Anwendungen** — würde Caelex selbst ITAR-
  controlled machen, business-killer.
- ❌ **Open-Source-Strategie** — Compliance-Engines sind moat, kein
  Commodity.

---

## Strategische Reihenfolge (Empfehlung)

### Phase 1 (Q3 2026) — "Smart MEVA"

Sechs Wochen Sprint:

1. **1A Multimodal Classification** — datasheet drag-drop → ECCN
2. **1C BAFA-Bescheid Parser** — PDF → Lizenz auto-pre-fill
3. **1D Agentic Sanctions Triage** — auto-research auf POTENTIAL_MATCH

**Impact:** Operator-Zeit pro Item-Klassifizierung × 5 schneller. Per
sanctions-hit × 10 schneller. Setzt das Fundament für Phase 2.

**Tech-Risiko:** Niedrig — Astra-Infrastructure und document-intelligence
schon da.

---

### Phase 2 (Q4 2026) — "Predictive MEVA"

Drei Monate Build:

4. **2A Predictive Sanctions Watch** — 30-day-ahead risk-score
5. **2B License-Stack Optimizer** — Concrete ROI-Recommendations
6. **2C Operation Risk Forecasting** — Response-Time Predictions
7. **2D Catch-All Auto-Detection** — Article 4/5/9/10 vor-Versand

**Impact:** Compliance wird **prädiktiv** statt reaktiv. ROI wird
quantifizierbar pro Lizenz-Strategie. Konkrete €-Savings.

**Tech-Risiko:** Mittel — braucht ML-pipeline-Setup + News-Source-
Integration. Network-Effekt-Daten brauchen Zeit.

---

### Phase 3 (2027) — "Auto-Pilot MEVA"

Sechs Monate Plattform-Aufbau:

8. **3A SAP/Oracle SDK** — API-First Auto-Pilot
9. **3B Verity Provenance** — kryptographische Audit-Trails
10. **3C What-If Engine** — Regulation-Simulation
11. **3D Network Effect Benchmarks** — anonymized industry intelligence

**Impact:** **Kategorienwechsel**. Wird nicht mehr verglichen mit
Descartes/SAP GTS, sondern mit Stripe/Plaid/Snowflake — "Trade ist
die Compliance-Infrastructure für Space".

**Tech-Risiko:** Hoch — braucht Enterprise-Sales + Partner-Network +
robust SLA-Tiers + multi-tenant Isolation hardening.

---

## Konkurrenz-Vergleich

| Capability                    | MEVA heute    | MEVA + Phase 1 | Descartes | SAP GTS           | Sayari        | Visual Compliance |
| ----------------------------- | ------------- | -------------- | --------- | ----------------- | ------------- | ----------------- |
| Multimodal Datasheet→ECCN     | ❌            | ✅             | ❌        | ❌                | ⚠️ OCR only   | ❌                |
| Self-learning per org         | ❌            | ✅             | ❌        | ❌                | ❌            | ❌                |
| BAFA-Bescheid auto-parse      | ❌            | ✅             | ❌        | ⚠️ DE-only manual | ❌            | ❌                |
| Agentic sanctions triage      | ❌            | ✅             | ❌        | ❌                | ⚠️ risk score | ❌                |
| Predictive sanctions watch    | ❌            | ❌ (Phase 2)   | ❌        | ❌                | ⚠️ static     | ❌                |
| License-stack optimizer       | ❌            | ❌ (Phase 2)   | ❌        | ❌                | ❌            | ❌                |
| Response-time forecasting     | ❌            | ❌ (Phase 2)   | ❌        | ❌                | ❌            | ❌                |
| Catch-all auto-detection      | ⚠️ basic      | ⚠️ basic       | ❌        | ❌                | ❌            | ❌                |
| ERP-native API integration    | ⚠️ API v1     | ⚠️ API v1      | ✅        | ✅ native         | ⚠️ basic      | ❌                |
| Cryptographic provenance      | ⚠️ hash chain | ⚠️ hash chain  | ❌        | ❌                | ❌            | ❌                |
| Regulation what-if simulation | ❌            | ❌ (Phase 3)   | ❌        | ❌                | ❌            | ❌                |
| Aggregate industry benchmarks | ❌            | ❌ (Phase 3)   | ❌        | ❌                | ⚠️ basic      | ❌                |
| Conversational audit          | ❌            | ❌ (Phase 3)   | ❌        | ❌                | ❌            | ❌                |

Nach Phase 1: **MEVA ist nicht mehr im selben Vergleichs-Feld** wie die
Legacy-Player. Nach Phase 2: **Niemand ist mehr im Feld**. Nach Phase 3:
**Caelex Trade ist der Standard.**

---

## Killer One-Liner (Pitch Deck)

> **"Stripe für Export-Compliance"** — Klassifizieren, Screenen, Lizenzieren
> wird unsichtbar. Operator wird zum Exception-Handler. Compliance wird
> profit-center.

oder, weniger amerikanisch:

> **"Compliance war eine Sammlung von Sachbearbeiter-Aufgaben. Wir machen
> sie zu einer Infrastruktur-Schicht."**

---

## Was als nächstes zu entscheiden ist

1. **Welche Stufe wollen wir adressieren?** Reicht Phase 1 für 2026, oder
   sollten wir Phase 2 direkt im Anschluss planen?
2. **Funding/Headcount für Phase 3?** Plattform-Plays brauchen Engineering-
   Investment auf 6+ Monate Sicht.
3. **Customer-Insight:** Bevor wir 6 Monate in 3A SAP-SDK investieren,
   sollten wir 3–5 Customers konkret fragen ob sie das wollen.
4. **Network-Effect-Vertrag:** Wenn wir auf 3D bauen, brauchen wir
   Customer-Opt-In-Klausel im Vertrag. Jetzt schon klären.

---

## SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
