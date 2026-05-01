# Caelex — Workflow-Master-Spec mit Palantir-Wow-Effekt

**Stand:** 2026-05-01
**Scope:** Die **definitive Spezifikation** wie Workflows in Caelex aufgebaut sind, wie sie funktionieren, und wie sie visuell den Palantir-Wow-Effekt erzeugen.
**Trigger:** Founder-Frage: "Wie konzipieren wir die Workflows? Wie funktioniert das ganze System? Wie stellen wir das UI technisch dar? Ich möchte unbedingt den Palantir-Wow-Effekt haben."

> **Eine Zeile.** Ein Workflow ist ein deterministischer DAG aus typed Steps, generiert vom COE basierend auf dem Operator-Profile, ausgeführt durch COWF in Postgres, visualisiert als Multi-Pane Operations-Console mit Live-Streaming Astra-Agents, Force-Directed-Graphs, 3D-Universe und Hash-Chain-Animation — Palantir-Niveau, ohne externe Kosten.

---

## 1. Die Workflow-Architektur in einem Bild

```
                 ┌─────────────────────────────────────┐
                 │   OPERATOR PROFILE (verified)       │
                 │   ProfileEvidence chain (T0-T5)     │
                 └─────────────────┬───────────────────┘
                                   │
                                   ▼
                 ┌─────────────────────────────────────┐
                 │   24 COMPLIANCE-ENGINES             │
                 │   eu-space-act, nis2, copuos, ...   │
                 │   Output: applicable-set            │
                 └─────────────────┬───────────────────┘
                                   │
                                   ▼
                 ┌─────────────────────────────────────┐
                 │   COE (Compliance Orchestration     │
                 │        Engine)                       │
                 │                                     │
                 │   • Dependency-Resolver             │
                 │   • Stakeholder-Mapper              │
                 │   • Time-Backward-Planner           │
                 │   • Re-Use-Detector                 │
                 │   • External-Constraint-Solver      │
                 │   • Risk-Prioritizer                │
                 │                                     │
                 │   Output: PersonalizedWorkflowDAG   │
                 └─────────────────┬───────────────────┘
                                   │
                                   ▼
                 ┌─────────────────────────────────────┐
                 │   COWF (Caelex Operator Workflow    │
                 │         Foundation)                  │
                 │                                     │
                 │   Tables in Postgres:               │
                 │   • OperatorWorkflowDef             │
                 │   • OperatorWorkflowInstance        │
                 │   • WorkflowEvent (hash-chained)    │
                 │   • WorkflowSchedule                │
                 │   • WorkflowEventListener           │
                 │   • WorkflowApprovalSlot            │
                 │                                     │
                 │   Heartbeat: Vercel-Cron 1min       │
                 └─────────────────┬───────────────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
                  ▼                ▼                ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │ STEP-TYPES   │  │ ASTRA V2     │  │ HASH-CHAIN   │
        │              │  │              │  │              │
        │ • action     │  │ • tool-loop  │  │ AuditLog +   │
        │ • form       │  │ • proposals  │  │ VerityLog    │
        │ • approval   │  │ • streaming  │  │ + Witness    │
        │ • astra      │  │ • citation-  │  │ + OpenTime-  │
        │ • waitFor    │  │   first      │  │   stamps     │
        │ • decision   │  │              │  │              │
        │ • qes        │  │              │  │              │
        └──────────────┘  └──────────────┘  └──────────────┘
                  │                │                │
                  └────────────────┼────────────────┘
                                   │
                                   ▼
                 ┌─────────────────────────────────────┐
                 │   UI LAYER — PALANTIR WOW           │
                 │                                     │
                 │   • Mission-Operations-Console      │
                 │   • Force-Directed Workflow-DAG     │
                 │   • Live-Astra-Reasoning-Stream     │
                 │   • 3D Operator-Universe            │
                 │   • Hash-Chain-Block-Animation      │
                 │   • Source-Verification-Terminal    │
                 │   • Multi-Pane-Workspaces           │
                 │   • Cmd-K Universal-Verb-Engine     │
                 └─────────────────────────────────────┘
                                   │
                                   ▼
                          OPERATOR (Anna)
```

**Das ist das gesamte System auf einer Seite.** Sieben Schichten, sechs Tabellen, acht UI-Patterns, ein definitives Pattern.

---

## 2. Anatomie eines Workflows

### 2.1 Was ist ein Workflow strukturell

Ein Caelex-Workflow ist **kein linearer Step-Counter**. Es ist ein **Directed-Acyclic-Graph (DAG)** mit:

- **Nodes** = einzelne Steps (typed: action/form/approval/astra/waitFor/decision/qes)
- **Edges** = Dependencies (welcher Step muss vor welchem)
- **Phases** = Logical Groupings (Authorization, Pre-Launch, Continuous, EOL)
- **Stakeholders** = Multi-Actor-Slots (Operator, Counsel, Authority, Investor)
- **Time-Constraints** = Hard-Deadlines + Soft-Milestones
- **Re-Use-Links** = Verweise auf existierende Artifacts
- **Hash-Chain** = jeder State-Change wird als WorkflowEvent persistiert

### 2.2 Step-Types (die 7 Bausteine)

```typescript
// Type 1: action — synchrone Code-Ausführung
step.action({
  from: "STATE_X",
  to: "STATE_Y",
  autoFireOnEnter: true,
  retryPolicy: { maxAttempts: 3, backoff: "exponential" },
  run: async (ctx) => {
    /* ... */
  },
});

// Type 2: form — wartet auf User-Input
step.form({
  from: "STATE_X",
  to: "STATE_Y",
  requireRoles: ["OPERATOR"],
  schema: z.object({
    /* ... */
  }),
  uiLabel: "...",
});

// Type 3: approval — wartet auf Approve-Click mit SLA
step.approval({
  from: "STATE_X",
  to: "STATE_Y",
  requireRoles: ["OPERATOR", "CISO"], // Multi-Actor
  slaBy: { offsetFromState: "X", hours: 24 },
  escalations: [
    { atOffsetHours: 20, action: "notify-cto" },
    { atOffsetHours: 23, action: "auto-submit-minimal" },
  ],
  qesRequired: true,
});

// Type 4: astra — AI-Reasoning mit Citation-First
step.astra({
  from: "STATE_X",
  to: "STATE_Y",
  autoFireOnEnter: true,
  promptTemplate: "draft-document-section",
  requiredCitations: true,
  multiModelCrossCheck: true,
  maxLoops: 5,
  onProposalApproved: "next-step-key",
  onProposalRejected: "redraft-step-key",
});

// Type 5: waitFor — Event-driven Wait
step.waitForEvent({
  from: "STATE_X",
  to: "STATE_Y",
  eventType: "nca.decision",
  predicate: { reference: "{{subjectId}}" },
  timeout: { offsetFromState: "X", days: 180 },
  reminders: { intervalDays: 30 },
  onTimeout: "manual-investigation-step",
});

// Type 6: decision — Verzweigung
step.decision({
  from: "STATE_X",
  branches: [
    { to: "STATE_Y1", when: (ctx) => ctx.severity === "CRITICAL" },
    { to: "STATE_Y2", when: () => true }, // default
  ],
});

// Type 7: qes — D-Trust Cloud-QES-Sign-Flow
step.qes({
  from: "STATE_X",
  to: "STATE_Y",
  signerRole: "MISSION_DIRECTOR",
  documentRef: "{{ctx.draftedDocumentId}}",
  qesProvider: "D-Trust", // or SwissSign, Sectigo
  signingPurpose: "BAFA_SUBMISSION",
});
```

Jeder Step ist **typisiert, deklarativ, im Code definiert** (nicht Web-UI-konfiguriert). Geht durch Code-Review, hat Tests.

### 2.3 Workflow-Definition als TypeScript-DSL

