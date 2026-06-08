# Caelex Scholar — Planspiele MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Genova-demoable vertical slice of Caelex Scholar **Planspiele** — one flagship scenario (ASI Re-entry/Debris, Italy), the Operator role played solo against an AI-NCA, four artifact-producing phases, two-track scoring (free engine grading + AI rubric with a zero-cost no-key fallback), a corpus-grounded debrief, and a thin instructor assign+view.

**Architecture:** Scholar-native, gated by the existing `getScholarAuth()`. Six additive, User-DECOUPLED `Scholar*` Prisma models + 2 enums. Scenario definitions live in code under `src/data/scholar/planspiele/`. A Planspiel _is_ a `WorkflowEngine` instance (reusing the generic `src/lib/workflow/` state machine). Track-1 grading calls the real `calculateCompliance()` engine READ-ONLY as a free deterministic answer key; Track-2 mirrors only the Anthropic _call pattern_ (env-model + no-key fallback + citation validator), never the org-bound Astra engine. The UI composes existing monochrome Scholar primitives (`ScholarPage`, `PageHeader`, `ProvisionCard`, `MetadataStrip`, `CiteExport`, `AiDisclosure`, `SCHOLAR_TYPE`). No frozen `(atlas)/(pharos)/(trade)/(comply)` files are edited; frozen engines + the Atlas corpus are imported READ-ONLY (verified safe — the pre-commit guard matches staged _file paths_, not import graphs).

**Tech Stack:** Next.js 15 (App Router, RSC + server actions), Prisma 5.22 / Neon, NextAuth v5, Zod, Vitest, Tailwind (strictly monochrome), Anthropic SDK (optional, graceful no-key fallback).

**Scope rule (every task):** new files only under `src/app/(scholar)/scholar/**`, `src/lib/scholar/**`, `src/data/scholar/**`, `prisma/schema.prisma` (additive). Strictly monochrome (gray/black/white). EN+DE+IT translated for the demo; FR/ES stubbed.

**Source spec:** `docs/superpowers/specs/2026-06-08-caelex-scholar-planspiele-concept.md`.

---

## File Structure (created / modified)

**Data layer**

- `prisma/schema.prisma` — MODIFY (append 6 models + 2 enums near the other `Scholar*` models, ~line 15236)
- `src/data/scholar/planspiele/types.ts` — CREATE (scenario/role/phase/artifact/rubric TS types)
- `src/data/scholar/planspiele/asi-reentry.ts` — CREATE (the flagship scenario)
- `src/data/scholar/planspiele/index.ts` — CREATE (registry: `getScenarioById`, `listScenarios`)
- `src/data/scholar/planspiele/scenarios.test.ts` — CREATE (integrity tests)

**Logic layer (server-only)**

- `src/lib/scholar/planspiele/sim-workflow.server.ts` — CREATE (workflow definition + builder over `WorkflowEngine`)
- `src/lib/scholar/planspiele/sim-workflow.test.ts` — CREATE
- `src/lib/scholar/planspiele/scoring.server.ts` — CREATE (Track-1 engine scorer)
- `src/lib/scholar/planspiele/scoring.test.ts` — CREATE
- `src/lib/scholar/planspiele/sim-coach.server.ts` — CREATE (Track-2 AI rubric + no-key fallback + citation validation)
- `src/lib/scholar/planspiele/sim-coach.test.ts` — CREATE
- `src/lib/scholar/planspiele/runs.server.ts` — CREATE (IDOR-safe persistence service)
- `src/lib/scholar/planspiele/runs.test.ts` — CREATE
- `src/lib/scholar/planspiele/planspiele-actions.ts` — CREATE (`'use server'` action wrappers)

**i18n**

- `src/app/(scholar)/scholar/_i18n/planspiele.ts` — CREATE (catalog/chrome namespace)
- `src/app/(scholar)/scholar/_i18n/planspiele-play.ts` — CREATE (cockpit namespace)
- `src/app/(scholar)/scholar/_i18n/nav.ts` — MODIFY (add `planspiele` key ×5 locales)

**UI**

- `src/app/(scholar)/scholar/planspiele/page.tsx` — CREATE (catalog)
- `src/app/(scholar)/scholar/planspiele/[id]/page.tsx` — CREATE (brief + role pick + start)
- `src/app/(scholar)/scholar/planspiele/[id]/run/[runId]/page.tsx` — CREATE (cockpit server shell)
- `src/app/(scholar)/scholar/planspiele/_components/Cockpit.tsx` — CREATE (`"use client"` editor + phase advance)
- `src/app/(scholar)/scholar/planspiele/_components/CorpusRail.tsx` — CREATE (server; embeds `ProvisionCard`)
- `src/app/(scholar)/scholar/planspiele/_components/PhaseProgress.tsx` — CREATE (monochrome progress bar)
- `src/app/(scholar)/scholar/planspiele/_components/ResultsPanel.tsx` — CREATE (two-track breakdown)
- `src/app/(scholar)/scholar/planspiele/[id]/run/[runId]/debrief/page.tsx` — CREATE (debrief)
- `src/app/(scholar)/scholar/planspiele/instructor/page.tsx` — CREATE (assign + submissions list)
- `src/app/(scholar)/scholar/ScholarShell.tsx` — MODIFY (append MAIN_NAV entry — LAST task)

---

## Sprint 1 — Schema foundation

**Files:**

- Modify: `prisma/schema.prisma` (append after `ScholarReadingListItem`, ~line 15236)

The models are **User-DECOUPLED** (bare `userId`/`instructorId`/`ownerUserId` strings, NO relation field on `User`) exactly like `ScholarBookmark`. Child rows (`roleAssignments`, `submissions`, `events`) relate to the **Run**, not the User — mirroring `ScholarReadingList → ScholarReadingListItem`.

- [ ] **Step 1: Append the two enums + six models to `prisma/schema.prisma`**

```prisma
// ─── Scholar Planspiele (role-play simulations) ──────────────────────
// User-DECOUPLED like the other Scholar* models (bare userId, no User relation).

enum ScholarSimMode {
  SOLO
  CLASSROOM
}

enum ScholarPlanspielRunStatus {
  briefing
  in_progress
  submitted
  under_review
  completed
  abandoned
}

model ScholarClassroom {
  id                  String   @id @default(cuid())
  instructorId        String
  organizationId      String
  name                String
  joinCode            String   @unique
  assignedScenarioIds String[]
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([instructorId, createdAt])
  @@index([organizationId])
}

model ScholarPlanspielRun {
  id           String                    @id @default(cuid())
  scenarioId   String
  classroomId  String?
  mode         ScholarSimMode            @default(SOLO)
  ownerUserId  String
  status       ScholarPlanspielRunStatus @default(briefing)
  currentPhase String
  version      Int                       @default(0)
  startedAt    DateTime                  @default(now())
  completedAt  DateTime?

  roleAssignments ScholarPlanspielRoleAssignment[]
  submissions     ScholarPlanspielSubmission[]
  events          ScholarPlanspielEvent[]

  @@index([ownerUserId, startedAt])
  @@index([classroomId])
  @@index([scenarioId])
}

model ScholarPlanspielRoleAssignment {
  id             String              @id @default(cuid())
  runId          String
  run            ScholarPlanspielRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  roleKey        String
  assignedUserId String?
  isAI           Boolean             @default(false)
  createdAt      DateTime            @default(now())

  submissions ScholarPlanspielSubmission[]

  @@unique([runId, roleKey])
  @@index([assignedUserId])
}

model ScholarPlanspielSubmission {
  id               String                         @id @default(cuid())
  runId            String
  run              ScholarPlanspielRun            @relation(fields: [runId], references: [id], onDelete: Cascade)
  roleAssignmentId String
  roleAssignment   ScholarPlanspielRoleAssignment @relation(fields: [roleAssignmentId], references: [id], onDelete: Cascade)
  phaseKey         String
  artifactType     String
  contentJson      Json
  engineScore      Float?
  engineFeedback   Json?
  aiRubricJson     Json?
  instructorScore  Float?
  instructorNote   String?
  submittedAt      DateTime                       @default(now())
  updatedAt        DateTime                       @updatedAt

  @@index([runId, phaseKey])
  @@index([roleAssignmentId])
}

model ScholarPlanspielEvent {
  id          String              @id @default(cuid())
  runId       String
  run         ScholarPlanspielRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  actorUserId String?
  kind        String
  payload     Json
  createdAt   DateTime            @default(now())

  @@index([runId, createdAt])
}

model ScholarPlanspielBadge {
  id       String   @id @default(cuid())
  userId   String
  badgeKey String
  earnedAt DateTime @default(now())
  metadata Json?

  @@unique([userId, badgeKey])
  @@index([userId, earnedAt])
}
```

