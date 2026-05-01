# Caelex V1 — Workflow-Bestandsaufnahme

**Stand:** 2026-05-01
**Scope:** Pure Analyse — was existiert heute an Workflow-Code im V1-Stack? Wie ist es aufgebaut, wie funktioniert es? **Kein Code wird geändert.**
**Methodik:** Repo-Scan via Explore-Agent + manuelle Spot-Checks auf `src/lib/workflow/`, `src/lib/services/`, `prisma/schema.prisma`, `src/app/api/cron/`.

---

## TL;DR — Die zwei Wahrheiten über V1-Workflows

Es gibt **zwei parallele Workflow-Schichten** in V1, ungleich entwickelt:

1. **Eine formale State-Machine-Engine** — `src/lib/workflow/` (~760 LoC) mit 3 Definitionen, aktiv genutzt für **2 Workflows** (Authorization + Incident). Sauber, typisiert, testbar.

2. **~48 implizite Workflows** — verteilt über das Prisma-Schema als `status`-Felder, orchestriert durch 17 Vercel-Crons + Notifications + ad-hoc API-Handler. Keine gemeinsame Abstraktion, jeder Subsystem implementiert sein eigenes Pattern.

Plus separate AI-Welt: **Astra V1** (`src/lib/astra/`, ~14 Files) als eigenständiger Tool-Use-Loop ohne Workflow-Engine-Anbindung.

**Architektonische Bewertung:** Die formale Engine ist solide und wird unterausgenutzt. Die impliziten Workflows sind die größere Realität — und der Hauptgrund warum Caelex V2 ein **einheitliches Workflow-Foundation** brauchen wird.

---

## 1. Die formale Workflow-Engine (`src/lib/workflow/`)

### Datei-Inventar

| File                           | Zweck                                           | LoC  |
| ------------------------------ | ----------------------------------------------- | ---- |
| `types.ts`                     | Generische State-Machine-Typen                  | ~288 |
| `engine.ts`                    | `WorkflowEngine`-Klasse + `executeTransition()` | ~473 |
| `index.ts`                     | Re-Exports                                      | ~20  |
| `definitions/authorization.ts` | EU Space Act Authorization (7 States)           | ~200 |
| `definitions/incident.ts`      | NIS2 Incident Response (6 States)               | ~150 |
| `definitions/notified-body.ts` | CRA Conformity Assessment (8 States)            | ~250 |
| `definitions/index.ts`         | Export-Aggregator                               | ~20  |

### Kern-Pattern

Die Engine ist eine generische, typisierte State-Machine mit:

- **Typed Context** — `TContext` Generic (z.B. `AuthorizationContext`, `IncidentContext`)
- **Auto-Transitions** — Transitions mit `autoCondition: (ctx) => boolean` werden automatisch evaluiert wenn Context-Änderung
- **Guards** — `guard: (ctx) => Promise<boolean>` als Vorbedingung für manuelle Transitions
- **Hooks** — `onEnter`, `onExit`, `onTransition`, `beforeTransition`, `afterTransition`, `onError`
- **Optimistic Locking** — `expectedVersion`-Parameter auf `executeTransition()` schützt gegen Race-Conditions
- **Auto-Transition-Loop** — nach Transition wird automatisch geprüft ob neue Auto-Conditions zutreffen, bis zu `maxAutoTransitions: 10` Iterationen

### Engine-Methoden (`engine.ts`)

```typescript
class WorkflowEngine<TContext> {
  validateDefinition(); // beim Konstruktor
  getAvailableTransitions(state, context); // welche Events gehen?
  canTransition(state, event, context); // Guard-Check
  executeTransition(state, event, context, expectedVersion?); // Hauptlogik
  getStateMetadata(state); // UI-Color/Icon
  getStateDescription(state); // human-readable
  isTerminalState(state); // approved/rejected/withdrawn
}
```

`executeTransition()` Ablauf:

1. Optimistic Lock-Check (`expectedVersion === actualVersion`)
2. Validiert Transition existiert
3. Guard-Check (sync oder async)
4. Hooks: `beforeTransition` → `onExit(fromState)` → `onTransition` → `onEnter(toState)` → `afterTransition`
5. Auto-Transition-Loop: prüft ob neue Auto-Conditions zutreffen
6. Returns `TransitionResult` mit altem + neuem State + Audit-Daten

---

