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
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";
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
        to: email,
        subject: `You've been invited to join ${orgName} on Caelex`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px;">
            <h1 style="color: #3B82F6;">You're Invited</h1>
            <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Caelex as a <strong>${role}</strong>.</p>
            <p>Caelex helps space operators manage regulatory compliance with the EU Space Act, NIS2 Directive, and national space laws.</p>
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
