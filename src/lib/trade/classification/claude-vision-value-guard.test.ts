/**
 * Caelex Trade — Tests for the value-level sanity guard (G7 / T-M17).
 *
 * The vision extractor whitelists attribute NAMES + types, but a
 * whitelisted name carrying an ABSURD value (a garbled or adversarial
 * datasheet OCR'd into `apertureMeters: 999999999`) could otherwise steer
 * the downstream parametric classification to a confident — and wrong —
 * below/above-threshold verdict. These tests pin the guard's two
 * guarantees:
 *
 *   1. PURE GUARD (`guardValue`): every numeric attribute has a documented
 *      physical bound; values outside it (and non-finite / unbounded
 *      numerics, empty / over-long strings) FAIL the guard with a recorded
 *      reason. In-range values + booleans pass.
 *
 *   2. FAIL-CLOSED WIRING (`extractDatasheetViaVision`): a value that fails
 *      the guard is DROPPED — it never appears in the emitted `attributes`
 *      (so it cannot flow into classification as a confident result) and
 *      the rejection reason is surfaced in `warnings`. An emitted
 *      attribute always carries `guardResult.passedSanity === true`.
 *
 * The Anthropic boundary is mocked (same pattern as
 * claude-vision-extractor.test.ts) so no model tokens are spent.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = vi.hoisted(() => ({
  lastCall: null as unknown,
  response: {
    content: [{ type: "text", text: '{"attributes":[],"warnings":[]}' }],
  } as unknown,
  returnNull: false,
  shouldThrow: null as Error | null,
}));

vi.mock("@/lib/atlas/anthropic-client", () => ({
  buildAnthropicClient: () => {
    if (mockState.returnNull) return null;
    return {
      mode: "direct" as const,
      model: "claude-sonnet-4-6",
      client: {
        messages: {
          create: vi.fn(async (args: unknown) => {
            mockState.lastCall = args;
            if (mockState.shouldThrow) throw mockState.shouldThrow;
            return mockState.response;
          }),
        },
      },
    };
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import {
  extractDatasheetViaVision,
  guardValue,
} from "./claude-vision-extractor.server";
import { _clearVisionCache } from "./vision-cache";

// ─── Helpers ──────────────────────────────────────────────────────────

function stubResponse(text: string): void {
  mockState.response = { content: [{ type: "text", text }] };
}

let pdfCounter = 0;
/** Unique PDF bytes per call so the content-hash cache never serves a
 *  stale result between assertions. */
function freshPdf(): Buffer {
  pdfCounter += 1;
  return Buffer.from(`%PDF-1.4\nvalue-guard-test-${pdfCounter}`);
}

beforeEach(() => {
  _clearVisionCache();
  mockState.lastCall = null;
  mockState.returnNull = false;
  mockState.shouldThrow = null;
  stubResponse('{"attributes":[],"warnings":[]}');
});

// ─── Pure guard: numbers ──────────────────────────────────────────────

describe("guardValue — numeric bounds", () => {
  it("passes a plausible aperture", () => {
    expect(guardValue("apertureMeters", 0.5).passedSanity).toBe(true);
  });

  it("rejects an absurdly large aperture (injection-grade outlier)", () => {
    const r = guardValue("apertureMeters", 999_999_999);
    expect(r.passedSanity).toBe(false);
    expect(r.whyRejected).toBeTruthy();
    expect(r.whyRejected).toContain("apertureMeters");
  });

  it("rejects a zero magnitude (exclusive lower bound)", () => {
    // 0 metres aperture is physically meaningless — must fail closed.
    expect(guardValue("apertureMeters", 0).passedSanity).toBe(false);
  });

  it("rejects a negative magnitude", () => {
    expect(guardValue("payloadKg", -5).passedSanity).toBe(false);
  });

  it("rejects NaN", () => {
    expect(guardValue("frequencyGhz", Number.NaN).passedSanity).toBe(false);
  });

  it("rejects +Infinity", () => {
    const r = guardValue("frequencyGhz", Number.POSITIVE_INFINITY);
    expect(r.passedSanity).toBe(false);
  });

  it("accepts a value exactly at the inclusive upper bound", () => {
    // frequencyGhz max is 1000 (inclusive).
    expect(guardValue("frequencyGhz", 1000).passedSanity).toBe(true);
  });

  it("rejects a value just above the inclusive upper bound", () => {
    expect(guardValue("frequencyGhz", 1000.0001).passedSanity).toBe(false);
  });

  it("treats SEU rate as a small fraction — rejects an out-of-range rate", () => {
    expect(guardValue("seuRateErrorsPerBitDay", 1e-7).passedSanity).toBe(true);
    expect(guardValue("seuRateErrorsPerBitDay", 5).passedSanity).toBe(false);
  });

  it("fails closed for a numeric attribute with no documented bound", () => {
    // `IspSeconds` IS bounded; pick an attribute that is numeric in the
    // matcher vocabulary but not in NUMERIC_BOUNDS to prove the
    // fail-closed default. `starTrackerAccuracyArcsec` is a valid
    // AttributeName with no bound entry.
    const r = guardValue(
      "starTrackerAccuracyArcsec" as Parameters<typeof guardValue>[0],
      5,
    );
    expect(r.passedSanity).toBe(false);
    expect(r.whyRejected).toContain("Plausibilitätsbereich");
  });
});

