/**
 * Unit tests for the Ed25519 Signature module — Verity 2036
 */

import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  getPublicKey,
  sign,
  verify,
  verifyWithDomain,
  DOMAIN_TAGS,
  bytesToHex,
  hexToBytes,
} from "../../src/signatures/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MESSAGE = new TextEncoder().encode("hello world");

// ---------------------------------------------------------------------------
// generateKeyPair
// ---------------------------------------------------------------------------

describe("generateKeyPair", () => {
  it("produces 64-char hex private key", () => {
    const kp = generateKeyPair();
    expect(kp.privateKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces 64-char hex public key", () => {
    const kp = generateKeyPair();
    expect(kp.publicKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique key pairs each call", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    expect(kp1.privateKey).not.toBe(kp2.privateKey);
    expect(kp1.publicKey).not.toBe(kp2.publicKey);
  });

  it("private and public keys are different", () => {
    const kp = generateKeyPair();
    expect(kp.privateKey).not.toBe(kp.publicKey);
  });

  it("public key is deterministically derived from private key", () => {
    const kp = generateKeyPair();
    const derivedPub = getPublicKey(kp.privateKey);
    expect(derivedPub).toBe(kp.publicKey);
  });
});

// ---------------------------------------------------------------------------
// getPublicKey
// ---------------------------------------------------------------------------

describe("getPublicKey", () => {
  it("derives correct public key from private key", () => {
    const kp = generateKeyPair();
    const derived = getPublicKey(kp.privateKey);
    expect(derived).toBe(kp.publicKey);
  });

  it("returns 64-char hex public key", () => {
    const kp = generateKeyPair();
    const derived = getPublicKey(kp.privateKey);
    expect(derived).toMatch(/^[0-9a-f]{64}$/);
  });

  it("same private key always produces same public key", () => {
    const kp = generateKeyPair();
    const d1 = getPublicKey(kp.privateKey);
    const d2 = getPublicKey(kp.privateKey);
    expect(d1).toBe(d2);
  });

  it("different private keys produce different public keys", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const d1 = getPublicKey(kp1.privateKey);
    const d2 = getPublicKey(kp2.privateKey);
    expect(d1).not.toBe(d2);
  });

  it("throws for invalid-length private key", () => {
    expect(() => getPublicKey("abcd")).toThrow("32 bytes");
  });
});

// ---------------------------------------------------------------------------
// sign + verify round-trip
// ---------------------------------------------------------------------------

describe("sign + verify round-trip", () => {
  it("round-trip succeeds", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const valid = verify(
      kp.publicKey,
      DOMAIN_TAGS.ATTESTATION,
      MESSAGE,
      sig.signature,
    );
    expect(valid).toBe(true);
  });

  it("signature is 128-char hex (64 bytes)", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(sig.signature).toMatch(/^[0-9a-f]{128}$/);
  });

  it("signature includes the domain used", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.CERTIFICATE, MESSAGE);
    expect(sig.domain).toBe(DOMAIN_TAGS.CERTIFICATE);
  });

  it("works with all domain tags", () => {
    const kp = generateKeyPair();
    for (const tag of Object.values(DOMAIN_TAGS)) {
      const sig = sign(kp.privateKey, tag, MESSAGE);
      expect(verify(kp.publicKey, tag, MESSAGE, sig.signature)).toBe(true);
    }
  });

  it("works with empty message", () => {
    const kp = generateKeyPair();
    const empty = new Uint8Array(0);
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, empty);
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, empty, sig.signature),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// verify fails with wrong public key
// ---------------------------------------------------------------------------

describe("verify — wrong public key", () => {
  it("fails with wrong public key", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const sig = sign(kp1.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const valid = verify(
      kp2.publicKey,
      DOMAIN_TAGS.ATTESTATION,
      MESSAGE,
      sig.signature,
    );
    expect(valid).toBe(false);
  });

  it("fails with all-zero public key", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const zeroPub = "0".repeat(64);
    expect(
      verify(zeroPub, DOMAIN_TAGS.ATTESTATION, MESSAGE, sig.signature),
    ).toBe(false);
  });

  it("fails with truncated public key", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const truncated = kp.publicKey.slice(0, 32);
    expect(
      verify(truncated, DOMAIN_TAGS.ATTESTATION, MESSAGE, sig.signature),
    ).toBe(false);
  });

  it("returns false, does not throw", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const sig = sign(kp1.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(() =>
      verify(kp2.publicKey, DOMAIN_TAGS.ATTESTATION, MESSAGE, sig.signature),
    ).not.toThrow();
  });

  it("fails with empty public key string", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(verify("", DOMAIN_TAGS.ATTESTATION, MESSAGE, sig.signature)).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// verify fails with wrong domain
// ---------------------------------------------------------------------------

describe("verify — wrong domain", () => {
  it("fails with wrong domain", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const valid = verify(
      kp.publicKey,
      DOMAIN_TAGS.CERTIFICATE,
      MESSAGE,
      sig.signature,
    );
    expect(valid).toBe(false);
  });

  it("fails with modified domain string", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const valid = verify(kp.publicKey, "WRONG_DOMAIN", MESSAGE, sig.signature);
    expect(valid).toBe(false);
  });

  it("every domain tag produces a unique signature for the same message", () => {
    const kp = generateKeyPair();
    const signatures = new Set<string>();
    for (const tag of Object.values(DOMAIN_TAGS)) {
      const sig = sign(kp.privateKey, tag, MESSAGE);
      signatures.add(sig.signature);
    }
    expect(signatures.size).toBe(Object.values(DOMAIN_TAGS).length);
  });

  it("ATTESTATION signature does not verify under CERTIFICATE domain", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.CERTIFICATE, MESSAGE, sig.signature),
    ).toBe(false);
  });

  it("CERTIFICATE signature does not verify under ATTESTATION domain", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.CERTIFICATE, MESSAGE);
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, MESSAGE, sig.signature),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verify fails with modified message
// ---------------------------------------------------------------------------

