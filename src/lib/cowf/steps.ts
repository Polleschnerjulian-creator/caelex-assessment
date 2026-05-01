/**
 * COWF Step Factories — `step.*` DSL functions (Sprint 3B)
 *
 * Each factory takes the kind-specific config and returns a `StoredStep`
 * (the JSONB-persisted shape from types.ts). At Sprint 3B we only
 * materialise the StoredStep representation — the actual handler logic
 * (run/onSubmit/etc.) lands in Sprint 3D when the executors are built.
 *
 * **Why the DSL splits "stored" from "code":**
 *
 *   The canonical COWF design (per the foundation doc, section 4):
 *
 *     - **Stored shape**: serialisable JSON describing the step's structure
 *       — its key, from/to states, ui-labels, schemas, etc. Lives in
 *       `OperatorWorkflowDef.steps` so old instances can be replayed even
 *       after the code changes.
 *     - **Handler shape**: TypeScript closures (run / onTimeout / etc.)
 *       that the engine invokes when the step fires. NOT persisted —
 *       lives in code. Bumping `version` is required if the closure
 *       semantics change in a way that affects in-flight instances.
 *
 *   Sprint 3B materialises the stored shape only. Each factory returns
 *   a StoredStep AND a separate `handlers` object (kept in memory, used
 *   later by Sprint 3D's executor). The factory return shape is
 *   deliberately rich so consumers see both halves but only the stored
 *   half gets serialised.
 *
 * Reference: docs/CAELEX-OPERATOR-WORKFLOW-FOUNDATION.md (Section 5 + 6)
 */

import type {
  StoredActionStep,
  StoredApprovalStep,
  StoredAstraStep,
  StoredDecisionStep,
  StoredFormStep,
  StoredQesStep,
  StoredStep,
  StoredWaitStep,
} from "./types";

// ─── Common base ───────────────────────────────────────────────────────────

interface BaseStepConfig {
  key: string;
  from: string;
  to: string;
  uiLabel?: string;
  uiHint?: string;
  autoFireOnEnter?: boolean;
}

// ─── Step.action ───────────────────────────────────────────────────────────

/**
 * Synchronous code-run step. Wrapping an async function gives us:
 *   - Deterministic step boundaries for the audit trail
 *   - Single place for retries / error capture
 *   - Cleaner refactoring than scattering `await someService()` across
 *     workflow handlers
 *
 * The handler `run(ctx)` is NOT serialised. It must be re-bound each
 * time the engine starts via `attachHandlers()`.
 */
export interface ActionStepConfig extends BaseStepConfig {
  /** Side-effecting work executed on step-enter. */
  run: (ctx: StepContext) => Promise<void> | void;
}

export function action(config: ActionStepConfig): StepHandle<StoredActionStep> {
  return {
    stored: {
      kind: "action",
      key: config.key,
      from: config.from,
      to: config.to,
      uiLabel: config.uiLabel,
      uiHint: config.uiHint,
      autoFireOnEnter: config.autoFireOnEnter ?? true,
    },
    handlers: { run: config.run },
  };
}

// ─── Step.form ─────────────────────────────────────────────────────────────

/**
 * Wait-for-form-submit step. The engine creates a placeholder UI form
 * with the supplied schema; on submit, the engine validates and then
 * advances. Schema is JSON-Schema-compatible so we can keep using zod
 * in code while persisting the descriptor.
 */
export interface FormStepConfig extends BaseStepConfig {
  schema?: Record<string, unknown>;
  requireRoles?: string[];
  /** Validator invoked after JSON-Schema check passes. */
  validate?: (data: unknown, ctx: StepContext) => string | null;
}

export function form(config: FormStepConfig): StepHandle<StoredFormStep> {
  return {
    stored: {
      kind: "form",
      key: config.key,
      from: config.from,
      to: config.to,
      uiLabel: config.uiLabel,
      uiHint: config.uiHint,
      autoFireOnEnter: false, // forms are operator-driven by definition
      schema: config.schema,
      requireRoles: config.requireRoles,
    },
    handlers: { validate: config.validate },
  };
}

// ─── Step.approval ─────────────────────────────────────────────────────────

/**
 * Multi-actor approval step. The engine writes one `WorkflowApprovalSlot`
 * per role in `requireRoles`. The transition only fires when ALL slots
 * are approved (rejected slot reverts the workflow).
 */
export interface ApprovalStepConfig extends BaseStepConfig {
  requireRoles: string[];
  qesRequired?: boolean;
  slaBy?:
    | { offsetFromState: string; hours: number }
    | { offsetFromState: string; days: number };
  escalations?: Array<{ atOffsetHours: number; action: string }>;
}

export function approval(
  config: ApprovalStepConfig,
): StepHandle<StoredApprovalStep> {
  if (!config.requireRoles || config.requireRoles.length === 0) {
    throw new Error(
      `step.approval(${config.key}): requireRoles must contain at least one role`,
    );
  }
  return {
    stored: {
      kind: "approval",
      key: config.key,
      from: config.from,
      to: config.to,
      uiLabel: config.uiLabel,
      uiHint: config.uiHint,
      autoFireOnEnter: false,
      requireRoles: config.requireRoles,
      qesRequired: config.qesRequired,
      slaBy: config.slaBy,
      escalations: config.escalations,
    },
    handlers: {},
  };
}

// ─── Step.astra ────────────────────────────────────────────────────────────

/**
 * AI-reasoning step. Sprint 3B persists the prompt-template name +
 * citation/loop config. Sprint 3D plugs in the actual Astra V2 engine
 * call (`src/lib/comply-v2/astra-engine.server.ts`). Per AI-Act Art. 12,
 * every Astra-step's decisionLog gets a hash-chained WorkflowEvent.
 */
