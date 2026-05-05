import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/verity/passport/[passportId]
 * Public endpoint — returns passport data for the given ID.
 * No authentication required; passport must be public and not revoked/expired.
 *
 * Rate-limited via the `verity_public` tier (30/h per IP). The endpoint
 * touches the DB on every hit (read + fire-and-forget view-count
 * update) so the conservative public budget keeps a passport-ID
 * brute-force from running up DB cost.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ passportId: string }> },
) {
  try {
    const rl = await checkRateLimit("verity_public", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const { passportId } = await params;

    const record = await prisma.verityPassport.findFirst({
      where: { passportId },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Passport not found" },
        { status: 404 },
      );
    }

    if (!record.isPublic) {
      return NextResponse.json(
        { error: "Passport is not public" },
        { status: 403 },
      );
    }

    if (record.revokedAt) {
      return NextResponse.json(
        { error: "Passport has been revoked" },
        { status: 410 },
      );
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Passport has expired" },
        { status: 410 },
      );
    }

    // Increment view count (fire-and-forget — do not block response)
    prisma.verityPassport
      .update({
        where: { id: record.id },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date(),
        },
      })
      .catch(() => {
        // Non-critical — ignore errors
      });

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.caelex.eu";

    const passport = {
      passportId: record.passportId,
      label: record.label,
      operatorId: record.operatorId,
      satelliteNorad: record.satelliteNorad,
      satelliteName: record.satelliteName,
      complianceScore: record.complianceScore,
      scoreBreakdown: record.scoreBreakdown as Record<string, number>,
      attestations: record.attestationSummary as unknown[],
      jurisdictions: record.jurisdictions,
      generatedAt: record.generatedAt.toISOString(),
      expiresAt: record.expiresAt.toISOString(),
      verificationUrl: `${APP_URL}/verity/passport/${record.passportId}`,
    };

    return NextResponse.json({ passport });
  } catch (error) {
    logger.error("[passport/[passportId]]", error);
    return NextResponse.json(
      { error: "Failed to retrieve passport" },
      { status: 500 },
    );
  }
}
