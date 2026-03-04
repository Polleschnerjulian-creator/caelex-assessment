/**
 * Public verification guard.
 *
 * Some verify endpoints can be called without authentication when the caller
 * supplies a full attestation or certificate payload (not just an ID).  In
 * that case the verification is purely computational — verity-core can
 * evaluate the cryptographic proof without any database lookup — so no
 * tenant context is required.
 *
 * Use {@link isPublicVerifyRequest} to decide whether to skip the auth
 * middleware for a given request body.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal shape guard: value is a non-null object (not an array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns `true` when `obj` looks like a full attestation payload — i.e. it
 * contains the fields that verity-core needs to verify without a DB round-trip.
 *
 * Required fields:
 * - `commitment`  — the Pedersen commitment hex string
 * - `proof`       — the zero-knowledge proof object or hex string
 * - `public_key`  — the attester's public key
 */
function isFullAttestation(obj: Record<string, unknown>): boolean {
  return (
    typeof obj["commitment"] === "string" &&
    obj["proof"] !== undefined &&
    obj["proof"] !== null &&
    typeof obj["public_key"] === "string"
  );
}

/**
 * Returns `true` when `obj` looks like a full certificate payload — i.e. it
 * contains the fields that verity-core needs to verify without a DB round-trip.
 *
 * Required fields:
 * - `attestation`  — the embedded attestation (must itself be a full payload)
 * - `signature`    — the issuer's signature
 * - `issuer_public_key` — the issuer's public key
 */
function isFullCertificate(obj: Record<string, unknown>): boolean {
  if (
    typeof obj["signature"] !== "string" ||
    typeof obj["issuer_public_key"] !== "string"
  ) {
    return false;
  }

  // The embedded attestation must also be a full payload
  const attestation = obj["attestation"];
  if (!isPlainObject(attestation)) {
    return false;
  }

  return isFullAttestation(attestation);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determines whether a request body qualifies for unauthenticated
 * (public) verification.
 *
 * A request is considered "public-verifiable" when it contains a complete
 * `attestation` or `certificate` object with all the cryptographic data
 * that verity-core needs to verify the proof locally — no database lookup
 * required.
 *
 * When this returns `true` the caller should skip {@link withApiAuth} and
 * proceed directly to the computational verification path.
 *
 * @param body - The parsed JSON request body (or `undefined` / `null`).
 * @returns `true` if the body carries a self-contained verifiable payload.
 */
export function isPublicVerifyRequest(body: unknown): boolean {
  if (!isPlainObject(body)) {
    return false;
  }

  // Case 1: top-level full attestation payload
  const attestation = body["attestation"];
  if (isPlainObject(attestation) && isFullAttestation(attestation)) {
    return true;
  }

  // Case 2: top-level full certificate payload
  const certificate = body["certificate"];
  if (isPlainObject(certificate) && isFullCertificate(certificate)) {
    return true;
  }

  // Case 3: the body itself is a full attestation
  if (isFullAttestation(body)) {
    return true;
  }

  // Case 4: the body itself is a full certificate
  if (isFullCertificate(body)) {
    return true;
  }

  return false;
}
