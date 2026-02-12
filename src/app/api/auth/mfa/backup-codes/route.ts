/**
 * POST /api/auth/mfa/backup-codes
 * Regenerates backup codes (requires current TOTP or password)
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { regenerateBackupCodes, validateMfaCode } from "@/lib/mfa.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { z } from "zod";

const regenerateSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, "Code must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = regenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid code format", details: validation.error.issues },
        { status: 400 },
      );
    }

    // Verify current MFA code first
    const { code } = validation.data;
    const isValid = await validateMfaCode(session.user.id, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    // Generate new backup codes
    const backupCodes = await regenerateBackupCodes(session.user.id);

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: "MFA_BACKUP_CODES_GENERATED",
      entityType: "MfaConfig",
      entityId: session.user.id,
      metadata: { count: backupCodes.length },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      backupCodes,
      message: "New backup codes generated. Previous codes are now invalid.",
    });
  } catch (error) {
    console.error("Error regenerating backup codes:", error);
    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 },
    );
  }
}
