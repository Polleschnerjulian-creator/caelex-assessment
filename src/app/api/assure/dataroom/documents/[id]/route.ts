/**
 * Assure Data Room Document Detail API
 * DELETE: Remove a document from the data room.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const document = await prisma.assureDataRoomDocument.findUnique({
      where: { id },
      include: {
        dataRoom: { select: { organizationId: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    if (document.dataRoom.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    await prisma.assureDataRoomDocument.delete({ where: { id } });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_dataroom_doc_removed",
      entityType: "assure_dataroom",
      entityId: id,
      metadata: {
        fileName: document.fileName,
        folder: document.folder,
      },
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assure data room document delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
