import { describe, it, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { signContent, verifySignature } from "../../../crypto/signer.js";

function makeKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return { publicKey, privateKey };
}

describe("Ed25519 Signing", () => {
  it("produces a valid signature that verifies with the correct public key", () => {
    const keys = makeKeyPair();
    const contentHash = "sha256:abc123def456";
    const signature = signContent(contentHash, keys.privateKey);
    const valid = verifySignature(contentHash, signature, keys.publicKey);
    expect(valid).toBe(true);
  });

  it("signature format is ed25519:{base64}", () => {
    const keys = makeKeyPair();
    const signature = signContent("sha256:test", keys.privateKey);
    expect(signature).toMatch(/^ed25519:[A-Za-z0-9+/]+=*$/);
  });

  it("wrong public key does not verify", () => {
    const keysA = makeKeyPair();
    const keysB = makeKeyPair();
    const signature = signContent("sha256:abc", keysA.privateKey);
    const valid = verifySignature("sha256:abc", signature, keysB.publicKey);
    expect(valid).toBe(false);
  });

  it("tampered content does not verify", () => {
    const keys = makeKeyPair();
    const signature = signContent("sha256:abc", keys.privateKey);
    const valid = verifySignature("sha256:abd", signature, keys.publicKey);
    expect(valid).toBe(false);
  });

  it("can sign an empty string", () => {
    const keys = makeKeyPair();
    const signature = signContent("", keys.privateKey);
    expect(signature).toMatch(/^ed25519:/);
    const valid = verifySignature("", signature, keys.publicKey);
    expect(valid).toBe(true);
  });

  it("is deterministic (same key + same input = same signature)", () => {
    // Ed25519 is deterministic — no random nonce
    const keys = makeKeyPair();
    const input = "sha256:determinism_test";
    const sig1 = signContent(input, keys.privateKey);
    const sig2 = signContent(input, keys.privateKey);
    expect(sig1).toBe(sig2);
  });

  it("different inputs produce different signatures", () => {
    const keys = makeKeyPair();
    const sig1 = signContent("sha256:input_a", keys.privateKey);
    const sig2 = signContent("sha256:input_b", keys.privateKey);
    expect(sig1).not.toBe(sig2);
  });
});
