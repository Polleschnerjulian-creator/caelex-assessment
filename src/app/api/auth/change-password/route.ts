/**
 * POST /api/auth/change-password
 * Allows authenticated users to change their password.
 * Invalidates all other sessions after a successful password change.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { revokeAllUserSessions } from "@/lib/services/session-service";
import { logSecurityEvent } from "@/lib/services/security-audit-service";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const ip = getIdentifier(request);
    const rl = await checkRateLimit("sensitive", ip);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // H-A5 fix: verify the *current* password BEFORE checking same-as-new.
    // The prior flow leaked a timing oracle (400 "must be different" vs
    // 400 "incorrect") to attackers with a stolen session cookie but no
    // password — they could probe password candidates.

    // Fetch user's current password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        {
          error: "Password change is not available for OAuth-only accounts",
        },
        { status: 400 },
      );
    }

    // Verify current password FIRST
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    // H-A5 cont.: now that the current password was verified, reject
    // same-as-new (clean UX, no timing oracle).
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 },
      );
    }

    // Hash and update
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: newHash },
    });

    // Invalidate all sessions (forces re-login on all devices)
    await revokeAllUserSessions(
      session.user.id,
      undefined,
      "Password changed — all sessions revoked for security",
    );

    // Log security event
    await logSecurityEvent({
      event: "PASSWORD_CHANGED",
      userId: session.user.id,
      description: "User changed their password. All sessions revoked.",
      riskLevel: "MEDIUM",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
