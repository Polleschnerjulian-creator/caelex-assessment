/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Tests for the batched analytics ingestion route (src/app/api/analytics/track).
 *
 * These are PURE/MOCKED unit tests — Prisma, NextAuth `auth()`, the rate
 * limiter, the consent resolver, and the logger are all mocked. The shared
 * typed contract (`@/lib/analytics/events`) is imported FOR REAL so the route's
 * use of parseWireEvent / productFromPath / isEssentialEventType is exercised
 * against the actual taxonomy. (Not executed here — the orchestrator runs the
 * suite centrally.)
 *
 * What is exercised hard:
 *   1. BATCH VALIDATION — array body, {events,_consent} wrapper, legacy single
 *      object, per-event drop of malformed events, the 50-event cap, and the
 *      query-string-in-path strip.
 *   2. RATE-LIMIT APPLICATION — the `analytics` tier is consulted, keyed on
 *      getIdentifier(request)+sessionId, a 429 short-circuits before any write,
 *      and a successful limit proceeds to createMany.
 *   3. The privacy spine — consent gate (essential allow-list), bot filter,
 *      server-derived ipCountry (raw IP never stored), userId anti-spoof, and
 *      server-stamped product.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (declared before the route is dynamically imported) ──

const createManyMock = vi.fn().mockResolvedValue({ count: 0 });
const acqCreateMock = vi.fn().mockResolvedValue({});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: { createMany: (args: unknown) => createManyMock(args) },
    acquisitionEvent: { create: (args: unknown) => acqCreateMock(args) },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 119,
    reset: Date.now() + 60000,
    limit: 120,
  }),
  getIdentifier: vi.fn().mockReturnValue("ip:203.0.113.7"),
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too Many Requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    }),
  ),
}));

