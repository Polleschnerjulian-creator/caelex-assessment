import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { canonicalJsonStringify } from "../utils/canonical-json";
import type {
  CommitmentContext,
  Commitment,
  CommitmentSecret,
  CommitmentResult,
} from "./types";

/**
 * Creates a SHA-256 commitment.
 *
 * commitment_hash = SHA-256(canonicalJson(context) || IEEE754_BE(value) || blinding_factor)
 *
 * - Hiding: Without blinding_factor nobody can derive the value from the hash
 * - Binding: The operator cannot claim a different value (SHA-256 collision resistance)
 *
 * NOTE: The commitment does NOT prove that value >= threshold.
 * That is done by the Attestation signature (Phase 1: Trusted Issuer).
 */
export function createCommitment(
  value: number,
  context: CommitmentContext,
): CommitmentResult {
  if (!Number.isFinite(value))
    throw new Error("Commitment: value must be finite");
  if (!context.data_point || context.data_point === context.regulation_ref) {
    throw new Error(
      "Commitment: data_point must be the measured field, not regulation_ref",
    );
  }
  if (!context.collected_at) {
    throw new Error(
      "Commitment: collected_at must be the measurement timestamp",
    );
  }

  const blinding_factor = randomBytes(32).toString("hex");

  const hash = createHash("sha256");
  hash.update(canonicalJsonStringify(context));
  hash.update(numberToBuffer(value));
  hash.update(Buffer.from(blinding_factor, "hex"));

  return {
    commitment: {
      commitment_hash: `sha256:${hash.digest("hex")}`,
      context,
      created_at: new Date().toISOString(),
    },
    secret: { value, blinding_factor },
  };
}

/**
 * Opens a commitment (verifies that value + blinding_factor match the hash).
 * Timing-safe against side-channel attacks.
 */
export function openCommitment(
  commitment: Commitment,
  secret: CommitmentSecret,
): boolean {
  if (!Number.isFinite(secret.value)) return false;

  const hash = createHash("sha256");
  hash.update(canonicalJsonStringify(commitment.context));
  hash.update(numberToBuffer(secret.value));
  hash.update(Buffer.from(secret.blinding_factor, "hex"));

  const expected = `sha256:${hash.digest("hex")}`;

  if (expected.length !== commitment.commitment_hash.length) return false;
  return timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(commitment.commitment_hash),
  );
}

function numberToBuffer(n: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(n, 0);
  return buf;
}
