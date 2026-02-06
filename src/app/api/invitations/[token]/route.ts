/**
 * Public Invitation API
 * GET: Validate invitation token and get organization info
 * POST: Accept invitation
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  getInvitation,
  acceptInvitation,
} from "@/lib/services/organization-service";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { token } = await params;

    const invitation = await getInvitation(token);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation link", valid: false },
        { status: 404 },
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation has already been used", valid: false },
        { status: 400 },
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired", valid: false },
        { status: 400 },
      );
    }

    // Check if user is logged in
    const session = await auth();
    const isLoggedIn = !!session?.user?.id;

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          logoUrl: invitation.organization.logoUrl,
        },
      },
      isLoggedIn,
      // If logged in, check if email matches
      emailMatch: isLoggedIn
        ? session?.user?.email?.toLowerCase() === invitation.email.toLowerCase()
        : null,
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { error: "Failed to validate invitation", valid: false },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to accept an invitation" },
        { status: 401 },
      );
    }

    const { token } = await params;

    // Get invitation to validate
    const invitation = await getInvitation(token);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation link" },
        { status: 404 },
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 },
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 },
      );
    }

    // SECURITY: Verify email matches invitation
    if (session.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 },
      );
    }

    const member = await acceptInvitation(token, session.user.id);

    return NextResponse.json({
      member: {
        id: member.id,
        role: member.role,
        organizationId: member.organizationId,
      },
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
      message: `Successfully joined ${invitation.organization.name}`,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to accept invitation") },
      { status: 500 },
    );
  }
}
