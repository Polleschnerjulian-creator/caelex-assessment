/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * pharos-verify CLI E2E test
 *
 * Generates a real signed receipt with the Caelex Pharos receipt-layer,
 * writes it to a tmp file in the API-response shape, then invokes the
 * standalone CLI binary and asserts the verdict + exit code.
 *
 * This is the most important test in the suite: it proves that an
 * external party with only Node.js stdlib can verify a Pharos receipt
 * — the central trust claim of the entire Glass-Box architecture.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

beforeAll(() => {
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY ||
    "test-encryption-key-for-unit-tests-deterministic-32chars";
});

import { computeReceipt, signReceipt } from "@/lib/pharos/receipt";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI_PATH = join(
  REPO_ROOT,
  "packages",
  "pharos-verify",
  "bin",
  "pharos-verify.mjs",
);

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "pharos-cli-test-"));
});

function buildApiPayload(opts: {
  authProfId: string;
  tamper?: "answer" | "outputHash" | "signature";
}) {
  const computed = computeReceipt({
    authorityProfileId: opts.authProfId,
    oversightIds: ["ov-cli-test"],
    prompt: "test prompt",
    systemPromptHash: "h",
    modelVersion: "claude-sonnet-4-6",
    toolCallTrace: [
      {
        tool: "query_operator_compliance",
        input: { oversightId: "ov-cli-test" },
        ok: true,
      },
    ],
    citationIds: ["DB:OversightRelationship:ov-cli-test"],
    answer: "Test answer [DB:OversightRelationship:ov-cli-test]",
    abstained: false,
    previousReceiptHash: null,
  });
  const signed = signReceipt(computed, opts.authProfId);

  const payload: Record<string, unknown> = {
    version: "pharos-receipt-v1",
    entryId: "test-entry",
    oversightId: "ov-cli-test",
    receipt: { ...signed },
    chain: {
      previousHash: null,
      entryHash: "demo",
      predecessorEntryId: null,
      successorEntryId: null,
    },
    createdAt: new Date().toISOString(),
  };

  if (opts.tamper === "outputHash") {
    (payload.receipt as Record<string, string>).outputHash = "f".repeat(64);
  } else if (opts.tamper === "signature") {
    (payload.receipt as Record<string, string>).signature =
      "AAAA" + signed.signature.slice(4);
  }

  return payload;
}

function runCli(args: string[]): {
  code: number;
  stdout: string;
  stderr: string;
} {
  try {
    const stdout = execFileSync("node", [CLI_PATH, ...args], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return {
      code: e.status ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
}

describe("pharos-verify CLI — end-to-end", () => {
  it("verifies a valid receipt and returns exit code 0", () => {
    const payload = buildApiPayload({ authProfId: "auth-cli-valid" });
    const path = join(tmpDir, "valid.json");
    writeFileSync(path, JSON.stringify(payload));

    const result = runCli(["--file", path]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/VERIFIED/);
  });

  it("detects tampered outputHash and returns exit code 2", () => {
    const payload = buildApiPayload({
      authProfId: "auth-cli-tamper-output",
      tamper: "outputHash",
    });
    const path = join(tmpDir, "tampered.json");
    writeFileSync(path, JSON.stringify(payload));

    const result = runCli(["--file", path]);
    expect(result.code).toBe(2);
    expect(result.stdout).toMatch(/INVALID/);
    expect(result.stdout).toMatch(/receiptHash mismatch/);
  });

  it("detects tampered signature and returns exit code 2", () => {
    const payload = buildApiPayload({
      authProfId: "auth-cli-tamper-sig",
      tamper: "signature",
    });
    const path = join(tmpDir, "bad-sig.json");
    writeFileSync(path, JSON.stringify(payload));

    const result = runCli(["--file", path]);
    expect(result.code).toBe(2);
    expect(result.stdout).toMatch(/INVALID/);
    expect(result.stdout).toMatch(/signature INVALID/);
  });

  it("prints help when called with --help", () => {
    const result = runCli(["--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/pharos-verify/);
    expect(result.stdout).toMatch(/Algorithm/);
  });

  it("returns error code 3 on missing receipt fields", () => {
    const path = join(tmpDir, "broken.json");
    writeFileSync(path, JSON.stringify({ entryId: "x" }));

    const result = runCli(["--file", path]);
    expect(result.code).toBe(2);
    expect(result.stdout).toMatch(/INVALID|missing field/);
  });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

import { afterEach } from "vitest";
