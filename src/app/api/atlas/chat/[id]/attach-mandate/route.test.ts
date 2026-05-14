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
    /* AUDIT-FIX M4: route now checks for an in-flight stream by
       looking for a recent assistant-message with a streaming-
       placeholder citations sentinel. Test default returns null
       (= no in-flight stream) so existing happy-path assertions
       hold; a dedicated test below covers the 409 case. */
    atlasMessage: {
      findFirst: vi.fn().mockResolvedValue(null),
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

  it("returns 409 when an assistant turn is currently streaming", async () => {
    /* AUDIT-FIX M4: When a chat is mid-stream, atlasMessage.findFirst
       returns the placeholder row → route refuses the attach with a
       STREAM_IN_FLIGHT 409 + friendly message so the UI can re-enable
       the modal once the turn finishes. */
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(prisma.atlasChat.findFirst).mockResolvedValue({
      id: "c1",
    } as never);
    vi.mocked(prisma.atlasMessage.findFirst).mockResolvedValue({
      id: "msg-streaming",
      createdAt: new Date(),
    } as never);

    const res = await POST(mkReq({ mandateId: "m1" }), mkCtx());
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe("STREAM_IN_FLIGHT");
    /* The mandate-existence check should never fire when we bail
       out on the in-flight gate — keeps the path strictly
       auth → ownership → in-flight → mandate. */
    expect(prisma.atlasMandate.findFirst).not.toHaveBeenCalled();
    expect(prisma.atlasChat.update).not.toHaveBeenCalled();
  });

  it("allows detach (mandateId=null) even during an in-flight stream", async () => {
    /* AUDIT-FIX M4: Detach is harmless mid-stream — clearing the
       link can't poison new context into the in-flight turn. So
       the in-flight check is skipped on the null branch. */
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
    expect(prisma.atlasMessage.findFirst).not.toHaveBeenCalled();
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
