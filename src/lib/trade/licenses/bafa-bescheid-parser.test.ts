/**
 * Caelex Trade — Tests for bafa-bescheid-parser.server.ts (M1-1C).
 *
 * Strategy:
 *
 *   1. Mock `buildAnthropicClient` to return a fake Anthropic-SDK client
 *      whose `messages.create()` returns synthetic content. That lets us
 *      assert ALL the post-Claude logic — JSON-fence-stripping, German-
 *      number coercion, ISO-date validation, license-type whitelist,
 *      confidence-fallback derivation — without paying a single penny
 *      in real model tokens.
 *
 *   2. The heuristic pre-check (BAFA_SIGNATURE_PHRASES) runs BEFORE the
 *      Claude call, so we can test it independently with hand-crafted
 *      byte buffers — no mock needed there.
 *
 *   3. Real PDF parsing is NOT tested here. That's an integration-test
 *      concern (5 actual BAFA fixture PDFs → ≥95% field accuracy per
 *      the M1-1C acceptance criteria). Those fixtures don't exist yet
 *      and would need to be anonymised before they could live in the
 *      repo. Tracked as M1-1C follow-up.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock MUST be called before the SUT import, otherwise the real
// anthropic-client gets pulled in and the test runtime would need
// `server-only` which throws under vitest. We use vi.hoisted to make
// the mock state accessible from the test body.
const mockState = vi.hoisted(() => ({
  /** Last messages.create call args — for assertion. */
  lastCall: null as unknown,
  /** Stubbed response from messages.create. Each test overrides. */
  response: {
    content: [{ type: "text", text: "{}" }],
  } as unknown,
  /** Whether buildAnthropicClient returns null (no key configured). */
  returnNull: false,
  /** Whether messages.create should throw. */
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

// Silence logger noise in test output.
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { parseBafaBescheid } from "./bafa-bescheid-parser.server";
import type { BafaBescheidExtraction } from "./bafa-bescheid-types";

// ─── Test helpers ─────────────────────────────────────────────────────

/** Build a fake PDF byte-buffer whose plain-text region contains the
 *  given phrases. Real PDFs have binary headers, but our heuristic
 *  scans raw bytes as latin1, so plain UTF-8 ASCII is fine. */
function fakePdfWith(phrases: string[]): Buffer {
  const header = "%PDF-1.4\n%binarystub\n";
  return Buffer.from(header + phrases.join("\n"));
}

/** Stub the Anthropic response with a single text block containing the
 *  given string (typically a JSON blob). */
function stubClaudeText(text: string): void {
  mockState.response = {
    content: [{ type: "text", text }],
  };
}

/** Stub the Anthropic response with multiple content blocks. Tests
 *  the parser's text-block aggregation. */
function stubClaudeMultiBlock(
  blocks: Array<{ type: string; text?: string }>,
): void {
  mockState.response = { content: blocks };
}

/** Reset all mock state between tests. */
beforeEach(() => {
  mockState.lastCall = null;
  mockState.returnNull = false;
  mockState.shouldThrow = null;
  stubClaudeText("{}");
});

/** Minimum-viable extraction JSON for the happy-path tests. */
const MINIMAL_EXTRACTION = {
  licenseNumber: "G/2026/12345",
  licenseType: "BAFA_EINZEL",
  issuedAt: "2026-03-15",
  validUntil: "2027-03-14",
  totalCapValue: 250000,
  capCurrency: "EUR",
  coveredEccnCodes: ["9A515.a"],
  coveredCountries: ["US"],
  additionalConditions: [],
  fieldConfidence: {
    licenseNumber: "high",
    licenseType: "high",
    issuedAt: "high",
    validUntil: "high",
    totalCapValue: "high",
    capCurrency: "high",
    coveredEccnCodes: "high",
    coveredCountries: "high",
    additionalConditions: "high",
  },
  warnings: [],
};

// ─── No-config short-circuit ──────────────────────────────────────────

describe("parseBafaBescheid — client-not-configured", () => {
  it("returns ok:false when no Anthropic key is configured", async () => {
    mockState.returnNull = true;
    const pdf = fakePdfWith(["Bundesamt für Wirtschaft", "Ausfuhrgenehmigung"]);
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/Anthropic client not configured/);
    }
  });
});

// ─── Heuristic pre-check ──────────────────────────────────────────────

