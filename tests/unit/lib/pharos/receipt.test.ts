/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Receipt Layer Tests — Pharos Triple-Hash + Ed25519 Foundation
 *
 * Cryptographic-correctness tests:
 *   1. Keypair derivation is deterministic for same inputs
 *   2. Different authority IDs derive different keypairs
 *   3. Receipt hash is stable for same inputs
 *   4. Receipt hash changes when ANY input changes
 *   5. Signed receipts verify with the matching public key
 *   6. Tampered receipts fail verification
 *   7. extractOversightIdsFromTrace works with current tool shape
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

beforeAll(() => {
  // Set a deterministic encryption key so tests are reproducible.
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY ||
    "test-encryption-key-for-unit-tests-deterministic-32chars";
});

import {
  computeReceipt,
  deriveAuthorityKeypair,
  extractOversightIdsFromTrace,
  signReceipt,
  systemPromptHash,
  verifyReceiptSignature,
  type ReceiptInputs,
} from "@/lib/pharos/receipt";

const baseInputs: ReceiptInputs = {
  authorityProfileId: "auth-1",
  oversightIds: ["ov-1"],
  prompt: "Wie steht es um Operator X?",
  systemPromptHash: "sha-system",
  modelVersion: "claude-sonnet-4-6",
  toolCallTrace: [
    {
      tool: "query_operator_compliance",
      input: { oversightId: "ov-1" },
      ok: true,
    },
  ],
  citationIds: [
    "DB:OversightRelationship:ov-1",
    "COMP:operator-compliance-score@v1.0",
  ],
  answer: "Score 65 [COMP:operator-compliance-score@v1.0]",
  abstained: false,
  previousReceiptHash: null,
};

describe("deriveAuthorityKeypair", () => {
  it("is deterministic — same input → same keypair", () => {
    const a = deriveAuthorityKeypair("auth-deterministic-test");
    const b = deriveAuthorityKeypair("auth-deterministic-test");
    expect(a.publicKeyBase64).toBe(b.publicKeyBase64);
  });

  it("derives different keypairs for different authority IDs", () => {
    const a = deriveAuthorityKeypair("auth-A");
    const b = deriveAuthorityKeypair("auth-B");
    expect(a.publicKeyBase64).not.toBe(b.publicKeyBase64);
  });

  it("publicKey is 32 raw bytes (44-char base64)", () => {
    const kp = deriveAuthorityKeypair("auth-format-test");
    const decoded = Buffer.from(kp.publicKeyBase64, "base64");
    expect(decoded.length).toBe(32);
  });
});

describe("computeReceipt", () => {
  it("produces stable hash for same inputs", () => {
    const r1 = computeReceipt(baseInputs);
    const r2 = computeReceipt(baseInputs);
    expect(r1.receiptHash).toBe(r2.receiptHash);
    expect(r1.inputHash).toBe(r2.inputHash);
    expect(r1.contextHash).toBe(r2.contextHash);
    expect(r1.outputHash).toBe(r2.outputHash);
  });

  it("inputHash changes when prompt changes", () => {
    const a = computeReceipt(baseInputs);
    const b = computeReceipt({ ...baseInputs, prompt: "anders gefragt" });
    expect(a.inputHash).not.toBe(b.inputHash);
    expect(a.receiptHash).not.toBe(b.receiptHash);
  });

  it("contextHash changes when oversightIds change", () => {
    const a = computeReceipt(baseInputs);
    const b = computeReceipt({ ...baseInputs, oversightIds: ["ov-2"] });
    expect(a.contextHash).not.toBe(b.contextHash);
  });

  it("outputHash changes when answer changes", () => {
    const a = computeReceipt(baseInputs);
    const b = computeReceipt({ ...baseInputs, answer: "different answer" });
    expect(a.outputHash).not.toBe(b.outputHash);
  });

  it("outputHash differs between abstained and non-abstained", () => {
    const a = computeReceipt(baseInputs);
    const b = computeReceipt({ ...baseInputs, abstained: true });
    expect(a.outputHash).not.toBe(b.outputHash);
  });

  it("oversightIds are sorted in the contextHash (order-independent)", () => {
    const a = computeReceipt({ ...baseInputs, oversightIds: ["a", "b", "c"] });
    const b = computeReceipt({ ...baseInputs, oversightIds: ["c", "a", "b"] });
    expect(a.contextHash).toBe(b.contextHash);
  });

  it("hash-chain: previousReceiptHash flows into receiptHash", () => {
    const a = computeReceipt({ ...baseInputs, previousReceiptHash: null });
    const b = computeReceipt({ ...baseInputs, previousReceiptHash: "abc123" });
    expect(a.receiptHash).not.toBe(b.receiptHash);
  });
});

