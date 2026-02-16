import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sSOConnection: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/security-audit-service", () => ({
  logSecurityEvent: vi.fn(),
}));

// ─── Imports (after mocks) ───

import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/services/security-audit-service";
import {
  getSSOConnection,
  configureSSOConnection,
  updateSSOConnection,
  disableSSOConnection,
  deleteSSOConnection,
  testSSOConnection,
  addSSODomain,
  removeSSODomain,
  getSSOConnectionByDomain,
  generateSAMLMetadata,
  generateSAMLMetadataXML,
  generateOIDCAuthUrl,
  generateOIDCState,
  decryptSecret,
  isSSOEnforced,
  getSSOLoginUrl,
  SSO_PROVIDER_NAMES,
  type SSOConfigInput,
} from "@/lib/services/sso-service";

// ─── Helpers ───

const mockSSOConnection = (overrides: Record<string, unknown> = {}) => ({
  id: "sso-conn-1",
  organizationId: "org-1",
  provider: "SAML" as const,
  entityId: "https://idp.example.com/metadata",
  ssoUrl: "https://idp.example.com/sso",
  certificate:
    "-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----",
  clientId: null,
  clientSecret: null,
  issuerUrl: null,
  autoProvision: true,
  defaultRole: "MEMBER" as const,
  domains: ["example.com"],
  enforceSSO: false,
  isActive: true,
  lastTestedAt: null,
  lastTestResult: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  ...overrides,
});

const mockOIDCConnection = (overrides: Record<string, unknown> = {}) => ({
  ...mockSSOConnection(),
  provider: "OIDC" as const,
  entityId: null,
  ssoUrl: null,
  certificate: null,
  clientId: "client-123",
  clientSecret: "encrypted-secret",
  issuerUrl: "https://idp.example.com",
  ...overrides,
});

// ─── Tests ───

