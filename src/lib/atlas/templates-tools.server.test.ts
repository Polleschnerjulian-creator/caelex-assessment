import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Templates-Tools bundle smoke-tests (Atlas V3 T0.1.c).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasDocumentTemplate: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    atlasMandate: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock("@/data/atlas-workspace-templates", () => ({
  listTemplateSummaries: () => [
    {
      id: "tpl-de-sat",
      title: "DE Satelliten-Lizenz",
      description: "Starter for satellite licensing in Germany",
      category: "license",
      cardCount: 5,
    },
    {
      id: "tpl-nis2",
      title: "NIS2-Compliance",
      description: "NIS2 readiness checklist",
      category: "compliance",
      cardCount: 7,
    },
  ],
}));

import { prisma } from "@/lib/prisma";
import {
  TEMPLATES_TOOLS,
  isTemplatesToolName,
  executeTemplatesTool,
} from "./templates-tools.server";

describe("templates-tools bundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TEMPLATES_TOOLS schema", () => {
    it("exports exactly 4 tools", () => {
      expect(TEMPLATES_TOOLS).toHaveLength(4);
      const names = TEMPLATES_TOOLS.map((t) => t.name).sort();
      expect(names).toEqual([
        "list_document_templates",
        "list_workspace_templates",
        "save_document_template",
        "use_document_template",
      ]);
    });

    it("save_document_template requires name + kind + body", () => {
      const tool = TEMPLATES_TOOLS.find(
        (t) => t.name === "save_document_template",
      );
      const schema = tool?.input_schema as { required?: string[] };
      expect(schema.required).toEqual(["name", "kind", "body"]);
    });
  });

  describe("isTemplatesToolName", () => {
    it("returns true for all 4 template tool names", () => {
      expect(isTemplatesToolName("list_workspace_templates")).toBe(true);
      expect(isTemplatesToolName("save_document_template")).toBe(true);
      expect(isTemplatesToolName("list_document_templates")).toBe(true);
      expect(isTemplatesToolName("use_document_template")).toBe(true);
    });

    it("returns false for unrelated names", () => {
      expect(isTemplatesToolName("draft_schriftsatz")).toBe(false);
      expect(isTemplatesToolName("get_org_branding")).toBe(false);
      expect(isTemplatesToolName("")).toBe(false);
    });
  });

  describe("executeTemplatesTool — list_workspace_templates", () => {
    it("returns the workspace templates catalogue", async () => {
      const result = await executeTemplatesTool({
        name: "list_workspace_templates",
        input: {},
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.template_count).toBe(2);
      expect(payload.templates).toHaveLength(2);
      expect(payload.hint).toBeDefined();
    });
  });

  describe("executeTemplatesTool — save_document_template", () => {
    it("rejects invalid input (missing required body)", async () => {
      const result = await executeTemplatesTool({
        name: "save_document_template",
        input: { name: "Test", kind: "brief" },
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toBe("Invalid input");
    });

    it("dry_run returns preview without persisting", async () => {
      const result = await executeTemplatesTool({
        name: "save_document_template",
        input: {
          name: "Test Template",
          kind: "brief",
          body: "Lorem ipsum dolor sit amet, this is a long enough body for the validator to accept it.",
          dry_run: true,
        },
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.dry_run).toBe(true);
      expect(payload.name).toBe("Test Template");
      expect(prisma.atlasDocumentTemplate.upsert).not.toHaveBeenCalled();
    });

    it("persists template when dry_run is false", async () => {
      vi.mocked(prisma.atlasDocumentTemplate.upsert).mockResolvedValueOnce({
        id: "t-id-1",
        name: "Test Template",
        kind: "brief",
        updatedAt: new Date(),
      } as never);
      const result = await executeTemplatesTool({
        name: "save_document_template",
        input: {
          name: "Test Template",
          kind: "brief",
          body: "Lorem ipsum dolor sit amet, this is a long enough body for the validator to accept it.",
        },
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(result.isError).toBe(false);
      expect(prisma.atlasDocumentTemplate.upsert).toHaveBeenCalled();
      const payload = JSON.parse(result.content);
      expect(payload.ok).toBe(true);
      expect(payload.template.name).toBe("Test Template");
    });
  });

  describe("executeTemplatesTool — list_document_templates", () => {
    it("returns templates with token-count summary", async () => {
      vi.mocked(prisma.atlasDocumentTemplate.findMany).mockResolvedValueOnce([
        {
          id: "t1",
          name: "Standard Brief",
          kind: "brief",
          tokensJson: JSON.stringify(["client_name", "today"]),
          updatedAt: new Date(),
        },
      ] as never);
      const result = await executeTemplatesTool({
        name: "list_document_templates",
        input: {},
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.templates[0].tokenCount).toBe(2);
      expect(payload.templates[0].name).toBe("Standard Brief");
    });

    it("handles malformed tokensJson gracefully", async () => {
      vi.mocked(prisma.atlasDocumentTemplate.findMany).mockResolvedValueOnce([
        {
          id: "t1",
          name: "Broken",
          kind: "brief",
          tokensJson: "not-valid-json",
          updatedAt: new Date(),
        },
      ] as never);
      const result = await executeTemplatesTool({
        name: "list_document_templates",
        input: {},
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      const payload = JSON.parse(result.content);
      expect(payload.templates[0].tokenCount).toBe(0);
    });
  });

  describe("executeTemplatesTool — use_document_template", () => {
    it("rejects when neither name nor id provided", async () => {
      const result = await executeTemplatesTool({
        name: "use_document_template",
        input: {},
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(result.isError).toBe(true);
    });

    it("returns error when template not found", async () => {
      vi.mocked(prisma.atlasDocumentTemplate.findFirst).mockResolvedValueOnce(
        null,
      );
      const result = await executeTemplatesTool({
        name: "use_document_template",
        input: { name: "Nonexistent" },
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toBe("Template not found");
    });

    it("merges template + reports unresolved tokens", async () => {
      vi.mocked(prisma.atlasDocumentTemplate.findFirst).mockResolvedValueOnce({
        id: "t1",
        name: "Standard",
        kind: "brief",
        body: "Sehr geehrte {{client_name}}, am {{today}} ...",
        tokensJson: JSON.stringify(["client_name"]),
      } as never);
      const result = await executeTemplatesTool({
        name: "use_document_template",
        input: { name: "Standard" },
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.unresolved_tokens).toContain("client_name");
      // {{today}} is auto-resolved with German-locale current date
      expect(payload.merged_body).not.toContain("{{today}}");
    });
  });

  describe("executeTemplatesTool — unknown tool", () => {
    it("returns isError for unhandled name", async () => {
      const result = await executeTemplatesTool({
        name: "bogus_tool" as never,
        input: {},
        callerUserId: "u1",
        callerOrgId: "o1",
        mandateId: null,
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Unknown templates");
    });
  });
});
