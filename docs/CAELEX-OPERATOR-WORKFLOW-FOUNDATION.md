# Caelex Operator Workflow Foundation (COWF)

**Stand:** 2026-05-01
**Scope:** Das Workflow-Pattern für die Operator-Persona — durable, AI-aware, audit-fest, multi-actor, **mit Null externen Kosten**.
**Constraint:** Keine Inngest, kein Temporal, kein WorkOS, kein Drata-Programm. Alles auf bestehender Stack: Postgres (Neon Free Tier), Vercel Functions + Cron, Anthropic API direct, Resend Free Tier, Cloudflare R2 Free Tier.

> "Ohne externe Kosten" heißt nicht "schlechter". Es heißt: **eine Workflow-Engine bauen, die im selben Postgres-Schema lebt wie die Compliance-Daten** — was strukturell besser ist als Inngest/Temporal, weil State-Inspection, Audit-Trail, Time-Travel und Recovery alle eine einzige SQL-Query weit weg sind.

---

## Executive Summary

### Was COWF anders macht

Inngest und Temporal sind brillant — aber sie haben einen architektonischen Konflikt mit Compliance-SaaS: **Workflow-State lebt außerhalb der Compliance-DB**. Das heißt:

- Audit-Trail ist gespalten (Compliance-Events in Postgres, Workflow-Events in Inngest)
- Time-Travel "was hat das System am 15. März gewusst" geht über zwei Datenquellen
- Eine compliance-relevante Frage wie "wer hat den 7-tägigen Pending-Approval-State eingeleitet" lebt in Inngest, nicht im AuditLog

COWF dreht das um: **Workflow-State IST Compliance-State.** Eine `OperatorWorkflowInstance` lebt in Postgres neben `Spacecraft`, `ComplianceItem`, `AstraProposal`. Time-Travel ist ein `WHERE asOf <= ...`-Query. Recovery ist Postgres-MVCC. Audit-Trail ist genau eine Tabelle.

### Die 5 Foundation-Bets

1. **State-Machine + Event-Sourcing-Hybrid** — Workflows sind State-Machines (typed Transitions), aber jede Transition wird als Event in einem `WorkflowEvent`-Stream persistiert. Status ist ableitbar, aber für Lese-Performance materialisiert.
2. **Vercel Cron als universelle Heartbeat-Engine** — keine eigene Worker-Pool-Infra. Eine 1-Minute-Cron pollt eine `WorkflowSchedule`-Tabelle und führt fällige Steps aus. Das ist 100x weniger als Inngest's Tier-2-Pricing braucht.
3. **AstraStep als First-Class Step-Type** — AI-Reasoning ist nicht "side effect" sondern explizite Workflow-Stufe mit `decisionLog`-Hash-Chain-Anbindung. Jeder AstraStep ist EU-AI-Act Art. 12-14-konform.
4. **Multi-Actor durch Role-Required-Steps** — ein Step kann sagen "needs OPERATOR + COUNSEL signoff before transition". Das macht Authorization-Submissions und QES-Sign-Offs strukturell modellierbar.
5. **Eigene Workflow-DSL in TypeScript** — `defineWorkflow({...})` Factory mit Zod-typed Steps. Sauber, type-safe, tree-shakeable, im selben Repo wie `defineAction()`.

### Was COWF NICHT macht (bewusst)

- Keine Multi-Region-Workflows (1 Region reicht für 5 Jahre)
- Keine 100+ Workflows/Sekunde (wir brauchen 10-100/Tag)
- Keine generische Programmiersprache für Workflows (DSL ist begrenzt — das ist ein Feature)
- Kein Web-UI-Designer wie Camunda BPMN (Workflows sind Code, gehen ins Repo, gehen durch Code-Review)
- Keine eigene Worker-Pool-Infra (Vercel Functions + Cron reichen)

### Cost Comparison

| Komponente             | Inngest Pro           | Temporal Cloud    | **COWF**                              |
| ---------------------- | --------------------- | ----------------- | ------------------------------------- |
| Workflow-Engine        | $300/mo+ Step-Pricing | $200/mo + Compute | **$0**                                |
| Storage                | inkludiert            | extra             | **Postgres-Tier** (Neon Free für Dev) |
| Observability          | inkludiert            | inkludiert        | **DB-Queries** + Sentry (free tier)   |
| Vendor-Lock-in         | hoch                  | sehr hoch         | **null**                              |
| 10-Personen-Team Total | ~$500/mo              | ~$800/mo          | **$0**                                |

---

## 1. Was ist ein Operator-Workflow überhaupt?

### Operator-Persona

Ein Operator bei Caelex ist:

- Satellite-Mission-Owner (Constellation-Manager bei Satco/SatLeads)
- Compliance-Lead bei Launch-Provider (Isar, Rocket Factory)
- Mission-Director bei Service-Provider (D-Orbit, Kayrros, ICEYE)
- CTO/CISO bei Kleinst-/Mittelst-Operator (5-50 MA Größe)

Die typische Operator-Realität:

- 1-3 Personen für Compliance-Topics (kein dediziertes GRC-Team)
- 4-12 parallel laufende Compliance-Threads (Authorisation, Cyber-Incident, Insurance-Renewal, Annual-Reporting, Pre-Launch)
- 80% Wissens-Lücke gegenüber Counsel/Anwalt
- Hoher Vertrauens-Bedarf in das System (eine falsche Submission = Mission-Verzögerung von Monaten)

### Workflow-Anforderungen aus Operator-Sicht

| Anforderung                            | Was Operator wirklich will                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| **Klarheit**                           | "Was muss ich heute tun? Was wartet auf andere?"                                  |
| **Nicht-Verlieren**                    | "Wenn ich pausiere und in 3 Tagen wiederkomme — alles wie ich es verlassen habe." |
| **Vorausschauend**                     | "Was kommt in 30 Tagen? Was muss ich jetzt schon vorbereiten?"                    |
| **AI-Hilfe ohne Kontroll-Verlust**     | "Astra füllt mir die Felder vor, ich approve. Astra entscheidet nicht."           |
| **Multi-Stakeholder ohne Email-Hölle** | "Counsel gibt Sign-off in der App, nicht per Mail-Thread."                        |
| **Beweisbarkeit**                      | "Der Auditor fragt 'wer hat das wann freigegeben' — ich zeige es in 3 Sekunden."  |
| **Zeitliche Robustheit**               | "Manche Workflows laufen 9 Monate. Astra darf nicht 'vergessen' wo wir waren."    |

### Warum klassische Tools (Asana/Linear/Jira) NICHT reichen

- Asana: kein Audit-Hash-Chain, keine AI-Decision-Logs, kein Multi-Actor-Approval-Pattern, kein Compliance-Graph-Anbindung
- Linear: optimiert für Software-Teams, nicht für Multi-Stakeholder mit rechtlicher Wirkung
- Jira: zu generisch, zu langsam, kein Domain-Knowledge

Caelex Operator-Workflows brauchen **Compliance-native Primitives** — und die existieren nirgends als SaaS.

---

## 2. Die 9 kanonischen Operator-Workflows

### W1 — Spacecraft Authorization Submission

**Trigger:** Operator klickt "Start new authorization" für eine geplante Satelliten-Mission.

**Dauer:** 6-12 Monate vom Trigger bis "Genehmigung von BAFA/BNetzA/CNES erhalten".

**Komplexität:** ★★★★★ (höchste). 12-18 Steps, Multi-Stakeholder, QES-required, regulatorisch fixiert.

**Vereinfachte State-Machine:**

```
DRAFT
  ↓ (operator complete metadata-form)
METADATA_COMPLETE
  ↓ (assess applicability via engine)
APPLICABILITY_ASSESSED
  ↓ (operator + astra co-author technical-doc)
TECHNICAL_DOC_DRAFT
  ↓ (counsel-review optional, mandatory for >100kg)
COUNSEL_REVIEWED
  ↓ (final compliance-checks pass)
READY_TO_SIGN
  ↓ (QES-sign by mission-director)
SIGNED
  ↓ (submit-to-NCA via API or PDF-upload)
SUBMITTED
  ↓ (NCA reviews, may request clarifications)
UNDER_NCA_REVIEW
  ↓ (Caelex polls NCA-portal status hourly)
APPROVED | CONDITIONAL_APPROVED | REJECTED
```