```typescript
// src/lib/workflows/sat-acme-3-authorization.ts
import { defineWorkflow, step } from "@/lib/workflows/define-workflow";

export const sat3AuthorizationWorkflow = defineWorkflow({
  name: "spacecraft-authorization-bafa",
  version: 3,
  description: "EU Space Act Authorization via BAFA",
  subjectType: "Spacecraft",

  states: [
    "DRAFT",
    "METADATA_COMPLETE",
    "APPLICABILITY_ASSESSED",
    "TECHNICAL_DOC_DRAFT",
    "COUNSEL_REVIEWED",
    "READY_TO_SIGN",
    "SIGNED",
    "SUBMITTED",
    "UNDER_NCA_REVIEW",
    "APPROVED",
    "CONDITIONAL_APPROVED",
    "REJECTED",
  ],

  initialState: "DRAFT",

  steps: {
    "complete-metadata": step.form({
      from: "DRAFT",
      to: "METADATA_COMPLETE",
      requireRoles: ["OPERATOR"],
      schema: SpacecraftMetadataSchema,
      uiLabel: "Spacecraft-Metadata vervollständigen",
    }),

    "assess-applicability": step.action({
      from: "METADATA_COMPLETE",
      to: "APPLICABILITY_ASSESSED",
      autoFireOnEnter: true,
      run: async (ctx) => {
        const applicableSet = await runEngines(ctx.profile, ctx.spacecraft);
        await ctx.persist({ applicableSet });
      },
    }),

    "draft-technical-document": step.astra({
      from: "APPLICABILITY_ASSESSED",
      to: "TECHNICAL_DOC_DRAFT",
      autoFireOnEnter: true,
      promptTemplate: "draft-technical-document",
      requiredCitations: true,
      multiModelCrossCheck: true,
      onProposalApproved: "counsel-review",
      onProposalRejected: "draft-technical-document", // self-loop
    }),

    "counsel-review": step.approval({
      from: "TECHNICAL_DOC_DRAFT",
      to: "COUNSEL_REVIEWED",
      requireRoles: ["COUNSEL"],
      slaBy: { offsetFromState: "TECHNICAL_DOC_DRAFT", days: 14 },
      escalations: [
        { atOffsetDays: 10, action: "notify-operator" },
        { atOffsetDays: 12, action: "remind-counsel" },
      ],
    }),

    "run-final-checks": step.action({
      from: "COUNSEL_REVIEWED",
      to: "READY_TO_SIGN",
      autoFireOnEnter: true,
      run: async (ctx) => {
        const checks = await runFinalChecks(ctx);
        if (!checks.allGreen) throw new Error(`Blocked: ${checks.blockers}`);
      },
    }),

    "qes-sign": step.qes({
      from: "READY_TO_SIGN",
      to: "SIGNED",
      signerRole: "MISSION_DIRECTOR",
      documentRef: "{{ctx.technicalDocumentId}}",
      qesProvider: "D-Trust",
      signingPurpose: "BAFA_SUBMISSION",
    }),

    "submit-to-bafa": step.action({
      from: "SIGNED",
      to: "SUBMITTED",
      autoFireOnEnter: true,
      run: async (ctx) => {
        const ref = await pharosWebhook.submit("BAFA", ctx.signedDocument);
        await ctx.persist({ bafaReference: ref });
      },
    }),

    "wait-for-bafa-decision": step.waitForEvent({
      from: "SUBMITTED",
      to: "UNDER_NCA_REVIEW",
      eventType: "bafa.acknowledged",
      predicate: { reference: "{{ctx.bafaReference}}" },
      timeout: { offsetFromState: "SUBMITTED", days: 14 },
      reminders: { intervalDays: 7 },
    }),

    "wait-for-bafa-final": step.waitForEvent({
      from: "UNDER_NCA_REVIEW",
      to: "APPROVED",
      eventType: "bafa.decision",
      predicate: { reference: "{{ctx.bafaReference}}", decision: "APPROVED" },
      timeout: { offsetFromState: "UNDER_NCA_REVIEW", days: 180 },
      reminders: { intervalDays: 30 },
      onTimeout: "draft-status-inquiry",
    }),
  },
});
```

**Das ist der ganze Workflow als Code.** Type-safe, testbar, im Repo, code-reviewed.

### 2.4 Workflow-Instance vs Workflow-Definition

```
WorkflowDefinition  (in Code, versioniert)
        ↓
        instantiate per User+Subject
        ↓
WorkflowInstance    (in Postgres, eine pro Mission)
        ├─ currentState: "TECHNICAL_DOC_DRAFT"
        ├─ subjectId: "spacecraft-acme-3"
        ├─ events: [WorkflowEvent[]]  ← hash-chained stream
        ├─ schedules: [WorkflowSchedule[]]  ← cron-triggered
        ├─ listeners: [WorkflowEventListener[]]  ← event-driven
        └─ approvalSlots: [WorkflowApprovalSlot[]]  ← multi-actor
```

**Multi-Tenant garantiert:** Anna's Workflow-Instance ist isoliert von anderen Operatoren's Instances. Hash-Chain ist per-Org.

---

## 3. Workflow-Lifecycle (von Generation bis Completion)

### 3.1 Generation (T-180, Workflow startet)

```
TIMELINE: T-180 (vor Launch)

[09:14:00] Operator klickt "Sat-Acme-3 Authorization starten"
           ↓
[09:14:01] Server-Action createWorkflowInstance()
           ↓
[09:14:02] OperatorWorkflowInstance erstellt:
             - defId: "spacecraft-authorization-bafa@v3"
             - subjectId: "spacecraft-acme-3"
             - currentState: "DRAFT"
             - WorkflowEvent#1: STATE_TRANSITION (DRAFT)
               prevHash: "GENESIS"
               entryHash: "0x8f3a..."
           ↓
[09:14:02] COE.regeneratePersonalizedDAG(operator, spacecraft)
           ├─ Engines run (24 parallel)
           ├─ Dependency-Resolver
           ├─ Stakeholder-Mapper (Tobias als Counsel, Markus als Director)
           ├─ Time-Backward-Planner (Launch T+0, BAFA-Review 60-180d)
           └─ Re-Use-Detector (Sat-Acme-1 Templates available)
           ↓
[09:14:04] PersonalizedWorkflowDAG generated
             - 12 Phases, 47 Steps total
             - 3 Stakeholders involved
             - 8 hard-deadlines
           ↓
[09:14:04] WorkflowEvent#2: DAG_GENERATED
             payload: { dagId, phaseCount, stepCount, ... }
           ↓
[09:14:04] First step "complete-metadata" enters STATE_X
             → Notification an Anna: "Bitte Spacecraft-Metadata füllen"
```

**4 Sekunden vom Klick zur fertig-instantiierten Workflow.**

### 3.2 Step-Execution (kontinuierlich)

```
TIMELINE: ein einzelner Step

[14:30] Step "draft-technical-document" autofires
        (autoFireOnEnter: true)
        ↓
[14:30] WorkflowEvent#5: STEP_STARTED
        eventType: "ASTRA_REASONING_STARTED"
        ↓
[14:30] Astra V2 invocation:
        - model: claude-sonnet-4-6@bedrock-eu
        - prompt-hash: 0x7a3f...
        - tool-definitions-hash: 0x9b2c...
        - Tools available: 12
        ↓
[14:30] Tool-call sequence (live-streaming):
        - get_spacecraft_metadata() → result
        - get_article(EU_SPACE_ACT, "Art. 7") → result
        - get_template("technical-document") → result
        - cite_source(...) → success
        - cite_source(...) → success
        - ... 8 more tool calls
        ↓
[14:32] Astra completes draft (1m 41s wall-time)
        ↓
[14:32] Multi-Model-Cross-Check:
        - GPT-4o-mini called on same input
        - Agreement-Score: 0.94 (above threshold 0.9)
        ↓
[14:32] Citation-Validator:
        - 7/7 citations verified against catalog
        ↓
[14:32] AstraProposal created:
        - id: "ap_7c3f4a9b"
        - decisionLog: 11 entries (hash-chained)
        - modelContext: { model_id, prompt_hash, tools_hash }
        - expiresAt: T+7d
        ↓
[14:32] WorkflowEvent#6: ASTRA_REASONING_COMPLETE
        prevHash: ...
        entryHash: 0xa2d8...
        ↓
[14:32] WorkflowEventListener registered:
        - eventType: "astra-proposal.decided"
        - predicate: { proposalId: "ap_7c3f4a9b" }
        - status: ACTIVE
        ↓
[14:32] Notification an Anna:
        "Mission-Profile-Document bereit zur Review (Astra)"
```

