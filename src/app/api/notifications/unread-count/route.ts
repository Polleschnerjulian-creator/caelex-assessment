/**
 * Unread Count API
 * GET: Get unread notification count (for badge)
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/services/notification-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await getUnreadCount(session.user.id);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 },
    );
  }
}