describe("parseBafaBescheid — heuristic pre-check", () => {
  it("rejects a PDF with no BAFA signature phrases", async () => {
    const pdf = fakePdfWith(["This is a tax return", "Some Random Text"]);
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/nicht wie ein BAFA-Bescheid/);
    }
    // Claude must NOT have been called — heuristic rejected first.
    expect(mockState.lastCall).toBeNull();
  });

  it("accepts a PDF containing 'Bundesamt für Wirtschaft'", async () => {
    stubClaudeText(JSON.stringify(MINIMAL_EXTRACTION));
    const pdf = fakePdfWith(["Bundesamt für Wirtschaft und Ausfuhrkontrolle"]);
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
  });

  it("accepts a PDF containing 'AWG' alone", async () => {
    stubClaudeText(JSON.stringify(MINIMAL_EXTRACTION));
    const pdf = fakePdfWith(["Gemäß § 8 AWG wird genehmigt..."]);
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
  });

  it("flags DDTC markers as a warning but still proceeds", async () => {
    stubClaudeText(JSON.stringify(MINIMAL_EXTRACTION));
    const pdf = fakePdfWith([
      "Bundesamt für Wirtschaft",
      "Directorate of Defense Trade Controls",
    ]);
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.extraction.warnings.some((w) => w.includes("DDTC"))).toBe(
        true,
      );
    }
  });
});

// ─── JSON parsing & defensive cleanup ─────────────────────────────────

describe("parseBafaBescheid — JSON cleanup", () => {
  const pdf = fakePdfWith(["BAFA Ausfuhrgenehmigung"]);

  it("strips ```json markdown fences", async () => {
    stubClaudeText("```json\n" + JSON.stringify(MINIMAL_EXTRACTION) + "\n```");
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.extraction.licenseNumber).toBe("G/2026/12345");
  });

  it("strips plain ``` fences (no language tag)", async () => {
    stubClaudeText("```\n" + JSON.stringify(MINIMAL_EXTRACTION) + "\n```");
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
  });

  it("recovers JSON when there is leading prose", async () => {
    stubClaudeText(
      "Sure, here is the extraction:\n" + JSON.stringify(MINIMAL_EXTRACTION),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.extraction.licenseNumber).toBe("G/2026/12345");
  });

  it("aggregates multiple text blocks before parsing", async () => {
    stubClaudeMultiBlock([
      { type: "text", text: "{" },
      { type: "text", text: '"licenseNumber": "G/2026/777",' },
      { type: "text", text: '"licenseType": "BAFA_AGG_12",' },
      {
        type: "text",
        text: '"capCurrency": "EUR", "coveredEccnCodes": [], "coveredCountries": [], "additionalConditions": [], "warnings": [], "fieldConfidence": {}}',
      },
    ]);
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.extraction.licenseNumber).toBe("G/2026/777");
      expect(res.extraction.licenseType).toBe("BAFA_AGG_12");
    }
  });

  it("returns ok:false on malformed JSON", async () => {
    stubClaudeText("This is not JSON at all, no braces.");
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/JSON/i);
  });

  it("returns ok:false on truncated JSON", async () => {
    stubClaudeText('{"licenseNumber": "G/2026/x"');
    const res = await parseBafaBescheid(pdf);
    // The brace-extractor finds the opening { but no closing } —
    // so it should fail-fast with "No JSON object found".
    expect(res.ok).toBe(false);
  });
});

// ─── Field coercion ───────────────────────────────────────────────────

