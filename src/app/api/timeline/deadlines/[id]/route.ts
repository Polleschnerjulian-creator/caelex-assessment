import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { id } = await params;

    const deadline = await prisma.deadline.findFirst({
      where: {
        id,
        userId: session.user.id,
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
    console.error("Error fetching deadline:", error);
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

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.deadline.findFirst({
      where: { id, userId: session.user.id },
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
      updateData.completedBy = session.user.id;
      if (parsed.data.completionNotes) {
        updateData.completionNotes = parsed.data.completionNotes;
      }
    }

    // Use findFirst + update pattern with userId to prevent IDOR
    const deadline = await prisma.deadline.update({
      where: { id, userId: session.user.id },
      data: updateData,
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
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
    console.error("Error updating deadline:", error);
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

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.deadline.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Deadline not found" },
        { status: 404 },
      );
    }

    await prisma.deadline.delete({ where: { id, userId: session.user.id } });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "deadline_deleted",
        entityType: "deadline",
        entityId: id,
        previousValue: JSON.stringify(existing),
        description: `Deleted deadline: ${existing.title}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deadline:", error);
    return NextResponse.json(
      { error: "Failed to delete deadline" },
      { status: 500 },
    );
  }
}
