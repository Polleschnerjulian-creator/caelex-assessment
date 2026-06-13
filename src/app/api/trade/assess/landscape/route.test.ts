import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/trade/trade-auth", () => ({ getTradeAuth: vi.fn() }));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("id"),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { POST } from "./route";
import { getTradeAuth } from "@/lib/trade/trade-auth";

const auth = getTradeAuth as unknown as ReturnType<typeof vi.fn>;
beforeEach(() => {
  auth.mockReset();
  auth.mockResolvedValue({
    userId: "u1",
    organizationId: "o1",
    role: "MANAGER",
  });
});

describe("POST /api/trade/assess/landscape", () => {
  it("returns GO/REVIEW/BLOCKED buckets for a posted item", async () => {
    const req = new Request("http://t/api/trade/assess/landscape", {
      method: "POST",
      body: JSON.stringify({
        item: { name: "Reaction wheel", description: "AOCS" },
        exporterSeat: "DE",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.caption).toContain("sauberer Endkunde");
    expect(Array.isArray(json.go)).toBe(true);
  });
});
