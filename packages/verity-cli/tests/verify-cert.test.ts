/**
 * Tests for verify-cert command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { verifyCertCommand } from "../src/commands/verify-cert.js";
import { EXIT_CODES } from "../src/utils/exit-codes.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

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

describe("verify-cert", () => {
  it("returns VALID (0) for a valid certificate", () => {
    const code = verifyCertCommand([
      join(FIXTURES, "valid-certificate.json"),
      "--issuer-key",
      join(FIXTURES, "issuer-key.pub"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
      "--attester-key",
      join(FIXTURES, "attester-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.VALID);
    expect(stdoutOutput).toContain("VALID");
  });

  it("returns PARTIALLY_VALID (3) for a partial certificate", () => {
    const code = verifyCertCommand([
      join(FIXTURES, "partial-certificate.json"),
      "--issuer-key",
      join(FIXTURES, "issuer-key.pub"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
      "--attester-key",
      join(FIXTURES, "attester-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.PARTIALLY_VALID);
  });

  it("returns INVALID (1) for a certificate with tampered signature", () => {
    const code = verifyCertCommand([
      join(FIXTURES, "invalid-certificate.json"),
      "--issuer-key",
      join(FIXTURES, "issuer-key.pub"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.INVALID);
  });

  it("returns EXPIRED (2) for an expired certificate", () => {
    const code = verifyCertCommand([
      join(FIXTURES, "expired-certificate.json"),
      "--issuer-key",
      join(FIXTURES, "issuer-key.pub"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
      "--attester-key",
      join(FIXTURES, "attester-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.EXPIRED);
  });

  it("returns MISSING_KEY (6) when --issuer-key is omitted", () => {
    const code = verifyCertCommand([
      join(FIXTURES, "valid-certificate.json"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.MISSING_KEY);
    expect(stderrOutput).toContain("--issuer-key is required");
  });

  it("returns MISSING_KEY (6) when --operator-key is omitted", () => {
    const code = verifyCertCommand([
      join(FIXTURES, "valid-certificate.json"),
      "--issuer-key",
      join(FIXTURES, "issuer-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.MISSING_KEY);
    expect(stderrOutput).toContain("--operator-key is required");
  });

  it("outputs valid JSON when --json flag is used", () => {
    const code = verifyCertCommand([
      join(FIXTURES, "valid-certificate.json"),
      "--issuer-key",
      join(FIXTURES, "issuer-key.pub"),
      "--operator-key",
      join(FIXTURES, "operator-key.pub"),
      "--attester-key",
      join(FIXTURES, "attester-key.pub"),
      "--json",
    ]);
    expect(code).toBe(EXIT_CODES.VALID);
    const parsed = JSON.parse(stdoutOutput.trim());
    expect(parsed).toHaveProperty("valid", true);
    expect(parsed).toHaveProperty("status", "VALID");
  });
});
