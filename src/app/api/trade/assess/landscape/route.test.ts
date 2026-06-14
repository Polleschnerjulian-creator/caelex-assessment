import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/trade/trade-auth", () => ({ getTradeAuth: vi.fn() }));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("id"),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

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

function makeReq(body: unknown): Request {
  return new Request("http://t/api/trade/assess/landscape", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/trade/assess/landscape", () => {
  it("returns GO/REVIEW/BLOCKED buckets for a posted item", async () => {
    const res = await POST(
      makeReq({
        item: { name: "Reaction wheel", description: "AOCS" },
        exporterSeat: "DE",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.caption).toContain("sauberer Endkunde");
    expect(Array.isArray(json.go)).toBe(true);
  });

  it("B14: rejects a non-ISO-2 exporterSeat (lowercase) with 400", async () => {
    const res = await POST(
      makeReq({ item: { name: "Reaction wheel" }, exporterSeat: "de" }),
    );
    expect(res.status).toBe(400);
  });

  it("B14: rejects a malformed exporterSeat (single char) with 400", async () => {
    const res = await POST(
      makeReq({ item: { name: "Reaction wheel" }, exporterSeat: "D" }),
    );
    expect(res.status).toBe(400);
  });

  it("B14: accepts an absent exporterSeat (optional)", async () => {
    const res = await POST(makeReq({ item: { name: "Reaction wheel" } }));
    expect(res.status).toBe(200);
  });

  it("B14: the 400 body does not leak raw Zod issues", async () => {
    const res = await POST(makeReq({ item: { name: "" }, exporterSeat: "de" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).not.toHaveProperty("issues");
    expect(typeof json.error).toBe("string");
  });
});
