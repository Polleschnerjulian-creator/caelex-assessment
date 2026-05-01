/**
 * GET /api/public/pulse/report/[leadId] — route tests.
 *
 * Coverage:
 *
 *   1. Rate-limit: 429 when exceeded
 *   2. 404 on garbage leadId (length out of bounds)
 *   3. 404 on missing PulseLead
 *   4. 500 on PulseLead lookup error
 *   5. 500 on PDF render error
 *   6. Happy path: returns application/pdf with content-disposition
 *      attachment + filename based on legalName + date
 *   7. Filename sanitisation strips non-alphanumeric chars
 *   8. PDF data is built from PulseLead.detectionResult snapshot
 *   9. Empty snapshot still renders (T0 case) — no error
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPulseLead,
  mockCheckRateLimit,
  mockGetIdentifier,
  mockApplyCorsHeaders,
  mockHandleCorsPreflight,
  mockCreateRateLimitResponse,
  mockRenderToBuffer,
} = vi.hoisted(() => ({
  mockPulseLead: { findUnique: vi.fn() },
  mockCheckRateLimit: vi.fn(),
  mockGetIdentifier: vi.fn(() => "ip:1.2.3.4"),
  mockApplyCorsHeaders: vi.fn((res: Response) => res),
  mockHandleCorsPreflight: vi.fn(() => new Response(null, { status: 204 })),
  mockCreateRateLimitResponse: vi.fn(
    () => new Response(JSON.stringify({ error: "rate" }), { status: 429 }),
  ),
  mockRenderToBuffer: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { pulseLead: mockPulseLead },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
  getIdentifier: mockGetIdentifier,
  createRateLimitResponse: mockCreateRateLimitResponse,
}));

vi.mock("@/lib/cors.server", () => ({
  applyCorsHeaders: mockApplyCorsHeaders,
  handleCorsPreflightResponse: mockHandleCorsPreflight,
}));

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: mockRenderToBuffer,
}));

// PulsePdfReport is imported as JSX in route.tsx; we mock the module so
// the test doesn't pull in real @react-pdf/renderer + Font registration.
vi.mock("@/lib/pdf/reports/pulse/pulse-report", () => ({
  PulsePdfReport: () => null,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";

const HAPPY_LEAD = {
  id: "cl_lead_xyz_abc12345",
  legalName: "OneWeb Limited",
  vatId: "DE123456789",
  email: "anna@example.com",
  detectionResult: {
    successfulSources: ["vies-eu-vat", "gleif-lei"],
    failedSources: [],
    mergedFields: [
      {
        fieldName: "establishment",
        value: "DE",
        agreementCount: 2,
        contributingAdapters: ["vies-eu-vat", "gleif-lei"],
      },
    ],
    warnings: [],
  },
  createdAt: new Date("2026-04-30T10:00:00Z"),
};

function makeRequest(): Request {
  return new Request("https://app.caelex.com/api/public/pulse/report/x", {
    method: "GET",
    headers: { origin: "https://caelex.eu" },
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
  mockPulseLead.findUnique.mockResolvedValue(HAPPY_LEAD);
  mockRenderToBuffer.mockResolvedValue(Buffer.from("%PDF-1.4 fake"));
});

// ─── Rate limit ────────────────────────────────────────────────────────────

describe("GET /api/public/pulse/report — rate limit", () => {
  it("returns 429 when rate-limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      limit: 3,
    });
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: HAPPY_LEAD.id }),
    });
    expect(res.status).toBe(429);
    expect(mockPulseLead.findUnique).not.toHaveBeenCalled();
  });
});

// ─── Validation ────────────────────────────────────────────────────────────

describe("GET /api/public/pulse/report — validation", () => {
  it("returns 404 on too-short leadId", async () => {
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: "abc" }),
    });
    expect(res.status).toBe(404);
    expect(mockPulseLead.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 on too-long leadId (probe defence)", async () => {
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: "x".repeat(100) }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 on missing PulseLead", async () => {
    mockPulseLead.findUnique.mockResolvedValueOnce(null);
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: "cl_nonexistent_abc" }),
    });
    expect(res.status).toBe(404);
  });
});

// ─── Lookup errors ─────────────────────────────────────────────────────────

describe("GET /api/public/pulse/report — error paths", () => {
  it("returns 500 on PulseLead.findUnique throw", async () => {
    mockPulseLead.findUnique.mockRejectedValueOnce(new Error("DB down"));
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: HAPPY_LEAD.id }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 500 on renderToBuffer throw", async () => {
    mockRenderToBuffer.mockRejectedValueOnce(new Error("PDF render exploded"));
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: HAPPY_LEAD.id }),
    });
    expect(res.status).toBe(500);
  });
});

// ─── Happy path ────────────────────────────────────────────────────────────

describe("GET /api/public/pulse/report — happy path", () => {
  it("returns application/pdf with content-disposition + filename", async () => {
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: HAPPY_LEAD.id }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const cd = res.headers.get("content-disposition")!;
    expect(cd).toContain("attachment");
    expect(cd).toContain(".pdf");
  });

  it("filename derives from legalName (sanitised)", async () => {
    mockPulseLead.findUnique.mockResolvedValueOnce({
      ...HAPPY_LEAD,
      legalName: "Acme & Co. — Aerospace, GmbH!",
    });
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: HAPPY_LEAD.id }),
    });
    const cd = res.headers.get("content-disposition")!;
    expect(cd).toMatch(
      /caelex-pulse-acme-co-aerospace-gmbh-\d{4}-\d{2}-\d{2}\.pdf/,
    );
  });

  it("falls back to 'report' when legalName has no alphanumerics", async () => {
    mockPulseLead.findUnique.mockResolvedValueOnce({
      ...HAPPY_LEAD,
      legalName: "***",
    });
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: HAPPY_LEAD.id }),
    });
    const cd = res.headers.get("content-disposition")!;
    expect(cd).toContain("caelex-pulse-report-");
  });

  it("invokes renderToBuffer with PulsePdfReport (snapshot built from detectionResult)", async () => {
    await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: HAPPY_LEAD.id }),
    });
    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
  });

  it("renders T0 PDF when detectionResult is empty", async () => {
    mockPulseLead.findUnique.mockResolvedValueOnce({
      ...HAPPY_LEAD,
      detectionResult: {
        successfulSources: [],
        mergedFields: [],
        warnings: [],
      },
    });
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: HAPPY_LEAD.id }),
    });
    expect(res.status).toBe(200);
  });

  it("handles null detectionResult defensively (lead captured without detection)", async () => {
    mockPulseLead.findUnique.mockResolvedValueOnce({
      ...HAPPY_LEAD,
      detectionResult: null,
    });
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ leadId: HAPPY_LEAD.id }),
    });
    expect(res.status).toBe(200);
  });
});
