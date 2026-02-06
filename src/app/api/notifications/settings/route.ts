/**
 * Notification Settings API (New Notification System)
 * GET: Get user notification settings
 * PUT: Update user notification settings
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  NOTIFICATION_CATEGORIES,
} from "@/lib/services/notification-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await getNotificationPreferences(session.user.id);

    // Return default preferences if none exist
    const result = preferences || {
      emailEnabled: true,
      pushEnabled: true,
      categories: null,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      quietHoursTimezone: "Europe/Berlin",
      digestEnabled: false,
      digestFrequency: null,
    };

    return NextResponse.json({
      settings: result,
      categories: NOTIFICATION_CATEGORIES,
    });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification settings" },
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

    const body = await request.json();
    const {
      emailEnabled,
      pushEnabled,
      categories,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      quietHoursTimezone,
      digestEnabled,
      digestFrequency,
    } = body;

    // Validate quiet hours format if provided
    if (quietHoursStart && !/^\d{2}:\d{2}$/.test(quietHoursStart)) {
      return NextResponse.json(
        { error: "quietHoursStart must be in HH:MM format" },
        { status: 400 },
      );
    }

    if (quietHoursEnd && !/^\d{2}:\d{2}$/.test(quietHoursEnd)) {
      return NextResponse.json(
        { error: "quietHoursEnd must be in HH:MM format" },
        { status: 400 },
      );
    }

    // Validate digest frequency
    if (digestFrequency && !["daily", "weekly"].includes(digestFrequency)) {
      return NextResponse.json(
        { error: "digestFrequency must be 'daily' or 'weekly'" },
        { status: 400 },
      );
    }

    const settings = await updateNotificationPreferences(session.user.id, {
      emailEnabled,
      pushEnabled,
      categories,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      quietHoursTimezone,
      digestEnabled,
      digestFrequency,
    });

    return NextResponse.json({
      settings,
      message: "Notification settings updated",
    });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 },
    );
  }
}
