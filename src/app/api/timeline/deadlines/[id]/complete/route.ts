import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/timeline/deadlines/[id]/complete - Mark deadline as completed
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
    const { notes } = body;

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
        { error: "Deadline already completed" },
        { status: 400 },
      );
    }

    const deadline = await prisma.deadline.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: session.user.id,
        completionNotes: notes,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "deadline_completed",
        entityType: "deadline",
        entityId: deadline.id,
        previousValue: JSON.stringify({ status: existing.status }),
        newValue: JSON.stringify({
          status: "COMPLETED",
          completedAt: deadline.completedAt,
        }),
        description: `Completed deadline: ${deadline.title}`,
      },
    });

    // If recurring, create next occurrence
    if (existing.isRecurring && existing.recurrenceRule) {
      await createNextRecurrence(existing, session.user.id);
    }

    return NextResponse.json({ success: true, deadline });
  } catch (error) {
    console.error("Error completing deadline:", error);
    return NextResponse.json(
      { error: "Failed to complete deadline" },
      { status: 500 },
    );
  }
}

// Helper function to create next recurrence
async function createNextRecurrence(
  deadline: {
    id: string;
    title: string;
    description: string | null;
    dueDate: Date;
    category: string;
    priority: string;
    moduleSource: string | null;
    relatedEntityId: string | null;
    reminderDays: number[];
    recurrenceRule: string | null;
    regulatoryRef: string | null;
    penaltyInfo: string | null;
    assignedTo: string | null;
    assignedTeam: string | null;
  },
  userId: string,
) {
  if (!deadline.recurrenceRule) return;

  // Parse simple RRULE to get next date
  const rule = deadline.recurrenceRule;
  let nextDate: Date | null = null;

  if (rule.includes("FREQ=YEARLY")) {
    nextDate = new Date(deadline.dueDate);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else if (rule.includes("FREQ=QUARTERLY")) {
    nextDate = new Date(deadline.dueDate);
    nextDate.setMonth(nextDate.getMonth() + 3);
  } else if (rule.includes("FREQ=MONTHLY")) {
    nextDate = new Date(deadline.dueDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else if (rule.includes("FREQ=WEEKLY")) {
    nextDate = new Date(deadline.dueDate);
    nextDate.setDate(nextDate.getDate() + 7);
  }

  if (nextDate) {
    await prisma.deadline.create({
      data: {
        userId,
        title: deadline.title,
        description: deadline.description,
        dueDate: nextDate,
        category: deadline.category as
          | "REGULATORY"
          | "LICENSE"
          | "REPORTING"
          | "INSURANCE"
          | "CERTIFICATION"
          | "MISSION"
          | "INTERNAL"
          | "CONTRACTUAL",
        priority: deadline.priority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        status: "UPCOMING",
        moduleSource: deadline.moduleSource as
          | "AUTHORIZATION"
          | "DEBRIS"
          | "INSURANCE"
          | "CYBERSECURITY"
          | "ENVIRONMENTAL"
          | "SUPERVISION"
          | "REGISTRATION"
          | "TIMELINE"
          | null,
        relatedEntityId: deadline.relatedEntityId,
        reminderDays: deadline.reminderDays,
        isRecurring: true,
        recurrenceRule: deadline.recurrenceRule,
        parentId: deadline.id,
        regulatoryRef: deadline.regulatoryRef,
        penaltyInfo: deadline.penaltyInfo,
        assignedTo: deadline.assignedTo,
        assignedTeam: deadline.assignedTeam,
      },
    });
  }
}
