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
beforeEach(() => auth.mockReset());

function req(body: unknown) {
  return new Request("http://t/suggest-codes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/trade/classify/suggest-codes", () => {
  it("returns 403 when not authenticated/entitled", async () => {
    auth.mockResolvedValue(null);
    expect((await POST(req({ attributes: [] }))).status).toBe(403);
  });

  it("returns 200 with a suggestions array for valid auth", async () => {
    auth.mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
      role: "MANAGER",
    });
    const res = await POST(
      req({
        attributes: [
          { attribute: "apertureMeters", value: 0.8, confidence: "high" },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.suggestions)).toBe(true);
  });

  it("returns 400 on a malformed body (attributes not an array)", async () => {
    auth.mockResolvedValue({
      userId: "u1",
      organizationId: "o1",
      role: "MANAGER",
    });
    expect((await POST(req({ attributes: "nope" }))).status).toBe(400);
  });
});
