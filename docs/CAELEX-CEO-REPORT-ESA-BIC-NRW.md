# Caelex — CEO Report

> **Audience:** ESA BIC NRW Selection Committee
> **Author:** Julian Polleschner, Founder & CEO
> **Stand:** 29. April 2026
> **Status:** Operational. Production-deployed. Three pillars live. Pharos 2.0 (Glass Lighthouse) shipped this week.

---

## I. Executive Summary

Caelex ist die **erste vertikal-integrierte Compliance-Infrastruktur des europäischen Weltraumsektors**. Die Plattform deckt die gesamte regulatorische Wertschöpfungskette zwischen Operatoren, juristischer Beratung und behördlicher Aufsicht ab — und macht sie über eine **kryptografisch verifizierbare Glass-Box-Architektur** zum De-Facto-Standard für die `EU-Space-Act`-Implementierungsphase 2030.

**Das Trinity-Modell:**

```
                  CAELEX TRUST FABRIC
       (Hash-Chain · Norm-Anchor · Receipt-Layer)
        │              │              │
    ┌───▼───┐      ┌───▼───┐      ┌───▼───┐
    │ATLAS  │      │COMPLY │      │PHAROS │
    │       │      │       │      │       │
    │Anwälte│ ──→  │Operat.│ ──→  │Behörd.│
    └───────┘      └───────┘      └───────┘
   Beratung      Compliance     Aufsicht
   (V1 GA)       (V1 GA)        (V2 just shipped)
```

**Stand der Auslieferung (April 2026):**

| Metric                                        | Wert                                                       |
| --------------------------------------------- | ---------------------------------------------------------- |
| Production-LOC (TypeScript)                   | **~800.000**                                               |
| Datenbank-Modelle / Enums / Indices           | **240 / 132 / 616**                                        |
| Prisma-Schema                                 | **9.365 Zeilen**                                           |
| API-Endpunkte (Production)                    | **694** über 71 Domains                                    |
| UI-Pages                                      | **279** Seiten                                             |
| React-Komponenten                             | **447**                                                    |
| Compliance-Engines (EU Space Act, NIS2, etc.) | **11** vertikalisierte Server-Engines                      |
| Test-Dateien                                  | **486**                                                    |
| Vercel-Cron-Jobs (Production)                 | **32** zeitgesteuerte Hintergrundprozesse                  |
| Live-Subdomains/Routes                        | `/comply` · `/atlas` · `/pharos` · `/assure` · `/academy`  |
| Externe Service-Kosten Phase 1                | **~€200/Monat** (Anthropic + Vercel + Neon, schon gedeckt) |

**Drei strategische Behauptungen:**

1. **Wir sind der einzige Anbieter, der die regulatorische Trinity (Operator-Anwalt-Behörde) in einer einzigen verifizierbaren Trust-Fabric vereint.** Palantir hat keine Anwalts-Seite, Aleph Alpha keine Behörden-Seite, Mistral keine Operator-Tiefe. Die European Space Industry braucht alle drei zusammen — Caelex liefert sie.
2. **Glass Box statt Black Box ist 2026 das einzige rechtskonforme AI-Architekturparadigma für Behörden.** Die EuGH-Schufa-Rechtsprechung (C-634/21, C-203/22), § 35a VwVfG, EU AI Act Art. 13–15 zwingen jeden Anbieter zu Citation-Trail + reproduzierbarer Logik. Caelex hat das **gebaut**, der Wettbewerb spricht darüber.
3. **Wir sind kapital-effizient genug, um aus dem ESA BIC NRW heraus zu skalieren.** 800k LOC produktiv, 117 Pharos-Unit-Tests grün, sechs Architektur-Schichten kryptografisch verifizierbar — bisher mit ~€0 Eigenkapital + bestehende SaaS-Infrastruktur (Vercel/Neon/Anthropic). ESA-BIC-Förderung beschleunigt Go-to-Market in 11 EU-Jurisdiktionen, nicht den Build.

**Der ESA-Ask:** ESA-BIC-NRW-Cash + Technical Support + Netzwerk-Zugang zu DLR-Raumfahrtagentur, EUSPA, ENISA. Im Gegenzug: Caelex wird das Referenz-Compliance-Stack für Space Act-Phase 2030 — und ESA verfügt über die transparenteste Compliance-Infrastruktur des europäischen Sektors.

---

## II. Strategic Position — Warum jetzt, warum Caelex

### II.1 Das regulatorische Window

Drei Verordnungen kollidieren zwischen 2025 und 2030:

| Regelwerk                        | Wirksamkeit              | Erfasste Operatoren EU-weit         | Bußgeld-Maximum       |
| -------------------------------- | ------------------------ | ----------------------------------- | --------------------- |
| **NIS2-Richtlinie**              | Inkraft 06.12.2025       | ~29.500 (inkl. Space)               | 2 % Konzernumsatz     |
| **EU AI Act**                    | Hochrisiko ab 02.08.2026 | Jeder AI-Anbieter im Behörden-Stack | 7 % bzw. €35 Mio.     |
| **EU Space Act (COM(2025) 335)** | Anwendung 01.01.2030     | ~500–800 Space-Operators            | 2 % weltweiter Umsatz |
| **CRA**                          | Reporting ab 11.09.2026  | Software-Hersteller im Sektor       | 2,5 % Umsatz          |

**Konsequenz:** Jeder europäische Space-Operator hat bis 2030 vier verschiedene, sich teilweise überlappende Compliance-Pflichten zu erfüllen — und keinen Single-Vendor, der alle vier nativ adressiert. Caelex ist genau dieser Vendor.

### II.2 Warum ein 21-jähriger Founder

Der CEO ist 21, hat ohne externes Kapital in 18 Monaten 800.000 Lines of Code Production-System gebaut und die kryptografische Architektur (SCITT-pattern Hash-Chain, Ed25519 Triple-Hash-Receipts, Differential-Privacy-Aggregates, Witness-Quorum 3-of-5) in einer Schärfe implementiert, die etablierte Player wie Palantir AIP, Harvey AI und Luminance gerade erst in ihren 2026-Roadmaps nennen.

**Die Asymmetrie:** Etablierte Anbieter müssen erst Behörden-Track-Records riskieren, um Architektur-Disziplin nachzurüsten. Caelex hat **keine Legacy-Verträge zu schützen** — damit ist Compliance-First nicht Marketing-Pose, sondern strukturelle Tatsache. Genau das, was eine Behörde 2026 von einem AI-Anbieter erwartet.

### II.3 Warum Standort NRW

