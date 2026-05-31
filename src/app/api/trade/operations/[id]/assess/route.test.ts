import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/trade/trade-auth", () => ({ getTradeAuth: vi.fn() }));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("id"),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/trade/operation-assistant.server", () => ({
  assessOperation: vi.fn(),
  OperationNotFoundError: class OperationNotFoundError extends Error {},
}));

import { GET } from "./route";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  assessOperation,
  OperationNotFoundError,
} from "@/lib/trade/operation-assistant.server";

const auth = getTradeAuth as unknown as ReturnType<typeof vi.fn>;
const assess = assessOperation as unknown as ReturnType<typeof vi.fn>;
const ctx = (id = "op1") => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  auth.mockReset();
  assess.mockReset();
});

describe("GET /api/trade/operations/[id]/assess", () => {
  it("returns 403 when not authenticated/entitled", async () => {
    auth.mockResolvedValue(null);
    expect((await GET(new Request("http://t/assess"), ctx())).status).toBe(403);
  });
  it("returns 404 when the operation is not in scope", async () => {
    auth.mockResolvedValue({
      userId: "u1",
      organizationId: "org1",
      role: "OWNER",
    });
    assess.mockRejectedValue(new OperationNotFoundError("op1"));
    expect((await GET(new Request("http://t/assess"), ctx())).status).toBe(404);
  });
  it("returns 200 with the assessment, scoped to the caller org", async () => {
    auth.mockResolvedValue({
      userId: "u1",
      organizationId: "org1",
      role: "OWNER",
    });
    assess.mockResolvedValue({
      operationId: "op1",
      counterpartyId: "tp1",
      verdict: "GO",
      headline: "ok",
      steps: [],
      pendenzen: [],
      lines: [],
    });
    const res = await GET(new Request("http://t/assess"), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).assessment.verdict).toBe("GO");
    expect(assess).toHaveBeenCalledWith("op1", { organizationId: "org1" });
  });
});
