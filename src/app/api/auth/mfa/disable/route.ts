/**
 * DELETE /api/auth/mfa/disable
 * Disables MFA (requires password verification)
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { disableMfa } from "@/lib/mfa.server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const disableSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = disableSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Password is required", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { password } = validation.data;

    // Get user's hashed password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "Cannot disable MFA for OAuth-only accounts" },
        { status: 400 },
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    // Disable MFA
    await disableMfa(session.user.id);

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: "MFA_DISABLED",
      entityType: "MfaConfig",
      entityId: session.user.id,
      metadata: { disabledAt: new Date().toISOString() },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "MFA has been disabled",
    });
  } catch (error) {
    console.error("Error disabling MFA:", error);
    return NextResponse.json(
      { error: "Failed to disable MFA" },
      { status: 500 },
    );
  }
}
