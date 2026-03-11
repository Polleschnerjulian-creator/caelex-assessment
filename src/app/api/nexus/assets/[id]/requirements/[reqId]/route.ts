import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { UpdateRequirementSchema } from "@/lib/nexus/validations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; reqId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgContext = await getCurrentOrganization(session.user.id);
    if (!orgContext?.organizationId) {
      return NextResponse.json(
        { error: "Organization required" },
        { status: 403 },
      );
    }

    const { id, reqId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;
    const body = await req.json();
    const parsed = UpdateRequirementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.status !== undefined)
      updateData.status = parsed.data.status;
    if (parsed.data.evidenceId !== undefined)
      updateData.evidenceId = parsed.data.evidenceId;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.nextReviewDate !== undefined)
      updateData.nextReviewDate = parsed.data.nextReviewDate
        ? new Date(parsed.data.nextReviewDate)
        : null;

    const requirement = await prisma.assetRequirement.update({
      where: { id: reqId },
      data: updateData,
    });

    await logAuditEvent({
      userId,
      action: "nexus_requirement_assessed",
      entityType: "nexus_requirement",
      entityId: reqId,
      description: `Updated requirement status to ${parsed.data.status ?? "unchanged"}`,
      organizationId,
    });

    void id; // id is part of the route context but not needed for the update
    return NextResponse.json({ requirement });
  } catch (error) {
    logger.error("Error updating requirement", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; reqId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgContext = await getCurrentOrganization(session.user.id);
    if (!orgContext?.organizationId) {
      return NextResponse.json(
        { error: "Organization required" },
        { status: 403 },
      );
    }

    const { id, reqId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;

    await prisma.assetRequirement.delete({ where: { id: reqId } });

    await logAuditEvent({
      userId,
      action: "nexus_requirement_assessed",
      entityType: "nexus_requirement",
      entityId: reqId,
      description: "Deleted requirement",
      organizationId,
    });

    void id;
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting requirement", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
