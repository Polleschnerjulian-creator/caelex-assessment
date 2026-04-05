/**
 * Hazard Reject API
 * POST /api/hazards/[hazardId]/reject — Reject a hazard with reason
 */

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
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

// ─── Validation ───

const rejectBodySchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(2000),
});

// ─── Roles that can reject hazards (MANAGER+) ───

const REJECT_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hazardId: string }> },
) {
  try {
    // ─── Auth + Rate Limit + Org Check ───
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

    // ─── RBAC: MANAGER+ required ───
    const role = await getUserRole(orgId, session.user.id);
    if (!role || !REJECT_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. MANAGER role or above required." },
        { status: 403 },
      );
    }

    const { hazardId } = await params;

    // ─── Validate Body ───
    const body = await request.json();
    const parsed = rejectBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { reason } = parsed.data;

    // ─── Find Hazard Entry ───
    const hazardEntry = await prisma.hazardEntry.findFirst({
      where: {
        id: hazardId,
        organizationId: orgId,
      },
      include: {
        spacecraft: { select: { id: true, name: true, noradId: true } },
      },
    });

    if (!hazardEntry) {
      return NextResponse.json(
        { error: "Hazard entry not found" },
        { status: 404 },
      );
    }

    // ─── Check if already rejected ───
    if (hazardEntry.acceptanceStatus === "REJECTED") {
      return NextResponse.json(
        { error: "Hazard is already rejected" },
        { status: 409 },
      );
    }

    // ─── Update hazard status ───
    const updatedHazard = await prisma.hazardEntry.update({
      where: { id: hazardId, organizationId: orgId },
      data: {
        acceptanceStatus: "REJECTED",
        acceptedBy: null,
        acceptedAt: null,
        verityAttestationId: null,
      },
      include: {
        spacecraft: { select: { id: true, name: true, noradId: true } },
        mitigations: { orderBy: { createdAt: "asc" } },
      },
    });

    // ─── Audit Log ───
    await logAuditEvent({
      userId: session.user.id,
      action: "hazard_rejected",
      entityType: "hazard_entry",
      entityId: updatedHazard.id,
      description: `Rejected hazard ${updatedHazard.hazardId} (${updatedHazard.title}) for spacecraft ${updatedHazard.spacecraft.name}. Reason: ${reason}`,
      newValue: {
        acceptanceStatus: "REJECTED",
        rejectionReason: reason,
        hazardId: updatedHazard.hazardId,
        severity: updatedHazard.severity,
        riskIndex: updatedHazard.riskIndex,
        rejectedBy: session.user.id,
      },
      organizationId: orgId,
    });

    return NextResponse.json({
      hazard: updatedHazard,
      rejectionReason: reason,
    });
  } catch (error) {
    logger.error("Failed to reject hazard", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
