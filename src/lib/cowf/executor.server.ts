/**
 * COWF Step Executor — kind-dispatching step runner (Sprint 3D)
 *
 * The executor is the runtime brain of COWF. Given a workflow instance
 * and a step key, it:
 *
 *   1. Loads the workflow's def from the registry
 *   2. Finds the step by key
 *   3. Builds a StepContext (workflow + subject + state-bag)
 *   4. Dispatches to the right kind-handler (action/decision/astra/...)
 *   5. The handler emits STEP_STARTED + STEP_COMPLETED events,
 *      possibly transitions the workflow's currentState, and may
 *      schedule the NEXT auto-fire step
 *
 * **Sprint 3D scope:**
 *
 *   - **Action executor** — fully wired (calls user-provided run, advances state)
 *   - **Decision executor** — fully wired (predicate eval + branch routing)
 *   - **Astra / Form / Approval / WaitForEvent / QES** — STUB executors
 *     that emit STEP_STARTED only. They're "waiting" steps — execution
 *     completes when an external event arrives (Astra-V2 callback, form
 *     submit, approval click, listener fire, D-Trust callback).
 *
 *   The stubs unblock W3 today (it uses action + decision + astra).
 *   Action + Decision drive the heartbeat → snapshot → drift-decision →
 *   close path end-to-end. Astra-stub emits STEP_STARTED but the
 *   ASTRA_REASONING event + AstraProposal generation lands in a future
 *   sprint that wires `comply-v2/astra-engine.server.ts`.
 *
 * **Auto-fire propagation:**
 *
 *   When a step completes and transitions to a new state, we look up
 *   any NEXT step whose `from` matches the new state AND has
 *   `autoFireOnEnter: true`. If found, we recurse into `executeStep` —
 *   so a chain of action+decision steps runs to completion in one
 *   invocation.
 *
 *   Recursion has a hard cap (MAX_AUTO_CHAIN_DEPTH=20) to prevent
 *   infinite loops on misconfigured workflows. Sprint 3B's validator
 *   should catch most cycles, but the runtime cap is defence-in-depth.
 */

import "server-only";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { appendWorkflowEvent } from "./events.server";
import { advanceState } from "./instances.server";
import { getWorkflowDefById } from "./registry.server";
import type { StepContext } from "./steps";
import type { StoredStep } from "./types";
import { WorkflowEventType } from "./types";

/** Hard cap on auto-fire recursion. Prevents stuck workflows from blowing the stack. */
export const MAX_AUTO_CHAIN_DEPTH = 20;

// ─── Public API ────────────────────────────────────────────────────────────

export interface ExecuteStepInput {
  workflowId: string;
  stepKey: string;
  /** What triggered this execution? "schedule" | "listener" | "user:<id>" | "system" */
  causedBy: string;
  /** Recursion depth — used internally for the auto-fire chain. */
  _depth?: number;
}

export interface ExecuteStepResult {
  fired: boolean;
  /** Reason if not fired. */
  skipReason?:
    | "workflow-not-found"
    | "def-not-registered"
    | "step-not-found"
    | "state-mismatch"
    | "max-depth-reached"
    | "stub-step-type";
  /** State after execution, if it changed. */
  newState?: string;
  /** Did the executor recurse into a follow-up auto-fire step? */
  autoFiredNext: boolean;
}

/**
 * Run a single step. Idempotent against state-mismatch — if the workflow
 * has already advanced past the step's `from` state, we skip cleanly.
 */