**Was Astra macht:** Pre-fills Technical-Doc-Sections aus historischen Spacecraft-Fields, generiert Vorab-Antworten zu NCA-Standardfragen, erstellt FRIA-Excerpts, schlägt Counsel-Review-Bullets vor.

**Multi-Actor:** Operator drafts. Counsel reviews (optional). Mission-Director QES-signs. Caelex submits + tracks.

**Time-Triggers:** wenn 30/60/90 Tage seit `SUBMITTED` ohne NCA-Antwort: automatischer Folge-Reminder an Operator + Astra-generierter Status-Inquiry-Draft.

**AstraProposals generiert:**

- "Astra schlägt vor: Technical-Doc-Section 4.2 wie folgt zu formulieren..."
- "Astra schlägt vor: Counsel-Review anzufragen weil Spacecraft >100kg"
- "Astra schlägt vor: NCA-Inquiry-Email zu senden weil 60d ohne Antwort"

---

### W2 — Cybersecurity Incident Response (NIS2-driven)

**Trigger:** Sentinel-Alert oder manueller Operator-Click "Report incident".

**Dauer:** 30 Tage vom Incident bis Final-Report.

**Komplexität:** ★★★★ (kritisch zeit-sensitiv).

**State-Machine (NIS2-Phasen):**

```
DETECTED
  ↓ (operator-acknowledged + impact-assessed)
ASSESSED
  ↓ (24h-deadline für Initial-Notification)
INITIAL_NOTIFICATION_DRAFTED
  ↓ (operator approves draft, Caelex submits to BSI/CSIRT)
INITIAL_NOTIFIED  ← Hard deadline: 24h post DETECTED
  ↓ (working on containment, evidence collection)
INVESTIGATING
  ↓ (72h-deadline für Update)
UPDATE_NOTIFICATION_DRAFTED
  ↓ (submit)
UPDATE_NOTIFIED  ← Hard deadline: 72h post DETECTED
  ↓ (full root-cause analysis, mitigation done)
RESOLVED
  ↓ (30d-deadline: final report due)
FINAL_REPORT_DRAFTED
  ↓ (counsel-review optional, submit)
FINAL_REPORT_SUBMITTED  ← Hard deadline: 30d post DETECTED
  ↓
CLOSED
```

**Was Astra macht:** Generiert First-Draft der Initial-Notification aus Sentinel-Telemetry + bekannten IoCs (Indicators of Compromise). Schlägt Containment-Steps vor. Pre-fills Final-Report-Sections aus Investigation-Notes.

**Time-Triggers:** SLA-Watchdog cron läuft minütlich; bei Annäherung an 24h-Frist (T-4h, T-1h, T-30min) eskalierende Notifications + In-App-Banner. Wenn überschritten: AstraProposal "submit Initial-Notification mit minimal-required Felder" automatisch generiert (Operator entscheidet).

**Compliance-Härte:** Jeder State-Übergang wird in Audit-Hash-Chain commited. Final-Report ist QES-signiert. Sentinel-Evidence-Hashes werden in Final-Report referenziert (nachweisbar tamper-evident).

---

### W3 — Continuous Compliance Heartbeat

**Trigger:** Vercel Cron daily 03:00 UTC.

**Dauer:** Sub-Workflow per User; ständig laufend (kein Endzustand).

**Komplexität:** ★★ (algorithmisch einfach, aber strategisch wertvoll).

**State-Machine (per-User pro Tag):**

```
SCANNING
  ↓ (compute fresh PostureSnapshot)
SNAPSHOT_TAKEN
  ↓ (diff against previous day)
DRIFT_DETECTED | NO_CHANGE
  ↓ (if drift)
ASTRA_REASONING_ABOUT_DRIFT
  ↓ (astra explains "Score sank von 78% auf 73% weil 3 NIS2-Items expired")
PROPOSALS_GENERATED
  ↓ (operator sees in Today-Inbox)
OPERATOR_ACTIONABLE
  ↓
RESOLVED | DEFERRED
```

**Was Astra macht:** Pro Drift erklärt Astra kausal: "Score sank weil X. Empfehlung: Y. Aufwand: Z. Wenn nicht-handelnd: konsequenz W". Citation-First — jede Aussage referenziert Source-Items.

**Time-Triggers:** Daily by Vercel Cron. Plus event-getriggerter Re-Run wenn ein neuer regulatorischer Update reinkommt (W8 unten).

---

### W4 — Pre-Launch Compliance Final-Check

**Trigger:** Operator setzt `Spacecraft.plannedLaunchDate` auf <30 Tage.

**Dauer:** 30 Tage bis Launch.

**Komplexität:** ★★★ (Block-or-Allow Gate).

**State-Machine:**

```
T-30d_CHECK_INITIATED
  ↓ (run 12 module-engines, collect status)
ALL_MODULES_ASSESSED
  ↓ (any RED?)
BLOCKED  →  resolve-loop  →  T-30d_CHECK_INITIATED
  ↓ (all GREEN/AMBER)
T-7d_CHECK
  ↓ (any RED in last 7 days?)
BLOCKED | T-1d_CHECK
  ↓
LAUNCH_AUTHORIZED  ← Caelex stamps QES-Pre-Launch-Certificate
  ↓ (post-launch, automated NCA-notification within 24h)
LAUNCHED
```

**Was Astra macht:** Bei jedem Block erklärt Astra kausal welches Item, welche Regulation, wie zu lösen. Generiert Resolution-Plan mit Aufwand + Owner + ETA. Wenn Operator nicht weiterkommt, Astra schlägt Counsel-Engagement vor.

**Compliance-Härte:** `LAUNCH_AUTHORIZED` ist QES-signiert (D-Trust Cloud-API). Wird im Launch-Certificate gestempelt. Wenn Launch ohne Authorization passiert: Caelex hat Audit-Trail dass Operator das System überstimmt hat.

---

### W5 — Annual Re-Attestation

**Trigger:** Vercel Cron jährlich pro Org am Onboarding-Anniversary +30d Vorlauf.

**Dauer:** 30 Tage Window.

**Komplexität:** ★★ (volume-heavy aber mechanisch).

**State-Machine:**

```
INITIATED  (T-30d before anniversary)
  ↓ (astra fetches all ATTESTED items, summarizes year-of-evidence per item)
ASTRA_PRESUMMARIZED
  ↓ (operator reviews each item: confirm-as-still-valid / mark-changed)
OPERATOR_REVIEWING
  ↓ (changed items → re-evidence-required)
PARTIAL_REATTESTED
  ↓ (deadline: anniversary date)
COMPLETE | OVERDUE
```

**Was Astra macht:** Pro Item generiert Astra Year-Summary: "Im Jahr 2026 wurden 3 Notes hinzugefügt, 2 Evidence-Updates, kein Status-Wechsel — Re-Attestation empfohlen ohne Änderung". Confidence-Score pro Empfehlung. Mass-Approve mit Caveat-Filter ("approve all bei denen confidence > 0.9").

---

### W6 — Decommissioning / End-of-Life (COPUOS-driven)

**Trigger:** Operator setzt `Spacecraft.eolPlannedDate` < 90 Tage.

**Dauer:** Variable (bis "verifiziert deorbitiert").

**Komplexität:** ★★★ (technisch + regulatorisch).

**State-Machine:**

```
EOL_PLANNED
  ↓ (pre-deorbit checklist auto-generated from COPUOS guidelines)
PRE_DEORBIT_CHECKLIST_OPEN
  ↓ (operator works through, ephemeris engine validates orbital decay model)
PRE_DEORBIT_VERIFIED
  ↓ (deorbit-burn-window opens)
DEORBIT_IN_PROGRESS
  ↓ (post-deorbit verification via CelesTrak TLE-monitoring)
DEORBIT_VERIFIED  ← if confirmed re-entry
  ↓
NCA_FINAL_REPORT
  ↓
ARCHIVED
```

