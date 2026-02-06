import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  evaluateWorkflowTransitions,
  getWorkflowSummary,
} from "@/lib/services";

/**
 * POST /api/authorization/[workflowId]/evaluate
 *
 * Evaluate the workflow state and execute any auto-transitions.
 * This endpoint checks document completeness and automatically
 * advances the workflow state when conditions are met.
 *
 * Auto-transitions:
 * - not_started → in_progress: When first document is ready
 * - in_progress → ready_for_submission: When all mandatory docs complete
 * - ready_for_submission → in_progress: If a mandatory doc becomes incomplete
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await params;
    const userId = session.user.id;

    // Verify workflow ownership
    const workflow = await prisma.authorizationWorkflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    // Evaluate transitions
    const evaluationResult = await evaluateWorkflowTransitions(workflowId);

    // Get updated workflow summary
    const summary = await getWorkflowSummary(workflowId);

    return NextResponse.json({
      previousState: workflow.status,
      currentState: evaluationResult.finalState,
      transitioned: evaluationResult.transitioned,
      transitions: evaluationResult.transitions.map((t) => ({
        from: t.previousState,
        to: t.currentState,
        event: t.transitionEvent,
        timestamp: t.timestamp,
      })),
      context: evaluationResult.context,
      summary,
      errors:
        evaluationResult.errors.length > 0
          ? evaluationResult.errors
          : undefined,
    });
  } catch (error) {
    console.error("Error evaluating workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/authorization/[workflowId]/evaluate
 *
 * Get the current workflow state and available transitions
 * without executing any auto-transitions.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await params;
    const userId = session.user.id;

    // Verify workflow ownership
    const workflow = await prisma.authorizationWorkflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    // Get workflow summary (includes available transitions)
    const summary = await getWorkflowSummary(workflowId);

    if (!summary) {
      return NextResponse.json(
        { error: "Failed to get workflow summary" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      currentState: summary.status,
      statusInfo: summary.statusInfo,
      progress: summary.progress,
      context: summary.context,
      availableTransitions: summary.availableTransitions,
      isTerminal: summary.isTerminal,
    });
  } catch (error) {
    console.error("Error getting workflow state:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
