import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/services/audit-center-service.server";
import { logAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

// ─── GET: List all mappings for an evidence record ───

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

    // Verify evidence belongs to org
    const evidence = await prisma.complianceEvidence.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence not found" },
        { status: 404 },
      );
    }

    const mappings = await prisma.evidenceRequirementMapping.findMany({
      where: { evidenceId: id, organizationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ mappings });
  } catch (error) {
    logger.error("List evidence mappings error", error);
    return NextResponse.json(
      { error: "Failed to list evidence mappings" },
      { status: 500 },
    );
  }
}

// ─── POST: Create a new mapping ───

const createMappingSchema = z.object({
  requirementId: z.string().min(1, "requirementId is required"),
  mappingType: z.enum(["DIRECT", "PARTIAL", "SUPPORTING"]),
  coveragePercent: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(
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

    // Verify evidence belongs to org
    const evidence = await prisma.complianceEvidence.findFirst({
      where: { id, organizationId },
      select: { id: true, title: true },
    });
    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = createMappingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const mapping = await prisma.evidenceRequirementMapping.create({
      data: {
        organizationId,
        evidenceId: id,
        requirementId: parsed.data.requirementId,
        mappingType: parsed.data.mappingType,
        coveragePercent: parsed.data.coveragePercent ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "evidence_mapping_created",
      entityType: "evidence_requirement_mapping",
      entityId: mapping.id,
      description: `Mapped evidence "${evidence.title}" to requirement ${parsed.data.requirementId} (${parsed.data.mappingType})`,
      newValue: {
        evidenceId: id,
        requirementId: parsed.data.requirementId,
        mappingType: parsed.data.mappingType,
      },
    });

    return NextResponse.json({ mapping }, { status: 201 });
  } catch (error) {
    logger.error("Create evidence mapping error", error);
    return NextResponse.json(
      { error: "Failed to create evidence mapping" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Remove a mapping (via query param mappingId) ───

export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get("mappingId");
    if (!mappingId) {
      return NextResponse.json(
        { error: "mappingId query parameter is required" },
        { status: 400 },
      );
    }

    // Verify evidence belongs to org
    const evidence = await prisma.complianceEvidence.findFirst({
      where: { id, organizationId },
      select: { id: true, title: true },
    });
    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence not found" },
        { status: 404 },
      );
    }

    // Verify mapping exists and belongs to this evidence + org
    const existing = await prisma.evidenceRequirementMapping.findFirst({
      where: { id: mappingId, evidenceId: id, organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    await prisma.evidenceRequirementMapping.delete({
      where: { id: mappingId },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "evidence_mapping_deleted",
      entityType: "evidence_requirement_mapping",
      entityId: mappingId,
      description: `Removed mapping from evidence "${evidence.title}" to requirement ${existing.requirementId}`,
      previousValue: {
        evidenceId: id,
        requirementId: existing.requirementId,
        mappingType: existing.mappingType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Delete evidence mapping error", error);
    return NextResponse.json(
      { error: "Failed to delete evidence mapping" },
      { status: 500 },
    );
  }
}
