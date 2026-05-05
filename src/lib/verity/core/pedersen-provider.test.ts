/**
 * T2-1 (audit fix 2026-05-05): Pedersen-Provider tests.
 *
 * Covers the cryptographic core of Verity v2 attestations:
 *   - commit/open roundtrip
 *   - rejection of opening with wrong value or wrong blinding
 *   - additive homomorphism: C(a) + C(b) == C(a + b)
 *   - Schnorr proof-of-knowledge generates verifiable proof
 *   - PoK rejects mutated proofs (A, z_r, z_v swapped or zeroed)
 *   - PoK is context-bound (different context → invalid)
 *
 * No DB, no network — pure crypto verification.
 */

import { describe, it, expect } from "vitest";
import {
  pedersenCommit,
  pedersenOpen,
  pedersenAdd,
  proveOpening,
  verifyOpeningProof,
  randomScalar,
  scalarToHex,
  CURVE_ORDER,
} from "./pedersen-provider";

const CTX = new TextEncoder().encode("test-context");

describe("pedersenCommit / pedersenOpen", () => {
  it("opens a fresh commitment with the matching opening", () => {
    const { commitment, opening } = pedersenCommit(42);
    expect(pedersenOpen(commitment, opening)).toBe(true);
  });

  it("rejects opening with the wrong value", () => {
    const { commitment, opening } = pedersenCommit(100);
    const tampered = { value: 101, blinding: opening.blinding };
    expect(pedersenOpen(commitment, tampered)).toBe(false);
  });

  it("rejects opening with the wrong blinding", () => {
    const { commitment, opening } = pedersenCommit(7);
    const tampered = {
      value: opening.value,
      blinding: scalarToHex(randomScalar()),
    };
    expect(pedersenOpen(commitment, tampered)).toBe(false);
  });

  it("produces different commitments for the same value (hiding via blinding)", () => {
    const a = pedersenCommit(123);
    const b = pedersenCommit(123);
    // Same value, but the blinding scalar is fresh — commitments must differ.
    expect(a.commitment.commitment).not.toBe(b.commitment.commitment);
    // Yet both open correctly to 123.
    expect(pedersenOpen(a.commitment, a.opening)).toBe(true);
    expect(pedersenOpen(b.commitment, b.opening)).toBe(true);
  });

  it("commits to 0 correctly", () => {
    const { commitment, opening } = pedersenCommit(0);
    expect(pedersenOpen(commitment, opening)).toBe(true);
    // Wrong value should still fail
    expect(
      pedersenOpen(commitment, { value: 1, blinding: opening.blinding }),
    ).toBe(false);
  });

  it("commits to a negative value correctly (IEEE-754 stable)", () => {
    const { commitment, opening } = pedersenCommit(-3.14);
    expect(pedersenOpen(commitment, opening)).toBe(true);
    // The encoding must distinguish -3.14 from +3.14
    expect(
      pedersenOpen(commitment, { value: 3.14, blinding: opening.blinding }),
    ).toBe(false);
  });

  it("commits to a large positive value correctly", () => {
    const big = 1_234_567_890.12345;
    const { commitment, opening } = pedersenCommit(big);
    expect(pedersenOpen(commitment, opening)).toBe(true);
  });
});

