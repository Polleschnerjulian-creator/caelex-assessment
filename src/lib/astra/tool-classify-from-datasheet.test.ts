/**
 * Tests for the `classify_from_datasheet` Astra tool — Sprint Z4b.
 *
 * Targets the registry wiring + the rawText execution path. The base64
 * PDF path is exercised indirectly via the Z4a `extractDatasheet`
 * parseError test — invoking unpdf inside Vitest's worker model is
 * slow and the path is already covered there.
 */

import { describe, it, expect, vi } from "vitest";

// Server-only stub before the tool-executor module loads.
vi.mock("server-only", () => ({}));

// Stub prisma/audit so the executor's module-level imports don't
// reach the live DB during the import chain.
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { TOOL_HANDLERS } from "./tool-executor";
import { ALL_TOOLS, TOOL_BY_NAME, TOOL_CATEGORIES } from "./tool-definitions";

describe("classify_from_datasheet — tool registration", () => {
  it("is registered in ALL_TOOLS and TOOL_BY_NAME", () => {
    expect(TOOL_BY_NAME["classify_from_datasheet"]).toBeDefined();
    expect(
      ALL_TOOLS.find((t) => t.name === "classify_from_datasheet"),
    ).toBeDefined();
  });

  it("is listed under the trade category", () => {
    expect(TOOL_CATEGORIES.trade).toContain("classify_from_datasheet");
  });

  it("has a handler registered in TOOL_HANDLERS", () => {
    expect(TOOL_HANDLERS["classify_from_datasheet"]).toBeTypeOf("function");
  });

  it("declares pdfBase64, rawText, and tradeItemId in the input schema", () => {
    const def = TOOL_BY_NAME["classify_from_datasheet"];
    const props = def.input_schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("pdfBase64");
    expect(props).toHaveProperty("rawText");
    expect(props).toHaveProperty("tradeItemId");
  });
});

describe("classify_from_datasheet — handler behaviour (rawText path)", () => {
  const userContext = {
    userId: "user-test",
    organizationId: "org-test",
    organizationName: "Test Org",
  };

  it("returns an error result when both pdfBase64 and rawText are absent", async () => {
    const handler = TOOL_HANDLERS["classify_from_datasheet"];
    const result = (await handler({}, userContext)) as Record<string, unknown>;

    expect(result).toHaveProperty("error");
    expect(String(result.error).toLowerCase()).toContain("either");
  });

  it("produces a draft with proposals + disclaimer for an EO datasheet", async () => {
    const handler = TOOL_HANDLERS["classify_from_datasheet"];
    const rawText =
      "Earth-observation satellite. Primary aperture: 0.30 m. Specially designed for spaceflight applications.";

    const result = (await handler(
      { rawText, tradeItemId: "ti-123" },
      userContext,
    )) as Record<string, unknown>;

    expect(result.tradeItemId).toBe("ti-123");
    expect(Array.isArray(result.proposals)).toBe(true);
    const proposals = result.proposals as Array<Record<string, unknown>>;
    expect(proposals.length).toBeGreaterThan(0);
    // Disclaimer NEVER absent from the tool response — load-bearing for
    // compliance. The Astra prompt + UI render it verbatim.
    expect(result.disclaimer).toBeDefined();
    expect(String(result.disclaimer)).toMatch(/SCREENING-LEVEL GUIDANCE/);
    // The summary names the proposed code so chat clients have a
    // useful one-line answer to render.
    expect(String(result.summary)).toContain("Proposed classification");
  });

  it("surfaces attributesNeeded for partially-extracted datasheets", async () => {
    const handler = TOOL_HANDLERS["classify_from_datasheet"];
    // Hall thruster with only an Isp — the matcher's other propulsion
    // predicates fire as unknowns.
    const rawText = "Hall effect thruster, specific impulse: 1500 s.";

    const result = (await handler({ rawText }, userContext)) as Record<
      string,
      unknown
    >;

    // attributesNeeded is an array (sorted, possibly empty) — the UI
    // renders it as "fill these in to refine the classification".
    expect(Array.isArray(result.attributesNeeded)).toBe(true);
    // The disclaimer rides along even when no clean candidate.
    expect(result.disclaimer).toBeDefined();
  });
});