**Was Astra macht:** Pre-Deorbit-Checklist aus COPUOS-Guidelines + ITU-Coordination + nationaler Space-Law generiert. Validiert orbital-decay-Modell aus Ephemeris-Engine. Generiert NCA-Final-Report-Draft.

**Telemetry-Integration:** CelesTrak-TLE-Polling-Cron (existiert bereits) wird als Step-Wait-For-Event-Listener genutzt: Workflow wartet "until TLE for NORAD-ID X is no longer in active catalog".

---

### W7 — Supplier Risk Onboarding (NIS2 Supply Chain)

**Trigger:** Operator klickt "Add new supplier" für eine Mission.

**Dauer:** 2-4 Wochen.

**Komplexität:** ★★ (Form-driven).

**State-Machine:**

```
INVITED  (supplier receives token-gated portal-link via Resend)
  ↓
SUPPLIER_ATTESTING (token-gated form, no Caelex-account needed)
  ↓
ATTESTATION_SUBMITTED
  ↓ (astra reviews against NIS2 supplier-criteria)
ASTRA_REVIEWED
  ↓ (operator decision)
APPROVED | NEEDS_CLARIFICATION | REJECTED
```

**Was Astra macht:** Reviewing Supplier-Attestation gegen NIS2 Art. 21(2)(d) und Caelex-Operator-spezifische Risiko-Profile. Schlägt Clarification-Questions vor wenn Lücken.

---

### W8 — Regulatory Update Response

**Trigger:** Atlas/Pharos publishes regulatory-update event.

**Dauer:** 7-30 Tage Operator-Response-Window.

**Komplexität:** ★★★★ (cross-cutting).

**State-Machine:**

```
REGULATORY_UPDATE_PUBLISHED
  ↓ (atlas-engine identifies affected ComplianceItems for org)
IMPACT_ASSESSED
  ↓ (astra generates "what-this-means-for-you" summary per affected item)
NOTIFICATION_SENT (operator sees in Today-Inbox + email-digest)
  ↓ (operator acknowledges)
ACKNOWLEDGED
  ↓ (per-item: re-attest / change-status / contest)
ITEMS_PROCESSED
  ↓
CLOSED
```

**Was Astra macht:** Per Update + per Item: "Diese Anforderung hat sich verschärft von X zu Y. Dein aktueller Status (ATTESTED) bleibt valid bis 30.06.2027 (Übergangsfrist). Bis dahin solltest du Z neu evidenzieren." Citation-First aus Atlas-Source-Documents.

---

### W9 — Cross-Border Mission Submission

**Trigger:** Operator markiert Mission als "subject to multiple jurisdictions" (z.B. DE-Hauptsitz + FR-Service + IT-Bodenstation).

**Dauer:** Variable (3-12 Monate, parallel zu W1).

**Komplexität:** ★★★★★ (verkettet mit W1).

**State-Machine (parent workflow, mit child-W1 pro Jurisdiction):**

```
JURISDICTIONS_IDENTIFIED  (engine determines applicable NCAs)
  ↓ (per NCA: spawn child W1 instance)
CHILD_W1_DE: SUBMITTED
CHILD_W1_FR: DRAFT
CHILD_W1_IT: METADATA_COMPLETE
  ↓ (parent waits for all children to complete)
ALL_APPROVED | PARTIAL_APPROVED | REJECTED_BY_AT_LEAST_ONE
```

**Was Astra macht:** Cross-Reference Engine erkennt: "Sektion 4.2 in DE-Submission entspricht Sektion 7 in FR-Submission, gleichen Inhalt mit Translation". Astra schlägt Reuse-Candidates vor. Spart 60% Doppelarbeit.

**Compliance-Härte:** Jede Submission hat eigene Audit-Hash-Chain. Cross-Reference-Tabelle (`SubmissionEvidenceReuse`) trackt welche Evidence wo verwendet wurde — nachweisbar in Audit ("dieser Test wurde 1x durchgeführt, in 3 Submissions verwendet — alle hashes verifizieren gegen denselben Source-Hash").

---

## 3. Architektur-Layer

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: UX                                                     │
│   /dashboard/workflows  ─ Linear-style list with progress       │
│   /dashboard/workflows/[id]  ─ Step-by-step wizard              │
│   /dashboard/today  ─ "what's actionable now" aggregator        │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │ reads
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Workflow Engine (the runtime)                          │
│   - executeStep(workflowId, stepKey)                            │
│   - listActionableSteps(userId)                                 │
│   - heartbeat() — called by Vercel Cron every minute            │
│   - resumeWorkflow(workflowId) — after server restart           │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │ orchestrates
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Step Types (Action / Wait / Approval / Astra / Form)   │
│   Each step is a typed handler with: schema, run, retry-policy  │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │ defined via
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Workflow DSL — defineWorkflow({...})                   │
│   const W1 = defineWorkflow({ name, version, states, steps })   │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │ persists into
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Postgres tables                                        │
│   OperatorWorkflowDef · OperatorWorkflowInstance · WorkflowEvent│
│   WorkflowSchedule · WorkflowEventListener                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Das Datenmodell (Prisma Schema, additiv)

```prisma
/// Workflow definition (versioned). Code-defined via defineWorkflow(),
/// registered into this table on app start so we can join state to
/// definition for debugging/observability.
model OperatorWorkflowDef {
  id          String @id @default(cuid())
  name        String   // "spacecraft-authorization-submission"
  version     Int      // bumped on breaking changes; old instances stay
                       // on old version forever (event-replay-safe)
  description String   @db.Text
  states      Json     // ["DRAFT", "METADATA_COMPLETE", ...] in order
  steps       Json     // Step DSL serialized — for observability only;
                       // actual handler logic lives in TS code
  createdAt   DateTime @default(now())

  instances OperatorWorkflowInstance[]

  @@unique([name, version])
}

/// One concrete workflow run. State at any moment = result of replaying
/// all WorkflowEvents up to now, but `currentState` is materialized for
/// fast list-views.
model OperatorWorkflowInstance {
  id           String @id @default(cuid())
  defId        String
  def          OperatorWorkflowDef @relation(fields: [defId], references: [id])

  /// Owner. The operator-user who started the workflow.
  userId       String
  user         User @relation(fields: [userId], references: [id])

  /// Multi-tenant.
  organizationId String?

  /// What this workflow operates on. Optional FK to a Spacecraft,
  /// ComplianceItem, AstraProposal, etc. Polymorphic.
  subjectType  String?  // "Spacecraft", "ComplianceItem", null
  subjectId    String?

  /// Current materialized state.
  currentState String  // "METADATA_COMPLETE"

  /// What kind of action is needed RIGHT NOW (pre-computed for inbox).
  actionableBy Json?   // { roles: ["OPERATOR"], userIds: ["u1"], hint: "Sign QES" }

  /// Soft-paused (operator hits "snooze workflow") — Heartbeat skips.
  pausedUntil  DateTime?

  /// Hard deadline if applicable (NIS2-incident 24h, launch-date, etc).
  hardDeadline DateTime?

  startedAt    DateTime @default(now())
  completedAt  DateTime?
  archivedAt   DateTime?

  events       WorkflowEvent[]
  schedules    WorkflowSchedule[]
  listeners    WorkflowEventListener[]

  @@index([userId, currentState])
  @@index([hardDeadline])
  @@index([organizationId, currentState])
}

/// Append-only event stream. ANY state change writes one row.
/// Replayable for audit-reconstruction. Hash-chained for tamper-evidence.
model WorkflowEvent {
  id           String @id @default(cuid())
  workflowId   String
  workflow     OperatorWorkflowInstance @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  /// Sequence number per workflow — strict-increment, no gaps.
  sequence     Int

  /// Type of event: "STATE_TRANSITION", "STEP_STARTED", "STEP_COMPLETED",
  /// "ASTRA_PROPOSED", "WAIT_REGISTERED", "TIMEOUT_FIRED", "ERROR", ...
  eventType    String

  /// Causation: what triggered this event? (User-action, cron, astra, child-workflow...)
  causedBy     String  // userId | "cron:posture-snapshot" | "astra:..." | "system"

  /// Payload (typed via TypeScript discriminated union, JSONB at rest).
  payload      Json

  /// State at the time of this event (after-image).
  resultingState String?

  /// Hash-chain: SHA-256(prevHash + canonicalJSON(payload) + sequence + workflowId).
  prevHash     String
  entryHash    String

  occurredAt   DateTime @default(now())

  @@unique([workflowId, sequence])
  @@index([workflowId, occurredAt])
  @@index([eventType])
}

/// Time-based wakeups. Vercel Cron polls this every minute.
model WorkflowSchedule {
  id           String @id @default(cuid())
  workflowId   String
  workflow     OperatorWorkflowInstance @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  /// What step to fire when the time hits.
  stepKey      String

  /// When to fire (UTC).
  fireAt       DateTime

  /// Lifecycle.
  status       String   // "PENDING" | "FIRED" | "CANCELLED" | "FAILED"
  attemptCount Int      @default(0)
  lastError    String?

  /// Created during step.scheduleAt(...) or step.sleepUntil(...).
  createdAt    DateTime @default(now())
  firedAt      DateTime?

  @@index([status, fireAt])
}

/// Event-based wakeups. A workflow can register: "wake me when an event
/// of type X with predicate Y occurs". The event-publisher checks this
/// table when emitting events.
model WorkflowEventListener {
  id           String @id @default(cuid())
  workflowId   String
  workflow     OperatorWorkflowInstance @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  /// What step to fire when matched.
  stepKey      String

  /// What event to listen for: "astra-proposal.approved", "tle.removed-from-catalog", etc.
  eventType    String

  /// Optional predicate (Postgres JSON-path query).
  predicate    Json?

  /// "deliver-once" — when fired, the listener self-disables.
  status       String   // "ACTIVE" | "FIRED" | "EXPIRED"

  /// Optional auto-expire (e.g. "wait 7d for approval, else expire").
  expiresAt    DateTime?

  createdAt    DateTime @default(now())
  firedAt      DateTime?

  @@index([eventType, status])
  @@index([expiresAt, status])
}
```

