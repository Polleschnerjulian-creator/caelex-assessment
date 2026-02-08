/**
 * Organization Invitation Detail API
 * DELETE: Cancel/revoke an invitation
 * POST: Resend invitation
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  cancelInvitation,
  resendInvitation,
  getUserRole,
  hasPermission,
  getDefaultPermissionsForRole,
} from "@/lib/services/organization-service";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgId: string; id: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, id: invitationId } = await params;
    const userRole = await getUserRole(orgId, session.user.id);

    if (!userRole) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    // Check permission
    const permissions = getDefaultPermissionsForRole(userRole);
    if (!hasPermission(permissions, "members:invite")) {
      return NextResponse.json(
        { error: "You don't have permission to cancel invitations" },
        { status: 403 },
      );
    }

    await cancelInvitation(invitationId, session.user.id);

    return NextResponse.json({
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to cancel invitation") },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, id: invitationId } = await params;
    const userRole = await getUserRole(orgId, session.user.id);

    if (!userRole) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    // Check permission
    const permissions = getDefaultPermissionsForRole(userRole);
    if (!hasPermission(permissions, "members:invite")) {
      return NextResponse.json(
        { error: "You don't have permission to resend invitations" },
        { status: 403 },
      );
    }

    const invitation = await resendInvitation(invitationId, session.user.id);

    // Send invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/invite/${invitation.token}`;
    if (isEmailConfigured()) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      });
      const inviterName =
        session.user.name || session.user.email || "A team member";
      const orgName = org?.name || "an organization";

      await sendEmail({
        to: invitation.email,
        subject: `Reminder: You've been invited to join ${orgName} on Caelex`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px;">
            <h1 style="color: #3B82F6;">Invitation Reminder</h1>
            <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Caelex as a <strong>${invitation.role}</strong>.</p>
            <p>This is a reminder — your invitation is still waiting for you.</p>
            <div style="margin: 30px 0;">
              <a href="${inviteUrl}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">Caelex - Space Compliance, Simplified</p>
          </div>
        `,
      });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviteUrl,
      },
      message: "Invitation resent successfully",
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to resend invitation") },
      { status: 500 },
    );
  }
}
