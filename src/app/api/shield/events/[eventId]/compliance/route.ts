/**
 * GET /api/shield/events/[eventId]/compliance
 *
 * Returns full compliance intelligence assessment for a conjunction event:
 * - Threshold violations per jurisdiction
 * - Compliance deadlines
 * - NCA reporting requirements
 * - Decision impact analysis
 * - Compliance timeline
 * - Maneuver impact (if applicable)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assessCompliance,
  buildComplianceTimeline,
  assessManeuverImpact,
} from "@/lib/shield/compliance-intelligence.server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;

    // Get user's org
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Get the event
    const event = await prisma.conjunctionEvent.findFirst({
      where: {
        id: eventId,
        organizationId: member.organizationId,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get org's CA config for jurisdiction info
    const config = await prisma.cAConfig.findUnique({
      where: { organizationId: member.organizationId },
    });

    // Determine jurisdictions from CA config or org defaults
    const jurisdictions = new Set<string>();
    if (config?.ncaJurisdiction) {
      jurisdictions.add(config.ncaJurisdiction.toUpperCase());
    }
    // Fallback to common EU jurisdictions if none configured
    if (jurisdictions.size === 0) {
      jurisdictions.add("FR");
      jurisdictions.add("DE");
      jurisdictions.add("GB");
    }

    const jurisdictionList = Array.from(jurisdictions);

    // Run compliance assessment
    const assessment = assessCompliance({
      pc: event.latestPc,
      missDistance: event.latestMissDistance,
      tca: event.tca,
      jurisdictions: jurisdictionList,
      currentDecision: event.decision,
      ncaNotified: event.ncaNotified,
      reportGenerated: event.reportGenerated,
    });

    // Build compliance timeline
    const timeline = buildComplianceTimeline({
      tca: event.tca,
      jurisdictions: jurisdictionList,
      eventCreatedAt: event.createdAt,
      decision: event.decision,
      decisionAt: event.decisionAt,
      ncaNotified: event.ncaNotified,
      ncaNotifiedAt: event.ncaNotifiedAt,
      maneuverExecutedAt: event.maneuverExecutedAt,
      reportGenerated: event.reportGenerated,
    });

    // Maneuver impact (if maneuver is being considered or executed)
    let maneuverImpact = null;
    if (
      event.decision === "MANEUVER" ||
      event.status === "MANEUVER_PLANNED" ||
      event.status === "MANEUVER_EXECUTED"
    ) {
      maneuverImpact = assessManeuverImpact({
        estimatedDeltaV: event.maneuverPlan
          ? ((event.maneuverPlan as Record<string, unknown>).deltaV as
              | number
              | null)
          : null,
        remainingFuelPct: event.fuelConsumedPct
          ? 100 - event.fuelConsumedPct
          : null,
        currentOrbitalLifetimeYears: null,
        jurisdictions: jurisdictionList,
      });
    }

    return NextResponse.json({
      eventId: event.id,
      conjunctionId: event.conjunctionId,
      jurisdictions: jurisdictionList,
      assessment,
      timeline,
      maneuverImpact,
    });
  } catch (error) {
    console.error("Error computing compliance assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
