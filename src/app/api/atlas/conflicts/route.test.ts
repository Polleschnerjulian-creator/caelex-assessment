/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Gate-Tests für GET /api/atlas/conflicts — firm-weite Konflikt-Sicht.
 * Pinnt: Auth-Gate, Rate-Limit, und dass die Route das IDOR-bewusste
 * Ergebnis von detectConflictsFirmWide unverändert durchreicht
 * (Detail-Gruppen nur für zugängliche Mandate; org-weiter Zähler).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/atlas-auth", () => ({
  getAtlasAuth: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("test-id"),
}));

vi.mock("@/lib/atlas/conflict-check-detect.server", () => ({
  detectConflictsFirmWide: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { detectConflictsFirmWide } from "@/lib/atlas/conflict-check-detect.server";

const mkReq = () =>
  new Request("http://localhost/api/atlas/conflicts") as never;

describe("GET /api/atlas/conflicts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
      limit: 100,
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue(null);
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
    expect(detectConflictsFirmWide).not.toHaveBeenCalled();
  });

  it("returns 429 when rate-limited", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
      limit: 100,
    });
    const res = await GET(mkReq());
    expect(res.status).toBe(429);
    expect(detectConflictsFirmWide).not.toHaveBeenCalled();
  });

  it("passes the firm-wide result through (caller-scoped groups + org-wide counter)", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    const result = {
      groups: [
        {
          mandateId: "m1",
          mandateName: "Akte 7",
          conflicts: [{ severity: "high" }],
        },
      ],
      // Higher than the visible groups — walled-off mandates count but
      // never surface details.
      totalOpenConflicts: 3,
    };
    vi.mocked(detectConflictsFirmWide).mockResolvedValue(result as never);
    const res = await GET(mkReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(detectConflictsFirmWide).toHaveBeenCalledWith({
      orgId: "o1",
      callerUserId: "u1",
    });
  });

  it("returns 500 with a generic message when the scan throws", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
    } as never);
    vi.mocked(detectConflictsFirmWide).mockRejectedValue(new Error("boom"));
    const res = await GET(mkReq());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Failed to detect conflicts");
  });
});
