import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findFirst: vi.fn(),
    },
    assureShareLink: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    assureShareView: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  getIdentifier: vi.fn().mockReturnValue("test-identifier"),
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((value: string) => Promise.resolve(`encrypted_${value}`)),
  decrypt: vi.fn((value: string) => Promise.resolve(value)),
}));

vi.mock("@/lib/rrs-engine.server", () => ({
  computeRRS: vi.fn().mockResolvedValue({
    overallScore: 78,
    grade: "C",
    status: "partial",
    components: {
      authorizationReadiness: {
        score: 80,
        weight: 0.25,
        weightedScore: 20,
        factors: [
          {
            id: "auth_workflow",
            name: "Authorization Workflow Status",
            maxPoints: 40,
            earnedPoints: 30,
            description: "Current state of authorization process",
          },
        ],
      },
      cybersecurityPosture: {
        score: 75,
        weight: 0.2,
        weightedScore: 15,
        factors: [
          {
            id: "cyber_assessment",
            name: "Cybersecurity Risk Assessment",
            maxPoints: 35,
            earnedPoints: 25,
            description: "NIS2-compliant cybersecurity risk assessment",
          },
        ],
      },
      operationalCompliance: {
        score: 70,
        weight: 0.2,
        weightedScore: 14,
        factors: [],
      },
      jurisdictionalCoverage: {
        score: 60,
        weight: 0.15,
        weightedScore: 9,
        factors: [],
      },
      regulatoryTrajectory: {
        score: 50,
        weight: 0.1,
        weightedScore: 5,
        factors: [],
      },
      governanceProcess: {
        score: 55,
        weight: 0.1,
        weightedScore: 6,
        factors: [],
      },
    },
    recommendations: [
      {
        priority: "high",
        component: "authorizationReadiness",
        action: "Complete Authorization Workflow Status",
        impact: "+3 points on overall RRS",
      },
    ],
    methodology: {
      version: "1.0",
      weights: {
        authorizationReadiness: 0.25,
        cybersecurityPosture: 0.2,
        operationalCompliance: 0.2,
        jurisdictionalCoverage: 0.15,
        regulatoryTrajectory: 0.1,
        governanceProcess: 0.1,
      },
      description: "Regulatory Readiness Score v1.0",
    },
    computedAt: new Date(),
  }),
  getRRSHistory: vi.fn().mockResolvedValue([
    { date: new Date("2025-06-01"), overallScore: 65 },
    { date: new Date("2025-06-15"), overallScore: 72 },
  ]),
}));

// ─── Imports (after mocks) ───

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { checkRateLimit } from "@/lib/ratelimit";
import { computeRRS, getRRSHistory } from "@/lib/rrs-engine.server";

import { POST, GET } from "@/app/api/assure/share/route";
import { PATCH, DELETE } from "@/app/api/assure/share/[id]/route";
import { GET as getSharedView } from "@/app/api/assure/share/view/[token]/route";

// ─── Helpers ───

