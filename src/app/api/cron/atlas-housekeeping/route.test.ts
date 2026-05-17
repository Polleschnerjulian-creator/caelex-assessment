import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasAgentRun: {
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const mockUpdateMany = vi.mocked(prisma.atlasAgentRun.updateMany);

const buildReq = (auth?: string) =>
  new Request("http://localhost/api/cron/atlas-housekeeping", {
    method: "GET",
    headers: auth ? { authorization: auth } : {},
  }) as never;

describe("GET /api/cron/atlas-housekeeping (E4+E5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects without CRON_SECRET bearer", async () => {
    const res = await GET(buildReq());
    expect(res.status).toBe(401);
  });

  it("rejects with wrong bearer", async () => {
    const res = await GET(buildReq("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("runs both jobs sequentially when authed", async () => {
    mockUpdateMany
      .mockResolvedValueOnce({ count: 47 } as never)
      .mockResolvedValueOnce({ count: 3 } as never);

    const res = await GET(buildReq("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.conversationStateWiped).toBe(47);
    expect(body.awaitingApprovalAbandoned).toBe(3);
    expect(mockUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("E4 cutoff is 30 days back", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 } as never);
    await GET(buildReq("Bearer test-secret"));
    const firstCall = mockUpdateMany.mock.calls[0][0];
    const where = firstCall.where as { startedAt: { lt: Date } };
    const cutoff = where.startedAt.lt;
    const daysDiff = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysDiff).toBeGreaterThan(29.9);
    expect(daysDiff).toBeLessThan(30.1);
  });

  it("E5 cutoff is 7 days back AND status=awaiting_approval", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 } as never);
    await GET(buildReq("Bearer test-secret"));
    const secondCall = mockUpdateMany.mock.calls[1][0];
    const where = secondCall.where as {
      status: string;
      startedAt: { lt: Date };
    };
    expect(where.status).toBe("awaiting_approval");
    const cutoff = where.startedAt.lt;
    const daysDiff = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysDiff).toBeGreaterThan(6.9);
    expect(daysDiff).toBeLessThan(7.1);
  });

  it("handles E4 failure gracefully and still runs E5", async () => {
    mockUpdateMany
      .mockRejectedValueOnce(new Error("E4 DB error"))
      .mockResolvedValueOnce({ count: 5 } as never);

    const res = await GET(buildReq("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversationStateWiped).toBe(0);
    expect(body.awaitingApprovalAbandoned).toBe(5);
  });
});