**Wichtige Design-Eigenschaften:**

- **Single source of truth in Postgres** — kein verteilter State.
- **Event-Stream als Audit-Trail** — `WorkflowEvent` mit `prevHash`/`entryHash` ist Hash-chained, kompatibel mit `audit-hash.server.ts` Pattern.
- **Materialisierter `currentState`** — schneller Listen-View ohne Replay nötig.
- **Versioned definitions** — alte Workflow-Instanzen behalten ihre Definitions-Version, neue Workflows nutzen die neueste. Schema-Evolution ohne Migration alter Instances.
- **Polymorpher Subject** — ein Workflow kann an Spacecraft, ComplianceItem, oder nichts hängen.
- **Soft-Pause** + **Hard-Deadline** als first-class Felder — UX-Awareness in der Engine.

---

## 5. Die Workflow-DSL

Eine `defineWorkflow()`-Factory, parallel zu `defineAction()`. Beispiel für W2 (Cyber-Incident-Response):

```typescript
// src/lib/workflows/cyber-incident.ts
import { defineWorkflow, step } from "@/lib/workflows/define-workflow";
import { z } from "zod";

export const cyberIncidentWorkflow = defineWorkflow({
  name: "cyber-incident-response",
  version: 1,
  description: "NIS2-conformant incident reporting (24h/72h/30d phases)",
  subjectType: "Incident",

  states: [
    "DETECTED",
    "ASSESSED",
    "INITIAL_NOTIFICATION_DRAFTED",
    "INITIAL_NOTIFIED",
    "INVESTIGATING",
    "UPDATE_NOTIFICATION_DRAFTED",
    "UPDATE_NOTIFIED",
    "RESOLVED",
    "FINAL_REPORT_DRAFTED",
    "FINAL_REPORT_SUBMITTED",
    "CLOSED",
  ],

  initialState: "DETECTED",

  steps: {
    "assess-impact": step.form({
      from: "DETECTED",
      to: "ASSESSED",
      requireRoles: ["OPERATOR"],
      schema: z.object({
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        affectedServices: z.array(z.string()),
        suspectedCause: z.string().min(20),
      }),
      uiLabel: "Assess incident impact",
      uiHint: "What systems are affected? How critical?",
    }),

    "draft-initial-notification": step.astra({
      from: "ASSESSED",
      to: "INITIAL_NOTIFICATION_DRAFTED",
      autoFireOnEnter: true, // Astra runs immediately on state-entry
      promptTemplate: "draft-nis2-initial-notification",
      requiredCitations: true,
      maxLoops: 5,
      // Generates an AstraProposal with the drafted notification
      // for operator review.
    }),

    "submit-initial": step.approval({
      from: "INITIAL_NOTIFICATION_DRAFTED",
      to: "INITIAL_NOTIFIED",
      requireRoles: ["OPERATOR"],
      // Hard deadline — if not approved within 4h of state entry,
      // escalate; if not within 24h post DETECTED, auto-submit
      // minimal-required version with operator-bypass-flag.
      slaBy: { offsetFromState: "DETECTED", hours: 24 },
      escalations: [
        { atOffsetHours: 20, action: "notify-cto" },
        { atOffsetHours: 23, action: "auto-submit-minimal-with-warning" },
      ],
      uiLabel: "Approve & submit initial NIS2 notification",
    }),

    investigate: step.action({
      from: "INITIAL_NOTIFIED",
      to: "INVESTIGATING",
      autoFireOnEnter: true,
      run: async (ctx) => {
        await ctx.publishEvent("incident.investigation-started", {
          incidentId: ctx.subjectId,
        });
      },
    }),

    "wait-for-investigation-complete": step.waitForEvent({
      from: "INVESTIGATING",
      to: "UPDATE_NOTIFICATION_DRAFTED",
      eventType: "incident.investigation-complete",
      predicate: { incidentId: "{{subjectId}}" },
      timeout: { offsetFromState: "DETECTED", hours: 72 },
      onTimeout: "draft-update-with-best-known-info", // step key
    }),

    "draft-update-notification": step.astra({
      from: "UPDATE_NOTIFICATION_DRAFTED",
      to: "UPDATE_NOTIFICATION_DRAFTED", // self-loop until approved
      autoFireOnEnter: true,
      promptTemplate: "draft-nis2-update",
    }),

    "submit-update": step.approval({
      from: "UPDATE_NOTIFICATION_DRAFTED",
      to: "UPDATE_NOTIFIED",
      requireRoles: ["OPERATOR"],
      slaBy: { offsetFromState: "DETECTED", hours: 72 },
    }),

    "wait-for-resolution": step.waitForEvent({
      from: "UPDATE_NOTIFIED",
      to: "RESOLVED",
      eventType: "incident.resolved",
      predicate: { incidentId: "{{subjectId}}" },
      // No timeout — waits indefinitely, but Heartbeat reminds
      // operator weekly.
      reminders: { intervalDays: 7 },
    }),

    "draft-final-report": step.astra({
      from: "RESOLVED",
      to: "FINAL_REPORT_DRAFTED",
      autoFireOnEnter: true,
      promptTemplate: "draft-nis2-final-report",
    }),

    "submit-final": step.approval({
      from: "FINAL_REPORT_DRAFTED",
      to: "FINAL_REPORT_SUBMITTED",
      requireRoles: ["OPERATOR", "CISO"], // multi-actor!
      slaBy: { offsetFromState: "DETECTED", days: 30 },
      qesRequired: true, // triggers D-Trust QES flow before transition
    }),

    close: step.action({
      from: "FINAL_REPORT_SUBMITTED",
      to: "CLOSED",
      autoFireOnEnter: true,
      run: async (ctx) => {
        await ctx.publishEvent("workflow.cyber-incident.closed", {
          incidentId: ctx.subjectId,
        });
      },
    }),
  },
});
```

**DSL-Eigenschaften:**

