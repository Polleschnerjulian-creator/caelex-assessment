import { test, expect } from "@playwright/test";

/**
 * API Health E2E Tests
 *
 * Verifies critical API endpoints respond correctly.
 * Tests public endpoints (no auth) and validates response shapes.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Public API Endpoints", () => {
  test("GET /api/ontology/stats should return graph statistics", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/ontology/stats`);
    // May require auth — 401 is acceptable, 500 is not
    expect([200, 401, 403]).toContain(res.status());

    if (res.status() === 200) {
      const data = await res.json();
      expect(data).toHaveProperty("totalNodes");
      expect(data).toHaveProperty("totalEdges");
      expect(data.totalNodes).toBeGreaterThan(0);
    }
  });

  test("GET /api/v1/verity/public-key should return Ed25519 key", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/v1/verity/public-key`);
    expect([200, 401]).toContain(res.status());

    if (res.status() === 200) {
      const data = await res.json();
      // Response may be { data: { key_id, ... } } or { key_id, ... }
      const keyData = data.data ?? data;
      expect(keyData).toBeDefined();
    }
  });

  test("POST /api/v1/verity/attestation/verify should accept verification request", async ({
    request,
  }) => {
    const res = await request.post(
      `${BASE_URL}/api/v1/verity/attestation/verify`,
      {
        data: { attestation: {} },
        headers: { "Content-Type": "application/json" },
      },
    );
    // Should return 400 (bad attestation) not 500 (server error)
    expect([200, 400, 403]).toContain(res.status());
  });

  test("POST /api/v1/verity/audit-chain/verify should verify chain", async ({
    request,
  }) => {
    const res = await request.post(
      `${BASE_URL}/api/v1/verity/audit-chain/verify`,
      {
        data: { operatorId: "test-nonexistent" },
        headers: { "Content-Type": "application/json" },
      },
    );
    // Should return 200 (empty valid chain) or 400/403, not 500
    expect([200, 400, 403]).toContain(res.status());
  });
});

test.describe("Assessment API", () => {
  test("POST /api/assessment should accept assessment data", async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/api/assessment`, {
      data: {
        activityType: "spacecraft_operation",
        defenseOnly: false,
      },
      headers: { "Content-Type": "application/json" },
    });
    // Should not return 500
    expect(res.status()).not.toBe(500);
  });
});

test.describe("Auth Endpoints", () => {
  test("GET /api/auth/session should return session info", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/auth/session`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    // Unauthenticated: empty session
    expect(data).toBeDefined();
  });

  test("protected endpoints should return 401 without auth", async ({
    request,
  }) => {
    const protectedEndpoints = [
      "/api/v1/sentinel/agents",
      "/api/v1/sentinel/packets",
      "/api/shield/events",
      "/api/shield/stats",
    ];

    for (const endpoint of protectedEndpoints) {
      const res = await request.get(`${BASE_URL}${endpoint}`);
      expect([401, 403], `${endpoint} should require auth`).toContain(
        res.status(),
      );
    }
  });
});
