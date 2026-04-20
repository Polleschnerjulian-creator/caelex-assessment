import "server-only";
import type { PrismaClient, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getActiveIssuerKey } from "@/lib/verity/keys/issuer-keys";
import { generateAttestation } from "@/lib/verity/core/attestation";
import { appendToLog } from "@/lib/verity/transparency/log-store";

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
 * B6 fix (2026-04-20): this function now uses the real Verity signing
 * pipeline (getActiveIssuerKey + generateAttestation) instead of writing
 * placeholder values ("shield_system" / "pending_verity_signing"). The
 * resulting attestation is cryptographically verifiable via the public
 * verify endpoint and will round-trip correctly through the certificate
 * bundler + audit chain.
 *
 * Attestation model used:
 *   data_point       "ca_decision_documented"
 *   threshold_type   "ABOVE"
 *   threshold_value  0
 *   actual_value     1  (signals "decision documented + event closed")
 *   result           true → COMPLIANT
 *
 * The actual_value of 1 is what flows into the commitment; peakPc,
 * miss distance, decision rationale all live in the embedded evidence
 * object for audit purposes. The commitment binds Caelex to the claim
 * that *a* decision was documented, not to the specific physics values
 * (those can be fetched separately from the event record).
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
    // B6: load the real Verity issuer key and sign the attestation.
    const issuerKey = await getActiveIssuerKey(prisma);

    const collectedAt = (event.closedAt ?? now).toISOString();

    const signed = generateAttestation({
      regulation_ref: payload.regulation_ref,
      regulation_name: "Collision Avoidance Compliance",
      threshold_type: "ABOVE",
      threshold_value: 0,
      actual_value: 1, // decision documented → value 1 > threshold 0 → COMPLIANT
      data_point: payload.data_point,
      claim_statement: `CA compliance verified: ${event.decision} decision documented for conjunction ${event.conjunctionId}`,
      subject: {
        operator_id: organizationId,
        satellite_norad_id: event.noradId,
      },
      evidence_source: "shield_ca_workflow",
      trust_score: 1.0,
      collected_at: collectedAt,
      sentinel_anchor: null,
      cross_verification: null,
      issuer_key_id: issuerKey.keyId,
      issuer_private_key_der: issuerKey.privateKeyDer,
      issuer_public_key_hex: issuerKey.publicKeyHex,
      expires_in_days: payload.expires_in_days,
    });

    const attestation = await prisma.verityAttestation.create({
      data: {
        attestationId: signed.attestation_id,
        operatorId: organizationId,
        organizationId,
        satelliteNorad: event.noradId,
        regulationRef: payload.regulation_ref,
        dataPoint: payload.data_point,
        thresholdType: "ABOVE",
        thresholdValue: 0,
        result: signed.claim.result,
        claimStatement: signed.claim.claim_statement,
        valueCommitment: signed.evidence.value_commitment,
        evidenceSource: signed.evidence.source,
        trustScore: 1.0,
        trustLevel: signed.evidence.trust_level,
        collectedAt: event.closedAt ?? now,
        issuerKeyId: signed.issuer.key_id,
        issuerPublicKey: signed.issuer.public_key,
        signature: signed.signature,
        fullAttestation: {
          ...signed,
          // Attach the full CA event evidence object alongside the signed
          // attestation. This is NOT part of the signed payload but is
          // preserved for audit / investigator reference.
          ca_event_evidence: payload.evidence,
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

    // Append to Merkle transparency log (idempotent).
    try {
      await appendToLog(prisma, signed as unknown as Record<string, unknown>);
    } catch (err) {
      logger.warn(
        "Transparency log append failed — will be retried by backfill",
        {
          attestationId: signed.attestation_id,
          error: String(err),
        },
      );
    }

    logger.info("Created CA Verity attestation (signed)", {
      attestationId: attestation.id,
      verityAttestationId: signed.attestation_id,
      issuerKeyId: signed.issuer.key_id,
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
