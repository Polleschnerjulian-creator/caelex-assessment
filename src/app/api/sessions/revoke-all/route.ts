/**
 * Revoke All Sessions API
 * POST - Revoke all sessions for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  revokeAllUserSessions,
  getSessionByToken,
  getUserSessions,
} from "@/lib/services/session-service";

/**
 * Resolve the current UserSession ID so we can optionally exclude it
 * when revoking all sessions.  Reads the dedicated session-token cookie
 * first, then falls back to matching by the request's client IP.
 */
async function resolveCurrentSessionId(
  request: NextRequest,
  userId: string,
): Promise<string | undefined> {
  // Primary: dedicated session-token cookie
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("caelex-session-token");

  if (tokenCookie?.value) {
    const matched = await getSessionByToken(tokenCookie.value);
    if (matched) return matched.id;
  }

  // Fallback: match most recently active session by client IP
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  if (clientIp) {
    const sessions = await getUserSessions(userId);
    const match = sessions.find((s) => s.ipAddress === clientIp);
    if (match) return match.id;
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { exceptCurrent } = body;

    // Resolve the current session ID so we can optionally keep it alive
    const currentSessionId = exceptCurrent
      ? await resolveCurrentSessionId(request, session.user.id)
      : undefined;

    const revokedCount = await revokeAllUserSessions(
      session.user.id,
      currentSessionId,
      "User revoked all sessions",
    );

    return NextResponse.json({
      success: true,
      revokedCount,
      currentSessionPreserved: exceptCurrent && !!currentSessionId,
    });
  } catch (error) {
    console.error("Error revoking all sessions:", error);
    return NextResponse.json(
      { error: "Failed to revoke sessions" },
      { status: 500 },
    );
  }
}
