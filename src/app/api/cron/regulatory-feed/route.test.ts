/**
 * Regulatory Feed Cron Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

const mockProcessNewDocuments = vi.fn();
const mockGetRecentHighPriority = vi.fn();
vi.mock("@/lib/services/eurlex-service", () => ({
  processNewDocuments: (...args: unknown[]) => mockProcessNewDocuments(...args),
  getRecentHighPriorityUpdates: (...args: unknown[]) =>
    mockGetRecentHighPriority(...args),
}));

const mockNotifyOrganization = vi.fn();
vi.mock("@/lib/services/notification-service", () => ({
  notifyOrganization: (...args: unknown[]) => mockNotifyOrganization(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_: unknown, fb: string) => fb),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  organization: { findMany: ReturnType<typeof vi.fn> };
};

function makeRequest(auth?: string): Request {
  const h: Record<string, string> = {};
  if (auth) h.authorization = auth;
  return new Request("https://app.caelex.com/api/cron/regulatory-feed", {
    headers: h,
  });
}

describe("GET /api/cron/regulatory-feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessNewDocuments.mockReset();
    mockGetRecentHighPriority.mockReset();
    mockNotifyOrganization.mockReset();
    mockPrisma.organization.findMany.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  it("returns 503 when CRON_SECRET not configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(makeRequest("Bearer test-secret"))).status).toBe(503);
  });

  it("returns 401 without auth", async () => {
    expect((await GET(makeRequest())).status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    expect((await GET(makeRequest("Bearer wrong"))).status).toBe(401);
  });

  it("processes documents with no new ones", async () => {
    mockProcessNewDocuments.mockResolvedValue({
      fetched: 5,
      newDocuments: 0,
      errors: [],
    });
    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.newDocuments).toBe(0);
    expect(body.notificationsSent).toBe(0);
  });

  it("notifies organizations on high-priority updates", async () => {
    mockProcessNewDocuments.mockResolvedValue({
      fetched: 10,
      newDocuments: 2,
      errors: [],
    });
    mockGetRecentHighPriority.mockResolvedValue([
      {
        id: "u1",
        celexNumber: "32025R0001",
        title: "New regulation",
        severity: "CRITICAL",
        affectedModules: [],
      },
    ]);
    mockPrisma.organization.findMany.mockResolvedValue([
      { id: "org-1" },
      { id: "org-2" },
    ]);
    mockNotifyOrganization.mockResolvedValue(undefined);

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.notificationsSent).toBe(2); // 1 update × 2 orgs
    expect(mockNotifyOrganization).toHaveBeenCalledTimes(2);
  });

  it("continues on notification failure", async () => {
    mockProcessNewDocuments.mockResolvedValue({
      fetched: 5,
      newDocuments: 1,
      errors: [],
    });
    mockGetRecentHighPriority.mockResolvedValue([
      {
        id: "u1",
        celexNumber: "32025R0001",
        title: "Regulation",
        severity: "HIGH",
        affectedModules: [],
      },
    ]);
    mockPrisma.organization.findMany.mockResolvedValue([{ id: "org-1" }]);
    mockNotifyOrganization.mockRejectedValue(new Error("Notification failed"));

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.notificationsSent).toBe(0); // failed notification not counted
  });

  it("POST delegates to GET", async () => {
    mockProcessNewDocuments.mockResolvedValue({
      fetched: 0,
      newDocuments: 0,
      errors: [],
    });
    expect((await POST(makeRequest("Bearer test-secret"))).status).toBe(200);
  });

  it("returns 500 on error without leaking details", async () => {
    mockProcessNewDocuments.mockRejectedValue(
      new Error("EUR-Lex API unavailable"),
    );
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("EUR-Lex");
  });
});
