/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Gate-Tests für POST /api/atlas/mandate/[id]/conflicts/clear —
 * dokumentierte Konflikt-Freigabe. Pinnt: Membership-Gate, Begründungs-
 * Pflicht bei high-Severity (Berufsrecht), Org-Verifikation des
 * matched-Mandats (kein Fremd-Tenant-Inject).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/atlas-auth", () => ({
  getAtlasAuth: vi.fn(),
}));

vi.mock("@/lib/atlas/mandate-membership", () => ({
  checkMandateMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasMandate: { findFirst: vi.fn() },
    atlasConflictClearance: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { POST } from "./route";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkMandateMembership } from "@/lib/atlas/mandate-membership";
import { prisma } from "@/lib/prisma";

const VALID_BODY = {
  matchedMandateId: "m2",
  normalizedName: "spire global",
  severity: "medium",
};

const mkReq = (body: unknown) =>
  new Request("http://localhost/api/atlas/mandate/m1/conflicts/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
const mkCtx = (id = "m1") => ({ params: Promise.resolve({ id }) });

function authAsMember() {
  vi.mocked(getAtlasAuth).mockResolvedValue({
    userId: "u1",
    organizationId: "o1",
  } as never);
  vi.mocked(checkMandateMembership).mockResolvedValue(true);
}

describe("POST /api/atlas/mandate/[id]/conflicts/clear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue(null);
    const res = await POST(mkReq(VALID_BODY), mkCtx());
    expect(res.status).toBe(401);
  });

  it("returns 403 without mandate membership", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(checkMandateMembership).mockResolvedValue(false);
    const res = await POST(mkReq(VALID_BODY), mkCtx());
    expect(res.status).toBe(403);
    expect(prisma.atlasConflictClearance.upsert).not.toHaveBeenCalled();
  });

  it("returns 400 when a high-severity clearance has no justification", async () => {
    authAsMember();
    const res = await POST(
      mkReq({ ...VALID_BODY, severity: "high", reason: "   " }),
      mkCtx(),
    );
    expect(res.status).toBe(400);
    expect(prisma.atlasConflictClearance.upsert).not.toHaveBeenCalled();
  });

  it("returns 400 on schema-invalid body", async () => {
    authAsMember();
    const res = await POST(
      mkReq({ matchedMandateId: "", severity: "nope" }),
      mkCtx(),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when the matched mandate is not in the caller's org", async () => {
    authAsMember();
    vi.mocked(prisma.atlasMandate.findFirst).mockResolvedValue(null);
    const res = await POST(mkReq(VALID_BODY), mkCtx());
    expect(res.status).toBe(404);
    // Tenant guard: lookup must be org-scoped, not a bare id lookup.
    const where = vi.mocked(prisma.atlasMandate.findFirst).mock.calls[0][0]!
      .where as Record<string, unknown>;
    expect(where).toMatchObject({ id: "m2", organizationId: "o1" });
    expect(prisma.atlasConflictClearance.upsert).not.toHaveBeenCalled();
  });

  it("records the clearance for a member (org-stamped, caller-stamped)", async () => {
    authAsMember();
    vi.mocked(prisma.atlasMandate.findFirst).mockResolvedValue({
      id: "m2",
    } as never);
    vi.mocked(prisma.atlasConflictClearance.upsert).mockResolvedValue({
      id: "c1",
    } as never);
    const res = await POST(
      mkReq({
        ...VALID_BODY,
        severity: "high",
        reason: "Beide Mandanten haben schriftlich eingewilligt.",
      }),
      mkCtx(),
    );
    expect(res.status).toBe(200);
    const args = vi.mocked(prisma.atlasConflictClearance.upsert).mock
      .calls[0][0]!;
    expect(args.create).toMatchObject({
      organizationId: "o1",
      mandateId: "m1",
      matchedMandateId: "m2",
      normalizedName: "spire global",
      severity: "high",
      clearedByUserId: "u1",
    });
  });
});
