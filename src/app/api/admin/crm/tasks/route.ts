/**
 * Admin CRM: Tasks API
 *
 * GET   /api/admin/crm/tasks — list tasks (filterable by owner, assignee,
 *       status, scope). `assignee` = <userId> | "me" | "none" | "all".
 * POST  /api/admin/crm/tasks — create a task (optionally assigned)
 * PATCH /api/admin/crm/tasks — update status/title/description/dueDate/assignee
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { isSuperAdmin } from "@/lib/super-admin";
import { isAssignableEmail } from "@/lib/crm/assignees.server";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

/**
 * A task may only be assigned to one of the platform owners (the same
 * set GET /api/admin/crm/assignees offers). Anything else → 400.
 */
async function isValidAssignee(assigneeId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { email: true },
  });
  return !!user && isAssignableEmail(user.email);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Super-admins (platform owners) are always authorized. Everyone else must
    // hold the DB "admin" role (requireRole throws ForbiddenError → 403 below).
    if (!isSuperAdmin(session.user.email)) {
      await requireRole(["admin"]);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "OPEN";
    const ownerId = searchParams.get("ownerId") || undefined;
    const contactId = searchParams.get("contactId") || undefined;
    const companyId = searchParams.get("companyId") || undefined;
    const dealId = searchParams.get("dealId") || undefined;
    // "all" (default) = no filter · "me" = assigned to the caller ·
    // "none" = unassigned · anything else = a concrete user id.
    const assignee = searchParams.get("assignee") || "all";

    const where: Prisma.CrmTaskWhereInput = {
      ...(status !== "ALL" && {
        status: status as Prisma.EnumCrmTaskStatusFilter["equals"],
      }),
      ...(ownerId && { ownerId }),
      ...(contactId && { contactId }),
      ...(companyId && { companyId }),
      ...(dealId && { dealId }),
      ...(assignee === "me"
        ? { assigneeId: session.user.id }
        : assignee === "none"
          ? { assigneeId: null }
          : assignee !== "all"
            ? { assigneeId: assignee }
            : {}),
    };

    const tasks = await prisma.crmTask.findMany({
      where,
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      take: 100,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ tasks });
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
    logger.error("Failed to list CRM tasks", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to list tasks") },
      { status: 500 },
    );
  }
}

// NOTE: tasks created from the "Aufgaben" board are standalone — the
// former "at least one of contactId/companyId/dealId" refine is gone.
// Record links stay optional and are still validated as cuids.
const createSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  ownerId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
  contactId: z.string().cuid().optional(),
  companyId: z.string().cuid().optional(),
  dealId: z.string().cuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Super-admins (platform owners) are always authorized. Everyone else must
    // hold the DB "admin" role (requireRole throws ForbiddenError → 403 below).
    if (!isSuperAdmin(session.user.email)) {
      await requireRole(["admin"]);
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Default null = unassigned. A provided assignee must be one of the
    // platform owners (same set as GET /api/admin/crm/assignees).
    if (
      parsed.data.assigneeId &&
      !(await isValidAssignee(parsed.data.assigneeId))
    ) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }

    const task = await prisma.crmTask.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        ownerId: parsed.data.ownerId || session.user.id,
        assigneeId: parsed.data.assigneeId ?? null,
        contactId: parsed.data.contactId,
        companyId: parsed.data.companyId,
        dealId: parsed.data.dealId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.crmActivity.create({
      data: {
        type: "TASK_CREATED",
        source: "MANUAL",
        summary: `Task: ${parsed.data.title}`,
        contactId: parsed.data.contactId,
        companyId: parsed.data.companyId,
        dealId: parsed.data.dealId,
        userId: session.user.id,
      },
    });

    logger.info("CRM task created", {
      taskId: task.id,
      ownerId: task.ownerId,
    });

    return NextResponse.json({ task }, { status: 201 });
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
    logger.error("Failed to create CRM task", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to create task") },
      { status: 500 },
    );
  }
}

const patchSchema = z
  .object({
    id: z.string().cuid(),
    status: z.enum(["OPEN", "COMPLETED", "CANCELLED"]).optional(),
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(5000).nullable().optional(),
    dueDate: z.string().datetime({ offset: true }).nullable().optional(),
    assigneeId: z.string().cuid().nullable().optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.title !== undefined ||
      d.description !== undefined ||
      d.dueDate !== undefined ||
      d.assigneeId !== undefined,
    "At least one field to update is required",
  );

/**
 * PATCH /api/admin/crm/tasks — complete / reopen / cancel a task, or
 * edit title/description/dueDate/assignee. Mirrors the GET/POST gate;
 * a transition to COMPLETED stamps completedAt and logs a
 * TASK_COMPLETED activity on the task's contact/company/deal.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperAdmin(session.user.email)) {
      await requireRole(["admin"]);
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // null = explicitly unassign (allowed); a non-null assignee must be
    // one of the platform owners.
    if (
      parsed.data.assigneeId != null &&
      !(await isValidAssignee(parsed.data.assigneeId))
    ) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }

    const existing = await prisma.crmTask.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        title: true,
        status: true,
        contactId: true,
        companyId: true,
        dealId: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: Prisma.CrmTaskUncheckedUpdateInput = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.description !== undefined) {
      data.description = parsed.data.description;
    }
    if (parsed.data.dueDate !== undefined) {
      data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    }
    if (parsed.data.assigneeId !== undefined) {
      data.assigneeId = parsed.data.assigneeId;
    }
    if (parsed.data.status !== undefined) {
      data.status = parsed.data.status;
      data.completedAt = parsed.data.status === "COMPLETED" ? new Date() : null;
    }

    const task = await prisma.crmTask.update({
      where: { id: parsed.data.id },
      data,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    if (parsed.data.status === "COMPLETED" && existing.status !== "COMPLETED") {
      await prisma.crmActivity.create({
        data: {
          type: "TASK_COMPLETED",
          source: "MANUAL",
          summary: `Task erledigt: ${existing.title}`,
          contactId: existing.contactId,
          companyId: existing.companyId,
          dealId: existing.dealId,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json({ task });
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
