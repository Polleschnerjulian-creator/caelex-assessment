import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  logAuditEvent,
  getRequestContext,
  generateAuditDescription,
} from "@/lib/audit";
import { determineNCA } from "@/data/ncas";
import { getRequiredDocuments } from "@/data/authorization-documents";

// GET /api/authorization - Get user's authorization workflow(s)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all workflows for this user
    const workflows = await prisma.authorizationWorkflow.findMany({
      where: { userId },
      include: {
        documents: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Also get user profile for NCA determination context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        operatorType: true,
        establishmentCountry: true,
        isThirdCountry: true,
        organization: true,
      },
    });

    return NextResponse.json({ workflows, user });
  } catch (error) {
    console.error("Error fetching authorization workflows:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/authorization - Create a new authorization workflow
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      operatorType,
      establishmentCountry,
      launchCountry,
      isThirdCountry = false,
      targetSubmission,
    } = body;

    // Validate required fields
    if (!operatorType) {
      return NextResponse.json(
        { error: "operatorType is required" },
        { status: 400 },
      );
    }

    if (!isThirdCountry && !establishmentCountry) {
      return NextResponse.json(
        { error: "establishmentCountry is required for EU operators" },
        { status: 400 },
      );
    }

    // Determine NCA
    const ncaDetermination = determineNCA(
      operatorType,
      establishmentCountry,
      launchCountry,
      isThirdCountry,
    );

    // Get required documents for this operator type
    const requiredDocs = getRequiredDocuments(operatorType);

    // Create workflow with documents in a transaction
    const workflow = await prisma.$transaction(async (tx) => {
      // Create the workflow
      const newWorkflow = await tx.authorizationWorkflow.create({
        data: {
          userId,
          primaryNCA: ncaDetermination.primaryNCA.id,
          primaryNCAName: ncaDetermination.primaryNCA.name,
          secondaryNCAs: ncaDetermination.secondaryNCAs
            ? JSON.stringify(
                ncaDetermination.secondaryNCAs.map((nca) => nca.id),
              )
            : null,
          pathway: ncaDetermination.pathway,
          operatorType,
          launchCountry,
          status: "not_started",
          targetSubmission: targetSubmission
            ? new Date(targetSubmission)
            : null,
        },
      });

      // Create document entries
      const documents = await Promise.all(
        requiredDocs.map((doc) =>
          tx.authorizationDocument.create({
            data: {
              workflowId: newWorkflow.id,
              documentType: doc.type,
              name: doc.name,
              description: doc.description,
              articleRef: doc.articleRef,
              required: doc.required,
              status: "not_started",
            },
          }),
        ),
      );

      return { ...newWorkflow, documents };
    });

    // Update user profile
    await prisma.user.update({
      where: { id: userId },
      data: {
        operatorType,
        establishmentCountry,
        isThirdCountry,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "workflow_created",
      entityType: "workflow",
      entityId: workflow.id,
      newValue: {
        operatorType,
        pathway: ncaDetermination.pathway,
        primaryNCA: ncaDetermination.primaryNCA.name,
        documentsCount: requiredDocs.length,
      },
      description: generateAuditDescription("workflow_created", "workflow"),
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      workflow,
      ncaDetermination: {
        primaryNCA: ncaDetermination.primaryNCA,
        secondaryNCAs: ncaDetermination.secondaryNCAs,
        pathway: ncaDetermination.pathway,
        relevantArticles: ncaDetermination.relevantArticles,
        requirements: ncaDetermination.requirements,
        estimatedTimeline: ncaDetermination.estimatedTimeline,
        notes: ncaDetermination.notes,
      },
    });
  } catch (error) {
    console.error("Error creating authorization workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
