/**
 * POST /api/auth/unlock/[token]
 * Unlocks a locked account using email token
 */

import { NextResponse } from "next/server";
import { verifyUnlockToken } from "@/lib/login-security.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const unlockTokenSchema = z.object({
  token: z.string().min(1, "Token is required").max(512, "Token is too long"),
});

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const parsed = unlockTokenSchema.safeParse(resolvedParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { token } = parsed.data;
    const { ipAddress, userAgent } = getRequestContext(request);

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
    logger.error("Error unlocking account", error);
    return NextResponse.json(
      { error: "Failed to unlock account" },
      { status: 500 },
    );
  }
}