describe("parseBafaBescheid — field coercion", () => {
  const pdf = fakePdfWith(["BAFA Ausfuhrgenehmigung"]);

  it("coerces German-format numeric strings into numbers", async () => {
    stubClaudeText(
      JSON.stringify({
        ...MINIMAL_EXTRACTION,
        totalCapValue: "1.234.567,89",
      }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.extraction.totalCapValue).toBe(1234567.89);
  });

  it("accepts numeric value directly", async () => {
    stubClaudeText(
      JSON.stringify({ ...MINIMAL_EXTRACTION, totalCapValue: 500000 }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.extraction.totalCapValue).toBe(500000);
  });

  it("sets totalCapValue to null for unparseable strings", async () => {
    stubClaudeText(
      JSON.stringify({ ...MINIMAL_EXTRACTION, totalCapValue: "unbegrenzt" }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.extraction.totalCapValue).toBeNull();
  });

  it("rejects an invalid date and adds a warning", async () => {
    stubClaudeText(
      JSON.stringify({ ...MINIMAL_EXTRACTION, issuedAt: "15.03.2026" }), // wrong format
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.extraction.issuedAt).toBeNull();
      expect(res.extraction.warnings.some((w) => w.includes("issuedAt"))).toBe(
        true,
      );
    }
  });

  it("rejects a real-looking-but-invalid ISO date (2025-13-01)", async () => {
    stubClaudeText(
      JSON.stringify({ ...MINIMAL_EXTRACTION, validUntil: "2025-13-01" }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.extraction.validUntil).toBeNull();
    }
  });

  it("uppercases capCurrency", async () => {
    stubClaudeText(
      JSON.stringify({ ...MINIMAL_EXTRACTION, capCurrency: "eur" }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.extraction.capCurrency).toBe("EUR");
  });

  it("defaults capCurrency to EUR when omitted", async () => {
    const { capCurrency: _, ...rest } = MINIMAL_EXTRACTION;
    void _;
    stubClaudeText(JSON.stringify(rest));
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.extraction.capCurrency).toBe("EUR");
  });

  it("filters non-ISO country codes from coveredCountries", async () => {
    stubClaudeText(
      JSON.stringify({
        ...MINIMAL_EXTRACTION,
        coveredCountries: [
          "US",
          "Germany",
          "FR",
          "EU",
          "Vereinigtes Königreich",
        ],
      }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      // "Germany" and "Vereinigtes Königreich" are filtered out; "EU" passes
      // (it's a 2-letter all-caps token).
      expect(res.extraction.coveredCountries).toEqual(["US", "FR", "EU"]);
    }
  });

  it("uppercases country codes", async () => {
    stubClaudeText(
      JSON.stringify({
        ...MINIMAL_EXTRACTION,
        coveredCountries: ["us", "fr"],
      }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.extraction.coveredCountries).toEqual(["US", "FR"]);
  });

  it("filters non-string entries from string-array fields", async () => {
    stubClaudeText(
      JSON.stringify({
        ...MINIMAL_EXTRACTION,
        coveredEccnCodes: ["9A515.a", 9999, null, "", "5A002.a"],
      }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.extraction.coveredEccnCodes).toEqual(["9A515.a", "5A002.a"]);
    }
  });
});

// ─── License-type whitelist ───────────────────────────────────────────

describe("parseBafaBescheid — license-type whitelist", () => {
  const pdf = fakePdfWith(["BAFA Ausfuhrgenehmigung"]);

  it.each([
    "BAFA_EINZEL",
    "BAFA_AGG_12",
    "BAFA_AGG_16",
    "BAFA_AGG_27",
    "BAFA_AGG_47",
    "BAFA_EUGEA_EU001",
    "BAFA_EUGEA_EU002",
  ])("accepts %s as a valid licenseType", async (type) => {
    stubClaudeText(
      JSON.stringify({ ...MINIMAL_EXTRACTION, licenseType: type }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.extraction.licenseType).toBe(type);
  });

  it("rejects an unknown licenseType and adds a warning", async () => {
    stubClaudeText(
      JSON.stringify({ ...MINIMAL_EXTRACTION, licenseType: "BIS_EAR_99" }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.extraction.licenseType).toBeNull();
      expect(
        res.extraction.warnings.some((w) => w.includes("BIS_EAR_99")),
      ).toBe(true);
    }
  });
});

// ─── Field confidence ─────────────────────────────────────────────────

describe("parseBafaBescheid — fieldConfidence normalisation", () => {
  const pdf = fakePdfWith(["BAFA Ausfuhrgenehmigung"]);

  it("preserves explicit confidence values from Claude", async () => {
    stubClaudeText(
      JSON.stringify({
        ...MINIMAL_EXTRACTION,
        fieldConfidence: {
          ...MINIMAL_EXTRACTION.fieldConfidence,
          licenseNumber: "low",
          validUntil: "missing",
        },
      }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.extraction.fieldConfidence.licenseNumber).toBe("low");
      expect(res.extraction.fieldConfidence.validUntil).toBe("missing");
    }
  });

  it('derives "missing" when Claude omits confidence for a null field', async () => {
    stubClaudeText(
      JSON.stringify({
        ...MINIMAL_EXTRACTION,
        validUntil: null,
        fieldConfidence: {}, // empty → must be re-derived
      }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.extraction.fieldConfidence.validUntil).toBe("missing");
    }
  });

  it('derives "low" when Claude omits confidence for a present field', async () => {
    stubClaudeText(
      JSON.stringify({
        ...MINIMAL_EXTRACTION,
        fieldConfidence: {}, // empty → must be re-derived per-field
      }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      // licenseNumber is present in MINIMAL_EXTRACTION, so re-derived = "low"
      expect(res.extraction.fieldConfidence.licenseNumber).toBe("low");
    }
  });

  it('treats empty arrays as "missing" when re-deriving', async () => {
    stubClaudeText(
      JSON.stringify({
        ...MINIMAL_EXTRACTION,
        coveredEccnCodes: [],
        fieldConfidence: {},
      }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.extraction.fieldConfidence.coveredEccnCodes).toBe("missing");
    }
  });

  it("ignores garbage confidence values and re-derives", async () => {
    stubClaudeText(
      JSON.stringify({
        ...MINIMAL_EXTRACTION,
        fieldConfidence: {
          ...MINIMAL_EXTRACTION.fieldConfidence,
          licenseNumber: "extreme", // not in enum
          issuedAt: 42, // not a string
        },
      }),
    );
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      // Both should fall back — present fields → "low".
      expect(res.extraction.fieldConfidence.licenseNumber).toBe("low");
      expect(res.extraction.fieldConfidence.issuedAt).toBe("low");
    }
  });
});

// ─── Anthropic-API error handling ─────────────────────────────────────

describe("parseBafaBescheid — Anthropic call errors", () => {
  const pdf = fakePdfWith(["BAFA Ausfuhrgenehmigung"]);

  it("returns ok:false when messages.create throws", async () => {
    mockState.shouldThrow = new Error("Rate limit exceeded");
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Rate limit exceeded/);
  });

  it("preserves heuristic warnings on Anthropic failure", async () => {
    mockState.shouldThrow = new Error("Network");
    const pdfWithDdtc = fakePdfWith([
      "Bundesamt für Wirtschaft",
      "Directorate of Defense Trade Controls",
    ]);
    const res = await parseBafaBescheid(pdfWithDdtc);
    expect(res.ok).toBe(false);
    if (!res.ok && res.warnings) {
      expect(res.warnings.some((w) => w.includes("DDTC"))).toBe(true);
    }
  });
});

// ─── Anthropic request shape ──────────────────────────────────────────

describe("parseBafaBescheid — Anthropic request shape", () => {
  const pdf = fakePdfWith(["BAFA Ausfuhrgenehmigung"]);

  it("sends the PDF as a base64 document block", async () => {
    stubClaudeText(JSON.stringify(MINIMAL_EXTRACTION));
    await parseBafaBescheid(pdf);
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
    expect(docBlock?.source?.type).toBe("base64");
    expect(docBlock?.source?.media_type).toBe("application/pdf");
    // Round-trip base64 → bytes to confirm the encoding worked.
    expect(Buffer.from(docBlock!.source!.data, "base64").length).toBe(
      pdf.length,
    );
  });

  it("returns latencyMs and modelUsed on success", async () => {
    stubClaudeText(JSON.stringify(MINIMAL_EXTRACTION));
    const res = await parseBafaBescheid(pdf);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.modelUsed).toBe("claude-sonnet-4-6");
      expect(typeof res.latencyMs).toBe("number");
      expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── End-to-end extraction shape ──────────────────────────────────────

describe("parseBafaBescheid — extraction shape", () => {
  it("returns all required BafaBescheidExtraction fields", async () => {
    stubClaudeText(JSON.stringify(MINIMAL_EXTRACTION));
    const res = await parseBafaBescheid(
      fakePdfWith(["BAFA Sammelgenehmigung"]),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      const e: BafaBescheidExtraction = res.extraction;
      // Keys that MUST exist on the contract.
      expect(e).toHaveProperty("licenseNumber");
      expect(e).toHaveProperty("licenseType");
      expect(e).toHaveProperty("issuedAt");
      expect(e).toHaveProperty("validUntil");
      expect(e).toHaveProperty("totalCapValue");
      expect(e).toHaveProperty("capCurrency");
      expect(e).toHaveProperty("coveredEccnCodes");
      expect(e).toHaveProperty("coveredCountries");
      expect(e).toHaveProperty("additionalConditions");
      expect(e).toHaveProperty("fieldConfidence");
      expect(e).toHaveProperty("warnings");
    }
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
