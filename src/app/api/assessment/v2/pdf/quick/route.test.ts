/**
 * Tests for POST /api/assessment/v2/pdf/quick (plan Task 2.4).
 *
 * PURE/MOCKED unit tests — Prisma, auth, the rate limiter, the logger, the
 * newsletter email sender and the PDF builder are mocked. (Not executed
 * here — the orchestrator runs the suite centrally.)
 *
 * What is exercised:
 *   1. THE SERVER-ENFORCED EMAIL GATE — `email` is REQUIRED (founder §11.2):
 *      omitting it is a 400 with no lead write and no PDF; the gate cannot
 *      be bypassed by calling the route directly.
 *   2. OWNERSHIP, NO ENUMERATION — a missing profile and a foreign profile
 *      (cookie/session mismatch) are the SAME 404; session-owned and
 *      cookie-owned profiles both succeed.
 *   3. STORED VERDICT ONLY — the PDF renders from the latest stored QUICK
 *      snapshot; no snapshot → 404, and nothing is ever recomputed from
 *      client input.
 *   4. LEAD CAPTURE VIA THE LEAD-ROUTE LOGIC — lead row persisted with
 *      assessmentType "quick-check" (consent default FALSE; double-opt-in
 *      starts only on explicit consent), with the 15-minute dedupe window
 *      (EmailGate already posted the lead → no second row).
 *   5. ABUSE + FAILURE HONESTY — 429 short-circuits before any DB access,
 *      the honeypot silently succeeds without writes or PDF, and a lead
 *      write failure is an honest 500 (no PDF, no fake success).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (declared before the route is dynamically imported) ──

const profileFindUniqueMock = vi.fn();
const snapshotFindFirstMock = vi.fn();
const leadFindFirstMock = vi.fn();
const leadCreateMock = vi.fn();
const subFindUniqueMock = vi.fn();
const subCreateMock = vi.fn();
const subUpdateMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorAssessmentProfile: {
      findUnique: (args: unknown) => profileFindUniqueMock(args),
    },
    assessmentVerdictSnapshot: {
      findFirst: (args: unknown) => snapshotFindFirstMock(args),
    },
    assessmentLead: {
      findFirst: (args: unknown) => leadFindFirstMock(args),
      create: (args: unknown) => leadCreateMock(args),
    },
    newsletterSubscription: {
      findUnique: (args: unknown) => subFindUniqueMock(args),
      create: (args: unknown) => subCreateMock(args),
      update: (args: unknown) => subUpdateMock(args),
    },
  },
}));

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

const checkRateLimitMock = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (tier: string, id: string) => checkRateLimitMock(tier, id),
  getIdentifier: (_req: Request, userId?: string) =>
    userId ? `user:${userId}` : "203.0.113.7",
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too Many Requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    }),
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  maskEmail: vi.fn((e: string) => e),
}));

vi.mock("@/lib/email/templates/newsletter-confirmation", () => ({
  sendNewsletterConfirmation: vi.fn().mockResolvedValue({ success: true }),
}));

const buildPdfMock = vi.fn();
vi.mock("@/lib/pdf/assessment/quick-summary.server", () => ({
  buildQuickSummaryPdf: (result: unknown, recipient: unknown) =>
    buildPdfMock(result, recipient),
}));

// ── Helpers ──

const STORED_RESULT = { rulebookVersion: "1.0.0", marker: "stored-result" };

function req(body: unknown, opts: { cookie?: string } = {}): Request {
  return new Request("http://localhost/api/assessment/v2/pdf/quick", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-agent": "Mozilla/5.0 (test)",
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

const ANON_COOKIE = "caelex_assessment_profile=anon_1";

async function loadRoute() {
  return import("./route");
}

beforeEach(() => {
  vi.resetModules();
  authMock.mockReset().mockResolvedValue(null);
  profileFindUniqueMock.mockReset().mockResolvedValue({
    id: "prof_1",
    anonymousId: "anon_1",
    userId: null,
  });
  snapshotFindFirstMock.mockReset().mockResolvedValue({
    id: "snap_1",
    result: STORED_RESULT,
  });
  leadFindFirstMock.mockReset().mockResolvedValue(null);
  leadCreateMock
    .mockReset()
    .mockResolvedValue({ id: "lead_1", email: "a@b.co" });
  subFindUniqueMock.mockReset().mockResolvedValue(null);
  subCreateMock.mockReset().mockResolvedValue({ id: "sub_1" });
  subUpdateMock.mockReset().mockResolvedValue({ id: "sub_1" });
  checkRateLimitMock.mockReset().mockResolvedValue({
    success: true,
    remaining: 19,
    reset: Date.now() + 3_600_000,
    limit: 20,
  });
  buildPdfMock.mockReset().mockReturnValue({
    bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), // "%PDF-"
    contentHash: "ab".repeat(32),
    filename: "caelex-quick-check-summary-2026-06-10.pdf",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The server-enforced email gate (founder §11.2)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/pdf/quick — email gate", () => {
  it("rejects a missing email with 400 — no lead write, no PDF (gate enforced server-side)", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req({ profileId: "prof_1" }, { cookie: ANON_COOKIE }),
    );

    expect(res.status).toBe(400);
    expect(leadCreateMock).not.toHaveBeenCalled();
    expect(buildPdfMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email with 400", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        { profileId: "prof_1", email: "not-an-email" },
        { cookie: ANON_COOKIE },
      ),
    );

    expect(res.status).toBe(400);
    expect(leadCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a missing profileId with 400", async () => {
    const { POST } = await loadRoute();
    const res = await POST(req({ email: "a@b.co" }, { cookie: ANON_COOKIE }));

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ownership — no enumeration
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/pdf/quick — ownership", () => {
  it("returns 404 for a missing profile", async () => {
    profileFindUniqueMock.mockResolvedValue(null);
    const { POST } = await loadRoute();
    const res = await POST(
      req({ profileId: "prof_x", email: "a@b.co" }, { cookie: ANON_COOKIE }),
    );

    expect(res.status).toBe(404);
    expect(leadCreateMock).not.toHaveBeenCalled();
    expect(buildPdfMock).not.toHaveBeenCalled();
  });

  it("returns the SAME 404 for a foreign profile (anonymous cookie mismatch)", async () => {
    profileFindUniqueMock.mockResolvedValue({
      id: "prof_1",
      anonymousId: "anon_SOMEONE_ELSE",
      userId: null,
    });
    const { POST } = await loadRoute();
    const res = await POST(
      req({ profileId: "prof_1", email: "a@b.co" }, { cookie: ANON_COOKIE }),
    );

    expect(res.status).toBe(404);
    expect(leadCreateMock).not.toHaveBeenCalled();
  });

  it("returns 404 with no cookie and no session", async () => {
    const { POST } = await loadRoute();
    const res = await POST(req({ profileId: "prof_1", email: "a@b.co" }));

    expect(res.status).toBe(404);
  });

  it("allows a session-owned profile without the anonymous cookie", async () => {
    authMock.mockResolvedValue({ user: { id: "user_1" } });
    profileFindUniqueMock.mockResolvedValue({
      id: "prof_1",
      anonymousId: null,
      userId: "user_1",
    });
    const { POST } = await loadRoute();
    const res = await POST(req({ profileId: "prof_1", email: "a@b.co" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stored verdict only
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/pdf/quick — stored snapshot", () => {
  it("returns 404 (and writes no lead) when no QUICK snapshot exists yet", async () => {
    snapshotFindFirstMock.mockResolvedValue(null);
    const { POST } = await loadRoute();
    const res = await POST(
      req({ profileId: "prof_1", email: "a@b.co" }, { cookie: ANON_COOKIE }),
    );

    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/No quick-check result/i);
    expect(leadCreateMock).not.toHaveBeenCalled();
    expect(buildPdfMock).not.toHaveBeenCalled();
  });

  it("renders the PDF from the STORED result — never from client input", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        {
          profileId: "prof_1",
          email: "Founder@Startup.Space",
          company: "Startup Space GmbH",
        },
        { cookie: ANON_COOKIE },
      ),
    );

    expect(res.status).toBe(200);
    // Only QUICK snapshots are consulted, newest first.
    const snapArgs = snapshotFindFirstMock.mock.calls[0][0] as {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
    };
    expect(snapArgs.where).toMatchObject({
      profileId: "prof_1",
      tier: "QUICK",
    });
    expect(snapArgs.orderBy).toMatchObject({ createdAt: "desc" });
    // The builder received the stored result verbatim.
    expect(buildPdfMock).toHaveBeenCalledTimes(1);
    expect(buildPdfMock.mock.calls[0][0]).toBe(STORED_RESULT);
    expect(buildPdfMock.mock.calls[0][1]).toMatchObject({
      email: "Founder@Startup.Space",
      company: "Startup Space GmbH",
    });
    // PDF response headers.
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain(
      "caelex-quick-check-summary-2026-06-10.pdf",
    );
    expect(res.headers.get("X-Caelex-Summary-Hash")).toBe("ab".repeat(32));
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Lead capture via the lead-route logic
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/pdf/quick — lead capture", () => {
  it('persists the lead with assessmentType "quick-check" and consent default FALSE', async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        { profileId: "prof_1", email: "Founder@Startup.Space" },
        { cookie: ANON_COOKIE },
      ),
    );

    expect(res.status).toBe(200);
    expect(leadCreateMock).toHaveBeenCalledTimes(1);
    const arg = leadCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.email).toBe("founder@startup.space"); // normalized
    expect(arg.data.assessmentType).toBe("quick-check");
    expect(arg.data.consentNewsletter).toBe(false);
    expect(arg.data.source).toBe("assessment-results");
    // No consent → newsletter untouched (GDPR Art. 7).
    expect(subCreateMock).not.toHaveBeenCalled();
    expect(subUpdateMock).not.toHaveBeenCalled();
  });

  it("starts the newsletter double-opt-in ONLY on explicit consent (PENDING, never ACTIVE)", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        { profileId: "prof_1", email: "a@b.co", consentNewsletter: true },
        { cookie: ANON_COOKIE },
      ),
    );

    expect(res.status).toBe(200);
    expect(subCreateMock).toHaveBeenCalledTimes(1);
    const subArg = subCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(subArg.data.status).toBe("PENDING");
  });

  it("dedupes against a recent identical lead (EmailGate already posted it) — no second row, PDF still served", async () => {
    leadFindFirstMock.mockResolvedValue({ id: "lead_recent" });
    const { POST } = await loadRoute();
    const res = await POST(
      req({ profileId: "prof_1", email: "a@b.co" }, { cookie: ANON_COOKIE }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(leadCreateMock).not.toHaveBeenCalled();
    // The dedupe window is scoped to the same email + quick-check type.
    const findArgs = leadFindFirstMock.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(findArgs.where).toMatchObject({
      email: "a@b.co",
      assessmentType: "quick-check",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Abuse + failure honesty
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/v2/pdf/quick — abuse + failure handling", () => {
  it("returns 429 before any database access when the rate limit is exceeded", async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 3_600_000,
      limit: 20,
    });
    const { POST } = await loadRoute();
    const res = await POST(
      req({ profileId: "prof_1", email: "a@b.co" }, { cookie: ANON_COOKIE }),
    );

    expect(res.status).toBe(429);
    expect(checkRateLimitMock).toHaveBeenCalledWith("export", "203.0.113.7");
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
    expect(leadCreateMock).not.toHaveBeenCalled();
  });

  it("silently succeeds on a filled honeypot WITHOUT writes and WITHOUT a PDF", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        { profileId: "prof_1", email: "bot@spam.io", _hp: "i-am-a-bot" },
        { cookie: ANON_COOKIE },
      ),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(await res.json()).toMatchObject({ success: true });
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
    expect(leadCreateMock).not.toHaveBeenCalled();
    expect(buildPdfMock).not.toHaveBeenCalled();
  });

  it("returns an honest 500 (no PDF, no fake success) when the lead write fails", async () => {
    leadCreateMock.mockRejectedValue(new Error("db down"));
    const { POST } = await loadRoute();
    const res = await POST(
      req({ profileId: "prof_1", email: "a@b.co" }, { cookie: ANON_COOKIE }),
    );

    expect(res.status).toBe(500);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(buildPdfMock).not.toHaveBeenCalled();
  });
});