## 2. Die 3 Engine-basierten Workflows

### 2.1 Authorization Workflow (EU Space Act)

**Prisma-Model:** `AuthorizationWorkflow` + `AuthorizationDocument` (1:N relation)

**Konsumiert in:** `src/lib/services/authorization-service.ts` (~370 LoC)

- `createAuthorizationWorkflow()` — initialisiert Workflow im `not_started`-State
- `transitionWorkflow(id, event, context)` — wraps `engine.executeTransition()`
- `getWorkflowSummary(id)` — joined Workflow + alle Documents
- `evaluateAutoTransitions(id)` — periodisch oder bei Document-Update

**States (7):**

```
not_started
  ↓ auto: totalDocs > 0 && readyDocs > 0
in_progress
  ↓ auto: allMandatoryComplete && !hasBlockers
ready_for_submission
  ↓ manual: submit (Guard: allMandatoryComplete)
submitted
  ↓ manual: review
under_review
  ↓ manual: approve | reject
approved (terminal) | rejected (terminal) | withdrawn (terminal)
```

**Multi-Actor:**

- **Operator** (`User`): lädt Documents hoch, klickt `submit`
- **NCA-Reviewer** (Admin): klickt `approve` / `reject` (heute via Admin-UI)

**AuthorizationDocument** (Sub-Model):

- `documentType`: `mission_description`, `debris_plan`, `insurance_proof`, `cybersecurity_plan`, etc.
- `status`: `not_started | in_progress | ready | submitted | approved | rejected`
- `required: Boolean` — entscheidet `mandatoryReady`-Berechnung
- `dueDate`, `completedAt`, `submittedAt`

**UI-Surface:** `/dashboard/modules/authorization` (engine-aware Wizard)

---

### 2.2 Incident Workflow (NIS2)

**Prisma-Models:** `Incident` + `IncidentNIS2Phase` (1:4 relation — 4 Phasen pro Incident)

**Konsumiert in:** `src/lib/services/incident-autopilot.ts` (~500 LoC)

- `processIncident(incidentId)` — Hauptlogik, ruft `engine.executeTransition()`
- Periodisch via `/api/cron/...` (nicht eigener Cron, sondern in `deadline-reminders` integriert)
- `triageIncident()`, `investigateIncident()`, `mitigateIncident()`, `resolveIncident()`

**States (6):**

```
reported
  ↓ auto: severity defined && requiresNCANotification known
triaged
  ↓ manual
investigating
  ↓ manual
mitigating
  ↓ manual: setzt resolvedAt = now()
resolved
  ↓ manual: close | reopen
closed (terminal)
```

**IncidentNIS2Phase Sub-Model** (4 Phasen pro Incident):

- `phase`: `early_warning` (1h) | `notification` (24h) | `intermediate_report` (7d) | `final_report` (30d)
- `deadline: DateTime` — berechnet aus Incident.detectedAt + Phase-Frist
- `status`: `pending | draft_ready | submitted | overdue`
- `submittedAt`, `draftContent`, `referenceNumber` (NCA-Receipt)

**Multi-Actor:**

- **Operator/CISO**: triages, investigates, drafts notifications
- **NCA**: empfängt Submissions (out-of-band, kein direkter Caelex-Touch)
- **Cron**: setzt Phase auf `overdue` wenn `deadline < now()` und `status !== "submitted"`

**UI-Surface:** `/dashboard/incidents` + `/dashboard/incidents/[id]`

---

### 2.3 Notified Body Workflow (CRA)

**Prisma-Model:** Implizit auf `CRAAssessment` (kein dedicated Model)

**Konsumiert in:** _Nirgends im Service-Layer aktiv genutzt._ Definition existiert, aber kein Consumer in `src/lib/services/` oder `src/app/api/`. **Wahrscheinlich noch nicht produktiv eingesetzt** — möglicherweise vorbereitet für CRA-Inkrafttreten 11.12.2027.

**States (8 definiert):**

```
not_started → preparing_documents → documents_ready → submitted_to_nb
  → under_review → additional_info_requested (loops back)
  → approved | rejected (terminal)
```

**Required Documents (9):**
Technical File, Risk Assessment, SBOM, Security Test Reports, Vulnerability Handling Process, Update Mechanism Description, EU Declaration of Conformity, User Instructions, Previous Certifications

---

## 3. Die ~48 impliziten Workflows

