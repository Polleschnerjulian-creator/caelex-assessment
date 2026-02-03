import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/supervision/calendar - Get calendar events
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const eventType = searchParams.get("type");
    const status = searchParams.get("status");

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ events: [] });
    }

    const where: Record<string, unknown> = { supervisionId: config.id };

    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate)
        (where.dueDate as Record<string, Date>).gte = new Date(startDate);
      if (endDate)
        (where.dueDate as Record<string, Date>).lte = new Date(endDate);
    }

    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    const events = await prisma.supervisionCalendarEvent.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });

    // Update overdue events
    const now = new Date();
    const overdueIds = events
      .filter((e) => e.status === "upcoming" && e.dueDate < now)
      .map((e) => e.id);

    if (overdueIds.length > 0) {
      await prisma.supervisionCalendarEvent.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: "overdue" },
      });
    }

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 },
    );
  }
}

// POST /api/supervision/calendar - Create calendar event
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Supervision not configured" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const {
      eventType,
      title,
      description,
      dueDate,
      reminderDays,
      assignee,
      linkedReportId,
      linkedAssetIds,
      notes,
    } = body;

    if (!eventType || !title || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const event = await prisma.supervisionCalendarEvent.create({
      data: {
        supervisionId: config.id,
        eventType,
        title,
        description,
        dueDate: new Date(dueDate),
        reminderDays: reminderDays || [14, 7, 1],
        assignee,
        linkedReportId,
        linkedAssetIds: linkedAssetIds || [],
        notes,
        status: "upcoming",
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 },
    );
  }
}

// PATCH /api/supervision/calendar - Update event
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    // Verify event belongs to user
    const existing = await prisma.supervisionCalendarEvent.findFirst({
      where: { id, supervisionId: config.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (updates.status !== undefined) {
      updateData.status = updates.status;
      if (updates.status === "completed") {
        updateData.completedAt = new Date();
      }
    }
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.dueDate !== undefined)
      updateData.dueDate = new Date(updates.dueDate);
    if (updates.reminderDays !== undefined)
      updateData.reminderDays = updates.reminderDays;
    if (updates.assignee !== undefined) updateData.assignee = updates.assignee;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const event = await prisma.supervisionCalendarEvent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Error updating calendar event:", error);
    return NextResponse.json(
      { error: "Failed to update calendar event" },
      { status: 500 },
    );
  }
}

// DELETE /api/supervision/calendar - Delete event
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify event belongs to user
    const existing = await prisma.supervisionCalendarEvent.findFirst({
      where: { id, supervisionId: config.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.supervisionCalendarEvent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    return NextResponse.json(
      { error: "Failed to delete calendar event" },
      { status: 500 },
    );
  }
}
