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

    // TODO: Send invitation email again
    // await sendInvitationEmail(invitation);

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviteUrl: `${process.env.NEXTAUTH_URL || ""}/invite/${invitation.token}`,
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
