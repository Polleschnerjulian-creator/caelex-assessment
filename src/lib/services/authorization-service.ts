/**
 * Authorization Service
 *
 * Business logic for EU Space Act authorization workflows.
 * Uses the Workflow Engine for state management and auto-transitions.
 */

import { prisma } from "@/lib/prisma";
import {
  createWorkflowEngine,
  authorizationWorkflowDefinition,
  type AuthorizationContext,
  type EvaluationResult,
  type AvailableTransition,
  type TransitionResult,
} from "@/lib/workflow";
import { logAuditEvent } from "@/lib/audit";

/**
 * Document status that counts as "ready"
 */
const READY_STATUSES = ["ready", "approved", "submitted"];

/**
 * Document status that counts as "in progress" (started but not complete)
 */
const IN_PROGRESS_STATUSES = ["in_progress", "under_review"];

/**
 * Build authorization context from workflow and documents
 */
export async function buildAuthorizationContext(
  workflowId: string,
): Promise<AuthorizationContext | null> {
  const workflow = await prisma.authorizationWorkflow.findUnique({
    where: { id: workflowId },
    include: {
      documents: true,
    },
  });

  if (!workflow) {
    return null;
  }

  const totalDocuments = workflow.documents.length;
  const readyDocuments = workflow.documents.filter((doc) =>
    READY_STATUSES.includes(doc.status),
  ).length;
  const mandatoryDocuments = workflow.documents.filter(
    (doc) => doc.required,
  ).length;
  const mandatoryReady = workflow.documents.filter(
    (doc) => doc.required && READY_STATUSES.includes(doc.status),
  ).length;

  const completenessPercentage =
    mandatoryDocuments > 0
      ? Math.round((mandatoryReady / mandatoryDocuments) * 100)
      : totalDocuments > 0
        ? Math.round((readyDocuments / totalDocuments) * 100)
        : 0;

  const allMandatoryComplete = mandatoryDocuments === mandatoryReady;

  // Check for blockers (documents marked with blocking issues)
  const hasBlockers = workflow.documents.some(
    (doc) => doc.status === "rejected" || doc.status === "blocked",
  );

  return {
    workflowId: workflow.id,
    userId: workflow.userId,
    operatorType: workflow.operatorType || "",
    primaryNCA: workflow.primaryNCA,
    totalDocuments,
    readyDocuments,
    mandatoryDocuments,
    mandatoryReady,
    completenessPercentage,
    allMandatoryComplete,
    hasBlockers,
    targetSubmission: workflow.targetSubmission ?? undefined,
    startedAt: workflow.startedAt ?? undefined,
    submittedAt: workflow.submittedAt ?? undefined,
    pathway: workflow.pathway,
  };
}

/**
 * Evaluate and execute auto-transitions for a workflow
 */
export async function evaluateWorkflowTransitions(
  workflowId: string,
): Promise<EvaluationResult & { context: AuthorizationContext }> {
  const context = await buildAuthorizationContext(workflowId);

  if (!context) {
    return {
      transitioned: false,
      transitions: [],
      finalState: "unknown",
      errors: ["Workflow not found"],
      context: {} as AuthorizationContext,
    };
  }

  const workflow = await prisma.authorizationWorkflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    return {
      transitioned: false,
      transitions: [],
      finalState: "unknown",
      errors: ["Workflow not found"],
      context,
    };
  }

  const engine = createWorkflowEngine(authorizationWorkflowDefinition);
  const result = await engine.evaluateTransitions(workflow.status, context);

  // If transitions occurred, update the database
  if (result.transitioned && result.finalState !== workflow.status) {
    const updateData: Record<string, unknown> = {
      status: result.finalState,
    };

    // Set timestamps based on new state
    if (result.finalState === "in_progress" && !workflow.startedAt) {
      updateData.startedAt = new Date();
    } else if (result.finalState === "submitted" && !workflow.submittedAt) {
      updateData.submittedAt = new Date();
    } else if (result.finalState === "approved" && !workflow.approvedAt) {
      updateData.approvedAt = new Date();
    } else if (result.finalState === "rejected" && !workflow.rejectedAt) {
      updateData.rejectedAt = new Date();
    }

    await prisma.authorizationWorkflow.update({
      where: { id: workflowId },
      data: updateData,
    });

    // Log audit event for status change
    await logAuditEvent({
      userId: context.userId,
      action: "workflow_status_changed",
      entityType: "workflow",
      entityId: workflowId,
      previousValue: { status: workflow.status },
      newValue: {
        status: result.finalState,
        transitions: result.transitions.map((t) => ({
          from: t.previousState,
          to: t.currentState,
          event: t.transitionEvent,
        })),
      },
      description: `Workflow auto-transitioned: ${workflow.status} → ${result.finalState}`,
    });
  }

  return { ...result, context };
}

/**
 * Get available manual transitions for a workflow
 */
