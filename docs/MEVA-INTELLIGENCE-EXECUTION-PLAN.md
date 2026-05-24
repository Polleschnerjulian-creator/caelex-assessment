# MEVA Intelligence — Execution Plan (Living-Doc)

**Datum:** 2026-05-24
**Status:** ✅ COMMITTED — wir machen alles. Decision made.
**Sister-Doc:** `docs/MEVA-INTELLIGENCE-RESEARCH.md` (das WARUM steht da)
**Dieses Doc:** das WAS / WANN / WIE.

Die User-Direktive war eindeutig: **"ja schrib das mal als liv doc fest
wir machen alles"** — Phase 1 + Phase 2 + Phase 3, in dependency-aware
sprint sequencing. Strategische Items, die 1+ Woche brauchen, sind hier
genauso committed wie die 1-Wochen-Quick-Wins.

---

## 📊 Status Dashboard

| Stream                           | Items        | % done | Last bump                   |
| -------------------------------- | ------------ | ------ | --------------------------- |
| **Stufe 1 — AI-native Upgrades** | 5 (1A-1E)    | 0%     | nicht gestartet             |
| **Stufe 2 — Predictive Layer**   | 4 (2A-2D)    | 0%     | nicht gestartet             |
| **Stufe 3 — Plattform-Play**     | 5 (3A-3E)    | 0%     | nicht gestartet             |
| **Total**                        | **14 items** | **0%** | committed → execution start |

Tracking-Convention:

- ❌ NOT_STARTED — nichts angefangen
- 🟡 PLANNED — Plan-Doc / Schema entworfen
- 🔵 IN_PROGRESS — Code geschrieben, nicht alle Acceptance-Criteria erfüllt
- ✅ DONE — alle Acceptance-Criteria erfüllt + deployed
- ⏸️ BLOCKED — auf externes Decision/Asset/Customer wartend

---

## Sprint-Sequencing (Dependency-aware)

Diagramm der Abhängigkeiten:

```
M1 (parallel start)
  ├─ 1A Multimodal Classification (Phase 1)
  ├─ 1C BAFA-Bescheid Parser (Phase 1)
  └─ 1D Agentic Sanctions Triage (Phase 1)

M2 (depends on M1 infrastructure)
  ├─ 1B Self-Learning Classification (needs 1A's PDF-pipeline)
  └─ 1E Astra Drafting Pipeline (needs tool-executor patterns from 1D)

M3 (data + monitoring infra)
  ├─ 2A Predictive Sanctions Watch (new ETL: news/EDGAR)
  └─ 2D Catch-All Auto-Detection (web-scraping infra shared with 2A)

M4 (analytics layer on top of M1-M3 data)
  ├─ 2B License-Stack Optimizer (analytics on existing licenses)
  └─ 2C Response-Time Forecasting (analytics on aggregate data)

M5 (platform plumbing — reuses existing modules)
  ├─ 3B Verity Provenance (reuses src/lib/verity/)
  ├─ 3C What-If Simulator (reuses Digital-Twin What-If engine)
  └─ 3E Conversational Audit (depends on M3-M4 audit-log writes)

M6 (biggest platform investment)
  └─ 3A SAP/Oracle Native SDK (depends on stable API v1 + customer pilot)

M7 (only after we have a customer base for network effect)
  └─ 3D Network-Effect Aggregate Benchmarks (legal opt-in clause + k-anon)
```

Estimated total: **6-9 Monate** wenn parallel + funded, **12 Monate**
solo-developer pace.

---

# 🟢 STUFE 1 — AI-native Upgrades

## 1A — Multimodal Classification Engine (Datasheet → ECCN/USML)

**Status:** ❌ NOT_STARTED
**Sprint:** M1
**Effort:** 2-3W MVP, 2 Monate Production-Härte
**Impact:** Höchster Quick-Win — Operator-Zeit per Klassifizierung × 5 schneller

### Files

| Pfad                                                                   | Status | Purpose                                                                            |
| ---------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `src/lib/astra/document-intelligence.server.ts`                        | EXISTS | erweitern: structured-attribute extraction für TradeItem-Spec-Sheets               |
| `src/lib/trade/classification/pdf-extractor.server.ts`                 | NEW    | Claude-Vision-Wrapper, extrahiert {aperture, gsd, rfPower, frequency, ...} aus PDF |
| `src/lib/trade/classification/attribute-confidence.ts`                 | NEW    | scoring + provenance-tracking pro extrahiertem Field                               |
| `src/lib/trade/classification/parametric-matcher.ts`                   | EXISTS | bestehender ECCN/USML matcher — wired into the extractor                           |
| `src/app/(trade)/trade/classify/_components/PdfDropZone.tsx`           | NEW    | Drag-Drop Drop-Zone mit PDF-Preview + per-field-highlighting                       |
| `src/app/(trade)/trade/classify/_components/ClassificationPreview.tsx` | NEW    | Side-by-side: PDF (mit Highlights) ↔ extrahierte Attribute ↔ ECCN-Prediction       |
| `src/app/api/trade/classify/extract/route.ts`                          | NEW    | POST endpoint — uploads PDF, returns ExtractedAttributes + ClassificationProposal  |
| `prisma/schema.prisma`                                                 | MODIFY | `TradeItem` gewinnt optional `extractedFromDocId` + `extractionConfidence`         |
| `src/lib/trade/classification/pdf-extractor.test.ts`                   | NEW    | 10 fixture PDFs (sample datasheets), assert extracted attributes                   |

### Dependencies

- Existing: `document-intelligence.server.ts`, `parametric-matcher`, Anthropic SDK
- New: PDF upload pipeline (R2 storage for source PDF), Claude Vision model access

### Acceptance Criteria

- [ ] Operator kann PDF Drag-Drop machen → in 10s gibt's eine Klassifizierungs-Empfehlung
- [ ] Jedes extrahierte Attribut hat Confidence + Provenance (PDF-Seite + Region)
- [ ] Operator sieht PDF mit highlighting der genutzten Felder
- [ ] Operator-Override wird gespeichert (feeds 1B)
- [ ] 10 fixture PDFs (echte Datasheets von ICEYE / Planet / Maxar etc.) → ≥80% korrekte ECCN
- [ ] Audit-Log enthält die Klassifizierungs-Decision-Chain + Provenance

### Why bahnbrechend

Kein Wettbewerber macht Multimodal Compliance-spezifische Attribute-
Extraction. Sayari hat OCR, aber kein ECCN-Mapping. Descartes lässt
Operatoren manuell tippen.

---

## 1B — Self-Learning Classification mit Operator-Feedback

**Status:** ❌ NOT_STARTED
**Sprint:** M2 (after 1A)
**Effort:** 1-2W MVP
**Impact:** Org-spezifische Konsistenz, "Klassifizierungs-Linie" ohne Tribal Knowledge

### Files

| Pfad                                                      | Status | Purpose                                                                                                   |
| --------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                    | MODIFY | NEW model `ClassificationOverride` (orgId, itemId, suggestedCode, acceptedCode, reasoningText, embedding) |
| `src/lib/trade/classification/override-capture.server.ts` | NEW    | hook auf jede Operator-Decision; writes ClassificationOverride row + computes embedding                   |
| `src/lib/trade/classification/org-rag.server.ts`          | NEW    | per-org RAG lookup: gegeben ein neues Item, fetch Top-5 ähnliche frühere Klassifikationen                 |
| `src/lib/astra/engine.ts`                                 | MODIFY | im Klassifizierungs-Prompt: nach context-builder die Org-RAG-Hits hinzufügen                              |
| `src/lib/trade/classification/embeddings.server.ts`       | NEW    | OpenAI text-embedding-3-small wrapper für Item-Beschreibungen                                             |
| `prisma/schema.prisma`                                    | MODIFY | `ClassificationOverride.embedding` als `Unsupported("vector(1536)")` mit pgvector                         |
| `src/app/api/cron/rebuild-classification-rag/route.ts`    | NEW    | täglicher Job — refresh embeddings für recent overrides                                                   |
| `src/lib/trade/classification/org-rag.test.ts`            | NEW    | mock embeddings, assert similarity ranking                                                                |

