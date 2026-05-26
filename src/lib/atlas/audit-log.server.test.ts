import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — audit-log hash-chain integrity tests (T0.3).
 *
 * Audit logs are legal-tech-grade tamper-evidence: each row chains to
 * the previous row via sha256(prevHash + canonical-payload). If a row
 * is altered in the DB the next row's hash won't verify.
 *
 * This suite verifies the chain invariants without touching a real
 * database — we mock prisma to capture writes and replay them through
 * `verifyAtlasAuditChain`.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

interface FakeAuditRow {
  id: string;
  userId: string | null;
  organizationId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  hash: string;
  prevHash: string | null;
  createdAt: Date;
  /** Insertion-order tie-breaker — preserves order when fake timer
   *  pins all writes to the same instant. */
  _seq: number;
}

const { store } = vi.hoisted(() => ({
  /* Shared in-memory ledger across the prisma + logger mocks. */
  store: {
    rows: [] as FakeAuditRow[],
    /* When set, the next create() throws — for the fire-and-forget test. */
    failNext: false,
    nextSeq: 0,
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasAuditLog: {
      findFirst: vi.fn(
        async (q: {
          where: { organizationId: string | null };
          orderBy: { createdAt: "asc" | "desc" };
          select: { hash: true };
        }) => {
          const orgId = q.where.organizationId;
          const matching = store.rows.filter((r) => r.organizationId === orgId);
          if (matching.length === 0) return null;
          /* findFirst orderBy desc → highest _seq wins (most recent
             insertion). Robust even when createdAt is pinned by fake
             timers. */
          const sorted = [...matching].sort((a, b) => b._seq - a._seq);
          return { hash: sorted[0].hash };
        },
      ),
      findMany: vi.fn(
        async (q: {
          where: { organizationId: string | null };
          orderBy: { createdAt: "asc" | "desc" };
        }) => {
          const orgId = q.where.organizationId;
          const matching = store.rows.filter((r) => r.organizationId === orgId);
          return [...matching].sort((a, b) => a._seq - b._seq);
        },
      ),
      create: vi.fn(
        async (args: {
          data: Omit<FakeAuditRow, "id" | "createdAt" | "_seq">;
        }) => {
          if (store.failNext) {
            store.failNext = false;
            throw new Error("simulated prisma write failure");
          }
          const seq = store.nextSeq++;
          /* Use `new Date()` at create-time. With vi.useFakeTimers
             pinning the clock during each append() the canonical-
             timestamp and createdAt resolve to the same ISO string. */
          const row: FakeAuditRow = {
            id: `row-${seq}`,
            createdAt: new Date(),
            _seq: seq,
            ...args.data,
            metadata: (args.data.metadata as Record<string, unknown>) ?? null,
          };
          store.rows.push(row);
          return row;
        },
      ),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { appendAtlasAudit, verifyAtlasAuditChain } from "./audit-log.server";
import { logger } from "@/lib/logger";

beforeEach(() => {
  store.rows.length = 0;
  store.failNext = false;
  store.nextSeq = 0;
  /* Pin the clock so payload.timestamp (computed in append) and
     row.createdAt (set in our mock's create) resolve to the SAME
     ISO string. Verify can then recompute the hash from row.createdAt
     and match. Without this, sub-millisecond drift between the two
     `new Date()` calls inside one append produces flaky hashes. */
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-26T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

/** Advance the fake clock between appends so chained rows have
 *  distinct (and monotonically increasing) timestamps. */
function tick(ms = 100) {
  vi.advanceTimersByTime(ms);
}

/* ── appendAtlasAudit ───────────────────────────────────────────────── */

describe("appendAtlasAudit", () => {
  it("writes a row with computed sha256 hash on the FIRST append", async () => {
    await appendAtlasAudit({
      userId: "u1",
      organizationId: "org-A",
      action: "atlas.chat.create",
      entityId: "chat-1",
    });

    expect(store.rows).toHaveLength(1);
    const row = store.rows[0];
    expect(row.prevHash).toBeNull();
    expect(row.hash).toHaveLength(64); // sha256 hex
    expect(/^[0-9a-f]+$/.test(row.hash)).toBe(true);
  });

  it("chains: 2nd row's prevHash = 1st row's hash", async () => {
    await appendAtlasAudit({
      userId: "u1",
      organizationId: "org-A",
      action: "atlas.chat.create",
    });
    await appendAtlasAudit({
      userId: "u1",
      organizationId: "org-A",
      action: "atlas.chat.delete",
    });

    expect(store.rows).toHaveLength(2);
    expect(store.rows[1].prevHash).toBe(store.rows[0].hash);
    expect(store.rows[1].hash).not.toBe(store.rows[0].hash);
  });

  it("per-org chaining: org B's chain starts fresh", async () => {
    await appendAtlasAudit({
      userId: "u1",
      organizationId: "org-A",
      action: "atlas.chat.create",
    });
    await appendAtlasAudit({
      userId: "u2",
      organizationId: "org-B",
      action: "atlas.chat.create",
    });

    const orgA = store.rows.filter((r) => r.organizationId === "org-A");
    const orgB = store.rows.filter((r) => r.organizationId === "org-B");
    expect(orgA[0].prevHash).toBeNull();
    expect(orgB[0].prevHash).toBeNull();
    expect(orgA[0].hash).not.toBe(orgB[0].hash); // different payloads
  });

  it("system events (null org) chain together on a separate ledger", async () => {
    await appendAtlasAudit({
      userId: null,
      organizationId: null,
      action: "atlas.chat.create",
    });
    await appendAtlasAudit({
      userId: null,
      organizationId: null,
      action: "atlas.chat.delete",
    });

    const sys = store.rows.filter((r) => r.organizationId === null);
    expect(sys).toHaveLength(2);
    expect(sys[1].prevHash).toBe(sys[0].hash);
  });

  it("is fire-and-forget: prisma failure does NOT throw + is logged", async () => {
    store.failNext = true;

    /* If the function throws, the test fails. */
    await expect(
      appendAtlasAudit({
        userId: "u1",
        organizationId: "org-A",
        action: "atlas.chat.create",
      }),
    ).resolves.toBeUndefined();

    /* Logger.error should have been called with the failure. */
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.stringContaining("audit-log"),
      expect.objectContaining({ error: expect.any(String) }),
    );
    /* No row should have been written. */
    expect(store.rows).toHaveLength(0);
  });

  it("includes ipAddress + userAgent + metadata when provided", async () => {
    await appendAtlasAudit({
      userId: "u1",
      organizationId: "org-A",
      action: "atlas.file.upload",
      entityType: "AtlasMandateFile",
      entityId: "file-42",
      metadata: { fileName: "test.pdf", mb: 1.5 },
      ipAddress: "203.0.113.42",
      userAgent: "Mozilla/5.0",
    });

    const row = store.rows[0];
    expect(row.ipAddress).toBe("203.0.113.42");
    expect(row.userAgent).toBe("Mozilla/5.0");
    expect(row.entityType).toBe("AtlasMandateFile");
    expect(row.entityId).toBe("file-42");
    expect(row.metadata).toMatchObject({ fileName: "test.pdf", mb: 1.5 });
  });
});

/* ── verifyAtlasAuditChain ──────────────────────────────────────────── */

describe("verifyAtlasAuditChain", () => {
  it("empty chain → ok: true, total: 0", async () => {
    const result = await verifyAtlasAuditChain("org-empty");
    expect(result.ok).toBe(true);
    expect(result.total).toBe(0);
  });

  it("intact chain after N appends → ok: true, total=N", async () => {
    for (let i = 0; i < 5; i++) {
      await appendAtlasAudit({
        userId: "u1",
        organizationId: "org-A",
        action: "atlas.chat.create",
        entityId: `chat-${i}`,
      });
    }
    const result = await verifyAtlasAuditChain("org-A");
    expect(result.ok).toBe(true);
    expect(result.total).toBe(5);
    expect(result.brokenAt).toBeUndefined();
  });

  it("tampered prevHash → ok: false, brokenAt = tampered row index", async () => {
    for (let i = 0; i < 3; i++) {
      await appendAtlasAudit({
        userId: "u1",
        organizationId: "org-A",
        action: "atlas.chat.create",
      });
    }
    /* Tamper: rewrite row[1]'s prevHash to a wrong value. */
    const orgA = store.rows.filter((r) => r.organizationId === "org-A");
    orgA[1].prevHash = "0".repeat(64);

    const result = await verifyAtlasAuditChain("org-A");
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(1);
  });

  it("tampered metadata (without re-hashing) → ok: false at tampered row", async () => {
    await appendAtlasAudit({
      userId: "u1",
      organizationId: "org-A",
      action: "atlas.chat.create",
      metadata: { original: true },
    });
    await appendAtlasAudit({
      userId: "u1",
      organizationId: "org-A",
      action: "atlas.chat.delete",
    });

    /* Tamper: rewrite metadata on row 0 but keep its hash. */
    const orgA = store.rows.filter((r) => r.organizationId === "org-A");
    orgA[0].metadata = { tampered: true };

    const result = await verifyAtlasAuditChain("org-A");
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(0);
  });

  it("tampered hash on row 0 → ok: false at brokenAt=0", async () => {
    await appendAtlasAudit({
      userId: "u1",
      organizationId: "org-A",
      action: "atlas.chat.create",
    });
    const orgA = store.rows.filter((r) => r.organizationId === "org-A");
    orgA[0].hash = "f".repeat(64);

    const result = await verifyAtlasAuditChain("org-A");
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(0);
  });

  it("hash recomputed from row content matches the stored hash", async () => {
    /* Manual hash verification: rebuild what appendAtlasAudit computed
       and ensure it matches what we stored. Protects against silent
       canonical-format drift. */
    await appendAtlasAudit({
      userId: "u1",
      organizationId: "org-A",
      action: "atlas.chat.create",
      entityId: "chat-x",
    });

    const row = store.rows[0];
    const canonical = JSON.stringify({
      userId: row.userId,
      organizationId: row.organizationId,
      action: row.action,
      entityType: row.entityType ?? null,
      entityId: row.entityId ?? null,
      metadata: row.metadata ?? null,
      timestamp: row.createdAt.toISOString(),
    });
    const expected = crypto
      .createHash("sha256")
      .update((row.prevHash ?? "") + canonical)
      .digest("hex");

    expect(row.hash).toBe(expected);
  });
});
