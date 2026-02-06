/**
 * Authorization Workflow Definition
 *
 * Defines the state machine for EU Space Act authorization workflows.
 *
 * States:
 * - not_started: Initial state, no documents uploaded
 * - in_progress: At least one document uploaded/started
 * - ready_for_submission: All mandatory documents ready
 * - submitted: Application submitted to NCA
 * - under_review: NCA reviewing the application
 * - approved: Authorization granted
 * - rejected: Authorization denied
 * - withdrawn: Application withdrawn by operator
 */

import type { WorkflowDefinition, AuthorizationContext } from "../types";
import { createTransition, createAutoTransition } from "../engine";
import { logger } from "@/lib/logger";

/**
 * Authorization Workflow Definition
 *
 * Auto-transitions:
 * - not_started → in_progress: When first document is uploaded
 * - in_progress → ready_for_submission: When all mandatory docs are complete
 * - ready_for_submission → in_progress: If a mandatory doc becomes incomplete
 */
export const authorizationWorkflowDefinition: WorkflowDefinition<AuthorizationContext> =
  {
    id: "authorization",
    name: "EU Space Act Authorization",
    description:
      "Multi-authority authorization workflow for EU space operations",
    version: "1.0.0",
    initialState: "not_started",

    states: {
      not_started: {
        name: "Not Started",
        description: "Authorization workflow created but no documents uploaded",
        metadata: {
          color: "#6B7280", // gray
          icon: "Circle",
          phase: "pre_authorization",
        },
        transitions: {
          start: createAutoTransition(
            "in_progress",
            (ctx) => ctx.totalDocuments > 0 && ctx.readyDocuments > 0,
            { description: "First document uploaded or started" },
          ),
          manual_start: createTransition("in_progress", {
            description: "Manually start the workflow",
          }),
        },
      },

      in_progress: {
        name: "In Progress",
        description:
          "Documents being prepared, not all mandatory documents complete",
        metadata: {
          color: "#3B82F6", // blue
          icon: "Clock",
          phase: "pre_authorization",
        },
        transitions: {
          complete: createAutoTransition(
            "ready_for_submission",
            (ctx) => ctx.allMandatoryComplete && !ctx.hasBlockers,
            { description: "All mandatory documents ready and no blockers" },
          ),
          withdraw: createTransition("withdrawn", {
            description: "Withdraw the application",
          }),
        },
      },

      ready_for_submission: {
        name: "Ready for Submission",
        description: "All mandatory documents ready, can submit to NCA",
        metadata: {
          color: "#22C55E", // green
          icon: "CheckCircle",
          phase: "pre_authorization",
        },
        transitions: {
          incomplete: createAutoTransition(
            "in_progress",
            (ctx) => !ctx.allMandatoryComplete || ctx.hasBlockers,
            {
              description:
                "Mandatory document became incomplete or new blocker detected",
            },
          ),
          submit: createTransition("submitted", {
            description: "Submit application to NCA",
            guard: async (ctx) => ctx.allMandatoryComplete && !ctx.hasBlockers,
          }),
          withdraw: createTransition("withdrawn", {
            description: "Withdraw the application",
          }),
        },
      },

      submitted: {
        name: "Submitted",
        description: "Application submitted to National Competent Authority",
        metadata: {
          color: "#8B5CF6", // purple
          icon: "Send",
          phase: "under_review",
        },
        transitions: {
          review: createTransition("under_review", {
            description: "NCA begins formal review",
          }),
          request_info: createTransition("in_progress", {
            description: "NCA requests additional information",
          }),
          withdraw: createTransition("withdrawn", {
            description: "Withdraw the application",
          }),
        },
      },

      under_review: {
        name: "Under Review",
        description: "NCA actively reviewing the application",
        metadata: {
          color: "#F59E0B", // amber
          icon: "Eye",
          phase: "under_review",
        },
        transitions: {
          approve: createTransition("approved", {
            description: "NCA approves the authorization",
          }),
          reject: createTransition("rejected", {
            description: "NCA rejects the authorization",
          }),
          request_info: createTransition("in_progress", {
            description: "NCA requests additional information",
          }),
        },
      },

      approved: {
        name: "Approved",
        description: "Authorization granted by NCA",
        metadata: {
          color: "#22C55E", // green
          icon: "CheckCircle2",
          phase: "authorized",
          isTerminal: true,
        },
        transitions: {
          // Could add transitions for renewal or revocation in the future
        },
      },

      rejected: {
        name: "Rejected",
        description: "Authorization denied by NCA",
        metadata: {
          color: "#EF4444", // red
          icon: "XCircle",
          phase: "closed",
          isTerminal: true,
        },
        transitions: {
          appeal: createTransition("under_review", {
            description: "Appeal the rejection decision",
          }),
          resubmit: createTransition("not_started", {
            description: "Start a new application",
          }),
        },
      },

      withdrawn: {
        name: "Withdrawn",
        description: "Application withdrawn by operator",
        metadata: {
          color: "#6B7280", // gray
          icon: "MinusCircle",
          phase: "closed",
          isTerminal: true,
        },
        transitions: {
          restart: createTransition("not_started", {
            description: "Start a new application",
          }),
        },
      },
    },

    hooks: {
      beforeTransition: async (ctx) => {
        logger.debug(
          `[Authorization ${ctx.workflowId}] Transition: ${ctx.from} → ${ctx.to}`,
        );
      },
      afterTransition: async (ctx) => {
        // Could trigger notifications, audit logs, etc.
      },
      onError: async (error, ctx) => {
        logger.error(`[Authorization ${ctx.workflowId}] Error:`, error.message);
      },
    },
  };

/**
 * Get status display information for a state
 */
export function getAuthorizationStatusInfo(status: string): {
  label: string;
  color: string;
  icon: string;
  phase: string;
} {
  const state = authorizationWorkflowDefinition.states[status];
  if (!state) {
    return {
      label: status,
      color: "#6B7280",
      icon: "Circle",
      phase: "unknown",
    };
  }

  return {
    label: state.name,
    color: state.metadata?.color ?? "#6B7280",
    icon: state.metadata?.icon ?? "Circle",
    phase: state.metadata?.phase ?? "unknown",
  };
}

/**
 * Authorization workflow state order for progress indicators
 */
export const AUTHORIZATION_STATE_ORDER: string[] = [
  "not_started",
  "in_progress",
  "ready_for_submission",
  "submitted",
  "under_review",
  "approved",
];

/**
 * Get progress percentage based on current state
 */
export function getAuthorizationProgress(currentState: string): number {
  const index = AUTHORIZATION_STATE_ORDER.indexOf(currentState);
  if (index === -1) {
    return 0;
  }
  return Math.round((index / (AUTHORIZATION_STATE_ORDER.length - 1)) * 100);
}

/**
 * Check if authorization is in a terminal state
 */
export function isAuthorizationTerminal(status: string): boolean {
  const state = authorizationWorkflowDefinition.states[status];
  return state?.metadata?.isTerminal === true;
}