describe("SSO Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════
  // Provider Display Names
  // ════════════════════════════════════════════════════════════════════════

  describe("SSO_PROVIDER_NAMES", () => {
    it("should have display names for all providers", () => {
      expect(SSO_PROVIDER_NAMES.SAML).toBe("SAML 2.0");
      expect(SSO_PROVIDER_NAMES.OIDC).toBe("OpenID Connect");
      expect(SSO_PROVIDER_NAMES.AZURE_AD).toBe("Microsoft Entra ID (Azure AD)");
      expect(SSO_PROVIDER_NAMES.OKTA).toBe("Okta");
      expect(SSO_PROVIDER_NAMES.GOOGLE_WORKSPACE).toBe("Google Workspace");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // getSSOConnection
  // ════════════════════════════════════════════════════════════════════════

  describe("getSSOConnection", () => {
    it("should return an SSO connection when one exists", async () => {
      const conn = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );

      const result = await getSSOConnection("org-1");

      expect(prisma.sSOConnection.findUnique).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
      });
      expect(result).toEqual(conn);
    });

    it("should return null when no connection exists", async () => {
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(null);

      const result = await getSSOConnection("org-nonexistent");

      expect(result).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // configureSSOConnection
  // ════════════════════════════════════════════════════════════════════════

  describe("configureSSOConnection", () => {
    it("should configure a SAML connection with required fields", async () => {
      const conn = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.upsert).mockResolvedValue(conn as never);

      const input: SSOConfigInput = {
        provider: "SAML" as never,
        entityId: "https://idp.example.com/metadata",
        ssoUrl: "https://idp.example.com/sso",
        certificate:
          "-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----",
        domains: ["example.com"],
      };

      const result = await configureSSOConnection("org-1", input, "user-1");

      expect(prisma.sSOConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: "org-1" },
          create: expect.objectContaining({
            organizationId: "org-1",
            provider: "SAML",
            entityId: input.entityId,
            ssoUrl: input.ssoUrl,
          }),
          update: expect.objectContaining({
            provider: "SAML",
            entityId: input.entityId,
            ssoUrl: input.ssoUrl,
          }),
        }),
      );
      expect(result).toEqual(conn);
    });

    it("should configure an OIDC connection with required fields", async () => {
      const conn = mockOIDCConnection();
      vi.mocked(prisma.sSOConnection.upsert).mockResolvedValue(conn as never);

      const input: SSOConfigInput = {
        provider: "OIDC" as never,
        clientId: "client-123",
        clientSecret: "super-secret",
        issuerUrl: "https://idp.example.com",
      };

      const result = await configureSSOConnection("org-1", input, "user-1");

      expect(prisma.sSOConnection.upsert).toHaveBeenCalled();
      // clientSecret should have been encrypted (not stored as plaintext)
      const upsertCall = vi.mocked(prisma.sSOConnection.upsert).mock
        .calls[0][0];
      expect(upsertCall.create.clientSecret).not.toBe("super-secret");
      expect(result).toEqual(conn);
    });

    it("should throw when SAML required fields are missing", async () => {
      const input: SSOConfigInput = {
        provider: "SAML" as never,
        entityId: "https://idp.example.com",
        // missing ssoUrl and certificate
      };

      await expect(
        configureSSOConnection("org-1", input, "user-1"),
      ).rejects.toThrow(
        "Missing required fields for SAML: ssoUrl, certificate",
      );
    });

    it("should throw when OIDC required fields are missing", async () => {
      const input: SSOConfigInput = {
        provider: "OIDC" as never,
        clientId: "client-123",
        // missing clientSecret and issuerUrl
      };

      await expect(
        configureSSOConnection("org-1", input, "user-1"),
      ).rejects.toThrow(
        "Missing required fields for OIDC: clientSecret, issuerUrl",
      );
    });

    it("should throw when AZURE_AD required fields are missing", async () => {
      const input: SSOConfigInput = {
        provider: "AZURE_AD" as never,
        // missing clientId, clientSecret, issuerUrl
      };

      await expect(
        configureSSOConnection("org-1", input, "user-1"),
      ).rejects.toThrow("Missing required fields for AZURE_AD");
    });

    it("should throw when OKTA required fields are missing", async () => {
      const input: SSOConfigInput = {
        provider: "OKTA" as never,
        clientId: "client-123",
        // missing clientSecret and issuerUrl
      };

      await expect(
        configureSSOConnection("org-1", input, "user-1"),
      ).rejects.toThrow("Missing required fields for OKTA");
    });

    it("should not require issuerUrl for GOOGLE_WORKSPACE", async () => {
      const conn = mockOIDCConnection({ provider: "GOOGLE_WORKSPACE" });
      vi.mocked(prisma.sSOConnection.upsert).mockResolvedValue(conn as never);

      const input: SSOConfigInput = {
        provider: "GOOGLE_WORKSPACE" as never,
        clientId: "google-client-id",
        clientSecret: "google-secret",
        // no issuerUrl needed for Google
      };

      const result = await configureSSOConnection("org-1", input, "user-1");
      expect(result).toEqual(conn);
    });

    it("should log a security event after configuration", async () => {
      const conn = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.upsert).mockResolvedValue(conn as never);

      const input: SSOConfigInput = {
        provider: "SAML" as never,
        entityId: "https://idp.example.com/metadata",
        ssoUrl: "https://idp.example.com/sso",
        certificate:
          "-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----",
        domains: ["example.com"],
        enforceSSO: true,
      };

      await configureSSOConnection("org-1", input, "user-1");

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "SSO_CONFIGURED",
          userId: "user-1",
          organizationId: "org-1",
          targetType: "sso_connection",
          targetId: conn.id,
          metadata: expect.objectContaining({
            provider: "SAML",
            domains: ["example.com"],
            enforceSSO: true,
          }),
        }),
      );
    });

    it("should default autoProvision to true and defaultRole to MEMBER", async () => {
      const conn = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.upsert).mockResolvedValue(conn as never);

      const input: SSOConfigInput = {
        provider: "SAML" as never,
        entityId: "https://idp.example.com/metadata",
        ssoUrl: "https://idp.example.com/sso",
        certificate:
          "-----BEGIN CERTIFICATE-----\nX\n-----END CERTIFICATE-----",
      };

      await configureSSOConnection("org-1", input, "user-1");

      const upsertCall = vi.mocked(prisma.sSOConnection.upsert).mock
        .calls[0][0];
      expect(upsertCall.create.autoProvision).toBe(true);
      expect(upsertCall.create.defaultRole).toBe("MEMBER");
      expect(upsertCall.create.enforceSSO).toBe(false);
    });

    it("should allow overriding defaults for autoProvision and defaultRole", async () => {
      const conn = mockSSOConnection({
        autoProvision: false,
        defaultRole: "ADMIN",
      });
      vi.mocked(prisma.sSOConnection.upsert).mockResolvedValue(conn as never);

      const input: SSOConfigInput = {
        provider: "SAML" as never,
        entityId: "https://idp.example.com/metadata",
        ssoUrl: "https://idp.example.com/sso",
        certificate:
          "-----BEGIN CERTIFICATE-----\nX\n-----END CERTIFICATE-----",
        autoProvision: false,
        defaultRole: "ADMIN" as never,
        enforceSSO: true,
      };

      await configureSSOConnection("org-1", input, "user-1");

      const upsertCall = vi.mocked(prisma.sSOConnection.upsert).mock
        .calls[0][0];
      expect(upsertCall.create.autoProvision).toBe(false);
      expect(upsertCall.create.defaultRole).toBe("ADMIN");
      expect(upsertCall.create.enforceSSO).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // updateSSOConnection
  // ════════════════════════════════════════════════════════════════════════

  describe("updateSSOConnection", () => {
    it("should update specific fields of an existing connection", async () => {
      const existing = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        existing as never,
      );
      const updated = mockSSOConnection({ enforceSSO: true });
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(
        updated as never,
      );

      const result = await updateSSOConnection(
        "org-1",
        { enforceSSO: true },
        "user-1",
      );

      expect(prisma.sSOConnection.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: expect.objectContaining({ enforceSSO: true }),
      });
      expect(result.enforceSSO).toBe(true);
    });

    it("should throw when SSO connection does not exist", async () => {
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(null);

      await expect(
        updateSSOConnection("org-1", { enforceSSO: true }, "user-1"),
      ).rejects.toThrow("SSO connection not found");
    });

    it("should encrypt clientSecret when updating it", async () => {
      const existing = mockOIDCConnection();
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        existing as never,
      );
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(
        existing as never,
      );

      await updateSSOConnection(
        "org-1",
        { clientSecret: "new-secret" },
        "user-1",
      );

      const updateCall = vi.mocked(prisma.sSOConnection.update).mock
        .calls[0][0];
      // The clientSecret in the data should NOT be the plaintext value
      expect(updateCall.data.clientSecret).not.toBe("new-secret");
      expect(typeof updateCall.data.clientSecret).toBe("string");
    });

    it("should only include provided fields in the update data", async () => {
      const existing = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        existing as never,
      );
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(
        existing as never,
      );

      await updateSSOConnection(
        "org-1",
        { ssoUrl: "https://new-sso.example.com" },
        "user-1",
      );

      const updateCall = vi.mocked(prisma.sSOConnection.update).mock
        .calls[0][0];
      expect(updateCall.data).toHaveProperty("ssoUrl");
      expect(updateCall.data).not.toHaveProperty("entityId");
      expect(updateCall.data).not.toHaveProperty("certificate");
    });

    it("should log a security event with updated field names", async () => {
      const existing = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        existing as never,
      );
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(
        existing as never,
      );

      await updateSSOConnection(
        "org-1",
        { ssoUrl: "https://new-url.com", enforceSSO: true },
        "user-1",
      );

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "SSO_UPDATED",
          userId: "user-1",
          organizationId: "org-1",
          metadata: expect.objectContaining({
            updatedFields: expect.arrayContaining(["ssoUrl", "enforceSSO"]),
          }),
        }),
      );
    });

    it("should handle updating multiple OIDC fields at once", async () => {
      const existing = mockOIDCConnection();
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        existing as never,
      );
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(
        existing as never,
      );

      await updateSSOConnection(
        "org-1",
        {
          clientId: "new-client-id",
          issuerUrl: "https://new-issuer.example.com",
          autoProvision: false,
        },
        "user-1",
      );

      const updateCall = vi.mocked(prisma.sSOConnection.update).mock
        .calls[0][0];
      expect(updateCall.data.clientId).toBe("new-client-id");
      expect(updateCall.data.issuerUrl).toBe("https://new-issuer.example.com");
      expect(updateCall.data.autoProvision).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // disableSSOConnection
  // ════════════════════════════════════════════════════════════════════════

  describe("disableSSOConnection", () => {
    it("should set isActive to false", async () => {
      const conn = mockSSOConnection({ isActive: false });
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

      const result = await disableSSOConnection("org-1", "user-1");

      expect(prisma.sSOConnection.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it("should log a MEDIUM risk security event", async () => {
      const conn = mockSSOConnection({ isActive: false });
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

      await disableSSOConnection("org-1", "user-1");

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "SSO_DISABLED",
          userId: "user-1",
          organizationId: "org-1",
          riskLevel: "MEDIUM",
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // deleteSSOConnection
  // ════════════════════════════════════════════════════════════════════════

  describe("deleteSSOConnection", () => {
    it("should delete an existing connection", async () => {
      const conn = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );
      vi.mocked(prisma.sSOConnection.delete).mockResolvedValue(conn as never);

      await deleteSSOConnection("org-1", "user-1");

      expect(prisma.sSOConnection.delete).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
      });
    });

    it("should not attempt deletion if connection does not exist", async () => {
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(null);

      await deleteSSOConnection("org-nonexistent", "user-1");

      expect(prisma.sSOConnection.delete).not.toHaveBeenCalled();
    });

    it("should log a MEDIUM risk SSO_DISABLED security event on deletion", async () => {
      const conn = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );
      vi.mocked(prisma.sSOConnection.delete).mockResolvedValue(conn as never);

      await deleteSSOConnection("org-1", "user-1");

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "SSO_DISABLED",
          description: "SSO configuration deleted",
          userId: "user-1",
          organizationId: "org-1",
          targetId: conn.id,
          riskLevel: "MEDIUM",
        }),
      );
    });

    it("should not log a security event if no connection exists", async () => {
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(null);

      await deleteSSOConnection("org-1", "user-1");

      expect(logSecurityEvent).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // testSSOConnection
  // ════════════════════════════════════════════════════════════════════════

  describe("testSSOConnection", () => {
    it("should return failure when no connection exists", async () => {
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(null);

      const result = await testSSOConnection("org-1", "user-1");

      expect(result).toEqual({
        success: false,
        message: "SSO connection not found",
      });
    });

    describe("SAML testing", () => {
      it("should succeed for valid SAML config", async () => {
        const conn = mockSSOConnection();
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        const result = await testSSOConnection("org-1", "user-1");

        expect(result.success).toBe(true);
        expect(result.message).toContain("SAML configuration validated");
        expect(result.details).toEqual(
          expect.objectContaining({
            entityId: conn.entityId,
            ssoUrl: conn.ssoUrl,
            certificateValid: true,
          }),
        );
      });

      it("should fail when certificate is missing", async () => {
        const conn = mockSSOConnection({ certificate: null });
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        const result = await testSSOConnection("org-1", "user-1");

        expect(result.success).toBe(false);
        expect(result.message).toBe("Certificate is missing");
      });

      it("should fail for invalid certificate format", async () => {
        const conn = mockSSOConnection({
          certificate: "not-a-valid-pem-certificate",
        });
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        const result = await testSSOConnection("org-1", "user-1");

        expect(result.success).toBe(false);
        expect(result.message).toContain("Invalid certificate format");
      });

      it("should fail when SSO URL is missing", async () => {
        const conn = mockSSOConnection({ ssoUrl: null });
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        const result = await testSSOConnection("org-1", "user-1");

        expect(result.success).toBe(false);
        expect(result.message).toBe("SSO URL is missing");
      });

      it("should fail for invalid SSO URL format", async () => {
        const conn = mockSSOConnection({ ssoUrl: "not-a-url" });
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        const result = await testSSOConnection("org-1", "user-1");

        expect(result.success).toBe(false);
        expect(result.message).toBe("Invalid SSO URL format");
      });

      it("should update lastTestedAt and lastTestResult on success", async () => {
        const conn = mockSSOConnection();
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        await testSSOConnection("org-1", "user-1");

        expect(prisma.sSOConnection.update).toHaveBeenCalledWith({
          where: { organizationId: "org-1" },
          data: expect.objectContaining({
            lastTestedAt: expect.any(Date),
            lastTestResult: "success",
          }),
        });
      });

      it("should update lastTestResult to 'failed' on failure", async () => {
        const conn = mockSSOConnection({ certificate: null });
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        await testSSOConnection("org-1", "user-1");

        expect(prisma.sSOConnection.update).toHaveBeenCalledWith({
          where: { organizationId: "org-1" },
          data: expect.objectContaining({
            lastTestResult: "failed",
          }),
        });
      });

      it("should log SSO_TEST_SUCCESS on valid SAML", async () => {
        const conn = mockSSOConnection();
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        await testSSOConnection("org-1", "user-1");

        expect(logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event: "SSO_TEST_SUCCESS",
            userId: "user-1",
            organizationId: "org-1",
          }),
        );
      });

      it("should log SSO_TEST_FAILED on invalid SAML", async () => {
        const conn = mockSSOConnection({ certificate: null });
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        await testSSOConnection("org-1", "user-1");

        expect(logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event: "SSO_TEST_FAILED",
          }),
        );
      });
    });

    describe("OIDC testing", () => {
      it("should fail when issuerUrl is missing for non-Google providers", async () => {
        const conn = mockOIDCConnection({ issuerUrl: null });
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        const result = await testSSOConnection("org-1", "user-1");

        expect(result.success).toBe(false);
        expect(result.message).toBe("Issuer URL is missing");
      });

      it("should use Google discovery URL for GOOGLE_WORKSPACE provider", async () => {
        const conn = mockOIDCConnection({
          provider: "GOOGLE_WORKSPACE",
          issuerUrl: null,
        });
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        // Mock global fetch for OIDC discovery
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              issuer: "https://accounts.google.com",
              authorization_endpoint:
                "https://accounts.google.com/o/oauth2/v2/auth",
              token_endpoint: "https://oauth2.googleapis.com/token",
              userinfo_endpoint:
                "https://openidconnect.googleapis.com/v1/userinfo",
              scopes_supported: ["openid", "email", "profile"],
            }),
        });
        vi.stubGlobal("fetch", mockFetch);

        const result = await testSSOConnection("org-1", "user-1");

        expect(mockFetch).toHaveBeenCalledWith(
          "https://accounts.google.com/.well-known/openid-configuration",
          expect.any(Object),
        );
        expect(result.success).toBe(true);

        vi.unstubAllGlobals();
      });

      it("should succeed when OIDC discovery has all required endpoints", async () => {
        const conn = mockOIDCConnection();
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              issuer: "https://idp.example.com",
              authorization_endpoint: "https://idp.example.com/authorize",
              token_endpoint: "https://idp.example.com/token",
              userinfo_endpoint: "https://idp.example.com/userinfo",
              scopes_supported: ["openid", "email", "profile"],
            }),
        });
        vi.stubGlobal("fetch", mockFetch);

        const result = await testSSOConnection("org-1", "user-1");

        expect(result.success).toBe(true);
        expect(result.message).toContain("OIDC configuration validated");
        expect(result.details).toEqual(
          expect.objectContaining({
            issuer: "https://idp.example.com",
            authorizationEndpoint: "https://idp.example.com/authorize",
            tokenEndpoint: "https://idp.example.com/token",
          }),
        );

        vi.unstubAllGlobals();
      });

      it("should fail when discovery document fetch returns non-OK status", async () => {
        const conn = mockOIDCConnection();
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        const mockFetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
        });
        vi.stubGlobal("fetch", mockFetch);

        const result = await testSSOConnection("org-1", "user-1");

        expect(result.success).toBe(false);
        expect(result.message).toContain(
          "Failed to fetch OIDC discovery document (404)",
        );

        vi.unstubAllGlobals();
      });

      it("should fail when required OIDC endpoints are missing from discovery", async () => {
        const conn = mockOIDCConnection();
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              issuer: "https://idp.example.com",
              authorization_endpoint: "https://idp.example.com/authorize",
              // missing token_endpoint and userinfo_endpoint
            }),
        });
        vi.stubGlobal("fetch", mockFetch);

        const result = await testSSOConnection("org-1", "user-1");

        expect(result.success).toBe(false);
        expect(result.message).toContain("Missing required OIDC endpoints");
        expect(result.message).toContain("token_endpoint");
        expect(result.message).toContain("userinfo_endpoint");

        vi.unstubAllGlobals();
      });

      it("should handle fetch errors gracefully", async () => {
        const conn = mockOIDCConnection();
        vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
          conn as never,
        );
        vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

        const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
        vi.stubGlobal("fetch", mockFetch);

        const result = await testSSOConnection("org-1", "user-1");

        expect(result.success).toBe(false);
        expect(result.message).toContain("OIDC discovery failed");
        expect(result.message).toContain("Network error");

        vi.unstubAllGlobals();
      });
    });

    it("should handle unexpected errors in the test flow and log SSO_TEST_FAILED", async () => {
      const conn = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );
      // First update call (to record test result) throws
      vi.mocked(prisma.sSOConnection.update)
        .mockRejectedValueOnce(new Error("DB write failed"))
        .mockResolvedValue(conn as never);

      const result = await testSSOConnection("org-1", "user-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Test failed: DB write failed");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Domain Verification
  // ════════════════════════════════════════════════════════════════════════

  describe("addSSODomain", () => {
    it("should add a new domain to the connection", async () => {
      const conn = mockSSOConnection({ domains: ["example.com"] });
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(null);
      const updated = mockSSOConnection({
        domains: ["example.com", "newdomain.com"],
      });
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(
        updated as never,
      );

      const result = await addSSODomain("org-1", "newdomain.com", "user-1");

      expect(prisma.sSOConnection.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: { domains: { push: "newdomain.com" } },
      });
      expect(result.domains).toContain("newdomain.com");
    });

    it("should normalize domain to lowercase and trim", async () => {
      const conn = mockSSOConnection({ domains: [] });
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

      await addSSODomain("org-1", "  MyDomain.COM  ", "user-1");

      expect(prisma.sSOConnection.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: { domains: { push: "mydomain.com" } },
      });
    });

    it("should throw when SSO connection does not exist", async () => {
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(null);

      await expect(
        addSSODomain("org-1", "example.com", "user-1"),
      ).rejects.toThrow("SSO connection not found");
    });

    it("should throw when domain is already added", async () => {
      const conn = mockSSOConnection({ domains: ["example.com"] });
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );

      await expect(
        addSSODomain("org-1", "example.com", "user-1"),
      ).rejects.toThrow("Domain already added");
    });

    it("should throw when domain is used by another organization", async () => {
      const conn = mockSSOConnection({ domains: [] });
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );
      const otherConn = mockSSOConnection({ organizationId: "org-2" });
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(
        otherConn as never,
      );

      await expect(
        addSSODomain("org-1", "taken-domain.com", "user-1"),
      ).rejects.toThrow(
        "Domain is already associated with another organization",
      );
    });

    it("should log a security event after adding a domain", async () => {
      const conn = mockSSOConnection({ domains: [] });
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

      await addSSODomain("org-1", "new-domain.com", "user-1");

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "SSO_UPDATED",
          description: "Domain added to SSO: new-domain.com",
          userId: "user-1",
          organizationId: "org-1",
          metadata: { domain: "new-domain.com" },
        }),
      );
    });
  });

  describe("removeSSODomain", () => {
    it("should remove a domain from the connection", async () => {
      const conn = mockSSOConnection({
        domains: ["example.com", "other.com"],
      });
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );
      const updated = mockSSOConnection({ domains: ["other.com"] });
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(
        updated as never,
      );

      const result = await removeSSODomain("org-1", "example.com", "user-1");

      expect(prisma.sSOConnection.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: { domains: ["other.com"] },
      });
      expect(result.domains).not.toContain("example.com");
    });

    it("should normalize domain before removal", async () => {
      const conn = mockSSOConnection({ domains: ["example.com"] });
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(
        mockSSOConnection({ domains: [] }) as never,
      );

      await removeSSODomain("org-1", "  EXAMPLE.COM  ", "user-1");

      expect(prisma.sSOConnection.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: { domains: [] },
      });
    });

    it("should throw when SSO connection does not exist", async () => {
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(null);

      await expect(
        removeSSODomain("org-1", "example.com", "user-1"),
      ).rejects.toThrow("SSO connection not found");
    });

    it("should log a security event after removing a domain", async () => {
      const conn = mockSSOConnection({ domains: ["example.com"] });
      vi.mocked(prisma.sSOConnection.findUnique).mockResolvedValue(
        conn as never,
      );
      vi.mocked(prisma.sSOConnection.update).mockResolvedValue(conn as never);

      await removeSSODomain("org-1", "example.com", "user-1");

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "SSO_UPDATED",
          description: "Domain removed from SSO: example.com",
          metadata: { domain: "example.com" },
        }),
      );
    });
  });

  describe("getSSOConnectionByDomain", () => {
    it("should find an active connection by domain", async () => {
      const conn = mockSSOConnection();
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(
        conn as never,
      );

      const result = await getSSOConnectionByDomain("example.com");

      expect(prisma.sSOConnection.findFirst).toHaveBeenCalledWith({
        where: {
          domains: { has: "example.com" },
          isActive: true,
        },
      });
      expect(result).toEqual(conn);
    });

    it("should normalize the domain to lowercase", async () => {
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(null);

      await getSSOConnectionByDomain("  EXAMPLE.COM  ");

      expect(prisma.sSOConnection.findFirst).toHaveBeenCalledWith({
        where: {
          domains: { has: "example.com" },
          isActive: true,
        },
      });
    });

    it("should return null when no matching connection exists", async () => {
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(null);

      const result = await getSSOConnectionByDomain("unknown.com");

      expect(result).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // SAML Metadata
  // ════════════════════════════════════════════════════════════════════════

  describe("generateSAMLMetadata", () => {
    it("should generate correct SP metadata", () => {
      const metadata = generateSAMLMetadata(
        "https://app.caelex.com",
        "org-123",
      );

      expect(metadata.entityId).toBe(
        "https://app.caelex.com/api/sso/saml/metadata",
      );
      expect(metadata.assertionConsumerServiceUrl).toBe(
        "https://app.caelex.com/api/sso/saml/acs?orgId=org-123",
      );
    });
  });

  describe("generateSAMLMetadataXML", () => {
    it("should generate valid SAML metadata XML", () => {
      const xml = generateSAMLMetadataXML("https://app.caelex.com", "org-123");

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain("md:EntityDescriptor");
      expect(xml).toContain("md:SPSSODescriptor");
      expect(xml).toContain(
        'entityID="https://app.caelex.com/api/sso/saml/metadata"',
      );
      expect(xml).toContain(
        'Location="https://app.caelex.com/api/sso/saml/acs?orgId=org-123"',
      );
      expect(xml).toContain(
        "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
      );
      expect(xml).toContain('WantAssertionsSigned="true"');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // OIDC Helpers
  // ════════════════════════════════════════════════════════════════════════

  describe("generateOIDCAuthUrl", () => {
    it("should generate correct URL for generic OIDC provider", () => {
      const conn = mockOIDCConnection();
      const url = generateOIDCAuthUrl(
        conn as never,
        "https://app.caelex.com/api/sso/oidc/callback",
        "state123",
        "nonce456",
      );

      expect(url).toContain("https://idp.example.com/authorize?");
      expect(url).toContain("client_id=client-123");
      expect(url).toContain("response_type=code");
      expect(url).toContain("scope=openid+email+profile");
      expect(url).toContain("state=state123");
      expect(url).toContain("nonce=nonce456");
      expect(url).toContain(
        encodeURIComponent("https://app.caelex.com/api/sso/oidc/callback"),
      );
    });

    it("should use Google auth endpoint for GOOGLE_WORKSPACE", () => {
      const conn = mockOIDCConnection({ provider: "GOOGLE_WORKSPACE" });
      const url = generateOIDCAuthUrl(
        conn as never,
        "https://app.caelex.com/callback",
        "state",
        "nonce",
      );

      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth?");
    });

    it("should use Azure AD v2.0 authorize endpoint for AZURE_AD", () => {
      const conn = mockOIDCConnection({
        provider: "AZURE_AD",
        issuerUrl: "https://login.microsoftonline.com/tenant-id",
      });
      const url = generateOIDCAuthUrl(
        conn as never,
        "https://app.caelex.com/callback",
        "state",
        "nonce",
      );

      expect(url).toContain(
        "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize?",
      );
    });

    it("should use Okta v1 authorize endpoint for OKTA", () => {
      const conn = mockOIDCConnection({
        provider: "OKTA",
        issuerUrl: "https://dev-12345.okta.com/oauth2/default",
      });
      const url = generateOIDCAuthUrl(
        conn as never,
        "https://app.caelex.com/callback",
        "state",
        "nonce",
      );

      expect(url).toContain(
        "https://dev-12345.okta.com/oauth2/default/v1/authorize?",
      );
    });
  });

  describe("generateOIDCState", () => {
    it("should generate state and nonce as hex strings", () => {
      const { state, nonce } = generateOIDCState();

      expect(state).toMatch(/^[a-f0-9]{64}$/);
      expect(nonce).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate unique values on each call", () => {
      const first = generateOIDCState();
      const second = generateOIDCState();

      expect(first.state).not.toBe(second.state);
      expect(first.nonce).not.toBe(second.nonce);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Encryption Helpers
  // ════════════════════════════════════════════════════════════════════════

  describe("decryptSecret", () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should decrypt a value that was encrypted with encryptSecret", async () => {
      process.env = {
        ...originalEnv,
        SSO_ENCRYPTION_KEY: "test-encryption-key-for-sso-service-tests",
      };

      // We need to re-import to pick up the env change for encryption,
      // but since encryptSecret is private, we test through configure + decrypt
      // Instead, test the decrypt path with a known format
      const conn = mockOIDCConnection();
      vi.mocked(prisma.sSOConnection.upsert).mockResolvedValue(conn as never);

      const input: SSOConfigInput = {
        provider: "OIDC" as never,
        clientId: "client-123",
        clientSecret: "my-secret-value",
        issuerUrl: "https://idp.example.com",
      };

      await configureSSOConnection("org-1", input, "user-1");

      // Grab the encrypted value that was stored
      const upsertCall = vi.mocked(prisma.sSOConnection.upsert).mock
        .calls[0][0];
      const encryptedValue = upsertCall.create.clientSecret as string;

      // It should be in "iv:encrypted" format
      expect(encryptedValue).toContain(":");

      // Decrypt it and verify
      const decrypted = decryptSecret(encryptedValue);
      expect(decrypted).toBe("my-secret-value");
    });

    it("should handle base64 fallback when no encryption key is set", () => {
      process.env = { ...originalEnv };
      delete process.env.SSO_ENCRYPTION_KEY;
      delete process.env.NEXTAUTH_SECRET;

      const base64Value = Buffer.from("hello").toString("base64");
      const result = decryptSecret(base64Value);
      expect(result).toBe("hello");
    });

    it("should return value as-is when it has no colon separator and key is set", () => {
      process.env = {
        ...originalEnv,
        SSO_ENCRYPTION_KEY: "some-key",
      };

      // A value without ":" should be returned as-is (fallback path)
      const result = decryptSecret("plain-value-no-colon");
      expect(result).toBe("plain-value-no-colon");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // SSO Enforcement
  // ════════════════════════════════════════════════════════════════════════

  describe("isSSOEnforced", () => {
    it("should return enforced=true when domain has active enforced SSO", async () => {
      const conn = mockSSOConnection({
        enforceSSO: true,
        isActive: true,
      });
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(
        conn as never,
      );

      const result = await isSSOEnforced("user@example.com");

      expect(result.enforced).toBe(true);
      expect(result.connection).toEqual(conn);
    });

    it("should return enforced=false when SSO is not enforced", async () => {
      const conn = mockSSOConnection({
        enforceSSO: false,
        isActive: true,
      });
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(
        conn as never,
      );

      const result = await isSSOEnforced("user@example.com");

      expect(result.enforced).toBe(false);
    });

    it("should return enforced=false when connection is inactive", async () => {
      const conn = mockSSOConnection({
        enforceSSO: true,
        isActive: false,
      });
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(
        conn as never,
      );

      const result = await isSSOEnforced("user@example.com");

      expect(result.enforced).toBe(false);
    });

    it("should return enforced=false when no connection exists for domain", async () => {
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(null);

      const result = await isSSOEnforced("user@unknown.com");

      expect(result.enforced).toBe(false);
    });

    it("should return enforced=false for invalid email without domain", async () => {
      const result = await isSSOEnforced("invalid-email");

      expect(result.enforced).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // getSSOLoginUrl
  // ════════════════════════════════════════════════════════════════════════

  describe("getSSOLoginUrl", () => {
    it("should return null when email has no domain", async () => {
      const result = await getSSOLoginUrl("nodomain", "https://app.caelex.com");
      expect(result).toBeNull();
    });

    it("should return null when no SSO connection exists for the domain", async () => {
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(null);

      const result = await getSSOLoginUrl(
        "user@unknown.com",
        "https://app.caelex.com",
      );
      expect(result).toBeNull();
    });

    it("should return null when SSO connection is inactive", async () => {
      const conn = mockSSOConnection({ isActive: false });
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(
        conn as never,
      );

      const result = await getSSOLoginUrl(
        "user@example.com",
        "https://app.caelex.com",
      );
      expect(result).toBeNull();
    });

    it("should return a SAML login URL for SAML providers", async () => {
      const conn = mockSSOConnection({ isActive: true });
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(
        conn as never,
      );

      const result = await getSSOLoginUrl(
        "user@example.com",
        "https://app.caelex.com",
      );

      expect(result).not.toBeNull();
      expect(result).toContain("https://app.caelex.com/api/sso/saml/login");
      expect(result).toContain("orgId=org-1");
      expect(result).toContain("state=");
    });

    it("should return an OIDC auth URL for OIDC providers", async () => {
      const conn = mockOIDCConnection({ isActive: true });
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(
        conn as never,
      );

      const result = await getSSOLoginUrl(
        "user@example.com",
        "https://app.caelex.com",
      );

      expect(result).not.toBeNull();
      expect(result).toContain("https://idp.example.com/authorize?");
      expect(result).toContain("client_id=client-123");
      expect(result).toContain("response_type=code");
    });

    it("should encode returnUrl in the state parameter", async () => {
      const conn = mockSSOConnection({ isActive: true });
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(
        conn as never,
      );

      const result = await getSSOLoginUrl(
        "user@example.com",
        "https://app.caelex.com",
        "/dashboard/settings",
      );

      expect(result).not.toBeNull();
      // The state is base64url encoded; decode it and check returnUrl
      const stateParam = result!.match(/state=([^&]+)/)?.[1];
      expect(stateParam).toBeDefined();
      const decoded = JSON.parse(
        Buffer.from(stateParam!, "base64url").toString(),
      );
      expect(decoded.returnUrl).toBe("/dashboard/settings");
      expect(decoded.orgId).toBe("org-1");
    });

    it("should default returnUrl to /dashboard when not provided", async () => {
      const conn = mockSSOConnection({ isActive: true });
      vi.mocked(prisma.sSOConnection.findFirst).mockResolvedValue(
        conn as never,
      );

      const result = await getSSOLoginUrl(
        "user@example.com",
        "https://app.caelex.com",
      );

      const stateParam = result!.match(/state=([^&]+)/)?.[1];
      const decoded = JSON.parse(
        Buffer.from(stateParam!, "base64url").toString(),
      );
      expect(decoded.returnUrl).toBe("/dashboard");
    });
  });
});
