/**
 * Verity 2036 -- Transparency Service Unit Tests
 *
 * Tests the transparency log service from src/services/transparency.ts.
 * Mocks the database layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Mock the database client BEFORE importing the transparency module
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();

vi.mock("../../src/db/client.js", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  getPool: vi.fn(() => ({ query: vi.fn() })),
  closePool: vi.fn(),
}));

// Now import the transparency service
import {
  appendLogEntry,
  shouldCreateCheckpoint,
  type EntryType,
} from "../../src/services/transparency.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GENESIS_HASH = "0".repeat(64);

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// appendLogEntry
// ---------------------------------------------------------------------------

describe("appendLogEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses genesis hash ('0' x 64) as previous_hash when log is empty", async () => {
    // Mock: no previous entries
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Mock: max sequence = null (no entries)
    mockQuery.mockResolvedValueOnce({ rows: [{ max_seq: null }], rowCount: 1 });
    // Mock: INSERT succeeds
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await appendLogEntry(
      "ATTESTATION" as EntryType,
      "ref-001",
      "tenant-1",
      { some: "data" },
    );

    // Check the INSERT call (3rd call)
    const insertArgs = mockQuery.mock.calls[2]?.[1] as unknown[];
    // previous_hash is parameter index 5 (0-indexed: entryId, entryType, referenceId, tenantId, entryHash, previousHash, ...)
    expect(insertArgs?.[5]).toBe(GENESIS_HASH);
    expect(result.sequenceNumber).toBe(1);
  });

  it("chains to the previous entry hash when log has entries", async () => {
    const prevHash = sha256Hex("previous-entry-content");

    // Mock: previous entry exists
    mockQuery.mockResolvedValueOnce({
      rows: [{ entry_hash: prevHash }],
      rowCount: 1,
    });
    // Mock: max sequence = 5
    mockQuery.mockResolvedValueOnce({
      rows: [{ max_seq: "5" }],
      rowCount: 1,
    });
    // Mock: INSERT succeeds
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await appendLogEntry(
      "CERTIFICATE" as EntryType,
      "ref-002",
      "tenant-1",
      { cert: "data" },
    );

    // The INSERT call should have the previous hash
    const insertArgs = mockQuery.mock.calls[2]?.[1] as unknown[];
    expect(insertArgs?.[5]).toBe(prevHash);
    expect(result.sequenceNumber).toBe(6);
  });

  it("returns an entryId, sequenceNumber, and entryHash", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [{ max_seq: null }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await appendLogEntry(
      "ATTESTATION" as EntryType,
      "ref-003",
      "tenant-1",
      { test: true },
    );

    expect(typeof result.entryId).toBe("string");
    expect(result.entryId.length).toBeGreaterThan(0);
    expect(result.sequenceNumber).toBe(1);
    expect(typeof result.entryHash).toBe("string");
    expect(result.entryHash).toHaveLength(64); // SHA-256 hex
  });

  it("sequence numbers are monotonically increasing", async () => {
    const results: number[] = [];

    for (let i = 0; i < 3; i++) {
      const prevSeq = i === 0 ? null : String(i);
      const prevHash = i === 0 ? undefined : sha256Hex(`entry-${i}`);

      // Previous entry
      if (i === 0) {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      } else {
        mockQuery.mockResolvedValueOnce({
          rows: [{ entry_hash: prevHash }],
          rowCount: 1,
        });
      }
      // Max sequence
      mockQuery.mockResolvedValueOnce({
        rows: [{ max_seq: prevSeq }],
        rowCount: 1,
      });
      // INSERT
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await appendLogEntry(
        "ATTESTATION" as EntryType,
        `ref-${i}`,
        "tenant-1",
        { index: i },
      );
      results.push(result.sequenceNumber);
    }

    expect(results).toEqual([1, 2, 3]);
    // Verify monotonically increasing
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBeGreaterThan(results[i - 1]!);
    }
  });

  it("computes entry_hash from previous_hash + canonical entry data", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [{ max_seq: null }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await appendLogEntry(
      "ATTESTATION" as EntryType,
      "ref-hash-test",
      "tenant-1",
      { data: "test" },
    );

    // Verify the hash is a valid 64-char hex string
    expect(result.entryHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("stores the correct entry_type in the INSERT", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [{ max_seq: null }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await appendLogEntry("KEY_ROTATION" as EntryType, "ref-004", "tenant-1", {
      key: "rotated",
    });

    const insertArgs = mockQuery.mock.calls[2]?.[1] as unknown[];
    // entryType is parameter index 1
    expect(insertArgs?.[1]).toBe("KEY_ROTATION");
  });

  it("stores the correct tenant_id in the INSERT", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [{ max_seq: null }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await appendLogEntry(
      "KEY_REVOCATION" as EntryType,
      "ref-005",
      "tenant-xyz",
      { key: "revoked" },
    );

    const insertArgs = mockQuery.mock.calls[2]?.[1] as unknown[];
    // tenantId is parameter index 3
    expect(insertArgs?.[3]).toBe("tenant-xyz");
  });
});

// ---------------------------------------------------------------------------
// shouldCreateCheckpoint
// ---------------------------------------------------------------------------

describe("shouldCreateCheckpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when there are no entries at all", async () => {
    // No checkpoints
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // No entries (max_seq = null)
    mockQuery.mockResolvedValueOnce({ rows: [{ max_seq: null }], rowCount: 1 });

    const result = await shouldCreateCheckpoint();
    expect(result).toBe(false);
  });

  it("returns true when there are entries but no checkpoints", async () => {
    // No checkpoints
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Has entries
    mockQuery.mockResolvedValueOnce({ rows: [{ max_seq: "5" }], rowCount: 1 });

    const result = await shouldCreateCheckpoint();
    expect(result).toBe(true);
  });

  it("returns true after 1000 entries since last checkpoint", async () => {
    // Last checkpoint at sequence 100
    mockQuery.mockResolvedValueOnce({
      rows: [{ last_sequence: "100", created_at: new Date().toISOString() }],
      rowCount: 1,
    });
    // Current max = 1100 (1000 entries since checkpoint)
    mockQuery.mockResolvedValueOnce({
      rows: [{ max_seq: "1100" }],
      rowCount: 1,
    });

    const result = await shouldCreateCheckpoint();
    expect(result).toBe(true);
  });

  it("returns false when fewer than 1000 entries since last checkpoint and within 24h", async () => {
    // Last checkpoint at sequence 100, created just now
    mockQuery.mockResolvedValueOnce({
      rows: [{ last_sequence: "100", created_at: new Date().toISOString() }],
      rowCount: 1,
    });
    // Current max = 200 (only 100 entries since checkpoint)
    mockQuery.mockResolvedValueOnce({
      rows: [{ max_seq: "200" }],
      rowCount: 1,
    });

    const result = await shouldCreateCheckpoint();
    expect(result).toBe(false);
  });

  it("returns false when no new entries since last checkpoint", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ last_sequence: "500", created_at: new Date().toISOString() }],
      rowCount: 1,
    });
    // Current max = 500 (same as checkpoint)
    mockQuery.mockResolvedValueOnce({
      rows: [{ max_seq: "500" }],
      rowCount: 1,
    });

    const result = await shouldCreateCheckpoint();
    expect(result).toBe(false);
  });

  it("returns true when checkpoint is older than 24 hours and there are new entries", async () => {
    // Last checkpoint was 25 hours ago
    const twentyFiveHoursAgo = new Date(
      Date.now() - 25 * 60 * 60 * 1000,
    ).toISOString();
    mockQuery.mockResolvedValueOnce({
      rows: [{ last_sequence: "100", created_at: twentyFiveHoursAgo }],
      rowCount: 1,
    });
    // Current max = 150 (only 50 new entries, but time threshold exceeded)
    mockQuery.mockResolvedValueOnce({
      rows: [{ max_seq: "150" }],
      rowCount: 1,
    });

    const result = await shouldCreateCheckpoint();
    expect(result).toBe(true);
  });

  it("returns false when checkpoint is recent and entry count is below threshold", async () => {
    // Checkpoint created 1 hour ago
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    mockQuery.mockResolvedValueOnce({
      rows: [{ last_sequence: "500", created_at: oneHourAgo }],
      rowCount: 1,
    });
    // Current max = 510 (only 10 new entries)
    mockQuery.mockResolvedValueOnce({
      rows: [{ max_seq: "510" }],
      rowCount: 1,
    });

    const result = await shouldCreateCheckpoint();
    expect(result).toBe(false);
  });

  it("returns true at exactly CHECKPOINT_ENTRY_INTERVAL (1000) new entries", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ last_sequence: "0", created_at: new Date().toISOString() }],
      rowCount: 1,
    });
    // Current max = 1000 (exactly 1000 new entries)
    mockQuery.mockResolvedValueOnce({
      rows: [{ max_seq: "1000" }],
      rowCount: 1,
    });

    const result = await shouldCreateCheckpoint();
    expect(result).toBe(true);
  });

  it("returns false at 999 new entries within 24h window", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ last_sequence: "0", created_at: new Date().toISOString() }],
      rowCount: 1,
    });
    // Current max = 999 (just under threshold)
    mockQuery.mockResolvedValueOnce({
      rows: [{ max_seq: "999" }],
      rowCount: 1,
    });

    const result = await shouldCreateCheckpoint();
    expect(result).toBe(false);
  });
});