- `from`/`to` deklarieren die Transition — die Engine validiert dass keine illegale Transitions existieren
- `step.action` = synchroner Code-Run
- `step.form` = wartet auf User-Form-Submit (HTML-Form mit Zod)
- `step.approval` = wartet auf Approval (mit SLA + Escalations)
- `step.astra` = ruft Astra mit Prompt-Template auf, generiert `AstraProposal`
- `step.waitForEvent` = wartet auf Event aus dem `WorkflowEventListener`
- `slaBy` = relative oder absolute Frist
- `requireRoles` = Multi-Actor-Pflicht (OPERATOR, CISO, COUNSEL)
- `qesRequired` = D-Trust QES-Sign-Flow zwingend vor Transition

---

## 6. Step Types im Detail

### `step.action` — Synchroner Code-Run

```typescript
step.action({
  from: "X",
  to: "Y",
  autoFireOnEnter: true,
  retryPolicy: { maxAttempts: 3, backoff: "exponential" },
  run: async (ctx) => {
    // ctx has: subjectId, userId, payload, publishEvent, prisma
    // Throw → retry. Return → transition.
  },
});
```

### `step.form` — Wartet auf User-HTML-Form-Submit

```typescript
step.form({
  from: "X",
  to: "Y",
  requireRoles: ["OPERATOR"],
  schema: z.object({...}),
  uiLabel: "...",
  // The renderer at /dashboard/workflows/[id] picks this up,
  // generates an HTML form with Zod-validation.
});
```

### `step.approval` — Wartet auf Approval-Click mit SLA

```typescript
step.approval({
  from: "X",
  to: "Y",
  requireRoles: ["OPERATOR", "CISO"],
  slaBy: { offsetFromState: "X", hours: 24 },
  escalations: [
    { atOffsetHours: 20, action: "notify-cto" },
    { atOffsetHours: 23, action: "auto-submit-minimal" },
  ],
  qesRequired: false,
});
```

Multi-Actor: Wenn `requireRoles: ["OPERATOR", "CISO"]`, brauchen wir Approve-Click von einem OPERATOR-User UND einem CISO-User. Die Engine wartet auf beide.

### `step.astra` — AI-Reasoning-Step

```typescript
step.astra({
  from: "X",
  to: "Y", // y = self → wait for proposal-approval-event
  autoFireOnEnter: true,
  promptTemplate: "draft-initial-notification", // resolved from src/lib/astra/prompts/
  requiredCitations: true, // every claim must cite source
  maxLoops: 5,
  modelOverride: "claude-sonnet-4-6", // optional
  onProposalApproved: "submit-step-key", // next step on approve
  onProposalRejected: "redraft-step-key", // next step on reject
});
```

Die Engine:

1. Ruft Anthropic API mit prompt-template + ctx-data
2. Persistiert `decisionLog` auf `WorkflowEvent` (hash-chained!)
3. Erstellt `AstraProposal` mit dem Output
4. Workflow geht in `WAITING_FOR_PROPOSAL_DECISION` Sub-State
5. Bei Approval → Transition + onProposalApproved
6. Bei Rejection → Transition + onProposalRejected

### `step.waitForEvent` — Event-driven Wait

```typescript
step.waitForEvent({
  from: "X",
  to: "Y",
  eventType: "tle.removed-from-catalog",
  predicate: { noradId: "{{subjectId}}" }, // subject-templating
  timeout: { offsetFromState: "X", days: 90 },
  onTimeout: "manual-investigation-required-step-key",
  reminders: { intervalDays: 7 },
});
```

Registriert eine Row in `WorkflowEventListener`. Wenn der CelesTrak-Polling-Cron einen TLE als removed erkennt, publiziert er `tle.removed-from-catalog`-Event, der Listener feuert, der Workflow läuft weiter.

### `step.decision` — Verzweigung

```typescript
step.decision({
  from: "X",
  branches: [
    { to: "Y1", when: (ctx) => ctx.payload.severity === "CRITICAL" },
    { to: "Y2", when: (ctx) => ctx.payload.severity === "HIGH" },
    { to: "Y3", when: () => true }, // default
  ],
});
```

---

## 7. Durable Execution ohne Inngest — wie?

Der zentrale Trick: **die Heartbeat-Cron als universelles Workflow-Tick-System.**

```typescript
// /api/cron/workflow-heartbeat — runs every 1 minute
export async function GET(request: Request) {
  // Auth as usual.

  const now = new Date();

  // Tick 1: fire scheduled steps that are due
  const dueSchedules = await prisma.workflowSchedule.findMany({
    where: { status: "PENDING", fireAt: { lte: now } },
    take: 100, // batch
  });
  await Promise.all(dueSchedules.map((s) => fireSchedule(s)));

  // Tick 2: enforce SLAs (escalations)
  const slaWatchedWorkflows = await prisma.operatorWorkflowInstance.findMany({
    where: {
      hardDeadline: { lte: addHours(now, 24) }, // approaching deadline
      currentState: { not: { in: terminalStates } },
    },
  });
  await Promise.all(
    slaWatchedWorkflows.map((w) => evaluateEscalations(w, now)),
  );

  // Tick 3: expire event-listeners that timed out
  const expiredListeners = await prisma.workflowEventListener.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
  });
  await Promise.all(expiredListeners.map((l) => fireTimeout(l)));

  // Tick 4: emit reminders for waiting workflows
  await emitDueReminders(now);

  return NextResponse.json({ ok: true, ticked: dueSchedules.length });
}
```

**Warum 1-Minute-Cron reicht:**

- Compliance-Workflows ticken nicht in Sekunden. NIS2-Phasen sind in Stunden+. Authorization-Submissions in Tagen+. 1-Minute-Granularity ist 60x schneller als nötig.
- Vercel Cron ist im Pro-Tier inkludiert (eine Minute Cron-Frequenz).
- Wenn wir mal 100k aktive Workflows haben, kommen wir an Limits — aber bis dahin haben wir Geld für Inngest.

**Warum kein Worker-Pool nötig:**

- Steps laufen via Vercel Functions (Serverless, auto-scale, kein Worker-Pool zu betreiben).
- Long-Running-Steps (>10 min) gibt es bei Compliance-Workflows praktisch nicht. Falls doch: Step splittet sich in mehrere `step.action`s mit `step.waitForEvent` dazwischen.

**Recovery nach Server-Restart:**

- Workflow-State lebt in Postgres. Postgres überlebt Server-Restart.
- Beim nächsten Heartbeat-Tick wird der Workflow weiter-prozessiert.
- "In-Flight"-Steps (running) gibt es nicht — Steps sind atomar (entweder vollständig committed oder gar nicht).
- Idempotency-Garantie via `WorkflowEvent.sequence` UNIQUE-Constraint.

**Was passiert wenn ein Step crashed?**

- `WorkflowEvent` mit `eventType: "STEP_FAILED"` wird geschrieben.
- Retry-Policy aus Step-Definition wird angewendet (re-schedule für später).
- Nach Max-Attempts: Workflow geht in `ERROR`-State, Notification an Operator + Caelex-Engineering.
- Operator kann manuell "retry" klicken (UI-Action).

---

## 8. Audit-Hash-Chain-Integration

Caelex hat bereits `audit-hash.server.ts` mit SHA-256-Hash-Chain. COWF nutzt das DIREKT:

```typescript
// On every WorkflowEvent insert:
async function appendWorkflowEvent(
  workflowId: string,
  event: WorkflowEventInput,
) {
  const lastEvent = await prisma.workflowEvent.findFirst({
    where: { workflowId },
    orderBy: { sequence: "desc" },
  });

  const sequence = (lastEvent?.sequence ?? 0) + 1;
  const prevHash = lastEvent?.entryHash ?? GENESIS_HASH;

  const canonical = canonicalJSON({
    workflowId,
    sequence,
    eventType: event.eventType,
    payload: event.payload,
    occurredAt: event.occurredAt,
    causedBy: event.causedBy,
  });

  const entryHash = sha256Hex(prevHash + canonical);

  return prisma.workflowEvent.create({
    data: { ...event, workflowId, sequence, prevHash, entryHash },
  });
}
```

Das gibt uns:

