import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  logAuditEvent,
  getRequestContext,
  generateAuditDescription,
} from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const statuses = await prisma.checklistStatus.findMany({
      where: { userId: session.user.id },
    });

    // Transform to { [checklistId]: { completed, notes, updatedAt } }
    const statusMap: Record<
      string,
      { completed: boolean; notes: string | null; updatedAt: Date }
    > = {};
    for (const s of statuses) {
      statusMap[s.checklistId] = {
        completed: s.completed,
        notes: s.notes,
        updatedAt: s.updatedAt,
      };
    }

    return NextResponse.json(statusMap);
  } catch (error) {
    console.error("Error fetching checklist statuses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { checklistId, completed, notes } = await request.json();

    if (!checklistId || typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Missing checklistId or completed" },
        { status: 400 },
      );
    }

    // Get previous value for audit logging
    const previous = await prisma.checklistStatus.findUnique({
      where: {
        userId_checklistId: {
          userId,
          checklistId,
        },
      },
    });

    const updated = await prisma.checklistStatus.upsert({
      where: {
        userId_checklistId: {
          userId,
          checklistId,
        },
      },
      update: {
        completed,
        notes: notes ?? undefined,
      },
      create: {
        userId,
        checklistId,
        completed,
        notes,
      },
    });

    // Log audit event if completion status changed
    if (!previous || previous.completed !== completed) {
      const { ipAddress, userAgent } = getRequestContext(request);
      await logAuditEvent({
        userId,
        action: completed
          ? "checklist_item_completed"
          : "checklist_item_uncompleted",
        entityType: "checklist",
        entityId: checklistId,
        previousValue: previous ? { completed: previous.completed } : null,
        newValue: { completed },
        description: generateAuditDescription(
          completed ? "checklist_item_completed" : "checklist_item_uncompleted",
          "checklist",
        ),
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating checklist status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
