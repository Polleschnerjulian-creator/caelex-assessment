/**
 * POST /api/auth/passkey/login-verify
 * Verifies WebAuthn authentication and issues a short-lived signed token
 * for the client to exchange via next-auth signIn (passkey-token provider).
 * The raw userId is never exposed to the client.
 */

import { NextResponse } from "next/server";
import { verifyPasskeyAuthentication } from "@/lib/webauthn.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  recordLoginEvent,
  clearFailedAttempts,
} from "@/lib/login-security.server";
import { createSignedToken } from "@/lib/signed-token";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";

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

    // Read challenge token from httpOnly cookie
    const challengeToken = request.headers
      .get("cookie")
      ?.split(";")
      .find((c) => c.trim().startsWith("__webauthn_challenge="))
      ?.split("=")[1];

    if (!challengeToken) {
      return NextResponse.json(
        { error: "Challenge expired or missing" },
        { status: 400 },
      );
    }

    // Cast the Zod-validated response to the expected type
    const result = await verifyPasskeyAuthentication(
      response as unknown as Parameters<typeof verifyPasskeyAuthentication>[0],
      challengeToken,
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

    // Issue a short-lived signed token instead of exposing the raw userId.
    // The client exchanges this token via the "passkey-token" credentials
    // provider to create a proper NextAuth session.
    const passkeyToken = createSignedToken(
      { sub: user.id, purpose: "passkey-login" },
      60 * 1000, // 1 minute expiry
    );

    // Clear the challenge cookie
    const res = NextResponse.json({
      success: true,
      token: passkeyToken,
      message: "Passkey verified. Complete sign-in on client.",
    });
    res.cookies.delete("__webauthn_challenge");
    return res;
  } catch (error) {
    logger.error("Error verifying passkey login", error);
    return NextResponse.json(
      { error: "Failed to verify authentication" },
      { status: 500 },
    );
  }
}
