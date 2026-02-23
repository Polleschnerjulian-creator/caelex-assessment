/**
 * Assure RRS Score API
 * GET: Get current Regulatory Readiness Score for the user's organization
 *
 * Query params:
 *   ?refresh=true — Force recompute instead of returning cached score
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { computeAndSaveRRS } from "@/lib/rrs-engine.server";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export async function GET(request: Request) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("api", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Role check: MANAGER+
    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const organizationId = membership.organizationId;

    // Check if refresh is requested
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!forceRefresh) {
      // Try to return cached score
      const cached = await prisma.regulatoryReadinessScore.findUnique({
        where: { organizationId },
      });

      if (cached) {
        // Return cached score — recompute in full only when explicitly requested
        return NextResponse.json({
          overallScore: cached.overallScore,
          grade: cached.grade,
          status: cached.status,
          components: {
            authorizationReadiness: cached.authorizationReadiness,
            cybersecurityPosture: cached.cybersecurityPosture,
            operationalCompliance: cached.operationalCompliance,
            jurisdictionalCoverage: cached.jurisdictionalCoverage,
            regulatoryTrajectory: cached.regulatoryTrajectory,
            governanceProcess: cached.governanceProcess,
          },
          methodologyVersion: cached.methodologyVersion,
          computedAt: cached.computedAt,
          cached: true,
        });
      }
    }

    // No cached score or refresh requested — compute fresh
    const result = await computeAndSaveRRS(organizationId);

    return NextResponse.json({
      overallScore: result.overallScore,
      grade: result.grade,
      status: result.status,
      components: result.components,
      recommendations: result.recommendations,
      methodology: result.methodology,
      computedAt: result.computedAt,
      cached: false,
    });
  } catch (error) {
    console.error("Assure score API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
