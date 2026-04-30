# Caelex Comply — Architecture Deep Research 2026

**Stand:** 30. April 2026
**Methodik:** 5 parallele Research-Streams (echte Web-Recherche, keine Trainingsdaten) auf:

1. AI-Trust & Black-Box-Architektur (EU AI Act, GDPR Art. 22, ISO 42001, Decision-Logging-Patterns)
2. GRC-SaaS Competitive Architecture (Drata, Vanta, Anecdotes, Hyperproof, OneTrust, Hadrian)
3. Legal/Regulatory Coverage Audit (was Caelex SELBST erfüllen muss)
4. Build-vs-Buy / Composable Stack (Auth, Workflow, Audit-Log, AI, Storage, Certs)
5. Future-Proof Data Foundations (Bi-Temporal, Event-Sourcing, Tamper-Evidence, W3C VC, EUDIW)

**Zweck:** Strategische Antwort auf die Gründer-Fragen:

> "Es soll genial sein, es soll zukunftsfähig sein. Sind die Workflows richtig?
> Erfüllen wir alle rechtlichen Sachen? Ist das Black-Box-Problem gelöst?
> Ist es smart, alles selbst zu bauen?"

Dieses Dokument ist die durchgerechnete Antwort.

---

## Executive Summary

### Die fünf Befunde, die jetzt eine Entscheidung brauchen

1. **EU AI Act schlägt am 2. August 2026 ein** (in 3 Monaten). Astra V2 fällt mit hoher Wahrscheinlichkeit unter Annex III "essential services / critical digital infrastructure". Strafrahmen bis **15M EUR / 3% Konzernumsatz** (Art. 99). Das `AstraProposal`-Konzept ist **die richtige architektonische Antwort** — aber 6 konkrete Bausteine fehlen heute (Hash-Chain auf Proposal-Ebene, Reproducibility-Snapshot, AI-Disclosure-UI, Anti-Rubber-Stamping-UI, Logging-Retention ≥180d, FRIA-Template). 4-6 Wochen Implementierung; ohne dieses Sprint-Paket ist Caelex am 03.08.2026 in der EU AI Database mit "high-risk-System ohne Konformitätsbewertung" gelistet — öffentlich.

2. **Caelex hat heimlich zwei Foundation-Bets gewonnen, die der Markt nicht spielt.** `VerityLogLeaf` + `VerityLogSTH` sind RFC-6962-konforme Merkle-Trees mit Ed25519-STH — das ist **Sigstore-/Trillian-Niveau**. Drata/Vanta haben Hash-Logs, aber keine Witness-Cosignature-Story. Mit einer 4-Wochen-Investition (C2SP `tlog-witness` + OpenTimestamps Quarterly-Anchor) wird das zum **kategoriedefinierenden USP** — "BAFA witnesses your compliance log" als Pharos-Pitch.

3. **Build-vs-Buy: Drei sofortige Switches mit massivem Hebel.** (a) **Astra → AWS Bedrock EU** (3 Tage Code, unblockt BMWK/DLR/Bundeswehr-Pipeline weil Anthropic-direkt **keine** EU-Inferenz hat = Schrems-II-Risiko). (b) **NextAuth → WorkOS** für SSO/SCIM (3-4 Wochen, jeder Enterprise-Procurement verlangt das). (c) **Vercel Workflow DevKit** (GA seit 16.04.2026) **oder Inngest** ersetzt `defineAction`-Glue für 7d-Pending-Proposals und NIS2-24h/72h/30d-Phasen — heute silently lossy bei Function-Restarts.

4. **Caelex muss SELBST eine Compliance-Festung werden, nicht nur eine bauen.** Die Liste an Pflichten Caelex-für-sich-selbst (DSGVO Art. 28 DPA + DPIA, EU AI Act, NIS2 Lieferketten-Klauseln, DORA-Klauseln sobald Insurance-/Investor-Kunde, eIDAS QES für Verity, ISO 27001:2022, SOC 2 Type II, Tech E&O Versicherung) ist **mindestens 12 Monate Arbeit**. Year-1-Budget: ~50-90k EUR (Drata + Auditor + Anwalt + Versicherung). Heute praktisch keine davon adressiert.

5. **Ein Foundation-Schuldenposten der bis 2030 unverhandelbar wird: Bi-Temporalität.** Wenn ein Auditor 2034 fragt "war Operator X im März 2027 compliant nach den damals geltenden Regeln, basierend auf den damals vorliegenden Evidenz-Snapshots?" — heute strukturell nicht beantwortbar. Postgres 18 Temporal Tables (verfügbar seit Sept 2025, Neon-supportet seit Q1 2026) löst das mit ~8 Wochen Eng-Arbeit für die Top-10-Compliance-Models. **Heute klein, in 3 Jahren ein 6-Monats-Refactor.**

### Was Caelex BEREITS richtig macht (nicht aufgeben)

- **`defineAction()`-Pattern als atomare Mutation** — sauberer als Drata/Vanta-Public-Engineering-Posts zeigen. Behalten als unterste Schicht.
- **AstraProposal mit `decisionLog`** — die einzelne erwähnenswerte Konkurrenz (Vanta Agent 2.0, Drata AIQA) zeigt das Pattern wortgleich, aber **niemand hat es so sauber als Code-Pfad-Trennung** (`call` vs `applyApprovedProposal` vs `serverAction`).
- **SHA-256-Hash-Chain in `audit-hash.server.ts`** + RFC-6962-Logs in `VerityLogLeaf` — Trillian-Niveau, nicht "Drata-mit-Hashes".
- **Postgres + Prisma + Server-Components-Architektur** — 30-Jahres-Bet richtig getroffen.
- **Multi-Actor-Modell (Operator/Counsel/Authority/Investor)** — schon in Schema codifiziert. **Niemand sonst.**
- **12 Compliance-Engines + Domain-Daten** (119 EU-Space-Act-Articles, 51 NIS2-Reqs, 10 Jurisdictions) — das ist das **Produkt**.

### Was Caelex VERMEIDEN sollte (Hype-Driven-Verirrungen)

