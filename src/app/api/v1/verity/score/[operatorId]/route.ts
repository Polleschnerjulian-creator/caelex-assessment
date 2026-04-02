import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeComplianceScore } from "@/lib/verity/score/calculator";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

/**
 * GET /api/v1/verity/score/[operatorId]
 * Returns the public compliance score for an operator.
 * Rate-limited to prevent abuse.
 * Optional query param: ?satellite=NORAD_ID to filter by satellite.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> },
) {
  try {
    // Rate limit
    const ip = getIdentifier(request);
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

    const { searchParams } = new URL(request.url);
    const satellite = searchParams.get("satellite");

    const now = new Date();

    // Fetch active, non-revoked attestations for the operator
    const dbAttestations = await prisma.verityAttestation.findMany({
      where: {
        operatorId,
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