### Pattern: Status-Feld + Crons + ad-hoc Handlers

48 Prisma-Models haben ein `status`-Feld (`grep -c "status\s\+String" prisma/schema.prisma` = 48). Jedes davon ist effektiv ein Mini-Workflow ohne formale Engine.

### Gruppierung

#### A — Submission-Lifecycle (~8 Models)

- `NCASubmission`: SUBMITTED → ACKNOWLEDGED → REJECTED → ARCHIVED, mit `statusHistory: Json` (Array von State-Übergängen)
- `NCADocPackage`: DRAFT → READY → SENT → DELIVERED
- `NCACorrespondence`: SENT → RECEIVED → REPLIED
- `SubmissionPackage`, `RegulatoryFeedItem`, etc.

**Triggers:** API-Handler in `/api/nca/*` + Cron `nca-deadlines`

**Audit:** Status-Changes werden in `statusHistory: Json[]` als `{status, timestamp, notes}`-Array geschrieben (NICHT in `WorkflowEvent` oder ähnlichem strukturiertem Stream)

---

#### B — Assessments (5 Models, je eigener Wizard)

- `CybersecurityAssessment`, `DebrisAssessment`, `EnvironmentalAssessment`, `InsuranceAssessment`, `NIS2Assessment`, `CopuosAssessment`, `ExportControlAssessment`, `SpectrumAssessment`, `UkSpaceAssessment`, `UsRegulatoryAssessment`
- `status`: `DRAFT | IN_PROGRESS | COMPLETED | SUBMITTED`
- Jeweils Sub-Model `*RequirementStatus` mit eigenem Status pro Anforderung

**Wizard-Flow:**

- React-State auf Client (kein Server-Workflow)
- API-POST pro Step → speichert Answers als JSON
- Validation lokal im Wizard, finaler Submit setzt `status = COMPLETED`

**UI-Surface:** `/assessment/eu-space-act`, `/assessment/nis2`, `/assessment/space-law`, `/assessment/unified`

**Konsumiert von:** Crons `compute-rrs` + `compute-rcr` (für Scoring)

---

#### C — Generated Documents (~6 Models)

- `Document`: STORED → SHARED → EXPIRED
- `DocumentTemplate`: DRAFT → PUBLISHED → DEPRECATED
- `GeneratedDocument`: GENERATING → READY_FOR_APPROVAL → APPROVED → EXPORTED
- `NCADocument` (für Generate2-Pipeline)

**Generate2-Workflow** (`src/lib/generate/`):

1. `POST /api/generate2/documents` mit `documentType` + `userInput`
2. Step 1: `collectGenerate2Data()` — aggregiert aus 5+ Sources
3. Step 2: `computeReadiness()` — 0-100% Score
4. Step 3: `buildGenerate2Prompt()` — 4-Layer Prompt
5. Step 4: Anthropic-Call mit `max_tokens: 3072` pro Section
6. Step 5: NCADocument mit `status: GENERATING` erstellt
7. Sektion-für-Sektion (chunked): jede Section eigener API-Call, `content[i]` Array gefüllt
8. Bei letzter Section: Status → `READY_FOR_APPROVAL`
9. User reviewt + approved via separate API → Status `APPROVED`

**Pattern:** Chunked-API-Workflow ohne State-Machine-Engine. Status-Übergänge sind in Service-Code hardcoded, kein deklaratives Schema.

---

#### D — Reports + Notifications (~8 Models)

- `SupervisionReport`, `ScheduledReport`, `ReportArchive` — periodische Compliance-Reports
- `Notification`, `NotificationLog`, `NotificationPreference` — User-Inbox
- `Deadline`, `MissionPhase`, `Milestone` — Timeline-Events

**Pattern:** Cron-driven (Vercel Crons mutieren Status) + UI-driven (User dismisst)

---

#### E — Ephemeris + Sentinel + Verity (~6 Models)

- `EphemerisForecast`, `OrbitalData`, `SatelliteAlert` — Telemetry-Pipeline
- `SentinelAgent`, `SentinelPacket`, `SentinelEvidence` — Audit-Evidence-Pipeline mit Hash-Chain
- `VerityAttestation`, `VerityCertificate`, `VerityIssuerKey`, `VerityLogLeaf`, `VerityLogSTH` — RFC-6962-konforme Merkle-Logs