export async function executeStep(
  input: ExecuteStepInput,
): Promise<ExecuteStepResult> {
  const depth = input._depth ?? 0;
  if (depth >= MAX_AUTO_CHAIN_DEPTH) {
    logger.warn("[cowf-executor] max auto-chain depth reached", {
      workflowId: input.workflowId,
      stepKey: input.stepKey,
      depth,
    });
    return {
      fired: false,
      skipReason: "max-depth-reached",
      autoFiredNext: false,
    };
  }

  // 1. Load instance + def
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operatorWorkflowInstance = (prisma as any).operatorWorkflowInstance;
  const instance = await operatorWorkflowInstance.findUnique({
    where: { id: input.workflowId },
    select: {
      id: true,
      defId: true,
      currentState: true,
      organizationId: true,
      userId: true,
      subjectType: true,
      subjectId: true,
      pausedUntil: true,
      completedAt: true,
    },
  });
  if (!instance) {
    return {
      fired: false,
      skipReason: "workflow-not-found",
      autoFiredNext: false,
    };
  }
  if (instance.completedAt) {
    return { fired: false, skipReason: "state-mismatch", autoFiredNext: false };
  }

  const def = getWorkflowDefById(instance.defId);
  if (!def) {
    logger.error(
      "[cowf-executor] def not in registry — workflow definition missing in this app version",
      { workflowId: input.workflowId, defId: instance.defId },
    );
    return {
      fired: false,
      skipReason: "def-not-registered",
      autoFiredNext: false,
    };
  }

  // 2. Find the step in the def's stored steps
  const step = def.storedInput.steps.find((s) => s.key === input.stepKey);
  if (!step) {
    return {
      fired: false,
      skipReason: "step-not-found",
      autoFiredNext: false,
    };
  }

  // 3. State-mismatch guard — only fire steps whose `from` matches current state
  if (step.from && step.from !== instance.currentState) {
    logger.info("[cowf-executor] state mismatch — skipping", {
      workflowId: input.workflowId,
      stepKey: input.stepKey,
      stepFrom: step.from,
      currentState: instance.currentState,
    });
    return {
      fired: false,
      skipReason: "state-mismatch",
      autoFiredNext: false,
    };
  }

  // 4. Build context
  const ctx: StepContext = {
    workflowId: instance.id,
    organizationId: instance.organizationId,
    userId: instance.userId,
    subjectType: instance.subjectType,
    subjectId: instance.subjectId,
    currentState: instance.currentState,
    state: {},
  };

  // 5. Emit STEP_STARTED event
  await appendWorkflowEvent({
    workflowId: input.workflowId,
    eventType: WorkflowEventType.STEP_STARTED,
    causedBy: input.causedBy,
    payload: {
      stepKey: input.stepKey,
      stepKind: step.kind,
      fromState: step.from,
    },
  });

  // 6. Dispatch to kind-handler
  const handlers = def.handlers.get(input.stepKey);
  let outcome: { transitionedTo?: string; nextAutoStepKey?: string };
  try {
    outcome = await dispatch(step, ctx, handlers, input);
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    logger.error("[cowf-executor] step handler threw", {
      workflowId: input.workflowId,
      stepKey: input.stepKey,
      kind: step.kind,
      error: message,
    });
    await appendWorkflowEvent({
      workflowId: input.workflowId,
      eventType: WorkflowEventType.ERROR,
      causedBy: input.causedBy,
      payload: {
        stepKey: input.stepKey,
        stepKind: step.kind,
        message,
      },
    });
    return { fired: true, autoFiredNext: false };
  }

  // 7. If the handler did NOT transition (e.g. waiting steps), we're done.
  if (!outcome.transitionedTo) {
    return { fired: true, autoFiredNext: false };
  }

  // 8. Advance state
  await advanceState({
    workflowId: input.workflowId,
    toState: outcome.transitionedTo,
    causedBy: input.causedBy,
    payload: { fromStep: input.stepKey },
  });

  // 9. Emit STEP_COMPLETED for symmetry with STEP_STARTED
  await appendWorkflowEvent({
    workflowId: input.workflowId,
    eventType: WorkflowEventType.STEP_COMPLETED,
    causedBy: input.causedBy,
    payload: {
      stepKey: input.stepKey,
      stepKind: step.kind,
      toState: outcome.transitionedTo,
    },
    resultingState: outcome.transitionedTo,
  });

  // 10. Auto-fire chain: find a step whose `from` matches the new state
  //     AND has autoFireOnEnter:true (or is a decision/astra step which
  //     auto-fire by default per the factory defaults).
  const nextKey =
    outcome.nextAutoStepKey ??
    findAutoFireStepFor(def.storedInput.steps, outcome.transitionedTo);
  let autoFiredNext = false;
  if (nextKey) {
    const recurseResult = await executeStep({
      workflowId: input.workflowId,
      stepKey: nextKey,
      causedBy: `auto-chain:${input.stepKey}`,
      _depth: depth + 1,
    });
    autoFiredNext = recurseResult.fired;
  }

  return {
    fired: true,
    newState: outcome.transitionedTo,
    autoFiredNext,
  };
}

// ─── Kind Dispatcher ───────────────────────────────────────────────────────

interface DispatchOutcome {
  transitionedTo?: string;
  nextAutoStepKey?: string;
}

