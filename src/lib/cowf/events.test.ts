/**
 * COWF Events — hash-chain integrity tests.
 *
 * In-memory simulated workflow chain to assert:
 *
 *   1. canonicalize is order-independent
 *   2. computeEntryHash includes prevHash + sequence
 *   3. First event in a chain links to GENESIS_<workflowId> with sequence=0
 *   4. Subsequent events increment sequence + chain prevHash
 *   5. getLatestEvent returns -1 sequence for empty chain
 *   6. Fallback path on transaction failure still appends a row
 *   7. verifyChain detects tampered prevHash
 *   8. verifyChain detects tampered sequence (gap)
 *   9. verifyChain detects tampered payload
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWorkflowEvent, mockSecurityEvent, mockTransaction } = vi.hoisted(
  () => ({
    mockWorkflowEvent: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    mockSecurityEvent: { create: vi.fn() },
    mockTransaction: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflowEvent: mockWorkflowEvent,
    securityEvent: mockSecurityEvent,
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  __test,
  appendWorkflowEvent,
  computeEntryHash,
  genesisHashForWorkflow,
  getLatestEvent,
  verifyChain,
} from "./events.server";

const WF_ID = "wf_test_001";

interface SimulatedRow {
  id: string;
  workflowId: string;
  sequence: number;
  eventType: string;
  causedBy: string;
  payload: Record<string, unknown>;
  resultingState: string | null;
  prevHash: string;
  entryHash: string;
  occurredAt: Date;
}

let chain: SimulatedRow[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `evt_${idCounter.toString().padStart(6, "0")}`;
}

function setupHappyPath(): void {
  mockTransaction.mockImplementation(
    async (
      cb: (tx: { workflowEvent: typeof mockWorkflowEvent }) => Promise<unknown>,
    ) => cb({ workflowEvent: mockWorkflowEvent }),
  );

  mockWorkflowEvent.findFirst.mockImplementation(
    async ({ where }: { where: { workflowId: string } }) => {
      const filtered = chain.filter((r) => r.workflowId === where.workflowId);
      if (filtered.length === 0) return null;
      return [...filtered].sort((a, b) => b.sequence - a.sequence)[0];
    },
  );

  mockWorkflowEvent.create.mockImplementation(
    async ({ data }: { data: Partial<SimulatedRow> }) => {
      const row: SimulatedRow = {
        id: nextId(),
        workflowId: data.workflowId ?? WF_ID,
        sequence: data.sequence ?? 0,
        eventType: data.eventType ?? "STATE_TRANSITION",
        causedBy: data.causedBy ?? "system",
        payload: (data.payload as Record<string, unknown>) ?? {},
        resultingState: data.resultingState ?? null,
        prevHash: data.prevHash ?? "",
        entryHash: data.entryHash ?? "",
        occurredAt: data.occurredAt ?? new Date(),
      };
      chain.push(row);
      return row;
    },
  );

  mockWorkflowEvent.findMany.mockImplementation(
    async ({
      where = {},
      skip = 0,
      take = 100,
    }: {
      where?: { workflowId?: string };
      skip?: number;
      take?: number;
    }) => {
      let filtered = chain;
      if (where.workflowId !== undefined) {
        filtered = filtered.filter((r) => r.workflowId === where.workflowId);
      }
      filtered = [...filtered].sort((a, b) => a.sequence - b.sequence);
      return filtered.slice(skip, skip + take);
    },
  );

  mockSecurityEvent.create.mockResolvedValue(undefined);
}

beforeEach(() => {
  vi.clearAllMocks();
  chain = [];
  idCounter = 0;
  setupHappyPath();
});

// ─── canonicalize ──────────────────────────────────────────────────────────

describe("canonicalize", () => {
  const { canonicalize, sha256Hex } = __test;
  it("is order-independent for objects", () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
  });
  it("preserves nested ordering", () => {
    expect(canonicalize({ outer: { z: 1, a: 2 } })).toBe(
      canonicalize({ outer: { a: 2, z: 1 } }),
    );
  });
  it("hashes equal inputs to equal SHA-256 hex", () => {
    expect(sha256Hex("hello")).toBe(sha256Hex("hello"));
    expect(sha256Hex("hello")).not.toBe(sha256Hex("world"));
  });
});

// ─── computeEntryHash ──────────────────────────────────────────────────────

describe("computeEntryHash", () => {
  it("changes when prevHash changes", () => {
    const base = {
      workflowId: WF_ID,
      sequence: 0,
      eventType: "STATE_TRANSITION",
      causedBy: "user:u1",
      payload: { toState: "DRAFT" },
      resultingState: "DRAFT",
      occurredAt: new Date("2026-04-30T10:00:00Z"),
    };
    const h1 = computeEntryHash({
      ...base,
      prevHash: genesisHashForWorkflow(WF_ID),
    });
    const h2 = computeEntryHash({ ...base, prevHash: "a".repeat(64) });
    expect(h1).not.toBe(h2);
  });

  it("changes when sequence changes", () => {
    const base = {
      workflowId: WF_ID,
      eventType: "STATE_TRANSITION",
      causedBy: "user:u1",
      payload: { x: 1 },
      resultingState: null,
      occurredAt: new Date("2026-04-30T10:00:00Z"),
      prevHash: genesisHashForWorkflow(WF_ID),
    };
    const h0 = computeEntryHash({ ...base, sequence: 0 });
    const h1 = computeEntryHash({ ...base, sequence: 1 });
    expect(h0).not.toBe(h1);
  });

  it("is deterministic for same input", () => {
    const input = {
      workflowId: WF_ID,
      sequence: 0,
      eventType: "STATE_TRANSITION",
      causedBy: "user:u1",
      payload: { x: 1 },
      resultingState: "X",
      occurredAt: new Date("2026-04-30T10:00:00Z"),
      prevHash: genesisHashForWorkflow(WF_ID),
    };
    expect(computeEntryHash(input)).toBe(computeEntryHash(input));
  });
});

// ─── appendWorkflowEvent — happy path ──────────────────────────────────────

describe("appendWorkflowEvent — happy path", () => {
  it("first event has sequence=0 and prevHash=GENESIS", async () => {
    const result = await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "STATE_TRANSITION",
      causedBy: "user:u1",
      payload: { toState: "DRAFT" },
      resultingState: "DRAFT",
    });
    expect(result.sequence).toBe(0);
    expect(result.prevHash).toBe(genesisHashForWorkflow(WF_ID));
    expect(result.entryHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("second event chains to first", async () => {
    const a = await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "STATE_TRANSITION",
      causedBy: "user:u1",
      payload: { toState: "DRAFT" },
      resultingState: "DRAFT",
    });
    const b = await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "STEP_STARTED",
      causedBy: "system",
      payload: { stepKey: "assess" },
    });
    expect(b.sequence).toBe(1);
    expect(b.prevHash).toBe(a.entryHash);
  });

  it("rejects empty workflowId", async () => {
    await expect(
      appendWorkflowEvent({
        workflowId: "",
        eventType: "X",
        causedBy: "y",
        payload: {},
      }),
    ).rejects.toThrow(/workflowId/);
  });

  it("rejects empty eventType", async () => {
    await expect(
      appendWorkflowEvent({
        workflowId: WF_ID,
        eventType: "",
        causedBy: "y",
        payload: {},
      }),
    ).rejects.toThrow(/eventType/);
  });
});

// ─── getLatestEvent ────────────────────────────────────────────────────────

describe("getLatestEvent", () => {
  it("returns sequence=-1 + genesis hash for empty chain", async () => {
    const result = await getLatestEvent(WF_ID);
    expect(result.sequence).toBe(-1);
    expect(result.entryHash).toBe(genesisHashForWorkflow(WF_ID));
  });

  it("returns the latest sequence after appends", async () => {
    await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "X",
      causedBy: "y",
      payload: {},
    });
    await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "Y",
      causedBy: "y",
      payload: {},
    });
    const result = await getLatestEvent(WF_ID);
    expect(result.sequence).toBe(1);
  });
});

// ─── appendWorkflowEvent — fallback path ──────────────────────────────────

describe("appendWorkflowEvent — fallback path", () => {
  it("writes a fallback row + raises SecurityEvent when txn throws", async () => {
    mockTransaction.mockImplementationOnce(async () => {
      throw new Error("simulated serialisation failure");
    });
    const result = await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "STATE_TRANSITION",
      causedBy: "user:u1",
      payload: { toState: "DRAFT" },
      resultingState: "DRAFT",
    });
    expect(result.entryHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.prevHash).toBe(genesisHashForWorkflow(WF_ID));
    expect(mockSecurityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "WORKFLOW_HASH_CHAIN_DEGRADED",
          severity: "CRITICAL",
        }),
      }),
    );
  });
});

// ─── verifyChain ───────────────────────────────────────────────────────────

describe("verifyChain", () => {
  it("returns valid:true for empty chain", async () => {
    const result = await verifyChain(WF_ID);
    expect(result.valid).toBe(true);
    expect(result.checkedEvents).toBe(0);
  });

  it("returns valid:true after correct appends", async () => {
    await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "STATE_TRANSITION",
      causedBy: "user:u1",
      payload: { toState: "DRAFT" },
      resultingState: "DRAFT",
    });
    await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "STEP_STARTED",
      causedBy: "system",
      payload: { stepKey: "assess" },
    });
    const result = await verifyChain(WF_ID);
    expect(result.valid).toBe(true);
    expect(result.checkedEvents).toBe(2);
  });

  it("detects tampered prevHash", async () => {
    await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "STATE_TRANSITION",
      causedBy: "user:u1",
      payload: { toState: "DRAFT" },
      resultingState: "DRAFT",
    });
    await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "STEP_STARTED",
      causedBy: "system",
      payload: {},
    });
    chain[1].prevHash = "tampered" + "0".repeat(56);
    const result = await verifyChain(WF_ID);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.fieldDiffers).toBe("prevHash");
  });

  it("detects sequence gap", async () => {
    await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "X",
      causedBy: "y",
      payload: {},
    });
    await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "X",
      causedBy: "y",
      payload: {},
    });
    chain[1].sequence = 2; // gap: should be 1
    const result = await verifyChain(WF_ID);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.fieldDiffers).toBe("sequence");
  });

  it("detects tampered payload (entryHash mismatch)", async () => {
    await appendWorkflowEvent({
      workflowId: WF_ID,
      eventType: "STATE_TRANSITION",
      causedBy: "user:u1",
      payload: { toState: "DRAFT" },
      resultingState: "DRAFT",
    });
    chain[0].payload = { toState: "TAMPERED" };
    const result = await verifyChain(WF_ID);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.fieldDiffers).toBe("entryHash");
  });
});
