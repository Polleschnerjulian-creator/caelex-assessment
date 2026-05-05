import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendToChain } from "@/lib/verity/audit-chain/chain-writer.server";

/**
 * PATCH /api/v1/verity/certificate/[id]/visibility
 * Toggles the public/private visibility of a Verity certificate.
 * Auth: Session required.
 */
export async function PATCH(
  request: NextRequest,
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

    const body = (await request.json()) as { isPublic: boolean };

    if (typeof body.isPublic !== "boolean") {
      return NextResponse.json(
        { error: "isPublic must be a boolean" },
        { status: 400 },
      );
    }

    // C3 fix: role gate added. Visibility (public vs private) changes
    // the external trust surface of a certificate and is therefore
    // restricted to OWNER/ADMIN/MANAGER.
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
        { error: "Insufficient role to change certificate visibility" },
        { status: 403 },
      );
    }

    // Verify ownership before updating
    const certificate = await prisma.verityCertificate.findFirst({
      where: {
        id,
        operatorId: membership.organizationId,
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.verityCertificate.update({
      where: { id },
      data: { isPublic: body.isPublic },
    });

    // T1-M9: tamper-evident audit-chain entry. Visibility flips
    // change the external trust profile of a certificate (a once-
    // public cert flipped to private remains physically queryable
    // by anyone who saved the URL — regulators need a trail).
    await appendToChain({
      organizationId: membership.organizationId,
      eventType: "CERTIFICATE_VISIBILITY_CHANGED",
      entityId: certificate.certificateId,
      entityType: "certificate",
      eventData: {
        changedBy: session.user.id,
        previousVisibility: certificate.isPublic ? "public" : "private",
        newVisibility: body.isPublic ? "public" : "private",
      },
    }).catch((err) => {
      logger.error("verity audit-chain append failed (cert visibility)", {
        certificateId: certificate.certificateId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return NextResponse.json({ certificate: updated });
  } catch (error) {
    logger.error("[verity/certificate/visibility]", error);
    return NextResponse.json(
      { error: "Failed to update certificate visibility" },
      { status: 500 },
    );
  }
}
