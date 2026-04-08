/**
 * Admin CRM: Single Task API
 *
 * PATCH /api/admin/crm/tasks/[id] — update task (mark completed, change due date)
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["OPEN", "COMPLETED", "CANCELLED"]).optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
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

    const existing = await prisma.crmTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (typeof data.dueDate === "string") {
      data.dueDate = new Date(data.dueDate);
    }
    if (parsed.data.status === "COMPLETED" && existing.status !== "COMPLETED") {
      data.completedAt = new Date();
    }

    const updated = await prisma.crmTask.update({
      where: { id },
      data,
    });

    if (parsed.data.status === "COMPLETED" && existing.status !== "COMPLETED") {
      await prisma.crmActivity.create({
        data: {
          type: "TASK_COMPLETED",
          source: "MANUAL",
          summary: `Task completed: ${existing.title}`,
          contactId: existing.contactId,
          companyId: existing.companyId,
          dealId: existing.dealId,
          userId: session.user.id,
        },
      });
    }

    logger.info("CRM task updated", {
      taskId: id,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ task: updated });
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
    logger.error("Failed to update CRM task", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update task") },
      { status: 500 },
    );
  }
}
