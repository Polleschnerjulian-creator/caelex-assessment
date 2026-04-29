/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Astra-Bridge tests — focus on PII-filter correctness so that the
 * cross-pillar bridge cannot leak operator identifiers to Atlas.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/atlas/anthropic-client", () => ({
  buildAnthropicClient: () => null, // tests don't need real anthropic
}));

beforeAll(() => {
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY ||
    "test-encryption-key-for-unit-tests-deterministic-32chars";
});

import { consultAtlasLegalOpinion } from "@/lib/pharos/astra-bridge";

describe("consultAtlasLegalOpinion — PII filter", () => {
  it("rejects queries containing cuid-style identifiers", async () => {
    const r = await consultAtlasLegalOpinion({
      question:
        "Wie ist Art. 21 NIS2 für den Operator caaaaaaaaaaaaaaaaaaaaaaaa auszulegen?",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/personenbezogen|Identifier/i);
  });

  it("rejects queries containing email addresses", async () => {
    const r = await consultAtlasLegalOpinion({
      question:
        "Wir haben einen Fall mit operator@example.com — wie ist Art. 21 NIS2 auszulegen?",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/personenbezogen/i);
  });

  it("rejects queries that explicitly mention oversight-id", async () => {
    const r = await consultAtlasLegalOpinion({
      question: "oversight-id: ov-123, was sagt Art. 21 NIS2?",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects queries that explicitly mention operator-id", async () => {
    const r = await consultAtlasLegalOpinion({
      question: "Wie ist Art. 21 für operator-id 12345 zu interpretieren?",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects queries that exceed max length", async () => {
    const long = "Wie ist Art. 21 NIS2 auszulegen? ".repeat(50);
    const r = await consultAtlasLegalOpinion({ question: long });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/zu lang/);
  });

  it("returns ok=false but no PII-error for clean queries when client is unavailable", async () => {
    const r = await consultAtlasLegalOpinion({
      question:
        "Wie ist Art. 21 Abs. 2 lit. d NIS2 für Down-Stream-Operatoren generell auszulegen?",
    });
    // No PII detected — error comes from client unavailability
    expect(r.ok).toBe(false);
    expect(r.error).not.toMatch(/personenbezogen/i);
    expect(r.queryHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("queryHash is stable for identical inputs", async () => {
    const a = await consultAtlasLegalOpinion({
      question:
        "Wie ist Art. 21 Abs. 2 lit. d NIS2 für Down-Stream auszulegen?",
      jurisdiction: "EU",
      instrument: "NIS2",
    });
    const b = await consultAtlasLegalOpinion({
      question:
        "Wie ist Art. 21 Abs. 2 lit. d NIS2 für Down-Stream auszulegen?",
      jurisdiction: "EU",
      instrument: "NIS2",
    });
    expect(a.queryHash).toBe(b.queryHash);
  });

  it("queryHash differs when jurisdiction changes", async () => {
    const a = await consultAtlasLegalOpinion({
      question: "Wie ist Art. 21 Abs. 2 lit. d NIS2 auszulegen?",
      jurisdiction: "EU",
    });
    const b = await consultAtlasLegalOpinion({
      question: "Wie ist Art. 21 Abs. 2 lit. d NIS2 auszulegen?",
      jurisdiction: "DE",
    });
    expect(a.queryHash).not.toBe(b.queryHash);
  });
});