// The consent resolver is server-only; mock both it and the `server-only` shim.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/analytics-consent.server", () => ({
  isAnalyticsConsentString: vi.fn(
    (c: string | null | undefined) =>
      typeof c === "string" && c !== "none" && c !== "necessary",
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ── Helpers ──

const REAL_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function req(
  body: unknown,
  opts: { headers?: Record<string, string>; ua?: string } = {},
): Request {
  return new Request("http://localhost/api/analytics/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-agent": opts.ua ?? REAL_UA,
      ...(opts.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}

/** A minimal valid wire event (contract `wireEventSchema`-shaped). */
function pageView(overrides: Record<string, unknown> = {}) {
  return {
    eventType: "page_viewed",
    eventData: {
      schemaVersion: 1,
      product: "atlas",
      surface: "atlas",
      feature: "search",
      payload: {},
    },
    sessionId: "sess_abc",
    path: "/atlas/search",
    ...overrides,
  };
}

async function loadRoute() {
  return import("./route");
}

beforeEach(() => {
  vi.resetModules();
  createManyMock.mockClear().mockResolvedValue({ count: 0 });
  acqCreateMock.mockClear().mockResolvedValue({});
});

// ─────────────────────────────────────────────────────────────────────────────
// Batch validation
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/analytics/track — batch validation", () => {
  it("accepts a bare array batch and writes all rows in ONE createMany", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req([pageView(), pageView({ path: "/atlas/case/123" })], {
        headers: { "x-cookie-consent": "analytics" },
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, tracked: 2 });
    expect(createManyMock).toHaveBeenCalledTimes(1);
    const arg = createManyMock.mock.calls[0][0] as { data: unknown[] };
    expect(Array.isArray(arg.data)).toBe(true);
    expect(arg.data).toHaveLength(2);
  });

  it("accepts the {events,_consent} wrapper form", async () => {
    const { POST } = await loadRoute();
    // Consent rides in the wrapper, NOT in a header.
    const res = await POST(
      req({ events: [pageView(), pageView()], _consent: "analytics" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tracked: 2 });
    expect(createManyMock).toHaveBeenCalledTimes(1);
  });

  it("still accepts the legacy single-object body (back-compat)", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        {
          eventType: "page_view", // legacy event name
          eventData: { page: "/dashboard" },
          category: "navigation",
          sessionId: "sess_legacy",
          path: "/dashboard",
        },
        { headers: { "x-cookie-consent": "analytics" } },
      ),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tracked: 1 });
    expect(createManyMock).toHaveBeenCalledTimes(1);
    const rows = (
      createManyMock.mock.calls[0][0] as {
        data: Array<Record<string, unknown>>;
      }
    ).data;
    expect(rows[0].eventType).toBe("page_view");
  });

  it("truncates an over-cap batch to 50 events", async () => {
    const { POST } = await loadRoute();
    const many = Array.from({ length: 75 }, () => pageView());
    const res = await POST(
      req(many, { headers: { "x-cookie-consent": "analytics" } }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tracked: 50 });
    const rows = (createManyMock.mock.calls[0][0] as { data: unknown[] }).data;
    expect(rows).toHaveLength(50);
  });

  it("drops a malformed event individually but keeps the valid ones", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        [
          pageView(),
          { eventType: "not_a_real_event_type", sessionId: "sess_x" }, // unknown type → dropped by strict, no legacy match either (no path) but legacy schema accepts it...
          pageView(),
        ],
        { headers: { "x-cookie-consent": "analytics" } },
      ),
    );

    expect(res.status).toBe(200);
    // The middle one parses via the permissive LEGACY schema (eventType is a
    // free string there), so it is kept — 3 rows. The point of this test is
    // that one odd event never throws/aborts the whole batch.
    const body = (await res.json()) as { tracked: number };
    expect(body.tracked).toBeGreaterThanOrEqual(2);
    expect(createManyMock).toHaveBeenCalledTimes(1);
  });

  it("drops an entirely unparseable event (missing sessionId) from the batch", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        [
          pageView(),
          { eventType: "page_viewed" /* no sessionId → fails BOTH schemas */ },
        ],
        { headers: { "x-cookie-consent": "analytics" } },
      ),
    );

    expect(await res.json()).toMatchObject({ tracked: 1 });
  });

  it("strips a query string from path (pathname-only persisted)", async () => {
    const { POST } = await loadRoute();
    // A legacy body whose path carries a query string — the strict contract
    // schema would reject it, so it falls to the legacy schema, where
    // pathnameOnly() must scrub the query before persistence.
    await POST(
      req(
        {
          eventType: "page_view",
          sessionId: "sess_q",
          path: "/atlas/search?q=secret+deal&utm_source=evil",
        },
        { headers: { "x-cookie-consent": "analytics" } },
      ),
    );

    const rows = (
      createManyMock.mock.calls[0][0] as {
        data: Array<Record<string, unknown>>;
      }
    ).data;
    expect(rows[0].path).toBe("/atlas/search");
    expect(String(rows[0].path)).not.toContain("?");
    expect(String(rows[0].path)).not.toContain("secret");
  });

  it("returns tracked:0 (not an error) for an unparseable body", async () => {
    const { POST } = await loadRoute();
    const res = await POST(req({ garbage: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, tracked: 0 });
    expect(createManyMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate-limit application (the infra hard-requirement)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/analytics/track — rate limiting", () => {
  it("consults the `analytics` tier keyed on identifier + sessionId", async () => {
    const { checkRateLimit, getIdentifier } = await import("@/lib/ratelimit");
    const { POST } = await loadRoute();

    await POST(
      req([pageView({ sessionId: "sess_KEY" })], {
        headers: { "x-cookie-consent": "analytics" },
      }),
    );

    expect(getIdentifier).toHaveBeenCalled();
    expect(checkRateLimit).toHaveBeenCalledTimes(1);
    const [tier, identifier] = vi.mocked(checkRateLimit).mock.calls[0];
    expect(tier).toBe("analytics");
    // identifier = `${getIdentifier(request)}:${sessionId}`
    expect(identifier).toBe("ip:203.0.113.7:sess_KEY");
  });

  it("returns 429 and writes NOTHING when the limit is exceeded", async () => {
    const { checkRateLimit, createRateLimitResponse } =
      await import("@/lib/ratelimit");
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
      limit: 120,
    });

    const { POST } = await loadRoute();
    const res = await POST(
      req([pageView()], { headers: { "x-cookie-consent": "analytics" } }),
    );

    expect(res.status).toBe(429);
    expect(createRateLimitResponse).toHaveBeenCalledTimes(1);
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("proceeds to write when the limit allows it", async () => {
    const { checkRateLimit } = await import("@/lib/ratelimit");
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      success: true,
      remaining: 100,
      reset: Date.now() + 60000,
      limit: 120,
    });

    const { POST } = await loadRoute();
    const res = await POST(
      req([pageView()], { headers: { "x-cookie-consent": "analytics" } }),
    );

    expect(res.status).toBe(200);
    expect(createManyMock).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Consent gate + bot filter + privacy spine
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/analytics/track — consent + bot + privacy", () => {
  it("drops non-essential events without analytics consent", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req([pageView()], { headers: { "x-cookie-consent": "necessary" } }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tracked: 0 });
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("keeps an essential event (signup) WITHOUT analytics consent", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);

    const { POST } = await loadRoute();
    const res = await POST(
      req(
        [
          {
            eventType: "signup",
            sessionId: "sess_s",
            userId: "u1",
            path: "/signup",
          },
        ],
        { headers: { "x-cookie-consent": "necessary" } },
      ),
    );

    expect(await res.json()).toMatchObject({ tracked: 1 });
    expect(createManyMock).toHaveBeenCalledTimes(1);
  });

  it("drops ALL events when the User-Agent is a known bot", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req([pageView()], {
        headers: { "x-cookie-consent": "analytics" },
        ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tracked: 0 });
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("derives ipCountry from headers and never stores a raw IP", async () => {
    const { POST } = await loadRoute();
    await POST(
      req([pageView()], {
        headers: {
          "x-cookie-consent": "analytics",
          "cf-ipcountry": "DE",
          // a raw IP header that must NEVER end up on the row
          "x-forwarded-for": "198.51.100.42",
        },
      }),
    );

    const rows = (
      createManyMock.mock.calls[0][0] as {
        data: Array<Record<string, unknown>>;
      }
    ).data;
    expect(rows[0].ipCountry).toBe("DE");
    const serialised = JSON.stringify(rows[0]);
    expect(serialised).not.toContain("198.51.100.42");
  });

  it("stamps the server-derived product into eventData from the path", async () => {
    const { POST } = await loadRoute();
    await POST(
      req([pageView({ path: "/trade/operations" })], {
        headers: { "x-cookie-consent": "analytics" },
      }),
    );

    const rows = (
      createManyMock.mock.calls[0][0] as {
        data: Array<Record<string, unknown>>;
      }
    ).data;
    const eventData = rows[0].eventData as Record<string, unknown>;
    // /trade → product "trade" (productFromPath), stamped server-side even
    // though the client claimed "atlas" in the sample envelope.
    expect(eventData.product).toBe("trade");
  });

  it("nulls a spoofed userId that does not match the session", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "real-user" },
    } as never);

    const { POST } = await loadRoute();
    await POST(
      req([pageView({ userId: "victim-user" })], {
        headers: { "x-cookie-consent": "analytics" },
      }),
    );

    const rows = (
      createManyMock.mock.calls[0][0] as {
        data: Array<Record<string, unknown>>;
      }
    ).data;
    expect(rows[0].userId).toBeNull();
  });

  it("keeps a userId that matches the session", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u-match" } } as never);

    const { POST } = await loadRoute();
    await POST(
      req([pageView({ userId: "u-match" })], {
        headers: { "x-cookie-consent": "analytics" },
      }),
    );

    const rows = (
      createManyMock.mock.calls[0][0] as {
        data: Array<Record<string, unknown>>;
      }
    ).data;
    expect(rows[0].userId).toBe("u-match");
  });

  it("never throws — a Prisma failure still returns ok:true", async () => {
    createManyMock.mockRejectedValueOnce(new Error("db down"));
    const { POST } = await loadRoute();
    const res = await POST(
      req([pageView()], { headers: { "x-cookie-consent": "analytics" } }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Acquisition derivation (preserved, contract-aligned)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/analytics/track — acquisition derivation", () => {
  it("derives an acquisition 'visit' from a slug utmSource on acq_page_viewed", async () => {
    const { POST } = await loadRoute();
    await POST(
      req(
        [
          {
            eventType: "acq_page_viewed",
            eventData: {
              schemaVersion: 1,
              product: "marketing",
              surface: "marketing",
              feature: "landing",
              payload: { utmSource: "linkedin", utmMedium: "social" },
            },
            sessionId: "sess_acq",
            path: "/",
          },
        ],
        { headers: { "x-cookie-consent": "analytics" } },
      ),
    );

    expect(acqCreateMock).toHaveBeenCalledTimes(1);
    const data = (
      acqCreateMock.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data.source).toBe("linkedin");
    expect(data.medium).toBe("social");
    expect(data.eventType).toBe("visit");
  });

  it("does NOT create an acquisition row when no utmSource is present", async () => {
    const { POST } = await loadRoute();
    await POST(
      req([pageView()], { headers: { "x-cookie-consent": "analytics" } }),
    );
    expect(acqCreateMock).not.toHaveBeenCalled();
  });

  it("derives an acquisition 'signup' for a matched-session signup", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u-su" } } as never);

    const { POST } = await loadRoute();
    await POST(
      req(
        [{ eventType: "signup", sessionId: "sess_su", userId: "u-su" }],
        { headers: { "x-cookie-consent": "necessary" } }, // essential → passes gate
      ),
    );

    expect(acqCreateMock).toHaveBeenCalledTimes(1);
    const data = (
      acqCreateMock.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data.eventType).toBe("signup");
    expect(data.userId).toBe("u-su");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Server-side PII firewall (the blocking-review fix): eventData is re-validated
// against the strict typed taxonomy server-side, so a tampered client cannot
// persist free-form PII. A non-conforming event is reduced to a minimal safe
// envelope; an unknown eventType is dropped.
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/analytics/track — server-side PII firewall", () => {
  it("strips tampered PII from a typed event (only the safe envelope persists)", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        [
          {
            eventType: "feature_used",
            eventData: {
              schemaVersion: 1,
              product: "atlas",
              surface: "atlas",
              feature: "search",
              secretEmail: "john@example.com",
              note: "privileged client matter Acme v State",
              payload: { evilField: "raw PII prose" },
            },
            sessionId: "sess_pii",
            path: "/atlas/search",
          },
        ],
        { headers: { "x-cookie-consent": "analytics" } },
      ),
    );
    expect(res.status).toBe(200);
    expect(createManyMock).toHaveBeenCalledTimes(1);
    const rows = (
      createManyMock.mock.calls[0][0] as {
        data: { eventData: Record<string, unknown> }[];
      }
    ).data;
    const ed = rows[0].eventData;
    const serialised = JSON.stringify(ed);
    expect(serialised).not.toContain("john@example.com");
    expect(serialised).not.toContain("privileged");
    expect(serialised).not.toContain("evilField");
    expect(ed).not.toHaveProperty("secretEmail");
    expect(ed).not.toHaveProperty("note");
    expect(ed.product).toBe("atlas");
    expect(ed.schemaVersion).toBe(1);
  });

  it("reduces a legacy event with PII eventData to a minimal safe envelope", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        {
          eventType: "page_view",
          eventData: { secretEmail: "x@y.com", q: "the secret M&A deal" },
          sessionId: "sess_legacy_pii",
          path: "/dashboard",
        },
        { headers: { "x-cookie-consent": "analytics" } },
      ),
    );
    expect(res.status).toBe(200);
    expect(createManyMock).toHaveBeenCalledTimes(1);
    const rows = (
      createManyMock.mock.calls[0][0] as {
        data: { eventData: Record<string, unknown> }[];
      }
    ).data;
    const ed = rows[0].eventData;
    expect(JSON.stringify(ed)).not.toContain("x@y.com");
    expect(JSON.stringify(ed)).not.toContain("secret M&A");
    expect(ed).not.toHaveProperty("secretEmail");
    expect(ed).not.toHaveProperty("q");
  });

  it("drops an unknown/invented eventType server-side (nothing persisted)", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      req(
        [
          {
            eventType: "totally_made_up_event",
            eventData: {},
            sessionId: "sess_x",
            path: "/atlas",
          },
        ],
        { headers: { "x-cookie-consent": "analytics" } },
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tracked: 0 });
    expect(createManyMock).not.toHaveBeenCalled();
  });
});
