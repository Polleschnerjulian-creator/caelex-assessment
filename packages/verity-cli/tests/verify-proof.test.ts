/**
 * Tests for verify-proof command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { verifyProofCommand } from "../src/commands/verify-proof.js";
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

describe("verify-proof", () => {
  it("returns VALID (0) for a valid inclusion proof", () => {
    const code = verifyProofCommand([
      join(FIXTURES, "valid-proof.json"),
      "--platform-key",
      join(FIXTURES, "platform-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.VALID);
    expect(stdoutOutput).toContain("INCLUDED");
  });

  it("returns INVALID (1) for a tampered proof", () => {
    const code = verifyProofCommand([
      join(FIXTURES, "tampered-proof.json"),
      "--platform-key",
      join(FIXTURES, "platform-key.pub"),
    ]);
    expect(code).toBe(EXIT_CODES.INVALID);
    expect(stdoutOutput).toContain("NOT INCLUDED");
  });

  it("returns MISSING_KEY (6) when --platform-key is omitted", () => {
    const code = verifyProofCommand([join(FIXTURES, "valid-proof.json")]);
    expect(code).toBe(EXIT_CODES.MISSING_KEY);
    expect(stderrOutput).toContain("--platform-key is required");
  });

  it("outputs valid JSON when --json flag is used", () => {
    const code = verifyProofCommand([
      join(FIXTURES, "valid-proof.json"),
      "--platform-key",
      join(FIXTURES, "platform-key.pub"),
      "--json",
    ]);
    expect(code).toBe(EXIT_CODES.VALID);
    const parsed = JSON.parse(stdoutOutput.trim());
    expect(parsed).toHaveProperty("included", true);
    expect(parsed).toHaveProperty("checks");
  });
});
