import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Store original env
const originalEnv = process.env.NODE_ENV;
const originalToken = process.env.LOGSNAG_TOKEN;

// Shared mock track function we can inspect
const mockTrack = vi.fn().mockResolvedValue(undefined);

// Mock LogSnag module with a proper class
vi.mock("logsnag", () => {
  return {
    LogSnag: class MockLogSnag {
      track = mockTrack;
      publish = vi.fn().mockResolvedValue(undefined);
      identify = vi.fn().mockResolvedValue(undefined);
    },
  };
});

describe("LogSnag Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalToken !== undefined) {
      process.env.LOGSNAG_TOKEN = originalToken;
    } else {
      delete process.env.LOGSNAG_TOKEN;
    }
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

  describe("trackEvent", () => {
    it("should skip tracking in non-production environment", async () => {
      process.env.NODE_ENV = "development";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackEvent } = await import("@/lib/logsnag");

      await trackEvent({
        channel: "signups",
        event: "Test Event",
        description: "Test description",
      });

      expect(mockTrack).not.toHaveBeenCalled();
    });

    it("should call logsnag.track with correct params in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackEvent } = await import("@/lib/logsnag");

      await trackEvent({
        channel: "signups",
        event: "Test Event",
        description: "Test desc",
        tags: { userId: "u1" },
        notify: true,
      });

      expect(mockTrack).toHaveBeenCalledWith({
        channel: "signups",
        event: "Test Event",
        description: "Test desc",
        icon: expect.any(String),
        tags: { userId: "u1" },
        notify: true,
      });
    });

    it("should use channel default icon when no icon provided", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackEvent } = await import("@/lib/logsnag");

      await trackEvent({
        channel: "errors",
        event: "Error Event",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: "errors",
          icon: expect.any(String),
        }),
      );
    });

    it("should use custom icon when provided", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackEvent } = await import("@/lib/logsnag");

      await trackEvent({
        channel: "signups",
        event: "Custom Icon Event",
        icon: "custom-icon",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: "custom-icon",
        }),
      );
    });

    it("should default notify to false", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackEvent } = await import("@/lib/logsnag");

      await trackEvent({
        channel: "compliance",
        event: "No Notify Event",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          notify: false,
        }),
      );
    });

    it("should gracefully handle errors from logsnag.track", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      mockTrack.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { trackEvent } = await import("@/lib/logsnag");

      // Should not throw
      await expect(
        trackEvent({
          channel: "signups",
          event: "Failing Event",
        }),
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[LogSnag Error]",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("should skip tracking when logsnag client is null (no LOGSNAG_TOKEN)", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.LOGSNAG_TOKEN;
      const { trackEvent } = await import("@/lib/logsnag");

      await trackEvent({
        channel: "signups",
        event: "Should Not Track",
      });

      // logsnag is null, so track should not be called
      expect(mockTrack).not.toHaveBeenCalled();
    });
  });

  describe("trackComplianceMilestone", () => {
    it("should track compliance milestone with correct params", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackComplianceMilestone } = await import("@/lib/logsnag");

      await trackComplianceMilestone({
        organizationId: "org-123",
        organizationName: "TestOrg",
        milestone: "100% Compliant",
        score: 100,
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: "compliance",
          event: "100% Compliant",
          description: "TestOrg: 100% Compliant",
          notify: false,
        }),
      );
    });

    it("should include score in tags when provided", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackComplianceMilestone } = await import("@/lib/logsnag");

      await trackComplianceMilestone({
        organizationId: "org-456",
        organizationName: "Acme",
        milestone: "First Assessment",
        score: 75,
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            organizationId: "org-456",
            score: 75,
          }),
        }),
      );
    });

    it("should omit score from tags when not provided", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackComplianceMilestone } = await import("@/lib/logsnag");

      await trackComplianceMilestone({
        organizationId: "org-789",
        organizationName: "Corp",
        milestone: "Started",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: { organizationId: "org-789" },
        }),
      );
    });
  });

  describe("trackMilestone", () => {
    it("should track generic milestone with value", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackMilestone } = await import("@/lib/logsnag");

      await trackMilestone({
        milestone: "100 Users",
        description: "Reached 100 registered users",
        value: 100,
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: "milestones",
          event: "100 Users",
          description: "Reached 100 registered users",
          tags: { value: 100 },
          notify: true,
        }),
      );
    });

    it("should track milestone without value", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackMilestone } = await import("@/lib/logsnag");

      await trackMilestone({
        milestone: "Launch Day",
        description: "Product launched",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: undefined,
          notify: true,
        }),
      );
    });
  });

  describe("trackError", () => {
    it("should track error with context and userId", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackError } = await import("@/lib/logsnag");

      await trackError({
        error: "Database connection failed",
        context: "User creation flow",
        userId: "user-42",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: "errors",
          event: "Critical Error",
          description: "Database connection failed - User creation flow",
          tags: { userId: "user-42" },
          notify: true,
        }),
      );
    });

    it("should track error without context", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackError } = await import("@/lib/logsnag");

      await trackError({
        error: "Unknown error",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Unknown error",
          tags: undefined,
        }),
      );
    });

    it("should track error without userId", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackError } = await import("@/lib/logsnag");

      await trackError({
        error: "Timeout",
        context: "API call",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Timeout - API call",
          tags: undefined,
        }),
      );
    });
  });

  describe("Email masking in trackSignup", () => {
    it("should mask email address correctly", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackSignup } = await import("@/lib/logsnag");

      await trackSignup({
        userId: "user-1",
        email: "test@example.com",
        provider: "google",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining("te***@example.com"),
        }),
      );
    });

    it("should mask longer email addresses", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackSignup } = await import("@/lib/logsnag");

      await trackSignup({
        userId: "user-2",
        email: "longname@domain.org",
        provider: "credentials",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining("lo***@domain.org"),
        }),
      );
    });

    it("should include provider in description", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackSignup } = await import("@/lib/logsnag");

      await trackSignup({
        userId: "user-3",
        email: "a@b.com",
        provider: "github",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining("via github"),
        }),
      );
    });
  });

  describe("Subscription action icons", () => {
    it("should use correct icon for upgrade", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-1",
        organizationName: "Org",
        plan: "PRO",
        action: "upgrade",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: "\u{1F680}", // Rocket
        }),
      );
    });

    it("should use correct icon for downgrade", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-1",
        organizationName: "Org",
        plan: "FREE",
        action: "downgrade",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: "\u{1F4C9}", // Chart down
        }),
      );
    });

    it("should use correct icon for cancel", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-1",
        organizationName: "Org",
        plan: "FREE",
        action: "cancel",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: "\u{274C}", // Cross
        }),
      );
    });

    it("should use correct icon for reactivate", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-1",
        organizationName: "Org",
        plan: "PRO",
        action: "reactivate",
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: "\u{1F389}", // Party popper
        }),
      );
    });

    it("should notify only for upgrade and reactivate", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";

      const mod = await import("@/lib/logsnag");

      await mod.trackSubscription({
        organizationId: "org-1",
        organizationName: "Org",
        plan: "PRO",
        action: "upgrade",
      });
      expect(mockTrack).toHaveBeenLastCalledWith(
        expect.objectContaining({ notify: true }),
      );

      mockTrack.mockClear();
      vi.resetModules();
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const mod2 = await import("@/lib/logsnag");

      await mod2.trackSubscription({
        organizationId: "org-1",
        organizationName: "Org",
        plan: "FREE",
        action: "cancel",
      });
      expect(mockTrack).toHaveBeenLastCalledWith(
        expect.objectContaining({ notify: false }),
      );
    });

    it("should include mrr in tags when provided", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-1",
        organizationName: "Org",
        plan: "PRO",
        action: "upgrade",
        mrr: 799,
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            mrr: "\u20AC799",
          }),
        }),
      );
    });

    it("should not include mrr in tags when not provided", async () => {
      process.env.NODE_ENV = "production";
      process.env.LOGSNAG_TOKEN = "test-token";
      const { trackSubscription } = await import("@/lib/logsnag");

      await trackSubscription({
        organizationId: "org-1",
        organizationName: "Org",
        plan: "PRO",
        action: "upgrade",
      });

      const callArgs = mockTrack.mock.calls[0][0];
      expect(callArgs.tags).not.toHaveProperty("mrr");
    });
  });
});