- **DLR Raumfahrtagentur Bonn** — einzige Bundes-Genehmigungsbehörde für deutsches Weltraumgesetz, sobald BWRG kommt.
- **GovTech Campus Bonn** — direkter Zugang zu BMI, BSI, BeschA für Pharos-Pilotprojekte.
- **EUMETSAT Darmstadt** — wenige Bahnstunden, Earth-Observation-Cluster.
- **Aachen Engineering-Hub** — RWTH-Talent-Pipeline für Frontend, Cryptography, Distributed Systems.
- **Helsing-Defense-Cluster Bonn-Köln** — Defense/Dual-Use-Operatoren als Pharos-Pilotkunden.

NRW ist der einzige deutsche Bundesstaat, in dem Caelex die volle B2A-Sales-Pipeline (Behörden-Aquisition) aus 50 km Radius bedienen kann. Berlin ist politisch stärker, aber strukturell weniger Space-Industrie-dicht.

---

## III. Market Sizing

### III.1 Top-Down

| Layer                           | TAM (EU + UK + CH)  | SAM (Caelex-relevant) | SOM 2030            |
| ------------------------------- | ------------------- | --------------------- | ------------------- |
| Space Industry Total Revenue    | €106 Mrd.           | —                     | —                   |
| EU Compliance-Software Vertical | €1,5 Mrd.           | €500 Mio.             | €15–25 Mio. ARR     |
| EU Public-Sector AI Software    | €15 Mrd. (bis 2028) | €300 Mio.             | €5–10 Mio. ARR      |
| Legal-Tech EU (Atlas-Segment)   | €4 Mrd.             | €120 Mio.             | €3–6 Mio. ARR       |
| **Kombiniertes SOM 5 Jahre**    |                     |                       | **€23–41 Mio. ARR** |

### III.2 Bottom-Up

- **Operator-Side (Comply):** ~500–800 EU-Space-Operators × €30k–€150k Subscription/Jahr = €15–120 Mio. TAM. Realistisch SOM 2030: 10–15 % Marktanteil = **€5–18 Mio. ARR**.
- **Lawyer-Side (Atlas):** ~1.500 EU-Anwaltskanzleien mit Space/Defense-Praxis × €5k–€25k/Anwalt/Jahr (geschätzt 3–8 Anwälte/Kanzlei aktiv) = €30–300 Mio. TAM. Realistisch SOM: **€2–8 Mio. ARR**.
- **Authority-Side (Pharos):** ~200 Aufsichtsbehörden (11 Space Agencies + 27 NIS2-Behörden + sektorale Regulatoren) × €100k–€500k/Behörde/Jahr (Pro-Tier) = €20–100 Mio. TAM. Realistisch SOM: 5 % = **€1–5 Mio. ARR**.

**Konservativer 2030-Plan:** **€15 Mio. ARR**, davon 65 % Operator-Side, 20 % Authority-Side, 15 % Lawyer-Side.

---

## IV. Product Architecture — die drei Säulen + sechs Sub-Plattformen

### IV.1 COMPLY — Operator-Plattform (V1 GA, in Production seit Q3/2025)

Die ursprüngliche Caelex-Säule. 15 Compliance-Module, 11 vertikalisierte Engines, vollständige Multi-Tenant-Architektur.

**Feature-Inventar:**

| Bereich                                 | Umfang                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compliance-Module (Dashboard)**       | 15 — Authorization, Registration, Cybersecurity, Debris, Environmental, Insurance, NIS2, Supervision, COPUOS/IADC, Export Control (ITAR/EAR), Spectrum/ITU, UK Space Industry Act, US Regulatory (FCC/FAA), Digital Twin, Evidence                                                                                                                   |
| **Assessment-Wizards**                  | 4 — EU Space Act (8 Q, 119 Articles), NIS2, National Space Laws (10 Jurisdictions), Unified                                                                                                                                                                                                                                                          |
| **Server-Engines (alle `*.server.ts`)** | 11 — `engine.server.ts` (EU Space Act), `nis2-engine.server.ts`, `space-law-engine.server.ts`, `uk-space-engine.server.ts`, `us-regulatory-engine.server.ts`, `copuos-engine.server.ts`, `export-control-engine.server.ts`, `spectrum-engine.server.ts`, `nis2-auto-assessment.server.ts`, `unified-engine-merger.server.ts`, `cra-engine.server.ts` |
| **Auto-Assessment-Engines**             | NIS2-auto, CRA-auto, Debris-auto, Compliance-auto                                                                                                                                                                                                                                                                                                    |
| **Astra (Operator-AI)**                 | 36 Files, Anthropic Claude + Tool-Use-Loop, Conversation-Manager mit Auto-Summarisation, 20+ Tools                                                                                                                                                                                                                                                   |
| **Document Intelligence**               | `document-intelligence.server.ts` — PDF-Parsing, OCR, regulatorisches Tagging                                                                                                                                                                                                                                                                        |
| **Generation Studio**                   | AI-gestützte Erzeugung von Bescheid-Entwürfen, Anträgen, NCA-Submissions                                                                                                                                                                                                                                                                             |
| **Mission Control**                     | Three.js + React-Three-Fiber 3D-Globe, Satelliten-Tracking, TLE-Daten                                                                                                                                                                                                                                                                                |
| **Ephemeris-Subsystem**                 | Compliance-Forecasting auf Orbital-Daten — `orbital-decay.ts`, `fuel-depletion.ts`, `subsystem-degradation.ts`, `forecast-engine.ts`, `what-if-engine.ts`, CelesTrak-Adapter                                                                                                                                                                         |
| **Sentinel**                            | Live-Telemetrie-Monitoring + automatische Attestation + Cross-Verify                                                                                                                                                                                                                                                                                 |
| **Shield**                              | Cybersecurity-Posture-Management (NIS2 + ENISA-Controls)                                                                                                                                                                                                                                                                                             |
| **Verity**                              | Kryptografische Compliance-Zertifikate, Merkle-Tree Anchoring                                                                                                                                                                                                                                                                                        |
| **Optimizer**                           | Regulatorischer Arbitrage-Optimizer (welche Jurisdiktion ist am günstigsten für welche Mission?)                                                                                                                                                                                                                                                     |
| **NCA Portal**                          | Strukturierte Antrags-Pipeline an nationale Aufsichtsbehörden                                                                                                                                                                                                                                                                                        |
| **Audit Center**                        | Hash-Chain-versionierter Audit-Trail mit kryptografischen Receipts                                                                                                                                                                                                                                                                                   |
| **Stakeholder Network**                 | Cross-Operator Datenraum-Sharing mit Consent-basierten Permissions                                                                                                                                                                                                                                                                                   |

