import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock auth ───
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ─── Mock Prisma ───
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findFirst: vi.fn(),
    },
    webhook: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    webhookDelivery: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// ─── Mock webhook service ───
const mockGetOrganizationWebhooks = vi.fn();
const mockCreateWebhook = vi.fn();
const mockGetWebhookById = vi.fn();
const mockDeleteWebhook = vi.fn();
const mockGetWebhookDeliveries = vi.fn();
const mockRetryDelivery = vi.fn();

vi.mock("@/lib/services/webhook-service", () => ({
  getOrganizationWebhooks: (...args: unknown[]) =>
    mockGetOrganizationWebhooks(...args),
  createWebhook: (...args: unknown[]) => mockCreateWebhook(...args),
  getWebhookById: (...args: unknown[]) => mockGetWebhookById(...args),
  deleteWebhook: (...args: unknown[]) => mockDeleteWebhook(...args),
  getWebhookDeliveries: (...args: unknown[]) =>
    mockGetWebhookDeliveries(...args),
  retryDelivery: (...args: unknown[]) => mockRetryDelivery(...args),
  WEBHOOK_EVENTS: {
    "spacecraft.created": "Spacecraft created",
    "spacecraft.updated": "Spacecraft updated",
    "compliance.changed": "Compliance status changed",
  },
  updateWebhook: vi.fn(),
  regenerateWebhookSecret: vi.fn(),
  testWebhook: vi.fn(),
  getWebhookStats: vi.fn(),
}));

// ─── Mock validations ───
vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Shared Test Data ───

