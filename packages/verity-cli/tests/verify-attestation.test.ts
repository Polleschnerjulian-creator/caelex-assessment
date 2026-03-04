/**
 * Tests for verify-attestation command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { verifyAttestationCommand } from "../src/commands/verify-attestation.js";
import { EXIT_CODES } from "../src/utils/exit-codes.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

// Capture stdout/stderr
let stdoutOutput: string;
let stderrOutput: string;

beforeEach(() => {
  stdoutOutput = "";
  stderrOutput = "";
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdoutOutput += String(chunk);
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderrOutput += String(chunk);
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("verify-attestation", () => {
  it("returns VALID (0) for a valid attestation", () => {
    const code = verifyAttestationCommand([
      join(FIXTURES, "valid-attestation.json"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
      "--attester-key",
      join(FIXTURES, "attester-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.VALID);
    expect(stdoutOutput).toContain("VALID");
  });

  it("returns INVALID (1) for a tampered attestation", () => {
    const code = verifyAttestationCommand([
      join(FIXTURES, "invalid-attestation.json"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
      "--attester-key",
      join(FIXTURES, "attester-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.INVALID);
  });

  it("returns EXPIRED (2) for an expired attestation", () => {
    const code = verifyAttestationCommand([
      join(FIXTURES, "expired-attestation.json"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
      "--attester-key",
      join(FIXTURES, "attester-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.EXPIRED);
  });

  it("returns MISSING_KEY (6) when --operator-key is omitted", () => {
    const code = verifyAttestationCommand([
      join(FIXTURES, "valid-attestation.json"),
    ]);
    expect(code).toBe(EXIT_CODES.MISSING_KEY);
    expect(stderrOutput).toContain("--operator-key is required");
  });

  it("returns MALFORMED_INPUT (5) for a non-JSON file", () => {
    const code = verifyAttestationCommand([
      join(FIXTURES, "malformed.txt"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.MALFORMED_INPUT);
  });

  it("outputs valid JSON when --json flag is used", () => {
    const code = verifyAttestationCommand([
      join(FIXTURES, "valid-attestation.json"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
      "--attester-key",
      join(FIXTURES, "attester-key.pub"),
      "--json",
    ]);
    expect(code).toBe(EXIT_CODES.VALID);
    const parsed = JSON.parse(stdoutOutput.trim());
    expect(parsed).toHaveProperty("valid", true);
    expect(parsed).toHaveProperty("checks");
    expect(parsed).toHaveProperty("protocolVersion", 2);
  });

  it("returns MALFORMED_INPUT (5) for missing file", () => {
    const code = verifyAttestationCommand([
      join(FIXTURES, "nonexistent.json"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.MALFORMED_INPUT);
    expect(stderrOutput).toContain("File not found");
  });

  it("returns INVALID (1) for expired attestation in --strict mode", () => {
    const code = verifyAttestationCommand([
      join(FIXTURES, "expired-attestation.json"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
      "--attester-key",
      join(FIXTURES, "attester-key.pub"),
      "--strict",
    ]);
    expect(code).toBe(EXIT_CODES.INVALID);
  });
});
