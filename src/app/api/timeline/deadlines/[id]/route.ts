import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { roleHasPermission } from "@/lib/permissions";

// GET /api/timeline/deadlines/[id] - Get deadline details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const deadline = await prisma.deadline.findFirst({
      where: {
        id,
        OR: [
          { userId },
          ...(orgContext?.organizationId
            ? [{ organizationId: orgContext.organizationId }]
            : []),
        ],
      },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!deadline) {
      return NextResponse.json(
        { error: "Deadline not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ deadline });
  } catch (error) {
    logger.error("Error fetching deadline", error);
    return NextResponse.json(
      { error: "Failed to fetch deadline" },
      { status: 500 },
    );
  }
}

// PATCH /api/timeline/deadlines/[id] - Update deadline
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limiting
    const patchRateLimitResult = await checkRateLimit(
      "sensitive",
      getIdentifier(req, userId),
    );
    if (!patchRateLimitResult.success) {
      return createRateLimitResponse(patchRateLimitResult);
    }

    // Org-scoping
    const orgContext = await getCurrentOrganization(userId);

    const { id } = await params;

    // Verify ownership (org-scoped)
    const existing = await prisma.deadline.findFirst({
      where: {
        id,
        OR: [
          { userId },
          ...(orgContext?.organizationId
            ? [{ organizationId: orgContext.organizationId }]
            : []),
        ],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Deadline not found" },
        { status: 404 },
      );
    }

    const updateDeadlineSchema = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      category: z.string().optional(),
      priority: z.string().optional(),
      status: z.string().optional(),
      reminderDays: z.array(z.number().int()).optional(),
      assignedTo: z.string().optional(),
      assignedTeam: z.string().optional(),
      regulatoryRef: z.string().optional(),
      penaltyInfo: z.string().optional(),
      completionNotes: z.string().optional(),
    });

    const body = await req.json();
    const parsed = updateDeadlineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};

    // Allowed fields to update
    const allowedFields = [
      "title",
      "description",
      "dueDate",
      "category",
      "priority",
      "status",
      "reminderDays",
      "assignedTo",
      "assignedTeam",
      "regulatoryRef",
      "penaltyInfo",
    ];

    for (const field of allowedFields) {
      if (parsed.data[field as keyof typeof parsed.data] !== undefined) {
        if (field === "dueDate") {
          updateData.dueDate = new Date(parsed.data.dueDate!);
        } else {
          updateData[field] = parsed.data[field as keyof typeof parsed.data];
        }
      }
    }

    // Handle completion
    if (parsed.data.status === "COMPLETED" && existing.status !== "COMPLETED") {
      updateData.completedAt = new Date();
      updateData.completedBy = userId;
      if (parsed.data.completionNotes) {
        updateData.completionNotes = parsed.data.completionNotes;
      }
    }

    // Update using the already-verified existing record
    const deadline = await prisma.deadline.update({
      where: { id },
      data: updateData,
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId,
        action: "deadline_updated",
        entityType: "deadline",
        entityId: deadline.id,
        previousValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
        description: `Updated deadline: ${deadline.title}`,
      },
    });

    return NextResponse.json({ success: true, deadline });
  } catch (error) {
    logger.error("Error updating deadline", error);
    return NextResponse.json(
      { error: "Failed to update deadline" },
      { status: 500 },
    );
  }
}

// DELETE /api/timeline/deadlines/[id] - Delete deadline
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limiting
    const deleteRateLimitResult = await checkRateLimit(
      "sensitive",
      getIdentifier(req, userId),
    );
    if (!deleteRateLimitResult.success) {
      return createRateLimitResponse(deleteRateLimitResult);
    }

    // Org-scoping + RBAC (MANAGER+ required for DELETE)
    const orgContext = await getCurrentOrganization(userId);
    if (orgContext && !roleHasPermission(orgContext.role, "compliance:write")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Verify ownership (org-scoped)
    const existing = await prisma.deadline.findFirst({
      where: {
        id,
        OR: [
          { userId },
          ...(orgContext?.organizationId
            ? [{ organizationId: orgContext.organizationId }]
            : []),
        ],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Deadline not found" },
        { status: 404 },
      );
    }

    await prisma.deadline.delete({ where: { id } });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId,
        action: "deadline_deleted",
        entityType: "deadline",
        entityId: id,
        previousValue: JSON.stringify(existing),
        description: `Deleted deadline: ${existing.title}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting deadline", error);
    return NextResponse.json(
      { error: "Failed to delete deadline" },
      { status: 500 },
    );
  }
}
