import { describe, it, expect, vi } from "vitest";

// Mock "server-only" so the module can be imported in a test environment
vi.mock("server-only", () => ({}));

import { computeEntryHash } from "./chain-writer.server";

describe("computeEntryHash", () => {
  const baseArgs = {
    sequenceNumber: 1,
    eventType: "ATTESTATION_CREATED",
    entityId: "entity-abc",
    eventData: { key: "value" },
    previousHash: "GENESIS",
  } as const;

  it("produces a 64-character hex string (SHA-256)", () => {
    const hash = computeEntryHash(
      baseArgs.sequenceNumber,
      baseArgs.eventType,
      baseArgs.entityId,
      baseArgs.eventData,
      baseArgs.previousHash,
    );
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same inputs yield same output", () => {
    const hash1 = computeEntryHash(
      baseArgs.sequenceNumber,
      baseArgs.eventType,
      baseArgs.entityId,
      baseArgs.eventData,
      baseArgs.previousHash,
    );
    const hash2 = computeEntryHash(
      baseArgs.sequenceNumber,
      baseArgs.eventType,
      baseArgs.entityId,
      baseArgs.eventData,
      baseArgs.previousHash,
    );
    expect(hash1).toBe(hash2);
  });

  it("changes when sequenceNumber differs", () => {
    const hash1 = computeEntryHash(
      1,
      baseArgs.eventType,
      baseArgs.entityId,
      baseArgs.eventData,
      baseArgs.previousHash,
    );
    const hash2 = computeEntryHash(
      2,
      baseArgs.eventType,
      baseArgs.entityId,
      baseArgs.eventData,
      baseArgs.previousHash,
    );
    expect(hash1).not.toBe(hash2);
  });

  it("changes when eventType differs", () => {
    const hash1 = computeEntryHash(
      baseArgs.sequenceNumber,
      "ATTESTATION_CREATED",
      baseArgs.entityId,
      baseArgs.eventData,
      baseArgs.previousHash,
    );
    const hash2 = computeEntryHash(
      baseArgs.sequenceNumber,
      "ATTESTATION_REVOKED",
      baseArgs.entityId,
      baseArgs.eventData,
      baseArgs.previousHash,
    );
    expect(hash1).not.toBe(hash2);
  });

  it("changes when entityId differs", () => {
    const hash1 = computeEntryHash(
      baseArgs.sequenceNumber,
      baseArgs.eventType,
      "entity-1",
      baseArgs.eventData,
      baseArgs.previousHash,
    );
    const hash2 = computeEntryHash(
      baseArgs.sequenceNumber,
      baseArgs.eventType,
      "entity-2",
      baseArgs.eventData,
      baseArgs.previousHash,
    );
    expect(hash1).not.toBe(hash2);
  });

  it("changes when eventData differs", () => {
    const hash1 = computeEntryHash(
      baseArgs.sequenceNumber,
      baseArgs.eventType,
      baseArgs.entityId,
      { key: "value-a" },
      baseArgs.previousHash,
    );
    const hash2 = computeEntryHash(
      baseArgs.sequenceNumber,
      baseArgs.eventType,
      baseArgs.entityId,
      { key: "value-b" },
      baseArgs.previousHash,
    );
    expect(hash1).not.toBe(hash2);
  });

  it("changes when previousHash differs", () => {
    const hash1 = computeEntryHash(
      baseArgs.sequenceNumber,
      baseArgs.eventType,
      baseArgs.entityId,
      baseArgs.eventData,
      "GENESIS",
    );
    const hash2 = computeEntryHash(
      baseArgs.sequenceNumber,
      baseArgs.eventType,
      baseArgs.entityId,
      baseArgs.eventData,
      "a".repeat(64),
    );
    expect(hash1).not.toBe(hash2);
  });
});
