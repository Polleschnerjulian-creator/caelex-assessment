/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Gate-Tests für GET /api/atlas/mandate/[id]/conflicts — per-Mandat
 * Konflikt-Scan. Pinnt die IDOR-Konvention: Mandats-MEMBERSHIP (owner
 * oder member), nicht bloß Org-Zugehörigkeit.
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

vi.mock("@/lib/atlas/conflict-check-detect.server", () => ({
  detectConflicts: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkMandateMembership } from "@/lib/atlas/mandate-membership";
import { detectConflicts } from "@/lib/atlas/conflict-check-detect.server";

const mkReq = () =>
  new Request("http://localhost/api/atlas/mandate/m1/conflicts") as never;
const mkCtx = (id = "m1") => ({ params: Promise.resolve({ id }) });

describe("GET /api/atlas/mandate/[id]/conflicts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue(null);
    const res = await GET(mkReq(), mkCtx());
    expect(res.status).toBe(401);
    expect(detectConflicts).not.toHaveBeenCalled();
  });

  it("returns 403 without mandate membership (org alone is NOT enough)", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(checkMandateMembership).mockResolvedValue(false);
    const res = await GET(mkReq(), mkCtx());
    expect(res.status).toBe(403);
    expect(checkMandateMembership).toHaveBeenCalledWith("m1", "u1", "o1");
    expect(detectConflicts).not.toHaveBeenCalled();
  });

  it("returns the live-computed conflicts for a member", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(checkMandateMembership).mockResolvedValue(true);
    const match = {
      newPartyId: "p1",
      newPartyName: "Spire Global",
      newPartyType: "opponent",
      matchedPartyId: "p9",
      matchedPartyName: "Spire Global",
      matchedPartyType: "client",
      matchedMandateId: "m2",
      matchedMandateName: "Akte 12",
      normalizedName: "spire global",
      severity: "high",
    };
    vi.mocked(detectConflicts).mockResolvedValue([match] as never);
    const res = await GET(mkReq(), mkCtx());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { conflicts: unknown[] };
    expect(body.conflicts).toEqual([match]);
    expect(detectConflicts).toHaveBeenCalledWith({
      orgId: "o1",
      mandateId: "m1",
      callerUserId: "u1",
    });
  });

  it("returns 500 with a generic message when detection throws", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(checkMandateMembership).mockResolvedValue(true);
    vi.mocked(detectConflicts).mockRejectedValue(new Error("db down"));
    const res = await GET(mkReq(), mkCtx());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    // Generic error only — no internal details leak to the client.
    expect(body.error).toBe("Failed to detect conflicts");
  });
});
