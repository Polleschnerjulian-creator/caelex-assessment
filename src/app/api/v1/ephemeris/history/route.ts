import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";

/**
 * GET /api/v1/ephemeris/history?norad_id=25544&from=2026-01-01&to=2026-03-01
 * Returns historical compliance state snapshots for a satellite.
 * Auth: Session-based
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const noradId = request.nextUrl.searchParams.get("norad_id");
    if (!noradId) {
      return NextResponse.json(
        { error: "norad_id query parameter is required" },
        { status: 400 },
      );
    }

    // Verify satellite belongs to org
    const spacecraft = await prisma.spacecraft.findFirst({
      where: {
        noradId,
        organizationId: membership.organizationId,
      },
      select: { id: true },
    });
    if (!spacecraft) {
      return NextResponse.json(
        { error: "Satellite not found in your organization" },
        { status: 404 },
      );
    }

    const fromParam = request.nextUrl.searchParams.get("from");
    const toParam = request.nextUrl.searchParams.get("to");

    const fromDate = fromParam
      ? new Date(fromParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const toDate = toParam ? new Date(toParam) : new Date();

    // Access SatelliteComplianceStateHistory model
    const db = prisma as unknown as Record<string, unknown>;
    const historyModel = db["satelliteComplianceStateHistory"] as
      | {
          findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
        }
      | undefined;

    if (!historyModel) {
      return NextResponse.json({
        data: [],
        meta: { note: "History model not yet available. Run prisma generate." },
      });
    }

    const history = await historyModel.findMany({
      where: {
        noradId,
        operatorId: membership.organizationId,
        calculatedAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { calculatedAt: "asc" },
    });

    return NextResponse.json({
      data: history,
      meta: {
        noradId,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        count: (history as unknown[]).length,
      },
    });
  } catch (error) {
    safeLog("Ephemeris history error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to retrieve history" },
      { status: 500 },
    );
  }
}
