import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger, maskEmail } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { RegisterSchema } from "@/lib/validations";

/**
 * POST /api/auth/reset-password
 *
 * Consumes a password-reset token issued by /api/auth/forgot-password
 * and sets the user's new password. Constraints:
 *
 *   - Token is looked up by SHA-256 hash (raw token never touches DB)
 *   - Single-use: usedAt set inside the same transaction as the
 *     password update so a race between two tabs can't reset twice
 *   - 60-minute expiry enforced server-side
 *   - Password reuses RegisterSchema.password so we get the same
 *     12+ / mixed-case / digit / special policy as signup
 *   - Also wipes failedLoginAttempts + lockedUntil so a locked-out
 *     user who recovers via reset isn't still soft-locked after
 *
 * Audit: docs/security/atlas-audit-2026-04-22.md (C-4).
 */

export const runtime = "nodejs";

// Reuse the signup password policy so reset and signup stay aligned.
const PasswordSchema = RegisterSchema.shape.password;

const Schema = z.object({
  token: z.string().min(32).max(200),
  password: PasswordSchema,
});

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(request: NextRequest) {
  // `sensitive` tier = 5/hr/IP. Prevents token-brute-force even though
  // 256-bit entropy makes that infeasible — belt and braces.
  const rl = await checkRateLimit("sensitive", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    // Surface the password-policy field errors so the client can
    // render the failing rule. Don't leak other details.
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      {
        error: "Validation failed",
        fields: fieldErrors,
      },
      { status: 400 },
    );
  }

  const tokenHash = sha256Hex(parsed.data.token);

  try {
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    });

    // Unified error message for all invalid-token states — don't
    // distinguish "unknown" from "expired" from "already used" so
    // attackers can't probe which tokens existed.
    const invalid = () =>
      NextResponse.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
          code: "INVALID_TOKEN",
        },
        { status: 400 },
      );

    if (!token) return invalid();
    if (token.usedAt) return invalid();
    if (token.expiresAt < new Date()) return invalid();

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    // Atomic: mark the token used AND update the password in one tx.
    // If either fails, neither applies — prevents a successful reset
    // leaving the token reusable on retry.
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: token.userId },
        data: {
          password: passwordHash,
          // Lift any soft lockout on a successful reset — the whole
          // point of the flow is that the user is back in control.
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      // Belt-and-braces: invalidate any *other* outstanding tokens
      // for this user so the successful reset voids stale links in
      // other tabs / stale emails.
      prisma.passwordResetToken.updateMany({
        where: {
          userId: token.userId,
          usedAt: null,
          id: { not: token.id },
        },
        data: { usedAt: new Date() },
      }),
    ]);

    await logAuditEvent({
      userId: token.userId,
      action: "password_reset",
      entityType: "user",
      entityId: token.userId,
      description: "Password reset via reset-password token",
    });

    logger.info("password reset succeeded", {
      userId: token.userId,
      email: token.user?.email ? maskEmail(token.user.email) : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("reset-password handler failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
