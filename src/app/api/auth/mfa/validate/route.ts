/**
 * POST /api/auth/mfa/validate
 * Validates TOTP code during login or for sensitive operations.
 *
 * On success, updates the session JWT server-side (sets mfaVerified=true)
 * and returns the new cookie directly — no client-side updateSession needed.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getToken, encode } from "next-auth/jwt";
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

const isProduction = process.env.NODE_ENV === "production";
const SESSION_COOKIE_NAME = isProduction
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

export async function POST(request: Request) {
  try {
    // Rate limit: 5 requests per minute per IP
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
    let session;
    try {
      session = await auth();
    } catch (authErr) {
      console.error("[MFA] auth() threw:", authErr);
      return NextResponse.json(
        { error: "Session error. Please log in again." },
        { status: 401 },
      );
    }

    if (!session?.user?.id) {
      console.error("[MFA] No session found. Cookie may be missing.");
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 },
      );
    }
    const userId = session.user.id;

    let isValid = false;

    try {
      if (isBackupCode) {
        isValid = await verifyAndConsumeBackupCode(userId, code);
      } else {
        isValid = await validateMfaCode(userId, code);
      }
    } catch (mfaErr) {
      console.error("[MFA] Code validation threw:", mfaErr);
      return NextResponse.json(
        { error: "Verification error. Please try again." },
        { status: 500 },
      );
    }

    if (!isValid) {
      // Non-critical audit/login logging — catch individually to not block response
      logAuditEvent({
        userId,
        action: "MFA_CHALLENGE_FAILED",
        entityType: "MfaConfig",
        entityId: userId,
        metadata: { isBackupCode },
        ipAddress,
        userAgent,
      }).catch((e) => console.error("[MFA] Audit log failed:", e));

      recordLoginEvent(
        userId,
        "MFA_FAILED",
        ipAddress ?? null,
        userAgent ?? null,
        "PASSWORD",
      ).catch((e) => console.error("[MFA] Login event log failed:", e));

      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Success — non-critical audit/login logging
    if (isBackupCode) {
      logAuditEvent({
        userId,
        action: "MFA_BACKUP_CODE_USED",
        entityType: "MfaConfig",
        entityId: userId,
        metadata: { codeUsed: true },
        ipAddress,
        userAgent,
      }).catch((e) => console.error("[MFA] Audit log failed:", e));

      recordLoginEvent(
        userId,
        "BACKUP_CODE_USED",
        ipAddress ?? null,
        userAgent ?? null,
        "PASSWORD",
      ).catch((e) => console.error("[MFA] Login event log failed:", e));
    }

    logAuditEvent({
      userId,
      action: "MFA_CHALLENGE_SUCCESS",
      entityType: "MfaConfig",
      entityId: userId,
      metadata: { isBackupCode },
      ipAddress,
      userAgent,
    }).catch((e) => console.error("[MFA] Audit log failed:", e));

    recordLoginEvent(
      userId,
      "MFA_SUCCESS",
      ipAddress ?? null,
      userAgent ?? null,
      "PASSWORD",
    ).catch((e) => console.error("[MFA] Login event log failed:", e));

    clearFailedAttempts(userId).catch((e) =>
      console.error("[MFA] Clear attempts failed:", e),
    );

    // Update the JWT server-side: set mfaVerified=true directly in the token.
    const response = NextResponse.json({
      success: true,
      mfaVerified: true,
      message: "Code verified successfully",
    });

    try {
      const secret = process.env.AUTH_SECRET;
      if (secret) {
        const token = await getToken({
          req: request,
          secret,
          salt: SESSION_COOKIE_NAME,
          cookieName: SESSION_COOKIE_NAME,
        });
        if (token) {
          const updatedToken = { ...token, mfaVerified: true };
          const newJwt = await encode({
            token: updatedToken,
            secret,
            salt: SESSION_COOKIE_NAME,
            maxAge: 24 * 60 * 60,
          });

          response.cookies.set(SESSION_COOKIE_NAME, newJwt, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 24 * 60 * 60,
          });
        } else {
          console.warn("[MFA] getToken returned null — JWT cookie not updated");
        }
      }
    } catch (jwtError) {
      console.error("[MFA] JWT update failed:", jwtError);
    }

    return response;
  } catch (error) {
    console.error("[MFA] Unhandled error:", error);
    return NextResponse.json(
      { error: "Failed to validate code" },
      { status: 500 },
    );
  }
}
