/**
 * Tests for the assessment lead capture route (src/app/api/assessment/lead).
 *
 * These are PURE/MOCKED unit tests — Prisma, the rate limiter, the logger,
 * the newsletter confirmation email sender, and getSafeErrorMessage are all
 * mocked. (Not executed here — the orchestrator runs the suite centrally.)
 *
 * What is exercised:
 *   1. VALIDATION — missing/invalid email and oversized fields are 400s
 *      with NO database write; valid bodies persist an AssessmentLead.
 *   2. CONSENT FLAG — `consentNewsletter` defaults to FALSE (opt-in only,
 *      GDPR Art. 7); when false no newsletter records are touched; when
 *      true the lead stores the flag AND the double-opt-in flow starts
 *      (PENDING subscription + confirmation email — NEVER directly ACTIVE).
 *   3. HONESTY — rate-limit 429 short-circuits before any write, the
 *      honeypot silently succeeds without writes, and a database failure
 *      returns a 500 (no fake success).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (declared before the route is dynamically imported) ──

const leadCreateMock = vi.fn();
const subFindUniqueMock = vi.fn();
const subCreateMock = vi.fn();
const subUpdateMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assessmentLead: { create: (args: unknown) => leadCreateMock(args) },
    newsletterSubscription: {
      findUnique: (args: unknown) => subFindUniqueMock(args),
      create: (args: unknown) => subCreateMock(args),
      update: (args: unknown) => subUpdateMock(args),
    },
  },
}));

const checkRateLimitMock = vi.fn();

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (tier: string, id: string) => checkRateLimitMock(tier, id),
  getIdentifier: vi.fn().mockReturnValue("203.0.113.7"),
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

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

const sendConfirmationMock = vi.fn();

vi.mock("@/lib/email/templates/newsletter-confirmation", () => ({
  sendNewsletterConfirmation: (to: string, token: string) =>
    sendConfirmationMock(to, token),
}));

// ── Helpers ──

function req(body: unknown): Request {
  return new Request("http://localhost/api/assessment/lead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-agent": "Mozilla/5.0 (test)",
    },
    body: JSON.stringify(body),
  });
}

async function loadRoute() {
  return import("./route");
}

beforeEach(() => {
  vi.resetModules();
  leadCreateMock
    .mockReset()
    .mockResolvedValue({ id: "lead_1", email: "a@b.co" });
  subFindUniqueMock.mockReset().mockResolvedValue(null);
  subCreateMock.mockReset().mockResolvedValue({ id: "sub_1" });
  subUpdateMock.mockReset().mockResolvedValue({ id: "sub_1" });
  sendConfirmationMock.mockReset().mockResolvedValue({ success: true });
  checkRateLimitMock.mockReset().mockResolvedValue({
    success: true,
    remaining: 4,
    reset: Date.now() + 3_600_000,
    limit: 5,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/lead — validation", () => {
  it("persists a valid lead and returns success", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req({
        email: "Founder@Startup.Space",
        company: "Startup Space GmbH",
        role: "CEO",
        assessmentType: "eu-space-act",
      }) as never,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    expect(leadCreateMock).toHaveBeenCalledTimes(1);
    const arg = leadCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    // Email normalized to lowercase
    expect(arg.data.email).toBe("founder@startup.space");
    expect(arg.data.company).toBe("Startup Space GmbH");
    expect(arg.data.role).toBe("CEO");
    expect(arg.data.assessmentType).toBe("eu-space-act");
    expect(arg.data.source).toBe("assessment-results");
  });

  it("rejects an invalid email with 400 and NO database write", async () => {
    const { POST } = await loadRoute();
    const res = await POST(req({ email: "not-an-email" }) as never);

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Invalid input");
    expect(leadCreateMock).not.toHaveBeenCalled();
    expect(subCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a missing email with 400", async () => {
    const { POST } = await loadRoute();
    const res = await POST(req({ company: "No Email Inc" }) as never);

    expect(res.status).toBe(400);
    expect(leadCreateMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown assessmentType with 400", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req({ email: "a@b.co", assessmentType: "not-a-wizard" }) as never,
    );

    expect(res.status).toBe(400);
    expect(leadCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON body with 400", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      new Request("http://localhost/api/assessment/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }) as never,
    );

    expect(res.status).toBe(400);
    expect(leadCreateMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Consent flag (GDPR Art. 7 — opt-in only)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/lead — newsletter consent", () => {
  it("defaults consentNewsletter to FALSE when omitted (opt-in only)", async () => {
    const { POST } = await loadRoute();
    const res = await POST(req({ email: "a@b.co" }) as never);

    expect(res.status).toBe(200);
    const arg = leadCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.consentNewsletter).toBe(false);
    // No newsletter records touched without consent
    expect(subFindUniqueMock).not.toHaveBeenCalled();
    expect(subCreateMock).not.toHaveBeenCalled();
    expect(subUpdateMock).not.toHaveBeenCalled();
    expect(sendConfirmationMock).not.toHaveBeenCalled();
  });

  it("does NOT touch the newsletter when consentNewsletter is false", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req({ email: "a@b.co", consentNewsletter: false }) as never,
    );

    expect(res.status).toBe(200);
    expect(subCreateMock).not.toHaveBeenCalled();
    expect(sendConfirmationMock).not.toHaveBeenCalled();
  });

  it("stores consent AND starts double opt-in (PENDING, never ACTIVE) when true", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req({ email: "Opt-In@B.co", consentNewsletter: true }) as never,
    );

    expect(res.status).toBe(200);
    // Consent recorded on the lead row
    const leadArg = leadCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(leadArg.data.consentNewsletter).toBe(true);

    // Double opt-in started: new PENDING subscription + confirmation email
    expect(subCreateMock).toHaveBeenCalledTimes(1);
    const subArg = subCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(subArg.data.email).toBe("opt-in@b.co");
    expect(subArg.data.status).toBe("PENDING");
    expect(subArg.data.confirmationToken).toBeTruthy();
    expect(sendConfirmationMock).toHaveBeenCalledTimes(1);
    expect(sendConfirmationMock.mock.calls[0][0]).toBe("opt-in@b.co");
  });

  it("re-issues a PENDING token for an existing non-active subscription", async () => {
    subFindUniqueMock.mockResolvedValue({
      id: "sub_existing",
      status: "UNSUBSCRIBED",
    });
    const { POST } = await loadRoute();
    const res = await POST(
      req({ email: "a@b.co", consentNewsletter: true }) as never,
    );

    expect(res.status).toBe(200);
    expect(subCreateMock).not.toHaveBeenCalled();
    expect(subUpdateMock).toHaveBeenCalledTimes(1);
    const arg = subUpdateMock.mock.calls[0][0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(arg.where.id).toBe("sub_existing");
    expect(arg.data.status).toBe("PENDING"); // never directly ACTIVE
    expect(sendConfirmationMock).toHaveBeenCalledTimes(1);
  });

  it("leaves an already-ACTIVE subscription untouched", async () => {
    subFindUniqueMock.mockResolvedValue({ id: "sub_active", status: "ACTIVE" });
    const { POST } = await loadRoute();
    const res = await POST(
      req({ email: "a@b.co", consentNewsletter: true }) as never,
    );

    expect(res.status).toBe(200);
    expect(subCreateMock).not.toHaveBeenCalled();
    expect(subUpdateMock).not.toHaveBeenCalled();
    expect(sendConfirmationMock).not.toHaveBeenCalled();
  });

  it("still succeeds (consent already recorded on the lead) if the newsletter wiring fails", async () => {
    subFindUniqueMock.mockRejectedValue(new Error("db down"));
    const { POST } = await loadRoute();
    const res = await POST(
      req({ email: "a@b.co", consentNewsletter: true }) as never,
    );

    expect(res.status).toBe(200);
    expect(leadCreateMock).toHaveBeenCalledTimes(1);
    const leadArg = leadCreateMock.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(leadArg.data.consentNewsletter).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Honesty: rate limit, honeypot, no fake success
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assessment/lead — abuse + failure handling", () => {
  it("returns 429 before any write when the rate limit is exceeded", async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 3_600_000,
      limit: 5,
    });
    const { POST } = await loadRoute();
    const res = await POST(req({ email: "a@b.co" }) as never);

    expect(res.status).toBe(429);
    expect(checkRateLimitMock).toHaveBeenCalledWith("contact", "203.0.113.7");
    expect(leadCreateMock).not.toHaveBeenCalled();
  });

  it("silently succeeds on a filled honeypot WITHOUT writing anything", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req({ email: "bot@spam.io", _hp: "i-am-a-bot" }) as never,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    expect(leadCreateMock).not.toHaveBeenCalled();
    expect(subCreateMock).not.toHaveBeenCalled();
  });

  it("returns an honest 500 (no fake success) when the lead write fails", async () => {
    leadCreateMock.mockRejectedValue(new Error("db down"));
    const { POST } = await loadRoute();
    const res = await POST(req({ email: "a@b.co" }) as never);

    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBeTruthy();
    expect(json).not.toHaveProperty("success");
  });
});
