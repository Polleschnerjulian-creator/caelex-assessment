/**
 * SSO Configuration Route Tests (GET, POST, DELETE)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@prisma/client", () => ({
  SSOProvider: {
    GOOGLE_WORKSPACE: "GOOGLE_WORKSPACE",
    AZURE_AD: "AZURE_AD",
    OKTA: "OKTA",
    CUSTOM_OIDC: "CUSTOM_OIDC",
    CUSTOM_SAML: "CUSTOM_SAML",
  },
  OrganizationRole: {
    OWNER: "OWNER",
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    MEMBER: "MEMBER",
    VIEWER: "VIEWER",
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

vi.mock("@/lib/prisma", () => ({
  prisma: { organizationMember: { findFirst: vi.fn() } },
}));

const mockGetSSO = vi.fn();
const mockConfigureSSO = vi.fn();
const mockDisableSSO = vi.fn();
vi.mock("@/lib/services/sso-service", () => ({
  getSSOConnection: (...a: unknown[]) => mockGetSSO(...a),
  configureSSOConnection: (...a: unknown[]) => mockConfigureSSO(...a),
  disableSSOConnection: (...a: unknown[]) => mockDisableSSO(...a),
  SSO_PROVIDER_NAMES: {
    GOOGLE_WORKSPACE: "Google Workspace",
    AZURE_AD: "Azure AD",
    OKTA: "Okta",
    CUSTOM_OIDC: "Custom OIDC",
    CUSTOM_SAML: "Custom SAML",
  },
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_: unknown, fb: string) => fb),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET, POST, DELETE } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  organizationMember: { findFirst: ReturnType<typeof vi.fn> };
};

describe("SSO Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockPrisma.organizationMember.findFirst.mockReset();
    mockGetSSO.mockReset();
    mockConfigureSSO.mockReset();
    mockDisableSSO.mockReset();
  });

  describe("GET", () => {
    function makeGet(orgId?: string): NextRequest {
      const url = new URL("https://app.caelex.com/api/sso");
      if (orgId) url.searchParams.set("organizationId", orgId);
      return new NextRequest(url);
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await GET(makeGet("org-1"))).status).toBe(401);
    });

    it("returns 400 without organizationId", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      expect((await GET(makeGet())).status).toBe(400);
    });

    it("returns 403 without admin role", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "MEMBER",
      });
      expect((await GET(makeGet("org-1"))).status).toBe(403);
    });

    it("returns configured=false when no SSO", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "ADMIN",
      });
      mockGetSSO.mockResolvedValue(null);
      const body = await (await GET(makeGet("org-1"))).json();
      expect(body.configured).toBe(false);
      expect(body.providers).toBeDefined();
    });

    it("returns connection details when SSO configured", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "OWNER",
      });
      mockGetSSO.mockResolvedValue({
        id: "conn-1",
        provider: "AZURE_AD",
        isActive: true,
        entityId: null,
        ssoUrl: null,
        issuerUrl: "https://login.microsoft.com",
        clientId: "client-123",
        autoProvision: false,
        defaultRole: "MEMBER",
        domains: ["example.com"],
        enforceSSO: false,
        lastTestedAt: null,
        lastTestResult: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const body = await (await GET(makeGet("org-1"))).json();
      expect(body.configured).toBe(true);
      expect(body.connection.provider).toBe("AZURE_AD");
      // Must not contain clientSecret
      expect(body.connection.clientSecret).toBeUndefined();
    });
  });

  describe("POST", () => {
    function makePost(body: unknown): NextRequest {
      return new NextRequest("https://app.caelex.com/api/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await POST(makePost({}))).status).toBe(401);
    });

    it("returns 400 on invalid input", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await POST(makePost({ organizationId: "org-1" }));
      expect(res.status).toBe(400);
    });

    it("returns 403 without admin role", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "MEMBER",
      });
      const res = await POST(
        makePost({
          organizationId: "org-1",
          provider: "CUSTOM_OIDC",
          clientId: "c1",
          issuerUrl: "https://idp.example.com",
        }),
      );
      expect(res.status).toBe(403);
    });

    it("configures SSO on valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "ADMIN",
      });
      mockConfigureSSO.mockResolvedValue({
        id: "conn-1",
        provider: "CUSTOM_OIDC",
        isActive: true,
      });
      const res = await POST(
        makePost({
          organizationId: "org-1",
          provider: "CUSTOM_OIDC",
          clientId: "c1",
          issuerUrl: "https://idp.example.com",
        }),
      );
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });
  });

  describe("DELETE", () => {
    function makeDel(orgId?: string): NextRequest {
      const url = new URL("https://app.caelex.com/api/sso");
      if (orgId) url.searchParams.set("organizationId", orgId);
      return new NextRequest(url, { method: "DELETE" });
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await DELETE(makeDel("org-1"))).status).toBe(401);
    });

    it("returns 400 without organizationId", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      expect((await DELETE(makeDel())).status).toBe(400);
    });

    it("returns 403 without admin role", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "MEMBER",
      });
      expect((await DELETE(makeDel("org-1"))).status).toBe(403);
    });

    it("disables SSO on valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "OWNER",
      });
      mockDisableSSO.mockResolvedValue(undefined);
      expect((await (await DELETE(makeDel("org-1"))).json()).success).toBe(
        true,
      );
    });
  });
});