Jeder Step erzeugt **mehrere WorkflowEvents** im Hash-Chain. Alle reproducible, alle audit-fest.

### 3.3 Multi-Actor-Approval (parallel)

```
TIMELINE: Counsel-Review-Approval

[T+0] Step "counsel-review" enters STATE
      WorkflowApprovalSlot erstellt:
        - requiredRole: COUNSEL
        - userId: tobias.mueller@kanzlei.de
        - approvedBy: null
        - status: PENDING
      ↓
[T+0] Notification an Tobias (in-app + email)
      Magic-Link zur Atlas-Workspace
      ↓
[T+2d 10h] Tobias loggt sich ein, reviewt
           ↓
[T+2d 10h] Tobias schreibt 4 Notes auf ComplianceItems
           Tobias QES-signed sein Approval
           ↓
[T+2d 10h] WorkflowApprovalSlot.approvedAt = T+2d 10h
                              .approvedBy = tobias.id
                              .signature = QES-blob
           ↓
[T+2d 10h] WorkflowEvent#7: APPROVAL_SLOT_FILLED
           ↓
[T+2d 10h] Engine prüft: alle benötigten Roles approved? (nur COUNSEL = ja)
           ↓
[T+2d 10h] State transition: COUNSEL_REVIEWED
           ↓
[T+2d 10h] Next step "run-final-checks" autofires
```

**Multi-Actor strukturell modelliert.** Wenn Step `["OPERATOR", "CISO"]` verlangt, werden zwei Slots erstellt — beide müssen gefüllt sein.

### 3.4 Time-Triggers (Background)

```
HEARTBEAT-CRON: every 1 minute

[*]   /api/cron/workflow-heartbeat
      ↓
      Tick 1: fire scheduled steps (deadline reached)
      ↓
      SELECT * FROM WorkflowSchedule WHERE fireAt <= now() AND status = "PENDING"
      → 3 due schedules found:
          - W1 Step "wait-for-bafa-final" timeout-step (T-90 deadline)
          - W2 Step "snooze-expired" (24h since snooze-set)
          - W3 Step "reminder-tick" (weekly reminder)
      ↓
      For each: fire step + WorkflowEvent
      ↓
      Tick 2: enforce SLAs (escalations)
      ↓
      SELECT * FROM WorkflowInstance WHERE hardDeadline within 24h
      → 2 workflows approaching deadline:
          - NIS2-Incident-W2: T-1h until 24h-notification
          - Authorization-W1: T-7d until counsel-review-deadline
      ↓
      Apply escalations (notify, auto-submit-minimal, etc.)
      ↓
      Tick 3: expire event-listeners
      ↓
      SELECT * FROM WorkflowEventListener WHERE expiresAt <= now()
      → 1 expired listener: AstraProposal #ap_xyz expired (7d window)
      ↓
      Mark proposal as EXPIRED + emit timeout event
      ↓
      Tick 4: emit reminders
      ↓
      For each waiting workflow with reminders due: send notification
      ↓
      DONE in <5 seconds typically
```

**Vercel Cron + Postgres = durable execution ohne Inngest.** Compliance-Workflows ticken in Stunden bis Monaten — 1-Minute-Granularity ist 60x feiner als nötig.

### 3.5 Completion + Audit-Trail

```
TIMELINE: T+87 days (BAFA approves)

[T+87d] BAFA-Polling-Cron findet status: APPROVED
        ↓
[T+87d] WorkflowEventListener fires:
        - listener: "wait-for-bafa-final"
        - event: { type: "bafa.decision", decision: "APPROVED" }
        ↓
[T+87d] State transition: APPROVED (terminal)
        ↓
[T+87d] WorkflowEvent#247: WORKFLOW_COMPLETED
        prevHash: 0x9c4e...
        entryHash: 0xd8a1...
        ↓
[T+87d] Verity-Tree-Head daily-cron picks this up
        STH gets signed by Caelex Issuer-Key
        Witness-cosignature requested (BAFA)
        ↓
[T+88d] BAFA cosigns Tree-Head
        Witness-Cosignature persisted
        ↓
[T+89d] Quarterly OpenTimestamps-Anchor publishes
        Tree-Head into Bitcoin
        ↓
[FOREVER] Workflow archived but queryable
          247 WorkflowEvents, all hash-chained
          Counsel-Sign-Off available for audit
          BAFA-Cosignature available for verification
          Bitcoin-Anchor available for proof-of-existence
```

**Workflow ist nie "weg".** Selbst nach Completion lebt er als Audit-Artifact für 30+ Jahre.

---

## 4. UI-Anatomie pro Workflow-View

Hier kommt der Palantir-Wow-Effekt. **Sechs Workflow-View-Modes**, jeder mit eigenem Visual-Vocabulary.

### 4.1 View-Mode 1: Mission-Operations-Console (Default)

**Was:** Multi-Pane-Übersicht mit Live-Cards pro Mission.

```
┌─ CAELEX · MISSION OPERATIONS ─ Live · 23 background tasks ─────────────┐
│                                                                        │
│ ╔══════════ SAT-12 ═══════ SAT-9 ════════ SAT-7 ════════ SAT-3 ══════╗│
│ ║ Polestar       Earth-Obs      Comm           R&D                   ║│
│ ║                                                                    ║│
│ ║ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            ║│
│ ║ │ RUNNING  │  │ COMPLETE │  │ PENDING  │  │ ALERT    │            ║│
│ ║ │          │  │          │  │          │  │          │            ║│
│ ║ │ ASTRA-V2 │  │ POSTURE- │  │ COUNSEL- │  │ SENTINEL-│            ║│
│ ║ │ drafting │  │ SNAPSHOT │  │ REVIEW   │  │ ANOMALY  │            ║│
│ ║ │          │  │          │  │          │  │          │            ║│
│ ║ │ Doc 4.2  │  │ +3% 30d  │  │ Tobias   │  │ Reaction │            ║│
│ ║ │ 8 cites  │  │  ✓ all   │  │ ~2 days  │  │ Wheel #2 │            ║│
│ ║ │ Δ 0.94   │  │  green   │  │ overdue  │  │ critical │            ║│
│ ║ │          │  │          │  │  by 14h  │  │          │            ║│
│ ║ │ [▮▮▮▮▱]  │  │ ━━━━━━ ✓ │  │ ━━━━━━━━ │  │ ⚠⚠⚠⚠⚠⚠  │            ║│
│ ║ │ ▬45sec   │  │ 1.2sec   │  │ T+14h    │  │ NEW      │            ║│
│ ║ │          │  │          │  │          │  │          │            ║│
│ ║ │ @claude- │  │ @cron:   │  │ @user:   │  │ @sentinel│            ║│
│ ║ │ sonnet-4 │  │ posture  │  │ tobias   │  │ -agent-2 │            ║│
│ ║ └──────────┘  └──────────┘  └──────────┘  └──────────┘            ║│
│ ║                                                                    ║│
│ ║ ┌──────────┐  ┌──────────┐  ┌──────────┐                          ║│
│ ║ │ ACTION   │  │ RUNNING  │  │ ACTION   │                          ║│
│ ║ │          │  │          │  │          │                          ║│
│ ║ │ ASTRA-   │  │ PRE-LNCH-│  │ QES-SIGN │                          ║│
│ ║ │ PROPOSAL │  │ CHECK    │  │ NEEDED   │                          ║│
│ ║ │          │  │          │  │          │                          ║│
│ ║ │ mark-att │  │ 8/12 GR  │  │ Markus   │                          ║│
│ ║ │ priority │  │ ━━━━━━━━ │  │ Mission- │                          ║│
│ ║ │ HIGH     │  │ T-30d    │  │ Director │                          ║│
│ ║ │ [Approve]│  │          │  │ [Sign]   │                          ║│
│ ║ │          │  │          │  │ critical │                          ║│
│ ║ └──────────┘  └──────────┘  └──────────┘                          ║│
│ ╚════════════════════════════════════════════════════════════════════╝│
│                                                                        │
│ ─── BACKGROUND ACTIVITIES (collapsed, 23 tasks) ───────────────────── │
│  ▸ Cron: posture-snapshot · last 4h · 12 events                       │
│  ▸ Cron: celestrak-polling · last 2h · 6 events                       │
│  ▸ Cron: sentinel-cross-verify · last 1h · 18 events                  │
│  ▸ ... 20 more                                                        │
│                                                                        │
│ ─── EVENT-TICKER (last 10 events) ────────────────────────────────── │
│  14:32:47  W1 Sat-3 ASTRA_REASONING_COMPLETE 0xa2d8...               │
│  14:32:51  W2 Sat-7 APPROVAL_SLOT_FILLED tobias 0xb4e2...            │
│  14:33:04  W3 Sat-9 ENGINE_RUN_COMPLETE 0xc6f1...                    │
│  14:33:09  Cron sentinel-cross-verify SUCCESS                         │
│  ...                                                                   │
└────────────────────────────────────────────────────────────────────────┘
```