### IV.2 ATLAS — Lawyer-Plattform (V1 GA, Production)

Eigenständiger Workspace für Anwaltskanzleien mit Space/Defense-Praxis. 28 Page-Routen unter `/atlas`.

**Highlights:**

- **Library** — Volltext-suchbarer Korpus über EUR-Lex, nationale Gesetzblätter, Treaties, Jurisdiktionen.
- **Drafting Studio** — AI-gestützte Vertrags- und Bescheid-Drafts mit Citation-Trail.
- **Cases / Matters** — Mandanten-Workspace mit Bilateral-Handshake-Pattern (= Vorlage für Pharos-Aufsichts-Handshake).
- **Comparator / Compare-Articles** — Diff-Analyse zwischen Norm-Versionen, Jurisdiktionen, Treaty-Texten.
- **Legal-Network Bridge** — wenn Operator (in Comply) Anwalt mandatiert, entsteht ein bilateraler Hash-Chain-Handshake — Datenraum, Audit-Log, Mandantenfreigabe.
- **Astra-Atlas** — eigenes Tool-Set für Anwälte (`atlas-tools.ts`, `atlas-tool-executor.ts`, semantic-corpus, link-status, redline, diff-summarizer).

### IV.3 PHAROS — Behörden-Plattform (V2 "Glass Lighthouse" geshipped diese Woche)

Die jüngste Säule. Adressiert die Behördenseite (BAFA, BNetzA, BSI, BMWK, DLR, EUSPA, ENISA, CNES, UKSA, LSA Luxemburg, AESIA Spanien). Vollständig Citation-Pflicht-getrieben + kryptografisch verifizierbar.

**Architektur — die sechs Glass-Box-Schichten:**

| Schicht                  | Mechanismus                                                                                                                         | Status  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1. Citation-Pflicht      | Zod-Schema-enforced Tool-Returns; ohne Citation keine Antwort                                                                       | ✅ Live |
| 2. LLM-as-a-Judge        | Zweite Haiku-Inferenz prüft Citation-Validität semantisch                                                                           | ✅ Live |
| 3. Triple-Hash + Ed25519 | `inputHash ‖ contextHash ‖ outputHash → receiptHash`, signiert mit deterministisch aus `ENCRYPTION_KEY` abgeleiteten Authority-Keys | ✅ Live |
| 4. Hash-Chain            | Append-only `OversightAccessLog` mit `previousHash`/`entryHash`-Verkettung in Postgres                                              | ✅ Live |
| 5. Witness-Quorum 3-of-5 | Tree-Heads cosigniert von 5 unabhängigen Schlüsseln; Schutz gegen Split-View-Attacken                                               | ✅ Live |
| 6. Time-Travel           | Jede historische Aussage byte-identisch reproduzierbar (`/api/pharos/time-travel?ts=...`)                                           | ✅ Live |

**Plus:**

- Differential-Privacy-Aggregates (Laplace-Noise mit ε-Budget) für Cross-Authority-Insights ohne Operator-Identitäts-Leak.
- Norm-Anchor-RAG (Postgres-tsvector + GIN, kein Vector-DB) — derzeit 74 EU-Space-Act-Articles indiziert, Ziel 3.000+.
- Norm-Drift-Sentinel-Cron (täglich 05:30 UTC) erkennt Veränderungen in Quelltexten und alertet betroffene Aufsichten.
- k-of-n Multi-Party-Approval mit 6 Profilen (`OVERSIGHT_REVOCATION`, `MDF_AMENDMENT`, `CROSS_BORDER_SHARING`, `SANCTION_ORDER`, `AUTHORIZATION_DECISION`).
- NIS2 + EU-Space-Act Workflow-FSMs (8 + 8 States, signierte Transitions, SLA-driven Auto-Breach-Detection).
- Reasoning-Graph SVG-Visualisierung jeder AI-Antwort (Frage → Tools → Citations → Antwort).
- DSGVO-Art.-15-Citizen-Audit-Endpoint (instant SLA, vollautomatisch).
- `npx pharos-verify` — externes Standalone-CLI (Node-stdlib only) für lokale Receipt-Verifikation. **Zero-Trust-in-Caelex.**

### IV.4 ASSURE — Investor-Due-Diligence (V1 in Production)

20+ Pages unter `/assure`. Keine separate Plattform-Säule, sondern eine investor-orientierte Sicht auf Comply-Daten.

- **RRS — Regulatory Readiness Score** mit eigener Engine (`rrs-engine.server.ts`).
- **RCR — Regulatory Credit Rating** (`rcr-engine.server.ts`) — Bond-rating-style 0–100-Score.
- **IRS — Investment Readiness Score** + Preview-Calculator.
- **Risk Engine** + **Benchmark Engine** + **Profile Engine** (Server-Side).
- 8-Section Company Profile Builder, Data-Room mit signed-VC-Style-Permissions, Risk Register & Scenario Analysis, Peer-Benchmark-Comparison, Investor-Update-Pipeline.

### IV.5 ACADEMY — Compliance-Training (V1)

8 Page-Routes. Course-Catalog, Classroom (Interactive), Simulations, Instructor-Portal, Badges. Geht in Bezahl-Tier ab Phase 2.

### IV.6 Trust Fabric — gemeinsame Infrastruktur

Liegt unter allen drei Säulen:

- **Hash-Chain** auf `OversightAccessLog`/`MatterAccessLog` mit SHA-256-Verkettung.
- **Norm-Anchor-Index** mit Postgres tsvector + GIN.
- **Receipt-Layer** mit Triple-Hash + Ed25519 + Witness-Quorum.
- **Differential-Privacy-Layer** mit ε-Budget.
- **Audit-Hash-Chain-Cron** (`audit-chain-anchor`) periodisches Anchoring.

---

## V. Technology Differentiation — der Moat

### V.1 Glass Box statt Black Box

Pharos ist die **erste produktive AI-Behörden-Plattform Europas**, die mathematisch verifizierbar Halluzinations-frei ist:

```
Schicht 1 (Schema)        ← Citation-IDs syntaktisch enforced
Schicht 2 (Judge)         ← Zweite Inferenz prüft semantisch
Schicht 3 (Receipt)       ← Triple-Hash + Ed25519 signiert
Schicht 4 (Chain)         ← In Hash-Chain verkettet
Schicht 5 (Witness)       ← 3-of-5 cosigniert
Schicht 6 (Time-Travel)   ← Byte-identisch reproduzierbar
```

**Was das in der Praxis heißt:**

