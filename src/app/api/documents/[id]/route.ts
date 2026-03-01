import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";

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

    // Resolve organization context for multi-tenant scoping
    const orgContext = await getCurrentOrganization(session.user.id);
    const docWhere: Record<string, unknown> = {
      id,
      userId: session.user.id,
    };
    if (orgContext?.organizationId) {
      docWhere.organizationId = orgContext.organizationId;
    }

    const document = await prisma.document.findFirst({
      where: docWhere,
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

    // Resolve organization context for multi-tenant scoping
    const orgCtxPatch = await getCurrentOrganization(session.user.id);
    const patchWhere: Record<string, unknown> = { id, userId: session.user.id };
    if (orgCtxPatch?.organizationId) {
      patchWhere.organizationId = orgCtxPatch.organizationId;
    }

    // Verify ownership
    const existing = await prisma.document.findFirst({
      where: patchWhere,
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const patchSchema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      category: z
        .enum([
          "LICENSE",
          "PERMIT",
          "AUTHORIZATION",
          "CERTIFICATE",
          "ISO_CERTIFICATE",
          "SECURITY_CERT",
          "INSURANCE_POLICY",
          "INSURANCE_CERT",
          "COMPLIANCE_REPORT",
          "AUDIT_REPORT",
          "INCIDENT_REPORT",
          "ANNUAL_REPORT",
          "TECHNICAL_SPEC",
          "DESIGN_DOC",
          "TEST_REPORT",
          "SAFETY_ANALYSIS",
          "CONTRACT",
          "NDA",
          "SLA",
          "REGULATORY_FILING",
          "CORRESPONDENCE",
          "NOTIFICATION",
          "POLICY",
          "PROCEDURE",
          "TRAINING",
          "OTHER",
        ])
        .optional(),
      subcategory: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      issueDate: z.string().nullable().optional(),
      expiryDate: z.string().nullable().optional(),
      moduleType: z
        .enum([
          "AUTHORIZATION",
          "DEBRIS",
          "INSURANCE",
          "CYBERSECURITY",
          "ENVIRONMENTAL",
          "SUPERVISION",
          "REGISTRATION",
          "TIMELINE",
          "DOCUMENTS",
        ])
        .nullable()
        .optional(),
      regulatoryRef: z.string().nullable().optional(),
      accessLevel: z
        .enum([
          "PUBLIC",
          "INTERNAL",
          "CONFIDENTIAL",
          "RESTRICTED",
          "TOP_SECRET",
        ])
        .optional(),
      status: z.string().optional(),
    });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

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
      if (parsed.data[field as keyof typeof parsed.data] !== undefined) {
        if (field === "issueDate" || field === "expiryDate") {
          const val = parsed.data[field as keyof typeof parsed.data];
          updateData[field] = val ? new Date(val as string) : null;
        } else {
          updateData[field] = parsed.data[field as keyof typeof parsed.data];
        }
      }
    }

    // Handle status changes
    if (parsed.data.status === "APPROVED" && existing.status !== "APPROVED") {
      updateData.approvedBy = session.user.id;
      updateData.approvedAt = new Date();
    }

    if (
      parsed.data.status === "UNDER_REVIEW" &&
      existing.status !== "UNDER_REVIEW"
    ) {
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

    // Atomic update with ownership check to prevent TOCTOU race conditions
    const document = await prisma.document.update({
      where: {
        id,
        userId: session.user.id,
        ...(orgCtxPatch?.organizationId && {
          organizationId: orgCtxPatch.organizationId,
        }),
      },
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

    // Resolve organization context for multi-tenant scoping
    const orgCtxDelete = await getCurrentOrganization(session.user.id);
    const deleteWhere: Record<string, unknown> = {
      id,
      userId: session.user.id,
    };
    if (orgCtxDelete?.organizationId) {
      deleteWhere.organizationId = orgCtxDelete.organizationId;
    }

    // Verify ownership
    const existing = await prisma.document.findFirst({
      where: deleteWhere,
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
