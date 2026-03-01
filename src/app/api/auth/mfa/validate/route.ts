/**
 * POST /api/auth/mfa/validate
 * Validates TOTP code during login or for sensitive operations.
 *
 * On success, updates the session JWT server-side (sets mfaVerified=true)
 * and returns the new cookie directly — no client-side updateSession needed.
 *
 * This route inlines the MFA validation logic (instead of calling validateMfaCode)
 * to provide granular error handling at each step: DB lookup, decryption, TOTP verify.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getToken, encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  recordLoginEvent,
  clearFailedAttempts,
} from "@/lib/login-security.server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";
import { isTotpCodeUsed, markTotpCodeUsed } from "@/lib/mfa.server";

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
    // ── Step 1: Rate limit ──
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rl = await checkRateLimit("mfa", ip);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // ── Step 2: Parse & validate body ──
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { code, isBackupCode } = validation.data;
    const { ipAddress, userAgent } = getRequestContext(request);

    // ── Step 3: Get session ──
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
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 },
      );
    }
    const userId = session.user.id;

    // ── Step 4: Look up MFA config ──
    let mfaConfig;
    try {
      mfaConfig = await prisma.mfaConfig.findUnique({
        where: { userId },
      });
    } catch (dbErr) {
      console.error("[MFA] DB lookup failed:", dbErr);
      return NextResponse.json(
        { error: "Database error. Please try again." },
        { status: 500 },
      );
    }

    if (!mfaConfig || !mfaConfig.enabled) {
      // MFA config was deleted or disabled, but the JWT still has mfaRequired=true.
      // Auto-heal: update the JWT to clear mfaRequired and let the user through.
      console.warn(
        "[MFA] No active MFA config found but session has mfaRequired. Auto-healing JWT.",
      );
      const healResponse = NextResponse.json({
        success: true,
        mfaVerified: true,
        message: "MFA no longer required — session updated.",
      });

      try {
        const authSecret = process.env.AUTH_SECRET;
        if (authSecret) {
          const token = await getToken({
            req: request,
            secret: authSecret,
            salt: SESSION_COOKIE_NAME,
            cookieName: SESSION_COOKIE_NAME,
          });
          if (token) {
            const updatedToken = {
              ...token,
              mfaRequired: false,
              mfaVerified: true,
            };
            const newJwt = await encode({
              token: updatedToken,
              secret: authSecret,
              salt: SESSION_COOKIE_NAME,
              maxAge: 24 * 60 * 60,
            });
            healResponse.cookies.set(SESSION_COOKIE_NAME, newJwt, {
              httpOnly: true,
              secure: isProduction,
              sameSite: "lax",
              path: "/",
              maxAge: 24 * 60 * 60,
            });
          }
        }
      } catch (jwtErr) {
        console.error("[MFA] JWT heal failed:", jwtErr);
      }

      return healResponse;
    }

    // ── Step 5: Validate code ──
    let isValid = false;

    if (isBackupCode) {
      // ── Backup code path ──
      if (!mfaConfig.backupCodes) {
        return NextResponse.json(
          { error: "No backup codes configured." },
          { status: 400 },
        );
      }

      try {
        const hashedCodes: string[] = JSON.parse(mfaConfig.backupCodes);
        const normalizedCode = code.toUpperCase().replace(/\s/g, "");

        for (let i = 0; i < hashedCodes.length; i++) {
          if (
            hashedCodes[i] &&
            (await bcrypt.compare(normalizedCode, hashedCodes[i]))
          ) {
            // Consume the code
            hashedCodes[i] = "";
            await prisma.mfaConfig.update({
              where: { userId },
              data: { backupCodes: JSON.stringify(hashedCodes) },
            });
            isValid = true;
            break;
          }
        }
      } catch (backupErr) {
        console.error("[MFA] Backup code verification failed:", backupErr);
        return NextResponse.json(
          { error: "Backup code verification failed." },
          { status: 500 },
        );
      }
    } else {
      // ── TOTP code path ──

      // Step 5a: Decrypt the stored secret
      let totpSecret: string;
      try {
        totpSecret = await decrypt(mfaConfig.encryptedSecret);
      } catch (decryptErr) {
        console.error("[MFA] Decryption failed:", decryptErr);
        const errMsg =
          decryptErr instanceof Error ? decryptErr.message : String(decryptErr);
        // Check for common causes
        if (errMsg.includes("ENCRYPTION_KEY")) {
          console.error(
            "[MFA] ENCRYPTION_KEY or ENCRYPTION_SALT not set in environment",
          );
        }
        return NextResponse.json(
          {
            error:
              "MFA secret decryption failed. Server configuration issue — please contact support.",
          },
          { status: 500 },
        );
      }

      if (!totpSecret) {
        console.error("[MFA] Decrypted secret is empty");
        return NextResponse.json(
          { error: "MFA configuration is corrupted." },
          { status: 500 },
        );
      }

      // Step 5b: Verify the TOTP code
      try {
        const totp = new OTPAuth.TOTP({
          issuer: "Caelex",
          algorithm: "SHA256",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(totpSecret),
        });

        const delta = totp.validate({ token: code, window: 1 });
        isValid = delta !== null;
      } catch (totpErr) {
        console.error("[MFA] TOTP verification threw:", totpErr);
        return NextResponse.json(
          { error: "TOTP verification failed. MFA may need to be re-setup." },
          { status: 500 },
        );
      }

      // Step 5c: Replay protection (Redis-backed, distributed across instances)
      if (isValid) {
        if (await isTotpCodeUsed(userId, code)) {
          isValid = false;
        } else {
          await markTotpCodeUsed(userId, code);
        }
      }
    }

    // ── Step 6: Handle invalid code ──
    if (!isValid) {
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

    // ── Step 7: Success — audit logging (non-blocking) ──
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

    // ── Step 8: Update JWT server-side ──
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
      // Non-fatal: the success response already tells the client MFA passed.
      // The next page load will trigger a session refresh.
    }

    return response;
  } catch (error) {
    console.error("[MFA] Unhandled error:", error);
    return NextResponse.json(
      { error: "MFA validation failed" },
      { status: 500 },
    );
  }
}