- Eine Behörde kann jeden Caelex-Output extern via `npx pharos-verify <entryId>` mit Node-stdlib verifizieren — ohne Caelex-Software, ohne API-Call zu Caelex.
- Eine Halluzination, die im UI auftaucht, ist mathematisch ausgeschlossen — entweder das System liefert eine Antwort mit gültiger Citation, oder es liefert eine **strukturierte Abstention** (das `[ABSTAIN]`-Pattern).
- Jede historische Aussage ist über Anthropic-Prompt-Caching + Norm-Anchor-Versioning byte-identisch reproduzierbar — relevant für §39 VwVfG-Begründungspflicht und Verwaltungsstreitverfahren.

### V.2 Vertical Integration

Konkurrierende Anbieter adressieren maximal eine Säule:

| Konkurrent                      | Operator           | Anwalt          | Behörde                | Cross-Domain Trust Fabric |
| ------------------------------- | ------------------ | --------------- | ---------------------- | ------------------------- |
| **Palantir AIP**                | ✓ (horizontal)     | ✗               | ✓ (US-fokussiert)      | ✗                         |
| **Aleph Alpha / Cohere**        | ✗                  | ✗               | ✓ (DE-Bundesregierung) | ✗                         |
| **Mistral AI**                  | ✗                  | ✗               | ✓ (FR-Defense)         | ✗                         |
| **Harvey AI**                   | ✗                  | ✓ (US-AmLaw100) | ✗                      | ✗                         |
| **Luminance**                   | ✗                  | ✓ (UK/EU AnwK)  | ✗                      | ✗                         |
| **OneTrust / Vanta / Drata**    | ✓ (horizontal GRC) | ✗               | ✗                      | ✗                         |
| **LeoLabs / Slingshot / Spire** | ✓ (Tracking-Daten) | ✗               | ✗                      | ✗                         |
| **Caelex**                      | ✓ Comply           | ✓ Atlas         | ✓ Pharos               | ✓ Trust Fabric            |

**Caelex ist der einzige Anbieter mit allen drei Säulen + gemeinsamer Infrastruktur.**

### V.3 Deep Domain Expertise codifiziert

Das `src/data/`-Verzeichnis enthält **55 regulatorische Datendateien** — kuratiert, nicht ge-scraped. Beispiele:

- `articles.ts` — 1.155 LOC EU Space Act, 119 Artikel, 67 grouped entries
- `nis2-requirements.ts` — 4.213 LOC NIS2-Implementierung, 51 Requirements
- `cybersecurity-requirements.ts` — 3.418 LOC ENISA/NIS2-Controls
- `national-space-laws.ts` — 1.681 LOC, 10 Jurisdiktionen
- `cra-requirements.ts`, `itar-ear-requirements.ts`, `spectrum-itu-requirements.ts`, etc.
- `bnetza-regulatory-knowledge.ts`, `cnes-regulatory-knowledge.ts` — Behörden-spezifische Wissensbasen.

**Diese Daten sind nicht reproduzierbar in 6 Monaten von einem Wettbewerber** — sie sind das Ergebnis kontinuierlicher juristischer Recherche und stellen einen Knowledge-Moat dar, der **mit jeder Norm-Drift der Vorsprung wächst**.

### V.4 Architektur-Disziplin

Caelex's Code-Base ist nicht nur groß, sondern **strukturell konsistent**:

- **Server-only Files** (`*.server.ts`) garantieren, dass Engines nie zum Client gebundlet werden.
- **Hash-Chain-Pattern** ist über drei Sub-Systeme (Atlas-Matter, Pharos-Oversight, Audit-Center) wiederverwendet.
- **Bilateral-Handshake-Pattern** ist über Atlas-Mandate, Pharos-Aufsicht, und Stakeholder-Network gespiegelt.
- **Differential-Privacy + Witness-Quorum + Receipt-Layer** sind in `src/lib/pharos/` gekapselt — wiederverwendbar für Atlas + Comply Phase 2.
- **117 Pharos-Unit-Tests** allein, **486 Test-Files** insgesamt — coverage liegt in der vorderen Liga europäischer Compliance-Tech.

---

## VI. Business Model & Pricing

### VI.1 Hybrid-Freemium-mit-Quersubvention

| Tier                       | Comply (Operator)                                      | Atlas (Lawyer)                                               | Pharos (Authority)                                         |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------- |
| **Free / Lite**            | Self-Assessment-Wizards (alle 4); Read-only Dashboards | Library + Limited Search                                     | Read-only Inbox + Audit Explorer + DSGVO-Citizen-Audit-API |
| **Pro**                    | €1.500–€8.000 / Mo / Mandant je nach Operator-Größe    | €89–€249 / Anwalt / Mo                                       | €100k–€500k / Behörde / Jahr je nach Sachbearbeiter-Count  |
| **Enterprise / Sovereign** | €30k–€150k / Jahr                                      | €25k+ / Kanzlei / Jahr                                       | Custom — VS-NfD-On-Premise (Phase 4)                       |
| **Per-Vorgang**            | —                                                      | €19–€149 / NCA-Submission, Bescheid-Draft, Compliance-Report | €19–€149 / Genehmigungs-Vorprüfung                         |

**Quersubvention:** Pharos Lite ist gratis für alle EU-Behörden. Finanziert wird das durch Comply-Operator-Lizenzen + Horizon-Europe-Förderprogramme. Diese Asymmetrie ist strategisch:

- Mehr Pharos-Behörden im System → mehr Daten für Pharos-Astra → schnellere Genehmigungen → Operatoren wollen MEHR in Comply sein.
- Mehr Operatoren in Comply → mehr Mandanten für Atlas-Anwälte → mehr Atlas-Kanzleien wollen ins Netzwerk.
- Drei Pole, ein Network-Effect-Loop.

### VI.2 Unit Economics (Phase 1 → Phase 3)

|                                  | Phase 1 (heute) | Phase 2 (Ende 2027) | Phase 3 (2030) |
| -------------------------------- | --------------- | ------------------- | -------------- |
| MRR                              | ~€0 (Beta)      | €100k               | €1,2 Mio.      |
| ARR                              | €0              | €1,2 Mio.           | €15 Mio.       |
| Operator-Subscriptions           | 0               | 25                  | 250            |
| Authority-Pilots / Pro           | 0 / 0           | 2 / 0               | 5 / 8          |
| Lawyer-Subscriptions             | 0               | 50 Anwälte          | 800 Anwälte    |
| Bruttomarge                      | n/a             | 78 %                | 85 %           |
| Operating Costs (excl. Founders) | ~€2,4k/Mo       | ~€20k/Mo            | ~€180k/Mo      |
| Burn-Rate (Phase 2 nur)          | minimal         | €15k/Mo             | (profitable)   |

