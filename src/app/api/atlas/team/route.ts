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

export const runtime = "nodejs";

/**
 * Escape untrusted strings before they land in an HTML email body.
 * Closes the stored-XSS / phishing-template injection vector in
 * invitation mails (H3).
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

    const inviteUrl = `${appUrl}/atlas-invite/${invitation.token}`;

    // H3: escape every untrusted field that lands in the HTML body.
    // `atlas.userName`, `atlas.userEmail`, `atlas.organizationName` all come
    // from the DB and can legally contain HTML-special characters.
    const safeInviterName = escapeHtml(atlas.userName || atlas.userEmail || "");
    const safeOrg = escapeHtml(atlas.organizationName);

    // Send invitation email via Resend (non-blocking)
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "ATLAS <noreply@caelex.eu>",
        to: email,
        subject: `${atlas.organizationName} \u2013 Einladung zu ATLAS`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="font-size: 18px; color: #111;">ATLAS Einladung</h2>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              Sie wurden von <strong>${safeInviterName}</strong> eingeladen,
              dem Team von <strong>${safeOrg}</strong> auf ATLAS beizutreten.
            </p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; margin: 16px 0;">
              Einladung annehmen
            </a>
            <p style="color: #999; font-size: 12px;">Dieser Link ist 7 Tage g\u00fcltig.</p>
          </div>
        `,
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

  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
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

  return NextResponse.json({ success: true });
}
