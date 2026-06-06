import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/scholar/scholar-auth", () => ({ getScholarAuth: vi.fn() }));
vi.mock("@/lib/scholar/scholar-search.server", () => ({
  scholarSearchSources: vi.fn(),
}));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("u"),
}));

function req(body?: unknown): Request {
  return new Request("http://localhost/api/scholar/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}
const validAuth = { userId: "u1", organizationId: "org1", role: "MEMBER" };

describe("POST /api/scholar/search — gate", () => {
  beforeEach(() => vi.resetModules());

  it("403 when getScholarAuth is null", async () => {
    const { getScholarAuth } = await import("@/lib/scholar/scholar-auth");
    vi.mocked(getScholarAuth).mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(req({ query: "satellite" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Forbidden" });
  });

  it("400 when auth valid but body invalid (gate runs before validation)", async () => {
    const { getScholarAuth } = await import("@/lib/scholar/scholar-auth");
    vi.mocked(getScholarAuth).mockResolvedValue(validAuth as never);
    const { POST } = await import("./route");
    const res = await POST(req({ query: "x" }));
    expect(res.status).toBe(400);
  });

  it("200 when auth valid and body valid", async () => {
    const { getScholarAuth } = await import("@/lib/scholar/scholar-auth");
    vi.mocked(getScholarAuth).mockResolvedValue(validAuth as never);
    const { scholarSearchSources } =
      await import("@/lib/scholar/scholar-search.server");
    vi.mocked(scholarSearchSources).mockResolvedValue({
      query: "satellite",
      hitCount: 0,
      semanticAvailable: false,
      hits: [],
    });
    const { POST } = await import("./route");
    const res = await POST(req({ query: "satellite" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ query: "satellite" });
  });
});
