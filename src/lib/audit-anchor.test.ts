/**
 * Tests for src/lib/audit-anchor.server.ts.
 *
 * Coverage:
 *
 *   1. submitAuditAnchor digests the chain-head hash via SHA-256
 *   2. Calls each calendar's /digest endpoint with the raw 32-byte digest
 *   3. Stores PENDING rows for successful calendars
 *   4. Stores FAILED rows for calendars that error
 *   5. Stores FAILED rows for calendars that return non-OK status
 *   6. Stores FAILED rows for calendars that return empty proof
 *   7. Default calendars list is used when no override provided
 *   8. submitAuditAnchorsForAllActiveOrgs walks distinct orgIds
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetLatestHash, mockAuditLogFindMany, mockAnchorCreate } =
  vi.hoisted(() => ({
    mockGetLatestHash: vi.fn(),
    mockAuditLogFindMany: vi.fn(),
    mockAnchorCreate: vi.fn(),
  }));

vi.mock("./audit-hash.server", () => ({
  getLatestHash: mockGetLatestHash,
}));

vi.mock("./prisma", () => ({
  prisma: {
    auditLog: { findMany: mockAuditLogFindMany },
    auditTimestampAnchor: { create: mockAnchorCreate },
  },
}));

vi.mock("./logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  submitAuditAnchor,
  submitAuditAnchorsForAllActiveOrgs,
  DEFAULT_OTS_CALENDARS,
} from "./audit-anchor.server";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLatestHash.mockResolvedValue("abc123");
  mockAnchorCreate.mockImplementation(async ({ data }: { data: unknown }) => {
    return {
      id: `anchor_${Math.random().toString(36).slice(2, 8)}`,
      ...((data as object) ?? {}),
    };
  });
});

// ─── submitAuditAnchor ────────────────────────────────────────────────────

describe("submitAuditAnchor — digest + calendar fan-out", () => {
  it("posts a 32-byte SHA-256 digest to each calendar's /digest endpoint", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer,
    })) as unknown as typeof fetch;
    await submitAuditAnchor("org_1", {
      calendars: ["https://calendar-1.test", "https://calendar-2.test"],
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstCall = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(firstCall[0]).toBe("https://calendar-1.test/digest");
    const init = firstCall[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/octet-stream",
    });
    // Body is the 32-byte raw SHA-256 of the chain head hex string.
    const body = init.body as Buffer;
    expect(body.length).toBe(32);
  });

  it("strips trailing slashes from calendar URLs before appending /digest", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([0x01]).buffer,
    })) as unknown as typeof fetch;
    await submitAuditAnchor("org_1", {
      calendars: ["https://calendar.test///"],
      fetchImpl,
    });
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      "https://calendar.test/digest",
    );
  });

  it("creates PENDING anchor rows for successful calendars", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([0xab, 0xcd, 0xef, 0x12]).buffer,
    })) as unknown as typeof fetch;
    const result = await submitAuditAnchor("org_1", {
      calendars: ["https://c1.test", "https://c2.test"],
      fetchImpl,
    });
    expect(result.anchors).toHaveLength(2);
    expect(result.anchors.every((a) => a.status === "PENDING")).toBe(true);
    expect(mockAnchorCreate).toHaveBeenCalledTimes(2);
    const writtenStatuses = mockAnchorCreate.mock.calls.map(
      (c) => (c[0] as { data: { status: string } }).data.status,
    );
    expect(writtenStatuses).toEqual(["PENDING", "PENDING"]);
  });

  it("creates FAILED rows when fetch rejects", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const result = await submitAuditAnchor("org_1", {
      calendars: ["https://broken.test"],
      fetchImpl,
    });
    expect(result.anchors[0].status).toBe("FAILED");
    expect(result.anchors[0].error).toMatch(/ECONNREFUSED/);
    const written = mockAnchorCreate.mock.calls[0][0] as {
      data: { status: string; errorMessage?: string };
    };
    expect(written.data.status).toBe("FAILED");
    expect(written.data.errorMessage).toMatch(/ECONNREFUSED/);
  });

  it("creates FAILED rows when calendar returns non-OK status", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      arrayBuffer: async () => new ArrayBuffer(0),
    })) as unknown as typeof fetch;
    const result = await submitAuditAnchor("org_1", {
      calendars: ["https://overloaded.test"],
      fetchImpl,
    });
    expect(result.anchors[0].status).toBe("FAILED");
    expect(result.anchors[0].error).toMatch(/503/);
  });

  it("creates FAILED rows when calendar returns empty proof", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    })) as unknown as typeof fetch;
    const result = await submitAuditAnchor("org_1", {
      calendars: ["https://empty.test"],
      fetchImpl,
    });
    expect(result.anchors[0].status).toBe("FAILED");
    expect(result.anchors[0].error).toMatch(/empty proof/);
  });

  it("uses DEFAULT_OTS_CALENDARS when no override provided", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([0x01]).buffer,
    })) as unknown as typeof fetch;
    await submitAuditAnchor("org_1", { fetchImpl });
    const callUrls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0] as string,
    );
    expect(callUrls).toHaveLength(DEFAULT_OTS_CALENDARS.length);
    for (const c of DEFAULT_OTS_CALENDARS) {
      expect(callUrls).toContain(`${c}/digest`);
    }
  });

  it("anchorHash is hex SHA-256 of the chain head", async () => {
    mockGetLatestHash.mockResolvedValue("test-head");
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([0x01]).buffer,
    })) as unknown as typeof fetch;
    await submitAuditAnchor("org_1", {
      calendars: ["https://c.test"],
      fetchImpl,
    });
    const call = mockAnchorCreate.mock.calls[0][0] as {
      data: { anchorHash: string };
    };
    // Independently compute SHA-256("test-head") hex
    const { createHash } = await import("crypto");
    const expected = createHash("sha256")
      .update("test-head", "utf8")
      .digest("hex");
    expect(call.data.anchorHash).toBe(expected);
  });
});

// ─── submitAuditAnchorsForAllActiveOrgs ───────────────────────────────────

describe("submitAuditAnchorsForAllActiveOrgs", () => {
  it("walks distinct organizationIds returned by the audit-log query", async () => {
    mockAuditLogFindMany.mockResolvedValue([
      { organizationId: "org_a" },
      { organizationId: "org_b" },
      { organizationId: null }, // skipped
    ]);
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([0x01]).buffer,
    })) as unknown as typeof fetch;
    const results = await submitAuditAnchorsForAllActiveOrgs({
      calendars: ["https://c.test"],
      fetchImpl,
    });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.organizationId)).toEqual(["org_a", "org_b"]);
  });

  it("returns [] when no orgs have any audit log entries", async () => {
    mockAuditLogFindMany.mockResolvedValue([]);
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const results = await submitAuditAnchorsForAllActiveOrgs({
      calendars: ["https://c.test"],
      fetchImpl,
    });
    expect(results).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
