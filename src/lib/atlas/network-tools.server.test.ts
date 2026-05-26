import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Network-Tools bundle smoke-tests (Atlas V3 T0.1.e).
 *
 * Email dispatch + matter-service are mocked so no live sends.
 * Prisma is mocked for all DB calls.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    atlasMandate: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    organizationMember: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("./atlas-encryption", () => ({
  encryptAtlasField: vi.fn().mockImplementation((v) => Promise.resolve(v)),
  decryptAtlasField: vi.fn().mockImplementation((v) => Promise.resolve(v)),
}));

vi.mock("@/lib/legal-network/matter-service", () => ({
  createInvite: vi.fn(),
  MatterServiceError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = "MatterServiceError";
    }
  },
}));

vi.mock("@/lib/legal-network/scope", () => ({
  SCOPE_LEVELS: {
    advisory: [{ category: "compliance", permissions: ["read", "summary"] }],
    active_counsel: [
      { category: "compliance", permissions: ["read", "annotate"] },
      { category: "documents", permissions: ["read"] },
    ],
    full_counsel: [
      { category: "compliance", permissions: ["read", "annotate", "export"] },
    ],
  },
}));

import { prisma } from "@/lib/prisma";
import {
  NETWORK_TOOLS,
  isNetworkToolName,
  executeNetworkTool,
} from "./network-tools.server";

describe("network-tools bundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("NETWORK_TOOLS schema", () => {
    it("exports exactly 3 tools", () => {
      expect(NETWORK_TOOLS).toHaveLength(3);
      const names = NETWORK_TOOLS.map((t) => t.name).sort();
      expect(names).toEqual([
        "create_matter_invite",
        "create_solo_matter",
        "find_operator_organization",
      ]);
    });

    it("create_matter_invite requires action + operator_org_id + matter_name", () => {
      const tool = NETWORK_TOOLS.find((t) => t.name === "create_matter_invite");
      const schema = tool?.input_schema as { required?: string[] };
      expect(schema.required).toEqual([
        "action",
        "operator_org_id",
        "matter_name",
      ]);
    });
  });

  describe("isNetworkToolName", () => {
    it("returns true for all 3 network tool names", () => {
      expect(isNetworkToolName("find_operator_organization")).toBe(true);
      expect(isNetworkToolName("create_matter_invite")).toBe(true);
      expect(isNetworkToolName("create_solo_matter")).toBe(true);
    });

    it("returns false for unrelated names", () => {
      expect(isNetworkToolName("find_or_open_matter")).toBe(false);
      expect(isNetworkToolName("get_org_branding")).toBe(false);
    });
  });

  describe("executeNetworkTool — find_operator_organization", () => {
    it("rejects too-short query", async () => {
      const result = await executeNetworkTool({
        name: "find_operator_organization",
        input: { query: "x" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
    });

    it("returns operator matches when org found", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValueOnce([
        { id: "op1", name: "Spire", slug: "spire", orgType: "OPERATOR" },
      ] as never);
      const result = await executeNetworkTool({
        name: "find_operator_organization",
        input: { query: "Spire" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.totalMatches).toBe(1);
      expect(payload.matches[0].name).toBe("Spire");
    });

    it("returns ORG_TYPE_MIGRATION_PENDING when orgType column missing", async () => {
      vi.mocked(prisma.organization.findMany).mockRejectedValueOnce(
        new Error("column orgtype does not exist"),
      );
      const result = await executeNetworkTool({
        name: "find_operator_organization",
        input: { query: "Spire" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe(
        "ORG_TYPE_MIGRATION_PENDING",
      );
    });
  });

  describe("executeNetworkTool — create_matter_invite", () => {
    it("returns OPERATOR_NOT_FOUND for unknown org id", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(null);
      const result = await executeNetworkTool({
        name: "create_matter_invite",
        input: {
          action: "preview",
          operator_org_id: "ckxxxxx00000000000000000",
          matter_name: "Test Matter",
        },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("OPERATOR_NOT_FOUND");
    });

    it("returns WRONG_ORG_TYPE for LAW_FIRM operator", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({
        id: "op_law",
        name: "Polleschner Legal",
        slug: "pl",
        orgType: "LAW_FIRM",
        isActive: true,
      } as never);
      const result = await executeNetworkTool({
        name: "create_matter_invite",
        input: {
          action: "preview",
          operator_org_id: "ckxxxxx00000000000000001",
          matter_name: "Test Matter",
        },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("WRONG_ORG_TYPE");
    });

    it("preview returns confirmation_required", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({
        id: "op_good",
        name: "Spire Global",
        slug: "spire",
        orgType: "OPERATOR",
        isActive: true,
      } as never);
      const result = await executeNetworkTool({
        name: "create_matter_invite",
        input: {
          action: "preview",
          operator_org_id: "ckxxxxx00000000000000002",
          matter_name: "Spire — Authorization 2026",
        },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.action).toBe("preview");
      expect(payload.confirmation_required).toBeDefined();
      expect(result.navigateUrl).toBeUndefined();
    });

    it("blocks self-invite (operator.id === callerOrgId)", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({
        id: "o1",
        name: "MyFirm",
        slug: "myfirm",
        orgType: "OPERATOR",
        isActive: true,
      } as never);
      const result = await executeNetworkTool({
        name: "create_matter_invite",
        input: {
          action: "preview",
          operator_org_id: "ckxxxxx00000000000000003",
          matter_name: "Test",
        },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("SELF_INVITE");
    });
  });

  describe("executeNetworkTool — create_solo_matter", () => {
    it("rejects when name too short", async () => {
      const result = await executeNetworkTool({
        name: "create_solo_matter",
        input: { name: "ab" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
    });

    it("creates mandate + returns navigateUrl on success", async () => {
      vi.mocked(prisma.atlasMandate.create).mockResolvedValueOnce({
        id: "m_new",
        name: "Test Solo Matter",
        clientName: "Test Client",
        jurisdiction: null,
        operatorType: null,
        primaryAuthority: null,
        createdAt: new Date(),
      } as never);
      const result = await executeNetworkTool({
        name: "create_solo_matter",
        input: { name: "Test Solo Matter", clientName: "Test Client" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.ok).toBe(true);
      expect(payload.mandateId).toBe("m_new");
      expect(result.navigateUrl).toBe("/atlas/mandate/m_new");
    });

    it("returns DB_ERROR when prisma rejects", async () => {
      vi.mocked(prisma.atlasMandate.create).mockRejectedValueOnce(
        new Error("constraint violation"),
      );
      const result = await executeNetworkTool({
        name: "create_solo_matter",
        input: { name: "Crash Test" },
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("DB_ERROR");
    });
  });

  describe("executeNetworkTool — unknown tool", () => {
    it("returns isError for unhandled name", async () => {
      const result = await executeNetworkTool({
        name: "bogus_tool" as never,
        input: {},
        callerUserId: "u1",
        callerOrgId: "o1",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Unknown network");
    });
  });
});
