/**
 * POST /api/auth/mfa/setup
 * Generates TOTP secret and QR code for MFA setup
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { setupMfa } from "@/lib/mfa.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { secret, qrCodeDataUrl } = await setupMfa(
      session.user.id,
      session.user.email,
    );

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: "MFA_SETUP_INITIATED",
      entityType: "MfaConfig",
      entityId: session.user.id,
      metadata: { initiated: true },
      ipAddress,
      userAgent,
    });

    // Return secret (for manual entry) and QR code
    return NextResponse.json({
      secret,
      qrCodeDataUrl,
      message: "Scan the QR code with your authenticator app",
    });
  } catch (error) {
    console.error("Error setting up MFA:", error);
    return NextResponse.json({ error: "Failed to setup MFA" }, { status: 500 });
  }
}
