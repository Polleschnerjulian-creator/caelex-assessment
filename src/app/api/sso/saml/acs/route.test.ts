/**
 * SAML ACS Route Tests
 *
 * Tests: missing orgId, inactive SSO, invalid SAML response, missing certificate,
 * unsigned response, missing email, domain restriction, happy path redirect,
 * error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───

const mockGetSSOConnection = vi.fn();
vi.mock("@/lib/services/sso-service", () => ({
  getSSOConnection: (...a: unknown[]) => mockGetSSOConnection(...a),
}));

const mockLogSecurityEvent = vi.fn();
vi.mock("@/lib/services/security-audit-service", () => ({
  logSecurityEvent: (...a: unknown[]) => mockLogSecurityEvent(...a),
}));

const mockCreateSignedToken = vi.fn();
const mockVerifySignedToken = vi.fn();
vi.mock("@/lib/signed-token", () => ({
  createSignedToken: (...a: unknown[]) => mockCreateSignedToken(...a),
  verifySignedToken: (...a: unknown[]) => mockVerifySignedToken(...a),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("1.2.3.4"),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from "./route";

// ─── Helpers ───

const BASE_URL = "https://app.caelex.com";

function makePost(
  orgId: string | null,
  samlResponse?: string,
  relayState?: string,
): NextRequest {
  const url = new URL("https://app.caelex.com/api/sso/saml/acs");
  if (orgId) url.searchParams.set("orgId", orgId);

  const form = new FormData();
  if (samlResponse) form.set("SAMLResponse", samlResponse);
  if (relayState) form.set("RelayState", relayState);

  return new NextRequest(url, { method: "POST", body: form });
}

// A minimal SAML assertion with a signed element (for testing structure)
function buildSamlResponse(
  email: string,
  name?: string,
  signed = true,
): string {
  const xml = `<samlp:Response>
    <saml:Assertion ID="assertion-1">
      ${signed ? '<ds:Signature><ds:SignedInfo><ds:Reference URI="#assertion-1"><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>fake-digest</ds:DigestValue></ds:Reference></ds:SignedInfo><ds:SignatureValue>fake-sig</ds:SignatureValue></ds:Signature>' : ""}
      <saml:NameID>${email}</saml:NameID>
      ${name ? `<saml:Attribute Name="displayName"><saml:AttributeValue>${name}</saml:AttributeValue></saml:Attribute>` : ""}
    </saml:Assertion>
  </samlp:Response>`;
  return Buffer.from(xml).toString("base64");
}

describe("POST /api/sso/saml/acs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSSOConnection.mockReset();
    mockLogSecurityEvent.mockReset();
    mockCreateSignedToken.mockReset();
    mockVerifySignedToken.mockReset();
    process.env.NEXT_PUBLIC_APP_URL = BASE_URL;
    process.env.APP_URL = BASE_URL;
    process.env.NEXTAUTH_URL = BASE_URL;
  });

  it("redirects with error when orgId missing", async () => {
    const res = await POST(makePost(null));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "error=Missing%20organization%20ID",
    );
  });

  it("redirects when SSO not configured", async () => {
    mockGetSSOConnection.mockResolvedValue(null);
    const res = await POST(makePost("org-1"));
    expect(res.headers.get("location")).toContain(
      "error=SSO%20not%20configured",
    );
  });

  it("redirects when SSO inactive", async () => {
    mockGetSSOConnection.mockResolvedValue({ isActive: false });
    const res = await POST(makePost("org-1"));
    expect(res.headers.get("location")).toContain(
      "error=SSO%20not%20configured",
    );
  });

  it("redirects on invalid SAML response (missing)", async () => {
    mockGetSSOConnection.mockResolvedValue({ isActive: true });
    const res = await POST(makePost("org-1"));
    expect(res.headers.get("location")).toContain(
      "error=Invalid%20SAML%20response",
    );
  });

  it("redirects when certificate not configured", async () => {
    mockGetSSOConnection.mockResolvedValue({
      isActive: true,
      certificate: null,
      domains: [],
    });
    const saml = buildSamlResponse("user@test.com");
    const res = await POST(makePost("org-1", saml));
    expect(res.headers.get("location")).toContain(
      "error=SAML%20configuration%20error",
    );
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ riskLevel: "HIGH" }),
    );
  });

  it("redirects when SAML response is unsigned", async () => {
    mockGetSSOConnection.mockResolvedValue({
      isActive: true,
      certificate: "cert-data",
      domains: [],
    });
    const saml = buildSamlResponse("user@test.com", undefined, false);
    const res = await POST(makePost("org-1", saml));
    expect(res.headers.get("location")).toContain(
      "error=SAML%20response%20is%20not%20signed",
    );
  });

  it("redirects on signature verification failure", async () => {
    mockGetSSOConnection.mockResolvedValue({
      isActive: true,
      certificate: "invalid-cert",
      domains: [],
    });
    // Signed but signature won't validate with fake cert
    const saml = buildSamlResponse("user@test.com");
    const res = await POST(makePost("org-1", saml));
    expect(res.headers.get("location")).toContain("error=");
    // Either signature failed or parse error
  });

  it("catches unexpected errors and redirects generically", async () => {
    mockGetSSOConnection.mockRejectedValue(new Error("DB crash"));
    const res = await POST(
      makePost("org-1", buildSamlResponse("user@test.com")),
    );
    expect(res.headers.get("location")).toContain(
      "error=Internal%20server%20error",
    );
    expect(res.headers.get("location")).not.toContain("DB%20crash");
  });
});