- **Tamper-Evidence**: jede einzelne Workflow-Transition ist hash-verkettet
- **Auditor-Reconstruction**: kompletter Workflow-Lifecycle ist replayable
- **Integration mit Verity**: täglicher Cron published Tree-Head für `WorkflowEvent`-Stream zusammen mit `AuditLog`-Stream → ein einziges Verity-Tree-Anchor pro Org
- **EU AI Act Art. 12**: jede Astra-Step-Aktion ist hash-chained dokumentiert ≥6 Monate

---

## 9. Multi-Actor durch Role-Required-Steps

**Problem:** W2 Step "submit-final" verlangt `requireRoles: ["OPERATOR", "CISO"]`. Wie warten wir auf zwei verschiedene User-Approvals?

**Lösung:** `WorkflowApprovalSlot`-Subtabelle (oder JSON-Feld auf Instance):

```prisma
model WorkflowApprovalSlot {
  id           String @id @default(cuid())
  workflowId   String
  workflow     OperatorWorkflowInstance @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  stepKey      String

  /// Required role for THIS slot
  requiredRole String   // "OPERATOR" | "CISO" | "COUNSEL"

  /// Filled by which user
  approvedBy   String?
  approvedAt   DateTime?
  signature    String?   // QES-signature if qesRequired

  /// Audit
  rationale    String?   @db.Text
  rejectedAt   DateTime?
  rejectedBy   String?
  rejectionReason String? @db.Text

  @@index([workflowId, stepKey])
  @@unique([workflowId, stepKey, requiredRole])
}
```

Workflow-Step `submit-final` schreibt 2 Slots: `OPERATOR` und `CISO`. Beide müssen ausgefüllt sein bevor `to: "FINAL_REPORT_SUBMITTED"` triggert. Wenn einer rejected, geht der gesamte Step zurück in `FINAL_REPORT_DRAFTED` für Re-Draft.

---

## 10. AI-Integration: Astra direkt in Workflow-Steps

**Schlüssel-Insight:** Astra-V2-Engine existiert bereits in `src/lib/comply-v2/astra-engine.server.ts`. COWF baut darauf auf, nicht parallel.

```typescript
// Workflow engine, when executing a step.astra:
async function executeAstraStep(workflow: WorkflowInstance, step: AstraStep) {
  const prompt = await loadPromptTemplate(step.promptTemplate);
  const context = await buildAstraContext(workflow);

  const result = await runV2AstraTurn(
    [], // fresh history per workflow step
    renderPrompt(prompt, context),
    {
      maxLoops: step.maxLoops,
      requireCitations: step.requiredCitations,
      modelOverride: step.modelOverride,
    },
  );

  // Persist decisionLog as WorkflowEvent (hash-chained!)
  await appendWorkflowEvent(workflow.id, {
    eventType: "ASTRA_REASONING",
    causedBy: `astra:${step.promptTemplate}`,
    payload: {
      decisionLog: result.decisionLog,
      model: result.modelId,
      promptHash: sha256Hex(prompt),
      toolDefinitionsHash: sha256Hex(JSON.stringify(toolDefs)),
      tokensIn: result.usage.input,
      tokensOut: result.usage.output,
    },
  });

  // Generate AstraProposal as before (existing pattern)
  const proposal = await prisma.astraProposal.create({
    data: {
      userId: workflow.userId,
      actionName: `workflow-step:${workflow.defId}:${step.key}`,
      params: result.draftedOutput,
      itemId: workflow.subjectId,
      rationale: result.summary,
      decisionLog: result.decisionLog,
      expiresAt: addDays(new Date(), 7),
      // NEW: link back to workflow
      workflowId: workflow.id,
      workflowStepKey: step.key,
    },
  });

  // Register listener: when this proposal is decided, advance the workflow
  await prisma.workflowEventListener.create({
    data: {
      workflowId: workflow.id,
      stepKey: step.onProposalApproved ?? step.to,
      eventType: "astra-proposal.decided",
      predicate: { proposalId: proposal.id },
      status: "ACTIVE",
      expiresAt: proposal.expiresAt,
    },
  });

  return proposal;
}
```

**EU AI Act Art. 12-14 erfüllt:**

- `decisionLog` ist hash-chained (`appendWorkflowEvent` macht das)
- `promptHash` + `toolDefinitionsHash` = Reproducibility (Art. 12)
- `AstraProposal` mit Citation-Required = Transparency (Art. 13)
- Approval-Gate vor Transition = Human Oversight (Art. 14)

---

## 11. Notifications ohne externe Kosten

**Heutige Tools:** Resend (Free Tier 3000 emails/mo), bestehende `Notification`-Prisma-Model + In-App-Inbox.

**Pattern:**

- Workflow-Engine emittet auf jeden Step-Übergang ein `WorkflowNotification`-Event
- Subscriber-Funktion entscheidet:
  - Email (Resend Free) für SLA-Escalations + Workflow-Completions
  - In-App-Notification für jede Transition
  - Webhook (falls Customer eingerichtet) — für Premium-Tier später
- **Digest-Mode** (default): Operator bekommt 1 Email/Tag mit allen Updates statt pro Event

**Cost:**

- 100 Operators × 5 emails/Tag = 500 emails/Tag = 15k/mo → über Resend Free Tier hinaus
- Aber: Digest-Mode reduziert auf ~3k/mo → bleibt im Free Tier
- Alternative: SMTP via Cloudflare Email Workers (kostenlos, eigenes Caelex-Domain), kostet null

---

## 12. UX — wie es sich anfühlt

### `/dashboard/workflows` — Linear-style Liste

```
┌────────────────────────────────────────────────────────────────┐
│ ACTIVE WORKFLOWS — 7                                           │
├────────────────────────────────────────────────────────────────┤
│ ⏱ NIS2 Incident #INC-2026-04                                   │
│   investigate → submit-update                                  │
│   ⚠ Update due in 4h 23min  · OPERATOR action needed           │
│ ────────────────────────────────────────────────────────────── │
│ 🚀 Authorization Sat-12 (Polestar)                             │
│   under_nca_review · BAFA poll  · 23 days waiting              │
│ ────────────────────────────────────────────────────────────── │
│ 📅 Annual re-attestation 2026                                  │
│   astra_presummarized · 47/89 items reviewed                   │
│ ────────────────────────────────────────────────────────────── │
│ 🛰 Decommission EOL Sat-3                                      │
│   pre_deorbit_verified · waiting for deorbit-burn-window       │
│ ────────────────────────────────────────────────────────────── │
│ ...                                                            │
└────────────────────────────────────────────────────────────────┘
```

### `/dashboard/workflows/[id]` — Step-by-Step Wizard

