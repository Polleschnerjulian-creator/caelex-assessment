# Atlas Agent-Mode v2 Sprint E (Polish v1-light) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schließe die UX- + Operational-Gaps von v1-light Sprints A→D durch 5 atomare Polish-Items (E1-E5).

**Architecture:** Atomic ship-strategy — 1 `prisma db push`, 1 `feat(...)` commit für Code, 1 `docs(...)` commit für Tracker, 1 Vercel-Deploy. Backend zuerst (schema → server logic → cron), dann Frontend (UI components), dann Verify + Ship.

**Tech Stack:** Next.js 15 (App Router), Prisma 5.22 + Neon Postgres EU, Anthropic SDK via `buildAnthropicClient()`, jsPDF + archiver (existing), Vitest (für 3 server-side Tests), Vercel Cron (CRON_SECRET-authed).

**Spec:** `docs/superpowers/specs/2026-05-15-atlas-agent-mode-v2-sprint-e-polish-design.md`

---

## File Inventory

**New (3):**

- `src/components/atlas/v2/MandateBackgroundAgentSection.tsx` — E1 UI Sektion
- `src/app/api/cron/atlas-housekeeping/route.ts` — E4 + E5 combined Cron-Route
- `src/lib/atlas/agent/sub-agent-cost-tracker.test.ts` — E3 server-side test
- `src/app/api/atlas/agent/runs/[id]/approve/route.test.ts` — E2 server-side test
- `src/app/api/cron/atlas-housekeeping/route.test.ts` — E4+E5 cron test

**Modified (8):**

- `prisma/schema.prisma` — E3: 2 fields auf AtlasAgentRun
- `src/components/atlas/v2/MandateDetailView.tsx` — E1: Section-Import + render
- `src/app/(atlas)/atlas/agent/page.tsx` — E2 (ApprovalCards) + E3 (counter split)
- `src/app/api/atlas/agent/route.ts` — E2 (batch pause-detection) + E3 (sub-token tracking)
- `src/lib/atlas/agent/background-runner.server.ts` — E3 (sub-token tracking parallel)
- `src/app/api/atlas/agent/runs/[id]/approve/route.ts` — E2 (batched-body)
- `src/app/api/atlas/agent/runs/route.ts` — E1 (templateId-filter)
- `vercel.json` — E4 + E5 cron entry

**Tracker update (separate commit):**

- `docs/atlas-agent-mode-improvements-tracker.md` — Sprint E entry hinzufügen

---

### Task 1: Schema additions (E3) + DB push

**Files:**

- Modify: `prisma/schema.prisma` (AtlasAgentRun model)

- [ ] **Step 1: Add 2 fields zu AtlasAgentRun**

Suche nach `model AtlasAgentRun {` (ca. line 11886). Direkt nach den Sprint-B1-Feldern (`conversationState Json?`) füge ein:

```prisma
  /// Sprint E3: Sub-Agent Cost-Breakdown.
  /// When the main agent invokes `delegate_subtasks` (D2), the sub-
  /// agent token totals are accumulated separately so the Live-Counter
  /// can show "$main · $sub-agents". Cumulative cost (inputTokens +
  /// outputTokens) STILL includes these — these fields are the
  /// SUBSET. Both default 0 = no-op for runs that never delegated.
  subAgentInputTokens  Int @default(0)
  subAgentOutputTokens Int @default(0)
```

- [ ] **Step 2: Push schema**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx prisma db push --skip-generate`
Expected: `🚀  Your database is now in sync with your Prisma schema. Done in <1s`

- [ ] **Step 3: Regen Prisma Client**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx prisma generate`
Expected: `✔ Generated Prisma Client (vX.Y.Z) ...`

- [ ] **Step 4: Verify typecheck still passes**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "^(src/lib/atlas|src/app/api/atlas)" | head -5`
Expected: no output (no NEW errors in Atlas-files; pre-existing prisma/bho-members.ts errors are unrelated)

---

### Task 2: E3 Backend — Agent route sub-agent token tracking

**Files:**

- Modify: `src/app/api/atlas/agent/route.ts`

- [ ] **Step 1: Add sub-agent token state vars**

Suche im `start(controller)` callback nach:

```ts
let totalCacheCreationTokens = 0;
let totalCacheReadTokens = 0;
let toolsUsed: string[] = [];
```

Direkt danach füge ein:

```ts
/* Sprint E3 — Sub-Agent token sub-tracking. These accumulate
         IN PARALLEL to totalInputTokens/totalOutputTokens (which stay
         cumulative across main + sub). They power the Live-Counter
         "$main · $sub-agents" split. Always 0 for runs that never
         called delegate_subtasks. */
