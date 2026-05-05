import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeComplianceScore } from "@/lib/verity/score/calculator";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

/**
 * GET /api/v1/verity/score/[operatorId]
 *
 * T1-C1 fix (audit 2026-05-05): Was previously unauthenticated and used
 * `where: { operatorId }`. Since `operatorId` in `VerityAttestation` was
 * historically populated with `session.user.id` (i.e. user-ID, not
 * org-ID), an attacker could probe foreign user-IDs and read score
 * breakdowns + compliance status of other operators — IDOR.
 *
 * The fix:
 *   - Require an authenticated session (no more public access).
 *   - The path param is now treated as an organisation ID, and the
 *     caller must be a member of that organisation.
 *   - Query filters on `organizationId` (the canonical scoping field),
 *     not on `operatorId`.
 *
 * For external verification by investors / regulators / counterparties,
 * use the public passport route at /verity/passport/[passportId] —
 * that route returns curated, owner-published score data via an opaque
 * passport ID rather than the internal organisation ID.
 *
 * Optional query param: ?satellite=NORAD_ID to filter by satellite.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> },
) {
  try {
    // T1-C1: auth gate
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit (kept; defends against authenticated-user abuse)
    const ip = getIdentifier(request, session.user.id);
    const rl = await checkRateLimit("verity_public", ip);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { operatorId } = await params;

    if (!operatorId) {
      return NextResponse.json(
        { error: "operatorId is required" },
        { status: 400 },
      );
    }

    // T1-C1: caller must be a member of the requested organisation.
    // Treat `operatorId` from the URL as an organisationId — clients
    // that previously passed user-IDs will now correctly 403 instead
    // of silently leaking data.
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: operatorId,
      },
      select: { organizationId: true },
    });

    if (!membership) {
      // Same response for "not a member" and "org doesn't exist" so we
      // don't leak organisation existence to non-members.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const satellite = searchParams.get("satellite");

    const now = new Date();

    // Fetch active, non-revoked attestations scoped by organisationId
    // (the canonical scoping field), not by the legacy `operatorId`
    // user-ID column. Combined with the membership check above this
    // closes the IDOR.
    const dbAttestations = await prisma.verityAttestation.findMany({
      where: {
        organizationId: operatorId,
        revokedAt: null,
        expiresAt: { gt: now },
        ...(satellite ? { satelliteNorad: satellite } : {}),
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

    return NextResponse.json({
      operatorId,
      satellite: satellite ?? null,
      score,
    });
  } catch (error) {
    logger.error("[verity/score]", error);
    return NextResponse.json(
      { error: "Failed to compute compliance score" },
      { status: 500 },
    );
  }
}
