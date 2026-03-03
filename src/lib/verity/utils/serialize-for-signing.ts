import { canonicalJsonStringify } from "./canonical-json";

/**
 * Creates the exact byte input for Ed25519 signatures.
 *
 * Specification:
 * 1. Input object is serialized with canonicalJsonStringify()
 * 2. String is encoded as UTF-8 without BOM
 * 3. No prefix, no suffix, no length header
 * 4. The result is the exact Buffer that gets signed
 *
 * IMPORTANT: Only the defined fields are signed.
 * UI fields, derived fields, or metadata NOT in signedFields
 * are IGNORED.
 */
export function serializeForSigning(
  obj: Record<string, unknown>,
  signedFields: string[],
): Buffer {
  const signable: Record<string, unknown> = {};
  for (const field of signedFields.sort()) {
    if (obj[field] === undefined) {
      throw new Error(
        `serializeForSigning: required field "${field}" is undefined`,
      );
    }
    signable[field] = obj[field];
  }

  const canonical = canonicalJsonStringify(signable);
  return Buffer.from(canonical, "utf8");
}

/**
 * The exact list of fields signed in an Attestation.
 * If a field is not here, it is NOT part of the signature.
 * Order does not matter — canonicalJsonStringify sorts.
 */
export const ATTESTATION_SIGNED_FIELDS = [
  "attestation_id",
  "version",
  "claim",
  "subject",
  "evidence",
  "issuer",
  "issued_at",
  "expires_at",
] as const;

/**
 * The exact list of fields signed in a Certificate.
 */
export const CERTIFICATE_SIGNED_FIELDS = [
  "certificate_id",
  "version",
  "schema",
  "subject",
  "issuer",
  "claims",
  "embedded_attestations",
  "evidence_summary",
  "issued_at",
  "expires_at",
] as const;