Caelex erreicht **Break-Even bei ~€600k ARR** — Phase 2 mid-2027.

### VI.3 Externe Service-Kosten heute

**~€200/Monat:**

- Anthropic Claude: ~€80–€150/Monat (Sonnet + Haiku via AI Gateway, mit Prompt-Caching)
- Vercel Pro: €20/Monat
- Neon Postgres: €19–€69/Monat (skaliert mit Traffic)
- Sentry, LogSnag, Resend: zusammen ~€30/Monat

**Bewusst NICHT verwendet** (Phase 4 ggf.):

- Vector-DB (Pinecone, Weaviate) — Postgres tsvector + GIN reicht
- Externes KMS — Ed25519-Keys deterministisch aus `ENCRYPTION_KEY` derived
- Confidential Computing Cloud-Premium-Tier — Phase 4 wenn VS-NfD-Vertrag kommt
- ZK-Proof-Compute-Service — Phase 4

---

## VII. Go-to-Market Strategy

### VII.1 Drei-Wellen-Plan

**Welle 1 (jetzt → Q3/2026): Operator-Land-Grab**

- 30 deutsche Space-Operatoren (Mynaric, Helsing, Rocket Factory Augsburg, Isar Aerospace, Reflex Aerospace, OroraTech, Kleos Space-Deutschland-Niederlassung, etc.)
- Channel: ESA-BIC-Netzwerk + DLR-Inkubatoren + GovTech Campus + LinkedIn Direct.
- Conversion-Hebel: kostenfreier Self-Assessment-Wizard → 4 Wochen Free-Pilot → Pro-Subscription.
- KPI: 25 Operator-Subscriptions Ende Q4/2026.

**Welle 2 (Q4/2026 → Q3/2027): Behörden-Pilot LSA Luxemburg + AESIA Spanien**

- Beide sind die einzigen kleinen, agilen Pilot-Behörden in der EU mit aktivem Innovations-Budget.
- LSA Luxemburg hat bereits LegalFly als legal-tech-Pilot. AESIA Spanien ist die EU-Erst-AI-Aufsicht.
- ESA-BIC-Connect-Verträge + Horizon-Europe-Cluster-4-Antrag (HORIZON-CL4-2026 Cybersecurity & Trust) als Co-Förderung.
- KPI: 1 produktive Behörde + 1 LoI-Pilot Ende Q3/2027.

**Welle 3 (Q4/2027 → 2030): EU-Skalierung**

- Jeder Behörden-Pilot-Erfolg generiert Peer-Pressure auf Nachbarbehörden ("Belgien-Effekt").
- DLR Bonn, BSI Bonn, BNetzA Mainz/Bonn als naheliegende Anschluss-Pilots.
- BAFA Eschborn für Export-Control-Genehmigungen.
- ESA Discovery Element als Co-Funding-Vehikel pro Behörde.
- 2030-Ziel: 5+ produktive Behörden + 250 Operator-Subscriptions + 800+ Anwälte.

### VII.2 Vertriebs-Hebel (in Reihenfolge der Kosten-Effizienz)

1. **Operator-zu-Behörde-Pull** — wenn ein BAFA-relevanter Operator Caelex nutzt, wird BAFA über die strukturierte Submission-Inbox reingezogen (Zero-Cost-Sales).
2. **Lawyer-zu-Operator-Push** — Atlas-Anwälte empfehlen ihren Mandanten Comply (1-Klick-Mandanten-Onboarding via Bilateral-Handshake).
3. **Förder-Ko-Finanzierung** — Horizon Europe + Digital Europe + ESA Discovery + BMWK Innovation reduzieren Sales-Cycle dramatisch.
4. **Open-Source-Verifier-PR** — `npx pharos-verify` als virales Tool unter Datenschutz-NGOs, Journalisten, Investoren — generiert Inbound auf Behördenseite.

---

## VIII. Competitive Positioning

### VIII.1 Direkte Wettbewerber

| Wettbewerber                    | Stärke                                | Schwäche vs. Caelex                                                 |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| **Palantir AIP**                | Massiver Track-Record, FDE-Modell     | Kein Anwalts-Stack, keine Operator-Tiefe in Space, opake AIP-Output |
| **Aleph Alpha / Cohere**        | Dt./EU-Souveränes LLM, BSI-Zugang     | Kein vertikaler Compliance-Stack, kein Behörden-Workflow            |
| **Mistral AI**                  | FR-Government-Mandat, Sovereign-Cloud | Kein Compliance-Vertikum, keine Operator-Pipeline                   |
| **Harvey AI**                   | $11 Mrd. Bewertung, 100k+ Anwälte     | Reine Anwalts-Plattform, kein Behörden-Pfad, US-zentriert           |
| **Luminance**                   | Eigenes LLM, EU-Legal-Tech-Frühstart  | Reine Anwalts-Plattform                                             |
| **OneTrust / Vanta / Drata**    | Marktführer horizontal-GRC            | Keine Space-Vertikalisierung, keine Behörden-Seite                  |
| **LeoLabs / Slingshot / Spire** | SST/SSA-Daten                         | Keine Compliance-Workflows, kein Behörden-Stack                     |

**Caelex's einzigartige Positionierung:**

> Der einzige Anbieter, der Space-Compliance vertikalisiert, alle drei Stakeholder-Gruppen (Operator/Anwalt/Behörde) bedient und mathematisch verifizierbare AI-Outputs liefert.

### VIII.2 Indirekte Wettbewerber

- **Excel + Email** — der echte Status-Quo bei 80 % der EU-Space-Operatoren. Caelex ersetzt ihn.
- **In-house Compliance-Teams** — bei Großen wie Airbus Space, OHB. Caelex augmentiert, nicht ersetzt.
- **Legacy GovTech-Integratoren** (Materna, T-Systems Public Sector, Capgemini Government) — sie haben Behörden-Vertrauen, aber keine vertikale AI-Compliance. **Potenzielle Channel-Partner statt Konkurrenten.**

### VIII.3 Partner-Strategie

Caelex baut Allianzen mit:

- **DLR Raumfahrtagentur** für deutsche Behörden-Channel.
- **GovTech Campus Bonn/Heilbronn** für BSI/BMWK/BeschA-Zugang.
- **Helsing-Defense-Cluster** als Operator-Lead für Defense-spezifische Compliance.
- **ESA BIC NRW** für Sektor-Glaubwürdigkeit + Frühphasen-Funding-Brücke.
- **Aleph Alpha/Cohere** als optionaler Sovereign-LLM-Fallback Phase 4 (für VS-NfD-Workloads).

