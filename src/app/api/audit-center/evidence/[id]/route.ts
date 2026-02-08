import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/services/audit-center-service.server";
import { logAuditEvent } from "@/lib/audit";

// GET: Fetch single evidence with documents
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = await getOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const evidence = await prisma.complianceEvidence.findFirst({
      where: { id, organizationId },
      include: {
        documents: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                category: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ evidence });
  } catch (error) {
    console.error("Get evidence error:", error);
    return NextResponse.json(
      { error: "Failed to fetch evidence" },
      { status: 500 },
    );
  }
}

// PATCH: Update evidence
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = await getOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Verify ownership
    const existing = await prisma.complianceEvidence.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Evidence not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.evidenceType !== undefined)
      updateData.evidenceType = body.evidenceType;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.validFrom !== undefined)
      updateData.validFrom = body.validFrom ? new Date(body.validFrom) : null;
    if (body.validUntil !== undefined)
      updateData.validUntil = body.validUntil
        ? new Date(body.validUntil)
        : null;
    if (body.reviewNotes !== undefined)
      updateData.reviewNotes = body.reviewNotes;

    // Handle review action
    if (body.status === "ACCEPTED" || body.status === "REJECTED") {
      updateData.reviewedBy = session.user.id;
      updateData.reviewedAt = new Date();
    }

    const evidence = await prisma.complianceEvidence.update({
      where: { id },
      data: updateData,
      include: {
        documents: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
              },
            },
          },
        },
      },
    });

    // Link new documents if provided
    if (
      body.addDocumentIds &&
      Array.isArray(body.addDocumentIds) &&
      body.addDocumentIds.length > 0
    ) {
      await prisma.complianceEvidenceDocument.createMany({
        data: body.addDocumentIds.map((docId: string) => ({
          evidenceId: id,
          documentId: docId,
        })),
        skipDuplicates: true,
      });
    }

    // Unlink documents if provided
    if (
      body.removeDocumentIds &&
      Array.isArray(body.removeDocumentIds) &&
      body.removeDocumentIds.length > 0
    ) {
      await prisma.complianceEvidenceDocument.deleteMany({
        where: {
          evidenceId: id,
          documentId: { in: body.removeDocumentIds },
        },
      });
    }

    const action =
      body.status && body.status !== existing.status
        ? "evidence_status_changed"
        : "evidence_updated";

    await logAuditEvent({
      userId: session.user.id,
      action,
      entityType: "compliance_evidence",
      entityId: id,
      description: `Updated evidence "${evidence.title}"`,
      previousValue: { status: existing.status },
      newValue: updateData,
    });

    return NextResponse.json({ evidence });
  } catch (error) {
    console.error("Update evidence error:", error);
    return NextResponse.json(
      { error: "Failed to update evidence" },
      { status: 500 },
    );
  }
}

// DELETE: Remove evidence
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = await getOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const existing = await prisma.complianceEvidence.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Evidence not found" },
        { status: 404 },
      );
    }

    await prisma.complianceEvidence.delete({ where: { id } });

    await logAuditEvent({
      userId: session.user.id,
      action: "evidence_deleted",
      entityType: "compliance_evidence",
      entityId: id,
      description: `Deleted evidence "${existing.title}" for ${existing.regulationType}/${existing.requirementId}`,
      previousValue: {
        title: existing.title,
        regulationType: existing.regulationType,
        requirementId: existing.requirementId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete evidence error:", error);
    return NextResponse.json(
      { error: "Failed to delete evidence" },
      { status: 500 },
    );
  }
}
