import type { VerityCertificate, ThresholdAttestation } from "../core/types";

/**
 * Serializes a certificate to JSON string for download/sharing.
 */
export function serializeCertificate(cert: VerityCertificate): string {
  return JSON.stringify(cert, null, 2);
}

/**
 * Serializes an attestation to JSON string for download/sharing.
 */
export function serializeAttestation(att: ThresholdAttestation): string {
  return JSON.stringify(att, null, 2);
}

/**
 * Parses a certificate from JSON string.
 * Performs basic structural validation.
 */
export function parseCertificate(json: string): VerityCertificate | null {
  try {
    const parsed = JSON.parse(json);
    if (
      !parsed.certificate_id ||
      !parsed.version ||
      !parsed.signature ||
      !parsed.claims ||
      !parsed.embedded_attestations
    ) {
      return null;
    }
    return parsed as VerityCertificate;
  } catch {
    return null;
  }
}

/**
 * Parses an attestation from JSON string.
 * Performs basic structural validation.
 */
export function parseAttestation(json: string): ThresholdAttestation | null {
  try {
    const parsed = JSON.parse(json);
    if (
      !parsed.attestation_id ||
      !parsed.version ||
      !parsed.signature ||
      !parsed.claim ||
      !parsed.issuer
    ) {
      return null;
    }
    return parsed as ThresholdAttestation;
  } catch {
    return null;
  }
}
