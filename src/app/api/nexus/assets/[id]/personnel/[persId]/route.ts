import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { updatePersonnel } from "@/lib/nexus/personnel-service.server";
import { UpdatePersonnelSchema } from "@/lib/nexus/validations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; persId: string }> },
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

    const { id, persId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;
    const body = await req.json();
    const parsed = UpdatePersonnelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const person = await updatePersonnel(
      persId,
      {
        ...parsed.data,
        lastTraining: parsed.data.lastTraining
          ? new Date(parsed.data.lastTraining)
          : undefined,
        accessExpiresAt: parsed.data.accessExpiresAt
          ? new Date(parsed.data.accessExpiresAt)
          : undefined,
      },
      organizationId,
      userId,
    );
    void id;
    return NextResponse.json({ person });
  } catch (error) {
    logger.error("Error updating personnel", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; persId: string }> },
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

    const { id, persId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;

    await prisma.assetPersonnel.delete({ where: { id: persId } });

    await logAuditEvent({
      userId,
      action: "nexus_personnel_updated",
      entityType: "nexus_personnel",
      entityId: persId,
      description: "Deleted personnel",
      organizationId,
    });

    void id;
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting personnel", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