**SentinelEvidence ist besonders:** hat eigene Hash-Chain (`chainPosition`, `signature`, `signatureValid`, `chainValid`) — funktional eine Mini-Workflow-Engine für Telemetry-Attestierung.

---

#### F — Multi-Tenancy + Auth (~6 Models)

- `Organization`, `OrganizationMember`, `OrganizationInvitation`
- `Subscription`, `Payment`
- `User.onboardingEmailStage`, `onboardingCompleted` — Onboarding als impliziter Workflow

**Onboarding-Workflow** via Cron `onboarding-emails`:

- Stage 0 → Email "Welcome" → Stage 1
- Stage 1 → Email "First Assessment" (T+3d) → Stage 2
- Stage 2 → Email "Astra Intro" (T+7d) → Stage 3
- User completed first assessment → `onboardingCompleted = true`

---

#### G — Pharos + Atlas (~10 Models, **tabu**)

- `PharosCase`, `PharosWorkflow`, `PharosWebhookEndpoint`, etc.
- `AtlasNotification`, `AtlasAlertSubscription`, `AtlasAnnotation`
- Eigene Workflow-Logik unter `src/app/(pharos)/` und `src/app/api/pharos/`

**Architektur-Trennung:** Pharos und Atlas haben eigene Workflow-Code-Pfade, kein Cross-Surface-Teilen mit Comply.

---

## 4. Astra V1 — Separater AI-Loop (kein Workflow)

### Datei-Inventar

| File                         | Zweck                                                |
| ---------------------------- | ---------------------------------------------------- |
| `engine.ts`                  | `AstraEngine`-Klasse, Tool-Use-Loop                  |
| `tool-executor.ts`           | 47 Tools, Validation, Audit-Logging (~2046 LoC)      |
| `tool-definitions.ts`        | Tool-Schemas für Anthropic-API                       |
| `context-builder.ts`         | Aggregiert Compliance-Context aus 5+ Sources         |
| `conversation-manager.ts`    | Persistenz in `AstraConversation` mit Auto-Summarize |
| `system-prompt.ts`           | Prompt-Builder mit Topic-Detection                   |
| `regulatory-knowledge/`      | Statisches Wissen (EU Space Act, NIS2, Glossary)     |
| `proactive-engine.server.ts` | Periodisch ausgeführt, generiert Vorschläge          |
| `guided-workflows.server.ts` | Pre-defined Astra-Sequences (?) — separate Konzept   |

### Loop-Pattern (`engine.ts`)

```
1. getOrCreateConversation(userId)
2. buildCompleteContext(pageContext, missionData, userId)
3. detectTopics(userMessage) → ["nis2", "cra", ...]
4. buildSystemPrompt(topics, context)
5. claudeAPI.messages.create({
     model: "claude-sonnet-4-6",
     max_tokens: 4096,
     tool_choice: "auto",
     tools: ALL_TOOLS,  // 47 Tools
     system, messages
   })
6. while (response.stop_reason === "tool_use") {
     const toolResult = await executeTool(toolCall)  // mit AuditLog
     messages.push(...toolResult)
     response = await claudeAPI.messages.create(...)
     if (iterations >= 10) break
   }
7. formatResponse(messages)
8. addAssistantMessage(response)
9. shouldSummarize(messages) → falls ja: summarize old messages, archive
```

### Wichtig

- **Astra V1 ist KEIN Workflow im State-Machine-Sinne** — es ist ein Tool-Use-Loop ohne State-Persistenz zwischen Conversations
- **`AstraConversation` persistiert Messages**, aber kein Step-State
- **Audit via `AuditLog`** (entry per Tool-Call), aber kein `WorkflowEvent`-Stream
- **Astra V2** (`src/lib/comply-v2/astra-engine.server.ts`) ist die Comply-spezifische Refactoring, isoliert von V1

### V1 vs V2 Astra

| Aspekt       | V1                                  | V2                                          |
| ------------ | ----------------------------------- | ------------------------------------------- |
| Tools        | 47 (alle Caelex-Surfaces)           | 5 (nur Comply-Actions)                      |
| Trust-Layer  | Direct execution + AuditLog         | `AstraProposal`-Queue (Phase 1 Trust-Layer) |
| Konversation | `AstraConversation` (alle Surfaces) | `V2AstraConversation` (Comply-only)         |
| Action-Layer | Direct DB writes                    | `defineAction()` factory                    |

