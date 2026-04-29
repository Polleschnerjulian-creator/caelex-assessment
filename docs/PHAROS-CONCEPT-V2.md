# PHAROS Concept V2 — "Glass Lighthouse" Reference Architecture

> **Status:** Reference document (April 2026) · informs roadmap, not yet a binding spec
> **Predecessor:** [PHAROS-CONCEPT.md](./PHAROS-CONCEPT.md) (V1, what's actually shipped)
> **Purpose:** Strategic blueprint for Phase 2–4. Sections 1–10 already partially shipped.

This document captures the comprehensive strategic vision for Pharos as the
third pillar of Caelex (alongside COMPLY for operators and ATLAS for legal
counsel). Where V1 reflects the code currently in production, V2 is the
forward-looking reference — items already implemented are marked ✅, items
explicitly out-of-scope for V2 are marked ✗ with rationale.

---

## 1. Executive Summary (Pharos auf einer Seite)

**Pharos** ist die dritte Säule des Caelex-Ökosystems für die European Space Infrastructure und richtet sich exklusiv an **Aufsichts-, Genehmigungs- und Marktüberwachungsbehörden** (BNetzA, BSI, DLR-Raumfahrtagentur, EUSPA, ENISA, CNES, UKSA, LSA Luxemburg, AESIA Spanien, CSIRT-Netzwerk u. a.). Während **COMPLY** Operatoren orchestriert und **ATLAS** Anwälte bedient, ist Pharos die **Glass-Box-Aufsichtsplattform**: jede Entscheidung, jede AI-Inferenz, jede Genehmigung, jede Marktüberwachungsmaßnahme ist bis zum Quellnormtext kryptografisch nachvollziehbar.

Pharos baut konsequent auf dem existierenden Stack auf — Next.js 15 auf Vercel, Neon Postgres mit Prisma ORM, Claude (Anthropic) als einziger LLM-Anbieter, Stripe für Premium-Abrechnung — und nutzt ausschließlich Open-Source-Bausteine.

**Zentrale These:** Pharos trifft niemals juristische Endentscheidungen — Pharos liefert maschinenverifizierbare Vorschläge mit Confidence Score, vollständigem Citation-Trail, alternativen Auslegungen und reproduzierbarem Reasoning-Graph. Damit hält Pharos die Schufa-Doktrin ein (Art. 22 DSGVO), erfüllt § 35a VwVfG (echte menschliche Entscheidung mit individueller Begründung) und wird gleichzeitig zur transparentesten Aufsichtsplattform Europas.

Geschäftsmodell: **Freemium-hybrid**. Pharos Lite (Read-only Receiver, Audit Explorer, Notifications) ist für Behörden kostenfrei — finanziert über Operator-Lizenzen in COMPLY und mittelfristig Horizon Europe / ESA Discovery. Pharos Pro (KI-Copilot, Workflow-Engine, Reverse-Audit, Sandbox, Cross-Authority Knowledge Mesh) ist kostenpflichtig pro Sachbearbeiter / pro Vorgang.

---

## 2. Architektur-Übersicht

```
                ┌──────────── ATLAS (Anwälte) ────────────┐
                │  Legal research · Compliance advisory   │
                └───────────────────┬─────────────────────┘
                                    │  W3C VC + DID  (Mandantenfreigabe)
                                    │  Macaroon-Caveats (Read-Only, time-limited)
                                    ▼
┌────────────  CAELEX TRUST FABRIC  ────────────┐
│   SCITT-style Append-Only Log (Hash-Chain)    │  ✅ shipped
│   + Witness-Quorum (3-of-5 Cosigning)         │  ✗ V2 / Phase 2
│   + Regulatory Ontology Mirror (NormAnchor)    │  ✅ shipped
│   + DID Registry / EUDIW Verifier              │  ✗ V2 / Phase 4
└────────────┬─────────────────────────────────┬─┘
             │                                 │
   ┌─────────▼────────┐                ┌───────▼─────────┐
   │     COMPLY        │                │     PHAROS      │
   │  (Operators)      │ ──────────►    │  (Authorities)  │
   │  ASTRA · Verity   │                │  Astra-Judge    │
   │  Sentinel · etc.  │ ◄──────────    │  Citation-Ledge │
   └───────────────────┘                │  Receipt-Chain  │
                                        │  DP-Aggregates  │
                                        │  Time-Travel    │
                                        └─────────────────┘
```

---

## 3. Architektonische Kernprinzipien

### 3.1 Glass Box statt Black Box ✅

Jede Pharos-Aussage durchläuft eine 3-Stufen-Pipeline:

1. **Retrieval** (Stufe A): Postgres-tsvector BM25 + GIN-Index auf NormAnchor.
2. **Reasoning** (Stufe B): Claude Sonnet 4.6, T=0, Tool-Use mit Citation-Pflicht.
3. **Verification** (Stufe C): LLM-as-a-Judge — zweite Inferenz prüft Citation-Validität.

Erfüllt EU AI Act Art. 13 (Transparenz), Art. 14 (Human Oversight), Art. 15 (Robustheit) und EuGH-Schufa-Doktrin (Art. 22 DSGVO).

### 3.2 Verifiable Compute Pipeline ✅

Drei-Schichten-Attestation-Stack:

1. **Eingangs-Attestation**: Signed user prompt (gehasht via inputHash).
2. **Compute-Attestation**: COSE-Sign-equivalent Triple-Hash (input/context/output → receiptHash).
3. **Log-Attestation**: Receipt landet in OversightAccessLog-Hash-Chain.

V2 ergänzt:

- **Witness-Attestation**: 3-of-5 Cosigning (separate Vercel-Projects + Neon-Branches).

### 3.3 Capability-basierte Autorisierung

V1 nutzt NextAuth-Sessions + scope-resolver. V2 evaluiert Macaroons für Auditor-Tokens (Phase 3). Cedar-Policy-Engine wird **NICHT** adoptiert — for-loop-of-if-statements deckt aktuelle Use-Cases ab; Cedar bringt 800 LOC + WASM-Bundle ohne klaren Gewinn.

### 3.4 Append-Only Log mit Hash-Chain ✅

Implementiert in `prisma.oversightAccessLog`:

```sql
CREATE TABLE "OversightAccessLog" (
  "id" TEXT PRIMARY KEY,
  "previousHash" TEXT,        -- chain link
  "entryHash" TEXT NOT NULL,  -- sha256(prevHash || receiptHash || oversightId)
  ...
);
```

V2 ergänzt:

- Periodisches Anchoring der Tree-Roots auf 3 Witness-Projects.
- OpenTimestamps Bitcoin-Anchoring **NICHT** adoptiert (Performance-Theater ohne praktischen Mehrwert).

### 3.5 Multi-Party Approval (k-of-n) ✗ V2

Genehmigungs-Schlussverfügungen mit Threshold-Signaturen (Sachbearbeiter + Referatsleiter + DSB). Default-Profil EU Space Act Art. 88 TLPT-Ergebnis: 2-of-3.

---

## 4. Komponenten-Spezifikation

### 4.1 Authority Dashboard ✅ (basis)

Top-10-Use-Cases priorisiert:

1. **Genehmigungsprüfung** — EU Space Act Art. 12-22 ✗ V2
2. **NIS2/EU-Space-Act-Incident-Triage** ✗ V2
3. **Marktüberwachung** (EU AI Act Art. 72) ✗ V2
4. **FRIA-Review** ✗ V2
5. **Cross-Border Coordination** ✗ V2
6. **Reverse Audit** ✗ V3
7. **Inspections / TLPT-Aufsicht** ✗ V2
8. **Sandbox-Simulation** ✗ V3
9. **Audit-Trail-Drill-Down** ✅ shipped (basic)
10. **Article-15-DSGVO-Auskunftserstellung** ✗ V2

### 4.2 Ingestion Layer ✅ (via OversightRelationship-Accept-Flow)

V1 nutzt direkten POST + Token-Hash. V2 ergänzt:

- COSE_Sign1 CBOR-Wrapper für SCITT-Konformität.
- Automatische Klassifikation via Haiku 4.5.

### 4.3 Workflow Engine ✗ V2

XState v5 mit setup/createMachine + Persistenz in Postgres. Beispiel: NIS2-Incident-Reporting (24h/72h/30d-SLA). Jedes State-Transition signiert.

### 4.4 AI Copilot ✅

3-Stufen-Pipeline mit Citation-Required + Self-Consistency + Judge.

V1 hat:

- ✅ Citation-Required (Schema-enforced)
- ✅ Abstention-Pattern
- ✅ Deterministic Mode (T=0)
- ✅ LLM-as-a-Judge (Phase 2 add-on)
- ✅ Self-Consistency (optional, n=5 default off)

V2 ergänzt:

- ✗ Multi-LLM-Consensus (Sonnet + Opus parallel)
- ✗ Mechanistic-Interpretability-Hooks (sobald Anthropic Circuit Tracer Cloud-API anbietet)

### 4.5 Cryptographic Attestation ✅

COSE-Sign-equivalent Triple-Hash + Ed25519-Signing + Hash-Chain-Persist.

V2 ergänzt:

- COSE_Sign1 CBOR-Wrapper-Migration (statt raw Ed25519+base64).
- C2PA-Manifests für PDF-Exports (Phase 3, niedrige Priorität).
- Reproducible Builds der Pharos-Codebase.

### 4.6 Policy Engine ✗ V2 (NICHT Cedar)

Aktuelle Lösung: scope-resolver + direkte Prisma-WHERE-Filter. Cedar wird **bewusst NICHT adoptiert** — Aufwand übersteigt Nutzen. Falls Cross-Border-Sharing-Graph-Datalog kommt → OPA als Sub-Service in Phase 4.

### 4.7 Zero-Knowledge Proof Layer ✗ Phase 4

Drei produktionsreife Use-Cases:

1. NIS2-Compliance-Beweis ohne Log-Offenlegung
2. Versicherungsdeckungs-Nachweis
3. ITAR/EAR-Konformitätsnachweis

Wahl: Circom + snarkjs (Groth16). Aktueller Aufwand pro UC: 1-2 Engineering-Wochen → erst wenn Behörde es konkret verlangt.

### 4.8 Notification & Messaging Layer ✅ (basis)

V1 nutzt Audit-Log-Inserts. V2 ergänzt:

- eIDAS 2.0 qualifizierte elektronische Signatur (über D-Trust QSCD-API, Phase 3).
- EUDIW-Push (Phase 4).
- Webhooks mit HMAC + Replay-Protection.

### 4.9 Audit Explorer ✅

V1 hat Operator-Mirror-SSE-Stream. V2 ergänzt:

- ✅ Time-Travel-Endpoint (`/api/pharos/time-travel?ts=...`).
- ✗ Reasoning-Graph-Visualisierung (react-flow, Phase 2).
- ✗ Diff-Mode zwischen zwei Snapshots.
- ✗ Bürger-Portal (Art. 15 DSGVO).

### 4.10 Interop Layer ✗ V2

- SCITT API (`/scitt/entries`, `/scitt/log/checkpoint`).
- W3C VC / SD-JWT-VC.
- DIDs (`did:web:pharos.eu/authority/bnetza`).
- MCP-Server für Behörden-AI-Agenten.

### 4.11 Regulatory Ontology Mirror ✅ (Phase 1)

Single Source of Truth in Trust Fabric. Aktuell ~74 Knoten (EU Space Act). Ziel: 3.000+ via NIS2 + nationale Space Acts + sektorales Recht. Versionierung via Hash-Chain in `NormDriftAlert`.

### 4.12 Sandbox & Simulation ✗ Phase 3

Behörden können hypothetische Szenarien durchspielen (z.B. "Was wäre, wenn Art. 88 TLPT-Pflicht ausgedehnt würde?"). Forkt Ontologie in Sandbox-Branch, re-evaluiert alle Submissions.

---

## 5. Datenmodell ✅ (Auszug)

V1-Status — vollständig in `prisma/schema.prisma`:

| Modell                  | Zweck                                       |
| ----------------------- | ------------------------------------------- |
| `AuthorityProfile`      | Behörden-Tenant + Public Signing Key        |
| `OversightRelationship` | Bilateraler Aufsichts-Handshake mit MDF/VDF |
| `OversightAccessLog`    | Append-Only Hash-Chain mit Receipts         |
| `NormAnchor`            | Postgres tsvector + GIN für BM25-Search     |
| `NormDriftAlert`        | Drift-Detection für Ontologie-Updates       |

V2 ergänzt: `WorkflowEvent` (XState-Persistenz), `PolicyDecision` (Cedar-Audit, falls Cedar adoptiert), `BureaucratDecision` (k-of-n-signed final verdicts).

---

## 6. AI/ML Layer — Anti-Halluzinations-Strategie ✅

| Schicht | Mechanismus                                      | Status      |
| ------- | ------------------------------------------------ | ----------- |
| 1       | Citation-Required (Schema-enforced)              | ✅          |
| 2       | Self-Consistency n=5, T=0, Disagreement-Score    | ✅ (opt-in) |
| 3       | LLM-as-a-Judge (zweite Inferenz prüft Citations) | ✅          |
| 4       | Abstention-Pattern wörtlich erzwungen            | ✅          |
| 5       | Constitutional Constraints im System-Prompt      | ✅          |
| 6       | Deterministic Mode (Cache-Key-basiert)           | ✅          |
| 7       | Multi-LLM-Consensus (Sonnet + Opus)              | ✗ V2 (Cost) |
| 8       | Mechanistic-Interpretability-Hooks               | ✗ V3        |

---

## 7. Deployment & Operations ✅

- ✅ Vercel Edge/Serverless Functions (Node 22)
- ✅ Vercel Cron für Norm-Drift-Sentinel + SLA-Watchdog
- ✅ Neon Postgres EU-Frankfurt mit Branching
- ✗ Multi-Region-Failover (Phase 3)
- ✗ Backup-Verschlüsselung mit libsodium secretstream offsite (Phase 4)

---

## 8. Security & Compliance ✅ (Phase 1)

- ✅ EU-only Data Residency (Neon Frankfurt + Vercel EU)
- ✅ DSGVO-konforme AVVs mit Anthropic, Vercel, Neon
- ✅ Triple-Hash signed Receipts (DSGVO Art. 15 sufficient)
- ✗ VS-NfD On-Premise-Distribution (Phase 4)
- ✗ Pen-Test pre-major-release
- ✗ Bug-Bounty (Phase 2 via security.txt)

**Rechtsgrundlagen-Mapping**:

- EU AI Act Art. 11–15 → ✅ alle erfüllt
- DSGVO Art. 22 + EuGH C-634/21 (Schufa) → ✅ erfüllt (keine Endentscheidung)
- VwVfG § 35a / § 39 → ✅ erfüllt (Begründungs-Entwurf, Sachbearbeiter unterzeichnet)
- NIS2 Art. 23 → ✗ V2 (Workflow-Engine erforderlich)
- EU Space Act Art. 75–95 → ✗ V2 (sobald Trilog abgeschlossen)
- eIDAS 2.0 / EUDIW → ✗ Phase 4

---

## 9. User Experience

- ✅ Light-Mode-Default mit 3-Wege-Theme-Toggle
- ✅ Glass-Box-UI mit Citation-Chips + Receipt-Verify
- ✗ EUDIW-Login (Phase 4)
- ✗ MFA-Pflicht für Pro-Tier (Phase 2)
- ✗ WCAG 2.2 AA Audit (Phase 2)
- ✗ Mehrsprachigkeit (DE, EN bereits, FR/IT/ES Phase 3)

---

## 10. Roadmap (gegenüber V1 verfeinert)

### Phase 1 — Foundation ✅ DONE

- SCITT-Log + Hash-Chain + Single-Witness
- COSE-equivalent + Operator-Submission-Empfang
- Authority Dashboard Read-Only-Inbox + Audit Explorer

### Phase 2 — Verification (T+30 to T+90)

- ✅ AI Copilot mit Citation-Required, Self-Consistency, Judge
- ✅ Time-Travel-Endpoint
- Witness-Quorum 3-of-5
- k-of-n Multi-Party-Approval auf Status-Transitions
- Reasoning-Graph-UI (react-flow)
- COSE_Sign1 CBOR-Wrapper-Migration

### Phase 3 — Pilot Production (T+90 to T+270)

- 5+ Behörden in Produktion (LSA Luxemburg, AESIA Spanien als Erststarter)
- Cross-Border-Coordination via EUSRN/CSIRT-Netzwerk
- Pen-Test #1
- C2PA-Manifests für offizielle Bescheide

### Phase 4 — Federation (T+270 to T+1080)

- VS-NfD On-Premise-Distribution
- ZK-ML-Inferenzbeweise (sobald commercially viable)
- EUDIW-Integration
- Cross-EU-Reach mit ≥ 12 nationalen Behörden + EUSPA + ENISA

---

## 11. Genialitätsfeatures (Bewertet)

| Feature                                            | Status                     | Priorität |
| -------------------------------------------------- | -------------------------- | --------- |
| 1. Provable Inference Lite (Triple-Hash + Witness) | ✅ Triple-Hash, ✗ Witness  | P1        |
| 2. Compliance-Time-Machine                         | ✅ Endpoint live           | P0        |
| 3. Cross-Authority DP Knowledge Mesh               | ✅ Laplace + ε-Budget      | P1        |
| 4. Living Regulatory Graph                         | ✅ NormAnchor + DriftAlert | P1        |
| 5. Zero-Knowledge Compliance Proofs                | ✗ Phase 4                  | P3        |
| 6. Constitutional AI Guarantees                    | ✅ System-Prompt + Judge   | P0        |
| 7. Reasoning Replay (DAG-Animation)                | ✗ V2                       | P2        |
| 8. Reverse Audit                                   | ✗ V3                       | P3        |
| 9. Operator SSI (EUDIW)                            | ✗ Phase 4                  | P3        |
| 10. Auditor-as-a-Service                           | ✗ V2                       | P2        |
| 11. Constitutional Drift Detection                 | ✗ V2                       | P2        |
| 12. Citizen-Audit-API (Art. 15 DSGVO)              | ✗ V2                       | P1        |

---

## 12. Open-Source-Komponenten — Adopted vs. Skipped

**Adopted ✅:**

- `@anthropic-ai/sdk`, `node:crypto` (Ed25519, scrypt), `zod`, `prisma`,
  `@noble/hashes` (via stdlib), Postgres tsvector + GIN.

**Considered & Skipped ✗:**

- `cose-js` / `@auth0/cose` — V2 für CBOR-Wrapper-Konformität.
- `snarkjs` + `circom` — Phase 4 (ZK-Proofs).
- `@cedar-policy/cedar-wasm` — bewusst nicht adoptiert (Over-Engineering).
- `xstate` v5 — V2 für Workflow-Engine.
- `macaroons.js` — Phase 3 (Auditor-Token-Use-Case).
- `c2pa-ts` — Phase 3 (PDF-Manifests).
- `@modelcontextprotocol/sdk` — Phase 3 (MCP-Server für Behörden-Agenten).
- `@simplewebauthn/server` — Phase 2 (MFA für Pro-Tier).
- `react-flow` / `@xyflow/react` — Phase 2 (Reasoning-Graph).
- `@sphereon/ssi-sdk` — Phase 4 (EUDIW).

---

## 13. Risikoanalyse — Stand April 2026

| Risiko                                      | Mitigation in V1 ✅                          | V2-Ergänzung                                        |
| ------------------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| Anthropic-API-Ausfall                       | Read-Only-Modus für Inbox/Audit              | + Mistral EU als Fallback (nicht-juristische Tasks) |
| Vercel/Neon Cloud Act                       | EU-only Deployment + AVV                     | + VS-NfD On-Premise-Pfad (Phase 4)                  |
| EuGH erweitert Schufa-Doktrin               | Keine Endentscheidung, k-of-n                | konstruktiv konform                                 |
| Behörden langsame Adoption                  | Lite kostenlos                               | + EU-Förderung Co-Finanzierung                      |
| Hallucination in Begründung                 | Citation-Required + Judge + Self-Consistency | Multi-LLM-Consensus (Sonnet+Opus)                   |
| Witness-Quorum bricht                       | (nicht implementiert in V1)                  | 5 Witnesses, 3-of-5; transparency.dev als Backup    |
| Reproducibility bricht durch Modell-Updates | ✅ Modell-ID inkl. Subversion in inputHash   | + Cache-Hit-Garantie                                |

---

## 14. Schlusswort

Pharos V2 ist die strategische Vision; V1 (Phase 1) ist der gelieferte Code (April 2026). Die Lücke V1 → V2 ist hauptsächlich:

- **Witness-Quorum** (3-of-5 statt Single-Witness) — 1-2 Tage Arbeit
- **Multi-Party-Approval** für Decision-Transitions — 2 Tage
- **Reasoning-Graph-UI** — 3-5 Tage (react-flow)
- **NIS2-Workflow-Engine** mit XState — 1 Woche
- **Citizen-Audit-API** (DSGVO Art. 15) — 3 Tage
- **COSE_Sign1 CBOR-Wrapper-Migration** — 2 Tage

Cedar, Macaroons, ZK-Proofs, EUDIW-Login bleiben **bewusst Phase 4** — der ROI rechtfertigt den Aufwand nicht, solange keine Behörde es konkret verlangt. Pharos verfolgt **disziplinierte Genügsamkeit** als Leitprinzip: jeder zusätzliche Open-Source-Baustein muss einen Use-Case lösen, den die Schichten 1-3 nicht abdecken.
