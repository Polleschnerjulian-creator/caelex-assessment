import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/verity/certificate/list
 * Returns all Verity certificates for the current user's organisation.
 * Auth: Session required.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve organisation
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organisation found for this user" },
        { status: 403 },
      );
    }

    const certificates = await prisma.verityCertificate.findMany({
      where: {
        operatorId: membership.organizationId,
        revokedAt: null,
      },
      select: {
        id: true,
        certificateId: true,
        satelliteNorad: true,
        claimsCount: true,
        regulationRefs: true,
        minTrustLevel: true,
        sentinelBacked: true,
        crossVerified: true,
        isPublic: true,
        issuedAt: true,
        expiresAt: true,
        verificationCount: true,
      },
      orderBy: { issuedAt: "desc" },
    });

    return NextResponse.json({ certificates });
  } catch (error) {
    console.error("[verity/certificate/list]", error);
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
      { status: 500 },
    );
  }
}
