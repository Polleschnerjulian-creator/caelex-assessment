/**
 * Tests for show command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { showCommand } from "../src/commands/show.js";
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

describe("show", () => {
  it("shows an attestation and returns VALID (0)", () => {
    const code = showCommand([join(FIXTURES, "valid-attestation.json")]);
    expect(code).toBe(EXIT_CODES.VALID);
    expect(stdoutOutput).toContain("=== Attestation ===");
    expect(stdoutOutput).toContain("SAT-2036-ALPHA");
  });

  it("shows a certificate and returns VALID (0)", () => {
    const code = showCommand([join(FIXTURES, "valid-certificate.json")]);
    expect(code).toBe(EXIT_CODES.VALID);
    expect(stdoutOutput).toContain("=== Certificate ===");
    expect(stdoutOutput).toContain("Attestations: 3");
  });

  it("shows an inclusion proof and returns VALID (0)", () => {
    const code = showCommand([join(FIXTURES, "valid-proof.json")]);
    expect(code).toBe(EXIT_CODES.VALID);
    expect(stdoutOutput).toContain("=== Inclusion Proof ===");
    expect(stdoutOutput).toContain("entry-001");
  });

  it("returns MALFORMED_INPUT (5) for malformed JSON", () => {
    const code = showCommand([join(FIXTURES, "malformed.txt")]);
    expect(code).toBe(EXIT_CODES.MALFORMED_INPUT);
    expect(stderrOutput).toContain("invalid JSON syntax");
  });

  it("returns MALFORMED_INPUT (5) for unknown type", () => {
    const code = showCommand([join(FIXTURES, "unknown-type.json")]);
    expect(code).toBe(EXIT_CODES.MALFORMED_INPUT);
    expect(stderrOutput).toContain("could not detect type");
  });

  it("outputs JSON when --json flag is used", () => {
    const code = showCommand([
      join(FIXTURES, "valid-attestation.json"),
      "--json",
    ]);
    expect(code).toBe(EXIT_CODES.VALID);
    const parsed = JSON.parse(stdoutOutput.trim());
    expect(parsed).toHaveProperty("attestation_id");
  });
});
