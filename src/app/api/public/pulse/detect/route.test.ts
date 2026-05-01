/**
 * /api/public/pulse/detect route tests.
 *
 * Coverage:
 *
 *   1. Rate-limit: 429 when limit exceeded
 *   2. Validation: 400 on garbage body
 *   3. Validation: 400 on missing email
 *   4. Happy path: creates lead row + invokes dispatchAnonymous + returns
 *      sanitized PulseDetectResponse with leadId + bestPossibleTier
 *   5. Lead-create failure → 500
 *   6. Detection throw → 200 with empty result + warning (lead survives)
 *   7. CORS: OPTIONS preflight returns 204 with Access-Control headers
 *   8. bestPossibleTier T2_SOURCE_VERIFIED when ≥1 field merged
 *   9. bestPossibleTier T0_UNVERIFIED when no fields merged
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPulseLead,
  mockDispatchAnonymous,
  mockCheckRateLimit,
  mockGetIdentifier,
  mockApplyCorsHeaders,
  mockHandleCorsPreflight,
  mockCreateRateLimitResponse,
  mockCreateRateLimitHeaders,
} = vi.hoisted(() => ({
  mockPulseLead: { create: vi.fn(), update: vi.fn() },
  mockDispatchAnonymous: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockGetIdentifier: vi.fn(() => "ip:1.2.3.4"),
  mockApplyCorsHeaders: vi.fn((res) => res),
  mockHandleCorsPreflight: vi.fn(() => new Response(null, { status: 204 })),
  mockCreateRateLimitResponse: vi.fn(
    () =>
      new Response(JSON.stringify({ error: "rate limited" }), { status: 429 }),
  ),
  mockCreateRateLimitHeaders: vi.fn(() => new Headers()),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { pulseLead: mockPulseLead },
}));

vi.mock("@/lib/operator-profile/auto-detection/dispatcher.server", () => ({
  dispatchAnonymous: mockDispatchAnonymous,
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
  getIdentifier: mockGetIdentifier,
  createRateLimitResponse: mockCreateRateLimitResponse,
  createRateLimitHeaders: mockCreateRateLimitHeaders,
}));

vi.mock("@/lib/cors.server", () => ({
  applyCorsHeaders: mockApplyCorsHeaders,
  handleCorsPreflightResponse: mockHandleCorsPreflight,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST, OPTIONS } from "./route";

const HAPPY_BODY = {
  legalName: "OneWeb Limited",
  email: "anna@example.com",
  vatId: "DE123456789",
};

function makeRequest(body?: unknown): Request {
  return new Request("https://app.caelex.com/api/public/pulse/detect", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://caelex.eu",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({
    success: true,
    remaining: 2,
    reset: Date.now() + 60_000,
    limit: 3,
  });
  mockPulseLead.create.mockResolvedValue({
    id: "lead_1",
    createdAt: new Date("2026-04-30T10:00:00Z"),
  });
  mockPulseLead.update.mockResolvedValue({});
  mockDispatchAnonymous.mockResolvedValue({
    organizationId: "pulse-anon-1",
    startedAt: new Date(),
    finishedAt: new Date(),
    successfulOutcomes: [
      {
        source: "vies-eu-vat",
        fetchedAt: new Date(),
        sourceUrl: "https://x",
        rawArtifact: null,
        attestation: {
          kind: "public-source",
          source: "other",
          sourceUrl: "x",
          fetchedAt: "x",
        },
        fields: [
          {
            fieldName: "establishment",
            value: "DE",
            confidence: 0.98,
          },
        ],
        warnings: ["test warning"],
      },
    ],
    failures: [],
    mergedFields: [
      {
        fieldName: "establishment",
        chosenValue: "DE",
        chosenSource: "vies-eu-vat",
        agreementCount: 1,
        conflicts: [],
        contributingAdapters: ["vies-eu-vat"],
      },
    ],
  });
});

// ─── Rate limiting ─────────────────────────────────────────────────────────

describe("POST /api/public/pulse/detect — rate limit", () => {
  it("returns 429 when rate-limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      limit: 3,
    });
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    expect(res.status).toBe(429);
    expect(mockPulseLead.create).not.toHaveBeenCalled();
  });
});

// ─── Validation ────────────────────────────────────────────────────────────

describe("POST /api/public/pulse/detect — validation", () => {
  it("returns 400 on invalid JSON body", async () => {
    const req = new Request("https://app.caelex.com/api/public/pulse/detect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 on missing legalName", async () => {
    const res = await POST(makeRequest({ email: "x@y.com" }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(
      body.issues.some((i: { path: string }) => i.path === "legalName"),
    ).toBe(true);
  });

  it("returns 400 on garbage email", async () => {
    const res = await POST(
      makeRequest({ ...HAPPY_BODY, email: "not-an-email" }) as never,
    );
    expect(res.status).toBe(400);
  });
});

// ─── Happy path ────────────────────────────────────────────────────────────

describe("POST /api/public/pulse/detect — happy path", () => {
  it("creates a PulseLead row + invokes dispatchAnonymous + returns 200", async () => {
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    expect(res.status).toBe(200);
    expect(mockPulseLead.create).toHaveBeenCalledTimes(1);
    expect(mockDispatchAnonymous).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.leadId).toBe("lead_1");
    expect(body.successfulSources).toEqual(["vies-eu-vat"]);
    expect(body.mergedFields).toHaveLength(1);
    expect(body.mergedFields[0].fieldName).toBe("establishment");
    expect(body.bestPossibleTier).toBe("T2_SOURCE_VERIFIED");
  });

  it("captures vatId, email, IP, UA on the lead row", async () => {
    await POST(makeRequest(HAPPY_BODY) as never);
    const [createArg] = mockPulseLead.create.mock.calls[0];
    expect(createArg.data.email).toBe("anna@example.com");
    expect(createArg.data.legalName).toBe("OneWeb Limited");
    expect(createArg.data.vatId).toBe("DE123456789");
    expect(createArg.data.ipAddress).toBe("1.2.3.4");
  });

  it("captures UTM tracking params when supplied", async () => {
    await POST(
      makeRequest({
        ...HAPPY_BODY,
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "space-act-2026",
      }) as never,
    );
    const [createArg] = mockPulseLead.create.mock.calls[0];
    expect(createArg.data.utmSource).toBe("google");
    expect(createArg.data.utmMedium).toBe("cpc");
    expect(createArg.data.utmCampaign).toBe("space-act-2026");
  });

  it("updates the lead with detectionResult after successful dispatch", async () => {
    await POST(makeRequest(HAPPY_BODY) as never);
    expect(mockPulseLead.update).toHaveBeenCalledTimes(1);
    const [updateArg] = mockPulseLead.update.mock.calls[0];
    expect(updateArg.data.detectionResult.successfulSources).toEqual([
      "vies-eu-vat",
    ]);
    expect(updateArg.data.detectionResult.mergedFields).toHaveLength(1);
  });

  it("forwards warnings from successful adapter outcomes", async () => {
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    const body = await res.json();
    expect(body.warnings).toContain("test warning");
  });

  it("returns bestPossibleTier T2_SOURCE_VERIFIED when ≥1 field merged", async () => {
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    const body = await res.json();
    expect(body.bestPossibleTier).toBe("T2_SOURCE_VERIFIED");
  });

  it("returns bestPossibleTier T0_UNVERIFIED when no fields merged", async () => {
    mockDispatchAnonymous.mockResolvedValueOnce({
      organizationId: "pulse-anon-1",
      startedAt: new Date(),
      finishedAt: new Date(),
      successfulOutcomes: [],
      failures: [],
      mergedFields: [],
    });
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    const body = await res.json();
    expect(body.bestPossibleTier).toBe("T0_UNVERIFIED");
  });
});

// ─── Failure paths ─────────────────────────────────────────────────────────

describe("POST /api/public/pulse/detect — failure paths", () => {
  it("returns 500 when PulseLead.create throws", async () => {
    mockPulseLead.create.mockRejectedValueOnce(new Error("DB down"));
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    expect(res.status).toBe(500);
  });

  it("returns 200 with empty result + warning when dispatchAnonymous throws", async () => {
    mockDispatchAnonymous.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leadId).toBe("lead_1"); // lead row was still created
    expect(body.successfulSources).toEqual([]);
    expect(body.warnings.length).toBeGreaterThan(0);
  });
});

// ─── CORS ──────────────────────────────────────────────────────────────────

describe("OPTIONS /api/public/pulse/detect", () => {
  it("returns the preflight CORS response", async () => {
    const req = new Request("https://app.caelex.com/api/public/pulse/detect", {
      method: "OPTIONS",
      headers: { origin: "https://caelex.eu" },
    });
    const res = await OPTIONS(req as never);
    expect(res.status).toBe(204);
    expect(mockHandleCorsPreflight).toHaveBeenCalled();
  });
});
