/**
 * POST /api/auth/passkey/register-verify
 * Verifies WebAuthn registration and saves the credential
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { verifyPasskeyRegistration } from "@/lib/webauthn.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { z } from "zod";

const verifySchema = z.object({
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      attestationObject: z.string(),
      transports: z.array(z.string()).optional(),
    }),
    type: z.literal("public-key"),
    clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
    authenticatorAttachment: z.string().optional(),
  }),
  deviceName: z.string().optional(),
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
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { response, deviceName } = validation.data;
    const { ipAddress, userAgent } = getRequestContext(request);

    // Cast the Zod-validated response to the expected type
    const result = await verifyPasskeyRegistration(
      session.user.id,
      response as unknown as Parameters<typeof verifyPasskeyRegistration>[1],
      deviceName,
    );

    if (!result.success) {
      await logAuditEvent({
        userId: session.user.id,
        action: "PASSKEY_REGISTRATION_FAILED",
        entityType: "WebAuthnCredential",
        entityId: session.user.id,
        metadata: { error: result.error },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: result.error || "Registration failed" },
        { status: 400 },
      );
    }

    // Log successful registration
    await logAuditEvent({
      userId: session.user.id,
      action: "PASSKEY_REGISTERED",
      entityType: "WebAuthnCredential",
      entityId: result.credentialId || session.user.id,
      metadata: { deviceName },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      credentialId: result.credentialId,
      message: "Passkey registered successfully",
    });
  } catch (error) {
    console.error("Error verifying passkey registration:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 },
    );
  }
}
