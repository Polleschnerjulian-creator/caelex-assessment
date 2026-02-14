/**
 * Account Deletion API (Art. 17 GDPR - Right to Erasure)
 *
 * Permanently deletes a user account and all associated data.
 * This is an irreversible action that cannot be undone.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  validateCsrfToken,
} from "@/lib/csrf";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/user/delete
 * Permanently delete the authenticated user's account
 *
 * Body:
 * - password?: string (required for credential users)
 * - confirmation: "DELETE MY ACCOUNT" (required)
 */
export async function DELETE(req: Request) {
  try {
    // Validate CSRF
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    const csrfHeader = req.headers.get(CSRF_HEADER_NAME);
    if (!validateCsrfToken(csrfCookie, csrfHeader)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse request body
    const body = await req.json();
    const { password, confirmation } = body;

    // Validate confirmation string
    if (confirmation !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        { error: "Please type 'DELETE MY ACCOUNT' to confirm" },
        { status: 400 },
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        accounts: {
          select: { provider: true },
        },
        organizationMemberships: {
          where: { role: "OWNER" },
          select: {
            organizationId: true,
            organization: {
              select: {
                name: true,
                _count: { select: { members: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is sole owner of any organization
    const ownedOrgsWithMembers = user.organizationMemberships.filter(
      (m) => m.organization._count.members > 1,
    );
    if (ownedOrgsWithMembers.length > 0) {
      return NextResponse.json(
        {
          error: `You are the sole owner of organization(s): ${ownedOrgsWithMembers.map((m) => m.organization.name).join(", ")}. Please transfer ownership or delete these organizations first.`,
        },
        { status: 400 },
      );
    }

    // Check if user has password (credentials user) vs OAuth-only
    const isCredentialsUser = Boolean(user.password);
    const isOAuthOnly =
      !user.password && user.accounts && user.accounts.length > 0;

    // For credentials users, verify password
    if (isCredentialsUser) {
      if (!password) {
        return NextResponse.json(
          { error: "Password required for account deletion" },
          { status: 400 },
        );
      }

      const isValidPassword = await bcrypt.compare(password, user.password!);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Incorrect password" },
          { status: 400 },
        );
      }
    }

    // Log the deletion for audit purposes (before deleting)
    logger.info("[account-deletion] User initiated account deletion", {
      userId,
      email: user.email,
      isOAuthOnly,
      timestamp: new Date().toISOString(),
    });

    // Delete user (cascading will handle most relations)
    // Some relations might need manual cleanup
    await prisma.$transaction(async (tx) => {
      // Delete organizations where user is sole member
      const soloOrgs = await tx.organizationMember.findMany({
        where: {
          userId,
          organization: {
            members: {
              every: { userId },
            },
          },
        },
        select: { organizationId: true },
      });

      // Delete solo organizations
      if (soloOrgs.length > 0) {
        await tx.organization.deleteMany({
          where: {
            id: { in: soloOrgs.map((o) => o.organizationId) },
          },
        });
      }

      // Delete the user (cascading will handle the rest)
      await tx.user.delete({
        where: { id: userId },
      });
    });

    logger.info("[account-deletion] Account deleted successfully", {
      userId,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      message: "Your account has been permanently deleted",
    });
  } catch (error) {
    logger.error("[account-deletion] Failed to delete account", { error });
    return NextResponse.json(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 },
    );
  }
}
