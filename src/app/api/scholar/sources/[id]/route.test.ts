import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/scholar/scholar-auth", () => ({ getScholarAuth: vi.fn() }));
vi.mock("@/lib/scholar/source-detail.server", () => ({
  getScholarSourceDetail: vi.fn(),
}));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("u"),
}));
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  getRequestContext: vi.fn().mockReturnValue({}),
}));

function req(): Request {
  return new Request("http://localhost/api/scholar/sources/X");
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
const validAuth = { userId: "u1", organizationId: "org1", role: "MEMBER" };

describe("GET /api/scholar/sources/[id] — gate", () => {
  beforeEach(() => vi.resetModules());

  it("403 when getScholarAuth is null", async () => {
    const { getScholarAuth } = await import("@/lib/scholar/scholar-auth");
    vi.mocked(getScholarAuth).mockResolvedValue(null);
    const { GET } = await import("./route");
    const res = await GET(req(), ctx("X"));
    expect(res.status).toBe(403);
  });

  it("404 when the source is unknown", async () => {
    const { getScholarAuth } = await import("@/lib/scholar/scholar-auth");
    vi.mocked(getScholarAuth).mockResolvedValue(validAuth as never);
    const { getScholarSourceDetail } =
      await import("@/lib/scholar/source-detail.server");
    vi.mocked(getScholarSourceDetail).mockReturnValue(null);
    const { GET } = await import("./route");
    const res = await GET(req(), ctx("NOPE"));
    expect(res.status).toBe(404);
  });

  it("200 with the detail when found", async () => {
    const { getScholarAuth } = await import("@/lib/scholar/scholar-auth");
    vi.mocked(getScholarAuth).mockResolvedValue(validAuth as never);
    const { getScholarSourceDetail } =
      await import("@/lib/scholar/source-detail.server");
    vi.mocked(getScholarSourceDetail).mockReturnValue({
      id: "X",
      title: "T",
    } as never);
    const { GET } = await import("./route");
    const res = await GET(req(), ctx("X"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "X" });
  });
});
