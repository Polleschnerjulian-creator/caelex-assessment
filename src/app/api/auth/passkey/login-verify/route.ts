/**
 * POST /api/auth/passkey/login-verify
 * Verifies WebAuthn authentication and creates session
 */

import { NextResponse } from "next/server";
import { verifyPasskeyAuthentication } from "@/lib/webauthn.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  recordLoginEvent,
  clearFailedAttempts,
} from "@/lib/login-security.server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const verifySchema = z.object({
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    type: z.literal("public-key"),
    clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
    authenticatorAttachment: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = verifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { response } = validation.data;
    const { ipAddress, userAgent } = getRequestContext(request);

    // Cast the Zod-validated response to the expected type
    const result = await verifyPasskeyAuthentication(
      response as unknown as Parameters<typeof verifyPasskeyAuthentication>[0],
    );

    if (!result.success || !result.userId) {
      if (result.userId) {
        await logAuditEvent({
          userId: result.userId,
          action: "PASSKEY_LOGIN_FAILED",
          entityType: "WebAuthnCredential",
          entityId: response.id,
          metadata: { error: result.error },
          ipAddress,
          userAgent,
        });
      }

      return NextResponse.json(
        { error: result.error || "Authentication failed" },
        { status: 400 },
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Account not found or inactive" },
        { status: 403 },
      );
    }

    // Clear any failed login attempts
    await clearFailedAttempts(user.id);

    // Record successful login
    await recordLoginEvent(
      user.id,
      "PASSKEY_SUCCESS",
      ipAddress ?? null,
      userAgent ?? null,
      "PASSKEY",
    );

    // Log audit event
    await logAuditEvent({
      userId: user.id,
      action: "PASSKEY_LOGIN_SUCCESS",
      entityType: "User",
      entityId: user.id,
      metadata: { credentialId: response.id },
      ipAddress,
      userAgent,
    });

    // Return success with user info
    // The client should then call next-auth signIn with the user ID
    // to properly create a session
    return NextResponse.json({
      success: true,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      message: "Passkey verified. Complete sign-in on client.",
    });
  } catch (error) {
    console.error("Error verifying passkey login:", error);
    return NextResponse.json(
      { error: "Failed to verify authentication" },
      { status: 500 },
    );
  }
}