- Komplett-Migration zu XTDB/Datomic (Postgres 18 + Temporal Tables liefert 90% des Bi-Temporal-Werts ohne JVM-Stack-Migration)
- Confidential Computing als Standard-Feature (Cost-Killer, kein Customer der's heute zahlt; Verschlusssachen-Customer brauchen On-Prem, nicht Enclave-in-Cloud)
- Event-Sourcing für ALLES (Greg Young's eigene Warnung; Hybrid: nur `ComplianceItem` + `AuthorizationWorkflow`)
- Eigenes EUDIW-Wallet (18 Monate ohne USP — Caelex ist Issuer + Verifier)
- Bitcoin-Anchoring "weil cool" (nur via OpenTimestamps free tier; keine eigene Chain, kein Smart-Contract)
- CRDT für globale State-Engine (nur 2-3 dedizierte Co-Editing-Surfaces)
- UCF (Unified Compliance Framework) lizenzieren (5-stellig/Jahr; **SCF Secure Controls Framework gratis und NIST-blessed**)

---

## 1. Die Regulatorische Uhr — Hard Deadlines bis 2028

| Datum            | Trigger                                                            | Pflicht                                                                                                                                                                                 | Caelex-Konsequenz                                             |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **02.02.2025** ✓ | EU AI Act AI-Literacy + prohibited practices in force              | bereits Pflicht                                                                                                                                                                         | "AI Literacy"-Schulungs-Doku für eigenes Team                 |
| **02.08.2025** ✓ | EU AI Act GPAI-Provider-Pflichten                                  | Anthropic ist betroffen, nicht Caelex direkt                                                                                                                                            | DPA + Sub-Processor-Mapping zu Anthropic prüfen               |
| **17.01.2025** ✓ | DORA in force                                                      | Caelex selbst nicht direkt — aber **jeder Versicherungs-/Investor-Kunde** zieht ICT-TPRM-Klauseln nach                                                                                  | Standard-DORA-Klausel-Annex zum SaaS-MSA bauen                |
| **15.01.2026** ✓ | AWS European Sovereign Cloud GA (Brandenburg)                      | optional adopt                                                                                                                                                                          | Migration-Pfad für Sovereign-/Defense-SKU                     |
| **18.11.2025** ✓ | ESA designiert erste 19 CTPPs unter DORA                           | Caelex selbst NICHT als CTPP designiert (zu klein) — aber TPRM-Klauseln pro Customer                                                                                                    | Annex aktivieren                                              |
| **06.03.2026** ✓ | NIS2-DE BSI-Registrierungs-Deadline                                | Caelex unter Schwelle (≥50 MA / ≥10M EUR) — aber Customer-Pflicht                                                                                                                       | Lieferanten-Audit-Antworten vorbereiten                       |
| **02.08.2026**   | **EU AI Act high-risk-Pflichten greifen**                          | Art. 9 Risk Management, Art. 10 Data Governance, Art. 11 Technical Doc, Art. 12 Logging ≥6mo, Art. 13 Transparency, Art. 14 Human Oversight, Art. 17 QMS, Art. 49 Registration EU AI DB | **Astra V2 ist betroffen.** 6-Punkte-Sprint vor diesem Datum. |
| **11.09.2026**   | Cyber Resilience Act erste Teil-Deadline (Vulnerability Reporting) | Bei Software-Distribution ("widget", MCP-Server, Sovereign-SKU)                                                                                                                         | Vulnerability-Disclosure-Policy + CSIRT-Anbindung             |
| **Q4 2026**      | EUDIW-Wallets EU-Member-State-Bereitstellungs-Deadline             | Caelex selbst nicht Wallet-Provider — aber Issuer+Verifier-Pflicht für Cross-Border                                                                                                     | W3C VC Migration für Verity-Attestations                      |
| **11.12.2027**   | Cyber Resilience Act volle Compliance                              | Konformitätserklärung, CE-Marking, SBOM, 5+ Jahre Lifecycle-Updates                                                                                                                     | Sovereign-SKU + MCP-Server müssen CRA-konform sein            |
| **2028+**        | EUDIW Mandatory-Acceptance für regulated relying parties           | Behörden-Submissions per QEAA                                                                                                                                                           | QES-Tier-Verity-Attestations                                  |

### Kombiniertes Penalty-Stacking (Worst Case)

| Verstoß                                           | Maximaler Strafrahmen |
| ------------------------------------------------- | --------------------- |
| EU AI Act Annex III ohne Konformitätsbewertung    | 15M EUR / 3%          |
| GDPR Art. 28 Verarbeitungsmangel                  | 10M EUR / 2%          |
| GDPR Art. 35 fehlende DPIA                        | 10M EUR / 2%          |
| NIS2 Lieferanten-Audit-Failure (essential entity) | 10M EUR / 2%          |
| **Penalty-Stacking max combined**                 | **~55M EUR**          |

Plus: Reputations-Schaden durch öffentlichen EU-AI-Database-Eintrag, plus Customer-Vertragskündigungen, plus Tech-E&O-Schadensersatz.

**Die 6-Wochen-Investition in den AstraProposal-AI-Act-Sprint amortisiert sich beim ersten verhinderten Vorgang.**

---

## 2. Architektur-Gap-Analyse

### Die Drei-Layer-Realität von 2026 GRC-SaaS

```
┌────────────────────────────────────────────────────────────────┐
│ Layer 3: AI Reasoning / Agent                                 │
│   Drata AIQA · Vanta Agent 2.0 · Anecdotes Agents · Astra     │
│   [generiert proposals, agiert über dem Graph, audit-trail]   │
├────────────────────────────────────────────────────────────────┤
│ Layer 2: Compliance Graph (entities + relations)              │
│   Vanta Trust Graph · Anecdotes Data Engine · OSCAL · SCF     │
│   [Obligations, Topics, Evidence, Crosswalks, Attestations]   │
├────────────────────────────────────────────────────────────────┤
│ Layer 1: Durable Workflow / Continuous Monitoring             │
│   Drata Adaptive Automation · Inngest/Temporal · Vercel WDK   │
│   [Evidence-Ingestion, Approval-Gates, Long-Running-Tasks]    │
└────────────────────────────────────────────────────────────────┘
```

**Caelex heute** = Layer 1 (`defineAction` + cron) + Layer 3 (Astra) **fused**, mit Layer 2 (Compliance-Graph) **implizit verstreut über 8 `*RequirementStatus`-Tabellen**.

Die Konsequenz: Jede neue Regulation = neue Tabelle + neue Engine. Crosswalks ("EU Space Act Art. 7 ↔ NIS2 Art. 21") sind heute strukturell unmöglich, weil die Atome nicht in einer gemeinsamen Topic-Taxonomie leben.

**Ziel-Architektur 2027:**

```
┌─────────────────────────────────────────────────────────────┐
│                   User / Operator / Counsel / Authority     │
└─────────────────────────────────────────────────────────────┘
              │                                  │
              ▼ form / Cmd-K                     ▼ chat
┌──────────────────────────┐   ┌──────────────────────────────┐
│  Server Actions          │   │   Astra (Bedrock EU Claude)  │
│  (defineAction registry) │   │   + MCP Server               │
│  ─ atomic mutations ─    │   │   + AstraProposal trust gate │
└──────────────────────────┘   └──────────────────────────────┘
              │                                  │
              ▼                                  ▼
       ┌────────────────────────────────────────────┐
       │   Inngest / Vercel Workflow DevKit         │
       │   ─ step.waitForEvent("approval", 7d)      │
       │   ─ step.run with retries                  │
       │   ─ scheduled monitoring                   │
       │   ─ event bus for cross-action choreography│
       └────────────────────────────────────────────┘
              │                                  │
              ▼                                  ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│   Compliance Graph (PG)  │   │   Pull Connectors             │
│   ─ Obligation           │   │   ─ M365 / SharePoint        │
│   ─ Topic (SCF + Caelex) │   │   ─ Jira / Slack / GitHub    │
│   ─ ComplianceState      │   │   ─ CelesTrak (telemetry)    │
│   ─ Evidence             │   │   ─ EUSPA portal (manual)    │
│   ─ AstraProposal        │   └──────────────────────────────┘
│   ─ AuditLog (RFC 6962)  │
│   ─ Verity (Witness +    │
│      OpenTimestamps)     │
└──────────────────────────┘
```

### Die wichtigsten Schulden (priorisiert)

| Schuld                                                    | Heute                                              | 2027-Ziel                                                | Aufwand                   | Risk-Score                  |
| --------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------- | ------------------------- | --------------------------- |
| **AstraProposal nicht in Hash-Chain**                     | `decisionLog: Json` plain                          | Verkettet mit `audit-hash.server.ts`                     | klein (~3 Tage)           | **9/10** (AI Act Art. 12)   |
| **Reproducibility-Felder fehlen**                         | `model_id`, `prompt_hash` werden nicht persistiert | `AstraProposal.modelContext`                             | klein (~2 Tage)           | **9/10**                    |
| **Anthropic-Direct ohne EU-Inferenz**                     | Schrems-II-Riesiko                                 | AWS Bedrock EU profile                                   | klein (3 Tage)            | **9/10** (DSGVO Art. 28)    |
| **Kein DPIA für Astra**                                   | nicht dokumentiert                                 | DPIA-PDF im Trust-Center                                 | mittel (2-3 Wochen)       | **8/10**                    |
| **Verity ohne QES**                                       | Ed25519 = FES-Niveau                               | D-Trust Cloud-QES + RFC 3161 TSA                         | mittel (4-6 Wochen)       | **7/10** (ZPO §371a)        |
| **8 RequirementStatus-Tabellen statt 1 Compliance-Graph** | per-regulation engine                              | `Obligation` + `Topic` + `ComplianceState` (SCF-basiert) | groß (8-12 Wochen)        | **7/10** (skaliert nicht)   |
| **Bi-Temporalität fehlt**                                 | skalare `lastReviewedAt`                           | Postgres 18 Temporal Tables auf Top-10-Models            | mittel-groß (~8 Wochen)   | **8/10** (2030-Audit)       |
| **`defineAction` ohne durable execution**                 | Server-Action + cron-glue                          | Inngest oder Vercel WDK                                  | mittel (4-6 Wochen)       | **6/10** (Reliability)      |
| **Auth in-house**                                         | NextAuth + scrypt + WebAuthn                       | + WorkOS für SSO/SCIM/Audit                              | mittel (3-4 Wochen)       | **7/10** (Enterprise-Sales) |
| **Witness-Cosignatures fehlen**                           | Single-issuer Verity-Logs                          | C2SP `tlog-witness` Network                              | klein (~4 Wochen)         | **5/10** (USP-Win)          |
| **Pull-Connectors fehlen**                                | Push-only Evidence                                 | Inngest-scheduled M365/Jira/Slack                        | mittel pro connector      | **6/10** (Tier-2-Wert)      |
| **Caelex selbst nicht ISO-27001/SOC-2-zertifiziert**      | nichts                                             | Drata-Programm Q3 2026                                   | groß (6-9 Mo Audit-Cycle) | **8/10** (Procurement)      |
| **Tech E&O Versicherung**                                 | nichts                                             | BOXX/Cowbell ~25k EUR/Jahr                               | klein (2-3 Wochen)        | **8/10** (Existenz)         |

---

## 3. Die 24-Monats-Roadmap

### Q2 2026 — "Compliance Foundation" (jetzt) — 8-12 Wochen Sprint

Parallel zur Comply-V2-Roadmap. **Diese Phase ist ohne Customer-Wert direkt sichtbar — aber jede einzelne Lücke ist ein Existenz-Risiko.**

**Sprint A — AI Act 6-Punkte-Pflicht-Paket** (~4-6 Wochen, must-have vor 02.08.2026)

1. **Hash-Chain für AstraProposal-Decision-Log** (~3 Tage). Erweitere Schema um `prevHash`, `entryHash`, `signedAt`. Verkette mit `audit-hash.server.ts`.
2. **Reproducibility-Snapshot** (~2 Tage). `AstraProposal.modelContext`: `model_id`, `model_version`, `system_prompt_hash` (SHA-256 prompt+tools), `temperature`, `max_tokens`, `request_id`.
3. **AI-Disclosure-UI** (~1 Tag). Footer auf jeder Astra-Antwort: "Erstellt von Astra (Anthropic Claude). Informativ, ersetzt keine rechtliche Beratung." Art. 50 EU AI Act erfüllt.
4. **Anti-Rubber-Stamping-UI** (~1 Woche). `/dashboard/proposals` Pflicht-Felder vor Approve: "Reasoning gelesen" (Checkbox), "Quellen verifiziert" (Checkbox), Begründung-Freitext min. 30 Zeichen. Anti-Pattern-Detection: User mit >80% Approval-Rate <30s wird im Audit-Log markiert.
5. **Logging-Retention ≥180 Tage** (~1 Tag). `data-retention-cleanup`-Cron: AstraProposal & Astra-Logs niemals vor 180 Tagen löschen. Im SOC-2-SoA dokumentieren.
6. **AI-System-Inventar + FRIA-Template** (~1 Woche). `docs/ai-systems/astra.md`. FRIA-PDF-Generator als Tool für Public-Body-Customer (BAFA, BNetzA).

**Sprint B — Compliance-Festung-Caelex-selbst** (~4-6 Wochen, parallel)

1. **DSGVO-Pakete bauen**: DPA-Template + Sub-Prozessoren-Register + TOMs-Doku Art. 32 + DPIA für Astra. Anwalt: Bird & Bird Berlin oder Taylor Wessing.
2. **Schrems-II-TIA** für jede US-Cloud-Beziehung (Anthropic, Sentry, Resend) + **Migration-Plan zu AWS Bedrock EU** für Astra (3-Tage-Code-Swap).
3. **NIS2-Lieferanten-Klausel-Set** + Incident-Notification-SLA (<24h Customer-Notify) im SaaS-MSA.
4. **DORA-Annex** zum SaaS-MSA für Insurance-/Investor-Kunden.
5. **Tech E&O Versicherung** binden (BOXX/Cowbell/Vouch ~25k EUR/Jahr) + D&O.
6. **Drata-Vertrag** + SOC-2-Type-II-90-Day-Window starten + ISO 27001:2022 Stage 0 Lücken-Analyse.
7. **EU AI Act Klassifikations-Stellungnahme** durch Anwalt einholen — Article 6(3) Exemption 4 dokumentieren.

### Q3 2026 — "Trust-Engine + Workflow-Engine" — 8-12 Wochen

**Sprint C — Verity-USP-Sprint** (Witness-Network ist 4-Wochen-Investment für 5-Jahre-Differenzierung)

1. **C2SP `tlog-witness`-Endpoint** (~60h) — andere Witnesses (BAFA, BNetzA, EUSPA als langfristige Vision) signieren denselben Tree-Head.
2. **OpenTimestamps Quarterly-Anchor-Cron** (~20h) — ein STH-Hash pro Quartal in Bitcoin geanchored. Free Tier. Killt Split-View-Angriffs-Theorie.
3. **Public-Verify-Page** (`/verity/log/verify`) (~40h) — Externe können Tree-Head + Inclusion-Proofs verifizieren ohne Caelex.
4. **D-Trust Cloud-QES-Integration** (~4-6 Wochen) — Verity-Attestations werden eIDAS-QES-konform. ZPO §371a-Beweiswert.

**Sprint D — Workflow-Engine-Adoption** (parallel)

1. **Decision: Vercel Workflow DevKit vs Inngest.** Empfehlung: **Inngest** (cross-cloud-portable, Vercel-marketplace-native, $0 dev tier, gut dokumentiert für unsere Use-Cases). Vercel WDK ist die bessere DX wenn Vercel-Lock-in akzeptabel; weniger Ops aber weniger Portabilität.
2. **Pilot: AuthorizationWorkflow** (~1 Woche) — `step.waitForEvent("counter-signed", { timeout: "30d" })`.
3. **Migration: AstraProposal-Lifecycle** (~2-3 Wochen) — `step.waitForEvent("approval", { timeout: "7d" })` ersetzt cron-poll.
4. **Migration: NIS2-Incident-Phasen** (~1 Woche) — `step.sleepUntil(deadline_24h)` / `_72h` / `_30d`.
5. `defineAction` bleibt als atomic-mutation-Layer (gut!), Orchestration zieht in Inngest.

### Q4 2026 — "Compliance-Graph + Enterprise" — 12-16 Wochen

**Sprint E — Compliance-Graph-Refactor** (das Layer-2-Fix)

1. **SCF (Secure Controls Framework) Import** als kanonische Topic-Taxonomie (~1 Woche). 1400+ Controls, NIST-blessed, gratis.
2. **`Obligation` + `Topic` + `ComplianceState` Schema** (~2 Wochen Design + Migration).
3. **Mapping-Backfill**: jede der 8 RequirementStatus-Tabellen → `Obligation` + `topicIds[]` (~3-4 Wochen).
4. **Caelex-Topic-Extensions** für EU Space Act / COPUOS / IADC (~2 Wochen) — _das ist die defensible IP_.
5. **OSCAL Import/Export** (~2 Wochen) — Enterprise-Sales-Unlock für FedRAMP-style customers.

**Sprint F — Enterprise-Auth-Adoption** (parallel)

1. **WorkOS Pilot** mit einem Enterprise-Prospect (~1 Woche) — `/auth/sso/[organizationSlug]`.
2. **WorkOS Directory-Sync** für SCIM (~2 Wochen).
3. **Cutover Audit-Logs** auf WorkOS-Webhooks (~1 Woche).
4. NextAuth bleibt für Free-Tier-Credentials.

**Sprint G — ISO 27001 Stage 1+2 Audit** (mit TÜV Süd / BSI Group)

1. Drata-Automation aktiv seit Q2.
2. Stage 1 Pre-Audit Q3.
3. Stage 2 Audit Q4 → Zertifikat 2027-Q1.

### Q1-Q2 2027 — "AI-Trust + Cross-Org" — 12-16 Wochen

**Sprint H — Citation-First-Astra + Multi-Model-Cross-Check**

1. **`cite_source({ source_id, snippet })` Tool** — Astra darf Article-Nummern, Daten, Schwellwerte nur mit Source-Citation nennen.
2. **Citation-UI** (footnoted clickable links → Source-Document-Page).
3. **Hallucination-Score**: ohne Citation → Reject + Retry.
4. **Multi-Model-Cross-Check für `requiresApproval: true`** — zweiter API-Call gegen GPT-4o-mini via Bedrock. Disagreement > Threshold = `crossCheckStatus: "DISAGREEMENT"` im Approve-Modal.
5. **Self-hosted Langfuse** (MIT, EU-konform) für Astra-Tool-Trace + Eval-Datasets.

**Sprint I — Caelex MCP-Server** (Phase-4-Concept-Doc)

1. `mcp.caelex.io` exposed `Obligation`, `ComplianceState`, `Evidence`, `AstraProposal` als MCP-Resources.
2. Authorization via API-Key + per-Org-Scoping.
3. Strategischer Win: Erster MCP-Server für Space-Compliance.

**Sprint J — W3C VC Migration für Verity** (EUDIW-Ready)

1. `walt.id` Library für OID4VCI/4VP.
2. VerityAttestation als W3C VC Data Model 2.0 emittieren (parallel zum Custom-Format, dual-issue).
3. OID4VP-Endpoint sodass EUDIW-Wallets Attestations präsentieren können.
4. QEAA-Tier via QTSP-Partnership (Q3 2027).

### Q3-Q4 2027 — "Bi-Temporal + Sovereign" — 16-20 Wochen

**Sprint K — Bi-Temporal Compliance-Models**

1. **Postgres 18 Temporal-Tables** (`sys_period TSTZRANGE`, `valid_period TSTZRANGE`) auf Top-10-Models: `ComplianceItem`, `Spacecraft`, `AuthorizationWorkflow`, `NCASubmission`, `*Assessment`, `*RequirementStatus`.
2. **History-Tables via Trigger** + GiST-Range-Indexe.
3. **Time-Travel-Query-Layer** (`@/lib/temporal/`) — `findAsOfValid(date)` / `findAsOfSystem(date)`.
4. **Auditor-Reconstruction-Endpoint**: "war Operator X im März 2027 compliant" — heute strukturell beantwortbar.

**Sprint L — Sovereign-SKU Defense-Tier**

1. **AWS European Sovereign Cloud (Brandenburg)** Hosting-Option für BSI-/Bundeswehr-Kunden.
2. **C5:2020 Type-1-Testat** (KPMG/EY/BDO).
3. **Cyber Resilience Act Vorbereitung** für Widget/MCP-Server (SBOM via cyclonedx-npm, CSIRT-Anbindung).
4. **PDF/A-3 + OAIS-Konformität** für Long-Term-Evidence-Archival.

### 2028+ — "Ecosystem + Decentralized" — opportunistisch

- **EUDIW Mandatory-Acceptance** (regulated relying parties).
- **IETF SCITT** als Crosswalks-Veröffentlichungs-Standard wenn RFC stabil.
- **ISO 42001 Zertifizierung** (Audit ~50-100k EUR).
- **Multi-Region**: UK + US Hosting (Customer-driven, nicht Pre-Investment).

---

## 4. Top-7 Strategische Investments (priorisiert nach ROI)

### #1 — AI-Act-Sprint (4-6 Wochen, Risk-driven)

**Cost:** ~6 Eng-Wochen + ~5k EUR Anwalt.
**Risk-Avoidance:** Bis zu 55M EUR kombiniertes Penalty-Stacking + öffentlicher EU-AI-Database-Eintrag.
**Strategic Win:** "AI-Act-konforme Compliance-Plattform" als Sales-Argument gegenüber BAFA/BNetzA/Pharos.

### #2 — Astra → AWS Bedrock EU (3 Tage)

**Cost:** 3 Eng-Tage + ~$30/Mo extra LLM-Cost.
**Risk-Avoidance:** Schrems-II-Procurement-Block für jeden DE-Bundesbehörden-Customer.
**Strategic Win:** Unblockt BMWK / DLR / Bundeswehr / ESA-Pipeline.

### #3 — Witness-Cosignatures + OpenTimestamps (4 Wochen)

**Cost:** ~4 Eng-Wochen.
**Risk-Avoidance:** Marginal — heute kein Bedrohungs-Vektor.
**Strategic Win:** Erstes GRC-Tool mit mathematisch unwiderlegbarer Tamper-Evidence. **Kategoriedefinierender USP.** "BAFA witnesses your compliance log" als Pharos-Pitch.

### #4 — Drata-Programm + SOC2/ISO27001 (parallel ab Q2 2026)

**Cost:** Year-1 ~50-90k EUR (Drata $7.5-15k + Auditor ~30k + Anwalt ~15k).
**Risk-Avoidance:** Procurement-Block bei jedem mittelständischen+ Customer.
**Strategic Win:** Trust-Center-Feature, Trust-Score auf Pricing-Page, Investor-Diligence-Beschleuniger.

### #5 — Compliance-Graph-Refactor (Q4 2026, ~12 Wochen)

**Cost:** 12 Eng-Wochen.
**Strategic Win:** Crosswalks werden möglich. "EU Space Act + NIS2 + ISO27001 in einem Audit"-Sales-Pitch geht. SCF-Topic-Layer + Caelex-Extensions = defensible IP.

### #6 — WorkOS für Auth (3-4 Wochen, Q4 2026)

**Cost:** 3-4 Eng-Wochen + ~$1500-3000/Mo bei 10-20 Enterprise-Customers.
**ROI:** Break-even Monat 2 (vs. ~10 Eng-Stunden/Woche gesparte Identity-Engineering-Zeit).
**Strategic Win:** Unblockt erste 5 Enterprise-Deals.

### #7 — Bi-Temporalität (Q3 2027, ~8 Wochen)

**Cost:** 8 Eng-Wochen Senior + 2 Wochen Architektur-Design.
**Risk-Avoidance:** In 2030 nicht mehr nachholbar ohne 6-Monats-Refactor.
**Strategic Win:** "Caelex ist die einzige GRC-Plattform mit echter bi-temporaler Compliance-Reconstruction" — Auditor-Killer-Feature für 30-Jahre-Mission-Records.

---

## 5. Anti-Empfehlungen — Was wir NICHT tun

### Anti-#1 — Komplett-Migration zu XTDB / Datomic

**Begründung:** Postgres 18 + Temporal-Tables liefert 90% des Bi-Temporal-Werts ohne den 161-Model-Refactor und JVM-Stack-Migration. XTDB v2 ist beeindruckend, aber für Caelex's Stack-Reality eine 2-Jahres-Verirrung. Neon supportet keine Custom-Extensions, das macht XTDB de-facto schwierig.

### Anti-#2 — Confidential Computing als Standard-Feature

**Begründung:** Cost-Killer (~30% teurere EC2 + Anjuna-License + 6-12 Monate Refactor), kein Customer der's heute zahlt. Echte Verschlusssachen-Customer (BMI-VS, NATO-COSMIC-TOP-SECRET) **können das Material gar nicht in Cloud geben** — auch nicht in Enclave. Park es auf "Defense-SKU 2028+"-Roadmap, customer-driven.

### Anti-#3 — Event-Sourcing für ALLES

**Begründung:** Greg Young's eigene Warnung. 161 Models als Event-Streams = Schema-Evolution-Hölle in 5-10 Jahren. **Hybrid: Event-Sourcing nur für `ComplianceItem` und `AuthorizationWorkflow`** — das Atom + die kritischste Workflow-Engine. Andere Models bleiben CRUD.

### Anti-#4 — Eigenes EUDIW-Wallet

**Begründung:** EUDIW-Wallets kommen von EU-Mitgliedstaaten und privaten Anbietern. Caelex ist Issuer + Verifier, nicht Wallet-Provider. 18 Monate Eng-Cost ohne USP.

### Anti-#5 — Bitcoin-Anchoring "weil cool"

**Begründung:** Nur via OpenTimestamps (free, Bitcoin-anchored, no Caelex-side-token-handling). Kein eigenes Smart-Contract, keine eigene Chain. Auditoren wollen RFC 6962 + Ed25519 + (optional) OpenTimestamps. Sie wollen NICHT Crypto-Wallets.

### Anti-#6 — UCF (Unified Compliance Framework) lizenzieren

**Begründung:** 5-stelliges Jahres-Minimum, Enterprise-targeted. **SCF (Secure Controls Framework) ist gratis, NIST-blessed via STRM, 1400+ Controls, 200+ Frameworks** — und genau das Pattern, das Hyperproof als Backbone nutzt. Lizenzieren wäre Geld-Verbrennung.

### Anti-#7 — Pull-from-AWS-Style Evidence-Collection (nur)

**Begründung:** Drata/Vanta sind pull-heavy weil ihre Kunden cloud-native SaaS sind. Caelex' Kunden (Satelliten-Operatoren) leben in M365, ITAR-controlled SharePoints, on-prem Ground-Stations. **Pull-first wäre strategischer Mismatch.** Push-first MVP, Pull-Tier-2 für M365/Jira/Slack/GitHub. **Tier-3-Differentiator: Telemetry-derived Evidence** (CelesTrak → Ephemeris → Auto-Attestation).

### Anti-#8 — CRDT für globalen State

**Begründung:** Lokale-First mit CRDTs hat Replay-Probleme. Caelex ist Server-Authoritative-SaaS. CRDTs nur in 2-3 dedizierten Co-Editing-Surfaces (Atlas-Notes, Risk-Whiteboard). NICHT für `ComplianceItem.status` — das ist eine bewusste RBAC-Entscheidung mit Audit-Trail, kein Konflikt-Lösungs-Problem.

### Anti-#9 — Decentralized SCITT-Network selbst bauen

**Begründung:** SCITT-WG ist noch im Draft. Watch-the-spec, baue Adapter wenn die RFC raus ist (2027-2028). Der "decentralized compliance"-Hype ist real, aber 2027-2028-Story, nicht 2026-Build.

### Anti-#10 — Temporal.io für Workflow-Engine

**Begründung:** Enterprise-grade, aber operationell schwer (eigener Cluster, Workers, viel Boilerplate). Für 5-10-Personen-Team: **Inngest** ist die richtige Tier — Vercel-marketplace-native, $0 dev tier, durable execution out-of-the-box. Temporal nur wenn wir 100+ Workflow-Instances/Tag und Multi-Region brauchen.

---

## 6. Build-vs-Buy — Konsolidierte Tabelle

| Layer                                  | Heute                                       | Empfehlung                                                                                         | Aufwand                  | ROI-Window                    |
| -------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------- |
| **Auth + Identity**                    | NextAuth + scrypt + WebAuthn (self)         | **HYBRID** — NextAuth credentials + WorkOS für Enterprise SSO/SCIM/Audit                           | 3-4 Wochen               | Sofort (5 Enterprise-Deals)   |
| **Workflow Engine**                    | `defineAction` + Server Actions + cron      | **BUY → Inngest** (oder Vercel WDK bei voller Vercel-Bindung)                                      | 4-6 Wochen               | 6-12 Mo (Reliability)         |
| **Audit Log Tamper-Evidence**          | SHA-256 chain + RFC-6962 Verity-Logs (self) | **HYBRID — keep + Witness-Network + OpenTimestamps**                                               | 4 Wochen                 | Sofort (USP)                  |
| **PDF Generation**                     | `@react-pdf/renderer` + jsPDF (self)        | **HYBRID — keep + Gotenberg für Server-Reports + DocuSign/D-Trust für QES**                        | 2-3 Wochen               | Mittel (regulatory)           |
| **File Storage Compliance**            | Cloudflare R2                               | **SPLIT — R2 für hot, S3 + Object Lock (Compliance-Mode) für Audit-Evidence**                      | 2 Wochen                 | Kritisch für SOC2/ISO27001    |
| **Email**                              | Resend + Nodemailer                         | **KEEP Resend + Postmark als Compliance-Critical-Fallback**                                        | 1 Woche                  | Niedrig                       |
| **Observability**                      | Sentry + LogSnag + Vercel Analytics         | **ADD self-hosted Langfuse (MIT, EU-konform) für Astra-Traces**                                    | 1-2 Wochen               | EU AI Act Art. 12             |
| **LLM (Astra)**                        | Anthropic direct (`claude-sonnet-4-6`)      | **MIGRATE → AWS Bedrock EU + Mistral als cost-tier-fallback**                                      | 2-3 Tage                 | Sofort (BMWK/DLR/Bundeswehr)  |
| **Compliance Certs (Caelex selbst)**   | Keine                                       | **BUY → Drata $7.5-15k/yr** für SOC 2 Type II + ISO 27001; **C5 Type 2 später** für Bundesbehörden | 6-9 Mo Audit-Cycle       | Year-1 ~50-90k EUR            |
| **Encryption / Key Mgmt**              | AES-256-GCM + scrypt + master key in env    | **HYBRID — keep + BYOK via AWS KMS für Enterprise-Tier**                                           | 4-6 Wochen               | High-margin Enterprise-Unlock |
| **iPaaS / Integrations**               | Keine (push-only)                           | **BUY → Merge.dev (HRIS/CRM) + Paragon (M365/Jira/AWS pull)**                                      | 3-4 Wochen pro Connector | Strategischer Tier-2-Wert     |
| **Onboarding / In-App-Guidance**       | Custom hooks                                | **BUY → Userflow oder Userpilot** ($299-1k/Mo)                                                     | 1-2 Wochen               | Activation-Lift               |
| **Compliance Engines**                 | 12 Engine-Files (self)                      | **KEEP — das ist DAS Produkt**                                                                     | —                        | Moat                          |
| **Compliance Graph (Topic-Taxonomie)** | Implizit über 8 RequirementStatus-Tabellen  | **BUY-Data: SCF (gratis) + BUILD: Caelex-Space-Extensions**                                        | 8-12 Wochen              | Layer-2-Foundation            |
| **Astra Tool-Executor + Trust-Layer**  | 2046 LOC (self)                             | **KEEP + ausbauen mit Citation/Multi-Model-Cross-Check**                                           | —                        | Moat                          |
| **MCP Server**                         | Nicht gebaut                                | **BUILD (Phase 4)** — kategoriedefinierend für Space-Compliance                                    | ~2 Wochen                | Strategisch                   |

---

## 7. Detaillierte Per-Stream-Findings (Reference)

### Stream 1 — AI-Trust & Black-Box-Architektur

**Kernerkenntnis:** Astra V2 ist mit hoher Wahrscheinlichkeit ein "high-risk AI system" nach EU AI Act Annex III. Der `AstraProposal`-Pattern ist konzeptionell richtig (Human-in-the-Loop ist die EDPB-empfohlene GDPR-Art.-22-Antwort), aber technisch zu dünn:

- `decisionLog` ist plain JSON, nicht hash-chain-verkettet
- Reproducibility-Felder fehlen
- Kein Citation/Source-Attribution
- Kein Multi-Model-Cross-Check
- Kein FRIA-Template

**6-Punkte-Pflicht-Paket vor 02.08.2026 (siehe Sprint A oben).**

**State-of-the-Art:** Palantir AIP Logic ist der Goldstandard mit "Agent decision log"-Tab. Stripe Radar geht den Post-hoc-Explainability-Weg statt HITL. Anthropic empfiehlt für Tool-Use MCP-Audit-Logs mit zentraler Authentifizierung — genau das Modell, das Caelex Phase 4 aus dem Concept-Doc baut.

**Hallucination-Defense-Pattern** (Stand 2026):

- **RAG mit Citation-First** (Perplexity, You.com)
- **Multi-Agent-Cross-Check** (zwei Modelle, Antwort nur wenn Übereinstimmung)
- **Constitutional Self-Critique** (zweiter LLM-Pass)
- **Verifier-LLMs** (faithfulness scores)

Caelex hat **keinen** dieser Mechanismen heute.

### Stream 2 — GRC-SaaS Competitive Architecture

**Drei-Layer-Konvergenz** bei Drata/Vanta/Anecdotes:

1. Atomic Mutations (defineAction-equivalent)
2. Compliance Graph (entities + relations)
3. AI Reasoning (decision-log + approval gate)

**Caelex-Diff:** Layer 1 + 3 fused, Layer 2 implizit verstreut.

**Crosswalk-Pattern (Hyperproof):** Topic-Taxonomie (SCF) als Backbone, jede Regulation → Topic-Mapping. Ein Evidence-Stück deckt alle Obligations mit gemeinsamem Topic. Skaliert linear mit N statt N×N.

**Evidence-Strategie:**

- Push-first für Caelex (Operatoren leben in M365/SharePoint, nicht AWS)
- Pull-Tier-2 für Premium (M365/Jira/Slack/GitHub) via Inngest-scheduled-functions
- **Tier-3-Moat: Telemetry-derived Evidence** (CelesTrak → Ephemeris → Auto-Attestation) — _kein GRC-Wettbewerber hat das_

**Workflow-Engine-Decision-Matrix:**

- **Inngest** (empfohlen): Vercel-marketplace-native, $0 dev tier, durable execution, `step.waitForEvent`, gut für 5-10-Personen-Team
- **Vercel Workflow DevKit**: GA seit 16.04.2026, beste DX bei Vercel-Bindung, Step-billed
- **Temporal Cloud**: nur bei Multi-Region oder 100+ Workflow-Instances/Tag
- **Trigger.dev**: open-source-self-host-Option bei Ops-Bandbreite

**MCP-Server** als 2-Wochen-Build = kategoriedefinierende Feature für Space-Compliance.

**AstraProposal ist tatsächlich best-in-class** — Vanta beschreibt das in Agent-Docs fast wortgleich, aber niemand hat den Code-Pfad-Trennung (`call` vs `applyApprovedProposal` vs `serverAction`) so sauber implementiert.

### Stream 3 — Legal/Regulatory Coverage

**Top-3 Sofort-Maßnahmen Q2 2026:**

1. EU AI Act Klassifikation Astra (Anwalt-Stellungnahme: Bird & Bird Berlin, Taylor Wessing)
2. DSGVO-Pakete (DPA-Template + Sub-Prozessoren-Liste + TOMs + DPIA für Astra)
3. Tech E&O Versicherung binden (BOXX/Cowbell/Vouch)

**Risk-Heatmap (April 2026):**
| Risiko | Score |
|---|---|
| EU AI Act Art. 6 Klassifikation falsch | **9/10** |
| DSGVO Art. 28 DPA-Lücken | **8/10** |
| Schrems II Anthropic-Inferenz | **8/10** |
| Tech E&O ungesichert | **8/10** |
| DPIA für Astra fehlt | **8/10** |
| NIS2 Lieferanten-Audit-Failure | **7/10** |
| Verity ohne QES → kein Beweiswert | **7/10** |
| ISO 27001 fehlt → Enterprise-Sales | **7/10** |
| DORA-Klauseln fehlend | **6/10** |
| C5 fehlt für BSI-Bundespharos | **5/10** |
| CRA bei Widget/MCP/Sovereign-SKU | **5/10** |
| EUDIW nicht akzeptiert (>2028) | **3/10** |

**Wichtig: AstraProposal-Queue ist nicht UX-Polish, sondern AI-Act-Verteidigung.** Nur wenn jede Astra-Output-Zeile vor Submission menschlich reviewed wird, ist Article 6(3) Exemption 4 ("preparatory task") plausibel argumentierbar.

**Kombiniertes Penalty-Stacking max:** ~55M EUR (AI Act 15M + GDPR 28 10M + GDPR 35 10M + NIS2 10M).

**Compliance-Tools-Empfehlungen:**
| Domäne | Empfohlen | Alt. |
|---|---|---|
| DSGVO/Privacy | OneTrust | Sprinto |
| SOC 2 + ISO 27001 | **Drata** ($7.5-15k/yr) | Vanta, Secureframe |
| ISO 42001 Audit | BSI Group, TÜV Süd | DEKRA |
| EU AI Act Beratung | Bird & Bird Berlin, Taylor Wessing | Linklaters |
| C5/BSI | KPMG, EY, BDO | TÜV Rheinland |
| DORA-Klauseln | Reed Smith, Hogan Lovells | DLA Piper |
| Cloud-QES | D-Trust (Bundesdruckerei) | Sectigo |
| Tech E&O | BOXX, Cowbell, Vouch | Hartford |

### Stream 4 — Build-vs-Buy / Composable Stack

**Drei sofortige Switches:**

1. **Astra → AWS Bedrock EU** (3 Tage) — Schrems II + C5
2. **NextAuth → WorkOS** für Enterprise SSO/SCIM (3-4 Wochen)
3. **Vercel Workflow DevKit oder Inngest** statt `defineAction`-cron-Glue (4-6 Wochen)

**Drata-Programm für Caelex selbst:**

- SOC 2 Type II Year-1: ~$25-40k
- ISO 27001:2022 Year-1: ~$25-50k
- ISO 42001 (defer 2027): ~$35-90k
- BSI C5 Type 2 (defer 2027): ~$50-150k
- **Year-1 all-in:** ~50-90k EUR

**Strategic-Moats die in Self-Build bleiben:**

- 12 Compliance-Engines
- `audit-hash.server.ts` + Verity-Logs
- Astra Tool-Executor + Regulatory-Knowledge
- Domain-Daten (119 EU-Space-Act-Articles, 51 NIS2-Reqs, 10 Jurisdictions)
- RRS/RCR-Scoring (Assure)

**OpenTimestamps Anchor für Audit-Hash-Chain:** Free Bitcoin trust-anchor, ~200 LOC, eine Cron, raised Beweiswert vor deutschen Gerichten.

### Stream 5 — Future-Proof Foundations

**Schock-Erkenntnis:** Caelex hat bereits RFC-6962-konforme Merkle-Trees implementiert (`VerityLogLeaf` + `VerityLogSTH` mit Ed25519-STH) — das ist **Trillian-/Sigstore-Niveau**. Keine andere GRC-Plattform spielt diese Liga.

**Foundation-Ranking:**

✅ **Bereits zukunftsfähig (2030-tauglich):**

- Postgres + Prisma (30-Jahres-Bet richtig)
- RFC-6962 Verity-Logs
- AuditLog Hash-Chain
- DerivationTrace (Field-Provenance, Foundry-Niveau)
- Server-only Compliance-Engines (`*.server.ts`)
- Multi-Tenancy + Multi-Actor von Anfang an

⚠️ **Schulden, die in 2-3 Jahren teuer werden:**

- Skalare State-Felder ohne Bi-Temporalität
- Kein Event-Stream für ComplianceItem
- Eigenes Verity-Format statt W3C VC
- Keine Witnesses für Verity-Log
- Single-Region
- Keine PDF/A-3 + OAIS-Konformität für Long-Term-Archival
- Kein Schema-Versioning für Regulations

🚫 **Hype-Themen vermeiden:**

- XTDB/Datomic-Migration (Postgres 18 reicht)
- Confidential Computing als Standard
- Event-Sourcing für ALLES
- Eigenes EUDIW-Wallet
- Bitcoin-Smart-Contracts
- CRDT für globalen State
- Decentralized SCITT-Network

**Top-3-Foundation-Investments 2026:**

1. **Bi-Temporal Compliance-Models** (Q3-Q4 2026, 8 Eng-Wochen) — Postgres 18 Temporal-Tables
2. **Witness-Cosignatures + OpenTimestamps** (Q3 2026, 4 Eng-Wochen) — USP-Win
3. **Event-Sourcing für ComplianceItem-Atom** (Q4 2026, 6 Eng-Wochen) — Audit-Reconstruction

---

## 8. Antwort auf die Gründer-Fragen

### "Sind die Workflows richtig?"

**Atomic Mutations:** ✅ `defineAction` ist sauber, sogar besser als public engineering blogs von Drata/Vanta zeigen.

**Durable Execution:** ❌ Heute lossy — 7-Tage-Pending-Proposals können bei Function-Restart hängen bleiben. Lösung: Inngest oder Vercel Workflow DevKit (4-6 Wochen).

**Compliance Graph:** ❌ Implizit über 8 RequirementStatus-Tabellen verstreut. Layer-2-Refactor mit SCF-Topic-Backbone (Q4 2026, ~12 Wochen) macht Crosswalks erst möglich.

**Approval-Rules:** ⚠️ Heute `requiresApproval: boolean`. State-of-the-Art: stackable Rules (Mercury-Pattern aus Concept-Doc) — Phase 5.

### "Erfüllen wir alle rechtlichen Sachen?"

**Heute:** ❌ Praktisch nichts adressiert (DSGVO Art. 28 DPA-Inventar, Art. 35 DPIA, EU AI Act Self-Assessment, NIS2-Lieferanten-Klauseln, DORA-Annex, Verity-QES-Beweiswert, ISO 27001, Tech E&O — alles offen).

**Q2 2026 Foundation-Sprint** (parallel zu AI-Act-Sprint) bringt das auf 80%. Q3-Q4 2026 SOC2/ISO27001 schließt den Rest.

**Worst-case-Penalty-Stacking heute:** ~55M EUR.
**Investment um das zu vermeiden:** ~50-90k EUR Year-1.

### "Ist das Black-Box-Problem gelöst?"

**Konzeptionell ja** (AstraProposal + decisionLog + Human-in-the-Loop ist die richtige GDPR-Art.-22 + AI-Act-Antwort).

**Technisch nein** — 6 konkrete Bausteine fehlen. AI-Act-Sprint (4-6 Wochen vor 02.08.2026) bringt's auf state-of-the-art.

**Sales-Win:** Wenn der Sprint durch ist, ist "AI-Act-konforme Compliance-Plattform" das Verkaufsargument gegenüber BAFA/BNetzA — Pharos-Pilot-Acceleration.

### "Ist es smart, alles selbst zu bauen?"

**2024-2025 war es richtig** — keine reife Workflow-Engine, WorkOS war steiler, Bedrock EU für Claude hatte limitierte Verfügbarkeit.

**2026 ist die Landschaft reif geworden** — Vercel Workflow DevKit GA, Inngest Vercel-marketplace-native, Bedrock EU-Profile, WorkOS B2B-mature.

**Drei sofortige Switches** (zusammen ~7-10 Wochen Migration, danach 30-40% mehr Engineering-Velocity in compliance-engines):

1. Astra → Bedrock EU
2. NextAuth → WorkOS
3. defineAction-glue → Inngest

**Was Caelex weiter selbst baut** (Strategic-Moats):

- 12 Compliance-Engines + Domain-Daten (das **Produkt**)
- AstraProposal-Trust-Layer (Caelex's USP gegen Vanta/Drata)
- Verity-Log-System (Trillian-Niveau, niemand sonst)
- Compliance-Graph + Caelex-Topic-Extensions (defensible IP)
- Telemetry-derived-Evidence-Engine (Tier-3-Moat)

---

## 9. Sources (konsolidiert)

### EU AI Act

- [Article 6 — Classification Rules](https://artificialintelligenceact.eu/article/6/)
- [Article 12 — Record-Keeping](https://artificialintelligenceact.eu/article/12/)
- [Article 13 — Transparency](https://artificialintelligenceact.eu/article/13/)
- [Article 14 — Human Oversight](https://artificialintelligenceact.eu/article/14/)
- [Article 26 — Deployer Obligations](https://artificialintelligenceact.eu/article/26/)
- [Article 27 — FRIA](https://artificialintelligenceact.eu/article/27/)
- [Article 50 — Disclosure](https://artificialintelligenceact.eu/article/50/)
- [Article 99 — Penalties](https://artificialintelligenceact.eu/article/99/)
- [Annex III](https://artificialintelligenceact.eu/annex/3/)
- [Implementation Timeline](https://artificialintelligenceact.eu/implementation-timeline/)

### GDPR / DSGVO

- [Art. 22 GDPR](https://gdpr-info.eu/art-22-gdpr/) — Automated Decision-Making
- [Art. 28 DSGVO](https://gdpr-info.eu/art-28-gdpr/) — Auftragsverarbeitung
- [Art. 35 DSGVO](https://gdpr-info.eu/art-35-gdpr/) — DPIA
- [DPO Centre — Meaningful Human Review](https://www.dpocentre.com/blog/ai-and-article-22-the-need-for-meaningful-human-review/)

### ISO Standards

- [ISO/IEC 42001:2023 AI Management](https://www.iso.org/standard/42001)
- [ISO 14721:2025 OAIS Reference Model](https://www.iso.org/standard/87471.html)
- [ISO 27001:2022](https://www.iso.org/standard/27001)

### Schrems II & Cloud Sovereignty

- [DapriPro 2026 Strategies](https://dapripro.com/international-data-transfers-after-schrems-ii-compliance-strategies/)
- [AWS European Sovereign Cloud GA](https://medium.com/@inboryn/aws-european-sovereign-cloud-goes-live-what-it-means-for-your-compliance-strategy-90782973f2a0)
- [AWS Bedrock data-residency](https://medium.com/@odere.pub/aws-bedrock-data-residency-which-models-actually-keep-your-data-safe-c4eb35bb2224)

### NIS2 / DORA / CRA

- [NIS2 Article 21](https://www.nis-2-directive.com/NIS_2_Directive_Article_21.html)
- [Reed Smith German NIS2UmsuCG](https://www.reedsmith.com/articles/germany-implements-nis2-immediate-effect-broad-scope-near-term-registration/)
- [Morgan Lewis CTPP-Designation](https://www.morganlewis.com/blogs/sourcingatmorganlewis/2025/11/dora-eu-regulators-announce-list-of-critical-ict-third-party-providers)
- [DLA Piper CRA SaaS-Grenze](https://www.dlapiper.com/en/insights/publications/2026/02/cyber-resilience-act-the-fine-line-between-saas-and-digital-products)

### eIDAS / EUDIW / W3C VC

- [eIDAS 2.0 Changes 2025-2026](https://www.qualified-electronic-signature.com/eidas-2-0-changes-qes-2025-2026/)
- [EUDIW Hub](https://www.eudi-wallet.eu/)
- [Walt.id W3C Verifiable Credentials](https://walt.id/verifiable-credentials)

### Tamper-Evidence / RFC 6962 / Witnesses

- [Sigstore Rekor](https://docs.sigstore.dev/logging/overview/)
- [Google Trillian](https://github.com/google/trillian)
- [transparency.dev](https://transparency.dev/)
- [C2SP tlog-witness Spec](https://github.com/C2SP/C2SP/blob/main/tlog-witness.md)
- [OpenTimestamps](https://opentimestamps.org/)
- [Russ Cox — Transparent Logs for Skeptical Clients](https://research.swtch.com/tlog)

### Workflow Engines

- [Vercel Workflow DevKit GA April 2026](https://vercel.com/blog/a-new-programming-model-for-durable-execution)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest vs Temporal](https://www.inngest.com/compare-to-temporal)
- [Inngest Wait For Event](https://www.inngest.com/docs/reference/functions/step-wait-for-event)
- [Inngest for Vercel](https://vercel.com/marketplace/inngest)

### GRC Competitors

- [Drata Adaptive Automation](https://drata.com/blog/new-launches-from-drataverse-digital-adaptive-automation)
- [Drata AIQA](https://drata.com/products/ai-questionnaire-assistance)
- [Vanta MCP Server](https://www.vanta.com/resources/meet-the-vanta-mcp-server)
- [Vanta Agentic Trust Platform](https://www.businesswire.com/news/home/20251118962649/en/Vanta-Introduces-Agentic-Trust-Platform-to-Unify-Compliance-Risk-and-Security-Assessments)
- [Anecdotes Agentic GRC](https://www.anecdotes.ai/agentic-grc)
- [Hyperproof Crosswalks](https://hyperproof.io/resource/crosswalks-between-compliance-frameworks/)
- [Secureframe AI](https://secureframe.com/features/ai)
- [Drata vs Vanta vs Secureframe — Sprinto](https://sprinto.com/blog/secureframe-vs-vanta-vs-drata/)

### Frameworks / Crosswalks

- [Secure Controls Framework (SCF)](https://securecontrolsframework.com/)
- [NIST OSCAL](https://pages.nist.gov/OSCAL/)

### Bi-Temporal & Schema Evolution

- [PostgreSQL Temporal Extensions](https://wiki.postgresql.org/wiki/Temporal_Extensions)
- [Aiven — Postgres 18 Temporal Constraints](https://aiven.io/blog/exploring-how-postgresql-18-conquered-time-with-temporal-constraints)
- [XTDB v2 Launch](https://xtdb.com/blog/launching-xtdb-v2)
- [JUXT — Value of Bitemporality](https://www.juxt.pro/blog/value-of-bitemporality/)
- [Palantir Foundry Schema Migrations](https://www.palantir.com/docs/foundry/object-edits/schema-migrations)

### Auth / Build vs Buy

- [WorkOS vs Auth0 vs Clerk B2B](https://workos.com/blog/workos-vs-auth0-vs-clerk)
- [B2B Authentication Comparison 2026 — SSOJet](https://ssojet.com/blog/b2b-authentication-provider-comparison-features-pricing-sso-support)

### Observability

- [Langfuse Self-hosted](https://langfuse.com/)
- [LLM Observability 2026 — Firecrawl](https://www.firecrawl.dev/blog/best-llm-observability-tools)

### Insurance

- [Insureon Tech E&O 2026](https://www.insureon.com/small-business-insurance/errors-omissions/best-companies)
- [BOXX Insurance Tech E&O](https://boxxinsurance.com/us/en/newsroom/boxx-insurance-launches-next-gen-tech-eo-product/)

### EU Space Act / NIS2 Space Sector

- [EU Space Act Hub](https://www.european-space-act.com/)
- [Skadden — EU Space Sector Cybersecurity](https://www.skadden.com/insights/publications/2025/07/the-eus-new-cybersecurity-law-for-the-space-sector)
- [ENISA — Securing Commercial Satellite](https://www.enisa.europa.eu/news/from-cyber-to-outer-space-a-guide-to-securing-commercial-satellite-operations)

### Decentralized Compliance (Watch-the-spec)

- [IETF SCITT Architecture](https://datatracker.ietf.org/doc/html/draft-ietf-scitt-architecture-22)

---

## Schluss

Caelex steht **technisch besser da als der Markt es erwartet** — die Foundation-Bets (Postgres-Stack, RFC-6962-Tamper-Evidence, Multi-Actor-Schema, Astra-Trust-Layer) sind richtig gewählt.

Die kommenden 24 Monate sind **kein Architektur-Reset**, sondern eine **strategische Konsolidierung**:

- Konsolidiere die Pflicht-Festung (4-6 Wochen AI-Act + 4-6 Wochen Compliance-Foundation parallel)
- Hebe `defineAction`-Glue auf eine durable Workflow-Engine
- Mache Layer 2 (Compliance-Graph) explizit
- Outsource commodity-Layer (Auth, LLM-Routing)
- Spiele die Verity-USP-Karte mit Witness-Network + OpenTimestamps

Mit dieser Konsolidierung ist Caelex am 02.08.2026 **AI-Act-konform live**, am Q4 2026 **SOC-2-Type-II + ISO-27001 zertifiziert**, am Q2 2027 **EUDIW-Ready mit W3C VC**, am Q4 2027 **bi-temporal mit echter Audit-Reconstruction-Fähigkeit**, am 2028 **Sovereign-SKU-fähig für Bundeswehr/BSI**.

Das ist der Pfad zu einer **Plattform, die in 2030 noch trägt** — und zur einzigen GRC-SaaS, die "wir können nachweisen, was am 15. März 2027 compliant war, basierend auf den damals geltenden Regeln und damals vorliegenden Evidenz" mit kryptographischer Beweiskraft beantworten kann.

— Claude (Sonnet 4.6, im Auftrag des Founders)