- [ ] **Step 2: Validate + generate the client (no DB needed)**

Run: `npx prisma validate && npx prisma generate`
Expected: "The schema at prisma/schema.prisma is valid" + "Generated Prisma Client".

- [ ] **Step 3: Materialize the tables** _(executor/user runs against the target DB — Claude does NOT run prod DB writes)_

Run: `DATABASE_URL='<target>' npx prisma db push`
Expected: 6 tables + 2 enums created, additively (no data loss on existing Scholar tables).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(scholar): add Planspiele Prisma models (runs, roles, submissions, events, classroom, badge)"
```

---

## Sprint 2 — Scenario types + the ASI flagship + integrity tests

**Files:**

- Create: `src/data/scholar/planspiele/types.ts`
- Create: `src/data/scholar/planspiele/asi-reentry.ts`
- Create: `src/data/scholar/planspiele/index.ts`
- Test: `src/data/scholar/planspiele/scenarios.test.ts`

- [ ] **Step 1: Create `types.ts`**

```typescript
/**
 * Caelex Scholar — Planspiele scenario definition types.
 * Scenarios live in CODE (like src/data/academy/scenarios.ts); only RUNS persist.
 * All human-facing strings are i18n KEYS resolved against the planspiele-play namespace.
 */

export type ScholarRoleKey =
  | "operator"
  | "regulator"
  | "counsel"
  | "insurer"
  | "debris_stm"
  | "eu_body"
  | "ngo";

export type ScholarArtifactKind =
  | "authority_choice"
  | "application_form"
  | "cover_letter"
  | "deficiency_response";

/** A structured field on an engine-checkable artifact (P1/P2). */
export interface ScholarArtifactField {
  key: string;
  labelKey: string;
  type: "boolean" | "select" | "text";
  options?: string[];
}

export interface ScholarArtifactSpec {
  kind: ScholarArtifactKind;
  fields?: ScholarArtifactField[];
  /** cover_letter: minimum distinct provisions the student must cite. */
  minCitations?: number;
}

export interface ScholarRubricCriterion {
  key: string;
  labelKey: string;
  weight: number; // a phase's rubric weights MUST sum to 100
  track: "engine" | "ai";
}

export interface ScholarPlanspielPhase {
  phaseKey: string; // == workflow state id
  order: number;
  titleKey: string;
  briefKey: string;
  artifact: ScholarArtifactSpec;
  citedSourceIds: string[]; // surfaced in the corpus rail (resolved READ-ONLY)
  citedCaseIds: string[];
  rubric: ScholarRubricCriterion[];
  /** Which role fires the phase-advance transition (operator submits, regulator approves). */
  advanceRequiresRole: ScholarRoleKey;
}

export interface ScholarPlanspielRoleDef {
  roleKey: ScholarRoleKey;
  nameKey: string;
  goalKey: string;
  briefKey: string; // public brief
  privateBriefKey: string; // role-private info (asymmetry)
}

/** Operator profile feeding the EU Space Act engine for Track-1 grading.
 *  Mirrors src/data/academy/scenarios.ts operatorProfile shape. */
export interface ScholarOperatorProfile {
  activityType:
    | "spacecraft"
    | "launch_vehicle"
    | "launch_site"
    | "isos"
    | "data_provider";
  entitySize: "small" | "research" | "medium" | "large";
  establishment: "eu" | "third_country_eu_services" | "third_country_no_eu";
  primaryOrbit?: "LEO" | "MEO" | "GEO" | "beyond";
  operatesConstellation?: boolean;
  constellationSize?: number;
  isDefenseOnly?: boolean;
  hasPostLaunchAssets?: boolean;
  offersEUServices?: boolean;
}

export interface ScholarPlanspielScenario {
  id: string;
  titleKey: string;
  summaryKey: string;
  difficulty: "INTRO" | "INTERMEDIATE" | "ADVANCED";
  estimatedMinutes: number;
  jurisdiction: string; // ISO-ish code, e.g. "IT"
  module: string; // "debris" | "authorization" | "nis2" | ...
  roles: ScholarPlanspielRoleDef[];
  studentRole: ScholarRoleKey; // role the solo student plays
  aiRoles: ScholarRoleKey[]; // roles the AI plays in solo mode
  phases: ScholarPlanspielPhase[];
  operatorProfile: ScholarOperatorProfile;
}
```

- [ ] **Step 2: Create `asi-reentry.ts`** (the flagship — Operator vs AI-NCA, 4 phases)

> Cited corpus ids MUST exist in the frozen corpus. Before writing, the executor runs
> `grep -ri "ASI" src/data/legal-sources src/data/legal-cases` and
> `grep -rai "law 89/2025\|reentry\|re-entry\|debris" src/data/legal-sources` to pick **real**
> `LegalSource`/`LegalCase` ids (e.g. the ASI Mk-1 re-entry case + Italian Space Economy Act source).
> The integrity test (Step 4) fails if any cited id does not resolve — so placeholders cannot survive.

```typescript
import type { ScholarPlanspielScenario } from "./types";

/**
 * Flagship: "ASI Re-entry / Debris (Italy)".
 * Student = Operator filing a controlled-re-entry / disposal showing under
 * Italy's Space Economy Act (Law 89/2025); the AI plays the IT regulator (ASI/MIMIT).
 * Cited ids are REAL corpus entries — verified by scenarios.test.ts.
 */
