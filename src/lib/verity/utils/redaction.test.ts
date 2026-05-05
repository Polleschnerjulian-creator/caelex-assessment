/**
 * Tests for the safe-log + redact helpers. The redaction guard is the
 * primary defence against `actual_value` ever reaching server logs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

import { redact, safeLog } from "./redaction";
import { logger } from "@/lib/logger";

describe("redact", () => {
  it("redacts top-level sensitive fields", () => {
    expect(
      redact({
        actual_value: 95.5,
        regulation_ref: "eu_art_70",
      }),
    ).toEqual({
      actual_value: "[REDACTED]",
      regulation_ref: "eu_art_70",
    });
  });

  it("redacts nested objects recursively", () => {
    expect(
      redact({
        evidence: {
          actual_value: 12.3,
          source: "sentinel",
          nested: { blinding_factor: "deadbeef" },
        },
      }),
    ).toEqual({
      evidence: {
        actual_value: "[REDACTED]",
        source: "sentinel",
        nested: { blinding_factor: "[REDACTED]" },
      },
    });
  });

  it("redacts inside arrays of objects", () => {
    expect(
      redact({
        readings: [
          { actual_value: 1, ts: "a" },
          { actual_value: 2, ts: "b" },
        ],
      }),
    ).toEqual({
      readings: [
        { actual_value: "[REDACTED]", ts: "a" },
        { actual_value: "[REDACTED]", ts: "b" },
      ],
    });
  });

  it("preserves arrays of primitives untouched", () => {
    expect(redact({ tags: ["a", "b", 42] })).toEqual({
      tags: ["a", "b", 42],
    });
  });

  it("redacts case-insensitively (substring match including underscores)", () => {
    // Substring matching is exact-character: REDACTED_FIELDS contains
    // "SENTINEL_TOKEN" with underscore, so a key without it
    // (e.g. camelCase "sentinelToken") would NOT match. The known
    // redacted keys ARE in snake_case form.
    expect(
      redact({
        operatorPassword: "x",
        SENTINEL_TOKEN: "y",
        VERITY_MASTER_KEY: "z",
      }),
    ).toEqual({
      operatorPassword: "[REDACTED]",
      SENTINEL_TOKEN: "[REDACTED]",
      VERITY_MASTER_KEY: "[REDACTED]",
    });
  });

  it("[KNOWN GAP] camelCase variants of snake_case redacted fields are NOT caught", () => {
    // The substring check is character-exact; underscores in the
    // redaction list do not match camelCase. This documents the
    // limitation — Verity callers should use the snake_case forms
    // (`sentinel_token`, `verity_master_key`) so the guard fires.
    expect(redact({ sentinelToken: "leak" })).toEqual({
      sentinelToken: "leak",
    });
  });

  it("does not touch non-matching keys", () => {
    expect(redact({ regulation: "ok", trustLevel: "HIGH" })).toEqual({
      regulation: "ok",
      trustLevel: "HIGH",
    });
  });
});

describe("safeLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls logger.info with the [Verity] prefix and redacted data", () => {
    safeLog("test event", { actual_value: 42, regulation_ref: "x" });
    expect(logger.info).toHaveBeenCalledWith("[Verity] test event", {
      actual_value: "[REDACTED]",
      regulation_ref: "x",
    });
  });

  it("logs without data when none supplied", () => {
    safeLog("plain message");
    expect(logger.info).toHaveBeenCalledWith("[Verity] plain message");
  });
});
