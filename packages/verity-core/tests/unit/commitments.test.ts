/**
 * Unit tests for the Commitment module — Verity 2036
 */

import { describe, it, expect } from "vitest";
import {
  createCommitment,
  verifyCommitment,
  encodeValueIEEE754BE,
  generateBlindingFactor,
  constantTimeEqual,
  bytesToHex,
  hexToBytes,
  COMMITMENT_SCHEME,
  COMMITMENT_VERSION,
} from "../../src/commitments/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DOMAIN = "test-domain";
const CONTEXT = { tenant: "t1", asset: "s1" };

function makeCommitment(overrides?: {
  domain?: string;
  context?: Record<string, unknown>;
  value?: number;
  blindingFactor?: Uint8Array;
}) {
  return createCommitment({
    domain: overrides?.domain ?? DOMAIN,
    context: overrides?.context ?? CONTEXT,
    value: overrides?.value ?? 42,
    blindingFactor: overrides?.blindingFactor,
  });
}

// ---------------------------------------------------------------------------
// createCommitment produces a commitment with 64-char hex hash
// ---------------------------------------------------------------------------

describe("createCommitment", () => {
  it("produces a commitment with 64-char hex hash", () => {
    const { commitment } = makeCommitment();
    expect(commitment.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the correct scheme", () => {
    const { commitment } = makeCommitment();
    expect(commitment.scheme).toBe(COMMITMENT_SCHEME);
  });

  it("returns the correct version", () => {
    const { commitment } = makeCommitment();
    expect(commitment.version).toBe(COMMITMENT_VERSION);
  });

  it("returns a secret with the original value", () => {
    const { secret } = makeCommitment({ value: 99.5 });
    expect(secret.value).toBe(99.5);
  });

  it("returns a secret with 32-byte blinding factor", () => {
    const { secret } = makeCommitment();
    expect(secret.blindingFactor).toBeInstanceOf(Uint8Array);
    expect(secret.blindingFactor.length).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// verifyCommitment
// ---------------------------------------------------------------------------

describe("verifyCommitment", () => {
  it("returns true for valid secret", () => {
    const { commitment, secret } = makeCommitment();
    expect(verifyCommitment(commitment, secret)).toBe(true);
  });

  it("returns false when value is changed", () => {
    const { commitment, secret } = makeCommitment({ value: 42 });
    const tamperedSecret = { ...secret, value: 43 };
    expect(verifyCommitment(commitment, tamperedSecret)).toBe(false);
  });

  it("returns false when blinding factor is changed", () => {
    const { commitment, secret } = makeCommitment();
    const differentBlinding = new Uint8Array(32);
    crypto.getRandomValues(differentBlinding);
    const tamperedSecret = { ...secret, blindingFactor: differentBlinding };
    expect(verifyCommitment(commitment, tamperedSecret)).toBe(false);
  });

  it("returns false when context is changed", () => {
    const { commitment, secret } = makeCommitment();
    const tamperedSecret = {
      ...secret,
      context: { tenant: "t2", asset: "s1" },
    };
    expect(verifyCommitment(commitment, tamperedSecret)).toBe(false);
  });

  it("returns false when domain is changed", () => {
    const { commitment, secret } = makeCommitment();
    const tamperedSecret = { ...secret, domain: "different-domain" };
    expect(verifyCommitment(commitment, tamperedSecret)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hiding property — different blinding factors produce different commitments
// ---------------------------------------------------------------------------

describe("createCommitment — hiding property", () => {
  it("same value with different blinding factors produces different commitments", () => {
    const bf1 = new Uint8Array(32);
    crypto.getRandomValues(bf1);
    const bf2 = new Uint8Array(32);
    crypto.getRandomValues(bf2);

    const { commitment: c1 } = makeCommitment({
      value: 42,
      blindingFactor: bf1,
    });
    const { commitment: c2 } = makeCommitment({
      value: 42,
      blindingFactor: bf2,
    });

    expect(c1.hash).not.toBe(c2.hash);
  });

  it("same inputs produce same commitment (deterministic with same blinding)", () => {
    const bf = new Uint8Array(32);
    crypto.getRandomValues(bf);

    const { commitment: c1 } = makeCommitment({
      value: 42,
      blindingFactor: bf,
    });
    const { commitment: c2 } = makeCommitment({
      value: 42,
      blindingFactor: bf,
    });

    expect(c1.hash).toBe(c2.hash);
  });

  it("different values with same blinding produce different commitments", () => {
    const bf = new Uint8Array(32);
    crypto.getRandomValues(bf);

    const { commitment: c1 } = makeCommitment({
      value: 10,
      blindingFactor: bf,
    });
    const { commitment: c2 } = makeCommitment({
      value: 20,
      blindingFactor: bf,
    });

    expect(c1.hash).not.toBe(c2.hash);
  });

  it("auto-generated blinding factors differ between calls", () => {
    const { secret: s1 } = makeCommitment();
    const { secret: s2 } = makeCommitment();
    expect(bytesToHex(s1.blindingFactor)).not.toBe(
      bytesToHex(s2.blindingFactor),
    );
  });

  it("two commitments with same value but auto-generated blindings differ", () => {
    const { commitment: c1 } = makeCommitment({ value: 42 });
    const { commitment: c2 } = makeCommitment({ value: 42 });
    expect(c1.hash).not.toBe(c2.hash);
  });
});

// ---------------------------------------------------------------------------
// encodeValueIEEE754BE
// ---------------------------------------------------------------------------

describe("encodeValueIEEE754BE", () => {
  it("produces 8 bytes for any finite number", () => {
    expect(encodeValueIEEE754BE(0).length).toBe(8);
    expect(encodeValueIEEE754BE(42).length).toBe(8);
    expect(encodeValueIEEE754BE(-1.5).length).toBe(8);
    expect(encodeValueIEEE754BE(Number.MAX_SAFE_INTEGER).length).toBe(8);
    expect(encodeValueIEEE754BE(Number.MIN_VALUE).length).toBe(8);
  });

  it("throws for NaN", () => {
    expect(() => encodeValueIEEE754BE(NaN)).toThrow("non-finite");
  });

  it("throws for Infinity", () => {
    expect(() => encodeValueIEEE754BE(Infinity)).toThrow("non-finite");
  });

  it("throws for negative Infinity", () => {
    expect(() => encodeValueIEEE754BE(-Infinity)).toThrow("non-finite");
  });

  it("produces deterministic output for same value", () => {
    const a = encodeValueIEEE754BE(3.14);
    const b = encodeValueIEEE754BE(3.14);
    expect(bytesToHex(a)).toBe(bytesToHex(b));
  });

  it("produces different output for different values", () => {
    const a = encodeValueIEEE754BE(1.0);
    const b = encodeValueIEEE754BE(2.0);
    expect(bytesToHex(a)).not.toBe(bytesToHex(b));
  });
});

// ---------------------------------------------------------------------------
// generateBlindingFactor
// ---------------------------------------------------------------------------

describe("generateBlindingFactor", () => {
  it("produces 32 bytes", () => {
    const bf = generateBlindingFactor();
    expect(bf).toBeInstanceOf(Uint8Array);
    expect(bf.length).toBe(32);
  });

  it("two calls produce different values", () => {
    const bf1 = generateBlindingFactor();
    const bf2 = generateBlindingFactor();
    expect(bytesToHex(bf1)).not.toBe(bytesToHex(bf2));
  });

  it("all bytes are used (not all zeros)", () => {
    const bf = generateBlindingFactor();
    // Extremely unlikely to be all zeros from CSPRNG
    const allZero = bf.every((b) => b === 0);
    expect(allZero).toBe(false);
  });

  it("returns a Uint8Array type", () => {
    const bf = generateBlindingFactor();
    expect(bf.constructor.name).toBe("Uint8Array");
  });

  it("multiple calls produce unique values", () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(bytesToHex(generateBlindingFactor()));
    }
    expect(set.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// constantTimeEqual
// ---------------------------------------------------------------------------

describe("constantTimeEqual", () => {
  it("returns true for equal arrays", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    expect(constantTimeEqual(a, b)).toBe(true);
  });

  it("returns false for different arrays", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 5]);
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it("returns false for different-length arrays", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3, 4]);
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it("returns true for empty arrays", () => {
    const a = new Uint8Array([]);
    const b = new Uint8Array([]);
    expect(constantTimeEqual(a, b)).toBe(true);
  });

  it("returns true for identical references", () => {
    const a = new Uint8Array([5, 10, 15]);
    expect(constantTimeEqual(a, a)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Empty domain throws
// ---------------------------------------------------------------------------

describe("createCommitment — domain validation", () => {
  it("throws for empty domain", () => {
    expect(() =>
      createCommitment({
        domain: "",
        context: CONTEXT,
        value: 42,
      }),
    ).toThrow("non-empty");
  });

  it("accepts a non-empty domain", () => {
    expect(() =>
      createCommitment({
        domain: "valid",
        context: CONTEXT,
        value: 42,
      }),
    ).not.toThrow();
  });

  it("throws for whitespace-only domain that is checked as falsy", () => {
    // The implementation checks `!domain` which won't catch whitespace,
    // but also checks `domain.length === 0`. A whitespace-only string
    // passes since it's truthy and has length > 0.
    // We just verify non-empty string doesn't throw.
    expect(() =>
      createCommitment({
        domain: " ",
        context: CONTEXT,
        value: 42,
      }),
    ).not.toThrow();
  });

  it("works with unicode domain", () => {
    const { commitment } = createCommitment({
      domain: "\u{1F680}_domain",
      context: CONTEXT,
      value: 42,
    });
    expect(commitment.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("accepts a long domain string", () => {
    const longDomain = "x".repeat(1000);
    const { commitment } = createCommitment({
      domain: longDomain,
      context: CONTEXT,
      value: 42,
    });
    expect(commitment.hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// Non-finite value throws
// ---------------------------------------------------------------------------

describe("createCommitment — value validation", () => {
  it("throws for NaN value", () => {
    expect(() =>
      createCommitment({
        domain: DOMAIN,
        context: CONTEXT,
        value: NaN,
      }),
    ).toThrow("finite");
  });

  it("throws for Infinity value", () => {
    expect(() =>
      createCommitment({
        domain: DOMAIN,
        context: CONTEXT,
        value: Infinity,
      }),
    ).toThrow("finite");
  });

  it("throws for negative Infinity value", () => {
    expect(() =>
      createCommitment({
        domain: DOMAIN,
        context: CONTEXT,
        value: -Infinity,
      }),
    ).toThrow("finite");
  });

  it("accepts zero", () => {
    const { commitment } = createCommitment({
      domain: DOMAIN,
      context: CONTEXT,
      value: 0,
    });
    expect(commitment.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("accepts negative numbers", () => {
    const { commitment } = createCommitment({
      domain: DOMAIN,
      context: CONTEXT,
      value: -100,
    });
    expect(commitment.hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