describe("verify — modified message", () => {
  it("fails with modified message", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const modified = new TextEncoder().encode("modified message");
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, modified, sig.signature),
    ).toBe(false);
  });

  it("fails with one bit flipped", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const flipped = new Uint8Array(MESSAGE);
    flipped[0] = flipped[0]! ^ 0x01;
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, flipped, sig.signature),
    ).toBe(false);
  });

  it("fails with extra byte appended", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const extended = new Uint8Array(MESSAGE.length + 1);
    extended.set(MESSAGE);
    extended[MESSAGE.length] = 0x00;
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, extended, sig.signature),
    ).toBe(false);
  });

  it("fails with empty message when original was non-empty", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(
      verify(
        kp.publicKey,
        DOMAIN_TAGS.ATTESTATION,
        new Uint8Array(0),
        sig.signature,
      ),
    ).toBe(false);
  });

  it("fails with truncated message", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const truncated = MESSAGE.slice(0, MESSAGE.length - 1);
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, truncated, sig.signature),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verify fails with truncated signature
// ---------------------------------------------------------------------------

describe("verify — truncated signature", () => {
  it("fails with truncated signature", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const truncated = sig.signature.slice(0, 64); // 32 bytes instead of 64
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, MESSAGE, truncated),
    ).toBe(false);
  });

  it("fails with empty signature", () => {
    const kp = generateKeyPair();
    expect(verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, MESSAGE, "")).toBe(
      false,
    );
  });

  it("fails with invalid hex signature", () => {
    const kp = generateKeyPair();
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, MESSAGE, "gg".repeat(64)),
    ).toBe(false);
  });

  it("returns false, does not throw", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const truncated = sig.signature.slice(0, 32);
    expect(() =>
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, MESSAGE, truncated),
    ).not.toThrow();
  });

  it("fails with all-zero signature", () => {
    const kp = generateKeyPair();
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, MESSAGE, "0".repeat(128)),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verify with empty domain
// ---------------------------------------------------------------------------

describe("verify — empty domain", () => {
  it("returns false with empty domain, does not throw", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(verify(kp.publicKey, "", MESSAGE, sig.signature)).toBe(false);
  });

  it("returns false, no exception", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(() =>
      verify(kp.publicKey, "", MESSAGE, sig.signature),
    ).not.toThrow();
  });

  it("returns false consistently for empty domain", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const r1 = verify(kp.publicKey, "", MESSAGE, sig.signature);
    const r2 = verify(kp.publicKey, "", MESSAGE, sig.signature);
    expect(r1).toBe(false);
    expect(r2).toBe(false);
  });

  it("sign with empty domain throws", () => {
    const kp = generateKeyPair();
    expect(() => sign(kp.privateKey, "", MESSAGE)).toThrow("non-empty");
  });

  it("sign with empty domain throws Error type", () => {
    const kp = generateKeyPair();
    expect(() => sign(kp.privateKey, "", MESSAGE)).toThrow(Error);
  });
});

// ---------------------------------------------------------------------------
// Domain separation
// ---------------------------------------------------------------------------

