import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeComplianceScore } from "@/lib/verity/score/calculator";

/**
 * GET /api/v1/verity/score/me
 * Returns the compliance score for the current user's organisation.
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

    const now = new Date();

    // Fetch active, non-revoked attestations for the organisation
    const dbAttestations = await prisma.verityAttestation.findMany({
      where: {
        organizationId: membership.organizationId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: {
        regulationRef: true,
        result: true,
        trustLevel: true,
        expiresAt: true,
        issuedAt: true,
      },
    });

    const score = computeComplianceScore(
      dbAttestations.map((a) => ({
        regulationRef: a.regulationRef,
        result: a.result,
        trustLevel: a.trustLevel,
        expiresAt: a.expiresAt,
        issuedAt: a.issuedAt,
      })),
    );

    return NextResponse.json({ score });
  } catch (error) {
    logger.error("[verity/score/me]", error);
    return NextResponse.json(
      { error: "Failed to compute compliance score" },
      { status: 500 },
    );
  }
}