**Wow-Effekt-Pattern in dieser View:**

1. **Multiple Spalten = parallele Missionen** — Operator sieht alles auf einen Blick
2. **Cards mit Status-Color-Coding** — running (blau), complete (grün), action (gelb), alert (rot)
3. **Agent-IDs sichtbar** — `@claude-sonnet-4`, `@cron:posture`, `@user:tobias` — sieht aus wie Multi-Agent-System
4. **Quantitative Density** — Token-Count, Tools-Used, Confidence, Time-Elapsed
5. **Sub-Card-Sparklines** — Mini-Progress-Bars, Trend-Indicators
6. **Live-Updates** — Cards bewegen sich, Status-Changes pulsen
7. **Background-Activities collapsed** — 23 Tasks ohne Visual-Noise
8. **Event-Ticker** — Tail-of-recent-Events mit Hash-Chain-References

**Tech-Implementation:**

- Server-Sent-Events für Live-Updates
- Postgres LISTEN/NOTIFY für Events
- Framer Motion AnimatePresence für Card-Transitions
- React Server Components für initial render
- Tailwind + custom Palantir-Glass-Utilities

### 4.2 View-Mode 2: Workflow-DAG-Force-Directed-Graph

**Was:** Den gesamten Workflow als interaktiver Force-Directed-Graph (D3.js / React-Flow).

```
┌─ SAT-ACME-3 · AUTHORIZATION WORKFLOW · DAG VIEW ──────────────────────┐
│                                                                        │
│                         [APPROVED] ←──── (terminal)                    │
│                            ↑                                           │
│                            │                                           │
│                       [UNDER NCA REVIEW]                               │
│                            ↑                                           │
│                            │ (waiting · BAFA poll · 60d)               │
│                       [SUBMITTED]                                      │
│                            ↑                                           │
│                            │                                           │
│                        [SIGNED]                                        │
│                            ↑                                           │
│                            │ (qes · D-Trust)                           │
│                      [READY TO SIGN]                                   │
│                            ↑                                           │
│             ┌──────────────┴──────────────┐                            │
│             │                             │                            │
│      [COUNSEL REVIEWED]            [run-final-checks]                  │
│             ↑                                                          │
│             │ (counsel · approval · ●pending Tobias)                   │
│      [TECHNICAL DOC DRAFT] ●●●  ← YOU ARE HERE                         │
│             ↑                                                          │
│             │ (astra · streaming · 0.94 cross-check)                   │
│      [APPLICABILITY ASSESSED]                                          │
│             ↑                                                          │
│             │                                                          │
│      [METADATA COMPLETE]                                               │
│             ↑                                                          │
│             │                                                          │
│      [DRAFT] ── (start)                                                │
│                                                                        │
│                                                                        │
│  Legend:                                                               │
│   ● node: state-name                                                   │
│   ━━━ edge: dependency                                                 │
│   gray: not started                                                    │
│   blue: running                                                        │
│   green: complete                                                      │
│   yellow: pending action                                               │
│   red: blocked / failed                                                │
│   ●●● pulsing: currently active                                        │
│                                                                        │
│  [Click any node → drill into step detail]                            │
│  [Drag to rearrange]                                                  │
│  [Time-Slider to see DAG-history]                                      │
└────────────────────────────────────────────────────────────────────────┘
```

**Wow-Effekt-Pattern:**

- Force-Directed-Graph mit physics-simulation (D3.js)
- Pulsing-Animation auf currently-active node
- Edge-thickness reflects dependency-strength
- Hover über Edge → tooltip "weil Step X braucht Output von Step Y"
- Time-Slider unten → DAG zeigt Zustand zu beliebigem Zeitpunkt
- Smooth-Transitions wenn DAG re-generated wird

**Tech:**

- React-Flow (open-source, free, MIT)
- Custom Edge-Renderer für Caelex-Style
- Framer Motion für Pulsing
- Postgres-Listener für Live-Updates

### 4.3 View-Mode 3: Live-Astra-Reasoning-Stream

**Was:** Wenn Astra arbeitet, sieht der Operator die Reasoning live.

