import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { logger } from "@/lib/logger";

const maneuverEntrySchema = z.object({
  tcaDate: z.string().min(1),
  conjunctionId: z.string().min(1),
  pcBefore: z.number().min(0).max(1),
  pcAfter: z.number().min(0).max(1),
  deltaVUsed: z.number().min(0),
  burnDurationSeconds: z.number().min(0),
  outcome: z.enum(["successful", "not_required", "failed"]),
  notes: z.string().optional().default(""),
});

/**
 * GET /api/debris/[assessmentId]/maneuvers
 *
 * List all maneuver log entries for a debris assessment.
 * Art. 64 EU Space Act requires operators to maintain records of
 * collision avoidance maneuvers.
 *
 * Stored as ComplianceEvidence records with:
 *   regulationType: DEBRIS
 *   requirementId: `maneuver-log-{assessmentId}`
 *   evidenceType: LOG_EXTRACT
 *   metadata: JSON maneuver data
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit("api", session.user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    // Verify assessment ownership
    const orgContext = await getCurrentOrganization(userId);
    const assessment = await prisma.debrisAssessment.findFirst({
      where: {
        id: assessmentId,
        OR: [
          { userId },
          ...(orgContext?.organizationId
            ? [{ organizationId: orgContext.organizationId }]
            : []),
        ],
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    const requirementId = `maneuver-log-${assessmentId}`;

    const evidences = await prisma.complianceEvidence.findMany({
      where: {
        regulationType: "DEBRIS",
        requirementId,
        ...(orgContext?.organizationId
          ? { organizationId: orgContext.organizationId }
          : { createdBy: userId }),
      },
      orderBy: { createdAt: "desc" },
    });

    // Extract maneuver data from metadata
    const maneuvers = evidences.map((ev) => ({
      id: ev.id,
      ...(ev.metadata as Record<string, unknown>),
      createdAt: ev.createdAt.toISOString(),
    }));

    return NextResponse.json({ maneuvers });
  } catch (error) {
    logger.error("Error fetching maneuver log", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/debris/[assessmentId]/maneuvers
 *
 * Add a new maneuver log entry.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit("api", session.user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { assessmentId } = await params;
    const userId = session.user.id;
    const body = await request.json();

    const parsed = maneuverEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify assessment ownership
    const orgContext = await getCurrentOrganization(userId);
    const assessment = await prisma.debrisAssessment.findFirst({
      where: {
        id: assessmentId,
        OR: [
          { userId },
          ...(orgContext?.organizationId
            ? [{ organizationId: orgContext.organizationId }]
            : []),
        ],
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    const organizationId =
      orgContext?.organizationId || assessment.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 },
      );
    }

    const requirementId = `maneuver-log-${assessmentId}`;
    const data = parsed.data;

    const evidence = await prisma.complianceEvidence.create({
      data: {
        organizationId,
        createdBy: userId,
        regulationType: "DEBRIS",
        requirementId,
        title: `CA Maneuver: ${data.conjunctionId}`,
        description: data.notes || null,
        evidenceType: "LOG_EXTRACT",
        status: "ACCEPTED",
        validFrom: new Date(data.tcaDate),
        sourceType: "MANUAL",
        confidence: 1.0,
        metadata: {
          tcaDate: data.tcaDate,
          conjunctionId: data.conjunctionId,
          pcBefore: data.pcBefore,
          pcAfter: data.pcAfter,
          deltaVUsed: data.deltaVUsed,
          burnDurationSeconds: data.burnDurationSeconds,
          outcome: data.outcome,
          notes: data.notes,
        },
      },
    });

    // Audit trail
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "maneuver_log_entry_created",
      entityType: "compliance_evidence",
      entityId: evidence.id,
      newValue: {
        assessmentId,
        conjunctionId: data.conjunctionId,
        outcome: data.outcome,
      },
      description: `Logged collision avoidance maneuver for conjunction ${data.conjunctionId}`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      maneuver: {
        id: evidence.id,
        ...data,
        createdAt: evidence.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error creating maneuver log entry", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/debris/[assessmentId]/maneuvers
 *
 * Delete a maneuver log entry by ID (passed in body).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit("sensitive", session.user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { assessmentId } = await params;
    const userId = session.user.id;
    const body = await request.json();

    const deleteSchema = z.object({
      maneuverIds: z.array(z.string().min(1)).min(1),
    });
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify assessment ownership
    const orgContext = await getCurrentOrganization(userId);
    const assessment = await prisma.debrisAssessment.findFirst({
      where: {
        id: assessmentId,
        OR: [
          { userId },
          ...(orgContext?.organizationId
            ? [{ organizationId: orgContext.organizationId }]
            : []),
        ],
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    const requirementId = `maneuver-log-${assessmentId}`;

    // Only delete entries that belong to this assessment's maneuver log
    const { count } = await prisma.complianceEvidence.deleteMany({
      where: {
        id: { in: parsed.data.maneuverIds },
        requirementId,
        regulationType: "DEBRIS",
      },
    });

    // Audit trail
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "maneuver_log_entry_deleted",
      entityType: "compliance_evidence",
      entityId: parsed.data.maneuverIds.join(","),
      description: `Deleted ${count} maneuver log entries`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, deletedCount: count });
  } catch (error) {
    logger.error("Error deleting maneuver log entry", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
