import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/services/audit-center-service.server";
import { logAuditEvent } from "@/lib/audit";

// GET: List evidence for the organization
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const regulationType = searchParams.get("regulationType");
    const requirementId = searchParams.get("requirementId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { organizationId };
    if (regulationType) where.regulationType = regulationType;
    if (requirementId) where.requirementId = requirementId;
    if (status) where.status = status;

    const evidence = await prisma.complianceEvidence.findMany({
      where,
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
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ evidence });
  } catch (error) {
    console.error("List evidence error:", error);
    return NextResponse.json(
      { error: "Failed to list evidence" },
      { status: 500 },
    );
  }
}

// POST: Create new evidence
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      regulationType,
      requirementId,
      title,
      description,
      evidenceType,
      validFrom,
      validUntil,
      documentIds,
    } = body;

    if (!regulationType || !requirementId || !title || !evidenceType) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: regulationType, requirementId, title, evidenceType",
        },
        { status: 400 },
      );
    }

    const evidence = await prisma.complianceEvidence.create({
      data: {
        organizationId,
        createdBy: session.user.id,
        regulationType,
        requirementId,
        title,
        description: description || null,
        evidenceType,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });

    // Link documents if provided
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      await prisma.complianceEvidenceDocument.createMany({
        data: documentIds.map((docId: string) => ({
          evidenceId: evidence.id,
          documentId: docId,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch with relations
    const created = await prisma.complianceEvidence.findUnique({
      where: { id: evidence.id },
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

    await logAuditEvent({
      userId: session.user.id,
      action: "evidence_created",
      entityType: "compliance_evidence",
      entityId: evidence.id,
      description: `Created evidence "${title}" for ${regulationType}/${requirementId}`,
      newValue: { regulationType, requirementId, title, evidenceType },
    });

    return NextResponse.json({ evidence: created }, { status: 201 });
  } catch (error) {
    console.error("Create evidence error:", error);
    return NextResponse.json(
      { error: "Failed to create evidence" },
      { status: 500 },
    );
  }
}
