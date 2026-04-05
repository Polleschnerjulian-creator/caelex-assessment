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
import { getUserRole } from "@/lib/services/organization-service";
import { roleHasPermission } from "@/lib/permissions";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { z } from "zod";

// ─── Severity score mapping ───

const SEVERITY_SCORES: Record<string, number> = {
  CATASTROPHIC: 4,
  CRITICAL: 3,
  MARGINAL: 2,
  NEGLIGIBLE: 1,
};

// ─── Validation ───

const fmecaSchema = z.object({
  failureMode: z.string(),
  localEffect: z.string(),
  systemEffect: z.string(),
  detectability: z.number().min(1).max(5),
  compensatingMeasures: z.string(),
});

const updateHazardSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
  severity: z
    .enum(["CATASTROPHIC", "CRITICAL", "MARGINAL", "NEGLIGIBLE"])
    .optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  mitigationStatus: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]).optional(),
  residualRisk: z.string().nullable().optional(),
  regulatoryRefs: z.array(z.string()).optional(),
  fmecaNotes: z.string().nullable().optional(),
  fmeca: fmecaSchema.optional(),
});

// ─── Route params type ───

type RouteParams = { params: Promise<{ hazardId: string }> };

// ─── GET: Fetch single HazardEntry by id ───

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

    const { hazardId } = await params;

    const entry = await prisma.hazardEntry.findFirst({
      where: {
        id: hazardId,
        organizationId: orgId,
      },
      include: {
        mitigations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Hazard entry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ entry });
  } catch (err) {
    logger.error("[hazards/[hazardId]] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT: Update HazardEntry ───

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // RBAC: require MEMBER+ (compliance:write)
    const userRole = await getUserRole(orgId, session.user.id);
    if (!userRole || !roleHasPermission(userRole, "compliance:write")) {
      return NextResponse.json(
        { error: "Insufficient permissions to update hazards" },
        { status: 403 },
      );
    }

    const { hazardId } = await params;

    // Verify the hazard belongs to the user's organization
    const existing = await prisma.hazardEntry.findFirst({
      where: {
        id: hazardId,
        organizationId: orgId,
      },
      select: {
        id: true,
        severity: true,
        likelihood: true,
        acceptanceStatus: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Hazard entry not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateHazardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Build update payload
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.likelihood !== undefined) updateData.likelihood = data.likelihood;
    if (data.mitigationStatus !== undefined)
      updateData.mitigationStatus = data.mitigationStatus;
    if (data.residualRisk !== undefined)
      updateData.residualRisk = data.residualRisk;
    if (data.regulatoryRefs !== undefined)
      updateData.regulatoryRefs = data.regulatoryRefs;
    if (data.fmecaNotes !== undefined) updateData.fmecaNotes = data.fmecaNotes;
    if (data.fmeca) {
      updateData.fmecaNotes = JSON.stringify(data.fmeca);
    }

    // D-6: Cannot set mitigationStatus to CLOSED without at least one mitigation
    if (updateData.mitigationStatus === "CLOSED") {
      const mitigationCount = await prisma.hazardMitigation.count({
        where: { hazardEntryId: hazardId },
      });
      if (mitigationCount === 0) {
        return NextResponse.json(
          {
            error:
              "Cannot close mitigation without at least one mitigation record",
          },
          { status: 422 },
        );
      }
    }

    // Auto-recompute riskIndex if severity or likelihood changed
    const newSeverity = data.severity ?? existing.severity;
    const newLikelihood = data.likelihood ?? existing.likelihood;
    if (data.severity !== undefined || data.likelihood !== undefined) {
      const severityScore = SEVERITY_SCORES[newSeverity];
      updateData.riskIndex = severityScore * newLikelihood;

      // Reset acceptance when risk increases on an already-accepted hazard
      const oldRiskIndex =
        SEVERITY_SCORES[existing.severity] * existing.likelihood;
      const newRiskIndex = severityScore * newLikelihood;
      if (
        newRiskIndex > oldRiskIndex &&
        existing.acceptanceStatus === "ACCEPTED"
      ) {
        updateData.acceptanceStatus = "PENDING";
        updateData.acceptedBy = null;
        updateData.acceptedAt = null;
      }
    }

    const entry = await prisma.hazardEntry.update({
      where: { id: hazardId, organizationId: orgId },
      data: updateData,
      include: {
        mitigations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Audit log: track who updated the hazard
    try {
      const { ipAddress, userAgent } = getRequestContext(request);
      await logAuditEvent({
        userId: session.user.id,
        action: "hazard_entry_updated",
        entityType: "hazard_entry",
        entityId: hazardId,
        description: `Updated hazard entry ${hazardId}`,
        newValue: updateData,
        ipAddress,
        userAgent,
      });
    } catch (auditErr) {
      logger.warn("[hazards/[hazardId]] Audit log failed:", auditErr);
    }

    return NextResponse.json({ entry });
  } catch (err) {
    logger.error("[hazards/[hazardId]] PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Remove HazardEntry (ADMIN/OWNER only) ───

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rl = await checkRateLimit(
      "sensitive",
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

    // RBAC: only ADMIN/OWNER can delete (compliance:delete)
    const userRole = await getUserRole(orgId, session.user.id);
    if (!userRole || !roleHasPermission(userRole, "compliance:delete")) {
      return NextResponse.json(
        {
          error:
            "Insufficient permissions to delete hazards. Requires ADMIN or OWNER role.",
        },
        { status: 403 },
      );
    }

    const { hazardId } = await params;

    // Find the hazard entry
    const hazardEntry = await prisma.hazardEntry.findFirst({
      where: {
        id: hazardId,
        organizationId: orgId,
      },
      select: {
        id: true,
        hazardId: true,
        title: true,
        acceptanceStatus: true,
        spacecraftId: true,
      },
    });

    if (!hazardEntry) {
      return NextResponse.json(
        { error: "Hazard entry not found" },
        { status: 404 },
      );
    }

    // Cannot delete ACCEPTED hazards (audit integrity)
    if (hazardEntry.acceptanceStatus === "ACCEPTED") {
      return NextResponse.json(
        {
          error:
            "Cannot delete an accepted hazard. Accepted hazards are immutable for audit integrity.",
          hazardId: hazardEntry.hazardId,
        },
        { status: 422 },
      );
    }

    // Cascade delete mitigations + hazard entry in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.hazardMitigation.deleteMany({
        where: { hazardEntryId: hazardId },
      });
      await tx.hazardEntry.delete({
        where: { id: hazardId, organizationId: orgId },
      });
    });

    // Audit log the deletion
    try {
      const { ipAddress, userAgent } = getRequestContext(request);
      await logAuditEvent({
        userId: session.user.id,
        action: "hazard_entry_deleted",
        entityType: "hazard_entry",
        entityId: hazardId,
        description: `Deleted hazard entry ${hazardEntry.hazardId} (${hazardEntry.title}) for spacecraft ${hazardEntry.spacecraftId}`,
        previousValue: {
          hazardId: hazardEntry.hazardId,
          title: hazardEntry.title,
          acceptanceStatus: hazardEntry.acceptanceStatus,
        },
        ipAddress,
        userAgent,
        organizationId: orgId,
      });
    } catch (auditErr) {
      logger.warn("[hazards/[hazardId]] DELETE audit log failed:", auditErr);
    }

    return NextResponse.json({
      deleted: true,
      hazardId: hazardEntry.hazardId,
    });
  } catch (err) {
    logger.error("[hazards/[hazardId]] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
