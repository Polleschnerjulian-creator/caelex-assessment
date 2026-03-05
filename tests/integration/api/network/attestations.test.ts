import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock logger ───
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Mock validations ───
vi.mock("@/lib/validations", () => ({
  parsePaginationLimit: vi.fn(
    (raw: string | null, defaultLimit = 50, maxLimit = 100) => {
      const parsed = parseInt(raw || String(defaultLimit), 10);
      if (isNaN(parsed) || parsed < 1) return defaultLimit;
      return Math.min(parsed, maxLimit);
    },
  ),
}));

// ─── Mock auth ───
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ─── Mock Prisma ───
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findFirst: vi.fn(),
    },
  },
}));

// ─── Mock permissions ───
vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockReturnValue(true),
  getPermissionsForRole: vi
    .fn()
    .mockReturnValue([
      "network:read",
      "network:write",
      "network:attest",
      "network:manage",
    ]),
}));

// ─── Mock attestation service ───
const mockGetAttestations = vi.fn();
const mockCreateAttestation = vi.fn();
const mockVerifyByHash = vi.fn();
const mockRevokeAttestation = vi.fn();

vi.mock("@/lib/services/attestation", () => ({
  getAttestations: (...args: unknown[]) => mockGetAttestations(...args),
  createAttestation: (...args: unknown[]) => mockCreateAttestation(...args),
  verifyByHash: (...args: unknown[]) => mockVerifyByHash(...args),
  revokeAttestation: (...args: unknown[]) => mockRevokeAttestation(...args),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { GET, POST } from "@/app/api/network/attestations/route";
import { POST as verifyPOST } from "@/app/api/network/attestations/verify/route";
import { POST as revokePOST } from "@/app/api/network/attestations/[id]/revoke/route";

// ─── Helpers ───

const mockSession = {
  user: { id: "user-123", email: "test@example.com" },
};

const ORG_ID = "org-abc";

const mockMember = {
  role: "OWNER",
  permissions: [],
};

const validAttestationData = {
  organizationId: ORG_ID,
  engagementId: "eng-1",
  type: "COMPLIANCE_SIGN_OFF",
  title: "Annual Compliance Attestation",
  statement:
    "We hereby attest that our operations comply with EU Space Act requirements.",
  scope: "EU Space Act - Full compliance",
  signerName: "Jane Doe",
  signerTitle: "Chief Compliance Officer",
  signerEmail: "jane@spacecorp.eu",
  signerOrg: "Space Corp GmbH",
};

// ─── Tests ───

describe("GET /api/network/attestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMember as any,
    );
    vi.mocked(hasPermission).mockReturnValue(true);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/network/attestations?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when organizationId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = new NextRequest(
      "http://localhost/api/network/attestations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("organizationId is required");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/network/attestations?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user lacks network:read permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockReturnValue(false);

    const request = new NextRequest(
      `http://localhost/api/network/attestations?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return attestations list", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const mockResult = {
      attestations: [
        {
          id: "att-1",
          type: "COMPLIANCE_SIGN_OFF",
          title: "Annual Compliance",
          signerName: "Jane Doe",
          signatureHash: "abc123def456",
          isRevoked: false,
          issuedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    };
    mockGetAttestations.mockResolvedValue(mockResult);

    const request = new NextRequest(
      `http://localhost/api/network/attestations?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.attestations).toBeDefined();
    expect(data.total).toBe(1);
  });

  it("should pass filter parameters to service", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    mockGetAttestations.mockResolvedValue({
      attestations: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    const request = new NextRequest(
      `http://localhost/api/network/attestations?organizationId=${ORG_ID}&type=COMPLIANCE_SIGN_OFF&engagementId=eng-1&isRevoked=false`,
    );
    await GET(request);

    expect(mockGetAttestations).toHaveBeenCalledWith(
      ORG_ID,
      {
        type: "COMPLIANCE_SIGN_OFF",
        engagementId: "eng-1",
        isRevoked: false,
      },
      { page: 1, limit: 50 },
    );
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    mockGetAttestations.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest(
      `http://localhost/api/network/attestations?organizationId=${ORG_ID}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch attestations");
  });
});

describe("POST /api/network/attestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMember as any,
    );
    vi.mocked(hasPermission).mockReturnValue(true);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/network/attestations",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validAttestationData),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when required fields are missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = new NextRequest(
      "http://localhost/api/network/attestations",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: ORG_ID,
          engagementId: "eng-1",
          type: "COMPLIANCE_SIGN_OFF",
          // Missing: title, statement, scope, signerName, signerTitle, signerEmail, signerOrg
        }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  it("should return 403 when user lacks network:attest permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockReturnValue(false);

    const request = new NextRequest(
      "http://localhost/api/network/attestations",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validAttestationData),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should create attestation successfully", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const mockAttestation = {
      id: "att-new",
      type: "COMPLIANCE_SIGN_OFF",
      title: "Annual Compliance Attestation",
      signatureHash: "deadbeef1234567890abcdef",
      isRevoked: false,
      issuedAt: new Date(),
    };
    mockCreateAttestation.mockResolvedValue(mockAttestation);

    const request = new NextRequest(
      "http://localhost/api/network/attestations",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validAttestationData),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.attestation).toBeDefined();
    expect(data.attestation.id).toBe("att-new");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    mockCreateAttestation.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest(
      "http://localhost/api/network/attestations",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validAttestationData),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create attestation");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Verification (Public)
// ════════════════════════════════════════════════════════════════════════════════

describe("POST /api/network/attestations/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when signatureHash is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/network/attestations/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    const response = await verifyPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  it("should return 400 for invalid hash format (not hex SHA-256)", async () => {
    const request = new NextRequest(
      "http://localhost/api/network/attestations/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureHash: "not-a-valid-hash" }),
      },
    );
    const response = await verifyPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  it("should return valid: true for a verified attestation", async () => {
    const validHash = "a".repeat(64);
    mockVerifyByHash.mockResolvedValue({
      valid: true,
      hashValid: true,
      chainValid: true,
      attestation: {
        id: "att-1",
        type: "COMPLIANCE_SIGN_OFF",
        title: "Test Attestation",
        statement: "We attest compliance",
        scope: "Full",
        signerName: "Jane Doe",
        signerTitle: "CCO",
        signerOrg: "Space Corp",
        signatureHash: validHash,
        issuedAt: new Date(),
        validUntil: null,
        isRevoked: false,
        organization: { name: "Space Corp" },
        engagement: { companyName: "Partner Inc" },
      },
    });

    const request = new NextRequest(
      "http://localhost/api/network/attestations/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureHash: validHash }),
      },
    );
    const response = await verifyPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.attestation).toBeDefined();
    expect(data.attestation.signerName).toBe("Jane Doe");
  });

  it("should return valid: false for a revoked attestation", async () => {
    const validHash = "b".repeat(64);
    mockVerifyByHash.mockResolvedValue({
      valid: false,
      error: "Attestation has been revoked",
      attestation: {
        id: "att-revoked",
        type: "COMPLIANCE_SIGN_OFF",
        title: "Revoked Attestation",
        signerName: "Jane Doe",
        signerOrg: "Space Corp",
        issuedAt: new Date(),
        isRevoked: true,
        revokedAt: new Date(),
        organization: { name: "Space Corp" },
        engagement: { companyName: "Partner Inc" },
      },
    });

    const request = new NextRequest(
      "http://localhost/api/network/attestations/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureHash: validHash }),
      },
    );
    const response = await verifyPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.error).toContain("revoked");
  });

  it("should return 500 on service error", async () => {
    const validHash = "c".repeat(64);
    mockVerifyByHash.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest(
      "http://localhost/api/network/attestations/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureHash: validHash }),
      },
    );
    const response = await verifyPOST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to verify attestation");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Revocation
// ════════════════════════════════════════════════════════════════════════════════

describe("POST /api/network/attestations/[id]/revoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      mockMember as any,
    );
    vi.mocked(hasPermission).mockReturnValue(true);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/network/attestations/att-1/revoke",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: ORG_ID,
          reason: "Compliance issue discovered",
        }),
      },
    );
    const response = await revokePOST(request, {
      params: Promise.resolve({ id: "att-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when reason is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = new NextRequest(
      "http://localhost/api/network/attestations/att-1/revoke",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: ORG_ID,
        }),
      },
    );
    const response = await revokePOST(request, {
      params: Promise.resolve({ id: "att-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  it("should return 403 when user lacks network:manage permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockReturnValue(false);

    const request = new NextRequest(
      "http://localhost/api/network/attestations/att-1/revoke",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: ORG_ID,
          reason: "Compliance issue",
        }),
      },
    );
    const response = await revokePOST(request, {
      params: Promise.resolve({ id: "att-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should revoke attestation successfully", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const mockRevoked = {
      id: "att-1",
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: "Compliance issue discovered",
    };
    mockRevokeAttestation.mockResolvedValue(mockRevoked);

    const request = new NextRequest(
      "http://localhost/api/network/attestations/att-1/revoke",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: ORG_ID,
          reason: "Compliance issue discovered",
        }),
      },
    );
    const response = await revokePOST(request, {
      params: Promise.resolve({ id: "att-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.attestation.isRevoked).toBe(true);
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    mockRevokeAttestation.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest(
      "http://localhost/api/network/attestations/att-1/revoke",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: ORG_ID,
          reason: "Compliance issue",
        }),
      },
    );
    const response = await revokePOST(request, {
      params: Promise.resolve({ id: "att-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to revoke attestation");
  });
});
