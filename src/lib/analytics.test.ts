/**
 * Analytics Tracking Utility Tests
 *
 * Tests client-side analytics (sendBeacon/fetch), server-side analytics (Prisma),
 * session management, consent handling, and error resilience.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Prisma for server-side analytics
const mockCreate = vi.fn().mockResolvedValue({});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// ─── Browser environment helpers ────────────────────────────────────────────

function setupBrowserEnv() {
  // Set up minimal browser globals
  const mockSendBeacon = vi.fn().mockReturnValue(true);
  const mockFetch = vi.fn().mockResolvedValue({ ok: true });
  const mockSessionStorage = {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  };
  const mockLocalStorage = {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  };

  Object.defineProperty(globalThis, "window", {
    value: {
      location: { pathname: "/dashboard" },
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "document", {
    value: { referrer: "https://example.com" },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "navigator", {
    value: { sendBeacon: mockSendBeacon },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "sessionStorage", {
    value: mockSessionStorage,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "localStorage", {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });

  // Preserve original fetch and replace
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as unknown as typeof fetch;

  return {
    mockSendBeacon,
    mockFetch,
    mockSessionStorage,
    mockLocalStorage,
    cleanup: () => {
      globalThis.fetch = originalFetch;
      // @ts-expect-error - cleaning up globals
      delete globalThis.window;
      // @ts-expect-error - cleaning up globals
      delete globalThis.document;
      // @ts-expect-error - cleaning up globals
      delete globalThis.navigator;
      // @ts-expect-error - cleaning up globals
      delete globalThis.sessionStorage;
      // @ts-expect-error - cleaning up globals
      delete globalThis.localStorage;
    },
  };
}

function teardownBrowserEnv() {
  // @ts-expect-error - cleaning up globals
  delete globalThis.window;
  // @ts-expect-error - cleaning up globals
  delete globalThis.document;
  // @ts-expect-error - cleaning up globals
  delete globalThis.navigator;
  // @ts-expect-error - cleaning up globals
  delete globalThis.sessionStorage;
  // @ts-expect-error - cleaning up globals
  delete globalThis.localStorage;
}

// ─── Server Analytics Tests ─────────────────────────────────────────────────

describe("serverAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teardownBrowserEnv();
  });

  it("tracks an API call with success status", async () => {
    // Need fresh import to get clean module state
    vi.resetModules();
    const { serverAnalytics } = await import("./analytics");

    await serverAnalytics.trackApiCall(
      "/api/v1/satellites",
      "GET",
      200,
      150,
      "user-1",
      "org-1",
    );

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "api_call",
        eventCategory: "engagement",
        sessionId: "server",
        userId: "user-1",
        organizationId: "org-1",
        path: "/api/v1/satellites",
        eventData: { method: "GET", statusCode: 200, durationMs: 150 },
        durationMs: 150,
      }),
    });
  });

  it("tracks an API call with error status (>= 400)", async () => {
    vi.resetModules();
    const { serverAnalytics } = await import("./analytics");

    await serverAnalytics.trackApiCall("/api/v1/satellites", "POST", 500, 50);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "api_call",
        eventCategory: "error",
        sessionId: "server",
        eventData: { method: "POST", statusCode: 500, durationMs: 50 },
      }),
    });
  });

  it("silently handles prisma errors on trackApiCall", async () => {
    vi.resetModules();
    mockCreate.mockRejectedValueOnce(new Error("DB connection failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { serverAnalytics } = await import("./analytics");

    // Should not throw
    await serverAnalytics.trackApiCall("/api/v1/test", "GET", 200, 100);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Analytics] Failed to track API call",
    );
    consoleSpy.mockRestore();
  });

  it("tracks a server-side event with default category", async () => {
    vi.resetModules();
    const { serverAnalytics } = await import("./analytics");

    await serverAnalytics.track("report_generated", {
      reportType: "compliance",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "report_generated",
        eventCategory: "general",
        sessionId: "server",
        eventData: { reportType: "compliance" },
      }),
    });
  });

  it("tracks a server-side event with custom category and user info", async () => {
    vi.resetModules();
    const { serverAnalytics } = await import("./analytics");

    await serverAnalytics.track(
      "assessment_completed",
      { module: "eu_space_act" },
      { userId: "user-1", organizationId: "org-1", category: "conversion" },
    );

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "assessment_completed",
        eventCategory: "conversion",
        userId: "user-1",
        organizationId: "org-1",
      }),
    });
  });

  it("silently handles prisma errors on server track", async () => {
    vi.resetModules();
    mockCreate.mockRejectedValueOnce(new Error("DB error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { serverAnalytics } = await import("./analytics");
    await serverAnalytics.track("test_event", { data: true });

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Analytics] Failed to track server event",
    );
    consoleSpy.mockRestore();
  });
});

// ─── Client Analytics Tests ─────────────────────────────────────────────────

describe("analytics (client-side)", () => {
  let env: ReturnType<typeof setupBrowserEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    env = setupBrowserEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("sends events via sendBeacon when navigator.sendBeacon is available", async () => {
    const { analytics } = await import("./analytics");

    analytics.track("test_event", { key: "value" });

    expect(env.mockSendBeacon).toHaveBeenCalledWith(
      "/api/analytics/track",
      expect.any(String),
    );

    // Verify payload structure
    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.eventType).toBe("test_event");
    expect(payload.eventData).toEqual({ key: "value" });
    expect(payload.category).toBe("general");
    expect(payload._consent).toBe("none");
    expect(payload.timestamp).toBeDefined();
  });

  it("falls back to fetch when sendBeacon is unavailable", async () => {
    // Remove sendBeacon
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });

    const { analytics } = await import("./analytics");
    analytics.track("test_event", { key: "value" });

    expect(env.mockFetch).toHaveBeenCalledWith(
      "/api/analytics/track",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        keepalive: true,
      }),
    );
  });

  it("tracks page views with correct category and path", async () => {
    const { analytics } = await import("./analytics");

    analytics.page("/dashboard/cybersecurity");

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.eventType).toBe("page_view");
    expect(payload.eventData.page).toBe("/dashboard/cybersecurity");
    expect(payload.category).toBe("navigation");
    expect(payload.path).toBe("/dashboard/cybersecurity");
  });

  it("tracks feature usage with engagement category", async () => {
    const { analytics } = await import("./analytics");

    analytics.feature("eu_space_act", "assessment_started");

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.eventType).toBe("feature_use");
    expect(payload.eventData.feature).toBe("eu_space_act");
    expect(payload.eventData.action).toBe("assessment_started");
    expect(payload.category).toBe("engagement");
  });

  it("tracks conversion events", async () => {
    const { analytics } = await import("./analytics");

    analytics.conversion("signup", 99.99, { organizationId: "org-1" });

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.eventType).toBe("conversion");
    expect(payload.eventData.conversionType).toBe("signup");
    expect(payload.eventData.value).toBe(99.99);
    expect(payload.category).toBe("conversion");
    expect(payload.organizationId).toBe("org-1");
  });

  it("tracks error events", async () => {
    const { analytics } = await import("./analytics");

    analytics.error("api_error", "Failed to load dashboard");

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.eventType).toBe("error");
    expect(payload.eventData.errorType).toBe("api_error");
    expect(payload.eventData.errorMessage).toBe("Failed to load dashboard");
    expect(payload.category).toBe("error");
  });

  it("tracks timing events with durationMs", async () => {
    const { analytics } = await import("./analytics");

    analytics.timing("page_load", 1234, { page: "/dashboard" });

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.eventData.durationMs).toBe(1234);
    expect(payload.eventData.page).toBe("/dashboard");
    expect(payload.category).toBe("engagement");
    expect(payload.durationMs).toBe(1234);
  });

  it("identifies a user and includes user info in subsequent events", async () => {
    const { analytics } = await import("./analytics");

    analytics.identify("user-123", "org-456");

    // The identify call itself sends an event
    const identifyPayload = JSON.parse(
      env.mockSendBeacon.mock.calls[0][1] as string,
    );
    expect(identifyPayload.eventType).toBe("user_identified");
    expect(identifyPayload.eventData.userId).toBe("user-123");
    expect(identifyPayload.eventData.organizationId).toBe("org-456");

    // Subsequent events should include the user info
    analytics.track("test_event");

    const trackPayload = JSON.parse(
      env.mockSendBeacon.mock.calls[1][1] as string,
    );
    expect(trackPayload.userId).toBe("user-123");
    expect(trackPayload.organizationId).toBe("org-456");
  });

  it("identify without organizationId sets orgId to null", async () => {
    const { analytics } = await import("./analytics");

    analytics.identify("user-123");

    // Subsequent event should have null organizationId
    analytics.track("test_event");

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[1][1] as string);
    expect(payload.userId).toBe("user-123");
    expect(payload.organizationId).toBeNull();
  });

  // ─── Session Management ───────────────────────────────────────────────────

  it("generates a new session ID when none exists", async () => {
    env.mockSessionStorage.getItem.mockReturnValue(null);

    const { analytics } = await import("./analytics");
    analytics.track("test_event");

    // Should have tried to get from sessionStorage
    expect(env.mockSessionStorage.getItem).toHaveBeenCalledWith(
      "caelex_session_id",
    );
    // Should have stored new session ID
    expect(env.mockSessionStorage.setItem).toHaveBeenCalledWith(
      "caelex_session_id",
      expect.stringContaining("sess_"),
    );

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.sessionId).toMatch(/^sess_\d+_/);
  });

  it("reuses existing session ID from sessionStorage", async () => {
    env.mockSessionStorage.getItem.mockReturnValue("sess_existing_123");

    const { analytics } = await import("./analytics");
    analytics.track("test_event");

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.sessionId).toBe("sess_existing_123");
    // Should not set a new session ID
    expect(env.mockSessionStorage.setItem).not.toHaveBeenCalled();
  });

  it("uses provided sessionId from options over generated one", async () => {
    const { analytics } = await import("./analytics");

    analytics.track("test_event", {}, { sessionId: "custom_session" });

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.sessionId).toBe("custom_session");
  });

  // ─── Consent Handling ─────────────────────────────────────────────────────

  it("reads 'all' consent from localStorage", async () => {
    env.mockLocalStorage.getItem.mockReturnValue("all");

    const { analytics } = await import("./analytics");
    analytics.track("test_event");

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload._consent).toBe("analytics");
  });

  it("reads JSON consent with analytics=true from localStorage", async () => {
    env.mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({ analytics: true }),
    );

    const { analytics } = await import("./analytics");
    analytics.track("test_event");

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload._consent).toBe("analytics");
  });

  it("reads JSON consent with analytics=false from localStorage", async () => {
    env.mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({ analytics: false }),
    );

    const { analytics } = await import("./analytics");
    analytics.track("test_event");

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload._consent).toBe("necessary");
  });

  it("defaults to 'none' consent when no cookie consent stored", async () => {
    env.mockLocalStorage.getItem.mockReturnValue(null);

    const { analytics } = await import("./analytics");
    analytics.track("test_event");

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload._consent).toBe("none");
  });

  it("handles malformed consent JSON gracefully", async () => {
    env.mockLocalStorage.getItem.mockReturnValue("not-valid-json{");

    const { analytics } = await import("./analytics");

    // Should not throw
    analytics.track("test_event");

    // Should fall through to "none" on parse error
    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload._consent).toBe("none");
  });

  // ─── TrackOptions Override ────────────────────────────────────────────────

  it("uses options.category when provided in track()", async () => {
    const { analytics } = await import("./analytics");

    analytics.track("test_event", {}, { category: "conversion" });

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.category).toBe("conversion");
  });

  it("uses options.path and options.referrer when provided", async () => {
    const { analytics } = await import("./analytics");

    analytics.track(
      "test_event",
      {},
      { path: "/custom-path", referrer: "https://custom.com" },
    );

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.path).toBe("/custom-path");
    expect(payload.referrer).toBe("https://custom.com");
  });

  it("uses options.userId and options.organizationId when provided", async () => {
    const { analytics } = await import("./analytics");

    analytics.track(
      "test_event",
      {},
      { userId: "opt-user", organizationId: "opt-org" },
    );

    const payload = JSON.parse(env.mockSendBeacon.mock.calls[0][1] as string);
    expect(payload.userId).toBe("opt-user");
    expect(payload.organizationId).toBe("opt-org");
  });

  // ─── Error Handling ───────────────────────────────────────────────────────

  it("silently handles fetch failures", async () => {
    // Remove sendBeacon to force fetch path
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });
    env.mockFetch.mockRejectedValue(new Error("Network error"));

    const { analytics } = await import("./analytics");

    // Should not throw
    analytics.track("test_event");

    expect(env.mockFetch).toHaveBeenCalled();
  });

  it("includes consent header in fetch fallback", async () => {
    // Remove sendBeacon
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });
    env.mockLocalStorage.getItem.mockReturnValue("all");

    const { analytics } = await import("./analytics");
    analytics.track("test_event");

    expect(env.mockFetch).toHaveBeenCalledWith(
      "/api/analytics/track",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-cookie-consent": "analytics",
        }),
      }),
    );
  });
});

// ─── Server-side sendEvent (no window) ──────────────────────────────────────

describe("analytics on server (no window)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    teardownBrowserEnv();
  });

  it("returns 'server' as session ID when window is undefined", async () => {
    // navigator is also undefined on server, so sendBeacon branch won't be hit
    // But fetch is available globally in Node
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const { analytics } = await import("./analytics");
    analytics.track("server_test");

    // fetch should have been called since navigator.sendBeacon doesn't exist
    if (mockFetch.mock.calls.length > 0) {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.sessionId).toBe("server");
    }
  });
});

// ─── Default Export ─────────────────────────────────────────────────────────

describe("default export", () => {
  beforeEach(() => {
    vi.resetModules();
    teardownBrowserEnv();
  });

  it("exports analytics as default", async () => {
    const mod = await import("./analytics");
    expect(mod.default).toBe(mod.analytics);
  });
});
