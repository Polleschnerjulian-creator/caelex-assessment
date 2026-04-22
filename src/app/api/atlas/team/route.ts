import { NextResponse } from "next/server";
import { z } from "zod";
import { getAtlasAuth, isOwner } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { createInvitation } from "@/lib/services/organization-service";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { renderInvitationEmail } from "@/lib/email/invitation";

export const runtime = "nodejs";

/** Invitation tokens live 14 days — mirrors createInvitation(). Keep in
 *  sync when changing expiry logic in organization-service.ts. */
const INVITE_EXPIRY_DAYS = 14;

const InviteSchema = z.object({
  email: z.string().email().max(254), // RFC 5321 maximum
});

// GET /api/atlas/team — list members + pending invitations
export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [members, invitations] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: atlas.organizationId },
      include: {
        user: { select: { name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.organizationInvitation.findMany({
      where: {
        organizationId: atlas.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    invitations: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    })),
    isOwner: isOwner(atlas.role),
  });
}

// POST /api/atlas/team — invite a new member (Owner only)
export async function POST(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOwner(atlas.role)) {
    return NextResponse.json(
      { error: "Only the owner can invite members" },
      { status: 403 },
    );
  }

  // H1: rate-limit invitations to prevent email bomb even if an owner account
  // is compromised. `sensitive` tier = 5/hr.
  const rl = await checkRateLimit(
    "sensitive",
    getIdentifier(request, atlas.userId),
  );
  if (!rl.success) return createRateLimitResponse(rl);

  const rawBody = await request.json().catch(() => null);
  const parsed = InviteSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valid email required" },
      { status: 400 },
    );
  }
  const email = parsed.data.email;

  // Require a configured app URL; silent fallback to "" produced a broken link
  const appUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (!appUrl) {
    logger.error("Atlas team invite: no NEXTAUTH_URL / AUTH_URL configured");
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 },
    );
  }

  try {
    const invitation = await createInvitation(
      atlas.organizationId,
      { email, role: "MEMBER" },
      atlas.userId,
    );

    // New canonical accept URL — query-param based, lives at
    // /accept-invite. The old /atlas-invite/[token] path is kept as a
    // redirect shim for any invitations already in flight.
    const inviteUrl = `${appUrl}/accept-invite?token=${encodeURIComponent(invitation.token)}`;

    // Send invitation email via Resend (non-blocking — a failed email
    // doesn't roll back the invitation; owner can resend from the UI).
    // Template + placeholder substitution + HTML-escaping all happen
    // inside renderInvitationEmail() so this call site stays minimal.
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { subject, html, text } = renderInvitationEmail({
        organizationName: atlas.organizationName,
        inviterName: atlas.userName || atlas.userEmail || "Ein Kollege",
        inviteUrl,
        recipientEmail: email,
        expiresInDays: INVITE_EXPIRY_DAYS,
      });
      await resend.emails.send({
        // Sender name per brand guidelines ("Caelex ATLAS"), sender
        // address noreply@caelex.eu (verified domain). Replies route
        // to hi@caelex.eu so the shared inbox catches human questions.
        from: "Caelex ATLAS <noreply@caelex.eu>",
        to: email,
        replyTo: "hi@caelex.eu",
        subject,
        html,
        text,
      });
    } catch (emailErr) {
      logger.warn("Atlas team invite email failed (non-blocking)", {
        error: emailErr,
        invitationId: invitation.id,
      });
    }

    logger.info("Atlas team invite created", {
      invitationId: invitation.id,
      organizationId: atlas.organizationId,
      invitedBy: atlas.userId,
    });

    return NextResponse.json({
      invitation: { id: invitation.id, email, inviteUrl },
    });
  } catch (err) {
    logger.error("Atlas team invite failed", { error: err });
    // Genericise: don't leak "User already member" or similar.
    return NextResponse.json(
      { error: "Invitation could not be created" },
      { status: 409 },
    );
  }
}

// DELETE /api/atlas/team?memberId=xxx — remove a member (Owner only)
export async function DELETE(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOwner(atlas.role)) {
    return NextResponse.json(
      { error: "Only the owner can remove members" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  // L6: narrow the select to just the fields we actually need.
  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
    select: { organizationId: true, userId: true },
  });

  if (!member || member.organizationId !== atlas.organizationId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.userId === atlas.userId) {
    return NextResponse.json(
      { error: "Cannot remove yourself" },
      { status: 400 },
    );
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });
  logger.info("Atlas team member removed", {
    organizationId: atlas.organizationId,
    removedMemberId: memberId,
    removedBy: atlas.userId,
  });

  return NextResponse.json({ success: true });
}
