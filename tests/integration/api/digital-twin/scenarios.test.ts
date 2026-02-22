import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock server-only
vi.mock("server-only", () => ({}));

// Auth mock
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Prisma mock
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockFindFirst = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateMany = vi.fn();
const mockOrgMemberFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatIfScenario: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
    organizationMember: {
      findFirst: (...args: unknown[]) => mockOrgMemberFindFirst(...args),
    },
  },
}));

// Simulation service mock
const mockSimulate = vi.fn();
const mockChain = vi.fn();
vi.mock("@/lib/services/whatif-simulation-service", () => ({
  simulateScenario: (...args: unknown[]) => mockSimulate(...args),
  simulateChain: (...args: unknown[]) => mockChain(...args),
}));

// Engine bridge mock
const mockMarkStale = vi.fn();
const mockRecompute = vi.fn();
vi.mock("@/lib/services/whatif-engine-bridge", () => ({
  computeRegulationVersionHash: () => "v1-119-67",
  markStaleScenarios: (...args: unknown[]) => mockMarkStale(...args),
  recomputeScenario: (...args: unknown[]) => mockRecompute(...args),
}));

// Route imports
import { POST, GET } from "@/app/api/digital-twin/scenarios/route";
import { POST as ComparePost } from "@/app/api/digital-twin/scenarios/compare/route";
import { POST as RecomputePost } from "@/app/api/digital-twin/scenarios/recompute/route";
import {
  GET as GetById,
  DELETE as DeleteById,
  PATCH as PatchById,
} from "@/app/api/digital-twin/scenarios/[id]/route";

function makeRequest(url: string, opts?: RequestInit) {
  return new NextRequest(`http://localhost${url}`, opts);
}

