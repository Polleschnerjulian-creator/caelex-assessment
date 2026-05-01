/**
 * Cross-Verifier — merge logic + adapter-orchestration tests.
 *
 * Two layers of testing here:
 *
 *   1. `mergeFields()` — pure function tests. No adapters, no DB. We pass
 *      hand-crafted AdapterResult arrays and assert the merge output:
 *        - single-adapter case → that adapter wins
 *        - multi-adapter agreement → agreementCount > 1
 *        - multi-adapter conflict → highest-priority adapter wins,
 *          conflicts list contains the others
 *
 *   2. `runAutoDetection()` — orchestration. We inject fake adapters and a
 *      mocked `bulkSetVerifiedFields` to assert the cross-verifier:
 *        - skips adapters that return canDetect:false
 *        - converts adapter throw → ok:false outcome (resilient)
 *        - persists merged fields with tier T2_SOURCE_VERIFIED
 *        - honours `persist: false` for dry-run
 *        - works with concurrent + sequential modes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBulkSet } = vi.hoisted(() => ({
  mockBulkSet: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("../profile.server", () => ({
  bulkSetVerifiedFields: mockBulkSet,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { mergeFields, runAutoDetection } from "./cross-verifier.server";
import type {
  AdapterInput,
  AdapterResult,
  AutoDetectionAdapter,
  SourceKey,
} from "./types";

const ORG_ID = "org_test_xv";

beforeEach(() => {
  vi.clearAllMocks();
  mockBulkSet.mockResolvedValue([]);
});

// ─── mergeFields — pure function ───────────────────────────────────────────

describe("mergeFields", () => {
  it("returns empty array when no results contributed any fields", () => {
    const merged = mergeFields([
      makeResult("vies-eu-vat", []),
      makeResult("handelsregister-de", []),
    ]);
    expect(merged).toEqual([]);
  });

  it("single-adapter contribution wins by default", () => {
    const merged = mergeFields([
      makeResult("vies-eu-vat", [
        { fieldName: "establishment", value: "DE", confidence: 0.98 },
      ]),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].fieldName).toBe("establishment");
    expect(merged[0].chosenValue).toBe("DE");
    expect(merged[0].chosenSource).toBe("vies-eu-vat");
    expect(merged[0].agreementCount).toBe(1);
    expect(merged[0].conflicts).toEqual([]);
  });

  it("agreement across two adapters bumps agreementCount", () => {
    const merged = mergeFields([
      makeResult("vies-eu-vat", [
        { fieldName: "establishment", value: "DE", confidence: 0.98 },
      ]),
      makeResult("handelsregister-de", [
        { fieldName: "establishment", value: "DE", confidence: 0.95 },
      ]),
    ]);
    expect(merged[0].agreementCount).toBe(2);
    expect(merged[0].conflicts).toEqual([]);
    expect(merged[0].contributingAdapters).toContain("vies-eu-vat");
    expect(merged[0].contributingAdapters).toContain("handelsregister-de");
  });

  it("conflict: registry-priority winner, others move to conflicts list", () => {
    const merged = mergeFields([
      makeResult("vies-eu-vat", [
        { fieldName: "establishment", value: "DE", confidence: 0.98 },
      ]),
      makeResult("handelsregister-de", [
        { fieldName: "establishment", value: "AT", confidence: 0.7 },
      ]),
    ]);
    expect(merged[0].chosenSource).toBe("vies-eu-vat"); // listed first in ADAPTERS
    expect(merged[0].chosenValue).toBe("DE");
    expect(merged[0].conflicts).toHaveLength(1);
    expect(merged[0].conflicts[0]).toEqual({
      source: "handelsregister-de",
      conflictingValue: "AT",
    });
  });

  it("counting beats priority — 2-vote loser does not win against 1-vote priority", () => {
    // Two lower-priority sources agree on AT, vies (high priority) says DE
    const merged = mergeFields([
      makeResult("vies-eu-vat", [
        { fieldName: "establishment", value: "DE", confidence: 0.98 },
      ]),
      makeResult("handelsregister-de", [
        { fieldName: "establishment", value: "AT", confidence: 0.9 },
      ]),
      makeResult("opencorporates", [
        { fieldName: "establishment", value: "AT", confidence: 0.85 },
      ]),
    ]);
    // 2 votes (AT) > 1 vote (DE) — count wins over priority
    expect(merged[0].chosenValue).toBe("AT");
    expect(merged[0].agreementCount).toBe(2);
    expect(merged[0].conflicts.map((c) => c.conflictingValue)).toContain("DE");
  });

  it("merges multiple fields independently", () => {
    const merged = mergeFields([
      makeResult("vies-eu-vat", [
        { fieldName: "establishment", value: "DE", confidence: 0.98 },
        {
          fieldName: "operatorType",
          value: "satellite_operator",
          confidence: 0.7,
        },
      ]),
    ]);
    expect(merged).toHaveLength(2);
    const byField = new Map(merged.map((m) => [m.fieldName, m]));
    expect(byField.get("establishment")!.chosenValue).toBe("DE");
    expect(byField.get("operatorType")!.chosenValue).toBe("satellite_operator");
  });
});

// ─── runAutoDetection — orchestration ──────────────────────────────────────

describe("runAutoDetection", () => {
  it("returns empty result if no adapters can detect", async () => {
    const adapter = makeFakeAdapter("vies-eu-vat", () => false);
    const result = await runAutoDetection(
      { organizationId: ORG_ID },
      { adapters: [adapter] },
    );
    expect(result.successfulOutcomes).toEqual([]);
    expect(result.mergedFields).toEqual([]);
    expect(mockBulkSet).not.toHaveBeenCalled();
  });

  it("calls bulkSetVerifiedFields with T2_SOURCE_VERIFIED for merged fields", async () => {
    const adapter = makeFakeAdapter(
      "vies-eu-vat",
      () => true,
      async () => ({
        ok: true,
        result: makeResult("vies-eu-vat", [
          { fieldName: "establishment", value: "DE", confidence: 0.98 },
        ]),
      }),
    );

    await runAutoDetection({ organizationId: ORG_ID }, { adapters: [adapter] });

    expect(mockBulkSet).toHaveBeenCalledTimes(1);
    const [orgId, fields] = mockBulkSet.mock.calls[0];
    expect(orgId).toBe(ORG_ID);
    expect(fields).toHaveLength(1);
    expect(fields[0].fieldName).toBe("establishment");
    expect(fields[0].value).toBe("DE");
    expect(fields[0].tier).toBe("T2_SOURCE_VERIFIED");
    expect(fields[0].origin).toBe("source-backed");
  });

  it("skips persistence when persist:false (dry-run)", async () => {
    const adapter = makeFakeAdapter(
      "vies-eu-vat",
      () => true,
      async () => ({
        ok: true,
        result: makeResult("vies-eu-vat", [
          { fieldName: "establishment", value: "DE", confidence: 0.98 },
        ]),
      }),
    );
    const result = await runAutoDetection(
      { organizationId: ORG_ID },
      { adapters: [adapter], persist: false },
    );
    expect(result.mergedFields).toHaveLength(1);
    expect(mockBulkSet).not.toHaveBeenCalled();
  });

  it("converts adapter throw into ok:false outcome (resilient)", async () => {
    const adapter = makeFakeAdapter(
      "vies-eu-vat",
      () => true,
      async () => {
        throw new Error("adapter exploded");
      },
    );
    const result = await runAutoDetection(
      { organizationId: ORG_ID },
      { adapters: [adapter] },
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].errorKind).toBe("remote-error");
    expect(result.successfulOutcomes).toEqual([]);
  });

  it("collects results from concurrent adapters", async () => {
    const a = makeFakeAdapter(
      "vies-eu-vat",
      () => true,
      async () => ({
        ok: true,
        result: makeResult("vies-eu-vat", [
          { fieldName: "establishment", value: "DE", confidence: 0.98 },
        ]),
      }),
    );
    const b = makeFakeAdapter(
      "handelsregister-de",
      () => true,
      async () => ({
        ok: true,
        result: makeResult("handelsregister-de", [
          {
            fieldName: "operatorType",
            value: "satellite_operator",
            confidence: 0.85,
          },
        ]),
      }),
    );
    const result = await runAutoDetection(
      { organizationId: ORG_ID },
      { adapters: [a, b] },
    );
    expect(result.successfulOutcomes).toHaveLength(2);
    expect(result.mergedFields).toHaveLength(2);
  });

  it("respects sequential mode for deterministic ordering", async () => {
    const order: string[] = [];
    const a = makeFakeAdapter(
      "vies-eu-vat",
      () => true,
      async () => {
        order.push("a");
        return {
          ok: true,
          result: makeResult("vies-eu-vat", []),
        };
      },
    );
    const b = makeFakeAdapter(
      "handelsregister-de",
      () => true,
      async () => {
        order.push("b");
        return {
          ok: true,
          result: makeResult("handelsregister-de", []),
        };
      },
    );
    await runAutoDetection(
      { organizationId: ORG_ID },
      { adapters: [a, b], concurrent: false },
    );
    expect(order).toEqual(["a", "b"]);
  });
});

// ─── helpers ───────────────────────────────────────────────────────────────

function makeResult(
  source: SourceKey,
  fields: Array<{
    fieldName: string;
    value: unknown;
    confidence: number;
  }>,
): AdapterResult {
  return {
    source,
    fetchedAt: new Date(),
    sourceUrl: `https://test.example/${source}`,
    rawArtifact: { source },
    attestation: {
      kind: "public-source",
      source: "other",
      sourceUrl: `https://test.example/${source}`,
      fetchedAt: new Date().toISOString(),
    },
    fields: fields.map((f) => ({
      fieldName: f.fieldName as never,
      value: f.value,
      confidence: f.confidence,
    })),
    warnings: [],
  };
}

function makeFakeAdapter(
  source: SourceKey,
  canDetect: (i: AdapterInput) => boolean,
  detect?: (
    i: AdapterInput,
  ) => Promise<
    ReturnType<AutoDetectionAdapter["detect"]> extends Promise<infer T>
      ? T
      : never
  >,
): AutoDetectionAdapter {
  return {
    source,
    displayName: source,
    canDetect,
    detect:
      detect ?? (async () => ({ ok: true, result: makeResult(source, []) })),
  };
}
