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

const {
  mockGetLatestHash,
  mockAuditLogFindMany,
  mockAnchorCreate,
  mockAnchorFindUnique,
  mockAnchorFindMany,
  mockAnchorUpdate,
} = vi.hoisted(() => ({
  mockGetLatestHash: vi.fn(),
  mockAuditLogFindMany: vi.fn(),
  mockAnchorCreate: vi.fn(),
  mockAnchorFindUnique: vi.fn(),
  mockAnchorFindMany: vi.fn(),
  mockAnchorUpdate: vi.fn(),
}));

vi.mock("./audit-hash.server", () => ({
  getLatestHash: mockGetLatestHash,
}));

vi.mock("./prisma", () => ({
  prisma: {
    auditLog: { findMany: mockAuditLogFindMany },
    auditTimestampAnchor: {
      create: mockAnchorCreate,
      findUnique: mockAnchorFindUnique,
      findMany: mockAnchorFindMany,
      update: mockAnchorUpdate,
    },
  },
}));

vi.mock("./logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  submitAuditAnchor,
  submitAuditAnchorsForAllActiveOrgs,
  upgradeAuditAnchor,
  upgradeAllPendingAnchors,
  UPGRADE_AGE_THRESHOLD_MS,
  UPGRADE_GIVE_UP_MS,
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

// ─── upgradeAuditAnchor ──────────────────────────────────────────────────

describe("upgradeAuditAnchor — single-anchor lifecycle", () => {
  const NOW = new Date("2026-05-02T12:00:00.000Z");

  function makePending(
    overrides: Partial<{ submittedAt: Date; status: string }> = {},
  ) {
    return {
      id: "anchor_1",
      anchorHash: "deadbeef",
      calendarUrl: "https://cal.test",
      status: "PENDING",
      submittedAt: new Date(NOW.getTime() - 8 * 3600 * 1000), // 8h ago by default
      ...overrides,
    };
  }

  it("UPGRADED — calendar returns proof bytes; row updated to UPGRADED", async () => {
    mockAnchorFindUnique.mockResolvedValue(makePending());
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => new Uint8Array([0x55, 0x66, 0x77, 0x88]).buffer,
    })) as unknown as typeof fetch;

    const out = await upgradeAuditAnchor("anchor_1", { fetchImpl, now: NOW });
    expect(out.status).toBe("UPGRADED");
    if (out.status === "UPGRADED") expect(out.proofBytes).toBe(4);
    expect(mockAnchorUpdate).toHaveBeenCalledOnce();
    const updateArgs = mockAnchorUpdate.mock.calls[0][0] as {
      where: { id: string };
      data: { status: string; upgradedAt: Date };
    };
    expect(updateArgs.where.id).toBe("anchor_1");
    expect(updateArgs.data.status).toBe("UPGRADED");
    expect(updateArgs.data.upgradedAt).toEqual(NOW);
  });

  it("STILL_PENDING — calendar returns 404; row left alone", async () => {
    mockAnchorFindUnique.mockResolvedValue(makePending());
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
      arrayBuffer: async () => new ArrayBuffer(0),
    })) as unknown as typeof fetch;

    const out = await upgradeAuditAnchor("anchor_1", { fetchImpl, now: NOW });
    expect(out.status).toBe("STILL_PENDING");
    expect(mockAnchorUpdate).not.toHaveBeenCalled();
  });

  it("ERROR — calendar returns 5xx; row left alone for next tick retry", async () => {
    mockAnchorFindUnique.mockResolvedValue(makePending());
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      arrayBuffer: async () => new ArrayBuffer(0),
    })) as unknown as typeof fetch;

    const out = await upgradeAuditAnchor("anchor_1", { fetchImpl, now: NOW });
    expect(out.status).toBe("ERROR");
    expect(mockAnchorUpdate).not.toHaveBeenCalled();
  });

  it("ERROR — fetch rejects; row left alone for retry", async () => {
    mockAnchorFindUnique.mockResolvedValue(makePending());
    const fetchImpl = vi.fn(async () => {
      throw new Error("ETIMEDOUT");
    }) as unknown as typeof fetch;

    const out = await upgradeAuditAnchor("anchor_1", { fetchImpl, now: NOW });
    expect(out.status).toBe("ERROR");
    if (out.status === "ERROR") expect(out.error).toMatch(/ETIMEDOUT/);
    expect(mockAnchorUpdate).not.toHaveBeenCalled();
  });

  it("ERROR — calendar returns empty body on 200", async () => {
    mockAnchorFindUnique.mockResolvedValue(makePending());
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(0),
    })) as unknown as typeof fetch;

    const out = await upgradeAuditAnchor("anchor_1", { fetchImpl, now: NOW });
    expect(out.status).toBe("ERROR");
    if (out.status === "ERROR") expect(out.error).toMatch(/empty proof/);
    expect(mockAnchorUpdate).not.toHaveBeenCalled();
  });

  it("GAVE_UP — anchor older than UPGRADE_GIVE_UP_MS; row marked FAILED", async () => {
    mockAnchorFindUnique.mockResolvedValue(
      makePending({
        submittedAt: new Date(NOW.getTime() - UPGRADE_GIVE_UP_MS - 1000),
      }),
    );
    const fetchImpl = vi.fn() as unknown as typeof fetch;

    const out = await upgradeAuditAnchor("anchor_1", { fetchImpl, now: NOW });
    expect(out.status).toBe("GAVE_UP");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(mockAnchorUpdate).toHaveBeenCalledOnce();
    const args = mockAnchorUpdate.mock.calls[0][0] as {
      data: { status: string; errorMessage: string };
    };
    expect(args.data.status).toBe("FAILED");
    expect(args.data.errorMessage).toMatch(/give-up/);
  });

  it("ERROR — anchor not found", async () => {
    mockAnchorFindUnique.mockResolvedValue(null);
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const out = await upgradeAuditAnchor("ghost", { fetchImpl, now: NOW });
    expect(out.status).toBe("ERROR");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("ERROR — anchor already UPGRADED (programming bug guard)", async () => {
    mockAnchorFindUnique.mockResolvedValue(makePending({ status: "UPGRADED" }));
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const out = await upgradeAuditAnchor("anchor_1", { fetchImpl, now: NOW });
    expect(out.status).toBe("ERROR");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("strips trailing slashes from calendarUrl when building the upgrade URL", async () => {
    mockAnchorFindUnique.mockResolvedValue(
      makePending() as unknown as { calendarUrl: string },
    );
    // Override the URL to include trailing slashes
    mockAnchorFindUnique.mockResolvedValue({
      ...makePending(),
      calendarUrl: "https://cal.test///",
    });
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
    })) as unknown as typeof fetch;
    await upgradeAuditAnchor("anchor_1", { fetchImpl, now: NOW });
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      "https://cal.test/timestamp/deadbeef",
    );
  });
});

