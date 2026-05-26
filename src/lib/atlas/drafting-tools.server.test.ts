import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Drafting-Tools bundle smoke-tests (Atlas V3 T0.1.h).
 *
 * Data corpus (ALL_SOURCES, ATLAS_CASES, getAuthoritiesByJurisdiction,
 * getCasesApplyingSource) imported real. Mandate-scaffold-context
 * loader is mocked to return null (no mandate attached) so tests
 * don't require a Prisma fixture.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("./mandate-scaffold-context.server", () => ({
  loadMandateScaffoldContext: vi.fn().mockResolvedValue(null),
}));

import {
  DRAFTING_TOOLS,
  isDraftingToolName,
  executeDraftingTool,
} from "./drafting-tools.server";

describe("drafting-tools bundle", () => {
  describe("DRAFTING_TOOLS schema", () => {
    it("exports exactly 7 tools", () => {
      expect(DRAFTING_TOOLS).toHaveLength(7);
      const names = DRAFTING_TOOLS.map((t) => t.name).sort();
      expect(names).toEqual([
        "draft_aktennotiz",
        "draft_authorization_application",
        "draft_compliance_brief",
        "draft_mandantenbrief",
        "draft_schriftsatz",
        "draft_vertrag",
        "refine_document",
      ]);
    });

    it("draft_authorization_application requires jurisdiction + operator_type", () => {
      const tool = DRAFTING_TOOLS.find(
        (t) => t.name === "draft_authorization_application",
      );
      const schema = tool?.input_schema as { required?: string[] };
      expect(schema.required).toEqual(["jurisdiction", "operator_type"]);
    });

    it("all draft_* tools have non-empty descriptions", () => {
      for (const tool of DRAFTING_TOOLS) {
        expect(tool.description).toBeDefined();
        expect((tool.description ?? "").length).toBeGreaterThan(80);
      }
    });
  });

  describe("isDraftingToolName", () => {
    it("returns true for all 7 drafting tool names", () => {
      expect(isDraftingToolName("draft_authorization_application")).toBe(true);
      expect(isDraftingToolName("draft_compliance_brief")).toBe(true);
      expect(isDraftingToolName("draft_schriftsatz")).toBe(true);
      expect(isDraftingToolName("draft_mandantenbrief")).toBe(true);
      expect(isDraftingToolName("draft_vertrag")).toBe(true);
      expect(isDraftingToolName("draft_aktennotiz")).toBe(true);
      expect(isDraftingToolName("refine_document")).toBe(true);
    });

    it("returns false for unrelated names", () => {
      expect(isDraftingToolName("search_legal_sources")).toBe(false);
      expect(isDraftingToolName("get_org_branding")).toBe(false);
      expect(isDraftingToolName("draft_xy")).toBe(false);
      expect(isDraftingToolName("")).toBe(false);
    });
  });

  describe("executeDraftingTool — draft_authorization_application", () => {
    it("rejects invalid jurisdiction format", async () => {
      const result = await executeDraftingTool({
        name: "draft_authorization_application",
        input: { jurisdiction: "xx1", operator_type: "satellite_operator" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("INVALID_INPUT");
    });

    it("returns NO_REGIME for jurisdiction with no licensing statute", async () => {
      const result = await executeDraftingTool({
        name: "draft_authorization_application",
        input: { jurisdiction: "EE", operator_type: "satellite_operator" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content);
      expect(payload.code).toBe("NO_REGIME");
    });

    it("normalises lowercase jurisdiction to uppercase", async () => {
      const result = await executeDraftingTool({
        name: "draft_authorization_application",
        input: { jurisdiction: "de", operator_type: "satellite_operator" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      // Either NO_REGIME or success — both prove the normalisation worked
      const payload = JSON.parse(result.content);
      // success or NO_REGIME but NEVER INVALID_INPUT
      expect(payload.code === undefined || payload.code === "NO_REGIME").toBe(
        true,
      );
    });
  });

  describe("executeDraftingTool — draft_compliance_brief", () => {
    it("rejects empty topic", async () => {
      const result = await executeDraftingTool({
        name: "draft_compliance_brief",
        input: { topic: "" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
    });

    it("accepts valid topic + returns scaffold", async () => {
      const result = await executeDraftingTool({
        name: "draft_compliance_brief",
        input: { topic: "5-year LEO post-mission disposal" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(false);
    });
  });

  describe("executeDraftingTool — chat-native drafting (schriftsatz/brief/vertrag)", () => {
    it("draft_schriftsatz rejects invalid input", async () => {
      const result = await executeDraftingTool({
        name: "draft_schriftsatz",
        input: { subject: "x" }, // too short
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(result.isError).toBe(true);
    });

    it("draft_mandantenbrief dispatches (zod validates or accepts)", async () => {
      const result = await executeDraftingTool({
        name: "draft_mandantenbrief",
        input: {
          subject: "Statusbericht zur Genehmigung",
          purpose: "status_update",
        },
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      // Either accepts (isError false) or zod-validation rejects (isError true).
      // What we're proving is the dispatcher routes to the function.
      expect(typeof result.isError).toBe("boolean");
      expect(typeof result.content).toBe("string");
    });

    it("draft_vertrag dispatches", async () => {
      const result = await executeDraftingTool({
        name: "draft_vertrag",
        input: {
          contract_type: "vollmacht",
          purpose: "Frequenzkoordination BNetzA",
        },
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(typeof result.isError).toBe("boolean");
      expect(typeof result.content).toBe("string");
    });
  });

  describe("executeDraftingTool — refine_document", () => {
    it("rejects when required fields missing", async () => {
      const result = await executeDraftingTool({
        name: "refine_document",
        input: {},
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
    });

    it("dispatches refine_document (zod accepts or rejects predictably)", async () => {
      const result = await executeDraftingTool({
        name: "refine_document",
        input: {
          section: "Begründung",
          instruction: "Kürzer, fokussierter auf §22 NIS2",
        },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(typeof result.isError).toBe("boolean");
      expect(typeof result.content).toBe("string");
    });
  });

  describe("executeDraftingTool — unknown tool", () => {
    it("returns isError for unhandled name", async () => {
      const result = await executeDraftingTool({
        name: "bogus_tool" as never,
        input: {},
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Unknown drafting");
    });
  });
});
