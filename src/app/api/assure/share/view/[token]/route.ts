/**
 * Assure Shared View — Public Access (NO auth required)
 * GET: View shared compliance data via a permissioned token
 *
 * Validates token, checks expiry/revocation/view limits,
 * increments view count, logs the view, and returns data
 * based on the configured granularity level.
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { encrypt } from "@/lib/encryption";
import { computeRRS } from "@/lib/rrs-engine.server";
import { getRRSHistory } from "@/lib/rrs-engine.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Rate limit (public endpoint — use stricter limits)
    const identifier = getIdentifier(request);
    const rateLimit = await checkRateLimit("public_api", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { token } = await params;

    if (!token || token.length < 32) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Find the share link
    const shareLink = await prisma.assureShareLink.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: "Share link not found or invalid" },
        { status: 404 },
      );
    }

    // Check if revoked
    if (shareLink.isRevoked) {
      return NextResponse.json(
        { error: "This share link has been revoked" },
        { status: 403 },
      );
    }

    // Check expiry
    if (new Date() > shareLink.expiresAt) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 403 },
      );
    }

    // Check maxViews
    if (
      shareLink.maxViews !== null &&
      shareLink.viewCount >= shareLink.maxViews
    ) {
      return NextResponse.json(
        { error: "This share link has reached its maximum view count" },
        { status: 403 },
      );
    }

    // Encrypt viewer IP for privacy-preserving audit
    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    let encryptedIp: string | null = null;
    if (rawIp) {
      try {
        encryptedIp = await encrypt(rawIp);
      } catch {
        // Encryption failure should not block the view
        encryptedIp = null;
      }
    }

    const userAgent = request.headers.get("user-agent") || null;

    // Increment view count and log the view atomically
    await prisma.$transaction([
      prisma.assureShareLink.update({
        where: { id: shareLink.id },
        data: { viewCount: { increment: 1 } },
      }),
      prisma.assureShareView.create({
        data: {
          linkId: shareLink.id,
          viewerIp: encryptedIp,
          userAgent,
        },
      }),
    ]);

    // Compute fresh RRS for the organization
    const rrsResult = await computeRRS(shareLink.organizationId);

    // Build response based on granularity level
    const response = await buildSharedViewResponse(
      shareLink,
      rrsResult,
      shareLink.organization.name,
    );

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Shared view error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function buildSharedViewResponse(
  shareLink: {
    id: string;
    organizationId: string;
    granularity: string;
    includeRRS: boolean;
    includeGapAnalysis: boolean;
    includeTimeline: boolean;
    includeRiskRegister: boolean;
    includeTrend: boolean;
    expiresAt: Date;
  },
  rrsResult: Awaited<ReturnType<typeof computeRRS>>,
  organizationName: string,
) {
  const base: Record<string, unknown> = {
    organizationName,
    generatedAt: new Date().toISOString(),
    granularity: shareLink.granularity,
  };

  // SUMMARY level: RRS total + component scores
  if (shareLink.includeRRS) {
    base.rrs = {
      overallScore: rrsResult.overallScore,
      grade: rrsResult.grade,
      status: rrsResult.status,
      components: Object.fromEntries(
        Object.entries(rrsResult.components).map(([key, comp]) => [
          key,
          {
            score: comp.score,
            weight: comp.weight,
            weightedScore: comp.weightedScore,
          },
        ]),
      ),
    };
  }

  // COMPONENT level: + gap analysis per module, recommendations
  if (
    shareLink.granularity === "COMPONENT" ||
    shareLink.granularity === "DETAILED"
  ) {
    if (shareLink.includeGapAnalysis) {
      base.gapAnalysis = Object.fromEntries(
        Object.entries(rrsResult.components).map(([key, comp]) => [
          key,
          {
            score: comp.score,
            maxScore: 100,
            gap: 100 - comp.score,
            factors: comp.factors.map((f) => ({
              name: f.name,
              earnedPoints: f.earnedPoints,
              maxPoints: f.maxPoints,
              gap: f.maxPoints - f.earnedPoints,
              description: f.description,
            })),
          },
        ]),
      );
    }

    if (shareLink.includeRiskRegister) {
      base.recommendations = rrsResult.recommendations;
    }
  }

  // DETAILED level: + full factor breakdown
  if (shareLink.granularity === "DETAILED") {
    base.detailedComponents = Object.fromEntries(
      Object.entries(rrsResult.components).map(([key, comp]) => [
        key,
        {
          score: comp.score,
          weight: comp.weight,
          weightedScore: comp.weightedScore,
          factors: comp.factors,
        },
      ]),
    );

    base.methodology = rrsResult.methodology;
  }

  // Trend data (if enabled)
  if (shareLink.includeTrend) {
    try {
      const history = await getRRSHistory(shareLink.organizationId, 90);
      base.trend = history.map((s) => ({
        date: s.date,
        overallScore: s.overallScore,
      }));
    } catch {
      // Trend failure should not block the response
      base.trend = [];
    }
  }

  return base;
}
