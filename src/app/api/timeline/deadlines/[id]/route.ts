import { NextResponse } from "next/server";
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

    const body = await req.json();
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
      if (body[field] !== undefined) {
        if (field === "dueDate") {
          updateData.dueDate = new Date(body.dueDate);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Handle completion
    if (body.status === "COMPLETED" && existing.status !== "COMPLETED") {
      updateData.completedAt = new Date();
      updateData.completedBy = session.user.id;
      if (body.completionNotes) {
        updateData.completionNotes = body.completionNotes;
      }
    }

    const deadline = await prisma.deadline.update({
      where: { id },
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

    await prisma.deadline.delete({ where: { id } });

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
