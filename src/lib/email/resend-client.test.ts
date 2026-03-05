import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { MockResend } = vi.hoisted(() => {
  const MockResend = vi.fn();
  return { MockResend };
});

vi.mock("resend", () => {
  class FakeResend {
    emails = { send: vi.fn().mockResolvedValue({ id: "email-123" }) };
    constructor(...args: unknown[]) {
      MockResend(...args);
      return this;
    }
  }
  return { Resend: FakeResend };
});

// We need to re-import after each test to reset the singleton
// So we use dynamic import pattern

describe("resend-client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_FROM_NAME;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getResendClient", () => {
    it("returns null when RESEND_API_KEY is not set", async () => {
      const { getResendClient } = await import("./resend-client");
      expect(getResendClient()).toBeNull();
    });

    it("creates and returns a Resend client when API key is set", async () => {
      process.env.RESEND_API_KEY = "re_test_12345";
      const { getResendClient } = await import("./resend-client");
      const client = getResendClient();
      expect(client).not.toBeNull();
      expect(MockResend).toHaveBeenCalledWith("re_test_12345");
    });

    it("returns the same singleton on subsequent calls", async () => {
      process.env.RESEND_API_KEY = "re_test_12345";
      const { getResendClient } = await import("./resend-client");
      const client1 = getResendClient();
      const client2 = getResendClient();
      expect(client1).toBe(client2);
      // Should only have been constructed once
      expect(MockResend).toHaveBeenCalledTimes(1);
    });
  });

  describe("isResendConfigured", () => {
    it("returns false when RESEND_API_KEY is not set", async () => {
      const { isResendConfigured } = await import("./resend-client");
      expect(isResendConfigured()).toBe(false);
    });

    it("returns true when RESEND_API_KEY is set", async () => {
      process.env.RESEND_API_KEY = "re_test_12345";
      const { isResendConfigured } = await import("./resend-client");
      expect(isResendConfigured()).toBe(true);
    });

    it("returns false when RESEND_API_KEY is empty string", async () => {
      process.env.RESEND_API_KEY = "";
      const { isResendConfigured } = await import("./resend-client");
      expect(isResendConfigured()).toBe(false);
    });
  });

  describe("getEmailFrom", () => {
    it("returns default email when EMAIL_FROM is not set", async () => {
      const { getEmailFrom } = await import("./resend-client");
      expect(getEmailFrom()).toBe("notifications@caelex.eu");
    });

    it("returns EMAIL_FROM when set", async () => {
      process.env.EMAIL_FROM = "custom@example.com";
      const { getEmailFrom } = await import("./resend-client");
      expect(getEmailFrom()).toBe("custom@example.com");
    });
  });

  describe("getEmailFromName", () => {
    it("returns default name when EMAIL_FROM_NAME is not set", async () => {
      const { getEmailFromName } = await import("./resend-client");
      expect(getEmailFromName()).toBe("Caelex Compliance");
    });

    it("returns EMAIL_FROM_NAME when set", async () => {
      process.env.EMAIL_FROM_NAME = "Custom Sender";
      const { getEmailFromName } = await import("./resend-client");
      expect(getEmailFromName()).toBe("Custom Sender");
    });
  });
});
