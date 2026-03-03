import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import {
  simulateJurisdictionChange,
  compareAllJurisdictions,
} from "@/lib/ephemeris/simulation/jurisdiction-simulator";
import { getJurisdictionCodes } from "@/lib/ephemeris/simulation/jurisdiction-data";

/**
 * POST /api/v1/ephemeris/simulate
 * Runs a jurisdiction simulation (re-flagging analysis).
 * Auth: Session-based
 *
 * Body:
 * {
 *   norad_id: string,
 *   to_jurisdiction: string,        // optional — if omitted, compares all
 *   from_jurisdiction?: string       // defaults to "DE"
 * }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { norad_id, to_jurisdiction, from_jurisdiction = "DE" } = body;

    if (!norad_id) {
      return NextResponse.json(
        { error: "norad_id is required" },
        { status: 400 },
      );
    }

    // Verify satellite belongs to org
    const spacecraft = await prisma.spacecraft.findFirst({
      where: {
        noradId: norad_id,
        organizationId: membership.organizationId,
      },
      select: { name: true },
    });
    if (!spacecraft) {
      return NextResponse.json(
        { error: "Satellite not found in your organization" },
        { status: 404 },
      );
    }

    const satellite = { noradId: norad_id, name: spacecraft.name };

    // Get current score (use a rough estimate; in production, load cached state)
    const currentScore = 75; // TODO: Load from cached SatelliteComplianceState

    if (to_jurisdiction) {
      // Single jurisdiction comparison
      const validCodes = getJurisdictionCodes();
      if (!validCodes.includes(to_jurisdiction.toUpperCase())) {
        return NextResponse.json(
          {
            error: `Unknown jurisdiction: ${to_jurisdiction}. Valid: ${validCodes.join(", ")}`,
          },
          { status: 400 },
        );
      }

      const simulation = simulateJurisdictionChange(
        from_jurisdiction,
        to_jurisdiction,
        satellite,
        currentScore,
      );

      return NextResponse.json({ data: simulation });
    }

    // Compare all jurisdictions
    const comparisons = compareAllJurisdictions(
      from_jurisdiction,
      satellite,
      currentScore,
    );

    return NextResponse.json({
      data: comparisons,
      meta: {
        currentJurisdiction: from_jurisdiction,
        comparedJurisdictions: comparisons.length,
      },
    });
  } catch (error) {
    safeLog("Ephemeris simulate error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to run jurisdiction simulation" },
      { status: 500 },
    );
  }
}
