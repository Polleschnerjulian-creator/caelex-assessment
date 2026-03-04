/**
 * Unit tests for the Proofs module — Verity 2036
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ThresholdCommitmentProofProvider,
  registerProvider,
  getProvider,
  verifyProofByScheme,
  clearProviders,
} from "../../src/proofs/index.js";
import { generateKeyPair } from "../../src/signatures/index.js";
import type {
  ProofParams,
  ProofResult,
  VerifyContext,
} from "../../src/proofs/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKeyPair() {
  return generateKeyPair();
}

function makeProofParams(overrides?: Partial<ProofParams>): ProofParams {
  const kp = makeKeyPair();
  return {
    predicateType: "ABOVE",
    actualValue: 85,
    thresholdRef: "policy/fuel-margin/v3",
    thresholdValue: 50,
    domain: "test-proof-domain",
    context: { tenant: "t1", asset: "sat-001" },
    attesterPrivateKey: kp.privateKey,
    attesterPublicKey: kp.publicKey,
    attesterId: "attester-001",
    ...overrides,
  };
}

function makeVerifyContext(
  trustedKeys: string[],
  overrides?: Partial<VerifyContext>,
): VerifyContext {
  return {
    domain: "test-proof-domain",
    context: { tenant: "t1", asset: "sat-001" },
    trustedAttesterKeys: new Set(trustedKeys),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ThresholdCommitmentProofProvider — scheme and version
// ---------------------------------------------------------------------------

describe("ThresholdCommitmentProofProvider — metadata", () => {
  it("has scheme 'threshold-commitment-v1'", () => {
    const provider = new ThresholdCommitmentProofProvider();
    expect(provider.scheme).toBe("threshold-commitment-v1");
  });

  it("has version 1", () => {
    const provider = new ThresholdCommitmentProofProvider();
    expect(provider.version).toBe(1);
  });

  it("scheme is read-only string", () => {
    const provider = new ThresholdCommitmentProofProvider();
    expect(typeof provider.scheme).toBe("string");
  });

  it("version is read-only number", () => {
    const provider = new ThresholdCommitmentProofProvider();
    expect(typeof provider.version).toBe("number");
  });

  it("implements ProofProvider interface (has createProof and verifyProof)", () => {
    const provider = new ThresholdCommitmentProofProvider();
    expect(typeof provider.createProof).toBe("function");
    expect(typeof provider.verifyProof).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// createProof — ABOVE predicate
// ---------------------------------------------------------------------------

describe("ThresholdCommitmentProofProvider — createProof ABOVE", () => {
  const provider = new ThresholdCommitmentProofProvider();

  it("returns predicateResult true when actual > threshold", async () => {
    const params = makeProofParams({
      predicateType: "ABOVE",
      actualValue: 85,
      thresholdValue: 50,
    });
    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(true);
  });

  it("returns predicateResult false when actual < threshold", async () => {
    const params = makeProofParams({
      predicateType: "ABOVE",
      actualValue: 30,
      thresholdValue: 50,
    });
    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(false);
  });

  it("returns predicateResult false when actual equals threshold (not strictly above)", async () => {
    const params = makeProofParams({
      predicateType: "ABOVE",
      actualValue: 50,
      thresholdValue: 50,
    });
    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(false);
  });

  it("includes a valid commitment hash in the proof", async () => {
    const params = makeProofParams();
    const proof = await provider.createProof(params);
    expect(proof.commitment.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sets predicateType in proof result", async () => {
    const params = makeProofParams({ predicateType: "ABOVE" });
    const proof = await provider.createProof(params);
    expect(proof.predicateType).toBe("ABOVE");
  });
});

// ---------------------------------------------------------------------------
// createProof — BELOW predicate
// ---------------------------------------------------------------------------

describe("ThresholdCommitmentProofProvider — createProof BELOW", () => {
  const provider = new ThresholdCommitmentProofProvider();

  it("returns true when actual < threshold", async () => {
    const params = makeProofParams({
      predicateType: "BELOW",
      actualValue: 30,
      thresholdValue: 50,
    });
    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(true);
  });

  it("returns false when actual > threshold", async () => {
    const params = makeProofParams({
      predicateType: "BELOW",
      actualValue: 85,
      thresholdValue: 50,
    });
    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(false);
  });

  it("returns false when actual equals threshold", async () => {
    const params = makeProofParams({
      predicateType: "BELOW",
      actualValue: 50,
      thresholdValue: 50,
    });
    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(false);
  });

  it("sets predicateType to BELOW", async () => {
    const params = makeProofParams({ predicateType: "BELOW" });
    const proof = await provider.createProof(params);
    expect(proof.predicateType).toBe("BELOW");
  });

  it("includes threshold reference", async () => {
    const params = makeProofParams({
      predicateType: "BELOW",
      thresholdRef: "policy/v5",
    });
    const proof = await provider.createProof(params);
    expect(proof.thresholdRef).toBe("policy/v5");
  });
});

// ---------------------------------------------------------------------------
// createProof — EQUAL predicate
// ---------------------------------------------------------------------------

describe("ThresholdCommitmentProofProvider — createProof EQUAL", () => {
  const provider = new ThresholdCommitmentProofProvider();

  it("returns true when actual equals threshold", async () => {
    const params = makeProofParams({
      predicateType: "EQUAL",
      actualValue: 50,
      thresholdValue: 50,
    });
    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(true);
  });

  it("returns false when actual does not equal threshold", async () => {
    const params = makeProofParams({
      predicateType: "EQUAL",
      actualValue: 51,
      thresholdValue: 50,
    });
    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(false);
  });

  it("sets predicateType to EQUAL", async () => {
    const params = makeProofParams({ predicateType: "EQUAL" });
    const proof = await provider.createProof(params);
    expect(proof.predicateType).toBe("EQUAL");
  });

  it("works with decimal values", async () => {
    const params = makeProofParams({
      predicateType: "EQUAL",
      actualValue: 3.14,
      thresholdValue: 3.14,
    });
    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(true);
  });

  it("zero equals zero", async () => {
    const params = makeProofParams({
      predicateType: "EQUAL",
      actualValue: 0,
      thresholdValue: 0,
    });
    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// verifyProof — valid proof with trusted attester
// ---------------------------------------------------------------------------

describe("ThresholdCommitmentProofProvider — verifyProof", () => {
  const provider = new ThresholdCommitmentProofProvider();

  it("returns true for valid proof with trusted attester", async () => {
    const params = makeProofParams();
    const proof = await provider.createProof(params);
    const ctx = makeVerifyContext([params.attesterPublicKey]);
    expect(await provider.verifyProof(proof, ctx)).toBe(true);
  });

  it("returns false for untrusted attester", async () => {
    const params = makeProofParams();
    const proof = await provider.createProof(params);
    const otherKp = makeKeyPair();
    const ctx = makeVerifyContext([otherKp.publicKey]);
    expect(await provider.verifyProof(proof, ctx)).toBe(false);
  });

  it("returns false with tampered commitment hash", async () => {
    const params = makeProofParams();
    const proof = await provider.createProof(params);
    const tampered: ProofResult = {
      ...proof,
      commitment: { ...proof.commitment, hash: "a".repeat(64) },
    };
    const ctx = makeVerifyContext([params.attesterPublicKey]);
    expect(await provider.verifyProof(tampered, ctx)).toBe(false);
  });

  it("returns false with tampered predicate result", async () => {
    const params = makeProofParams({ actualValue: 85, thresholdValue: 50 });
    const proof = await provider.createProof(params);
    const tampered: ProofResult = {
      ...proof,
      predicateResult: !proof.predicateResult,
    };
    const ctx = makeVerifyContext([params.attesterPublicKey]);
    expect(await provider.verifyProof(tampered, ctx)).toBe(false);
  });

  it("returns false with wrong scheme", async () => {
    const params = makeProofParams();
    const proof = await provider.createProof(params);
    const tampered: ProofResult = {
      ...proof,
      scheme: "wrong-scheme",
    };
    const ctx = makeVerifyContext([params.attesterPublicKey]);
    expect(await provider.verifyProof(tampered, ctx)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Proof never contains actual value or threshold value
// ---------------------------------------------------------------------------

describe("ThresholdCommitmentProofProvider — no secret leakage", () => {
  const provider = new ThresholdCommitmentProofProvider();

  it("proof does not contain actualValue in any field", async () => {
    const actualValue = 85.123;
    const thresholdValue = 50.456;
    const params = makeProofParams({ actualValue, thresholdValue });
    const proof = await provider.createProof(params);

    // Deep search all string values in the proof object
    const jsonStr = JSON.stringify(proof);
    expect(jsonStr).not.toContain(String(actualValue));
    expect(jsonStr).not.toContain(String(thresholdValue));
  });

  it("proof object keys do not include 'actualValue'", async () => {
    const params = makeProofParams();
    const proof = await provider.createProof(params);
    const allKeys = getAllKeys(proof);
    expect(allKeys).not.toContain("actualValue");
    expect(allKeys).not.toContain("thresholdValue");
  });

  it("proofData is empty string for trust-based scheme", async () => {
    const params = makeProofParams();
    const proof = await provider.createProof(params);
    expect(proof.proofData).toBe("");
  });

  it("commitment hash does not reveal the value", async () => {
    const params1 = makeProofParams({ actualValue: 85 });
    const params2 = makeProofParams({ actualValue: 85 });
    const proof1 = await provider.createProof(params1);
    const proof2 = await provider.createProof(params2);
    // Different blinding factors = different hashes even for same value
    expect(proof1.commitment.hash).not.toBe(proof2.commitment.hash);
  });

  it("attester signature is present", async () => {
    const params = makeProofParams();
    const proof = await provider.createProof(params);
    expect(proof.attesterSignature).toMatch(/^[0-9a-f]{128}$/);
  });
});

/** Recursively collect all keys in an object */
function getAllKeys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [];
  const keys: string[] = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    keys.push(prefix ? `${prefix}.${key}` : key);
    if (val && typeof val === "object") {
      keys.push(...getAllKeys(val, prefix ? `${prefix}.${key}` : key));
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

describe("Provider registry", () => {
  beforeEach(() => {
    clearProviders();
  });

  it("registerProvider and getProvider work correctly", () => {
    const provider = new ThresholdCommitmentProofProvider();
    registerProvider(provider);
    const retrieved = getProvider("threshold-commitment-v1");
    expect(retrieved).toBe(provider);
  });

  it("getProvider returns undefined for unregistered scheme", () => {
    const retrieved = getProvider("nonexistent-scheme");
    expect(retrieved).toBeUndefined();
  });

  it("registerProvider throws for duplicate scheme", () => {
    const provider1 = new ThresholdCommitmentProofProvider();
    const provider2 = new ThresholdCommitmentProofProvider();
    registerProvider(provider1);
    expect(() => registerProvider(provider2)).toThrow("already registered");
  });

  it("clearProviders clears all registered providers", () => {
    const provider = new ThresholdCommitmentProofProvider();
    registerProvider(provider);
    expect(getProvider("threshold-commitment-v1")).toBe(provider);
    clearProviders();
    expect(getProvider("threshold-commitment-v1")).toBeUndefined();
  });

  it("after clearing, can re-register same scheme", () => {
    const provider = new ThresholdCommitmentProofProvider();
    registerProvider(provider);
    clearProviders();
    expect(() => registerProvider(provider)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// verifyProofByScheme
// ---------------------------------------------------------------------------

describe("verifyProofByScheme", () => {
  beforeEach(() => {
    clearProviders();
  });

  it("dispatches to correct provider", async () => {
    const provider = new ThresholdCommitmentProofProvider();
    registerProvider(provider);

    const params = makeProofParams();
    const proof = await provider.createProof(params);
    const ctx = makeVerifyContext([params.attesterPublicKey]);

    const result = await verifyProofByScheme(proof, ctx);
    expect(result).toBe(true);
  });

  it("throws for unregistered scheme", async () => {
    const proof: ProofResult = {
      scheme: "unknown-scheme",
      version: 1,
      commitment: {
        hash: "a".repeat(64),
        scheme: "sha256-blinded-v2",
        version: 2,
      },
      predicateResult: true,
      predicateType: "ABOVE",
      thresholdRef: "ref",
      attesterId: "a",
      attesterSignature: "0".repeat(128),
      attesterPublicKey: "0".repeat(64),
      proofData: "",
    };
    const ctx = makeVerifyContext(["0".repeat(64)]);
    await expect(verifyProofByScheme(proof, ctx)).rejects.toThrow(
      "No proof provider",
    );
  });

  it("returns false for invalid proof via dispatched provider", async () => {
    const provider = new ThresholdCommitmentProofProvider();
    registerProvider(provider);

    const params = makeProofParams();
    const proof = await provider.createProof(params);
    // Use an untrusted key
    const ctx = makeVerifyContext([makeKeyPair().publicKey]);

    const result = await verifyProofByScheme(proof, ctx);
    expect(result).toBe(false);
  });

  it("dispatches based on proof.scheme field", async () => {
    const provider = new ThresholdCommitmentProofProvider();
    registerProvider(provider);

    const params = makeProofParams();
    const proof = await provider.createProof(params);

    // Tamper the scheme to something unregistered
    const tampered = { ...proof, scheme: "nonexistent" };
    const ctx = makeVerifyContext([params.attesterPublicKey]);
    await expect(verifyProofByScheme(tampered, ctx)).rejects.toThrow();
  });

  it("works end-to-end with registry", async () => {
    const provider = new ThresholdCommitmentProofProvider();
    registerProvider(provider);

    const kp = makeKeyPair();
    const params = makeProofParams({
      attesterPrivateKey: kp.privateKey,
      attesterPublicKey: kp.publicKey,
      actualValue: 100,
      thresholdValue: 50,
      predicateType: "ABOVE",
    });

    const proof = await provider.createProof(params);
    expect(proof.predicateResult).toBe(true);

    const ctx = makeVerifyContext([kp.publicKey]);
    const result = await verifyProofByScheme(proof, ctx);
    expect(result).toBe(true);
  });
});
