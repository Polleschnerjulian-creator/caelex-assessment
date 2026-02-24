/**
 * Assure RCR Benchmark API
 * GET: Get peer benchmark data for the user's operator type and current quarter
 *
 * Requires MANAGER+ role. Looks up the organization's operator profile
 * to determine operatorType, then queries the RCRBenchmark table for
 * the current quarter.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${quarter}`;
}

export async function GET(request: Request) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
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

    // Get org's operator profile for operatorType
    const operatorProfile = await prisma.operatorProfile.findUnique({
      where: { organizationId },
      select: { operatorType: true, euOperatorCode: true },
    });

    if (!operatorProfile?.operatorType && !operatorProfile?.euOperatorCode) {
      return NextResponse.json({
        benchmark: null,
        message:
          "No operator type configured. Complete your operator profile to see peer benchmarks.",
      });
    }

    // Use euOperatorCode (SCO, LO, etc.) if available, otherwise operatorType
    const operatorType =
      operatorProfile.euOperatorCode || operatorProfile.operatorType;
    const currentQuarter = getCurrentQuarter();

    // Query RCRBenchmark for operatorType and current quarter
    const benchmark = await prisma.rCRBenchmark.findUnique({
      where: {
        operatorType_period: {
          operatorType: operatorType!,
          period: currentQuarter,
        },
      },
    });

    if (!benchmark) {
      return NextResponse.json({
        benchmark: null,
        operatorType,
        period: currentQuarter,
        message: "No benchmark data available for the current quarter.",
      });
    }

    return NextResponse.json({
      benchmark: {
        id: benchmark.id,
        operatorType: benchmark.operatorType,
        period: benchmark.period,
        count: benchmark.count,
        meanScore: benchmark.meanScore,
        medianScore: benchmark.medianScore,
        p25Score: benchmark.p25Score,
        p75Score: benchmark.p75Score,
        stdDev: benchmark.stdDev,
        gradeDistribution: benchmark.gradeDistribution,
        componentMeans: benchmark.componentMeans,
        computedAt: benchmark.computedAt,
      },
      operatorType,
      period: currentQuarter,
    });
  } catch (error) {
    console.error("RCR benchmark API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
