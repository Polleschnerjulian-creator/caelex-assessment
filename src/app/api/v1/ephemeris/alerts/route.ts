import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";

/**
 * GET /api/v1/ephemeris/alerts?norad_id=25544
 * Returns active alerts for a satellite (or all satellites if no norad_id).
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
    const severityFilter = request.nextUrl.searchParams.get("severity");

    // Access SatelliteAlert model (may not be in generated Prisma client yet)
    const db = prisma as unknown as Record<string, unknown>;
    const alertModel = db["satelliteAlert"] as
      | {
          findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
        }
      | undefined;

    if (!alertModel) {
      // Prisma client hasn't been regenerated with new models yet
      return NextResponse.json({
        data: [],
        meta: { note: "Alert model not yet available. Run prisma generate." },
      });
    }

    const where: Record<string, unknown> = {
      operatorId: membership.organizationId,
      resolvedAt: null, // Only active alerts
    };

    if (noradId) {
      where["noradId"] = noradId;
    }
    if (severityFilter) {
      where["severity"] = severityFilter.toUpperCase();
    }

    const alerts = await alertModel.findMany({
      where,
      orderBy: [
        { severity: "asc" }, // CRITICAL first
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ data: alerts });
  } catch (error) {
    safeLog("Ephemeris alerts error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to retrieve alerts" },
      { status: 500 },
    );
  }
}
