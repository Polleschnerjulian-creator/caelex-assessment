/**
 * Sessions API
 * GET - List active sessions for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserSessions,
  getUserSessionStats,
} from "@/lib/services/session-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("stats") === "true";

    const [sessions, stats] = await Promise.all([
      getUserSessions(session.user.id),
      includeStats ? getUserSessionStats(session.user.id) : null,
    ]);

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
      isCurrent: false, // TODO: Compare with current session token
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