async function dispatch(
  step: StoredStep,
  ctx: StepContext,
  handlers:
    | { run?: (ctx: StepContext) => Promise<void> | void; validate?: unknown }
    | undefined,
  input: ExecuteStepInput,
): Promise<DispatchOutcome> {
  switch (step.kind) {
    case "action":
      return executeAction(step, ctx, handlers);
    case "decision":
      return executeDecision(step, ctx);
    case "astra":
      return executeAstraStub(step, ctx, input);
    case "form":
      return executeFormStub(step, ctx, input);
    case "approval":
      return executeApprovalStub(step, ctx, input);
    case "waitForEvent":
      return executeWaitForEventStub(step, ctx, input);
    case "qes":
      return executeQesStub(step, ctx, input);
    default: {
      // Exhaustiveness check — TypeScript will error if a new kind is
      // added without a case here.
      const _exhaustive: never = step;
      void _exhaustive;
      return {};
    }
  }
}

// ─── Action Executor (Sprint 3D — fully wired) ─────────────────────────────

async function executeAction(
  step: Extract<StoredStep, { kind: "action" }>,
  ctx: StepContext,
  handlers: { run?: (ctx: StepContext) => Promise<void> | void } | undefined,
): Promise<DispatchOutcome> {
  if (handlers?.run) {
    await handlers.run(ctx);
  }
  // Action steps always transition to step.to on success.
  return { transitionedTo: step.to };
}

// ─── Decision Executor (Sprint 3D — fully wired) ───────────────────────────

/**
 * Evaluate decision branches against the StepContext's state-bag. Pick
 * the first matching branch. Each branch's predicate is a JSON object
 * compared against `ctx.state` using `evaluatePredicate()`.
 *
 * Returns `nextAutoStepKey` (the chosen branch's step key) so the
 * auto-chain can recurse into it. The transition state is `branch.to`
 * if specified, else `step.to`.
 *
 * If NO branch matches, the workflow stays in the decision step's
 * `from` state — a warning is logged, but no error event is emitted
 * (waiting for new context to arrive).
 */
async function executeDecision(
  step: Extract<StoredStep, { kind: "decision" }>,
  ctx: StepContext,
): Promise<DispatchOutcome> {
  for (const branch of step.branches) {
    if (evaluatePredicate(branch.predicate, ctx.state)) {
      return {
        transitionedTo: branch.to ?? step.to,
        nextAutoStepKey: branch.step,
      };
    }
  }
  logger.warn("[cowf-executor] decision step matched no branch", {
    workflowId: ctx.workflowId,
    stepKey: step.key,
    state: ctx.state,
  });
  return {};
}

/**
 * Evaluate a predicate against a state-bag. Predicates use a tiny
 * MongoDB-flavoured shape: `{ key: { equals: x } }` or `{ key: { not: x } }`
 * or `{ key: x }` (shortcut for equals).
 *
 * Sprint 3D's predicates are deliberately simple. Sprint 9 (COE) will
 * grow this into a richer expression language if needed.
 */
export function evaluatePredicate(
  predicate: Record<string, unknown>,
  state: Record<string, unknown>,
): boolean {
  for (const [key, condition] of Object.entries(predicate)) {
    const value = state[key];
    if (
      condition !== null &&
      typeof condition === "object" &&
      !Array.isArray(condition)
    ) {
      const cond = condition as Record<string, unknown>;
      if ("equals" in cond) {
        if (value !== cond.equals) return false;
      } else if ("not" in cond) {
        if (value === cond.not) return false;
      } else {
        // Unknown operator — treat as no-match
        return false;
      }
    } else {
      // Shortcut: { key: literal } means equals
      if (value !== condition) return false;
    }
  }
  return true;
}

// ─── Stub Executors ────────────────────────────────────────────────────────

/**
 * Astra stub. Sprint 3D emits STEP_STARTED only. A future sprint wires
 * the Astra-V2 engine and emits ASTRA_REASONING + transitions the state
 * when the LLM-loop finishes.
 */
async function executeAstraStub(
  step: Extract<StoredStep, { kind: "astra" }>,
  ctx: StepContext,
  input: ExecuteStepInput,
): Promise<DispatchOutcome> {
  logger.info("[cowf-executor] astra-step stub", {
    workflowId: ctx.workflowId,
    stepKey: step.key,
    promptTemplate: step.promptTemplate,
    causedBy: input.causedBy,
  });
  // No transition — waiting for Astra-engine integration.
  return {};
}