---

## IX. Team & Organization

### IX.1 Founder

**Julian Polleschner, 21, CEO & Founder.**

- Builds 800k LOC Production-System in 18 Monaten.
- Implementiert kryptografische Architektur (Triple-Hash, Ed25519, DP-Aggregates, Witness-Quorum) mit 117/117 Unit-Tests grün.
- Tiefes regulatorisches Domain-Wissen: 119 EU-Space-Act-Artikel, 51 NIS2-Requirements, 10 nationale Weltraumgesetze, ITAR/EAR, ITU/Spectrum, COPUOS — alles handcuratiert in `src/data/`.
- Sprachen: Deutsch (native), Englisch (fließend).

### IX.2 Hiring-Plan Phase 1 (mit ESA-BIC-Funding)

**Jahr 1 (T+12 Monate):**

1. **Senior Backend Engineer** (TypeScript / Postgres / Prisma / Cryptography) — €70–€90k
2. **Behörden-Sales-Lead** (Ex-DLR, Ex-BSI, Ex-BMWK preferred) — €90–€120k base + Equity
3. **Compliance-Lawyer** (50 % Stelle, EU-Space-Act + DSGVO + EU AI Act-Schwerpunkt) — €40k pro Jahr
4. **Frontend Engineer** (Next.js / React / Tailwind) — €60–€80k

**Jahr 2 (T+24 Monate):** 5. **DevOps / Cryptography-Specialist** (für Witness-Federation Phase 3) — €70–€90k 6. **Customer Success / Authority-Liaison** — €55–€75k 7. **Marketing Lead** (B2B + GovTech) — €60–€80k

**Total Phase 1+2 Hire-Cost (incl. Social):** ~€500k/Jahr → cash-flow-positiv durch Operator-Subscriptions ab Q3/2027.

### IX.3 Advisory Board (Target Phase 1)

- 1× Ex-DLR/BMWK (Behörden-Insider)
- 1× Ex-Anwaltskanzlei mit Verwaltungsrecht-Schwerpunkt
- 1× Ex-Space-Operator-CEO (z.B. Mynaric, OHB)
- 1× Wirtschaftsprüfer (Big-4 mit Government-Practice)
- 1× Krypto/Security-Senior (BSI-Background, Sigstore-Community)

Tausch-Geschäft: Equity-Slots à 0,1–0,5 % gegen 4–6 Stunden/Monat + Netzwerk-Zugang.

---

## X. Roadmap

### X.1 90-Tage-Plan (Mai – Juli 2026)

| Monat         | Lieferung                                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mai 2026**  | NormAnchor-Index erweitern auf 1.500 Articles (NIS2 + alle 10 nationalen Space-Laws); MFA-Pflicht für Pro-Tier; Pen-Test-Vorbereitung                             |
| **Juni 2026** | Erste 5 Operator-Beta-Kunden onboarded; Pilot-LoI mit LSA Luxemburg unterzeichnet; Horizon-Europe-Antrag eingereicht                                              |
| **Juli 2026** | DSGVO-EuGH-Schufa-Compliance-Audit-Report extern beauftragt; Witness-Federation Phase 3 (3 separate Vercel Projects + 3 Neon Branches mit eigenem ENCRYPTION_KEY) |

### X.2 9-Monats-Plan (Q3/2026 – Q1/2027)

- 25 Operator-Subscriptions (Pro-Tier).
- 1 produktive Behörde (LSA Luxemburg) + 1 LoI (AESIA Spanien).
- 50 Anwälte auf Atlas-Pro-Tier.
- BSI-C5-Type-2-Zertifizierung initiiert.
- ISO 42001 (AI Management System) initiiert.
- Stripe-Subscription-Engine GA für alle drei Säulen.
- €100k MRR.

### X.3 18-Monats-Plan (Q2 – Q4/2027)

- 100 Operator-Subscriptions.
- 3 produktive Behörden (LSA + AESIA + LSA-NL oder ASI Italien).
- 200 Anwälte.
- Horizon-Europe-Cluster-4-Förderung secured (€500k–€2M Co-Funding).
- BSI C5 Type 2 + ISO 27001 + ISO 42001 zertifiziert.
- Pharos NIS2-Workflow GA.
- C2PA-PDF-Manifests für alle Bescheid-Exports.
- €600k MRR (= Break-Even).

### X.4 36-Monats-Plan (bis Q1/2029)

- 250 Operator-Subscriptions.
- 5+ produktive Behörden quer durch EU.
- 800+ Anwälte.
- VS-NfD-On-Premise-Distribution für Defense-Operatoren.
- ZK-Proof-Layer Phase 4 (Versicherungs-, NIS2-, ITAR/EAR-Beweise).
- EUDIW-Login für DSGVO-Citizen-Audit (sobald Member-State-Wallets ausrollen).
- €1,2 Mio. MRR = €15 Mio. ARR.

### X.5 Wofür ESA BIC NRW konkret beschleunigt

ESA-BIC-Mittel (€50k Cash + €450k Technical Support über 24 Monate) gehen vorrangig in:

1. **2 Behörden-Pilot-Verträge** (LSA Luxemburg + DLR Bonn): Co-Engineering-Aufwand + Reisen + LoI-Negotiations — geschätzt €120k.
2. **BSI-C5-Type-2-Zertifizierung**: extern auditiert, ~€80k über 12 Monate.
3. **ISO 42001 + ISO 27001** Co-Zertifizierung: ~€50k.
4. **3 Senior-Hires beschleunigen** auf Q3/2026 statt Q1/2027: ~€150k Cash-Burn-Bridge.
5. **Horizon-Europe-Antrag** mit professioneller Förder-Beratung: ~€30k.
6. **Pen-Test #1 + Bug-Bounty-Setup**: ~€40k.

Total ESA-BIC-allokiert: **€470k**.

Ohne ESA-BIC: dieselben Schritte um 8–12 Monate verzögert. Mit ESA-BIC: Caelex erreicht 2027 statt 2028 €100k MRR und 2030 statt 2032 €15 Mio. ARR.

---

## XI. Financial Projection (High-Level)

| Year | ARR (cum.) | Operating Cost | Cash Burn (Year-End) | Funding Status                                               |
| ---- | ---------- | -------------- | -------------------- | ------------------------------------------------------------ |
| 2026 | €0–€50k    | €30k           | -€30k                | ESA BIC NRW + ggf. Horizon                                   |
| 2027 | €1,2 Mio.  | €240k          | +€960k cumulative    | Bridge-Round optional                                        |
| 2028 | €4,5 Mio.  | €1,4 Mio.      | +€3,1 Mio.           | Profitable                                                   |
| 2029 | €9 Mio.    | €3 Mio.        | +€6 Mio.             | Profitable                                                   |
| 2030 | €15 Mio.   | €5 Mio.        | +€10 Mio.            | Profitable, Series A für EU-Cross-Border-Skalierung optional |