export const ASI_REENTRY: ScholarPlanspielScenario = {
  id: "asi-reentry-it",
  titleKey: "asi.title",
  summaryKey: "asi.summary",
  difficulty: "INTERMEDIATE",
  estimatedMinutes: 35,
  jurisdiction: "IT",
  module: "debris",
  studentRole: "operator",
  aiRoles: ["regulator"],
  roles: [
    {
      roleKey: "operator",
      nameKey: "asi.role.operator.name",
      goalKey: "asi.role.operator.goal",
      briefKey: "asi.role.operator.brief",
      privateBriefKey: "asi.role.operator.private",
    },
    {
      roleKey: "regulator",
      nameKey: "asi.role.regulator.name",
      goalKey: "asi.role.regulator.goal",
      briefKey: "asi.role.regulator.brief",
      privateBriefKey: "asi.role.regulator.private",
    },
  ],
  operatorProfile: {
    activityType: "spacecraft",
    entitySize: "medium",
    establishment: "eu",
    primaryOrbit: "LEO",
    operatesConstellation: false,
    hasPostLaunchAssets: true,
    offersEUServices: true,
  },
  phases: [
    {
      phaseKey: "authority",
      order: 1,
      titleKey: "asi.p1.title",
      briefKey: "asi.p1.brief",
      advanceRequiresRole: "operator",
      artifact: {
        kind: "authority_choice",
        fields: [
          {
            key: "authority",
            labelKey: "asi.p1.authority",
            type: "select",
            options: ["ASI", "MIMIT", "ENAC", "AGCOM"],
          },
          {
            key: "justification",
            labelKey: "asi.p1.justification",
            type: "text",
          },
        ],
      },
      citedSourceIds: ["<IT_SPACE_ECONOMY_ACT_SOURCE_ID>"],
      citedCaseIds: [],
      rubric: [
        {
          key: "authority_correct",
          labelKey: "asi.p1.r.authority",
          weight: 60,
          track: "engine",
        },
        {
          key: "justification_quality",
          labelKey: "asi.p1.r.justif",
          weight: 40,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "application",
      order: 2,
      titleKey: "asi.p2.title",
      briefKey: "asi.p2.brief",
      advanceRequiresRole: "operator",
      artifact: {
        kind: "application_form",
        fields: [
          { key: "insurance", labelKey: "asi.p2.insurance", type: "boolean" },
          { key: "debrisPlan", labelKey: "asi.p2.debris", type: "boolean" },
          { key: "disposalPlan", labelKey: "asi.p2.disposal", type: "boolean" },
          { key: "cybersecurity", labelKey: "asi.p2.cyber", type: "boolean" },
          {
            key: "casualtyRisk",
            labelKey: "asi.p2.casualty",
            type: "select",
            options: ["<1e-4", "1e-4..1e-5", ">1e-5"],
          },
        ],
      },
      citedSourceIds: ["<IT_SPACE_ECONOMY_ACT_SOURCE_ID>"],
      citedCaseIds: ["<ASI_REENTRY_CASE_ID>"],
      rubric: [
        {
          key: "mandatory_modules",
          labelKey: "asi.p2.r.modules",
          weight: 70,
          track: "engine",
        },
        {
          key: "casualty_threshold",
          labelKey: "asi.p2.r.casualty",
          weight: 30,
          track: "engine",
        },
      ],
    },
    {
      phaseKey: "cover_letter",
      order: 3,
      titleKey: "asi.p3.title",
      briefKey: "asi.p3.brief",
      advanceRequiresRole: "operator",
      artifact: { kind: "cover_letter", minCitations: 2 },
      citedSourceIds: ["<IT_SPACE_ECONOMY_ACT_SOURCE_ID>"],
      citedCaseIds: ["<ASI_REENTRY_CASE_ID>"],
      rubric: [
        {
          key: "legal_basis",
          labelKey: "asi.p3.r.basis",
          weight: 40,
          track: "ai",
        },
        {
          key: "completeness",
          labelKey: "asi.p3.r.complete",
          weight: 30,
          track: "ai",
        },
        {
          key: "citation_accuracy",
          labelKey: "asi.p3.r.cites",
          weight: 30,
          track: "ai",
        },
      ],
    },
    {
      phaseKey: "deficiency",
      order: 4,
      titleKey: "asi.p4.title",
      briefKey: "asi.p4.brief",
      advanceRequiresRole: "operator",
      artifact: { kind: "deficiency_response" },
      citedSourceIds: ["<IT_SPACE_ECONOMY_ACT_SOURCE_ID>"],
      citedCaseIds: [],
      rubric: [
        {
          key: "addresses_deficiency",
          labelKey: "asi.p4.r.addresses",
          weight: 60,
          track: "ai",
        },
        {
          key: "revision_quality",
          labelKey: "asi.p4.r.quality",
          weight: 40,
          track: "ai",
        },
      ],
    },
  ],
};
```

- [ ] **Step 3: Create `index.ts` (registry)**

```typescript
import type { ScholarPlanspielScenario } from "./types";
import { ASI_REENTRY } from "./asi-reentry";

const SCENARIOS: ScholarPlanspielScenario[] = [ASI_REENTRY];

export function listScenarios(): ScholarPlanspielScenario[] {
  return SCENARIOS;
}

export function getScenarioById(id: string): ScholarPlanspielScenario | null {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}

export type { ScholarPlanspielScenario } from "./types";
```

- [ ] **Step 4: Write the failing integrity test `scenarios.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { listScenarios, getScenarioById } from "./index";
import { getLegalSourceById } from "@/data/legal-sources";
import { getCaseById } from "@/data/legal-cases";

describe("planspiele scenarios", () => {
  it("registry round-trips by id", () => {
    for (const s of listScenarios()) {
      expect(getScenarioById(s.id)?.id).toBe(s.id);
    }
  });

  it("every phase rubric sums to 100", () => {
    for (const s of listScenarios()) {
      for (const p of s.phases) {
        const sum = p.rubric.reduce((a, c) => a + c.weight, 0);
        expect(sum, `${s.id}/${p.phaseKey}`).toBe(100);
      }
    }
  });

  it("phases are 1..N contiguous and ordered", () => {
    for (const s of listScenarios()) {
      const orders = s.phases.map((p) => p.order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it("studentRole + aiRoles are all declared in roles[]", () => {
    for (const s of listScenarios()) {
      const keys = new Set(s.roles.map((r) => r.roleKey));
      expect(keys.has(s.studentRole)).toBe(true);
      for (const r of s.aiRoles) expect(keys.has(r)).toBe(true);
    }
  });

  it("every cited corpus id resolves in the frozen corpus", () => {
    for (const s of listScenarios()) {
      for (const p of s.phases) {
        for (const id of p.citedSourceIds) {
          expect(
            getLegalSourceById(id),
            `source ${id} in ${s.id}/${p.phaseKey}`,
          ).toBeTruthy();
        }
        for (const id of p.citedCaseIds) {
          expect(
            getCaseById(id),
            `case ${id} in ${s.id}/${p.phaseKey}`,
          ).toBeTruthy();
        }
      }
    }
  });
});
```

- [ ] **Step 5: Run it — expect FAIL on the corpus-resolution test** (placeholders `<...>` don't resolve)

Run: `npx vitest run src/data/scholar/planspiele/scenarios.test.ts`
Expected: FAIL on "every cited corpus id resolves".

- [ ] **Step 6: Replace the `<...>` placeholders with the REAL ids** found via the greps in Step 2, then re-run.

Run: `npx vitest run src/data/scholar/planspiele/scenarios.test.ts`
Expected: PASS (all 5 tests).

- [ ] **Step 7: Commit**

```bash
git add src/data/scholar/planspiele
git commit -m "feat(scholar): add Planspiele scenario types + ASI flagship + integrity tests"
```

---

## Sprint 3 — Workflow definition + wrapper

**Files:**

- Create: `src/lib/scholar/planspiele/sim-workflow.server.ts`
- Test: `src/lib/scholar/planspiele/sim-workflow.test.ts`

The Planspiel run is a `WorkflowEngine`. States are built from the scenario's phases (ordered) + terminal `completed`/`abandoned`. The advance transition is **guarded by role** via `requiredPermissions: [phase.advanceRequiresRole]` so only the holder of that role (human or AI) can fire it — this is what makes it a genuine role-play.

- [ ] **Step 1: Write the failing test `sim-workflow.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { buildScholarWorkflow } from "./sim-workflow.server";
import { ASI_REENTRY } from "@/data/scholar/planspiele/asi-reentry";

describe("scholar planspiel workflow", () => {
  it("initial state is the first phase", () => {
    const wf = buildScholarWorkflow(ASI_REENTRY);
    expect(wf.getDefinition().initialState).toBe("authority");
  });

  it("advance is gated to the phase's advanceRequiresRole", async () => {
    const wf = buildScholarWorkflow(ASI_REENTRY);
    // operator may advance phase 1
    const okOperator = await wf.canTransition("authority", "advance", {
      actorRole: "operator",
      phaseComplete: true,
    });
    expect(okOperator).toBe(true);
    // a non-operator may not
    const okOther = await wf.canTransition("authority", "advance", {
      actorRole: "regulator",
      phaseComplete: true,
    });
    expect(okOther).toBe(false);
  });

  it("cannot advance until the phase artifact is complete", async () => {
    const wf = buildScholarWorkflow(ASI_REENTRY);
    const blocked = await wf.canTransition("authority", "advance", {
      actorRole: "operator",
      phaseComplete: false,
    });
    expect(blocked).toBe(false);
  });

  it("last phase advances into the terminal completed state", () => {
    const wf = buildScholarWorkflow(ASI_REENTRY);
    expect(wf.isTerminalState("completed")).toBe(true);
    expect(wf.getNextStates("deficiency")).toContain("completed");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`buildScholarWorkflow` undefined)

Run: `npx vitest run src/lib/scholar/planspiele/sim-workflow.test.ts`
Expected: FAIL "buildScholarWorkflow is not a function".

- [ ] **Step 3: Implement `sim-workflow.server.ts`**

```typescript
import "server-only";
import {
  createWorkflowEngine,
  createTransition,
  type WorkflowEngine,
} from "@/lib/workflow/engine";
import type { WorkflowDefinition, StateDefinition } from "@/lib/workflow/types";
import type { ScholarPlanspielScenario } from "@/data/scholar/planspiele/types";

/** Runtime context the guards evaluate. */
export interface ScholarSimContext {
  actorRole: string; // role firing the transition
  phaseComplete: boolean; // all mandatory artifacts present for the current phase
  [k: string]: unknown;
}

const TERMINAL = "completed";
const ABANDONED = "abandoned";

export function buildScholarWorkflow(
  scenario: ScholarPlanspielScenario,
): WorkflowEngine<ScholarSimContext> {
  const phases = [...scenario.phases].sort((a, b) => a.order - b.order);
  const states: Record<string, StateDefinition<ScholarSimContext>> = {};

  phases.forEach((phase, i) => {
    const next = i + 1 < phases.length ? phases[i + 1].phaseKey : TERMINAL;
    states[phase.phaseKey] = {
      name: phase.phaseKey,
      metadata: { phase: phase.phaseKey }, // NO color/icon — monochrome
      transitions: {
        advance: createTransition<ScholarSimContext>(next, {
          description: `Advance to ${next}`,
          requiredPermissions: [phase.advanceRequiresRole],
          guard: async (ctx) =>
            ctx.phaseComplete === true &&
            ctx.actorRole === phase.advanceRequiresRole,
        }),
        abandon: createTransition<ScholarSimContext>(ABANDONED, {
          description: "Abandon the run",
        }),
      },
    };
  });

  states[TERMINAL] = {
    name: TERMINAL,
    metadata: { isTerminal: true },
    transitions: {},
  };
  states[ABANDONED] = {
    name: ABANDONED,
    metadata: { isTerminal: true },
    transitions: {},
  };

  const definition: WorkflowDefinition<ScholarSimContext> = {
    id: `scholar-planspiel-${scenario.id}`,
    name: scenario.id,
    version: "1.0.0",
    initialState: phases[0].phaseKey,
    states,
  };

  return createWorkflowEngine<ScholarSimContext>(definition);
}
```

> NOTE on `canTransition` vs `requiredPermissions`: confirm during implementation whether the
> engine's `canTransition()` evaluates `guard` only, or also enforces `requiredPermissions`.
> The test asserts role-gating works through `canTransition`. If the engine checks ONLY `guard`,
> the guard above already enforces `actorRole === advanceRequiresRole`, so the test passes
> regardless — `requiredPermissions` is then belt-and-suspenders for any UI that reads available
> transitions. Do not remove the guard's role check.

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/lib/scholar/planspiele/sim-workflow.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scholar/planspiele/sim-workflow.server.ts src/lib/scholar/planspiele/sim-workflow.test.ts
git commit -m "feat(scholar): Planspiele workflow builder (role-gated phase advance over WorkflowEngine)"
```

---

## Sprint 4 — Scoring: Track 1 (engine) + Track 2 (sim-coach, no-key fallback)

**Files:**

- Create: `src/lib/scholar/planspiele/scoring.server.ts`
- Test: `src/lib/scholar/planspiele/scoring.test.ts`
- Create: `src/lib/scholar/planspiele/sim-coach.server.ts`
- Test: `src/lib/scholar/planspiele/sim-coach.test.ts`

### 4A — Track-1 engine scorer

Shared feedback shape (both tracks emit it; the UI renders it monochrome):

```typescript
export interface RubricLine {
  category: string; // criterion.key
  weight: number;
  earned: number; // 0..weight
  correct: boolean;
  note: string; // i18n-key OR literal note
}
```

- [ ] **Step 1: Write the failing test `scoring.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { scorePhaseEngine } from "./scoring.server";
import { ASI_REENTRY } from "@/data/scholar/planspiele/asi-reentry";

const phase1 = ASI_REENTRY.phases.find((p) => p.phaseKey === "authority")!;
const phase2 = ASI_REENTRY.phases.find((p) => p.phaseKey === "application")!;

describe("Track-1 engine scoring", () => {
  it("awards the authority_correct weight when the right authority is chosen", () => {
    const lines = scorePhaseEngine(ASI_REENTRY, phase1, {
      authority: "ASI",
      justification: "x",
    });
    const authority = lines.find((l) => l.category === "authority_correct")!;
    expect(authority.earned).toBe(authority.weight);
    expect(authority.correct).toBe(true);
  });

  it("awards zero for the wrong authority", () => {
    const lines = scorePhaseEngine(ASI_REENTRY, phase1, {
      authority: "AGCOM",
      justification: "x",
    });
    const authority = lines.find((l) => l.category === "authority_correct")!;
    expect(authority.earned).toBe(0);
    expect(authority.correct).toBe(false);
  });

  it("gives partial credit for a partially-complete application", () => {
    const lines = scorePhaseEngine(ASI_REENTRY, phase2, {
      insurance: true,
      debrisPlan: true,
      disposalPlan: false,
      cybersecurity: false,
      casualtyRisk: "<1e-4",
    });
    const modules = lines.find((l) => l.category === "mandatory_modules")!;
    expect(modules.earned).toBeGreaterThan(0);
    expect(modules.earned).toBeLessThan(modules.weight);
  });

  it("only scores criteria whose track === 'engine'", () => {
    const lines = scorePhaseEngine(ASI_REENTRY, phase1, {
      authority: "ASI",
      justification: "x",
    });
    expect(
      lines.every(
        (l) =>
          phase1.rubric.find((r) => r.key === l.category)?.track === "engine",
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`scorePhaseEngine` undefined)

Run: `npx vitest run src/lib/scholar/planspiele/scoring.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `scoring.server.ts`**

> Track-1 calls the real engine READ-ONLY as the answer key. For the MVP's two engine-graded
> criteria (`authority_correct`, `mandatory_modules`, `casualty_threshold`) the scorer maps the
> structured artifact fields to a verdict; where a criterion needs the full compliance verdict, it
> calls `calculateCompliance(answers, loadSpaceActDataFromDisk())` and inspects `result.modules`.
> Keep the engine import server-only.

```typescript
import "server-only";
import type {
  ScholarPlanspielScenario,
  ScholarPlanspielPhase,
} from "@/data/scholar/planspiele/types";

export interface RubricLine {
  category: string;
  weight: number;
  earned: number;
  correct: boolean;
  note: string;
}

/** The model answer key for the ASI flagship (kept beside the scenario; expand per scenario). */
const ANSWER_KEY: Record<string, Record<string, unknown>> = {
  "asi-reentry-it": {
    authority: "ASI",
    mandatoryModules: ["insurance", "debrisPlan", "disposalPlan"],
    casualtyRisk: "<1e-4",
  },
};

export function scorePhaseEngine(
  scenario: ScholarPlanspielScenario,
  phase: ScholarPlanspielPhase,
  answer: Record<string, unknown>,
): RubricLine[] {
  const key = ANSWER_KEY[scenario.id] ?? {};
  const lines: RubricLine[] = [];

  for (const crit of phase.rubric) {
    if (crit.track !== "engine") continue;

    if (crit.key === "authority_correct") {
      const correct = answer.authority === key.authority;
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned: correct ? crit.weight : 0,
        correct,
        note: correct ? "asi.fb.authority.ok" : "asi.fb.authority.wrong",
      });
    } else if (crit.key === "mandatory_modules") {
      const required = (key.mandatoryModules as string[]) ?? [];
      const present = required.filter((m) => answer[m] === true).length;
      const ratio = required.length ? present / required.length : 0;
      const earned = Math.round(ratio * crit.weight);
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned,
        correct: present === required.length,
        note:
          present === required.length
            ? "asi.fb.modules.ok"
            : "asi.fb.modules.partial",
      });
    } else if (crit.key === "casualty_threshold") {
      const correct = answer.casualtyRisk === key.casualtyRisk;
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned: correct ? crit.weight : 0,
        correct,
        note: correct ? "asi.fb.casualty.ok" : "asi.fb.casualty.wrong",
      });
    } else {
      lines.push({
        category: crit.key,
        weight: crit.weight,
        earned: 0,
        correct: false,
        note: "",
      });
    }
  }
  return lines;
}

/** Optional deeper verdict: run the real engine for a structured application and return its modules.
 *  Used by the cockpit's live "completeness" readout (READ-ONLY). */
export async function engineComplianceForProfile(
  scenario: ScholarPlanspielScenario,
) {
  const { calculateCompliance, loadSpaceActDataFromDisk } =
    await import("@/lib/engine.server");
  // Map ScholarOperatorProfile → AssessmentAnswers shape expected by the engine.
  // (Implement the field mapping mirroring src/data/academy/scenarios.ts operatorProfile usage
  //  in src/app/api/academy/simulations/run/route.ts.)
  const answers = mapProfileToAnswers(scenario.operatorProfile);
  return calculateCompliance(answers, loadSpaceActDataFromDisk());
}

function mapProfileToAnswers(
  profile: ScholarPlanspielScenario["operatorProfile"],
) {
  // Minimal mapping; mirror the academy route's profile→answers translation exactly.
  return {
    activityType: profile.activityType,
    entitySize: profile.entitySize,
    establishment: profile.establishment,
    primaryOrbit: profile.primaryOrbit,
    operatesConstellation: profile.operatesConstellation ?? false,
    constellationSize: profile.constellationSize ?? 0,
    isDefenseOnly: profile.isDefenseOnly ?? false,
    hasPostLaunchAssets: profile.hasPostLaunchAssets ?? false,
    offersEUServices: profile.offersEUServices ?? false,
  } as unknown as import("@/lib/types").AssessmentAnswers;
}
```

> During implementation, open `src/app/api/academy/simulations/run/route.ts` and copy the EXACT
> profile→answers field mapping it already uses, so `mapProfileToAnswers` matches the engine's
> real input contract. The unit tests above do NOT exercise the engine path (they test the pure
> answer-key scorer), so they pass without a DB; `engineComplianceForProfile` is covered by the
> cockpit integration in Sprint 8.

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/lib/scholar/planspiele/scoring.test.ts`
Expected: PASS (4 tests).

### 4B — Track-2 sim-coach (no-key fallback)

- [ ] **Step 5: Write the failing test `sim-coach.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { coachReviewArtifact } from "./sim-coach.server";
import { ASI_REENTRY } from "@/data/scholar/planspiele/asi-reentry";

const phase3 = ASI_REENTRY.phases.find((p) => p.phaseKey === "cover_letter")!;

describe("Track-2 sim-coach no-key fallback", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("with NO api key, returns a deterministic rubric-checklist (zero external cost)", async () => {
    const out = await coachReviewArtifact({
      scenario: ASI_REENTRY,
      phase: phase3,
      artifactText: "We rely on Law 89/2025 and the ASI re-entry note.",
    });
    expect(out.mode).toBe("fallback");
    // one line per ai-track criterion
    const aiCrit = phase3.rubric.filter((r) => r.track === "ai");
    expect(out.lines).toHaveLength(aiCrit.length);
    expect(out.lines.every((l) => typeof l.earned === "number")).toBe(true);
  });

  it("fallback flags too-few citations on a cover_letter", async () => {
    const out = await coachReviewArtifact({
      scenario: ASI_REENTRY,
      phase: phase3,
      artifactText: "No citations here.",
    });
    const cites = out.lines.find((l) => l.category === "citation_accuracy")!;
    expect(cites.correct).toBe(false);
  });
});
```

- [ ] **Step 6: Run — expect FAIL**

Run: `npx vitest run src/lib/scholar/planspiele/sim-coach.test.ts`
Expected: FAIL.

- [ ] **Step 7: Implement `sim-coach.server.ts`** (mirror ONLY the Anthropic call pattern; never `AstraEngine`/`buildCompleteContext`)

```typescript
import "server-only";
import type {
  ScholarPlanspielScenario,
  ScholarPlanspielPhase,
} from "@/data/scholar/planspiele/types";
import type { RubricLine } from "./scoring.server";

export interface CoachInput {
  scenario: ScholarPlanspielScenario;
  phase: ScholarPlanspielPhase;
  artifactText: string;
}
export interface CoachOutput {
  mode: "ai" | "fallback";
  lines: RubricLine[];
  summary: string;
}

const MODEL = process.env.SCHOLAR_COACH_MODEL ?? "claude-sonnet-4-6";

/** Count distinct provision-like citations in free text (Art. N, § N, "Law 89/2025"). */
function countCitations(text: string): number {
  const matches =
    text.match(/\b(art\.?|article|§|law)\s*[\dA-Za-z/.-]+/gi) ?? [];
  return new Set(matches.map((m) => m.toLowerCase().replace(/\s+/g, " "))).size;
}

/** Deterministic, zero-cost rubric checklist used when no ANTHROPIC_API_KEY is present. */
function fallbackReview(input: CoachInput): CoachOutput {
  const { phase, artifactText } = input;
  const aiCrit = phase.rubric.filter((r) => r.track === "ai");
  const wordCount = artifactText.trim().split(/\s+/).filter(Boolean).length;
  const citations = countCitations(artifactText);
  const minCites = phase.artifact.minCitations ?? 0;

  const lines: RubricLine[] = aiCrit.map((crit) => {
    if (crit.key === "citation_accuracy") {
      const correct = citations >= Math.max(1, minCites);
      return {
        category: crit.key,
        weight: crit.weight,
        earned: correct ? crit.weight : 0,
        correct,
        note: correct ? "coach.cites.ok" : "coach.cites.few",
      };
    }
    // Length-proportional provisional credit (self-assessment prompt shown in UI).
    const ratio = Math.min(1, wordCount / 120);
    return {
      category: crit.key,
      weight: crit.weight,
      earned: Math.round(ratio * crit.weight * 0.7),
      correct: false,
      note: "coach.selfassess",
    };
  });

  return { mode: "fallback", lines, summary: "coach.fallback.summary" };
}

export async function coachReviewArtifact(
  input: CoachInput,
): Promise<CoachOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackReview(input);

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const sys = buildScenarioScopedPrompt(input); // scenario facts + Atlas static knowledge ONLY
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: sys,
      messages: [{ role: "user", content: rubricUserPrompt(input) }],
    });
    const parsed = parseCoachJson(res, input); // robust JSON parse → RubricLine[]; on failure → fallback
    if (!parsed) return fallbackReview(input);
    // Validate every cited reference the AI emitted against the corpus before it reaches the student.
    return validateCoachCitations(parsed, input);
  } catch {
    return fallbackReview(input); // any error → graceful zero-cost path
  }
}

// --- helpers (implement during this step) ---
function buildScenarioScopedPrompt(input: CoachInput): string {
  // Scenario summary + the phase brief + the rubric criteria. NO org context, NO tool-executor.
  const crit = input.phase.rubric
    .filter((r) => r.track === "ai")
    .map((r) => `- ${r.key} (weight ${r.weight})`)
    .join("\n");
  return [
    "You are a legal-education coach grading a student's drafted artifact in a space-law role-play.",
    "Grade ONLY against the rubric criteria below. Cite only real provisions; never invent a regime.",
    "Return STRICT JSON: { lines: [{category, weight, earned, correct, note}], summary }.",
    `Scenario: ${input.scenario.id} (${input.scenario.jurisdiction}).`,
    `Phase: ${input.phase.phaseKey}.`,
    `Rubric:\n${crit}`,
  ].join("\n");
}
function rubricUserPrompt(input: CoachInput): string {
  return `Student artifact:\n"""\n${input.artifactText.slice(0, 8000)}\n"""`;
}
function parseCoachJson(res: unknown, input: CoachInput): CoachOutput | null {
  try {
    const text = (res as { content: { type: string; text?: string }[] }).content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const json = JSON.parse(
      text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
    );
    if (!Array.isArray(json.lines)) return null;
    return {
      mode: "ai",
      lines: json.lines as RubricLine[],
      summary: String(json.summary ?? ""),
    };
  } catch {
    return null;
  }
}
function validateCoachCitations(
  out: CoachOutput,
  _input: CoachInput,
): CoachOutput {
  // MVP: keep the AI output; defer wiring the corpus citation-validator until Sprint 8 integration.
  // (When wired, import the existing validateCitations() and demote any line citing an
  //  unresolved reference to correct:false with note "coach.cites.unverified".)
  return out;
}
```

- [ ] **Step 8: Run — expect PASS**

Run: `npx vitest run src/lib/scholar/planspiele/sim-coach.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/scholar/planspiele/scoring.server.ts src/lib/scholar/planspiele/scoring.test.ts src/lib/scholar/planspiele/sim-coach.server.ts src/lib/scholar/planspiele/sim-coach.test.ts
git commit -m "feat(scholar): Planspiele two-track scoring (engine answer-key + sim-coach no-key fallback)"
```

---

## Sprint 5 — Persistence service + actions (IDOR-safe)

**Files:**

- Create: `src/lib/scholar/planspiele/runs.server.ts`
- Test: `src/lib/scholar/planspiele/runs.test.ts`
- Create: `src/lib/scholar/planspiele/planspiele-actions.ts`

Mirror `saved-items.server.ts` EXACTLY: ownership via `findFirst {id, ownerUserId}` before any child mutation; `updateMany/deleteMany where {id, ownerUserId}` (no-match → count 0 → false, no throw); per-user caps; corpus-resolved refs drop dead ids.

- [ ] **Step 1: Write the failing test `runs.test.ts`** (pure-logic guards; prisma mocked)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  run: {
    create: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  role: { create: vi.fn() },
  sub: { upsert: vi.fn() },
  event: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    scholarPlanspielRun: m.run,
    scholarPlanspielRoleAssignment: m.role,
    scholarPlanspielSubmission: m.sub,
    scholarPlanspielEvent: m.event,
  },
}));

import { getRunForUser, submitArtifact } from "./runs.server";

beforeEach(() =>
  Object.values(m).forEach((g) =>
    Object.values(g).forEach((f) => f.mockReset()),
  ),
);

describe("runs IDOR safety", () => {
  it("getRunForUser returns null for a run owned by another user", async () => {
    m.run.findFirst.mockResolvedValue(null); // findFirst {id, ownerUserId} misses
    const out = await getRunForUser("user-A", "run-owned-by-B");
    expect(out).toBeNull();
    expect(m.run.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "run-owned-by-B",
          ownerUserId: "user-A",
        }),
      }),
    );
  });

  it("submitArtifact refuses when the caller does not own the run", async () => {
    m.run.findFirst.mockResolvedValue(null);
    const ok = await submitArtifact("user-A", "run-B", "role-1", "authority", {
      authority: "ASI",
    });
    expect(ok).toBe(false);
    expect(m.sub.upsert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/lib/scholar/planspiele/runs.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `runs.server.ts`** (key functions below; mirror saved-items idioms)

```typescript
import "server-only";
import { prisma } from "@/lib/prisma";
import { getScenarioById } from "@/data/scholar/planspiele/index";

const MAX_RUNS_PER_USER = 500;

export interface RunSummary {
  id: string;
  scenarioId: string;
  status: string;
  currentPhase: string;
  mode: string;
  startedAt: Date;
  completedAt: Date | null;
}

/** Create a SOLO run: owner = student role, AI holds the scenario's aiRoles. */
export async function createSoloRun(
  userId: string,
  scenarioId: string,
): Promise<{ id: string } | null> {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) return null;
  const count = await prisma.scholarPlanspielRun.count({
    where: { ownerUserId: userId },
  });
  if (count >= MAX_RUNS_PER_USER) return null;

  const run = await prisma.scholarPlanspielRun.create({
    data: {
      scenarioId,
      mode: "SOLO",
      ownerUserId: userId,
      status: "in_progress",
      currentPhase: scenario.phases[0].phaseKey,
      version: 0,
      roleAssignments: {
        create: scenario.roles.map((r) => ({
          roleKey: r.roleKey,
          assignedUserId: r.roleKey === scenario.studentRole ? userId : null,
          isAI: scenario.aiRoles.includes(r.roleKey),
        })),
      },
      events: {
        create: [
          {
            kind: "ROLE_ASSIGNED",
            actorUserId: userId,
            payload: { scenarioId },
          },
        ],
      },
    },
    select: { id: true },
  });
  return run;
}

/** Ownership-gated read (mirrors getReadingList). */
export async function getRunForUser(userId: string, runId: string) {
  return prisma.scholarPlanspielRun.findFirst({
    where: { id: runId, ownerUserId: userId },
    include: {
      roleAssignments: true,
      submissions: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listRunsForUser(userId: string): Promise<RunSummary[]> {
  const runs = await prisma.scholarPlanspielRun.findMany({
    where: { ownerUserId: userId },
    orderBy: { startedAt: "desc" },
    take: 200,
    select: {
      id: true,
      scenarioId: true,
      status: true,
      currentPhase: true,
      mode: true,
      startedAt: true,
      completedAt: true,
    },
  });
  return runs;
}

/** Ownership gate FIRST, then upsert the submission (mirrors addToReadingList). */
export async function submitArtifact(
  userId: string,
  runId: string,
  roleAssignmentId: string,
  phaseKey: string,
  content: unknown,
): Promise<boolean> {
  const owned = await prisma.scholarPlanspielRun.findFirst({
    where: { id: runId, ownerUserId: userId },
    select: { id: true },
  });
  if (!owned) return false;

  await prisma.scholarPlanspielSubmission.upsert({
    where: {
      /* composite — see note */ id: `${runId}:${phaseKey}:${roleAssignmentId}`,
    },
    update: { contentJson: content as object },
    create: {
      runId,
      roleAssignmentId,
      phaseKey,
      artifactType: phaseKey,
      contentJson: content as object,
    },
  });
  await prisma.scholarPlanspielEvent.create({
    data: {
      runId,
      actorUserId: userId,
      kind: "SUBMISSION",
      payload: { phaseKey },
    },
  });
  return true;
}

/** Optimistic-locked phase advance (mirrors the workflow version field). */
export async function advancePhase(
  userId: string,
  runId: string,
  toPhase: string,
  expectedVersion: number,
  completed: boolean,
): Promise<boolean> {
  const res = await prisma.scholarPlanspielRun.updateMany({
    where: { id: runId, ownerUserId: userId, version: expectedVersion },
    data: {
      currentPhase: toPhase,
      version: { increment: 1 },
      ...(completed ? { status: "completed", completedAt: new Date() } : {}),
    },
  });
  if (res.count === 0) return false;
  await prisma.scholarPlanspielEvent.create({
    data: {
      runId,
      actorUserId: userId,
      kind: "PHASE_ADVANCED",
      payload: { toPhase },
    },
  });
  return true;
}
```

> NOTE on the submission upsert key: add a `@@unique([runId, phaseKey, roleAssignmentId])` to
> `ScholarPlanspielSubmission` in `schema.prisma` (Sprint 1 already indexed `[runId, phaseKey]`;
> change that to a `@@unique` OR add the composite unique) so the upsert `where` targets it. If you
> prefer not to touch Sprint-1 schema, replace the upsert with a findFirst-then-create/update pair
> (still ownership-gated). Pick one and keep the test green. The `advancePhase` step uses
> `new Date()` server-side — fine (this is server-only runtime code, not a workflow script).

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/lib/scholar/planspiele/runs.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `planspiele-actions.ts`** (`'use server'`; mirror `saved-items-actions.ts` exactly)

```typescript
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getScholarAuth } from "@/lib/scholar/scholar-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { createSoloRun, submitArtifact, advancePhase } from "./runs.server";

async function gate(): Promise<string | null> {
  const ctx = await getScholarAuth();
  if (!ctx) return null;
  const rl = await checkRateLimit("scholar", `scholar-sim:${ctx.userId}`);
  return rl.success ? ctx.userId : null;
}

const ScenarioId = z.string().min(1).max(64);
const RunId = z.string().min(1).max(64);

export async function startSoloRunAction(
  scenarioId: string,
): Promise<{ ok: boolean; runId?: string }> {
  const userId = await gate();
  if (!userId) return { ok: false };
  if (!ScenarioId.safeParse(scenarioId).success) return { ok: false };
  const run = await createSoloRun(userId, scenarioId);
  if (!run) return { ok: false };
  revalidatePath("/scholar/planspiele");
  return { ok: true, runId: run.id };
}

export async function submitArtifactAction(
  runId: string,
  roleAssignmentId: string,
  phaseKey: string,
  content: unknown,
): Promise<{ ok: boolean }> {
  const userId = await gate();
  if (!userId) return { ok: false };
  if (!RunId.safeParse(runId).success) return { ok: false };
  const ok = await submitArtifact(
    userId,
    runId,
    roleAssignmentId,
    phaseKey,
    content,
  );
  if (ok) revalidatePath(`/scholar/planspiele/${"_"}/run/${runId}`);
  return { ok };
}

export async function advancePhaseAction(
  runId: string,
  toPhase: string,
  expectedVersion: number,
  completed: boolean,
): Promise<{ ok: boolean }> {
  const userId = await gate();
  if (!userId) return { ok: false };
  if (!RunId.safeParse(runId).success) return { ok: false };
  const ok = await advancePhase(
    userId,
    runId,
    toPhase,
    expectedVersion,
    completed,
  );
  if (ok) revalidatePath(`/scholar/planspiele`);
  return { ok };
}
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit` → Expected: no NEW errors in `src/lib/scholar/planspiele/**`.

```bash
git add src/lib/scholar/planspiele/runs.server.ts src/lib/scholar/planspiele/runs.test.ts src/lib/scholar/planspiele/planspiele-actions.ts
git commit -m "feat(scholar): Planspiele IDOR-safe run persistence + server actions"
```

---

## Sprint 6 — i18n namespaces

**Files:**

- Create: `src/app/(scholar)/scholar/_i18n/planspiele.ts` (catalog/chrome)
- Create: `src/app/(scholar)/scholar/_i18n/planspiele-play.ts` (cockpit + ASI scenario strings + coach/feedback keys)
- Modify: `src/app/(scholar)/scholar/_i18n/nav.ts` (add `planspiele` key ×5)

Both namespaces use `as const satisfies ScholarNamespace` with **all five locales**. EN+DE+IT fully written; FR+ES may copy EN for the MVP (the `t()` fallback already covers missing keys, but providing the FR/ES objects keeps the `satisfies` shape valid).

- [ ] **Step 1: Create `planspiele.ts`** (catalog chrome). Keys (EN shown; provide de/it full, fr/es = EN copy):

```typescript
import type { ScholarNamespace } from "./core";
export const PLANSPIELE = {
  en: {
    pageTitle: "Planspiele",
    pageSubtitle: "Work real space-law scenarios in role — like in practice.",
    eyebrow: "Practice",
    startCta: "Take the role & start",
    difficultyIntro: "Intro",
    difficultyIntermediate: "Intermediate",
    difficultyAdvanced: "Advanced",
    minutes: "min",
    roleLabel: "Your role",
    attemptsLabel: "Past attempts",
    fictionContractTitle: "Before you start",
    fictionContract:
      "This is a safe-to-fail exercise. Mistakes are the lesson and are only surfaced in the debrief.",
    empty: "No scenarios available yet.",
    instructorLink: "Instructor view",
  },
  de: {
    pageTitle: "Planspiele",
    pageSubtitle:
      "Echte weltraumrechtliche Szenarien in einer Rolle bearbeiten — wie in der Praxis.",
    eyebrow: "Praxis",
    startCta: "Rolle übernehmen & starten",
    difficultyIntro: "Einstieg",
    difficultyIntermediate: "Fortgeschritten",
    difficultyAdvanced: "Anspruchsvoll",
    minutes: "Min.",
    roleLabel: "Deine Rolle",
    attemptsLabel: "Bisherige Versuche",
    fictionContractTitle: "Bevor du startest",
    fictionContract:
      "Dies ist eine geschützte Übung. Fehler sind Teil des Lernens und werden nur im Debrief besprochen.",
    empty: "Noch keine Szenarien verfügbar.",
    instructorLink: "Dozenten-Ansicht",
  },
  it: {
    pageTitle: "Simulazioni",
    pageSubtitle:
      "Affronta scenari reali di diritto spaziale in un ruolo — come nella pratica.",
    eyebrow: "Pratica",
    startCta: "Assumi il ruolo e inizia",
    difficultyIntro: "Base",
    difficultyIntermediate: "Intermedio",
    difficultyAdvanced: "Avanzato",
    minutes: "min",
    roleLabel: "Il tuo ruolo",
    attemptsLabel: "Tentativi precedenti",
    fictionContractTitle: "Prima di iniziare",
    fictionContract:
      "È un'esercitazione sicura. Gli errori fanno parte dell'apprendimento e si discutono solo nel debriefing.",
    empty: "Nessuno scenario disponibile.",
    instructorLink: "Vista docente",
  },
  fr: {
    /* copy en for MVP */
  } as never,
  es: {
    /* copy en for MVP */
  } as never,
} as const satisfies ScholarNamespace;
```

> For `fr`/`es`: paste the `en` object verbatim (do NOT use `as never` — that breaks `satisfies`;
> the `as never` above is only a placeholder marker). The shape must match `en` exactly.

- [ ] **Step 2: Create `planspiele-play.ts`** — all cockpit UI strings + the ASI scenario keys (every `*Key` referenced in `asi-reentry.ts`: `asi.title`, `asi.summary`, `asi.role.*`, `asi.p1..p4.*`, `asi.p*.r.*`, `asi.fb.*`) + coach keys (`coach.cites.ok/few/unverified`, `coach.selfassess`, `coach.fallback.summary`) + cockpit chrome (`phaseOf`, `submit`, `advance`, `corpusRail`, `score`, `modelAnswer`, `debrief`, `reflection`, etc.). EN+DE+IT full.

> This is the largest single i18n file. Write EN first, then DE + IT. Every key referenced anywhere
> in `asi-reentry.ts`, `scoring.server.ts` notes, and `sim-coach.server.ts` notes MUST exist here.
> A missing key renders as the raw key (the `t()` fallback) — visible in the demo, so be exhaustive.

- [ ] **Step 3: Modify `nav.ts`** — add `planspiele: "..."` to each of en/de/it/fr/es:
  - en: `planspiele: "Planspiele"` · de: `planspiele: "Planspiele"` · it: `planspiele: "Simulazioni"` · fr: `planspiele: "Simulations"` · es: `planspiele: "Simulaciones"`

- [ ] **Step 4: Typecheck (catches any `satisfies` shape mismatch) + commit**

Run: `npx tsc --noEmit` → Expected: no errors in `_i18n/**`.

```bash
git add "src/app/(scholar)/scholar/_i18n/planspiele.ts" "src/app/(scholar)/scholar/_i18n/planspiele-play.ts" "src/app/(scholar)/scholar/_i18n/nav.ts"
git commit -m "feat(scholar): Planspiele i18n namespaces (EN/DE/IT full, FR/ES stub) + nav key"
```

---

## Sprint 7 — UI: catalog + brief/role-pick

**Files:**

- Create: `src/app/(scholar)/scholar/planspiele/page.tsx` (catalog)
- Create: `src/app/(scholar)/scholar/planspiele/[id]/page.tsx` (brief + role pick + start)

Both are RSC. Compose `ScholarPage` + `PageHeader` + `MetadataStrip` + `AiDisclosure`. Card rows mirror the `SourceRow` visual pattern (see `src/app/(scholar)/scholar/_components/SourceRow.tsx`). Monochrome only.

- [ ] **Step 1: Catalog `page.tsx`** — `export const dynamic = "force-dynamic"; export const runtime = "nodejs";`. Server: `auth()` → `getScholarLocale(userId)` → `listScenarios()` + `listRunsForUser(userId)`. Render header (`t(locale, PLANSPIELE, "pageTitle"/"pageSubtitle")`), one card per scenario (title via `t(locale, PLANSPIELE_PLAY, scenario.titleKey)`, difficulty/minutes/role eyebrows, attempts count), and a quiet link to `/scholar/planspiele/instructor`. Reuse the footer block from `lists/[id]/page.tsx:147-159`.

- [ ] **Step 2: Brief `[id]/page.tsx`** — `await params` (Next 15). `getScenarioById(id)` → `notFound()` if null. Render the public brief (`MetadataStrip` for the operator profile facts), the role list, the **fiction-contract** block (`PLANSPIELE.fictionContractTitle`/`fictionContract`), and a client "start" button calling `startSoloRunAction(id)` then `router.push('/scholar/planspiele/'+id+'/run/'+runId)`. Add `<AiDisclosure label=... text=... />` noting AI plays the counterpart role.

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit`

```bash
git add "src/app/(scholar)/scholar/planspiele/page.tsx" "src/app/(scholar)/scholar/planspiele/[id]/page.tsx"
git commit -m "feat(scholar): Planspiele catalog + brief/role-pick pages"
```

---

## Sprint 8 — UI: the cockpit (run)

**Files:**

- Create: `src/app/(scholar)/scholar/planspiele/[id]/run/[runId]/page.tsx` (server shell)
- Create: `src/app/(scholar)/scholar/planspiele/_components/Cockpit.tsx` (`"use client"`)
- Create: `src/app/(scholar)/scholar/planspiele/_components/CorpusRail.tsx` (server)
- Create: `src/app/(scholar)/scholar/planspiele/_components/PhaseProgress.tsx`

RSC→Client discipline (mirror `SettingsTabs`): the server page fetches the run (`getRunForUser`, `notFound()` on null — this is the IDOR gate) + scenario, renders the **CorpusRail** (server, embeds `ProvisionCard` per `phase.citedSourceIds` resolved READ-ONLY) as a `ReactNode`, and passes it + server actions as props into the client `Cockpit`.

- [ ] **Step 1: `CorpusRail.tsx`** (server) — for the current phase, map `citedSourceIds` → `getLegalSourceById` and render a `<ProvisionCard>` per source (pass `locale`); map `citedCaseIds` → a link to `/scholar/cases/{id}`. Collapsible `<details>` wrapper, monochrome.

- [ ] **Step 2: `PhaseProgress.tsx`** — a sticky monochrome bar: N segments, filled (gray-900) up to `currentPhase.order`, the rest gray-200. Uses `SCHOLAR_TYPE.meta` for the "Phase i of N" label. NO color.

- [ ] **Step 3: `Cockpit.tsx`** (`"use client"`) — props: `{ scenarioJson, run, corpusRail: ReactNode, submitAction, advanceAction }`. Renders the split view: left = the phase artifact editor switched on `phase.artifact.kind` (`authority_choice` → select + textarea; `application_form` → toggles + select; `cover_letter` → textarea + a `CiteExport`-style hint + live citation count; `deficiency_response` → shows the AI-NCA deficiency note + a revise textarea); right = `{corpusRail}`. "Phase abschließen" calls `submitAction` then `advanceAction(runId, nextPhase, version, isLast)`; on the last phase routes to `.../run/[runId]/results` (or reveals the `ResultsPanel` inline). Pass server actions as props — never plain functions.

- [ ] **Step 4: Server shell `page.tsx`** — `await params`; `auth()`; `getRunForUser(userId, runId)` → `notFound()` if null; `getScenarioById(run.scenarioId)`; build `<CorpusRail … />`; render `<Cockpit scenarioJson={…} run={…} corpusRail={<CorpusRail/>} submitAction={submitArtifactAction} advanceAction={advancePhaseAction} />`. `<AiDisclosure>` in the footer.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit`

```bash
git add "src/app/(scholar)/scholar/planspiele/[id]/run" "src/app/(scholar)/scholar/planspiele/_components"
git commit -m "feat(scholar): Planspiele cockpit (split editor + corpus rail + guarded phase advance)"
```

---

## Sprint 9 — UI: results + debrief

**Files:**

- Create: `src/app/(scholar)/scholar/planspiele/_components/ResultsPanel.tsx`
- Create: `src/app/(scholar)/scholar/planspiele/[id]/run/[runId]/debrief/page.tsx`

- [ ] **Step 1: `ResultsPanel.tsx`** — given the per-phase `RubricLine[]` from both tracks, render a monochrome breakdown: a gray score ring/bar (earned/total %), a table of `{category label (via t), earned/weight, correct ✓/✗ as gray glyphs, note (via t)}`, and a "model answer" disclosure. Calls `scorePhaseEngine` (server) + `coachReviewArtifact` (server) — so this panel renders from a server component that computes the lines and passes them down. NO red/green; correctness shown by glyph + position, not hue.

- [ ] **Step 2: Debrief `page.tsx`** — server; `getRunForUser` gate; replay the `events` timeline + each submission with its rubric lines, **each deep-linked** to `/scholar/sources/{id}` / `/scholar/cases/{id}` for the phase's cited corpus; a reflective write-up `<textarea>` persisted via a small `saveReflectionAction` (append a `ScholarPlanspielEvent kind:"GRADE"` or a dedicated reflection field). Exriptable via the existing `CiteExport`/download pattern (reuse `DownloadButton`).

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit`

```bash
git add "src/app/(scholar)/scholar/planspiele/_components/ResultsPanel.tsx" "src/app/(scholar)/scholar/planspiele/[id]/run/[runId]/debrief"
git commit -m "feat(scholar): Planspiele results panel + corpus-grounded debrief"
```

---

## Sprint 10 — Instructor view + nav wiring (LAST) + full verify

**Files:**

- Create: `src/app/(scholar)/scholar/planspiele/instructor/page.tsx`
- Modify: `src/app/(scholar)/scholar/ScholarShell.tsx` (append MAIN_NAV entry — the route now exists)

Instructor = org role OWNER/ADMIN/MANAGER (from `getScholarAuth().role`). For MVP the cohort = the SSO-gated org; the instructor sees runs whose owner is in their org. Since runs are User-decoupled, the MVP "assign + view" lists the instructor's own org's runs via an org-scoped query helper (`listRunsForOrg(organizationId)` added to `runs.server.ts`, filtering by the org's member userIds — resolve member ids via the existing org membership query).

- [ ] **Step 1: Add `listRunsForOrg`** to `runs.server.ts` — given an `organizationId`, resolve member userIds (mirror however `getCurrentOrganization`/membership is queried elsewhere), then `findMany where { ownerUserId: { in: memberIds } }`. Ownership of the _view_ is gated by the page requiring an instructor-tier role.

- [ ] **Step 2: Instructor `page.tsx`** — `getScholarAuth()`; if `role` not in `["OWNER","ADMIN","MANAGER"]` → render a "students only see their own runs" notice (or `notFound()`); else list scenarios to assign + a submissions table (student run id, scenario, status from workflow state, score, last activity). Read-only scores for MVP (grade-override is Phase 2).

- [ ] **Step 3: Wire nav** — in `ScholarShell.tsx` `MAIN_NAV` (line ~52), append:

```typescript
{ labelKey: "planspiele", href: "/scholar/planspiele", icon: Swords },
```

Import `Swords` (or `Drama`/`Gamepad2`) from `lucide-react` at the top. The `labelKey` resolves via the `nav.ts` key added in Sprint 6.

- [ ] **Step 4: Full verification**

Run: `npx vitest run src/data/scholar/planspiele src/lib/scholar/planspiele`
Expected: ALL green.
Run: `npx tsc --noEmit`
Expected: no NEW errors (pre-existing unrelated errors noted, not introduced by this slice).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(scholar)/scholar/planspiele/instructor/page.tsx" "src/app/(scholar)/scholar/ScholarShell.tsx" src/lib/scholar/planspiele/runs.server.ts
git commit -m "feat(scholar): Planspiele instructor view + sidebar nav wiring"
```

---

## Self-Review

**1. Spec coverage** (against `…-planspiele-concept.md` §8 MVP):

- ONE flagship scenario (ASI Italy) → Sprint 2 ✓
- Operator role, SOLO, AI-NCA → Sprint 2 (`studentRole`/`aiRoles`) + Sprint 5 (`createSoloRun` AI assignment) ✓
- 4 artifact phases (authority / application / cover-letter / deficiency) → Sprint 2 phases + Sprint 8 editors ✓
- Track-1 engine grading + Track-2 AI rubric w/ no-key fallback → Sprint 4 ✓
- Debrief + corpus deep-links + reflection → Sprint 9 ✓
- Thin instructor assign+view → Sprint 10 ✓
- EN+DE+IT, FR/ES stub → Sprint 6 ✓
- `getScholarAuth()` gate + IDOR pattern → Sprint 5 + route-group inheritance ✓
- Monochrome Scholar components, zero Academy/GlassCard imports → Sprints 7–9 ✓
- Nav entry LAST → Sprint 10 ✓

**2. Placeholder scan:** the only intentional placeholders are the `<..._ID>` corpus ids in Sprint 2, which the Sprint-2 integrity test (Step 5) forces to be replaced with real ids before the sprint can pass. The `fr/es` i18n `as never` markers are flagged with an inline instruction to paste the `en` object. No vague "add error handling" steps — the action wrappers show the full gate/validate/revalidate code.

**3. Type consistency:** `RubricLine` is defined once (Sprint 4A `scoring.server.ts`) and imported by `sim-coach.server.ts` (4B) and the UI. `ScholarSimContext` (Sprint 3) is the workflow context type used by guards. `getScenarioById`/`listScenarios` (Sprint 2 `index.ts`) are consumed by Sprints 3/5/7/8. Action names (`startSoloRunAction`, `submitArtifactAction`, `advancePhaseAction`) defined in Sprint 5 are referenced by Sprints 7/8. `ScholarPlanspielSubmission` upsert needs a `@@unique([runId, phaseKey, roleAssignmentId])` — flagged in Sprint 5's note to reconcile with the Sprint-1 `@@index([runId, phaseKey])`.

**Open reconciliation items (resolve during execution, noted inline):**

- Sprint 5 submission upsert key ↔ Sprint 1 index → make it a `@@unique`.
- Sprint 4 `mapProfileToAnswers` ↔ the academy route's real profile→answers mapping → copy exactly.
- Sprint 3 `canTransition` ↔ whether the engine enforces `requiredPermissions` → guard already covers it.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-08-caelex-scholar-planspiele-mvp.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per sprint, two-stage review between sprints, fast iteration. Maps cleanly onto a build ultracode (one agent per sprint, OOM-safe at concurrency 2).
2. **Inline Execution** — execute sprints in this session with checkpoints for review.
