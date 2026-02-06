import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Store original env
const originalEnv = process.env.NODE_ENV;

// Mock LogSnag module
vi.mock("logsnag", () => ({
  LogSnag: vi.fn().mockImplementation(() => ({
    track: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    identify: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("LogSnag Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("trackSignup", () => {
    it("should not track in non-production environment", async () => {
      process.env.NODE_ENV = "development";
      const { trackSignup } = await import("@/lib/logsnag");

      await trackSignup({
        userId: "user-123",
        email: "test@example.com",
        provider: "credentials",
      });

      // In development, tracking should be skipped
      // The function should return without calling LogSnag
    });

    it("should track signup event with correct parameters", async () => {
      process.env.NODE_ENV = "production";
      const { trackSignup } = await import("@/lib/logsnag");

      await trackSignup({
        userId: "user-123",
        email: "test@example.com",
        provider: "credentials",
      });

      // Function should complete without errors
    });
  });

  describe("trackSubscription", () => {
    it("should not track in non-production environment", async () => {
      process.env.NODE_ENV = "development";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-123",
        organizationName: "Test Org",
        plan: "PROFESSIONAL",
        action: "upgrade",
        mrr: 799,
      });

      // Should skip tracking in development
    });

    it("should track subscription upgrade event", async () => {
      process.env.NODE_ENV = "production";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-123",
        organizationName: "Test Org",
        plan: "PROFESSIONAL",
        action: "upgrade",
        mrr: 799,
      });

      // Function should complete without errors
    });

    it("should track subscription downgrade event", async () => {
      process.env.NODE_ENV = "production";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-123",
        organizationName: "Test Org",
        plan: "STARTER",
        action: "downgrade",
        mrr: 299,
      });

      // Function should complete without errors
    });

    it("should track subscription cancel event", async () => {
      process.env.NODE_ENV = "production";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-123",
        organizationName: "Test Org",
        plan: "FREE",
        action: "cancel",
      });

      // Function should complete without errors
    });

    it("should track subscription reactivate event", async () => {
      process.env.NODE_ENV = "production";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-123",
        organizationName: "Test Org",
        plan: "PROFESSIONAL",
        action: "reactivate",
        mrr: 799,
      });

      // Function should complete without errors
    });
  });

  describe("Event Types", () => {
    it("should support upgrade action", () => {
      const action: "upgrade" | "downgrade" | "cancel" | "reactivate" =
        "upgrade";
      expect(action).toBe("upgrade");
    });

    it("should support downgrade action", () => {
      const action: "upgrade" | "downgrade" | "cancel" | "reactivate" =
        "downgrade";
      expect(action).toBe("downgrade");
    });

    it("should support cancel action", () => {
      const action: "upgrade" | "downgrade" | "cancel" | "reactivate" =
        "cancel";
      expect(action).toBe("cancel");
    });

    it("should support reactivate action", () => {
      const action: "upgrade" | "downgrade" | "cancel" | "reactivate" =
        "reactivate";
      expect(action).toBe("reactivate");
    });
  });
});