### Dependencies

- Existing: Astra `engine.ts`, `context-builder.ts`
- New: pgvector extension (Postgres), OpenAI embeddings API key
- Builds on: 1A (jeder 1A-Operator-Override populated den RAG)

### Acceptance Criteria

- [ ] Per-org RAG returns Top-5 historic classifications für ein neues Item
- [ ] Astra-Klassifizierungs-Prompt enthält "your org previously classified similar items as: …"
- [ ] Override-Quote für ähnliche Items sinkt um ≥40% nach 30 Tagen Nutzung
- [ ] Audit-Log zeigt welche historische Klassifikationen Astra referenziert hat
- [ ] Kein PII / Anwalts-priv. Inhalte leaken across orgs (org-Isolation Test)

---

## 1C — BAFA-Bescheid / DDTC-CJ PDF Parser

**Status:** ❌ NOT_STARTED
**Sprint:** M1
**Effort:** 1W MVP
**Impact:** "Bescheid → System" Zeit 15min → 30sec, eliminiert Tippfehler

### Files

| Pfad                                                            | Status | Purpose                                                        |
| --------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| `src/lib/trade/licenses/bafa-bescheid-parser.server.ts`         | NEW    | Claude Vision + Few-Shot prompt mit 10 BAFA-Bescheid Patterns  |
| `src/lib/trade/licenses/ddtc-cj-parser.server.ts`               | NEW    | analog für DDTC Commodity Jurisdiction Letters                 |
| `src/lib/astra/regulatory-knowledge/bafa-bescheid-samples/`     | NEW    | 10 anonymized BAFA-Bescheid-PDFs als Few-Shot-Quelle           |
| `src/app/(trade)/trade/licenses/_components/LicensePdfDrop.tsx` | NEW    | Drop-Zone in der "New License" Form mit Field-Level-Confidence |
| `src/app/api/trade/licenses/parse/route.ts`                     | NEW    | POST endpoint — PDF in, parsed-fields out                      |
| `src/lib/trade/licenses/bafa-bescheid-parser.test.ts`           | NEW    | 5 fixture PDFs, assert correct extraction                      |

### Dependencies

- Existing: Anthropic SDK, R2 storage
- New: 10 anonymized BAFA-Bescheid + DDTC-CJ samples für Few-Shot

### Acceptance Criteria

- [ ] Operator Drag-Drops BAFA-Bescheid → "Neue Lizenz" Form pre-filled in 10s
- [ ] Extrahierte Felder: bescheidnummer, validUntil, totalCapValue, capCurrency, covered ECCNs, covered countries, conditions
- [ ] Confidence per Field, niedrig-confidence-Felder visually flagged
- [ ] Operator approved + saved → Audit-Log enthält "auto-parsed from PDF + reviewed by USER_ID"
- [ ] 5 echte BAFA-Bescheide → ≥95% Felder korrekt

---

## 1D — Agentic Sanctions Triage

**Status:** ❌ NOT_STARTED
**Sprint:** M1
**Effort:** 3W MVP
**Impact:** POTENTIAL_MATCH triage Zeit 20min → 30sec

### Files

| Pfad                                                                 | Status | Purpose                                                                                               |
| -------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `src/lib/trade/sanctions/triage-agent.server.ts`                     | NEW    | Astra-Tool-Loop: gegeben ein POTENTIAL_MATCH, laufe autonomes Research                                |
| `src/lib/trade/sanctions/sources/ubo-cascade.server.ts`              | EXISTS | bereits da — wird vom Agent als Tool genutzt                                                          |
| `src/lib/trade/sanctions/sources/cross-list-checker.server.ts`       | NEW    | Multi-list lookup: UK OFSI, EU CFSP, UN, Canada                                                       |
| `src/lib/trade/sanctions/sources/news-context.server.ts`             | NEW    | Reuters/FT/SEC EDGAR query für recent context per entity                                              |
| `src/lib/trade/sanctions/triage-brief.ts`                            | NEW    | Pure function: aggregiert Tool-Outputs → TriageBrief shape                                            |
| `prisma/schema.prisma`                                               | MODIFY | NEW model `SanctionsTriageBrief` (matchId, confidence, reasoning, sources, recommendation, createdAt) |
| `src/app/(trade)/trade/parties/[id]/_components/TriageBriefCard.tsx` | NEW    | UI Card mit Confidence-Bar + Reasoning + Source-Links + BLOCK/CLEAR/ESCALATE buttons                  |
| `src/app/api/cron/sanctions-triage/route.ts`                         | NEW    | hourly job: any new POTENTIAL_MATCH ohne Brief → trigger agent                                        |
| `src/lib/trade/sanctions/triage-agent.test.ts`                       | NEW    | mock OFAC list, mock news, assert reasoning chain                                                     |

### Dependencies

- Existing: `tool-executor.ts` (2046 LOC), `TradePartyOwnership` graph, screening engine
- New: News API access (Reuters / FT / GDELT), EDGAR scraper

### Acceptance Criteria

- [ ] Bei neuem POTENTIAL_MATCH läuft Agent innerhalb 60s automatisch
- [ ] TriageBrief enthält: Confidence (0-100), Reasoning-Chain mit ≥3 Quellen, Recommendation (BLOCK/CLEAR/ESCALATE)
- [ ] UBO-Cascade-Checks auf 50%-Rule (existing logic) integriert
- [ ] Cross-Listen-Check (UK OFSI + EU CFSP + UN) automatisch
- [ ] News-Context: letzten 30 Tage Reuters/FT-Headlines mit entity-mention
- [ ] Operator kann 1-Klick die Recommendation accept/override
- [ ] Audit-Log enthält Agent-Reasoning + Operator-Decision

---

## 1E — Astra Drafting Pipeline (EUC / VSD / BAFA-Antrag / Re-Export)

**Status:** ❌ NOT_STARTED
**Sprint:** M2 (after 1D — reuses tool-loop patterns)
**Effort:** 6-8W (alle 4 Document-Typen)
**Impact:** Per-Document 1-4h Anwalts-Tipp-Zeit → 10min Review

### Files

#### EUC Drafting

| Pfad                                                         | Status | Purpose                                                                      |
| ------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| `src/lib/trade/drafting/euc-drafter.server.ts`               | NEW    | gegeben (operation, items, counterparty) → email-Text + BAFA-EUC-PDF-Prefill |
| `src/lib/astra/regulatory-knowledge/euc-templates/`          | NEW    | BAFA / BIS-711 / DS-83 templates als Few-Shot                                |
| `src/app/(trade)/trade/euc/_components/AstraDraftButton.tsx` | NEW    | "Draft mit Astra" button auf EUC-Detail-Page                                 |

#### VSD Drafting