describe("signReceipt + verifyReceiptSignature", () => {
  it("valid signature verifies with the matching public key", () => {
    const computed = computeReceipt(baseInputs);
    const signed = signReceipt(computed, baseInputs.authorityProfileId);
    expect(
      verifyReceiptSignature(
        signed.receiptHash,
        signed.signature,
        signed.publicKeyBase64,
      ),
    ).toBe(true);
  });

  it("tampered receiptHash fails verification", () => {
    const computed = computeReceipt(baseInputs);
    const signed = signReceipt(computed, baseInputs.authorityProfileId);
    // Flip one hex char of the receiptHash
    const tamperedHash =
      signed.receiptHash.slice(0, -1) +
      (signed.receiptHash.slice(-1) === "0" ? "1" : "0");
    expect(
      verifyReceiptSignature(
        tamperedHash,
        signed.signature,
        signed.publicKeyBase64,
      ),
    ).toBe(false);
  });

  it("wrong public key fails verification", () => {
    const computed = computeReceipt(baseInputs);
    const signed = signReceipt(computed, "auth-A");
    const otherKey = deriveAuthorityKeypair("auth-B").publicKeyBase64;
    expect(
      verifyReceiptSignature(signed.receiptHash, signed.signature, otherKey),
    ).toBe(false);
  });

  it("malformed signature returns false (no throw)", () => {
    expect(
      verifyReceiptSignature(
        "abc".repeat(20),
        "not-a-valid-signature",
        deriveAuthorityKeypair("auth-A").publicKeyBase64,
      ),
    ).toBe(false);
  });
});

describe("extractOversightIdsFromTrace", () => {
  it("pulls oversightId from successful tool calls", () => {
    const ids = extractOversightIdsFromTrace([
      {
        tool: "query_operator_compliance",
        input: { oversightId: "ov-1" },
        ok: true,
      },
      {
        tool: "summarize_audit_chain",
        input: { oversightId: "ov-2", limit: 20 },
        ok: true,
      },
    ]);
    expect(ids.sort()).toEqual(["ov-1", "ov-2"]);
  });

  it("dedupes when the same oversightId is touched multiple times", () => {
    const ids = extractOversightIdsFromTrace([
      {
        tool: "query_operator_compliance",
        input: { oversightId: "ov-1" },
        ok: true,
      },
      {
        tool: "summarize_audit_chain",
        input: { oversightId: "ov-1" },
        ok: true,
      },
    ]);
    expect(ids).toEqual(["ov-1"]);
  });

  it("skips failed tool calls", () => {
    const ids = extractOversightIdsFromTrace([
      {
        tool: "query_operator_compliance",
        input: { oversightId: "ov-1" },
        ok: false,
      },
    ]);
    expect(ids).toEqual([]);
  });

  it("ignores tool inputs without oversightId", () => {
    const ids = extractOversightIdsFromTrace([
      { tool: "some_other_tool", input: { foo: "bar" }, ok: true },
    ]);
    expect(ids).toEqual([]);
  });
});

describe("systemPromptHash", () => {
  it("is stable for identical inputs", () => {
    const a = systemPromptHash("prompt", [{ name: "tool" }]);
    const b = systemPromptHash("prompt", [{ name: "tool" }]);
    expect(a).toBe(b);
  });

  it("changes when the prompt changes", () => {
    const a = systemPromptHash("prompt-A", []);
    const b = systemPromptHash("prompt-B", []);
    expect(a).not.toBe(b);
  });
});
