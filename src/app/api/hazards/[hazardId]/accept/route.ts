/**
 * Hazard Accept API
 * POST /api/hazards/[hazardId]/accept — Accept a hazard + create Verity attestation
 */

import crypto from "crypto";
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
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

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

    // ─── RBAC: require MANAGER+ (compliance:write) ───
    const userRole = await getUserRole(orgId, session.user.id);
    if (!userRole || !roleHasPermission(userRole, "compliance:write")) {
      return NextResponse.json(
        { error: "Insufficient permissions for hazard acceptance" },
        { status: 403 },
      );
    }

    const { hazardId } = await params;

    // ─── Find Hazard Entry ───
    const hazardEntry = await prisma.hazardEntry.findFirst({
      where: {
        id: hazardId,
        organizationId: orgId,
      },
      include: {
        spacecraft: true,
        mitigations: true,
      },
    });

    if (!hazardEntry) {
      return NextResponse.json(
        { error: "Hazard entry not found" },
        { status: 404 },
      );
    }

    // ─── Check mitigations are closed ───
    if (hazardEntry.mitigationStatus !== "CLOSED") {
      return NextResponse.json(
        {
          error: "Hazard must have closed mitigations before acceptance",
          hazardId: hazardEntry.hazardId,
          mitigationStatus: hazardEntry.mitigationStatus,
        },
        { status: 422 },
      );
    }

    // ─── Check if already accepted ───
    if (hazardEntry.acceptanceStatus === "ACCEPTED") {
      return NextResponse.json(
        {
          error: "Hazard already accepted",
          hazardId: hazardEntry.hazardId,
          acceptedAt: hazardEntry.acceptedAt,
          acceptedBy: hazardEntry.acceptedBy,
        },
        { status: 409 },
      );
    }

    const spacecraft = hazardEntry.spacecraft;
    const now = new Date();

    // ─── Atomic: Create Attestation + Update Hazard in one transaction ───
    const { updatedHazard, attestation } = await prisma.$transaction(
      async (tx) => {
        // Optimistic concurrency guard — re-check status inside transaction
        const guard = await tx.hazardEntry.findFirst({
          where: {
            id: hazardEntry.id,
            acceptanceStatus: { not: "ACCEPTED" },
          },
          select: { id: true },
        });
        if (!guard) {
          throw new Error("ALREADY_ACCEPTED");
        }

        const fullAttestation = {
          hazardId: hazardEntry.hazardId,
          hazardEntryId: hazardEntry.id,
          title: hazardEntry.title,
          description: hazardEntry.description,
          hazardType: hazardEntry.hazardType,
          severity: hazardEntry.severity,
          likelihood: hazardEntry.likelihood,
          riskIndex: hazardEntry.riskIndex,
          mitigationStatus: hazardEntry.mitigationStatus,
          residualRisk: hazardEntry.residualRisk,
          regulatoryRefs: hazardEntry.regulatoryRefs,
          spacecraftId: spacecraft.id,
          spacecraftName: spacecraft.name,
          spacecraftNoradId: spacecraft.noradId,
          mitigations: hazardEntry.mitigations.map((m) => ({
            id: m.id,
            type: m.type,
            description: m.description,
            implementedAt: m.implementedAt,
            verifiedBy: m.verifiedBy,
          })),
          acceptedBy: session.user.id,
          acceptedAt: now.toISOString(),
          organizationId: orgId,
        };

        // Compute real HMAC signature
        const attestationData = JSON.stringify(fullAttestation);
        const hmacKey =
          process.env.ENCRYPTION_KEY ||
          process.env.AUTH_SECRET ||
          "fallback-key";
        const signature = crypto
          .createHmac("sha256", hmacKey)
          .update(attestationData)
          .digest("hex");
        const issuerPublicKey = `caelex-hazard-${orgId.slice(0, 8)}`;

        const att = await tx.verityAttestation.create({
          data: {
            attestationId: `hazard_${hazardEntry.id}_${Date.now()}`,
            operatorId: orgId,
            organizationId: orgId,
            satelliteNorad: spacecraft.noradId,
            regulationRef: "fsoa_hazard_acceptance",
            dataPoint: "hazard_risk_acceptance",
            thresholdType: "accepted_residual_risk",
            thresholdValue: 1,
            result: true,
            claimStatement: `Hazard ${hazardEntry.hazardId} (${hazardEntry.title}) accepted with residual risk assessment. Severity: ${hazardEntry.severity}, Likelihood: ${hazardEntry.likelihood}, Risk Index: ${hazardEntry.riskIndex}. Mitigation status: ${hazardEntry.mitigationStatus}.`,
            valueCommitment: "hazard_acceptance_recorded",
            evidenceSource: "hazard_report_workflow",
            trustScore: 1.0,
            trustLevel: "VERIFIED",
            collectedAt: now,
            issuerKeyId: "hazard_system",
            issuerPublicKey,
            signature,
            fullAttestation,
            description: `Hazard acceptance attestation for ${hazardEntry.hazardId}`,
            entityId: hazardEntry.id,
            expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        const updated = await tx.hazardEntry.update({
          where: { id: hazardEntry.id, organizationId: orgId },
          data: {
            acceptanceStatus: "ACCEPTED",
            acceptedBy: session.user.id,
            acceptedAt: now,
            verityAttestationId: att.id,
          },
          include: {
            spacecraft: {
              select: { id: true, name: true, noradId: true },
            },
            mitigations: true,
          },
        });

        return { updatedHazard: updated, attestation: att };
      },
    );

    await logAuditEvent({
      userId: session.user.id,
      action: "hazard_accepted",
      entityType: "hazard_entry",
      entityId: updatedHazard.id,
      description: `Accepted hazard ${updatedHazard.hazardId} (${updatedHazard.title}) for spacecraft ${updatedHazard.spacecraft.name}. Verity attestation: ${attestation.attestationId}`,
      newValue: {
        acceptanceStatus: "ACCEPTED",
        verityAttestationId: attestation.id,
        hazardId: updatedHazard.hazardId,
        severity: updatedHazard.severity,
        riskIndex: updatedHazard.riskIndex,
      },
      organizationId: orgId,
    });

    return NextResponse.json({
      hazard: updatedHazard,
      attestationId: attestation.id,
      attestationRef: attestation.attestationId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_ACCEPTED") {
      return NextResponse.json(
        { error: "Hazard was already accepted by a concurrent request" },
        { status: 409 },
      );
    }
    logger.error("Failed to accept hazard", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
