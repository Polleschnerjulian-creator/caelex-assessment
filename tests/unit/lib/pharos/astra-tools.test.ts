/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Tests for Pharos-Astra tools — focused on the most security-critical
 * property: scope-enforcement. A tool MUST refuse to return data for an
 * oversight that doesn't belong to the calling authority, even if the
 * model gets the oversightId right.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// vi.hoisted lets us define mock fns BEFORE the mocked module is loaded
// while still keeping references we can call .mockResolvedValueOnce() on
// from within tests below.
const mocks = vi.hoisted(() => ({
  findUniqueOversight: vi.fn(),
  findManyOrgMembers: vi.fn(),
  countIncident: vi.fn(),
  countDeadline: vi.fn(),
  findManyAccessLog: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    oversightRelationship: {
      findUnique: mocks.findUniqueOversight,
    },
    organizationMember: {
      findMany: mocks.findManyOrgMembers,
    },
    incident: {
      count: mocks.countIncident,
    },
    deadline: {
      count: mocks.countDeadline,
    },
    oversightAccessLog: {
      findMany: mocks.findManyAccessLog,
    },
  },
}));

const {
  findUniqueOversight,
  findManyOrgMembers,
  countIncident,
  countDeadline,
  findManyAccessLog,
} = mocks;

import { executePharosAstraTool } from "@/lib/pharos/astra-tools";