// ─── upgradeAllPendingAnchors ────────────────────────────────────────────

describe("upgradeAllPendingAnchors — batch walker", () => {
  const NOW = new Date("2026-05-02T12:00:00.000Z");

  it("queries PENDING anchors older than UPGRADE_AGE_THRESHOLD_MS", async () => {
    mockAnchorFindMany.mockResolvedValue([]);
    await upgradeAllPendingAnchors({ now: NOW });
    expect(mockAnchorFindMany).toHaveBeenCalledOnce();
    const args = mockAnchorFindMany.mock.calls[0][0] as {
      where: { status: string; submittedAt: { lte: Date } };
      take: number;
    };
    expect(args.where.status).toBe("PENDING");
    expect(args.where.submittedAt.lte.getTime()).toBe(
      NOW.getTime() - UPGRADE_AGE_THRESHOLD_MS,
    );
    expect(args.take).toBe(200);
  });

  it("aggregates upgrade outcomes across multiple anchors", async () => {
    mockAnchorFindMany.mockResolvedValue([
      { id: "a1" },
      { id: "a2" },
      { id: "a3" },
      { id: "a4" },
    ]);
    // Anchor row lookups always succeed; per-call fetch behaviour
    // controlled by the call counter.
    let call = 0;
    mockAnchorFindUnique.mockImplementation(async () => ({
      id: `a${call + 1}`,
      anchorHash: "h",
      calendarUrl: "https://cal.test",
      status: "PENDING",
      submittedAt: new Date(NOW.getTime() - 8 * 3600 * 1000),
    }));
    const responses: Array<Partial<Response>> = [
      // a1 → UPGRADED
      {
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1, 2]).buffer,
      },
      // a2 → STILL_PENDING (404)
      {
        ok: false,
        status: 404,
        statusText: "Not Found",
        arrayBuffer: async () => new ArrayBuffer(0),
      },
      // a3 → ERROR (5xx)
      {
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        arrayBuffer: async () => new ArrayBuffer(0),
      },
      // a4 → UPGRADED
      {
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([9]).buffer,
      },
    ];
    const fetchImpl = vi.fn(async () => {
      const r = responses[call];
      call += 1;
      return r as Response;
    }) as unknown as typeof fetch;

    const result = await upgradeAllPendingAnchors({ fetchImpl, now: NOW });
    expect(result).toEqual({
      scanned: 4,
      upgraded: 2,
      stillPending: 1,
      gaveUp: 0,
      errored: 1,
    });
  });

  it("returns zeros when no candidates", async () => {
    mockAnchorFindMany.mockResolvedValue([]);
    const result = await upgradeAllPendingAnchors({ now: NOW });
    expect(result).toEqual({
      scanned: 0,
      upgraded: 0,
      stillPending: 0,
      gaveUp: 0,
      errored: 0,
    });
  });
});
