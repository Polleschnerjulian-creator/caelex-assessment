/**
 * Session Management API
 * GET - Get session details
 * DELETE - Revoke a specific session
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionById, revokeSession } from "@/lib/services/session-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSession = await getSessionById(sessionId);

    if (!userSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only allow viewing own sessions
    if (userSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      session: {
        id: userSession.id,
        deviceType: userSession.deviceType || "Unknown",
        browser: userSession.browser || "Unknown",
        browserVersion: userSession.browserVersion,
        os: userSession.os || "Unknown",
        osVersion: userSession.osVersion,
        ipAddress: userSession.ipAddress,
        city: userSession.city,
        country: userSession.country,
        countryCode: userSession.countryCode,
        authMethod: userSession.authMethod,
        isActive: userSession.isActive,
        lastActiveAt: userSession.lastActiveAt,
        createdAt: userSession.createdAt,
        expiresAt: userSession.expiresAt,
        revokedAt: userSession.revokedAt,
        revokedReason: userSession.revokedReason,
      },
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSession = await getSessionById(sessionId);

    if (!userSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only allow revoking own sessions
    if (userSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!userSession.isActive) {
      return NextResponse.json(
        { error: "Session already revoked" },
        { status: 400 },
      );
    }

    await revokeSession(sessionId, "User requested", session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking session:", error);
    return NextResponse.json(
      { error: "Failed to revoke session" },
      { status: 500 },
    );
  }
}
