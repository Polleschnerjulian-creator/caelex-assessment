# Caelex — Precision Compliance Engine

**Stand:** 2026-05-01
**Scope:** Wie bauen wir ein Operator-Profil das **korrekt und beweisbar echt** ist, generieren daraus **perfekt zugeschnittene Workflows**, und visualisieren das **hightech-mäßig** in der UI?
**Trigger:** Founder-Frage: "Muss supergut durchdacht sein. Wie erstellen wir das Operator-Profil? Wie kommen wir an die richtigen Daten? Wir dürfen niemals Fakes oder Demos. Wie schneiden wir Workflows perfekt zu? Wie stellen wir das hightech in der UI dar?"

> **Eine Zeile.** Das Operator-Profil ist eine Verifiable-Credentials-Kette mit Source-Provenance pro Feld. Daraus generiert der Compliance-Orchestration-Engine personalisierte Workflow-DAGs. Visualisiert wird das als Living-Compliance-Universe mit Real-Time-Reasoning-Trail — Palantir-Niveau, aber compliance-native.

---

## Inhaltsverzeichnis

1. [Teil A: Verified Profile Building](#teil-a)
2. [Teil B: Compliance Orchestration Engine](#teil-b)
3. [Teil C: High-Tech UI](#teil-c)
4. [Implementation-Sequence](#implementation-sequence)

---

## Teil A: Verified Profile Building

### Das Kern-Prinzip: jedes Profil-Datum hat eine Provenance-Kette

**Falsch (klassisches Onboarding):**

```
Operator-Type: [LEO Constellation Operator]   ← User hat das gesagt, wir glauben's
```

**Richtig (Caelex Verified Profile):**

```
Operator-Type: LEO Constellation Operator
├─ Provenance: derived from 3 sources
│  ├─ Handelsregister Berlin HRB 234567 (verified 2026-05-01 14:30 UTC)
│  │  Source-Hash: sha256:8f3a... [verify]
│  │  → "Acme Space GmbH, Tätigkeit: Betrieb von Erdbeobachtungssatelliten"
│  ├─ UNOOSA Online Index Object Registration (verified 2026-05-01 14:31 UTC)
│  │  → 2 LEO satellites registered under operator
│  └─ Operator confirmation (2026-05-01 14:35 UTC)
│     QES-Signature: D-Trust ID 8a3f...
├─ Confidence: 99.2% (3-way cross-verified)
├─ Last verified: 2026-05-01 14:35 UTC
└─ Re-verify in: 90 days (or on profile-change)
```

**Das ist nicht nur "Operator gibt ein und wir glauben"** — das ist eine **kryptographisch verifizierbare Datenkette**, ähnlich wie W3C Verifiable Credentials.

### Verification-Tier-System

Jedes Profil-Feld hat einen **Verification-Tier**:

| Tier                        | Status                | Beschreibung                                                            | Trust-Level für Compliance                               |
| --------------------------- | --------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| **T0 — Unverified**         | `unverified`          | Operator hat eingegeben, niemand hat verifiziert                        | Display only — nicht für Compliance-Decisions            |
| **T1 — Self-Confirmed**     | `operator_confirmed`  | Operator hat aktiv "Stimmt"-Button geklickt mit Datum + Audit-Trail     | Reicht für interne Workflows                             |
| **T2 — Source-Verified**    | `source_pulled`       | Aus offizieller Quelle gezogen (Handelsregister, UNOOSA, BAFA-Register) | Reicht für externe Submissions                           |
| **T3 — Counsel-Attested**   | `counsel_attested`    | Counsel-Anwalt hat QES-signed bestätigt                                 | Reicht für rechtsverbindliche Aktionen                   |
| **T4 — Authority-Verified** | `authority_attested`  | NCA hat über Pharos bestätigt                                           | Höchstes Trust-Level — z.B. für Cross-Border-Submissions |
| **T5 — Crypto-Bound**       | `cryptographic_proof` | Mit X.509-Certificate / DID / Trustanchor verbunden                     | Mathematisch nachweisbar — für Defense-Tier              |

**Beispiel-Mapping pro Profil-Datum:**

```
Operator-Name              T2 (Handelsregister)
Mission-Type              T2 (UNOOSA + Website-Scrape) → operator confirms → T1+T2
Spacecraft-Masse          T2 (UNOOSA) für existing, T1 für planned
Insurance-Police          T1 (operator) → T3 (counsel-attested) → T5 (broker-DID)
Cyber-Posture-Tier        T3 (counsel-attested only — operator-direct nicht reichend)
Customer-List             T3 oder T4 (oft NDA-geschützt — counsel-mediated)
ITAR-Status               T5 (cryptographic — Defense-Tier)
```

### Auto-Detection mit Provenance-Logging

Statt "wir scrapen halt mal":

```typescript
// src/lib/operator-profile/auto-detect.server.ts
async function detectFromHandelsregister(
  domain: string,
): Promise<DetectionResult> {
  const response = await handelsregisterAPI.lookup(domain);

  // KRITISCH: alles wird als evidence gespeichert, nicht nur das Resultat
  return {
    field: "operator_name",
    value: response.companyName,
    source: "handelsregister-de",
    sourceURL: response.sourceURL,
    sourceTimestamp: response.fetchTimestamp,
    sourceHash: sha256(JSON.stringify(response.rawResponse)), // raw evidence preserved
    rawEvidence: response.rawResponse, // für Audit
    detectionMethod: "API_LOOKUP",
    confidence: 0.99, // Handelsregister ist authoritative source
    verificationTier: "T2",
    expiresAt: addDays(new Date(), 90), // Re-verify nach 90 Tagen
  };
}
```

**Jedes Datum wird als `ProfileEvidence`-Row persistiert:**

```prisma
model ProfileEvidence {
  id String @id @default(cuid())
  profileId String
  profile OperatorProfile @relation(...)

  field String                  // "operator_name", "mission_type", etc.
  value Json                    // strukturierter Wert
  verificationTier String       // T0 | T1 | T2 | T3 | T4 | T5
  confidence Float              // 0.0 - 1.0

  source String                 // "handelsregister-de", "unoosa", "operator-confirmed"
  sourceURL String?             // Deep-Link zur Quelle
  sourceTimestamp DateTime
  sourceHash String             // SHA-256 des Raw-Response

  rawEvidence Json              // Vollständiger Source-Response (für Audit)

  detectionMethod String        // "API_LOOKUP", "USER_INPUT", "COUNSEL_ATTEST", etc.

  // Counsel-Attest-spezifisch
  attestedBy String?            // userId of counsel
  attestedSignature String?     // QES-Signature
  attestedAt DateTime?

  // Cryptographic-Tier-spezifisch
  cryptoCert String?            // X.509-Cert
  cryptoDID String?             // W3C DID

  // Hash-Chain (analog AuditLog)
  prevHash String
  entryHash String

  createdAt DateTime @default(now())
  expiresAt DateTime?           // Auto-re-verify
  invalidatedAt DateTime?
  invalidatedReason String?

  @@index([profileId, field])
  @@index([verificationTier])
}
```

**Resultat:** Jedes Profil-Datum ist **rückverfolgbar bis zur Original-Quelle** mit kryptographischem Hash. Bei Audit kann Caelex zeigen: "Zum Zeitpunkt X hatten wir Evidence Y aus Quelle Z mit Confidence W."

### Cross-Verification durch mehrere Quellen

Für jeden wichtigen Profil-Aspekt fordert Caelex **mindestens 2 unabhängige Quellen** + Operator-Bestätigung:

```
Mission-Type: "LEO Earth Observation"
├─ Source 1: Website-Scrape (acme-space.de Homepage Text-Match) — Confidence 0.7
├─ Source 2: UNOOSA Object-Registration (Mission-Typ-Field) — Confidence 0.95
├─ Source 3: BAFA-Authorization-Document (Use-Case beschrieben) — Confidence 0.99
├─ Cross-Verification: Alle 3 Quellen sagen "Earth Observation" ✓
├─ Operator-Confirmation: 2026-05-01 14:35 ✓
└─ Final Confidence: 0.99 (3-source agreement)
```

Wenn Sources sich widersprechen: das wird **prominent als Conflict-Card** angezeigt:

```
⚠ KONFLIKT IN PROFIL-DATEN
─────────────────────────────────
Field: operator_size
├─ Source 1 (LinkedIn): ~14 employees
├─ Source 2 (Crunchbase): 25-50 employees
└─ Conflict-Magnitude: 2x divergence

Bitte Operator klärt: [< 10] [10-25] [25-50] [50-100] [> 100]
Diese Angabe wird audit-getrackt mit deinem Account.
```

**Caelex präsentiert nie eine Hypothese als Fakt** — Konflikte werden sichtbar, nicht aufgelöst.

### Re-Verification-Lifecycle

Profil-Daten können sich ändern. Caelex hat einen **Re-Verification-Cron**:

```
Cron: profile-reverification (daily 04:00)
├─ Findet Evidence-Rows mit expiresAt < now()
├─ Pro Row: re-runs detection (Handelsregister-API, UNOOSA, etc.)
├─ Wenn neue Evidence != alte Evidence:
│  ├─ Erstellt neue Evidence-Row mit prevHash-Link
│  ├─ Markiert alte als invalidatedAt
│  └─ Notifiziert Operator (In-App + Email)
├─ Wenn Operator nicht reagiert binnen 30 Tagen:
│  └─ Profil-Field wird als "stale" markiert (gelbes Warning-Badge)
```

**Resultat:** Profil bleibt **lebend und korrekt**, nicht "beim Onboarding eingegeben und vergessen".

### Operator-eigene Quellen anbinden (verifiable)

Operator kann **selbst Verifiable-Sources** anbinden:

```
DEINE VERIFIZIERBAREN QUELLEN
─────────────────────────────────────────────────────────
✓ Handelsregister Berlin HRB 234567 (auto, daily re-verify)
✓ UNOOSA Object Registration (auto, weekly re-verify)
✓ BAFA Authorization-Records (auto, monthly re-verify)

Optional zu verbinden:
○ Microsoft 365 (für Mission-Documents)
○ Jira/Linear (für Compliance-Tickets)
○ AWS/GCP/Azure (für Cyber-Posture-Verifikation)
○ GitHub (für SBOM + Code-Audit)
○ DocuSign / D-Trust (für QES-Signatures)
○ Insurance-Broker-API (für Police-Verifikation)
```

Jede angebundene Quelle wird via OAuth/API/Webhook angebunden. **Keine manuelle Eingabe — Daten kommen direkt + cryptographic-signed.**

### "No Demos, No Fakes"-Garantie

In der gesamten Caelex-Plattform gilt:

**1. Synthetische Daten sind ausschließlich isoliert.** Demo-Mode (für Onboarding-Trust-Building) läuft in eigener `OrgType=DEMO`-Instanz. **Keine** synthetischen Daten leaken in produktive Workflows.

**2. Jede AI-Antwort ist source-cited.** Astra darf keine Aussage machen ohne Citation auf Verifiable-Source. Citation-Validator (existiert in Atlas) wird auf Comply portiert.

**3. Confidence-Score überall.** Keine "wir glauben halt" — immer "Confidence X% basierend auf Y Quellen".

**4. Audit-Trail ist immutable.** Jedes Profil-Update ist hash-chained. Keine destruktiven Edits — Updates erstellen neue Evidence-Rows.

**5. Operator-Override ist gekennzeichnet.** Wenn Operator eine Hypothese überschreibt, wird das mit "Operator-Override 2026-05-01"-Stempel + Begründung dokumentiert.

---

## Teil B: Compliance Orchestration Engine

### Das Problem mit "Engine sagt was applicable ist"

Heute haben die 24 Caelex-Engines folgenden Output:

```
nis2-engine.applies(operator) → ["NIS2-Art-21", "NIS2-Art-23", ...]
eu-space-act-engine.applies(operator) → ["Art-7", "Art-14", "Art-17", ...]
```

Das ist eine **flache Liste applicable Articles**. Aber ein perfekt zugeschnittener Workflow braucht mehr:

- **Welche Reihenfolge?** Article 14 (Insurance) muss vor Article 7 (Authorization) sein, weil Article 7 Insurance-Existence verlangt
- **Welche Dependencies?** Document-Generierung für Art. 14 braucht Police-Detail-Daten — also muss Police-Daten-Eingabe vorher kommen
- **Welche Stakeholder?** Spacecraft >100kg verlangt Counsel-Review — also muss Counsel-Touch-Point eingeplant werden
- **Welcher Time-Plan?** Authorization braucht 6 Monate, Launch ist in 14 Monaten — Phase-Plan muss zurückgerechnet werden
- **Welche Re-Use?** Operator hatte schon Sat-Acme-1 authorisiert — Documents/Templates können wiederverwendet werden
- **Welche externen Dependencies?** Counsel-Tobias hat Urlaub Aug 15-30 — also vermeiden wir kritische Reviews in dem Zeitraum
- **Welche Cron-Triggers?** TLE-Polling muss aktiv sein für Sat-Acme-1, weil EOL in 7 Jahren

**Das ist orchestration logic — nicht engine logic.**

### Die Architektur: Compliance Orchestration Engine (COE)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│         OPERATOR PROFILE (mit Provenance-Kette)                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                            ↓
                   Engine-Cluster runs:
                   - eu-space-act-engine
                   - nis2-engine
                   - copuos-engine
                   - cra-engine
                   - export-control-engine
                   - ... (24 Engines)
                            ↓
           Applicable-Compliance-Set (raw)
                            ↓
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│         COMPLIANCE ORCHESTRATION ENGINE (COE)                  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. Dependency-Resolver                                   │ │
│  │    Welche Articles brauchen Daten von welchen anderen?   │ │
│  │    → Topological sort                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 2. Stakeholder-Mapper                                    │ │
│  │    Welche Steps brauchen Counsel/Authority/Investor?     │ │
│  │    → Multi-Actor-Slot-Plan                               │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 3. Time-Backward-Planner                                 │ │
│  │    Launch in 14 Mo, Authorization braucht 6 Mo,          │ │
│  │    Pre-Launch braucht 3 Mo Buffer → Reverse-Schedule     │ │
│  │    → Phase-Plan mit Hard-Deadlines                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 4. Re-Use-Detector                                       │ │
│  │    Operator hat Sat-1 authorisiert → Documents reusable  │ │
│  │    → Skip-Steps + Reference-Steps                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 5. External-Constraint-Solver                            │ │
│  │    Counsel-Urlaub, NCA-Quartalsfrist, Insurance-Renewal  │ │
│  │    → Constraints in Phase-Plan eingebaut                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 6. Risk-Prioritizer                                      │ │
│  │    Welche Steps haben höchstes Penalty-Risk wenn delayed?│ │
│  │    → Priority-Order                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                            ↓
           PERSONALIZED WORKFLOW-DAG
                  (gerichteter azyklischer Graph)
                            ↓
              gerendert als Mission-Roadmap-UI
```

### Output-Format: Workflow-DAG

Statt linearer "12-Schritte"-Liste:

```typescript
interface PersonalizedWorkflowDAG {
  missionId: string;
  generatedAt: Date;
  validUntil: Date; // Re-generate if profile changes

  phases: WorkflowPhase[];
  edges: PhaseDependency[]; // depends-on relationships

  hardDeadlines: Deadline[];
  softMilestones: Milestone[];

  stakeholders: Stakeholder[]; // wer ist involved
  externalConstraints: Constraint[]; // urlaub, nca-frist, etc.

  reusableArtifacts: Artifact[]; // existing documents to reuse

  riskHeatmap: RiskItem[]; // priority-order
}

interface WorkflowPhase {
  id: string;
  name: string;
  steps: WorkflowStep[];
  dependsOn: string[]; // andere Phase-IDs

  // Time-aware
  estimatedDuration: number; // in days
  startNotEarlierThan: Date;
  startNotLaterThan: Date;
  hardDeadline?: Date;

  // Stakeholder-aware
  primaryActor: ActorRole;
  reviewActors: ActorRole[]; // optional Counsel/Authority

  // Personalized
  personalizationRationale: string; // "Diese Phase ist für dich relevant weil..."
}
```

### Beispiel: Sat-Acme-3 personalized DAG

Aufgrund Profil:

- 47kg LEO Earth-Observation
- DE-HQ + FR-Operations
- 14 MA (NIS2 Essential)
- Counsel: Tobias bei Kanzlei Y
- Insurance: Munich Re, läuft 2026-08-15 ab
- Launch geplant 2026-09-23

**Generierter DAG (vereinfacht):**

```
PHASE 1: AUTHORIZATION (T-180 → T-90)
├─ Step 1.1: Spacecraft-Metadata erfassen [3 Tage, OPERATOR]
├─ Step 1.2: Mission-Profile-Document [5 Tage, OPERATOR + ASTRA-DRAFT]
├─ Step 1.3: Insurance-Coverage-Plan [parallel zu 1.2, depends on Police-Renewal]
├─ Step 1.4: Cyber-Plan [7 Tage, COUNSEL-required because >50% MA in DE]
├─ Step 1.5: Debris-Plan [5 Tage, OPERATOR + COPUOS-Engine-pre-fill]
├─ Step 1.6: Counsel-Review (Tobias) [allow buffer, Tobias Urlaub 15.-30. Aug avoided]
├─ Step 1.7: QES-Sign-Off Mission-Director [1 Tag]
├─ Step 1.8: BAFA-Submission [auto via Pharos-Webhook]
└─ Step 1.9: NCA-Status-Polling [60-180 Tage]

PHASE 1B (parallel): FRENCH-AUTHORIZATION (T-150 → T-90)
├─ Re-uses Phase 1 Sections 1-5 (NUR Translation + FR-spezifische Anpassung)
├─ Step 1B.1: French-Translation [3 Tage, automatic + Counsel-Review]
├─ Step 1B.2: CNES-Submission via Pharos
└─ Step 1B.3: CNES-Status-Polling

PHASE 2: INSURANCE-RENEWAL (T-180 → T-60)  ← PARALLEL Phase 1
├─ Trigger: Police läuft 2026-08-15 ab
├─ Step 2.1: Munich-Re-Renewal-Email-Draft [2 Tage, ASTRA-DRAFT]
├─ Step 2.2: Renewal-Verhandlung [external, OPERATOR + BROKER]
├─ Step 2.3: Neue Police verifizieren [1 Tag, OPERATOR + AUTO-PULL]
└─ Hard-Deadline: 2026-07-31 (vor Authorization-Submission)

PHASE 3: PRE-LAUNCH-CHECK (T-90 → T-7)
├─ Trigger: Phase 1 + 2 complete
├─ Step 3.1: 12-Module-Final-Check [auto, ASTRA + ENGINES]
├─ Step 3.2: COPUOS-Decommissioning-Plan-Final [3 Tage]
├─ Step 3.3: Insurance-Pre-Launch-Verification [1 Tag]
├─ Step 3.4: NIS2-Continuous-Compliance-Snapshot [auto]
└─ Step 3.5: Launch-Authorization-Certificate (QES) [1 Tag]

PHASE 4: LAUNCH-DAY (T-1 → T+1)
├─ Step 4.1: Final-Pre-Launch-Hash-Snapshot
├─ Step 4.2: Launch-Telemetry-Sentinel-Activation
└─ Step 4.3: Post-Launch-NCA-Notification (24h SLA)

PHASE 5: CONTINUOUS-COMPLIANCE (T+1 → T+EOL)
├─ Daily-Astra-Compliance-Snapshot
├─ Monthly-Sentinel-Telemetry-Review
├─ Quarterly-Insurance-Status
└─ Yearly-Annual-Re-Attestation

PHASE 6: END-OF-LIFE (T+EOL-90d → T+EOL+90d)
├─ Pre-Deorbit-Checklist
├─ Deorbit-Burn-Window
├─ Post-Deorbit-Verification (CelesTrak-monitoring)
└─ NCA-Final-Report

PARALLEL THREADS (laufen kontinuierlich):
├─ NIS2-Update-Watch (Atlas-Feed → Impact-Assessment)
├─ Regulatory-Drift-Detection (alle Regulations)
├─ Sentinel-Telemetry (Sat-Acme-3 nach Launch)
└─ Optimization-Engine (Regulatory-Arbitrage-Vorschläge)

PERSONALIZATION-NOTES:
- Phase 1.4 (Cyber-Plan) hat Counsel-Required weil DE >50% MA → NIS2-Essential
- Phase 1B (FR-Authorization) eingefügt weil Operating-Jurisdictions = DE+FR
- Phase 2 vor Phase 1 abgeschlossen weil Article 14 Insurance verlangt
- Sections 1-5 in Phase 1B reused von Phase 1 → 60% Doppelarbeit gespart
- Counsel-Review Step 1.6 verschoben zu T-110 weil Tobias 15-30 Aug Urlaub
- Sat-Acme-1 Decommissioning-Plan teilbar mit Sat-Acme-3 → re-use Template
```

**Das ist ein perfekt zugeschnittener Workflow.**

### Wie der COE das berechnet

Algorithmus (vereinfacht):

```typescript
async function generatePersonalizedWorkflowDAG(
  operatorProfile: OperatorProfile,
  spacecraft: Spacecraft,
  goal: 'AUTHORIZATION' | 'PRE_LAUNCH' | 'CONTINUOUS' | ...
): Promise<PersonalizedWorkflowDAG> {

  // Step 1: Run all 24 engines
  const applicableSet = await runEngines(operatorProfile, spacecraft);

  // Step 2: Resolve dependencies (topological sort)
  const dependencyGraph = await buildDependencyGraph(applicableSet);

  // Step 3: Map stakeholders
  const stakeholderPlan = await mapStakeholders(
    applicableSet,
    operatorProfile.stakeholders
  );

  // Step 4: Reverse-time-plan from goal
  const phasePlan = await reverseTimePlanner(
    spacecraft.plannedLaunchDate,
    dependencyGraph
  );

  // Step 5: Detect re-usable artifacts
  const reusable = await detectReusableArtifacts(
    operatorProfile.previousMissions,
    applicableSet
  );

  // Step 6: Apply external constraints
  const constraints = await fetchExternalConstraints(
    stakeholderPlan,
    spacecraft.plannedLaunchDate
  );

  // Step 7: Risk-prioritize
  const risks = await riskPrioritize(applicableSet, operatorProfile.profile);

  // Step 8: Generate DAG
  return assembleDAG({
    applicableSet,
    dependencyGraph,
    stakeholderPlan,
    phasePlan,
    reusable,
    constraints,
    risks,
  });
}
```

**Kein Hardcoded "12-Step-Workflow"** — der DAG ist 100% aus Profil + Spacecraft + Goal generiert.

### Re-Generation bei Profil-Änderungen

Workflow-DAG wird **nicht beim Onboarding eingefroren**. Bei jeder relevanten Änderung wird er neu generiert:

```
Trigger-Events für DAG-Regeneration:
├─ Profile-Field-Update (Operator hat Insurance-Police geändert)
├─ Atlas-Regulatory-Update (NIS2-Update detected)
├─ Engine-Version-Update (Caelex hat eu-space-act-engine v2.4 deployed)
├─ Mission-Phase-Transition (T-90 erreicht → Pre-Launch-Phase aktiv)
├─ Counsel-Engagement-Change (neuer Counsel onboarded)
└─ Stakeholder-Constraint (Counsel-Urlaub gemeldet)

Bei Re-Generation:
├─ Diff zum vorherigen DAG berechnen
├─ Operator wird notifiziert: "3 Schritte hinzugefügt, 1 verschoben, 0 entfernt"
└─ Old DAG bleibt im Audit-Trail (bi-temporal)
```

**DAG ist live, nicht statisch.**

### Integration mit COWF (Operator Workflow Foundation)

Der COE-Output ist **Input für COWF** (siehe `CAELEX-OPERATOR-WORKFLOW-FOUNDATION.md`):

```
COE.generatePersonalizedWorkflowDAG()
                ↓
PersonalizedWorkflowDAG (Output)
                ↓
COWF.instantiateWorkflows(dag)
                ↓
Multiple OperatorWorkflowInstance Records in Postgres
(jeweils mit ihrem eigenen Step-Set, Hash-Chain, AstraProposals)
```

**Resultat:** der DAG wird zu konkreten Workflow-Instanzen die COWF orchestriert.

---

## Teil C: High-Tech UI

### Das Visual-Vocabulary

Wir bauen kein "Dashboard mit Cards". Wir bauen eine **Living-Compliance-Universe** mit folgenden Visual-Primitives:

1. **3D Operator-Universe** (Three.js — wir haben es schon!)
2. **Real-Time-Reasoning-Trail** (Streaming-Astra-Tool-Calls)
3. **Provenance-Timeline** (jedes Datum mit Source-Trail)
4. **Workflow-DAG-Map** (Force-Directed-Graph)
5. **Live-Mission-Operations-Center** (Palantir-Inspiration aus letztem Gespräch)
6. **Audit-Hash-Chain-Visualizer** (Block-Chain-Animation)
7. **Compliance-Health-Pulse** (Living-Score-Animation)
8. **Source-Verification-Stream** (Terminal-Style-Live-Logs)
9. **Stakeholder-Network-Graph** (Operator-Counsel-Authority-Investor)
10. **Time-Travel-Slider** (Bi-Temporal-History-View)

### Visual 1 — 3D Operator-Universe

**Was:** Operator-Profil als animierte 3D-Scene mit Three.js (existiert schon für Mission-Control).

**Layout:**

```
                    Pluto-style outer ring of regulations
                  ┌─────────────────────────────────────┐
                  │  ✦ EU Space Act     ✦ NIS2  ✦ CRA  │
                  │  ✦ COPUOS  ✦ ITU  ✦ ITAR  ✦ DSGVO  │
                  └─────────────────────────────────────┘
                           ↓ (orbiting connections)

                          ┌──────────────┐
                          │              │
                          │   OPERATOR   │  ← center node, glow effect
                          │   Acme Space │
                          │              │
                          └──────┬───────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
        ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
        │ Sat-Acme-1│      │ Sat-Acme-2│      │ Sat-Acme-3│  ← Spacecraft as orbiting nodes
        │   LIVE    │      │   LIVE    │      │   PLANNED │
        │  T+2yr    │      │  T+6mo    │      │  T-145d   │
        └───────────┘      └───────────┘      └───────────┘

         (lines pulse softly when compliance-events happen)
```

**Eigenschaften:**

- Center: Operator-Org als Sphäre (mit Logo-Texture)
- Orbital-Ring 1: Spacecraft (animiert orbital — slow rotation)
- Orbital-Ring 2: aktive Workflows (purple glow)
- Outer-Ring: applicable Regulations (color-coded per Type)
- Connection-Lines: pulse beim Compliance-Event ("NIS2-Update-Pulse" durch alle betroffenen Lines)

**Tech:** Three.js + @react-three/fiber + Drei.js (existiert bereits in Caelex). Kein externer Cost.

**Interaktion:**

- Click auf Spacecraft → orbit camera zu der Sphäre, zeigt Detail-View
- Click auf Regulation → camera fliegt outward, zeigt alle applicable Articles
- Hover: Connection-Lines highlighten, zeigen "warum applicable"

### Visual 2 — Real-Time-Reasoning-Trail (Streaming Astra)

**Was:** Wenn Astra arbeitet, sieht Operator **live** wie sie tickt.

**Mockup:**

```
┌────────────────────────────────────────────────────────────────┐
│ ASTRA · ANALYZING · model:claude-sonnet-4-6@bedrock-eu          │
│                                                                │
│  ⚡ Tool: get_operator_profile()                               │
│     ↓ result: 47kg LEO EO, DE+FR, NIS2-Essential               │
│                                                                │
│  ⚡ Tool: get_applicable_articles({reg: 'EU_SPACE_ACT'})       │
│     ↓ result: 47 articles applicable                           │
│                                                                │
│  💭 Thinking: Article 14 requires 60M€ insurance for <500kg.   │
│     Operator's current Munich Re policy expires 2026-08-15.    │
│     This is BEFORE planned launch 2026-09-23. Renewal needed.  │
│                                                                │
│  ⚡ Tool: search_documents({type: 'INSURANCE_POLICY'})         │
│     ↓ result: Found "Munich Re Policy 2025-2026.pdf"           │
│                                                                │
│  💭 Thinking: Generating renewal-recommendation with 5         │
│     citations: Art. 14 (3.2.1), Munich Re Policy Section 4.1, │
│     Caelex-internal-template-v2, similar Sat-Acme-1            │
│     renewal-flow, BAFA renewal-guidance-2025.                  │
│                                                                │
│  ⚡ Generating proposal... [streaming text appears]             │
│     "Renewal der Munich-Re-Police um 60 Tage vorziehen, da..." │
│                                                                │
│  ✓ Reasoning complete · 4 tools · 7 thoughts · 12s              │
│  ✓ Citations valid (5/5 verified against catalogs)             │
│  ✓ Cross-check vs GPT-4o-mini: agreement 0.94                  │
│  ✓ Ready for your review                                       │
└────────────────────────────────────────────────────────────────┘
```

**Eigenschaften:**

- **Streaming**: jeder Tool-Call + Thought erscheint live mit ~200ms-Delays
- **Citation-Inline**: jede Citation als clickable Link
- **Cross-Check-Status**: Multi-Model-Agreement-Score sichtbar
- **Audit-Anchor**: am Ende clickable "Verify in Hash-Chain" Button → öffnet Verity-Page

**Tech:**

- Server-Sent-Events oder WebSocket-Stream
- React mit Suspense + Streaming-Components
- AnimatePresence (Framer Motion) für Tool-Call-Cards

**Implementierung:** Astra V2 hat schon `decisionLog` — wir streamen das jetzt visuell statt nur final-zu-rendern.

### Visual 3 — Provenance-Timeline

**Was:** Per Profil-Datum eine ausklappbare Timeline der Source-Verifications.

**Mockup:**

```
┌─────────────────────────────────────────────────────────────────┐
│ OPERATOR-NAME: Acme Space GmbH                          T2 ✓   │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│  Provenance Trail (4 events):                                   │
│                                                                 │
│  ●  2026-05-01 14:30:42 UTC                                     │
│  │  Source-Pull: Handelsregister Berlin                         │
│  │  Source-URL: handelsregister.de/HRB234567                    │
│  │  Source-Hash: 0x8f3a... [verify]                             │
│  │  Confidence: 0.99                                            │
│  │                                                              │
│  ●  2026-05-01 14:31:15 UTC                                     │
│  │  Source-Pull: Crunchbase                                     │
│  │  Confidence: 0.95                                            │
│  │  Cross-Verification: ✓ matches Handelsregister               │
│  │                                                              │
│  ●  2026-05-01 14:35:02 UTC                                     │
│  │  Operator-Confirmation by Anna Schmidt                       │
│  │  Audit-Trail: AuditLog#1247                                  │
│  │                                                              │
│  ●  2026-08-01 04:00:00 UTC (next re-verify in 90d)             │
│     Auto-re-verify scheduled                                    │
│                                                                 │
│  [Show raw evidence ▼]   [Verify hash chain →]                  │
└─────────────────────────────────────────────────────────────────┘
```

**Eigenschaften:**

- Vertical Timeline mit Dot-Markern
- Pro Event: Source, Hash, Confidence, Audit-Anchor
- Expand für raw evidence (JSON-View)
- "Verify hash chain" → öffnet Verity-Public-Verify-Page

### Visual 4 — Workflow-DAG-Map (Force-Directed-Graph)

**Was:** Der personalized Workflow-DAG als interaktive Graph-Visualisierung — nicht als Liste.

**Mockup:**

```
                    [PHASE 6: EOL]
                         │
                  ─ ─ ─ ─┴─ ─ ─ ─
                          ↑
                          │ depends on
                          │
              [PHASE 5: CONTINUOUS COMPLIANCE]
                          ↑
                          │
              [PHASE 4: LAUNCH-DAY] ← T-1 to T+1
                          ↑
                          │
              [PHASE 3: PRE-LAUNCH] ← T-90
                          ↑
              ┌───────────┴───────────┐
              │                       │
   [PHASE 1: AUTHORIZATION]   [PHASE 2: INSURANCE-RENEWAL]
              │                       │
        ┌─────┴─────┐                 │
        │           │                 │
[PHASE 1B: FR-AUTH]  └─────────────────┘
                            ↑
                            │
                  [SPACECRAFT-METADATA]  ← starting point

    Currently active:  PHASE 1 (67% complete)
    Currently waiting: PHASE 2 (Munich Re-Negotiation)

    Click any node to drill in.
```

**Eigenschaften:**

- Force-Directed (D3.js or react-flow)
- Phase-Cards als Nodes, Dependencies als Edges
- Color-Code: green=done, yellow=running, gray=pending, red=blocked
- Pulse-Animation auf currently-active phase
- Click → zoom in, zeigt Steps in Phase
- Time-Slider unten: zeitliche Position visualisieren

**Tech:**

- React-Flow Library (open-source, free)
- Custom Edge-Renderer für Caelex-Style
- Animations via Framer Motion

### Visual 5 — Live-Mission-Operations-Center (Palantir-Inspired)

**Was:** Die im letzten Gespräch besprochene Multi-Mission-Card-Wall — aber **echt zugeschnitten**.

**Mockup:**

```
┌─ MISSION OPERATIONS CENTER ─ Live · 23 Background-Tasks ──────┐
│                                                                │
│ SAT-12      SAT-9       SAT-7      SAT-3     CONTINUOUS       │
│ Polestar    EO          Comm       R&D       Operations       │
│ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │
│ │RUNNING │  │COMPLETE│  │PENDING │  │ALERT   │  │RUNNING │    │
│ │Astra   │  │Posture │  │Counsel │  │Sentinel│  │CelesTrak│    │
│ │drafting│  │+3% 30d │  │review  │  │anomaly │  │TLE-poll │    │
│ │Doc 4.2 │  │  ✓     │  │~2 days │  │detected│  │last 2h  │    │
│ └────────┘  └────────┘  └────────┘  └────────┘  └────────┘    │
│ ┌────────┐  ┌────────┐  ┌────────┐                            │
│ │ACTION  │  │RUNNING │  │SCHEDULE│                            │
│ │AstraPr.│  │Pre-Lnch│  │Insurance                            │
│ │mark-att│  │check   │  │renewal │                            │
│ │HIGH    │  │8/12 GR │  │Munich  │                            │
│ └────────┘  └────────┘  └────────┘                            │
│                                                                │
│ Background tasks: [posture-snapshot] [sentinel-cross-verify]   │
│                   [astra-cleanup] [verity-sth-sign] [+19 more]│
└────────────────────────────────────────────────────────────────┘
```

**Eigenschaften:**

- Spalten = Missions
- Cards = aktive Phase-Steps + Background-Agents + Cron-Tasks
- Status-Coding (Palantir-Style: running/complete/action/alert/pending)
- Live-Updates via Server-Sent-Events (no external)
- Show-modes: Minimal (top 5 cards) / Default / Power-User-Wall

**Tech:** Standard React + Server Components + revalidate-on-event

### Visual 6 — Audit-Hash-Chain-Visualizer

**Was:** Die Hash-Chain visuell als Block-Chain-Animation — tasteful, nicht crypto-bro-style.

**Mockup:**

```
┌─ AUDIT HASH-CHAIN · Sat-12-Authorization ─────────────────────┐
│                                                                │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│  │ #1247   │───▶│ #1248   │───▶│ #1249   │───▶│ #1250   │     │
│  │ Spacec  │    │ Astra   │    │ Counsel │    │ QES-Sig │     │
│  │ created │    │ drafted │    │ approved│    │ signed  │     │
│  │ 14:30   │    │ 14:35   │    │ 16:42   │    │ 09:12   │     │
│  │ Anna    │    │ Astra-V2│    │ Tobias  │    │ Anna    │     │
│  │ 0x8f3a..│    │ 0x9c7b..│    │ 0xa2d8..│    │ 0xb4e1..│     │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘     │
│                                                                │
│  ✓ Tree-Head signed by BAFA on 2026-04-30 (witness)            │
│  ✓ OpenTimestamps Bitcoin-anchor 2026-04-01 Q1                 │
│                                                                │
│  Click any block to inspect full event + verify.               │
└────────────────────────────────────────────────────────────────┘
```

**Eigenschaften:**

- Hash-Chain als verbundene Blocks (subtle Animation)
- Witness + Bitcoin-Anchor-Status sichtbar
- Click block → Event-Detail mit raw payload + signature
- "Verify chain integrity" Button → läuft live durch alle Hashes

### Visual 7 — Compliance-Health-Pulse

**Was:** Der Posture-Score als **lebendige Visualisierung** statt nur "74%".

**Mockup:**

```
┌────────────────────────────────────────────────────────────────┐
│  YOUR COMPLIANCE HEALTH                                        │
│                                                                │
│         ┌──────┐                                               │
│         │  74% │ ▲ +3 in 30d                                  │
│         └──────┘                                               │
│           ❤️ pulse animation matches health-score                │
│                                                                │
│   ▰▰▰▰▰▰▰▰▰▰▱▱▱▱  74/100                                      │
│                                                                │
│  ┌─ STATUS DISTRIBUTION ─────────────┐  Living donut chart    │
│  │  ●●●●●●●●●●  Attested 60          │  segments breath        │
│  │  ●●●●●  Pending 10                │  (rhythmic scale)       │
│  │  ●●●  Evidence Required 8          │                        │
│  │  ●  Under Review 7                │                        │
│  │  Other (5)                        │                        │
│  └────────────────────────────────────┘                        │
│                                                                │
│  Trend last 30d:  ╱╲╱╲╱╲╱╱╱╲╱╲╱     (sparkline)               │
└────────────────────────────────────────────────────────────────┘
```

**Eigenschaften:**

- "Heartbeat" der Score-Donut (subtle scale animation, ~1 Hz)
- Status-Distribution als living donut (segments breathe)
- Bei Improvement: green-pulse-Effekt; bei Decline: amber-pulse
- Sparkline mit hover-tooltip per Day

### Visual 8 — Source-Verification-Stream

**Was:** Beim Auto-Detection-Onboarding ein **Live-Terminal** das zeigt was passiert.

**Mockup:**

```
┌─ AUTO-DETECTING YOUR PROFILE ─ Live ──────────────────────────┐
│                                                                │
│ 14:30:42  Querying Handelsregister Berlin...           [✓]    │
│           → "Acme Space GmbH HRB 234567"                      │
│                                                                │
│ 14:30:45  Querying UNOOSA Online Index...              [✓]    │
│           → 2 satellites found: Sat-Acme-1, Sat-Acme-2        │
│                                                                │
│ 14:30:48  Querying BAFA Public Register...             [✓]    │
│           → 1 active authorization                            │
│                                                                │
│ 14:30:52  Querying CelesTrak TLE Catalog...            [✓]    │
│           → Both satellites tracking, both LEO orbits          │
│                                                                │
│ 14:30:55  Cross-referencing data...                    [✓]    │
│           → All 4 sources consistent                          │
│                                                                │
│ 14:30:58  Computing applicable compliance...                  │
│           ┌─ Loading EU Space Act engine        [✓]           │
│           ├─ Loading NIS2 engine                [✓]           │
│           ├─ Loading COPUOS engine              [✓]           │
│           └─ ... 21 more engines                              │
│                                                                │
│ 14:31:14  Building personalized workflow DAG...        [✓]    │
│           → 5 active workflows, 47 articles applicable        │
│                                                                │
│ 14:31:18  Generating compliance roadmap...             [✓]    │
│           ✓ Profile built · Confidence 87% · 32 sec total     │
│                                                                │
│           [Show me what this means →]                          │
└────────────────────────────────────────────────────────────────┘
```

**Eigenschaften:**

- Terminal-Style mit timestamps
- Status-Indicator pro Step (✓ ✗ ⏳)
- Sub-Logs mit Tree-Indentation für Engine-Loading
- Sound-Effects optional (subtle "tick" pro completed step)
- Final "Show me what this means" CTA → leitet zur Hypothesen-Map

### Visual 9 — Stakeholder-Network-Graph

**Was:** Die 4-Aktor-Beziehungen als interaktiver Graph.

**Mockup:**

```
                       BAFA (Authority)
                            ●
                            │
                       (oversight)
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │                                       │
        ▼                                       ▼
   Acme Space ◄────(engagement)────► Tobias Müller
   (Operator)                         (Counsel)
        ▲                                  │
        │                                  │
        │                                  │
        │                            Kanzlei Y
        │                            (firm)
        │
        ▼
  Munich Re
  (Insurance)

  Click any node to see active interactions.
  Lines pulse when communication happens.
```

**Eigenschaften:**

- Force-directed layout
- Node-Sizes proportional zu Interaktions-Volumen
- Edge-Labels: type of relationship
- Live-Pulse beim Communication-Event
- Click → Stakeholder-Detail-Page

### Visual 10 — Time-Travel-Slider (Bi-Temporal)

**Was:** Compliance-State zu beliebigem Zeitpunkt rekonstruieren.

**Mockup:**

```
┌────────────────────────────────────────────────────────────────┐
│  TIME TRAVEL                                                   │
│                                                                │
│  Show compliance-state on:  [2027-03-15 ▼]                     │
│  ─────────────────────────────────────────                     │
│  2026 ▣▣▣▣▣▣▣▣▣▣▣▣ 2027 ◉▣▣▣▣ 2028 ▣▣▣▣ 2029 ▣▣▣▣ 2030       │
│                                                                │
│  🕐 As of 2027-03-15:                                          │
│                                                                │
│  Sat-12 status: ATTESTED (since 2026-09-23)                    │
│  Insurance: Munich Re Policy 2026-2029 (active)                │
│  NIS2-Posture: TIER-2 (last attest 2027-01-15)                │
│                                                                │
│  Active workflows at that time:                                │
│  - W3 Continuous Compliance                                    │
│  - W7 Supplier Risk-Onboarding (Honeywell)                     │
│                                                                │
│  Tree-Head at 2027-03-15:                                      │
│  Hash: 0x4f8a... [verify against witness]                      │
│  Witness: BAFA (signed 2027-03-12)                             │
│  Bitcoin-anchor: 2027-Q1                                       │
│                                                                │
│  [Show me what was happening on this date]                     │
└────────────────────────────────────────────────────────────────┘
```

**Eigenschaften:**

- Time-Slider über Total-Mission-Lifecycle
- Bei Slider-Change: gesamte UI re-rendert mit Daten von dem Zeitpunkt
- Tree-Head + Witness + Bitcoin-Anchor von dem Zeitpunkt sichtbar
- "Verify against witness" → externe Verification

**Tech:**

- Postgres 18 Bi-Temporal-Tables (Roadmap Q3 2026)
- React-State-Management mit Time-Travel-Provider
- Suspense für loading historical state

---

## Implementation-Sequence

### Phase A — Verified Profile Foundation (Q3 2026, ~6-8 Wochen)

**Sprint A1: Provenance-First Profile-Schema**

- `OperatorProfile` + `ProfileEvidence` Prisma-Models
- Verification-Tier-System (T0-T5)
- Hash-Chain auf ProfileEvidence (analog AuditLog)
- API: `GET/PATCH/POST /api/profile/[orgId]`

**Sprint A2: Auto-Detection-Engine**

- 5 Public-API-Adapters (Handelsregister, UNOOSA, BAFA-Register, LinkedIn, Crunchbase)
- Cross-Verification-Logic
- Re-Verification-Cron (daily 04:00)
- Confidence-Scoring

**Sprint A3: Counsel-Mediated-Attestation**

- Counsel-Atlas-Form für strukturierte Attestations
- QES-Integration via D-Trust
- Tier-T3-Persistierung mit Counsel-Sign-Off

### Phase B — Compliance Orchestration Engine (Q4 2026, ~8-10 Wochen)

**Sprint B1: COE-Architecture**

- `compliance-orchestration-engine.server.ts` neu
- Dependency-Resolver
- Stakeholder-Mapper
- Time-Backward-Planner

**Sprint B2: DAG-Generation**

- `PersonalizedWorkflowDAG`-Type
- Re-Use-Detector (gegen previousMissions)
- External-Constraint-Solver
- Risk-Prioritizer

**Sprint B3: COE-COWF-Integration**

- DAG → Multiple `OperatorWorkflowInstance`-Records
- Re-Generation-Triggers
- Diff-Calculator

### Phase C — High-Tech UI (Q1-Q2 2027, ~12-16 Wochen, parallel)

**Sprint C1: 3D-Universe + DAG-Map**

- Three.js Operator-Universe
- React-Flow DAG-Visualizer
- Live-Pulse-Animations

**Sprint C2: Real-Time-Reasoning + Provenance-Timeline**

- Server-Sent-Events für Astra-Streaming
- Provenance-Timeline-Component
- Citation-Validator-Integration

**Sprint C3: Operations-Center + Audit-Visualizer + Health-Pulse**

- Mission-Operations-Card-Wall
- Hash-Chain-Block-Visualizer
- Living-Health-Score-Animation

**Sprint C4: Source-Verification-Stream + Stakeholder-Graph + Time-Travel**

- Terminal-Style-Auto-Detection-Stream
- Force-Directed-Stakeholder-Graph
- Bi-Temporal-Time-Travel-Slider (depends on Postgres-18-Migration)

### Total Timeline

```
2026 Q3                      Q4                 2027 Q1               Q2
├─ Profile Foundation ─────┬─ COE ──────────┬─ UI Sprints ──────────┐
│  6-8 Wochen              │  8-10 Wochen   │  12-16 Wochen         │
│                          │                │                       │
└─ Operator-Profil mit ────┴─ Personalized ─┴─ Living-Compliance ──┘
   Provenance-Kette          DAG-Generation   Universe-UI
```

**Total: ~26-34 Wochen Engineering** (mit 2-3 Engineers parallel realistisch ~20-24 Wochen).

### Was wir parallel zu der UI bauen müssen

- **Real-Time-Streaming-Backbone** (Server-Sent-Events)
- **Postgres LISTEN/NOTIFY** für Live-Updates
- **Three.js-Asset-Pipeline** (Logos, Spacecraft-Models)
- **Sound-Design** (subtle interactions, optional)
- **Performance-Optimization** (60fps für Animations + LCP < 1.5s)

---

## Schluss

Die drei Fragen haben drei zusammenhängende Antworten:

1. **Wie kommen wir an verifiziert-echte Profil-Daten?**
   → 4-stufige Verification-Tier-Kette mit Provenance-Logging pro Datum, Auto-Detection aus 5+ öffentlichen Quellen, Counsel-Mediated für sensible Daten, Re-Verification-Cron für lebendiges Profil.

2. **Wie schneiden wir Workflows perfekt zu?**
   → Compliance Orchestration Engine generiert aus Profil + Engines + Dependencies + Stakeholders + Time-Constraints + Re-Use-Patterns + Risks einen personalisierten Workflow-DAG. Nicht hardcoded "12 Schritte" sondern dynamisch berechnet.

3. **Wie zeigen wir das hightech in der UI?**
   → 10 Visual-Primitives (3D-Universe, Real-Time-Reasoning, Provenance-Timeline, DAG-Map, Operations-Center, Hash-Chain-Visualizer, Health-Pulse, Source-Stream, Stakeholder-Graph, Time-Travel) — alle mit existing Stack (Three.js, React-Flow, Framer Motion) ohne externe Costs.

**Das Ganze ist möglich.** ~24 Wochen Engineering, 0 externe Kosten, 100% verifizierbar, 100% personalisiert, 100% AI-Act-konform durch Provenance-Pflicht.

**Caelex wird dadurch nicht "ein GRC-Tool unter vielen" — sondern die einzige Plattform die Compliance-Korrektheit kryptographisch beweist, individuell zuschneidet und visuell wie Palantir-meets-Cosmos zeigt.**

— Precision Compliance Engine, im Auftrag des Founders
