import { describe, it, expect, vi } from "vitest";

// Mock logger before importing the module under test
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { redact, safeLog } from "@/lib/verity/utils/redaction";
import { logger } from "@/lib/logger";

describe("redact", () => {
  it("redacts actual_value", () => {
    const result = redact({ actual_value: 57.66, name: "test" });
    expect(result.actual_value).toBe("[REDACTED]");
    expect(result.name).toBe("test");
  });

  it("redacts blinding_factor", () => {
    const result = redact({ blinding_factor: "abc123" });
    expect(result.blinding_factor).toBe("[REDACTED]");
  });

  it("redacts privateKey", () => {
    const result = redact({ privateKey: "secret" });
    expect(result.privateKey).toBe("[REDACTED]");
  });

  it("redacts password", () => {
    const result = redact({ password: "secret123" });
    expect(result.password).toBe("[REDACTED]");
  });

  it("redacts nested sensitive fields", () => {
    const result = redact({
      data: { actual_value: 42, label: "test" },
    }) as Record<string, Record<string, unknown>>;
    expect(result.data.actual_value).toBe("[REDACTED]");
    expect(result.data.label).toBe("test");
  });

  it("is case-insensitive", () => {
    const result = redact({ ACTUAL_VALUE: 57.66 });
    expect(result.ACTUAL_VALUE).toBe("[REDACTED]");
  });

  it("does not redact non-sensitive fields", () => {
    const result = redact({ attestation_id: "va_123", regulation: "art70" });
    expect(result.attestation_id).toBe("va_123");
    expect(result.regulation).toBe("art70");
  });
});

describe("safeLog", () => {
  it("calls logger.info with redacted data", () => {
    safeLog("test", { actual_value: 42, id: "test" });
    expect(logger.info).toHaveBeenCalledWith(
      "[Verity] test",
      expect.objectContaining({
        actual_value: "[REDACTED]",
        id: "test",
      }),
    );
  });

  it("works without data", () => {
    safeLog("message only");
    expect(logger.info).toHaveBeenCalledWith("[Verity] message only");
  });
});
