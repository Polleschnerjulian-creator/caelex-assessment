import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  logAuditEvent,
  getRequestContext,
  generateAuditDescription,
} from "@/lib/audit";

// GET /api/authorization/[workflowId] - Get a specific workflow
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

    const workflow = await prisma.authorizationWorkflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
      include: {
        documents: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/authorization/[workflowId] - Update workflow status
export async function PUT(
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
    const body = await request.json();

    const { status, notes, targetSubmission } = body;

    // Get existing workflow
    const existingWorkflow = await prisma.authorizationWorkflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      updateData.status = status;

      // Set timestamps based on status
      if (status === "in_progress" && !existingWorkflow.startedAt) {
        updateData.startedAt = new Date();
      }
      if (status === "submitted") {
        updateData.submittedAt = new Date();
      }
      if (status === "approved") {
        updateData.approvedAt = new Date();
      }
      if (status === "rejected") {
        updateData.rejectedAt = new Date();
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (targetSubmission !== undefined) {
      updateData.targetSubmission = targetSubmission
        ? new Date(targetSubmission)
        : null;
    }

    // Update workflow
    const updatedWorkflow = await prisma.authorizationWorkflow.update({
      where: { id: workflowId },
      data: updateData,
      include: {
        documents: true,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);

    if (status !== undefined && status !== existingWorkflow.status) {
      await logAuditEvent({
        userId,
        action:
          status === "submitted"
            ? "workflow_submitted"
            : "workflow_status_changed",
        entityType: "workflow",
        entityId: workflowId,
        previousValue: { status: existingWorkflow.status },
        newValue: { status },
        description: generateAuditDescription(
          status === "submitted"
            ? "workflow_submitted"
            : "workflow_status_changed",
          "workflow",
          { status: existingWorkflow.status },
          { status },
        ),
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json(updatedWorkflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/authorization/[workflowId] - Delete a workflow
export async function DELETE(
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

    // Verify ownership
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

    // Delete workflow (documents will cascade delete)
    await prisma.authorizationWorkflow.delete({
      where: { id: workflowId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
