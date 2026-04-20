// tests/unit/lib/verity/bls-aggregator.test.ts

import { describe, it, expect } from "vitest";
import {
  generateBLSKeyPair,
  signBLS,
  verifyBLS,
  aggregateSignatures,
  aggregatePublicKeys,
  verifyAggregate,
} from "@/lib/verity/core/bls-aggregator";

describe("BLS — keypair + single sign/verify", () => {
  it("generates a well-formed keypair", () => {
    const { secretKeyHex, publicKeyHex, algorithm } = generateBLSKeyPair();
    expect(secretKeyHex.length).toBe(64); // 32 bytes
    expect(publicKeyHex.length).toBe(96); // 48 bytes (G1 compressed)
    expect(algorithm).toBe("bls12-381-g2");
  });

  it("sign + verify round-trips", () => {
    const kp = generateBLSKeyPair();
    const msg = "attestation-digest-abc";
    const sig = signBLS(msg, kp.secretKeyHex);
    expect(verifyBLS(sig, msg, kp.publicKeyHex)).toBe(true);
  });

  it("verify rejects a different message under the same key", () => {
    const kp = generateBLSKeyPair();
    const sig = signBLS("hello", kp.secretKeyHex);
    expect(verifyBLS(sig, "goodbye", kp.publicKeyHex)).toBe(false);
  });

  it("verify rejects a signature from a different keypair", () => {
    const kp1 = generateBLSKeyPair();
    const kp2 = generateBLSKeyPair();
    const sig = signBLS("same-message", kp1.secretKeyHex);
    expect(verifyBLS(sig, "same-message", kp2.publicKeyHex)).toBe(false);
  });

  it("signatures produce hex strings of the expected length", () => {
    const kp = generateBLSKeyPair();
    const sig = signBLS("hi", kp.secretKeyHex);
    // G2 compressed = 96 bytes = 192 hex chars
    expect(sig.length).toBe(192);
  });
});

describe("BLS — aggregate verification (distinct messages)", () => {
  it("aggregates N signatures and verifies against N (msg, pk) pairs", () => {
    const N = 5;
    const keypairs = Array.from({ length: N }, () => generateBLSKeyPair());
    const messages = Array.from({ length: N }, (_, i) => `attestation-${i}`);
    const sigs = messages.map((m, i) => signBLS(m, keypairs[i]!.secretKeyHex));

    const aggregate = aggregateSignatures(sigs);
    const publicKeys = keypairs.map((k) => k.publicKeyHex);
    expect(verifyAggregate(aggregate, messages, publicKeys)).toBe(true);
  });

  it("aggregate over 20 attestations still verifies", () => {
    const N = 20;
    const keypairs = Array.from({ length: N }, () => generateBLSKeyPair());
    const messages = Array.from({ length: N }, (_, i) => `att-${i}`);
    const sigs = messages.map((m, i) => signBLS(m, keypairs[i]!.secretKeyHex));

    const aggregate = aggregateSignatures(sigs);
    const publicKeys = keypairs.map((k) => k.publicKeyHex);
    expect(verifyAggregate(aggregate, messages, publicKeys)).toBe(true);
  });

  it("aggregate rejects when one message is mutated", () => {
    const N = 3;
    const keypairs = Array.from({ length: N }, () => generateBLSKeyPair());
    const messages = ["a", "b", "c"];
    const sigs = messages.map((m, i) => signBLS(m, keypairs[i]!.secretKeyHex));
    const aggregate = aggregateSignatures(sigs);

    const tamperedMessages = ["a", "b", "c_mutated"];
    expect(
      verifyAggregate(
        aggregate,
        tamperedMessages,
        keypairs.map((k) => k.publicKeyHex),
      ),
    ).toBe(false);
  });

  it("aggregate rejects when one pubkey is swapped to a different party", () => {
    const N = 3;
    const keypairs = Array.from({ length: N }, () => generateBLSKeyPair());
    const intruder = generateBLSKeyPair();
    const messages = ["a", "b", "c"];
    const sigs = messages.map((m, i) => signBLS(m, keypairs[i]!.secretKeyHex));
    const aggregate = aggregateSignatures(sigs);

    const wrongKeys = [
      keypairs[0]!.publicKeyHex,
      intruder.publicKeyHex,
      keypairs[2]!.publicKeyHex,
    ];
    expect(verifyAggregate(aggregate, messages, wrongKeys)).toBe(false);
  });

  it("aggregate rejects when length mismatch between messages and pubkeys", () => {
    const kp = generateBLSKeyPair();
    const sig = signBLS("only-one", kp.secretKeyHex);
    expect(verifyAggregate(sig, ["only-one"], [])).toBe(false);
  });

  it("empty aggregation input throws (caller must handle)", () => {
    expect(() => aggregateSignatures([])).toThrow();
    expect(() => aggregatePublicKeys([])).toThrow();
  });
});

describe("BLS — aggregatePublicKeys (same-message case)", () => {
  it("N parties signing the same bytes produce 1 aggregate pubkey that verifies 1 aggregate sig", () => {
    const N = 4;
    const keypairs = Array.from({ length: N }, () => generateBLSKeyPair());
    const msg = "certificate-root-hash";
    const sigs = keypairs.map((k) => signBLS(msg, k.secretKeyHex));

    const aggregateSig = aggregateSignatures(sigs);
    const aggregatePk = aggregatePublicKeys(
      keypairs.map((k) => k.publicKeyHex),
    );

    // Verify via verifyBLS against the aggregate pubkey
    expect(verifyBLS(aggregateSig, msg, aggregatePk)).toBe(true);
  });

  it("same-message aggregate rejects a modified message", () => {
    const N = 3;
    const keypairs = Array.from({ length: N }, () => generateBLSKeyPair());
    const sigs = keypairs.map((k) => signBLS("original", k.secretKeyHex));
    const aggregateSig = aggregateSignatures(sigs);
    const aggregatePk = aggregatePublicKeys(
      keypairs.map((k) => k.publicKeyHex),
    );
    expect(verifyBLS(aggregateSig, "modified", aggregatePk)).toBe(false);
  });
});
