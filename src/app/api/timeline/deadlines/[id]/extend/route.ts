import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/timeline/deadlines/[id]/extend - Extend deadline
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { newDueDate, reason, approvedBy } = body;

    if (!newDueDate || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: newDueDate, reason" },
        { status: 400 },
      );
    }

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

    if (existing.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot extend completed deadline" },
        { status: 400 },
      );
    }

    const newDueDateObj = new Date(newDueDate);
    if (newDueDateObj <= existing.dueDate) {
      return NextResponse.json(
        { error: "New due date must be after current due date" },
        { status: 400 },
      );
    }

    // Determine new status
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let newStatus: "UPCOMING" | "DUE_SOON" | "EXTENDED" = "EXTENDED";

    if (newDueDateObj > sevenDaysFromNow) {
      newStatus = "UPCOMING";
    } else if (newDueDateObj > now) {
      newStatus = "DUE_SOON";
    }

    const deadline = await prisma.deadline.update({
      where: { id },
      data: {
        dueDate: newDueDateObj,
        status: newStatus,
        originalDueDate: existing.originalDueDate || existing.dueDate,
        extensionReason: reason,
        extensionApprovedBy: approvedBy || session.user.id,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "deadline_extended",
        entityType: "deadline",
        entityId: deadline.id,
        previousValue: JSON.stringify({
          dueDate: existing.dueDate,
          status: existing.status,
        }),
        newValue: JSON.stringify({
          dueDate: newDueDateObj,
          status: newStatus,
          reason,
        }),
        description: `Extended deadline: ${deadline.title} to ${newDueDateObj.toISOString().split("T")[0]}`,
      },
    });

    return NextResponse.json({ success: true, deadline });
  } catch (error) {
    console.error("Error extending deadline:", error);
    return NextResponse.json(
      { error: "Failed to extend deadline" },
      { status: 500 },
    );
  }
}
