/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests für GET /api/atlas/mandate/search — typeahead used by the
 * MandateAttachModal. Org-scoped, member-aware, prefix-match auf
 * name + clientName, max 10 results.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasMandate: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/atlas-auth", () => ({
  getAtlasAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi
    .fn()
    .mockResolvedValue({ success: true, reset: Date.now() + 60000 }),
  getIdentifier: vi.fn().mockReturnValue("test-id"),
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit } from "@/lib/ratelimit";

const mkReq = (q: string) =>
  new Request(
    `http://localhost/api/atlas/mandate/search?q=${encodeURIComponent(q)}`,
  ) as unknown as Parameters<typeof GET>[0];

describe("GET /api/atlas/mandate/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      reset: Date.now() + 60000,
    } as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue(null);
    const res = await GET(mkReq("spi"));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      success: false,
      reset: Date.now() + 30_000,
    } as never);
    const res = await GET(mkReq("spi"));
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string; retryAfterMs: number };
    expect(body.error).toBe("Rate limit exceeded");
    expect(body.retryAfterMs).toBeGreaterThan(0);
  });

  it("returns empty list when query < 1 char (no broad searches)", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    const res = await GET(mkReq(""));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { mandates: unknown[] };
    expect(body.mandates).toEqual([]);
    expect(prisma.atlasMandate.findMany).not.toHaveBeenCalled();
  });

  it("queries prisma with org-scope + member-or-owner clause + prefix match", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(prisma.atlasMandate.findMany).mockResolvedValue([
      {
        id: "m1",
        name: "Spire 2024",
        clientName: "Spire Global",
        updatedAt: new Date("2026-05-12T10:00:00Z"),
      },
    ] as never);
    const res = await GET(mkReq("spi"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      mandates: Array<{ id: string; name: string }>;
    };
    expect(body.mandates).toHaveLength(1);
    expect(body.mandates[0].name).toBe("Spire 2024");

    const call = vi.mocked(prisma.atlasMandate.findMany).mock.calls[0][0]!;
    expect(call.where).toMatchObject({
      organizationId: "o1",
      status: "active",
      OR: expect.arrayContaining([
        { name: { contains: "spi", mode: "insensitive" } },
        { clientName: { contains: "spi", mode: "insensitive" } },
      ]),
    });
    expect(call.take).toBe(10);
  });
});
