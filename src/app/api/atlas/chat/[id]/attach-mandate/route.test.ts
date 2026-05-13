/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests für POST /api/atlas/chat/[id]/attach-mandate — setzt oder
 * löscht chat.mandateId. Verifiziert Auth, Owner-Check (chat),
 * Member-or-Owner-Check (mandate), null-detach.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasChat: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    atlasMandate: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/atlas-auth", () => ({
  getAtlasAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";

const mkReq = (body: unknown) =>
  new Request("http://localhost/api/atlas/chat/c1/attach-mandate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];

const mkCtx = (id = "c1") => ({ params: Promise.resolve({ id }) });

describe("POST /api/atlas/chat/[id]/attach-mandate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue(null);
    const res = await POST(mkReq({ mandateId: "m1" }), mkCtx());
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    const res = await POST(mkReq({ wrong: 123 }), mkCtx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when chat doesn't exist or not owned", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(prisma.atlasChat.findFirst).mockResolvedValue(null);
    const res = await POST(mkReq({ mandateId: "m1" }), mkCtx());
    expect(res.status).toBe(404);
  });

  it("returns 404 when mandate doesn't exist or not accessible", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(prisma.atlasChat.findFirst).mockResolvedValue({
      id: "c1",
    } as never);
    vi.mocked(prisma.atlasMandate.findFirst).mockResolvedValue(null);
    const res = await POST(mkReq({ mandateId: "m1" }), mkCtx());
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error.toLowerCase()).toContain("mandate");
  });

  it("attaches mandate and returns updated chat", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(prisma.atlasChat.findFirst).mockResolvedValue({
      id: "c1",
    } as never);
    vi.mocked(prisma.atlasMandate.findFirst).mockResolvedValue({
      id: "m1",
      name: "Spire 2024",
    } as never);
    vi.mocked(prisma.atlasChat.update).mockResolvedValue({
      id: "c1",
      mandateId: "m1",
      title: "T",
      updatedAt: new Date(),
    } as never);

    const res = await POST(mkReq({ mandateId: "m1" }), mkCtx());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      chat: { id: string; mandateId: string };
    };
    expect(body.ok).toBe(true);
    expect(body.chat.mandateId).toBe("m1");

    expect(prisma.atlasChat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: { mandateId: "m1" },
      }),
    );
  });

  it("detaches when mandateId is null", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(prisma.atlasChat.findFirst).mockResolvedValue({
      id: "c1",
    } as never);
    vi.mocked(prisma.atlasChat.update).mockResolvedValue({
      id: "c1",
      mandateId: null,
      title: "T",
      updatedAt: new Date(),
    } as never);

    const res = await POST(mkReq({ mandateId: null }), mkCtx());
    expect(res.status).toBe(200);
    /* When detaching: skip mandate-existence check entirely */
    expect(prisma.atlasMandate.findFirst).not.toHaveBeenCalled();
    expect(prisma.atlasChat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: { mandateId: null },
      }),
    );
  });
});
