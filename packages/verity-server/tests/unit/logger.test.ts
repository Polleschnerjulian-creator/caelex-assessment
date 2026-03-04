/**
 * Verity 2036 -- Logger Tests
 *
 * Tests the structured JSON logger and its redaction rules from
 * src/logging/logger.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, redactObject } from "../../src/logging/logger.js";

// ---------------------------------------------------------------------------
// Capture stdout/stderr for assertion
// ---------------------------------------------------------------------------

let stdoutCapture: string[] = [];
let stderrCapture: string[] = [];

beforeEach(() => {
  stdoutCapture = [];
  stderrCapture = [];

  vi.spyOn(process.stdout, "write").mockImplementation(
    (data: string | Uint8Array): boolean => {
      stdoutCapture.push(
        typeof data === "string" ? data : Buffer.from(data).toString(),
      );
      return true;
    },
  );

  vi.spyOn(process.stderr, "write").mockImplementation(
    (data: string | Uint8Array): boolean => {
      stderrCapture.push(
        typeof data === "string" ? data : Buffer.from(data).toString(),
      );
      return true;
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Structured JSON output format
// ---------------------------------------------------------------------------

describe("structured JSON output", () => {
  it("outputs valid JSON on a single line to stdout for info level", () => {
    logger.info("test message");

    expect(stdoutCapture).toHaveLength(1);
    const line = stdoutCapture[0]!;
    expect(line.endsWith("\n")).toBe(true);

    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.service).toBe("verity-server");
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("outputs warn messages to stdout", () => {
    logger.warn("warning message");

    expect(stdoutCapture).toHaveLength(1);
    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.level).toBe("warn");
    expect(parsed.message).toBe("warning message");
  });

  it("outputs error messages to stderr", () => {
    logger.error("error message");

    expect(stderrCapture).toHaveLength(1);
    expect(stdoutCapture).toHaveLength(0);

    const parsed = JSON.parse(stderrCapture[0]!) as Record<string, unknown>;
    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("error message");
  });

  it("includes metadata fields in the output", () => {
    logger.info("request.completed", {
      request_id: "req-123",
      method: "POST",
      path: "/v1/attestations/create",
      status_code: 201,
    });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.request_id).toBe("req-123");
    expect(parsed.method).toBe("POST");
    expect(parsed.path).toBe("/v1/attestations/create");
    expect(parsed.status_code).toBe(201);
  });

  it("includes ISO-8601 timestamp", () => {
    logger.info("test");

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    const ts = parsed.timestamp as string;
    // Should be a valid ISO date
    expect(new Date(ts).toISOString()).toBe(ts);
  });
});

// ---------------------------------------------------------------------------
// Redaction of sensitive fields
// ---------------------------------------------------------------------------

describe("redaction of sensitive fields", () => {
  it("redacts private_key field", () => {
    logger.info("key loaded", {
      private_key: "deadbeefcafebabe1234567890abcdef",
    });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.private_key).toBe("[REDACTED]");
  });

  it("redacts api_key field", () => {
    logger.info("auth check", {
      api_key: "vty2_secretkeymaterial123456789",
    });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.api_key).toBe("[REDACTED]");
  });

  it("redacts blinding_factor field", () => {
    logger.info("commitment", {
      blinding_factor: "aabbccddeeff0011223344556677889900",
    });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.blinding_factor).toBe("[REDACTED]");
  });

  it("redacts encrypted_private_key field", () => {
    logger.info("key stored", {
      encrypted_private_key: "base64encrypteddata==",
    });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.encrypted_private_key).toBe("[REDACTED]");
  });

  it("redacts actual_value field", () => {
    logger.info("measurement", {
      actual_value: "42.7",
    });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.actual_value).toBe("[REDACTED]");
  });

  it("redacts password field", () => {
    logger.info("auth", { password: "supersecret" });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.password).toBe("[REDACTED]");
  });

  it("redacts token field", () => {
    logger.info("auth", { token: "jwt.token.here" });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.token).toBe("[REDACTED]");
  });

  it("redacts nested sensitive fields", () => {
    logger.info("nested", {
      key: {
        private_key: "secret",
        public_key: "public-value",
      },
    });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    const nested = parsed.key as Record<string, unknown>;
    expect(nested.private_key).toBe("[REDACTED]");
    expect(nested.public_key).toBe("public-value");
  });
});

// ---------------------------------------------------------------------------
// Signature truncation
// ---------------------------------------------------------------------------

describe("signature truncation", () => {
  it("truncates signature field to first 16 hex chars + ellipsis", () => {
    const fullSig = "a".repeat(128);
    logger.info("signed", { signature: fullSig });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.signature).toBe("a".repeat(16) + "...");
  });

  it("truncates operator_signature field", () => {
    const fullSig = "b".repeat(128);
    logger.info("signed", { operator_signature: fullSig });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.operator_signature).toBe("b".repeat(16) + "...");
  });

  it("truncates attester_signature field", () => {
    const fullSig = "c".repeat(128);
    logger.info("signed", { attester_signature: fullSig });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.attester_signature).toBe("c".repeat(16) + "...");
  });

  it("truncates issuer_signature field", () => {
    const fullSig = "d".repeat(128);
    logger.info("signed", { issuer_signature: fullSig });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.issuer_signature).toBe("d".repeat(16) + "...");
  });

  it("does not truncate short signatures (<= 16 chars)", () => {
    logger.info("signed", { signature: "abcdef" });

    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.signature).toBe("abcdef");
  });
});

// ---------------------------------------------------------------------------
// redactObject function (unit tests)
// ---------------------------------------------------------------------------

describe("redactObject", () => {
  it("returns null for null input", () => {
    expect(redactObject(null)).toBeNull();
  });

  it("returns undefined for undefined input", () => {
    expect(redactObject(undefined)).toBeUndefined();
  });

  it("returns primitives unchanged", () => {
    expect(redactObject(42)).toBe(42);
    expect(redactObject("hello")).toBe("hello");
    expect(redactObject(true)).toBe(true);
  });

  it("redacts sensitive fields in arrays", () => {
    const input = [
      { private_key: "secret", name: "key1" },
      { private_key: "secret2", name: "key2" },
    ];
    const result = redactObject(input) as Array<Record<string, unknown>>;
    expect(result[0]!.private_key).toBe("[REDACTED]");
    expect(result[0]!.name).toBe("key1");
    expect(result[1]!.private_key).toBe("[REDACTED]");
  });

  it("summarizes body fields", () => {
    const input = {
      body: { name: "test", count: 5, items: [1, 2, 3] },
    };
    const result = redactObject(input) as Record<string, unknown>;
    expect(typeof result.body).toBe("string");
    expect(result.body).toContain("name:string");
    expect(result.body).toContain("count:number");
    expect(result.body).toContain("items:array");
  });

  it("does not mutate the original object", () => {
    const original = { private_key: "secret", public_key: "pub" };
    const originalCopy = { ...original };
    redactObject(original);

    expect(original.private_key).toBe(originalCopy.private_key);
    expect(original.public_key).toBe(originalCopy.public_key);
  });
});

// ---------------------------------------------------------------------------
// Log levels
// ---------------------------------------------------------------------------

describe("log levels", () => {
  it("info writes to stdout with level=info", () => {
    logger.info("info test");
    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.level).toBe("info");
  });

  it("warn writes to stdout with level=warn", () => {
    logger.warn("warn test");
    const parsed = JSON.parse(stdoutCapture[0]!) as Record<string, unknown>;
    expect(parsed.level).toBe("warn");
  });

  it("error writes to stderr with level=error", () => {
    logger.error("error test");
    expect(stderrCapture).toHaveLength(1);
    const parsed = JSON.parse(stderrCapture[0]!) as Record<string, unknown>;
    expect(parsed.level).toBe("error");
  });
});
