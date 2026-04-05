import { NextResponse } from "next/server";
import { z } from "zod";
import type { DeadlineCategory, Priority, ModuleType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePaginationLimit } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";

// GET /api/timeline/deadlines - List deadlines with filters
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      "api",
      getIdentifier(req, userId),
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Org-scoping
    const orgContext = await getCurrentOrganization(userId);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const moduleSource = searchParams.get("moduleSource");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parsePaginationLimit(searchParams.get("limit"));
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {
      OR: [
        { userId },
        ...(orgContext?.organizationId
          ? [{ organizationId: orgContext.organizationId }]
          : []),
      ],
    };

    if (status) {
      if (status === "active") {
        where.status = { notIn: ["COMPLETED", "CANCELLED"] };
      } else {
        where.status = status;
      }
    }

    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (moduleSource) where.moduleSource = moduleSource;

    if (from || to) {
      where.dueDate = {};
      if (from) (where.dueDate as Record<string, Date>).gte = new Date(from);
      if (to) (where.dueDate as Record<string, Date>).lte = new Date(to);
    }

    const [deadlines, total] = await Promise.all([
      prisma.deadline.findMany({
        where,
        orderBy: { dueDate: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.deadline.count({ where }),
    ]);

    // Update overdue statuses
    const now = new Date();
    const overdueIds = deadlines
      .filter((d) => d.status === "UPCOMING" && d.dueDate < now)
      .map((d) => d.id);

    if (overdueIds.length > 0) {
      await prisma.deadline.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: "OVERDUE" },
      });
    }

    // Update due soon statuses
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoonIds = deadlines
      .filter(
        (d) =>
          d.status === "UPCOMING" &&
          d.dueDate >= now &&
          d.dueDate <= sevenDaysFromNow,
      )
      .map((d) => d.id);

    if (dueSoonIds.length > 0) {
      await prisma.deadline.updateMany({
        where: { id: { in: dueSoonIds } },
        data: { status: "DUE_SOON" },
      });
    }

    return NextResponse.json({ deadlines, total });
  } catch (error) {
    logger.error("Error fetching deadlines", error);
    return NextResponse.json(
      { error: "Failed to fetch deadlines" },
      { status: 500 },
    );
  }
}

// POST /api/timeline/deadlines - Create new deadline
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limiting
    const postRateLimitResult = await checkRateLimit(
      "sensitive",
      getIdentifier(req, userId),
    );
    if (!postRateLimitResult.success) {
      return createRateLimitResponse(postRateLimitResult);
    }

    // Org-scoping
    const orgContext = await getCurrentOrganization(userId);

    const deadlineSchema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().min(1),
      category: z.string().min(1),
      priority: z.string().min(1),
      moduleSource: z.string().optional(),
      relatedEntityId: z.string().optional(),
      reminderDays: z.array(z.number().int()).optional(),
      isRecurring: z.boolean().optional(),
      recurrenceRule: z.string().optional(),
      assignedTo: z.string().optional(),
      assignedTeam: z.string().optional(),
      regulatoryRef: z.string().optional(),
      penaltyInfo: z.string().optional(),
    });

    const body = await req.json();
    const parsed = deadlineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      title,
      description,
      dueDate,
      category,
      priority,
      moduleSource,
      relatedEntityId,
      reminderDays,
      isRecurring,
      recurrenceRule,
      assignedTo,
      assignedTeam,
      regulatoryRef,
      penaltyInfo,
    } = parsed.data;

    // Determine initial status
    const dueDateObj = new Date(dueDate);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let status: "UPCOMING" | "DUE_SOON" | "OVERDUE" = "UPCOMING";
    if (dueDateObj < now) {
      status = "OVERDUE";
    } else if (dueDateObj <= sevenDaysFromNow) {
      status = "DUE_SOON";
    }

    const deadline = await prisma.deadline.create({
      data: {
        userId,
        organizationId: orgContext?.organizationId,
        title,
        description,
        dueDate: dueDateObj,
        category: category as DeadlineCategory,
        priority: priority as Priority,
        status,
        moduleSource: moduleSource as ModuleType | undefined,
        relatedEntityId,
        reminderDays: reminderDays || [30, 14, 7, 3, 1],
        isRecurring: isRecurring || false,
        recurrenceRule,
        assignedTo,
        assignedTeam,
        regulatoryRef,
        penaltyInfo,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId,
        action: "deadline_created",
        entityType: "deadline",
        entityId: deadline.id,
        newValue: JSON.stringify({
          title,
          dueDate,
          category,
          priority,
        }),
        description: `Created deadline: ${title}`,
      },
    });

    return NextResponse.json({ success: true, deadline });
  } catch (error) {
    logger.error("Error creating deadline", error);
    return NextResponse.json(
      { error: "Failed to create deadline" },
      { status: 500 },
    );
  }
}
