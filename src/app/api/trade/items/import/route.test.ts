/**
 * Route-gate tests for POST /api/trade/items/import (I1 convention).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/trade/trade-auth", () => ({ getTradeAuth: vi.fn() }));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("test-user"),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { tradeItem: { create: vi.fn().mockResolvedValue({ id: "i1" }) } },
}));

import { POST } from "./route";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { prisma } from "@/lib/prisma";

const managerAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

function makeReq(body?: unknown): Request {
  return new Request("http://localhost/api/trade/items/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  vi.mocked(getTradeAuth).mockReset();
  vi.mocked(prisma.tradeItem.create).mockClear();
});

describe("items/import route gate", () => {
  it("no trade auth → 403", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(null);
    expect((await POST(makeReq())).status).toBe(403);
  });

  it("VIEWER → 403 (write route)", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue({
      ...managerAuth,
      role: "VIEWER" as import("@prisma/client").OrganizationRole,
    });
    expect((await POST(makeReq())).status).toBe(403);
  });

  it("invalid body → 400, never touches the DB", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(managerAuth);
    const res = await POST(makeReq({ rows: [] }));
    expect(res.status).toBe(400);
    expect(vi.mocked(prisma.tradeItem.create)).not.toHaveBeenCalled();
  });

  it("MANAGER imports rows; per-row failures are collected, not fatal", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(managerAuth);
    vi.mocked(prisma.tradeItem.create)
      .mockResolvedValueOnce({ id: "i1" } as never)
      .mockRejectedValueOnce(new Error("boom"));
    const res = await POST(
      makeReq({
        rows: [
          { name: "A", description: "first item" },
          { name: "B", description: "second item" },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      created: number;
      failed: Array<{ name: string; error: string }>;
    };
    expect(json.created).toBe(1);
    expect(json.failed).toHaveLength(1);
    expect(json.failed[0].name).toBe("B");
    // Per-row error must NOT leak the raw exception message ("boom").
    expect(json.failed[0].error).not.toContain("boom");
  });

  it("rejects a non-ISO-2 countryOfOrigin (lowercase) with 400, no DB", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(managerAuth);
    const res = await POST(
      makeReq({
        rows: [{ name: "A", description: "first", countryOfOrigin: "de" }],
      }),
    );
    expect(res.status).toBe(400);
    expect(vi.mocked(prisma.tradeItem.create)).not.toHaveBeenCalled();
  });

  it("rejects a single-char countryOfOrigin with 400, no DB", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(managerAuth);
    const res = await POST(
      makeReq({
        rows: [{ name: "A", description: "first", countryOfOrigin: "D" }],
      }),
    );
    expect(res.status).toBe(400);
    expect(vi.mocked(prisma.tradeItem.create)).not.toHaveBeenCalled();
  });

  it("the 400 body does not leak raw Zod issues", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(managerAuth);
    const res = await POST(makeReq({ rows: [] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).not.toHaveProperty("issues");
    expect(typeof json.error).toBe("string");
  });

  it("accepts a valid uppercase ISO-2 countryOfOrigin (200)", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(managerAuth);
    vi.mocked(prisma.tradeItem.create).mockResolvedValue({ id: "i1" } as never);
    const res = await POST(
      makeReq({
        rows: [{ name: "A", description: "first", countryOfOrigin: "DE" }],
      }),
    );
    expect(res.status).toBe(200);
  });
});
