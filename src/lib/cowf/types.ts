/**
 * COWF — Public Types (Sprint 3A)
 *
 * Type contract for the Caelex Operator Workflow Foundation. These types
 * are isomorphic — safe to import from server + client. Server-only
 * logic lives in `events.server.ts`, `definitions.server.ts`, etc.
 *
 * Reference: docs/CAELEX-OPERATOR-WORKFLOW-FOUNDATION.md
 */

// ─── Step Types ────────────────────────────────────────────────────────────

/**
 * The 7 canonical step types from the COWF DSL. Sprint 3A only defines
 * the type discriminator and shape; the executor logic lands in Sprint 3D.
 *
 *   - action       — synchronous code-run (no waiting)
 *   - form         — wait for HTML form submit
 *   - approval     — wait for approval-click with SLA + multi-actor support
 *   - astra        — AI-reasoning step (writes AstraProposal + decisionLog)
 *   - waitForEvent — event-driven wait (registers WorkflowEventListener)
 *   - decision     — conditional branching
 *   - qes          — qualified electronic signature (D-Trust integration)
 */
export const StepType = {
  action: "action",
  form: "form",
  approval: "approval",
  astra: "astra",
  waitForEvent: "waitForEvent",
  decision: "decision",
  qes: "qes",
} as const;

export type StepType = (typeof StepType)[keyof typeof StepType];

// ─── Event Types ───────────────────────────────────────────────────────────

/**
 * Canonical WorkflowEvent.eventType values. Stored as free-form string in
 * the DB so adding new types doesn't require a migration; this enum is
 * the canonical set the engine emits and consumers should switch on.
 */
export const WorkflowEventType = {
  STATE_TRANSITION: "STATE_TRANSITION",
  STEP_STARTED: "STEP_STARTED",
  STEP_COMPLETED: "STEP_COMPLETED",
  ASTRA_PROPOSED: "ASTRA_PROPOSED",
  ASTRA_REASONING: "ASTRA_REASONING",
  WAIT_REGISTERED: "WAIT_REGISTERED",
  TIMEOUT_FIRED: "TIMEOUT_FIRED",
  ERROR: "ERROR",
  APPROVAL_GRANTED: "APPROVAL_GRANTED",
  APPROVAL_REJECTED: "APPROVAL_REJECTED",
  LISTENER_FIRED: "LISTENER_FIRED",
  SCHEDULE_FIRED: "SCHEDULE_FIRED",
  ARCHIVED: "ARCHIVED",
  PAUSED: "PAUSED",
  RESUMED: "RESUMED",
  COMPLETED: "COMPLETED",
} as const;

export type WorkflowEventType =
  (typeof WorkflowEventType)[keyof typeof WorkflowEventType];

// ─── Schedule + Listener Status ────────────────────────────────────────────

export const ScheduleStatus = {
  PENDING: "PENDING",
  FIRED: "FIRED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
} as const;
export type ScheduleStatus =
  (typeof ScheduleStatus)[keyof typeof ScheduleStatus];

export const ListenerStatus = {
  ACTIVE: "ACTIVE",
  FIRED: "FIRED",
  EXPIRED: "EXPIRED",
} as const;
export type ListenerStatus =
  (typeof ListenerStatus)[keyof typeof ListenerStatus];

// ─── Subject Polymorphism ──────────────────────────────────────────────────

/**
 * Polymorphic subject reference. A workflow instance can operate on any
 * domain entity — Spacecraft, ComplianceItem, Incident, AstraProposal,
 * or nothing (operator-personal workflow).
 */
export type WorkflowSubject =
  | { type: "Spacecraft"; id: string }
  | { type: "ComplianceItem"; id: string }
  | { type: "Incident"; id: string }
  | { type: "AstraProposal"; id: string }
  | { type: "OperatorProfile"; id: string }
  | { type: null; id: null };

// ─── Step DSL Shapes ───────────────────────────────────────────────────────

/**
 * Stored shape of a workflow step (after `defineWorkflow` serialisation).
 * Lives in `OperatorWorkflowDef.steps` as JSONB. The actual handler logic
 * is in TypeScript code — this shape is used for observability + UI
 * rendering of the workflow graph.
 */
export type StoredStep =
  | StoredActionStep
  | StoredFormStep
  | StoredApprovalStep
  | StoredAstraStep
  | StoredWaitStep
  | StoredDecisionStep
  | StoredQesStep;

interface BaseStoredStep {
  /** Step key — unique within the workflow definition. */
  key: string;
  /** State this step transitions FROM (the entry-state). */
  from: string;
  /** State this step transitions TO on success. */
  to: string;
  /** UI rendering hint. */
  uiLabel?: string;
  /** UI helper text. */
  uiHint?: string;
  /** When entered, fire automatically without operator action. */
  autoFireOnEnter?: boolean;
}

