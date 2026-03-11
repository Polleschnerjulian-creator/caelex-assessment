import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { updateVulnerability } from "@/lib/nexus/vulnerability-service.server";
import { UpdateVulnerabilitySchema } from "@/lib/nexus/validations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; vulnId: string }> },
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

    const { id, vulnId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;
    const body = await req.json();
    const parsed = UpdateVulnerabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const vulnerability = await updateVulnerability(
      vulnId,
      parsed.data,
      organizationId,
      userId,
    );
    void id;
    return NextResponse.json({ vulnerability });
  } catch (error) {
    logger.error("Error updating vulnerability", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; vulnId: string }> },
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

    const { id, vulnId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;

    await prisma.assetVulnerability.delete({ where: { id: vulnId } });

    await logAuditEvent({
      userId,
      action: "nexus_vulnerability_updated",
      entityType: "nexus_vulnerability",
      entityId: vulnId,
      description: "Deleted vulnerability",
      organizationId,
    });

    void id;
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting vulnerability", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
