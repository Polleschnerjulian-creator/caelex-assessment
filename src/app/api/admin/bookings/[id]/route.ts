/**
 * Admin: Single Booking Management API
 *
 * PATCH /api/admin/bookings/[id] — Update a booking's status and notes
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateBookingSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
  notes: z.string().max(5000).optional(),
});

/**
 * PATCH /api/admin/bookings/[id]
 *
 * Platform-level admin only (User.role === "admin").
 *
 * Body:
 *   - status (required) — CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
 *   - notes (optional) — Admin notes (max 5000 chars)
 */
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
    const parsed = updateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { status, notes } = parsed.data;

    // Verify the booking exists
    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Build update data
    const updateData: {
      status: typeof status;
      notes?: string;
      cancelledAt?: Date;
      completedAt?: Date;
    } = { status };

    if (notes !== undefined) updateData.notes = notes;
    if (status === "CANCELLED") updateData.cancelledAt = new Date();
    if (status === "COMPLETED") updateData.completedAt = new Date();

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
    });

    // Update linked DemoRequest status if applicable
    if (existing.demoRequestId) {
      if (status === "CANCELLED") {
        await prisma.demoRequest.update({
          where: { id: existing.demoRequestId },
          data: { status: "NO_RESPONSE" },
        });
      } else if (status === "COMPLETED") {
        await prisma.demoRequest.update({
          where: { id: existing.demoRequestId },
          data: { status: "COMPLETED" },
        });
      }
    }

    // Sync HubCalendarEvent based on new status
    if (status === "CANCELLED") {
      try {
        await prisma.hubCalendarEvent.deleteMany({
          where: {
            title: { startsWith: `Demo: ${existing.name}` },
            date: existing.scheduledAt,
          },
        });
      } catch (e) {
        console.warn("Failed to delete calendar event for cancelled booking:", e);
      }
    }

    if (status === "COMPLETED") {
      try {
        await prisma.hubCalendarEvent.updateMany({
          where: {
            title: { startsWith: `Demo: ${existing.name}` },
            date: existing.scheduledAt,
          },
          data: {
            color: "#6B7280", // Gray — completed
            title: `✓ Demo: ${existing.name} — ${existing.company}`,
          },
        });
      } catch (e) {
        console.warn("Failed to update calendar event for completed booking:", e);
      }
    }

    if (status === "NO_SHOW") {
      try {
        await prisma.hubCalendarEvent.updateMany({
          where: {
            title: { startsWith: `Demo: ${existing.name}` },
            date: existing.scheduledAt,
          },
          data: {
            color: "#EF4444", // Red — no show
            title: `✗ Demo: ${existing.name} — ${existing.company}`,
          },
        });
      } catch (e) {
        console.warn("Failed to update calendar event for no-show booking:", e);
      }
    }

    logger.info("Booking updated", {
      id,
      status,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ booking: updated });
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
    logger.error("Failed to update booking", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update booking") },
      { status: 500 },
    );
  }
}
