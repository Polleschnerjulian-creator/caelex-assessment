/**
 * POST /api/auth/mfa/validate
 * Validates TOTP code during login or for sensitive operations
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { validateMfaCode, verifyAndConsumeBackupCode } from "@/lib/mfa.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  recordLoginEvent,
  clearFailedAttempts,
} from "@/lib/login-security.server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

const validateSchema = z.object({
  code: z.string().min(6).max(10), // 6 for TOTP, 8 for backup code
  isBackupCode: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    // Rate limit: 5 requests per minute per IP (M3/M17 security fix)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rl = await checkRateLimit("mfa", ip);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const validation = validateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { code, isBackupCode } = validation.data;
    const { ipAddress, userAgent } = getRequestContext(request);

    // Always require authenticated session — never accept userId from request body
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    let isValid = false;

    if (isBackupCode) {
      // Verify backup code
      isValid = await verifyAndConsumeBackupCode(userId, code);

      if (isValid) {
        await logAuditEvent({
          userId,
          action: "MFA_BACKUP_CODE_USED",
          entityType: "MfaConfig",
          entityId: userId,
          metadata: { codeUsed: true },
          ipAddress,
          userAgent,
        });

        await recordLoginEvent(
          userId,
          "BACKUP_CODE_USED",
          ipAddress ?? null,
          userAgent ?? null,
          "PASSWORD",
        );
      }
    } else {
      // Verify TOTP code
      isValid = await validateMfaCode(userId, code);
    }

    if (!isValid) {
      await logAuditEvent({
        userId,
        action: "MFA_CHALLENGE_FAILED",
        entityType: "MfaConfig",
        entityId: userId,
        metadata: { isBackupCode },
        ipAddress,
        userAgent,
      });

      await recordLoginEvent(
        userId,
        "MFA_FAILED",
        ipAddress ?? null,
        userAgent ?? null,
        "PASSWORD",
      );

      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Log successful validation
    await logAuditEvent({
      userId,
      action: "MFA_CHALLENGE_SUCCESS",
      entityType: "MfaConfig",
      entityId: userId,
      metadata: { isBackupCode },
      ipAddress,
      userAgent,
    });

    await recordLoginEvent(
      userId,
      "MFA_SUCCESS",
      ipAddress ?? null,
      userAgent ?? null,
      "PASSWORD",
    );

    // Clear failed attempts on successful MFA
    await clearFailedAttempts(userId);

    return NextResponse.json({
      success: true,
      message: "Code verified successfully",
    });
  } catch (error) {
    console.error("Error validating MFA:", error);
    return NextResponse.json(
      { error: "Failed to validate code" },
      { status: 500 },
    );
  }
}
