import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/verity/certificate/list
 * Returns all Verity certificates for the current user's organisation.
 * Auth: Session required.
 *
 * Rate-limited via the general `api` tier (100/min per user) — list
 * is a session-only read but worth bounding so a misbehaving client
 * can't poll the org's full cert set in a tight loop.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

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
    logger.error("[verity/certificate/list]", error);
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
      { status: 500 },
    );
  }
}