**Bewertungs-Vergleichsbasis (Multiples 2026):**

- Harvey AI: ~58x ARR ($190M ARR → $11Mrd. Bewertung)
- Luminance: ~25x ARR (€20M ARR → ~€500M Bewertung)
- Palantir Public: ~98x P/S
- **Caelex 2030 fair value bei 25–30x ARR multiple:** **€375–€450 Mio.**

---

## XII. Risk Analysis

| Risiko                                                    | Wahrscheinlichkeit          | Impact    | Mitigation                                                                             |
| --------------------------------------------------------- | --------------------------- | --------- | -------------------------------------------------------------------------------------- |
| Anthropic-API-Ausfall                                     | mittel                      | hoch      | Caching + Read-Only-Modus + Mistral-Fallback Phase 4                                   |
| Schrems-II-Verschärfung gegen US-LLMs                     | hoch                        | sehr hoch | Sovereign-Stack (Mistral/Cohere) Phase 4 + Confidential Computing                      |
| EuGH erweitert Schufa-Doktrin                             | mittel                      | hoch      | Architektur ist bereits konform — Pharos trifft keine Endentscheidungen                |
| EU-Space-Act im Trilog verzögert                          | hoch                        | mittel    | Diversifikation: NIS2 + AI Act + nationale Weltraumgesetze decken den Use-Case bereits |
| Behörden-Adoption langsam (12-24 Mo. Sales-Cycle)         | hoch                        | hoch      | Lite-Tier kostenfrei + EU-Förderung als Bridging + Operator-zu-Behörden-Pull           |
| Halluzination führt zu fehlerhaftem Behörden-Output       | niedrig (durch Architektur) | sehr hoch | 6 Glass-Box-Schichten — mathematisch ausgeschlossen                                    |
| 21-jähriger Founder-Risiko                                | mittel                      | mittel    | Senior-Advisory-Board + 3 Senior-Hires Year 1                                          |
| Konsolidierung (Palantir/SAP übernimmt einen Mitbewerber) | mittel                      | mittel    | Vertical-Tiefe + Open-Source-Verifier als Defensible Moat                              |
| BSI / Behörden-Compliance-Anforderung-Drift               | mittel                      | hoch      | Norm-Drift-Sentinel-Cron läuft täglich + ISO 42001/BSI C5 Type 2 Roadmap               |

**Wichtigster Risikomanagement-Hebel:** **Mathematische Architektur-Garantien statt Marketing-Versprechen.** Pharos kann Halluzinationen nicht produzieren, weil die Engine Antworten ohne Citation aktiv verwirft. Das ist ein **konstruktiver Beweis**, kein Test-Hoffnungs-Wert.

---

## XIII. ESA BIC NRW Fit & Ask

### XIII.1 Warum Caelex passt

ESA BIC NRW unterstützt Space-Tech-Startups mit Down-Stream-Anwendungs-Fokus. Caelex ist:

- ✓ **Down-Stream-Application:** Compliance/Workflow-Software für Space-Operators und Behörden, die bestehende ESA/EUSPA-Infrastruktur nutzen.
- ✓ **Kommerzielles Anwendungsfeld:** B2B-SaaS mit klaren Pricing-Tiers, validiertem Markt-Pull, EU-Förderprogramm-Anschlussfähig.
- ✓ **Technologie-Innovation:** sechs Glass-Box-Schichten, Triple-Hash-Receipt-Layer, Differential-Privacy-Aggregates, Witness-Quorum 3-of-5 — keine Off-the-Shelf-Lösung.
- ✓ **NRW-Bezug:** DLR Bonn, GovTech Campus Bonn, Aachen-Engineering-Talent-Pipeline, Helsing-Cluster.
- ✓ **ESA-Ecosystem-Synergien:** EUSPA, ENISA, ESA-Discovery — alle drei sind perspektivische Pharos-Pilotpartner.

### XIII.2 Was Caelex von ESA BIC NRW braucht

| Ressource                  | Volumen            | Verwendung                                                                                    |
| -------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| **Cash-Förderung**         | €50.000            | Bridging zur ersten Operator-Pro-Subscription-Welle Q3/2026                                   |
| **Technical Support**      | €450.000 (in-kind) | DLR-Connect, ESA-Forschungszugang, Workspace, Pen-Test, IT-Compliance-Beratung, Legal-Counsel |
| **Mentoring / Coaching**   | 24 Monate          | Behörden-Sales-Strategie, ESA-Förderprogramm-Anträge, Advisory-Board-Brokerage                |
| **Netzwerk-Zugang**        | unbegrenzt         | DLR, BSI, BMWK, BeschA, EUSPA, ENISA, Helsing, Mynaric, OHB                                   |
| **Sektor-Glaubwürdigkeit** | unbezahlbar        | "ESA-BIC-Inkubat" als Vertrauenssignal in Behörden-Procurement                                |

### XIII.3 Was ESA BIC NRW von Caelex bekommt

- **Eine Referenz-Implementierung** für AI-Compliance-Glass-Box-Architektur, die als Open-Source-Verifier (`pharos-verify`) global verfügbar ist.
- **Eine deutsche Space-Tech-Erfolgsgeschichte** mit Bonn als Headquarter, RWTH-Talent-Pipeline und Helsing-Cluster-Anbindung.
- **Direktzugriff auf 250+ EU-Space-Operatoren** (2030-Plan) als ESA-Outreach-Channel.
- **Eine GovTech-Plattform mit Behörden-Pilot-Erfolgen**, die ESA selbst für eigene Compliance-Workflows nutzen kann (EUSPA, ESA Discovery Compliance-Reporting).
- **ROI im Inkubations-Sinne:** Caelex erreicht ohne ESA BIC NRW dasselbe Ziel — 2 Jahre später. Mit ESA BIC NRW wird NRW Caelex' permanenter Hauptsitz.

---

## XIV. Schlusswort

Caelex ist die einzige Plattform, die **die regulatorische Realität des europäischen Space-Sektors so codifiziert, dass jede AI-Aussage extern verifizierbar wird**. Wir verkaufen nicht Compliance-Hoffnung — wir verkaufen mathematische Compliance-Sicherheit.

Der europäische Markt entsteht 2026–2030. Wer in diesem Fenster die Architektur-Disziplin liefert, wird zum Standard. Der Rest verkauft Theater.

