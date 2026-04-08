/**
 * Admin: Single Contact Request Management API
 *
 * PATCH /api/admin/contact-requests/[id] — Update status and notes
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "ARCHIVED"]).optional(),
  notes: z.string().max(5000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { status, notes } = parsed.data;

    const existing = await prisma.contactRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Contact request not found" },
        { status: 404 },
      );
    }

    const updateData: {
      status?: typeof status;
      notes?: string;
      respondedAt?: Date;
    } = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (
      (status === "IN_PROGRESS" || status === "RESOLVED") &&
      !existing.respondedAt
    ) {
      updateData.respondedAt = new Date();
    }

    const updated = await prisma.contactRequest.update({
      where: { id },
      data: updateData,
    });

    logger.info("Contact request updated", {
      id,
      status: status || existing.status,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ contactRequest: updated });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.error("Failed to update contact request", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to update contact request"),
      },
      { status: 500 },
    );
  }
}
