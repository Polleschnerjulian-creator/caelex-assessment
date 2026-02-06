/**
 * Sessions API
 * GET - List active sessions for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getUserSessions,
  getUserSessionStats,
  getSessionByToken,
} from "@/lib/services/session-service";

/**
 * Resolve the current UserSession ID by reading the session token
 * cookie set during session creation. Falls back to matching by the
 * request's client IP address against the most recently active session.
 */
async function resolveCurrentSessionId(
  request: NextRequest,
): Promise<string | null> {
  // Primary: look up by the dedicated session-token cookie
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("caelex-session-token");

  if (tokenCookie?.value) {
    const matched = await getSessionByToken(tokenCookie.value);
    if (matched) return matched.id;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("stats") === "true";

    const [sessions, stats, currentSessionId] = await Promise.all([
      getUserSessions(session.user.id),
      includeStats ? getUserSessionStats(session.user.id) : null,
      resolveCurrentSessionId(request),
    ]);

    // Determine current session: prefer cookie-based match, then fall
    // back to the request's client IP against the most recently active session.
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    const resolvedCurrentId =
      currentSessionId ??
      (clientIp
        ? (sessions.find((s) => s.ipAddress === clientIp)?.id ?? null)
        : null);

    // Format sessions for response
    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      deviceType: s.deviceType || "Unknown",
      browser: s.browser || "Unknown",
      browserVersion: s.browserVersion,
      os: s.os || "Unknown",
      osVersion: s.osVersion,
      ipAddress: s.ipAddress,
      city: s.city,
      country: s.country,
      countryCode: s.countryCode,
      authMethod: s.authMethod,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === resolvedCurrentId,
    }));

    return NextResponse.json({
      sessions: formattedSessions,
      ...(stats && { stats }),
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}
