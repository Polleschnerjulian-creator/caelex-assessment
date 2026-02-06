import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  logAuditEvent,
  getRequestContext,
  generateAuditDescription,
} from "@/lib/audit";
import { evaluateWorkflowTransitions } from "@/lib/services";

// PUT /api/authorization/[workflowId]/documents - Update document status
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

    const { documentId, status, notes, dueDate } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 },
      );
    }

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

    // Get existing document
    const existingDoc = await prisma.authorizationDocument.findFirst({
      where: {
        id: documentId,
        workflowId,
      },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      updateData.status = status;

      // Set timestamps based on status
      if (status === "ready" || status === "approved") {
        updateData.completedAt = new Date();
      }
      if (status === "submitted") {
        updateData.submittedAt = new Date();
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    // Update document
    const updatedDocument = await prisma.authorizationDocument.update({
      where: { id: documentId },
      data: updateData,
    });

    // Log audit event if status changed
    if (status !== undefined && status !== existingDoc.status) {
      const { ipAddress, userAgent } = getRequestContext(request);
      await logAuditEvent({
        userId,
        action: "document_status_changed",
        entityType: "document",
        entityId: documentId,
        previousValue: { status: existingDoc.status, name: existingDoc.name },
        newValue: { status, name: existingDoc.name },
        description: generateAuditDescription(
          "document_status_changed",
          "document",
          { status: existingDoc.status },
          { status },
        ),
        ipAddress,
        userAgent,
      });
    }

    // Evaluate workflow transitions after document update
    // This handles auto-transitions:
    // - not_started → in_progress (first document ready)
    // - in_progress → ready_for_submission (all mandatory complete)
    // - ready_for_submission → in_progress (mandatory doc incomplete)
    const evaluationResult = await evaluateWorkflowTransitions(workflowId);

    // Build response with workflow state info
    const response: Record<string, unknown> = {
      document: updatedDocument,
    };

    // Include workflow transition info if state changed
    if (evaluationResult.transitioned) {
      response.workflowTransition = {
        transitioned: true,
        previousState: evaluationResult.transitions[0]?.previousState,
        currentState: evaluationResult.finalState,
        transitions: evaluationResult.transitions.map((t) => ({
          from: t.previousState,
          to: t.currentState,
          event: t.transitionEvent,
        })),
      };
    } else {
      response.workflowTransition = {
        transitioned: false,
        currentState: evaluationResult.finalState,
      };
    }

    // Include completeness context
    response.completeness = {
      totalDocuments: evaluationResult.context.totalDocuments,
      readyDocuments: evaluationResult.context.readyDocuments,
      mandatoryDocuments: evaluationResult.context.mandatoryDocuments,
      mandatoryReady: evaluationResult.context.mandatoryReady,
      completenessPercentage: evaluationResult.context.completenessPercentage,
      allMandatoryComplete: evaluationResult.context.allMandatoryComplete,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/authorization/[workflowId]/documents - Add a custom document
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
    const body = await request.json();

    const {
      name,
      description,
      documentType,
      articleRef,
      required = false,
      dueDate,
    } = body;

    if (!name || !documentType) {
      return NextResponse.json(
        { error: "name and documentType are required" },
        { status: 400 },
      );
    }

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

    // Create document
    const document = await prisma.authorizationDocument.create({
      data: {
        workflowId,
        name,
        description,
        documentType,
        articleRef,
        required,
        status: "not_started",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
