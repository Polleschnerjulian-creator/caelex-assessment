/**
 * Caelex Trade — Tests for claude-vision-extractor.server.ts (M1-1A).
 *
 * Mocks the Anthropic boundary (buildAnthropicClient) so we can assert
 * the post-Claude logic — JSON cleanup, attribute whitelist filtering,
 * type coercion (German number format, boolean string parsing), confidence
 * normalisation, dedupe, and error handling — without burning model
 * tokens.
 *
 * Real PDF extraction accuracy is an integration-test concern (10 sample
 * datasheets per the M1-1A acceptance criteria).
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
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { extractDatasheetViaVision } from "./claude-vision-extractor.server";
import { _clearVisionCache } from "./vision-cache";

// ─── Helpers ──────────────────────────────────────────────────────────

function stubResponse(text: string): void {
  mockState.response = { content: [{ type: "text", text }] };
}

const FAKE_PDF = Buffer.from("%PDF-1.4\nfake datasheet bytes");

beforeEach(() => {
  // Clear the vision cache so each test starts from a fresh state —
  // otherwise FAKE_PDF (same bytes) would be served from cache and skip
  // the mock's messages.create, breaking assertions on the call count.
  _clearVisionCache();
  mockState.lastCall = null;
  mockState.returnNull = false;
  mockState.shouldThrow = null;
  stubResponse('{"attributes":[],"warnings":[]}');
});

// ─── No-config short-circuit ──────────────────────────────────────────

describe("extractDatasheetViaVision — client-not-configured", () => {
  it("returns ok:false when Anthropic key missing", async () => {
    mockState.returnNull = true;
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/Anthropic client not configured/);
    }
  });
});

// ─── Happy path + shape ───────────────────────────────────────────────

describe("extractDatasheetViaVision — happy path", () => {
  it("returns empty attribute list when Claude finds nothing", async () => {
    stubResponse('{"attributes":[],"warnings":[]}');
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attributes).toEqual([]);
      expect(res.warnings).toEqual([]);
      expect(res.modelUsed).toBe("claude-sonnet-4-6");
      expect(typeof res.latencyMs).toBe("number");
    }
  });

  it("returns extracted attributes with confidence + reasoning", async () => {
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
            name: "gsdMeters",
            value: 0.3,
            confidence: "medium",
            reasoning: "Page 1 prose",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attributes).toHaveLength(2);
      expect(res.attributes[0]).toMatchObject({
        attribute: "apertureMeters",
        value: 0.5,
        confidence: "high",
      });
      expect(res.attributes[1].confidence).toBe("medium");
    }
  });
});

// ─── JSON cleanup ─────────────────────────────────────────────────────

describe("extractDatasheetViaVision — JSON cleanup", () => {
  it("strips ```json markdown fences", async () => {
    stubResponse(
      "```json\n" +
        JSON.stringify({
          attributes: [
            {
              name: "frequencyGhz",
              value: 5.2,
              confidence: "high",
              reasoning: "",
            },
          ],
          warnings: [],
        }) +
        "\n```",
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attributes[0].attribute).toBe("frequencyGhz");
  });

  it("strips plain ``` fences without language tag", async () => {
    stubResponse("```\n" + '{"attributes": [], "warnings": []}' + "\n```");
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
  });

  it("recovers JSON with leading prose", async () => {
    stubResponse('Here is the extraction:\n{"attributes": [], "warnings": []}');
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
  });

  it("returns ok:false on malformed JSON", async () => {
    stubResponse("This is not JSON.");
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(false);
  });
});

// ─── Attribute-name whitelist ─────────────────────────────────────────

describe("extractDatasheetViaVision — attribute whitelist", () => {
  it("filters out unknown attribute names and warns", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "apertureMeters",
            value: 0.5,
            confidence: "high",
            reasoning: "x",
          },
          {
            name: "invented_field",
            value: 42,
            confidence: "high",
            reasoning: "y",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attributes).toHaveLength(1);
      expect(res.attributes[0].attribute).toBe("apertureMeters");
      expect(res.warnings.some((w) => w.includes("invented_field"))).toBe(true);
    }
  });

  it("dedupes — first occurrence wins when Claude returns the same attribute twice", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "apertureMeters",
            value: 0.5,
            confidence: "high",
            reasoning: "first",
          },
          {
            name: "apertureMeters",
            value: 0.7,
            confidence: "low",
            reasoning: "second",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attributes).toHaveLength(1);
      expect(res.attributes[0].value).toBe(0.5);
      expect(res.attributes[0].reasoning).toBe("first");
    }
  });
});

// ─── Value coercion ───────────────────────────────────────────────────

describe("extractDatasheetViaVision — value coercion", () => {
  it("accepts numbers directly", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          { name: "payloadKg", value: 500, confidence: "high", reasoning: "" },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attributes[0].value).toBe(500);
  });

  it("coerces numeric strings (US format)", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "payloadKg",
            value: "500.25",
            confidence: "high",
            reasoning: "",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attributes[0].value).toBe(500.25);
  });

  it("coerces German number format", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "payloadKg",
            value: "1.234,56",
            confidence: "high",
            reasoning: "",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attributes[0].value).toBe(1234.56);
  });

  it("drops a numeric attribute whose value is non-numeric and warns", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "payloadKg",
            value: "not a number",
            confidence: "high",
            reasoning: "",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attributes).toHaveLength(0);
      expect(res.warnings.some((w) => w.includes("payloadKg"))).toBe(true);
    }
  });

  it("accepts boolean true/false directly", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "isRadHardened",
            value: true,
            confidence: "high",
            reasoning: "",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attributes[0].value).toBe(true);
  });

  it('coerces "true"/"false" string to boolean', async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "isMilSpec",
            value: "true",
            confidence: "high",
            reasoning: "",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attributes[0].value).toBe(true);
  });

  it('coerces German "ja"/"nein" to boolean', async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "isAntiJam",
            value: "ja",
            confidence: "medium",
            reasoning: "",
          },
          {
            name: "isMilSpec",
            value: "nein",
            confidence: "low",
            reasoning: "",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attributes[0].value).toBe(true);
      expect(res.attributes[1].value).toBe(false);
    }
  });

  it("accepts string for itemClass", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "itemClass",
            value: "spacecraft.remote_sensing.sar",
            confidence: "high",
            reasoning: "Cover-page heading",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok)
      expect(res.attributes[0].value).toBe("spacecraft.remote_sensing.sar");
  });

  it("drops a string attribute whose value is a number", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          { name: "itemClass", value: 42, confidence: "high", reasoning: "" },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attributes).toHaveLength(0);
  });
});

// ─── Confidence normalisation ─────────────────────────────────────────

describe("extractDatasheetViaVision — confidence normalisation", () => {
  it.each(["high", "medium", "low"])(
    "preserves valid confidence %s",
    async (level) => {
      stubResponse(
        JSON.stringify({
          attributes: [
            {
              name: "frequencyGhz",
              value: 1.5,
              confidence: level,
              reasoning: "",
            },
          ],
          warnings: [],
        }),
      );
      const res = await extractDatasheetViaVision(FAKE_PDF);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.attributes[0].confidence).toBe(level);
    },
  );

  it('defaults invalid confidence to "low"', async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "frequencyGhz",
            value: 1.5,
            confidence: "vague",
            reasoning: "",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attributes[0].confidence).toBe("low");
  });

  it('defaults missing confidence to "low"', async () => {
    stubResponse(
      JSON.stringify({
        attributes: [{ name: "frequencyGhz", value: 1.5, reasoning: "x" }],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attributes[0].confidence).toBe("low");
  });

  it("backfills empty reasoning with a default string", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [
          {
            name: "frequencyGhz",
            value: 1.5,
            confidence: "high",
            reasoning: "",
          },
        ],
        warnings: [],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attributes[0].reasoning.length).toBeGreaterThan(0);
  });
});

// ─── Warnings pass-through ────────────────────────────────────────────

describe("extractDatasheetViaVision — warnings", () => {
  it("preserves Claude warnings", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [],
        warnings: [
          "Datasheet appears to be a scanned PDF — accuracy may be reduced.",
        ],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.warnings).toContain(
        "Datasheet appears to be a scanned PDF — accuracy may be reduced.",
      );
    }
  });

  it("ignores non-string entries in warnings array", async () => {
    stubResponse(
      JSON.stringify({
        attributes: [],
        warnings: ["valid warning", 42, null, "another valid"],
      }),
    );
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.warnings).toEqual(["valid warning", "another valid"]);
    }
  });
});

// ─── Error handling ───────────────────────────────────────────────────

describe("extractDatasheetViaVision — error handling", () => {
  it("returns ok:false when messages.create throws", async () => {
    mockState.shouldThrow = new Error("Quota exceeded");
    const res = await extractDatasheetViaVision(FAKE_PDF);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Quota exceeded/);
  });
});

// ─── Anthropic request shape ──────────────────────────────────────────

describe("extractDatasheetViaVision — request shape", () => {
  it("sends the PDF as a base64 document block", async () => {
    stubResponse('{"attributes":[],"warnings":[]}');
    await extractDatasheetViaVision(FAKE_PDF);
    const args = mockState.lastCall as {
      messages: Array<{
        content: Array<{
          type: string;
          source?: { type: string; media_type: string; data: string };
        }>;
      }>;
    };
    const docBlock = args.messages[0].content.find(
      (b) => b.type === "document",
    );
    expect(docBlock).toBeDefined();
    expect(docBlock?.source?.media_type).toBe("application/pdf");
    expect(Buffer.from(docBlock!.source!.data, "base64").length).toBe(
      FAKE_PDF.length,
    );
  });
});

// ─── Content-hash cache integration ──────────────────────────────────
//
// Tests that extractDatasheetViaVision uses the vision cache correctly:
//   - second call with same bytes → messages.create NOT called again
//   - call with different bytes → messages.create IS called again
//   - ok:false failures are NOT cached → second call retries
//
// Cache is cleared by the global beforeEach above (which calls _clearVisionCache).

describe("extractDatasheetViaVision — content-hash cache", () => {
  it("second call with identical bytes is served from cache — messages.create called once", async () => {
    stubResponse('{"attributes":[],"warnings":[]}');

    const BUF = Buffer.from("identical-pdf-bytes");
    const res1 = await extractDatasheetViaVision(BUF);

    // Now mutate mockState.lastCall to detect if create was called again
    mockState.lastCall = "sentinel";
    const res2 = await extractDatasheetViaVision(BUF);

    // If cache hit, messages.create was NOT called → lastCall remains "sentinel"
    expect(mockState.lastCall).toBe("sentinel");

    // Both results should be deeply equal
    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    expect(res2).toEqual(res1);
  });

  it("call with different bytes hits messages.create again", async () => {
    stubResponse('{"attributes":[],"warnings":[]}');

    const BUF_1 = Buffer.from("pdf-bytes-variant-1");
    const BUF_2 = Buffer.from("pdf-bytes-variant-2");

    await extractDatasheetViaVision(BUF_1);

    mockState.lastCall = "sentinel";
    await extractDatasheetViaVision(BUF_2);

    // Cache miss → messages.create called → lastCall is no longer "sentinel"
    expect(mockState.lastCall).not.toBe("sentinel");
  });

  it("ok:false result is NOT cached — second call retries messages.create", async () => {
    // First call: malformed JSON → ok:false
    stubResponse("NOT_JSON_AT_ALL");
    const BUF = Buffer.from("transient-error-pdf");
    const res1 = await extractDatasheetViaVision(BUF);
    expect(res1.ok).toBe(false);

    // Now fix the response
    stubResponse('{"attributes":[],"warnings":[]}');
    mockState.lastCall = "sentinel";

    const res2 = await extractDatasheetViaVision(BUF);
    // If failure was NOT cached, messages.create was called → lastCall updated
    expect(mockState.lastCall).not.toBe("sentinel");
    expect(res2.ok).toBe(true);
  });

  it("ok:false API error (throw) is NOT cached — second call retries", async () => {
    const BUF = Buffer.from("api-error-pdf");

    // First call throws → ok:false
    mockState.shouldThrow = new Error("Quota exceeded");
    const res1 = await extractDatasheetViaVision(BUF);
    expect(res1.ok).toBe(false);
    mockState.shouldThrow = null;

    // Second call should succeed and reach messages.create
    stubResponse('{"attributes":[],"warnings":[]}');
    mockState.lastCall = "sentinel";
    const res2 = await extractDatasheetViaVision(BUF);
    expect(mockState.lastCall).not.toBe("sentinel");
    expect(res2.ok).toBe(true);
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
