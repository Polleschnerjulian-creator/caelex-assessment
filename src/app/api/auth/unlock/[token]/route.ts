/**
 * POST /api/auth/unlock/[token]
 * Unlocks a locked account using email token
 */

import { NextResponse } from "next/server";
import { verifyUnlockToken } from "@/lib/login-security.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { token } = await params;
    const { ipAddress, userAgent } = getRequestContext(request);

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const result = await verifyUnlockToken(token);

    if (!result.success) {
      // Don't log failed unlock attempts without a user ID
      return NextResponse.json(
        { error: result.error || "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Log successful unlock
    if (result.userId) {
      await logAuditEvent({
        userId: result.userId,
        action: "ACCOUNT_UNLOCKED",
        entityType: "User",
        entityId: result.userId,
        metadata: { unlockedViaEmail: true },
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Account unlocked successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Error unlocking account:", error);
    return NextResponse.json(
      { error: "Failed to unlock account" },
      { status: 500 },
    );
  }
}
