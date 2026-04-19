import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/v1/verity/certificate/[id]/revoke
 * Revokes a Verity certificate. This action cannot be undone.
 * Auth: Session required.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Certificate ID is required" },
        { status: 400 },
      );
    }

    // Resolve organisation + role.
    // C3 fix: role gate added. Previously any MEMBER/VIEWER could revoke
    // certificates; now only OWNER/ADMIN/MANAGER can.
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organisation found for this user" },
        { status: 403 },
      );
    }

    if (
      membership.role !== "OWNER" &&
      membership.role !== "ADMIN" &&
      membership.role !== "MANAGER"
    ) {
      return NextResponse.json(
        { error: "Insufficient role to revoke certificates" },
        { status: 403 },
      );
    }

    // Verify ownership before revoking
    const certificate = await prisma.verityCertificate.findFirst({
      where: {
        id,
        operatorId: membership.organizationId,
        revokedAt: null,
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found or already revoked" },
        { status: 404 },
      );
    }

    await prisma.verityCertificate.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[verity/certificate/revoke]", error);
    return NextResponse.json(
      { error: "Failed to revoke certificate" },
      { status: 500 },
    );
  }
}
