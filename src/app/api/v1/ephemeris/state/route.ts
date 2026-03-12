import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { calculateSatelliteComplianceState } from "@/lib/ephemeris/core/satellite-compliance-state";
import { toPublicState } from "@/lib/ephemeris/core/types";

/**
 * GET /api/v1/ephemeris/state?norad_id=25544
 * Returns the current compliance state for a satellite.
 *
 * Performance: Returns cached DB state if fresh (< 2 hours).
 * Falls back to live calculation if cache is stale or missing.
 * Use ?refresh=true to force live recalculation.
 *
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

    const forceRefresh = request.nextUrl.searchParams.get("refresh") === "true";
    const orgId = membership.organizationId;

    // Verify satellite belongs to org
    const spacecraft = await prisma.spacecraft.findFirst({
      where: { noradId, organizationId: orgId },
      select: { name: true, launchDate: true },
    });
    if (!spacecraft) {
      return NextResponse.json(
        { error: "Satellite not found in your organization" },
        { status: 404 },
      );
    }

    // ── Try cached state first (fast path) ─────────────────────────────
    if (!forceRefresh) {
      const cached = await readCachedState(orgId, noradId);
      if (cached) {
        return NextResponse.json({ data: cached, cached: true });
      }
    }

    // ── Live calculation (slow path) ───────────────────────────────────
    const internalState = await calculateSatelliteComplianceState({
      prisma,
      orgId,
      noradId,
      satelliteName: spacecraft.name,
      launchDate: spacecraft.launchDate,
    });

    return NextResponse.json({ data: toPublicState(internalState) });
  } catch (error) {
    safeLog("Ephemeris state error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to calculate compliance state" },
      { status: 500 },
    );
  }
}

/**
 * Read cached state from SatelliteComplianceState if fresh (< 2 hours).
 */
async function readCachedState(
  orgId: string,
  noradId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const state = await prisma.satelliteComplianceState.findUnique({
      where: { noradId_operatorId: { noradId, operatorId: orgId } },
      select: { stateJson: true, calculatedAt: true },
    });

    if (!state?.stateJson) return null;

    // Only use if less than 2 hours old
    const ageMs = Date.now() - state.calculatedAt.getTime();
    if (ageMs > 2 * 60 * 60 * 1000) return null;

    return state.stateJson as Record<string, unknown>;
  } catch {
    return null;
  }
}
