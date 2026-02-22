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
  },
}));

// ─── Mock permissions ───
vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockReturnValue(true),
  getPermissionsForRole: vi
    .fn()
    .mockReturnValue(["network:read", "network:write"]),
}));

// ─── Mock stakeholder engagement service ───
const mockGetEngagements = vi.fn();
const mockCreateEngagement = vi.fn();

vi.mock("@/lib/services/stakeholder-engagement", () => ({
  getEngagements: (...args: unknown[]) => mockGetEngagements(...args),
  createEngagement: (...args: unknown[]) => mockCreateEngagement(...args),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { GET, POST } from "@/app/api/network/engagements/route";

// ─── Helpers ───

const mockSession = {
  user: { id: "user-123", email: "test@example.com" },
};

const ORG_ID = "org-abc";

const mockMember = {
  role: "OWNER",
  permissions: [],
};

const validEngagementData = {
  organizationId: ORG_ID,
  type: "REGULATOR",
  companyName: "ESA",
  contactName: "John Doe",
  contactEmail: "john@esa.int",
  scope: "Authorization oversight",
};

// ─── Tests ───

describe("GET /api/network/engagements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMember as any,
    );
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/network/engagements?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when organizationId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = new NextRequest("http://localhost/api/network/engagements");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("organizationId is required");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/network/engagements?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user lacks network:read permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMember as any,
    );
    vi.mocked(hasPermission).mockReturnValue(false);

    const request = new NextRequest(
      `http://localhost/api/network/engagements?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return engagements list for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockReturnValue(true);

    const mockEngagements = {
      engagements: [
        {
          id: "eng-1",
          type: "REGULATOR",
          companyName: "ESA",
          status: "ACTIVE",
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    };
    mockGetEngagements.mockResolvedValue(mockEngagements);

    const request = new NextRequest(
      `http://localhost/api/network/engagements?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.engagements).toBeDefined();
    expect(data.total).toBe(1);
  });

  it("should pass filter parameters to service", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockReturnValue(true);
    mockGetEngagements.mockResolvedValue({
      engagements: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    const request = new NextRequest(
      `http://localhost/api/network/engagements?organizationId=${ORG_ID}&type=REGULATOR&status=ACTIVE&search=ESA`,
    );
    await GET(request);

    expect(mockGetEngagements).toHaveBeenCalledWith(
      ORG_ID,
      { type: "REGULATOR", status: "ACTIVE", search: "ESA" },
      { page: 1, limit: 50 },
    );
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockReturnValue(true);
    mockGetEngagements.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest(
      `http://localhost/api/network/engagements?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch engagements");
  });
});

describe("POST /api/network/engagements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMember as any,
    );
    vi.mocked(hasPermission).mockReturnValue(true);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/network/engagements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validEngagementData),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when organizationId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const { organizationId, ...dataWithoutOrg } = validEngagementData;
    const request = new NextRequest(
      "http://localhost/api/network/engagements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataWithoutOrg),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("organizationId is required");
  });

  it("should return 400 when required fields are missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = new NextRequest(
      "http://localhost/api/network/engagements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: ORG_ID,
          type: "REGULATOR",
          // Missing: companyName, contactName, contactEmail, scope
        }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 403 when user lacks network:write permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    // First call returns true for findFirst, but hasPermission returns false
    vi.mocked(hasPermission).mockReturnValue(false);

    const request = new NextRequest(
      "http://localhost/api/network/engagements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validEngagementData),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should create engagement successfully", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const mockResult = {
      engagement: {
        id: "eng-new",
        type: "REGULATOR",
        companyName: "ESA",
        contactName: "John Doe",
        contactEmail: "john@esa.int",
        status: "ACTIVE",
      },
      accessToken: "tok_abc123",
    };
    mockCreateEngagement.mockResolvedValue(mockResult);

    const request = new NextRequest(
      "http://localhost/api/network/engagements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validEngagementData),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.engagement).toBeDefined();
    expect(data.accessToken).toBe("tok_abc123");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    mockCreateEngagement.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest(
      "http://localhost/api/network/engagements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validEngagementData),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create engagement");
  });
});