| Pfad                                                               | Status | Purpose                                                                           |
| ------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------- |
| `src/lib/trade/drafting/vsd-drafter.server.ts`                     | NEW    | gegeben (violation, operation history, audit-log) → narrative draft per authority |
| `src/lib/astra/regulatory-knowledge/vsd-narratives/`               | NEW    | OFAC / BIS / DDTC / BAFA narrative samples                                        |
| `src/app/(trade)/trade/vsd/[id]/_components/AstraDraftSection.tsx` | NEW    | tabbed view: per-authority draft mit edit                                         |

#### BAFA-Antrag Drafting

| Pfad                                                               | Status | Purpose                                         |
| ------------------------------------------------------------------ | ------ | ----------------------------------------------- |
| `src/lib/trade/drafting/bafa-application-drafter.server.ts`        | NEW    | AGG + Einzel + EUGEA application drafting       |
| `src/app/(trade)/trade/licenses/_components/AstraDraftLicense.tsx` | NEW    | "Apply with Astra" button auf neue License Page |

#### Re-Export Consent

| Pfad                                                                            | Status | Purpose                                                                          |
| ------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| `src/lib/trade/drafting/reexport-letter-drafter.server.ts`                      | NEW    | gegeben (original-license, new-destination, new-end-user) → consent letter draft |
| `src/app/(trade)/trade/reexport-consents/[id]/_components/AstraDraftLetter.tsx` | NEW    | letter generation + Adobe-Sign integration hook                                  |

### Shared

| Pfad                                                     | Status | Purpose                                                                                  |
| -------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `src/lib/trade/drafting/shared/draft-version-tracker.ts` | NEW    | every draft → versioned with diff against previous                                       |
| `prisma/schema.prisma`                                   | MODIFY | NEW model `DocumentDraft` (entityType, entityId, version, content, modelUsed, createdAt) |

### Dependencies

- Existing: `tool-executor.ts`, regulatory-knowledge module
- New: PDF prefill library (e.g. `pdf-lib`), Adobe Sign API integration

### Acceptance Criteria

- [ ] Operator klickt "Draft EUC mit Astra" → in 30s vorgefertigter Email-Text + PDF-Prefill bereit
- [ ] Alle 4 Document-Typen funktionieren End-to-End
- [ ] Jeder Draft hat Version-History + Diff-View
- [ ] Drafts gespeichert in DocumentDraft, audit-trail komplett
- [ ] EU AI Act Disclaimer ("KI-generiert, kein Rechtsrat") wird in jedem Draft eingefügt

---

# 🟡 STUFE 2 — Predictive Layer

## 2A — Predictive Sanctions Watch

**Status:** ❌ NOT_STARTED
**Sprint:** M3
**Effort:** 4-6W MVP
**Impact:** Sieht Sanktionen **3 Wochen vorher** — verhindert in-flight Disasters

### Files

| Pfad                                                               | Status | Purpose                                                                                    |
| ------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------ |
| `src/lib/trade/predictive/sanctions-watch.server.ts`               | NEW    | daily job aggregates signals per counterparty                                              |
| `src/lib/trade/predictive/signals/news-poller.server.ts`           | NEW    | poll Reuters / FT / GDELT für entity-mentions                                              |
| `src/lib/trade/predictive/signals/edgar-poller.server.ts`          | NEW    | SEC EDGAR Form 8-K material events                                                         |
| `src/lib/trade/predictive/signals/linkedin-changes.server.ts`      | NEW    | LinkedIn org-page change detection (via SerpAPI or similar)                                |
| `src/lib/trade/predictive/signals/patent-poller.server.ts`         | NEW    | USPTO + EPO new filings under dual-use classes                                             |
| `src/lib/trade/predictive/risk-scorer.ts`                          | NEW    | pure function: signals → risk-delta (0-100)                                                |
| `prisma/schema.prisma`                                             | MODIFY | NEW model `CounterpartyRiskScore` (partyId, scoreToday, scoreTrend, signals[], computedAt) |
| `src/app/(trade)/trade/parties/[id]/_components/RiskScoreCard.tsx` | NEW    | "Risk: 23% → 67% in 30d" visual                                                            |
| `src/app/api/cron/sanctions-watch/route.ts`                        | NEW    | daily run für alle aktiven counterparties                                                  |
| `src/lib/trade/predictive/sanctions-watch.test.ts`                 | NEW    | fixture signals → assert risk-score                                                        |

### Dependencies

- Existing: TradeParty model
- New: News API account (e.g. NewsAPI.org or GDELT-free), SerpAPI for LinkedIn, EDGAR scraper

### Acceptance Criteria

- [ ] Daily Job runs für alle ACTIVE counterparties (< 1000)
- [ ] Risk-Score wird täglich aktualisiert mit Trend-Indicator
- [ ] Hochrisiko-Counterparties (Score > 60) lösen Alert-Email aus
- [ ] Risk-Brief auf Party-Detail-Page mit signal-list + Source-Links
- [ ] Predictive-Accuracy: ≥40% der "high risk" wurden tatsächlich sanctioned innerhalb 90d (gemessen nach 6 Monaten)

---

## 2B — License-Stack Optimizer

**Status:** ❌ NOT_STARTED
**Sprint:** M4
**Effort:** 3-4W MVP
**Impact:** Concrete €€-ROI per Empfehlung — Compliance wird profit-center

### Files

