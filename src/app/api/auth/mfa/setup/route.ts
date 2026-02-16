/**
 * POST /api/auth/mfa/setup
 * Generates TOTP secret and QR code for MFA setup
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { setupMfa } from "@/lib/mfa.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  try {
    // Rate limit: 5 requests per minute per IP (M3 security fix)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rl = await checkRateLimit("mfa", ip);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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
