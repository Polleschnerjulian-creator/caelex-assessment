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
  commitScaled,
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
    const tampered = { value: "101", blinding: opening.blinding };
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
      pedersenOpen(commitment, { value: "1", blinding: opening.blinding }),
    ).toBe(false);
  });

  // T2-CRYPTO-1 (audit fix 2026-05-05): the bare integer API now
  // rejects fractional inputs. Callers with measurements like fuel %
  // or miss-distance km MUST use commitScaled so the homomorphism
  // holds. The previous SHA-512 fallback was non-linear and broke
  // pedersenAdd silently.
  it("rejects fractional value (use commitScaled instead)", () => {
    expect(() => pedersenCommit(3.14)).toThrow(/must be an integer/);
  });

  it("rejects non-finite value", () => {
    expect(() => pedersenCommit(Number.NaN)).toThrow(/must be finite/);
    expect(() => pedersenCommit(Number.POSITIVE_INFINITY)).toThrow(
      /must be finite/,
    );
  });

  it("commits to a large bigint value (beyond 2^53)", () => {
    const big = 9_007_199_254_740_993n; // 2^53 + 1, unrepresentable as JS number
    const { commitment, opening } = pedersenCommit(big);
    expect(pedersenOpen(commitment, opening)).toBe(true);
    expect(opening.value).toBe(big.toString());
  });
});

describe("commitScaled — fractional measurement helper (T2-CRYPTO-1)", () => {
  it("commits to a fuel-% style fractional value via scale=1000", () => {
    // 95.5% fuel: scale=1000 → integer 95500 in the commitment.
    const { commitment, opening } = commitScaled(95.5, 1000);
    expect(pedersenOpen(commitment, opening)).toBe(true);
    expect(opening.value).toBe("95500");
  });

  it("rejects non-integer scale", () => {
    expect(() => commitScaled(95, 1.5)).toThrow(/positive integer/);
  });

  it("rejects negative value", () => {
    expect(() => commitScaled(-5, 1000)).toThrow(/non-negative/);
  });

  it("rejects non-finite value", () => {
    expect(() => commitScaled(Number.NaN, 1000)).toThrow(/finite/);
  });
});

describe("pedersenAdd — additive homomorphism (T2-CRYPTO-1 fixed)", () => {
  it("returns a valid Ristretto point (point-addition works)", () => {
    const a = pedersenCommit(10);
    const b = pedersenCommit(15);
    const sum = pedersenAdd(a.commitment, b.commitment);
    expect(sum.commitment).toMatch(/^[0-9a-f]{64}$/);
    expect(sum.algorithm).toBe("pedersen-ristretto255");
  });

  // T2-CRYPTO-1 fix: the linear valueToScalar restores the documented
  // homomorphism. C(a) + C(b) now opens to (a + b) under the SUM of
  // the two blinding factors — confirming the math holds end-to-end.
  it("[T2-CRYPTO-1 fixed] C(a) + C(b) opens to (a + b) with summed blindings", () => {
    const a = pedersenCommit(10);
    const b = pedersenCommit(15);
    const sum = pedersenAdd(a.commitment, b.commitment);

    // Sum the openings: value adds in the integers, blinding adds
    // mod CURVE_ORDER.
    const a_blind = BigInt("0x" + a.opening.blinding);
    const b_blind = BigInt("0x" + b.opening.blinding);
    const sum_blind_hex = ((a_blind + b_blind) % CURVE_ORDER)
      .toString(16)
      .padStart(64, "0");
    const sum_value = (
      BigInt(a.opening.value) + BigInt(b.opening.value)
    ).toString();

    expect(
      pedersenOpen(sum, { value: sum_value, blinding: sum_blind_hex }),
    ).toBe(true);
    expect(sum_value).toBe("25");
  });

  it("[T2-CRYPTO-1 fixed] homomorphism is associative: (a+b)+c == a+(b+c)", () => {
    const a = pedersenCommit(7);
    const b = pedersenCommit(11);
    const c = pedersenCommit(13);

    const ab = pedersenAdd(a.commitment, b.commitment);
    const ab_then_c = pedersenAdd(ab, c.commitment);

    const bc = pedersenAdd(b.commitment, c.commitment);
    const a_then_bc = pedersenAdd(a.commitment, bc);

    expect(ab_then_c.commitment).toBe(a_then_bc.commitment);
  });

  it("[T2-CRYPTO-1 fixed] commitScaled values are also additive", () => {
    // Scaled commitments add correctly because the scaling is linear.
    const a = commitScaled(2.5, 1000); // → 2500
    const b = commitScaled(3.5, 1000); // → 3500
    const sum = pedersenAdd(a.commitment, b.commitment);

    // Open with (2500 + 3500) = 6000 and summed blindings.
    const a_blind = BigInt("0x" + a.opening.blinding);
    const b_blind = BigInt("0x" + b.opening.blinding);
    const sum_blind_hex = ((a_blind + b_blind) % CURVE_ORDER)
      .toString(16)
      .padStart(64, "0");
    expect(pedersenOpen(sum, { value: "6000", blinding: sum_blind_hex })).toBe(
      true,
    );
  });
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
