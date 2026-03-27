import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns ok when database is reachable", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("returns degraded when database is unreachable", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockRejectedValue(
      new Error("Connection refused"),
    );

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
  });
});
