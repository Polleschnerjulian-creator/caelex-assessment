/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests für PATCH + DELETE /api/atlas/mandate/[id]/time-entries/[entryId].
 * Pinnt die Auth-Konvention der Geschwister-Routen: getAtlasAuth → 401,
 * checkMandateMembership → 403, Zod → 400, org-scoped findFirst auf den
 * Entry → 404, Happy-Path → 200.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasTimeEntry: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/atlas-auth", () => ({
  getAtlasAuth: vi.fn(),
}));

vi.mock("@/lib/atlas/mandate-membership", () => ({
  checkMandateMembership: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 99,
    reset: Date.now() + 60_000,
  }),
  getIdentifier: () => "ip:test|user:u1",
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { PATCH, DELETE } from "./route";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkMandateMembership } from "@/lib/atlas/mandate-membership";

const mkPatchReq = (body: unknown) =>
  new Request("http://localhost/api/atlas/mandate/m1/time-entries/e1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0];

const mkDeleteReq = () =>
  new Request("http://localhost/api/atlas/mandate/m1/time-entries/e1", {
    method: "DELETE",
  }) as unknown as Parameters<typeof DELETE>[0];

const mkCtx = (id = "m1", entryId = "e1") => ({
  params: Promise.resolve({ id, entryId }),
});

const AUTH_OK = { userId: "u1", organizationId: "o1" } as never;

const ENTRY_ROW = {
  id: "e1",
  minutes: 90,
  description: "Schriftsatz überarbeitet",
  billable: true,
  hourlyRateEur: 280,
  workedOn: new Date("2026-06-10T00:00:00.000Z"),
  chatId: null,
  createdAt: new Date("2026-06-10T08:00:00.000Z"),
  user: { id: "u1", name: "Test User", email: "test@example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAtlasAuth).mockResolvedValue(AUTH_OK);
  vi.mocked(checkMandateMembership).mockResolvedValue(true);
  vi.mocked(prisma.atlasTimeEntry.findFirst).mockResolvedValue({
    id: "e1",
  } as never);
  vi.mocked(prisma.atlasTimeEntry.update).mockResolvedValue(ENTRY_ROW as never);
  vi.mocked(prisma.atlasTimeEntry.delete).mockResolvedValue(ENTRY_ROW as never);
});

/* ── PATCH ───────────────────────────────────────────────────────────── */

describe("PATCH /api/atlas/mandate/[id]/time-entries/[entryId]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue(null);
    const res = await PATCH(mkPatchReq({ minutes: 60 }), mkCtx());
    expect(res.status).toBe(401);
    expect(prisma.atlasTimeEntry.update).not.toHaveBeenCalled();
  });

  it("returns 403 without mandate membership (org alone is NOT enough)", async () => {
    vi.mocked(checkMandateMembership).mockResolvedValue(false);
    const res = await PATCH(mkPatchReq({ minutes: 60 }), mkCtx());
    expect(res.status).toBe(403);
    expect(checkMandateMembership).toHaveBeenCalledWith("m1", "u1", "o1");
    expect(prisma.atlasTimeEntry.findFirst).not.toHaveBeenCalled();
    expect(prisma.atlasTimeEntry.update).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await PATCH(mkPatchReq("{not json"), mkCtx());
    expect(res.status).toBe(400);
    expect(prisma.atlasTimeEntry.update).not.toHaveBeenCalled();
  });

  it("returns 400 when Zod rejects the body (minutes out of range)", async () => {
    const res = await PATCH(mkPatchReq({ minutes: 0 }), mkCtx());
    expect(res.status).toBe(400);
    expect(prisma.atlasTimeEntry.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the entry is outside the caller's reach", async () => {
    vi.mocked(prisma.atlasTimeEntry.findFirst).mockResolvedValue(null);
    const res = await PATCH(mkPatchReq({ minutes: 60 }), mkCtx());
    expect(res.status).toBe(404);
    expect(prisma.atlasTimeEntry.update).not.toHaveBeenCalled();
  });

  it("scopes the entry lookup by org + mandate membership", async () => {
    await PATCH(mkPatchReq({ minutes: 60 }), mkCtx());
    expect(prisma.atlasTimeEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "e1",
          mandateId: "m1",
          mandate: expect.objectContaining({
            organizationId: "o1",
            OR: [
              { ownerUserId: "u1" },
              { members: { some: { userId: "u1" } } },
            ],
          }),
        }),
      }),
    );
  });

  it("updates the provided fields and returns the entry (happy path)", async () => {
    const res = await PATCH(
      mkPatchReq({
        minutes: 45,
        description: "Korrigiert",
        billable: false,
        hourlyRateEur: null,
        workedOn: "2026-06-09T00:00:00.000Z",
      }),
      mkCtx(),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entry: { id: string } };
    expect(body.entry.id).toBe("e1");
    expect(prisma.atlasTimeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "e1" },
        data: {
          minutes: 45,
          description: "Korrigiert",
          billable: false,
          hourlyRateEur: null,
          workedOn: new Date("2026-06-09T00:00:00.000Z"),
        },
      }),
    );
  });

  it("omits fields that are not part of the patch (partial mirror)", async () => {
    await PATCH(mkPatchReq({ minutes: 30 }), mkCtx());
    const call = vi.mocked(prisma.atlasTimeEntry.update).mock.calls[0][0];
    expect(call.data).toEqual({ minutes: 30 });
  });

  it("returns 500 with a generic message when the update throws", async () => {
    vi.mocked(prisma.atlasTimeEntry.update).mockRejectedValue(
      new Error("db down"),
    );
    const res = await PATCH(mkPatchReq({ minutes: 60 }), mkCtx());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Update failed");
  });
});

/* ── DELETE ──────────────────────────────────────────────────────────── */

describe("DELETE /api/atlas/mandate/[id]/time-entries/[entryId]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue(null);
    const res = await DELETE(mkDeleteReq(), mkCtx());
    expect(res.status).toBe(401);
    expect(prisma.atlasTimeEntry.delete).not.toHaveBeenCalled();
  });

  it("returns 403 without mandate membership", async () => {
    vi.mocked(checkMandateMembership).mockResolvedValue(false);
    const res = await DELETE(mkDeleteReq(), mkCtx());
    expect(res.status).toBe(403);
    expect(prisma.atlasTimeEntry.findFirst).not.toHaveBeenCalled();
    expect(prisma.atlasTimeEntry.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when the entry is outside the caller's reach", async () => {
    vi.mocked(prisma.atlasTimeEntry.findFirst).mockResolvedValue(null);
    const res = await DELETE(mkDeleteReq(), mkCtx());
    expect(res.status).toBe(404);
    expect(prisma.atlasTimeEntry.delete).not.toHaveBeenCalled();
  });

  it("deletes the entry and returns ok (happy path)", async () => {
    const res = await DELETE(mkDeleteReq(), mkCtx());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(prisma.atlasTimeEntry.delete).toHaveBeenCalledWith({
      where: { id: "e1" },
    });
  });

  it("returns 500 with a generic message when the delete throws", async () => {
    vi.mocked(prisma.atlasTimeEntry.delete).mockRejectedValue(
      new Error("db down"),
    );
    const res = await DELETE(mkDeleteReq(), mkCtx());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Delete failed");
  });
});