const mockSession = {
  user: { id: "user-123", email: "admin@spacecorp.test", name: "Admin User" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const mockMembershipOwner = {
  userId: "user-123",
  organizationId: "org-001",
  role: "OWNER",
  organization: { id: "org-001", name: "SpaceCorp" },
};

const mockMembershipManager = {
  userId: "user-456",
  organizationId: "org-001",
  role: "MANAGER",
  organization: { id: "org-001", name: "SpaceCorp" },
};

const mockMembershipViewer = {
  userId: "user-789",
  organizationId: "org-001",
  role: "VIEWER",
  organization: { id: "org-001", name: "SpaceCorp" },
};

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

function makePostRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(url: string): Request {
  return new Request(url, { method: "GET" });
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

const mockShareLink = {
  id: "share-001",
  organizationId: "org-001",
  createdById: "user-123",
  token: "a".repeat(64),
  label: "Q4 DD Package for Investor A",
  granularity: "COMPONENT",
  expiresAt: new Date(futureDate),
  maxViews: 10,
  viewCount: 0,
  isRevoked: false,
  includeRRS: true,
  includeGapAnalysis: true,
  includeTimeline: false,
  includeRiskRegister: false,
  includeTrend: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================================
// TEST SUITES
// ============================================================

describe("POST /api/assure/share — Create Share Link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true } as any);
  });

  // ─── Auth enforcement ───

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "SUMMARY",
      expiresAt: futureDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user has no organization", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "SUMMARY",
      expiresAt: futureDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("No organization");
  });

  it("should return 403 when user has insufficient role (VIEWER)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipViewer as any,
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "SUMMARY",
      expiresAt: futureDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Insufficient permissions");
  });

  it("should return 403 when user has MANAGER role (requires ADMIN/OWNER)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipManager as any,
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "SUMMARY",
      expiresAt: futureDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Insufficient permissions");
  });

  // ─── Validation ───

  it("should return 400 when label is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      granularity: "SUMMARY",
      expiresAt: futureDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation error");
  });

  it("should return 400 when granularity is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "INVALID",
      expiresAt: futureDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation error");
  });

  it("should return 400 when expiresAt is in the past", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "SUMMARY",
      expiresAt: pastDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation error");
  });

  it("should return 400 when expiresAt is not a valid date", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "SUMMARY",
      expiresAt: "not-a-date",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation error");
  });

  it("should return 400 when label exceeds 200 characters", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "A".repeat(201),
      granularity: "SUMMARY",
      expiresAt: futureDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation error");
  });

  // ─── Successful creation ───

  it("should create a share link with SUMMARY granularity", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.create).mockResolvedValue(
      mockShareLink as any,
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Q4 DD Package for Investor A",
      granularity: "COMPONENT",
      expiresAt: futureDate,
      maxViews: 10,
      includeRRS: true,
      includeGapAnalysis: true,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("share-001");
    expect(data.token).toBeDefined();
    expect(data.label).toBe("Q4 DD Package for Investor A");
    expect(data.granularity).toBe("COMPONENT");
    expect(data.isRevoked).toBe(false);
  });

  it("should generate a cryptographic token (at least 64 hex chars)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.create).mockImplementation(
      async ({ data }: any) => ({
        ...mockShareLink,
        token: data.token,
      }),
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "SUMMARY",
      expiresAt: futureDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(data.token).toBeDefined();
    expect(data.token.length).toBeGreaterThanOrEqual(64);
    // Should be hex
    expect(/^[0-9a-f]+$/.test(data.token)).toBe(true);
  });

  it("should pass correct data to prisma create", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.create).mockResolvedValue(
      mockShareLink as any,
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Investor B",
      granularity: "DETAILED",
      expiresAt: futureDate,
      maxViews: 5,
      includeRRS: true,
      includeGapAnalysis: true,
      includeTimeline: true,
      includeRiskRegister: true,
      includeTrend: true,
    });
    await POST(request);

    expect(prisma.assureShareLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-001",
        createdById: "user-123",
        token: expect.any(String),
        label: "Investor B",
        granularity: "DETAILED",
        expiresAt: expect.any(Date),
        maxViews: 5,
        includeRRS: true,
        includeGapAnalysis: true,
        includeTimeline: true,
        includeRiskRegister: true,
        includeTrend: true,
      }),
    });
  });

  it("should log audit event on creation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.create).mockResolvedValue(
      mockShareLink as any,
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "SUMMARY",
      expiresAt: futureDate,
    });
    await POST(request);

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        action: "assure_share_created",
        entityType: "assure_share",
        entityId: "share-001",
        organizationId: "org-001",
      }),
    );
  });

  it("should accept null maxViews (unlimited)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.create).mockResolvedValue({
      ...mockShareLink,
      maxViews: null,
    } as any);

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Unlimited",
      granularity: "SUMMARY",
      expiresAt: futureDate,
      maxViews: null,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.maxViews).toBeNull();
  });

  // ─── Rate limiting ───

  it("should return 429 when rate limited", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false } as any);

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "SUMMARY",
      expiresAt: futureDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests");
  });

  // ─── Error handling ───

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.create).mockRejectedValue(
      new Error("Connection refused"),
    );

    const request = makePostRequest("http://localhost/api/assure/share", {
      label: "Test",
      granularity: "SUMMARY",
      expiresAt: futureDate,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ============================================================

describe("GET /api/assure/share — List Share Links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true } as any);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makeGetRequest("http://localhost/api/assure/share");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user has no organization", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

    const request = makeGetRequest("http://localhost/api/assure/share");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("No organization");
  });

  it("should return 403 when user has VIEWER role (requires MANAGER+)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipViewer as any,
    );

    const request = makeGetRequest("http://localhost/api/assure/share");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Insufficient permissions");
  });

  it("should allow MANAGER role to list share links", async () => {
    vi.mocked(auth).mockResolvedValue({
      ...mockSession,
      user: { id: "user-456", email: "mgr@test.com", name: "Manager" },
    } as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipManager as any,
    );
    vi.mocked(prisma.assureShareLink.findMany).mockResolvedValue([]);

    const request = makeGetRequest("http://localhost/api/assure/share");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shareLinks).toBeDefined();
  });

  it("should return share links with computed isActive and isExpired flags", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findMany).mockResolvedValue([
      {
        ...mockShareLink,
        createdBy: { id: "user-123", name: "Admin", email: "admin@test.com" },
        _count: { views: 3 },
      },
    ] as any);

    const request = makeGetRequest("http://localhost/api/assure/share");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shareLinks).toHaveLength(1);
    expect(data.shareLinks[0].isActive).toBe(true);
    expect(data.shareLinks[0].isExpired).toBe(false);
    expect(data.shareLinks[0].totalViews).toBe(3);
  });

  it("should mark expired links as isExpired: true and isActive: false", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findMany).mockResolvedValue([
      {
        ...mockShareLink,
        expiresAt: new Date(pastDate),
        createdBy: { id: "user-123", name: "Admin", email: "admin@test.com" },
        _count: { views: 0 },
      },
    ] as any);

    const request = makeGetRequest("http://localhost/api/assure/share");
    const response = await GET(request);
    const data = await response.json();

    expect(data.shareLinks[0].isExpired).toBe(true);
    expect(data.shareLinks[0].isActive).toBe(false);
  });

  it("should mark revoked links as isActive: false", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findMany).mockResolvedValue([
      {
        ...mockShareLink,
        isRevoked: true,
        createdBy: { id: "user-123", name: "Admin", email: "admin@test.com" },
        _count: { views: 2 },
      },
    ] as any);

    const request = makeGetRequest("http://localhost/api/assure/share");
    const response = await GET(request);
    const data = await response.json();

    expect(data.shareLinks[0].isActive).toBe(false);
  });

  it("should mark links exceeding maxViews as isActive: false", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findMany).mockResolvedValue([
      {
        ...mockShareLink,
        maxViews: 5,
        viewCount: 5,
        createdBy: { id: "user-123", name: "Admin", email: "admin@test.com" },
        _count: { views: 5 },
      },
    ] as any);

    const request = makeGetRequest("http://localhost/api/assure/share");
    const response = await GET(request);
    const data = await response.json();

    expect(data.shareLinks[0].isActive).toBe(false);
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findMany).mockRejectedValue(
      new Error("DB timeout"),
    );

    const request = makeGetRequest("http://localhost/api/assure/share");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ============================================================

