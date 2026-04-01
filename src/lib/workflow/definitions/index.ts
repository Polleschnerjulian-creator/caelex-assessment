/**
 * Workflow Definitions
 *
 * Export all workflow definitions for the application.
 */

export {
  authorizationWorkflowDefinition,
  getAuthorizationStatusInfo,
  getAuthorizationProgress,
  isAuthorizationTerminal,
  AUTHORIZATION_STATE_ORDER,
} from "./authorization";

export {
  notifiedBodyWorkflowDefinition,
  getNBStatusInfo,
  getNBProgress,
  isNBTerminal,
  NB_STATE_ORDER,
  NB_REQUIRED_DOCUMENTS,
  createInitialNBWorkflowData,
  requiresNBWorkflow,
  isNBMandatory,
} from "./notified-body";

export type {
  NBWorkflowState,
  NBWorkflowData,
  NBDocumentStatus,
  NBCommunication,
  NBWorkflowContext,
  NBDocumentId,
} from "./notified-body";
