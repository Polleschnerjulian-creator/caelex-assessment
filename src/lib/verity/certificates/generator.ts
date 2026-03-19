import { createPrivateKey, sign, randomBytes } from "node:crypto";
import {
  serializeForSigning,
  CERTIFICATE_SIGNED_FIELDS,
} from "../utils/serialize-for-signing";
import { safeLog } from "../utils/redaction";
import type {
  VerityCertificate,
  CertificateClaim,
  ThresholdAttestation,
} from "../core/types";
import type { TrustLevel } from "../utils/trust-level";

/**
 * Issues a certificate bundling multiple attestations.
 *
 * CRITICAL: The certificate contains COMPLETE signed attestations.
 * This allows OFFLINE verification — no Caelex API call needed.
 * The verifier only needs the certificate JSON and Caelex's public key.
 */
export function issueCertificate(params: {
  attestations: ThresholdAttestation[];
  operator_id: string;
  operator_name: string;
  satellite_norad_id: string | null;
  satellite_name: string | null;
  issuer_key_id: string;
  issuer_private_key_der: Buffer;
  issuer_public_key_hex: string;
  expires_in_days: number;
  is_public: boolean;
}): VerityCertificate {
  // NOTE: Audit chain entry for CERTIFICATE_ISSUED should be appended
  // by the caller (API route) after persisting the certificate to DB.
  if (params.attestations.length === 0) {
    throw new Error("Certificate requires at least one attestation");
  }

  // Build claims from attestations
  const claims: CertificateClaim[] = params.attestations.map((att) => ({
    claim_id: `vc_${randomBytes(8).toString("hex")}`,
    attestation_id: att.attestation_id,
    regulation_ref: att.claim.regulation_ref,
    regulation_name: att.claim.regulation_name,
    claim_statement: att.claim.claim_statement,
    result: att.claim.result,
    trust_level: att.evidence.trust_level,
    source: att.evidence.source,
    sentinel_anchored: !!att.evidence.sentinel_anchor,
    cross_verified: !!att.evidence.cross_verification,
  }));

  // Compute evidence summary
  const sentinel_backed = params.attestations.filter(
    (a) => a.evidence.sentinel_anchor,
  ).length;
  const cross_verified = params.attestations.filter(
    (a) => a.evidence.cross_verification,
  ).length;

  const trust_levels = params.attestations.map((a) => a.evidence.trust_level);
  const trust_order: TrustLevel[] = ["LOW", "MEDIUM", "HIGH"];
  const min_trust_level = trust_levels.reduce((min, curr) =>
    trust_order.indexOf(curr) < trust_order.indexOf(min) ? curr : min,
  );

  // Evidence period
  const collected_dates = params.attestations
    .filter((a) => a.evidence.sentinel_anchor?.collected_at)
    .map((a) => a.evidence.sentinel_anchor!.collected_at);
  const issued_dates = params.attestations.map((a) => a.issued_at);
  const all_dates = [...collected_dates, ...issued_dates].sort();

  const certificate_unsigned = {
    certificate_id: `vc_${Date.now()}_${randomBytes(8).toString("hex")}`,
    version: "1.0" as const,
    schema: "https://caelex.eu/verity/certificate/v1" as const,

    subject: {
      operator_id: params.operator_id,
      operator_name: params.operator_name,
      satellite_norad_id: params.satellite_norad_id,
      satellite_name: params.satellite_name,
    },

    issuer: {
      name: "Caelex" as const,
      key_id: params.issuer_key_id,
      public_key: params.issuer_public_key_hex,
      algorithm: "Ed25519" as const,
    },

    claims,
    embedded_attestations: params.attestations,

    evidence_summary: {
      total_attestations: params.attestations.length,
      sentinel_backed,
      cross_verified,
      min_trust_level,
      evidence_period: {
        from: all_dates[0] || new Date().toISOString(),
        to: all_dates[all_dates.length - 1] || new Date().toISOString(),
      },
    },

    issued_at: new Date().toISOString(),
    expires_at: new Date(
      Date.now() + params.expires_in_days * 86400000,
    ).toISOString(),
  };

  const verification_url = "https://caelex.eu/api/v1/verity/certificate/verify";

  // Sign the certificate
  const data_to_sign = serializeForSigning(
    certificate_unsigned as unknown as Record<string, unknown>,
    [...CERTIFICATE_SIGNED_FIELDS],
  );

  const privateKey = createPrivateKey({
    key: params.issuer_private_key_der,
    format: "der",
    type: "pkcs8",
  });

  const signature = sign(null, data_to_sign, privateKey).toString("hex");

  safeLog("Certificate issued", {
    certificate_id: certificate_unsigned.certificate_id,
    claims_count: String(claims.length),
    min_trust: min_trust_level,
  });

  return {
    ...certificate_unsigned,
    verification_url,
    signature,
  };
}