export async function getAvailableTransitions(
  workflowId: string,
): Promise<AvailableTransition[]> {
  const context = await buildAuthorizationContext(workflowId);

  if (!context) {
    return [];
  }

  const workflow = await prisma.authorizationWorkflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    return [];
  }

  const engine = createWorkflowEngine(authorizationWorkflowDefinition);
  return engine.getAvailableTransitions(workflow.status, context);
}

/**
 * Execute a manual transition
 */
export async function executeManualTransition(
  workflowId: string,
  event: string,
  userId: string,
  additionalData?: Record<string, unknown>,
): Promise<TransitionResult & { context: AuthorizationContext }> {
  const context = await buildAuthorizationContext(workflowId);

  if (!context) {
    return {
      success: false,
      previousState: "unknown",
      currentState: "unknown",
      transitionEvent: event,
      error: "Workflow not found",
      timestamp: new Date(),
      context: {} as AuthorizationContext,
    };
  }

  // Verify user owns this workflow
  if (context.userId !== userId) {
    return {
      success: false,
      previousState: "unknown",
      currentState: "unknown",
      transitionEvent: event,
      error: "Unauthorized",
      timestamp: new Date(),
      context,
    };
  }

  const workflow = await prisma.authorizationWorkflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    return {
      success: false,
      previousState: "unknown",
      currentState: "unknown",
      transitionEvent: event,
      error: "Workflow not found",
      timestamp: new Date(),
      context,
    };
  }

  const engine = createWorkflowEngine(authorizationWorkflowDefinition);
  const result = await engine.executeTransition(
    workflow.status,
    event,
    context,
  );

  // If successful, update the database
  if (result.success) {
    const updateData: Record<string, unknown> = {
      status: result.currentState,
    };

    // Set timestamps based on new state
    if (result.currentState === "in_progress" && !workflow.startedAt) {
      updateData.startedAt = new Date();
    } else if (result.currentState === "submitted") {
      updateData.submittedAt = new Date();
    } else if (result.currentState === "approved") {
      updateData.approvedAt = new Date();
    } else if (result.currentState === "rejected") {
      updateData.rejectedAt = new Date();
      if (additionalData?.rejectionReason) {
        updateData.rejectionReason = additionalData.rejectionReason as string;
      }
    }

    await prisma.authorizationWorkflow.update({
      where: { id: workflowId },
      data: updateData,
    });

    // Log audit event
    await logAuditEvent({
      userId,
      action: `workflow_${event}`,
      entityType: "workflow",
      entityId: workflowId,
      previousValue: { status: result.previousState },
      newValue: { status: result.currentState, ...additionalData },
      description: `Workflow transition: ${result.previousState} → ${result.currentState} (${event})`,
    });
  }

  return { ...result, context };
}

/**
 * Submit workflow to NCA
 */
export async function submitWorkflowToNCA(
  workflowId: string,
  userId: string,
): Promise<TransitionResult & { context: AuthorizationContext }> {
  // First evaluate to ensure we're in the right state
  await evaluateWorkflowTransitions(workflowId);

  // Attempt the submit transition
  return executeManualTransition(workflowId, "submit", userId);
}

/**
 * Withdraw a workflow
 */
export async function withdrawWorkflow(
  workflowId: string,
  userId: string,
  reason?: string,
): Promise<TransitionResult & { context: AuthorizationContext }> {
  return executeManualTransition(workflowId, "withdraw", userId, {
    withdrawalReason: reason,
  });
}

/**
 * Get workflow summary with status info
 */
export interface WorkflowSummary {
  id: string;
  status: string;
  statusInfo: {
    label: string;
    color: string;
    icon: string;
    phase: string;
  };
  progress: number;
  context: AuthorizationContext;
  availableTransitions: AvailableTransition[];
  isTerminal: boolean;
}

export async function getWorkflowSummary(
  workflowId: string,
): Promise<WorkflowSummary | null> {
  const context = await buildAuthorizationContext(workflowId);

  if (!context) {
    return null;
  }

  const workflow = await prisma.authorizationWorkflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    return null;
  }

  const engine = createWorkflowEngine(authorizationWorkflowDefinition);
  const stateDef = engine.getState(workflow.status);
  const availableTransitions = engine.getAvailableTransitions(
    workflow.status,
    context,
  );
  const isTerminal = engine.isTerminalState(workflow.status);

  // Calculate progress
  const stateOrder = [
    "not_started",
    "in_progress",
    "ready_for_submission",
    "submitted",
    "under_review",
    "approved",
  ];
  const stateIndex = stateOrder.indexOf(workflow.status);
  const progress =
    stateIndex >= 0
      ? Math.round((stateIndex / (stateOrder.length - 1)) * 100)
      : 0;

  return {
    id: workflow.id,
    status: workflow.status,
    statusInfo: {
      label: stateDef?.name || workflow.status,
      color: stateDef?.metadata?.color || "#6B7280",
      icon: stateDef?.metadata?.icon || "Circle",
      phase: stateDef?.metadata?.phase || "unknown",
    },
    progress,
    context,
    availableTransitions,
    isTerminal,
  };
}
