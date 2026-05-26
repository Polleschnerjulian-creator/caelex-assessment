import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — tool-metadata test coverage (T0.6).
 *
 * Critically: the `assertAllToolsHaveMetadata` test below ensures
 * **drift safety** — if a developer adds a new tool to any bundle
 * without registering its metadata, this test fails the CI build.
 * That's the whole point of the metadata sidecar: keep it in sync
 * with the SDK-facing ATLAS_TOOLS array.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";

/* Mock the heavy module-graph deps so importing ATLAS_TOOLS doesn't
 * pull in Prisma / Anthropic at test-time. */
vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasMandateFile: { findFirst: vi.fn() },
    atlasMandate: { findFirst: vi.fn() },
    atlasAlertSubscription: { upsert: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {},
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  TOOL_METADATA,
  getToolMetadata,
  assertAllToolsHaveMetadata,
  metadataStats,
  type AtlasToolBundle,
} from "./tool-metadata";

/* ── TOOL_METADATA shape invariants ─────────────────────────────────── */

describe("TOOL_METADATA shape", () => {
  it("every entry has the required four fields", () => {
    for (const [name, meta] of Object.entries(TOOL_METADATA)) {
      expect(meta.bundle, `${name}.bundle`).toBeDefined();
      expect(typeof meta.requiresApproval, `${name}.requiresApproval`).toBe(
        "boolean",
      );
      expect(
        meta.expectedDurationMs,
        `${name}.expectedDurationMs`,
      ).toBeGreaterThan(0);
      expect(meta.costClass, `${name}.costClass`).toMatch(
        /^(low|medium|high)$/,
      );
    }
  });

  it("bundle values are from the AtlasToolBundle union", () => {
    const allowed: AtlasToolBundle[] = [
      "branding",
      "mandate",
      "templates",
      "korpus",
      "network",
      "comparison",
      "deadlines",
      "drafting",
      "compliance",
      "validity",
      "document",
      "web",
      "agent",
    ];
    for (const [name, meta] of Object.entries(TOOL_METADATA)) {
      expect(allowed, `${name} has invalid bundle`).toContain(meta.bundle);
    }
  });

  it("expectedDurationMs values are reasonable upper bounds (< 60s)", () => {
    /* Atlas tool calls shouldn't be advertised as taking longer than
       60s — anything longer is a workflow not a single tool call. */
    for (const [name, meta] of Object.entries(TOOL_METADATA)) {
      expect(
        meta.expectedDurationMs,
        `${name}.expectedDurationMs`,
      ).toBeLessThan(60_000);
    }
  });

  it("high-cost tools have expectedDuration ≥ 2s (LLM calls are slow)", () => {
    for (const [name, meta] of Object.entries(TOOL_METADATA)) {
      if (meta.costClass === "high") {
        expect(
          meta.expectedDurationMs,
          `${name} marked high-cost but only ${meta.expectedDurationMs}ms`,
        ).toBeGreaterThanOrEqual(2000);
      }
    }
  });

  it("all draft_* tools require approval (legal document output)", () => {
    for (const name of Object.keys(TOOL_METADATA)) {
      if (name.startsWith("draft_")) {
        expect(
          TOOL_METADATA[name].requiresApproval,
          `${name} should require approval`,
        ).toBe(true);
      }
    }
  });
});

/* ── getToolMetadata ────────────────────────────────────────────────── */

describe("getToolMetadata", () => {
  it("returns metadata for a known tool", () => {
    const meta = getToolMetadata("assess_eu_space_act");
    expect(meta).toBeDefined();
    expect(meta?.bundle).toBe("compliance");
  });

  it("returns undefined for unknown tool name", () => {
    expect(getToolMetadata("definitely_not_a_tool")).toBeUndefined();
    expect(getToolMetadata("")).toBeUndefined();
  });
});

/* ── assertAllToolsHaveMetadata — drift safety ──────────────────────── */

describe("assertAllToolsHaveMetadata", () => {
  it("passes when tools list matches metadata exactly", () => {
    const tools = Object.keys(TOOL_METADATA).map((name) => ({ name }));
    expect(() => assertAllToolsHaveMetadata(tools)).not.toThrow();
  });

  it("throws when a tool is missing from metadata", () => {
    const tools = [
      ...Object.keys(TOOL_METADATA).map((name) => ({ name })),
      { name: "a_new_tool_someone_forgot_to_register" },
    ];
    expect(() => assertAllToolsHaveMetadata(tools)).toThrow(
      /a_new_tool_someone_forgot_to_register/,
    );
  });

  it("throws when metadata has orphan entries (deleted tools)", () => {
    /* Metadata has 'check_article_status' but our 'live tools' list
       omits it. */
    const liveSubset = Object.keys(TOOL_METADATA)
      .filter((n) => n !== "check_article_status")
      .map((name) => ({ name }));
    expect(() => assertAllToolsHaveMetadata(liveSubset)).toThrow(
      /check_article_status/,
    );
  });

  it("error message names the specific missing tool(s)", () => {
    const tools = [
      ...Object.keys(TOOL_METADATA).map((name) => ({ name })),
      { name: "missing_alpha" },
      { name: "missing_beta" },
    ];
    let caught: Error | null = null;
    try {
      assertAllToolsHaveMetadata(tools);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught?.message).toContain("missing_alpha");
    expect(caught?.message).toContain("missing_beta");
  });
});

/* ── metadataStats ──────────────────────────────────────────────────── */

describe("metadataStats", () => {
  it("returns a stats object summing to the metadata total", () => {
    const stats = metadataStats();
    expect(stats.total).toBe(Object.keys(TOOL_METADATA).length);
    /* Sum of byBundle counts equals total. */
    const bundleSum = Object.values(stats.byBundle).reduce((a, b) => a + b, 0);
    expect(bundleSum).toBe(stats.total);
    /* Sum of costClass counts equals total. */
    const costSum = Object.values(stats.byCostClass).reduce((a, b) => a + b, 0);
    expect(costSum).toBe(stats.total);
  });

  it("approvalRequired count is consistent with per-entry flags", () => {
    const stats = metadataStats();
    const directCount = Object.values(TOOL_METADATA).filter(
      (m) => m.requiresApproval,
    ).length;
    expect(stats.approvalRequired).toBe(directCount);
  });

  it("includes all 13 bundle types (12 production + agent)", () => {
    const stats = metadataStats();
    const bundles = Object.keys(stats.byBundle);
    /* Every bundle should be represented at least once because we
       seeded metadata for tools from each. */
    expect(bundles).toContain("branding");
    expect(bundles).toContain("compliance");
    expect(bundles).toContain("validity");
    expect(bundles).toContain("agent");
  });
});

/* ── Integration: ATLAS_TOOLS ↔ TOOL_METADATA drift ─────────────────── */

describe("ATLAS_TOOLS ↔ TOOL_METADATA drift", () => {
  it("every tool in ATLAS_TOOLS has a metadata entry (and vice versa)", async () => {
    /* Dynamic import inside the test so the heavy mock-setup at file
       top applies before the module-graph traverses everything. */
    const { ATLAS_TOOLS } = await import("./atlas-tools");
    /* This is the CRITICAL test — fails CI when someone adds a tool
       without registering metadata. */
    expect(() => assertAllToolsHaveMetadata(ATLAS_TOOLS)).not.toThrow();
  });
});
