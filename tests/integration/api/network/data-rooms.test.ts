import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock logger ───
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Mock validations ───
vi.mock("@/lib/validations", () => ({
  parsePaginationLimit: vi.fn(
    (raw: string | null, defaultLimit = 50, maxLimit = 100) => {
      const parsed = parseInt(raw || String(defaultLimit), 10);
      if (isNaN(parsed) || parsed < 1) return defaultLimit;
      return Math.min(parsed, maxLimit);
    },
  ),
}));

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

// ─── Mock data room service ───
const mockGetDataRooms = vi.fn();
const mockCreateDataRoom = vi.fn();

vi.mock("@/lib/services/data-room", () => ({
  getDataRooms: (...args: unknown[]) => mockGetDataRooms(...args),
  createDataRoom: (...args: unknown[]) => mockCreateDataRoom(...args),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { GET, POST } from "@/app/api/network/data-rooms/route";

// ─── Helpers ───

const mockSession = {
  user: { id: "user-123", email: "test@example.com" },
};

const ORG_ID = "org-abc";

const mockMember = {
  role: "OWNER",
  permissions: [],
};

// ─── Tests ───

describe("GET /api/network/data-rooms", () => {
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
      `http://localhost/api/network/data-rooms?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when organizationId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = new NextRequest("http://localhost/api/network/data-rooms");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("organizationId is required");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/network/data-rooms?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user lacks network:read permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockReturnValue(false);

    const request = new NextRequest(
      `http://localhost/api/network/data-rooms?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return data rooms list for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const mockResult = {
      dataRooms: [
        {
          id: "dr-1",
          name: "Compliance Room",
          engagementId: "eng-1",
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    };
    mockGetDataRooms.mockResolvedValue(mockResult);

    const request = new NextRequest(
      `http://localhost/api/network/data-rooms?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dataRooms).toBeDefined();
    expect(data.total).toBe(1);
  });

  it("should pass filter parameters to service", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    mockGetDataRooms.mockResolvedValue({
      dataRooms: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    const request = new NextRequest(
      `http://localhost/api/network/data-rooms?organizationId=${ORG_ID}&engagementId=eng-1&isActive=true`,
    );
    await GET(request);

    expect(mockGetDataRooms).toHaveBeenCalledWith(
      ORG_ID,
      { engagementId: "eng-1", isActive: true },
      { page: 1, limit: 50 },
    );
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    mockGetDataRooms.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest(
      `http://localhost/api/network/data-rooms?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch data rooms");
  });
});

describe("POST /api/network/data-rooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMember as any,
    );
    vi.mocked(hasPermission).mockReturnValue(true);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/network/data-rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: ORG_ID,
        engagementId: "eng-1",
        name: "Test Room",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when organizationId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = new NextRequest("http://localhost/api/network/data-rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        engagementId: "eng-1",
        name: "Test Room",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  it("should return 400 when required fields are missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = new NextRequest("http://localhost/api/network/data-rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: ORG_ID,
        // Missing engagementId and name
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  it("should return 403 when user lacks network:write permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/network/data-rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: ORG_ID,
        engagementId: "eng-1",
        name: "Test Room",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should create data room successfully", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const mockDataRoom = {
      id: "dr-new",
      name: "Test Room",
      engagementId: "eng-1",
      organizationId: ORG_ID,
      isActive: true,
      createdAt: new Date(),
    };
    mockCreateDataRoom.mockResolvedValue(mockDataRoom);

    const request = new NextRequest("http://localhost/api/network/data-rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: ORG_ID,
        engagementId: "eng-1",
        name: "Test Room",
        description: "A test data room",
        accessLevel: "VIEW_ONLY",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.dataRoom).toBeDefined();
    expect(data.dataRoom.id).toBe("dr-new");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    mockCreateDataRoom.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest("http://localhost/api/network/data-rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: ORG_ID,
        engagementId: "eng-1",
        name: "Test Room",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create data room");
  });
});