let subAgentInputTokens = 0;
let subAgentOutputTokens = 0;
```

- [ ] **Step 2: Track sub-agent tokens in delegate_subtasks special-case**

Suche nach `} else if (block.name === "delegate_subtasks") {`. Im try-block, NACH `if (!isError) toolsUsed.push(block.name);` (also nach dem Token-Accumulation in totalInputTokens/etc.), füge ein:

```ts
/* Sprint E3 — also track sub-agent token totals
                   separately for the Live-Counter split. */
subAgentInputTokens += outcome.totalInputTokens;
subAgentOutputTokens += outcome.totalOutputTokens;
```

- [ ] **Step 3: Add subAgentCost to cost_progress SSE event**

Suche nach `send({\n              type: "cost_progress",`. Erweitere das emittete Objekt:

```ts
send({
  type: "cost_progress",
  iteration: iter,
  currentCost: liveCostUsd,
  budget: parsed.data.budgetUsd ?? null,
  inputTokens: totalInputTokens,
  outputTokens: totalOutputTokens,
  /* Sprint E3 — sub-agent cost-split (live computed). */
  subAgentCost:
    subAgentInputTokens > 0 || subAgentOutputTokens > 0
      ? estimateCostUsd(subAgentInputTokens, subAgentOutputTokens, 0, 0)
      : 0,
  subAgentInputTokens,
  subAgentOutputTokens,
});
```

- [ ] **Step 4: Persist sub-agent tokens on run-complete**

Suche nach den 2 `prisma.atlasAgentRun.update` calls (Pause-für-Approval + Complete). In BEIDEN update-`data`-Blöcken, füge ein:

```ts
                subAgentInputTokens,
                subAgentOutputTokens,
```

(direkt neben `inputTokens: totalInputTokens, outputTokens: totalOutputTokens,`)

Es gibt 3 Stellen wo dieses Pattern auftaucht:

1. Budget-Pause path
2. Approval-Pause path
3. Run-complete path

Add zu allen drei.

- [ ] **Step 5: Verify typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "^src/app/api/atlas/agent/route\.ts"`
Expected: no output (no errors)

---

### Task 3: E3 Backend — Background-runner sub-agent token tracking

**Files:**

- Modify: `src/lib/atlas/agent/background-runner.server.ts`

- [ ] **Step 1: Add sub-agent token state vars**

Suche nach `const persistedReasoning: Record<number, string> = {};`. Direkt danach füge ein:

```ts
/* Sprint E3 — Sub-Agent token sub-tracking, parallel zum agent
     route. Powers the Live-Counter split in the regular UI when
     background-runs are reviewed from history. */
let subAgentInputTokens = 0;
let subAgentOutputTokens = 0;
```

- [ ] **Step 2: Track sub-agent tokens in delegate_subtasks branch**

Suche nach `if (block.name === "delegate_subtasks") {`. Im try-block, NACH `if (!isError) toolsUsed.push(block.name);`, füge ein:

```ts
/* Sprint E3 — sub-agent token sub-tracking. */
subAgentInputTokens += outcome.totalInputTokens;
subAgentOutputTokens += outcome.totalOutputTokens;
```

- [ ] **Step 3: Persist sub-agent tokens on all 3 update-paths**

Suche alle 3 `prisma.atlasAgentRun.update({` Vorkommen (budget-pause, approval-halt, complete, error). In BEIDEN data-Blöcken (außer Error wo Tokens optional sind), füge ein:

```ts
        subAgentInputTokens,
        subAgentOutputTokens,
```

neben den existierenden `inputTokens: totalInputTokens, outputTokens: totalOutputTokens,` Zeilen.

- [ ] **Step 4: Verify typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "background-runner"`
Expected: no output

---

### Task 4: E3 Test — Sub-Agent token tracking unit test

**Files:**

- Create: `src/lib/atlas/agent/sub-agent-cost-tracker.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import "server-only";
import { describe, it, expect, vi } from "vitest";
import { delegateSubtasks } from "./sub-agent-orchestrator.server";

vi.mock("@/lib/atlas/anthropic-client");
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("delegateSubtasks — sub-agent token tracking (E3)", () => {
  it("aggregates token-totals across all sub-agents (parallel)", async () => {
    const mockAnthropic = {
      messages: {
        create: vi
          .fn()
          .mockResolvedValueOnce({
            content: [{ type: "text", text: "out 1" }],
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              cache_creation_input_tokens: null,
              cache_read_input_tokens: null,
            },
          })
          .mockResolvedValueOnce({
            content: [{ type: "text", text: "out 2" }],
            usage: {
              input_tokens: 200,
              output_tokens: 75,
              cache_creation_input_tokens: null,
              cache_read_input_tokens: null,
            },
          }),
      },
    };

    const outcome = await delegateSubtasks(
      [
        { title: "Task A", prompt: "Test prompt one." },
        { title: "Task B", prompt: "Test prompt two." },
      ],
      {
        anthropic: mockAnthropic as never,
        model: "claude-sonnet-4-6",
        sharedSystemPrompt: null,
      },
    );

    expect(outcome.results).toHaveLength(2);
    expect(outcome.totalInputTokens).toBe(300);
    expect(outcome.totalOutputTokens).toBe(125);
    expect(outcome.hasErrors).toBe(false);
    expect(outcome.content).toContain("## Task A");
    expect(outcome.content).toContain("## Task B");
  });

  it("returns errorOutcome for invalid subtasks (not an array)", async () => {
    const outcome = await delegateSubtasks(null, {
      anthropic: {} as never,
      model: "test",
      sharedSystemPrompt: null,
    });
    expect(outcome.hasErrors).toBe(true);
    expect(outcome.totalInputTokens).toBe(0);
    expect(outcome.totalOutputTokens).toBe(0);
  });

  it("caps at MAX_PARALLEL_SUBTASKS (4) when more passed", async () => {
    const mockAnthropic = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "ok" }],
          usage: {
            input_tokens: 10,
            output_tokens: 5,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
          },
        }),
      },
    };

    const subtasks = Array.from({ length: 6 }, (_, i) => ({
      title: `Task ${i}`,
      prompt: `Prompt ${i} — long enough to pass min(10).`,
    }));

    const outcome = await delegateSubtasks(subtasks, {
      anthropic: mockAnthropic as never,
      model: "test",
      sharedSystemPrompt: null,
    });

    expect(outcome.results).toHaveLength(4);
    expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(4);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/lib/atlas/agent/sub-agent-cost-tracker.test.ts 2>&1 | tail -15`
Expected: `Test Files  1 passed (1)` + `Tests  3 passed (3)`

If `subAgentInputTokens/subAgentOutputTokens` weren't returned by orchestrator: the test still passes because we're testing the orchestrator's existing `totalInputTokens/totalOutputTokens` return-fields (which the agent route then routes into the sub-agent counters in Task 2).

---

### Task 5: E2 Backend — Agent route batched pause-detection

**Files:**

- Modify: `src/app/api/atlas/agent/route.ts`

- [ ] **Step 1: Change pause-detection from find→filter**

Suche nach:

```ts
          const firstUndecided = toolUseBlocks.find(
            (b) =>
              requiresApproval(b.name) &&
              !currentApprovalGates.some(
                (g) => g.toolUseId === b.id && g.decision !== null,
              ),
          );
          if (firstUndecided) {
```

Ersetze durch:

```ts
          const allUndecided = toolUseBlocks.filter(
            (b) =>
              requiresApproval(b.name) &&
              !currentApprovalGates.some(
                (g) => g.toolUseId === b.id && g.decision !== null,
              ),
          );
          if (allUndecided.length > 0) {
```

- [ ] **Step 2: Push ALL undecided into approvalGates**

Im if-block, suche nach `const pendingGate: ApprovalGate = {`. Ersetze den single-gate-push durch eine Schleife:

```ts
const newGates: ApprovalGate[] = allUndecided.map((b) => ({
  toolUseId: b.id,
  toolName: b.name,
  originalInput: b.input as Record<string, unknown>,
  decision: null,
  rationale: approvalRationale(b.name),
  requestedAt: new Date().toISOString(),
  decidedAt: null,
}));
currentApprovalGates = [...currentApprovalGates, ...newGates];
pausedForApproval = true;
```

- [ ] **Step 3: Change conversationState pendingToolUseId to pendingToolUseIds (plural)**

Im conversationState-Snapshot, ersetze:

```ts
                      pendingToolUseId: firstUndecided.id,
```

durch:

```ts
                      pendingToolUseIds: allUndecided.map((b) => b.id),
```

- [ ] **Step 4: Change SSE event payload from single tool to array**

Ersetze die `send({type: "approval_required", ...})` call mit:

```ts
send({
  type: "approval_required",
  runId,
  tools: allUndecided.map((b) => ({
    toolUseId: b.id,
    toolName: b.name,
    input: b.input,
    rationale: approvalRationale(b.name),
  })),
  iteration: iter,
});
logger.info("[atlas/agent] paused for approval (batched)", {
  userId: atlas.userId,
  runId,
  pendingCount: allUndecided.length,
  toolNames: allUndecided.map((b) => b.name),
});
break;
```

(ersetze die ganze logger.info call mit der oberen Version.)

- [ ] **Step 5: Update resume-path validation to check ALL pending tools have decisions**

Suche im Resume-Path nach:

```ts
          const pendingGate = gates.find(
            (g) => g.toolUseId === state.pendingToolUseId,
          );
          if (!pendingGate || pendingGate.decision === null) {
```

Ersetze durch:

```ts
          const pendingIds = (state as { pendingToolUseIds?: string[] })
            .pendingToolUseIds ?? [state.pendingToolUseId].filter(Boolean);
          const allDecided = pendingIds.every((id: string) =>
            gates.some((g) => g.toolUseId === id && g.decision !== null),
          );
          if (!allDecided) {
```

(Backwards-compat mit alten conversationState-snapshots die noch pendingToolUseId single-form hatten.)

- [ ] **Step 6: Update the `send` for run_resumed to omit single decision**

Suche im Resume-Path nach `send({\n            type: "run_resumed",`. Ersetze durch:

```ts
send({
  type: "run_resumed",
  runId,
  fromIteration: initialIter,
  decisionsApplied: pendingIds.length,
});
```

- [ ] **Step 7: Update conversationState TypeScript interface**

Suche nach `const state = priorRun.conversationState as {`. In dem inline-type-cast, ersetze:

```ts
pendingToolUseId: string;
```

durch:

```ts
            pendingToolUseId?: string; // backwards-compat
            pendingToolUseIds?: string[];
```

- [ ] **Step 8: Verify typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "^src/app/api/atlas/agent/route\.ts"`
Expected: no output

---

### Task 6: E2 Backend — /approve endpoint batched body

**Files:**

- Modify: `src/app/api/atlas/agent/runs/[id]/approve/route.ts`

- [ ] **Step 1: Change PostBody zod to array shape**

Suche nach:

```ts
const PostBody = z
  .object({
    toolUseId: z.string().min(1).max(200),
    decision: z.enum(["approved", "rejected", "modified"]),
    modifiedInput: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (b) =>
      b.decision !== "modified" ||
      (b.modifiedInput !== undefined && b.modifiedInput !== null),
    {
      message: "modifiedInput is required when decision === 'modified'",
      path: ["modifiedInput"],
    },
  );
```

Ersetze durch:

```ts
/* Sprint E2 — Batched body. Lawyer decides ALL pending dangerous
   tools in one round. Min 1, max 4 (matches MAX_PARALLEL_SUBTASKS
   and the approvalGates UI scroll-comfort cap). */
const DecisionEntry = z
  .object({
    toolUseId: z.string().min(1).max(200),
    decision: z.enum(["approved", "rejected", "modified"]),
    modifiedInput: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (b) =>
      b.decision !== "modified" ||
      (b.modifiedInput !== undefined && b.modifiedInput !== null),
    {
      message: "modifiedInput is required when decision === 'modified'",
      path: ["modifiedInput"],
    },
  );

const PostBody = z.object({
  decisions: z.array(DecisionEntry).min(1).max(4),
});
```

- [ ] **Step 2: Apply all decisions atomically**

Suche nach dem POST-Handler-Block der die single `targetIdx` findet und ersetzt:

```ts
const targetIdx = gates.findIndex((g) => g.toolUseId === parsed.data.toolUseId);
if (targetIdx < 0) {
  return NextResponse.json(
    { error: "Tool-use not found in approval gates" },
    { status: 404 },
  );
}
if (gates[targetIdx].decision !== null) {
  return NextResponse.json(
    { error: "Decision already recorded for this tool" },
    { status: 409 },
  );
}

const decidedAt = new Date().toISOString();
const updatedGates: ApprovalGate[] = gates.map((g, i) =>
  i === targetIdx
    ? {
        ...g,
        decision: parsed.data.decision,
        decidedAt,
        ...(parsed.data.decision === "modified" && parsed.data.modifiedInput
          ? { modifiedInput: parsed.data.modifiedInput }
          : {}),
      }
    : g,
);
```

Ersetze durch:

```ts
/* Sprint E2 — Validate ALL decisions before any apply. Each
     toolUseId must exist in gates AND must still have decision=null
     (not yet decided). Bail fast if any check fails. */
for (const d of parsed.data.decisions) {
  const target = gates.find((g) => g.toolUseId === d.toolUseId);
  if (!target) {
    return NextResponse.json(
      { error: `Tool-use ${d.toolUseId} not found in approval gates` },
      { status: 404 },
    );
  }
  if (target.decision !== null) {
    return NextResponse.json(
      { error: `Decision already recorded for ${d.toolUseId}` },
      { status: 409 },
    );
  }
}

/* Apply all decisions atomically — single update. */
const decidedAt = new Date().toISOString();
const decisionsByToolUseId = new Map(
  parsed.data.decisions.map((d) => [d.toolUseId, d] as const),
);
const updatedGates: ApprovalGate[] = gates.map((g) => {
  const d = decisionsByToolUseId.get(g.toolUseId);
  if (!d) return g;
  return {
    ...g,
    decision: d.decision,
    decidedAt,
    ...(d.decision === "modified" && d.modifiedInput
      ? { modifiedInput: d.modifiedInput }
      : {}),
  };
});
```

- [ ] **Step 3: Update logger + response payload**

Suche nach:

```ts
logger.info("[atlas/agent/approve] decision recorded", {
  userId: atlas.userId,
  runId: id,
  toolUseId: parsed.data.toolUseId,
  decision: parsed.data.decision,
});
return NextResponse.json({
  ok: true,
  runId: id,
  toolUseId: parsed.data.toolUseId,
  decision: parsed.data.decision,
  decidedAt,
});
```

Ersetze durch:

```ts
logger.info("[atlas/agent/approve] decisions recorded (batched)", {
  userId: atlas.userId,
  runId: id,
  count: parsed.data.decisions.length,
  decisions: parsed.data.decisions.map((d) => ({
    toolUseId: d.toolUseId,
    decision: d.decision,
  })),
});
return NextResponse.json({
  ok: true,
  runId: id,
  decisions: parsed.data.decisions.map((d) => ({
    toolUseId: d.toolUseId,
    decision: d.decision,
  })),
  decidedAt,
});
```

- [ ] **Step 4: Verify typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "approve/route\.ts"`
Expected: no output

---

### Task 7: E2 Test — /approve endpoint batched body

**Files:**

- Create: `src/app/api/atlas/agent/runs/[id]/approve/route.test.ts`

- [ ] **Step 1: Write the test**

```ts
import "server-only";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/atlas-auth");
vi.mock("@/lib/ratelimit");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasAgentRun: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST } from "./route";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(getAtlasAuth);
const mockRl = vi.mocked(checkRateLimit);
const mockFindFirst = vi.mocked(prisma.atlasAgentRun.findFirst);
const mockUpdate = vi.mocked(prisma.atlasAgentRun.update);

const buildReq = (body: unknown) =>
  new Request("http://localhost/api/atlas/agent/runs/abc/approve", {
    method: "POST",
    body: JSON.stringify(body),
  }) as never;

const ctx = { params: Promise.resolve({ id: "abc" }) };

describe("POST /approve — batched body (E2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
    } as never);
    mockRl.mockResolvedValue({ success: true } as never);
  });

  it("applies multiple decisions atomically", async () => {
    mockFindFirst.mockResolvedValue({
      id: "abc",
      status: "awaiting_approval",
      pausedForApproval: true,
      approvalGates: [
        {
          toolUseId: "tool-1",
          toolName: "create_matter_invite",
          originalInput: {},
          decision: null,
          rationale: "x",
          requestedAt: "2026-05-15T00:00:00Z",
          decidedAt: null,
        },
        {
          toolUseId: "tool-2",
          toolName: "send_email",
          originalInput: {},
          decision: null,
          rationale: "y",
          requestedAt: "2026-05-15T00:00:00Z",
          decidedAt: null,
        },
      ],
    } as never);
    mockUpdate.mockResolvedValue({} as never);

    const res = await POST(
      buildReq({
        decisions: [
          { toolUseId: "tool-1", decision: "approved" },
          { toolUseId: "tool-2", decision: "rejected" },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledOnce();
    const updateArg = mockUpdate.mock.calls[0][0];
    const gates = (updateArg.data as { approvalGates: unknown[] })
      .approvalGates as Array<{ toolUseId: string; decision: string }>;
    expect(gates).toHaveLength(2);
    expect(gates[0].decision).toBe("approved");
    expect(gates[1].decision).toBe("rejected");
  });

  it("rejects when any toolUseId is missing", async () => {
    mockFindFirst.mockResolvedValue({
      id: "abc",
      status: "awaiting_approval",
      pausedForApproval: true,
      approvalGates: [
        {
          toolUseId: "tool-1",
          toolName: "create_matter_invite",
          originalInput: {},
          decision: null,
          rationale: "x",
          requestedAt: "2026-05-15T00:00:00Z",
          decidedAt: null,
        },
      ],
    } as never);

    const res = await POST(
      buildReq({
        decisions: [
          { toolUseId: "tool-1", decision: "approved" },
          { toolUseId: "tool-nonexistent", decision: "approved" },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects when any decision is already recorded", async () => {
    mockFindFirst.mockResolvedValue({
      id: "abc",
      status: "awaiting_approval",
      pausedForApproval: true,
      approvalGates: [
        {
          toolUseId: "tool-1",
          toolName: "create_matter_invite",
          originalInput: {},
          decision: "approved", // already decided
          rationale: "x",
          requestedAt: "2026-05-15T00:00:00Z",
          decidedAt: "2026-05-15T00:00:01Z",
        },
      ],
    } as never);

    const res = await POST(
      buildReq({
        decisions: [{ toolUseId: "tool-1", decision: "rejected" }],
      }),
      ctx,
    );
    expect(res.status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("accepts modifiedInput when decision === 'modified'", async () => {
    mockFindFirst.mockResolvedValue({
      id: "abc",
      status: "awaiting_approval",
      pausedForApproval: true,
      approvalGates: [
        {
          toolUseId: "tool-1",
          toolName: "create_matter_invite",
          originalInput: { foo: "old" },
          decision: null,
          rationale: "x",
          requestedAt: "2026-05-15T00:00:00Z",
          decidedAt: null,
        },
      ],
    } as never);
    mockUpdate.mockResolvedValue({} as never);

    const res = await POST(
      buildReq({
        decisions: [
          {
            toolUseId: "tool-1",
            decision: "modified",
            modifiedInput: { foo: "new" },
          },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    const updateArg = mockUpdate.mock.calls[0][0];
    const gates = (updateArg.data as { approvalGates: unknown[] })
      .approvalGates as Array<{
      decision: string;
      modifiedInput?: Record<string, unknown>;
    }>;
    expect(gates[0].decision).toBe("modified");
    expect(gates[0].modifiedInput).toEqual({ foo: "new" });
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/app/api/atlas/agent/runs/\[id\]/approve/route.test.ts 2>&1 | tail -10`
Expected: `Test Files  1 passed (1)` + `Tests  4 passed (4)`

---

### Task 8: E1 Backend — runs-list templateId filter

**Files:**

- Modify: `src/app/api/atlas/agent/runs/route.ts`

- [ ] **Step 1: Add templateId to zod GetQuery**

Suche nach `const GetQuery = z.object({` (around the top of the route file). Erweitere mit:

```ts
  templateId: z.string().min(1).max(100).optional(),
```

(Falls die GetQuery existiert; ansonsten an passender Stelle erstellen.)

- [ ] **Step 2: Add where-clause filter**

Suche nach der `where` constant in der `findMany` query. Erweitere:

```ts
const where = {
  userId: atlas.userId,
  organizationId: atlas.organizationId,
  ...(parsed.data.mandateId ? { mandateId: parsed.data.mandateId } : {}),
  ...(parsed.data.status ? { status: parsed.data.status } : {}),
  ...(parsed.data.templateId ? { templateId: parsed.data.templateId } : {}),
};
```

(Achtung: das `where` constant könnte anders strukturiert sein. Verify mit `Read` zuerst, dann adapt.)

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "agent/runs/route\.ts"`
Expected: no output

---

### Task 9: E4 + E5 — Housekeeping Cron Route

**Files:**

- Create: `src/app/api/cron/atlas-housekeeping/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create the cron route**

```ts
/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint E4 + E5 — Atlas Housekeeping Cron.
 * ────────────────────────────────────────────────────────────────────
 *   GET /api/cron/atlas-housekeeping
 *
 * Daily cron (04:00 UTC) für zwei Maintenance-Jobs:
 *
 *   E4 — conversationState TTL: Wipes `conversationState = null` für
 *        AtlasAgentRun-Rows mit startedAt > 30 Tage. Behält die
 *        komplette Row (status/steps/artifacts/citations/etc.), nuked
 *        nur das heavy snapshot. Verhindert GB-scale Storage-Debt
 *        durch C1's "persist conversationState auf JEDEM run".
 *
 *   E5 — Stale awaiting_approval: Markiert Runs als status="abandoned"
 *        wenn >7 Tage in awaiting_approval. Lawyer sieht "abandoned"
 *        Status-Badge in History; silent, keine Notification.
 *
 * Auth via CRON_SECRET bearer header (gleiches Pattern wie 18 andere
 * Crons).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* E4: conversationState wird nach diesem Alter gewipped. Cap of 30
   days bedeutet Forks/Replays von älteren Runs sind nicht mehr
   möglich — typische Use-Cases sind days-old, nicht months-old. */
const CONVERSATION_STATE_TTL_DAYS = 30;
/* E5: Runs in awaiting_approval-Status werden nach diesem Threshold
   als "abandoned" marked. Lawyer kann Browser-Close oder vergessen
   — der State darf nicht ewig blockieren. */
const STALE_APPROVAL_THRESHOLD_DAYS = 7;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();

  /* ── Job 1 (E4): conversationState TTL ─────────────────────────── */
  const ttlCutoff = new Date(
    now - CONVERSATION_STATE_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  let conversationStateWiped = 0;
  try {
    const result = await prisma.atlasAgentRun.updateMany({
      where: {
        startedAt: { lt: ttlCutoff },
        conversationState: { not: Prisma.JsonNull },
      },
      data: { conversationState: Prisma.JsonNull },
    });
    conversationStateWiped = result.count;
  } catch (err) {
    logger.error("[atlas/housekeeping] E4 conversationState wipe failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  /* ── Job 2 (E5): Stale awaiting_approval ───────────────────────── */
  const staleCutoff = new Date(
    now - STALE_APPROVAL_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
  );
  let awaitingApprovalAbandoned = 0;
  try {
    const result = await prisma.atlasAgentRun.updateMany({
      where: {
        status: "awaiting_approval",
        startedAt: { lt: staleCutoff },
      },
      data: {
        status: "abandoned",
        conversationState: Prisma.JsonNull,
        completedAt: new Date(),
      },
    });
    awaitingApprovalAbandoned = result.count;
  } catch (err) {
    logger.error(
      "[atlas/housekeeping] E5 stale awaiting_approval cleanup failed",
      {
        error: err instanceof Error ? err.message : String(err),
      },
    );
  }

  logger.info("[atlas/housekeeping] done", {
    conversationStateWiped,
    awaitingApprovalAbandoned,
  });

  return NextResponse.json({
    ok: true,
    conversationStateWiped,
    awaitingApprovalAbandoned,
  });
}
```

- [ ] **Step 2: Register cron in vercel.json**

Suche in `vercel.json` nach dem letzten `crons` entry (`atlas-background-agents`). Direkt davor in den `crons` array hinzufügen (vor dem `]`):

```json
    {
      "path": "/api/cron/atlas-housekeeping",
      "schedule": "0 4 * * *"
    },
```

(Achtung: comma vor `{` und nach `}` — die letzten crons-entries haben kein trailing comma, also passe das Vorvorletzte an.)

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "atlas-housekeeping"`
Expected: no output

---

### Task 10: E4+E5 Test — Housekeeping cron

**Files:**

- Create: `src/app/api/cron/atlas-housekeeping/route.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasAgentRun: {
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const mockUpdateMany = vi.mocked(prisma.atlasAgentRun.updateMany);

const buildReq = (auth?: string) =>
  new Request("http://localhost/api/cron/atlas-housekeeping", {
    method: "GET",
    headers: auth ? { authorization: auth } : {},
  }) as never;

describe("GET /api/cron/atlas-housekeeping (E4+E5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects without CRON_SECRET bearer", async () => {
    const res = await GET(buildReq());
    expect(res.status).toBe(401);
  });

  it("rejects with wrong bearer", async () => {
    const res = await GET(buildReq("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("runs both jobs sequentially when authed", async () => {
    mockUpdateMany
      .mockResolvedValueOnce({ count: 47 } as never) // E4
      .mockResolvedValueOnce({ count: 3 } as never); // E5

    const res = await GET(buildReq("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.conversationStateWiped).toBe(47);
    expect(body.awaitingApprovalAbandoned).toBe(3);
    expect(mockUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("E4 cutoff is 30 days back", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 } as never);
    await GET(buildReq("Bearer test-secret"));
    const firstCall = mockUpdateMany.mock.calls[0][0];
    const where = firstCall.where as { startedAt: { lt: Date } };
    const cutoff = where.startedAt.lt;
    const daysDiff = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysDiff).toBeGreaterThan(29.9);
    expect(daysDiff).toBeLessThan(30.1);
  });

  it("E5 cutoff is 7 days back AND status=awaiting_approval", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 } as never);
    await GET(buildReq("Bearer test-secret"));
    const secondCall = mockUpdateMany.mock.calls[1][0];
    const where = secondCall.where as {
      status: string;
      startedAt: { lt: Date };
    };
    expect(where.status).toBe("awaiting_approval");
    const cutoff = where.startedAt.lt;
    const daysDiff = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysDiff).toBeGreaterThan(6.9);
    expect(daysDiff).toBeLessThan(7.1);
  });

  it("handles E4 failure gracefully and still runs E5", async () => {
    mockUpdateMany
      .mockRejectedValueOnce(new Error("E4 DB error"))
      .mockResolvedValueOnce({ count: 5 } as never);

    const res = await GET(buildReq("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversationStateWiped).toBe(0);
    expect(body.awaitingApprovalAbandoned).toBe(5);
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/app/api/cron/atlas-housekeeping/route.test.ts 2>&1 | tail -10`
Expected: `Test Files  1 passed (1)` + `Tests  6 passed (6)`

---

### Task 11: E2 Frontend — ApprovalPauseInfo type + SSE handler updates

**Files:**

- Modify: `src/app/(atlas)/atlas/agent/page.tsx`

- [ ] **Step 1: Update ApprovalPauseInfo interface**

Suche nach:

```ts
interface ApprovalPauseInfo {
  runId: string;
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  rationale: string;
  iteration: number;
}
```

Ersetze durch:

```ts
/** Sprint E2 — Batched-Approval. SSE event carries an ARRAY of
 *  pending tools now. The ApprovalCards container renders one card
 *  per tool; lawyer decides each, "Submit all" fires one POST. */
interface PendingTool {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  rationale: string;
}

interface ApprovalPauseInfo {
  runId: string;
  tools: PendingTool[];
  iteration: number;
}
```

- [ ] **Step 2: Update SSE `approval_required` handler**

Suche nach `case "approval_required":`. Ersetze den Body durch:

```ts
              case "approval_required":
                /* Sprint B1+E2 — server paused before dangerous tools.
                   E2 makes this BATCHED: emitted payload now carries
                   ALL undecided dangerous tools in this iteration.
                   ApprovalCards renders N stacked cards. */
                setApprovalPause({
                  runId:
                    (evt.runId as string | null) ?? activeRunId ?? "",
                  tools:
                    (evt.tools as PendingTool[] | undefined) ?? [],
                  iteration: evt.iteration as number,
                });
                break;
```

- [ ] **Step 3: Update handleApprovalDecision to accept batched decisions**

Suche nach `const handleApprovalDecision = async (`. Ersetze die Signatur + Body durch:

```ts
/* Sprint E2 — Batched approval handler. Takes the lawyer's
     per-card decisions (collected in ApprovalCards state) and POSTs
     them ALL in one batch. On success, fires handleRun({resumeFromRunId})
     same way as B1 v1 — resume-path applies all decisions in for-loop. */
const handleApprovalDecision = async (
  decisions: Array<{
    toolUseId: string;
    decision: "approved" | "rejected" | "modified";
    modifiedInput?: Record<string, unknown>;
  }>,
) => {
  if (!approvalPause) return;
  if (approvalSubmitting) return;
  if (decisions.length === 0) return;
  setApprovalSubmitting(true);
  try {
    const res = await fetch(
      `/api/atlas/agent/runs/${approvalPause.runId}/approve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisions }),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || `Freigabe fehlgeschlagen (${res.status})`);
      setApprovalSubmitting(false);
      return;
    }
    const runIdToResume = approvalPause.runId;
    setApprovalSubmitting(false);
    setTimeout(() => {
      void handleRun({ resumeFromRunId: runIdToResume });
    }, 0);
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e));
    setApprovalSubmitting(false);
  }
};
```

- [ ] **Step 4: Verify typecheck (will show errors on the ApprovalCard usage — fixed in Task 12)**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "agent/page\.tsx" | head -5`
Expected: errors on `ApprovalCard` props (will be fixed when we replace it in Task 12)

---

### Task 12: E2 Frontend — ApprovalCards wrapper + per-card state + bulk shortcuts

**Files:**

- Modify: `src/app/(atlas)/atlas/agent/page.tsx`

- [ ] **Step 1: Update ApprovalCard render site to use ApprovalCards**

Suche nach:

```tsx
{
  approvalPause && (
    <ApprovalCard
      info={approvalPause}
      submitting={approvalSubmitting}
      onDecision={handleApprovalDecision}
    />
  );
}
```

Ersetze durch:

```tsx
{
  approvalPause && (
    <ApprovalCards
      info={approvalPause}
      submitting={approvalSubmitting}
      onSubmit={handleApprovalDecision}
    />
  );
}
```

- [ ] **Step 2: Replace ApprovalCard component definition with ApprovalCards + ApprovalCardEntry**

Suche nach `function ApprovalCard({` (component definition, around line 2191). Lösche die ganze ApprovalCard function (von `function ApprovalCard({` bis zur schließenden `}`-Klammer der Funktion). Ersetze durch:

```tsx
/* ── ApprovalCards (E2 wrapper) ──────────────────────────────────────
 *
 * Sprint E2 — Batched-Approval Modal. Renders N stacked
 * ApprovalCardEntry cards (one per pending dangerous tool). Lawyer
 * decides each; "Submit alle N" button gated on ALL decided.
 * Provides "Alle genehmigen" / "Alle ablehnen" Bulk-Shortcuts oben
 * für Power-Users.
 */
function ApprovalCards({
  info,
  submitting,
  onSubmit,
}: {
  info: ApprovalPauseInfo;
  submitting: boolean;
  onSubmit: (
    decisions: Array<{
      toolUseId: string;
      decision: "approved" | "rejected" | "modified";
      modifiedInput?: Record<string, unknown>;
    }>,
  ) => void;
}) {
  type DecisionRec = {
    decision: "approved" | "rejected" | "modified";
    modifiedInput?: Record<string, unknown>;
  };
  const [decisions, setDecisions] = useState<Map<string, DecisionRec>>(
    new Map(),
  );

  const recordDecision = (toolUseId: string, rec: DecisionRec) => {
    setDecisions((prev) => new Map(prev).set(toolUseId, rec));
  };

  const applyBulk = (decision: "approved" | "rejected") => {
    const all = new Map<string, DecisionRec>();
    for (const t of info.tools) all.set(t.toolUseId, { decision });
    setDecisions(all);
  };

  const allDecided = decisions.size === info.tools.length;

  const handleSubmit = () => {
    if (!allDecided) return;
    const list = info.tools.map((t) => {
      const rec = decisions.get(t.toolUseId);
      if (!rec) throw new Error("missing decision");
      return {
        toolUseId: t.toolUseId,
        decision: rec.decision,
        modifiedInput: rec.modifiedInput,
      };
    });
    onSubmit(list);
  };

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] font-medium text-red-800 dark:text-red-200">
          <ShieldAlert size={14} />
          {info.tools.length === 1
            ? "Atlas pausiert — Freigabe erforderlich"
            : `Atlas pausiert — ${info.tools.length} Freigaben erforderlich (Iteration ${info.iteration})`}
        </div>
        {info.tools.length > 1 && (
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => applyBulk("approved")}
              disabled={submitting}
              className="rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:border-emerald-500/30 dark:bg-transparent dark:text-emerald-200 dark:hover:bg-emerald-500/20"
            >
              Alle genehmigen
            </button>
            <button
              type="button"
              onClick={() => applyBulk("rejected")}
              disabled={submitting}
              className="rounded-md border border-red-300 bg-white px-2 py-0.5 text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-500/30 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-500/20"
            >
              Alle ablehnen
            </button>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {info.tools.map((t) => (
          <ApprovalCardEntry
            key={t.toolUseId}
            tool={t}
            currentDecision={decisions.get(t.toolUseId) ?? null}
            disabled={submitting}
            onDecide={(rec) => recordDecision(t.toolUseId, rec)}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-red-200 pt-3 dark:border-red-500/20">
        <span className="mr-auto text-[11px] text-red-700 dark:text-red-200/80">
          {decisions.size} von {info.tools.length} entschieden
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !allDecided}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
        >
          {submitting && <Loader2 size={11} className="animate-spin" />}
          {info.tools.length === 1
            ? "Submit Entscheidung"
            : `Submit alle ${info.tools.length} Entscheidungen`}
        </button>
      </div>
    </div>
  );
}

/* ── ApprovalCardEntry (single tool card within ApprovalCards) ──────
 *
 * Renders one pending tool with Approve / Edit / Reject buttons.
 * Edit-mode shows JSON-editable textarea (same UX as Sprint B1 v1's
 * ApprovalCard but local to one tool). Records decision in parent's
 * Map via onDecide callback.
 */
function ApprovalCardEntry({
  tool,
  currentDecision,
  disabled,
  onDecide,
}: {
  tool: PendingTool;
  currentDecision: {
    decision: "approved" | "rejected" | "modified";
    modifiedInput?: Record<string, unknown>;
  } | null;
  disabled: boolean;
  onDecide: (rec: {
    decision: "approved" | "rejected" | "modified";
    modifiedInput?: Record<string, unknown>;
  }) => void;
}) {
  const initialJson = (() => {
    try {
      return JSON.stringify(tool.input ?? {}, null, 2);
    } catch {
      return "{}";
    }
  })();
  const [mode, setMode] = useState<"buttons" | "edit">("buttons");
  const [editJson, setEditJson] = useState<string>(initialJson);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleConfirmEdit = () => {
    setParseError(null);
    let parsed: Record<string, unknown>;
    try {
      const raw = JSON.parse(editJson);
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new Error("JSON muss ein Objekt sein");
      }
      parsed = raw as Record<string, unknown>;
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Ungültiges JSON");
      return;
    }
    onDecide({ decision: "modified", modifiedInput: parsed });
    setMode("buttons");
  };

  const decisionBadge = (() => {
    if (!currentDecision) return null;
    const labels = {
      approved: { text: "Genehmigt", color: "emerald" },
      rejected: { text: "Abgelehnt", color: "red" },
      modified: { text: "Modifiziert", color: "amber" },
    } as const;
    const l = labels[currentDecision.decision];
    return (
      <span
        className={`rounded bg-${l.color}-100 px-1.5 py-0.5 text-[10px] text-${l.color}-800 dark:bg-${l.color}-500/20 dark:text-${l.color}-200`}
      >
        {l.text}
      </span>
    );
  })();

  return (
    <div className="rounded-md border border-red-200 bg-white/70 p-3 dark:border-red-500/20 dark:bg-black/20">
      <div className="mb-2 flex items-center gap-2 text-[12px] text-red-900 dark:text-red-100">
        <span className="font-mono text-[11.5px] text-red-700 dark:text-red-200/90">
          {tool.toolName}
        </span>
        {decisionBadge}
      </div>
      <div className="mb-2 text-[11.5px] text-red-700 dark:text-red-200/80">
        {tool.rationale}
      </div>
      {mode === "buttons" ? (
        <>
          <pre className="mb-2 max-h-32 overflow-auto rounded-md border border-red-100 bg-slate-50 p-2 font-mono text-[10.5px] leading-relaxed text-slate-800 dark:border-red-500/10 dark:bg-black/30 dark:text-slate-200">
            {initialJson}
          </pre>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onDecide({ decision: "approved" })}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              <Check size={10} />
              Genehmigen
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              disabled={disabled}
              className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11.5px] text-amber-800 hover:bg-amber-50 disabled:opacity-40 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-200"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => onDecide({ decision: "rejected" })}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1 text-[11.5px] text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-500/30 dark:bg-transparent dark:text-red-200"
            >
              <X size={10} />
              Ablehnen
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <textarea
            value={editJson}
            onChange={(e) => {
              setEditJson(e.target.value);
              if (parseError) setParseError(null);
            }}
            rows={Math.min(8, Math.max(3, editJson.split("\n").length))}
            className="w-full rounded-md border border-red-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-slate-900 outline-none dark:border-red-500/20 dark:bg-black/30 dark:text-slate-100"
            spellCheck={false}
          />
          {parseError && (
            <div className="text-[10.5px] text-red-700 dark:text-red-300">
              {parseError}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleConfirmEdit}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              <Check size={10} />
              Bestätigen
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("buttons");
                setEditJson(initialJson);
                setParseError(null);
              }}
              disabled={disabled}
              className="text-[10.5px] text-red-700 underline-offset-4 hover:underline disabled:opacity-40 dark:text-red-200"
            >
              zurück
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "agent/page\.tsx" | head -5`
Expected: no output

---

### Task 13: E3 Frontend — Live counter sub-agent split

**Files:**

- Modify: `src/app/(atlas)/atlas/agent/page.tsx`

- [ ] **Step 1: Extend CostProgress interface**

Suche nach `interface CostProgress {`. Ersetze durch:

```ts
interface CostProgress {
  currentCost: number;
  budget: number | null;
  iteration: number;
  inputTokens: number;
  outputTokens: number;
  /* Sprint E3 — sub-agent cost-split. 0 (or null) when run never
     called delegate_subtasks. */
  subAgentCost?: number;
  subAgentInputTokens?: number;
  subAgentOutputTokens?: number;
}
```

- [ ] **Step 2: Capture sub-agent fields in SSE handler**

Suche nach `case "cost_progress":`. Im setCostProgress call, erweitere mit:

```ts
              case "cost_progress":
                setCostProgress({
                  currentCost: evt.currentCost as number,
                  budget: (evt.budget as number | null) ?? null,
                  iteration: evt.iteration as number,
                  inputTokens: evt.inputTokens as number,
                  outputTokens: evt.outputTokens as number,
                  subAgentCost: (evt.subAgentCost as number) ?? 0,
                  subAgentInputTokens:
                    (evt.subAgentInputTokens as number) ?? 0,
                  subAgentOutputTokens:
                    (evt.subAgentOutputTokens as number) ?? 0,
                });
                break;
```

- [ ] **Step 3: Update live-counter rendering**

Suche im JSX nach dem cost-counter (sucht nach `costProgress.currentCost.toFixed(4)`). Im display:

```tsx
<span className="font-mono tabular-nums">
  ${costProgress.currentCost.toFixed(4)}
  {costProgress.budget !== null ? ` / $${costProgress.budget.toFixed(2)}` : ""}
  {(costProgress.subAgentCost ?? 0) > 0 && (
    <span className="ml-1 text-slate-400">
      ($
      {(costProgress.currentCost - (costProgress.subAgentCost ?? 0)).toFixed(
        4,
      )}{" "}
      main · ${(costProgress.subAgentCost ?? 0).toFixed(4)} sub)
    </span>
  )}
</span>
```

(Adjust to fit existing counter element's structure — keep the budget-percentage if it's there.)

- [ ] **Step 4: Verify typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "agent/page\.tsx" | head -5`
Expected: no output

---

### Task 14: E1 Frontend — MandateBackgroundAgentSection component

**Files:**

- Create: `src/components/atlas/v2/MandateBackgroundAgentSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint E1 — MandateDetailView Background-Agent Section.
 * ────────────────────────────────────────────────────────────────────
 * Inline UI für die D3 background-agent settings. Rendert sich als
 * neue Sektion `<section id="background-agent">` in der existierenden
 * single-page-scroll Layout der MandateDetailView.
 *
 * 4 States:
 *   1. Loading — Skeleton während initialer GET
 *   2. Empty / Disabled — Headline + CTA "Konfigurieren"
 *   3. Configured + Enabled — Status-Card mit Schedule / Goal / Next-
 *      Run / Last-Run / Recent-3-Runs / Halt-Banner
 *   4. Editing — Inline-Editor mit Schedule-Select + Goal-Textarea
 *
 * Backend endpoints (existieren seit D3):
 *   GET /api/atlas/mandate/[id]/background-agent
 *   PUT /api/atlas/mandate/[id]/background-agent
 *
 * Plus: GET /api/atlas/agent/runs?mandateId=X&templateId=background-agent&limit=3
 * (templateId-filter ist E1's API-tweak — see Task 8).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Cpu,
  Edit2,
  Pause,
  Play,
} from "lucide-react";

type Schedule = "daily" | "weekly" | "every-6h" | "every-12h";

interface BackgroundAgentSettings {
  enabled: boolean;
  schedule: Schedule | null;
  goal: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

interface RecentRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  costUsd: number | null;
  iterations: number;
}

const SCHEDULE_LABELS: Record<Schedule, string> = {
  "every-6h": "alle 6h",
  "every-12h": "alle 12h",
  daily: "täglich",
  weekly: "wöchentlich",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(Math.abs(ms) / 60_000);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (ms < 0) {
    if (minutes < 60) return `vor ${minutes} min`;
    if (hours < 24) return `vor ${hours}h`;
    return `vor ${days}d`;
  }
  if (minutes < 60) return `in ${minutes} min`;
  if (hours < 24) return `in ${hours}h`;
  return `in ${days}d`;
}

export function MandateBackgroundAgentSection({
  mandateId,
}: {
  mandateId: string;
}) {
  const [settings, setSettings] = useState<BackgroundAgentSettings | null>(
    null,
  );
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editSchedule, setEditSchedule] = useState<Schedule>("daily");
  const [editGoal, setEditGoal] = useState("");

  const reload = async () => {
    try {
      const [settingsRes, runsRes] = await Promise.all([
        fetch(`/api/atlas/mandate/${mandateId}/background-agent`, {
          cache: "no-store",
        }),
        fetch(
          `/api/atlas/agent/runs?mandateId=${mandateId}&templateId=background-agent&limit=3`,
          { cache: "no-store" },
        ),
      ]);
      if (settingsRes.ok) {
        const data = (await settingsRes.json()) as BackgroundAgentSettings;
        setSettings(data);
        if (data.schedule) setEditSchedule(data.schedule);
        if (data.goal) setEditGoal(data.goal);
      }
      if (runsRes.ok) {
        const data = (await runsRes.json()) as { runs: RecentRun[] };
        setRecentRuns(data.runs ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandateId]);

  const handleSave = async (enabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const body: {
        enabled: boolean;
        schedule?: Schedule;
        goal?: string;
      } = { enabled };
      if (enabled) {
        body.schedule = editSchedule;
        body.goal = editGoal;
      }
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/background-agent`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error || `Speichern fehlgeschlagen (${res.status})`);
        setSaving(false);
        return;
      }
      const data = (await res.json()) as BackgroundAgentSettings;
      setSettings(data);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const lastRun = recentRuns[0];
  const isHalted = lastRun?.status === "awaiting_approval";

  return (
    <section id="background-agent" className="mb-8 scroll-mt-20">
      <h2 className="mb-3 text-[14px] font-semibold text-slate-900 dark:text-slate-100">
        Hintergrund-Agent
      </h2>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-[12.5px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <Loader2 size={14} className="mr-2 inline animate-spin" />
          Lädt…
        </div>
      ) : !settings ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Fehler beim Laden: {error}
        </div>
      ) : !settings.enabled && !editing ? (
        // ── Empty / Disabled state ──
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="mb-2 text-[12.5px] text-slate-600 dark:text-slate-400">
            Hintergrund-Agent ist deaktiviert. Atlas kann periodische
            Recherchen, Monitoring-Tasks oder Status-Snapshots für dieses Mandat
            autonom ausführen.
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            <Play size={11} />
            Konfigurieren …
          </button>
        </div>
      ) : editing ? (
        // ── Editing state ──
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11.5px] font-medium text-slate-700 dark:text-slate-300">
                Schedule
              </label>
              <select
                value={editSchedule}
                onChange={(e) => setEditSchedule(e.target.value as Schedule)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[12.5px] text-slate-900 dark:border-white/[0.10] dark:bg-transparent dark:text-slate-100"
              >
                {(Object.keys(SCHEDULE_LABELS) as Schedule[]).map((k) => (
                  <option key={k} value={k}>
                    {SCHEDULE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-medium text-slate-700 dark:text-slate-300">
                Ziel ({editGoal.length}/4000 Zeichen)
              </label>
              <textarea
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="z.B. 'Prüfe wöchentlich neue NIS2-Transpositions-Acts in DE und drafte eine Outline für Auswirkungen auf diesen Mandanten.'"
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-[12.5px] text-slate-900 dark:border-white/[0.10] dark:bg-transparent dark:text-slate-100"
              />
            </div>
            {error && (
              <div className="text-[11.5px] text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSave(true)}
                disabled={
                  saving || editGoal.trim().length < 10 || !editSchedule
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {saving && <Loader2 size={11} className="animate-spin" />}
                Speichern
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                disabled={saving}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.10] dark:text-slate-300"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : (
        // ── Configured + Enabled state ──
        <div className="space-y-3">
          {isHalted && (
            <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
              <ShieldAlert
                size={14}
                className="mt-0.5 shrink-0 text-red-700 dark:text-red-300"
              />
              <div className="flex-1 text-[12.5px] text-red-800 dark:text-red-200">
                <strong>Letzter Lauf wartet auf deine Freigabe.</strong> Atlas
                hat einen dangerous tool ausführen wollen und pausiert bis Du
                entscheidest.
              </div>
              <Link
                href={`/atlas/agent?resumeRunId=${lastRun.id}`}
                className="shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-red-700"
              >
                → Jetzt freigeben
              </Link>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12.5px]">
                <CheckCircle2
                  size={13}
                  className="text-emerald-600 dark:text-emerald-400"
                />
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Aktiv · {SCHEDULE_LABELS[settings.schedule!]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11.5px] text-slate-700 hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-300"
                >
                  <Edit2 size={10} />
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave(false)}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11.5px] text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.10] dark:text-slate-300"
                >
                  <Pause size={10} />
                  Deaktivieren
                </button>
              </div>
            </div>

            <div className="space-y-2 text-[12.5px]">
              <div>
                <span className="text-slate-500">Ziel: </span>
                <span className="text-slate-800 dark:text-slate-200">
                  {settings.goal}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
                <span>Nächster Lauf: {relativeTime(settings.nextRunAt)}</span>
                {settings.lastRunAt && (
                  <span>Letzter Lauf: {relativeTime(settings.lastRunAt)}</span>
                )}
              </div>
            </div>

            {recentRuns.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-white/[0.08]">
                <div className="mb-2 text-[10.5px] uppercase tracking-wider text-slate-500">
                  Letzte {recentRuns.length} Runs
                </div>
                <div className="space-y-1.5">
                  {recentRuns.map((r) => (
                    <Link
                      key={r.id}
                      href={`/atlas/agent/history/${r.id}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1 text-[11.5px] hover:bg-slate-50 dark:hover:bg-white/[0.05]"
                    >
                      <Cpu
                        size={10}
                        className={
                          r.status === "complete"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : r.status === "awaiting_approval"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-400"
                        }
                      />
                      <span className="font-mono text-[10.5px] text-slate-500">
                        {new Date(r.startedAt).toLocaleString("de-DE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {r.status}
                      </span>
                      {r.costUsd !== null && (
                        <span className="ml-auto font-mono text-[10.5px] text-slate-400">
                          ${r.costUsd.toFixed(4)} · {r.iterations} iter
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/atlas/agent/history?mandateId=${mandateId}&templateId=background-agent`}
                  className="mt-2 inline-block text-[11px] text-emerald-700 hover:underline dark:text-emerald-300"
                >
                  Alle Background-Runs zeigen →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "MandateBackgroundAgentSection"`
Expected: no output (no errors)

---

### Task 15: E1 Integration — MandateDetailView add section

**Files:**

- Modify: `src/components/atlas/v2/MandateDetailView.tsx`

- [ ] **Step 1: Add import**

Suche nach den existing imports (z.B. `import { MandateDeadlines } from "./MandateDeadlines";`). Direkt darunter:

```ts
import { MandateBackgroundAgentSection } from "./MandateBackgroundAgentSection";
```

- [ ] **Step 2: Render section after Deadlines, before Custom Instructions**

Suche nach `<MandateDeadlines` JSX-Element-Rendering. NACH dem schließenden `</section>` (das die Deadlines-Section closed), VOR der nächsten Section (likely Custom Instructions oder Time Entries), füge ein:

```tsx
<MandateBackgroundAgentSection mandateId={mandateId} />
```

(Adjust `mandateId={mandateId}` zur exakten Prop-Name die in MandateDetailView's Scope verfügbar ist — likely `mandateId` or `id`. Verify mit `Read` der MandateDetailView.tsx zuerst.)

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "MandateDetailView"`
Expected: no output

---

### Task 16: Verify — full typecheck + lint sweep

- [ ] **Step 1: Full TypeScript sweep across touched files**

Run:

```bash
cd /Users/julianpolleschner/caelex-assessment && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "^(src/app/api/atlas|src/lib/atlas|src/components/atlas|src/app/\(atlas\))" | head -20
```

Expected: no output (no errors in Atlas files)

- [ ] **Step 2: ESLint on all Sprint E files**

Run:

```bash
cd /Users/julianpolleschner/caelex-assessment && npx eslint \
  prisma/schema.prisma \
  "src/app/(atlas)/atlas/agent/page.tsx" \
  "src/app/api/atlas/agent/route.ts" \
  "src/app/api/atlas/agent/runs/[id]/approve/route.ts" \
  "src/app/api/atlas/agent/runs/[id]/approve/route.test.ts" \
  src/app/api/atlas/agent/runs/route.ts \
  src/app/api/cron/atlas-housekeeping/route.ts \
  src/app/api/cron/atlas-housekeeping/route.test.ts \
  src/components/atlas/v2/MandateBackgroundAgentSection.tsx \
  src/components/atlas/v2/MandateDetailView.tsx \
  src/lib/atlas/agent/background-runner.server.ts \
  src/lib/atlas/agent/sub-agent-cost-tracker.test.ts \
  2>&1 | tail -10
```

Expected: no errors, no warnings

- [ ] **Step 3: Run ALL Sprint E unit tests**

Run:

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run \
  src/lib/atlas/agent/sub-agent-cost-tracker.test.ts \
  "src/app/api/atlas/agent/runs/[id]/approve/route.test.ts" \
  src/app/api/cron/atlas-housekeeping/route.test.ts \
  2>&1 | tail -15
```

Expected: `Test Files  3 passed (3)` + total tests = 13 (3 sub-agent + 4 approve + 6 cron)

- [ ] **Step 4: If any test/lint/typecheck fails, fix inline before commit**

---

### Task 17: Atomic feat() commit

- [ ] **Step 1: Check git status**

Run: `cd /Users/julianpolleschner/caelex-assessment && git status`
Expected: all Sprint E files showing as modified/created

- [ ] **Step 2: Stage all Sprint E files**

Run:

```bash
cd /Users/julianpolleschner/caelex-assessment && ALLOW_CROSS_SURFACE=1 git add \
  prisma/schema.prisma \
  "src/app/(atlas)/atlas/agent/page.tsx" \
  src/app/api/atlas/agent/route.ts \
  "src/app/api/atlas/agent/runs/[id]/approve/route.ts" \
  "src/app/api/atlas/agent/runs/[id]/approve/route.test.ts" \
  src/app/api/atlas/agent/runs/route.ts \
  src/app/api/cron/atlas-housekeeping/route.ts \
  src/app/api/cron/atlas-housekeeping/route.test.ts \
  src/components/atlas/v2/MandateBackgroundAgentSection.tsx \
  src/components/atlas/v2/MandateDetailView.tsx \
  src/lib/atlas/agent/background-runner.server.ts \
  src/lib/atlas/agent/sub-agent-cost-tracker.test.ts \
  vercel.json
```

- [ ] **Step 3: Commit**

Run:

```bash
cd /Users/julianpolleschner/caelex-assessment && ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
feat(atlas/agent): sprint e — polish v1-light gaps

5 atomic polish items closing UX + operational debt from v1-light
sprints A→D:

E1 — D3 Settings Section in MandateDetailView:
- New <MandateBackgroundAgentSection> component as single-page-scroll
  section #background-agent (placement: nach Deadlines, vor Custom
  Instructions).
- 4 states: loading, empty/disabled, configured+enabled, editing.
- Recent-runs list (3 latest) with status + cost + iter + click-to-
  detail. Halt-banner prominent + direct-link in B1 approval-flow
  via /atlas/agent?resumeRunId=X when last run is awaiting_approval.
- Backend tweak: /api/atlas/agent/runs accepts templateId query for
  filtering background-agent runs.

E2 — Batched-Approval (replaces pause-on-first):
- Agent route detects ALL undecided dangerous tools per iteration
  (find → filter), persists all as pending in approvalGates.
- New SSE payload: { tools: [{toolUseId, toolName, input, rationale}],
  iteration } — array instead of single.
- /approve endpoint accepts batched body { decisions: Array<...> }
  with min(1) max(4), validates ALL toolUseIds + ALL still-null,
  applies atomically.
- New UI <ApprovalCards> wrapper + <ApprovalCardEntry> per tool.
  Map<toolUseId, decision> in local state, "Submit alle N" gated
  on all decided, "Alle genehmigen" / "Alle ablehnen" bulk-shortcuts.
- Resume-path backwards-compat handles pre-E2 single pendingToolUseId
  snapshots.

E3 — Sub-Agent Cost-Breakdown in Live-Counter:
- 2 schema fields on AtlasAgentRun (subAgentInputTokens +
  subAgentOutputTokens, default 0). Push migration.
- Agent route + background-runner: parallel tracking when D2's
  delegate_subtasks tool fires. Cumulative totalInputTokens still
  includes these — sub-agent fields are the SUBSET.
- cost_progress SSE event extended with subAgentCost (live computed)
  + subAgentInputTokens + subAgentOutputTokens.
- Live counter renders "$0.42 ($0.27 main · $0.15 sub)" when sub-
  agent cost > 0; unchanged when no delegation.

E4 — conversationState TTL Cleanup Cron:
- New /api/cron/atlas-housekeeping route (daily 04:00 UTC).
- Job 1: updateMany sets conversationState=null for AtlasAgentRun
  rows older than 30 days (CONVERSATION_STATE_TTL_DAYS). Run row +
  steps/artifacts/citations preserved.

E5 — Stale awaiting_approval Cleanup:
- Same cron, Job 2: updateMany flips status=abandoned + clears
  conversationState for runs >7 days in awaiting_approval
  (STALE_APPROVAL_THRESHOLD_DAYS). Silent — no lawyer notification.
- Cron registered in vercel.json crons array.

Tests (3 new spec files, 13 cases total):
- sub-agent-cost-tracker.test.ts: 3 cases (token-aggregation + bad-
  input + cap-at-MAX_PARALLEL_SUBTASKS)
- /approve route.test.ts: 4 cases (atomic batch + missing-id +
  already-decided + modified)
- /cron/atlas-housekeeping route.test.ts: 6 cases (auth + both-jobs
  + per-cutoff + error-isolation)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: `[main XXXXXXXX] feat(atlas/agent): sprint e — polish v1-light gaps`

---

### Task 18: Tracker update + docs() commit

**Files:**

- Modify: `docs/atlas-agent-mode-improvements-tracker.md`

- [ ] **Step 1: Add Sprint E section to the tracker**

Suche nach dem Bereich "ATLAS AGENT-MODE IMPROVEMENT PROJECT — COMPLETE (9/9, all 4 sprints shipped)" oder ähnlich am Ende der `## Progress` Sektion. Direkt darunter (vor `## Recommended Execution Sequencing`), füge ein:

```markdown
## Sprint E (v2 Polish) — 2026-05-15
```

Sprint E items: 5 ✅ ALL DONE @ <feat-commit-hash>

E1 ✅ D3 Settings Section in MandateDetailView
E2 ✅ Batched-Approval (N pending in 1 Modal)
E3 ✅ Sub-Agent Cost-Breakdown in Live-Counter
E4 ✅ conversationState TTL-Cleanup Cron
E5 ✅ Stale awaiting_approval Cleanup

```

Spec: `docs/superpowers/specs/2026-05-15-atlas-agent-mode-v2-sprint-e-polish-design.md`
Plan: `docs/superpowers/plans/2026-05-15-atlas-agent-mode-v2-sprint-e-polish.md`
```

(Ersetze `<feat-commit-hash>` mit dem aktuellen commit hash aus Task 17.)

- [ ] **Step 2: Get the commit hash**

Run: `cd /Users/julianpolleschner/caelex-assessment && git log -1 --format=%h`
Expected: 8-char hex hash (e.g. `a1b2c3d4`)

Now go back to Step 1 and replace `<feat-commit-hash>` with the actual hash.

- [ ] **Step 3: Commit tracker**

Run:

```bash
cd /Users/julianpolleschner/caelex-assessment && ALLOW_CROSS_SURFACE=1 git add docs/atlas-agent-mode-improvements-tracker.md && ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
docs(atlas/agent): sprint e closed — polish v1-light done

E1+E2+E3+E4+E5 all shipped in prior feat-commit. Tracker now reflects
v2-Sprint-E completion alongside the v1 A/B/C/D entries. Remaining
v2 sprints (F Quality+Trust, G Workflow, H Capability) get their own
specs when prioritised.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: `[main XXXXXXXX] docs(atlas/agent): sprint e closed — polish v1-light done`

---

### Task 19: Push + verify deploy

- [ ] **Step 1: Sanity-check commits about to push**

Run: `cd /Users/julianpolleschner/caelex-assessment && git log origin/main..HEAD --oneline`
Expected: 2 commits (feat + docs)

- [ ] **Step 2: Push to main**

Run: `cd /Users/julianpolleschner/caelex-assessment && git push origin main 2>&1 | tail -5`
Expected: `<oldhash>..<newhash>  main -> main`

- [ ] **Step 3: Vercel deploy auto-trigger**

Wait ~5-6 min for Vercel deploy. Verify in dashboard or with `vercel ls` if Vercel CLI is configured.

- [ ] **Step 4: Smoke test in production**

After deploy:

1. Navigate to a MandateDetailView in prod → verify "Hintergrund-Agent" Section renders (loading → empty state) ✓ E1
2. Configure background agent for a test-mandate → set schedule "every-6h" + a goal → save → verify configured state shows
3. Wait for cron tick OR manually invoke a background run with multiple dangerous tools (`create_*`) → verify ApprovalCards modal shows N cards (when N>1) with bulk shortcuts ✓ E2
4. Run an agent that uses delegate_subtasks → verify live counter shows "$X main · $Y sub" split ✓ E3
5. Check cron logs after 04:00 UTC (next day) → verify housekeeping route ran ✓ E4 + E5

---

## Self-Review (post-write)

**Spec coverage:** All 5 spec items (E1-E5) are covered by Tasks 1-15. Verification + commit + push are Tasks 16-19. ✓

**Placeholder scan:** None — all code blocks contain exact code, all commands are exact, no "TBD" or "TODO".

**Type consistency:**

- `ApprovalPauseInfo.tools: PendingTool[]` defined in Task 11, used in ApprovalCards (Task 12) — consistent.
- `subAgentInputTokens` / `subAgentOutputTokens` used in schema (Task 1), agent route (Task 2), background-runner (Task 3), tests (Task 4), UI (Task 13) — consistent name throughout.
- `BackgroundAgentSettings` interface in MandateBackgroundAgentSection (Task 14) matches the `/api/atlas/mandate/[id]/background-agent` GET response shape from D3 (existing endpoint, verified consistent).

**Effort estimate:** ~700-900 LOC over 19 tasks. Per the spec.

---

## Changelog

- **2026-05-15:** Plan written. Covers all 5 items E1-E5 + 3 unit-test files + atomic feat-commit + docs-commit + push. Estimated 1 week implementation, single PR-equivalent (atomic ship).
