import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeComplianceScore } from "@/lib/verity/score/calculator";
import { buildNCABundle } from "@/lib/verity/nca-bridge/submission-builder.server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * POST /api/v1/verity/nca-bundle
 * Builds an NCA submission bundle for a given jurisdiction.
 * Auth: Session required.
 *
 * Rate-limited via the conservative `verity_bundle` tier (5/h per user).
 * Bundle build is heavy — full leaf scan + tree rebuild + bundling
 * — so the same tier as /bundle/export keeps the cost ceiling
 * consistent.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "verity_bundle",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = (await request.json()) as {
      jurisdiction: string;
      satelliteNorad?: string;
    };

    const { jurisdiction, satelliteNorad } = body;

    if (!jurisdiction || typeof jurisdiction !== "string") {
      return NextResponse.json(
        { error: "jurisdiction is required" },
        { status: 400 },
      );
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

    const { organizationId } = membership;
    const now = new Date();

    // Fetch active, non-revoked attestations for the organisation
    const dbAttestations = await prisma.verityAttestation.findMany({
      where: {
        organizationId,
        revokedAt: null,
        expiresAt: { gt: now },
        ...(satelliteNorad ? { satelliteNorad } : {}),
      },
      select: {
        attestationId: true,
        regulationRef: true,
        result: true,
        trustLevel: true,
        trustScore: true,
        signature: true,
        issuedAt: true,
        expiresAt: true,
      },
    });

    // Compute compliance score from active attestations
    const score = computeComplianceScore(
      dbAttestations.map((a) => ({
        regulationRef: a.regulationRef,
        result: a.result,
        trustLevel: a.trustLevel,
        expiresAt: a.expiresAt,
        issuedAt: a.issuedAt,
      })),
    );

    // Build the NCA bundle
    const bundle = buildNCABundle({
      organizationId,
      jurisdiction,
      satelliteNorad,
      attestations: dbAttestations,
      complianceScore: score.overall,
    });

    return NextResponse.json({ bundle }, { status: 200 });
  } catch (error) {
    logger.error("[nca-bundle]", error);
    return NextResponse.json(
      { error: "Failed to build NCA bundle" },
      { status: 500 },
    );
  }
}