const mockSession = {
  user: { id: "user-123", email: "test@example.com" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const ORG_ID = "org-abc";

function makeGetRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

function makePostRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(url: string): Request {
  return new Request(url, { method: "DELETE" });
}

// ════════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/webhooks
// ════════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/webhooks", () => {
  let GET: typeof import("@/app/api/v1/webhooks/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/v1/webhooks/route");
    GET = mod.GET;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any);

    expect(res.status).toBe(401);
  });

  it("returns 400 when organizationId missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makeGetRequest("http://localhost/api/v1/webhooks");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 403 when user is not a member of the organization", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("do not have access");
  });

  it("returns webhook list with sanitized secrets", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      userId: "user-123",
      organizationId: ORG_ID,
      role: "OWNER",
    } as any);

    const mockWebhooks = [
      {
        id: "wh-1",
        organizationId: ORG_ID,
        name: "CI Webhook",
        url: "https://example.com/webhook",
        secret: "whsec_abcdefghijklmnopqrstuvwxyz123456",
        events: ["spacecraft.created"],
        isActive: true,
        createdAt: new Date(),
      },
    ];

    mockGetOrganizationWebhooks.mockResolvedValue(mockWebhooks);

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.webhooks).toHaveLength(1);
    expect(data.webhooks[0].secret).toBeUndefined();
    expect(data.webhooks[0].secretPrefix).toContain("...");
    expect(data.availableEvents).toBeDefined();
  });

  it("returns 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);
    mockGetOrganizationWebhooks.mockRejectedValue(new Error("DB error"));

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch webhooks");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 2. POST /api/v1/webhooks
// ════════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/webhooks", () => {
  let POST: typeof import("@/app/api/v1/webhooks/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/v1/webhooks/route");
    POST = mod.POST;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = makePostRequest("http://localhost/api/v1/webhooks", {});
    const res = await POST(req as any);

    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);

    const req = makePostRequest("http://localhost/api/v1/webhooks", {
      organizationId: ORG_ID,
      url: "https://example.com",
      events: ["spacecraft.created"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Name is required");
  });

  it("returns 400 when URL is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);

    const req = makePostRequest("http://localhost/api/v1/webhooks", {
      organizationId: ORG_ID,
      name: "Hook",
      events: ["spacecraft.created"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("URL is required");
  });

  it("returns 400 for invalid URL format", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);

    const req = makePostRequest("http://localhost/api/v1/webhooks", {
      organizationId: ORG_ID,
      name: "Hook",
      url: "not-a-url",
      events: ["spacecraft.created"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid URL format");
  });

  it("returns 400 when events array is empty", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);

    const req = makePostRequest("http://localhost/api/v1/webhooks", {
      organizationId: ORG_ID,
      name: "Hook",
      url: "https://example.com",
      events: [],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("At least one event is required");
  });

  it("returns 400 for invalid event names", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);

    const req = makePostRequest("http://localhost/api/v1/webhooks", {
      organizationId: ORG_ID,
      name: "Hook",
      url: "https://example.com",
      events: ["invalid.event"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid events");
  });

  it("returns 403 when user role is insufficient (MEMBER)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "MEMBER",
    } as any);

    const req = makePostRequest("http://localhost/api/v1/webhooks", {
      organizationId: ORG_ID,
      name: "Hook",
      url: "https://example.com",
      events: ["spacecraft.created"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Insufficient permissions");
  });

  it("creates webhook successfully with valid input", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "ADMIN",
    } as any);

    const mockCreatedWebhook = {
      id: "wh-new",
      name: "CI Hook",
      url: "https://example.com/webhook",
      events: ["spacecraft.created"],
      isActive: true,
      secret: "whsec_newsecretvalue12345",
      createdAt: new Date(),
    };

    mockCreateWebhook.mockResolvedValue(mockCreatedWebhook);

    const req = makePostRequest("http://localhost/api/v1/webhooks", {
      organizationId: ORG_ID,
      name: "CI Hook",
      url: "https://example.com/webhook",
      events: ["spacecraft.created"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.webhook).toBeDefined();
    expect(data.webhook.id).toBe("wh-new");
    expect(data.secret).toBeDefined();
    expect(data.warning).toContain("Store this secret");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 3. GET /api/v1/webhooks/[webhookId]
// ════════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/webhooks/[webhookId]", () => {
  let GET: typeof import("@/app/api/v1/webhooks/[webhookId]/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/v1/webhooks/[webhookId]/route");
    GET = mod.GET;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks/wh-1?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when webhook not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);
    mockGetWebhookById.mockResolvedValue(null);

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks/wh-999?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any, {
      params: Promise.resolve({ webhookId: "wh-999" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Webhook not found");
  });

  it("returns webhook details with sanitized secret", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);
    mockGetWebhookById.mockResolvedValue({
      id: "wh-1",
      name: "Hook A",
      url: "https://example.com/hook",
      secret: "whsec_abcdefghijklmnopqrstuvwxyz",
      events: ["spacecraft.created"],
      isActive: true,
      createdAt: new Date(),
    });

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks/wh-1?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.webhook).toBeDefined();
    expect(data.webhook.secret).toBeUndefined();
    expect(data.webhook.secretPrefix).toContain("...");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 4. DELETE /api/v1/webhooks/[webhookId]
// ════════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/v1/webhooks/[webhookId]", () => {
  let DELETE: typeof import("@/app/api/v1/webhooks/[webhookId]/route").DELETE;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/v1/webhooks/[webhookId]/route");
    DELETE = mod.DELETE;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = makeDeleteRequest(
      `http://localhost/api/v1/webhooks/wh-1?organizationId=${ORG_ID}`,
    );
    const res = await DELETE(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 when organizationId missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makeDeleteRequest("http://localhost/api/v1/webhooks/wh-1");
    const res = await DELETE(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns success when webhook deleted", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);
    mockDeleteWebhook.mockResolvedValue(undefined);

    const req = makeDeleteRequest(
      `http://localhost/api/v1/webhooks/wh-1?organizationId=${ORG_ID}`,
    );
    const res = await DELETE(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 403 when user role is insufficient (VIEWER)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "VIEWER",
    } as any);

    const req = makeDeleteRequest(
      `http://localhost/api/v1/webhooks/wh-1?organizationId=${ORG_ID}`,
    );
    const res = await DELETE(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Insufficient permissions");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 5. GET /api/v1/webhooks/[webhookId]/deliveries
// ════════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/webhooks/[webhookId]/deliveries", () => {
  let GET: typeof import("@/app/api/v1/webhooks/[webhookId]/deliveries/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod =
      await import("@/app/api/v1/webhooks/[webhookId]/deliveries/route");
    GET = mod.GET;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks/wh-1/deliveries?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when webhook not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);
    mockGetWebhookById.mockResolvedValue(null);

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks/wh-999/deliveries?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any, {
      params: Promise.resolve({ webhookId: "wh-999" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Webhook not found");
  });

  it("returns paginated deliveries on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);
    mockGetWebhookById.mockResolvedValue({
      id: "wh-1",
      organizationId: ORG_ID,
    });
    mockGetWebhookDeliveries.mockResolvedValue({
      deliveries: [
        {
          id: "del-1",
          webhookId: "wh-1",
          event: "spacecraft.created",
          status: "DELIVERED",
          statusCode: 200,
          createdAt: new Date(),
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks/wh-1/deliveries?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.deliveries).toHaveLength(1);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.total).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 6. POST /api/v1/webhooks/[webhookId]/deliveries (retry)
// ════════════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/webhooks/[webhookId]/deliveries (retry)", () => {
  let POST: typeof import("@/app/api/v1/webhooks/[webhookId]/deliveries/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod =
      await import("@/app/api/v1/webhooks/[webhookId]/deliveries/route");
    POST = mod.POST;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = makePostRequest(
      "http://localhost/api/v1/webhooks/wh-1/deliveries",
      { organizationId: ORG_ID, deliveryId: "del-1", action: "retry" },
    );
    const res = await POST(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid action", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);
    mockGetWebhookById.mockResolvedValue({
      id: "wh-1",
      organizationId: ORG_ID,
    });

    const req = makePostRequest(
      "http://localhost/api/v1/webhooks/wh-1/deliveries",
      { organizationId: ORG_ID, action: "invalid" },
    );
    const res = await POST(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid action");
  });

  it("retries delivery successfully", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      role: "OWNER",
    } as any);
    mockGetWebhookById.mockResolvedValue({
      id: "wh-1",
      organizationId: ORG_ID,
    });
    mockRetryDelivery.mockResolvedValue(undefined);

    const req = makePostRequest(
      "http://localhost/api/v1/webhooks/wh-1/deliveries",
      { organizationId: ORG_ID, deliveryId: "del-1", action: "retry" },
    );
    const res = await POST(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Retry initiated");
  });
});
