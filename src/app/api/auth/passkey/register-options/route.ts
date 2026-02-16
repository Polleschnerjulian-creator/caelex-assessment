/**
 * POST /api/auth/passkey/register-options
 * Generates WebAuthn registration options for new passkey
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { generatePasskeyRegistrationOptions } from "@/lib/webauthn.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { options, challengeToken } =
      await generatePasskeyRegistrationOptions(
        session.user.id,
        session.user.email,
        session.user.name || undefined,
      );

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: "PASSKEY_REGISTRATION_INITIATED",
      entityType: "WebAuthnCredential",
      entityId: session.user.id,
      metadata: { initiated: true },
      ipAddress,
      userAgent,
    });

    // Set challenge token in httpOnly cookie (stateless, works across serverless instances)
    const response = NextResponse.json(options);
    response.cookies.set("__webauthn_challenge", challengeToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
      path: "/api/auth/passkey",
    });
    return response;
  } catch (error) {
    console.error("Error generating passkey registration options:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 },
    );
  }
}