// ─── Pure guard: booleans + strings ───────────────────────────────────

describe("guardValue — booleans and strings", () => {
  it("always passes a boolean (no magnitude to inject)", () => {
    expect(guardValue("isRadHardened", true).passedSanity).toBe(true);
    expect(guardValue("isMilSpec", false).passedSanity).toBe(true);
  });

  it("passes a normal itemClass string", () => {
    expect(
      guardValue("itemClass", "spacecraft.remote_sensing.sar").passedSanity,
    ).toBe(true);
  });

  it("rejects an empty / whitespace-only string", () => {
    expect(guardValue("itemClass", "   ").passedSanity).toBe(false);
  });

  it("rejects an over-long string (injected wall of text)", () => {
    const huge = "x".repeat(5000);
    const r = guardValue("itemClass", huge);
    expect(r.passedSanity).toBe(false);
    expect(r.whyRejected).toContain("zu lang");
  });
});

// ─── Fail-closed wiring through the extractor ─────────────────────────

describe("extractDatasheetViaVision — value guard drops implausible values", () => {
  it("drops an out-of-range numeric attribute and records WHY", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "apertureMeters",
            value: 999_999_999,
            confidence: "high",
            reasoning: "Injected via garbled table",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(freshPdf());
    expect(res.ok).toBe(true);
    if (res.ok) {
      // FAIL-CLOSED: the implausible value never becomes a populated
      // attribute, so the matcher treats apertureMeters as UNKNOWN.
      expect(res.attributes).toHaveLength(0);
      expect(res.attributes.some((a) => a.attribute === "apertureMeters")).toBe(
        false,
      );
      // The reason is surfaced for the operator.
      expect(res.warnings.some((w) => w.includes("apertureMeters"))).toBe(true);
    }
  });

  it("keeps the plausible attribute and drops only the implausible one", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "apertureMeters",
            value: 0.5,
            confidence: "high",
            reasoning: "Spec table row 2",
          },
          {
            name: "payloadKg",
            value: 1e30,
            confidence: "high",
            reasoning: "Garbled mass cell",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(freshPdf());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attributes).toHaveLength(1);
      expect(res.attributes[0].attribute).toBe("apertureMeters");
      expect(res.warnings.some((w) => w.includes("payloadKg"))).toBe(true);
    }
  });

  it("emits guardResult.passedSanity === true on every kept attribute", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "frequencyGhz",
            value: 5.2,
            confidence: "high",
            reasoning: "RF section",
          },
          {
            name: "isRadHardened",
            value: true,
            confidence: "medium",
            reasoning: "Rad note",
          },
          {
            name: "itemClass",
            value: "propulsion.electric.hall",
            confidence: "high",
            reasoning: "Cover heading",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(freshPdf());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attributes).toHaveLength(3);
      for (const a of res.attributes) {
        expect(a.guardResult).toBeDefined();
        expect(a.guardResult.passedSanity).toBe(true);
        expect(a.guardResult.whyRejected).toBeUndefined();
      }
    }
  });

  it("does not let a later in-range duplicate replace a dropped injected value", async () => {
    // First (higher-priority) occurrence is out of range and dropped; a
    // second in-range duplicate must NOT slip back in, because the name
    // was marked seen. This stops an attacker pairing an injected value
    // with a 'recovery' value to confuse dedupe order.
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "apertureMeters",
            value: 999_999_999,
            confidence: "high",
            reasoning: "first (injected)",
          },
          {
            name: "apertureMeters",
            value: 0.4,
            confidence: "low",
            reasoning: "second (in range)",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(freshPdf());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attributes.some((a) => a.attribute === "apertureMeters")).toBe(
        false,
      );
      expect(res.warnings.some((w) => w.includes("apertureMeters"))).toBe(true);
    }
  });

  it("drops an over-long string masquerading as itemClass", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "itemClass",
            value: "a".repeat(5000),
            confidence: "high",
            reasoning: "Injected prose",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(freshPdf());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attributes).toHaveLength(0);
      expect(res.warnings.some((w) => w.includes("itemClass"))).toBe(true);
    }
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