describe("pedersenAdd — additive homomorphism", () => {
  it("returns a valid Ristretto point (raw point-addition works)", () => {
    // Pedersen point-addition is mathematically valid — the IST-Zustand
    // we can verify is that the resulting commitment is a well-formed
    // Ristretto255 point. Whether it semantically equals C(v_a + v_b)
    // depends on whether `valueToScalar` is linear, which it currently
    // is NOT (see the .todo below — KNOWN BUG).
    const a = pedersenCommit(10);
    const b = pedersenCommit(15);
    const sum = pedersenAdd(a.commitment, b.commitment);
    expect(sum.commitment).toMatch(/^[0-9a-f]{64}$/);
    expect(sum.algorithm).toBe("pedersen-ristretto255");
  });

  // ❌ KNOWN BUG (T2-CRYPTO-1, audit fix plan Tier 2):
  // The doc-comment at the top of pedersen-provider.ts promises
  //   "homomorphic — C(v₁) + C(v₂) = C(v₁ + v₂)"
  // but the implementation breaks this property because
  // `valueToScalar(v) = SHA-512(IEEE-754(v)) mod q` is non-linear.
  // C(a) + C(b) on the curve sums (a_scalar + b_scalar) on H, but
  // (a_scalar + b_scalar) ≠ valueToScalar(a + b) for almost all inputs.
  // The "aggregate proofs across attestations" use case in the doc
  // therefore does NOT work with this implementation.
  //
  // Two ways to fix (need design decision):
  //   (a) Use the value directly as a scalar (`BigInt(value) mod q`)
  //       — restores homomorphism but loses IEEE-754 number support.
  //   (b) Drop the homomorphism claim from the doc-comment, since
  //       v1/v2/v3 attestations don't actually use pedersenAdd today.
  //
  // Tracked as T2-CRYPTO-1 in docs/VERITY-AUDIT-FIX-PLAN.md.
  it.todo(
    "[KNOWN BUG] commitment(a) + commitment(b) opens to (a + b) — non-linear valueToScalar breaks this",
  );
});

describe("proveOpening / verifyOpeningProof", () => {
  it("verifier accepts a fresh PoK proof", () => {
    const { commitment, opening } = pedersenCommit(99);
    const proof = proveOpening(commitment, opening, CTX);
    expect(verifyOpeningProof(commitment, proof, CTX)).toBe(true);
  });

  it("verifier rejects a proof with a mutated A point", () => {
    const { commitment, opening } = pedersenCommit(99);
    const proof = proveOpening(commitment, opening, CTX);
    // Swap A with a different valid commitment point.
    const decoy = pedersenCommit(7);
    const mutated = { ...proof, A: decoy.commitment.commitment };
    expect(verifyOpeningProof(commitment, mutated, CTX)).toBe(false);
  });

  it("verifier rejects a proof with a mutated z_r scalar", () => {
    const { commitment, opening } = pedersenCommit(99);
    const proof = proveOpening(commitment, opening, CTX);
    const mutated = { ...proof, z_r: scalarToHex(randomScalar()) };
    expect(verifyOpeningProof(commitment, mutated, CTX)).toBe(false);
  });

  it("verifier rejects a proof with a mutated z_v scalar", () => {
    const { commitment, opening } = pedersenCommit(99);
    const proof = proveOpening(commitment, opening, CTX);
    const mutated = { ...proof, z_v: scalarToHex(randomScalar()) };
    expect(verifyOpeningProof(commitment, mutated, CTX)).toBe(false);
  });

  it("verifier rejects a proof under a different context (Fiat-Shamir bound)", () => {
    const { commitment, opening } = pedersenCommit(99);
    const proof = proveOpening(commitment, opening, CTX);
    const wrongCtx = new TextEncoder().encode("other-context");
    expect(verifyOpeningProof(commitment, proof, wrongCtx)).toBe(false);
  });

  it("verifier rejects a proof against a different commitment", () => {
    const a = pedersenCommit(99);
    const b = pedersenCommit(100);
    const proofForA = proveOpening(a.commitment, a.opening, CTX);
    expect(verifyOpeningProof(b.commitment, proofForA, CTX)).toBe(false);
  });

  it("verifier rejects malformed proof bytes (catches gracefully, not throws)", () => {
    const { commitment } = pedersenCommit(99);
    const malformed = {
      A: "00".repeat(32), // not on curve / invalid encoding
      z_r: "ff".repeat(32),
      z_v: "ff".repeat(32),
      algorithm: "schnorr-pok-v1" as const,
    };
    expect(verifyOpeningProof(commitment, malformed, CTX)).toBe(false);
  });
});