| Pfad                                                            | Status | Purpose                                                                                                                          |
| --------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/trade/optimizer/license-stack-analyzer.server.ts`      | NEW    | scan alle aktiven Operations + Lizenzen → finde Bundling-Opportunities                                                           |
| `src/lib/trade/optimizer/cost-model.ts`                         | NEW    | pure function: legal-fees + operator-hours per license-type                                                                      |
| `src/lib/trade/optimizer/recommendation-builder.server.ts`      | NEW    | scan-result → ranked Recommendations mit €-Savings                                                                               |
| `src/lib/trade/optimizer/agg-application-prefill.server.ts`     | NEW    | für eine Recommendation: auto-generate AGG-12 Antrag pre-filled                                                                  |
| `prisma/schema.prisma`                                          | MODIFY | NEW model `LicenseRecommendation` (orgId, type, suggestedLicenseType, affectedOperationIds, estimatedSavings, rationale, status) |
| `src/app/(trade)/trade/licenses/_components/OptimizerPanel.tsx` | NEW    | Card mit Top-3 Recommendations + "Apply mit Astra"                                                                               |
| `src/app/api/cron/license-optimizer/route.ts`                   | NEW    | monthly run, generates fresh recommendations                                                                                     |
| `src/lib/trade/optimizer/license-stack-analyzer.test.ts`        | NEW    | fixture license-stacks → assert correct bundling-detection                                                                       |

### Dependencies

- Existing: License + Operation models, draw-down engine
- Builds on: 1E (uses BAFA-application-drafter for the actual filing)

### Acceptance Criteria

- [ ] Operator sieht Top-3 Recommendations per Monat
- [ ] Jede Recommendation hat konkrete €-Savings (legal-fees + hours)
- [ ] 1-Klick "Apply mit Astra" generiert AGG/AGE Antrag pre-filled
- [ ] Operator-Override "rejected" wird gespeichert + lernt für nächste Recommendation
- [ ] ROI-Tracking: Dashboard zeigt "Saved €X across N Recommendations seit Y"

---

## 2C — Operation Response-Time Forecasting

**Status:** ❌ NOT_STARTED
**Sprint:** M4
**Effort:** 2W MVP
**Impact:** Compliance wird plannbar — kein "warten ohne zu wissen wie lange"

### Files

| Pfad                                                                        | Status | Purpose                                                                                                      |
| --------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `src/lib/trade/forecasting/response-time-model.server.ts`                   | NEW    | Random-Forest auf aggregated BAFA/BIS/DDTC response-time data                                                |
| `src/lib/trade/forecasting/feature-extractor.ts`                            | NEW    | pure function: operation → feature-vector (license-type, country-code, item-classification, value-bucket)    |
| `src/lib/trade/forecasting/training-pipeline.server.ts`                     | NEW    | daily job: pull all completed licenses from past 24 months, retrain model                                    |
| `prisma/schema.prisma`                                                      | MODIFY | NEW model `ResponseTimePrediction` (operationId, predictedDaysMin, predictedDaysMax, confidence, computedAt) |
| `src/app/(trade)/trade/operations/[id]/_components/PredictedTimingCard.tsx` | NEW    | "Predicted: 11-16 Wochen (89% Konfidenz)" visual                                                             |
| `src/lib/trade/forecasting/response-time-model.test.ts`                     | NEW    | synthetic data, assert prediction within bounds                                                              |

### Dependencies

- Existing: Operation + License models with timestamp data
- New: lightweight ML library (sklearn-equivalent in Node, or call out to Python microservice)

### Acceptance Criteria

- [ ] Bei neuem License-Application: Predicted Response Time visible
- [ ] Modell retrained täglich auf aggregierter Data
- [ ] Wenn elapsed > predicted-max → Auto-Eskalation-Reminder
- [ ] Initial-Bootstrap: heuristic mode für Orgs mit <10 completed licenses, ML-mode danach
- [ ] Prediction-Accuracy: ≥75% innerhalb der predicted-range (gemessen nach 12 Monaten)

---

## 2D — Catch-All Auto-Detection

**Status:** ❌ NOT_STARTED
**Sprint:** M3
**Effort:** 4-6W MVP
**Impact:** Verhindert die meisten VSDs (jeder VSD = €50k-500k Anwalts-Kosten)

### Files

| Pfad                                                                     | Status | Purpose                                                                                                     |
| ------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| `src/lib/trade/catchall/detector.server.ts`                              | NEW    | per-operation: run alle Art. 4/5/9/10 catch-all checks                                                      |
| `src/lib/trade/catchall/signals/website-crawler.server.ts`               | NEW    | crawl counterparty website, extract end-use signals                                                         |
| `src/lib/trade/catchall/signals/director-background.server.ts`           | NEW    | LinkedIn + news lookup for company directors → military-affiliation flags                                   |
| `src/lib/trade/catchall/signals/procurement-patterns.server.ts`          | NEW    | aggregate procurement intel (where available — premium data)                                                |
| `src/lib/trade/catchall/signals/geo-clustering.ts`                       | NEW    | known military-clusters database (Sankt-Petersburg, Tehran-South, etc.)                                     |
| `src/lib/trade/catchall/risk-aggregator.ts`                              | NEW    | pure function: signals → Art. 4/5/9/10 risk-scores                                                          |
| `prisma/schema.prisma`                                                   | MODIFY | NEW model `CatchAllAssessment` (operationId, art4Risk, art5Risk, art9Risk, art10Risk, reasoning, signals[]) |
| `src/app/(trade)/trade/operations/[id]/_components/CatchAllRiskCard.tsx` | NEW    | per-article risk-bars + reasoning + "request human review" button                                           |
| `src/app/api/cron/catchall-rescan/route.ts`                              | NEW    | weekly: rescan all in-flight operations                                                                     |
| `src/lib/trade/catchall/detector.test.ts`                                | NEW    | fixture operations + signals → assert correct article-trigger                                               |

### Dependencies

- Existing: TradeOperation model with existing catchAll\* fields
- New: web-scraping infrastructure (headless browser or scraping API)
- Builds on: 2A signal-pollers (shared infrastructure with sanctions-watch)

### Acceptance Criteria

- [ ] Auto-run bei jeder neuen Operation
- [ ] Risk-Bars für Art. 4 / 5 / 9 / 10 (EU 2021/821) sichtbar in <30s
- [ ] HOCH-Risk (≥60%) löst Operator-Eskalation aus
- [ ] Reasoning enthält source-citations + signals
- [ ] Operator-Decision (escalate / acknowledge / dismiss) wird im Audit-Log gespeichert
- [ ] False-positive rate ≤25% nach 3 Monaten Calibration

---

# 🔴 STUFE 3 — Plattform-Play

## 3A — SAP/Oracle Native Integration ("Stripe für Export-Compliance")

**Status:** ❌ NOT_STARTED — biggest investment, höchster Hebel
**Sprint:** M6
**Effort:** 3-6 Monate
**Impact:** Kategorienwechsel — Operator wird Exception-Handler

### Files

| Pfad                                                 | Status        | Purpose                                                                        |
| ---------------------------------------------------- | ------------- | ------------------------------------------------------------------------------ |
| `packages/caelex-trade-sdk-node/`                    | NEW directory | npm package: TypeScript SDK                                                    |
| `packages/caelex-trade-sdk-python/`                  | NEW directory | PyPI package: Python SDK                                                       |
| `packages/caelex-trade-sdk-java/`                    | NEW directory | Maven package: Java SDK (für SAP-Customers)                                    |
| `packages/caelex-trade-sdk-shared/`                  | NEW directory | OpenAPI spec + generators                                                      |
| `src/app/api/v1/auto-pilot/screen/route.ts`          | NEW           | POST endpoint — given (item-spec, counterparty, route) → ALLOW/REVIEW/BLOCK    |
| `src/app/api/v1/auto-pilot/webhook/route.ts`         | NEW           | outbound webhooks: org's ERP wird notified bei status-change                   |
| `src/lib/trade/auto-pilot/decision-engine.server.ts` | NEW           | aggregates classify + screen + license-determine in one pipe                   |
| `src/lib/trade/auto-pilot/rate-limiter.server.ts`    | NEW           | per-org high-volume rate limiting (separate tier)                              |
| `prisma/schema.prisma`                               | MODIFY        | NEW model `AutoPilotDecision` (orgId, requestId, decision, latencyMs, traceId) |
| `docs/sap-integration-cookbook.md`                   | NEW           | reference implementation: SAP S/4HANA Connector                                |
| `docs/oracle-erp-integration-cookbook.md`            | NEW           | reference implementation: Oracle EBS Connector                                 |
| `docs/ifs-integration-cookbook.md`                   | NEW           | Schweden-focused, growing market                                               |
| `tests/load/auto-pilot-load.test.ts`                 | NEW           | 1000 req/sec sustained, P99 < 800ms                                            |

### Dependencies

- Existing: API v1 (per CLAUDE.md), webhook infrastructure
- New: SDK generator tooling, multi-language CI matrix, Enterprise SLA tier
- Customer: 3-5 pilot customers für reference implementations

### Acceptance Criteria

- [ ] Node SDK: `npm install @caelex/trade` works, type-safe, documented
- [ ] Python SDK: `pip install caelex-trade` works
- [ ] Java SDK: Maven artifact published
- [ ] SAP S/4HANA reference connector: BoM-line create → Caelex auto-classify
- [ ] Oracle EBS reference connector: Sales-Order confirm → Caelex auto-screen
- [ ] Load test: 1000 req/sec sustained, P99 latency < 800ms, P50 < 200ms
- [ ] Customer-pilot: 3 design-partners running in production for ≥3 months
- [ ] Pricing tier: "Caelex Auto-Pilot Enterprise" with €X/req or volume-based pricing

### Pre-work (required before M6 starts)

- ❓ Customer Discovery: identify 3-5 design-partners willing to pilot
- ❓ Pricing-Model Decision: per-req? per-volume? per-seat? Enterprise license?
- ❓ Legal: standard MSA template für Enterprise tier mit SLA + data-processing

---

## 3B — Verity: Cryptographic Compliance Provenance

**Status:** ❌ NOT_STARTED
**Sprint:** M5
**Effort:** 2-4W (Verity-Modul existiert schon, Trade-Integration ist plumbing)
**Impact:** EU AI Act Art. 50 ready, Audit-Trail wird unbestreitbar

### Files

| Pfad                                                                   | Status | Purpose                                                                                                                            |
| ---------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/verity/`                                                      | EXISTS | Verity-Modul schon vorhanden im Repo (für Comply)                                                                                  |
| `src/lib/verity/trade-adapter.server.ts`                               | NEW    | adapter: jede Trade-Decision → Verity-Attestation                                                                                  |
| `src/lib/trade/classification/parametric-matcher.ts`                   | MODIFY | every classification → call verity-adapter                                                                                         |
| `src/lib/trade/sanctions/screening-engine.ts`                          | MODIFY | every screening → call verity-adapter                                                                                              |
| `src/lib/astra/engine.ts`                                              | MODIFY | every Astra-recommendation → call verity-adapter                                                                                   |
| `prisma/schema.prisma`                                                 | MODIFY | NEW model `TradeAttestation` (entityType, entityId, decisionType, modelInfo, inputHash, outputHash, signedReceipt, sentinelAnchor) |
| `src/app/(trade)/trade/audit-center/_components/AttestationViewer.tsx` | NEW    | verifiable-receipt viewer per decision                                                                                             |
| `src/app/api/trade/attestations/[id]/verify/route.ts`                  | NEW    | public-key signature verification endpoint                                                                                         |
| `src/lib/verity/trade-adapter.test.ts`                                 | NEW    | round-trip: sign → store → verify                                                                                                  |

