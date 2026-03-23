/**
 * Shield Event Timeline API
 *
 * GET /api/shield/events/[eventId]/timeline
 * Returns a chronological timeline of all events for a conjunction,
 * merging CDM records, escalation logs, and key milestones into a
 * single sorted array.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface TimelineEntry {
  timestamp: string;
  type:
    | "cdm_received"
    | "tier_change"
    | "decision"
    | "maneuver"
    | "nca_notify"
    | "report"
    | "created"
    | "closed";
  title: string;
  description: string;
  metadata: Record<string, unknown>;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { eventId } = await params;

    const event = await prisma.conjunctionEvent.findFirst({
      where: {
        id: eventId,
        organizationId: membership.organizationId,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const [cdmRecords, escalationLogs] = await Promise.all([
      prisma.cDMRecord.findMany({
        where: { conjunctionEventId: eventId },
        orderBy: { creationDate: "asc" },
      }),
      prisma.cAEscalationLog.findMany({
        where: { conjunctionEventId: eventId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const timeline: TimelineEntry[] = [];

    // Event creation
    timeline.push({
      timestamp: event.createdAt.toISOString(),
      type: "created",
      title: "Conjunction detected",
      description: `Event created for conjunction ${event.conjunctionId} — primary object NORAD ${event.noradId} / threat object NORAD ${event.threatNoradId}`,
      metadata: {
        conjunctionId: event.conjunctionId,
        noradId: event.noradId,
        threatNoradId: event.threatNoradId,
        threatObjectName: event.threatObjectName,
        riskTier: event.riskTier,
        status: event.status,
      },
    });

    // CDM records
    cdmRecords.forEach((cdm, index) => {
      const pcFormatted =
        cdm.collisionProbability < 1e-4
          ? cdm.collisionProbability.toExponential(2)
          : cdm.collisionProbability.toFixed(6);
      const missKm = (cdm.missDistance / 1000).toFixed(3);

      timeline.push({
        timestamp: cdm.creationDate.toISOString(),
        type: "cdm_received",
        title: `CDM Update #${index + 1}`,
        description: `Pc: ${pcFormatted}, Miss distance: ${missKm} km`,
        metadata: {
          cdmId: cdm.cdmId,
          collisionProbability: cdm.collisionProbability,
          missDistance: cdm.missDistance,
          relativeSpeed: cdm.relativeSpeed,
          riskTier: cdm.riskTier,
          probabilityMethod: cdm.probabilityMethod,
          source: cdm.source,
        },
      });
    });

    // Escalation logs
    escalationLogs.forEach((log) => {
      if (log.triggeredBy === "OPERATOR_COORDINATION") {
        // Coordination entries are surfaced via the coordinate endpoint
        return;
      }

      timeline.push({
        timestamp: log.createdAt.toISOString(),
        type: "tier_change",
        title: `Risk: ${log.previousTier} → ${log.newTier}`,
        description:
          log.details ??
          `Status changed from ${log.previousStatus} to ${log.newStatus}`,
        metadata: {
          id: log.id,
          previousTier: log.previousTier,
          newTier: log.newTier,
          previousStatus: log.previousStatus,
          newStatus: log.newStatus,
          triggeredBy: log.triggeredBy,
        },
      });
    });

    // Decision
    if (event.decision && event.decisionAt) {
      timeline.push({
        timestamp: event.decisionAt.toISOString(),
        type: "decision",
        title: `Decision: ${event.decision}`,
        description:
          event.decisionRationale ??
          `Operator decision recorded: ${event.decision}`,
        metadata: {
          decision: event.decision,
          decisionBy: event.decisionBy,
          rationale: event.decisionRationale,
        },
      });
    }

    // NCA notification
    if (event.ncaNotified && event.ncaNotifiedAt) {
      timeline.push({
        timestamp: event.ncaNotifiedAt.toISOString(),
        type: "nca_notify",
        title: "NCA Notified",
        description:
          "National Competent Authority notified of conjunction event",
        metadata: {
          ncaNotifiedAt: event.ncaNotifiedAt.toISOString(),
        },
      });
    }

    // Report generated
    if (event.reportGenerated) {
      // Use updatedAt as best available timestamp since no reportGeneratedAt field exists
      timeline.push({
        timestamp: event.updatedAt.toISOString(),
        type: "report",
        title: "CA Report Generated",
        description: "Conjunction analysis report has been generated",
        metadata: {
          verityAttestationId: event.verityAttestationId,
        },
      });
    }

    // Maneuver executed
    if (event.maneuverExecutedAt) {
      timeline.push({
        timestamp: event.maneuverExecutedAt.toISOString(),
        type: "maneuver",
        title: "Maneuver Executed",
        description: event.fuelConsumedPct
          ? `Avoidance maneuver executed. Fuel consumed: ${event.fuelConsumedPct.toFixed(2)}%`
          : "Avoidance maneuver executed",
        metadata: {
          maneuverPlan: event.maneuverPlan,
          maneuverVerified: event.maneuverVerified,
          fuelConsumedPct: event.fuelConsumedPct,
        },
      });
    }

    // Event closed
    if (event.status === "CLOSED" && event.closedAt) {
      timeline.push({
        timestamp: event.closedAt.toISOString(),
        type: "closed",
        title: "Event Closed",
        description: event.closedReason ?? "Event has been closed",
        metadata: {
          closedAt: event.closedAt.toISOString(),
          closedReason: event.closedReason,
        },
      });
    }

    // Sort ascending by timestamp
    timeline.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return NextResponse.json({ data: timeline });
  } catch (error) {
    logger.error("Failed to build event timeline", error);
    return NextResponse.json(
      { error: "Failed to build event timeline" },
      { status: 500 },
    );
  }
}