export interface StoredActionStep extends BaseStoredStep {
  kind: "action";
}

export interface StoredFormStep extends BaseStoredStep {
  kind: "form";
  /** JSON-Schema (or zod-derived) validation for the form. */
  schema?: Record<string, unknown>;
  /** Roles allowed to submit this form. */
  requireRoles?: string[];
}

export interface StoredApprovalStep extends BaseStoredStep {
  kind: "approval";
  requireRoles: string[];
  qesRequired?: boolean;
  /** SLA policy — engine creates a WorkflowSchedule from this. */
  slaBy?:
    | { offsetFromState: string; hours: number }
    | { offsetFromState: string; days: number };
  /** Escalation timeline. */
  escalations?: Array<{ atOffsetHours: number; action: string }>;
}

export interface StoredAstraStep extends BaseStoredStep {
  kind: "astra";
  promptTemplate: string;
  requiredCitations?: boolean;
  maxLoops?: number;
  modelOverride?: string;
}

export interface StoredWaitStep extends BaseStoredStep {
  kind: "waitForEvent";
  eventType: string;
  predicate?: Record<string, unknown>;
  timeout?:
    | { offsetFromState: string; hours: number }
    | { offsetFromState: string; days: number };
  onTimeout?: string; // step key to fire on timeout
  reminders?: { intervalDays: number };
}

export interface StoredDecisionStep extends BaseStoredStep {
  kind: "decision";
  /** Branch list — engine evaluates predicates in order, picks first match. */
  branches: Array<{
    /** Predicate (JSON-path or expression) evaluated against context. */
    predicate: Record<string, unknown>;
    /** Step-key to fire if branch matches. */
    step: string;
    /** State to transition to (overrides `to`). */
    to?: string;
  }>;
}

export interface StoredQesStep extends BaseStoredStep {
  kind: "qes";
  /** Which document(s) need to be QES-signed. */
  documentRefs: string[];
  /** D-Trust signing flow profile. */
  signingProfile?: string;
}

// ─── Public Read Shapes ────────────────────────────────────────────────────

/**
 * Read shape for a `WorkflowEvent` row. Mirrors the DB columns plus
 * narrows `eventType` and `payload` to discriminated unions where useful.
 */
export interface WorkflowEventRow {
  id: string;
  workflowId: string;
  sequence: number;
  eventType: WorkflowEventType | string;
  causedBy: string;
  payload: Record<string, unknown>;
  resultingState: string | null;
  prevHash: string;
  entryHash: string;
  occurredAt: Date;
}

/**
 * Append-input shape — what the caller passes to `appendWorkflowEvent()`.
 * Sequence + prev/entry-hash are computed by the service.
 */
export interface AppendWorkflowEventInput {
  workflowId: string;
  eventType: WorkflowEventType | string;
  causedBy: string;
  payload: Record<string, unknown>;
  resultingState?: string;
}

/**
 * Append-result shape — returned by `appendWorkflowEvent()`.
 */
export interface AppendWorkflowEventResult {
  id: string;
  sequence: number;
  prevHash: string;
  entryHash: string;
  occurredAt: Date;
}

/**
 * Read shape for an OperatorWorkflowInstance row + its def name. Used by
 * inbox and detail views.
 */
export interface WorkflowInstanceSummary {
  id: string;
  defId: string;
  defName: string;
  defVersion: number;
  userId: string;
  organizationId: string;
  subject: WorkflowSubject;
  currentState: string;
  actionableBy: Record<string, unknown> | null;
  pausedUntil: Date | null;
  hardDeadline: Date | null;
  startedAt: Date;
  completedAt: Date | null;
  archivedAt: Date | null;
}

/**
 * Definition-create input.
 */
export interface DefineWorkflowInput {
  name: string;
  version: number;
  description: string;
  states: string[];
  steps: StoredStep[];
  subjectType?: WorkflowSubject["type"];
}

/**
 * Instance-start input.
 */
export interface StartWorkflowInput {
  defId: string;
  userId: string;
  organizationId: string;
  subject?: WorkflowSubject;
  initialState: string;
  hardDeadline?: Date;
}

// ─── Hash-Chain Verification ───────────────────────────────────────────────

export interface VerifyChainResult {
  valid: boolean;
  checkedEvents: number;
  brokenAt?: {
    eventId: string;
    sequence: number;
    expectedPrev: string;
    actualPrev: string;
    fieldDiffers: "prevHash" | "entryHash" | "sequence";
  };
}
