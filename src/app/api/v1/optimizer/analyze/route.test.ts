/**
 * Optimizer Analyze Route Tests (POST /api/v1/optimizer/analyze)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted — no external references in factories) ───────

vi.mock("server-only", () => ({}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findFirst: vi.fn() },
    optimizationResult: { create: vi.fn() },
  },
}));

const mockRunOptimization = vi.fn();
vi.mock("@/lib/optimizer/regulatory-optimizer.server", () => ({
  runOptimization: (...a: unknown[]) => mockRunOptimization(...a),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 9 }),
  getIdentifier: vi.fn().mockReturnValue("test-ip"),
  createRateLimitResponse: vi.fn(),
}));

vi.mock("@/lib/verity/utils/redaction", () => ({ safeLog: vi.fn() }));

// ── Import after mocks ──────────────────────────────────────────

import { POST } from "./route";
import { prisma } from "@/lib/prisma";

// Cast prisma to access mock methods
const mockPrisma = prisma as unknown as {
  organizationMember: { findFirst: ReturnType<typeof vi.fn> };
  optimizationResult: { create: ReturnType<typeof vi.fn> };
};

// ── Helpers ─────────────────────────────────────────────────────

const VALID_BODY = {
  activityType: "spacecraft_operation",
  entityNationality: "domestic",
  entitySize: "small",
  primaryOrbit: "LEO",
  constellationSize: 1,
  missionDurationYears: 5,
  hasDesignForDemise: true,
  weightProfile: "startup",
};

const MOCK_RESULT = {
  rankings: [
    {
      jurisdiction: "LU",
      jurisdictionName: "Luxembourg",
      flagEmoji: "\u{1F1F1}\u{1F1FA}",
      totalScore: 82.5,
      dimensionScores: {
        timeline: 90,
        cost: 85,
        compliance: 70,
        insurance: 80,
        liability: 75,
        debris: 60,
      },
      badges: ["BEST_OVERALL"],
      timeline: { min: 4, max: 8 },
      estimatedCost: { application: "\u20AC5,000", annual: "\u20AC1,000" },
      keyAdvantages: ["Fast processing timeline"],
      keyRisks: [],
    },
  ],
  tradeOffData: [],
  summary: {
    bestOverall: "\u{1F1F1}\u{1F1FA} Luxembourg",
    bestForTimeline: "\u{1F1F1}\u{1F1FA} Luxembourg",
    bestForCost: "\u{1F1F1}\u{1F1FA} Luxembourg",
    bestForCompliance: "\u{1F1EB}\u{1F1F7} France",
  },
};

function makeRequest(body: unknown): Request {
  return new Request("https://app.caelex.com/api/v1/optimizer/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ───────────────────────────────────────────────────────

describe("POST /api/v1/optimizer/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockPrisma.organizationMember.findFirst.mockReset();
    mockPrisma.optimizationResult.create.mockReset();
    mockRunOptimization.mockReset();
  });

  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY) as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 without organization membership", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY) as never);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("No organization");
  });

  it("returns 400 for invalid body (missing required fields)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });

    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(body.details.length).toBeGreaterThan(0);
  });

  it("returns 400 for invalid activityType", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });

    const res = await POST(
      makeRequest({ ...VALID_BODY, activityType: "invalid" }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toEqual(
      expect.arrayContaining([expect.stringContaining("activityType")]),
    );
  });

  it("returns 400 for non-positive constellationSize", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });

    const res = await POST(
      makeRequest({ ...VALID_BODY, constellationSize: -1 }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toEqual(
      expect.arrayContaining([expect.stringContaining("constellationSize")]),
    );
  });

  it("returns 400 for non-boolean hasDesignForDemise", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });

    const res = await POST(
      makeRequest({ ...VALID_BODY, hasDesignForDemise: "yes" }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toEqual(
      expect.arrayContaining([expect.stringContaining("hasDesignForDemise")]),
    );
  });

  it("returns 200 with optimization results on valid input", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });
    mockRunOptimization.mockResolvedValue(MOCK_RESULT);
    mockPrisma.optimizationResult.create.mockResolvedValue({ id: "res-1" });

    const res = await POST(makeRequest(VALID_BODY) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.rankings).toHaveLength(1);
    expect(body.data.rankings[0].jurisdiction).toBe("LU");
    expect(body.data.summary.bestOverall).toContain("Luxembourg");
  });

  it("calls runOptimization with parsed input", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });
    mockRunOptimization.mockResolvedValue(MOCK_RESULT);
    mockPrisma.optimizationResult.create.mockResolvedValue({ id: "res-1" });

    await POST(makeRequest(VALID_BODY) as never);

    expect(mockRunOptimization).toHaveBeenCalledOnce();
    expect(mockRunOptimization).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: "spacecraft_operation",
        entityNationality: "domestic",
        entitySize: "small",
        primaryOrbit: "LEO",
        constellationSize: 1,
        missionDurationYears: 5,
        hasDesignForDemise: true,
        weightProfile: "startup",
      }),
    );
  });

  it("persists result to database with correct fields", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });
    mockRunOptimization.mockResolvedValue(MOCK_RESULT);
    mockPrisma.optimizationResult.create.mockResolvedValue({ id: "res-1" });

    await POST(makeRequest(VALID_BODY) as never);

    expect(mockPrisma.optimizationResult.create).toHaveBeenCalledOnce();
    expect(mockPrisma.optimizationResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        weightProfile: "startup",
        spacecraftId: null,
        currentJurisdiction: null,
        topJurisdiction: "LU",
        topScore: 82.5,
      }),
    });
  });

  it("returns 500 when engine throws", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });
    mockRunOptimization.mockRejectedValue(new Error("Engine failure"));

    const res = await POST(makeRequest(VALID_BODY) as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to run optimization analysis");
    // Should not leak internal error details
    expect(JSON.stringify(body)).not.toContain("Engine failure");
  });

  it("passes currentJurisdiction when provided", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });
    mockRunOptimization.mockResolvedValue(MOCK_RESULT);
    mockPrisma.optimizationResult.create.mockResolvedValue({ id: "res-1" });

    await POST(
      makeRequest({ ...VALID_BODY, currentJurisdiction: "DE" }) as never,
    );

    expect(mockRunOptimization).toHaveBeenCalledWith(
      expect.objectContaining({ currentJurisdiction: "DE" }),
    );
    expect(mockPrisma.optimizationResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ currentJurisdiction: "DE" }),
    });
  });
});