```
┌─ ASTRA · STEP "draft-technical-document" · LIVE ──────────────────────┐
│                                                                        │
│ ⚡ MODEL: claude-sonnet-4-6@bedrock-eu                                 │
│   PROMPT-HASH: 0x7a3f4e8c... [verify]                                 │
│   TOOLS-AVAILABLE: 12                                                  │
│   STARTED: 14:30:47 UTC                                                │
│                                                                        │
│ ─── REASONING TIMELINE ───                                            │
│                                                                        │
│ [▸ 14:30:47] 💭 Thought                                               │
│              "I need to draft a Technical Document for Sat-Acme-3.    │
│               Let me first understand the operator's profile and the   │
│               applicable EU Space Act articles."                      │
│                                                                        │
│ [▸ 14:30:48] ⚡ Tool: get_operator_profile()                          │
│              ↓ result: 47kg LEO EO, DE+FR, NIS2-Essential             │
│              [view raw evidence ▾]                                    │
│                                                                        │
│ [▸ 14:30:50] ⚡ Tool: get_applicable_articles({reg: 'EU_SPACE_ACT'})  │
│              ↓ result: 47 articles                                    │
│                                                                        │
│ [▸ 14:30:52] 💭 Thought                                               │
│              "Article 7 is the main authorization article. Article 14 │
│               requires insurance proof. Article 17 needs risk-        │
│               assessment. Let me draft each section."                 │
│                                                                        │
│ [▸ 14:30:54] ⚡ Tool: get_article(EU_SPACE_ACT, 'Art. 7')             │
│              ↓ result: full text + commentary                         │
│                                                                        │
│ [▸ 14:30:55] ⚡ Tool: cite_source(Art. 7, paragraph 2.1)              │
│              ↓ result: "[ATLAS-EUSA-7-2-1]"                           │
│                                                                        │
│ [▸ 14:30:57] ⚡ Tool: get_template("technical-document")              │
│              ↓ result: 18-section template                            │
│                                                                        │
│ [▸ 14:31:02] 💭 Thought                                               │
│              "Let me now draft Section 1 (Mission Overview), then     │
│               Section 4 (Technical Description), then Section 7       │
│               (Compliance Statement)."                                │
│                                                                        │
│ [▸ 14:31:05] ⚡ Generating Section 1...                                │
│ [▸ 14:31:18] ⚡ Generating Section 4...                                │
│ [▸ 14:31:34] ⚡ Generating Section 7...                                │
│ [▸ 14:31:45] ⚡ Generating Sections 8-18 (parallel)                    │
│                                                                        │
│ [▸ 14:32:14] ✓ Tool: validate_citations(7 citations)                  │
│              ↓ 7/7 verified against EU-Space-Act-Catalog              │
│                                                                        │
│ [▸ 14:32:16] ⚡ Multi-Model-Cross-Check: GPT-4o-mini                   │
│              ↓ Same input, parallel call                              │
│                                                                        │
│ [▸ 14:32:43] ✓ Cross-Check Result: 0.94 agreement (above 0.9)         │
│                                                                        │
│ [▸ 14:32:45] ✅ Reasoning complete                                    │
│              Total: 1m 58s · 11 tools · 4 thoughts · 7 citations      │
│                                                                        │
│ ─── SUMMARY ───                                                       │
│                                                                        │
│ ✓ Drafted 18-section Technical Document                               │
│ ✓ 7 citations from EU-Space-Act + 2 from operator's own data          │
│ ✓ Cross-checked against GPT-4o-mini (0.94 agreement)                  │
│ ✓ Hash-chained as WorkflowEvent#6 → 0xa2d8...                        │
│ ✓ Reproducible (model_id + prompt_hash + tools_hash persisted)        │
│                                                                        │
│ ─── PROPOSAL CREATED ───                                              │
│                                                                        │
│ AstraProposal #ap_7c3f4a9b                                            │
│ Expires: T+7 days                                                     │
│ Action: mark step "draft-technical-document" complete                 │
│                                                                        │
│ ⚡ AWAITING YOUR REVIEW (5 Min lesen + approve)                       │
│                                                                        │
│ [Read Document →]   [View Reasoning Detail →]   [Approve / Reject]    │
└────────────────────────────────────────────────────────────────────────┘
```

**Wow-Effekt-Pattern:**

- Live-Streaming der Tool-Calls + Thoughts (~200ms-Delays)
- Color-coded by Type: 💭 Thought (slate), ⚡ Tool (emerald), ✓ Success (green), ❌ Error (red)
- Inline-Verify-Buttons für Hash-Chain + Source-Evidence
- Cross-Check-Result mit Confidence-Score visualisiert
- Citation-Pills clickable → öffnet Source-Document
- Total-Timing + Tool-Count als Quantitative Density
- AstraProposal-Action-Bar prominent am Ende

**Tech:**

- Server-Sent-Events von `/api/astra/stream/[workflowId]/[stepId]`
- React Suspense + Streaming-Components
- Framer Motion staggered-reveal für Tool-Calls

### 4.4 View-Mode 4: 3D Operator-Universe (Three.js)

**Was:** Der gesamte Compliance-Stand des Operators als animiertes 3D-Universum.

```
                       Outer ring of regulations
                  ✦ EU Space Act ─── ✦ NIS2  ───  ✦ CRA
                  ↑                                 ↓
                  ✦ COPUOS ───────── ✦ Insurance
                  ↑                                 ↓
                  ✦ ITU Spectrum ─── ✦ Export Control
                  ↑                                 ↓
                  ✦ National DE ─── ✦ National FR
                                ↑
                       ┌─────────────────┐
                       │                 │
                       │    OPERATOR     │
                       │   Acme Space    │  ← center node
                       │       ●         │     glow effect
                       │                 │
                       └────────┬────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
        ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
        │ Sat-Acme-1│     │ Sat-Acme-2│     │ Sat-Acme-3│
        │  LIVE     │     │  LIVE     │     │  PLANNED  │
        │  T+2yr    │     │  T+6mo    │     │  T-145d   │
        └───────────┘     └───────────┘     └───────────┘

     (orbital animation: spacecraft slowly rotate around operator)
     (regulation-ring slowly rotates in opposite direction)
     (connection-lines pulse softly when compliance-events fire)
```

**Wow-Effekt-Pattern:**

- 3D-Scene mit Three.js (existing in Caelex)
- Spacecraft orbital animation (slow rotation)
- Regulation-ring counter-rotation
- Pulse-Effects bei Events (NIS2-Update → Pulse durch betroffene Lines)
- Click auf Spacecraft → camera flies to Sphere, zooms in
- Click auf Regulation → camera flies outward, shows applicable Articles
- Hover-Effects: Connection-Lines highlight reasoning ("Article 14 applies because <100kg")

**Tech:**

- Three.js / @react-three/fiber (existing)
- @react-three/drei für Helpers
- WebGL2 GPU-beschleunigt

### 4.5 View-Mode 5: Hash-Chain-Block-Visualizer

**Was:** Audit-Trail als animated Block-Chain — tasteful, nicht crypto-bro.

```
┌─ AUDIT HASH-CHAIN · Sat-Acme-3 Authorization ─────────────────────────┐
│                                                                        │
│  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐                 │
│  │  #247  │───▶│  #248  │───▶│  #249  │───▶│  #250  │  (latest)       │
│  │        │    │        │    │        │    │        │                 │
│  │ STATE_ │    │ ASTRA_ │    │APPROVAL│    │ QES_   │                 │
│  │ TRANS- │    │ REASON │    │ _SLOT_ │    │ SIGNED │                 │
│  │ ITION  │    │ COMPLT │    │ FILLED │    │        │                 │
│  │        │    │        │    │        │    │        │                 │
│  │ DRAFT→ │    │ Doc4.2 │    │ Tobias │    │ Markus │                 │
│  │ META-  │    │ ready  │    │ approv │    │ signed │                 │
│  │ COMP   │    │        │    │ counsel│    │        │                 │
│  │        │    │        │    │        │    │        │                 │
│  │ Anna   │    │ Astra  │    │ Tobias │    │ Markus │                 │
│  │ 14:30  │    │ 14:32  │    │ 16:42  │    │ 09:12  │                 │
│  │        │    │        │    │        │    │        │                 │
│  │0x8f3a..│    │0xa2d8..│    │0xb4e1..│    │0xc6f7..│                 │
│  └────────┘    └────────┘    └────────┘    └────────┘                 │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                              │
│                                                                        │
│  TREE-HEAD STATUS                                                      │
│                                                                        │
│  ✓ STH @ 2026-04-30 published                                         │
│    Hash: 0x4f8a72e1...                                                │
│    Signed by: Caelex Issuer-Key (Ed25519)                             │
│                                                                        │
│  ✓ Witness-Cosignature @ 2026-04-30 17:14                              │
│    Witness: BAFA (German Federal Office)                              │
│    Public-Key: 0xbaf4a8e2...                                          │
│                                                                        │
│  ✓ OpenTimestamps Bitcoin-Anchor @ 2026-Q1                             │
│    Bitcoin Block: #871,234                                            │
│    [verify against Bitcoin →]                                         │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                              │
│                                                                        │
│  ⚡ Click any block → see full event payload + signature              │
│  ⚡ "Verify chain integrity" → live runs through all hashes           │
│  ⚡ Time-Travel-Slider → see chain at any historical point            │
└────────────────────────────────────────────────────────────────────────┘
```

**Wow-Effekt-Pattern:**

- Animierte Block-Connections (subtle data-flow-effect)
- Witness-Cosignature + Bitcoin-Anchor sichtbar
- Click-to-verify führt live durch alle Hashes (10-20 Sec Animation)
- Time-Slider = bi-temporal History-View
- Tasteful, not cryptobro (kein Glitter, keine Coins)

**Tech:**

- React + Tailwind + Framer Motion
- SVG für Block-Connections
- Server-side Hash-Verification API