### Dependencies

- Existing: `src/lib/verity/` (Verity module from Comply, reused)
- New: dedicated signing-key infrastructure (KMS-backed)

### Acceptance Criteria

- [ ] Jede Astra-Decision hat einen signed receipt
- [ ] Jede Sanctions-Screening hat einen signed receipt
- [ ] Jede Classification (manual + automatic) hat einen signed receipt
- [ ] Verifier-Endpoint: gegeben receipt → returns valid/invalid + reason
- [ ] Audit-Center UI: per-decision "Show Provenance" button mit decoded receipt
- [ ] Tamper-Test: modifying any field invalidates the signature

---

## 3C — What-If Regulation Simulator

**Status:** ❌ NOT_STARTED
**Sprint:** M5
**Effort:** 4-6W MVP
**Impact:** CFO bekommt €-Zahl bevor BAFA Rundschreiben publiziert

### Files

| Pfad                                                          | Status        | Purpose                                                                                |
| ------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| `src/lib/dashboard/`                                          | EXISTS        | Digital-Twin What-If engine schon im Codebase                                          |
| `src/lib/trade/whatif/scenario-runner.server.ts`              | NEW           | adapter: gegeben hypothetical Regulation-Change → simulate impact                      |
| `src/lib/trade/whatif/scenarios/`                             | NEW directory | predefined scenarios: russia-833-expansion, itar-ai-extension, etc.                    |
| `src/lib/trade/whatif/impact-calculator.ts`                   | NEW           | pure function: scenario × org-state → impact-report                                    |
| `prisma/schema.prisma`                                        | MODIFY        | NEW model `RegulationSimulation` (orgId, scenarioId, runAt, impactReport, decisionLog) |
| `src/app/(trade)/trade/whatif/page.tsx`                       | NEW           | UI: scenario picker + impact-visualization + business-impact-table                     |
| `src/app/(trade)/trade/whatif/_components/ScenarioPicker.tsx` | NEW           | dropdown of predefined + "ask Astra" custom-scenario                                   |
| `src/app/(trade)/trade/whatif/_components/ImpactReport.tsx`   | NEW           | affected items + operations + €-impact table                                           |
| `src/lib/trade/whatif/scenario-runner.test.ts`                | NEW           | fixture scenarios → assert correct impact-calc                                         |

### Dependencies

- Existing: Digital-Twin What-If pattern from `src/app/dashboard/digital-twin`
- Existing: All Trade engines (classification, license-determination, screening)

### Acceptance Criteria

- [ ] 5 vordefinierte Scenarios shipped: russia-833-expansion, itar-ai-extension, ofac-iran-tightening, fdpr-extension, eu-annex-iv-addition
- [ ] "Ask Astra" custom scenario: natural-language → executable simulation
- [ ] Impact-Report: betroffene Items (count + Tabelle), betroffene Operations (count + €-value), neue Lizenz-Anträge nötig (count)
- [ ] Export-button: PDF-Report für CFO/Board
- [ ] Save scenarios per-org für recurring analysis

---

## 3D — Network-Effect Aggregate Benchmarks

**Status:** ❌ NOT_STARTED
**Sprint:** M7 — depends on customer-base
**Effort:** 6-8W Phase 1 (Benchmark-engine exists), Network-Effect baut sich über Zeit auf
**Impact:** Bloomberg Terminal der Export-Compliance

### Files

| Pfad                                                                     | Status        | Purpose                                                                                     |
| ------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------- |
| `src/lib/astra/benchmark-engine.server.ts`                               | EXISTS        | bereits da — wird ausgebaut für Trade-spezifische Benchmarks                                |
| `src/lib/trade/benchmarks/`                                              | NEW directory | Trade-spezifische aggregations                                                              |
| `src/lib/trade/benchmarks/anonymizer.server.ts`                          | NEW           | k-anonymity layer (k=5 minimum), strip PII, bucket sizes                                    |
| `src/lib/trade/benchmarks/aggregators/vsd-rates.server.ts`               | NEW           | VSDs/year/org bucketed by industry × size                                                   |
| `src/lib/trade/benchmarks/aggregators/license-approval.server.ts`        | NEW           | approval rates per license-type × country × industry                                        |
| `src/lib/trade/benchmarks/aggregators/counterparty-reputation.server.ts` | NEW           | "this counterparty has been screened by N orgs, M as CLEAR"                                 |
| `src/lib/trade/benchmarks/aggregators/catchall-patterns.server.ts`       | NEW           | which (counterparty-country × end-use) combos trigger catch-all most                        |
| `prisma/schema.prisma`                                                   | MODIFY        | NEW model `AggregateBenchmark` (bucketKey, bucketDimensions, value, sampleSize, computedAt) |
| `src/app/(trade)/trade/_components/BenchmarkInsightsCard.tsx`            | NEW           | per-org "where you stand vs peers" widget                                                   |
| `src/app/api/cron/recompute-benchmarks/route.ts`                         | NEW           | weekly batch job                                                                            |
| `legal/network-effect-opt-in-clause.md`                                  | NEW           | standard MSA addendum für customer-opt-in                                                   |
| `src/lib/trade/benchmarks/anonymizer.test.ts`                            | NEW           | assert k=5 enforcement, no PII leak                                                         |

### Dependencies

- Existing: `benchmark-engine.server.ts` (Comply scope), Trade models
- New: customer opt-in clause in MSA, anonymization audit by external party
- Customer-base: ≥20 orgs für meaningful k-anon buckets

### Acceptance Criteria

