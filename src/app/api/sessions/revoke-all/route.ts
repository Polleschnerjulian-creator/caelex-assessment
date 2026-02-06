/**
 * Revoke All Sessions API
 * POST - Revoke all sessions for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revokeAllUserSessions } from "@/lib/services/session-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { exceptCurrent } = body;

    // If exceptCurrent is true, we'd need to know the current session ID
    // For now, just revoke all
    const revokedCount = await revokeAllUserSessions(
      session.user.id,
      exceptCurrent ? undefined : undefined, // TODO: Get current session ID
      "User revoked all sessions",
    );

    return NextResponse.json({
      success: true,
      revokedCount,
    });
  } catch (error) {
    console.error("Error revoking all sessions:", error);
    return NextResponse.json(
      { error: "Failed to revoke sessions" },
      { status: 500 },
    );
  }
}
