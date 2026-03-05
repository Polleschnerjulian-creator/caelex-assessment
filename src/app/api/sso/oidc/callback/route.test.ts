/**
 * OIDC Callback Route Tests
 *
 * Tests: error from IdP, missing code/state, invalid state token,
 * missing nonce, inactive SSO, missing base URL, token exchange failure,
 * JWT verification failure, nonce mismatch, userinfo failure, missing email,
 * domain restriction, happy path redirect.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import { NextRequest } from "next/server";
import { http, HttpResponse } from "msw";
import { server } from "../../../../../../tests/mocks/server";

// ─── MSW fetch response holders ───

let tokenResponse: { status: number; body: Record<string, unknown> } = {
  status: 200,
  body: { access_token: "at-123" },
};
let userInfoResponse: { status: number; body: Record<string, unknown> } = {
  status: 200,
  body: { email: "user@example.com", name: "Test User" },
};

// ─── Mocks ───

const mockGetSSOConnection = vi.fn();
const mockDecryptSecret = vi.fn();
vi.mock("@/lib/services/sso-service", () => ({
  getSSOConnection: (...args: unknown[]) => mockGetSSOConnection(...args),
  decryptSecret: (...args: unknown[]) => mockDecryptSecret(...args),
}));

const mockLogSecurityEvent = vi.fn();
vi.mock("@/lib/services/security-audit-service", () => ({
  logSecurityEvent: (...args: unknown[]) => mockLogSecurityEvent(...args),
}));

const mockCreateSignedToken = vi.fn();
const mockVerifySignedToken = vi.fn();
vi.mock("@/lib/signed-token", () => ({
  createSignedToken: (...args: unknown[]) => mockCreateSignedToken(...args),
  verifySignedToken: (...args: unknown[]) => mockVerifySignedToken(...args),
}));

const mockValidateExternalUrl = vi.fn();
vi.mock("@/lib/url-validation", () => ({
  validateExternalUrl: (...args: unknown[]) => mockValidateExternalUrl(...args),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("1.2.3.4"),
  }),
}));

const mockJwtVerify = vi.fn();
const mockCreateRemoteJWKSet = vi.fn().mockReturnValue("mock-jwks");
vi.mock("jose", () => ({
  createRemoteJWKSet: (...args: unknown[]) => mockCreateRemoteJWKSet(...args),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ─── Import module under test ───

import { GET } from "./route";

// ─── Helpers ───

const BASE_URL = "https://app.caelex.com";

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("https://app.caelex.com/api/sso/oidc/callback");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function mockConnection(overrides: Record<string, unknown> = {}) {
  return {
    isActive: true,
    provider: "CUSTOM_OIDC",
    issuerUrl: "https://idp.example.com",
    clientId: "client-123",
    clientSecret: "enc-secret",
    domains: [],
    ...overrides,
  };
}

// ─── Tests ───

describe("GET /api/sso/oidc/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = BASE_URL;
    process.env.APP_URL = BASE_URL;
    process.env.NEXTAUTH_URL = BASE_URL;

    // Set up MSW handlers for IdP endpoints
    server.use(
      http.post("https://idp.example.com/token", () => {
        return HttpResponse.json(tokenResponse.body, {
          status: tokenResponse.status,
        });
      }),
      http.get("https://idp.example.com/userinfo", () => {
        return HttpResponse.json(userInfoResponse.body, {
          status: userInfoResponse.status,
        });
      }),
    );

    // Reset defaults
    tokenResponse = {
      status: 200,
      body: { access_token: "at-123" },
    };
    userInfoResponse = {
      status: 200,
      body: { email: "user@example.com", name: "Test User" },
    };
  });

  describe("Error handling from IdP", () => {
    it("redirects to login with IdP error message", async () => {
      const req = makeRequest({
        error: "access_denied",
        error_description: "User denied access",
      });
      const res = await GET(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain(
        "error=User%20denied%20access",
      );
    });

    it("uses error code when no description provided", async () => {
      const req = makeRequest({ error: "server_error" });
      const res = await GET(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("error=server_error");
    });
  });

  describe("Missing parameters", () => {
    it("redirects on missing code", async () => {
      const req = makeRequest({ state: "some-state" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=Invalid%20callback%20parameters",
      );
    });

    it("redirects on missing state", async () => {
      const req = makeRequest({ code: "auth-code" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=Invalid%20callback%20parameters",
      );
    });

    it("redirects on empty params", async () => {
      const req = makeRequest({});
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=Invalid%20callback%20parameters",
      );
    });
  });

  describe("State token validation", () => {
    it("redirects on invalid/expired state token", async () => {
      mockVerifySignedToken.mockReturnValue(null);
      const req = makeRequest({ code: "auth-code", state: "bad-state" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=Invalid%20or%20expired%20state",
      );
    });

    it("redirects on state without orgId", async () => {
      mockVerifySignedToken.mockReturnValue({ nonce: "n1" });
      const req = makeRequest({ code: "auth-code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=Invalid%20or%20expired%20state",
      );
    });

    it("redirects on state without nonce", async () => {
      mockVerifySignedToken.mockReturnValue({ orgId: "org-1" });
      const req = makeRequest({ code: "auth-code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain("error=Missing%20nonce");
    });
  });

  describe("SSO connection checks", () => {
    it("redirects when SSO not configured", async () => {
      mockVerifySignedToken.mockReturnValue({
        orgId: "org-1",
        nonce: "n1",
      });
      mockGetSSOConnection.mockResolvedValue(null);
      const req = makeRequest({ code: "auth-code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=SSO%20not%20configured",
      );
    });

    it("redirects when SSO connection is inactive", async () => {
      mockVerifySignedToken.mockReturnValue({
        orgId: "org-1",
        nonce: "n1",
      });
      mockGetSSOConnection.mockResolvedValue({ isActive: false });
      const req = makeRequest({ code: "auth-code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=SSO%20not%20configured",
      );
    });
  });

  describe("Server configuration", () => {
    it("returns 500 when no base URL configured", async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXTAUTH_URL;
      mockVerifySignedToken.mockReturnValue({
        orgId: "org-1",
        nonce: "n1",
      });
      mockGetSSOConnection.mockResolvedValue(mockConnection());
      const req = makeRequest({ code: "auth-code", state: "token" });
      const res = await GET(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Server configuration error");
    });
  });

  describe("Token exchange", () => {
    it("redirects on token exchange failure", async () => {
      mockVerifySignedToken.mockReturnValue({
        orgId: "org-1",
        nonce: "n1",
      });
      mockGetSSOConnection.mockResolvedValue(mockConnection());
      mockDecryptSecret.mockResolvedValue("decrypted-secret");
      tokenResponse = { status: 401, body: { error: "invalid_grant" } };

      const req = makeRequest({ code: "bad-code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=Failed%20to%20exchange",
      );
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "SSO_LOGIN",
          riskLevel: "MEDIUM",
        }),
      );
    });
  });

  describe("ID token verification", () => {
    it("redirects on JWT verification failure", async () => {
      mockVerifySignedToken.mockReturnValue({
        orgId: "org-1",
        nonce: "n1",
      });
      mockGetSSOConnection.mockResolvedValue(mockConnection());
      mockDecryptSecret.mockResolvedValue("decrypted-secret");
      tokenResponse = {
        status: 200,
        body: { id_token: "bad-jwt", access_token: "at-123" },
      };
      mockJwtVerify.mockRejectedValue(new Error("Invalid signature"));

      const req = makeRequest({ code: "code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=ID%20token%20verification%20failed",
      );
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ riskLevel: "CRITICAL" }),
      );
    });

    it("redirects on nonce mismatch (replay attack)", async () => {
      mockVerifySignedToken.mockReturnValue({
        orgId: "org-1",
        nonce: "expected-nonce",
      });
      mockGetSSOConnection.mockResolvedValue(mockConnection());
      mockDecryptSecret.mockResolvedValue("decrypted-secret");
      tokenResponse = {
        status: 200,
        body: { id_token: "valid-jwt", access_token: "at-123" },
      };
      mockJwtVerify.mockResolvedValue({
        payload: { nonce: "different-nonce" },
      });

      const req = makeRequest({ code: "code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=Nonce%20validation%20failed",
      );
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ riskLevel: "HIGH" }),
      );
    });
  });

  describe("User info", () => {
    function setupTokenSuccess() {
      mockVerifySignedToken.mockReturnValue({
        orgId: "org-1",
        nonce: "n1",
      });
      mockGetSSOConnection.mockResolvedValue(mockConnection());
      mockDecryptSecret.mockResolvedValue("decrypted-secret");
      // tokenResponse defaults are fine (200, access_token, no id_token)
    }

    it("redirects on userinfo fetch failure", async () => {
      setupTokenSuccess();
      userInfoResponse = { status: 500, body: { error: "server_error" } };

      const req = makeRequest({ code: "code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=Failed%20to%20fetch%20user",
      );
    });

    it("redirects when email is missing from userinfo", async () => {
      setupTokenSuccess();
      userInfoResponse = { status: 200, body: { name: "John" } };

      const req = makeRequest({ code: "code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=No%20email%20address",
      );
    });

    it("redirects when email domain not in allowed list", async () => {
      mockVerifySignedToken.mockReturnValue({
        orgId: "org-1",
        nonce: "n1",
      });
      mockGetSSOConnection.mockResolvedValue(
        mockConnection({ domains: ["allowed.com"] }),
      );
      mockDecryptSecret.mockResolvedValue("decrypted-secret");
      userInfoResponse = {
        status: 200,
        body: { email: "user@notallowed.com", name: "User" },
      };

      const req = makeRequest({ code: "code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=Email%20domain%20not%20allowed",
      );
    });
  });

  describe("Happy path", () => {
    it("redirects to SSO callback with signed token on success", async () => {
      mockVerifySignedToken.mockReturnValue({
        orgId: "org-1",
        nonce: "n1",
        returnUrl: "/dashboard/settings",
      });
      mockGetSSOConnection.mockResolvedValue(mockConnection());
      mockDecryptSecret.mockResolvedValue("decrypted-secret");
      userInfoResponse = {
        status: 200,
        body: { email: "user@example.com", name: "Test User" },
      };
      mockCreateSignedToken.mockReturnValue("signed-sso-token");

      const req = makeRequest({ code: "code", state: "token" });
      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/api/auth/callback/sso");
      expect(location).toContain("token=signed-sso-token");
      expect(location).toContain(
        "returnUrl=" + encodeURIComponent("/dashboard/settings"),
      );
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "SSO_LOGIN",
          description: expect.stringContaining("successful"),
        }),
      );
      expect(mockCreateSignedToken).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@example.com",
          organizationId: "org-1",
        }),
        300000,
      );
    });

    it("defaults returnUrl to /dashboard when not specified", async () => {
      mockVerifySignedToken.mockReturnValue({
        orgId: "org-1",
        nonce: "n1",
      });
      mockGetSSOConnection.mockResolvedValue(mockConnection());
      mockDecryptSecret.mockResolvedValue("decrypted-secret");
      mockCreateSignedToken.mockReturnValue("token");

      const req = makeRequest({ code: "code", state: "token" });
      const res = await GET(req);
      const location = res.headers.get("location")!;
      expect(location).toContain(
        "returnUrl=" + encodeURIComponent("/dashboard"),
      );
    });
  });

  describe("Error handling (no stack traces leaked)", () => {
    it("catches unexpected errors and redirects generically", async () => {
      mockVerifySignedToken.mockImplementation(() => {
        throw new Error("Unexpected crash");
      });
      const req = makeRequest({ code: "code", state: "token" });
      const res = await GET(req);
      expect(res.headers.get("location")).toContain(
        "error=Internal%20server%20error",
      );
      // Must not leak stack trace
      expect(res.headers.get("location")).not.toContain("Unexpected crash");
    });
  });
});
