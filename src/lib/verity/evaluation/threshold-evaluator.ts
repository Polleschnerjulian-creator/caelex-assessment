import type { PrismaClient } from "@prisma/client";
import { generateAttestation } from "../core/attestation";
import { getActiveIssuerKey } from "../keys/issuer-keys";
import { findThreshold, renderClaimStatement } from "./regulation-thresholds";
import { resolveEvidence } from "./evidence-resolver";
import { safeLog } from "../utils/redaction";
import type { ThresholdAttestation } from "../core/types";
import { appendToChain } from "../audit-chain/chain-writer.server";

/**
 * Server-side threshold evaluation.
 *
 * Orchestrates: threshold lookup → evidence resolution → attestation generation.
 * actual_value is used internally and NEVER exposed.
 */
export async function evaluateAndAttest(
  prisma: PrismaClient,
  params: {
    operatorId: string;
    organizationId?: string;
    satelliteNorad: string | null;
    satelliteName: string | null;
    regulationRef: string;
    expiresInDays: number;
  },
): Promise<ThresholdAttestation | null> {
  // 1. Find regulation threshold
  const threshold = findThreshold(params.regulationRef);
  if (!threshold) {
    safeLog("Unknown regulation ref", {
      regulationRef: params.regulationRef,
    });
    return null;
  }

  // 2. Resolve evidence
  const evidence = await resolveEvidence(
    prisma,
    params.operatorId,
    params.satelliteNorad,
    threshold.data_point,
  );
  if (!evidence) {
    safeLog("No evidence available", {
      regulationRef: params.regulationRef,
      dataPoint: threshold.data_point,
    });
    return null;
  }

  // 3. Get active issuer key
  const issuerKey = await getActiveIssuerKey(prisma);

  // 4. Generate attestation — actual_value goes in, never comes out
  const attestation = generateAttestation({
    regulation_ref: threshold.regulation_ref,
    regulation_name: threshold.regulation_name,
    threshold_type: threshold.threshold_type,
    threshold_value: threshold.threshold_value,
    actual_value: evidence.actual_value,
    data_point: evidence.data_point,
    claim_statement: renderClaimStatement(threshold),
    subject: {
      operator_id: params.operatorId,
      satellite_norad_id: params.satelliteNorad,
      satellite_name: params.satelliteName,
    },
    evidence_source: evidence.source,
    trust_score: evidence.trust_score,
    collected_at: evidence.collected_at,
    sentinel_anchor: evidence.sentinel_anchor,
    cross_verification: evidence.cross_verification,
    issuer_key_id: issuerKey.keyId,
    issuer_private_key_der: issuerKey.privateKeyDer,
    issuer_public_key_hex: issuerKey.publicKeyHex,
    expires_in_days: params.expiresInDays,
  });

  // 5. Store in DB (actual_value is NOT stored, only commitment)
  await prisma.verityAttestation.create({
    data: {
      attestationId: attestation.attestation_id,
      operatorId: params.operatorId,
      organizationId: params.organizationId ?? null,
      satelliteNorad: params.satelliteNorad,
      regulationRef: threshold.regulation_ref,
      dataPoint: threshold.data_point,
      thresholdType: threshold.threshold_type,
      thresholdValue: threshold.threshold_value,
      result: attestation.claim.result,
      claimStatement: attestation.claim.claim_statement,
      valueCommitment: attestation.evidence.value_commitment,
      evidenceSource: attestation.evidence.source,
      trustScore: evidence.trust_score,
      trustLevel: attestation.evidence.trust_level,
      collectedAt: new Date(evidence.collected_at),
      sentinelAnchor: attestation.evidence.sentinel_anchor
        ? structuredClone(attestation.evidence.sentinel_anchor)
        : null,
      crossVerification: attestation.evidence.cross_verification
        ? structuredClone(attestation.evidence.cross_verification)
        : null,
      issuerKeyId: attestation.issuer.key_id,
      issuerPublicKey: attestation.issuer.public_key,
      signature: attestation.signature,
      fullAttestation: structuredClone(attestation),
      expiresAt: new Date(attestation.expires_at),
    },
  });

  safeLog("Attestation stored", {
    attestationId: attestation.attestation_id,
    regulationRef: threshold.regulation_ref,
  });

  // Append to compliance audit chain (non-blocking)
  appendToChain({
    organizationId: params.organizationId ?? params.operatorId,
    eventType: "ATTESTATION_CREATED",
    entityId: attestation.attestation_id,
    entityType: "attestation",
    eventData: {
      regulationRef: attestation.claim.regulation_ref,
      result: attestation.claim.result,
      trustLevel: attestation.evidence.trust_level,
    },
  }).catch(() => {});

  return attestation;
}
