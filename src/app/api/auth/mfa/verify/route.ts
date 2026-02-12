/**
 * POST /api/auth/mfa/verify
 * Verifies the TOTP code and activates MFA
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { verifyMfaSetup } from "@/lib/mfa.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { z } from "zod";

const verifySchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, "Code must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = verifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid code format", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { code } = validation.data;
    const result = await verifyMfaSetup(session.user.id, code);

    const { ipAddress, userAgent } = getRequestContext(request);

    if (!result.success) {
      await logAuditEvent({
        userId: session.user.id,
        action: "MFA_CHALLENGE_FAILED",
        entityType: "MfaConfig",
        entityId: session.user.id,
        metadata: { reason: "Invalid code during setup" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    // Log successful MFA enable
    await logAuditEvent({
      userId: session.user.id,
      action: "MFA_ENABLED",
      entityType: "MfaConfig",
      entityId: session.user.id,
      metadata: { backupCodesGenerated: result.backupCodes?.length || 0 },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      backupCodes: result.backupCodes,
      message:
        "MFA enabled successfully. Save your backup codes in a secure location.",
    });
  } catch (error) {
    console.error("Error verifying MFA:", error);
    return NextResponse.json(
      { error: "Failed to verify MFA" },
      { status: 500 },
    );
  }
}
