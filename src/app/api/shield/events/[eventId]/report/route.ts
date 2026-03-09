/**
 * Shield Report API
 *
 * POST /api/shield/events/[eventId]/report
 * Generates a Collision Avoidance compliance report PDF for the given event.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { generateCAReportPDF } from "@/lib/shield/compliance-reporter.server";

export async function POST(
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
      include: {
        cdmRecords: {
          orderBy: { creationDate: "asc" },
        },
        escalationLog: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const pdfBuffer = generateCAReportPDF(
      {
        id: event.id,
        conjunctionId: event.conjunctionId,
        noradId: event.noradId,
        threatNoradId: event.threatNoradId,
        threatObjectName: event.threatObjectName,
        threatObjectType: event.threatObjectType,
        status: event.status,
        riskTier: event.riskTier,
        peakPc: event.peakPc,
        latestPc: event.latestPc,
        latestMissDistance: event.latestMissDistance,
        tca: event.tca,
        relativeSpeed: event.relativeSpeed,
        decision: event.decision,
        decisionBy: event.decisionBy,
        decisionAt: event.decisionAt,
        decisionRationale: event.decisionRationale,
        createdAt: event.createdAt,
      },
      event.cdmRecords.map((c) => ({
        cdmId: c.cdmId,
        creationDate: c.creationDate,
        collisionProbability: c.collisionProbability,
        missDistance: c.missDistance,
        riskTier: c.riskTier,
      })),
      event.escalationLog.map((e) => ({
        previousTier: e.previousTier,
        newTier: e.newTier,
        previousStatus: e.previousStatus,
        newStatus: e.newStatus,
        triggeredBy: e.triggeredBy,
        createdAt: e.createdAt,
      })),
    );

    await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: { reportGenerated: true },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_report_generated",
      entityType: "conjunction_event",
      entityId: eventId,
      description: `Shield CA report generated for ${event.conjunctionId}`,
      organizationId: membership.organizationId,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ca-report-${event.conjunctionId}.pdf"`,
      },
    });
  } catch (error) {
    logger.error("Failed to generate CA report", error);
    return NextResponse.json(
      { error: "Failed to generate CA report" },
      { status: 500 },
    );
  }
}