describe("sign — domain separation", () => {
  it("ATTESTATION signature does not verify under CERTIFICATE domain", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.CERTIFICATE, MESSAGE, sig.signature),
    ).toBe(false);
  });

  it("KEY_ROTATION signature does not verify under KEY_REVOCATION domain", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.KEY_ROTATION, MESSAGE);
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.KEY_REVOCATION, MESSAGE, sig.signature),
    ).toBe(false);
  });

  it("TRANSPARENCY_ENTRY signature does not verify under ATTESTATION domain", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.TRANSPARENCY_ENTRY, MESSAGE);
    expect(
      verify(kp.publicKey, DOMAIN_TAGS.ATTESTATION, MESSAGE, sig.signature),
    ).toBe(false);
  });

  it("each domain produces a distinct signature for identical key+message", () => {
    const kp = generateKeyPair();
    const sigs = Object.values(DOMAIN_TAGS).map(
      (tag) => sign(kp.privateKey, tag, MESSAGE).signature,
    );
    const unique = new Set(sigs);
    expect(unique.size).toBe(sigs.length);
  });

  it("sign with empty domain throws", () => {
    const kp = generateKeyPair();
    expect(() => sign(kp.privateKey, "", MESSAGE)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Ed25519 determinism
// ---------------------------------------------------------------------------

describe("sign — determinism", () => {
  it("two signatures of same message with same key are identical", () => {
    const kp = generateKeyPair();
    const sig1 = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const sig2 = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(sig1.signature).toBe(sig2.signature);
  });

  it("deterministic across different message sizes", () => {
    const kp = generateKeyPair();
    const msg = new TextEncoder().encode("test message");
    const s1 = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, msg);
    const s2 = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, msg);
    expect(s1.signature).toBe(s2.signature);
  });

  it("deterministic with empty message", () => {
    const kp = generateKeyPair();
    const empty = new Uint8Array(0);
    const s1 = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, empty);
    const s2 = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, empty);
    expect(s1.signature).toBe(s2.signature);
  });

  it("different keys produce different signatures for same message", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const s1 = sign(kp1.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const s2 = sign(kp2.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(s1.signature).not.toBe(s2.signature);
  });

  it("different messages produce different signatures for same key", () => {
    const kp = generateKeyPair();
    const msg1 = new TextEncoder().encode("message 1");
    const msg2 = new TextEncoder().encode("message 2");
    const s1 = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, msg1);
    const s2 = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, msg2);
    expect(s1.signature).not.toBe(s2.signature);
  });
});

// ---------------------------------------------------------------------------
// verifyWithDomain
// ---------------------------------------------------------------------------

describe("verifyWithDomain", () => {
  it("returns true when domain tag matches", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(
      verifyWithDomain(kp.publicKey, DOMAIN_TAGS.ATTESTATION, MESSAGE, sig),
    ).toBe(true);
  });

  it("returns false when domain tag does not match", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    expect(
      verifyWithDomain(kp.publicKey, DOMAIN_TAGS.CERTIFICATE, MESSAGE, sig),
    ).toBe(false);
  });

  it("returns false for tampered signature field", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    const tampered = { ...sig, signature: "0".repeat(128) };
    expect(
      verifyWithDomain(
        kp.publicKey,
        DOMAIN_TAGS.ATTESTATION,
        MESSAGE,
        tampered,
      ),
    ).toBe(false);
  });

  it("checks domain tag matches before verifying signature", () => {
    const kp = generateKeyPair();
    const sig = sign(kp.privateKey, DOMAIN_TAGS.ATTESTATION, MESSAGE);
    // Even if signature is valid for ATTESTATION, verifyWithDomain should
    // return false when we ask for CERTIFICATE because sig.domain = ATTESTATION
    expect(
      verifyWithDomain(kp.publicKey, DOMAIN_TAGS.CERTIFICATE, MESSAGE, sig),
    ).toBe(false);
  });

  it("works with all domain tags", () => {
    const kp = generateKeyPair();
    for (const tag of Object.values(DOMAIN_TAGS)) {
      const sig = sign(kp.privateKey, tag, MESSAGE);
      expect(verifyWithDomain(kp.publicKey, tag, MESSAGE, sig)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// bytesToHex and hexToBytes round-trip
// ---------------------------------------------------------------------------

describe("bytesToHex / hexToBytes round-trip", () => {
  it("round-trips arbitrary bytes", () => {
    const original = new Uint8Array([0, 1, 127, 128, 255]);
    const hex = bytesToHex(original);
    const decoded = hexToBytes(hex);
    expect(decoded).toEqual(original);
  });

  it("round-trips empty array", () => {
    const original = new Uint8Array([]);
    const hex = bytesToHex(original);
    expect(hex).toBe("");
    const decoded = hexToBytes(hex);
    expect(decoded).toEqual(original);
  });

  it("round-trips 32 random bytes", () => {
    const original = new Uint8Array(32);
    crypto.getRandomValues(original);
    const hex = bytesToHex(original);
    const decoded = hexToBytes(hex);
    expect(decoded).toEqual(original);
  });

  it("produces lowercase hex", () => {
    const bytes = new Uint8Array([0xab, 0xcd, 0xef]);
    const hex = bytesToHex(bytes);
    expect(hex).toBe("abcdef");
  });

  it("pads single-digit hex with leading zero", () => {
    const bytes = new Uint8Array([0x0a]);
    expect(bytesToHex(bytes)).toBe("0a");
  });
});

// ---------------------------------------------------------------------------
// hexToBytes — invalid hex throws
// ---------------------------------------------------------------------------

describe("hexToBytes — invalid input", () => {
  it("throws for odd-length hex string", () => {
    expect(() => hexToBytes("abc")).toThrow("even length");
  });

  it("throws for non-hex characters", () => {
    expect(() => hexToBytes("gg")).toThrow();
  });

  it("throws for uppercase G", () => {
    expect(() => hexToBytes("GG")).toThrow();
  });

  it("throws for hex with spaces", () => {
    expect(() => hexToBytes("ab cd")).toThrow();
  });

  it("accepts valid lowercase hex", () => {
    expect(() => hexToBytes("abcdef")).not.toThrow();
  });
});