---

## 5. Die 17 Crons als implizites Orchestrations-Layer

Aus `vercel.json`:

| Cron                         | Schedule        | Workflow-Funktion                               |
| ---------------------------- | --------------- | ----------------------------------------------- |
| `deadline-reminders`         | 0 8 \* \* \*    | Setzt Status auf `overdue`, sendet Email        |
| `cra-deadlines`              | 30 8 \* \* \*   | CRA-spezifische Deadlines                       |
| `document-expiry`            | 0 9 \* \* \*    | Setzt Documents auf `EXPIRED`                   |
| `compliance-snapshot`        | 0 1 \* \* \*    | Digital-Twin daily snapshot (V1)                |
| `analytics-aggregate`        | 0 2 \* \* \*    | DAU/WAU/MAU-Computation                         |
| `audit-chain-anchor`         | 0 3 \* \* \*    | AuditLog Hash-Chain-Anchor                      |
| `data-retention-cleanup`     | 0 3 \* \* \*    | GDPR-Cleanup nach Retention-Period              |
| `solar-flux-polling`         | 0 4 \* \* \*    | Space Weather Update                            |
| `celestrak-polling`          | 0 5 \* \* \*    | TLE-Update                                      |
| `cra-vulnerability-scan`     | 30 5 \* \* \*   | CVE-Polling                                     |
| `ephemeris-daily`            | 0 6 \* \* \*    | Ephemeris-Forecast                              |
| `generate-scheduled-reports` | 0 6 \* \* 1     | Wochen-Reports (Mo)                             |
| `regulatory-feed`            | 0 7 \* \* \*    | EUR-Lex/Official-Journal Polling                |
| `compute-rrs`                | 10 7 \* \* \*   | RRS-Score-Computation                           |
| `compute-rcr`                | 30 7 \* \* \*   | RCR-Score-Computation                           |
| `onboarding-emails`          | 0 10 \* \* \*   | User-Onboarding-Drip                            |
| `churn-detection`            | 0 10 \* \* \*   | At-Risk-User-Flagging                           |
| `reengagement`               | 0 11 \* \* \*   | Re-engagement-Email                             |
| `demo-followup`              | 0 12 \* \* \*   | Demo-Lead-Followup                              |
| `astra-cleanup`              | 15 3 \* \* \*   | Alte AstraConversations löschen                 |
| `comply-v2-lifecycle`        | 30 2 \* \* \*   | V2-Proposal-Expiry + Snooze-Reaping (heute neu) |
| `posture-snapshot`           | 30 0 \* \* \*   | V2-Posture-daily-Snapshot (heute neu)           |
| `sentinel-cross-verify`      | 0 _/4 _ \* \*   | Telemetry-Audit-Verifikation                    |
| `sentinel-auto-attest`       | 30 _/4 _ \* \*  | Telemetry-Auto-Attestation                      |
| `sentinel-heartbeat`         | 30 0 \* \* \*   | Sentinel-System-Health                          |
| `cdm-polling`                | 0 _/4 _ \* \*   | Conjunction-Data-Polling                        |
| `ca-cleanup`                 | 0 2 \* \* 0     | Wöchentliche CA-Cleanup (So)                    |
| `pharos-norm-drift`          | 30 5 \* \* \*   | Pharos-spezifisch                               |
| `pharos-witness-quorum`      | _/10 _ \* \* \* | Pharos Witness-Quorum (alle 10min)              |
| `pharos-workflow-sla`        | _/5 _ \* \* \*  | Pharos SLA-Watchdog (alle 5min)                 |
| `pharos-approval-expiry`     | 0 \* \* \* \*   | Pharos Approval-Expiry (stündlich)              |
| `pharos-daily-briefing`      | 0 6 \* \* \*    | Pharos Daily-Brief                              |
| `verity-sth-sign`            | 0 13 \* \* \*   | Verity STH-Signing                              |
| `atlas-source-check`         | 30 4 \* \* \*   | Atlas-Quellen-Verifikation                      |
| `atlas-feed-discovery`       | 45 4 \* \* \*   | Atlas-Feed-Erkennung                            |
| `ca-digest`                  | 30 7 \* \* \*   | CA-Digest                                       |
| `nca-deadlines`              | 20 7 \* \* \*   | NCA-Deadline-Reminders                          |

### Cron-Funktions-Klassen

