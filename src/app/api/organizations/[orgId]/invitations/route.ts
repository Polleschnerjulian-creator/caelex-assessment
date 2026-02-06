/**
 * Organization Invitations API
 * GET: List pending invitations
 * POST: Create a new invitation
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  getOrganizationInvitations,
  createInvitation,
  getUserRole,
  hasPermission,
  getDefaultPermissionsForRole,
} from "@/lib/services/organization-service";
import type { OrganizationRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
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
        { error: "You don't have permission to view invitations" },
        { status: 403 },
      );
    }

    const invitations = await getOrganizationInvitations(orgId);

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        invitedBy: inv.invitedBy,
      })),
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
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

    const { orgId } = await params;
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
        { error: "You don't have permission to invite members" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { email, role = "MEMBER" } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Validate role
    const validRoles: OrganizationRole[] = [
      "ADMIN",
      "MANAGER",
      "MEMBER",
      "VIEWER",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Cannot invite as OWNER." },
        { status: 400 },
      );
    }

    const invitation = await createInvitation(
      orgId,
      { email, role },
      session.user.id,
    );

    // TODO: Send invitation email
    // await sendInvitationEmail(invitation);

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        // Include token only in response (for copying invite link)
        inviteUrl: `${process.env.NEXTAUTH_URL || ""}/invite/${invitation.token}`,
      },
      message: "Invitation created successfully",
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to create invitation") },
      { status: 500 },
    );
  }
}
