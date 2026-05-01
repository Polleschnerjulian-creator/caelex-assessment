/**
 * Evidence-Reverification cron — auth + happy-path enumeration tests.
 *
 * Sprint 1C: this cron is a skeleton. Tests cover what the skeleton
 * actually does — auth gates, the per-tier breakdown, the page-cap
 * behaviour. Sprint 2 will add adapter-dispatch tests on top.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindStaleEvidence, mockCountStaleByTier, mockDispatch } =
  vi.hoisted(() => ({
    mockFindStaleEvidence: vi.fn(),
    mockCountStaleByTier: vi.fn(),
    mockDispatch: vi.fn(),
  }));

vi.mock("@/lib/operator-profile/evidence.server", () => ({
  findStaleEvidence: mockFindStaleEvidence,
  countStaleEvidenceByTier: mockCountStaleByTier,
}));

vi.mock("@/lib/operator-profile/auto-detection/dispatcher.server", () => ({
  dispatchReverificationForStaleRows: mockDispatch,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";

function makeRequest(auth?: string): Request {
  const h: Record<string, string> = {};
  if (auth) h.authorization = auth;
  return new Request(
    "https://app.caelex.com/api/cron/evidence-reverification",
    { headers: h },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  delete process.env.EVIDENCE_REVERIFICATION_AUTODISPATCH;
  mockCountStaleByTier.mockResolvedValue({
    T0_UNVERIFIED: 0,
    T1_SELF_CONFIRMED: 5,
    T2_SOURCE_VERIFIED: 2,
    T3_COUNSEL_ATTESTED: 0,
    T4_AUTHORITY_VERIFIED: 0,
    T5_CRYPTOGRAPHIC_PROOF: 0,
  });
  mockFindStaleEvidence.mockResolvedValue([]);
  mockDispatch.mockResolvedValue({
    orgsProcessed: 0,
    orgsSkipped: 0,
    adaptersInvoked: 0,
    fieldsRefreshed: 0,
    failures: 0,
    truncated: false,
    perOrg: [],
  });
});

describe("GET /api/cron/evidence-reverification — auth", () => {
  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(503);
  });

  it("returns 401 without authorization header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with the wrong bearer token", async () => {
    const res = await GET(makeRequest("Bearer not-the-real-secret"));
    expect(res.status).toBe(401);
  });

  it("uses timing-safe equality (rejects same-length wrong secret)", async () => {
    process.env.CRON_SECRET = "abcdefgh";
    // Same length, different content
    const res = await GET(makeRequest("Bearer 11111111"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/evidence-reverification — happy path", () => {
  it("returns the per-tier breakdown when no stale rows enumerated", async () => {
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.totalStale).toBe(7); // 5 + 2
    expect(body.byTier.T1_SELF_CONFIRMED).toBe(5);
    expect(body.byTier.T2_SOURCE_VERIFIED).toBe(2);
    expect(body.totalEnumerated).toBe(0);
    expect(body.cappedAtMaxPages).toBe(false);
  });

  it("enumerates one full page when 1000 rows are stale", async () => {
    const fakeRows = Array.from({ length: 1000 }, (_, i) => ({
      id: `e_${i}`,
      organizationId: "org_1",
      entityType: "operator_profile",
      entityId: "profile_1",
      fieldName: "operatorType",
      verificationTier: "T1_SELF_CONFIRMED" as const,
      expiresAt: new Date("2026-04-01T00:00:00Z"),
      derivedAt: new Date("2025-12-01T00:00:00Z"),
      attestationRef: null,
    }));

    // First call returns 1000, second call returns 0 — terminates loop
    mockFindStaleEvidence.mockResolvedValueOnce(fakeRows).mockResolvedValue([]);

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.totalEnumerated).toBe(1000);
    expect(body.pages).toBe(1);
    expect(body.cappedAtMaxPages).toBe(false);
  });

  it("flags cappedAtMaxPages when MAX_PAGES_PER_RUN is hit", async () => {
    // Always return a full page — cron should cap at 5 pages
    const fakeRows = Array.from({ length: 1000 }, (_, i) => ({
      id: `e_${i}`,
      organizationId: "org_1",
      entityType: "operator_profile",
      entityId: "profile_1",
      fieldName: "operatorType",
      verificationTier: "T1_SELF_CONFIRMED" as const,
      expiresAt: new Date("2026-04-01T00:00:00Z"),
      derivedAt: new Date("2025-12-01T00:00:00Z"),
      attestationRef: null,
    }));
    mockFindStaleEvidence.mockResolvedValue(fakeRows);

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.cappedAtMaxPages).toBe(true);
    expect(body.pages).toBe(5);
    expect(body.totalEnumerated).toBe(5000);
  });

  it("returns 500 + success:false when the count query throws", async () => {
    mockCountStaleByTier.mockRejectedValueOnce(new Error("DB unreachable"));
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("internal");
  });
});

describe("GET /api/cron/evidence-reverification — auto-dispatch", () => {
  it("does NOT call the dispatcher when the env flag is unset", async () => {
    mockFindStaleEvidence
      .mockResolvedValueOnce([
        {
          id: "e1",
          organizationId: "org_1",
          entityType: "operator_profile",
          entityId: "p1",
          fieldName: "establishment",
          verificationTier: "T2_SOURCE_VERIFIED",
          expiresAt: new Date("2026-04-01T00:00:00Z"),
          derivedAt: new Date("2025-12-01T00:00:00Z"),
          attestationRef: null,
        },
      ])
      .mockResolvedValue([]);
    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.dispatchEnabled).toBe(false);
    expect(body.dispatch).toBeUndefined();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("calls the dispatcher when EVIDENCE_REVERIFICATION_AUTODISPATCH=1", async () => {
    process.env.EVIDENCE_REVERIFICATION_AUTODISPATCH = "1";
    mockFindStaleEvidence
      .mockResolvedValueOnce([
        {
          id: "e1",
          organizationId: "org_1",
          entityType: "operator_profile",
          entityId: "p1",
          fieldName: "establishment",
          verificationTier: "T2_SOURCE_VERIFIED",
          expiresAt: new Date("2026-04-01T00:00:00Z"),
          derivedAt: new Date("2025-12-01T00:00:00Z"),
          attestationRef: null,
        },
      ])
      .mockResolvedValue([]);
    mockDispatch.mockResolvedValueOnce({
      orgsProcessed: 1,
      orgsSkipped: 0,
      adaptersInvoked: 1,
      fieldsRefreshed: 1,
      failures: 0,
      truncated: false,
      perOrg: [
        {
          organizationId: "org_1",
          adaptersRun: 1,
          fieldsRefreshed: 1,
          failures: 0,
        },
      ],
    });

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.dispatchEnabled).toBe(true);
    expect(body.dispatch).toBeDefined();
    expect(body.dispatch.orgsProcessed).toBe(1);
    expect(body.dispatch.fieldsRefreshed).toBe(1);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const [staleRows] = mockDispatch.mock.calls[0];
    expect(staleRows).toHaveLength(1);
  });

  it("skips dispatcher when dispatch enabled but no stale rows", async () => {
    process.env.EVIDENCE_REVERIFICATION_AUTODISPATCH = "1";
    mockFindStaleEvidence.mockResolvedValue([]);
    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.dispatchEnabled).toBe(true);
    expect(body.dispatch).toBeUndefined(); // no rows, no dispatch
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
