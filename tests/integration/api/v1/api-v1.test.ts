import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ───
vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    apiRequest: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    spacecraft: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    authorizationWorkflow: {
      count: vi.fn(),
    },
    deadline: {
      count: vi.fn(),
    },
    incident: {
      count: vi.fn(),
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
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
    },
    securityAuditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ─── Mock Auth (session-based for keys/webhooks routes) ───
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ─── Mock Security Audit Service ───
vi.mock("@/lib/services/security-audit-service", () => ({
  logSecurityEvent: vi.fn().mockResolvedValue({
    id: "audit-1",
    event: "API_KEY_CREATED",
    createdAt: new Date(),
  }),
  logSecurityEvents: vi.fn().mockResolvedValue([]),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── Shared Test Data ───

const mockSession = {
  user: { id: "user-123", email: "test@example.com" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const ORG_ID = "org-abc";

const mockApiKeyRecord = {
  id: "key-1",
  organizationId: ORG_ID,
  name: "Test Key",
  keyHash: "somehash",
  keyPrefix: "caelex_abcd",
  scopes: ["read:compliance", "read:spacecraft"],
  rateLimit: 1000,
  isActive: true,
  lastUsedAt: null,
  expiresAt: null,
  createdById: "user-123",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  revokedAt: null,
  revokedReason: null,
  organization: { id: ORG_ID, name: "Space Corp", isActive: true },
};

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

function makePatchRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(url: string): Request {
  return new Request(url, { method: "DELETE" });
}

function makeAuthedGetRequest(
  url: string,
  apiKey = "caelex_validkey1234567890abcdef",
): Request {
  return new Request(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// 1. API Keys Management (session-auth): /api/v1/keys
// ════════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/keys", () => {
  let GET: typeof import("@/app/api/v1/keys/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/v1/keys/route");
    GET = mod.GET;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = makeGetRequest(
      `http://localhost/api/v1/keys?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when organizationId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makeGetRequest("http://localhost/api/v1/keys");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns keys list on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.apiKey.findMany).mockResolvedValue([
      mockApiKeyRecord,
    ] as any);

    const req = makeGetRequest(
      `http://localhost/api/v1/keys?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.keys).toBeDefined();
    expect(data.availableScopes).toBeDefined();
    expect(Array.isArray(data.availableScopes)).toBe(true);
  });

  it("returns 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.apiKey.findMany).mockRejectedValue(new Error("DB down"));

    const req = makeGetRequest(
      `http://localhost/api/v1/keys?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch API keys");
  });
});

describe("POST /api/v1/keys", () => {
  let POST: typeof import("@/app/api/v1/keys/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/v1/keys/route");
    POST = mod.POST;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = makePostRequest("http://localhost/api/v1/keys", {
      organizationId: ORG_ID,
      name: "My Key",
      scopes: ["read:compliance"],
    });
    const res = await POST(req as any);

    expect(res.status).toBe(401);
  });

  it("returns 400 when organizationId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makePostRequest("http://localhost/api/v1/keys", {
      name: "My Key",
      scopes: ["read:compliance"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makePostRequest("http://localhost/api/v1/keys", {
      organizationId: ORG_ID,
      scopes: ["read:compliance"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Name is required");
  });

  it("returns 400 when scopes is empty array", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makePostRequest("http://localhost/api/v1/keys", {
      organizationId: ORG_ID,
      name: "My Key",
      scopes: [],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("At least one scope is required");
  });

  it("returns 400 for invalid scopes", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makePostRequest("http://localhost/api/v1/keys", {
      organizationId: ORG_ID,
      name: "My Key",
      scopes: ["invalid:scope"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid scopes");
  });

  it("creates key successfully with valid input", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      ...mockApiKeyRecord,
      scopes: ["read:compliance"],
    } as any);

    const req = makePostRequest("http://localhost/api/v1/keys", {
      organizationId: ORG_ID,
      name: "My Key",
      scopes: ["read:compliance"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.key).toBeDefined();
    expect(data.plainTextKey).toBeDefined();
    expect(data.warning).toContain("only time");
  });

  it("returns 500 on database error during creation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.apiKey.create).mockRejectedValue(new Error("DB error"));

    const req = makePostRequest("http://localhost/api/v1/keys", {
      organizationId: ORG_ID,
      name: "My Key",
      scopes: ["read:compliance"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to create API key");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 2. Single API Key: /api/v1/keys/[keyId]
// ════════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/keys/[keyId]", () => {
  let GET: typeof import("@/app/api/v1/keys/[keyId]/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/v1/keys/[keyId]/route");
    GET = mod.GET;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = makeGetRequest(
      `http://localhost/api/v1/keys/key-1?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any, {
      params: Promise.resolve({ keyId: "key-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when organizationId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makeGetRequest("http://localhost/api/v1/keys/key-1");
    const res = await GET(req as any, {
      params: Promise.resolve({ keyId: "key-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 404 when key not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null);

    const req = makeGetRequest(
      `http://localhost/api/v1/keys/key-999?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any, {
      params: Promise.resolve({ keyId: "key-999" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("API key not found");
  });

  it("returns key details on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(
      mockApiKeyRecord as any,
    );

    const req = makeGetRequest(
      `http://localhost/api/v1/keys/key-1?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any, {
      params: Promise.resolve({ keyId: "key-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.key).toBeDefined();
    expect(data.key.maskedKey).toContain("caelex_");
  });
});

describe("DELETE /api/v1/keys/[keyId]", () => {
  let DELETE: typeof import("@/app/api/v1/keys/[keyId]/route").DELETE;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/v1/keys/[keyId]/route");
    DELETE = mod.DELETE;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = makeDeleteRequest(
      `http://localhost/api/v1/keys/key-1?organizationId=${ORG_ID}`,
    );
    const res = await DELETE(req as any, {
      params: Promise.resolve({ keyId: "key-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 when organizationId missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makeDeleteRequest("http://localhost/api/v1/keys/key-1");
    const res = await DELETE(req as any, {
      params: Promise.resolve({ keyId: "key-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns success on key revocation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.apiKey.update).mockResolvedValue(mockApiKeyRecord as any);

    const req = makeDeleteRequest(
      `http://localhost/api/v1/keys/key-1?organizationId=${ORG_ID}&reason=compromised`,
    );
    const res = await DELETE(req as any, {
      params: Promise.resolve({ keyId: "key-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 500 on database error during revocation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.apiKey.update).mockRejectedValue(new Error("DB error"));

    const req = makeDeleteRequest(
      `http://localhost/api/v1/keys/key-1?organizationId=${ORG_ID}`,
    );
    const res = await DELETE(req as any, {
      params: Promise.resolve({ keyId: "key-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to revoke API key");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 3. Public API - Compliance: /api/v1/compliance (withApiAuth)
// ════════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/compliance", () => {
  let GET: typeof import("@/app/api/v1/compliance/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/v1/compliance/route");
    GET = mod.GET;

    // Default: rate limit OK
    vi.mocked(prisma.apiRequest.count).mockResolvedValue(0);
    vi.mocked(prisma.apiRequest.create).mockResolvedValue({} as any);
  });

  it("returns 401 when no Authorization header provided", async () => {
    const req = makeGetRequest("http://localhost/api/v1/compliance");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it("returns 401 for invalid API key format", async () => {
    const req = new Request("http://localhost/api/v1/compliance", {
      headers: { Authorization: "Bearer invalid_key_format" },
    });
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it("returns 401 when API key not found in database", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);

    const req = makeAuthedGetRequest("http://localhost/api/v1/compliance");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it("returns 401 when API key is revoked (inactive)", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      ...mockApiKeyRecord,
      isActive: false,
    } as any);

    const req = makeAuthedGetRequest("http://localhost/api/v1/compliance");
    const res = await GET(req as any);

    expect(res.status).toBe(401);
  });

  it("returns 401 when API key is expired", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      ...mockApiKeyRecord,
      expiresAt: new Date("2020-01-01"),
    } as any);

    const req = makeAuthedGetRequest("http://localhost/api/v1/compliance");
    const res = await GET(req as any);

    expect(res.status).toBe(401);
  });

  it("returns 403 when API key lacks required scope", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      ...mockApiKeyRecord,
      scopes: ["read:spacecraft"], // missing read:compliance
    } as any);
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);

    const req = makeAuthedGetRequest("http://localhost/api/v1/compliance");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toBe("Insufficient permissions");
  });

  it("returns 429 when rate limit exceeded", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(
      mockApiKeyRecord as any,
    );
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
    // Simulate rate limit exceeded: count >= rateLimit
    vi.mocked(prisma.apiRequest.count).mockResolvedValue(1001);

    const req = makeAuthedGetRequest("http://localhost/api/v1/compliance");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error.message).toBe("Rate limit exceeded");
  });

  it("returns 200 with compliance overview on success", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(
      mockApiKeyRecord as any,
    );
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
    vi.mocked(prisma.spacecraft.count).mockResolvedValue(5);
    vi.mocked(prisma.authorizationWorkflow.count).mockResolvedValue(2);
    vi.mocked(prisma.deadline.count).mockResolvedValue(3);
    vi.mocked(prisma.incident.count).mockResolvedValue(1);

    const req = makeAuthedGetRequest("http://localhost/api/v1/compliance");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.organizationId).toBe(ORG_ID);
    expect(data.data.overview).toBeDefined();
    expect(data.data.overview.spacecraftCount).toBe(5);
    expect(data.data.overview.activeWorkflows).toBe(2);
    expect(data.data.overview.pendingDeadlines).toBe(3);
    expect(data.data.overview.recentIncidents).toBe(1);
    expect(data.data.overview.complianceScore).toBeDefined();
  });

  it("returns 500 when database throws in handler", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(
      mockApiKeyRecord as any,
    );
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
    vi.mocked(prisma.spacecraft.count).mockRejectedValue(new Error("DB error"));

    const req = makeAuthedGetRequest("http://localhost/api/v1/compliance");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it("allows wildcard scope (*) to access compliance endpoint", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      ...mockApiKeyRecord,
      scopes: ["*"],
    } as any);
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
    vi.mocked(prisma.spacecraft.count).mockResolvedValue(0);
    vi.mocked(prisma.authorizationWorkflow.count).mockResolvedValue(0);
    vi.mocked(prisma.deadline.count).mockResolvedValue(0);
    vi.mocked(prisma.incident.count).mockResolvedValue(0);

    const req = makeAuthedGetRequest("http://localhost/api/v1/compliance");
    const res = await GET(req as any);

    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 4. Public API - Spacecraft: /api/v1/spacecraft (withApiAuth)
// ════════════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/spacecraft", () => {
  let GET: typeof import("@/app/api/v1/spacecraft/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/v1/spacecraft/route");
    GET = mod.GET;

    vi.mocked(prisma.apiRequest.count).mockResolvedValue(0);
    vi.mocked(prisma.apiRequest.create).mockResolvedValue({} as any);
  });

  it("returns 401 without auth header", async () => {
    const req = makeGetRequest("http://localhost/api/v1/spacecraft");
    const res = await GET(req as any);

    expect(res.status).toBe(401);
  });

  it("returns 403 without read:spacecraft scope", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      ...mockApiKeyRecord,
      scopes: ["read:compliance"], // missing read:spacecraft
    } as any);
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);

    const req = makeAuthedGetRequest("http://localhost/api/v1/spacecraft");
    const res = await GET(req as any);

    expect(res.status).toBe(403);
  });

  it("returns paginated spacecraft list on success", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(
      mockApiKeyRecord as any,
    );
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);

    const mockSpacecraft = [
      {
        id: "sc-1",
        name: "Sat-A",
        cosparId: "2024-001A",
        noradId: "12345",
        missionType: "COMMUNICATION",
        orbitType: "LEO",
        altitudeKm: 550,
        inclinationDeg: 53,
        status: "OPERATIONAL",
        launchDate: new Date("2024-06-15"),
        endOfLifeDate: null,
        description: "Test satellite",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ];

    vi.mocked(prisma.spacecraft.findMany).mockResolvedValue(
      mockSpacecraft as any,
    );
    vi.mocked(prisma.spacecraft.count).mockResolvedValue(1);

    const req = makeAuthedGetRequest(
      "http://localhost/api/v1/spacecraft?page=1&pageSize=10",
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.spacecraft).toHaveLength(1);
    expect(data.data.spacecraft[0].name).toBe("Sat-A");
    expect(data.meta.pagination).toBeDefined();
    expect(data.meta.pagination.page).toBe(1);
    expect(data.meta.pagination.total).toBe(1);
  });

  it("caps pageSize at 100", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(
      mockApiKeyRecord as any,
    );
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
    vi.mocked(prisma.spacecraft.findMany).mockResolvedValue([]);
    vi.mocked(prisma.spacecraft.count).mockResolvedValue(0);

    const req = makeAuthedGetRequest(
      "http://localhost/api/v1/spacecraft?pageSize=500",
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.meta.pagination.pageSize).toBe(100);
  });

  it("passes status filter to query", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(
      mockApiKeyRecord as any,
    );
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
    vi.mocked(prisma.spacecraft.findMany).mockResolvedValue([]);
    vi.mocked(prisma.spacecraft.count).mockResolvedValue(0);

    const req = makeAuthedGetRequest(
      "http://localhost/api/v1/spacecraft?status=OPERATIONAL",
    );
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(prisma.spacecraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "OPERATIONAL",
          organizationId: ORG_ID,
        }),
      }),
    );
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(
      mockApiKeyRecord as any,
    );
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
    vi.mocked(prisma.spacecraft.findMany).mockRejectedValue(
      new Error("DB error"),
    );

    const req = makeAuthedGetRequest("http://localhost/api/v1/spacecraft");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 5. Webhooks Management: /api/v1/webhooks (session-auth)
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

  it("returns webhook list with sanitized secrets", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const mockWebhooks = [
      {
        id: "wh-1",
        organizationId: ORG_ID,
        name: "CI Webhook",
        url: "https://example.com/webhook",
        secret: "whsec_abcdefghijklmnopqrstuvwxyz123456",
        events: ["spacecraft.created"],
        headers: {},
        isActive: true,
        successCount: 10,
        failureCount: 1,
        lastTriggeredAt: new Date(),
        lastSuccessAt: new Date(),
        lastFailureAt: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(prisma.webhook.findMany).mockResolvedValue(mockWebhooks as any);

    const req = makeGetRequest(
      `http://localhost/api/v1/webhooks?organizationId=${ORG_ID}`,
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.webhooks).toHaveLength(1);
    // Secret should be sanitized
    expect(data.webhooks[0].secret).toBeUndefined();
    expect(data.webhooks[0].secretPrefix).toBeDefined();
    expect(data.webhooks[0].secretPrefix).toContain("...");
    expect(data.availableEvents).toBeDefined();
  });
});

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

  it("returns 400 when organizationId missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makePostRequest("http://localhost/api/v1/webhooks", {
      name: "Hook",
      url: "https://example.com",
      events: ["spacecraft.created"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

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

  it("returns 400 when url is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

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

  it("creates webhook successfully with valid input", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const mockCreatedWebhook = {
      id: "wh-new",
      organizationId: ORG_ID,
      name: "CI Hook",
      url: "https://example.com/webhook",
      secret: "whsec_newsecretvalue12345",
      events: ["spacecraft.created"],
      headers: {},
      isActive: true,
      successCount: 0,
      failureCount: 0,
      lastTriggeredAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.webhook.create).mockResolvedValue(
      mockCreatedWebhook as any,
    );

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

  it("returns 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.webhook.create).mockRejectedValue(new Error("DB fail"));

    const req = makePostRequest("http://localhost/api/v1/webhooks", {
      organizationId: ORG_ID,
      name: "Hook",
      url: "https://example.com/webhook",
      events: ["spacecraft.created"],
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to create webhook");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 6. Single Webhook: /api/v1/webhooks/[webhookId]
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
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue(null);

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
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue({
      id: "wh-1",
      organizationId: ORG_ID,
      name: "Hook A",
      url: "https://example.com/hook",
      secret: "whsec_abcdefghijklmnopqrstuvwxyz",
      events: ["spacecraft.created"],
      isActive: true,
      headers: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

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
    expect(data.webhook.secretPrefix).toBeDefined();
  });
});

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
    vi.mocked(prisma.webhook.delete).mockResolvedValue({} as any);

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
});

// ════════════════════════════════════════════════════════════════════════════════
// 7. Webhook Deliveries: /api/v1/webhooks/[webhookId]/deliveries
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

  it("returns 400 when organizationId missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const req = makeGetRequest(
      "http://localhost/api/v1/webhooks/wh-1/deliveries",
    );
    const res = await GET(req as any, {
      params: Promise.resolve({ webhookId: "wh-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 404 when webhook not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue(null);

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
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue({
      id: "wh-1",
      organizationId: ORG_ID,
    } as any);

    const mockDeliveries = [
      {
        id: "del-1",
        webhookId: "wh-1",
        event: "spacecraft.created",
        payload: {},
        status: "DELIVERED",
        statusCode: 200,
        responseBody: "OK",
        responseTimeMs: 150,
        attempts: 1,
        deliveredAt: new Date(),
        nextRetryAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue(
      mockDeliveries as any,
    );
    vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(1);

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
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue({
      id: "wh-1",
      organizationId: ORG_ID,
    } as any);

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
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue({
      id: "wh-1",
      organizationId: ORG_ID,
      isActive: true,
      url: "https://example.com/hook",
      secret: "whsec_test",
      headers: {},
    } as any);

    const mockDelivery = {
      id: "del-1",
      webhookId: "wh-1",
      status: "FAILED",
      payload: {
        id: "test",
        event: "test.ping",
        timestamp: new Date().toISOString(),
        data: {},
      },
      attempts: 1,
      webhook: {
        id: "wh-1",
        isActive: true,
        url: "https://example.com/hook",
        secret: "whsec_test",
        headers: {},
      },
    };

    vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue(
      mockDelivery as any,
    );
    vi.mocked(prisma.webhookDelivery.update).mockResolvedValue({} as any);
    // Mock the fetch for the webhook delivery
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("OK"),
    }) as any;

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

    globalThis.fetch = originalFetch;
  });
});
