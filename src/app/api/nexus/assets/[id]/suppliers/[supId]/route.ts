import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { updateSupplier } from "@/lib/nexus/supplier-service.server";
import { UpdateSupplierSchema } from "@/lib/nexus/validations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; supId: string }> },
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

    const { id, supId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;
    const body = await req.json();
    const parsed = UpdateSupplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supplier = await updateSupplier(
      supId,
      {
        ...parsed.data,
        contractExpiry: parsed.data.contractExpiry
          ? new Date(parsed.data.contractExpiry)
          : undefined,
      },
      organizationId,
      userId,
    );
    void id;
    return NextResponse.json({ supplier });
  } catch (error) {
    logger.error("Error updating supplier", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; supId: string }> },
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

    const { id, supId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;

    await prisma.assetSupplier.delete({ where: { id: supId } });

    await logAuditEvent({
      userId,
      action: "nexus_supplier_updated",
      entityType: "nexus_supplier",
      entityId: supId,
      description: "Deleted supplier",
      organizationId,
    });

    void id;
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting supplier", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