- [ ] All benchmarks enforce k=5 minimum (orgs/bucket)
- [ ] Anonymization: zero PII / org-IDs / counterparty-names leak between orgs
- [ ] External audit of anonymization (security firm) clean
- [ ] Customer-Opt-In: explicit checkbox in onboarding, opt-out anytime
- [ ] Insights-Card auf /trade welcome zeigt "you vs your peers" data
- [ ] No customer ever sees another customer's data

---

## 3E — Conversational Compliance Audit

**Status:** ❌ NOT_STARTED
**Sprint:** M5 — depends on audit-log-writes
**Effort:** 3-4W MVP
**Impact:** Audit-Prep von 1 Woche → 1 Stunde

### Pre-requisite

- ⚠️ **Wire `prisma.auditLog.create()` into every Trade server action first** (separate ~3-5h effort spread across trade/\*-actions.ts files)

### Files

#### Pre-requisite work

| Pfad                                         | Status | Purpose                                                                                    |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `src/lib/trade/audit-helpers.server.ts`      | NEW    | helper: `recordTradeAudit({ orgId, userId, action, entityType, entityId, before, after })` |
| `src/lib/trade/euc-actions.ts`               | MODIFY | call recordTradeAudit on every state transition                                            |
| `src/lib/trade/vsd-service.ts`               | MODIFY | call recordTradeAudit                                                                      |
| `src/lib/trade/reexport-service.ts`          | MODIFY | call recordTradeAudit                                                                      |
| `src/app/api/trade/operations/[id]/route.ts` | MODIFY | call recordTradeAudit on PATCH                                                             |
| `src/app/api/trade/items/route.ts`           | MODIFY | call recordTradeAudit on POST/PATCH                                                        |
| `src/app/api/trade/parties/route.ts`         | MODIFY | call recordTradeAudit on POST/PATCH                                                        |
| `src/app/api/trade/licenses/route.ts`        | MODIFY | call recordTradeAudit on POST/PATCH                                                        |

#### Conversational Audit UI

| Pfad                                                           | Status | Purpose                                                      |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| `src/lib/astra/tools/audit-query.server.ts`                    | NEW    | Astra-Tool: SQL-equivalent query over AuditLog scoped to org |
| `src/lib/astra/tools/audit-export.server.ts`                   | NEW    | Astra-Tool: generate audit-pack PDF/CSV                      |
| `src/app/(trade)/trade/audit-center/page.tsx`                  | EXISTS | add conversational query interface                           |
| `src/app/(trade)/trade/audit-center/_components/AuditChat.tsx` | NEW    | Astra-chat scoped to audit-log only                          |
| `src/lib/astra/tools/audit-query.test.ts`                      | NEW    | mock audit-data, assert correct query results                |

### Dependencies

- Existing: AuditLog model with hash-chain, Astra tool-executor
- Pre-requisite: audit-log writes wired into all Trade server actions

### Acceptance Criteria

- [ ] Auditor fragt "Show me all 9A515 classifications in 2025" → Astra produziert filterable Tabelle in 5s
- [ ] Auditor kann Follow-up fragen: "Who approved entity X's CLEAR status?"
- [ ] Audit-Pack-Export: 1-Klick generiert PDF mit alle reasoning + provenance + signatures (3B)
- [ ] Hash-chain integrity verified on every query (tamper-detection)
- [ ] AuditChat respects org-isolation (no leak across tenants)

---

# Phase Decision Gates

Before starting each phase:

## ✅ Phase 1 (M1-M2) — green-light criteria

- Anthropic API key + Claude Vision access confirmed
- 10 anonymized BAFA-Bescheid samples gesourct (für 1C Few-Shot)
- News API access decided (NewsAPI / GDELT / custom scraper)
- pgvector extension enabled on Neon Postgres (für 1B RAG)

## 🟡 Phase 2 (M3-M4) — green-light criteria

- Phase 1 in production for ≥4 weeks (data-volume sufficient für 2C training)
- Customer-feedback from Phase 1 reviewed (sind die assumptions richtig?)
- Decision: build vs buy für signal-pollers (news / EDGAR / LinkedIn)
- Initial ML-infrastructure (lightweight, in-Node or Python sidecar) chosen

## 🔴 Phase 3 (M5-M7) — green-light criteria

- ≥10 paying customers für 3D network-effect-buckets
- Enterprise legal team ready für 3A MSAs
- 3-5 design-partners committed für 3A SAP/Oracle pilots
- External security audit budget approved für 3D anonymization review
- KMS infrastructure set up für 3B signing keys

---

# Cost & Resource Estimate

## Engineering Headcount

- **Phase 1 (M1-M2):** 1 senior full-stack engineer × 3 months = ~3 person-months
- **Phase 2 (M3-M4):** 1 senior + 1 mid (analytics/ML) × 3 months = ~6 person-months
- **Phase 3 (M5-M7):** 2 seniors + 1 platform + 1 SDK engineer × 6 months = ~24 person-months
- **Total:** ~33 person-months (one team of 4 = ~8-9 calendar months)

## External Costs

- Anthropic Claude API: budget €5-15k/month at scale
- OpenAI embeddings (1B): ~€500/month
- News API (2A, 2D): €500-2000/month depending on volume
- SerpAPI for LinkedIn (2A, 2D): €500/month
- EDGAR is free (gov data)
- Web-scraping infra (2D): €200-500/month
- KMS for signing (3B): ~€50/month AWS KMS
- External security audit (3D): one-time €15-30k
- Legal MSA drafting (3A, 3D): €10-20k

**Total external/year at full scale:** ~€100-200k

## Revenue Justification

- **Phase 1:** preserves existing pricing tier, makes upsells easier
- **Phase 2:** justifies premium tier (+€500-2000/month per customer for predictive features)
- **Phase 3A:** Enterprise tier €50-200k/year per customer
- **Phase 3D:** "Caelex Insights" add-on €1-5k/year per customer

**Break-even target:** 10 Enterprise customers on 3A tier = €1M+ ARR addition.

---

# Living Tracker

Update this section as items move through statuses.

### M1 — currently

- 1A Multimodal Classification: ❌ NOT_STARTED
- 1C BAFA-Bescheid Parser: ❌ NOT_STARTED
- 1D Agentic Sanctions Triage: ❌ NOT_STARTED

### M2 — currently

- 1B Self-Learning Classification: ❌ NOT_STARTED
- 1E Astra Drafting Pipeline: ❌ NOT_STARTED

### M3 — currently

- 2A Predictive Sanctions Watch: ❌ NOT_STARTED
- 2D Catch-All Auto-Detection: ❌ NOT_STARTED

### M4 — currently

- 2B License-Stack Optimizer: ❌ NOT_STARTED
- 2C Response-Time Forecasting: ❌ NOT_STARTED

### M5 — currently

- 3B Verity Provenance: ❌ NOT_STARTED
- 3C What-If Simulator: ❌ NOT_STARTED
- 3E Conversational Audit: ❌ NOT_STARTED

### M6 — currently

- 3A SAP/Oracle SDK: ❌ NOT_STARTED (customer-discovery first)

### M7 — currently

- 3D Network-Effect Benchmarks: ❌ NOT_STARTED (customer-base first)

---

# Next Concrete Actions

The user said "wir machen alles" — committed.

**Immediate next steps (this week):**

1. ✅ This doc created (THIS commit)
2. ❌ Decision: who's the engineering team for M1? Hire / reallocate / contract?
3. ❌ Enable pgvector on Neon Postgres (für 1B preparation)
4. ❌ Source 10 anonymized BAFA-Bescheid samples (für 1C Few-Shot)
5. ❌ Confirm Anthropic Claude Vision API access
6. ❌ Customer discovery interviews — 5 calls with current MEVA users:
   - "If we could auto-extract ECCN from your datasheets, would you use it?"
   - "If we could predict sanctions hits 30 days early, what would it be worth?"
   - "If your SAP could auto-classify on BoM-create, would you integrate?"

