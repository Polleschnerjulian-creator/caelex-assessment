/**
 * Mark Read API
 * POST: Mark notifications as read
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { markAsRead, markAllAsRead } from "@/lib/services/notification-service";
import {
  CuidSchema,
  getSafeErrorMessage,
  formatZodErrors,
} from "@/lib/validations";

// Validation schema
const MarkReadSchema = z
  .object({
    notificationIds: z.array(CuidSchema).min(1).max(100).optional(),
    all: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.all === true ||
      (data.notificationIds && data.notificationIds.length > 0),
    { message: "Either 'notificationIds' array or 'all: true' is required" },
  );

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validation = MarkReadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodErrors(validation.error),
        },
        { status: 400 },
      );
    }

    const { notificationIds, all } = validation.data;
    let count: number;

    if (all) {
      count = await markAllAsRead(session.user.id);
    } else {
      count = await markAsRead(session.user.id, notificationIds!);
    }

    return NextResponse.json({
      count,
      message: `Marked ${count} notification(s) as read`,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(
          error,
          "Failed to mark notifications as read",
        ),
      },
      { status: 500 },
    );
  }
}
