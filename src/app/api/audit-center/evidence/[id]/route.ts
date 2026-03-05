import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/services/audit-center-service.server";
import { logAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

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
    logger.error("Get evidence error", error);
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

    const evidencePatchSchema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      evidenceType: z.string().optional(),
      status: z.string().optional(),
      validFrom: z.string().nullable().optional(),
      validUntil: z.string().nullable().optional(),
      reviewNotes: z.string().nullable().optional(),
      addDocumentIds: z.array(z.string()).optional(),
      removeDocumentIds: z.array(z.string()).optional(),
    });

    const body = await request.json();
    const parsed = evidencePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description;
    if (parsed.data.evidenceType !== undefined)
      updateData.evidenceType = parsed.data.evidenceType;
    if (parsed.data.status !== undefined)
      updateData.status = parsed.data.status;
    if (parsed.data.validFrom !== undefined)
      updateData.validFrom = parsed.data.validFrom
        ? new Date(parsed.data.validFrom)
        : null;
    if (parsed.data.validUntil !== undefined)
      updateData.validUntil = parsed.data.validUntil
        ? new Date(parsed.data.validUntil)
        : null;
    if (parsed.data.reviewNotes !== undefined)
      updateData.reviewNotes = parsed.data.reviewNotes;

    // Handle review action
    if (
      parsed.data.status === "ACCEPTED" ||
      parsed.data.status === "REJECTED"
    ) {
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

    // Link new documents if provided (with ownership verification)
    if (parsed.data.addDocumentIds && parsed.data.addDocumentIds.length > 0) {
      // Verify all documents belong to users in the same organization
      const orgMembers = await prisma.organizationMember.findMany({
        where: { organizationId },
        select: { userId: true },
      });
      const orgUserIds = orgMembers.map((m) => m.userId);

      const docs = await prisma.document.findMany({
        where: {
          id: { in: parsed.data.addDocumentIds },
          userId: { in: orgUserIds },
        },
        select: { id: true },
      });
      const validDocIds = new Set(docs.map((d) => d.id));
      const verifiedDocIds = parsed.data.addDocumentIds!.filter(
        (docId: string) => validDocIds.has(docId),
      );

      if (verifiedDocIds.length > 0) {
        await prisma.complianceEvidenceDocument.createMany({
          data: verifiedDocIds.map((docId: string) => ({
            evidenceId: id,
            documentId: docId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Unlink documents if provided
    if (
      parsed.data.removeDocumentIds &&
      parsed.data.removeDocumentIds.length > 0
    ) {
      await prisma.complianceEvidenceDocument.deleteMany({
        where: {
          evidenceId: id,
          documentId: { in: parsed.data.removeDocumentIds },
        },
      });
    }

    const action =
      parsed.data.status && parsed.data.status !== existing.status
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
    logger.error("Update evidence error", error);
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
    logger.error("Delete evidence error", error);
    return NextResponse.json(
      { error: "Failed to delete evidence" },
      { status: 500 },
    );
  }
}