describe("executePharosAstraTool — scope enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("query_operator_compliance", () => {
    it("rejects an oversight from a different authority", async () => {
      // Caller is authorityProfile A, but the oversight belongs to
      // authorityProfile B. The tool MUST treat this as not-found.
      findUniqueOversight.mockResolvedValueOnce({
        id: "ov_x",
        authorityProfileId: "authority_B",
        operatorOrgId: "op_1",
        oversightTitle: "fake",
        mandatoryDisclosure: [],
        voluntaryDisclosure: [],
        status: "ACTIVE",
        operatorOrg: { id: "op_1", name: "Op", slug: "op" },
        legalReference: "fake",
      });

      const result = await executePharosAstraTool(
        "query_operator_compliance",
        { oversightId: "ov_x" },
        { authorityProfileId: "authority_A" },
      );

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/nicht gefunden|gehört nicht/i);
      // Critical: NO data leaks back to the caller
      expect(result.data).toBeUndefined();
    });

    it("returns compliance when oversight belongs to the caller", async () => {
      findUniqueOversight.mockResolvedValueOnce({
        id: "ov_y",
        authorityProfileId: "authority_A",
        operatorOrgId: "op_2",
        oversightTitle: "Test Oversight",
        oversightReference: "REF-1",
        legalReference: "§ 1",
        status: "ACTIVE",
        initiatedAt: new Date(),
        acceptedAt: new Date(),
        effectiveUntil: new Date(),
        mandatoryDisclosure: [{ category: "DOCUMENTS", permissions: ["READ"] }],
        voluntaryDisclosure: [],
        operatorOrg: { id: "op_2", name: "Op2", slug: "op2" },
      });
      findManyOrgMembers.mockResolvedValueOnce([{ userId: "u1" }]);
      countIncident.mockResolvedValueOnce(2);
      countDeadline.mockResolvedValueOnce(1);

      const result = await executePharosAstraTool(
        "query_operator_compliance",
        { oversightId: "ov_y" },
        { authorityProfileId: "authority_A" },
      );

      expect(result.ok).toBe(true);
      const data = result.data as {
        compliance: { score: number; tier: string; openIncidents: number };
      };
      // Score = 100 - 2*10 - 1*5 = 75 → tier 'drift'
      expect(data.compliance.score).toBe(75);
      expect(data.compliance.tier).toBe("drift");
      expect(data.compliance.openIncidents).toBe(2);
    });

    it("rejects when oversightId is missing", async () => {
      const result = await executePharosAstraTool(
        "query_operator_compliance",
        {},
        { authorityProfileId: "authority_A" },
      );
      expect(result.ok).toBe(false);
      expect(findUniqueOversight).not.toHaveBeenCalled();
    });

    it("rejects when the oversight is not found", async () => {
      findUniqueOversight.mockResolvedValueOnce(null);

      const result = await executePharosAstraTool(
        "query_operator_compliance",
        { oversightId: "ov_missing" },
        { authorityProfileId: "authority_A" },
      );
      expect(result.ok).toBe(false);
    });
  });

  describe("summarize_audit_chain", () => {
    it("rejects an oversight from a different authority", async () => {
      findUniqueOversight.mockResolvedValueOnce({
        id: "ov_x",
        authorityProfileId: "authority_B",
        operatorOrgId: "op_1",
        oversightTitle: "fake",
        operatorOrg: { id: "op_1", name: "Op", slug: "op" },
      });

      const result = await executePharosAstraTool(
        "summarize_audit_chain",
        { oversightId: "ov_x", limit: 10 },
        { authorityProfileId: "authority_A" },
      );

      expect(result.ok).toBe(false);
      expect(findManyAccessLog).not.toHaveBeenCalled();
    });

    it("clamps limit to [1, 50]", async () => {
      findUniqueOversight.mockResolvedValueOnce({
        id: "ov_y",
        authorityProfileId: "authority_A",
        operatorOrgId: "op_2",
        oversightTitle: "Audit Test",
        handshakeHash: "hash",
        operatorOrg: { id: "op_2", name: "Op2", slug: "op2" },
      });
      findManyAccessLog.mockResolvedValueOnce([]);

      await executePharosAstraTool(
        "summarize_audit_chain",
        { oversightId: "ov_y", limit: 999 },
        { authorityProfileId: "authority_A" },
      );

      // Verify the clamped value was passed to prisma
      expect(findManyAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it("uses default limit 20 when omitted", async () => {
      findUniqueOversight.mockResolvedValueOnce({
        id: "ov_y",
        authorityProfileId: "authority_A",
        operatorOrgId: "op_2",
        oversightTitle: "Audit Test",
        handshakeHash: "hash",
        operatorOrg: { id: "op_2", name: "Op2", slug: "op2" },
      });
      findManyAccessLog.mockResolvedValueOnce([]);

      await executePharosAstraTool(
        "summarize_audit_chain",
        { oversightId: "ov_y" },
        { authorityProfileId: "authority_A" },
      );

      expect(findManyAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });

    it("represents root entries (null previousHash) without crashing", async () => {
      findUniqueOversight.mockResolvedValueOnce({
        id: "ov_root",
        authorityProfileId: "authority_A",
        operatorOrgId: "op_2",
        oversightTitle: "Root Oversight",
        handshakeHash: "root-hash",
        operatorOrg: { id: "op_2", name: "Op2", slug: "op2" },
      });
      findManyAccessLog.mockResolvedValueOnce([
        {
          id: "log_1",
          action: "OVERSIGHT_ACCEPTED",
          actorOrgId: "org_x",
          resourceType: "OversightRelationship",
          resourceId: "ov_root",
          createdAt: new Date(),
          entryHash: "abc123def456",
          previousHash: null,
        },
      ]);

      const result = await executePharosAstraTool(
        "summarize_audit_chain",
        { oversightId: "ov_root" },
        { authorityProfileId: "authority_A" },
      );
      expect(result.ok).toBe(true);
      const data = result.data as {
        entries: { previousHashShort: string }[];
      };
      expect(data.entries[0].previousHashShort).toBe("(root)");
    });
  });

  describe("unknown tool", () => {
    it("returns error for any other tool name", async () => {
      const result = await executePharosAstraTool(
        "delete_everything",
        {},
        { authorityProfileId: "authority_A" },
      );
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Unknown tool");
    });
  });
});
