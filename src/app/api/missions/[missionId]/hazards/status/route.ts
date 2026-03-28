import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";

// ─── Route params type ───

type RouteParams = { params: Promise<{ missionId: string }> };

// ─── GET: Report readiness status for a spacecraft's hazards ───

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const { missionId } = await params;
    const spacecraftId = missionId;

    // Verify spacecraft belongs to the user's organization
    const spacecraft = await prisma.spacecraft.findFirst({
      where: { id: spacecraftId, organizationId: orgId },
      select: { id: true },
    });
    if (!spacecraft) {
      return NextResponse.json(
        { error: "Spacecraft not found in your organization" },
        { status: 403 },
      );
    }

    // Fetch all hazard entries for this spacecraft
    const entries = await prisma.hazardEntry.findMany({
      where: {
        spacecraftId,
        organizationId: orgId,
      },
      select: {
        hazardId: true,
        title: true,
        acceptanceStatus: true,
        mitigationStatus: true,
      },
    });

    // Compute counts
    const total = entries.length;
    const accepted = entries.filter(
      (e) => e.acceptanceStatus === "ACCEPTED",
    ).length;
    const pending = entries.filter(
      (e) => e.acceptanceStatus === "PENDING",
    ).length;
    const rejected = entries.filter(
      (e) => e.acceptanceStatus === "REJECTED",
    ).length;

    const open = entries.filter((e) => e.mitigationStatus === "OPEN").length;
    const inProgress = entries.filter(
      (e) => e.mitigationStatus === "IN_PROGRESS",
    ).length;
    const closed = entries.filter(
      (e) => e.mitigationStatus === "CLOSED",
    ).length;

    // reportReady = true when ALL hazards are either ACCEPTED or mitigationStatus=CLOSED
    const reportReady =
      total > 0 &&
      entries.every(
        (e) =>
          e.acceptanceStatus === "ACCEPTED" || e.mitigationStatus === "CLOSED",
      );

    // openItems: hazards that are NOT yet ready (not ACCEPTED and not CLOSED)
    const openItems = entries
      .filter(
        (e) =>
          e.acceptanceStatus !== "ACCEPTED" && e.mitigationStatus !== "CLOSED",
      )
      .map((e) => ({
        hazardId: e.hazardId,
        title: e.title,
        acceptanceStatus: e.acceptanceStatus,
      }));

    return NextResponse.json({
      total,
      accepted,
      pending,
      rejected,
      open,
      inProgress,
      closed,
      reportReady,
      openItems,
    });
  } catch (err) {
    logger.error("[missions/[missionId]/hazards/status] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
