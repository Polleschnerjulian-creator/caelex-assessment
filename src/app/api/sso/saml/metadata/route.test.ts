/**
 * SAML Metadata Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGenerateMetadata = vi.fn();
vi.mock("@/lib/services/sso-service", () => ({
  generateSAMLMetadataXML: (...a: unknown[]) => mockGenerateMetadata(...a),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn((key: string) => {
      if (key === "host") return "app.caelex.com";
      if (key === "x-forwarded-proto") return "https";
      return null;
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";

function makeGet(orgId?: string): NextRequest {
  const url = new URL("https://app.caelex.com/api/sso/saml/metadata");
  if (orgId) url.searchParams.set("orgId", orgId);
  return new NextRequest(url);
}

describe("GET /api/sso/saml/metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateMetadata.mockReset();
  });

  it("returns 400 without orgId", async () => {
    expect((await GET(makeGet())).status).toBe(400);
  });

  it("returns XML metadata on valid request", async () => {
    mockGenerateMetadata.mockReturnValue(
      "<EntityDescriptor>...</EntityDescriptor>",
    );
    const res = await GET(makeGet("org-1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/xml");
    expect(res.headers.get("content-disposition")).toContain(
      "saml-metadata.xml",
    );
    const text = await res.text();
    expect(text).toContain("EntityDescriptor");
  });

  it("returns 500 on error", async () => {
    mockGenerateMetadata.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await GET(makeGet("org-1"));
    expect(res.status).toBe(500);
  });
});
