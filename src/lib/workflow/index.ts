/**
 * Workflow Engine - Public API
 *
 * This module provides a generic state machine implementation for
 * managing workflows like authorization, incidents, and more.
 */

// Core Engine
export {
  WorkflowEngine,
  createWorkflowEngine,
  createTransition,
  createAutoTransition,
} from "./engine";

// Workflow Definitions
export {
  authorizationWorkflowDefinition,
  getAuthorizationStatusInfo,
  getAuthorizationProgress,
  isAuthorizationTerminal,
  AUTHORIZATION_STATE_ORDER,
} from "./definitions";

// Types
export type {
  // Core types
  WorkflowState,
  WorkflowDefinition,
  StateDefinition,
  Transition,
  TransitionCondition,
  TransitionAction,
  TransitionGuard,
  AvailableTransition,
  TransitionResult,
  WorkflowInstance,
  WorkflowEngineOptions,
  EvaluationResult,

  // Authorization types
  AuthorizationState,
  AuthorizationContext,

  // Incident types
  IncidentState,
  IncidentCategory,
  IncidentSeverity,
  IncidentContext,
} from "./types";
