/**
 * Property-Based Tests — Ed25519 Signatures with Domain Separation
 *
 * Uses fast-check to verify sign/verify round-trip, mutation detection,
 * and domain binding properties.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateKeyPair, sign, verify } from "../../src/signatures/index.js";

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("Ed25519 Signatures — Property-Based Tests", () => {
  it("verify after sign: sign then verify always returns true", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 512 }),
        fc.string({ minLength: 1, maxLength: 64 }),
        (message, domain) => {
          const kp = generateKeyPair();
          const sig = sign(kp.privateKey, domain, message);
          const valid = verify(kp.publicKey, domain, message, sig.signature);
          expect(valid).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("mutation detection: flipping any byte in the message invalidates the signature", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 256 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        (message, domain) => {
          const kp = generateKeyPair();
          const sig = sign(kp.privateKey, domain, message);

          // Pick a random byte index to flip
          const idx = Math.floor(Math.random() * message.length);
          const mutated = new Uint8Array(message);
          mutated[idx] = mutated[idx]! ^ 0xff; // flip all bits in one byte

          const valid = verify(kp.publicKey, domain, mutated, sig.signature);
          expect(valid).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("domain binding: signature under domain1 does not verify under domain2", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 256 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        (message, domain1, domain2) => {
          fc.pre(domain1 !== domain2);

          const kp = generateKeyPair();
          const sig = sign(kp.privateKey, domain1, message);

          // Verify with a different domain must fail
          const valid = verify(kp.publicKey, domain2, message, sig.signature);
          expect(valid).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("wrong key: signature does not verify with a different public key", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 256 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        (message, domain) => {
          const kp1 = generateKeyPair();
          const kp2 = generateKeyPair();
          const sig = sign(kp1.privateKey, domain, message);

          const valid = verify(kp2.publicKey, domain, message, sig.signature);
          expect(valid).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("signature is deterministic: same key+domain+message produces same signature", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 256 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        (message, domain) => {
          const kp = generateKeyPair();
          const sig1 = sign(kp.privateKey, domain, message);
          const sig2 = sign(kp.privateKey, domain, message);
          expect(sig1.signature).toBe(sig2.signature);
        },
      ),
      { numRuns: 50 },
    );
  });
});
