/**
 * Workflow Engine Types
 *
 * Generic state machine types for authorization, incident, and other workflows.
 */

/**
 * Base workflow state - can be extended for specific workflow types
 */
export type WorkflowState = string;

/**
 * Condition function that evaluates whether a transition should occur
 */
export type TransitionCondition<TContext> = (context: TContext) => boolean;

/**
 * Action function that executes when a transition occurs
 */
export type TransitionAction<TContext> = (
  context: TContext,
) => Promise<void> | void;

/**
 * Guard function that determines if a transition is allowed
 */
export type TransitionGuard<TContext> = (
  context: TContext,
) => boolean | Promise<boolean>;

/**
 * Transition definition
 */
export interface Transition<TContext = Record<string, unknown>> {
  /** Target state after transition */
  to: WorkflowState;
  /** Human-readable description of the transition */
  description?: string;
  /** Condition that triggers automatic transition (for auto-transitions) */
  autoCondition?: TransitionCondition<TContext>;
  /** Guard that must pass for transition to be allowed */
  guard?: TransitionGuard<TContext>;
  /** Action to execute when transition occurs */
  onTransition?: TransitionAction<TContext>;
  /** Whether this is an automatic transition (evaluated by engine) */
  auto?: boolean;
  /** Required permissions for manual transition */
  requiredPermissions?: string[];
}

/**
 * State definition within a workflow
 */
export interface StateDefinition<TContext = Record<string, unknown>> {
  /** Human-readable name of the state */
  name: string;
  /** Description of what this state represents */
  description?: string;
  /** Action to execute when entering this state */
  onEnter?: TransitionAction<TContext>;
  /** Action to execute when exiting this state */
  onExit?: TransitionAction<TContext>;
  /** Possible transitions from this state */
  transitions: Record<string, Transition<TContext>>;
  /** Metadata for UI/reporting */
  metadata?: {
    color?: string;
    icon?: string;
    phase?: string;
    isTerminal?: boolean;
  };
}

/**
 * Complete workflow definition
 */
export interface WorkflowDefinition<TContext = Record<string, unknown>> {
  /** Unique identifier for the workflow type */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the workflow */
  description?: string;
  /** Version of the workflow definition */
  version: string;
  /** Initial state when workflow starts */
  initialState: WorkflowState;
  /** All states in the workflow */
  states: Record<WorkflowState, StateDefinition<TContext>>;
  /** Global actions/hooks */
  hooks?: {
    beforeTransition?: TransitionAction<
      TContext & { from: WorkflowState; to: WorkflowState }
    >;
    afterTransition?: TransitionAction<
      TContext & { from: WorkflowState; to: WorkflowState }
    >;
    onError?: (error: Error, context: TContext) => Promise<void> | void;
  };
}

/**
 * Result of evaluating available transitions
 */
export interface AvailableTransition {
  /** Event name that triggers this transition */
  event: string;
  /** Target state */
  to: WorkflowState;
  /** Description of the transition */
  description?: string;
  /** Whether this is an auto-transition */
  auto: boolean;
  /** Whether conditions are met for this transition */
  conditionMet: boolean;
}

/**
 * Result of executing a transition
 */
export interface TransitionResult {
  success: boolean;
  previousState: WorkflowState;
  currentState: WorkflowState;
  transitionEvent: string;
  error?: string;
  timestamp: Date;
}

/**
 * Workflow instance that tracks current state
 */
export interface WorkflowInstance<TContext = Record<string, unknown>> {
  /** Unique identifier of this workflow instance */
  id: string;
  /** Type of workflow (references definition id) */
  workflowType: string;
  /** Current state */
  currentState: WorkflowState;
  /** Context data */
  context: TContext;
  /** History of state transitions */
  history: TransitionResult[];
  /** When the workflow was created */
  createdAt: Date;
  /** When the workflow was last updated */
  updatedAt: Date;
}

// ============================================================================
// Authorization Workflow Specific Types
// ============================================================================

/**
 * Authorization workflow states
 */
export type AuthorizationState =
  | "not_started"
  | "in_progress"
  | "ready_for_submission"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "withdrawn";

/**
 * Authorization workflow context
 */
export interface AuthorizationContext {
  workflowId: string;
  userId: string;
  operatorType: string;
  primaryNCA: string;

  // Document status
  totalDocuments: number;
  readyDocuments: number;
  mandatoryDocuments: number;
  mandatoryReady: number;

  // Completeness
  completenessPercentage: number;
  allMandatoryComplete: boolean;
  hasBlockers: boolean;

  // Timeline
  targetSubmission?: Date;
  startedAt?: Date;
  submittedAt?: Date;

  // Additional data
  pathway: string;
  ncaRequirements?: string[];
}

// ============================================================================
// Incident Workflow Specific Types
// ============================================================================

/**
 * Incident workflow states
 */
export type IncidentState =
  | "reported"
  | "triaged"
  | "investigating"
  | "mitigating"
  | "resolved"
  | "closed"
  | "nca_notified";

/**
 * Incident categories with their deadlines
 */
export type IncidentCategory =
  | "loss_of_contact"
  | "debris_generation"
  | "cyber_incident"
  | "spacecraft_anomaly"
  | "conjunction_event"
  | "regulatory_breach"
  | "other";

/**
 * Incident severity levels
 */
export type IncidentSeverity = "critical" | "high" | "medium" | "low";

/**
 * Incident workflow context
 */
export interface IncidentContext {
  incidentId: string;
  userId: string;
  category: IncidentCategory;
  severity: IncidentSeverity;

  // NCA Reporting
  requiresNCANotification: boolean;
  ncaDeadlineHours: number;
  ncaNotifiedAt?: Date;
  ncaReportId?: string;

  // Timeline
  reportedAt: Date;
  triagedAt?: Date;
  resolvedAt?: Date;

  // Status
  hasActiveDeadline: boolean;
  deadlineAt?: Date;
}

// ============================================================================
// Engine Types
// ============================================================================

/**
 * Options for creating a workflow engine
 */
export interface WorkflowEngineOptions {
  /** Whether to automatically evaluate auto-transitions */
  autoEvaluate?: boolean;
  /** Maximum number of auto-transitions in a single evaluation (prevent infinite loops) */
  maxAutoTransitions?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Evaluation result from the engine
 */
export interface EvaluationResult {
  /** Whether any auto-transitions were triggered */
  transitioned: boolean;
  /** List of transitions that occurred */
  transitions: TransitionResult[];
  /** Final state after all auto-transitions */
  finalState: WorkflowState;
  /** Any errors that occurred */
  errors: string[];
}