export interface AstraStepConfig extends BaseStepConfig {
  promptTemplate: string;
  requiredCitations?: boolean;
  maxLoops?: number;
  modelOverride?: string;
}

export function astra(config: AstraStepConfig): StepHandle<StoredAstraStep> {
  if (!config.promptTemplate) {
    throw new Error(`step.astra(${config.key}): promptTemplate is required`);
  }
  return {
    stored: {
      kind: "astra",
      key: config.key,
      from: config.from,
      to: config.to,
      uiLabel: config.uiLabel,
      uiHint: config.uiHint,
      autoFireOnEnter: config.autoFireOnEnter ?? true,
      promptTemplate: config.promptTemplate,
      requiredCitations: config.requiredCitations ?? true,
      maxLoops: config.maxLoops ?? 5,
      modelOverride: config.modelOverride,
    },
    handlers: {},
  };
}

// ─── Step.waitForEvent ─────────────────────────────────────────────────────

/**
 * Event-driven wait. Engine registers a `WorkflowEventListener` with
 * `eventType` + `predicate`. When an event matching both fires, the
 * workflow advances. Optional timeout creates a parallel
 * `WorkflowSchedule` that fires `onTimeout` if the event never arrives.
 */
export interface WaitStepConfig extends BaseStepConfig {
  eventType: string;
  predicate?: Record<string, unknown>;
  timeout?:
    | { offsetFromState: string; hours: number }
    | { offsetFromState: string; days: number };
  /** Step-key to fire on timeout (must exist in the same workflow). */
  onTimeout?: string;
  reminders?: { intervalDays: number };
}

export function waitForEvent(
  config: WaitStepConfig,
): StepHandle<StoredWaitStep> {
  if (!config.eventType) {
    throw new Error(`step.waitForEvent(${config.key}): eventType is required`);
  }
  return {
    stored: {
      kind: "waitForEvent",
      key: config.key,
      from: config.from,
      to: config.to,
      uiLabel: config.uiLabel,
      uiHint: config.uiHint,
      autoFireOnEnter: false,
      eventType: config.eventType,
      predicate: config.predicate,
      timeout: config.timeout,
      onTimeout: config.onTimeout,
      reminders: config.reminders,
    },
    handlers: {},
  };
}

// ─── Step.decision ─────────────────────────────────────────────────────────

/**
 * Conditional branching step. Engine evaluates each branch's predicate
 * in order and fires the first matching step. Tests assert deterministic
 * ordering — no two branches should match for the same context (the
 * engine picks the first match silently otherwise).
 */
export interface DecisionStepConfig extends BaseStepConfig {
  branches: Array<{
    predicate: Record<string, unknown>;
    step: string;
    to?: string;
  }>;
}

export function decision(
  config: DecisionStepConfig,
): StepHandle<StoredDecisionStep> {
  if (!config.branches || config.branches.length === 0) {
    throw new Error(
      `step.decision(${config.key}): at least one branch required`,
    );
  }
  return {
    stored: {
      kind: "decision",
      key: config.key,
      from: config.from,
      to: config.to,
      uiLabel: config.uiLabel,
      uiHint: config.uiHint,
      autoFireOnEnter: config.autoFireOnEnter ?? true,
      branches: config.branches,
    },
    handlers: {},
  };
}

// ─── Step.qes ──────────────────────────────────────────────────────────────

/**
 * Qualified Electronic Signature step. Engine triggers D-Trust signing
 * flow for `documentRefs`; on completion, the workflow advances. QES
 * signature blob lands in `WorkflowApprovalSlot.signature` for audit.
 */
export interface QesStepConfig extends BaseStepConfig {
  documentRefs: string[];
  signingProfile?: string;
}

export function qes(config: QesStepConfig): StepHandle<StoredQesStep> {
  if (!config.documentRefs || config.documentRefs.length === 0) {
    throw new Error(
      `step.qes(${config.key}): at least one documentRef is required`,
    );
  }
  return {
    stored: {
      kind: "qes",
      key: config.key,
      from: config.from,
      to: config.to,
      uiLabel: config.uiLabel,
      uiHint: config.uiHint,
      autoFireOnEnter: false,
      documentRefs: config.documentRefs,
      signingProfile: config.signingProfile,
    },
    handlers: {},
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Bundle-of-factories used as `step.action(...)` etc. Convenience export
 * so consumers can write `import { step } from "..."; step.action({...})`.
 */
export const step = {
  action,
  form,
  approval,
  astra,
  waitForEvent,
  decision,
  qes,
} as const;

// ─── Internal types ────────────────────────────────────────────────────────

/**
 * Step handle = the persisted "stored" half + the in-memory handlers.
 * The DSL returns these; defineWorkflow() collects them.
 */
export interface StepHandle<S extends StoredStep = StoredStep> {
  stored: S;
  handlers: StepHandlers;
}

export interface StepHandlers {
  run?: (ctx: StepContext) => Promise<void> | void;
  validate?: (data: unknown, ctx: StepContext) => string | null;
}

/**
 * Context passed to step handlers at execution time. Sprint 3D will
 * implement the full StepContext (DB access, publishEvent helper, subject
 * loader, etc.). For Sprint 3B it's a minimal shape to keep handler
 * type-signatures stable.
 */
export interface StepContext {
  workflowId: string;
  organizationId: string;
  userId: string;
  subjectType: string | null;
  subjectId: string | null;
  /** Read-only: latest event in the chain at step-fire time. */
  currentState: string;
  /** Free-form state bag — engine fills with prior step outputs. */
  state: Record<string, unknown>;
}
