/**
 * Assure Data Room Documents API
 * POST: Add a document to the data room.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

const addDocumentSchema = z.object({
  folder: z.string().min(1, "Folder is required"),
  fileName: z.string().min(1, "File name is required").max(255),
  fileSize: z.number().int().positive().optional(),
  fileUrl: z.string().url().optional(),
  documentId: z.string().optional(),
});

export async function POST(request: Request) {
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

    const organizationId = membership.organizationId;

    const dataRoom = await prisma.assureDataRoom.findFirst({
      where: { organizationId },
    });

    if (!dataRoom) {
      return NextResponse.json(
        {
          error:
            "Data room not found. Access the data room first to initialize it.",
        },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = addDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const document = await prisma.assureDataRoomDocument.create({
      data: {
        dataRoomId: dataRoom.id,
        folder: data.folder,
        fileName: data.fileName,
        fileSize: data.fileSize ?? null,
        fileUrl: data.fileUrl ?? null,
        documentId: data.documentId ?? null,
        uploadedById: session.user.id,
      },
    });

    // Update completion rate
    const totalDocs = await prisma.assureDataRoomDocument.count({
      where: { dataRoomId: dataRoom.id },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checklistItems = (dataRoom.checklistItems as any[]) || [];
    const requiredCount = checklistItems.filter(
      (item: { required?: boolean }) => item.required,
    ).length;
    const completionRate =
      requiredCount > 0
        ? Math.min(100, Math.round((totalDocs / requiredCount) * 100))
        : 0;

    await prisma.assureDataRoom.update({
      where: { id: dataRoom.id },
      data: { completionRate },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_dataroom_doc_added",
      entityType: "assure_dataroom",
      entityId: document.id,
      metadata: {
        folder: data.folder,
        fileName: data.fileName,
        dataRoomId: dataRoom.id,
      },
      organizationId,
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Assure data room document add error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