/**
 * Form stub. Forms transition only when the form-submit API receives
 * the user's data. Sprint 3D registers the wait but doesn't transition.
 */
async function executeFormStub(
  step: Extract<StoredStep, { kind: "form" }>,
  ctx: StepContext,
  input: ExecuteStepInput,
): Promise<DispatchOutcome> {
  logger.info("[cowf-executor] form-step stub (waiting for submit)", {
    workflowId: ctx.workflowId,
    stepKey: step.key,
    requireRoles: step.requireRoles,
    causedBy: input.causedBy,
  });
  return {};
}

/**
 * Approval stub. Creates one WorkflowApprovalSlot per requireRole; the
 * transition fires when the dedicated approve-API marks all slots as
 * approved.
 */
async function executeApprovalStub(
  step: Extract<StoredStep, { kind: "approval" }>,
  ctx: StepContext,
  input: ExecuteStepInput,
): Promise<DispatchOutcome> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slot = (prisma as any).workflowApprovalSlot;
  // Idempotent: existing slots for (workflow, step, role) are not duplicated.
  for (const role of step.requireRoles) {
    await slot.upsert({
      where: {
        workflowId_stepKey_requiredRole: {
          workflowId: ctx.workflowId,
          stepKey: step.key,
          requiredRole: role,
        },
      },
      update: {},
      create: {
        workflowId: ctx.workflowId,
        stepKey: step.key,
        requiredRole: role,
      },
    });
  }
  logger.info(
    "[cowf-executor] approval-step stub (slots created, waiting for sign-off)",
    {
      workflowId: ctx.workflowId,
      stepKey: step.key,
      slots: step.requireRoles,
      causedBy: input.causedBy,
    },
  );
  return {};
}

/**
 * WaitForEvent stub. Registers a WorkflowEventListener row. The
 * listener-firing path (event-publisher matches predicate, fires the
 * step) lands in the event-publisher service; Sprint 3D writes the
 * listener row only.
 */
async function executeWaitForEventStub(
  step: Extract<StoredStep, { kind: "waitForEvent" }>,
  ctx: StepContext,
  input: ExecuteStepInput,
): Promise<DispatchOutcome> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listener = (prisma as any).workflowEventListener;
  await listener.create({
    data: {
      workflowId: ctx.workflowId,
      stepKey: step.key,
      eventType: step.eventType,
      predicate: (step.predicate ?? null) as unknown as object | null,
      status: "ACTIVE",
      // Timeout handling lands in the event-publisher service.
    },
  });
  await appendWorkflowEvent({
    workflowId: ctx.workflowId,
    eventType: WorkflowEventType.WAIT_REGISTERED,
    causedBy: input.causedBy,
    payload: {
      stepKey: step.key,
      eventType: step.eventType,
      predicate: step.predicate ?? null,
    },
  });
  return {};
}

/**
 * QES stub. Sprint 3D does NOT integrate with D-Trust. Emits
 * STEP_STARTED only; the actual signing flow lands in Sprint 8
 * (Witness-Network + OpenTimestamps).
 */
async function executeQesStub(
  step: Extract<StoredStep, { kind: "qes" }>,
  ctx: StepContext,
  input: ExecuteStepInput,
): Promise<DispatchOutcome> {
  logger.info("[cowf-executor] qes-step stub (D-Trust integration pending)", {
    workflowId: ctx.workflowId,
    stepKey: step.key,
    documentRefs: step.documentRefs,
    causedBy: input.causedBy,
  });
  return {};
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Find the next step that should fire automatically when the workflow
 * enters `state`. Uses these criteria:
 *
 *   - step.from === state
 *   - step.autoFireOnEnter !== false (defaults true for action/astra/decision,
 *     false for form/approval/waitForEvent/qes per factory defaults)
 *
 * Returns null if no such step exists. Multiple matching steps would
 * be ambiguous; defineWorkflow's validator should catch that, but we
 * pick the first match here as a defensive default.
 */
export function findAutoFireStepFor(
  steps: readonly StoredStep[],
  state: string,
): string | null {
  for (const step of steps) {
    if (step.from !== state) continue;
    if (step.autoFireOnEnter === false) continue;
    return step.key;
  }
  return null;
}