- **5+ Status-Mutators** (deadline-reminders, document-expiry, cra-deadlines, etc.)
- **6+ Aggregators** (analytics, snapshots, scoring, audit-anchor)
- **5+ External Pollers** (atlas, regulatory-feed, celestrak, solar-flux, cdm, cra-vuln)
- **3+ Engagement** (onboarding, churn, reengagement, demo-followup)
- **3+ Cleanup** (data-retention, ca-cleanup, astra-cleanup)
- **5+ Pharos-spezifisch** (norm-drift, witness-quorum, workflow-sla, approval-expiry, daily-briefing)
- **3+ Sentinel-spezifisch** (cross-verify, auto-attest, heartbeat)

**Erkenntnis:** Crons sind heute der **wichtigste implizite Workflow-Orchestrator** — ohne sie würde sich praktisch nichts in der DB von selbst weiterbewegen.

---

## 6. UI-Surfaces für Workflows

| Pfad                                                   | Workflow-Typ               | Engine-aware?                                   |
| ------------------------------------------------------ | -------------------------- | ----------------------------------------------- |
| `/dashboard/modules/authorization`                     | EU Space Act Authorization | ✅ Ja (engine.ts)                               |
| `/dashboard/incidents` + `[id]`                        | NIS2 Incident              | ✅ Ja (incident-autopilot.ts)                   |
| `/dashboard/modules/cybersecurity/workflow`            | CRA-related (?)            | ⚠️ Unklar (nicht im services/ gefunden)         |
| `/dashboard/nca-portal` + `submissions/` + `packages/` | NCA-Submission             | ❌ Nein (status-driven)                         |
| `/assessment/eu-space-act/*`                           | EU Space Act Wizard        | ❌ Nein (lokaler React-State + JSON-Persistenz) |
| `/assessment/nis2/*`                                   | NIS2 Wizard                | ❌ Nein (gleich)                                |
| `/assessment/space-law/*`                              | National Space Law Wizard  | ❌ Nein                                         |
| `/assessment/unified/*`                                | Unified Wizard             | ❌ Nein                                         |
| `/dashboard/generate`                                  | Document-Generation        | ❌ Nein (chunked API)                           |
| `/dashboard/audit-center`                              | Audit-Trail-Browser        | n/a (read-only)                                 |
| `/dashboard/timeline`                                  | Mission-Timeline           | ❌ Nein (Deadline-Model)                        |
| `/dashboard/network`                                   | Stakeholder-Netzwerk       | ❌ Nein                                         |
| `/(pharos)/pharos/workflow/*`                          | Pharos-Cases               | ❌ tabu                                         |

**Erkenntnis:** Nur **2 von ~13 Workflow-relevanten UIs** sind engine-aware. Der Rest implementiert seinen eigenen ad-hoc-Workflow.

---

## 7. Wiederkehrende Architektur-Patterns

| Pattern                           | Wo                                        | Vorteile                                    | Nachteile                              |
| --------------------------------- | ----------------------------------------- | ------------------------------------------- | -------------------------------------- |
| **A — State-Machine-Engine**      | Authorization, Incident                   | Typisiert, deklarativ, testbar, Audit-fähig | Nur 2 Konsumenten, unterausgenutzt     |
| **B — Status + Cron**             | NCA-Submission, Assessments, Reports      | Einfach, schnell zu bauen                   | Verstreut, kein zentraler Audit-Stream |
| **C — Event-Feed → Notification** | Atlas-Alerts, Onboarding, Regulatory-Feed | Push-Pattern, automatisch                   | Notification-Hölle ohne Digest         |
| **D — Chunked-API**               | Generate2 Documents                       | Long-Running ohne Inngest                   | Status-Übergänge im Code hardcoded     |
| **E — Hash-Chain**                | AuditLog, SentinelEvidence, VerityLog     | Tamper-Evidence, RFC-6962-tier              | Nur in 3 Subsystemen, nicht universal  |
| **F — Tool-Use-Loop**             | Astra V1 + V2                             | AI-driven, mit AuditLog                     | Kein State-Machine-Wrap                |

---

## 8. Was VS COWF-Konzept fehlt

Querverweise auf das `CAELEX-OPERATOR-WORKFLOW-FOUNDATION.md` — Lücken in V1:

