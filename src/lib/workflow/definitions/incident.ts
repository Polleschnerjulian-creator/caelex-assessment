/**
 * Incident Workflow Definition
 *
 * Defines the state machine for NIS2 incident response workflows.
 *
 * States:
 * - reported: Initial state, incident detected and logged
 * - triaged: Severity confirmed, NIS2 significance assessed
 * - investigating: Root cause investigation in progress
 * - mitigating: Containment and mitigation measures being applied
 * - resolved: Incident contained and resolved
 * - closed: Post-mortem complete, lessons learned documented
 */

import type { WorkflowDefinition, IncidentContext } from "../types";
import { createTransition, createAutoTransition } from "../engine";
import { logger } from "@/lib/logger";

/**
 * Incident Workflow Definition
 *
 * Auto-transitions:
 * - reported → triaged: When severity is confirmed (context flags set)
 */
export const incidentWorkflowDefinition: WorkflowDefinition<IncidentContext> = {
  id: "incident",
  name: "NIS2 Incident Response",
  description:
    "Incident response workflow with NIS2 Art. 23 deadline tracking and NCA notification phases",
  version: "1.0.0",
  initialState: "reported",

  states: {
    reported: {
      name: "Reported",
      description: "Incident detected and logged, pending triage",
      metadata: {
        color: "#F59E0B", // amber
        icon: "AlertTriangle",
        phase: "detection",
      },
      transitions: {
        auto_triage: createAutoTransition<IncidentContext>(
          "triaged",
          (ctx) =>
            ctx.severity !== undefined &&
            ctx.requiresNCANotification !== undefined,
          {
            description:
              "Auto-triage when severity confirmed and NIS2 significance assessed",
          },
        ),
        triage: createTransition<IncidentContext>("triaged", {
          description: "Manually confirm triage assessment",
        }),
      },
    },

    triaged: {
      name: "Triaged",
      description:
        "Severity confirmed, NIS2 significance assessed, NCA deadlines active",
      metadata: {
        color: "#3B82F6", // blue
        icon: "ClipboardCheck",
        phase: "assessment",
      },
      transitions: {
        investigate: createTransition<IncidentContext>("investigating", {
          description: "Begin root cause investigation",
        }),
      },
    },

    investigating: {
      name: "Investigating",
      description: "Root cause investigation in progress",
      metadata: {
        color: "#8B5CF6", // purple
        icon: "Search",
        phase: "investigation",
      },
      transitions: {
        mitigate: createTransition<IncidentContext>("mitigating", {
          description: "Root cause identified, begin mitigation",
        }),
      },
    },

    mitigating: {
      name: "Mitigating",
      description: "Containment and mitigation measures being applied",
      metadata: {
        color: "#F97316", // orange
        icon: "Shield",
        phase: "containment",
      },
      transitions: {
        resolve: createTransition<IncidentContext>("resolved", {
          description: "Incident contained and resolved",
          onTransition: async (ctx) => {
            ctx.resolvedAt = new Date();
          },
        }),
      },
    },

    resolved: {
      name: "Resolved",
      description: "Incident resolved, pending post-mortem and closure",
      metadata: {
        color: "#22C55E", // green
        icon: "CheckCircle",
        phase: "resolution",
      },
      transitions: {
        close: createTransition<IncidentContext>("closed", {
          description: "Post-mortem complete, close incident",
        }),
        reopen: createTransition<IncidentContext>("investigating", {
          description: "Reopen investigation if issue recurs",
        }),
      },
    },

    closed: {
      name: "Closed",
      description: "Incident closed, lessons learned documented",
      metadata: {
        color: "#6B7280", // gray
        icon: "Archive",
        phase: "closed",
        isTerminal: true,
      },
      transitions: {
        reopen: createTransition<IncidentContext>("investigating", {
          description: "Reopen if related issue discovered",
        }),
      },
    },
  },

  hooks: {
    beforeTransition: async (ctx) => {
      logger.debug(
        `[Incident ${ctx.incidentId}] Transition: ${ctx.from} → ${ctx.to}`,
      );
    },
    afterTransition: async (ctx) => {
      // Handled by incident-autopilot.ts — audit log + notifications
    },
    onError: async (error, ctx) => {
      logger.error(
        `[Incident ${ctx.incidentId}] Workflow error:`,
        error.message,
      );
    },
  },
};

/**
 * Get status display information for an incident workflow state
 */
export function getIncidentStatusInfo(status: string): {
  label: string;
  color: string;
  icon: string;
  phase: string;
} {
  const state = incidentWorkflowDefinition.states[status];
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
 * Incident workflow state order for progress indicators
 */
export const INCIDENT_STATE_ORDER: string[] = [
  "reported",
  "triaged",
  "investigating",
  "mitigating",
  "resolved",
  "closed",
];

/**
 * Get progress percentage based on current state
 */
export function getIncidentProgress(currentState: string): number {
  const index = INCIDENT_STATE_ORDER.indexOf(currentState);
  if (index === -1) return 0;
  return Math.round((index / (INCIDENT_STATE_ORDER.length - 1)) * 100);
}