// Sample scenario stored in DB
const sampleScenario = {
  id: "scenario-1",
  userId: "user-1",
  organizationId: "org-1",
  name: "Test Scenario",
  scenarioType: "add_jurisdiction",
  parameters: JSON.stringify({ jurisdictionCode: "FR" }),
  baselineScore: 75,
  projectedScore: 70,
  scoreDelta: -5,
  results: JSON.stringify({
    scenarioType: "add_jurisdiction",
    baselineScore: 75,
    projectedScore: 70,
    scoreDelta: -5,
    newRequirements: [
      {
        id: "art-new",
        title: "New Article",
        framework: "EU Space Act",
        type: "new",
        impact: "high",
        description: "New requirement",
      },
    ],
    financialImpact: {
      currentExposure: 5000000,
      projectedExposure: 6000000,
      delta: 1000000,
    },
    riskAssessment: { level: "medium", summary: "Medium risk" },
    recommendations: ["Review requirements"],
  }),
  isFavorite: false,
  isStale: false,
  regulationVersion: "v1-119-67",
  computedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleScenario2 = {
  ...sampleScenario,
  id: "scenario-2",
  name: "Test Scenario 2",
  scenarioType: "add_satellites",
  parameters: JSON.stringify({ additionalSatellites: 50 }),
  projectedScore: 65,
  scoreDelta: -10,
  results: JSON.stringify({
    scenarioType: "add_satellites",
    baselineScore: 75,
    projectedScore: 65,
    scoreDelta: -10,
    newRequirements: [],
    financialImpact: {
      currentExposure: 5000000,
      projectedExposure: 8000000,
      delta: 3000000,
    },
    riskAssessment: { level: "high", summary: "High risk" },
    recommendations: ["Update debris plan"],
  }),
};

describe("Digital Twin Scenarios API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
    });
  });

  // ─── GET /api/digital-twin/scenarios ───

  describe("GET /api/digital-twin/scenarios", () => {
    it("returns 401 for unauthenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeRequest("/api/digital-twin/scenarios");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns scenarios list", async () => {
      mockFindMany.mockResolvedValue([sampleScenario]);

      const req = makeRequest("/api/digital-twin/scenarios");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("Test Scenario");
      // Results should be parsed from JSON
      expect(typeof body.data[0].results).toBe("object");
      expect(typeof body.data[0].parameters).toBe("object");
    });

    it("filters by favorites", async () => {
      mockFindMany.mockResolvedValue([]);

      const req = makeRequest("/api/digital-twin/scenarios?favorites=true");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            isFavorite: true,
          }),
        }),
      );
    });
  });

  // ─── POST /api/digital-twin/scenarios ───

  describe("POST /api/digital-twin/scenarios", () => {
    it("returns 401 for unauthenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeRequest("/api/digital-twin/scenarios", {
        method: "POST",
        body: JSON.stringify({
          scenarioType: "add_jurisdiction",
          name: "Test",
          parameters: { jurisdictionCode: "FR" },
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 400 for missing fields", async () => {
      const req = makeRequest("/api/digital-twin/scenarios", {
        method: "POST",
        body: JSON.stringify({ scenarioType: "add_jurisdiction" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("Missing required fields");
    });

    it("returns 400 for invalid scenario type", async () => {
      const req = makeRequest("/api/digital-twin/scenarios", {
        method: "POST",
        body: JSON.stringify({
          scenarioType: "invalid_type",
          name: "Bad Type",
          parameters: {},
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("Invalid scenarioType");
    });

    it("creates and returns simulation result", async () => {
      const simulationResult = {
        scenarioType: "add_jurisdiction",
        baselineScore: 75,
        projectedScore: 70,
        scoreDelta: -5,
        newRequirements: [],
        financialImpact: {
          currentExposure: 5000000,
          projectedExposure: 6000000,
          delta: 1000000,
        },
        riskAssessment: { level: "low", summary: "Low risk" },
        recommendations: [],
      };

      mockSimulate.mockResolvedValue(simulationResult);
      mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org-1" });
      mockCreate.mockResolvedValue({
        id: "new-scenario-1",
        userId: "user-1",
        name: "Add FR",
        scenarioType: "add_jurisdiction",
        parameters: JSON.stringify({ jurisdictionCode: "FR" }),
        results: JSON.stringify(simulationResult),
        baselineScore: 75,
        projectedScore: 70,
        scoreDelta: -5,
        isFavorite: false,
        isStale: false,
        regulationVersion: "v1-119-67",
        computedAt: new Date(),
      });

      const req = makeRequest("/api/digital-twin/scenarios", {
        method: "POST",
        body: JSON.stringify({
          scenarioType: "add_jurisdiction",
          name: "Add FR",
          parameters: { jurisdictionCode: "FR" },
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.result).toBeDefined();
      expect(body.data.result.scenarioType).toBe("add_jurisdiction");
      expect(mockSimulate).toHaveBeenCalledWith("user-1", {
        scenarioType: "add_jurisdiction",
        name: "Add FR",
        parameters: { jurisdictionCode: "FR" },
      });
      expect(mockCreate).toHaveBeenCalled();
    });

    it("handles chain scenario type", async () => {
      const chainResult = {
        steps: [
          {
            name: "Step 1",
            result: { baselineScore: 75, projectedScore: 70, scoreDelta: -5 },
            cumulativeScore: 70,
          },
        ],
        totalScoreDelta: -5,
        finalScore: 70,
        blockers: [],
        criticalPath: [],
      };

      mockChain.mockResolvedValue(chainResult);
      mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org-1" });
      mockCreate.mockResolvedValue({
        id: "chain-1",
        userId: "user-1",
        name: "My Chain",
        scenarioType: "chain",
        parameters: JSON.stringify({
          steps: [
            {
              name: "Step 1",
              type: "add_jurisdiction",
              parameters: { jurisdictionCode: "FR" },
            },
          ],
        }),
        results: JSON.stringify(chainResult),
        baselineScore: 0,
        projectedScore: 70,
        scoreDelta: -5,
        isFavorite: false,
        isStale: false,
        regulationVersion: "v1-119-67",
        computedAt: new Date(),
      });

      const req = makeRequest("/api/digital-twin/scenarios", {
        method: "POST",
        body: JSON.stringify({
          scenarioType: "chain",
          name: "My Chain",
          parameters: {
            steps: [
              {
                name: "Step 1",
                type: "add_jurisdiction",
                parameters: { jurisdictionCode: "FR" },
              },
            ],
          },
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockChain).toHaveBeenCalledWith("user-1", {
        name: "My Chain",
        parameters: {
          steps: [
            {
              name: "Step 1",
              type: "add_jurisdiction",
              parameters: { jurisdictionCode: "FR" },
            },
          ],
        },
      });
    });
  });

  // ─── PATCH /api/digital-twin/scenarios/[id] ───

  describe("PATCH /api/digital-twin/scenarios/[id]", () => {
    it("toggles favorite", async () => {
      mockFindFirst.mockResolvedValue(sampleScenario);
      mockUpdate.mockResolvedValue({
        ...sampleScenario,
        isFavorite: true,
      });

      const req = makeRequest("/api/digital-twin/scenarios/scenario-1", {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: true }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await PatchById(req, {
        params: Promise.resolve({ id: "scenario-1" }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "scenario-1" },
          data: expect.objectContaining({ isFavorite: true }),
        }),
      );
    });

    it("returns 404 for missing scenario", async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest("/api/digital-twin/scenarios/nonexistent", {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: true }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await PatchById(req, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Scenario not found");
    });
  });

  // ─── DELETE /api/digital-twin/scenarios/[id] ───

  describe("DELETE /api/digital-twin/scenarios/[id]", () => {
    it("deletes scenario", async () => {
      mockFindFirst.mockResolvedValue(sampleScenario);
      mockDelete.mockResolvedValue(sampleScenario);

      const req = makeRequest("/api/digital-twin/scenarios/scenario-1", {
        method: "DELETE",
      });
      const res = await DeleteById(req, {
        params: Promise.resolve({ id: "scenario-1" }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: "scenario-1" },
      });
    });
  });

  // ─── POST /api/digital-twin/scenarios/compare ───

  describe("POST /api/digital-twin/scenarios/compare", () => {
    it("returns 400 for fewer than 2 scenarios", async () => {
      const req = makeRequest("/api/digital-twin/scenarios/compare", {
        method: "POST",
        body: JSON.stringify({ scenarioIds: ["scenario-1"] }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await ComparePost(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("2-4 scenarios");
    });

    it("compares scenarios with weighted ranking", async () => {
      mockFindMany.mockResolvedValue([sampleScenario, sampleScenario2]);

      const req = makeRequest("/api/digital-twin/scenarios/compare", {
        method: "POST",
        body: JSON.stringify({
          scenarioIds: ["scenario-1", "scenario-2"],
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await ComparePost(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.scenarios).toHaveLength(2);
      expect(body.data.dimensions).toBeDefined();
      expect(body.data.dimensions.length).toBeGreaterThan(0);
      expect(body.data.recommendation).toBeDefined();
      expect(body.data.recommendation.bestScenarioId).toBeDefined();
      // Each scenario should have a weighted score
      for (const scenario of body.data.scenarios) {
        expect(typeof scenario.weightedScore).toBe("number");
      }
      // Scenarios should be sorted by weighted score descending
      expect(body.data.scenarios[0].weightedScore).toBeGreaterThanOrEqual(
        body.data.scenarios[1].weightedScore,
      );
    });
  });

  // ─── POST /api/digital-twin/scenarios/recompute ───

  describe("POST /api/digital-twin/scenarios/recompute", () => {
    it("marks stale scenarios", async () => {
      mockMarkStale.mockResolvedValue(2);

      const req = makeRequest("/api/digital-twin/scenarios/recompute", {
        method: "POST",
        body: JSON.stringify({ markStale: true }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await RecomputePost(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.markedStale).toBe(2);
      expect(mockMarkStale).toHaveBeenCalledWith("user-1");
    });

    it("recomputes a scenario", async () => {
      mockRecompute.mockResolvedValue({ success: true });

      const req = makeRequest("/api/digital-twin/scenarios/recompute", {
        method: "POST",
        body: JSON.stringify({ scenarioId: "scenario-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await RecomputePost(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockRecompute).toHaveBeenCalledWith("user-1", "scenario-1");
    });
  });
});
