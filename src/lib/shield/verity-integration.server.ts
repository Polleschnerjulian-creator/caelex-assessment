import "server-only";
import type { PrismaClient, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Input shape for a conjunction event used to build attestation payloads.
 */
export interface CAEventInput {
  id: string;
  conjunctionId: string;
  noradId: string;
  threatNoradId: string;
  riskTier: string;
  status: string;
  decision: string | null;
  decisionBy: string | null;
  decisionAt: Date | null;
  decisionRationale: string | null;
  peakPc: number;
  latestPc: number;
  latestMissDistance: number;
  tca: Date;
  closedAt: Date | null;
  closedReason: string | null;
  cdmCount: number;
  reportGenerated: boolean;
}

/**
 * Evidence payload embedded in the attestation, documenting the CA workflow.
 */
export interface CAEvidence {
  conjunctionId: string;
  threatNoradId: string;
  riskTier: string;
  decision: string | null;
  decisionBy: string | null;
  decisionAt: Date | null;
  decisionRationale: string | null;
  peakPc: number;
  latestPc: number;
  latestMissDistance: number;
  tca: Date;
  closedAt: Date | null;
  closedReason: string | null;
  cdmCount: number;
  reportGenerated: boolean;
}

/**
 * Attestation payload structure returned by buildAttestationPayload.
 */
export interface AttestationPayload {
  regulation_ref: string;
  data_point: string;
  satellite_norad_id: string;
  result: string;
  evidence: CAEvidence;
  expires_in_days: number;
}

// ─── Pure Functions ─────────────────────────────────────────────────────────

/**
 * Determines whether a Verity attestation should be created for a
 * conjunction event. Returns true only when the event is CLOSED with
 * a documented decision and no attestation has been created yet.
 */
export function shouldCreateAttestation(
  status: string,
  decision: string | null,
  existingAttestationId: string | null,
): boolean {
  return (
    status === "CLOSED" && decision !== null && existingAttestationId === null
  );
}

/**
 * Builds the attestation payload for a closed conjunction event.
 * The evidence object captures the full CA decision trail for
 * compliance auditing.
 */
export function buildAttestationPayload(
  event: CAEventInput,
): AttestationPayload {
  return {
    regulation_ref: "ca_compliance",
    data_point: "collision_avoidance",
    satellite_norad_id: event.noradId,
    result: "COMPLIANT",
    evidence: {
      conjunctionId: event.conjunctionId,
      threatNoradId: event.threatNoradId,
      riskTier: event.riskTier,
      decision: event.decision,
      decisionBy: event.decisionBy,
      decisionAt: event.decisionAt,
      decisionRationale: event.decisionRationale,
      peakPc: event.peakPc,
      latestPc: event.latestPc,
      latestMissDistance: event.latestMissDistance,
      tca: event.tca,
      closedAt: event.closedAt,
      closedReason: event.closedReason,
      cdmCount: event.cdmCount,
      reportGenerated: event.reportGenerated,
    },
    expires_in_days: 365,
  };
}

// ─── Database Function ──────────────────────────────────────────────────────

/**
 * Creates a Verity attestation record for a closed conjunction event
 * and links it back to the ConjunctionEvent. Returns the attestation
 * ID on success, or null if no attestation should be created.
 *
 * The VerityAttestation model requires cryptographic fields (issuerKeyId,
 * issuerPublicKey, signature, etc.) that would normally come from the
 * Verity signing pipeline. This function creates a "pending" attestation
 * with placeholder values that the Verity subsystem can later finalize.
 */
export async function createCAAttestation(
  prisma: PrismaClient,
  organizationId: string,
  event: CAEventInput,
): Promise<string | null> {
  if (
    !shouldCreateAttestation(
      event.status,
      event.decision,
      null, // We check for existing attestation via the event's verityAttestationId
    )
  ) {
    return null;
  }

  // Check if this event already has an attestation linked
  const existing = await prisma.conjunctionEvent.findUnique({
    where: { id: event.id },
    select: { verityAttestationId: true },
  });

  if (existing?.verityAttestationId) {
    logger.info("CA attestation already exists for event", {
      eventId: event.id,
      attestationId: existing.verityAttestationId,
    });
    return null;
  }

  const payload = buildAttestationPayload(event);
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + payload.expires_in_days);

  try {
    const attestation = await prisma.verityAttestation.create({
      data: {
        attestationId: `ca_${event.id}_${Date.now()}`,
        operatorId: organizationId,
        organizationId,
        satelliteNorad: event.noradId,
        regulationRef: payload.regulation_ref,
        dataPoint: payload.data_point,
        thresholdType: "decision_documented",
        thresholdValue: 1,
        result: true, // COMPLIANT = true
        claimStatement: `CA compliance verified: ${event.decision} decision documented for conjunction ${event.conjunctionId}`,
        valueCommitment: "ca_decision_recorded",
        evidenceSource: "shield_ca_workflow",
        trustScore: 1.0,
        trustLevel: "VERIFIED",
        collectedAt: event.closedAt ?? now,
        issuerKeyId: "shield_system",
        issuerPublicKey: "shield_system_key",
        signature: "pending_verity_signing",
        fullAttestation: {
          ...payload,
          createdBy: "shield_verity_integration",
          createdAt: now.toISOString(),
        } as unknown as Prisma.InputJsonValue,
        description: `Collision avoidance attestation for conjunction ${event.conjunctionId} (${event.decision})`,
        entityId: event.id,
        expiresAt,
      },
    });

    // Link the attestation back to the conjunction event
    await prisma.conjunctionEvent.update({
      where: { id: event.id },
      data: { verityAttestationId: attestation.id },
    });

    logger.info("Created CA Verity attestation", {
      attestationId: attestation.id,
      eventId: event.id,
      conjunctionId: event.conjunctionId,
      decision: event.decision,
    });

    return attestation.id;
  } catch (error) {
    logger.error("Failed to create CA Verity attestation", {
      eventId: event.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}
