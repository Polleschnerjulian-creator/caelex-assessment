/**
 * Property-Based Tests — Commitment Scheme
 *
 * Uses fast-check to verify the binding, hiding, round-trip, and
 * domain-separation properties of the SHA-256 blinded commitment scheme.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  createCommitment,
  verifyCommitment,
} from "../../src/commitments/index.js";

// ---------------------------------------------------------------------------
// Shared arbitraries
// ---------------------------------------------------------------------------

const finiteValue = fc.double({
  min: -1e15,
  max: 1e15,
  noNaN: true,
  noDefaultInfinity: true,
});

const blindingFactor = fc.uint8Array({ minLength: 32, maxLength: 32 });

const contextArb = fc.dictionary(
  fc
    .string()
    .filter(
      (s) =>
        s !== "__proto__" &&
        s !== "constructor" &&
        s !== "prototype" &&
        s.length > 0,
    ),
  fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  { minKeys: 0, maxKeys: 4 },
);

const domainArb = fc.string({ minLength: 1, maxLength: 64 });

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("Commitment Scheme — Property-Based Tests", () => {
  it("binding: changing the value produces a different commitment (same blinding factor)", () => {
    fc.assert(
      fc.property(
        finiteValue,
        finiteValue,
        blindingFactor,
        domainArb,
        contextArb,
        (v1, v2, bf, domain, context) => {
          // Skip if values are identical (trivially equal)
          fc.pre(v1 !== v2);
          // Skip if both encode to the same IEEE 754 bytes (e.g. +0 and -0)
          fc.pre(
            !Object.is(v1, v2) || JSON.stringify(v1) !== JSON.stringify(v2),
          );

          const c1 = createCommitment({
            domain,
            context,
            value: v1,
            blindingFactor: bf,
          });

          const c2 = createCommitment({
            domain,
            context,
            value: v2,
            blindingFactor: bf,
          });

          expect(c1.commitment.hash).not.toBe(c2.commitment.hash);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("hiding: different blinding factors produce different commitments (same value)", () => {
    fc.assert(
      fc.property(
        finiteValue,
        blindingFactor,
        blindingFactor,
        domainArb,
        contextArb,
        (value, bf1, bf2, domain, context) => {
          // Skip if blinding factors happen to be identical
          fc.pre(!bf1.every((byte, i) => byte === bf2[i]));

          const c1 = createCommitment({
            domain,
            context,
            value,
            blindingFactor: bf1,
          });

          const c2 = createCommitment({
            domain,
            context,
            value,
            blindingFactor: bf2,
          });

          expect(c1.commitment.hash).not.toBe(c2.commitment.hash);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("verification round-trip: commitment verifies with its own secret", () => {
    fc.assert(
      fc.property(
        finiteValue,
        domainArb,
        contextArb,
        (value, domain, context) => {
          const result = createCommitment({ domain, context, value });
          const valid = verifyCommitment(result.commitment, result.secret);
          expect(valid).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("domain separation: same value+context with different domains produce different commitments", () => {
    fc.assert(
      fc.property(
        finiteValue,
        domainArb,
        domainArb,
        blindingFactor,
        contextArb,
        (value, domain1, domain2, bf, context) => {
          fc.pre(domain1 !== domain2);

          const c1 = createCommitment({
            domain: domain1,
            context,
            value,
            blindingFactor: bf,
          });

          const c2 = createCommitment({
            domain: domain2,
            context,
            value,
            blindingFactor: bf,
          });

          expect(c1.commitment.hash).not.toBe(c2.commitment.hash);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("verification fails with wrong value", () => {
    fc.assert(
      fc.property(
        finiteValue,
        finiteValue,
        domainArb,
        contextArb,
        (v1, v2, domain, context) => {
          fc.pre(v1 !== v2);

          const result = createCommitment({ domain, context, value: v1 });
          const tampered = {
            ...result.secret,
            value: v2,
          };
          const valid = verifyCommitment(result.commitment, tampered);
          expect(valid).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("verification fails with wrong blinding factor", () => {
    fc.assert(
      fc.property(
        finiteValue,
        blindingFactor,
        blindingFactor,
        domainArb,
        contextArb,
        (value, bf1, bf2, domain, context) => {
          fc.pre(!bf1.every((byte, i) => byte === bf2[i]));

          const result = createCommitment({
            domain,
            context,
            value,
            blindingFactor: bf1,
          });
          const tampered = {
            ...result.secret,
            blindingFactor: bf2,
          };
          const valid = verifyCommitment(result.commitment, tampered);
          expect(valid).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
