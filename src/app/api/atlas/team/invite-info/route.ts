import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/atlas/team/invite-info?token=...
 *
 * Public (no auth) lookup of an invitation's visible context so the
 * invite-accept page and the signup page can show who invited, which
 * org the invitee is joining, and lock the email field to the right
 * address. Only leaks the fields a legitimate invitee would already
 * see in the email body — so there's no enumeration risk.
 *
 * Returns:
 *   200 { email, organizationName, inviterName, expiresAt }
 *   404 when the token doesn't exist
 *   410 when already accepted or expired
 */

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token.length > 500) {
    return NextResponse.json(
      { error: "token query param required" },
      { status: 400 },
    );
  }

  try {
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true } },
      },
    });
    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 410 },
      );
    }
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation expired" },
        { status: 410 },
      );
    }

    // Whether a User already exists for this email — the client uses
    // this to decide whether to send the accept flow via signup or via
    // login. Doesn't leak whether the user is elsewhere in the system;
    // by definition the inviter knew this email.
    const [existingUser, inviter] = await Promise.all([
      prisma.user.findUnique({
        where: { email: invitation.email },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: invitation.invitedBy },
        select: { name: true, email: true },
      }),
    ]);

    return NextResponse.json({
      email: invitation.email,
      organizationName: invitation.organization.name,
      inviterName: inviter?.name || inviter?.email || "A colleague",
      expiresAt: invitation.expiresAt,
      accountExists: Boolean(existingUser),
    });
  } catch (err) {
    logger.error("invite-info lookup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
