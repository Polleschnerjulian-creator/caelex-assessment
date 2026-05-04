/**
 * /api/public/verify-anchor — Sprint 8C tests.
 *
 * Coverage:
 *
 *   1. Validation: rejects non-hex / wrong-length / missing field
 *   2. Rate-limit: 429 when checkRateLimit returns success:false
 *   3. Found path: returns surfaced anchor rows with proofBase64
 *   4. Not-found: returns found:false when no rows for the hash
 *   5. FAILED-only rows are hidden from the public response
 *   6. Multiple calendars → multiple anchor rows in response
 *   7. organizationId NEVER appears in the response (privacy)
 *   8. CORS preflight (OPTIONS) returns the right headers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindMany, mockCheckRateLimit } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditTimestampAnchor: { findMany: mockFindMany },
  },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
  createRateLimitResponse: (rl: { reset: number }) =>
    new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "retry-after": String(rl.reset) },
    }),
  getIdentifier: () => "ip:127.0.0.1",
}));

vi.mock("@/lib/cors.server", () => ({
  applyCorsHeaders: (res: Response) => res,
  handleCorsPreflightResponse: () =>
    new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
      },
    }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST, OPTIONS } from "./route";

const VALID_HASH =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/public/verify-anchor", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://example" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({
    success: true,
    limit: 5,
    remaining: 4,
    reset: 0,
  });
});

// ─── Validation ──────────────────────────────────────────────────────────

describe("verify-anchor — validation", () => {
  it("rejects body with no anchorHash", async () => {
    const res = await POST(makeRequest({}) as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Validation/);
  });

  it("rejects non-hex anchorHash", async () => {
    const res = await POST(
      makeRequest({ anchorHash: "not-hex-not-hex-not-hex" }) as Parameters<
        typeof POST
      >[0],
    );
    expect(res.status).toBe(400);
  });

  it("rejects anchorHash with wrong length", async () => {
    const res = await POST(
      makeRequest({ anchorHash: "abc123" }) as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(400);
  });

  it("rejects unparseable JSON body", async () => {
    const req = new Request("http://localhost/api/public/verify-anchor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
  });

  it("normalises uppercase anchorHash to lowercase before lookup", async () => {
    mockFindMany.mockResolvedValue([]);
    await POST(
      makeRequest({
        anchorHash: VALID_HASH.toUpperCase(),
      }) as Parameters<typeof POST>[0],
    );
    const args = mockFindMany.mock.calls[0][0] as {
      where: { anchorHash: string };
    };
    expect(args.where.anchorHash).toBe(VALID_HASH);
  });
});

// ─── Rate limit ─────────────────────────────────────────────────────────

describe("verify-anchor — rate limit", () => {
  it("returns 429 when checkRateLimit denies", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: 60,
    });
    const res = await POST(
      makeRequest({ anchorHash: VALID_HASH }) as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(429);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

// ─── Lookup paths ───────────────────────────────────────────────────────

describe("verify-anchor — found path", () => {
  it("returns found:true with anchor rows + base64 proof", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "a1",
        anchorHash: VALID_HASH,
        status: "UPGRADED",
        calendarUrl: "https://a.pool.opentimestamps.org",
        otsProof: Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]),
        submittedAt: new Date("2026-01-01T00:00:00Z"),
        upgradedAt: new Date("2026-01-01T06:00:00Z"),
        blockHeight: 850000,
      },
    ]);
    const res = await POST(
      makeRequest({ anchorHash: VALID_HASH }) as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.anchorHash).toBe(VALID_HASH);
    expect(body.anchors).toHaveLength(1);
    const anchor = body.anchors[0];
    expect(anchor.status).toBe("UPGRADED");
    expect(anchor.calendarUrl).toBe("https://a.pool.opentimestamps.org");
    expect(anchor.blockHeight).toBe(850000);
    // proof is base64-encoded bytes
    expect(anchor.proofBase64).toBe(
      Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]).toString("base64"),
    );
    expect(anchor.proofBytes).toBe(5);
  });

  it("returns multiple anchor rows when several calendars committed", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "a1",
        anchorHash: VALID_HASH,
        status: "UPGRADED",
        calendarUrl: "https://a.pool.opentimestamps.org",
        otsProof: Buffer.from([0x01]),
        submittedAt: new Date("2026-01-01T00:00:00Z"),
        upgradedAt: new Date("2026-01-01T06:00:00Z"),
        blockHeight: 850000,
      },
      {
        id: "a2",
        anchorHash: VALID_HASH,
        status: "PENDING",
        calendarUrl: "https://b.pool.opentimestamps.org",
        otsProof: Buffer.from([0x02]),
        submittedAt: new Date("2026-01-01T00:00:01Z"),
        upgradedAt: null,
        blockHeight: null,
      },
    ]);
    const res = await POST(
      makeRequest({ anchorHash: VALID_HASH }) as Parameters<typeof POST>[0],
    );
    const body = await res.json();
    expect(body.anchors).toHaveLength(2);
    expect(body.anchors[1].status).toBe("PENDING");
    expect(body.anchors[1].upgradedAt).toBeNull();
    expect(body.anchors[1].blockHeight).toBeNull();
  });

  it("hides FAILED rows from the surfaced response", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "a1",
        anchorHash: VALID_HASH,
        status: "FAILED",
        calendarUrl: "https://broken.test",
        otsProof: Buffer.alloc(0),
        submittedAt: new Date("2026-01-01T00:00:00Z"),
        upgradedAt: null,
        blockHeight: null,
      },
      {
        id: "a2",
        anchorHash: VALID_HASH,
        status: "UPGRADED",
        calendarUrl: "https://good.test",
        otsProof: Buffer.from([0xab]),
        submittedAt: new Date("2026-01-01T00:00:01Z"),
        upgradedAt: new Date("2026-01-01T06:00:00Z"),
        blockHeight: 850000,
      },
    ]);
    const res = await POST(
      makeRequest({ anchorHash: VALID_HASH }) as Parameters<typeof POST>[0],
    );
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.anchors).toHaveLength(1);
    expect(body.anchors[0].calendarUrl).toBe("https://good.test");
  });

  it("returns found:false when ONLY FAILED rows exist for the hash", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "a1",
        anchorHash: VALID_HASH,
        status: "FAILED",
        calendarUrl: "https://broken.test",
        otsProof: Buffer.alloc(0),
        submittedAt: new Date("2026-01-01T00:00:00Z"),
        upgradedAt: null,
        blockHeight: null,
      },
    ]);
    const res = await POST(
      makeRequest({ anchorHash: VALID_HASH }) as Parameters<typeof POST>[0],
    );
    const body = await res.json();
    expect(body.found).toBe(false);
  });

  it("never includes organizationId in the response (privacy)", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "a1",
        anchorHash: VALID_HASH,
        status: "UPGRADED",
        calendarUrl: "https://cal.test",
        otsProof: Buffer.from([0x01]),
        submittedAt: new Date("2026-01-01T00:00:00Z"),
        upgradedAt: new Date("2026-01-01T06:00:00Z"),
        blockHeight: 850000,
      },
    ]);
    const res = await POST(
      makeRequest({ anchorHash: VALID_HASH }) as Parameters<typeof POST>[0],
    );
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("organizationId");
  });
});

describe("verify-anchor — not found", () => {
  it("returns found:false when no rows match", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const res = await POST(
      makeRequest({ anchorHash: VALID_HASH }) as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(false);
    expect(body.anchorHash).toBe(VALID_HASH);
  });
});

// ─── CORS ────────────────────────────────────────────────────────────────

describe("verify-anchor — CORS preflight", () => {
  it("OPTIONS returns 204 + access-control headers", async () => {
    const req = new Request("http://localhost/api/public/verify-anchor", {
      method: "OPTIONS",
      headers: { origin: "http://example" },
    });
    const res = await OPTIONS(req as Parameters<typeof OPTIONS>[0]);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

// ─── Internal failure ───────────────────────────────────────────────────

describe("verify-anchor — internal errors", () => {
  it("returns 500 when the DB query throws", async () => {
    mockFindMany.mockRejectedValueOnce(new Error("DB down"));
    const res = await POST(
      makeRequest({ anchorHash: VALID_HASH }) as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(500);
  });
});
