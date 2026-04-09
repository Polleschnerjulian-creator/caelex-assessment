/**
 * Unit tests for POST /api/v1/compliance/cra/classify
 *
 * Public, unauthenticated endpoint. Returns full CRA classification
 * with reasoning chain for top-of-funnel use.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted — must precede any imports that touch the mocked modules) ─

vi.mock("server-only", () => ({}));

// Stub the rate limiter so the test isn't subject to the in-memory
// sliding window in @/lib/ratelimit. Without this every test run
// after the 5th request gets a 429 from the public_api tier.
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn(async () => ({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60_000,
  })),
  getIdentifier: vi.fn(() => "test-identifier"),
}));

const mockClassify = vi.fn();
vi.mock("@/lib/cra-engine.server", () => ({
  classifyCRAProduct: (...args: unknown[]) => mockClassify(...args),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { POST } from "./route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/v1/compliance/cra/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const MOCK_CLASSIFICATION_RESULT = {
  classification: "class_II",
  classificationReasoning: [
    {
      criterion: "Test",
      legalBasis: "Art. 7(2)",
      annexRef: "Annex IV",
      satisfied: true,
      reasoning: "Test reasoning",
    },
  ],
  conformityRoute: "third_party_type_exam",
  isOutOfScope: false,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/v1/compliance/cra/classify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClassify.mockReturnValue(MOCK_CLASSIFICATION_RESULT);
  });

  describe("successful classification", () => {
    it("returns 200 with valid taxonomy product ID", async () => {
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.productClassification).toBe("class_II");
    });

    it("returns classificationReasoning array in response", async () => {
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      const json = await res.json();
      expect(json.data.classificationReasoning).toBeDefined();
      expect(Array.isArray(json.data.classificationReasoning)).toBe(true);
      expect(json.data.classificationReasoning.length).toBeGreaterThan(0);
    });

    it("returns conformityRoute in response data", async () => {
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      const json = await res.json();
      expect(json.data.conformityRoute).toBe("third_party_type_exam");
    });

    it("returns isOutOfScope in response data", async () => {
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      const json = await res.json();
      expect(json.data.isOutOfScope).toBe(false);
    });

    it("returns meta with engine set to 'cra'", async () => {
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      const json = await res.json();
      expect(json.meta.engine).toBe("cra");
    });

    it("returns meta with version", async () => {
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      const json = await res.json();
      expect(json.meta.version).toBe("1.0.0");
    });

    it("returns meta with timestamp ISO string", async () => {
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      const json = await res.json();
      expect(json.meta.timestamp).toBeDefined();
      expect(() => new Date(json.meta.timestamp)).not.toThrow();
    });

    it("handles rule-engine path — no product type, booleans provided", async () => {
      const res = await POST(
        createRequest({
          hasNetworkFunction: true,
          usedInCriticalInfra: true,
        }) as never,
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("accepts empty body and returns 200 (all fields optional/defaulted)", async () => {
      const res = await POST(createRequest({}) as never);
      expect(res.status).toBe(200);
    });

    it("passes resolved answers to classifyCRAProduct", async () => {
      await POST(
        createRequest({
          spaceProductTypeId: "obc",
          productName: "My Satellite",
          hasNetworkFunction: true,
        }) as never,
      );

      expect(mockClassify).toHaveBeenCalledOnce();
      const calledWith = mockClassify.mock.calls[0][0];
      expect(calledWith.spaceProductTypeId).toBe("obc");
      expect(calledWith.productName).toBe("My Satellite");
      expect(calledWith.hasNetworkFunction).toBe(true);
    });

    it("defaults economicOperatorRole to 'manufacturer' when not provided", async () => {
      await POST(createRequest({ spaceProductTypeId: "obc" }) as never);
      const calledWith = mockClassify.mock.calls[0][0];
      expect(calledWith.economicOperatorRole).toBe("manufacturer");
    });

    it("defaults productName to 'Unnamed Product' when not provided", async () => {
      await POST(createRequest({ spaceProductTypeId: "obc" }) as never);
      const calledWith = mockClassify.mock.calls[0][0];
      expect(calledWith.productName).toBe("Unnamed Product");
    });

    it("forwards provided productName", async () => {
      await POST(
        createRequest({
          spaceProductTypeId: "obc",
          productName: "GPS Receiver Module",
        }) as never,
      );
      const calledWith = mockClassify.mock.calls[0][0];
      expect(calledWith.productName).toBe("GPS Receiver Module");
    });

    it("includes conflict: null when engine returns no conflict", async () => {
      mockClassify.mockReturnValueOnce({
        ...MOCK_CLASSIFICATION_RESULT,
        conflict: undefined,
      });
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      const json = await res.json();
      expect(json.data.conflict).toBeNull();
    });

    it("includes outOfScopeReason: null when not out of scope", async () => {
      mockClassify.mockReturnValueOnce({
        ...MOCK_CLASSIFICATION_RESULT,
        outOfScopeReason: undefined,
      });
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      const json = await res.json();
      expect(json.data.outOfScopeReason).toBeNull();
    });

    it("propagates outOfScopeReason when engine returns it", async () => {
      mockClassify.mockReturnValueOnce({
        classification: "default",
        classificationReasoning: [],
        conformityRoute: "self_assessment",
        isOutOfScope: true,
        outOfScopeReason: "Non-commercially supplied OSS",
      });
      const res = await POST(
        createRequest({
          isOSSComponent: true,
          isCommerciallySupplied: false,
        }) as never,
      );
      const json = await res.json();
      expect(json.data.isOutOfScope).toBe(true);
      expect(json.data.outOfScopeReason).toBe("Non-commercially supplied OSS");
    });
  });

  describe("input validation — 400 responses", () => {
    it("returns 400 for invalid economicOperatorRole", async () => {
      const res = await POST(
        createRequest({ economicOperatorRole: "invalid_role" }) as never,
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 with error field on invalid input", async () => {
      const res = await POST(
        createRequest({ economicOperatorRole: "not_valid" }) as never,
      );
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("returns 400 with details from Zod flatten on invalid input", async () => {
      const res = await POST(
        createRequest({ economicOperatorRole: "bad_role" }) as never,
      );
      const json = await res.json();
      expect(json.details).toBeDefined();
    });

    it("returns 400 when productName exceeds 200 characters", async () => {
      const res = await POST(
        createRequest({ productName: "x".repeat(201) }) as never,
      );
      expect(res.status).toBe(400);
    });

    it("does NOT return 400 for valid 'importer' economicOperatorRole", async () => {
      // importer is a valid schema value; out-of-scope is a business logic concern
      const res = await POST(
        createRequest({ economicOperatorRole: "importer" }) as never,
      );
      expect(res.status).toBe(200);
    });
  });

  describe("error handling — 500 response", () => {
    it("returns 500 when classifyCRAProduct throws", async () => {
      mockClassify.mockImplementationOnce(() => {
        throw new Error("Engine failure");
      });
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      expect(res.status).toBe(500);
    });

    it("returns generic error message on engine failure", async () => {
      mockClassify.mockImplementationOnce(() => {
        throw new Error("Some internal error");
      });
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      const json = await res.json();
      expect(json.error).toBe("Classification failed");
    });

    it("does not leak internal error details on 500", async () => {
      mockClassify.mockImplementationOnce(() => {
        throw new Error("Secret internal detail");
      });
      const res = await POST(
        createRequest({ spaceProductTypeId: "obc" }) as never,
      );
      const json = await res.json();
      expect(JSON.stringify(json)).not.toContain("Secret internal detail");
    });
  });
});
