import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  submitWorkflowToNCA,
  isWorkflowReadyForSubmission,
  getWorkflowSummary,
} from "@/lib/services";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

/**
 * POST /api/authorization/[workflowId]/submit
 *
 * Submit the authorization workflow to the National Competent Authority (NCA).
 * This transitions the workflow from 'ready_for_submission' to 'submitted'.
 *
 * Prerequisites:
 * - All mandatory documents must be complete
 * - No blocking issues
 * - Workflow must be in 'ready_for_submission' state
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

    // Check if ready for submission
    const readinessCheck = await isWorkflowReadyForSubmission(workflowId);

    if (!readinessCheck.ready) {
      return NextResponse.json(
        {
          error: "Workflow not ready for submission",
          blockers: readinessCheck.blockers,
        },
        { status: 400 },
      );
    }

    // Execute submission
    const result = await submitWorkflowToNCA(workflowId, userId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to submit workflow",
        },
        { status: 400 },
      );
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "workflow_submitted",
      entityType: "workflow",
      entityId: workflowId,
      newValue: {
        status: result.currentState,
        submittedAt: new Date().toISOString(),
        primaryNCA: workflow.primaryNCA,
        pathway: workflow.pathway,
      },
      description: `Authorization workflow submitted to ${workflow.primaryNCAName}`,
      ipAddress,
      userAgent,
    });

    // Get updated summary
    const summary = await getWorkflowSummary(workflowId);

    return NextResponse.json({
      success: true,
      previousState: result.previousState,
      currentState: result.currentState,
      submittedAt: result.timestamp,
      summary,
      message: `Application submitted to ${workflow.primaryNCAName}. You will be notified of any updates.`,
    });
  } catch (error) {
    console.error("Error submitting workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/authorization/[workflowId]/submit
 *
 * Check if the workflow is ready for submission and get any blockers.
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

    // Check readiness
    const readinessCheck = await isWorkflowReadyForSubmission(workflowId);

    return NextResponse.json({
      ready: readinessCheck.ready,
      blockers: readinessCheck.blockers,
      currentStatus: workflow.status,
      primaryNCA: {
        id: workflow.primaryNCA,
        name: workflow.primaryNCAName,
      },
      pathway: workflow.pathway,
    });
  } catch (error) {
    console.error("Error checking submission readiness:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
