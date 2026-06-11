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

// clientName is stored encrypted (SEC-T0-1); the route decrypts before
// matching. Identity-decrypt keeps fixtures readable.
vi.mock("@/lib/atlas/atlas-encryption", () => ({
  decryptAtlasField: vi.fn(async (v: string | null) => v),
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

  it("two-phase query: DB filters plaintext name only, authz on both phases", async () => {
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

    const calls = vi.mocked(prisma.atlasMandate.findMany).mock.calls;
    expect(calls).toHaveLength(2);

    const authzClause = {
      AND: [
        {
          OR: [{ ownerUserId: "u1" }, { members: { some: { userId: "u1" } } }],
        },
      ],
    };

    // Phase 1 — DB-side match on the PLAINTEXT name column only.
    // clientName is ciphertext (SEC-T0-1): an ILIKE on it can never
    // match, so it must not appear in the DB where-clause.
    const phase1 = calls[0][0]!;
    expect(phase1.where).toMatchObject({
      organizationId: "o1",
      status: "active",
      name: { contains: "spi", mode: "insensitive" },
      ...authzClause,
    });
    expect(phase1.where).not.toHaveProperty("clientName");
    expect(phase1.take).toBe(10);

    // Phase 2 — bounded load of all user-accessible mandates for the
    // in-memory decrypted-clientName match (H16 cap of 200).
    const phase2 = calls[1][0]!;
    expect(phase2.where).toMatchObject({
      organizationId: "o1",
      status: "active",
      ...authzClause,
    });
    expect(phase2.where).not.toHaveProperty("name");
    expect(phase2.take).toBe(200);
  });

  it("finds mandates whose decrypted clientName matches (phase 2)", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    const row = {
      id: "m2",
      name: "Akte 77",
      clientName: "Spire Global",
      updatedAt: new Date("2026-05-12T10:00:00Z"),
    };
    vi.mocked(prisma.atlasMandate.findMany)
      .mockResolvedValueOnce([] as never) // phase 1: no name match
      .mockResolvedValueOnce([row] as never); // phase 2: clientName match
    const res = await GET(mkReq("spire glo"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      mandates: Array<{ id: string; clientName: string | null }>;
    };
    expect(body.mandates).toHaveLength(1);
    expect(body.mandates[0].id).toBe("m2");
    expect(body.mandates[0].clientName).toBe("Spire Global");
  });
});