### 4.6 View-Mode 6: Provenance-Timeline pro Entity

**Was:** Vertikale Timeline pro Profil-Datum / pro Compliance-Item / pro Document mit allen Source-Pulls und Audit-Events.

```
┌─ COMPLIANCE-ITEM · NIS2-Art-21-2-D · "Supply Chain Security" ──────────┐
│                                                                        │
│  Status: ATTESTED (T3 · Counsel-Verified)                             │
│  Provenance Trail (12 events):                                        │
│                                                                        │
│  ●  2026-05-04 16:42 UTC                                              │
│  │  COUNSEL_ATTESTATION by tobias.mueller                             │
│  │  Tier: T3 (counsel-attested with QES)                              │
│  │  Signature: D-Trust 0xb4e1... [verify]                             │
│  │  Audit: WorkflowEvent#249 [verify]                                 │
│  │                                                                     │
│  ●  2026-05-04 14:30 UTC                                              │
│  │  ASTRA_PROPOSAL_DECIDED status=APPROVED                            │
│  │  Approver: anna.schmidt                                            │
│  │  Reasoning-Chain: 11 entries [view]                                │
│  │  Citation-Validity: 7/7 verified                                   │
│  │                                                                     │
│  ●  2026-05-04 14:32 UTC                                              │
│  │  ASTRA_REASONING_COMPLETE                                          │
│  │  model: claude-sonnet-4-6@bedrock-eu                               │
│  │  cross-check: 0.94 agreement                                       │
│  │                                                                     │
│  ●  2026-05-01 14:30 UTC                                              │
│  │  ITEM_INITIALIZED                                                  │
│  │  Source: NIS2-Engine v2.3                                          │
│  │  Reason: NIS2-Essential-Entity classification                      │
│  │                                                                     │
│  ●  2026-05-01 09:18 UTC                                              │
│  │  AUTO_DETECTED                                                     │
│  │  Detection-Source: nis2-engine.server.ts                           │
│  │  Confidence: 0.95 (3-way verified)                                 │
│  │  ├─ source: handelsregister-de (operator-size)                     │
│  │  ├─ source: unoosa (operator-type)                                 │
│  │  └─ source: bafa-register (operator-jurisdiction)                  │
│  │                                                                     │
│  ●  ... (7 more historical events)                                    │
│                                                                        │
│  ●  2026-08-04 (next re-verification scheduled)                        │
│                                                                        │
│  [Show raw evidence ▼]   [Verify chain integrity →]                    │
└────────────────────────────────────────────────────────────────────────┘
```

**Wow-Effekt-Pattern:**

- Vertical Timeline mit Dot-Markers
- Color-Coded Tier-Badges (T0-T5)
- Inline-Verify-Buttons
- Expandable Raw-Evidence (JSON-View)
- "Show in DAG-Map" Button → springt zur DAG-View mit Highlight

---

## 5. Die 12 Wow-Effekt-Patterns konkret

Das ist die definitive Liste was Caelex hightech wirken lässt:

### Pattern 1: Source-Verification-Stream beim Onboarding

**Wow-Effekt:** in 36 Sekunden sieht User wie Caelex live aus 5 Quellen sein Profil baut. Wie ein Terminal in einem Cyberpunk-Film.

**Tech:** Server-Sent-Events + Streaming-React-Components. Konkret: `/api/onboarding/stream/[domain]` + EventSource-Client.

### Pattern 2: Hypothesen-Compliance-Map

**Wow-Effekt:** "Aufgrund öffentlicher Daten vermuten wir 47 Articles applicable, 5 Workflows, 3 dringende Items" — User sieht das in 30 Sekunden, ohne Eingaben.

**Tech:** Static React-Components mit Engine-Output, gerendert via Server-Component.

### Pattern 3: Mission-Operations-Console (Multi-Pane Card-Wall)

**Wow-Effekt:** Wie Palantir Hivemind. Multi-Mission Spalten, Live-Cards, Background-Tasks-Ticker, Event-Stream-Feed.

**Tech:** Tailwind-Grid + Framer Motion + Server-Sent-Events + Postgres LISTEN/NOTIFY.

### Pattern 4: Workflow-DAG-Force-Directed-Graph

**Wow-Effekt:** Workflows als interaktiver Graph. Pulsing-Active-Node, Hover-Reveal-Reasoning, Time-Slider für History.

**Tech:** React-Flow (free, MIT) + custom Edge-Renderer + Framer Motion.

### Pattern 5: Live-Astra-Reasoning-Stream

**Wow-Effekt:** Operator sieht Astra denken. Tool-Calls erscheinen alle 200ms. Citation-Validation läuft live.

**Tech:** Anthropic Streaming-API + Server-Sent-Events + Suspense-Components.

### Pattern 6: 3D Operator-Universe

**Wow-Effekt:** Operator als Sonne, Spacecraft als Planeten, Regulations als Outer-Ring — alles orbital animiert.

**Tech:** Three.js / @react-three/fiber (existing) + @react-three/drei.

### Pattern 7: Hash-Chain-Block-Visualizer

**Wow-Effekt:** Audit-Trail als Block-Chain. Witness-Cosignature, Bitcoin-Anchor, Click-to-Verify.

**Tech:** SVG + Framer Motion + Server-side Verification-API.

### Pattern 8: Provenance-Timeline pro Entity

**Wow-Effekt:** pro ComplianceItem/Document/Profil-Feld eine vertikale Timeline aller Events.

**Tech:** React-Component mit Tailwind + Framer Motion.

### Pattern 9: Compliance-Health-Pulse

**Wow-Effekt:** Posture-Score als living Donut mit Heartbeat-Animation. Bei Improvement: green-pulse. Bei Decline: amber-pulse.

**Tech:** Recharts + Framer Motion + CSS-Animations.

### Pattern 10: Cmd-K Universal-Verb-Engine

**Wow-Effekt:** ⌘K öffnet Backdrop-Blur über Dot-Grid-Canvas. Type "snooze NIS2 art 32 30 days" → Caelex tut's. Power-User-Magic.

**Tech:** cmdk library (existing) + Server-Action-Mapping.

### Pattern 11: Stakeholder-Network-Graph

**Wow-Effekt:** 4-Aktor-Netzwerk (Operator-Counsel-Authority-Investor) als Force-Directed-Graph. Pulse-on-Communication.

**Tech:** React-Flow + Live-Update-System.

### Pattern 12: Time-Travel-Slider

**Wow-Effekt:** Slider über die Mission-Lifecycle. Slider-Move → gesamte UI re-rendert mit historical state. "Was war wahr am 15. März 2027?"

**Tech:** Postgres Bi-Temporal-Tables + React-State + Suspense.

---

## 6. Live-Streaming-Architektur (kritisch für Wow-Effekt)

Damit Cards sich live updaten und Astra-Reasoning live streamt, brauchen wir Real-Time-Backbone — **alles ohne externe Kosten**:

### 6.1 Server-Sent-Events (SSE) als Primary