**Once team + decisions are in place:** start M1 sprint with 1A + 1C + 1D in parallel.

---

# 💸 ZERO-EXTERNAL-COST CONSTRAINT (Decision 2026-05-24)

**User-Direktive:** "okay also wir machen das ganze ohne externe kosten zu verursachen"

**Interpretation:** Keine NEUEN Vendor-Beziehungen. Bestehende Infrastruktur
(Anthropic Claude API — schon im Stack via `ANTHROPIC_API_KEY`, R2 Storage,
Neon Postgres, Vercel) bleibt. Variable Claude-API-Kosten werden minimiert
durch Modell-Tiering (Haiku statt Sonnet wo möglich) + aggressive Caching.

Alle Items oben bleiben committed — nur die _Wie-Implementierung_ ändert
sich. Trade-offs werden bewusst akzeptiert (siehe per-Item-Notizen unten).

---

## Per-Item Zero-Cost-Replacements

### 1A — Multimodal Classification

**Original-Plan:** Claude Vision (Sonnet)
**Zero-Cost-Plan:** Bleibt Claude Vision — Anthropic ist schon im Stack.
**Optimierung:** Claude **Haiku** als first-pass (schnell + günstig), Sonnet
nur als Fallback bei niedrigem confidence-Score. Cached PDF-Extractions
in Postgres so dass Re-Upload des gleichen PDFs zero cost ist.
**Trade-off:** Keiner — funktioniert identisch zur Original-Vision.

### 1B — Self-Learning Classification mit RAG

**Original-Plan:** OpenAI text-embedding-3-small + pgvector
**Zero-Cost-Plan:** **Transformers.js** (`@xenova/transformers`) mit
`Xenova/all-MiniLM-L6-v2` Modell — läuft komplett im Node-Process, kein
API-Call. Modell ist 23MB, lädt einmal beim Server-Start.
**Speicherung:** weiterhin pgvector in Neon Postgres (gratis Extension).
**Trade-off:** ~10× langsamere Embedding-Generation als OpenAI API (~50ms
statt 5ms), aber irrelevant für ein async daily job. Embedding-Qualität
für unsere Domain (kurze Item-Beschreibungen) praktisch identisch.

```
src/lib/trade/classification/embeddings.server.ts:
  import { pipeline } from '@xenova/transformers';
  const embedder = await pipeline('feature-extraction',
                                   'Xenova/all-MiniLM-L6-v2');
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data); // 384-dim vector
```

### 1C — BAFA-Bescheid Parser

**Original-Plan:** Claude Vision + 10 anonymisierte BAFA-Samples
**Zero-Cost-Plan:** Bleibt identisch. Samples: Operator macht selbst 10
Anonymisierungen aus eigenen oder publiken BAFA-Bescheiden (Beispiele
gibt's auf der BAFA-Website + im BAfA-Bundesblatt frei).
**Trade-off:** Keiner.

### 1D — Agentic Sanctions Triage

**Original-Plan:** News API (Reuters/FT/NewsAPI €500-2000/mo) + SerpAPI
LinkedIn €500/mo
**Zero-Cost-Plan:**

- **News:** GDELT 2.0 — Google's openes Project, free + comprehensive
  global news (alle Reuters/AP/AFP/etc. Headlines via gdeltproject.org/api)
- **EDGAR:** Form 8-K material events — free SEC API
- **OpenSanctions.org:** OFAC + EU + UK + UN consolidated, kostenlos
  unter CC0 Lizenz (schon im Caelex-Stack laut Recherche)
- **LinkedIn signal:** **GESTRICHEN** für Zero-Cost-Variant. Lässt sich
  später optional dazukaufen wenn ROI klar ist.
  **Trade-off:** Etwas weniger comprehensive signal-coverage (-15% accuracy
  geschätzt). Aber 85% accuracy ist immer noch viel besser als 0% (was
  Konkurrenz heute hat).

### 1E — Astra Drafting Pipeline

**Original-Plan:** pdf-lib (open-source ✅) + Adobe Sign integration
(externer Vendor)
**Zero-Cost-Plan:**

- **pdf-lib** bleibt — open-source
- **Adobe Sign:** GESTRICHEN aus MVP. Operator druckt PDF, signiert
  physisch, scant zurück hoch. Alternativ: stub-only integration die
  mailto:-link mit attached PDF generiert.
- E-Signing kommt später wenn Customer-Demand klar ist → können dann
  open-source Signing-Server selbst hosten (DocuSeal etc.)
  **Trade-off:** Operator-Workflow für Signing ist 1 Klick mehr.

### 2A — Predictive Sanctions Watch

**Original-Plan:** News API + EDGAR + LinkedIn + SerpAPI + Patents
**Zero-Cost-Plan:**

- **GDELT** für news (free)
- **EDGAR** Form 8-K (free SEC API)
- **USPTO API** für patents (free)
- **EPO Open Patent Services** für EU patents (free)
- **LinkedIn:** gestrichen
  **Trade-off:** -15% accuracy aber rest of plan unchanged. Risk-Score-Algorithmus
  bleibt identisch.

### 2B — License-Stack Optimizer

**Original-Plan:** Pure analytics on internal data
**Zero-Cost-Plan:** **Unverändert** — keine externen Costs ohnehin.

### 2C — Response-Time Forecasting

**Original-Plan:** Lightweight ML library (sklearn-equivalent oder Python sidecar)
**Zero-Cost-Plan:** **Statistische Bootstrap-Variante** statt ML:

- Berechne Median + P25 + P75 + P90 per (license-type × country × value-bucket)
- "Predicted Response Time: 11-16 Wochen (P25-P75 basierend auf 247 ähnlichen
  Anträgen)" — funktioniert ab N=5 samples
- ML-Variante kommt später wenn genug Trainingsdaten + ML-Bibliothek im Stack
  ist (TensorFlow.js oder ONNX-Runtime sind beide free)
  **Trade-off:** Statistische Bootstrap-Variante ist tatsächlich oft **besser**
  als ML mit wenig Daten — keine Overfitting-Risk, transparenter, debugbar.

### 2D — Catch-All Auto-Detection

**Original-Plan:** Web-scraping infra + LinkedIn + News API
**Zero-Cost-Plan:**

- **Web-scraping:** Cheerio (open-source) + Node's built-in `fetch`. Respektiert
  `robots.txt`. Counterparty-Website-Crawl: 1 request/sec rate-limited.
- **News:** GDELT (free) statt News API
- **LinkedIn director background:** GESTRICHEN — könnte später via openCorporates
  (gratis API mit rate-limits) als Replacement
- **Geo-clustering:** statische DB aus eigener Research (kein API call)
  **Trade-off:** Director-Background-Check fällt weg → -10% catch-all-detection
  accuracy. Akzeptabel: System schlägt immer noch ECHTE Catch-All-Cases vor;
  nur die marginalen Cases werden später erkannt.

### 3A — SAP/Oracle SDK

**Original-Plan:** Engineering-Team + Enterprise legal MSA + customer pilots
**Zero-Cost-Plan:**

- **SDK-Code selbst:** zero cost — open-source SDKs (Node/Python/Java)
  publishen wir auf npm/PyPI/Maven Central (alle kostenlos)
