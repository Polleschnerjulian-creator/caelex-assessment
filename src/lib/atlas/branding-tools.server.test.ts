import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Branding-Tools bundle smoke-tests (Atlas V3 T0.1).
 *
 * Verifies the bundle's public surface — tool-name guard,
 * dispatcher routing, input-validation. Live DB calls are mocked
 * so no Anthropic / no Postgres traffic, satisfying the
 * zero-external-cost constraint from the master plan § 2 C-1.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasOrgBranding: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  BRANDING_TOOLS,
  isBrandingToolName,
  executeBrandingTool,
} from "./branding-tools.server";

describe("branding-tools bundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("BRANDING_TOOLS schema", () => {
    it("exports exactly 2 tools (get + set)", () => {
      expect(BRANDING_TOOLS).toHaveLength(2);
      const names = BRANDING_TOOLS.map((t) => t.name).sort();
      expect(names).toEqual(["get_org_branding", "set_org_branding"]);
    });

    it("each tool has a non-empty description (≥80 chars)", () => {
      for (const tool of BRANDING_TOOLS) {
        expect(tool.description).toBeDefined();
        expect((tool.description ?? "").length).toBeGreaterThan(80);
      }
    });

    it("set_org_branding schema accepts all letterhead fields", () => {
      const setTool = BRANDING_TOOLS.find((t) => t.name === "set_org_branding");
      const props = (setTool?.input_schema as { properties: unknown })
        .properties;
      const expectedKeys = [
        "letterheadName",
        "address",
        "phone",
        "email",
        "raNumber",
        "iban",
        "bic",
        "defaultJurisdiction",
        "defaultClosing",
      ];
      for (const k of expectedKeys) {
        expect(props).toHaveProperty(k);
      }
    });
  });

  describe("isBrandingToolName", () => {
    it("returns true for branding tool names", () => {
      expect(isBrandingToolName("get_org_branding")).toBe(true);
      expect(isBrandingToolName("set_org_branding")).toBe(true);
    });

    it("returns false for unrelated names", () => {
      expect(isBrandingToolName("search_legal_sources")).toBe(false);
      expect(isBrandingToolName("draft_schriftsatz")).toBe(false);
      expect(isBrandingToolName("")).toBe(false);
      expect(isBrandingToolName("get_org_brandin")).toBe(false); // typo
    });
  });

  describe("executeBrandingTool — get_org_branding", () => {
    it("returns null branding + onboarding-directive when row missing", async () => {
      vi.mocked(prisma.atlasOrgBranding.findUnique).mockResolvedValueOnce(null);
      const result = await executeBrandingTool({
        name: "get_org_branding",
        input: {},
        callerOrgId: "org_test_1",
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.branding).toBeNull();
      expect(payload.directive).toContain("EMPTY");
    });

    it("returns row + use-it directive when branding set", async () => {
      vi.mocked(prisma.atlasOrgBranding.findUnique).mockResolvedValueOnce({
        letterheadName: "Polleschner Legal",
        address: "Am Maselakepark 37, 13587 Berlin",
        phone: "+49 30 12345678",
        email: "kanzlei@caelex.eu",
        website: null,
        raNumber: "RA-Berlin-12345",
        authority: "Rechtsanwaltskammer Berlin",
        insuranceNote: null,
        bankName: null,
        iban: null,
        bic: null,
        defaultJurisdiction: "Berlin",
        defaultClosing: "Mit freundlichen Grüßen",
        logoUrl: null,
        updatedAt: new Date("2026-05-26"),
      } as never);
      const result = await executeBrandingTool({
        name: "get_org_branding",
        input: {},
        callerOrgId: "org_test_2",
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.branding).toMatchObject({
        letterheadName: "Polleschner Legal",
        raNumber: "RA-Berlin-12345",
      });
      expect(payload.directive).toContain("use it");
    });
  });

  describe("executeBrandingTool — set_org_branding", () => {
    it("rejects empty input with isError", async () => {
      const result = await executeBrandingTool({
        name: "set_org_branding",
        input: {},
        callerOrgId: "org_test_3",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("No fields");
    });

    it("rejects invalid email format", async () => {
      const result = await executeBrandingTool({
        name: "set_org_branding",
        input: { email: "not-a-valid-email" },
        callerOrgId: "org_test_4",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toBe("Invalid input");
    });

    it("upserts valid partial input", async () => {
      vi.mocked(prisma.atlasOrgBranding.upsert).mockResolvedValueOnce({
        letterheadName: "Test Kanzlei",
        address: null,
        phone: null,
        email: null,
        raNumber: null,
        defaultJurisdiction: null,
        defaultClosing: null,
      } as never);
      const result = await executeBrandingTool({
        name: "set_org_branding",
        input: { letterheadName: "Test Kanzlei" },
        callerOrgId: "org_test_5",
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.ok).toBe(true);
      expect(payload.branding.letterheadName).toBe("Test Kanzlei");
      expect(prisma.atlasOrgBranding.upsert).toHaveBeenCalledWith({
        where: { organizationId: "org_test_5" },
        create: {
          organizationId: "org_test_5",
          letterheadName: "Test Kanzlei",
        },
        update: { letterheadName: "Test Kanzlei" },
        select: expect.any(Object),
      });
    });
  });

  describe("executeBrandingTool — unknown tool", () => {
    it("returns isError for tool name not handled by bundle", async () => {
      const result = await executeBrandingTool({
        name: "bogus_tool" as never,
        input: {},
        callerOrgId: "org_test_6",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Unknown branding");
    });
  });
});
