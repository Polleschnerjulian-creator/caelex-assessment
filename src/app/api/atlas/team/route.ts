import { NextResponse } from "next/server";
import { getAtlasAuth, isOwner } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { createInvitation } from "@/lib/services/organization-service";

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

  const body = await request.json();
  const { email } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Valid email required" },
      { status: 400 },
    );
  }

  try {
    const invitation = await createInvitation(
      atlas.organizationId,
      { email, role: "MEMBER" },
      atlas.userId,
    );

    const inviteUrl = `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/atlas-invite/${invitation.token}`;

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
              Sie wurden von <strong>${atlas.userName || atlas.userEmail}</strong> eingeladen,
              dem Team von <strong>${atlas.organizationName}</strong> auf ATLAS beizutreten.
            </p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; margin: 16px 0;">
              Einladung annehmen
            </a>
            <p style="color: #999; font-size: 12px;">Dieser Link ist 7 Tage g\u00fcltig.</p>
          </div>
        `,
      });
    } catch {
      // Email send failure is non-blocking
    }

    return NextResponse.json({
      invitation: { id: invitation.id, email, inviteUrl },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create invitation";
    return NextResponse.json({ error: message }, { status: 409 });
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
