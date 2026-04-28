// tests/unit/lib/legal-network/matter-tools.test.ts

/**
 * Unit tests for src/lib/legal-network/matter-tools.ts.
 *
 * The MATTER_TOOLS array IS the contract Claude sees inside a matter
 * conversation — bugs in name spelling, schema shape, or a missing
 * tool break tool-use rounds in the AI loop. The pinned guarantees:
 *
 *   - Every tool has a name + description + input_schema
 *   - Tool names match the MatterToolName union (no drift between the
 *     compile-time type and the runtime data)
 *   - Required tools are present (regression alarm if one is dropped)
 *   - input_schema is always a plain JSON-Schema object
 *   - isMatterToolName recognises every tool's name and rejects others
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MATTER_TOOLS,
  isMatterToolName,
  type MatterToolName,
} from "@/lib/legal-network/matter-tools";

const REQUIRED_NAMES: MatterToolName[] = [
  "load_compliance_overview",
  "search_legal_sources",
  "list_matter_documents",
  "compare_jurisdictions",
  "draft_memo_to_note",
];

describe("MATTER_TOOLS — completeness", () => {
  it("registers exactly the documented tool set (drift alarm)", () => {
    const names = MATTER_TOOLS.map((t) => t.name).sort();
    expect(names).toEqual([...REQUIRED_NAMES].sort());
  });

  it.each(REQUIRED_NAMES)("includes the %s tool", (name) => {
    expect(MATTER_TOOLS.some((t) => t.name === name)).toBe(true);
  });
});

describe("MATTER_TOOLS — schema shape", () => {
  it.each(REQUIRED_NAMES)("%s has a non-empty description", (name) => {
    const tool = MATTER_TOOLS.find((t) => t.name === name)!;
    expect(typeof tool.description).toBe("string");
    expect((tool.description ?? "").length).toBeGreaterThan(20);
  });

  it.each(REQUIRED_NAMES)(
    "%s has an input_schema object with type=object",
    (name) => {
      const tool = MATTER_TOOLS.find((t) => t.name === name)!;
      expect(tool.input_schema).toBeTypeOf("object");
      expect(tool.input_schema.type).toBe("object");
    },
  );

  it("search_legal_sources requires `query`", () => {
    const tool = MATTER_TOOLS.find((t) => t.name === "search_legal_sources")!;
    expect(tool.input_schema.required).toContain("query");
  });

  it("compare_jurisdictions requires `jurisdictions` and limits the array to 2-5", () => {
    const tool = MATTER_TOOLS.find((t) => t.name === "compare_jurisdictions")!;
    expect(tool.input_schema.required).toContain("jurisdictions");
    const jurisdictions = (
      tool.input_schema.properties as Record<string, unknown>
    )?.jurisdictions as { minItems?: number; maxItems?: number };
    expect(jurisdictions.minItems).toBe(2);
    expect(jurisdictions.maxItems).toBe(5);
  });

  it("draft_memo_to_note requires `title` and `content`", () => {
    const tool = MATTER_TOOLS.find((t) => t.name === "draft_memo_to_note")!;
    expect(tool.input_schema.required).toEqual(
      expect.arrayContaining(["title", "content"]),
    );
  });

  it("load_compliance_overview's detail_level enum is fixed to summary/full", () => {
    const tool = MATTER_TOOLS.find(
      (t) => t.name === "load_compliance_overview",
    )!;
    const detail = (tool.input_schema.properties as Record<string, unknown>)
      ?.detail_level as { enum?: string[] };
    expect(detail.enum).toEqual(["summary", "full"]);
  });
});

describe("isMatterToolName — type-guard", () => {
  it.each(REQUIRED_NAMES)("returns true for %s", (name) => {
    expect(isMatterToolName(name)).toBe(true);
  });

  it("returns false for an unrecognised name", () => {
    expect(isMatterToolName("send_email")).toBe(false);
    expect(isMatterToolName("delete_matter")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isMatterToolName("")).toBe(false);
  });

  it("returns false for a similar-but-wrong name (case-sensitive)", () => {
    expect(isMatterToolName("Load_Compliance_Overview")).toBe(false);
    expect(isMatterToolName("LOAD_COMPLIANCE_OVERVIEW")).toBe(false);
  });

  it("acts as a type-narrowing guard at the type level", () => {
    const candidate: string = "search_legal_sources";
    if (isMatterToolName(candidate)) {
      // If this compiles + runs, the type narrowed to MatterToolName.
      const narrowed: MatterToolName = candidate;
      expect(narrowed).toBe("search_legal_sources");
    } else {
      throw new Error("guard rejected a known tool name");
    }
  });
});