| COWF-Feature                    | V1-Status                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| Zentraler Workflow-Event-Stream | ❌ Fehlt — Audit verstreut über AuditLog + statusHistory + ProvenanceTrace                |
| Hash-chained Workflow-Events    | ⚠️ Nur AuditLog/Sentinel haben das — Workflow-Engine schreibt nicht in Hash-Chain         |
| Wait-for-External-Event-Pattern | ❌ Fehlt — alles ist Cron-Polling-getrieben                                               |
| Multi-Actor-Approval-Slots      | ⚠️ Implizit über User-IDs — kein deklaratives Schema                                      |
| AI-as-First-Class-Step          | ❌ Astra ist separater Loop — keine Workflow-Step-Integration                             |
| Versioned Workflow-Definitions  | ⚠️ Engine hat `version: string` aber kein Storage-Mechanism für alte Instanzen            |
| Time-Travel-Queries             | ❌ Fehlt — keine bi-temporale Datenmodellierung                                           |
| QES-Required-Steps              | ❌ Fehlt — keine D-Trust-Integration in Workflow-Engine                                   |
| EU-AI-Act-Art.-12-Logging       | ⚠️ Astra-Calls werden via AuditLog gelogged, aber nicht hash-chained mit Workflow-Context |

---

## 9. Erkenntnisse für Migrations-Planung (informativ)

Die folgenden Punkte sind **NICHT zur sofortigen Umsetzung** — nur Bewusstsein für später:

1. **Authorization + Incident Workflows sind COWF-kompatibel** — sie haben schon State-Machine-Pattern. Migration wäre Wrapper auf bestehender Engine.

2. **Notified-Body-Workflow ist tot** — Definition existiert, kein Consumer. Bei COWF-Adoption: erst aktivieren, dann migrieren oder zusammenführen.

3. **48 Status-Felder in Prisma** — die größte Migrations-Arbeit. Pro Workflow-Familie (Submissions, Assessments, Reports, etc.) müsste man entscheiden: in COWF migrieren oder als atomic-status-only behalten.

4. **Crons als Workflow-Trigger** — bei COWF-Adoption werden Crons reduziert auf "Heartbeat" + "External-Source-Polling". Status-Mutation-Logik wandert in Workflow-Steps.

5. **Astra V1 vs V2 Diff** — V2 hat schon den Trust-Layer (`AstraProposal`). Bei COWF-Adoption wird V2-Astra über `step.astra` integriert; V1-Astra bleibt separat (Atlas/Pharos/Assure-Surface) bis später konsolidiert.

6. **17 Crons sind heute kritisch** — bei COWF-Adoption müssen sie als "Event-Publisher" weiter existieren (z.B. CelesTrak-Cron emittiert `tle.removed-from-catalog` Event), aber die nachgelagerte Status-Mutation wandert in Workflow-Steps.

7. **Hash-Chain ist überall verteilt** (AuditLog, SentinelEvidence, VerityLog) — bei COWF-Adoption würde `WorkflowEvent` ein **viertes** Hash-Chain-System einführen. Konsolidierungs-Frage: ein einziger Stream pro Org statt 4?

---

## 10. Zusammenfassung

V1 hat eine solide formale Workflow-Engine, die unterausgenutzt ist (2 von 3 Definitionen aktiv konsumiert). Daneben existieren ~48 implizite Workflows als verteilte Status-Felder + Cron-Orchestrierung. Astra V1 ist ein separates Tool-Use-Loop-System ohne Engine-Anbindung.

Der wichtigste strukturelle Befund: **kein einheitliches Pattern, kein zentraler Workflow-Event-Stream, kein deklaratives Multi-Actor-Approval-Modell**. Jeder Subsystem hat seine eigene Lösung. Das funktioniert heute mit ~30 aktiven Operatoren — wird bei 300+ Operatoren mit komplexeren Workflows (Cross-Border-Submissions, Multi-Stakeholder-Approvals, AI-driven NIS2-Incident-Response) zur Architektur-Schuld.

Das **COWF-Konzept** (siehe `CAELEX-OPERATOR-WORKFLOW-FOUNDATION.md`) wäre die einheitliche Antwort darauf — aber das ist Phase-2-Arbeit, nicht heute.

**Heutiger Zustand:** funktional, aber fragmentiert. Genug für die nächsten 12 Monate. Über die Hinaus: COWF.

— Reine Bestandsaufnahme, keine Empfehlungen, keine Code-Änderungen.
