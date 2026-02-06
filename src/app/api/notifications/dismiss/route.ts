/**
 * Dismiss API
 * POST: Dismiss notification(s)
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  dismissNotification,
  dismissAllNotifications,
} from "@/lib/services/notification-service";
import {
  CuidSchema,
  getSafeErrorMessage,
  formatZodErrors,
} from "@/lib/validations";

// Validation schema
const DismissSchema = z
  .object({
    notificationId: CuidSchema.optional(),
    all: z.boolean().optional(),
  })
  .refine((data) => data.all === true || !!data.notificationId, {
    message: "Either 'notificationId' or 'all: true' is required",
  });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validation = DismissSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodErrors(validation.error),
        },
        { status: 400 },
      );
    }

    const { notificationId, all } = validation.data;

    if (all) {
      const count = await dismissAllNotifications(session.user.id);
      return NextResponse.json({
        count,
        message: `Dismissed ${count} notification(s)`,
      });
    }

    await dismissNotification(session.user.id, notificationId!);

    return NextResponse.json({
      message: "Notification dismissed",
    });
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to dismiss notification") },
      { status: 500 },
    );
  }
}
