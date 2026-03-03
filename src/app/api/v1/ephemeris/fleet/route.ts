import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { calculateSatelliteComplianceState } from "@/lib/ephemeris/core/satellite-compliance-state";
import { toPublicState } from "@/lib/ephemeris/core/types";

/**
 * GET /api/v1/ephemeris/fleet
 * Returns compliance state for all satellites in the user's organization.
 * Auth: Session-based
 */
export async function GET(_request: NextRequest) {
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

    const allSpacecraft = await prisma.spacecraft.findMany({
      where: { organizationId: membership.organizationId },
      select: { noradId: true, name: true, launchDate: true },
      orderBy: { name: "asc" },
    });

    // Filter to spacecraft with NORAD IDs (required for ephemeris)
    const spacecraft = allSpacecraft.filter(
      (sc): sc is typeof sc & { noradId: string } => sc.noradId !== null,
    );

    // Calculate state for each satellite in parallel
    const states = await Promise.allSettled(
      spacecraft.map((sc) =>
        calculateSatelliteComplianceState({
          prisma,
          orgId: membership.organizationId,
          noradId: sc.noradId,
          satelliteName: sc.name,
          launchDate: sc.launchDate,
        }),
      ),
    );

    const fleet: ReturnType<typeof toPublicState>[] = [];
    for (let i = 0; i < states.length; i++) {
      const result = states[i]!;
      if (result.status === "fulfilled") {
        fleet.push(toPublicState(result.value));
      } else {
        safeLog("Fleet calculation failed for satellite", {
          noradId: spacecraft[i]?.noradId,
          error:
            result.reason instanceof Error ? result.reason.message : "Unknown",
        });
      }
    }

    return NextResponse.json({
      data: fleet,
      meta: {
        total: spacecraft.length,
        calculated: fleet.length,
      },
    });
  } catch (error) {
    safeLog("Ephemeris fleet error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to calculate fleet compliance" },
      { status: 500 },
    );
  }
}