```typescript
// /api/operations/stream/[orgId]/route.ts
export async function GET(request: Request, { params }) {
  const stream = new ReadableStream({
    async start(controller) {
      // Initial state
      const initialState = await getOperationsState(params.orgId);
      controller.enqueue(`data: ${JSON.stringify(initialState)}\n\n`);

      // Subscribe to Postgres LISTEN/NOTIFY for org events
      const listener = await prisma.$listen("workflow_events");
      listener.on("event", (payload) => {
        if (payload.orgId === params.orgId) {
          controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
        }
      });

      // Heartbeat every 30s via async loop using sleep()
      // (Vercel Edge runtime + Workflow scope require this pattern)
      (async () => {
        while (!request.signal.aborted) {
          await sleep(30_000);
          controller.enqueue(`: heartbeat\n\n`);
        }
      })();

      // Cleanup
      request.signal.addEventListener("abort", () => {
        listener.unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**Eigenschaften:**

- Einseitig (Server → Client) — perfekt für Operations-View
- Native Browser-Support (EventSource-API)
- Automatic-Reconnect bei Network-Loss
- Funktioniert über Vercel-Edge-Functions
- Kein zusätzlicher Vendor

### 6.2 Postgres LISTEN/NOTIFY als Event-Bus

```sql
-- Trigger auf WorkflowEvent INSERT
CREATE OR REPLACE FUNCTION notify_workflow_event()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'workflow_events',
    json_build_object(
      'orgId', NEW.org_id,
      'workflowId', NEW.workflow_id,
      'eventType', NEW.event_type,
      'payload', NEW.payload,
      'occurredAt', NEW.occurred_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_event_notify
  AFTER INSERT ON "WorkflowEvent"
  FOR EACH ROW
  EXECUTE FUNCTION notify_workflow_event();
```

**Wirkung:** Wenn ein WorkflowEvent persistiert wird, wird sofort PG_NOTIFY gefeuert. SSE-Listener bekommen das in <50ms.

### 6.3 Real-Time-Bandbreite

Geschätzt:

- ~100 Events/Tag pro aktiver Mission
- ~5 aktive Missionen pro Operator (durchschnitt)
- ~500 Events/Tag/Operator
- ~10ms pro Event-Notification
- = **5 Sekunden Bandbreite/Tag/Operator** — vernachlässigbar

Bei 100 Operatoren: 50.000 Events/Tag = ~7 Events/Sekunde Peak. Postgres Notify packt 1000+/sec problemlos.

### 6.4 Astra-Streaming via Anthropic Streaming-API

```typescript
// /api/astra/stream/[workflowId]/[stepId]/route.ts
export async function GET(request, { params }) {
  const stream = new ReadableStream({
    async start(controller) {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const messageStream = await anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        tools: ALL_TOOLS,
        messages: [...history, { role: "user", content: prompt }],
      });

      // Stream every event to client
      for await (const event of messageStream) {
        controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);

        // Persist to WorkflowEvent (hash-chained)
        if (event.type === "tool_use") {
          await persistAstraEvent(workflowId, stepId, event);
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

**Eigenschaften:**

- Anthropic streamt natürlicherweise (Streaming-API)
- Caelex stream-passthrough zum Client
- Persistiert parallel im Hash-Chain
- 200ms-Token-Granularity = Cards erscheinen live

---

## 7. Tech-Stack komplett

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                        │
│                                                                 │
│   Framework:      Next.js 15 (App Router, RSC)                  │
│   Language:       TypeScript (strict)                           │
│   Styling:        Tailwind CSS + Palantir-Glass-Utilities       │
│   Components:     Custom + cmdk + react-hook-form + Zod         │
│   3D:             Three.js / @react-three/fiber                 │
│   Force-Graphs:   React-Flow (free, MIT)                        │
│   Charts:         Recharts                                      │
│   Animations:     Framer Motion                                 │
│   Icons:          Lucide React                                  │
│   Tables:         TanStack Table                                │
│   Drag-Drop:      @dnd-kit                                      │
│   Cmd-K:          cmdk                                          │
│   PDF:            @react-pdf/renderer                           │
│   Real-Time:      EventSource (native browser)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ BACKEND                                                         │
│                                                                 │
│   Runtime:        Vercel Functions (Edge + Serverless)          │
│   Database:       PostgreSQL 18 (Neon Serverless)               │
│   ORM:            Prisma 5.22                                   │
│   Auth:           NextAuth v5 + WebAuthn + SAML                 │
│   Real-Time:      Postgres LISTEN/NOTIFY → SSE                  │
│   Workflow:       COWF (own) — siehe Workflow-Foundation-Doc   │
│   Workers:        Vercel Cron (1min granularity)                │
│   Storage:        Cloudflare R2 (S3-compatible)                 │
│   Email:          Resend                                        │
│   AI:             Anthropic Claude (direct, → Bedrock EU)       │
│   PDF Server:     jsPDF                                         │
│   Encryption:     AES-256-GCM (per-tenant)                      │
│   Rate Limiting:  Upstash Redis                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AUDIT + TRUST                                                   │
│                                                                 │
│   Hash-Chain:     SHA-256 in AuditLog (existing)                │
│   Verity:         RFC-6962 Merkle-Trees + Ed25519 STH (existing)│
│   Witnesses:      C2SP tlog-witness (Roadmap Q3 2026)           │
│   Time-Anchor:    OpenTimestamps Bitcoin (Roadmap Q3 2026)      │
│   QES:            D-Trust Cloud-API (Roadmap Q3 2026)           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ KEINE EXTERNEN VENDOR-COSTS für:                                │
│                                                                 │
│   ❌ Inngest / Temporal / WorkOS                                │
│   ❌ Datadog / New Relic / Honeycomb                            │
│   ❌ Salesforce / HubSpot / Marketo                             │
│   ❌ Algolia / Elasticsearch                                    │
│   ❌ Auth0 / Clerk                                              │
│   ❌ Cal.com (we self-host) / Calendly                          │
│                                                                 │
│   $0/mo bei <10 Operatoren, ~$20/mo bei 100 Operatoren         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation-Order (was wann)

### Phase 1: Foundation (Q3 2026, ~6-8 Wochen)

```
Sprint 1A: COWF Foundation               2-3 Wochen
  - Prisma-Migration für 6 Tables
  - defineWorkflow() DSL
  - Heartbeat-Cron
  - Hash-Chain-Integration

Sprint 1B: COE Foundation                2-3 Wochen
  - Compliance-Orchestration-Engine
  - Dependency-Resolver
  - Stakeholder-Mapper
  - DAG-Generation

Sprint 1C: Verified-Profile Foundation   2-3 Wochen
  - ProfileEvidence Prisma-Model
  - Auto-Detection-Engine (5 Public-API-Adapters)
  - Verification-Tier-System
```

### Phase 2: Wow-Effekt UI (Q4 2026, ~8-10 Wochen)

```
Sprint 2A: Source-Verification-Stream    1-2 Wochen
  Pattern 1 — Onboarding-Live-Terminal

Sprint 2B: Mission-Operations-Console    2-3 Wochen
  Pattern 3 — Multi-Pane Card-Wall

Sprint 2C: Live-Astra-Reasoning-Stream   2 Wochen
  Pattern 5 — Tool-Call-Streaming

Sprint 2D: Workflow-DAG-Force-Graph      2-3 Wochen
  Pattern 4 — Force-Directed-Graph
```

### Phase 3: Polish + Differentiator (Q1 2027, ~6-8 Wochen)

```
Sprint 3A: 3D Operator-Universe          2 Wochen
  Pattern 6 — Three.js Scene

Sprint 3B: Hash-Chain-Visualizer          1 Woche
  Pattern 7 — Block-Animation

Sprint 3C: Provenance-Timeline            1 Woche
  Pattern 8 — Per-Entity Audit

Sprint 3D: Health-Pulse + Network-Graph   1-2 Wochen
  Patterns 9 + 11

Sprint 3E: Cmd-K + Time-Travel-Slider    2 Wochen
  Patterns 10 + 12
```

### Phase 4: Continuous (Q2 2027 onwards)

```
Per Pilot-Feedback:
  - UI-Polish-Sprints
  - Performance-Optimization (60fps + LCP <1.5s)
  - Mobile-PWA
  - Internationalization
```

**Total ~20-26 Wochen Engineering** für volles Workflow-System mit Palantir-Wow-Effekt.

**Erste Pilot-Demo shippable nach Phase 1 (Sprint 1A+1B+1C, ~8 Wochen)** mit funktionalem aber UI-light System. Ab Phase 2 fängt der Wow-Effekt an.

---

## 9. Konkrete Wow-Effekt-Demo-Sequence

Wenn du einem Investor/Customer/Partner Caelex zeigst, in **4 Minuten**:

### Minute 1: Source-Verification-Stream

```
"Lass mich dir zeigen wie schnell Caelex deine Compliance-Realität erkennt.
 Ich gebe deine Domain ein..."

[Source-Verification-Stream läuft 36 Sekunden live]

"In 36 Sekunden hat Caelex 5 öffentliche Quellen abgefragt, gecrosschecked,
 und eine personalisierte Compliance-Map gebaut. Schau mal..."
```

### Minute 2: Hypothesen-Compliance-Map → Mission-Operations-Console

```
"Hier siehst du was Caelex über deine Firma weiß: 47 Articles, 5 Workflows,
 3 dringende Items. Alles aus öffentlichen Quellen verifiziert.

 Jetzt schau wie das aussieht wenn du die Plattform aktiv nutzt..."

[Switch zu Mission-Operations-Console mit Demo-Daten]

"Multi-Mission-View. Pro Mission die aktuellen Workflow-Steps. Cards live.
 Hier — Astra V2 draftet gerade ein Document für Sat-3. Du siehst die
 Tool-Calls live..."
```

### Minute 3: Live-Astra-Reasoning + DAG-View

```
"Klick — hier ist die Reasoning-Chain. Astra ruft Tools, denkt, zitiert
 Quellen. 7 Citations gegen den EU-Space-Act-Catalog verifiziert. Cross-
 Check gegen GPT-4o-mini: 0.94 Übereinstimmung.

 Und der Workflow als DAG..."

[Switch zu DAG-View]

"Sat-3 Authorization, 12 Phases, 47 Steps. Jede Phase mit Dependencies
 visualisiert. Counsel-Review, QES-Sign-Off, BAFA-Submission. Du siehst
 wo du gerade stehst, was als nächstes kommt, was wartet."
```

### Minute 4: Hash-Chain + 3D-Universe

```
"Und das Beste: alles ist hash-chained. Jede Decision, jeder Sign-Off,
 jeder Astra-Tool-Call. Witness-cosigned von BAFA, Bitcoin-anchored.
 Mathematisch beweisbar..."

[Switch zu 3D Operator-Universe]

"Das ist dein Compliance-Universe. Dein Operator als Center-Node, deine
 Spacecraft orbital, deine applicable Regulations als Outer-Ring. Live
 animiert. Bei Compliance-Events pulst die Connection-Line.

 Das ist Caelex."
```

**4 Minuten. Wow-Effekt vermittelt. Customer fragt "wann kann ich anfangen?"**

---

## 10. Antworten auf die drei Founder-Fragen

### Frage 1: Wie konzipieren wir die Workflows?

**Antwort:**

Workflows sind **deterministische DAGs**, generiert vom **COE (Compliance Orchestration Engine)** basierend auf:

- Verified Operator-Profil (mit Provenance-Kette)
- 24 Compliance-Engines (eu-space-act, nis2, copuos, ...)
- 6 COE-Sub-Engines (Dependency, Stakeholder, Time-Plan, Re-Use, Constraints, Risk)

**7 Step-Types** als Bausteine:

- `step.action` (Code-Ausführung)
- `step.form` (User-Input)
- `step.approval` (Multi-Actor + SLA)
- `step.astra` (AI mit Citation-First)
- `step.waitForEvent` (Event-driven)
- `step.decision` (Verzweigung)
- `step.qes` (D-Trust Cloud-Sign)

**Workflow-Definition als TypeScript-DSL** (`defineWorkflow({...})`), versioniert, im Code, getestet.

### Frage 2: Wie funktioniert das System?

**Antwort:**

```
Operator-Profil → COE (Engines + 6 Orchestrators) → PersonalizedWorkflowDAG
       ↓                                                    ↓
  Verified-Tier (T0-T5)                          COWF (Postgres-based, no Inngest)
       ↓                                                    ↓
  Hash-Chain                                      Heartbeat-Cron (1min)
       ↓                                                    ↓
  Re-Verification-Cron                            Step-Execution + Hash-Chain
                                                           ↓
                                                  WorkflowEvents persisted
                                                  (hash-chained, audit-fest)
                                                           ↓
                                                  Verity Tree-Heads
                                                  + Witness-Cosignatures
                                                  + Bitcoin-Anchor
```

**Lifecycle:**

1. Generation (4 sec vom Klick zur fertig-instantiierten Workflow)
2. Step-Execution (kontinuierlich, mehrere WorkflowEvents pro Step)
3. Multi-Actor-Approvals (parallel, strukturell modelliert)
4. Time-Triggers (Heartbeat-Cron, durable)
5. Completion + Hash-Chain-Anchor (forever queryable)

### Frage 3: Wie stellen wir das UI technisch dar (Palantir-Wow-Effekt)?

**Antwort:**

**12 Wow-Effekt-Patterns**, alle mit existing Stack ohne externe Kosten:

1. **Source-Verification-Stream** — Terminal-Style-Live-Log beim Onboarding (SSE)
2. **Hypothesen-Compliance-Map** — Public-Data-only Map nach 30 Sec
3. **Mission-Operations-Console** — Multi-Pane Card-Wall mit Live-Updates (Tailwind + SSE + Framer)
4. **Workflow-DAG-Force-Graph** — Interaktiver Graph (React-Flow + Postgres-Listener)
5. **Live-Astra-Reasoning-Stream** — Tool-Calls live alle 200ms (Anthropic-Streaming-API)
6. **3D Operator-Universe** — Three.js Scene mit Orbital-Animation (existing)
7. **Hash-Chain-Block-Visualizer** — Block-Chain-Animation tasteful (SVG + Framer)
8. **Provenance-Timeline** — Vertikale Timeline pro Entity mit Verify-Links
9. **Compliance-Health-Pulse** — Living Donut mit Heartbeat-Animation
10. **Cmd-K Universal-Verb-Engine** — Keyboard-First Power-User-Magic (cmdk)
11. **Stakeholder-Network-Graph** — 4-Aktor Force-Directed (React-Flow)
12. **Time-Travel-Slider** — Bi-temporal History-View (Postgres-18)

**Real-Time-Backbone:**

- Server-Sent-Events (native, no external)
- Postgres LISTEN/NOTIFY (built-in)
- Anthropic-Streaming-API (existing)

**Total Tech-Stack-Cost:** $0/mo bei <10 Operatoren, ~$20/mo bei 100 Operatoren.

---

## 11. Schluss

Das ist die **definitive Workflow-System-Spec** für Caelex. Drei Schichten:

**1. Architektur** = COE + COWF + Hash-Chain in Postgres + Vercel Cron — durable execution ohne Inngest, alles in einer DB.

**2. Aufbau** = 7 Step-Types + 24 Engines + 6 Orchestration-Sub-Engines + Verified-Profile-Foundation — strukturell deterministisch, type-safe, code-reviewed.

**3. UI** = 12 Wow-Effekt-Patterns mit Multi-Pane-Operations-Console + Force-Directed-Graphs + Live-Streaming + 3D-Universe + Hash-Chain-Animation — Palantir-Niveau, $0 Vendor-Cost, alles existing Stack.

**Implementation:** ~20-26 Wochen Engineering für volles System. Erste Pilot-Demo shippable nach 8 Wochen.

**Strategischer Win:** Caelex wird **die einzige Compliance-Plattform mit Operations-Center-Feeling**. Drata/Vanta/Anecdotes haben Dashboards. Caelex hat **Live-Operations-Reality** — Multi-Mission-View, Live-Astra-Reasoning, Hash-Chain-Animation. Das ist der Palantir-Wow-Effekt — aber für Compliance, nicht für Defense.

Anna's Quote nach Tag 0:

> _"Ich dachte ich kriege ein Compliance-Tool. Ich kriege eine Operations-Konsole für meine ganze Mission. Das ist nicht GRC — das ist Mission-Control."_

Genau das ist die Spec.

— Workflow-Master-Spec, im Auftrag des Founders
