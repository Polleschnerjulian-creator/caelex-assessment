import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock server-only ───
vi.mock("server-only", () => ({}));

// ─── Mock rate limiter ───
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 9 }),
  getIdentifier: vi.fn().mockReturnValue("127.0.0.1"),
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
    }),
  ),
}));

// ─── Mock compliance engine ───
const mockCalculateCompliance = vi.fn();
const mockLoadSpaceActDataFromDisk = vi.fn();
const mockRedactArticlesForClient = vi.fn();

vi.mock("@/lib/engine.server", () => ({
  calculateCompliance: (...args: unknown[]) => mockCalculateCompliance(...args),
  loadSpaceActDataFromDisk: (...args: unknown[]) =>
    mockLoadSpaceActDataFromDisk(...args),
  redactArticlesForClient: (...args: unknown[]) =>
    mockRedactArticlesForClient(...args),
}));

import { POST } from "@/app/api/assessment/calculate/route";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";

// ─── Helpers ───

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/assessment/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validAnswers = {
  activityType: "spacecraft",
  entitySize: "large",
  primaryOrbit: "LEO",
  establishment: "eu",
  constellationSize: 10,
  isDefenseOnly: false,
  hasPostLaunchAssets: true,
  operatesConstellation: true,
  offersEUServices: true,
};

const mockComplianceResult = {
  regime: "standard",
  applicableArticles: [],
  moduleStatuses: {},
  checklists: {},
};

// ─── Tests ───

describe("POST /api/assessment/calculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup ratelimit mock after clearAllMocks
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 9,
      reset: Date.now() + 60000,
      limit: 10,
    });
    vi.mocked(createRateLimitResponse).mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      }) as any,
    );
    mockLoadSpaceActDataFromDisk.mockReturnValue({ articles: [] });
    mockCalculateCompliance.mockReturnValue(mockComplianceResult);
    mockRedactArticlesForClient.mockReturnValue(mockComplianceResult);
  });

  // ─── Success Case ───

  it("should return 200 with compliance result for valid answers", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.result).toBeDefined();
    expect(mockCalculateCompliance).toHaveBeenCalledTimes(1);
    expect(mockRedactArticlesForClient).toHaveBeenCalledWith(
      mockComplianceResult,
    );
  });

  it("should include rate limit and cache control headers", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("9");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  // ─── Validation: Invalid Body ───

  it("should return 400 for invalid JSON body", async () => {
    const request = new NextRequest(
      "http://localhost/api/assessment/calculate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json{{{",
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("should return 400 for invalid activityType", async () => {
    const request = makeRequest({
      answers: { ...validAnswers, activityType: "invalid_type" },
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 400 for invalid entitySize", async () => {
    const request = makeRequest({
      answers: { ...validAnswers, entitySize: "gigantic" },
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 400 for invalid primaryOrbit", async () => {
    const request = makeRequest({
      answers: { ...validAnswers, primaryOrbit: "PLUTO" },
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 400 for invalid establishment", async () => {
    const request = makeRequest({
      answers: { ...validAnswers, establishment: "mars_colony" },
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 400 for negative constellationSize", async () => {
    const request = makeRequest({
      answers: { ...validAnswers, constellationSize: -5 },
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 400 for non-boolean isDefenseOnly", async () => {
    const request = makeRequest({
      answers: { ...validAnswers, isDefenseOnly: "yes" },
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  // ─── Anti-Bot: Timing Validation ───

  it("should return 429 if assessment completed in under 3 seconds (bot detection)", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 1000, // 1 second ago
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain("too quickly");
  });

  // ─── Rate Limiting ───

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
    } as any);

    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(createRateLimitResponse).toHaveBeenCalled();
  });

  // ─── Engine Error ───

  it("should return 500 when compliance engine throws", async () => {
    mockCalculateCompliance.mockImplementation(() => {
      throw new Error("Engine failure");
    });

    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Assessment calculation failed");
  });

  // ─── Null fields are allowed ───

  it("should accept null values for optional fields", async () => {
    const request = makeRequest({
      answers: {
        activityType: "spacecraft",
        entitySize: null,
        primaryOrbit: null,
        establishment: null,
        constellationSize: null,
        isDefenseOnly: null,
        hasPostLaunchAssets: null,
        operatesConstellation: null,
        offersEUServices: null,
      },
      startedAt: Date.now() - 60000,
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