describe("PATCH /api/assure/share/[id] — Update / Revoke Share Link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true } as any);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makePatchRequest(
      "http://localhost/api/assure/share/share-001",
      { isRevoked: true },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user has no organization", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

    const request = makePatchRequest(
      "http://localhost/api/assure/share/share-001",
      { isRevoked: true },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("No organization");
  });

  it("should return 403 when user has insufficient role", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipManager as any,
    );

    const request = makePatchRequest(
      "http://localhost/api/assure/share/share-001",
      { isRevoked: true },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Insufficient permissions");
  });

  it("should return 404 when share link does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(null);

    const request = makePatchRequest(
      "http://localhost/api/assure/share/nonexistent",
      { isRevoked: true },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Share link not found");
  });

  it("should return 404 when share link belongs to a different org", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      organizationId: "org-other",
    } as any);

    const request = makePatchRequest(
      "http://localhost/api/assure/share/share-001",
      { isRevoked: true },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Share link not found");
  });

  it("should return 400 when no valid fields are provided", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(
      mockShareLink as any,
    );

    const request = makePatchRequest(
      "http://localhost/api/assure/share/share-001",
      {},
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No valid fields to update");
  });

  it("should revoke a share link", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(
      mockShareLink as any,
    );
    vi.mocked(prisma.assureShareLink.update).mockResolvedValue({
      ...mockShareLink,
      isRevoked: true,
      updatedAt: new Date(),
    } as any);

    const request = makePatchRequest(
      "http://localhost/api/assure/share/share-001",
      { isRevoked: true },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isRevoked).toBe(true);
    expect(prisma.assureShareLink.update).toHaveBeenCalledWith({
      where: { id: "share-001" },
      data: { isRevoked: true },
    });
  });

  it("should update the label of a share link", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(
      mockShareLink as any,
    );
    vi.mocked(prisma.assureShareLink.update).mockResolvedValue({
      ...mockShareLink,
      label: "Updated Label",
      updatedAt: new Date(),
    } as any);

    const request = makePatchRequest(
      "http://localhost/api/assure/share/share-001",
      { label: "Updated Label" },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.label).toBe("Updated Label");
  });

  it("should log audit event with assure_share_revoked action when revoking", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(
      mockShareLink as any,
    );
    vi.mocked(prisma.assureShareLink.update).mockResolvedValue({
      ...mockShareLink,
      isRevoked: true,
    } as any);

    const request = makePatchRequest(
      "http://localhost/api/assure/share/share-001",
      { isRevoked: true },
    );
    await PATCH(request, {
      params: Promise.resolve({ id: "share-001" }),
    });

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "assure_share_revoked",
        entityType: "assure_share",
        entityId: "share-001",
      }),
    );
  });

  it("should log audit event with assure_share_updated action when updating label", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(
      mockShareLink as any,
    );
    vi.mocked(prisma.assureShareLink.update).mockResolvedValue({
      ...mockShareLink,
      label: "New Label",
    } as any);

    const request = makePatchRequest(
      "http://localhost/api/assure/share/share-001",
      { label: "New Label" },
    );
    await PATCH(request, {
      params: Promise.resolve({ id: "share-001" }),
    });

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "assure_share_updated",
      }),
    );
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(
      mockShareLink as any,
    );
    vi.mocked(prisma.assureShareLink.update).mockRejectedValue(
      new Error("DB error"),
    );

    const request = makePatchRequest(
      "http://localhost/api/assure/share/share-001",
      { isRevoked: true },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ============================================================

describe("DELETE /api/assure/share/[id] — Delete Share Link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true } as any);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makeDeleteRequest(
      "http://localhost/api/assure/share/share-001",
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user has no organization", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

    const request = makeDeleteRequest(
      "http://localhost/api/assure/share/share-001",
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("No organization");
  });

  it("should return 403 when user has insufficient role", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipViewer as any,
    );

    const request = makeDeleteRequest(
      "http://localhost/api/assure/share/share-001",
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Insufficient permissions");
  });

  it("should return 404 when share link does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(null);

    const request = makeDeleteRequest(
      "http://localhost/api/assure/share/nonexistent",
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Share link not found");
  });

  it("should return 404 when share link belongs to a different org", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      organizationId: "org-other",
    } as any);

    const request = makeDeleteRequest(
      "http://localhost/api/assure/share/share-001",
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Share link not found");
  });

  it("should delete the share link successfully", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(
      mockShareLink as any,
    );
    vi.mocked(prisma.assureShareLink.delete).mockResolvedValue(
      mockShareLink as any,
    );

    const request = makeDeleteRequest(
      "http://localhost/api/assure/share/share-001",
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.assureShareLink.delete).toHaveBeenCalledWith({
      where: { id: "share-001" },
    });
  });

  it("should log audit event on deletion", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(
      mockShareLink as any,
    );
    vi.mocked(prisma.assureShareLink.delete).mockResolvedValue(
      mockShareLink as any,
    );

    const request = makeDeleteRequest(
      "http://localhost/api/assure/share/share-001",
    );
    await DELETE(request, {
      params: Promise.resolve({ id: "share-001" }),
    });

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "assure_share_deleted",
        entityType: "assure_share",
        entityId: "share-001",
        organizationId: "org-001",
      }),
    );
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMembershipOwner as any,
    );
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(
      mockShareLink as any,
    );
    vi.mocked(prisma.assureShareLink.delete).mockRejectedValue(
      new Error("Cascade failure"),
    );

    const request = makeDeleteRequest(
      "http://localhost/api/assure/share/share-001",
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "share-001" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ============================================================

describe("GET /api/assure/share/view/[token] — Public Shared View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true } as any);
    vi.mocked(computeRRS).mockResolvedValue({
      overallScore: 78,
      grade: "C",
      status: "partial",
      components: {
        authorizationReadiness: {
          score: 80,
          weight: 0.25,
          weightedScore: 20,
          factors: [
            {
              id: "auth_workflow",
              name: "Authorization Workflow Status",
              maxPoints: 40,
              earnedPoints: 30,
              description: "Current state of authorization process",
            },
          ],
        },
        cybersecurityPosture: {
          score: 75,
          weight: 0.2,
          weightedScore: 15,
          factors: [
            {
              id: "cyber_assessment",
              name: "Cybersecurity Risk Assessment",
              maxPoints: 35,
              earnedPoints: 25,
              description: "NIS2-compliant cybersecurity risk assessment",
            },
          ],
        },
        operationalCompliance: {
          score: 70,
          weight: 0.2,
          weightedScore: 14,
          factors: [],
        },
        jurisdictionalCoverage: {
          score: 60,
          weight: 0.15,
          weightedScore: 9,
          factors: [],
        },
        regulatoryTrajectory: {
          score: 50,
          weight: 0.1,
          weightedScore: 5,
          factors: [],
        },
        governanceProcess: {
          score: 55,
          weight: 0.1,
          weightedScore: 6,
          factors: [],
        },
      },
      recommendations: [
        {
          priority: "high",
          component: "authorizationReadiness",
          action: "Complete Authorization Workflow Status",
          impact: "+3 points on overall RRS",
        },
      ],
      methodology: {
        version: "1.0",
        weights: {
          authorizationReadiness: 0.25,
          cybersecurityPosture: 0.2,
          operationalCompliance: 0.2,
          jurisdictionalCoverage: 0.15,
          regulatoryTrajectory: 0.1,
          governanceProcess: 0.1,
        },
        description: "Regulatory Readiness Score v1.0",
      },
      computedAt: new Date(),
    } as any);
    vi.mocked(getRRSHistory).mockResolvedValue([
      { date: new Date("2025-06-01"), overallScore: 65 },
      { date: new Date("2025-06-15"), overallScore: 72 },
    ] as any);
  });

  it("should return 400 when token is too short", async () => {
    const request = makeGetRequest(
      "http://localhost/api/assure/share/view/short",
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token: "short" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid token");
  });

  it("should return 404 when token is not found", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue(null);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("should return 403 when link is revoked", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      isRevoked: true,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("revoked");
  });

  it("should return 403 when link is expired", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      expiresAt: new Date(pastDate),
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("expired");
  });

  it("should return 403 when maxViews is reached", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      maxViews: 5,
      viewCount: 5,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("maximum view count");
  });

  it("should allow access when maxViews is null (unlimited)", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      maxViews: null,
      viewCount: 1000,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.organizationName).toBe("SpaceCorp");
  });

  it("should increment view count and log view via transaction", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    await getSharedView(request, {
      params: Promise.resolve({ token }),
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("should return RRS data when includeRRS is true", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      includeRRS: true,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rrs).toBeDefined();
    expect(data.rrs.overallScore).toBe(78);
    expect(data.rrs.grade).toBe("C");
    expect(data.rrs.components).toBeDefined();
  });

  it("should include gap analysis at COMPONENT granularity when enabled", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      granularity: "COMPONENT",
      includeGapAnalysis: true,
      includeRRS: true,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.gapAnalysis).toBeDefined();
    expect(data.gapAnalysis.authorizationReadiness).toBeDefined();
    expect(data.gapAnalysis.authorizationReadiness.gap).toBe(20);
  });

  it("should include recommendations when includeRiskRegister is true at COMPONENT level", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      granularity: "COMPONENT",
      includeRiskRegister: true,
      includeGapAnalysis: false,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recommendations).toBeDefined();
    expect(data.recommendations[0].priority).toBe("high");
  });

  it("should include detailed components and methodology at DETAILED level", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      granularity: "DETAILED",
      includeRRS: true,
      includeGapAnalysis: false,
      includeRiskRegister: false,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.detailedComponents).toBeDefined();
    expect(data.methodology).toBeDefined();
    expect(data.methodology.version).toBe("1.0");
  });

  it("should include trend data when includeTrend is true", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      includeTrend: true,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trend).toBeDefined();
    expect(Array.isArray(data.trend)).toBe(true);
    expect(data.trend).toHaveLength(2);
    expect(getRRSHistory).toHaveBeenCalledWith("org-001", 90);
  });

  it("should not include gap analysis at SUMMARY level", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      granularity: "SUMMARY",
      includeGapAnalysis: true,
      includeRRS: true,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.gapAnalysis).toBeUndefined();
  });

  it("should not include RRS data when includeRRS is false", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      includeRRS: false,
      includeGapAnalysis: false,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rrs).toBeUndefined();
  });

  it("should include organization name and granularity in response", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.organizationName).toBe("SpaceCorp");
    expect(data.granularity).toBe("COMPONENT");
    expect(data.generatedAt).toBeDefined();
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false } as any);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests");
  });

  it("should return 500 on computeRRS error", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);
    vi.mocked(computeRRS).mockRejectedValue(new Error("Engine failure"));

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should gracefully handle trend fetch failure", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      includeTrend: true,
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);
    vi.mocked(getRRSHistory).mockRejectedValue(new Error("Trend DB error"));

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    const response = await getSharedView(request, {
      params: Promise.resolve({ token }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trend).toEqual([]);
  });

  it("should call computeRRS with the correct organization ID", async () => {
    vi.mocked(prisma.assureShareLink.findUnique).mockResolvedValue({
      ...mockShareLink,
      organizationId: "org-001",
      organization: { id: "org-001", name: "SpaceCorp" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    const token = "a".repeat(64);
    const request = makeGetRequest(
      `http://localhost/api/assure/share/view/${token}`,
    );
    await getSharedView(request, {
      params: Promise.resolve({ token }),
    });

    expect(computeRRS).toHaveBeenCalledWith("org-001");
  });
});