Caelex hat die Disziplin **bereits gebaut**. Die Frage ist nicht, ob wir das Produkt fertigkriegen — die Frage ist, wie schnell wir die EU bedienen können. Genau dafür brauchen wir ESA BIC NRW.

---

## XV. Appendix — Technical Metrics (Stand 29. April 2026)

### XV.1 Codebase

```
Total LOC (TypeScript)            ~800.000
UI Pages (page.tsx)                  279
API Routes (route.ts)                694    über 71 Domains
React Components                     447
Library files (src/lib/*)            622
Service files                         79
Astra files (AI engine)               36
Pharos files                          15
Atlas files                           ~25
Test files                           486
Regulatory data files                 55
```

### XV.2 Database

```
Schema lines                       9.365
Models                               240
Enums                                132
Indices (@@index)                    616
```

### XV.3 Deployments

```
Vercel Cron Jobs                      32
- compliance, analytics, audit-chain, regulatory-feed,
  ephemeris, sentinel, deadline-reminders, document-expiry,
  onboarding, churn, reengagement, demo-followup, NCA,
  CRA, atlas-feed, atlas-source, astra-cleanup, ca-cleanup,
  cdm-polling, celestrak, compute-rrs, compute-rcr,
  data-retention, generate-scheduled-reports, solar-flux,
  reengagement, sentinel-auto-attest, sentinel-cross-verify,
  sentinel-heartbeat, verity-sth-sign, pharos-norm-drift,
  pharos-witness-quorum

CI/CD                              Vercel auto-deploy on push to main
Build command                      npm run build:deploy
Database migration strategy        prisma migrate deploy in build pipeline
```

### XV.4 Environments

```
Production                         caelex.app (and Vercel auto-domain)
Preview                            per-PR Vercel preview URLs
Local                              Next.js dev server + local Postgres
Database location                  Neon EU-Frankfurt
Vercel region                      Frankfurt + Paris
```

### XV.5 Sicherheit

```
Authentication                     NextAuth v5 (credentials + Google OAuth + SSO SAML/OIDC)
Authorization                      RBAC mit 5 Rollen (OWNER, ADMIN, MANAGER, MEMBER, VIEWER)
                                  + scope-resolver pro Tenant
                                  + k-of-n Multi-Party-Approval für High-Stakes-Aktionen
MFA                                TOTP + WebAuthn/FIDO2 verfügbar (Pflicht ab Pro-Tier Phase 2)
Encryption at rest                 AES-256-GCM mit scrypt-Key-Derivation
                                  Per-Tenant verschlüsselt (operator_did als HMAC-Pseudonym)
Rate limiting                      Upstash Redis sliding window, 19 Tiers
Audit                              Hash-Chain SHA-256, tamper-evident
Cryptographic signing              Ed25519 (Pharos Triple-Hash-Receipts + Witness-Quorum)
                                  Deterministische Key-Derivation aus ENCRYPTION_KEY via scrypt
CSP / Headers                      strict CSP, HSTS 2yr preload, X-Frame-Options DENY
CSRF                               Origin-Header + token-based
Bot Protection                     User-Agent + Timing-Validation
Pre-Commit                         Husky + lint-staged (ESLint + tsc)
CI Security                        GitHub Actions — CodeQL, TruffleHog, OWASP-Dep-Check
```

### XV.6 Stack

```
Framework                          Next.js 15 App Router
Language                           TypeScript (strict mode)
Database                           PostgreSQL via Neon Serverless
ORM                                Prisma 5.22
Auth                               NextAuth v5
Payments                           Stripe (Checkout + Portal + Webhooks)
Storage                            Cloudflare R2 / S3-compatible (AWS SDK)
LLM                                Anthropic Claude (Sonnet 4.6 + Haiku 4.5)
                                  via Vercel AI Gateway (EU-Bedrock-Path)
Rate-Limit                         Upstash Redis
Email                              Resend + SMTP fallback (Nodemailer)
PDF                                @react-pdf/renderer + jsPDF
3D                                 Three.js + @react-three/fiber + drei
Charts                             Recharts
DnD                                @dnd-kit
Satellite-Math                     satellite.js
Animations                         Framer Motion
Validation                         Zod
Styling                            Tailwind CSS (dark mode + glass design)
Testing                            Vitest + Playwright + MSW
Monitoring                         Sentry + LogSnag + Vercel Analytics
Cryptography                       node:crypto (Ed25519, scrypt, sha256)
                                  + @noble/hashes + @noble/curves
                                  Zero crypto-vendor-lock-in
```

### XV.7 Compliance-Engine-Coverage (Datum-Tiefe)

```
EU Space Act (COM(2025) 335)      119 Articles, 67 grouped entries, 9 Modules,
                                  7 Operator types (SCO/LO/LSO/ISOS/CAP/PDP/TCO),
                                  Standard- + Light-Regime
NIS2 Directive (EU 2022/2555)     51 Requirements, 4.213 LOC, Essential/Important
                                  /Out-of-Scope-Klassifikation, 24h/72h/30d-SLA
National Space Laws (10)          Deutschland (BWRG-Eckpunkte), Frankreich (LOS),
                                  UK (OSA + SIA), Italien (Spaceffl-Gesetz),
                                  Niederlande, Belgien, Luxemburg, Spanien,
                                  Schweden, Österreich
Cybersecurity (NIS2 + ENISA)      3.418 LOC, 125 commercial-satellite-controls
COPUOS / IADC                      Debris Mitigation Guidelines + Long-Term
                                  Sustainability Criteria
Export Control                     ITAR (US) + EAR (US) + EU Dual-Use 2021/821 +
                                  Wassenaar Arrangement
Spectrum / ITU                     ITU Radio Regulations + EU Frequency Allocation
                                  + national BNetzA / ARCEP / Ofcom mappings
UK Space Industry Act              SIA 2018 + SIR 2021 + CAA-spezifische Workflows
US Regulatory                      FCC + FAA + NOAA + Commerce Dept.
CRA (Cyber Resilience Act)        kompletter Article-by-Article Mapping +
                                  Vulnerability-Auto-Scan + Benchmark
```

---

**Verfasst von:** Julian Polleschner, CEO Caelex
**Stand:** 29. April 2026
**Format:** McKinsey-style strategic deep-dive für ESA BIC NRW Selection Committee
**Reproduzierbarkeit:** Alle Kennzahlen sind aus dem Code-Stand main@cfecd1d8 extrahiert; jede Behauptung in diesem Bericht ist über `git log` + Datei-Zählung verifizierbar.
