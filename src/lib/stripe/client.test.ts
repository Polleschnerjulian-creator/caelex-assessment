import { describe, it, expect, vi, beforeEach } from "vitest";

let constructorArgs: unknown[] = [];

vi.mock("stripe", () => ({
  default: class MockStripe {
    constructor(...args: unknown[]) {
      constructorArgs = args;
    }
  },
}));

describe("stripe/client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    constructorArgs = [];
  });

  it("creates a Stripe instance when STRIPE_SECRET_KEY is set", async () => {
    const originalKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    try {
      const { stripe } = await import("./client");
      expect(stripe).not.toBeNull();
      expect(constructorArgs[0]).toBe("sk_test_123");
      expect(constructorArgs[1]).toEqual({
        apiVersion: "2026-01-28.clover",
        typescript: true,
      });
    } finally {
      if (originalKey === undefined) {
        delete process.env.STRIPE_SECRET_KEY;
      } else {
        process.env.STRIPE_SECRET_KEY = originalKey;
      }
    }
  });

  it("sets stripe to null when STRIPE_SECRET_KEY is not set", async () => {
    const originalKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const { stripe } = await import("./client");
      expect(stripe).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        "STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.",
      );
    } finally {
      warnSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env.STRIPE_SECRET_KEY = originalKey;
      }
    }
  });

  it("logs a warning when STRIPE_SECRET_KEY is missing", async () => {
    const originalKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      await import("./client");
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("STRIPE_SECRET_KEY"),
      );
    } finally {
      warnSpy.mockRestore();
      if (originalKey !== undefined) {
        process.env.STRIPE_SECRET_KEY = originalKey;
      }
    }
  });

  it("passes the correct apiVersion", async () => {
    const originalKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";

    try {
      await import("./client");
      const config = constructorArgs[1] as Record<string, unknown>;
      expect(config.apiVersion).toBe("2026-01-28.clover");
      expect(config.typescript).toBe(true);
    } finally {
      if (originalKey === undefined) {
        delete process.env.STRIPE_SECRET_KEY;
      } else {
        process.env.STRIPE_SECRET_KEY = originalKey;
      }
    }
  });
});