- **Legal MSA:** statt €10-20k Anwalt nehmen wir **Mozilla SPL-2.0-MSA-Template**
  als Basis, modifiziert für Caelex. Free + battle-tested.
- **Customer pilots:** Direct outreach + free trial — kein paid CAC
- **Load testing:** k6 (open-source), keine SaaS
- **Performance monitoring:** existing Sentry (schon im Stack)
  **Trade-off:** Bei ersten Enterprise-Kunden brauchen wir später vielleicht
  einen Anwalt für custom MSA-Verhandlungen — aber das ist DEAL-TIME, nicht
  upfront-investment. Pay-when-needed.

### 3B — Verity Cryptographic Provenance

**Original-Plan:** AWS KMS (~€50/mo)
**Zero-Cost-Plan:** **In-process key management** mit Node's `crypto` Modul:

- Ed25519 keypair pro Org generiert beim ersten Use
- Private-Key encrypted-at-rest in Postgres mit `crypto.createCipheriv`
  (Master-key kommt aus existing `ENCRYPTION_KEY` env var)
- Public-Key in DB für verification queries
- Signing direkt in Node via `crypto.sign('ed25519', ...)`
  **Trade-off:** Niedrigeres Sicherheits-Tier als KMS-backed (Master-Key liegt
  im env var statt im HSM). Adequate für Tier-1 Customers; KMS-Upgrade später
  wenn high-stakes Customer es verlangt.

### 3C — What-If Simulator

**Original-Plan:** Pure code, zero external
**Zero-Cost-Plan:** **Unverändert.**

### 3D — Network-Effect Aggregate Benchmarks

**Original-Plan:** External security audit €15-30k + paid k-anonymity tooling
**Zero-Cost-Plan:**

- **Anonymization-Layer:** Selbst implementieren mit Standard k-anon (k=5
  hard-coded). Open-source code so Community + Customer-Sec-Teams
  selbst auditieren können.
- **External Security Audit:** GESTRICHEN für MVP. Stattdessen:
  - Code-Review durch 2 separate Caelex-Engineers
  - Public bug-bounty mit HackerOne free tier (oder ohne — nur Email-Disclosure)
  - Audit kommt später wenn ein Enterprise-Customer es als Vertragsbedingung verlangt
    **Trade-off:** Manche Tier-1-Enterprise-Customers (Banks, Aerospace-Primes)
    werden audit verlangen bevor sie 3D aktivieren. Akzeptabel — die kommen
    in Year 2-3, dann passt der Audit-Cost zur Revenue.

### 3E — Conversational Compliance Audit

**Original-Plan:** Existing Claude API
**Zero-Cost-Plan:** **Unverändert** — Claude ist schon im Stack.

---

## Variable Claude-API-Kosten Optimierung

Auch wenn Anthropic existing relationship ist, ist die VARIABLE per-token
Kost ein Faktor. Aggressive Optimierung:

| Strategie                                                                                                                                           | Wirkung                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Modell-Tiering:** Haiku für simple tasks (Doc-Parsing, einfache Klassifikation), Sonnet nur für komplexe Reasoning                                | Haiku ist ~30× günstiger als Sonnet — kann 90% des Volumens absorbieren |
| **Prompt-Caching:** alle stable system-prompts (regulatory-knowledge, glossary, few-shot-samples) als cached prefix                                 | Cache-Hits sind 90% günstiger                                           |
| **Aggressive Result-Caching:** PDF-extraction-results, ECCN-predictions, sanctions-triage-briefs in Postgres cachen für Re-Use                      | Zero-cost on cache-hit                                                  |
| **Batch-Mode:** non-urgent jobs (daily sanctions-watch, weekly catch-all-rescan) via Anthropic Batch API                                            | 50% günstiger                                                           |
| **Streaming-Responses:** UX-relevante Calls streamen statt zu warten — Operator perceived speed steigt, kein cost-Impact aber besseres Tier möglich |
| **Strict Token-Budget per Feature:** jede Astra-Funktion bekommt einen Token-Cap, kein runaway-cost                                                 |

Geschätzte ANTHROPIC variable cost bei vollem Phase-3-Deploy mit 50
aktiven Customers: **€2-4k/Monat** statt €15k+ ohne Optimierung.

---

## Aktualisierte Cost-Tabelle

| Item                         | Original Cost       | Zero-Cost Plan                             | Delta      |
| ---------------------------- | ------------------- | ------------------------------------------ | ---------- |
| Anthropic API                | €5-15k/mo           | €2-4k/mo (optimiert)                       | -€11k/mo   |
| OpenAI embeddings (1B)       | €500/mo             | €0 (Transformers.js local)                 | -€500/mo   |
| News API (2A, 2D)            | €500-2k/mo          | €0 (GDELT)                                 | -€2k/mo    |
| SerpAPI LinkedIn (2A, 2D)    | €500/mo             | €0 (gestrichen)                            | -€500/mo   |
| Web-scraping infra (2D)      | €200-500/mo         | €0 (Cheerio + fetch)                       | -€500/mo   |
| KMS (3B)                     | €50/mo              | €0 (in-process crypto)                     | -€50/mo    |
| External security audit (3D) | €15-30k einmalig    | €0 (verschoben)                            | -€30k      |
| Legal MSA drafting (3A)      | €10-20k einmalig    | €0 (Open-source templates)                 | -€20k      |
| **TOTAL external**           | **~€100-200k/year** | **~€24-48k/year** (nur Anthropic variable) | **-€75k+** |

**Engineering-Headcount bleibt** — das ist nicht externer Cost sondern
internal-time-investment. Solo-Pace bleibt bei ~12 Monaten für alle 14
Items, Team-Pace bei 6-9 Monaten.

---

## Was die Zero-Cost-Variante NICHT verändert

- ✅ Strategie ist identisch — alle 14 Items bleiben committed
- ✅ Acceptance-Criteria sind identisch (bis auf -10-15% accuracy bei 1D, 2A, 2D
  wegen LinkedIn-Streichung)
- ✅ Sprint-Sequencing M1-M7 unverändert
- ✅ Konkurrenz-Vergleich aus Research-Doc bleibt gültig — alle Konkurrenten
  zahlen die externen Costs UND sind trotzdem schlechter. Wir sparen Cost
  UND sind besser.

## Was die Zero-Cost-Variante VERÄNDERT

- ❌ LinkedIn-Signals dropped (1D, 2A, 2D) — Director-Background-Checks
  fallen weg
- ❌ Adobe Sign Integration dropped aus 1E — Operator druckt + scant
- ❌ ML-Modell für 2C → Statistical Bootstrap (oft besser bei kleinen N)
- ❌ External Security Audit für 3D → Internal Peer Review + Open-Source
- ❌ Legal Anwalt für 3A MSA → Mozilla-Template-Adaptation
- ❌ AWS KMS für 3B → In-Process Crypto mit Master-Key aus env var
- ⚠️ Pay-When-Needed für später: KMS-Upgrade, External Audit, Legal Custom-MSAs

---

## Decision: Zero-Cost-Plan ist final

Alle 14 Items bleiben committed. Implementierung folgt Zero-Cost-Variante.
Wenn jemals ein einzelnes Item ein externes Tool unbedingt braucht (z.B.
ein Enterprise-Customer fordert auf KMS-backed Verity), dann ist DAS der
Decision-Point — kein blanket-budget upfront.

**Next concrete action:** Setup Transformers.js + pgvector locally für
M1-1B als infrastructure-prep. Alles andere kann direkt mit existing
Stack starten.

## SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