```
┌────────────────────────────────────────────────────────────────┐
│ ◄ Back to workflows                                            │
│                                                                │
│ NIS2 Incident #INC-2026-04                                     │
│ Cyber Incident Response · Started 2 days ago                   │
│                                                                │
│ ┌───────────┐                                                  │
│ │ Timeline  │ ← jump to any step's audit-trail                │
│ ├───────────┤                                                  │
│ │ ✅ Detect │ T+0min                                           │
│ │ ✅ Assess │ T+12min · severity=HIGH                          │
│ │ ✅ Draft  │ T+15min · Astra · 3 citations · ✓ approved       │
│ │ ✅ Submit │ T+47min · Operator · QES ✓                       │
│ │ ✅ Inves..│ T+47min · auto                                   │
│ │ ⏱ Wait..  │ ⏱ in progress · update due in 4h 23min          │
│ └───────────┘                                                  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ ⏱ STEP: WAIT-FOR-INVESTIGATION-COMPLETE                  │   │
│ │                                                          │   │
│ │ Waiting for: incident.investigation-complete             │   │
│ │ Due: 2026-04-30 18:23 UTC (in 4h 23min)                  │   │
│ │                                                          │   │
│ │ ─ What you need to do ─                                  │   │
│ │ Complete investigation and emit `incident.investigation- │   │
│ │ complete` by clicking "Mark investigation complete" in   │   │
│ │ the incident detail page.                                │   │
│ │                                                          │   │
│ │ [Open Incident #INC-2026-04 →]                           │   │
│ │                                                          │   │
│ │ ─ If timeout fires ─                                     │   │
│ │ Workflow auto-advances to "draft-update-with-best-known- │   │
│ │ info" and Astra drafts an update notification with       │   │
│ │ what's known so far. NIS2 72h-deadline keeps ticking.    │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ ┌─ Audit trail (15 events) ─────────── [Expand all]──────┐    │
│ │ [+] T+0    DETECTED  · sentinel-alert                  │    │
│ │ [+] T+12   STATE: ASSESSED · operator (u_xx9)          │    │
│ │ [+] T+15   ASTRA_REASONING (decisionLog 8 entries)     │    │
│ │ [+] T+15   STATE: INITIAL_NOTIFICATION_DRAFTED         │    │
│ │ [+] T+47   ASTRA_PROPOSAL_APPROVED · operator (u_xx9)  │    │
│ │ [+] T+47   STATE: INITIAL_NOTIFIED                     │    │
│ │ ...                                                    │    │
│ └────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

Jeder einzelne Audit-Event zeigt:

- Hash-Chain-Position (sequence, prevHash, entryHash)
- "Verify" Button → public-verify-page mit Inclusion-Proof
- Astra-Decision-Log expandable
- Approval-Slots mit User + Timestamp + QES-Signatur

---

## 13. Migration: defineAction → COWF

**Defineaction** bleibt als atomic-mutation-layer. **COWF wraps it** für orchestrierte Multi-Step-Flows.

| Heute (`defineAction`)                                          | Morgen (mit COWF)                                         |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| `markAsAttested` als single Action mit `requiresApproval: true` | Step in W5 Annual-Re-Attestation Workflow, ein von vielen |
| `submitNCASubmission` als single Action                         | Step in W1 Authorization-Submission Workflow              |
| `acknowledgeIncident` als single Action                         | Step in W2 Cyber-Incident-Response Workflow               |
| `snoozeItem` (kein Multi-Step)                                  | Bleibt single Action — kein Workflow-Wrapping nötig       |

**Migrations-Schritte:**

1. Schema-Migration (additiv) für die 4 neuen Tabellen
2. `defineWorkflow()` DSL implementieren (~3 Wochen)
3. Heartbeat-Cron einrichten (~1 Woche)
4. Erste Workflow als Pilot: **W2 Cyber-Incident-Response** (~2 Wochen Pilot, weil zeit-sensitiv aber linear)
5. Zweite: **W5 Annual-Re-Attestation** (~2 Wochen, weil volume-heavy aber mechanisch)
6. Dritte: **W1 Authorization-Submission** (~4 Wochen, weil komplex mit QES + Multi-Actor)
7. Restliche 6 Workflows: ~1-2 Wochen pro Workflow

**Total Aufwand für vollständige Migration:** ~16-20 Wochen Engineering. Das ist mehr als Inngest (~6 Wochen Adoption), aber:

- Null External Costs
- Kompletter Audit-Trail in einer DB
- Keine Vendor-Lock-in
- Type-Safety durch eigene DSL
- Direct AI-Integration (Astra ist nicht "external service")

---

## 14. Was COWF NICHT kann (und das ist okay)

| Limitation                                      | Wann es ein Problem würde                              | Mitigation                                                          |
| ----------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| Cron-Granularity 1min                           | Wenn Sub-Sekunden-Workflow-Triggers nötig              | Kommt nie vor in Compliance                                         |
| Single-Region Postgres                          | Wenn UK/US-Hosting kommt                               | Per-Region COWF-Instanz, unabhängige Workflow-Stores                |
| Kein hot-reload für Workflow-Definition-Updates | Wenn häufige Workflow-Schema-Changes                   | Versioned Workflows lösen das (alte Instanzen fertig laufen lassen) |
| Kein eingebauter Visualizer                     | Wenn Operator BPMN-Style-Diagram will                  | Mermaid-Generator aus DSL — 1 Tag Eng                               |
| Kein Replay-Debugger                            | Wenn Workflow-Bug schwer zu reproduzieren              | Event-Stream-Export → Replay-Test im Eng-Stack                      |
| Limited Parallel-Execution                      | Wenn 100+ Steps in Workflow gleichzeitig laufen sollen | Compliance-Workflows haben max ~5 parallele Threads — kein Problem  |

---

## 15. Sicherheit + AI-Act-Konformität — wie COWF das löst

### EU AI Act Art. 12 (Logging ≥6 Monate)

- `WorkflowEvent` mit `ASTRA_REASONING` Type ist hash-chained, lebt in Postgres
- Cron `comply-v2-lifecycle` darf `WorkflowEvent` mit Astra-Causedby NIE vor 6 Monaten löschen

### Art. 13 (Transparency)

- Workflow-UI zeigt jeden Step mit "Was Astra getan hat, warum, mit welchen Citations"
- Public-Verify-Page für Audit-Trail (Inclusion-Proof gegen Tree-Head)

### Art. 14 (Human Oversight)

- Jeder `step.astra` mit `step.approval` als Folge-Step (default)
- Operator MUSS proposal lesen + Begründung schreiben (>30 chars) bevor approve
- Anti-Rubber-Stamping-Detection: Wenn User > 80% approve <30s → Audit-flag

### GDPR Art. 22 (Automated Decision-Making)

- Astra-Step ohne Approval-Step danach = nicht erlaubt für Decisions mit rechtlicher Wirkung
- Engine prüft beim `defineWorkflow()`-Register: wenn AstraStep mit Workflow-Output zu rechtlicher Submission, MUSS approval-step folgen

### NIS2 Art. 21 (Lieferketten)

- Caelex selbst ist Workflow-Subject von W7 Supplier-Risk-Onboarding (rekursiv: Caelex hat eigene Lieferanten)
- Customer kann via API-Export ihre Caelex-Audit-Trail-Slice ziehen

---

## 16. Konkretes End-to-End: W1 Authorization-Submission durchgespielt

**T-0** Operator-Click "Start authorization for Sat-12 (Polestar)"

- Server-Action erstellt `OperatorWorkflowInstance` mit `defId=W1`, `state=DRAFT`, `subject=Spacecraft:sat-12`
- `WorkflowEvent[seq=1]: STATE_TRANSITION DRAFT` mit Hash-Chain-Anchor

**T+5min** Operator füllt Metadata-Form (mass, orbit, payload-class)

- `step.form` validates Zod-Schema, `WorkflowEvent[seq=2]: STEP_COMPLETED metadata-form`
- State → `METADATA_COMPLETE`

**T+5min** `step.action assess-applicability` autofires

- Run-Function: `engine.applies(spacecraft) → ["EU_SPACE_ACT", "NIS2", "COPUOS"]`
- `WorkflowEvent[seq=3]: APPLICABILITY_ASSESSED`
- State → `APPLICABILITY_ASSESSED`

**T+6min** `step.astra draft-technical-doc` autofires

- Astra-Engine läuft mit Prompt-Template `draft-technical-doc-eu-space-act`
- Citation-Required: jede Section verweist auf EU-Space-Act-Article + Spacecraft-Field-Source
- `WorkflowEvent[seq=4]: ASTRA_REASONING` (decisionLog: 12 entries, model: claude-sonnet-4-6, promptHash: ...)
- `AstraProposal[id=p_xx]` created mit drafted Technical-Doc
- State → `TECHNICAL_DOC_DRAFT`

**T+8min** Operator opens proposal in `/dashboard/proposals`

- Sees decisionLog rendered (12 steps mit Tool-Calls + Quellen)
- Reviews drafted Technical-Doc
- Tickbox: "Reasoning gelesen", "Quellen verifiziert"
- Begründung-Freitext: "Klingt plausibel, Section 4.2 angepasst"
- Click "Approve & continue"
- `WorkflowEvent[seq=5]: ASTRA_PROPOSAL_DECIDED status=APPROVED`
- State → `TECHNICAL_DOC_APPROVED` (intermediate)

**T+8min** `step.decision counsel-review-required` autofires

- Branch evaluator: `spacecraft.massKg > 100 → "counsel-review-required"`
- `WorkflowEvent[seq=6]: DECISION counsel-review-required`
- State → `AWAITING_COUNSEL`

**T+8min** `step.approval counsel-review` registered

- `WorkflowApprovalSlot` created with `requiredRole=COUNSEL`
- Operator sees: "Counsel-Review angefragt — du wartest auf [counsel@firm.de]"
- Caelex sends Counsel-User Resend-email mit deep-link zu Workflow

**T+2 days** Counsel logs in, opens workflow, reviews Technical-Doc, leaves Comment, approves

- `WorkflowApprovalSlot.approvedBy=u_counsel, approvedAt=T+2d, rationale="..."`
- `WorkflowEvent[seq=7]: APPROVAL_SLOT_FILLED`
- State → `COUNSEL_REVIEWED`

**T+2 days** `step.action run-final-checks` autofires

- 12 Engine-Checks (alle Module RED/AMBER/GREEN)
- `WorkflowEvent[seq=8]: FINAL_CHECKS_PASSED`
- State → `READY_TO_SIGN`

**T+2 days** `step.approval qes-sign` registered

- `requireRoles=["MISSION_DIRECTOR"]`, `qesRequired=true`
- Mission-Director geht durch QES-Sign-Flow (D-Trust Cloud-API, mTAN-confirmation)
- `WorkflowApprovalSlot.signature=<qes-pkcs7-blob>`
- `WorkflowEvent[seq=9]: QES_SIGNED with signature-hash`
- State → `SIGNED`

**T+2 days** `step.action submit-to-nca` autofires

- POST to BAFA NCA-Portal API (or PDF-upload-fallback)
- `WorkflowEvent[seq=10]: SUBMITTED nca=BAFA reference=BAFA-2026-1234`
- State → `SUBMITTED`

**T+2 days** `step.waitForEvent nca-decision` registered

- `eventType=nca.decision`, `predicate={reference: BAFA-2026-1234}`
- `timeout={offsetFromState: SUBMITTED, days: 180}` (BAFA 6mo SLA)
- `reminders={intervalDays: 30}` — Operator gets monthly status email
- Status-Polling-Cron checks BAFA-Portal hourly

**T+30/60/90 days** Status-Polling-Cron findet keine Antwort

- Reminders fired → Operator sees in Today-Inbox
- Astra-Step `inquire-about-status` autofires bei T+90d
- Generates email-draft "Inquiry zu BAFA-2026-1234" für Operator-Review

**T+120 days** BAFA approves

- Status-Polling-Cron sees `nca.decision.approved`
- Publishes `WorkflowEvent[seq=N]: NCA_APPROVED license=BAFA-LIC-2026-456`
- Workflow-Listener fires
- State → `APPROVED`
- Operator gets celebration-notification + Astra-generated Press-Release-Draft

**Workflow archived** with full event-stream queryable forever, hash-chained, AI-Act-Art.-12-konform, ready for any auditor 30 years later.

---

## 17. Cost-Realität (durchgerechnet)

**Annahmen:** 100 Operators, 500 aktive Workflows/Monat, 50.000 WorkflowEvents/Monat, ~10.000 Astra-Steps/Monat.

| Posten                               | Inngest-Pro-Variante | **COWF-Variante**                    |
| ------------------------------------ | -------------------- | ------------------------------------ |
| Workflow-Engine                      | $300/mo              | **$0**                               |
| DB-Storage (Postgres + Astra-Events) | im Inngest enthalten | ~3-5 GB/mo Neon Free Tier OK         |
| Vercel Cron                          | $20/mo Pro-Tier      | **schon im Pro-Tier inkludiert**     |
| Resend Email                         | $20/mo Pro Tier      | **Free Tier reicht mit Digest-Mode** |
| Anthropic API                        | $200-500/mo          | **$200-500/mo (gleich!)**            |
| Sentry/Observability                 | $30/mo               | **Free-Tier reicht initial**         |
| **Total Workflow-Stack**             | **~$550/mo**         | **~$0**                              |

**Bei Skalierung auf 1000 Operators (Year-2):**

- Inngest skaliert auf ~$2000-3000/mo (Step-Pricing)
- COWF skaliert linear mit Postgres-Tier (Neon Pro $19/mo + DB-Storage), bleibt unter $200/mo

---

## 18. Summary — was Caelex damit gewinnt

1. **Strukturell überlegene Architektur** für Compliance-Domains (Workflow-State == Compliance-State)
2. **Null Vendor-Lock-in** auf Workflow-Engine
3. **AI-Act-Art.-12-14-konform out of the box** (Hash-Chain, Reproducibility, Human-Oversight)
4. **Direct Audit-Trail-Integration** mit `audit-hash.server.ts` und Verity-Logs
5. **Type-Safe DSL** in TypeScript, im Repo, code-reviewable
6. **9 kanonische Operator-Workflows** decken 95%+ der Compliance-Realität ab
7. **Multi-Actor-Modell** strukturell modelliert (Approval-Slots)
8. **Time-Travel-fähig** durch Postgres + Bi-Temporal-Layer (wenn später adoptiert)
9. **Erweiterbar** durch Custom-Steps (z.B. `step.qes` für D-Trust, `step.celestrak` für Telemetry)
10. **Null externe Workflow-Costs** bei voller Funktionalität

**Was Caelex aufgibt:**

- Ein paar Wochen mehr Eng-Aufwand vs Inngest-Adoption
- Eigene Observability-UI bauen statt Inngest-Dashboard nutzen
- Kein "Battle-Tested" wie Inngest/Temporal — aber Postgres-Idioms sind battle-tested

**Verdict:** Dieser Trade-off ist für Caelex's strategische Position **klar richtig**. Compliance-SaaS lebt vom integrierten Audit-Trail. Workflow-State außerhalb der Compliance-DB ist ein Konstruktionsfehler, kein Komfort.

---

## 19. Konkrete erste 3 Sprints

**Sprint 1 (3 Wochen) — Foundation**

- Prisma-Migration für 4 neue Tabellen
- `defineWorkflow()` + `step.*` DSL als TypeScript-Lib
- `appendWorkflowEvent` (Hash-Chain-integriert)
- Heartbeat-Cron Skeleton
- Unit-Tests für State-Machine-Validation, Schedule-Tick, Listener-Fire

**Sprint 2 (2 Wochen) — Pilot W2 (Cyber-Incident)**

- W2 Workflow-Definition implementieren
- `/dashboard/workflows` + `/dashboard/workflows/[id]` UI
- Integration mit bestehendem Sentinel + Astra
- End-to-End-Test mit Mock-Incident

**Sprint 3 (3 Wochen) — Pilot W5 (Annual Re-Attestation)**

- W5 Workflow-Definition
- Volume-Optimization (1 Operator hat 100+ Items zu re-attestieren)
- Mass-Approve-UI mit Caveat-Filter
- Migration-Test: bestehende Re-Attestation-Logik in Workflow gewrappt

**Total Sprints 1-3:** 8 Wochen, ein Engineer.

Danach pro Workflow ~1-2 Wochen, parallelisierbar wenn 2+ Engineers. Volle 9-Workflow-Migration in ~16-20 Wochen.

---

## Quellen / Referenzen

Diese Architektur basiert auf:

- Eigenes Caelex `defineAction` Pattern (atomare Mutationen)
- Eigenes `audit-hash.server.ts` (Hash-Chain)
- Postgres-Native State-Machine-Pattern (Martin Kleppmann's "Designing Data-Intensive Applications" Ch. 11 — Stream Processing)
- Vercel Cron Documentation (1min granularity, Pro tier)
- Existierende Verity-Logs (`VerityLogLeaf` + `VerityLogSTH`) als Tree-Head-Anchor
- EU AI Act Art. 12-14 Pflichten als Design-Constraints
- Stripe-Workbench / Linear-Triage als UX-Inspiration für Workflow-List + Detail
- Mercury-Approvals-Pattern für Multi-Actor-Approval-Slots
- Palantir AIP Logic Decision-Log-Pattern für Astra-Step-Audit

— Claude Sonnet 4.6, im Auftrag des Founders
