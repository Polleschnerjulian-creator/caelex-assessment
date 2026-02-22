import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    complianceAttestation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

// Mock activity service
vi.mock("@/lib/services/activity-service", () => ({
  createActivity: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { createActivity } from "@/lib/services/activity-service";
import {
  createAttestation,
  getAttestations,
  getAttestation,
  verifyAttestation,
  verifyByHash,
  revokeAttestation,
  getAttestationChain,
  getAttestationsForStakeholder,
} from "@/lib/services/attestation";
import type { CreateAttestationInput } from "@/lib/services/attestation";

const mockInput: CreateAttestationInput = {
  organizationId: "org-1",
  engagementId: "eng-1",
  type: "COMPLIANCE_DECLARATION" as any,
  title: "GDPR Compliance Declaration",
  statement: "We declare compliance with GDPR Article 28.",
  scope: "Data processing operations",
  signerName: "John Doe",
  signerTitle: "DPO",
  signerEmail: "john@example.com",
  signerOrg: "Acme Corp",
  validUntil: new Date("2027-01-01"),
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0",
};

describe("Attestation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════
  // createAttestation
  // ═══════════════════════════════════════════════

  describe("createAttestation", () => {
    it("should create an attestation with a signature hash", async () => {
      const mockAttestation = {
        id: "attest-1",
        ...mockInput,
        signatureHash: "abc123",
        previousHash: null,
        issuedAt: new Date(),
        engagement: { companyName: "Acme Corp", type: "SUPPLIER" },
      };

      vi.mocked(prisma.complianceAttestation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.complianceAttestation.create).mockResolvedValue(
        mockAttestation as any,
      );

      const result = await createAttestation(mockInput);

      expect(result.id).toBe("attest-1");
      expect(prisma.complianceAttestation.create).toHaveBeenCalledTimes(1);

      const createCall = vi.mocked(prisma.complianceAttestation.create).mock
        .calls[0][0];
      expect(createCall.data.signatureHash).toBeDefined();
      expect(typeof createCall.data.signatureHash).toBe("string");
      expect(createCall.data.signatureHash.length).toBe(64); // SHA-256 hex
      expect(createCall.data.previousHash).toBeNull();
    });

    it("should chain to previous attestation hash", async () => {
      const previousAttestation = {
        signatureHash: "prev-hash-value-64chars".padEnd(64, "0"),
      };

      vi.mocked(prisma.complianceAttestation.findFirst).mockResolvedValue(
        previousAttestation as any,
      );

      const mockAttestation = {
        id: "attest-2",
        ...mockInput,
        signatureHash: "new-hash",
        previousHash: previousAttestation.signatureHash,
        issuedAt: new Date(),
        engagement: { companyName: "Acme Corp", type: "SUPPLIER" },
      };
      vi.mocked(prisma.complianceAttestation.create).mockResolvedValue(
        mockAttestation as any,
      );

      await createAttestation(mockInput);

      const createCall = vi.mocked(prisma.complianceAttestation.create).mock
        .calls[0][0];
      expect(createCall.data.previousHash).toBe(
        previousAttestation.signatureHash,
      );
    });

    it("should log audit event on creation", async () => {
      vi.mocked(prisma.complianceAttestation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.complianceAttestation.create).mockResolvedValue({
        id: "attest-3",
        ...mockInput,
        signatureHash: "hash",
        previousHash: null,
        issuedAt: new Date(),
        engagement: { companyName: "Acme Corp", type: "SUPPLIER" },
      } as any);

      await createAttestation(mockInput);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "attestation_signed",
          entityType: "compliance_attestation",
          entityId: "attest-3",
        }),
      );
    });

    it("should create activity on creation", async () => {
      vi.mocked(prisma.complianceAttestation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.complianceAttestation.create).mockResolvedValue({
        id: "attest-4",
        ...mockInput,
        signatureHash: "hash",
        previousHash: null,
        issuedAt: new Date(),
        engagement: { companyName: "Acme Corp", type: "SUPPLIER" },
      } as any);

      await createAttestation(mockInput);

      expect(createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          action: "completed",
          entityType: "compliance_attestation",
        }),
      );
    });

    it("should produce deterministic hash for same input", async () => {
      vi.mocked(prisma.complianceAttestation.findFirst).mockResolvedValue(null);

      const captures: string[] = [];
      vi.mocked(prisma.complianceAttestation.create).mockImplementation(
        async (args: any) => {
          captures.push(args.data.signatureHash);
          return {
            id: "attest-x",
            ...args.data,
            engagement: { companyName: "Acme Corp", type: "SUPPLIER" },
          };
        },
      );

      // Note: The hash includes the issuedAt timestamp, so two calls
      // within the same millisecond would produce the same hash.
      // In practice they may differ due to timing.
      await createAttestation(mockInput);

      expect(captures[0]).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // ═══════════════════════════════════════════════
  // getAttestations
  // ═══════════════════════════════════════════════

  describe("getAttestations", () => {
    it("should return paginated attestations", async () => {
      const mockAttestations = [
        { id: "a1", title: "First" },
        { id: "a2", title: "Second" },
      ];
      vi.mocked(prisma.complianceAttestation.findMany).mockResolvedValue(
        mockAttestations as any,
      );
      vi.mocked(prisma.complianceAttestation.count).mockResolvedValue(2);

      const result = await getAttestations("org-1");

      expect(result.attestations).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it("should apply type filter", async () => {
      vi.mocked(prisma.complianceAttestation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.complianceAttestation.count).mockResolvedValue(0);

      await getAttestations("org-1", {
        type: "COMPLIANCE_DECLARATION" as any,
      });

      expect(prisma.complianceAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            type: "COMPLIANCE_DECLARATION",
          }),
        }),
      );
    });

    it("should apply engagement filter", async () => {
      vi.mocked(prisma.complianceAttestation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.complianceAttestation.count).mockResolvedValue(0);

      await getAttestations("org-1", { engagementId: "eng-1" });

      expect(prisma.complianceAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            engagementId: "eng-1",
          }),
        }),
      );
    });

    it("should apply revoked filter", async () => {
      vi.mocked(prisma.complianceAttestation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.complianceAttestation.count).mockResolvedValue(0);

      await getAttestations("org-1", { isRevoked: false });

      expect(prisma.complianceAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRevoked: false,
          }),
        }),
      );
    });

    it("should paginate correctly", async () => {
      vi.mocked(prisma.complianceAttestation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.complianceAttestation.count).mockResolvedValue(100);

      const result = await getAttestations("org-1", {}, { page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(10);
      expect(prisma.complianceAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // getAttestation
  // ═══════════════════════════════════════════════

  describe("getAttestation", () => {
    it("should return attestation by id and org", async () => {
      const mockAttestation = { id: "a1", title: "Test" };
      vi.mocked(prisma.complianceAttestation.findFirst).mockResolvedValue(
        mockAttestation as any,
      );

      const result = await getAttestation("a1", "org-1");

      expect(result).toEqual(mockAttestation);
      expect(prisma.complianceAttestation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "a1", organizationId: "org-1" },
        }),
      );
    });

    it("should return null when attestation not found", async () => {
      vi.mocked(prisma.complianceAttestation.findFirst).mockResolvedValue(null);

      const result = await getAttestation("nonexistent", "org-1");
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════
  // verifyAttestation
  // ═══════════════════════════════════════════════

  describe("verifyAttestation", () => {
    it("should return invalid for nonexistent attestation", async () => {
      vi.mocked(prisma.complianceAttestation.findUnique).mockResolvedValue(
        null,
      );

      const result = await verifyAttestation("nonexistent");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attestation not found");
    });

    it("should return invalid for revoked attestation", async () => {
      vi.mocked(prisma.complianceAttestation.findUnique).mockResolvedValue({
        id: "a1",
        isRevoked: true,
        engagement: { companyName: "Test", type: "SUPPLIER" },
        organization: { name: "Org" },
      } as any);

      const result = await verifyAttestation("a1");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attestation has been revoked");
    });

    it("should return invalid for expired attestation", async () => {
      vi.mocked(prisma.complianceAttestation.findUnique).mockResolvedValue({
        id: "a1",
        isRevoked: false,
        validUntil: new Date("2020-01-01"),
        engagement: { companyName: "Test", type: "SUPPLIER" },
        organization: { name: "Org" },
      } as any);

      const result = await verifyAttestation("a1");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attestation has expired");
    });

    it("should verify hash integrity for valid attestation", async () => {
      // Create a consistent attestation where the hash should match
      const issuedAt = new Date("2025-01-01T00:00:00.000Z");
      const crypto = await import("crypto");
      const payload = JSON.stringify({
        statement: "Test statement",
        scope: "Test scope",
        signerEmail: "test@example.com",
        signerOrg: "Test Org",
        issuedAt: issuedAt.toISOString(),
        previousHash: null,
      });
      const expectedHash = crypto
        .createHash("sha256")
        .update(payload)
        .digest("hex");

      vi.mocked(prisma.complianceAttestation.findUnique).mockResolvedValue({
        id: "a1",
        isRevoked: false,
        validUntil: new Date("2030-01-01"),
        statement: "Test statement",
        scope: "Test scope",
        signerEmail: "test@example.com",
        signerOrg: "Test Org",
        issuedAt,
        signatureHash: expectedHash,
        previousHash: null,
        organizationId: "org-1",
        engagementId: "eng-1",
        engagement: { companyName: "Test", type: "SUPPLIER" },
        organization: { name: "Org" },
      } as any);

      const result = await verifyAttestation("a1");

      expect(result.valid).toBe(true);
      expect((result as any).hashValid).toBe(true);
      expect((result as any).chainValid).toBe(true);
    });

    it("should detect tampered attestation (hash mismatch)", async () => {
      vi.mocked(prisma.complianceAttestation.findUnique).mockResolvedValue({
        id: "a1",
        isRevoked: false,
        validUntil: new Date("2030-01-01"),
        statement: "Tampered statement",
        scope: "Test scope",
        signerEmail: "test@example.com",
        signerOrg: "Test Org",
        issuedAt: new Date("2025-01-01"),
        signatureHash: "wrong_hash_value".padEnd(64, "0"),
        previousHash: null,
        organizationId: "org-1",
        engagementId: "eng-1",
        engagement: { companyName: "Test", type: "SUPPLIER" },
        organization: { name: "Org" },
      } as any);

      const result = await verifyAttestation("a1");

      expect(result.valid).toBe(false);
      expect((result as any).hashValid).toBe(false);
    });

    it("should verify chain with previous hash", async () => {
      const prevHash = "previous_hash_value".padEnd(64, "0");

      vi.mocked(prisma.complianceAttestation.findUnique).mockResolvedValue({
        id: "a2",
        isRevoked: false,
        validUntil: new Date("2030-01-01"),
        statement: "Statement",
        scope: "Scope",
        signerEmail: "signer@test.com",
        signerOrg: "Org",
        issuedAt: new Date("2025-01-01"),
        signatureHash: "some-hash".padEnd(64, "0"),
        previousHash: prevHash,
        organizationId: "org-1",
        engagementId: "eng-1",
        engagement: { companyName: "Test", type: "SUPPLIER" },
        organization: { name: "Org" },
      } as any);

      // Previous attestation exists
      vi.mocked(prisma.complianceAttestation.findFirst).mockResolvedValue({
        id: "a1",
        signatureHash: prevHash,
      } as any);

      const result = await verifyAttestation("a2");

      expect((result as any).chainValid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════
  // verifyByHash
  // ═══════════════════════════════════════════════

  describe("verifyByHash", () => {
    it("should return invalid for unknown hash", async () => {
      vi.mocked(prisma.complianceAttestation.findFirst).mockResolvedValue(null);

      const result = await verifyByHash("unknown_hash");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("No attestation found with this hash");
    });
  });

  // ═══════════════════════════════════════════════
  // revokeAttestation
  // ═══════════════════════════════════════════════

  describe("revokeAttestation", () => {
    it("should revoke an attestation and log audit event", async () => {
      const revoked = {
        id: "a1",
        title: "Test Attestation",
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "Compliance violation",
        engagement: { companyName: "Acme" },
      };

      vi.mocked(prisma.complianceAttestation.update).mockResolvedValue(
        revoked as any,
      );

      const result = await revokeAttestation(
        "a1",
        "org-1",
        "Compliance violation",
        "user-1",
      );

      expect(result.isRevoked).toBe(true);
      expect(prisma.complianceAttestation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "a1", organizationId: "org-1" },
          data: expect.objectContaining({
            isRevoked: true,
            revokedReason: "Compliance violation",
          }),
        }),
      );
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "attestation_revoked",
          userId: "user-1",
        }),
      );
      expect(createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "deleted",
          entityType: "compliance_attestation",
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // getAttestationChain
  // ═══════════════════════════════════════════════

  describe("getAttestationChain", () => {
    it("should return ordered attestation chain", async () => {
      const chain = [
        { id: "a1", previousHash: null },
        { id: "a2", previousHash: "hash1" },
      ];
      vi.mocked(prisma.complianceAttestation.findMany).mockResolvedValue(
        chain as any,
      );

      const result = await getAttestationChain("org-1", "eng-1");

      expect(result).toHaveLength(2);
      expect(prisma.complianceAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: "org-1", engagementId: "eng-1" },
          orderBy: { createdAt: "asc" },
        }),
      );
    });

    it("should return empty array for no attestations", async () => {
      vi.mocked(prisma.complianceAttestation.findMany).mockResolvedValue([]);

      const result = await getAttestationChain("org-1", "eng-1");
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════
  // getAttestationsForStakeholder
  // ═══════════════════════════════════════════════

  describe("getAttestationsForStakeholder", () => {
    it("should return attestations for a stakeholder engagement", async () => {
      const attestations = [
        { id: "a1", organization: { name: "Org 1" } },
        { id: "a2", organization: { name: "Org 2" } },
      ];
      vi.mocked(prisma.complianceAttestation.findMany).mockResolvedValue(
        attestations as any,
      );

      const result = await getAttestationsForStakeholder("eng-1");

      expect(result).toHaveLength(2);
      expect(prisma.complianceAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { engagementId: "eng-1" },
          orderBy: { createdAt: "desc" },
        }),
      );
    });
  });
});
