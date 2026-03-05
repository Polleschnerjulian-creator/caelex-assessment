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

// ─── Mock subscription service ───
const mockCreateCheckoutSession = vi.fn();
vi.mock("@/lib/services/subscription-service", () => ({
  createCheckoutSession: (...args: unknown[]) =>
    mockCreateCheckoutSession(...args),
}));

// ─── Mock validations (partial - keep real schemas) ───
vi.mock("@/lib/validations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validations")>();
  return {
    ...actual,
    getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
  };
});

// ─── Mock logger ───
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/stripe/create-checkout-session/route";

// ─── Helpers ───

const mockSession = {
  user: {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  },
};

const ORG_ID = "clorg123456789012345678";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/stripe/create-checkout-session",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

// ─── Tests ───

describe("POST /api/stripe/create-checkout-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCheckoutSession.mockResolvedValue({
      sessionId: "cs_test_session_123",
      url: "https://checkout.stripe.com/test",
    });
  });

  // ─── Authentication ───

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makeRequest({
      priceId: "price_abc123",
      organizationId: ORG_ID,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when session has no user id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as any);

    const request = makeRequest({
      priceId: "price_abc123",
      organizationId: ORG_ID,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // ─── Validation ───

  it("should return 400 for invalid priceId format", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest({
      priceId: "invalid-price-id",
      organizationId: ORG_ID,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 400 for missing priceId", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest({
      organizationId: ORG_ID,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 400 for missing organizationId", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest({
      priceId: "price_abc123",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  // ─── Authorization ───

  it("should return 403 when user is not an owner or admin of the organization", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

    const request = makeRequest({
      priceId: "price_abc123",
      organizationId: ORG_ID,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("owners and admins");
  });

  // ─── Success ───

  it("should create checkout session for authorized user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      userId: "user-123",
      organizationId: ORG_ID,
      role: "OWNER",
    } as any);

    const request = makeRequest({
      priceId: "price_abc123",
      organizationId: ORG_ID,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessionId).toBe("cs_test_session_123");
    expect(data.url).toBeDefined();
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_ID,
        priceId: "price_abc123",
        userId: "user-123",
      }),
    );
  });

  it("should allow ADMIN role to create checkout session", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-2",
      userId: "user-123",
      organizationId: ORG_ID,
      role: "ADMIN",
    } as any);

    const request = makeRequest({
      priceId: "price_xyz789",
      organizationId: ORG_ID,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessionId).toBeDefined();
  });

  // ─── Stripe Error ───

  it("should return 500 when createCheckoutSession throws", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      userId: "user-123",
      organizationId: ORG_ID,
      role: "OWNER",
    } as any);
    mockCreateCheckoutSession.mockRejectedValue(new Error("Stripe API error"));

    const request = makeRequest({
      priceId: "price_abc123",
      organizationId: ORG_ID,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  // ─── priceId membership lookup ───

  it("should query membership with correct where clause", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      id: "member-1",
      userId: "user-123",
      organizationId: ORG_ID,
      role: "OWNER",
    } as any);

    const request = makeRequest({
      priceId: "price_abc123",
      organizationId: ORG_ID,
    });
    await POST(request);

    expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        userId: "user-123",
        role: { in: ["OWNER", "ADMIN"] },
      },
    });
  });
});
