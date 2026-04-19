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
import { logger } from "@/lib/logger";

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
      logger.error("[MFA] auth() threw", authErr);
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
      logger.error("[MFA] DB lookup failed", dbErr);
      return NextResponse.json(
        { error: "Database error. Please try again." },
        { status: 500 },
      );
    }

    if (!mfaConfig || !mfaConfig.enabled) {
      // C2 fix: previously this branch MINTED a new JWT with
      // mfaVerified=true without any challenge — an attacker with stolen
      // credentials + a race condition on MfaConfig.delete could bypass
      // MFA entirely. Now we:
      //   1. refuse the request,
      //   2. force a full re-login (clear the session cookie),
      //   3. emit a security-audit event so the abuse is visible.
      logger.error("[MFA] mfaRequired=true but no active MfaConfig found", {
        userId: session.user.id,
        action: "mfa_autoheal_blocked",
      });

      try {
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "MFA_AUTOHEAL_BLOCKED",
            resource: "MfaConfig",
            description:
              "Login attempt with mfaRequired=true but no active MfaConfig — forced re-login.",
          },
        });
      } catch {
        // audit log best-effort
      }

      const blocked = NextResponse.json(
        {
          error: "Your MFA setup has been reset. Please sign in again.",
          requireReauth: true,
        },
        { status: 403 },
      );

      // Clear the session cookie so the client is forced back to login.
      blocked.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return blocked;
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
        logger.error("[MFA] Backup code verification failed", backupErr);
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
        logger.error("[MFA] Decryption failed", decryptErr);
        const errMsg =
          decryptErr instanceof Error ? decryptErr.message : String(decryptErr);
        // Check for common causes
        if (errMsg.includes("ENCRYPTION_KEY")) {
          logger.error(
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
        logger.error("[MFA] Decrypted secret is empty");
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
        logger.error("[MFA] TOTP verification threw", totpErr);
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
      }).catch((e) => logger.error("[MFA] Audit log failed", e));

      recordLoginEvent(
        userId,
        "MFA_FAILED",
        ipAddress ?? null,
        userAgent ?? null,
        "PASSWORD",
      ).catch((e) => logger.error("[MFA] Login event log failed", e));

      // H-A2 fix: increment per-user failed-attempt counter and lock the
      // account after the same 5-attempt threshold used for the primary
      // login. Without this, an attacker with a stolen password session
      // could brute-force the 6-digit TOTP space at ~7200 attempts/day/IP.
      try {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { failedLoginAttempts: { increment: 1 } },
          select: { failedLoginAttempts: true },
        });
        if (updated.failedLoginAttempts >= 5) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 min
            },
          });
          logger.warn("[MFA] Account locked after 5 failed MFA attempts", {
            userId,
          });
        }
      } catch (lockErr) {
        logger.error("[MFA] fail-counter update failed", lockErr);
      }

      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // H-A2: reset the per-user failed-attempt counter on success.
    prisma.user
      .update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })
      .catch((e) => logger.error("[MFA] fail-counter reset failed", e));

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
      }).catch((e) => logger.error("[MFA] Audit log failed", e));

      recordLoginEvent(
        userId,
        "BACKUP_CODE_USED",
        ipAddress ?? null,
        userAgent ?? null,
        "PASSWORD",
      ).catch((e) => logger.error("[MFA] Login event log failed", e));
    }

    logAuditEvent({
      userId,
      action: "MFA_CHALLENGE_SUCCESS",
      entityType: "MfaConfig",
      entityId: userId,
      metadata: { isBackupCode },
      ipAddress,
      userAgent,
    }).catch((e) => logger.error("[MFA] Audit log failed", e));

    recordLoginEvent(
      userId,
      "MFA_SUCCESS",
      ipAddress ?? null,
      userAgent ?? null,
      "PASSWORD",
    ).catch((e) => logger.error("[MFA] Login event log failed", e));

    clearFailedAttempts(userId).catch((e) =>
      logger.error("[MFA] Clear attempts failed", e),
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
          logger.warn("[MFA] getToken returned null — JWT cookie not updated");
        }
      }
    } catch (jwtError) {
      logger.error("[MFA] JWT update failed", jwtError);
      // Non-fatal: the success response already tells the client MFA passed.
      // The next page load will trigger a session refresh.
    }

    return response;
  } catch (error) {
    logger.error("[MFA] Unhandled error", error);
    return NextResponse.json(
      { error: "MFA validation failed" },
      { status: 500 },
    );
  }
}
