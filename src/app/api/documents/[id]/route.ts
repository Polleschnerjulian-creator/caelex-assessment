import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/documents/[id] - Get document details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 10,
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        shares: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        },
        accessLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Log view access
    await prisma.documentAccessLog.create({
      data: {
        documentId: document.id,
        userId: session.user.id,
        action: "VIEW",
      },
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 },
    );
  }
}

// PATCH /api/documents/[id] - Update document
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.document.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    // Allowed fields to update
    const allowedFields = [
      "name",
      "description",
      "category",
      "subcategory",
      "tags",
      "issueDate",
      "expiryDate",
      "moduleType",
      "regulatoryRef",
      "accessLevel",
      "status",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "issueDate" || field === "expiryDate") {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Handle status changes
    if (body.status === "APPROVED" && existing.status !== "APPROVED") {
      updateData.approvedBy = session.user.id;
      updateData.approvedAt = new Date();
    }

    if (body.status === "UNDER_REVIEW" && existing.status !== "UNDER_REVIEW") {
      updateData.reviewedBy = session.user.id;
      updateData.reviewedAt = new Date();
    }

    // Check if expired
    if (updateData.expiryDate) {
      const expiryDate = new Date(updateData.expiryDate as string);
      updateData.isExpired = expiryDate < new Date();
      if (updateData.isExpired) {
        updateData.status = "EXPIRED";
      }
    }

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "document_updated",
        entityType: "document",
        entityId: document.id,
        previousValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
        description: `Updated document: ${document.name}`,
      },
    });

    // Log document access
    await prisma.documentAccessLog.create({
      data: {
        documentId: document.id,
        userId: session.user.id,
        action: "EDIT",
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 },
    );
  }
}

// DELETE /api/documents/[id] - Delete document
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.document.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Soft delete by archiving instead of hard delete
    const document = await prisma.document.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "document_archived",
        entityType: "document",
        entityId: id,
        previousValue: JSON.stringify(existing),
        description: `Archived document: ${existing.name}`,
      },
    });

    // Log document access
    await prisma.documentAccessLog.create({
      data: {
        documentId: document.id,
        userId: session.user.id,
        action: "DELETE",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
