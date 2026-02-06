/**
 * Notifications API
 * GET: List user notifications
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  getUserNotifications,
  NOTIFICATION_CONFIG,
  NOTIFICATION_CATEGORIES,
} from "@/lib/services/notification-service";
import type { NotificationType, NotificationSeverity } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const read = url.searchParams.get("read");
    const type = url.searchParams.get("type") as NotificationType | null;
    const severity = url.searchParams.get(
      "severity",
    ) as NotificationSeverity | null;
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const { notifications, total, unreadCount } = await getUserNotifications(
      session.user.id,
      {
        read: read === null ? undefined : read === "true",
        type: type || undefined,
        severity: severity || undefined,
      },
      { limit, offset },
    );

    // Enrich notifications with config
    const enrichedNotifications = notifications.map((n) => ({
      ...n,
      config: NOTIFICATION_CONFIG[n.type],
    }));

    return NextResponse.json({
      notifications: enrichedNotifications,
      total,
      unreadCount,
      limit,
      offset,
      categories: NOTIFICATION_CATEGORIES,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}
